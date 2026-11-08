import { createInteraction } from './interaction.js';
import { createCommandRuntime } from '../commands/runtime.js';
import type { InteractivePanel, ReadOptions, TerminalOutput } from '../commands/types.js';
import { createPrompt } from '../input/prompt.js';
import type { PromptActions } from '../input/prompt.js';
import type { Terminal, TerminalOptions } from './types.js';

// 在指定元素中创建独立的流式浏览器终端。
export function createTerminal(options: TerminalOptions): Terminal {
  const { element, banner, prompt = '❯', onSubmit, commands } = options;
  let currentPrompt = prompt;
  if (commands && onSubmit) throw new Error('Choose commands or onSubmit for this terminal.');
  const document = element.ownerDocument;
  const root = document.createElement('section');
  root.className = 'lk-terminal';
  if (options.paddingInline !== undefined) {
    root.style.paddingInline = typeof options.paddingInline === 'number' ? `${options.paddingInline}px` : options.paddingInline;
  }
  if (options.maxWidth !== undefined) {
    root.style.maxWidth = typeof options.maxWidth === 'number' ? `${options.maxWidth}px` : options.maxWidth;
  }
  root.setAttribute('aria-label', 'LunarKit');
  const stream = document.createElement('div');
  stream.className = 'lk-stream';
  stream.setAttribute('role', 'log');
  stream.setAttribute('aria-label', '交互记录');
  stream.setAttribute('aria-live', 'polite');
  let destroyed = false;
  let busy = false;
  // 面板释放焦点后保留本轮输入所有权，供命令最终完成时恢复。
  let restoreOwnedFocus = false;
  root.tabIndex = -1;

  // 将最新输入行滚动到可见区域。
  function revealPrompt(): void {
    controller.element.scrollIntoView?.({ block: 'nearest' });
  }

  // 向当前流写入保留空白的安全文本或消费端创建的节点。
  function write(output: TerminalOutput): void {
    if (destroyed) return;
    const line = document.createElement('div');
    line.className = typeof output === 'string' ? 'lk-output' : 'lk-output-node';
    if (typeof output === 'string') line.textContent = output;
    else line.append(output);
    stream.append(line);
    revealPrompt();
  }

  // 将命令上下文中的提问转交给终端交互管理器。
  function read(options: ReadOptions, signal: AbortSignal): Promise<string> {
    return interaction.read(options, signal);
  }

  // 将流内交互面板交给统一生命周期托管。
  function present(panel: InteractivePanel, signal: AbortSignal): Promise<void> {
    return interaction.present(panel, signal);
  }

  // 同步会话身份标签与当前输入行。
  function setPrompt(text: string): void {
    if (destroyed) return;
    currentPrompt = text;
    controller.setLabel(text);
  }

  // 返回当前会话标签以恢复交互输入。
  function getLabel(): string {
    return currentPrompt;
  }

  // 按消费配置恢复输入行，忙碌时将取消按键交给终端容器。
  function restoreInput(previouslyOwned?: boolean): void {
    if (destroyed) return;
    const hidden = options.busyInput === 'hidden' && busy;
    const ownedFocus = previouslyOwned ?? root.contains(document.activeElement);
    restoreOwnedFocus = ownedFocus;
    controller.setVisible(!hidden, ownedFocus);
    if (hidden && ownedFocus) root.focus({ preventScroll: true });
    root.setAttribute('aria-busy', String(busy));
  }

  // 运行态通知只用于通用交互生命周期，具体业务由消费端管理。
  function busyChanged(value: boolean): void {
    busy = value;
    const detachedFocus = document.activeElement === document.body && restoreOwnedFocus;
    interaction.restoreShell(root.contains(document.activeElement) || detachedFocus);
  }

  const runtime = commands ? createCommandRuntime(commands, write, { read, present, setPrompt }, busyChanged) : undefined;

  // 将提交或取消输入连同提示符追加到记录。
  function record(text: string, label = currentPrompt): void {
    const line = document.createElement('div');
    line.className = 'lk-submission';
    const prefix = document.createElement('span');
    prefix.className = 'lk-prompt-prefix';
    prefix.textContent = label;
    prefix.setAttribute('aria-hidden', 'true');
    const content = document.createElement('span');
    content.className = 'lk-submitted-text';
    content.textContent = text;
    line.append(prefix, content);
    stream.append(line);
    revealPrompt();
  }

  // 记录提交原文并交给当前消费模式。
  function submit(text: string): void {
    if (destroyed || interaction.answer(text)) return;
    record(text);
    if (runtime) void runtime.execute(text);
    else onSubmit?.(text);
  }

  // 取消当前任务并记录被丢弃的输入。
  function cancel(text: string): void {
    if (destroyed) return;
    const answering = interaction.isReading();
    runtime?.interrupt();
    record(`${answering ? '' : text}^C`);
  }

  // 将补全歧义以纯文本候选列表写入当前流。
  function suggest(candidates: readonly string[]): void {
    write(candidates.join('  '));
  }

  const actions: PromptActions = { submit };
  if (runtime) {
    actions.isBusy = runtime.isBusy;
    actions.interrupt = cancel;
    actions.complete = runtime.complete;
    actions.suggest = suggest;
    actions.isReading = isReading;
  }
  const controller = createPrompt(document, prompt, actions);
  const interaction = createInteraction(controller, record, write, getLabel, restoreInput);

  // 检查当前输入是否属于命令提问。
  function isReading(): boolean {
    return interaction.isReading();
  }

  // 处理流内面板发出的统一中断事件。
  function interruptPanel(): void {
    cancel('');
  }
  // 输入行隐藏时仍在当前终端内响应取消，避免拦截外部输入。
  function busyKeydown(event: KeyboardEvent): void {
    if (event.target === root && busy && event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      cancel('');
    }
  }
  root.addEventListener('keydown', busyKeydown);
  root.addEventListener('lk-interrupt', interruptPanel);

  // 将焦点交给仍存活的输入行。
  function focus(): void {
    if (destroyed) return;
    if (controller.element.hidden) root.focus({ preventScroll: true });
    else controller.focus();
  }

  // 从消费端取消任务及草稿并保留可继续输入的状态。
  function interrupt(): void {
    if (!destroyed) cancel(controller.clear());
  }

  // 释放实例、运行命令及输入事件，重复调用保持安全。
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    controller.destroy();
    runtime?.interrupt();
    root.removeEventListener('keydown', busyKeydown);
    root.removeEventListener('lk-interrupt', interruptPanel);
    root.remove();
  }

  if (banner !== undefined) {
    const heading = document.createElement('h1');
    heading.className = 'lk-banner';
    heading.textContent = banner;
    root.append(heading);
  }
  root.append(stream, controller.element);
  element.append(root);
  focus();
  return { write, focus, interrupt, destroy, setPrompt };
}

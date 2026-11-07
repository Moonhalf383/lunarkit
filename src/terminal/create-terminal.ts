import { createCommandRuntime } from '../commands/runtime.js';
import type { TerminalOutput } from '../commands/types.js';
import { createPrompt } from '../input/prompt.js';
import type { PromptActions } from '../input/prompt.js';
import type { Terminal, TerminalOptions } from './types.js';

// 在指定元素中创建独立的流式浏览器终端。
export function createTerminal(options: TerminalOptions): Terminal {
  const { element, banner, prompt = '❯', onSubmit, commands } = options;
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

  const runtime = commands ? createCommandRuntime(commands, write) : undefined;

  // 将提交或取消输入连同提示符追加到记录。
  function record(text: string): void {
    const line = document.createElement('div');
    line.className = 'lk-submission';
    const prefix = document.createElement('span');
    prefix.className = 'lk-prompt-prefix';
    prefix.textContent = prompt;
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
    if (destroyed) return;
    record(text);
    if (runtime) void runtime.execute(text);
    else onSubmit?.(text);
  }

  // 取消当前任务并记录被丢弃的输入。
  function cancel(text: string): void {
    if (destroyed) return;
    runtime?.interrupt();
    record(`${text}^C`);
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
  }
  const controller = createPrompt(document, prompt, actions);

  // 将焦点交给仍存活的输入行。
  function focus(): void {
    if (!destroyed) controller.focus();
  }

  // 从消费端取消任务及草稿并保留可继续输入的状态。
  function interrupt(): void {
    if (!destroyed) cancel(controller.clear());
  }

  // 释放实例、运行命令及输入事件，重复调用保持安全。
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    runtime?.interrupt();
    controller.destroy();
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
  return { write, focus, interrupt, destroy };
}

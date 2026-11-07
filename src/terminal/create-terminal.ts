import { createPrompt } from '../input/prompt.js';
import type { Terminal, TerminalOptions } from './types.js';

// 在指定元素中创建独立的流式浏览器终端。
export function createTerminal(options: TerminalOptions): Terminal {
  const { element, banner, prompt = '❯', onSubmit } = options;
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

  // 以纯文本追加一条流记录。
  function appendText(text: string, className: string): void {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = text;
    stream.append(line);
    revealPrompt();
  }

  // 记录提交原文并通知消费端。
  function submit(text: string): void {
    if (destroyed) return;
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
    onSubmit?.(text);
  }

  const controller = createPrompt(document, prompt, submit);

  // 向当前流写入保留空白的文本输出。
  function write(text: string): void {
    if (!destroyed) appendText(text, 'lk-output');
  }

  // 将焦点交给仍存活的输入行。
  function focus(): void {
    if (!destroyed) controller.focus();
  }

  // 释放实例及其输入事件，重复调用保持安全。
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
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
  return { write, focus, destroy };
}

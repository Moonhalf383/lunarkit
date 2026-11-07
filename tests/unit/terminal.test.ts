import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTerminal } from '../../src/index';
import type { Terminal } from '../../src/index';

const instances: Terminal[] = [];

// 清理实例并还原测试页面。
function cleanup(): void {
  for (const terminal of instances) terminal.destroy();
  instances.length = 0;
  document.body.replaceChildren();
}

// 创建使用真实 DOM 的终端测试实例。
function setup(onSubmit?: (text: string) => void): Terminal {
  const element = document.createElement('main');
  document.body.append(element);
  const terminal = createTerminal({ element, banner: 'LunarKit', ...(onSubmit ? { onSubmit } : {}) });
  instances.push(terminal);
  return terminal;
}

// 提交指定输入框的原始值。
function submit(input: HTMLTextAreaElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

// 验证挂载、自动聚焦、纯文本安全及空白保留。
function renderText(): void {
  const terminal = setup();
  expect(document.activeElement?.tagName).toBe('TEXTAREA');
  expect(document.querySelector('h1')?.textContent).toBe('LunarKit');
  const text = '  <img src=x onerror=alert(1)>\n中文🙂  ';
  terminal.write(text);
  terminal.write('');
  const outputs = document.querySelectorAll('.lk-output');
  expect(outputs[0]?.textContent).toBe(text);
  expect(outputs[1]?.textContent).toBe('');
  expect(document.querySelector('img')).toBeNull();
}

// 验证回调接收所有提交原文并清空输入。
function submitText(): void {
  const onSubmit = vi.fn();
  setup(onSubmit);
  const input = document.querySelector('textarea')!;
  for (const text of [' hello ', '', '   ', 'clear', 'help', '\n中文🙂\n']) {
    submit(input, text);
    expect(onSubmit).toHaveBeenLastCalledWith(text);
    expect(document.querySelector('.lk-submission:last-child .lk-submitted-text')?.textContent).toBe(text);
    expect(input.value).toBe('');
  }
}

// 验证输入法组合期间的回车保持编辑状态。
function compositionInput(): void {
  const onSubmit = vi.fn();
  setup(onSubmit);
  const input = document.querySelector('textarea')!;
  input.dispatchEvent(new CompositionEvent('compositionstart'));
  submit(input, '中文');
  expect(onSubmit).not.toHaveBeenCalled();
  expect(input.value).toBe('中文');
  input.dispatchEvent(new CompositionEvent('compositionend'));
  submit(input, '中文');
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith('中文');
}

// 验证独立实例和重复销毁后的方法安全性。
function lifecycle(): void {
  const onSubmit = vi.fn();
  const first = setup(onSubmit);
  const second = setup();
  const input = document.querySelector('textarea')!;
  const removeListener = vi.spyOn(document, 'removeEventListener');
  first.destroy();
  first.destroy();
  first.write('已销毁');
  first.focus();
  submit(input, '不会通知');
  expect(onSubmit).not.toHaveBeenCalled();
  expect(removeListener).toHaveBeenCalledWith('selectionchange', expect.any(Function));
  expect(document.querySelectorAll('.lk-terminal')).toHaveLength(1);
  second.write('独立实例');
  expect(document.querySelector('.lk-output')?.textContent).toBe('独立实例');
}

// 验证布局配置支持像素数值和原样传入的 CSS 长度。
function layoutOptions(): void {
  const element = document.createElement('main');
  document.body.append(element);
  const numeric = createTerminal({ element, paddingInline: 64, maxWidth: 960 });
  instances.push(numeric);
  const first = element.querySelector<HTMLElement>('.lk-terminal')!;
  expect(first.style.paddingInline).toBe('64px');
  expect(first.style.maxWidth).toBe('960px');
  numeric.destroy();
  const css = createTerminal({ element, paddingInline: '5vw', maxWidth: '80rem' });
  instances.push(css);
  const second = element.querySelector<HTMLElement>('.lk-terminal')!;
  expect(second.style.paddingInline).toBe('5vw');
  expect(second.style.maxWidth).toBe('80rem');
}

// 组织终端 DOM 和生命周期测试。
function terminalSuite(): void {
  afterEach(cleanup);
  it('自动聚焦并安全保留文本', renderText);
  it('原样提交所有输入', submitText);
  it('兼容输入法组合', compositionInput);
  it('实例独立且完整清理', lifecycle);
  it('布局配置支持数值和 CSS 长度', layoutOptions);
}

describe('terminal', terminalSuite);

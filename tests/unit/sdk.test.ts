import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCleanup, createTerminal, typewrite, finishTypewrite } from '../../src/index';
import { createInputHistory } from '../../src/input/history';
import type { CommandContext, CommandEvent, Terminal } from '../../src/index';

let terminal: Terminal | undefined;
// 清理实例及定时器，确保每项生命周期检查独立。
function cleanup(): void { terminal?.destroy(); terminal = undefined; vi.useRealTimers(); document.body.replaceChildren(); }
// 提交公开输入以覆盖完整命令生命周期。
function submit(text: string): void {
  const input = document.querySelector('textarea')!;
  input.value = text;
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}
// 验证清理后进先出、异常隔离、监听和定时器释放。
async function resources(): Promise<void> {
  vi.useFakeTimers();
  const errors: unknown[] = [];
  const order: number[] = [];
  // 收集释放错误。
  function error(value: unknown): void { errors.push(value); }
  const stack = createCleanup(error);
  // 记录第一项释放。
  function first(): void { order.push(1); }
  // 模拟第三方释放失败。
  function failing(): void { order.push(2); throw new Error('dispose'); }
  // 记录监听及定时器回调。
  function event(): void { order.push(3); }
  stack.add(first);
  stack.add(failing);
  stack.listen(document, 'custom', event);
  stack.timeout(event, 50);
  stack.dispose();
  stack.dispose();
  document.dispatchEvent(new Event('custom'));
  await vi.runAllTimersAsync();
  expect(order).toEqual([2, 1]);
  expect(errors).toHaveLength(1);
  stack.add(first);
  expect(order).toEqual([2, 1, 1]);
  expect(vi.getTimerCount()).toBe(0);
}
// 验证容量、敏感过滤、去重及草稿恢复。
function history(): void {
  // 排除带秘密前缀的指令。
  function filter(text: string): boolean { return !text.startsWith('secret'); }
  const history = createInputHistory({ limit: 2, deduplicate: true, filter });
  for (const text of ['old', 'one', 'one', 'secret token', 'two']) history.remember(text);
  expect(history.previous('draft')).toBe('two');
  expect(history.previous('')).toBe('one');
  expect(history.previous('')).toBe('one');
  expect(history.next('')).toBe('two');
  expect(history.next('')).toBe('draft');
  const disabled = createInputHistory({ limit: 0 });
  disabled.remember('hidden');
  expect(disabled.previous('draft')).toBe('draft');
}
// 验证宿主标签、初始焦点和补全关联语义。
function messages(): void {
  const external = document.createElement('input');
  document.body.append(external);
  external.focus();
  // 提供无需业务行为的补全命令。
  function run(): void {}
  terminal = createTerminal({ element: document.body, autoFocus: false, messages: { inputLabel: 'Command', historyLabel: 'Messages', completionsLabel: 'Suggestions' }, commands: { hello: { description: '', run }, help: { description: '', run } } });
  expect(document.activeElement).toBe(external);
  const input = document.querySelector('textarea')!;
  expect(input.getAttribute('aria-label')).toBe('Command');
  input.value = 'he';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  const menu = document.querySelector('.lk-completions')!;
  expect(input.getAttribute('aria-controls')).toBe(menu.id);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.getAttribute('aria-selected')).toBe('true');
}
// 验证批量、文本流、关闭后更新隔离与组件释放失败。
function outputs(): void {
  const errors: unknown[] = [];
  // 收集第三方释放错误。
  function onError(error: unknown): void { errors.push(error); }
  terminal = createTerminal({ element: document.body, maxHistoryLines: 3, onError });
  terminal.writeBatch(['one', 'two']);
  const output = terminal.createTextOutput('three');
  output.append(' more');
  expect(document.querySelector('.lk-stream')!.textContent).toBe('onetwothree more');
  output.close();
  output.replace('late');
  expect(document.body.textContent).not.toContain('late');
  // 模拟释放异常并验证后续组件仍释放。
  function failing(): void { throw new Error('release'); }
  let disposed = 0;
  // 统计正常释放次数。
  function dispose(): void { disposed += 1; }
  terminal.write({ element: document.createElement('div'), dispose: failing });
  terminal.write({ element: document.createElement('div'), dispose });
  terminal.destroy();
  expect(errors).toHaveLength(1);
  expect(disposed).toBe(1);
}
// 验证命令事件顺序、错误展示控制与流句柄结束冻结。
async function notifications(): Promise<void> {
  const events: CommandEvent[] = [];
  const errors: unknown[] = [];
  let output: ReturnType<Terminal['createTextOutput']> | undefined;
  // 记录生命周期通知。
  function onCommand(event: CommandEvent): void { events.push(event); }
  // 收集命令异常。
  function onError(error: unknown): void { errors.push(error); }
  // 写出一个在处理器完成后应冻结的流。
  function stream(context: CommandContext): void { output = context.createTextOutput('done'); }
  // 返回明确业务错误。
  function failing(): void { throw new Error('private error'); }
  terminal = createTerminal({ element: document.body, showErrors: false, onCommand, onError, commands: { stream: { description: '', run: stream }, fail: { description: '', run: failing } } });
  submit('stream');
  await Promise.resolve();
  output!.append('late');
  expect(document.body.textContent).not.toContain('late');
  submit('fail');
  await Promise.resolve();
  expect(events.map(phase)).toEqual(['start', 'end', 'start', 'error', 'end']);
  expect(errors).toHaveLength(1);
  expect(document.body.textContent).not.toContain('private error');
  // 提取事件阶段供顺序断言。
  function phase(event: CommandEvent): string { return event.phase; }
}
// 验证取消立即冻结流、迟到组件释放及观察器异常隔离。
async function cancellation(): Promise<void> {
  const phases: string[] = [];
  let context!: CommandContext;
  let finish!: () => void;
  let disposed = 0;
  // 保留命令上下文以模拟迟到的第三方异步结果。
  async function run(value: CommandContext): Promise<void> {
    context = value;
    // 由测试显式解除异步工作。
    function wait(resolve: () => void): void { finish = resolve; }
    await new Promise<void>(wait);
  }
  // 收集事件且故意模拟宿主观察器失败。
  function onCommand(event: CommandEvent): void { phases.push(event.phase); throw new Error('observer'); }
  // 模拟错误观察器失败，验证终端仍完成资源释放。
  function onError(): void { throw new Error('reporter'); }
  // 统计取消后迟到组件的释放。
  function dispose(): void { disposed += 1; }
  terminal = createTerminal({ element: document.body, onCommand, onError, commands: { wait: { description: '', run } } });
  submit('wait');
  const output = context.createTextOutput('waiting');
  terminal.interrupt();
  expect(context.signal.aborted).toBe(true);
  output.replace('late text');
  context.writeBatch([{ element: document.createElement('div'), dispose }]);
  finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(document.body.textContent).not.toContain('late text');
  expect(disposed).toBe(1);
  expect(phases).toEqual(['start', 'cancel']);
}
// 验证跳过全文、整段播报和原始辅助语义恢复。
async function skipTyping(): Promise<void> {
  vi.useFakeTimers();
  const element = document.createElement('p');
  element.textContent = 'Hello Moon';
  element.setAttribute('aria-live', 'polite');
  document.body.append(element);
  const signal = new AbortController();
  const promise = typewrite({ element, signal: signal.signal });
  expect(element.getAttribute('aria-hidden')).toBe('true');
  finishTypewrite(element);
  await promise;
  expect(element.textContent).toBe('Hello Moon');
  expect(element.getAttribute('aria-live')).toBe('polite');
  expect(element.hasAttribute('aria-hidden')).toBe(false);
  expect(document.querySelector('[role="status"]')!.textContent).toBe('Hello Moon');
  expect(document.querySelector('button')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
}
// 组织 SDK 产品化接口专项测试。
function suite(): void {
  afterEach(cleanup);
  it('清理资源与错误隔离', resources);
  it('输入历史策略', history);
  it('本地化及补全语义', messages);
  it('批量文本流与组件释放', outputs);
  it('命令事件及错误通道', notifications);
  it('取消冻结及通知异常隔离', cancellation);
  it('跳过及整段播报', skipTyping);
}
describe('SDK integration', suite);

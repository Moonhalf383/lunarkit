import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTerminal } from '../../src/index';
import { trimHistory } from '../../src/terminal/history';
import type { CommandContext, Terminal } from '../../src/index';

let terminal: Terminal | undefined;
// 销毁终端并恢复滚动与动画测试环境。
function cleanup(): void {
  terminal?.destroy();
  terminal = undefined;
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.replaceChildren();
}

// 提交命令以覆盖公开上下文场景接口。
function submit(): void {
  const input = document.querySelector('textarea')!;
  input.value = 'scene';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

// 验证分页期间取消与销毁均释放动画，迟到输出被隔离。
async function lifecycle(): Promise<void> {
  vi.useFakeTimers();
  // 在无布局环境中保留滚动调用证据。
  function scroll(): void {}
  vi.spyOn(window, 'scrollTo').mockImplementation(scroll);
  vi.spyOn(window, 'scrollBy').mockImplementation(scroll);
  for (const operation of ['interrupt', 'destroy'] as const) {
    let signal: AbortSignal | undefined;
    // 等待过场完成才写入后续内容。
    async function run(context: CommandContext): Promise<void> {
      signal = context.signal;
      await context.nextScene();
      context.write('late scene output');
    }
    terminal = createTerminal({ element: document.body, busyInput: 'hidden', commands: { scene: { description: '', run } } });
    submit();
    expect(document.querySelector('.lk-scene-boundary')).not.toBeNull();
    terminal[operation]();
    await vi.advanceTimersByTimeAsync(500);
    expect(signal!.aborted).toBe(true);
    expect(document.body.textContent).not.toContain('late scene output');
    terminal.destroy();
    expect(document.querySelector('.lk-scene-tail')).toBeNull();
  }
}

// 验证外部会话切换取消原视图分页，后续输出不会进入新视图。
async function switchedView(): Promise<void> {
  vi.useFakeTimers();
  // 在无布局环境中替代浏览器滚动。
  function scroll(): void {}
  vi.spyOn(window, 'scrollTo').mockImplementation(scroll);
  vi.spyOn(window, 'scrollBy').mockImplementation(scroll);
  let signal: AbortSignal | undefined;
  // 模拟正在等待场景滚动的命令。
  async function run(context: CommandContext): Promise<void> {
    signal = context.signal;
    await context.nextScene();
    context.write('wrong view');
  }
  terminal = createTerminal({ element: document.body, commands: { scene: { description: '', run } } });
  submit();
  const view = terminal.openView();
  await vi.advanceTimersByTimeAsync(500);
  expect(signal!.aborted).toBe(true);
  expect(document.body.textContent).not.toContain('wrong view');
  expect(document.querySelector('.lk-stream')!.children).toHaveLength(0);
  view.close();
  submit();
  const child = terminal.openView();
  submit();
  child.close();
  await vi.advanceTimersByTimeAsync(500);
  expect(signal!.aborted).toBe(true);
  expect(document.body.textContent).not.toContain('wrong view');
}

// 验证场景留白消耗零行历史容量并在淘汰后保留当前边界。
function history(): void {
  const stream = document.createElement('div');
  const boundary = document.createElement('div');
  boundary.className = 'lk-scene-boundary';
  boundary.setAttribute('aria-hidden', 'true');
  const output = document.createElement('div');
  output.className = 'lk-output';
  output.textContent = 'current';
  stream.append(boundary, output);
  trimHistory(stream, 1);
  expect(stream.children).toHaveLength(2);
  const next = output.cloneNode(true) as HTMLElement;
  next.textContent = 'next';
  stream.append(next);
  trimHistory(stream, 1);
  expect(stream.contains(boundary)).toBe(true);
  expect(stream.contains(output)).toBe(false);
}

// 验证非法底部留白参数在挂载前返回配置错误。
function invalidSpace(): void {
  for (const inputBottomSpace of [-1, NaN, Infinity]) {
    // 用非法数值调用公开创建接口。
    function create(): void { createTerminal({ element: document.body, inputBottomSpace }); }
    expect(create).toThrow(RangeError);
  }
  expect(document.body.children).toHaveLength(0);
}

// 组织分页生命周期、历史容量和配置边界测试。
function suite(): void {
  afterEach(cleanup);
  it('取消与销毁隔离分页后输出', lifecycle);
  it('会话切换取消原视图分页', switchedView);
  it('分页留白排除历史容量', history);
  it('拒绝非法输入留白', invalidSpace);
}
describe('terminal scenes', suite);

import { afterEach, describe, expect, it } from 'vitest';
import { createTerminal } from '../../src/index';
import type { CommandContext, InteractivePanel, Terminal } from '../../src/index';

const terminals: Terminal[] = [];

// 清理当前测试的全部终端和页面节点。
function cleanup(): void {
  for (const terminal of terminals) terminal.destroy();
  terminals.length = 0;
  document.body.replaceChildren();
}

// 将一行输入提交给真实终端输入框。
function submit(value: string): void {
  const input = document.querySelector('textarea')!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

// 验证秘密输入不会进入输出、历史、剪贴板和取消记录。
async function secretInput(): Promise<void> {
  // 以通用命令请求秘密回答。
  async function run(context: CommandContext): Promise<void> {
    await context.read({ prompt: 'Password:', secret: true });
  }
  const terminal = createTerminal({ element: document.body, commands: { read: { description: '', run } } });
  terminals.push(terminal);
  submit('read');
  const input = document.querySelector('textarea')!;
  input.value = 'private-secret';
  input.dispatchEvent(new Event('input'));
  expect(document.querySelector('.lk-input-mirror')?.textContent).toBe('\u200b');
  const copying = new Event('copy', { cancelable: true });
  input.dispatchEvent(copying);
  expect(copying.defaultPrevented).toBe(true);
  input.setSelectionRange(0, input.value.length);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true }));
  await Promise.resolve();
  expect(input.value).toBe('');
  expect(document.body.textContent).not.toContain('private-secret');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  expect(input.value).toBe('read');
}

// 验证面板聚焦回调中的同步取消和销毁均得到完整清理。
async function panelLifecycle(): Promise<void> {
  for (const operation of ['interrupt', 'destroy']) {
    let disposed = 0;
    const node = document.createElement('div');
    let close!: () => void;
    // 暂存面板关闭入口。
    function wait(resolve: () => void): void { close = resolve; }
    // 模拟面板消费端在聚焦阶段立即取消。
    function focus(): void { terminal[operation as 'interrupt' | 'destroy'](); }
    // 释放消费端面板并完成关闭信号。
    function dispose(): void { disposed += 1; node.remove(); close(); }
    const panel: InteractivePanel = { element: node, closed: new Promise<void>(wait), focus, dispose };
    // 请求 SDK 挂载交互面板。
    async function run(context: CommandContext): Promise<void> { await context.present(panel); }
    const terminal = createTerminal({ element: document.body, commands: { panel: { description: '', run } } });
    terminals.push(terminal);
    submit('panel');
    await Promise.resolve();
    await Promise.resolve();
    expect(disposed).toBe(1);
    terminal.destroy();
  }
}

// 验证销毁一个交互终端时保留其他元素的键盘焦点。
async function focusOnDestroy(): Promise<void> {
  const node = document.createElement('div');
  let close!: () => void;
  // 暂存面板关闭入口。
  function wait(resolve: () => void): void { close = resolve; }
  // 保持测试面板的焦点逻辑最小化。
  function focus(): void {}
  // 释放测试面板。
  function dispose(): void { close(); }
  // 展示一个长驻交互面板。
  async function run(context: CommandContext): Promise<void> {
    await context.present({ element: node, closed: new Promise<void>(wait), focus, dispose });
  }
  const terminal = createTerminal({ element: document.body, commands: { panel: { description: '', run } } });
  terminals.push(terminal);
  submit('panel');
  const external = document.createElement('input');
  document.body.append(external);
  external.focus();
  terminal.destroy();
  await Promise.resolve();
  expect(document.activeElement).toBe(external);
}

// 组织 SDK 通用交互生命周期测试。
function suite(): void {
  afterEach(cleanup);
  it('保护秘密输入及取消记录', secretInput);
  it('处理面板启动阶段取消', panelLifecycle);
  it('销毁时保持外部焦点', focusOnDestroy);
}
describe('interactive commands', suite);

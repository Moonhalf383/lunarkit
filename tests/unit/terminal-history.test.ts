import { afterEach, describe, expect, it } from 'vitest';
import { createTerminal } from '../../src/index';
import { trimHistory } from '../../src/terminal/history';
import type { Terminal } from '../../src/index';

const terminals: Terminal[] = [];

// 销毁历史容量测试的全部终端。
function cleanup(): void {
  for (const terminal of terminals) terminal.destroy();
  terminals.length = 0;
  document.body.replaceChildren();
}

// 创建使用指定逻辑行容量的终端。
function setup(maxHistoryLines?: number): Terminal {
  const terminal = createTerminal({ element: document.body, ...(maxHistoryLines === undefined ? {} : { maxHistoryLines }) });
  terminals.push(terminal);
  return terminal;
}

// 验证默认五百行、完整旧记录移除及超长文本末尾保留。
function textLimit(): void {
  const terminal = setup();
  for (let index = 0; index < 505; index += 1) terminal.write(String(index));
  const stream = document.querySelector('.lk-stream')!;
  expect(stream.children.length).toBe(500);
  expect(stream.firstElementChild?.textContent).toBe('5');
  terminal.write('line\n'.repeat(600) + 'last');
  expect(stream.children.length).toBe(1);
  expect(stream.textContent?.split('\n')).toHaveLength(500);
  expect(stream.textContent?.endsWith('last')).toBe(true);
}

// 验证富内容按块和 br 计数，原地增长后也重新裁剪。
async function richLimit(): Promise<void> {
  const terminal = setup(3);
  terminal.write('old');
  const rich = document.createElement('article');
  rich.innerHTML = '<p>one<br>two</p>\n<p>three</p>';
  terminal.write(rich);
  const stream = document.querySelector('.lk-stream')!;
  expect(stream.children.length).toBe(1);
  expect(stream.contains(rich)).toBe(true);
  rich.innerHTML += '<p>four</p>';
  await Promise.resolve();
  expect(stream.contains(rich)).toBe(true);
  terminal.write('new');
  expect(stream.textContent).toBe('new');
}

// 验证活跃面板和加载节点不会因容量裁剪失去生命周期。
function protectedNodes(): void {
  const stream = document.createElement('div');
  const panel = document.createElement('section');
  panel.innerHTML = '<p>one</p><p>two</p>';
  stream.append(panel);
  const loading = document.createElement('div');
  loading.className = 'lk-loading';
  loading.textContent = 'loading';
  stream.append(loading);
  trimHistory(stream, 1, panel);
  expect(stream.children.length).toBe(2);
  loading.dataset.state = 'complete';
  trimHistory(stream, 1);
  expect(stream.children.length).toBe(1);
  expect(stream.firstElementChild).toBe(loading);
}

// 验证容量配置拒绝无效值且不挂载半成品终端。
function invalidLimit(): void {
  for (const maxHistoryLines of [0, -1, 1.5, NaN, Infinity]) {
    // 使用非法配置验证创建阶段失败。
    function create(): void { createTerminal({ element: document.body, maxHistoryLines }); }
    expect(create).toThrow(RangeError);
  }
  expect(document.body.children.length).toBe(0);
}

// 验证来自另一窗口的挂载节点也遵守容量设置。
function iframeHistory(): void {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const body = frame.contentDocument!.body;
  const terminal = createTerminal({ element: body, maxHistoryLines: 1 });
  terminals.push(terminal);
  terminal.write('old');
  terminal.write('new');
  expect(body.querySelector('.lk-stream')!.textContent).toBe('new');
}

// 组织终端历史容量回归测试。
function suite(): void {
  afterEach(cleanup);
  it('默认容量与多行文本裁剪', textLimit);
  it('富内容与原地更新计数', richLimit);
  it('保护活跃面板和加载节点', protectedNodes);
  it('拒绝非法容量配置', invalidLimit);
  it('其他窗口节点容量有效', iframeHistory);
}
describe('terminal history', suite);

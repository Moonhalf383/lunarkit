import { afterEach, describe, expect, it } from 'vitest';
import { createTerminal } from '../../src/index';
import type { Terminal } from '../../src/index';

let terminal: Terminal | undefined;
// 清理会话视图的测试节点和挂起资源。
function cleanup(): void { terminal?.destroy(); terminal = undefined; document.body.replaceChildren(); }
// 验证父记录和草稿恢复，子组件只在关闭时释放一次。
function restore(): void {
  terminal = createTerminal({ element: document.body, banner: 'Banner' });
  terminal.write('parent');
  const input = document.querySelector('textarea')!;
  input.value = 'draft';
  input.dispatchEvent(new Event('input'));
  const view = terminal.openView();
  expect(document.querySelector('.lk-stream')!.textContent).toBe('');
  expect(input.value).toBe('');
  let disposed = 0;
  // 统计子视图组件释放次数。
  function dispose(): void { disposed += 1; }
  terminal.write({ element: document.createElement('div'), dispose });
  terminal.setPrompt('child');
  view.close();
  view.close();
  expect(document.querySelector('.lk-stream')!.textContent).toBe('parent');
  expect(input.value).toBe('draft');
  expect(document.querySelector('.lk-prompt-prefix')!.textContent).toBe('❯');
  expect(disposed).toBe(1);
  expect(document.querySelector<HTMLElement>('.lk-banner')!.hidden).toBe(false);
}
// 组织会话视图的生命周期验收。
function suite(): void { afterEach(cleanup); it('恢复记录标签草稿并释放子组件', restore); }
describe('terminal views', suite);

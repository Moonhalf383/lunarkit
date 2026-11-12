import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScroll } from '../../src/terminal/scroll';

// 恢复浏览器测量与动画调度替身。
function cleanup(): void { vi.restoreAllMocks(); document.body.replaceChildren(); }
// 构建具有确定尺寸的滚动宿主及目标。
function fixture() {
  const container = document.createElement('div');
  const root = document.createElement('section');
  const target = document.createElement('textarea');
  document.body.append(container);
  container.append(root); root.append(target);
  Object.defineProperty(container, 'clientHeight', { value: 320 });
  // 固定宿主视口的位置。
  function viewport(): DOMRect { return new DOMRect(0, 0, 640, 320); }
  // 模拟尚未滚动到最新内容的根区域。
  function content(): DOMRect { return new DOMRect(0, 0, 640, 2000); }
  // 为超高编辑器建立部分可见的测量结果。
  function editor(): DOMRect { return new DOMRect(0, 0, 640, 360); }
  // 同步模拟实际滚动位置。
  function move(options?: ScrollToOptions | number, y?: number): void { container.scrollTop = typeof options === 'number' ? y ?? 0 : options?.top ?? 0; }
  container.getBoundingClientRect = viewport;
  root.getBoundingClientRect = content;
  target.getBoundingClientRect = editor;
  container.scrollTo = vi.fn(move);
  return { container, root, target };
}
// 部分可见的超高编辑器保留位置，完全不可见时才移回视口。
function tallPanel(): void {
  const { container, root, target } = fixture();
  const scroll = createScroll(root, { container });
  scroll.reveal(target, 0);
  expect(container.scrollTo).not.toHaveBeenCalled();
  // 将编辑器放到视口下方以验证重新定位。
  function below(): DOMRect { return new DOMRect(0, 500, 640, 360); }
  target.getBoundingClientRect = below;
  scroll.reveal(target, 0);
  expect(container.scrollTop).toBe(500);
  scroll.dispose();
}
// 用户在程序滚动帧内改变位置时仍能暂停接近底部跟随。
function userScroll(): void {
  const { container, root } = fixture();
  const scroll = createScroll(root, { container, follow: 'near-bottom' });
  scroll.move(1700);
  container.dispatchEvent(new Event('scroll'));
  expect(scroll.shouldFollow()).toBe(true);
  container.scrollTop = 0;
  container.dispatchEvent(new Event('scroll'));
  expect(scroll.shouldFollow()).toBe(false);
  scroll.resume();
  expect(scroll.shouldFollow()).toBe(true);
  scroll.dispose();
}
// 组织滚动竞争及超高面板回归。
function suite(): void {
  afterEach(cleanup);
  it('保留超高面板阅读位置', tallPanel);
  it('同帧用户滚动更新跟随意图', userScroll);
}
describe('host scroll', suite);

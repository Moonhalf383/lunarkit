import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderMarkdown, showLoading } from '../../src/index';

// 验证文档保留常用格式，同时将危险内容安全处理。
function markdown(): void {
  const node = renderMarkdown('# Title\n\n**bold**\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n[good](https://example.com)\n\n![image](https://example.com/x)');
  expect(node.querySelector('h1')?.textContent).toBe('Title');
  expect(node.querySelector('strong')?.textContent).toBe('bold');
  expect(node.querySelector('script')).toBeNull();
  expect(node.querySelector('img')).toBeNull();
  expect(node.querySelector('a')?.hasAttribute('href')).toBe(false);
  expect(node.querySelector('a[href]')?.getAttribute('href')).toBe('https://example.com');
  expect(node.textContent).toContain('<script>alert(1)</script>');
}

// 验证加载完成及取消均释放计时器。
async function loading(): Promise<void> {
  vi.useFakeTimers();
  const signal = new AbortController();
  const nodes: HTMLElement[] = [];
  // 收集 SDK 输出节点。
  function write(node: HTMLElement): void { nodes.push(node); }
  const pending = showLoading({ label: 'Loading', duration: 3000, signal: signal.signal, write });
  expect(nodes[0]?.textContent).toContain('Loading');
  await vi.advanceTimersByTimeAsync(3000);
  await pending;
  expect(nodes[0]?.dataset.state).toBe('complete');
  expect(vi.getTimerCount()).toBe(0);
  const controller = new AbortController();
  const cancelled = showLoading({ label: 'Reading', duration: 1000, kind: 'progress', signal: controller.signal, write });
  controller.abort();
  await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
  expect(nodes[1]?.dataset.state).toBe('cancelled');
  expect(vi.getTimerCount()).toBe(0);
}

// 恢复计时器环境。
function cleanup(): void { vi.useRealTimers(); }

// 组织通用 SDK 文档渲染及加载状态测试。
function suite(): void {
  afterEach(cleanup);
  it('安全渲染 Markdown', markdown);
  it('释放完成和取消的加载资源', loading);
}
describe('stream output helpers', suite);

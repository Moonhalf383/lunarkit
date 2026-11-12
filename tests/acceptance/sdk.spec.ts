import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// 等待两帧以覆盖合并布局与程序滚动标记清理。
async function frames(page: Page): Promise<void> {
  // 浏览器内等待稳定布局。
  async function stable(): Promise<void> {
    // 注册首帧回调。
    function next(resolve: () => void): void {
      // 注册第二帧回调。
      function again(): void { requestAnimationFrame(resolve); }
      requestAnimationFrame(again);
    }
    await new Promise<void>(next);
  }
  await page.evaluate(stable);
}
// 验证宿主滚动、手动跟随与场景对齐，同时保留外部焦点。
async function scrolling({ page }: { page: Page }): Promise<void> {
  await page.goto('/tests/fixtures/sdk.html');
  await page.locator('#outside').focus();
  // 设置容器与手动跟随，追加足够长的内容。
  function manual(): void { window.setup({ container: true, follow: 'manual' }); window.terminal.writeBatch(Array(80).fill('line')); }
  await page.evaluate(manual);
  await frames(page);
  await expect(page.locator('#outside')).toBeFocused();
  // 读取宿主滚动位置。
  function top(): number { return document.querySelector('#host')!.scrollTop; }
  expect(await page.evaluate(top)).toBe(0);
  // 显式返回输入位置。
  function latest(): void { window.terminal.scrollToLatest(); }
  await page.evaluate(latest);
  await frames(page);
  expect(await page.evaluate(top)).toBeGreaterThan(100);
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill('scene');
  await input.press('Enter');
  await expect(page.locator('.lk-output').last()).toHaveText('New scene');
  // 场景起点应匹配宿主视口与十二像素留白。
  function alignment(): number {
    const host = document.querySelector<HTMLElement>('#host')!;
    const anchor = document.querySelector('.lk-scene-anchor')!;
    return anchor.getBoundingClientRect().top - host.getBoundingClientRect().top - host.clientTop;
  }
  expect(await page.evaluate(alignment)).toBeCloseTo(12, 0);
}
// 验证阅读历史时停止跟随，显式恢复后继续追踪输出。
async function following({ page }: { page: Page }): Promise<void> {
  await page.goto('/tests/fixtures/sdk.html');
  // 建立接近底部跟随容器。
  function setup(): void { window.setup({ container: true, follow: 'near-bottom' }); window.terminal.writeBatch(Array(80).fill('line')); }
  await page.evaluate(setup);
  await frames(page);
  // 模拟用户回到顶部并发出宿主滚动事件。
  function readHistory(): void { const host = document.querySelector('#host')!; host.scrollTop = 0; host.dispatchEvent(new Event('scroll')); }
  await page.evaluate(readHistory);
  await frames(page);
  // 新输出应保留用户阅读位置。
  function append(): void { window.terminal.write('latest'); }
  await page.evaluate(append);
  await frames(page);
  // 读取容器当前位置。
  function top(): number { return document.querySelector('#host')!.scrollTop; }
  expect(await page.evaluate(top)).toBe(0);
  // 恢复最新位置与跟随意图。
  function resume(): void { window.terminal.scrollToLatest(); }
  await page.evaluate(resume);
  await frames(page);
  expect(await page.evaluate(top)).toBeGreaterThan(100);
}
// 验证文字跳过及辅助结构，保留真实屏幕阅读器人工检查边界。
async function accessibleTyping({ page }: { page: Page }): Promise<void> {
  await page.goto('/tests/fixtures/sdk.html');
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill('story');
  await input.press('Enter');
  await expect(page.locator('[data-typing]')).toHaveAttribute('aria-hidden', 'true');
  await page.getByRole('button', { name: 'Reveal message' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[role="status"]')).toHaveText('A quiet message from the moon.');
  await expect(page.locator('[data-typing]')).toHaveCount(0);
  await expect(page.locator('.lk-skip-animation')).toHaveCount(0);
}
// 验证真实浏览器 Markdown 清理与内容安全。
async function markdown({ page }: { page: Page }): Promise<void> {
  await page.goto('/tests/fixtures/sdk.html');
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill('markdown');
  await input.press('Enter');
  await expect(page.locator('.lk-markdown img')).toHaveCount(0);
  await expect(page.locator('.lk-markdown')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.lk-markdown a').first()).not.toHaveAttribute('href', /javascript/u);
  await expect(page.getByRole('link', { name: 'good' })).toHaveAttribute('rel', 'noopener noreferrer');
}
// 记录批量容量与资源释放数量，耗时作为测量数据而非跨机器阈值。
async function performance({ page }: { page: Page }): Promise<void> {
  await page.goto('/tests/fixtures/sdk.html');
  // 执行真实布局环境下的批量样本。
  function sample(): ReturnType<Window['performanceSample']> { return window.performanceSample(); }
  const result = await page.evaluate(sample);
  expect(result.entries).toBe(500);
  expect(result.released).toBe(5000);
  expect(result.remaining).toBe(0);
  await test.info().attach('batch-performance.json', { body: JSON.stringify(result), contentType: 'application/json' });
}

// 验证 Trusted Types 强制策略下的文本及 Markdown。
async function security({ page }: { page: Page }): Promise<void> {
  await page.goto('/tests/fixtures/security.html');
  await expect(page.locator('#host')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#host')).toHaveAttribute('data-markdown', 'passed');
  await expect(page.locator('.lk-output').first()).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.lk-markdown strong')).toHaveText('Safe');
}

test('CSP 与 Trusted Types', security);
test('宿主滚动与场景配置', scrolling);
test('历史阅读暂停跟随', following);
test('跳过与整段播报结构', accessibleTyping);
test('Markdown 安全输出', markdown);
test('批量容量与资源释放', performance);

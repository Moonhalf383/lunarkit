import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// 固定浏览器计时器，等待字体和初始选区事件完成后开始推进空闲时间。
async function setupClock(page: Page): Promise<void> {
  await page.clock.install();
  await page.goto('/');
  // 等待实际字体加载结束以稳定光标位置。
  async function waitForFonts(): Promise<void> {
    await document.fonts.ready;
  }
  await page.evaluate(waitForFonts);
  await expect(page.getByRole('textbox')).toBeFocused();
  // 派发同步编辑事件以重新开始可控的空闲计时。
  function resetActivity(input: HTMLTextAreaElement): void {
    input.dispatchEvent(new Event('input'));
  }
  await page.getByRole('textbox').evaluate(resetActivity);
}

// 验证连续移动和输入重置空闲倒计时，停止后恢复闪烁。
async function movementAndTyping({ page }: { page: Page }): Promise<void> {
  await setupClock(page);
  const input = page.getByRole('textbox');
  const caret = page.locator('.lk-caret');
  await input.fill('abcdef');
  await page.clock.runFor(600);
  await expect(caret).toHaveCSS('animation-name', 'lk-blink');
  for (let index = 0; index < 4; index += 1) {
    await input.press('ArrowLeft');
    await expect(caret).toHaveCSS('animation-name', 'none');
    await expect(caret).toHaveCSS('opacity', '1');
    await page.clock.runFor(400);
    await expect(caret).toHaveCSS('animation-name', 'none');
  }
  await input.press('x');
  await page.clock.runFor(500);
  await expect(caret).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(100);
  await expect(caret).toHaveCSS('animation-name', 'lk-blink');
  await input.press('Enter');
  await input.press('ArrowUp');
  await expect(caret).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(600);
  await expect(caret).toHaveCSS('animation-name', 'lk-blink');
}

// 验证输入法期间持续常亮，失焦清除计时，重新聚焦后重新等待空闲。
async function compositionAndFocus({ page }: { page: Page }): Promise<void> {
  await setupClock(page);
  const input = page.getByRole('textbox');
  const caret = page.locator('.lk-caret');
  await input.dispatchEvent('compositionstart');
  await input.fill('中文');
  await page.clock.runFor(2000);
  await expect(caret).toHaveCSS('animation-name', 'none');
  await input.dispatchEvent('compositionend');
  await page.clock.runFor(600);
  await expect(caret).toHaveCSS('animation-name', 'lk-blink');
  await input.press('ArrowLeft');
  // 将焦点移出输入行以验证空闲计时释放。
  function blur(input: HTMLTextAreaElement): void {
    input.blur();
  }
  await input.evaluate(blur);
  await page.clock.runFor(1000);
  await expect(caret).not.toHaveClass(/lk-caret-idle/u);
  await expect(caret).toBeHidden();
  await input.focus();
  await expect(caret).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(600);
  await expect(caret).toHaveCSS('animation-name', 'lk-blink');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(caret).toHaveCSS('animation-name', 'none');
  await expect(caret).toHaveCSS('opacity', '1');
}

test('移动和输入时常亮，空闲后闪烁', movementAndTyping);
test('组合输入与焦点切换的闪烁状态', compositionAndFocus);

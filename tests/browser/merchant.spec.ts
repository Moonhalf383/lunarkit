import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// 提交游戏终端当前可见输入行。
async function command(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await input.fill(text);
  await input.press('Enter');
}

// 在干净浏览器中创建第一槽位的新航程。
async function start(page: Page): Promise<void> {
  await page.goto('http://127.0.0.1:4178/');
  await command(page, 'play');
  const first = page.getByRole('button', { name: 'Slot 1', exact: false });
  await expect(first).toBeFocused();
  await first.press('Enter');
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText('merchant solace ❯');
}

// 验证三槽选择、键入交易、显式保存及刷新恢复。
async function saveAndResume({ page }: { page: Page }): Promise<void> {
  await start(page);
  await command(page, 'do buy grain');
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText('Quantity:');
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await input.fill('3');
  await input.press('Enter');
  await expect(page.locator('.lk-output').last()).toContainText('Bought 3 grain');
  await command(page, 'pause');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText('paused solace ❯');
  await page.reload();
  await command(page, 'play');
  await page.getByRole('button', { name: /Slot 1.*Turn 0/u }).click();
  await page.getByRole('button', { name: 'Resume voyage', exact: true }).click();
  await command(page, 'fetch');
  await expect(page.locator('.merchant-stats').last().locator('dd').nth(5)).toHaveText('3/30');
  await expect(page.locator('.merchant-dashboard .lk-chart-line')).toHaveCount(0);
  await expect(page.locator('.merchant-dashboard .lk-chart-bar')).toHaveCount(0);
  const layout = await page.locator('.merchant-dashboard').boundingBox();
  expect(layout!.height).toBeLessThan(440);
  // 对照两列起点及模型字号，固定默认状态视图的紧凑布局。
  function measureColumns(): { difference: number; fontSize: string } {
    const columns = document.querySelector('.merchant-dashboard')!;
    const left = columns.children[0]!.getBoundingClientRect();
    const right = columns.children[1]!.getBoundingClientRect();
    return { difference: Math.abs(left.top - right.top), fontSize: getComputedStyle(columns.querySelector('.lk-model')!).fontSize };
  }
  expect(await page.evaluate(measureColumns)).toEqual({ difference: 0, fontSize: '10px' });
  await expect(page.locator('.lk-model').last()).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/example4-dashboard.png', fullPage: true });
  await command(page, 'fetch history');
  await expect(page.locator('.merchant-detail-chart.lk-chart-line')).toHaveCount(1);
  await command(page, 'fetch cargo');
  await expect(page.locator('.merchant-cargo .lk-chart-legend li')).toHaveCount(1);
  await expect(page.locator('.merchant-cargo')).toContainText('Solar Grain 3');
  await page.setViewportSize({ width: 320, height: 640 });
  await command(page, 'fetch');
  // 窄屏默认状态视图保持单列排列且模型完整容纳。
  function mobileWidth(): number { return document.documentElement.scrollWidth; }
  expect(await page.evaluate(mobileWidth)).toBeLessThanOrEqual(320);
}

// 验证航行事件、选择期间优先暂停及保存后仍保持暂停。
async function eventPause({ page }: { page: Page }): Promise<void> {
  await start(page);
  await command(page, 'do depart prism');
  await command(page, 'do travel');
  await expect(page.getByRole('button', { name: 'Wait out the danger: lose 12 hull', exact: true })).toBeVisible();
  await page.keyboard.type('x');
  await page.getByRole('button', { name: 'Wait out the danger: lose 12 hull', exact: true }).click();
  await command(page, 'do travel');
  await expect(page.getByRole('button', { name: 'Wait out the danger: lose 12 hull', exact: true })).toBeVisible();
  await page.keyboard.type('pause');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await command(page, 'do resolve endure');
  await command(page, 'fetch');
  await expect(page.locator('.merchant-stats').last()).toContainText('Turn2');
}

// 验证道具安全文档、星球对称布局和窄屏图形。
async function visualDetails({ page }: { page: Page }): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4178/');
  await command(page, 'about');
  await expect(page.locator('.merchant-banner')).toHaveText('LuanrMerchant');
  await command(page, 'fetch patch');
  await expect(page.locator('.merchant-item h2')).toHaveText('Hull Patch');
  await expect(page.locator('.merchant-item .lk-markdown')).toContainText('25 hull');
  await command(page, 'fetch prism');
  await expect(page.locator('.merchant-planet')).toContainText('Prism');
  await expect(page.locator('.merchant-planet > div').first()).toHaveCSS('text-align', 'right');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.screenshot({ path: 'test-results/example4-mobile.png', fullPage: true });
  // 检查窄屏文档宽度是否保持在视口之内。
  function width(): number { return document.documentElement.scrollWidth; }
  expect(await page.evaluate(width)).toBeLessThanOrEqual(320);
}

// 验证打字机仍运行时可以直接键入暂停命令。
async function typingPause({ page }: { page: Page }): Promise<void> {
  await start(page);
  await command(page, 'fetch shield');
  await page.keyboard.type('pause');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await command(page, 'fetch');
  await expect(page.locator('.merchant-stats').last()).toContainText('Turn0');
}

test('example4 三槽保存与刷新恢复', saveAndResume);
test('example4 事件中暂停与继续', eventPause);
test('example4 详情和窄屏图形', visualDetails);
test('example4 打字机中优先暂停', typingPause);

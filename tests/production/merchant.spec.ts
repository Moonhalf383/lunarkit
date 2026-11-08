import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// 验证静态产物中选择、游戏消费和 SDK 图形的完整链路。
async function builtMerchant({ page }: { page: Page }): Promise<void> {
  await page.goto('http://127.0.0.1:4179/');
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await input.fill('play');
  await input.press('Enter');
  await page.getByRole('button', { name: /Slot 2/u }).click();
  await input.fill('fetch');
  await input.press('Enter');
  await expect(page.locator('.merchant-stats')).toContainText('Credits1000');
  await expect(page.locator('.lk-chart-pie')).toHaveCount(2);
  await expect(page.locator('.lk-model')).toBeVisible();
}
test('example4 静态游戏与可视化', builtMerchant);

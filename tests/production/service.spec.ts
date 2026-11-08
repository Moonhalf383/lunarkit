import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// 验证生产构建中的 SDK 交互输入和 Markdown 渲染链路。
async function builtSession({ page }: { page: Page }): Promise<void> {
  await page.clock.install();
  await page.goto('http://127.0.0.1:4177/');
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await input.fill('login');
  await input.press('Enter');
  await page.clock.runFor(3000);
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText('login as:');
  await input.fill('user2');
  await input.press('Enter');
  const secret = page.getByRole('textbox', { name: '密码', exact: true });
  await secret.fill('lunarkit');
  await secret.press('Enter');
  await expect(page.locator('.service-banner')).toHaveText('LunarService');
  await input.fill('cat readme.md');
  await input.press('Enter');
  await page.clock.runFor(1000);
  await expect(page.locator('.lk-markdown h1')).toHaveText('User Two');
}
test('example3 静态产物交互会话', builtSession);

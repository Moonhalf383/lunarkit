import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

// 验证构建产物的初始状态、帮助与惰性文件读取。
async function builtFiles({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const input = page.getByRole('textbox');
  await expect(page.locator('h1')).toHaveCount(0);
  await input.fill('help');
  await input.press('Enter');
  await expect(page.locator('.command-help-brand span')).toHaveText(['Lunar', 'Kit']);
  await input.fill('ls');
  await input.press('Enter');
  await expect(page.locator('.lk-output').last()).toContainText('hello world.txt');
  await input.fill('cat "hello world.txt"');
  await input.press('Enter');
  await expect(page.locator('.lk-output').last()).toContainText('你好，LunarKit 🙂');
}

// 验证生产惰性模块在 Ctrl+C 后迟到完成时保持取消隔离。
async function builtCancellation({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const input = page.getByRole('textbox');
  let held: Route | undefined;
  // 挂起构建后的 readme 文本模块请求。
  async function hold(route: Route): Promise<void> {
    held = route;
  }
  await page.route('**/assets/readme-*.js', hold);
  await input.fill('cat readme.txt');
  await input.press('Enter');
  // 检查生产模块是否已进入挂起状态。
  function reading(): boolean {
    return held !== undefined;
  }
  await expect.poll(reading).toBe(true);
  await input.press('Control+c');
  await input.fill('help');
  await input.press('Enter');
  await expect(page.locator('.command-help')).toHaveCount(1);
  await held!.continue();
  await page.unroute('**/assets/readme-*.js', hold);
  await input.fill('cat readme.txt');
  await input.press('Enter');
  await expect(page.locator('.lk-output')).toHaveCount(1);
  await expect(page.locator('.lk-output')).toContainText('Welcome to LunarKit.');
}

test('构建产物读取挂载文件', builtFiles);
test('构建产物异步取消', builtCancellation);

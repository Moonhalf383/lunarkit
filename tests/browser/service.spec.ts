import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// 提交当前 shell 命令并保留原始输入路径。
async function execute(page: Page, value: string): Promise<void> {
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await input.fill(value);
  await input.press('Enter');
}

// 使用虚拟时钟完成演示连接和交互认证。
async function login(page: Page, user = 'user1'): Promise<void> {
  await execute(page, 'login');
  await expect(page.locator('.lk-loading').last()).toContainText('Connecting');
  await page.clock.runFor(3000);
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText('login as:');
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await input.fill(user);
  await input.press('Enter');
  const password = page.getByRole('textbox', { name: '密码', exact: true });
  await expect(password).toBeFocused();
  await password.fill('lunarkit');
  await expect(password).toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.lk-input-mirror')).toHaveText('\u200b');
  await expect(page.getByRole('log')).not.toContainText('lunarkit');
  await password.press('Enter');
  await expect(page.locator('.service-banner').last()).toHaveText('LunarService');
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText(`${user} ❯`);
}

// 验证 guest 边界、秘密输入、登录及 Markdown 加载。
async function session({ page }: { page: Page }): Promise<void> {
  await page.clock.install();
  await page.goto('http://127.0.0.1:4176/');
  await expect(page.locator('.lk-prompt-prefix')).toHaveText(/^guest[0-9a-f]{8} ❯$/u);
  for (const command of ['pwd', 'ls', 'cat readme.md', 'minivim notes.txt', 'cd']) {
    await execute(page, command);
    await expect(page.locator('.lk-output').last()).toHaveText('Please login first.');
  }
  await login(page);
  await execute(page, 'pwd');
  await expect(page.locator('.lk-output').last()).toHaveText('/');
  await execute(page, 'cat readme.md');
  await expect(page.locator('.lk-loading').last()).toContainText('0%');
  await page.clock.runFor(1000);
  await expect(page.locator('.lk-markdown h1')).toHaveText('User One');
  await expect(page.locator('.lk-markdown h1')).toHaveCSS('font-size', '24px');
  await page.screenshot({ path: 'test-results/example3-session.png', fullPage: true });
  await execute(page, 'cd docs');
  await execute(page, 'pwd');
  await expect(page.locator('.lk-output').last()).toHaveText('/docs');
  await execute(page, 'cd ../../');
  await expect(page.locator('.lk-output').last()).toContainText('escapes workspace');
  await execute(page, 'exit');
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText(/^guest[0-9a-f]{8} ❯$/u);
  await execute(page, 'whoami');
  await expect(page.locator('.lk-output').last()).toHaveText(/^guest[0-9a-f]{8}$/u);
}

// 在流内编辑器修改并保存文件，然后验证 admin 与用户共享挂载。
async function editor({ page }: { page: Page }): Promise<void> {
  await page.clock.install();
  await page.goto('http://127.0.0.1:4176/');
  await login(page, 'admin');
  await execute(page, 'cd user1');
  await execute(page, 'minivim notes.txt');
  const buffer = page.getByRole('textbox', { name: '编辑文件', exact: true });
  await expect(buffer).toBeFocused();
  await expect(page.locator('.lk-prompt')).toBeHidden();
  await buffer.press('i');
  await buffer.press('X');
  await buffer.press('Escape');
  await buffer.press(':');
  const command = page.getByRole('textbox', { name: 'Vim 命令', exact: true });
  await command.fill(':q');
  await command.press('Enter');
  await expect(page.locator('.minivim-status')).toContainText('Unsaved');
  await buffer.press(':');
  await command.fill(':wq');
  await command.press('Enter');
  await expect(page.locator('.minivim')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '输入内容', exact: true })).toBeFocused();
  await execute(page, 'exit');
  await login(page);
  await execute(page, 'cat notes.txt');
  await page.clock.runFor(1000);
  await expect(page.locator('.lk-output').last()).toContainText('XHello from user1.');
  await execute(page, 'minivim notes.txt');
  const panel = await page.locator('.minivim').boundingBox();
  expect(panel!.height).toBeLessThanOrEqual(15 * 25.6 + 1);
  await page.screenshot({ path: 'test-results/example3-minivim.png' });
  await buffer.press('l');
  await buffer.press('h');
  await buffer.press('j');
  await buffer.press('k');
  await buffer.press('a');
  await buffer.press('Z');
  await buffer.press('Escape');
  await buffer.press(':');
  await command.fill(':q!');
  await command.press('Enter');
  await expect(page.locator('.minivim')).toHaveCount(0);
  await execute(page, 'cat notes.txt');
  await page.clock.runFor(1000);
  await expect(page.locator('.lk-output').last()).toContainText('XHello from user1.');
  await execute(page, 'minivim notes.txt');
  await buffer.press('Control+c');
  await expect(page.locator('.minivim')).toHaveCount(0);
}

// 验证加载与秘密输入可以取消，迟到回调保持会话未登录。
async function cancellation({ page }: { page: Page }): Promise<void> {
  await page.clock.install();
  await page.goto('http://127.0.0.1:4176/');
  await execute(page, 'login');
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await input.press('Control+c');
  await page.clock.runFor(4000);
  await expect(page.locator('.lk-loading')).toContainText('cancelled');
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText(/^guest/u);
  await execute(page, 'login');
  await page.clock.runFor(3000);
  await input.fill('user1');
  await input.press('Enter');
  const secret = page.getByRole('textbox', { name: '密码', exact: true });
  await secret.fill('private-value');
  await secret.press('Control+c');
  await expect(input).toBeFocused();
  await expect(page.locator('.lk-terminal')).not.toContainText('private-value');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('login');
}

// 验证错误密码、cat 加载取消以及选中密码后的安全中断。
async function failures({ page }: { page: Page }): Promise<void> {
  await page.clock.install();
  await page.goto('http://127.0.0.1:4176/');
  await execute(page, 'login');
  await page.clock.runFor(3000);
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await input.fill('user2');
  await input.press('Enter');
  const secret = page.getByRole('textbox', { name: '密码', exact: true });
  await secret.fill('wrong-password');
  await secret.press('Enter');
  await expect(page.locator('.lk-output').last()).toHaveText('Permission denied.');
  await expect(page.locator('.lk-terminal')).not.toContainText('wrong-password');
  await login(page);
  await execute(page, 'cat readme.md');
  await input.press('Control+c');
  await page.clock.runFor(1500);
  await expect(page.locator('.lk-loading').last()).toContainText('cancelled');
  await expect(page.locator('.lk-markdown')).toHaveCount(0);
  await execute(page, 'exit');
  await execute(page, 'login');
  await page.clock.runFor(3000);
  await input.fill('admin');
  await input.press('Enter');
  await secret.fill('selected-secret');
  await secret.press('Control+a');
  await secret.press('Control+c');
  await expect(input).toBeFocused();
  await expect(page.locator('.lk-terminal')).not.toContainText('selected-secret');
}

test('example3 错误登录与加载取消', failures);
test('example3 登录与工作目录', session);
test('example3 流内编辑和共享挂载', editor);
test('example3 连接与秘密输入取消', cancellation);

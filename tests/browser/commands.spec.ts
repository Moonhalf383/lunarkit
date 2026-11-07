import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

// 进入第二用例并等待输入行聚焦。
async function openExample(page: Page): Promise<void> {
  await page.goto('http://127.0.0.1:4174/');
  await expect(page.getByRole('textbox')).toBeFocused();
}

// 提交一条完整命令。
async function execute(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox');
  await input.fill(text);
  await input.press('Enter');
}

// 验证首屏仅有输入行，help 输出指定双栏与细竖线。
async function helpLayout({ page }: { page: Page }): Promise<void> {
  await openExample(page);
  await expect(page.locator('h1')).toHaveCount(0);
  await expect(page.getByRole('log')).toBeEmpty();
  await execute(page, 'help');
  const help = page.getByRole('region', { name: 'LunarKit help' });
  await expect(help).toBeVisible();
  await expect(help.locator('h1 span')).toHaveText(['Lunar', 'Kit']);
  await expect(help.locator('h1')).toHaveCSS('text-align', 'right');
  await expect(help.locator('.command-help-details')).toHaveCSS('border-left-width', '1px');
  await expect(help.locator('dt')).toHaveText(['help:', 'ls:', 'cat:']);
  await expect(help.locator('p')).toContainText('LunarKit is a lightweight');
  await page.screenshot({ path: 'test-results/example2-help.png' });
  await page.setViewportSize({ width: 320, height: 640 });
  // 检查帮助布局在窄屏下保持双栏且无横向溢出。
  function layout(): { overflowing: boolean; columns: string } {
    return {
      overflowing: document.documentElement.scrollWidth > window.innerWidth,
      columns: getComputedStyle(document.querySelector('.command-help')!).gridTemplateColumns,
    };
  }
  const dimensions = await page.evaluate(layout);
  expect(dimensions.overflowing).toBe(false);
  expect(dimensions.columns.split(' ')).toHaveLength(2);
  await page.screenshot({ path: 'test-results/example2-help-mobile.png', fullPage: true });
}

// 验证 ls、带空格文件名、嵌套文件、空文件及错误提示。
async function fileCommands({ page }: { page: Page }): Promise<void> {
  await openExample(page);
  await execute(page, 'ls');
  await expect(page.locator('.lk-output').last()).toHaveText('docs/\nempty.txt\nhello world.txt\nreadme.txt');
  await execute(page, 'cat "hello world.txt"');
  await expect(page.locator('.lk-output').last()).toContainText('你好，LunarKit 🙂');
  expect(await page.locator('.lk-output').last().textContent()).toContain('  Spaces and line breaks are preserved.\n<script>');
  await expect(page.locator('.lk-stream script')).toHaveCount(0);
  await execute(page, 'cat docs/guide.md');
  await expect(page.locator('.lk-output').last()).toContainText('# LunarKit guide');
  await execute(page, 'cat empty.txt');
  await expect(page.locator('.lk-output').last()).toBeEmpty();
  await execute(page, 'cat ../secret');
  await expect(page.locator('.lk-output').last()).toContainText('escapes mounted directory');
  await execute(page, 'cat missing');
  await expect(page.locator('.lk-output').last()).toHaveText('File not found: missing');
  await execute(page, 'cat');
  await expect(page.locator('.lk-output').last()).toHaveText('Usage: cat <filename>');
  await execute(page, 'help extra');
  await expect(page.locator('.lk-output').last()).toHaveText('Usage: help');
  await execute(page, 'unknown');
  await expect(page.locator('.lk-output').last()).toContainText('Unknown command: unknown');
}

// 验证命令、文件补全和历史草稿的键盘消费流程。
async function completionAndHistory({ page }: { page: Page }): Promise<void> {
  await openExample(page);
  const input = page.getByRole('textbox');
  await input.fill('h');
  await input.press('Tab');
  await expect(input).toHaveValue('help ');
  await input.press('Enter');
  await input.fill('cat h');
  await input.press('Tab');
  await expect(input).toHaveValue('cat "hello world.txt" ');
  await input.press('Enter');
  await expect(page.locator('.lk-output').last()).toContainText('你好');
  await input.fill('cat d');
  await input.press('Tab');
  await expect(input).toHaveValue('cat docs/');
  await input.press('Tab');
  await expect(input).toHaveValue('cat docs/guide.md ');
  await input.press('Enter');
  await expect(page.locator('.lk-output').last()).toContainText('# LunarKit guide');
  await input.fill('draft');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('cat docs/guide.md ');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('draft');
  await input.fill('cat ');
  await input.press('Tab');
  await expect(input).toHaveValue('cat ');
  await expect(page.locator('.lk-output').last()).toHaveText('docs/  empty.txt  hello world.txt  readme.txt');
}

// 验证 Ctrl+C 取消草稿、保护选区复制及打断惰性文件读取。
async function interrupt({ page }: { page: Page }): Promise<void> {
  await openExample(page);
  const input = page.getByRole('textbox');
  await execute(page, 'ls');
  await input.fill('cancel me');
  await input.press('Control+c');
  await expect(input).toHaveValue('');
  await expect(page.locator('.lk-submitted-text').last()).toHaveText('cancel me^C');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('ls');
  await input.fill('copy me');
  await input.press('Control+a');
  await input.press('Control+c');
  await expect(input).toHaveValue('copy me');
  await input.press('ArrowRight');
  await input.press('Control+c');
  let held: Route | undefined;
  // 暂存惰性文本模块的网络请求以验证运行中取消。
  async function holdRead(route: Route): Promise<void> {
    held = route;
  }
  await page.route('**/files/readme.txt*', holdRead);
  await execute(page, 'cat readme.txt');
  // 检查请求是否已进入挂起状态。
  function reading(): boolean {
    return held !== undefined;
  }
  await expect.poll(reading).toBe(true);
  await input.fill('help');
  await input.press('Enter');
  await expect(page.locator('.command-help')).toHaveCount(0);
  await expect(input).toHaveValue('help');
  await input.press('Control+c');
  await expect(input).toHaveValue('');
  await execute(page, 'help');
  await expect(page.locator('.command-help')).toHaveCount(1);
  await held!.continue();
  await page.unroute('**/files/readme.txt*', holdRead);
  await execute(page, 'cat readme.txt');
  await expect(page.locator('.lk-output').last()).toContainText('Welcome to LunarKit.');
  await expect(page.locator('.lk-output')).toHaveCount(2);
}

test('example2 帮助布局与初始状态', helpLayout);
test('example2 文本文件命令', fileCommands);
test('example2 Tab 与历史导航', completionAndHistory);
test('example2 Ctrl+C 取消与复制', interrupt);

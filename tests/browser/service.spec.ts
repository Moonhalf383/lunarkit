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
  await expect(page.locator('.lk-loading').last()).toContainText('Connecting');
  await expect(page.locator('.lk-terminal')).toHaveCSS('outline-style', 'none');
  await expect(page.locator('.lk-prompt')).toBeHidden();
  await expect(page.locator('.lk-input')).toBeDisabled();
  await page.clock.runFor(1500);
  await expect(page.locator('.lk-prompt')).toBeHidden();
  await page.clock.runFor(1500);
  await expect(page.locator('.service-banner').last()).toHaveText('LunarService');
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText(`${user} / ❯`);
}

// 验证 guest 边界、秘密输入、登录及 Markdown 加载。
async function session({ page }: { page: Page }): Promise<void> {
  await page.clock.install();
  await page.goto('http://127.0.0.1:4176/');
  await expect(page.locator('.lk-prompt-prefix')).toHaveText(/^guest[0-9a-f]{8} \/ ❯$/u);
  for (const command of ['pwd', 'ls', 'cat readme.md', 'minivim notes.txt', 'cd']) {
    await execute(page, command);
    await expect(page.locator('.lk-output').last()).toHaveText('Please login first.');
  }
  await login(page);
  await execute(page, 'pwd');
  await expect(page.locator('.lk-output').last()).toHaveText('/');
  await execute(page, 'cat readme.md');
  await expect(page.locator('.lk-loading').last()).toContainText('0%');
  await expect(page.locator('.lk-prompt')).toBeHidden();
  await expect(page.locator('.lk-input')).toBeDisabled();
  await page.keyboard.type('ignored');
  await page.clock.runFor(1000);
  await expect(page.getByRole('textbox', { name: '输入内容', exact: true })).toHaveValue('');
  await expect(page.locator('.lk-markdown h1')).toHaveText('User One');
  await expect(page.locator('.lk-markdown h1')).toHaveCSS('font-size', '24px');
  await page.screenshot({ path: 'test-results/example3-session.png', fullPage: true });
  await execute(page, 'cd docs');
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText('user1 /docs ❯');
  await execute(page, 'pwd');
  await expect(page.locator('.lk-output').last()).toHaveText('/docs');
  await execute(page, 'cd ../../');
  await expect(page.locator('.lk-output').last()).toContainText('escapes workspace');
  await execute(page, 'exit');
  await expect(page.locator('.lk-prompt-prefix').last()).toHaveText(/^guest[0-9a-f]{8} \/ ❯$/u);
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
  await expect(page.locator('.minivim-caret')).toBeVisible();
  await expect(buffer).toHaveCSS('caret-color', 'rgba(0, 0, 0, 0)');
  await buffer.press('i');
  await expect(page.locator('.minivim-caret')).toBeHidden();
  await expect(buffer).toHaveCSS('caret-color', 'rgb(0, 0, 0)');
  await buffer.press('X');
  await buffer.press('Escape');
  await expect(page.locator('.minivim-caret')).toBeVisible();
  await expect(buffer).toBeFocused();
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
  await input.fill('user1');
  await input.press('Enter');
  const password = page.getByRole('textbox', { name: '密码', exact: true });
  await password.fill('lunarkit');
  await password.press('Enter');
  await expect(page.locator('.lk-prompt')).toBeHidden();
  await page.keyboard.press('Control+c');
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
  await expect(page.locator('.lk-submission').last()).toHaveText('user2@lunarservice password:');
  await expect(page.locator('.lk-submission').last().locator('.lk-submitted-text')).toBeEmpty();
  await expect(page.locator('.lk-terminal')).not.toContainText('wrong-password');
  await login(page);
  await execute(page, 'cat readme.md');
  await page.keyboard.press('Control+c');
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

// 验证 NORMAL 完整中文方块、INSERT 竖线及编辑器内部滚动定位。
async function cursorGeometry({ page }: { page: Page }): Promise<void> {
  await page.clock.install();
  await page.goto('http://127.0.0.1:4176/');
  await login(page);
  await execute(page, 'minivim notes.txt');
  const input = page.getByRole('textbox', { name: '编辑文件', exact: true });
  await input.press('i');
  await input.fill('你好🙂\n' + 'long line\n'.repeat(30));
  await input.press('Escape');
  await expect(page.locator('.minivim-caret')).toBeVisible();
  // 将 NORMAL 光标放在中文字符开头并同步原生选区事件。
  function selectChinese(input: HTMLTextAreaElement): void {
    input.setSelectionRange(0, 0);
    input.scrollTop = 0;
    input.dispatchEvent(new Event('select'));
  }
  await input.evaluate(selectChinese);
  const caret = page.locator('.minivim-caret');
  // 等待字体后测量完整中文字素，匹配各浏览器实际字形宽度。
  async function characterWidth(): Promise<number> {
    await document.fonts.ready;
    const mirror = document.querySelector('.minivim-mirror')!;
    const range = document.createRange();
    range.setStart(mirror.firstChild!, 0);
    range.setEnd(mirror.firstChild!, 1);
    return range.getBoundingClientRect().width;
  }
  const width = await page.evaluate(characterWidth);
  const bounds = await caret.boundingBox();
  expect(width).toBeGreaterThan(0);
  expect(bounds!.width).toBeCloseTo(width, 1);
  await expect(caret).toHaveCSS('height', '16px');
  await input.press('l');
  const first = await caret.boundingBox();
  await input.press('l');
  const second = await caret.boundingBox();
  // 字形包围盒与字符前进距离可不同，直接验证移动后字素的起点。
  function glyphPosition(): number {
    const mirror = document.querySelector('.minivim-mirror')!;
    const range = document.createRange();
    range.setStart(mirror.firstChild!, 2);
    range.setEnd(mirror.firstChild!, 4);
    return range.getBoundingClientRect().left;
  }
  expect(second!.x).toBeGreaterThan(first!.x);
  expect(second!.x).toBeCloseTo(await page.evaluate(glyphPosition), 1);
  for (let index = 0; index < 20; index += 1) await input.press('j');
  const bufferBounds = await input.boundingBox();
  const cursorBounds = await caret.boundingBox();
  expect(cursorBounds!.y).toBeGreaterThanOrEqual(bufferBounds!.y);
  expect(cursorBounds!.y + cursorBounds!.height).toBeLessThanOrEqual(bufferBounds!.y + bufferBounds!.height + 1);
  await input.press('i');
  await expect(caret).toBeHidden();
  await expect(input).toHaveCSS('caret-color', 'rgb(0, 0, 0)');
  await input.press('Escape');
  await expect(caret).toBeVisible();
}

// 验证隐藏输入的加载和后续 Markdown 输出均将最新内容保持在视口内。
async function followsOutput({ page }: { page: Page }): Promise<void> {
  await page.setViewportSize({ width: 640, height: 320 });
  await page.clock.install();
  await page.goto('http://127.0.0.1:4176/');
  await login(page);
  for (let index = 0; index < 12; index += 1) await execute(page, 'help');
  await execute(page, 'cat readme.md');
  await page.clock.runFor(100);
  const loading = await page.locator('.lk-loading').last().boundingBox();
  expect(loading!.y + loading!.height).toBeLessThanOrEqual(321);
  await expect(page.locator('.lk-terminal')).toHaveCSS('outline-style', 'none');
  await page.clock.runFor(1000);
  const prompt = await page.locator('.lk-prompt').boundingBox();
  expect(prompt!.y + prompt!.height).toBeLessThanOrEqual(321);
  expect(prompt!.y).toBeGreaterThanOrEqual(0);
  await expect(page.locator('.lk-markdown')).toBeVisible();
}

// 验证窄高视口中编辑器内部光标更新不会将页面拉向面板底部。
async function panelScroll({ page }: { page: Page }): Promise<void> {
  await page.setViewportSize({ width: 640, height: 320 });
  await page.clock.install();
  await page.goto('http://127.0.0.1:4176/');
  await login(page);
  await execute(page, 'minivim notes.txt');
  // 等待字体布局稳定，排除字体替换引起的浏览器原生滚动锚定。
  async function fonts(): Promise<void> { await document.fonts.ready; }
  await page.evaluate(fonts);
  await page.clock.runFor(100);
  // 将面板首行放在视口顶部以模拟阅读编辑位置。
  function alignPanel(): number {
    const panel = document.querySelector('.minivim')!;
    window.scrollBy(0, panel.getBoundingClientRect().top);
    return window.scrollY;
  }
  const before = await page.evaluate(alignPanel);
  const buffer = page.getByRole('textbox', { name: '编辑文件', exact: true });
  await buffer.press('l');
  await buffer.press('h');
  await page.clock.runFor(100);
  // 读取页面位置，验证内部镜像更新不被视为新输出。
  function scrollPosition(): number { return window.scrollY; }
  expect(await page.evaluate(scrollPosition)).toBe(before);
}

test('example3 面板内部更新不抢滚动', panelScroll);
test('example3 加载和输出自动跟随末尾', followsOutput);
test('example3 Vim 模式光标与滚动', cursorGeometry);
test('example3 错误登录与加载取消', failures);
test('example3 登录与工作目录', session);
test('example3 流内编辑和共享挂载', editor);
test('example3 连接与秘密输入取消', cancellation);

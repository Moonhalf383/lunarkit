import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// 读取字体加载结果和页面的基础主题属性。
async function inspectTheme(page: Page): Promise<unknown> {
  // 等待字体就绪并提取实际渲染样式。
  async function readStyles(): Promise<unknown> {
    await document.fonts.ready;
    const terminal = document.querySelector('.lk-terminal')!;
    const styles = getComputedStyle(terminal);
    const heading = getComputedStyle(document.querySelector('h1')!);
    const caret = getComputedStyle(document.querySelector('.lk-caret')!);
    return {
      background: styles.backgroundColor,
      color: styles.color,
      font: styles.fontFamily.replaceAll('"', ''),
      weight: styles.fontWeight,
      fontLoaded: document.fonts.check('500 16px "Kode Mono"'),
      bannerSize: parseFloat(heading.fontSize),
      caretAnimation: caret.animationName,
    };
  }
  return page.evaluate(readStyles);
}

// 验证首屏只显示指定元素并加载本地主题字体。
async function initialAppearance({ page }: { page: Page }): Promise<void> {
  const errors: string[] = [];
  // 记录页面运行时错误。
  function captureError(error: Error): void {
    errors.push(error.message);
  }
  page.on('pageerror', captureError);
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: '输入内容' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'LunarKit' })).toBeVisible();
  await expect(page.locator('.lk-terminal')).toHaveText('LunarKit❯\u200b');
  await expect(page.locator('.lk-terminal > *')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/echo-desktop.png' });
  await expect(page.locator('.lk-caret')).toHaveCSS('animation-name', 'lk-blink');
  expect(await inspectTheme(page)).toEqual({
    background: 'rgb(255, 255, 255)',
    color: 'rgb(0, 0, 0)',
    font: 'Kode Mono, LunarKit Prompt, Noto Sans SC, monospace',
    weight: '500',
    fontLoaded: true,
    bannerSize: expect.any(Number),
    caretAnimation: 'lk-blink',
  });
  // 读取实际字号以验证 banner 明显大于正文。
  function readBannerSize(): number {
    return parseFloat(getComputedStyle(document.querySelector('h1')!).fontSize);
  }
  expect(await page.evaluate(readBannerSize)).toBeGreaterThan(80);
  expect(errors).toEqual([]);
}

// 验证空白、多行、HTML 字面量与命令字面量的完整回显。
async function echoAllText({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const input = page.getByRole('textbox');
  const texts = ['  hello  ', '<script>alert(1)</script>', '中文🙂\n  第二行\n', '', '   ', 'clear', 'help'];
  for (const [index, text] of texts.entries()) {
    await input.fill(text);
    await input.press('Enter');
    await expect(page.locator('.lk-output')).toHaveCount(index + 1);
    expect(await page.locator('.lk-output').nth(index).textContent()).toBe(text);
    expect(await page.locator('.lk-submitted-text').nth(index).textContent()).toBe(text);
    await expect(input).toHaveValue('');
  }
  await expect(page.locator('.lk-stream script')).toHaveCount(0);
}

// 验证键盘历史浏览可恢复草稿并保持原生编辑能力。
async function historyAndEditing({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const input = page.getByRole('textbox');
  await input.fill('first');
  await input.press('Enter');
  await input.fill('second');
  await input.press('Enter');
  await input.fill('草稿');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('second');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('first');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('草稿');
  await input.press('ArrowLeft');
  await input.press('Backspace');
  await expect(input).toHaveValue('稿');
}

// 在真实浏览器中检查输入法组合事件的提交边界。
async function composition({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const input = page.getByRole('textbox');
  await input.dispatchEvent('compositionstart');
  // 设置组合文本但不调用会主动结束浏览器组合状态的自动填充。
  function composing(input: HTMLTextAreaElement): void { input.value = '中文'; input.dispatchEvent(new InputEvent('input', { data: '中文', isComposing: true })); }
  await input.evaluate(composing);
  await input.press('Enter');
  await expect(page.locator('.lk-output')).toHaveCount(0);
  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(page.locator('.lk-output')).toHaveText('中文');
}

// 检查窄屏长文本换行及减少动态效果偏好。
async function narrowScreen({ page }: { page: Page }): Promise<void> {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const input = page.getByRole('textbox');
  const text = '长文本🙂'.repeat(60);
  await input.fill(text);
  await input.press('Enter');
  expect(await page.locator('.lk-output').textContent()).toBe(text);
  // 提取页面溢出和光标动画状态。
  function readLayout(): { width: number; viewport: number; animation: string } {
    return {
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      animation: getComputedStyle(document.querySelector('.lk-caret')!).animationName,
    };
  }
  const layout = await page.evaluate(readLayout);
  expect(layout.width).toBe(layout.viewport);
  expect(layout.animation).toBe('none');
  await expect(input).toBeInViewport();
  await page.screenshot({ path: 'test-results/echo-mobile.png', fullPage: true });
}

// 验证默认内容区居中且边距随屏幕宽度调整。
async function centeredLayout({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const desktop = await page.locator('.lk-terminal').boundingBox();
  expect(desktop?.width).toBe(1080);
  expect(desktop?.x).toBe(100);
  await page.setViewportSize({ width: 320, height: 640 });
  const mobile = await page.locator('.lk-terminal').boundingBox();
  expect(mobile?.width).toBe(320);
  expect(mobile?.x).toBe(0);
  await expect(page.locator('.lk-terminal')).toHaveCSS('padding-left', '24px');
}

// 验证编辑换行边界时光标坐标来自完整文本且镜像不插入断点。
async function caretWrapping({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const input = page.getByRole('textbox');
  await page.locator('.lk-editor').evaluate(setNarrowWidth);
  await input.fill('12345 abcde');
  await input.press('End');
  await input.press('ArrowLeft');
  await input.press('ArrowLeft');
  // 将编辑器固定为十个字符宽以稳定触发单词换行。
  function setNarrowWidth(editor: HTMLElement): void {
    editor.style.flex = 'none';
    editor.style.width = '10ch';
  }
  // 对照完整文本的范围坐标检查浮层光标位置。
  function measureCaret(): { difference: number; children: number } {
    const mirror = document.querySelector('.lk-input-mirror')!;
    const input = document.querySelector('textarea')!;
    const caret = document.querySelector('.lk-caret')!;
    const range = document.createRange();
    range.setStart(mirror.firstChild!, input.selectionEnd);
    range.setEnd(mirror.firstChild!, input.selectionEnd + 1);
    const expected = range.getBoundingClientRect();
    const actual = caret.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(input).lineHeight);
    const row = Math.round((expected.top - mirror.getBoundingClientRect().top) / lineHeight);
    const fontSize = parseFloat(getComputedStyle(input).fontSize);
    const top = mirror.getBoundingClientRect().top + row * lineHeight + (lineHeight - fontSize) / 2;
    return { difference: Math.round(Math.abs(top - actual.top) + Math.abs(expected.left - actual.left)), children: mirror.childNodes.length };
  }
  await expect.poll(readCaret).toEqual({ difference: 0, children: 1 });
  // 在浏览器端测量当前光标以等待选择事件完成。
  async function readCaret(): Promise<{ difference: number; children: number }> {
    return page.evaluate(measureCaret);
  }
}

// 验证浏览器原生剪贴板多行粘贴后的原样输出。
async function clipboardPaste({ page }: { page: Page }): Promise<void> {
  test.skip(test.info().project.use.browserName !== 'chromium', 'Playwright clipboard permissions are Chromium-only; native paste remains a manual check on other engines.');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const text = '  粘贴🙂\n第二行  ';
  // 将测试文本写入浏览器剪贴板。
  async function writeClipboard(value: string): Promise<void> {
    await navigator.clipboard.writeText(value);
  }
  await page.evaluate(writeClipboard, text);
  const input = page.getByRole('textbox');
  await input.press('ControlOrMeta+V');
  await expect(input).toHaveValue(text);
  await input.press('Enter');
  expect(await page.locator('.lk-output').textContent()).toBe(text);
}

// 验证默认五百行历史上限在真实浏览器保留超长输出的末尾。
async function boundedHistory({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const input = page.getByRole('textbox');
  const lines: string[] = [];
  for (let index = 0; index < 520; index += 1) lines.push(`line-${index}`);
  await input.fill(lines.join('\n'));
  await input.press('Enter');
  await expect(page.locator('.lk-stream > *')).toHaveCount(1);
  await expect(page.locator('.lk-output')).toHaveText(lines.slice(-500).join('\n'));
  await input.fill('latest');
  await input.press('Enter');
  await expect(page.locator('.lk-output')).toHaveText('latest');
}

test('历史默认最多五百行', boundedHistory);
test('默认居中布局', centeredLayout);
test('换行边界光标定位', caretWrapping);
test('原生多行粘贴', clipboardPaste);
test('首屏主题与字体', initialAppearance);
test('所有文本均原样回显', echoAllText);
test('历史草稿与键盘编辑', historyAndEditing);
test('输入法组合期间保持编辑', composition);
test('窄屏长文本及减少动态效果', narrowScreen);

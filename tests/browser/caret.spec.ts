import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface CaretMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
  lineHeight: number;
  fontSize: number;
  characterWidth: number;
  characterX: number;
  characterY: number;
}

// 读取字符字框和光标行格，独立比较两者的中心位置及尺寸。
async function readMetrics(page: Page): Promise<CaretMetrics> {
  // 在浏览器中测量完整字素对应的文本范围。
  function measure(): CaretMetrics {
    const input = document.querySelector('textarea')!;
    const mirror = document.querySelector('.lk-input-mirror')!;
    const caret = document.querySelector('.lk-caret')!;
    const segment = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(input.value).containing(input.selectionEnd);
    const range = document.createRange();
    range.setStart(mirror.firstChild!, segment?.index ?? input.selectionEnd);
    range.setEnd(mirror.firstChild!, segment ? segment.index + segment.segment.length : input.selectionEnd + 1);
    const character = range.getBoundingClientRect();
    const bounds = mirror.getBoundingClientRect();
    const actual = caret.getBoundingClientRect();
    return {
      x: actual.left - bounds.left,
      y: actual.top - bounds.top,
      width: actual.width,
      height: actual.height,
      lineHeight: parseFloat(getComputedStyle(input).lineHeight),
      fontSize: parseFloat(getComputedStyle(input).fontSize),
      characterWidth: character.width,
      characterX: character.left - bounds.left,
      characterY: character.top - bounds.top + character.height / 2,
    };
  }
  return page.evaluate(measure);
}

// 设置原生选择位置并显式通知选择变化。
async function selectAt(page: Page, position: number): Promise<void> {
  // 将选择端点移动到指定 UTF-16 索引。
  function move(index: number): void {
    const input = document.querySelector('textarea')!;
    input.setSelectionRange(index, index);
    input.dispatchEvent(new Event('select'));
  }
  await page.evaluate(move, position);
}

// 检查空输入、中文及英文末尾的光标统一为半角且垂直居中。
async function trailingCaret({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = page.getByRole('textbox');
  let halfWidth = 0;
  for (const text of ['', 'abc', '你好', 'ＡＢ']) {
    await input.fill(text);
    const metrics = await readMetrics(page);
    if (!halfWidth) halfWidth = metrics.width;
    expect(metrics.width).toBeCloseTo(halfWidth, 1);
    expect(metrics.height).toBeCloseTo(metrics.fontSize, 1);
    expect(metrics.y).toBeCloseTo((metrics.lineHeight - metrics.fontSize) / 2, 1);
    expect(Math.abs(metrics.y + metrics.height / 2 - metrics.characterY)).toBeLessThan(3);
    await page.screenshot({ path: `test-results/caret-end-${text || 'empty'}.png` });
  }
  await input.fill('你好\n');
  const newline = await readMetrics(page);
  expect(newline.y).toBeCloseTo(newline.lineHeight + (newline.lineHeight - newline.fontSize) / 2, 1);
  expect(newline.width).toBeCloseTo(halfWidth, 1);
  await expect(page.locator('.lk-prompt-prefix')).toHaveText('❯');
  await input.press('Enter');
  await expect(page.locator('.lk-submission .lk-prompt-prefix')).toHaveText('❯');
}

// 检查中英文、全半角、emoji 和组合字符的覆盖宽度与反色显示。
async function characterWidths({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = page.getByRole('textbox');
  let halfWidth = 0;
  for (const text of ['ab', '你好', 'ＡＢ', '🙂x', '👨‍👩‍👧‍👦x', 'e\u0301x']) {
    await input.fill(text);
    await selectAt(page, 0);
    const metrics = await readMetrics(page);
    if (!halfWidth) halfWidth = metrics.width;
    expect(metrics.width).toBeCloseTo(metrics.characterWidth, 1);
    expect(metrics.x).toBeCloseTo(metrics.characterX, 1);
    expect(metrics.y).toBeCloseTo((metrics.lineHeight - metrics.fontSize) / 2, 1);
    expect(metrics.height).toBeCloseTo(metrics.fontSize, 1);
    expect(Math.abs(metrics.y + metrics.height / 2 - metrics.characterY)).toBeLessThan(3);
    if (['你好', 'ＡＢ'].includes(text)) expect(metrics.width).toBeGreaterThan(halfWidth * 1.4);
  }
  await input.fill('你好abc');
  await selectAt(page, 0);
  await expect(page.locator('.lk-caret')).toHaveCSS('mix-blend-mode', 'difference');
  await page.screenshot({ path: 'test-results/caret-chinese-block.png' });
  await input.press('Shift+ArrowRight');
  await expect(page.locator('.lk-caret')).toBeHidden();
}

// 检查软换行、手动换行与字号变化后光标仍居中对齐。
async function multilineCaret({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  const input = page.getByRole('textbox');
  // 使用较大字号和固定编辑宽度触发中文软换行。
  function resize(editor: HTMLElement): void {
    editor.style.fontSize = '24px';
    editor.style.lineHeight = '1.8';
    editor.style.width = '6ch';
    editor.style.flex = 'none';
  }
  await page.locator('.lk-editor').evaluate(resize);
  await input.fill('你好你好你好\nabc');
  for (const position of [0, 3, 6, 7, 10]) {
    await selectAt(page, position);
    const metrics = await readMetrics(page);
    expect(metrics.height).toBeCloseTo(metrics.fontSize, 1);
    expect(Math.abs(metrics.y + metrics.height / 2 - metrics.characterY)).toBeLessThan(4);
  }
}

// 验证实际加载的字体及字形墨迹中心与块状光标对齐。
async function bundledFontAlignment({ page }: { page: Page }): Promise<void> {
  await page.goto('/');
  await page.getByRole('textbox').fill('你好H❯');
  // 使用字体实际墨迹度量检查中文、英文与提示符的视觉中心。
  async function measureInk(): Promise<{ loaded: number[]; offsets: number[] }> {
    const chinese = await document.fonts.load('500 16px "Noto Sans SC"', '你好');
    const latin = await document.fonts.load('500 16px "Kode Mono"', 'H');
    const symbol = await document.fonts.load('500 16px "LunarKit Prompt"', '❯');
    await document.fonts.ready;
    const input = document.querySelector('textarea')!;
    const styles = getComputedStyle(input);
    const fontSize = parseFloat(styles.fontSize);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const offsets = [];
    // 统一行度量产生的基线相对行中心的位置。
    const baselineOffset = (0.98 - 0.3) * fontSize / 2;
    for (const [family, text] of [['Noto Sans SC', '你'], ['Kode Mono', 'H'], ['LunarKit Prompt', '❯']]) {
      context.font = `500 ${fontSize}px ${styles.fontFamily}`;
      const selectedWidth = context.measureText(text!).width;
      context.font = `500 ${fontSize}px "${family}"`;
      if (Math.abs(selectedWidth - context.measureText(text!).width) > 0.01) {
        throw new Error(`字体栈未选中预期字体：${family}`);
      }
      const metrics = context.measureText(text!);
      offsets.push(baselineOffset - (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
    }
    return { loaded: [chinese.length, latin.length, symbol.length], offsets };
  }
  const metrics = await page.evaluate(measureInk);
  for (const loaded of metrics.loaded) expect(loaded).toBeGreaterThan(0);
  for (const offset of metrics.offsets) expect(Math.abs(offset)).toBeLessThan(1.2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.screenshot({ path: 'test-results/caret-bundled-font-alignment.png' });
}

test('打包字体的实际字形视觉中心', bundledFontAlignment);
test('末尾半角光标和默认提示符', trailingCaret);
test('全半角与完整字素的块状光标', characterWidths);
test('多行与字号变化下的垂直对齐', multilineCaret);

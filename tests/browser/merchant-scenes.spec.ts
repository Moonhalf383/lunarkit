import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createRun, depart } from '../../example/example4/src/game/engine';

// 提交指令并让后续断言等待具体输出或输入恢复。
async function command(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: '输入内容', exact: true });
  await expect(input).toBeVisible();
  await input.fill(text);
  await input.press('Enter');
}

// 建立可预测的一回合抵达存档，保留真实存储校验链路。
async function setup(page: Page): Promise<void> {
  const run = createRun(42);
  depart(run, 'prism');
  run.remaining = 1;
  // 将测试航程写入首次载入前的浏览器存储。
  function seed(value: typeof run): void {
    if (sessionStorage.getItem('scene-seeded')) return;
    sessionStorage.setItem('scene-seeded', 'true');
    localStorage.setItem('lunarkit-merchant-v1', JSON.stringify({ version: 1, slots: [value, null, null], history: [] }));
  }
  await page.addInitScript(seed, run);
  await page.goto('http://127.0.0.1:4178/');
  await command(page, 'play');
  await page.getByRole('button', { name: /Slot 1/u }).click();
  await page.getByRole('button', { name: 'Resume voyage', exact: true }).click();
  await expect(page.locator('.lk-input')).toBeVisible();
}

// 验证每个新场景首字出现前，上一场景全部位于视口上方。
async function sceneOrder({ page }: { page: Page }): Promise<void> {
  await setup(page);
  // 观察首批打字机变更，记录前一场景末端的实际视口坐标。
  function observe(): void {
    const samples: number[] = [];
    Object.assign(window, { sceneSamples: samples });
    // 根据场景边界的上一个兄弟节点验证旧内容末端。
    function changed(): void {
      const typing = document.querySelector('[data-typing]');
      if (!typing?.textContent) return;
      const boundaries = document.querySelectorAll('.lk-scene-boundary');
      const boundary = boundaries.item(boundaries.length - 1);
      if (boundary?.previousElementSibling) samples.push(boundary.previousElementSibling.getBoundingClientRect().bottom);
    }
    new MutationObserver(changed).observe(document.querySelector('.lk-stream')!, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-typing'] });
  }
  await page.evaluate(observe);
  await command(page, 'do travel');
  const endure = page.getByRole('button', { name: 'Wait out the danger: lose 12 hull', exact: true });
  await expect(endure).toBeVisible();
  await expect(page.locator('.merchant-planet')).toHaveCount(0);
  await expect(page.locator('.lk-scene-boundary')).toHaveCount(1);
  await endure.click();
  await expect(page.locator('.merchant-planet h1')).toHaveText('Prism');
  await expect(page.locator('[data-typing]')).toHaveCount(0);
  await expect(page.locator('.lk-scene-boundary')).toHaveCount(2);
  // 读取全程首字时的旧场景位置采样。
  function samples(): number[] { return (window as unknown as { sceneSamples: number[] }).sceneSamples; }
  const measured = await page.evaluate(samples);
  expect(measured.length).toBeGreaterThan(0);
  expect(Math.max(...measured)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/example4-arrival.png' });
}

// 验证离港同样先完成分页滚动，普通航行事件使用下一个场景。
async function departure({ page }: { page: Page }): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4178/');
  await command(page, 'play');
  await page.getByRole('button', { name: /Slot 1/u }).click();
  await command(page, 'do depart nimbus');
  await expect(page.locator('.lk-output-node').last()).toContainText('Course set for Nimbus');
  await expect(page.locator('.lk-input')).toBeVisible();
  await expect(page.locator('.lk-scene-boundary')).toHaveCount(1);
  // 读取最后一次指令记录，确认离港后的旧场景位于视口上方。
  function previousBottom(): number { return document.querySelector('.lk-submission')!.getBoundingClientRect().bottom; }
  expect(await page.evaluate(previousBottom)).toBeLessThanOrEqual(1);
  await command(page, 'do travel');
  await expect(page.getByRole('button', { name: 'Wait out the danger: lose 12 hull', exact: true })).toBeVisible();
  await expect(page.locator('.lk-scene-boundary')).toHaveCount(2);
  await page.getByRole('button', { name: 'Wait out the danger: lose 12 hull', exact: true }).click();
  await expect(page.locator('.merchant-planet')).toHaveCount(0);
}

// 验证抵达事件暂停保存后刷新，事件结算才触发自动星球展示。
async function restoredArrival({ page }: { page: Page }): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await command(page, 'do travel');
  await expect(page.getByRole('button', { name: 'Wait out the danger: lose 12 hull', exact: true })).toBeVisible();
  await page.keyboard.type('pause');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.reload();
  await command(page, 'play');
  await page.getByRole('button', { name: /Slot 1/u }).click();
  await page.getByRole('button', { name: 'Resume voyage', exact: true }).click();
  await expect(page.locator('.merchant-planet')).toHaveCount(0);
  await command(page, 'do resolve endure');
  await expect(page.locator('.merchant-planet h1')).toHaveText('Prism');
  await command(page, 'fetch');
  await expect(page.locator('.merchant-stats')).toContainText('Hull88/100');
}

// 验证过场可被优先暂停中断，并在恢复后继续等待同一个事件。
async function interruptScene({ page }: { page: Page }): Promise<void> {
  await setup(page);
  await command(page, 'do travel');
  await expect(page.locator('.lk-scene-boundary')).toHaveCount(1);
  await page.keyboard.type('pause');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await command(page, 'do resolve endure');
  await expect(page.locator('.merchant-planet h1')).toHaveText('Prism');
  await expect(page.locator('.lk-input')).toBeFocused();
}

// 验证长输入、补全与小视口下输入始终保持底部留白。
async function inputSpace({ page }: { page: Page }): Promise<void> {
  await page.setViewportSize({ width: 400, height: 480 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4178/');
  await command(page, 'help');
  const input = page.locator('.lk-input');
  await input.fill('fetch '.repeat(25));
  // 测量可见块光标与视口底部的距离。
  function gap(): number { return innerHeight - document.querySelector('.lk-caret')!.getBoundingClientRect().bottom; }
  // 等待合帧滚动后读取光标留白。
  async function readGap(): Promise<number> { return page.evaluate(gap); }
  await expect.poll(readGap).toBeGreaterThanOrEqual(95);
  await input.fill('fetch ');
  await input.press('Tab');
  const menu = page.locator('.lk-completions');
  await expect(menu).toBeVisible();
  // 测量补全菜单底部，验证候选与输入共同保留空间。
  function menuGap(): number { return innerHeight - document.querySelector('.lk-completions')!.getBoundingClientRect().bottom; }
  // 等待候选菜单完成布局与合帧滚动。
  async function readMenuGap(): Promise<number> { return page.evaluate(menuGap); }
  await expect.poll(readMenuGap).toBeGreaterThanOrEqual(95);
}

test('example4 场景滚出后打字且事件完成后展示抵达', sceneOrder);
test('example4 离港与非抵达事件分页', departure);
test('example4 抵达事件存档恢复', restoredArrival);
test('example4 过场优先暂停', interruptScene);
test('example4 输入与补全底部留白', inputSpace);

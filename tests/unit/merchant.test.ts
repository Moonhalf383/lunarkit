import { describe, expect, it } from 'vitest';
import { events } from '../../example/example4/src/content/events';
import { items } from '../../example/example4/src/content/items';
import { distance, planets } from '../../example/example4/src/content/planets';
import { buyItem, capacity, createRun, depart, price, resolveEvent, service, shopItems, trade, travel, useItem } from '../../example/example4/src/game/engine';
import { createStorage, validRun } from '../../example/example4/src/game/storage';

// 验证内容规模、稳定标识和完全图的对称边权。
function content(): void {
  expect(planets).toHaveLength(10);
  expect(items).toHaveLength(20);
  expect(events).toHaveLength(30);
  expect(new Set(items.map(itemId)).size).toBe(20);
  for (const event of events) expect(event.options.length).toBeGreaterThanOrEqual(2);
  for (const world of planets) expect(shopItems(world.id)).toHaveLength(3);
  for (const a of planets) for (const b of planets) if (a !== b) expect(distance(a.id, b.id)).toBe(distance(b.id, a.id));
  // 提取内容中的稳定标识。
  function itemId(entry: { id: string }): string { return entry.id; }
}

// 验证交易原子性、容量约束和同港口买卖价差。
function economy(): void {
  const run = createRun(10);
  const initial = run.credits;
  trade(run, 'grain', 5, true);
  expect(run.cargo.grain).toBe(5);
  trade(run, 'grain', 5, false);
  expect(run.credits).toBeLessThan(initial);
  expect(run.turn).toBe(0);
  // 检查超出货舱的交易保留原有资金。
  function overflow(): void { trade(run, 'grain', 31, true); }
  const before = run.credits;
  expect(overflow).toThrow('Cargo');
  expect(run.credits).toBe(before);
  // 校验非法数量的失败结果。
  function negative(): void { trade(run, 'grain', -2, true); }
  expect(negative).toThrow();
  expect(price(run, 'grain')).toBeLessThan(18);
  for (const id of ['constructor', '__proto__', 'toString']) {
    const before = structuredClone(run);
    // 继承属性标识应走未知商品错误，交易状态保持原样。
    function inherited(): void { trade(run, id, 1, true); }
    expect(inherited).toThrow('Unknown cargo');
    expect(run).toEqual(before);
  }
}

// 验证保存随机状态后航行与事件重复结算行为。
function turns(): void {
  const run = createRun(42);
  depart(run, 'prism');
  const copy = structuredClone(run);
  expect(travel(run)).toBe(travel(copy));
  expect(run.rng).toBe(copy.rng);
  expect(run.pending).toBeTruthy();
  // 事件等待期间推进操作返回待解决提示。
  function advance(): void { travel(run); }
  expect(advance).toThrow('Resolve');
  const turn = run.turn;
  resolveEvent(run, 'endure');
  expect(run.turn).toBe(turn);
  expect(run.pending).toBeNull();
  // 已结算事件再次执行时返回空事件提示。
  function twice(): void { resolveEvent(run, 'endure'); }
  expect(twice).toThrow();
  expect(validRun(run)).toBe(true);
}

// 验证道具槽位、容量装备和消耗品的实际效果。
function equipment(): void {
  const run = createRun(7);
  run.credits = 10000;
  run.location = 'forge';
  buyItem(run, 'tank');
  expect(capacity(run, 'fuel')).toBe(140);
  service(run, 'fuel', 40);
  expect(run.fuel).toBe(140);
  // 相同被动装备重复安装返回已安装提示。
  function duplicate(): void { buyItem(run, 'tank'); }
  expect(duplicate).toThrow('already');
  run.hull = 30;
  useItem(run, 'patch');
  expect(run.hull).toBe(55);
  expect(run.items).not.toContain('patch');
  expect(validRun(run)).toBe(true);
}

// 验证三存档克隆隔离、刷新继续及损坏数据提示。
function saves(): void {
  localStorage.clear();
  const storage = createStorage(localStorage);
  const run = createRun(17);
  for (let index = 0; index < 3; index += 1) storage.save(index, run);
  run.credits = 2;
  const restored = createStorage(localStorage);
  expect(restored.load(2)!.credits).toBe(1000);
  const invalid = restored.load(0)!;
  invalid.fuel = Infinity;
  expect(validRun(invalid)).toBe(false);
  localStorage.setItem('lunarkit-merchant-v1', '{broken');
  expect(createStorage(localStorage).getWarning()).toContain('corrupt');
  const unavailable = createStorage(undefined);
  unavailable.save(0, createRun(2));
  expect(unavailable.load(0)).toBeTruthy();
  expect(unavailable.getWarning()).toContain('page only');
  localStorage.clear();
}

// 组织纯游戏状态与持久化边界测试。
function suite(): void {
  it('十星球二十道具三十事件', content);
  it('交易与货舱原子性', economy);
  it('随机回合与事件只结算一次', turns);
  it('道具效果与容量', equipment);
  it('三槽持久化与错误处理', saves);
}
describe('merchant rules', suite);

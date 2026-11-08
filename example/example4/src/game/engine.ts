import { distance, goods, planet, planets } from '../content/planets';
import { item, items } from '../content/items';
import { eventById, events } from '../content/events';
import type { Effect, EventOption, Run, Snapshot } from './types';

// 推进可保存的无符号随机序列，保证读取存档后延续同一世界。
export function random(run: Run): number {
  let value = run.rng;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  run.rng = value >>> 0 || 1;
  return run.rng / 4294967296;
}

// 根据装备返回燃料、船体或货舱的容量。
export function capacity(run: Run, resource: 'fuel' | 'hull' | 'cargo'): number {
  if (resource === 'cargo') return run.items.includes('hold') ? 45 : 30;
  if (resource === 'fuel') return run.items.includes('tank') ? 140 : 100;
  return run.items.includes('plating') ? 130 : 100;
}

// 统计当前占用的货舱单位。
export function cargoCount(run: Run): number {
  let total = 0;
  for (const value of Object.values(run.cargo)) total += value;
  return total;
}

// 保存有限长度的资源走势图数据。
export function snapshot(run: Run): void {
  const point: Snapshot = { turn: run.turn, credits: run.credits, hull: run.hull, fuel: run.fuel };
  run.snapshots.push(point);
  if (run.snapshots.length > 100) run.snapshots.shift();
}

// 建立十个市场及独立的初始回合状态。
export function createRun(seed = crypto.getRandomValues(new Uint32Array(1))[0]!): Run {
  const run: Run = {
    id: crypto.randomUUID(), rng: seed >>> 0 || 1, turn: 0, credits: 1000, fuel: 100, hull: 100,
    location: 'solace', destination: null, remaining: 0, routes: 0, cargo: {}, items: ['patch', 'cell'],
    markets: {}, pending: null, ended: false, snapshots: [],
  };
  for (const world of planets) {
    const market: Record<string, number> = {};
    for (const good of goods) market[good.id] = Math.round(good.base * (world.specialty === good.id ? 0.65 : 1.1 + random(run) * 0.35));
    run.markets[world.id] = market;
  }
  snapshot(run);
  return run;
}

// 校验只允许港口交易与补给的状态。
export function requirePort(run: Run): void {
  requireAlive(run);
  if (run.pending) throw new Error('Resolve the current event first: do resolve.');
  if (run.destination) throw new Error('This action requires a harbor.');
}

// 保证已结束的航程只能通过新游戏继续。
export function requireAlive(run: Run): void {
  if (run.ended) throw new Error('This voyage has ended. Use play for a new run.');
}

// 校验来自键入交互的正整数数量。
export function quantity(value: string): number {
  if (!/^[1-9]\d{0,5}$/u.test(value)) throw new Error('Enter a whole quantity from 1 to 999999.');
  return Number(value);
}

// 返回买卖方向对应的公开市场价格。
export function price(run: Run, good: string, buying = true): number {
  const market = run.markets[run.location];
  if (!goods.some(known) || !market || !Object.hasOwn(market, good)) throw new Error(`Unknown cargo: ${good}.`);
  const posted = market[good]!;
  if (!Number.isFinite(posted) || posted < 1) throw new Error(`Invalid market price: ${good}.`);
  // 将商品标识限制在消费端定义的十种商品之内。
  function known(entry: { id: string }): boolean { return entry.id === good; }
  return Math.max(1, Math.floor(posted * (buying ? run.items.includes('broker') ? 0.92 : 1 : 0.9)));
}

// 一次性检查资源后结算买卖，失败时保持原有状态。
export function trade(run: Run, good: string, amount: number, buying: boolean): void {
  requirePort(run);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Quantity must be a positive integer.');
  const cost = price(run, good, buying) * amount;
  const owned = run.cargo[good] ?? 0;
  if (buying && cargoCount(run) + amount > capacity(run, 'cargo')) throw new Error('Cargo hold is full.');
  if (buying && cost > run.credits) throw new Error('Not enough credits.');
  if (!buying && amount > owned) throw new Error('Not enough cargo.');
  run.credits += buying ? -cost : cost;
  run.cargo[good] = owned + (buying ? amount : -amount);
  snapshot(run);
}

// 为停靠中的飞船选择完全图中的下一目的地。
export function depart(run: Run, destination: string): void {
  requirePort(run);
  const target = planet(destination);
  if (target.id === run.location) throw new Error('Choose a different planet.');
  if (run.fuel <= 0) throw new Error('Refuel before departure.');
  run.destination = target.id;
  run.remaining = distance(run.location, target.id);
}

// 在各星球对所有商品执行有界的小幅价格随机游走。
function fluctuate(run: Run): void {
  for (const world of planets) {
    for (const good of goods) {
      const current = run.markets[world.id]![good.id]!;
      const multiplier = world.specialty === good.id ? 0.65 : 1.25;
      const next = current * (0.97 + random(run) * 0.06);
      run.markets[world.id]![good.id] = Math.round(Math.max(good.base * multiplier * 0.7, Math.min(good.base * multiplier * 1.3, next)));
    }
  }
}

// 在资源达到失败条件时设置最终状态。
export function checkEnd(run: Run): boolean {
  run.ended = run.hull <= 0 || (run.destination !== null && run.fuel <= 0);
  return run.ended;
}

// 消耗一次回合、推进随机航程并生成一个等待决策的事件。
export function travel(run: Run): string {
  requireAlive(run);
  if (run.pending) throw new Error('Resolve the current event first: do resolve.');
  if (!run.destination) throw new Error('Choose a destination with do depart.');
  const advance = 12 + Math.floor(random(run) * 12) + (run.items.includes('engine') ? 5 : 0) + (run.items.includes('map') ? 3 : 0);
  const fuel = Math.max(1, Math.ceil(advance * 0.35) - (run.items.includes('filter') ? 2 : 0));
  const maintenance = Math.max(1, 5 + Math.floor(run.turn / 8) - (run.items.includes('ledger') ? 3 : 0));
  run.turn += 1;
  run.remaining = Math.max(0, run.remaining - advance);
  run.fuel = Math.max(0, run.fuel - fuel + (run.items.includes('scoop') ? 2 : 0));
  const unpaid = Math.max(0, maintenance - run.credits);
  run.credits = Math.max(0, run.credits - maintenance) + (run.items.includes('magnet') ? 6 : 0);
  run.hull = Math.max(0, Math.min(capacity(run, 'hull'), run.hull - unpaid + (run.items.includes('drone') ? 2 : 0)));
  fluctuate(run);
  const arrived = run.remaining === 0;
  if (arrived) {
    run.location = run.destination;
    run.destination = null;
    run.routes += 1;
    run.arrivalPending = true;
    if (run.items.includes('charm')) run.credits += 20;
  }
  if (!checkEnd(run)) run.pending = events[Math.floor(random(run) * events.length)]!.id;
  snapshot(run);
  return `Turn ${run.turn}: advanced ${advance} distance; spent ${fuel} fuel and ${maintenance} credits.${unpaid ? ` Unpaid maintenance damaged ${unpaid} hull.` : ''}${arrived ? ` Arrived at ${planet(run.location).name}.` : ` ${run.remaining} distance remains.`}`;
}

// 判断事件选项在当前资源与道具条件下是否可用。
export function available(run: Run, option: EventOption): boolean {
  if (option.requires && !run.items.includes(option.requires)) return false;
  if (option.effect.item && run.items.length >= 6) return false;
  return run.credits + (option.effect.credits ?? 0) >= 0 && run.fuel + (option.effect.fuel ?? 0) >= 0;
}

// 将单次事件或道具效果施加到资源并限制容量。
function apply(run: Run, effect: Effect): void {
  run.credits = Math.max(0, run.credits + (effect.credits ?? 0));
  run.fuel = Math.max(0, Math.min(capacity(run, 'fuel'), run.fuel + (effect.fuel ?? 0)));
  const damage = effect.hull ?? 0;
  run.hull = Math.max(0, Math.min(capacity(run, 'hull'), run.hull + (damage < 0 && run.items.includes('shield') ? Math.ceil(damage * 0.65) : damage)));
  if (effect.item) run.items.push(effect.item);
}

// 验证事件身份后只结算一次，风险结果由已保存随机序列决定。
export function resolveEvent(run: Run, action: string): string {
  requireAlive(run);
  if (!run.pending) throw new Error('There is no event to resolve.');
  const event = eventById(run.pending);
  if (action === 'endure') {
    run.hull = Math.max(0, run.hull - 12);
    run.pending = null;
    checkEnd(run);
    snapshot(run);
    return `${event.name}: waited out the danger; lost 12 hull.`;
  }
  let selected: EventOption | undefined;
  for (const option of event.options) if (option.id === action) selected = option;
  if (!selected || !available(run, selected)) throw new Error('That event action is unavailable.');
  apply(run, selected.effect);
  const risk = random(run) < (selected.chance ?? 0);
  if (risk && selected.risk) apply(run, selected.risk);
  run.pending = null;
  checkEnd(run);
  snapshot(run);
  return `${event.name}: ${selected.label}.${risk ? ' The risk materialized.' : ' Action complete.'}`;
}

// 每颗星球固定供应三种装备，各星球共同覆盖全部道具。
export function shopItems(location: string) {
  const world = planet(location);
  const index = planets.indexOf(world);
  return [items[(index * 2) % items.length]!, items[(index * 2 + 1) % items.length]!, items[(index * 2 + 2) % items.length]!];
}

// 在港口购买道具，检查供应、槽位与被动装备重复。
export function buyItem(run: Run, id: string): void {
  requirePort(run);
  const entry = item(id);
  let stocked = false;
  for (const stock of shopItems(run.location)) if (stock.id === entry.id) stocked = true;
  if (!stocked) throw new Error(`${entry.name} is unavailable at this planet. Use do market for local stock.`);
  const cost = Math.floor(entry.price * (run.items.includes('broker') ? 0.92 : 1));
  if (run.items.length >= 6) throw new Error('All six item slots are occupied. Use or discard an item first.');
  if (!entry.consumable && run.items.includes(entry.id)) throw new Error('This equipment is already installed.');
  if (run.credits < cost) throw new Error('Not enough credits.');
  run.credits -= cost;
  run.items.push(entry.id);
}

// 使用消耗品且保留被动装备的明确行为。
export function useItem(run: Run, id: string): void {
  requireAlive(run);
  const entry = item(id);
  const index = run.items.indexOf(entry.id);
  if (index < 0) throw new Error('This item is not in your inventory.');
  if (!entry.consumable) throw new Error('This equipment is always active.');
  const effects: Record<string, Effect> = {
    patch: { hull: 25 }, cell: { fuel: 30 }, beacon: { hull: 15, fuel: 15 },
    ration: { hull: 10, credits: 15 }, flare: { credits: 80 }, coolant: { hull: 15, fuel: 10 },
  };
  run.items.splice(index, 1);
  apply(run, effects[entry.id]!);
  snapshot(run);
}

// 以港口公开单价购买燃料或船体维修。
export function service(run: Run, resource: 'fuel' | 'hull', amount: number): void {
  requirePort(run);
  if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('Quantity must be a positive integer.');
  if (run[resource] + amount > capacity(run, resource)) throw new Error(`Maximum ${resource}: ${capacity(run, resource)}.`);
  const cost = amount * (resource === 'fuel' ? 3 : 4);
  if (cost > run.credits) throw new Error('Not enough credits.');
  run.credits -= cost;
  run[resource] += amount;
  snapshot(run);
}

// 结合现金、存活、航线和当前货物残值结算总分。
export function score(run: Run): number {
  let cargoValue = 0;
  for (const [good, count] of Object.entries(run.cargo)) cargoValue += price(run, good, false) * count;
  return Math.floor(run.credits + run.turn * 25 + run.routes * 100 + cargoValue);
}

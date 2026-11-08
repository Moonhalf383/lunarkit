import { events } from '../content/events';
import { items } from '../content/items';
import { goods, planets } from '../content/planets';
import { capacity, cargoCount } from './engine';
import type { Run, SaveData, Score } from './types';

const key = 'lunarkit-merchant-v1';

// 检查普通 JSON 对象以验证浏览器持久化边界。
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
// 校验有限且非负的存档数值。
function number(value: unknown, max = 1e12): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max; }
// 校验存档中的完整运行状态，将有效数据交给游戏引擎。
export function validRun(value: unknown): value is Run {
  if (!object(value) || typeof value.id !== 'string' || value.id.length > 100) return false;
  for (const field of ['rng', 'turn', 'credits', 'fuel', 'hull', 'remaining', 'routes']) if (!number(value[field])) return false;
  if (!Number.isInteger(value.rng) || (value.rng as number) < 1 || (value.rng as number) > 4294967295 || !Number.isInteger(value.turn) || !Number.isInteger(value.routes)) return false;
  const worldIds = new Set<string>();
  const itemIds = new Set<string>();
  const eventIds = new Set<string>();
  const goodIds = new Set<string>();
  for (const world of planets) worldIds.add(world.id);
  for (const entry of items) itemIds.add(entry.id);
  for (const event of events) eventIds.add(event.id);
  for (const good of goods) goodIds.add(good.id);
  if (typeof value.location !== 'string' || !worldIds.has(value.location)) return false;
  if (value.destination !== null && (typeof value.destination !== 'string' || !worldIds.has(value.destination) || value.destination === value.location)) return false;
  if (value.pending !== null && (typeof value.pending !== 'string' || !eventIds.has(value.pending))) return false;
  if (typeof value.ended !== 'boolean' || !Array.isArray(value.items) || value.items.length > 6) return false;
  for (const entry of value.items) if (typeof entry !== 'string' || !itemIds.has(entry)) return false;
  for (const entry of items) {
    let count = 0;
    for (const id of value.items) if (id === entry.id) count += 1;
    if (!entry.consumable && count > 1) return false;
  }
  if (!object(value.cargo) || !object(value.markets)) return false;
  for (const [id, count] of Object.entries(value.cargo)) if (!goodIds.has(id) || !number(count, 45) || !Number.isInteger(count)) return false;
  for (const world of planets) {
    const market = value.markets[world.id];
    if (!object(market)) return false;
    for (const good of goods) if (!number(market[good.id], 100000) || (market[good.id] as number) < 1 || !Number.isInteger(market[good.id])) return false;
  }
  if (!Array.isArray(value.snapshots) || !value.snapshots.length || value.snapshots.length > 100) return false;
  for (const point of value.snapshots) {
    if (!object(point)) return false;
    for (const field of ['turn', 'credits', 'hull', 'fuel']) if (!number(point[field])) return false;
  }
  const run = value as unknown as Run;
  if (run.fuel > capacity(run, 'fuel') || run.hull > capacity(run, 'hull') || cargoCount(run) > capacity(run, 'cargo')) return false;
  if (run.destination === null && run.remaining !== 0) return false;
  if (run.ended !== (run.hull <= 0 || (run.destination !== null && run.fuel <= 0))) return false;
  return true;
}

// 校验历史分数的稳定字段。
function validScore(value: unknown): value is Score {
  return object(value) && typeof value.id === 'string' && typeof value.date === 'string'
    && number(value.turn) && Number.isInteger(value.turn) && number(value.routes) && Number.isInteger(value.routes) && number(value.score);
}

// 创建版本化三槽存储，持久化失败时保留本页副本并报告原因。
export function createStorage(storage: Storage | undefined) {
  let warning = '';
  let data: SaveData = { version: 1, slots: [null, null, null], history: [] };
  try {
    const raw = storage?.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!object(parsed) || parsed.version !== 1 || !Array.isArray(parsed.slots) || parsed.slots.length !== 3 || !Array.isArray(parsed.history) || parsed.history.length > 20) throw new Error('Invalid save structure.');
      for (const slot of parsed.slots) if (slot !== null && !validRun(slot)) throw new Error('Invalid voyage data.');
      if (!parsed.history.every(validScore)) throw new Error('Invalid score history.');
      data = parsed as unknown as SaveData;
    }
    if (!storage) warning = 'Browser storage is unavailable. Saves last for this page only.';
  } catch {
    warning = 'Saved data could be corrupt or from another version. Start a new voyage to create a fresh save.';
  }

  // 将当前副本序列化到浏览器；失败时提示本页保存范围。
  function persist(): void {
    try {
      if (!storage) throw new Error('Storage unavailable.');
      storage.setItem(key, JSON.stringify(data));
      warning = '';
    } catch {
      warning = 'Browser storage is unavailable or full. Progress is saved in this page only.';
    }
  }
  // 读取独立运行副本，使未保存操作保留在活动游戏中。
  function load(index: number): Run | null {
    const run = data.slots[index];
    return run ? structuredClone(run) : null;
  }
  // 显式写入一个槽位并保留其他槽位。
  function save(index: number, run: Run): void {
    if (!Number.isInteger(index) || index < 0 || index > 2 || !validRun(run)) throw new Error('Save validation failed. Start a fresh voyage.');
    data.slots[index] = structuredClone(run);
    persist();
  }
  // 将已结算运行去重并写入最近二十局历史。
  function record(score: Score): void {
    for (const entry of data.history) if (entry.id === score.id) return;
    data.history.unshift(score);
    data.history = data.history.slice(0, 20);
    for (let index = 0; index < 3; index += 1) if (data.slots[index]?.id === score.id) data.slots[index] = null;
    persist();
  }
  // 返回当前持久化范围的可读提示。
  function getWarning(): string { return warning; }
  // 返回历史成绩的独立快照。
  function history(): readonly Score[] { return structuredClone(data.history); }
  return { load, save, record, history, getWarning };
}

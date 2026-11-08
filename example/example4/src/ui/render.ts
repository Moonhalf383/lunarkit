import { createIcon, createBarChart, createLineChart, createPieChart, createProgressBar, createRotatingModel, renderMarkdown, typewrite } from 'lunarkit';
import type { CommandContext, IconName, OutputComponent } from 'lunarkit';
import { goods, planet } from '../content/planets';
import { item } from '../content/items';
import { capacity, cargoCount, score } from '../game/engine';
import type { Item, Planet, Run } from '../game/types';
import { ship, sphere } from './models';

// 创建消费端专属的无分隔线双列布局。
function columns(className: string): { element: HTMLElement; left: HTMLElement; right: HTMLElement } {
  const element = document.createElement('section');
  element.className = `merchant-columns ${className}`;
  const left = document.createElement('div');
  const right = document.createElement('div');
  element.append(left, right);
  return { element, left, right };
}

// 输出由消费端组合并统一释放的图形组件组。
function composite(element: HTMLElement, components: OutputComponent[]): OutputComponent {
  // 释放组合中每个独立的 SDK 组件。
  function dispose(): void { for (const component of components) component.dispose(); }
  return { element, dispose };
}

// 将常用资源和装备集中在顶部对齐的紧凑双列中。
export function dashboard(run: Run): OutputComponent {
  const { element, left, right } = columns('merchant-dashboard');
  const components: OutputComponent[] = [];
  const model = createRotatingModel({ label: 'Merchant ship rotating in space', mesh: ship, columns: 48, rows: 24, background: 'dark', light: [-0.6, 0.8, 1] });
  const fuel = createPieChart({ label: `Fuel ${run.fuel}/${capacity(run, 'fuel')}`, centerLabel: false, strokeWidth: 24, data: [{ label: 'Available', value: run.fuel }, { label: 'Used', value: capacity(run, 'fuel') - run.fuel }], legend: false });
  const hull = createPieChart({ label: `Hull ${run.hull}/${capacity(run, 'hull')}`, centerLabel: false, strokeWidth: 24, data: [{ label: 'Intact', value: run.hull }, { label: 'Damage', value: capacity(run, 'hull') - run.hull }], legend: false });
  components.push(model, fuel, hull);
  const rings = document.createElement('div');
  rings.className = 'merchant-rings';
  rings.append(hull.element, fuel.element);
  left.append(model.element, rings);
  const heading = document.createElement('h2');
  heading.className = 'merchant-section-title';
  heading.textContent = `VOYAGE ${run.id.slice(0, 8)}`;
  const stats = document.createElement('dl');
  stats.className = 'merchant-stats';
  const values: [string, string | number][] = [
    ['Turn', run.turn], ['Credits', run.credits], ['Score', score(run)],
    ['Hull', `${run.hull}/${capacity(run, 'hull')}`], ['Fuel', `${run.fuel}/${capacity(run, 'fuel')}`],
    ['Cargo', `${cargoCount(run)}/${capacity(run, 'cargo')}`], ['Routes', run.routes],
    ['Location', planet(run.location).name], ['Destination', run.destination ? planet(run.destination).name : 'Docked'],
    ['Distance', run.remaining],
  ];
  for (const [label, value] of values) {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = String(value);
    stats.append(term, detail);
  }
  const inventoryTitle = document.createElement('h3');
  inventoryTitle.className = 'merchant-section-title merchant-inventory-title';
  inventoryTitle.textContent = `ITEMS ${run.items.length}/6`;
  right.append(heading, stats, inventoryTitle);
  for (const id of run.items) {
    const line = document.createElement('div');
    const entry = item(id);
    line.className = 'merchant-inventory-item';
    line.append(icon(entry), document.createTextNode(`${entry.name} [${id}]`));
    right.append(line);
  }
  if (!run.items.length) {
    const empty = document.createElement('div');
    empty.textContent = 'No items equipped.';
    right.append(empty);
  }
  return composite(element, components);
}

// 在独立查询中展示资金历史，保持默认状态视图紧凑。
export function creditHistory(run: Run): OutputComponent {
  const data = [];
  for (const point of run.snapshots) data.push({ label: `T${point.turn}`, value: point.credits });
  const chart = createLineChart({ label: 'Credit history', data, legend: false });
  chart.element.classList.add('merchant-detail-chart');
  return chart;
}

// 货舱查询仅绘制实际持有的商品，并独立展示容量轨道。
export function cargoDetails(run: Run): OutputComponent {
  const element = document.createElement('section');
  element.className = 'merchant-cargo merchant-detail-chart';
  const data = [];
  for (const good of goods) {
    const value = run.cargo[good.id] ?? 0;
    if (value > 0) data.push({ label: good.name, value });
  }
  const progress = createProgressBar({ label: 'Cargo capacity', value: cargoCount(run), max: capacity(run, 'cargo') });
  const components = [progress];
  element.append(progress.element);
  if (data.length) {
    const bars = createBarChart({ label: 'Cargo manifest', data, legend: true });
    components.push(bars);
    element.append(bars.element);
  } else {
    const empty = document.createElement('p');
    empty.textContent = 'Cargo hold is empty. Buy local specialties at a harbor.';
    element.append(empty);
  }
  return composite(element, components);
}

// 按左对齐模型和右对齐文字的对称布局输出星球档案。
export function planetDetails(world: Planet, run?: Run): OutputComponent {
  const { element, left, right } = columns('merchant-planet');
  const text = document.createElement('div');
  text.append(renderMarkdown(`# ${world.name}\n${world.description}\n\n**Specialty:** ${world.specialty}\n\n**Coordinates:** ${world.x}, ${world.y}${run ? `\n\n**Market index:** ${run.markets[world.id]![world.specialty]}` : ''}`));
  left.append(text);
  const model = createRotatingModel({ label: `Rotating planet ${world.name}`, mesh: sphere(world.x), background: 'dark', light: [-1, 0.4, 0.2] });
  right.append(model.element);
  return composite(element, [model]);
}

// 将同风格的单色几何符号作为每件道具的图标。
export function icon(entry: Item): SVGSVGElement {
  const names: Record<string, IconName> = {
    patch: 'plus', cell: 'battery', shield: 'shield', scoop: 'radar', engine: 'rocket', tank: 'fuel', plating: 'layers', hold: 'box', broker: 'badge', ledger: 'book', scanner: 'scan', beacon: 'beacon', drone: 'tool', magnet: 'magnet', filter: 'filter', ration: 'package', flare: 'star', coolant: 'snowflake', map: 'map', charm: 'gem',
  };
  const svg = createIcon(names[entry.id] ?? 'box', { size: 40 });
  svg.classList.add('merchant-icon');
  return svg;
}

// 输出等高道具图标与标题，再逐字揭示已有安全 Markdown 文档。
export async function itemDetails(entry: Item, context: CommandContext): Promise<void> {
  const element = document.createElement('section');
  element.className = 'merchant-item';
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = entry.name;
  header.append(icon(entry), title);
  const body = renderMarkdown(entry.description);
  element.append(header, body);
  context.write(element);
  await typewrite({ element, signal: context.signal, interval: 3 });
}

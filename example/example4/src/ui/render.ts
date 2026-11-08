import { createBarChart, createLineChart, createPieChart, createProgressBar, createRotatingModel, renderMarkdown, typewrite } from 'lunarkit';
import type { CommandContext, OutputComponent } from 'lunarkit';
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
  const model = createRotatingModel({ label: 'Merchant ship rotating in space', mesh: ship, columns: 48, rows: 24 });
  const fuel = createPieChart({ label: 'Fuel', data: [{ label: 'Available', value: run.fuel }, { label: 'Used', value: capacity(run, 'fuel') - run.fuel }], legend: false });
  const hull = createPieChart({ label: 'Hull', data: [{ label: 'Intact', value: run.hull }, { label: 'Damage', value: capacity(run, 'hull') - run.hull }], legend: false });
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
  const model = createRotatingModel({ label: `Rotating planet ${world.name}`, mesh: sphere(world.x) });
  right.append(model.element);
  return composite(element, [model]);
}

// 将同风格的单色几何符号作为每件道具的图标。
export function icon(entry: Item): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('merchant-icon');
  const paths: Record<string, string> = {
    cross: 'M19 6H29V19H42V29H29V42H19V29H6V19H19Z',
    battery: 'M15 8H33V40H15ZM20 3H28V8M24 15V33M19 24H29',
    shield: 'M24 4L40 12V25L24 44L8 25V12ZM16 23L22 29L33 17',
    ring: 'M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5M24 15A9 9 0 1 0 24 33A9 9 0 1 0 24 15',
    arrow: 'M24 3L42 38L24 30L6 38ZM24 16V29',
    box: 'M6 12L24 4L42 12V36L24 44L6 36ZM6 12L24 20L42 12M24 20V44',
    diamond: 'M24 3L43 24L24 45L5 24ZM13 24H35M24 12V36',
    star: 'M24 2L29 17L45 18L33 28L37 44L24 35L11 44L15 28L3 18L19 17Z',
  };
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[entry.icon] ?? paths.box!);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#000');
  path.setAttribute('stroke-width', '2');
  svg.append(path);
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
  await typewrite({ element: body, signal: context.signal, interval: 5 });
}

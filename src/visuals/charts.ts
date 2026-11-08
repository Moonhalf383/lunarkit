import type { OutputComponent } from '../commands/types.js';

export interface ChartDatum { label: string; value: number }
export interface ChartOptions {
  label: string;
  data: readonly ChartDatum[];
  legend?: boolean;
  animate?: boolean;
}
const namespace = 'http://www.w3.org/2000/svg';

// 创建带可访问数值说明的黑白图形容器。
function container(options: ChartOptions, kind: string): { element: HTMLElement; svg: SVGSVGElement } {
  for (const datum of options.data) if (!Number.isFinite(datum.value) || datum.value < 0) throw new RangeError('Chart values must be finite and nonnegative.');
  const element = document.createElement('figure');
  element.className = `lk-chart lk-chart-${kind}`;
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 240 140');
  svg.setAttribute('role', 'img');
  let summary = options.label;
  for (const datum of options.data) summary += `; ${datum.label}: ${datum.value}`;
  svg.setAttribute('aria-label', summary);
  if (options.animate !== false) svg.classList.add('lk-chart-enter');
  const caption = document.createElement('figcaption');
  caption.textContent = options.label;
  element.append(svg, caption);
  if (options.legend !== false) {
    const legend = document.createElement('ul');
    legend.className = 'lk-chart-legend';
    for (let index = 0; index < options.data.length; index += 1) {
      const datum = options.data[index]!;
      const item = document.createElement('li');
      item.textContent = `${index + 1}. ${datum.label} ${datum.value}`;
      legend.append(item);
    }
    element.append(legend);
  }
  return { element, svg };
}

// 追加具有固定属性的安全 SVG 图元。
function shape(svg: SVGElement, tag: string, attributes: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(namespace, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  svg.append(node);
  return node;
}

// 创建以黑白环段与间隙区分数值的环形饼图。
export function createPieChart(options: ChartOptions): OutputComponent {
  const { element, svg } = container(options, 'pie');
  let total = 0;
  for (const datum of options.data) total += datum.value;
  if (!Number.isFinite(total)) throw new RangeError('Chart total exceeds the supported range.');
  shape(svg, 'circle', { cx: 120, cy: 70, r: 48, fill: 'none', stroke: '#000', 'stroke-width': 1 });
  let offset = 0;
  const circumference = 2 * Math.PI * 48;
  for (let index = 0; index < options.data.length; index += 1) {
    const value = options.data[index]!.value;
    const length = total ? value / total * circumference : 0;
    if (length > 0) shape(svg, 'circle', {
      cx: 120, cy: 70, r: 48, fill: 'none', stroke: index % 2 ? '#fff' : '#000', 'stroke-width': 12,
      'stroke-dasharray': `${Math.max(0, length - 2)} ${circumference}`, 'stroke-dashoffset': -offset,
      transform: 'rotate(-90 120 70)',
    });
    offset += length;
  }
  const label = shape(svg, 'text', { x: 120, y: 76, 'text-anchor': 'middle', fill: '#000', 'font-size': 18 });
  label.textContent = total ? `${Math.round((options.data[0]?.value ?? 0) / total * 100)}%` : '0%';
  return { element, dispose };
}

// 创建图形轨道式进度条，数值范围通过原生语义公开。
export function createProgressBar(options: { label: string; value: number; max?: number; animate?: boolean }): OutputComponent {
  const max = options.max ?? 100;
  if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(options.value)) throw new RangeError('Invalid progress range.');
  const value = Math.max(0, Math.min(max, options.value));
  const element = document.createElement('figure');
  element.className = 'lk-progress';
  const caption = document.createElement('figcaption');
  caption.textContent = `${options.label} ${Math.round(value / max * 100)}%`;
  const track = document.createElement('div');
  track.className = 'lk-progress-track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', options.label);
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(max));
  track.setAttribute('aria-valuenow', String(value));
  const fill = document.createElement('div');
  fill.className = 'lk-progress-fill';
  if (options.animate !== false) fill.classList.add('lk-chart-enter');
  fill.style.width = `${value / max * 100}%`;
  track.append(fill);
  element.append(caption, track);
  return { element, dispose };
}

// 创建共享坐标系的柱状图或折线图。
function cartesian(options: ChartOptions, line: boolean): OutputComponent {
  const { element, svg } = container(options, line ? 'line' : 'bar');
  shape(svg, 'path', { d: 'M12 8V124H232', fill: 'none', stroke: '#000' });
  let max = 1;
  for (const datum of options.data) max = Math.max(max, datum.value);
  let points = '';
  const width = 212 / Math.max(1, options.data.length);
  for (let index = 0; index < options.data.length; index += 1) {
    const value = options.data[index]!.value;
    const x = 16 + width * (index + 0.5);
    const y = 120 - value / max * 104;
    if (line) {
      points += `${x},${y} `;
      shape(svg, 'circle', { cx: x, cy: y, r: 2, fill: '#000' });
    } else shape(svg, 'rect', { x: x - width * 0.35, y, width: width * 0.7, height: 120 - y, fill: '#000' });
  }
  if (line) shape(svg, 'polyline', { points, fill: 'none', stroke: '#000', 'stroke-width': 2 });
  return { element, dispose };
}

// 创建黑白柱状图。
export function createBarChart(options: ChartOptions): OutputComponent { return cartesian(options, false); }
// 创建黑白折线图。
export function createLineChart(options: ChartOptions): OutputComponent { return cartesian(options, true); }
// 静态图形释放入口保持与动画组件相同的消费方式。
function dispose(): void {}

import type { OutputComponent } from '../commands/types.js';
import { animateVisible } from './animation.js';

export type Vertex3D = readonly [number, number, number];
export interface Mesh3D { vertices: readonly Vertex3D[]; faces: readonly (readonly [number, number, number])[] }
export interface ModelOptions {
  label: string;
  mesh: Mesh3D;
  columns?: number;
  rows?: number;
  speed?: number;
  animate?: boolean;
  background?: 'light' | 'dark';
  light?: Vertex3D;
}

// 以带深度缓冲的三角形投影绘制粗分辨率旋转模型。
export function createRotatingModel(options: ModelOptions): OutputComponent {
  const { mesh } = options;
  const columns = options.columns ?? 44;
  const rows = options.rows ?? 20;
  if (!Number.isInteger(columns) || columns < 8 || columns > 160 || !Number.isInteger(rows) || rows < 4 || rows > 80) throw new RangeError('Invalid model resolution.');
  for (const vertex of mesh.vertices) for (const value of vertex) if (!Number.isFinite(value)) throw new RangeError('Invalid vertex.');
  for (const face of mesh.faces) for (const index of face) if (!Number.isInteger(index) || !mesh.vertices[index]) throw new RangeError('Invalid mesh face.');
  if (!Number.isFinite(options.speed ?? 1)) throw new RangeError('Invalid rotation speed.');
  const element = document.createElement('pre');
  element.className = 'lk-model';
  if (options.background === 'dark') element.classList.add('lk-model-dark');
  element.dataset.transient = 'true';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', options.label);
  element.style.setProperty('--lk-model-columns', String(columns));
  let radius = 1;
  for (const vertex of mesh.vertices) radius = Math.max(radius, Math.hypot(...vertex));
  const ramp = ' .,:;=+*#@';

  // 旋转全部顶点后以重心坐标填充可见面和明暗字符。
  function draw(time: number): void {
    const angle = time * 0.0005 * (options.speed ?? 1) + 0.35;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const points: [number, number, number][] = [];
    const rotated: [number, number, number][] = [];
    for (const [x, y, z] of mesh.vertices) {
      const rx = (x * c + z * s) / radius;
      const rz = (-x * s + z * c) / radius;
      const ry = y / radius * 0.94 - rz * 0.34;
      const depth = y / radius * 0.34 + rz * 0.94;
      rotated.push([rx, ry, depth]);
      points.push([columns / 2 + rx * columns * 0.43, rows / 2 - ry * rows * 0.43, depth]);
    }
    const depths = new Float64Array(columns * rows).fill(-Infinity);
    const characters = new Array<string>(columns * rows).fill(' ');
    for (const [ia, ib, ic] of mesh.faces) {
      const a = points[ia]!;
      const b = points[ib]!;
      const d = points[ic]!;
      const area = (b[1] - d[1]) * (a[0] - d[0]) + (d[0] - b[0]) * (a[1] - d[1]);
      if (Math.abs(area) < 0.001) continue;
      let illumination = Math.min(1, 0.25 + Math.abs(area) / (columns * rows) * 4);
      if (options.light) {
        const va = rotated[ia]!;
        const vb = rotated[ib]!;
        const vc = rotated[ic]!;
        const u = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
        const v = [vc[0] - va[0], vc[1] - va[1], vc[2] - va[2]];
        let nx = u[1]! * v[2]! - u[2]! * v[1]!;
        let ny = u[2]! * v[0]! - u[0]! * v[2]!;
        let nz = u[0]! * v[1]! - u[1]! * v[0]!;
        if (nx * va[0] + ny * va[1] + nz * va[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const scale = Math.hypot(nx, ny, nz) * Math.hypot(...options.light);
        illumination = scale ? Math.max(0, (nx * options.light[0] + ny * options.light[1] + nz * options.light[2]) / scale) : 0;
      }
      const shade = ramp[Math.round(illumination * (ramp.length - 1))]!;
      for (let y = Math.max(0, Math.floor(Math.min(a[1], b[1], d[1]))); y <= Math.min(rows - 1, Math.ceil(Math.max(a[1], b[1], d[1]))); y += 1) {
        for (let x = Math.max(0, Math.floor(Math.min(a[0], b[0], d[0]))); x <= Math.min(columns - 1, Math.ceil(Math.max(a[0], b[0], d[0]))); x += 1) {
          const u = ((b[1] - d[1]) * (x - d[0]) + (d[0] - b[0]) * (y - d[1])) / area;
          const v = ((d[1] - a[1]) * (x - d[0]) + (a[0] - d[0]) * (y - d[1])) / area;
          const w = 1 - u - v;
          if (u < 0 || v < 0 || w < 0) continue;
          const depth = u * a[2] + v * b[2] + w * d[2];
          const index = y * columns + x;
          if (depth > depths[index]!) { depths[index] = depth; characters[index] = shade; }
        }
      }
    }
    let text = '';
    for (let row = 0; row < rows; row += 1) text += characters.slice(row * columns, (row + 1) * columns).join('') + (row === rows - 1 ? '' : '\n');
    if (element.textContent !== text) element.textContent = text;
  }
  const dispose = animateVisible(element, draw, options.animate !== false);
  return { element, dispose };
}

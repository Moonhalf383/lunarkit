import { iconPaths } from './icon-paths.js';

export type IconName = keyof typeof iconPaths;

// 创建采用免费锐角实心轮廓的通用单色图标。
export function createIcon(name: IconName, options: { size?: number; label?: string } = {}): SVGSVGElement {
  const size = options.size ?? 24;
  if (!Number.isFinite(size) || size <= 0) throw new RangeError('Icon size must be positive.');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('lk-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'currentColor');
  if (options.label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', options.label); }
  else svg.setAttribute('aria-hidden', 'true');
  for (const attributes of iconPaths[name]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const [attribute, value] of Object.entries(attributes)) path.setAttribute(attribute, value);
    svg.append(path);
  }
  return svg;
}

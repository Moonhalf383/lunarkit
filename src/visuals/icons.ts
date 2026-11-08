const paths = {
  plus: 'M12 5v14M5 12h14', battery: 'M8 3h8v2H8zM6 5h12v17H6zM9 10h6M12 7v6',
  shield: 'M12 3 20 6v6c0 4-4 7-8 9-4-2-8-5-8-9V6zM8 12l3 3 5-6',
  radar: 'M12 12 19 5M12 4a8 8 0 1 0 8 8M12 8a4 4 0 1 0 4 4',
  rocket: 'M9 15 5 19l1-5M9 15l6-6M9 15l-3-3c2-5 7-8 14-8-1 7-4 12-9 14zM14 9h.01M10 19l-1 3',
  fuel: 'M5 4h9v17H5zM5 10h9M14 8h3l3 4v6a1 1 0 0 1-2 0v-5M17 5l3 3',
  layers: 'm12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  box: 'm3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 5l10 4',
  badge: 'm12 3 3 3h4v4l2 3-3 3v4h-4l-3 2-3-3H5v-4l-2-3 3-3V5h4z',
  book: 'M4 4h7l1 2 1-2h7v15h-7l-1 2-1-2H4zM12 6v15M7 8h2M15 8h2',
  scan: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M6 12h12',
  beacon: 'M12 9v12M8 21h8M9 9a3 3 0 1 1 6 0M6 6a7 7 0 0 0 0 8M18 6a7 7 0 0 1 0 8',
  tool: 'M14 4a5 5 0 0 0-5 7l-6 6 4 4 6-6a5 5 0 0 0 7-5l-4 2-3-3z',
  magnet: 'M4 4h5v8a3 3 0 0 0 6 0V4h5v8a8 8 0 0 1-16 0zM4 8h5M15 8h5',
  filter: 'M3 4h18l-7 9v7l-4 2v-9z', package: 'M4 6h16v15H4zM3 3h18v5H3zM9 12h6',
  star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  snowflake: 'M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16',
  gem: 'M7 3h10l5 6-10 13L2 9zM2 9h20M7 3l5 19 5-19',
} as const;

export type IconName = keyof typeof paths;

// 创建统一二十四像素坐标、圆角线条的通用单色图标。
export function createIcon(name: IconName, options: { size?: number; label?: string } = {}): SVGSVGElement {
  const size = options.size ?? 24;
  if (!Number.isFinite(size) || size <= 0) throw new RangeError('Icon size must be positive.');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('lk-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (options.label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', options.label); }
  else svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[name]);
  svg.append(path);
  return svg;
}

import type { Mesh3D, Vertex3D } from 'lunarkit';

export const ship: Mesh3D = {
  vertices: [[0, 0.95, 0], [-0.25, -0.55, 0.3], [0.25, -0.55, 0.3], [0, -0.4, -0.35], [-0.95, -0.75, 0], [0.95, -0.75, 0], [0, -0.9, 0.15]],
  faces: [[0, 1, 2], [0, 2, 3], [0, 3, 1], [0, 4, 1], [0, 2, 5], [1, 4, 6], [2, 6, 5], [1, 6, 2], [1, 3, 6], [2, 6, 3]],
};

// 生成消费端星球的低多边形球面与独立三角面。
export function sphere(variant = 0): Mesh3D {
  const vertices: Vertex3D[] = [];
  const faces: [number, number, number][] = [];
  const rows = 10;
  const columns = 18;
  for (let row = 0; row <= rows; row += 1) {
    const latitude = row / rows * Math.PI;
    for (let column = 0; column < columns; column += 1) {
      const angle = column / columns * Math.PI * 2;
      const radius = 1 + Math.sin(column * 3 + row * 2 + variant) * 0.045;
      vertices.push([Math.sin(latitude) * Math.cos(angle) * radius, Math.cos(latitude) * radius, Math.sin(latitude) * Math.sin(angle) * radius]);
    }
  }
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * columns + column;
    const b = row * columns + (column + 1) % columns;
    const c = a + columns;
    const d = b + columns;
    faces.push([a, b, c], [b, d, c]);
  }
  return { vertices, faces };
}

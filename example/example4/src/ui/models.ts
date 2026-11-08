import type { Mesh3D, Vertex3D } from 'lunarkit';

export const ship: Mesh3D = {
  vertices: [[-0.65, -0.4, -0.95], [0.65, -0.4, -0.95], [0.65, 0.4, -0.95], [-0.65, 0.4, -0.95], [-0.65, -0.4, 0.95], [0.65, -0.4, 0.95], [0.65, 0.4, 0.95], [-0.65, 0.4, 0.95]],
  faces: [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]],
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

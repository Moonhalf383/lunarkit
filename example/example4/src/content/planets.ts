import type { Good, Planet } from '../game/types';

export const goods: readonly Good[] = [
  { id: 'grain', name: 'Solar Grain', base: 18 },
  { id: 'crystal', name: 'Prism Crystal', base: 70 },
  { id: 'alloy', name: 'Forge Alloy', base: 45 },
  { id: 'water', name: 'Glacier Water', base: 22 },
  { id: 'spice', name: 'Ember Spice', base: 90 },
  { id: 'silk', name: 'Void Silk', base: 60 },
  { id: 'circuit', name: 'Memory Circuit', base: 85 },
  { id: 'medicine', name: 'Bloom Medicine', base: 50 },
  { id: 'relic', name: 'Echo Relic', base: 110 },
  { id: 'gas', name: 'Nimbus Gas', base: 35 },
];
export const planets: readonly Planet[] = [
  { id: 'solace', name: 'Solace', x: 0, y: 0, specialty: 'grain', description: 'Quiet terraces feed a restless constellation. A forgiving harbor for a first departure.' },
  { id: 'prism', name: 'Prism', x: 30, y: 12, specialty: 'crystal', description: 'Faceted mountains split the sunrise into a thousand trading signals.' },
  { id: 'forge', name: 'Forge', x: -24, y: 30, specialty: 'alloy', description: 'Orbital foundries turn fallen stars into patient, reliable steel.' },
  { id: 'glacier', name: 'Glacier', x: 18, y: -32, specialty: 'water', description: 'Blue-white oceans sleep beneath a shell of ancient ice.' },
  { id: 'ember', name: 'Ember', x: 58, y: -18, specialty: 'spice', description: 'Volcanic gardens grow the rarest flavors in the inner lanes.' },
  { id: 'veil', name: 'Veil', x: -42, y: -20, specialty: 'silk', description: 'Night-side weavers catch starlight in almost weightless threads.' },
  { id: 'relay', name: 'Relay', x: 10, y: 62, specialty: 'circuit', description: 'A world of listening towers, archived voices, and very expensive memory.' },
  { id: 'bloom', name: 'Bloom', x: -62, y: 38, specialty: 'medicine', description: 'Living cities trade careful remedies for stories from beyond their atmosphere.' },
  { id: 'echo', name: 'Echo', x: 70, y: 48, specialty: 'relic', description: 'The oldest ruins in the chart still answer questions nobody remembers asking.' },
  { id: 'nimbus', name: 'Nimbus', x: -10, y: -66, specialty: 'gas', description: 'Floating refineries skim pale clouds above an endless storm.' },
];

// 读取已知星球并为无效输入提供明确错误。
export function planet(id: string): Planet {
  for (const entry of planets) if (entry.id === id.toLowerCase() || entry.name.toLowerCase() === id.toLowerCase()) return entry;
  throw new Error(`Unknown planet: ${id}.`);
}

// 完全图的边权取两端坐标的欧式距离，最短为十个航行单位。
export function distance(from: string, to: string): number {
  const a = planet(from);
  const b = planet(to);
  return Math.max(10, Math.round(Math.hypot(a.x - b.x, a.y - b.y)));
}

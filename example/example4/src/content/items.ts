import type { Item } from '../game/types';

export const items: readonly Item[] = [
  { id: 'patch', name: 'Hull Patch', price: 55, icon: 'cross', consumable: true, description: '# Repair\nRestore **25 hull** immediately.\n\n# Single use\nConsumed after activation; useful when the next harbor is too far away.' },
  { id: 'cell', name: 'Fuel Cell', price: 65, icon: 'battery', consumable: true, description: '# Reserve\nRestore **30 fuel** immediately.\n\n# Single use\nA compact emergency tank for an unforgiving route.' },
  { id: 'shield', name: 'Shield Coil', price: 180, icon: 'shield', consumable: false, description: '# Protection\nReduce incoming event hull damage by **35%**.\n\n# Equipment\nOccupies one of six item slots; duplicate coils provide no additional benefit.' },
  { id: 'scoop', name: 'Ion Scoop', price: 170, icon: 'ring', consumable: false, description: '# Recovery\nRecover **2 fuel** after every travel turn.\n\n# Equipment\nCollects thin interstellar ions along an active route.' },
  { id: 'engine', name: 'Vector Engine', price: 230, icon: 'arrow', consumable: false, description: '# Thrust\nTravel **5 additional distance** each turn.\n\n# Equipment\nA faster crossing reduces exposure to maintenance and events.' },
  { id: 'tank', name: 'Pressure Tank', price: 190, icon: 'battery', consumable: false, description: '# Capacity\nIncrease maximum fuel from **100 to 140**.\n\n# Equipment\nAdditional capacity is filled separately at a harbor.' },
  { id: 'plating', name: 'Layered Plating', price: 190, icon: 'shield', consumable: false, description: '# Capacity\nIncrease maximum hull from **100 to 130**.\n\n# Equipment\nShipyards repair the additional hull at the usual unit price.' },
  { id: 'hold', name: 'Folded Hold', price: 210, icon: 'box', consumable: false, description: '# Cargo\nIncrease cargo capacity from **30 to 45 units**.\n\n# Equipment\nA folded storage lattice for ambitious trading runs.' },
  { id: 'broker', name: 'Broker Seal', price: 200, icon: 'diamond', consumable: false, description: '# Negotiation\nReduce purchase prices by **8%**, including equipment.\n\n# Equipment\nSelling uses the normal posted market bid.' },
  { id: 'ledger', name: 'Quiet Ledger', price: 150, icon: 'box', consumable: false, description: '# Efficiency\nReduce per-turn maintenance by **3 credits**.\n\n# Equipment\nMaintenance always costs at least one credit.' },
  { id: 'scanner', name: 'Deep Scanner', price: 160, icon: 'ring', consumable: false, description: '# Signals\nUnlock special survey and salvage event choices.\n\n# Equipment\nThe option list identifies scanner-dependent actions.' },
  { id: 'beacon', name: 'Rescue Beacon', price: 140, icon: 'star', consumable: true, description: '# Rescue\nRestore **15 hull and 15 fuel**.\n\n# Single use\nA small autonomous tender answers once.' },
  { id: 'drone', name: 'Repair Drone', price: 240, icon: 'cross', consumable: false, description: '# Maintenance\nRestore **2 hull** after every travel turn.\n\n# Equipment\nWorks while engines are running, up to maximum hull.' },
  { id: 'magnet', name: 'Salvage Magnet', price: 175, icon: 'ring', consumable: false, description: '# Salvage\nEarn **6 credits** after every travel turn.\n\n# Equipment\nCollects harmless metallic dust from the shipping lane.' },
  { id: 'filter', name: 'Clean Filter', price: 160, icon: 'diamond', consumable: false, description: '# Economy\nReduce turn fuel consumption by **2 units**.\n\n# Equipment\nA travel turn always consumes at least one unit.' },
  { id: 'ration', name: 'Crew Rations', price: 45, icon: 'box', consumable: true, description: '# Morale\nRestore **10 hull** and recover **15 credits** of crew supplies.\n\n# Single use\nFresh food and a few spare seals keep a crew moving.' },
  { id: 'flare', name: 'Signal Flare', price: 100, icon: 'star', consumable: true, description: '# Assistance\nReceive **80 credits** from the lane assistance fund.\n\n# Single use\nA modest emergency grant delivered by a passing courier.' },
  { id: 'coolant', name: 'Cryo Coolant', price: 70, icon: 'diamond', consumable: true, description: '# Stabilize\nRestore **15 hull and 10 fuel**.\n\n# Single use\nReclaims hot propellant while protecting the reactor.' },
  { id: 'map', name: 'Star Atlas', price: 220, icon: 'star', consumable: false, description: '# Navigation\nTravel **3 additional distance** each turn.\n\n# Equipment\nStacks with the Vector Engine; surveyed lanes still have random currents.' },
  { id: 'charm', name: 'Merchant Charm', price: 120, icon: 'diamond', consumable: false, description: '# Reputation\nReceive **20 credits** whenever a route is completed.\n\n# Equipment\nHarbor keepers remember a familiar ship.' },
];

// 通过稳定标识或英文名称查找道具。
export function item(id: string): Item {
  for (const entry of items) if (entry.id === id.toLowerCase() || entry.name.toLowerCase() === id.toLowerCase()) return entry;
  throw new Error(`Unknown item: ${id}.`);
}

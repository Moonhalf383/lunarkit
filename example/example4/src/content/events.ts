import type { EventOption, MerchantEvent } from '../game/types';

// 构造一组公开代价和风险的事件选项。
function options(credits: number, hull: number, fuel: number): readonly EventOption[] {
  return [
    { id: 'engage', label: `Engage: gain ${credits} credits; 35% risk of ${hull} hull damage`, effect: { credits }, chance: 0.35, risk: { hull: -hull } },
    { id: 'avoid', label: `Take the safe detour: spend ${fuel} fuel`, effect: { fuel: -fuel } },
  ];
}

export const events: readonly MerchantEvent[] = [
  { id: 'debris', name: 'Silver Debris', text: 'A broken freighter glitters across the lane. Its cargo still carries an active salvage tag.', options: options(65, 12, 3) },
  { id: 'pirates', name: 'Quiet Pirates', text: 'A ship with no registry asks for a toll. Their weapons look old; their patience looks older.', options: [
    { id: 'pay', label: 'Pay 45 credits for safe passage', effect: { credits: -45 } },
    { id: 'run', label: 'Run: spend 5 fuel; 50% risk of 18 hull damage', effect: { fuel: -5 }, chance: 0.5, risk: { hull: -18 } },
  ] },
  { id: 'comet', name: 'Comet Tail', text: 'A comet spills rare particles across your course. The collector rails begin to sing.', options: options(75, 14, 4) },
  { id: 'distress', name: 'Small Distress', text: 'A survey capsule sends one careful message: fuel depleted, crew alive, payment promised.', options: [
    { id: 'help', label: 'Donate 10 fuel; receive 95 credits', effect: { fuel: -10, credits: 95 } },
    { id: 'leave', label: 'Relay their signal and continue', effect: {} },
  ] },
  { id: 'storm', name: 'Magnetic Weather', text: 'A dark aurora folds around the bow. A narrow corridor remains between the charge fronts.', options: [
    { id: 'cross', label: 'Cross: lose 7 hull', effect: { hull: -7 } },
    { id: 'detour', label: 'Circle the front: spend 6 fuel', effect: { fuel: -6 } },
  ] },
  { id: 'courier', name: 'Late Courier', text: 'An exhausted courier offers a sealed parcel and a very short explanation.', options: options(85, 15, 2) },
  { id: 'derelict', name: 'Sleeping Hull', text: 'The airlock of an abandoned yacht is open. A solitary maintenance light still blinks.', options: options(90, 16, 3) },
  { id: 'trader', name: 'Passing Trader', text: 'A little tanker pulls alongside. Its owner offers a one-time transfer before the lanes diverge.', options: [
    { id: 'buy', label: 'Spend 35 credits for 20 fuel', effect: { credits: -35, fuel: 20 } },
    { id: 'wave', label: 'Exchange greetings and continue', effect: {} },
  ] },
  { id: 'meteor', name: 'Stone Rain', text: 'Your radar blooms with little stones. Several are dense enough to interest a refinery.', options: options(55, 10, 4) },
  { id: 'archive', name: 'Lost Archive', text: 'An ancient repeater offers a compressed star chart in exchange for a brief power connection.', options: options(70, 9, 2) },
  { id: 'garden', name: 'Drifting Garden', text: 'A greenhouse spins in the dark. Inside, small leaves turn toward your running lights.', options: [
    { id: 'harvest', label: 'Spend 20 credits; restore 15 hull', effect: { credits: -20, hull: 15 } },
    { id: 'leave', label: 'Mark the garden for its owners', effect: {} },
  ] },
  { id: 'inspection', name: 'Lane Inspection', text: 'A patrol requests your ledger. An expedited clearance fee appears on the second page.', options: [
    { id: 'pay', label: 'Pay 25 credits', effect: { credits: -25 } },
    { id: 'wait', label: 'Run the inspection: spend 4 fuel', effect: { fuel: -4 } },
  ] },
  { id: 'race', name: 'Friendly Wager', text: 'A racing skiff matches your speed. Its pilot proposes a short sprint for loose change.', options: options(80, 13, 3) },
  { id: 'echoes', name: 'Unlisted Echo', text: 'Your scanner finds a structure absent from every public chart. Its outline is unusually regular.', options: [
    { id: 'scan', label: 'Deep Scanner: earn 100 credits', effect: { credits: 100 }, requires: 'scanner' },
    { id: 'probe', label: 'Launch a probe: earn 40 credits; lose 4 hull', effect: { credits: 40, hull: -4 } },
    { id: 'leave', label: 'Record the coordinates and continue', effect: {} },
  ] },
  { id: 'leak', name: 'Warm Pipe', text: 'A fuel line warms faster than it should. The engineering panel suggests two solutions.', options: [
    { id: 'repair', label: 'Spend 30 credits on remote repair', effect: { credits: -30 } },
    { id: 'vent', label: 'Vent the line: lose 8 fuel', effect: { fuel: -8 } },
  ] },
  { id: 'festival', name: 'Radio Festival', text: 'A nearby habitat broadcasts music and buys stories from passing travelers.', options: [
    { id: 'story', label: 'Share your voyage; receive 30 credits', effect: { credits: 30 } },
    { id: 'donate', label: 'Donate 20 credits; receive a Hull Patch', effect: { credits: -20, item: 'patch' } },
  ] },
  { id: 'ice', name: 'Blue Fragment', text: 'A clean ice fragment floats within tractor range. Its water could stabilize your fuel system.', options: [
    { id: 'collect', label: 'Collect: restore 12 fuel; lose 3 hull', effect: { fuel: 12, hull: -3 } },
    { id: 'leave', label: 'Keep the lane clear', effect: {} },
  ] },
  { id: 'auction', name: 'One-minute Auction', text: 'A remote auctioneer has one emergency cell left and a countdown that sounds very practiced.', options: [
    { id: 'bid', label: 'Spend 40 credits for a Fuel Cell', effect: { credits: -40, item: 'cell' } },
    { id: 'pass', label: 'Pass on the auction', effect: {} },
  ] },
  { id: 'rift', name: 'Thin Space', text: 'The stars bend around a shallow rift. The science console requests a close approach.', options: options(110, 20, 5) },
  { id: 'pilgrims', name: 'Pilgrim Lights', text: 'A procession of lantern ships asks for a small donation to keep its beacon alive.', options: [
    { id: 'donate', label: 'Spend 15 credits; restore 8 hull', effect: { credits: -15, hull: 8 } },
    { id: 'salute', label: 'Salute the procession', effect: {} },
  ] },
  { id: 'relay', name: 'Relay Contract', text: 'A repeater needs a few seconds of your transmitter time. Its owner pays by the packet.', options: options(45, 6, 1) },
  { id: 'ore', name: 'Dense Dust', text: 'Metallic dust settles on the collector. The grains are small, but their mass is promising.', options: options(60, 8, 2) },
  { id: 'ghost', name: 'Ghost Signal', text: 'A familiar voice reads tomorrow\'s docking instructions. The timestamp is impossible.', options: options(95, 17, 4) },
  { id: 'workshop', name: 'Mobile Workshop', text: 'A traveling mechanic offers a clean weld and a cup of very strong coffee.', options: [
    { id: 'repair', label: 'Spend 45 credits; restore 25 hull', effect: { credits: -45, hull: 25 } },
    { id: 'decline', label: 'Thank the mechanic and continue', effect: {} },
  ] },
  { id: 'flare', name: 'Distant Flare', text: 'A stellar flare paints every window white. Instruments disagree about the safest heading.', options: [
    { id: 'brace', label: 'Brace: lose 8 hull', effect: { hull: -8 } },
    { id: 'burn', label: 'Burn around the wave: spend 7 fuel', effect: { fuel: -7 } },
  ] },
  { id: 'survey', name: 'Survey Reward', text: 'A cartography guild offers a reward for a precise reading of this quiet stretch of space.', options: [
    { id: 'scan', label: 'Deep Scanner: receive 120 credits', effect: { credits: 120 }, requires: 'scanner' },
    { id: 'manual', label: 'Manual survey: receive 35 credits', effect: { credits: 35 } },
  ] },
  { id: 'vault', name: 'Cargo Vault', text: 'A sealed vault follows an elliptical orbit. Someone has already cut halfway through its shell.', options: options(130, 22, 5) },
  { id: 'tender', name: 'Harbor Tender', text: 'A harbor tender is returning home with surplus propellant. The crew would rather trade than carry it.', options: [
    { id: 'trade', label: 'Spend 25 credits; restore 15 fuel', effect: { credits: -25, fuel: 15 } },
    { id: 'leave', label: 'Wish them a safe return', effect: {} },
  ] },
  { id: 'beacon', name: 'Broken Beacon', text: 'A navigation beacon has drifted out of alignment. A reward code flashes below its warning.', options: options(50, 7, 2) },
  { id: 'stowaway', name: 'Tiny Passenger', text: 'A maintenance creature emerges from a crate carrying a bundle of loose cables.', options: [
    { id: 'welcome', label: 'Feed it 10 credits of supplies; restore 12 hull', effect: { credits: -10, hull: 12 } },
    { id: 'release', label: 'Arrange a safe transfer', effect: {} },
  ] },
];

// 读取存档中等待结算的事件定义。
export function eventById(id: string): MerchantEvent {
  for (const event of events) if (event.id === id) return event;
  throw new Error(`Unknown event: ${id}.`);
}

export interface Planet { id: string; name: string; x: number; y: number; specialty: string; description: string }
export interface Good { id: string; name: string; base: number }
export interface Item { id: string; name: string; price: number; icon: string; consumable: boolean; description: string }
export interface Effect { credits?: number; fuel?: number; hull?: number; cargo?: number; item?: string }
export interface EventOption { id: string; label: string; effect: Effect; chance?: number; risk?: Effect; requires?: string }
export interface MerchantEvent { id: string; name: string; text: string; options: readonly EventOption[] }
export interface Snapshot { turn: number; credits: number; hull: number; fuel: number }
export interface Run {
  id: string;
  rng: number;
  turn: number;
  credits: number;
  fuel: number;
  hull: number;
  location: string;
  destination: string | null;
  remaining: number;
  routes: number;
  cargo: Record<string, number>;
  items: string[];
  markets: Record<string, Record<string, number>>;
  pending: string | null;
  arrivalPending?: boolean;
  ended: boolean;
  snapshots: Snapshot[];
}
export interface Score { id: string; turn: number; score: number; routes: number; date: string }
export interface SaveData { version: 1; slots: (Run | null)[]; history: Score[] }

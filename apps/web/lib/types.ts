import type { KitchenLooks } from '@repo/engine/looks';

export type PriceRange = [low: number, high: number];
export interface Option<L = unknown> { id: string; name: string; short?: string; icon?: string; swatch?: string; price: PriceRange; look: L }
export interface OptionGroup<L = unknown> { id: string; name: string; scales?: boolean; default: string; options: Option<L>[] }
export interface Part { id: keyof KitchenLooks; name: string; icon: string; scales: boolean; note: string; groups: OptionGroup[] }
export interface RoomConfig {
  name: string; title: string; titleEm: string; intro: string;
  sizes: { id: string; name: string; note: string; areaM2: number; factor: number }[];
  defaultSize: string; sizeNote: string; measurementNote: string;
  measurements: { name: string; value: number }[];
  base: { name: string; price: PriceRange; scales: boolean };
  parts: Part[];
}
type TypedPart = { [P in keyof KitchenLooks]: Omit<Part, 'id' | 'groups'> & { id: P; groups: { [G in keyof KitchenLooks[P]]: Omit<OptionGroup<KitchenLooks[P][G]>, 'id'> & { id: G } }[keyof KitchenLooks[P]][] } }[keyof KitchenLooks];
export interface BusinessConfig {
  business: { name: string; logoText: string; domain: string; tagline: string; phone: string | null; brandColor: string; sampleNotice: string };
  estimate: { label: string; disclaimer: string; locale: string; currency: string; roundTo: number };
  cta: { lead: string; button: string };
  consultation: { title: string; intro: string; unavailableMessage: string };
  defaultRoom: 'kitchen';
  rooms: { kitchen: Omit<RoomConfig, 'parts'> & { parts: TypedPart[] } };
}
export interface VoiceDesign { size: string; step: string; estimate: string; finishes: { id: string; name: string; summary: string }[] }
export type Choices = Record<string, Record<string, string>>;
export interface StudioState { size: string; choices: Choices; active: string }
export interface EstimateTotals { lines: { id: string; name: string; summary: string; range: PriceRange }[]; range: PriceRange }

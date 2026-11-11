// The looks the kitchen builder draws: one entry per part and option group. A business config supplies
// one of these shapes as the "look" of every option, and the builder reads nothing else from the config.

export type DoorStyle = 'slab' | 'shaker' | 'raised' | 'inset';
export type StoolKind = 'metal' | 'rattan' | 'leather' | 'none';

export interface WoodTone {
  base: string;
  grain: string;
}

export type Finish = { paint: string } | { wood: WoodTone };

export type CounterMaterial =
  | { kind: 'wood'; base: string; grain: string; gloss: number }
  | { kind: 'speckle'; base: string; flecks: string[]; gloss: number }
  | { kind: 'marble'; base: string; vein: string; gloss: number };

export type SplashTile =
  | { pattern: 'subway' | 'zellige'; base: string; grout: string }
  | { pattern: 'herringbone'; base: string; vein: string; grout: string }
  | { pattern: 'slab'; base: string };

export interface PendantLook {
  pendant: 'globe' | 'dome' | 'drum';
  finish?: 'black' | 'brass';
}

export type FloorLook =
  | { floor: 'planks'; base: string; grain: string; plank?: number }
  | { floor: 'tile'; base: string; vein: string; grout: string }
  | { floor: 'herringbone'; base: string; grain: string };

export interface AppliancePackage {
  finish: 'stainless' | 'black';
  pro: boolean;
  panel: boolean;
}

export interface HardwareFinish {
  metal: string;
  roughness: number;
  dark?: boolean;
}

export interface KitchenLooks {
  cabinets: { style: { door: DoorStyle }; color: Finish };
  countertops: { material: CounterMaterial; edge: { waterfall: boolean } };
  backsplash: { tile: SplashTile };
  island: { finish: Finish | { match: true }; stools: { stool: StoolKind } };
  lighting: { pendant: PendantLook; under: { underCabinet: boolean } };
  flooring: { floor: FloorLook };
  appliances: { package: AppliancePackage };
  hardware: { finish: HardwareFinish };
  walls: { paint: { paint: string } };
}

// The same parts and groups as a value, so a config can be checked for completeness at run time.
export const kitchenLookGroups: { [Part in keyof KitchenLooks]: { [Group in keyof KitchenLooks[Part]]: true } } = {
  cabinets: { style: true, color: true },
  countertops: { material: true, edge: true },
  backsplash: { tile: true },
  island: { finish: true, stools: true },
  lighting: { pendant: true, under: true },
  flooring: { floor: true },
  appliances: { package: true },
  hardware: { finish: true },
  walls: { paint: true },
};

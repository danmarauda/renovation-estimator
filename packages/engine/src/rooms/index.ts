// Room registry. Each room id in a business config's "rooms" needs a 3D builder here.
// To add a bathroom or an exterior later: write rooms/bathroom.ts exporting a builder that returns a RoomModel
// (see ../room.ts) for its own looks, and register it below.
import { buildKitchen } from './kitchen.ts';

export const builders = {
  kitchen: buildKitchen,
};

export type RoomId = keyof typeof builders;

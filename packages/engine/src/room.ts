// What a room builder returns, and the part of it the stage needs.
import type { Group, Object3D } from 'three';

export type Vec3 = [x: number, y: number, z: number];

export interface CameraView {
  name: string;
  pos: Vec3;
  target: Vec3;
}

// One named shot per step id, plus the shot of the whole room.
export interface RoomViews {
  home: CameraView;
  [step: string]: CameraView | undefined;
}

export interface StageRoom {
  root: Group;
  partObjects: Record<string, Object3D[]>;
  aoHidden: Object3D[];
  views: RoomViews;
  setNight(t: number): void;
  dispose(): void;
}

export interface RoomModel<Looks> extends StageRoom {
  applyLooks(looks: Looks): void;
}

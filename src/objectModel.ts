import { CollisionRole, LevelObject, ObjectAction, ObjectMotion, TrapObjectType } from './types';

// Ground line shared with the engine (LevelDevilGame keeps its own GROUND_Y constant equal to this).
export const GROUND_Y = 280;

export interface ObjectPreset {
  type: TrapObjectType;
  label: string;
  width: number;
  height: number;
  y: number;
  initiallyActive: boolean;
  role: CollisionRole;
}

// Single source of truth for object presets, used by both the sidebar palette and the engine.
export const objectCatalog: ObjectPreset[] = [
  { type: 'spike', label: 'Spike', width: 30, height: 22, y: GROUND_Y + 1, initiallyActive: true, role: 'hazard' },
  { type: 'saw', label: 'Saw', width: 36, height: 36, y: GROUND_Y - 36, initiallyActive: false, role: 'hazard' },
  { type: 'pit', label: 'Opening Pit', width: 90, height: 42, y: GROUND_Y + 1, initiallyActive: false, role: 'pit' },
  { type: 'fallingBlock', label: 'Falling Block', width: 54, height: 44, y: 84, initiallyActive: false, role: 'hazard' },
  { type: 'crusher', label: 'Crusher', width: 58, height: 96, y: 160, initiallyActive: false, role: 'hazard' },
  { type: 'laser', label: 'Laser Beam', width: 130, height: 14, y: 212, initiallyActive: false, role: 'hazard' },
  { type: 'platform', label: 'Platform', width: 90, height: 18, y: 200, initiallyActive: true, role: 'solid' },
  { type: 'button', label: 'Button', width: 66, height: 30, y: 150, initiallyActive: true, role: 'decor' },
];

export const objectPreset = (type: TrapObjectType): ObjectPreset =>
  objectCatalog.find((item) => item.type === type) || objectCatalog[0];

export const defaultMotion = (): ObjectMotion => ({
  mode: 'static',
  target: 'player',
  speed: 2,
  dirX: 1,
  dirY: 0,
  distance: 0,
  loop: false,
  startOn: 'spawn',
  delay: 0,
});

export const defaultAction = (): ObjectAction => ({ kind: 'none', targetId: 'door' });

// Collision role for an object: explicit role wins, otherwise the preset default for its type.
export const effectiveRole = (object: LevelObject): CollisionRole =>
  object.role || objectPreset(object.type).role;

// Motion config for an object, defaulting falling blocks to their legacy fall-on-trigger behavior.
export const objectMotion = (object: LevelObject): ObjectMotion => {
  if (object.motion) return object.motion;
  if (object.type === 'fallingBlock') {
    return { ...defaultMotion(), mode: 'fall', startOn: 'trigger' };
  }
  return defaultMotion();
};

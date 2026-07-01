export type TrapObjectType =
  | 'spike'
  | 'saw'
  | 'pit'
  | 'fallingBlock'
  | 'crusher'
  | 'laser'
  | 'platform'
  | 'button';
export type TriggerAction = 'activate' | 'openPit' | 'startDoorChase' | 'splitFloor' | 'collapseFloor' | 'nextRun' | 'redirectCTA';

// How an object behaves over time once it is active.
export type MotionMode = 'static' | 'linear' | 'chase' | 'fall';
// How an object collides with the player.
export type CollisionRole = 'hazard' | 'solid' | 'pit' | 'decor';
// What an object/trigger does when fired (touch by player, or tap when clickable).
export type ObjectActionKind =
  | 'none'
  | 'activate'
  | 'openPit'
  | 'splitFloor'
  | 'startDoorChase'
  | 'collapseFloor'
  | 'nextRun'
  | 'redirectCTA';

export interface ObjectMotion {
  mode: MotionMode;
  target: string; // chase target: 'player', 'door', or an object id
  speed: number; // px per frame
  dirX: number; // -1..1, used for linear
  dirY: number; // -1..1, used for linear
  distance: number; // max travel distance for linear (0 = infinite)
  loop: boolean; // ping-pong back and forth for linear
  startOn: 'spawn' | 'trigger';
  delay: number; // seconds before the motion starts
}

export interface ObjectAction {
  kind: ObjectActionKind;
  targetId: string; // object id or 'door'
}

export interface LevelObject {
  id: string;
  type: TrapObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  initiallyActive: boolean;
  // Optional flexible-entity fields (older configs work without them).
  role?: CollisionRole;
  motion?: ObjectMotion;
  clickable?: boolean; // behaves like a button: tap fires `action`
  action?: ObjectAction; // fired on tap (clickable) or on player touch
  appearDelay?: number; // seconds before the object becomes visible/active in play
  spriteUrl?: string; // custom image for loaded/imported objects
}

export interface TriggerZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetId: string;
  action: TriggerAction;
  label: string;
}

export interface GameConfig {
  playerSpeed: number;
  jumpForce: number;
  gravity: number;
  doorBaseSpeed: number;
  doorAccelSpeed: number;
  doorHoming: number;
  triggerDistance: number;
  skipButtonDelay: number;
  spikes: number[];
  playerSpawnX: number;
  doorSpawnX: number;
  objects: LevelObject[];
  triggers: TriggerZone[];
}

export interface PlayableRun {
  id: string;
  name: string;
  config: GameConfig;
}

export interface PlayableProject {
  id: string;
  name: string;
  runs: PlayableRun[];
}

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
}

export type EditorMode = 'play' | 'constructor';
export type EditorTool =
  | 'select'
  | 'spike'
  | 'saw'
  | 'pit'
  | 'fallingBlock'
  | 'crusher'
  | 'laser'
  | 'platform'
  | 'button'
  | 'trigger'
  | 'erase';
export type ActiveRun = number;

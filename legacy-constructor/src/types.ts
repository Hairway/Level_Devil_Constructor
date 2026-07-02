export type TrapObjectType =
  | 'spike'
  | 'saw'
  | 'pit'
  | 'fallingBlock'
  | 'crusher'
  | 'laser'
  | 'platform'
  | 'button'
  | 'text';
export type TriggerAction = 'activate' | 'deactivate' | 'toggle' | 'teleport' | 'checkpoint' | 'win' | 'openPit' | 'splitFloor' | 'startDoorChase' | 'collapseFloor' | 'nextRun' | 'redirectCTA' | 'chain';

// How an object behaves over time once it is active.
export type MotionMode = 'static' | 'linear' | 'chase' | 'fall' | 'orbit' | 'pendulum' | 'path';
// How an object collides with the player.
export type CollisionRole = 'hazard' | 'solid' | 'pit' | 'decor' | 'spring';
// What an object/trigger does when fired (touch by player, or tap when clickable).
export type ObjectActionKind =
  | 'none'
  | 'activate'
  | 'deactivate'
  | 'toggle'
  | 'teleport'
  | 'checkpoint'
  | 'win'
  | 'openPit'
  | 'splitFloor'
  | 'startDoorChase'
  | 'collapseFloor'
  | 'nextRun'
  | 'redirectCTA'
  | 'chain';

export interface ObjectMotion {
  mode: MotionMode;
  target: string; // chase target: 'player', 'door', or an object id
  speed: number; // px per frame
  dirX: number; // -1..1, used for linear
  dirY: number; // -1..1, used for linear
  distance: number; // max travel distance for linear (0 = infinite); radius for orbit/pendulum
  loop: boolean; // ping-pong back and forth (linear/path) or reverse direction (orbit)
  startOn: 'spawn' | 'trigger';
  delay: number; // seconds before the motion starts
  waypoints?: Array<{ x: number; y: number }>; // path mode: points travelled after the placed start
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
  locked?: boolean; // editor: prevents accidental dragging on the canvas
  color?: string; // hex tint/fill override for this obstacle
  role?: CollisionRole;
  motion?: ObjectMotion;
  clickable?: boolean; // behaves like a button: tap fires `action`
  action?: ObjectAction; // fired on tap (clickable) or on player touch
  links?: Array<{ targetId: string; action: ObjectActionKind }>; // extra actions fired alongside `action`
  appearDelay?: number; // seconds before the object becomes visible/active in play
  vanishAfter?: number; // seconds after appearing before it auto-disappears (0 = never)
  opacity?: number; // 0..1 transparency (undefined = fully opaque)
  spriteUrl?: string; // custom image for loaded/imported objects
  fontUrl?: string; // uploaded custom font (data URL); pairs with fontFamily as its name
  attachTo?: string; // follow another entity: '' | 'door' | 'player' | objectId (moves with it)
  text?: string; // text drawn on the object (buttons/text); falls back to label
  textColor?: string; // hex color for the on-object text
  fontFamily?: string; // font for text/button labels (CSS family name)
  fontSize?: number; // explicit text size in px (text objects); falls back to height
  bounce?: number; // launch impulse when role is 'spring' (px/frame; default 18)
  rotation?: number; // visual rotation in degrees (0 = default; 180 = ceiling spike, ±90 = wall)
  spin?: number; // continuous rotation speed in degrees/frame (0 = none; e.g. spinning saws)
  deadly?: boolean; // explicit "kills on touch" override (undefined = derive from hazard role)
  deadlyWhileMoving?: boolean; // only lethal while moving/falling; safe once settled
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
  layer?: string; // editor organization: name of the trigger layer this belongs to
  links?: Array<{ targetId: string; action: TriggerAction }>; // extra links fired alongside the primary
  delay?: number; // seconds after the player enters (or run start, if auto) before firing
  repeat?: boolean; // re-fire every time the player enters (default: fire once)
  auto?: boolean; // fire automatically on a timer (delay from run start), no touch needed
  pushX?: number; // force zone: horizontal px/frame applied to the player while inside (conveyor)
  pushY?: number; // force zone: vertical px/frame applied to the player while inside (wind/updraft)
}

export interface GameConfig {
  playerSpeed: number;
  jumpForce: number;
  gravity: number;
  doorBaseSpeed: number;
  doorAccelSpeed: number;
  doorHoming: number;
  doorMode?: 'fake' | 'win'; // fake = troll door that runs away & kills; win = safe goal (reach = next run). undefined = legacy auto
  triggerDistance: number;
  skipButtonDelay: number;
  spikes: number[];
  playerSpawnX: number;
  doorSpawnX: number;
  objects: LevelObject[];
  triggers: TriggerZone[];
  bgColor?: string; // scene backdrop color (hex)
  groundColor?: string; // floor/ground band color (hex)
  groundOffset?: number; // visual px to nudge hero + objects down toward the ground (0 = none)
  title?: string; // headline shown above the level (default "REACH THE DOOR")
  installText?: string; // install/CTA button label (default "Install Now")
  ctaHeadline?: string; // endcard headline (default "YOU DIED... AGAIN?")
  ctaText?: string; // endcard sub-text
  ctaButton?: string; // endcard button label (default "PLAY NOW")
  triggerLayers?: TriggerLayer[]; // editor-only: named layers to color/hide groups of triggers
  sound?: SoundConfig; // per-event sound assignments + music/volume (applied in the built playable)
}

// Each field is a packed sound key (filename without extension), '' = silent for that event.
export interface SoundConfig {
  muted?: boolean;
  volume?: number; // 0..1 master volume
  music?: string;  // looping background music key
  jump?: string;
  death?: string;
  win?: string;
  click?: string;
  land?: string;
  spring?: string;
  trap?: string;   // activate / deactivate / toggle
}

export interface TriggerLayer {
  name: string;
  color: string; // hex color for this layer's triggers + connectors in the editor
  hidden?: boolean; // hide this layer's triggers + links in the editor canvas
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
  | 'text'
  | 'trigger'
  | 'erase';
export type ActiveRun = number;

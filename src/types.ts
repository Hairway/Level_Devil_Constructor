export type TrapObjectType = 'spike' | 'saw' | 'pit' | 'fallingBlock' | 'crusher' | 'laser';
export type TriggerAction = 'activate' | 'openPit' | 'startDoorChase';

export interface LevelObject {
  id: string;
  type: TrapObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  initiallyActive: boolean;
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
export type EditorTool = 'select' | 'spike' | 'saw' | 'pit' | 'fallingBlock' | 'crusher' | 'laser' | 'trigger' | 'erase';
export type ActiveRun = number;

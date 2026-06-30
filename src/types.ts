export interface GameConfig {
  playerSpeed: number;
  jumpForce: number;
  gravity: number;
  doorBaseSpeed: number;
  doorAccelSpeed: number;
  triggerDistance: number;
  skipButtonDelay: number;
  spikes: number[];
  playerSpawnX: number;
  doorSpawnX: number;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
}

export type EditorTool = 'view' | 'spike' | 'erase';
export type ActiveRun = 1 | 2 | 3;

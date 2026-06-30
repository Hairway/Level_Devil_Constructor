import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as PIXI from 'pixi.js';
import { ActiveRun, EditorMode, EditorTool, GameConfig, LevelObject, TrapObjectType, TriggerZone } from '../types';
import * as A from '../assets';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.leveldevil';

const VIEW_W = 800;
const VIEW_H = 328;
const GROUND_Y = 280;
const BAND_TOP = 0;
const PLAYER_H = 36;
const PLAYER_SCALE = PLAYER_H / 16;
const DOOR_W = 40;
const DOOR_H = 56;
const DOOR_CY = -DOOR_H / 2;

const COL_BG = 0xc77b00;
const COL_BAND = 0xe2a33c;
const COL_BAND_HI = 0xeab451;
const COL_INK = 0x231708;
const COL_TRIGGER = 0x38bdf8;
const COL_CONNECTOR = 0xfbbf24;

type DeathCause = 'SAW' | 'SPIKE' | 'PIT' | 'CRUSH' | 'LASER' | 'REDIRECT';
type ObjectRuntime = { x: number; y: number; vy: number };

const objectPresets: Record<TrapObjectType, { width: number; height: number; y: number; initiallyActive: boolean; label: string }> = {
  spike: { width: 30, height: 22, y: GROUND_Y + 1, initiallyActive: true, label: 'Spike' },
  saw: { width: 36, height: 36, y: GROUND_Y - 36, initiallyActive: false, label: 'Saw' },
  pit: { width: 90, height: 42, y: GROUND_Y + 1, initiallyActive: false, label: 'Opening Pit' },
  fallingBlock: { width: 54, height: 44, y: 84, initiallyActive: false, label: 'Falling Block' },
  crusher: { width: 58, height: 96, y: 160, initiallyActive: false, label: 'Crusher' },
  laser: { width: 130, height: 14, y: 212, initiallyActive: false, label: 'Laser Beam' },
};

const isTrapTool = (tool: EditorTool): tool is TrapObjectType => tool in objectPresets;

const objectLocalRect = (object: LevelObject) => {
  if (object.type === 'spike' || object.type === 'pit') {
    return { x: -object.width / 2, y: -object.height, w: object.width, h: object.height };
  }
  return { x: -object.width / 2, y: -object.height / 2, w: object.width, h: object.height };
};

const cloneConfig = (config: GameConfig): GameConfig => ({
  ...config,
  spikes: [...config.spikes],
  objects: config.objects.map((object) => ({ ...object })),
  triggers: config.triggers.map((trigger) => ({ ...trigger })),
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const rectsOverlap = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export default function LevelDevilGame({
  config,
  activeRun,
  editorMode,
  currentTool,
  orientation,
  selectedEntityId,
  showTriggers,
  showConnectors,
  onConfigChange,
  onSelectEntity,
  onLogEvent,
  onRunComplete,
  onDeath,
}: LevelDevilGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const redrawRef = useRef<() => void>(() => {});
  const resetRef = useRef<() => void>(() => {});
  const triggerDeathRef = useRef<((cause: DeathCause) => void) | null>(null);
  const drawFloorRef = useRef<(collapsed: boolean) => void>(() => {});

  const [isMuted, setIsMuted] = useState(false);
  const [isSkipVisible, setIsSkipVisible] = useState(false);
  const [isCtaVisible, setIsCtaVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showHand, setShowHand] = useState(true);

  const stateRef = useRef({
    config: cloneConfig(config),
    activeRun,
    editorMode,
    currentTool,
    selectedEntityId,
    showTriggers,
    showConnectors,
    keys: {} as Record<string, boolean>,
    playerVelY: 0,
    playerVelX: 0,
    isGrounded: false,
    isDead: false,
    isDyingAnim: false,
    spawnFrames: 0,
    animTimer: 0,
    facing: 1,
    doorTriggered: false,
    doorTimer: 0,
    doorCurrentSpeed: config.doorBaseSpeed,
    doorVelX: 0,
    doorVelY: 0,
    floorCollapsed: false,
    skipButtonActive: false,
    skipClicked: false,
    endcardActive: false,
    splashActive: true,
    playerMoved: false,
    activeObjectIds: new Set<string>(),
    firedTriggerIds: new Set<string>(),
    objectRuntime: new Map<string, ObjectRuntime>(),
  });

  useEffect(() => {
    stateRef.current.config = cloneConfig(config);
    redrawRef.current();
  }, [config]);

  useEffect(() => {
    stateRef.current.activeRun = activeRun;
    resetRef.current();
  }, [activeRun]);

  useEffect(() => {
    stateRef.current.editorMode = editorMode;
    redrawRef.current();
  }, [editorMode]);

  useEffect(() => {
    stateRef.current.currentTool = currentTool;
  }, [currentTool]);

  useEffect(() => {
    stateRef.current.selectedEntityId = selectedEntityId;
    redrawRef.current();
  }, [selectedEntityId]);

  useEffect(() => {
    stateRef.current.showTriggers = showTriggers;
    stateRef.current.showConnectors = showConnectors;
    redrawRef.current();
  }, [showTriggers, showConnectors]);

  useEffect(() => {
    stateRef.current.splashActive = true;
    setShowSplash(true);
    const t = setTimeout(() => {
      stateRef.current.splashActive = false;
      setShowSplash(false);
      onLogEvent('SCENE', `[Run ${stateRef.current.activeRun}] Start screen`);
    }, 900);
    return () => clearTimeout(t);
  }, [activeRun, onLogEvent]);

  const activeTitle = activeRun === 3 ? 'TRY NEW DOOR' : 'REACH THE DOOR';

  const LevelIndicators = () => (
    <div style={{ display: 'flex', gap: '7px', justifyContent: 'center', marginBottom: '20px' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '19px',
            height: '19px',
            backgroundColor: i < activeRun ? '#231708' : 'transparent',
            border: '4px solid #231708',
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );

  const GameTitle = () => (
    <h2
      style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '20px',
        fontWeight: 'normal',
        color: '#231708',
        textAlign: 'center',
        letterSpacing: 0,
        textTransform: 'uppercase',
        margin: 0,
      }}
    >
      {activeTitle}
    </h2>
  );

  const SoundButton = ({ style }: { style?: CSSProperties }) => (
    <button
      onClick={() => {
        const next = !isMuted;
        setIsMuted(next);
        onLogEvent('SOUND_TOGGLE', `[Sound] Mute toggled: ${next ? 'MUTED' : 'UNMUTED'}`);
      }}
      style={{
        width: 43,
        height: 43,
        backgroundColor: '#bf790f',
        border: 'none',
        borderRadius: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff36b',
        cursor: 'pointer',
        boxSizing: 'border-box',
        padding: 0,
        boxShadow: 'inset 0 -6px 0 rgba(82,47,0,0.22)',
        ...style,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff36b" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" style={{ width: '68%', height: '68%', imageRendering: 'pixelated' }}>
        <polygon points="9 7 5 11 2 11 2 13 5 13 9 17 9 7" fill="#fff36b" />
        {!isMuted && (
          <>
            <path d="M14 8 a 5 5 0 0 1 0 8" />
            <path d="M18 5 a 10 10 0 0 1 0 14" />
          </>
        )}
        {isMuted && (
          <>
            <line x1="21" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="21" y2="15" />
          </>
        )}
      </svg>
    </button>
  );

  const InstallButton = ({ style }: { style?: CSSProperties }) => (
    <button
      onClick={() => goToStore('install_now')}
      style={{
        height: 42,
        padding: '0 20px',
        backgroundColor: '#ffc164',
        color: '#231708',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '13px',
        fontWeight: 'normal',
        border: 'none',
        borderRadius: 0,
        cursor: 'pointer',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 -6px 0 #b37111',
        lineHeight: 1,
        ...style,
      }}
    >
      Install Now
    </button>
  );

  const goToStore = (src: string) => {
    onLogEvent('CTA_CLICK', `[CTA] Store redirect via ${src}`);
    try { (window as any).mraid?.open?.(STORE_URL); } catch { /* noop */ }
    window.open(STORE_URL, '_blank');
  };

  const firstMove = () => {
    if (showHand) setShowHand(false);
    stateRef.current.playerMoved = true;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let alive = true;
    let dragging:
      | { kind: 'object'; id: string; dx: number; dy: number; display: PIXI.DisplayObject }
      | { kind: 'trigger'; id: string; dx: number; dy: number; display: PIXI.DisplayObject }
      | { kind: 'player'; dx: number; display: PIXI.DisplayObject }
      | { kind: 'door'; dx: number; display: PIXI.DisplayObject }
      | null = null;

    const app = new PIXI.Application({
      width: VIEW_W,
      height: VIEW_H,
      backgroundColor: COL_BG,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });
    appRef.current = app;
    const view = app.view as HTMLCanvasElement;
    view.style.width = '100%';
    view.style.height = '100%';
    view.style.display = 'block';
    containerRef.current.appendChild(view);

    const tex = (src: string) => {
      const t = PIXI.Texture.from(src);
      t.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      return t;
    };
    const heroTex = {
      idle: tex(A.heroIdle),
      run: [tex(A.heroRun1), tex(A.heroRun2), tex(A.heroRun3), tex(A.heroRun4)],
      jump: tex(A.heroJump),
    };
    const texDoorSafe = tex(A.doorSafe);
    const texDoorKiller = tex(A.doorKiller);
    const texSpike = tex(A.spike);
    const texSaw = tex(A.sawblade);

    const world = new PIXI.Container();
    const floorGraphics = new PIXI.Graphics();
    const connectorsLayer = new PIXI.Graphics();
    const objectsLayer = new PIXI.Container();
    const triggersLayer = new PIXI.Container();
    const doorContainer = new PIXI.Container();
    const player = new PIXI.Sprite(heroTex.idle);
    const doorSprite = new PIXI.Sprite(texDoorSafe);
    const doorEdge = new PIXI.Container();

    app.stage.addChild(world);
    world.addChild(floorGraphics, connectorsLayer, objectsLayer, triggersLayer, doorContainer, player);
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    player.anchor.set(0.5, 1);
    player.tint = COL_INK;
    doorSprite.anchor.set(0.5, 1);
    doorSprite.scale.set(DOOR_W / 16, DOOR_H / 16);
    doorContainer.addChild(doorSprite, doorEdge);

    const buildEdgeSpikes = () => {
      doorEdge.removeChildren();
      const mk = (x: number, y: number, rot: number) => {
        const s = new PIXI.Sprite(texSpike);
        s.anchor.set(0.5, 1);
        s.tint = 0x8a1f10;
        s.scale.set(14 / 16, 12 / 16);
        s.x = x;
        s.y = y;
        s.rotation = rot;
        doorEdge.addChild(s);
      };
      const hw = DOOR_W / 2;
      for (const x of [-13, 0, 13]) {
        mk(x, -DOOR_H, 0);
        mk(x, 0, Math.PI);
      }
      for (const y of [-14, -42]) {
        mk(-hw, y, -Math.PI / 2);
        mk(hw, y, Math.PI / 2);
      }
    };
    buildEdgeSpikes();

    const setDoorArmed = (armed: boolean) => {
      doorSprite.texture = armed ? texDoorKiller : texDoorSafe;
      doorSprite.tint = 0xffffff;
      if (armed) doorSprite.scale.set(DOOR_W / 20, DOOR_H / 23);
      else doorSprite.scale.set(DOOR_W / 16, DOOR_H / 16);
      doorEdge.visible = armed;
    };

    const setPlayerTexture = (t: PIXI.Texture) => {
      if (player.texture !== t) player.texture = t;
    };

    const drawFloor = (collapsed: boolean) => {
      floorGraphics.clear();
      floorGraphics.beginFill(COL_BAND);
      floorGraphics.drawRect(0, BAND_TOP, VIEW_W, GROUND_Y - BAND_TOP + 8);
      floorGraphics.endFill();
      floorGraphics.beginFill(COL_BAND_HI, 0.7);
      floorGraphics.drawRect(0, BAND_TOP, VIEW_W, 5);
      floorGraphics.endFill();
      floorGraphics.beginFill(0x000000, 0.12);
      floorGraphics.drawRect(0, GROUND_Y + 8, VIEW_W, VIEW_H - GROUND_Y - 8);
      floorGraphics.endFill();

      const activePits = stateRef.current.config.objects.filter(
        (object) => object.type === 'pit' && stateRef.current.activeObjectIds.has(object.id),
      );
      activePits.forEach((pit) => {
        floorGraphics.beginFill(COL_BG);
        floorGraphics.drawRect(pit.x - pit.width / 2, GROUND_Y - 2, pit.width, VIEW_H - GROUND_Y + 16);
        floorGraphics.endFill();
      });

      if (collapsed) {
        floorGraphics.beginFill(COL_BG);
        floorGraphics.drawRect(90, GROUND_Y - 2, VIEW_W - 180, VIEW_H - GROUND_Y + 16);
        floorGraphics.endFill();
      }
    };
    drawFloorRef.current = drawFloor;

    const makeObjectSprite = (object: LevelObject) => {
      let display: PIXI.DisplayObject;
      const active = stateRef.current.activeObjectIds.has(object.id);
      if (object.type === 'spike') {
        const sprite = new PIXI.Sprite(texSpike);
        sprite.anchor.set(0.5, 1);
        sprite.tint = COL_INK;
        sprite.scale.set(object.width / 16, object.height / 16);
        display = sprite;
      } else if (object.type === 'saw') {
        const sprite = new PIXI.Sprite(texSaw);
        sprite.anchor.set(0.5);
        sprite.tint = active ? 0xffffff : 0x6b4a21;
        sprite.scale.set(object.width / 16, object.height / 16);
        display = sprite;
      } else if (object.type === 'pit') {
        const g = new PIXI.Graphics();
        g.beginFill(active ? 0x161616 : 0x6b4a21, active ? 0.9 : 0.45);
        g.drawRect(-object.width / 2, -object.height, object.width, object.height);
        g.endFill();
        display = g;
      } else if (object.type === 'fallingBlock') {
        const g = new PIXI.Graphics();
        g.beginFill(0x5b3410, active ? 1 : 0.42);
        g.lineStyle(3, COL_INK, active ? 0.85 : 0.35);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
        g.endFill();
        g.beginFill(COL_INK, active ? 0.55 : 0.2);
        g.drawRect(-object.width / 2 + 8, -object.height / 2 + 8, object.width - 16, 6);
        g.endFill();
        display = g;
      } else if (object.type === 'crusher') {
        const g = new PIXI.Graphics();
        g.beginFill(0x3b2611, active ? 1 : 0.45);
        g.lineStyle(3, 0x8a1f10, active ? 0.9 : 0.35);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
        g.endFill();
        g.beginFill(0x8a1f10, active ? 1 : 0.35);
        for (let x = -object.width / 2; x < object.width / 2; x += object.width / 4) {
          g.drawPolygon([x, object.height / 2, x + object.width / 8, object.height / 2 + 13, x + object.width / 4, object.height / 2]);
        }
        g.endFill();
        display = g;
      } else {
        const g = new PIXI.Graphics();
        g.beginFill(0xfef08a, active ? 0.95 : 0.25);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
        g.endFill();
        g.lineStyle(3, 0xef4444, active ? 0.85 : 0.25);
        g.moveTo(-object.width / 2, 0);
        g.lineTo(object.width / 2, 0);
        display = g;
      }
      const runtime = stateRef.current.editorMode === 'play' ? stateRef.current.objectRuntime.get(object.id) : undefined;
      display.x = runtime?.x ?? object.x;
      display.y = runtime?.y ?? object.y;
      return display;
    };

    const drawConnectors = () => {
      connectorsLayer.clear();
      const s = stateRef.current;
      if (s.editorMode !== 'constructor' || !s.showConnectors) return;

      s.config.triggers.forEach((trigger) => {
        const target = s.config.objects.find((object) => object.id === trigger.targetId);
        const tx = trigger.x + trigger.width / 2;
        const ty = trigger.y + trigger.height / 2;
        const ox = target ? target.x : s.config.doorSpawnX;
        const oy = target ? target.y - target.height / 2 : GROUND_Y - DOOR_H / 2;
        const selected = s.selectedEntityId === trigger.id || s.selectedEntityId === trigger.targetId;
        connectorsLayer.lineStyle(selected ? 4 : 2, selected ? 0xffffff : COL_CONNECTOR, selected ? 1 : 0.8);
        connectorsLayer.moveTo(tx, ty);
        connectorsLayer.lineTo(ox, oy);
        connectorsLayer.beginFill(selected ? 0xffffff : COL_CONNECTOR, 1);
        connectorsLayer.drawCircle(ox, oy, selected ? 6 : 4);
        connectorsLayer.endFill();
      });
    };

    const drawTriggers = () => {
      triggersLayer.removeChildren();
      const s = stateRef.current;
      if (s.editorMode !== 'constructor' || !s.showTriggers) return;

      s.config.triggers.forEach((trigger) => {
        const box = new PIXI.Container();
        const g = new PIXI.Graphics();
        const selected = s.selectedEntityId === trigger.id;
        const target = s.config.objects.find((object) => object.id === trigger.targetId);
        g.beginFill(COL_TRIGGER, selected ? 0.28 : 0.16);
        g.lineStyle(selected ? 4 : 2, selected ? 0xffffff : COL_TRIGGER, 0.9);
        g.drawRect(0, 0, trigger.width, trigger.height);
        g.endFill();
        box.addChild(g);

        const label = new PIXI.Text(`${trigger.label}\n-> ${target?.label || trigger.targetId}`, {
          fill: selected ? 0xffffff : 0xdff7ff,
          fontSize: 10,
          fontFamily: 'monospace',
          lineHeight: 11,
          stroke: 0x063344,
          strokeThickness: 2,
        });
        label.x = 4;
        label.y = 4;
        label.resolution = 2;
        box.addChild(label);

        box.x = trigger.x;
        box.y = trigger.y;
        box.eventMode = 'static';
        box.cursor = 'move';
        box.on('pointerdown', (e: any) => {
          if (stateRef.current.editorMode !== 'constructor') return;
          const p = e.data.getLocalPosition(world);
          dragging = { kind: 'trigger', id: trigger.id, dx: p.x - trigger.x, dy: p.y - trigger.y, display: box };
          onSelectEntity(trigger.id);
        });
        triggersLayer.addChild(box);
      });
    };

    const drawObjects = () => {
      objectsLayer.removeChildren();
      const s = stateRef.current;

      s.config.objects.forEach((object) => {
        const display = makeObjectSprite(object);
        const selected = s.selectedEntityId === object.id;
        if ('alpha' in display) display.alpha = stateRef.current.activeObjectIds.has(object.id) || object.type === 'spike' ? 1 : 0.6;

        if (s.editorMode === 'constructor') {
          display.eventMode = 'static';
          display.cursor = 'move';
          display.on('pointerdown', (e: any) => {
            const p = e.data.getLocalPosition(world);
            dragging = { kind: 'object', id: object.id, dx: p.x - object.x, dy: p.y - object.y, display };
            onSelectEntity(object.id);
          });

          const outline = new PIXI.Graphics();
          const rect = objectLocalRect(object);
          outline.lineStyle(selected ? 4 : 2, selected ? 0xffffff : 0x000000, selected ? 0.9 : 0.35);
          outline.drawRect(rect.x, rect.y, rect.w, rect.h);
          outline.x = object.x;
          outline.y = object.y;
          objectsLayer.addChild(outline);
        }

        objectsLayer.addChild(display);
      });
    };

    const objectWorldRect = (object: LevelObject) => {
      const runtime = stateRef.current.objectRuntime.get(object.id);
      const rect = objectLocalRect(object);
      const x = runtime?.x ?? object.x;
      const y = runtime?.y ?? object.y;
      return { x: x + rect.x, y: y + rect.y, w: rect.w, h: rect.h };
    };

    const redrawHazards = () => {
      const s = stateRef.current;
      drawFloor(s.floorCollapsed);
      drawObjects();
      drawTriggers();
      drawConnectors();
    };

    const drawScene = () => {
      if (!alive) return;
      const s = stateRef.current;
      const activeIds = new Set<string>();
      s.config.objects.forEach((object) => {
        if (object.initiallyActive) activeIds.add(object.id);
      });
      s.activeObjectIds.forEach((id) => activeIds.add(id));
      s.activeObjectIds = activeIds;

      drawFloor(s.floorCollapsed);
      drawObjects();
      drawTriggers();
      drawConnectors();

      player.x = s.config.playerSpawnX;
      player.y = GROUND_Y;
      player.alpha = 1;
      setPlayerTexture(heroTex.idle);
      player.scale.set(PLAYER_SCALE, PLAYER_SCALE);

      doorContainer.x = s.config.doorSpawnX;
      doorContainer.y = GROUND_Y;
      setDoorArmed(s.activeRun === 2 || s.activeRun === 3 || s.doorTriggered);

      if (s.editorMode === 'constructor') {
        player.eventMode = 'static';
        player.cursor = 'move';
        doorContainer.eventMode = 'static';
        doorContainer.cursor = 'move';
      } else {
        player.eventMode = 'none';
        doorContainer.eventMode = 'none';
      }
    };
    redrawRef.current = drawScene;

    const doReset = () => {
      const s = stateRef.current;
      s.isDead = false;
      s.isDyingAnim = false;
      s.doorTriggered = s.activeRun === 3;
      s.doorTimer = 0;
      s.doorCurrentSpeed = s.config.doorBaseSpeed;
      s.doorVelX = 0;
      s.doorVelY = 0;
      s.floorCollapsed = false;
      s.skipClicked = false;
      s.skipButtonActive = false;
      s.endcardActive = false;
      s.playerVelY = 0;
      s.playerVelX = 0;
      s.isGrounded = false;
      s.playerMoved = false;
      s.spawnFrames = 10;
      s.activeObjectIds = new Set(s.config.objects.filter((object) => object.initiallyActive).map((object) => object.id));
      s.firedTriggerIds = new Set();
      s.objectRuntime = new Map(s.config.objects.map((object) => [object.id, { x: object.x, y: object.y, vy: 0 }]));
      setIsSkipVisible(false);
      setIsCtaVisible(false);
      drawScene();
      onLogEvent('INFO', `[Game] Reset - Run ${s.activeRun}`);
    };
    resetRef.current = doReset;

    const triggerDeath = (cause: DeathCause) => {
      const s = stateRef.current;
      if (s.isDead) return;
      s.isDead = true;
      s.isDyingAnim = true;
      onDeath();

      if (cause === 'REDIRECT') {
        s.endcardActive = true;
        onLogEvent('CTA_TRIGGER', '[Scene Endcard] CTA screen triggered');
        setIsCtaVisible(true);
        return;
      }

      onLogEvent('DEATH', `[Death] Player killed by ${cause} (Run ${s.activeRun})`);
      setPlayerTexture(heroTex.idle);
      player.scale.set(s.facing * PLAYER_SCALE, 0.4 * PLAYER_SCALE);

      let shake = 0;
      const shakeTimer = setInterval(() => {
        world.x = (Math.random() - 0.5) * 12;
        world.y = (Math.random() - 0.5) * 12;
        if (++shake > 12) {
          clearInterval(shakeTimer);
          world.x = 0;
          world.y = 0;
        }
      }, 25);

      setTimeout(() => {
        s.isDyingAnim = false;
        const resolvedSkipTrap = s.activeRun === 2 && s.skipClicked && cause === 'PIT';
        const resolvedDoorTrap = (s.activeRun === 1 || s.activeRun === 2) && cause === 'SAW' && s.doorTriggered;

        if (s.activeRun === 1 && resolvedDoorTrap) onRunComplete(2);
        else if (s.activeRun === 2 && (resolvedSkipTrap || resolvedDoorTrap)) onRunComplete(3);
        else doReset();
      }, 900);
    };
    triggerDeathRef.current = triggerDeath;

    const activateTrigger = (trigger: TriggerZone) => {
      const s = stateRef.current;
      if (s.firedTriggerIds.has(trigger.id)) return;
      s.firedTriggerIds.add(trigger.id);

      if (trigger.action === 'startDoorChase') {
        s.doorTriggered = true;
        setDoorArmed(true);
        onLogEvent('TRAP_ACTIVATE', `[Trigger] ${trigger.label} started door chase`);
      } else {
        s.activeObjectIds.add(trigger.targetId);
        const target = s.config.objects.find((object) => object.id === trigger.targetId);
        if (target && !s.objectRuntime.has(target.id)) {
          s.objectRuntime.set(target.id, { x: target.x, y: target.y, vy: 0 });
        }
        onLogEvent('TRAP_ACTIVATE', `[Trigger] ${trigger.label} activated ${target?.label || trigger.targetId}`);
      }
      redrawHazards();
    };

    floorGraphics.eventMode = 'static';
    floorGraphics.cursor = 'crosshair';
    floorGraphics.on('pointerdown', (e: any) => {
      const s = stateRef.current;
      if (s.editorMode !== 'constructor') return;
      const local = e.data.getLocalPosition(world);
      const x = Math.round(clamp(local.x, 20, VIEW_W - 20));

      if (s.currentTool === 'select') {
        onSelectEntity(null);
        return;
      }

      if (s.currentTool === 'erase') {
        const nearestObject = s.config.objects.find((object) => Math.abs(object.x - x) < 28 && Math.abs(object.y - local.y) < 50);
        const nearestTrigger = s.config.triggers.find((trigger) =>
          local.x >= trigger.x && local.x <= trigger.x + trigger.width && local.y >= trigger.y && local.y <= trigger.y + trigger.height,
        );
        if (nearestObject) {
          const next = cloneConfig(s.config);
          next.objects = next.objects.filter((object) => object.id !== nearestObject.id);
          next.triggers = next.triggers.filter((trigger) => trigger.targetId !== nearestObject.id);
          onConfigChange(next);
          onLogEvent('OBJECT_DELETE', `Deleted ${nearestObject.label}`);
        } else if (nearestTrigger) {
          const next = cloneConfig(s.config);
          next.triggers = next.triggers.filter((trigger) => trigger.id !== nearestTrigger.id);
          onConfigChange(next);
          onLogEvent('TRIGGER_DELETE', `Deleted ${nearestTrigger.label}`);
        }
        return;
      }

      const next = cloneConfig(s.config);
      const id = `${s.currentTool}-${Date.now().toString(36)}`;
      if (s.currentTool === 'trigger') {
        const target = next.objects[0];
        next.triggers.push({
          id,
          x: x - 35,
          y: GROUND_Y - 110,
          width: 70,
          height: 110,
          targetId: target?.id || 'door',
          action: target?.type === 'pit' ? 'openPit' : 'activate',
          label: `Trigger ${next.triggers.length + 1}`,
        });
      } else {
        if (!isTrapTool(s.currentTool)) return;
        const type = s.currentTool;
        const preset = objectPresets[type];
        next.objects.push({
          id,
          type,
          x,
          y: preset.y,
          width: preset.width,
          height: preset.height,
          label: `${preset.label} ${next.objects.length + 1}`,
          initiallyActive: preset.initiallyActive,
        });
      }
      onConfigChange(next);
      onSelectEntity(id);
      onLogEvent('OBJECT_ADD', `Placed ${s.currentTool} at X:${x}`);
    });

    player.on('pointerdown', (e: any) => {
      if (stateRef.current.editorMode !== 'constructor') return;
      const p = e.data.getLocalPosition(world);
      dragging = { kind: 'player', dx: p.x - stateRef.current.config.playerSpawnX, display: player };
      onSelectEntity('playerSpawn');
    });

    doorContainer.on('pointerdown', (e: any) => {
      if (stateRef.current.editorMode !== 'constructor') return;
      const p = e.data.getLocalPosition(world);
      dragging = { kind: 'door', dx: p.x - stateRef.current.config.doorSpawnX, display: doorContainer };
      onSelectEntity('door');
    });

    app.stage.on('pointermove', (e: any) => {
      if (!dragging) return;
      const p = e.data.getLocalPosition(world);
      if (dragging.kind === 'object') {
        dragging.display.x = clamp(p.x - dragging.dx, 20, VIEW_W - 20);
        dragging.display.y = clamp(p.y - dragging.dy, BAND_TOP + 24, GROUND_Y + 1);
      } else if (dragging.kind === 'trigger') {
        dragging.display.x = clamp(p.x - dragging.dx, 0, VIEW_W - 20);
        dragging.display.y = clamp(p.y - dragging.dy, BAND_TOP, GROUND_Y - 20);
      } else if (dragging.kind === 'player') {
        dragging.display.x = clamp(p.x - dragging.dx, 40, VIEW_W - 40);
      } else if (dragging.kind === 'door') {
        dragging.display.x = clamp(p.x - dragging.dx, 80, VIEW_W - 40);
      }
    });

    const finishDrag = () => {
      if (!dragging) return;
      const next = cloneConfig(stateRef.current.config);
      if (dragging.kind === 'object') {
        const drag = dragging;
        next.objects = next.objects.map((object) =>
          object.id === drag.id ? { ...object, x: Math.round(drag.display.x), y: Math.round(drag.display.y) } : object,
        );
      } else if (dragging.kind === 'trigger') {
        const drag = dragging;
        next.triggers = next.triggers.map((trigger) =>
          trigger.id === drag.id ? { ...trigger, x: Math.round(drag.display.x), y: Math.round(drag.display.y) } : trigger,
        );
      } else if (dragging.kind === 'player') {
        next.playerSpawnX = Math.round(dragging.display.x);
      } else if (dragging.kind === 'door') {
        next.doorSpawnX = Math.round(dragging.display.x);
      }
      dragging = null;
      onConfigChange(next);
    };
    app.stage.on('pointerup', finishDrag);
    app.stage.on('pointerupoutside', finishDrag);

    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      const move = ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'ArrowUp', 'KeyW'].includes(e.code);
      if (move) firstMove();
      if (move && stateRef.current.activeRun === 3 && !stateRef.current.endcardActive && !stateRef.current.isDead && !stateRef.current.splashActive) {
        triggerDeath('REDIRECT');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      delete stateRef.current.keys[e.code];
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const ticker = (tickerObj: any) => {
      const delta = typeof tickerObj === 'number' ? tickerObj : (tickerObj?.deltaTime ?? 1);
      const s = stateRef.current;

      doorContainer.rotation = doorEdge.visible ? Math.sin(Date.now() / 90) * 0.04 : 0;

      if (s.editorMode === 'constructor') {
        return;
      }

      if (s.splashActive || s.isDead || s.isDyingAnim) return;
      if (player.y > VIEW_H + 40) {
        triggerDeath('PIT');
        return;
      }

      s.playerVelX = 0;
      if (s.keys['ArrowLeft'] || s.keys['KeyA']) s.playerVelX = -s.config.playerSpeed;
      if (s.keys['ArrowRight'] || s.keys['KeyD']) s.playerVelX = s.config.playerSpeed;
      if ((s.keys['Space'] || s.keys['ArrowUp'] || s.keys['KeyW']) && s.isGrounded) {
        s.playerVelY = -s.config.jumpForce;
        s.isGrounded = false;
      }

      s.playerVelY += s.config.gravity * delta;
      player.x += s.playerVelX * delta;
      player.y += s.playerVelY * delta;
      player.x = clamp(player.x, 50, VIEW_W - 50);

      if (player.y - PLAYER_H < BAND_TOP) {
        player.y = BAND_TOP + PLAYER_H;
        if (s.playerVelY < 0) s.playerVelY = 0;
      }

      const inOpenPit = s.config.objects.some(
        (object) =>
          object.type === 'pit' &&
          s.activeObjectIds.has(object.id) &&
          player.x > object.x - object.width / 2 &&
          player.x < object.x + object.width / 2 &&
          player.y >= GROUND_Y - 4,
      );

      if (player.y >= GROUND_Y) {
        if (!s.floorCollapsed && !inOpenPit) {
          player.y = GROUND_Y;
          s.playerVelY = 0;
          s.isGrounded = true;
        } else {
          s.isGrounded = false;
        }
      }

      if (s.playerVelX < 0) s.facing = -1;
      else if (s.playerVelX > 0) s.facing = 1;
      if (!s.isGrounded) setPlayerTexture(heroTex.jump);
      else if (s.playerVelX !== 0) {
        s.animTimer += delta;
        setPlayerTexture(heroTex.run[Math.floor(s.animTimer / 5) % 4]);
      } else {
        s.animTimer = 0;
        setPlayerTexture(heroTex.idle);
      }
      const pop = s.spawnFrames > 0 ? 0.4 + 0.6 * (1 - s.spawnFrames / 10) : 1;
      if (s.spawnFrames > 0) s.spawnFrames--;
      player.scale.set(s.facing * pop * PLAYER_SCALE, pop * PLAYER_SCALE);

      const playerRect = { x: player.x - 10, y: player.y - PLAYER_H, w: 20, h: PLAYER_H };

      s.config.triggers.forEach((trigger) => {
        if (
          rectsOverlap(playerRect.x, playerRect.y, playerRect.w, playerRect.h, trigger.x, trigger.y, trigger.width, trigger.height)
        ) {
          activateTrigger(trigger);
        }
      });

      let hazardsMoved = false;
      for (const object of s.config.objects) {
        if (object.type !== 'fallingBlock' || !s.activeObjectIds.has(object.id)) continue;
        const runtime = s.objectRuntime.get(object.id) || { x: object.x, y: object.y, vy: 0 };
        runtime.vy = Math.min(runtime.vy + 0.62 * delta, 13);
        runtime.y = Math.min(runtime.y + runtime.vy * delta, GROUND_Y - object.height / 2 + 1);
        s.objectRuntime.set(object.id, runtime);
        hazardsMoved = true;
      }
      if (hazardsMoved) drawObjects();

      for (const object of s.config.objects) {
        const active = s.activeObjectIds.has(object.id) || object.initiallyActive;
        if (!active) continue;
        if (object.type === 'spike' && Math.abs(player.x - object.x) < object.width / 2 && player.y > GROUND_Y - 12) {
          triggerDeath('SPIKE');
          return;
        }
        if (
          object.type === 'saw' &&
          rectsOverlap(playerRect.x, playerRect.y, playerRect.w, playerRect.h, object.x - object.width / 2, object.y - object.height / 2, object.width, object.height)
        ) {
          triggerDeath('SAW');
          return;
        }
        if (
          (object.type === 'fallingBlock' || object.type === 'crusher') &&
          rectsOverlap(playerRect.x, playerRect.y, playerRect.w, playerRect.h, objectWorldRect(object).x, objectWorldRect(object).y, objectWorldRect(object).w, objectWorldRect(object).h)
        ) {
          triggerDeath('CRUSH');
          return;
        }
        if (
          object.type === 'laser' &&
          rectsOverlap(playerRect.x, playerRect.y, playerRect.w, playerRect.h, objectWorldRect(object).x, objectWorldRect(object).y, objectWorldRect(object).w, objectWorldRect(object).h)
        ) {
          triggerDeath('LASER');
          return;
        }
      }

      if (s.activeRun === 1 || s.activeRun === 2) {
        const hasDoorTrigger = s.config.triggers.some((trigger) => trigger.action === 'startDoorChase');
        if (s.activeRun === 1 && !hasDoorTrigger && !s.doorTriggered && doorContainer.x - player.x < s.config.triggerDistance) {
          s.doorTriggered = true;
          setDoorArmed(true);
          onLogEvent('TRAP_ACTIVATE', '[Trap] Door armed by proximity');
        }
        if (s.activeRun === 2 && !s.doorTriggered && s.playerMoved) {
          s.doorTriggered = true;
          setDoorArmed(true);
          onLogEvent('TRAP_ACTIVATE', '[Trap] Door starts hunting after first action');
        }
        if (s.doorTriggered) {
          s.doorTimer += (1 / 60) * delta;
          s.doorCurrentSpeed = Math.min(s.config.doorAccelSpeed + s.doorTimer * 1.5, s.config.doorAccelSpeed + 7);

          if (s.activeRun === 2 && s.doorTimer > s.config.skipButtonDelay && !s.skipClicked && !s.skipButtonActive) {
            s.skipButtonActive = true;
            setIsSkipVisible(true);
            onLogEvent('SKIP_SHOW', '[Trap] SKIP LEVEL button revealed');
          }

          const maxSp = s.doorCurrentSpeed;
          const accel = s.config.doorHoming;
          s.doorVelX += Math.sign(player.x - doorContainer.x) * accel * delta;
          s.doorVelY += Math.sign((player.y - 16) - (doorContainer.y + DOOR_CY)) * accel * delta;
          s.doorVelX = clamp(s.doorVelX, -maxSp, maxSp);
          s.doorVelY = clamp(s.doorVelY, -maxSp, maxSp);
          s.doorVelX *= 0.97;
          s.doorVelY *= 0.97;
          doorContainer.x += s.doorVelX * delta;
          doorContainer.y += s.doorVelY * delta;
          doorContainer.x = clamp(doorContainer.x, 40, VIEW_W - 40);
          doorContainer.y = clamp(doorContainer.y, BAND_TOP + 40, GROUND_Y);
          const ddx = doorContainer.x - player.x;
          const ddy = doorContainer.y + DOOR_CY - (player.y - 16);
          if (Math.hypot(ddx, ddy) < 30) {
            triggerDeath('SAW');
            return;
          }
        }
      }

      if (s.activeRun === 3 && !s.endcardActive) {
        const moving = !!(s.keys['ArrowLeft'] || s.keys['KeyA'] || s.keys['ArrowRight'] || s.keys['KeyD'] ||
          s.keys['Space'] || s.keys['ArrowUp'] || s.keys['KeyW']);
        if (moving) {
          triggerDeath('REDIRECT');
        }
      }
    };

    app.ticker.add(ticker);
    doReset();

    return () => {
      alive = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      app.ticker.remove(ticker);
      app.destroy(true, { children: true, texture: false });
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);

  const executeSkipAction = () => {
    const s = stateRef.current;
    if (!s.skipButtonActive || s.skipClicked) return;
    s.skipClicked = true;
    s.floorCollapsed = true;
    setIsSkipVisible(false);
    onLogEvent('SKIP_CLICK', '[Skip Clicked] Fake SKIP LEVEL - floor collapses');
    drawFloorRef.current(true);
  };

  const press = (key: string) => {
    stateRef.current.keys[key] = true;
    firstMove();
    if (stateRef.current.activeRun === 3 && !stateRef.current.endcardActive && !stateRef.current.splashActive) {
      triggerDeathRef.current?.('REDIRECT');
    }
  };
  const release = (key: string) => {
    delete stateRef.current.keys[key];
  };

  const ControlButton = ({ keyCode, hollow, filled, label, width }: {
    keyCode: string;
    hollow: string;
    filled: string;
    label: string;
    width: number | string;
  }) => (
    <img
      src={hollow}
      alt={label}
      draggable={false}
      onMouseDown={(e) => { press(keyCode); (e.currentTarget as HTMLImageElement).src = filled; }}
      onMouseUp={(e) => { release(keyCode); (e.currentTarget as HTMLImageElement).src = hollow; }}
      onMouseLeave={(e) => { release(keyCode); (e.currentTarget as HTMLImageElement).src = hollow; }}
      onTouchStart={(e) => { e.preventDefault(); press(keyCode); (e.currentTarget as HTMLImageElement).src = filled; }}
      onTouchEnd={(e) => { e.preventDefault(); release(keyCode); (e.currentTarget as HTMLImageElement).src = hollow; }}
      style={{ width, height: 'auto', imageRendering: 'pixelated', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
    />
  );

  const INK = '#231708';
  const overlayCenter: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const pix: CSSProperties = { imageRendering: 'pixelated' };
  const isPortrait = orientation === 'vertical';
  const stageButtonBase: CSSProperties = { position: 'absolute', zIndex: 20 };
  const levelViewportStyle: CSSProperties = {
    position: 'absolute',
    left: isPortrait ? '2.8%' : '23.4375%',
    top: isPortrait ? '39.0625%' : '30.56%',
    width: isPortrait ? '94.4%' : '53.125%',
    height: isPortrait ? '21.875%' : '38.89%',
    overflow: 'hidden',
    backgroundColor: '#e2a33c',
  };

  return (
    <div style={{ position: 'relative', userSelect: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <style>{`
        @keyframes ld-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes ld-fade { from{opacity:0} to{opacity:1} }
      `}</style>

      <div
        id="game-container"
        style={{
          position: 'relative',
          width: isPortrait ? '420px' : '920px',
          maxWidth: '100%',
          aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
          overflow: 'hidden',
          backgroundColor: '#c77b00',
        }}
      >
        <div style={{ ...stageButtonBase, left: isPortrait ? '33%' : '40.6%', top: isPortrait ? '9.7%' : '5%', width: isPortrait ? '34%' : '18.8%' }}>
          <LevelIndicators />
        </div>

        <div style={{ ...stageButtonBase, left: isPortrait ? '7.5%' : '30%', top: isPortrait ? '21.7%' : '16.4%', width: isPortrait ? '85%' : '40%' }}>
          <GameTitle />
        </div>

        <div style={levelViewportStyle}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        <div style={{ ...stageButtonBase, left: isPortrait ? '6.7%' : '3.75%', top: isPortrait ? '89.5%' : '6.4%', width: isPortrait ? '12%' : '6.7%', aspectRatio: '1 / 1' }}>
          <SoundButton style={{ width: '100%', height: '100%' }} />
        </div>

        <div style={{ ...stageButtonBase, left: isPortrait ? '57.8%' : '76.25%', top: isPortrait ? '89.5%' : '6.4%', width: isPortrait ? '35.6%' : '20%', height: isPortrait ? '6.1%' : '11.7%' }}>
          <InstallButton style={{ width: '100%', height: '100%', padding: 0, fontSize: 'clamp(8px, 1.55vw, 11px)', whiteSpace: 'nowrap' }} />
        </div>

        <div style={{ ...stageButtonBase, left: isPortrait ? '6.9%' : '5%', top: isPortrait ? '75.8%' : '83.3%', width: isPortrait ? '21.25%' : '12%' }}>
          <ControlButton keyCode="ArrowLeft" hollow={A.btnLeftHollow} filled={A.btnLeftFilled} label="Move left" width="100%" />
        </div>

        <div style={{ ...stageButtonBase, left: isPortrait ? '36.1%' : '21.25%', top: isPortrait ? '75.8%' : '83.3%', width: isPortrait ? '21.25%' : '12%' }}>
          <ControlButton keyCode="ArrowRight" hollow={A.btnRightHollow} filled={A.btnRightFilled} label="Move right" width="100%" />
        </div>

        <div style={{ ...stageButtonBase, left: isPortrait ? '71.5%' : '83.2%', top: isPortrait ? '75.8%' : '83.3%', width: isPortrait ? '21.25%' : '12%' }}>
          <ControlButton keyCode="Space" hollow={A.btnJumpHollow} filled={A.btnJumpFilled} label="Jump" width="100%" />
        </div>

        {showHand && !showSplash && editorMode === 'play' && (
          <div style={{ position: 'absolute', top: '63%', left: '28%', zIndex: 25, fontSize: 28, pointerEvents: 'none', animation: 'ld-bounce 1s infinite', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}>
            TAP
          </div>
        )}

        {isSkipVisible && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: '31%', display: 'flex', justifyContent: 'center', zIndex: 30, animation: 'ld-bounce 0.9s infinite' }}>
            <img src={A.btnSkip} alt="Skip level" onClick={executeSkipAction}
              style={{ ...pix, width: '18%', cursor: 'pointer', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }} />
          </div>
        )}

        {showSplash && editorMode === 'play' && (
          <div style={{ ...overlayCenter, background: 'radial-gradient(circle at 50% 42%, #d18a20, #8d4f0d)' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>LVL</div>
            <div style={{ fontSize: 26, fontFamily: '"Press Start 2P", monospace', fontWeight: 'normal', color: INK, textAlign: 'center', lineHeight: '36px' }}>LEVEL DEVIL</div>
            <div style={{ marginTop: 12, fontSize: 11, fontFamily: '"Press Start 2P", monospace', fontWeight: 'normal', letterSpacing: 0, color: 'rgba(35,23,8,0.7)' }}>{activeTitle}</div>
          </div>
        )}

        {editorMode === 'constructor' && (
          <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 35, color: '#231708', fontFamily: '"Press Start 2P", monospace', fontSize: 9, background: 'rgba(255,193,100,0.86)', padding: '8px 10px' }}>
            CONSTRUCTOR MODE
          </div>
        )}

        {isCtaVisible && (
          <div style={{ ...overlayCenter, background: 'rgba(0,0,0,0.9)', padding: 20, textAlign: 'center', cursor: 'pointer', animation: 'ld-fade 0.3s ease' }}
            onClick={() => goToStore('endcard_tap')}>
            <span style={{ color: '#ef4444', fontFamily: '"Press Start 2P", monospace', fontSize: '18px', lineHeight: '26px', marginBottom: 12, display: 'block', textTransform: 'uppercase' }}>YOU DIED... AGAIN?</span>
            <p style={{ color: '#d4d4d8', maxWidth: 300, fontSize: 12, marginBottom: 20, fontFamily: '"Press Start 2P", monospace', lineHeight: '18px' }}>
              LEVEL DEVIL IS BRUTAL. CAN YOU OUTSMART IT?
            </p>
            <button onClick={(e) => { e.stopPropagation(); goToStore('cta_button'); }}
              style={{ padding: '14px 20px', background: '#10b981', color: '#fff', fontFamily: '"Press Start 2P", monospace', fontSize: 12, border: 'none', borderBottom: '4px solid #047857', borderRadius: 4, width: '100%', maxWidth: 260, cursor: 'pointer' }}>
              PLAY NOW
            </button>
            <span style={{ color: '#71717a', fontSize: 9, marginTop: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Free Playable - Ad Endcard</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface LevelDevilGameProps {
  config: GameConfig;
  activeRun: ActiveRun;
  editorMode: EditorMode;
  currentTool: EditorTool;
  orientation: 'horizontal' | 'vertical';
  selectedEntityId: string | null;
  showTriggers: boolean;
  showConnectors: boolean;
  onConfigChange: (config: GameConfig) => void;
  onSelectEntity: (id: string | null) => void;
  onLogEvent: (type: string, msg: string) => void;
  onRunComplete: (nextRun: ActiveRun) => void;
  onDeath: () => void;
}

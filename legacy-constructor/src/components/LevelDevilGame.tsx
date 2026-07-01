import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as PIXI from 'pixi.js';
import { ActiveRun, EditorMode, EditorTool, GameConfig, LevelObject, ObjectActionKind, TrapObjectType, TriggerZone } from '../types';
import { DEFAULT_BG, DEFAULT_GROUND, effectiveRole, hexToNum, isLethal, lightenNum, objectCatalog, objectMotion, objectPreset } from '../objectModel';
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
// Per-object runtime: live position, fall velocity, distance travelled (linear), ping-pong sign,
// seconds since the object became active (drives motion delay + appearDelay), and floor-split progress.
type ObjectRuntime = { x: number; y: number; vy: number; traveled: number; pong: number; since: number; split: number; moving?: boolean; spinAngle?: number; lastX?: number; lastY?: number; orbit?: number };

const TRAP_TOOLS = new Set<TrapObjectType>(objectCatalog.map((item) => item.type));
const isTrapTool = (tool: EditorTool): tool is TrapObjectType => TRAP_TOOLS.has(tool as TrapObjectType);

// Objects anchored at their bottom edge (sit on the ground) vs centered.
const isBottomAnchored = (type: TrapObjectType) => type === 'spike' || type === 'pit';

const objectLocalRect = (object: LevelObject) => {
  if (isBottomAnchored(object.type)) {
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
  gridSnap,
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
  const runActionRef = useRef<(kind: ObjectActionKind, targetId: string, label: string) => void>(() => {});
  const loadedFontsRef = useRef<Set<string>>(new Set());

  // The PIXI setup effect runs once (deps [orientation]) and closes over these callbacks, so keep
  // the latest versions in a ref — otherwise edits always target the run active at mount (run 1).
  const cbRef = useRef({ onConfigChange, onSelectEntity, onLogEvent, onRunComplete, onDeath });
  cbRef.current = { onConfigChange, onSelectEntity, onLogEvent, onRunComplete, onDeath };

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
    gridSnap,
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
    hiddenObjectIds: new Set<string>(),
    firedTriggerIds: new Set<string>(),
    triggerTimers: new Map<string, number>(),
    motionRunIds: new Set<string>(),
    splitPitIds: new Set<string>(),
    objectRuntime: new Map<string, ObjectRuntime>(),
  });

  useEffect(() => {
    stateRef.current.config = cloneConfig(config);
    // While playing, a config swap (e.g. switching project/run) starts a fresh run so runtime
    // state (motion, timers, active set) is rebuilt; in the editor we just redraw.
    if (stateRef.current.editorMode === 'play') resetRef.current();
    else redrawRef.current();
  }, [config]);

  // Register any uploaded custom fonts (data URLs) and redraw once they load.
  useEffect(() => {
    const jobs: Promise<unknown>[] = [];
    for (const o of config.objects) {
      if (o.fontUrl && o.fontFamily && !loadedFontsRef.current.has(o.fontFamily)) {
        loadedFontsRef.current.add(o.fontFamily);
        try {
          const ff = new FontFace(o.fontFamily, `url(${o.fontUrl})`);
          (document as unknown as { fonts: FontFaceSet }).fonts.add(ff);
          jobs.push(ff.load().catch(() => {}));
        } catch { /* ignore bad font */ }
      }
    }
    if (jobs.length) Promise.all(jobs).then(() => redrawRef.current && redrawRef.current());
  }, [config]);

  useEffect(() => {
    stateRef.current.activeRun = activeRun;
    resetRef.current();
  }, [activeRun]);

  useEffect(() => {
    stateRef.current.editorMode = editorMode;
    // Entering Play always begins a clean run; entering the editor just redraws the scene.
    if (editorMode === 'play') resetRef.current();
    else redrawRef.current();
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
    stateRef.current.gridSnap = gridSnap;
  }, [gridSnap]);

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
    // Always call the latest props (this effect only runs once) so edits hit the active run.
    const onConfigChange = (c: GameConfig) => cbRef.current.onConfigChange(c);
    const onSelectEntity = (id: string | null) => cbRef.current.onSelectEntity(id);
    const onLogEvent = (t: string, m: string) => cbRef.current.onLogEvent(t, m);
    const onRunComplete = (n: ActiveRun) => cbRef.current.onRunComplete(n);
    const onDeath = () => cbRef.current.onDeath();
    let alive = true;
    let dragging:
      | { kind: 'object'; id: string; dx: number; dy: number; display: PIXI.DisplayObject }
      | { kind: 'trigger'; id: string; dx: number; dy: number; display: PIXI.DisplayObject }
      | { kind: 'player'; dx: number; display: PIXI.DisplayObject }
      | { kind: 'door'; dx: number; display: PIXI.DisplayObject }
      | { kind: 'link'; sourceKind: 'trigger' | 'object'; id: string; x: number; y: number }
      | null = null;

    // Snap a coordinate to the editor grid (falls back to whole pixels when snapping is off).
    const snapVal = (v: number) => {
      const g = stateRef.current.gridSnap;
      return g > 0 ? Math.round(v / g) * g : Math.round(v);
    };

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
    const texTrigger = tex(A.trigger);

    const world = new PIXI.Container();
    const floorGraphics = new PIXI.Graphics();
    const connectorsLayer = new PIXI.Graphics();
    const objectsLayer = new PIXI.Container();
    const triggersLayer = new PIXI.Container();
    const connectorHandles = new PIXI.Container();
    const doorContainer = new PIXI.Container();
    const player = new PIXI.Sprite(heroTex.idle);
    const doorSprite = new PIXI.Sprite(texDoorSafe);
    const doorEdge = new PIXI.Container();

    app.stage.addChild(world);
    world.addChild(floorGraphics, connectorsLayer, objectsLayer, triggersLayer, connectorHandles, doorContainer, player);
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
      const s = stateRef.current;
      const bg = hexToNum(s.config.bgColor, hexToNum(DEFAULT_BG));
      const band = hexToNum(s.config.groundColor, hexToNum(DEFAULT_GROUND));
      const bandHi = lightenNum(band, 0.12);

      floorGraphics.clear();
      floorGraphics.beginFill(band);
      floorGraphics.drawRect(0, BAND_TOP, VIEW_W, GROUND_Y - BAND_TOP + 8);
      floorGraphics.endFill();
      floorGraphics.beginFill(bandHi, 0.7);
      floorGraphics.drawRect(0, BAND_TOP, VIEW_W, 5);
      floorGraphics.endFill();
      floorGraphics.beginFill(0x000000, 0.12);
      floorGraphics.drawRect(0, GROUND_Y + 8, VIEW_W, VIEW_H - GROUND_Y - 8);
      floorGraphics.endFill();

      const activePits = s.config.objects.filter(
        (object) => object.type === 'pit' && s.activeObjectIds.has(object.id),
      );
      activePits.forEach((pit) => {
        // splitFloor pits open gradually (split 0->1); openPit pits open instantly
        const progress = s.splitPitIds.has(pit.id) ? (s.objectRuntime.get(pit.id)?.split ?? 0) : 1;
        const holeW = pit.width * Math.max(0, Math.min(1, progress));
        if (holeW <= 0) return;
        floorGraphics.beginFill(bg);
        floorGraphics.drawRect(pit.x - holeW / 2, GROUND_Y - 2, holeW, VIEW_H - GROUND_Y + 16);
        floorGraphics.endFill();
        // jagged broken edges on both sides of the gap for the "floor splitting" look
        if (progress < 1 && s.splitPitIds.has(pit.id)) {
          floorGraphics.beginFill(bandHi, 0.8);
          floorGraphics.drawRect(pit.x - holeW / 2 - 3, GROUND_Y - 4, 3, 8);
          floorGraphics.drawRect(pit.x + holeW / 2, GROUND_Y - 4, 3, 8);
          floorGraphics.endFill();
        }
      });

      if (collapsed) {
        floorGraphics.beginFill(bg);
        floorGraphics.drawRect(90, GROUND_Y - 2, VIEW_W - 180, VIEW_H - GROUND_Y + 16);
        floorGraphics.endFill();
      }
    };
    drawFloorRef.current = drawFloor;

    const makeObjectSprite = (object: LevelObject) => {
      let display: PIXI.DisplayObject;
      const active = stateRef.current.activeObjectIds.has(object.id);
      const col = object.color ? hexToNum(object.color) : null; // per-object color override
      if (object.spriteUrl && object.type !== 'button') {
        const sprite = new PIXI.Sprite(tex(object.spriteUrl));
        sprite.anchor.set(0.5, isBottomAnchored(object.type) ? 1 : 0.5);
        sprite.width = object.width;
        sprite.height = object.height;
        sprite.tint = col ?? (active ? 0xffffff : 0x9a9a9a);
        display = sprite;
      } else if (object.type === 'spike') {
        const sprite = new PIXI.Sprite(texSpike);
        sprite.anchor.set(0.5, 1);
        sprite.tint = col ?? COL_INK;
        sprite.scale.set(object.width / 16, object.height / 16);
        display = sprite;
      } else if (object.type === 'saw') {
        const sprite = new PIXI.Sprite(texSaw);
        sprite.anchor.set(0.5);
        sprite.tint = col ?? (active ? 0xffffff : 0x6b4a21);
        sprite.scale.set(object.width / 16, object.height / 16);
        display = sprite;
      } else if (object.type === 'pit') {
        const g = new PIXI.Graphics();
        g.beginFill(col ?? (active ? 0x161616 : 0x6b4a21), active ? 0.9 : 0.45);
        g.drawRect(-object.width / 2, -object.height, object.width, object.height);
        g.endFill();
        display = g;
      } else if (object.type === 'fallingBlock') {
        const g = new PIXI.Graphics();
        g.beginFill(col ?? 0x5b3410, active ? 1 : 0.42);
        g.lineStyle(3, COL_INK, active ? 0.85 : 0.35);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
        g.endFill();
        g.beginFill(COL_INK, active ? 0.55 : 0.2);
        g.drawRect(-object.width / 2 + 8, -object.height / 2 + 8, object.width - 16, 6);
        g.endFill();
        display = g;
      } else if (object.type === 'crusher') {
        const g = new PIXI.Graphics();
        g.beginFill(col ?? 0x3b2611, active ? 1 : 0.45);
        g.lineStyle(3, 0x8a1f10, active ? 0.9 : 0.35);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
        g.endFill();
        g.beginFill(0x8a1f10, active ? 1 : 0.35);
        for (let x = -object.width / 2; x < object.width / 2; x += object.width / 4) {
          g.drawPolygon([x, object.height / 2, x + object.width / 8, object.height / 2 + 13, x + object.width / 4, object.height / 2]);
        }
        g.endFill();
        display = g;
      } else if (object.type === 'laser') {
        const g = new PIXI.Graphics();
        g.beginFill(col ?? 0xfef08a, active ? 0.95 : 0.25);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
        g.endFill();
        g.lineStyle(3, 0xef4444, active ? 0.85 : 0.25);
        g.moveTo(-object.width / 2, 0);
        g.lineTo(object.width / 2, 0);
        display = g;
      } else if (object.type === 'platform') {
        const g = new PIXI.Graphics();
        g.beginFill(col ?? 0xb37111, active ? 1 : 0.45);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
        g.endFill();
        g.beginFill(0xeab451, active ? 0.85 : 0.3);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, 4);
        g.endFill();
        g.lineStyle(2, COL_INK, active ? 0.7 : 0.3);
        g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
        display = g;
      } else if (object.type === 'text') {
        // free text block: no panel, full behaviors via motion/action/appear
        const text = new PIXI.Text(object.text ?? object.label ?? '', {
          fill: object.textColor ? hexToNum(object.textColor) : (col ?? 0xffffff),
          fontSize: object.fontSize || Math.max(10, object.height),
          fontFamily: object.fontFamily || 'Arial',
          fontWeight: 'bold',
          align: 'center',
        });
        text.anchor.set(0.5);
        text.resolution = 2;
        display = text;
      } else {
        // button: optional texture (or a chunky panel) with custom text on top
        const box = new PIXI.Container();
        if (object.spriteUrl) {
          const sprite = new PIXI.Sprite(tex(object.spriteUrl));
          sprite.anchor.set(0.5);
          sprite.width = object.width;
          sprite.height = object.height;
          if (col != null) sprite.tint = col;
          box.addChild(sprite);
        } else {
          const g = new PIXI.Graphics();
          g.beginFill(col ?? 0xffc164, active ? 1 : 0.4);
          g.drawRect(-object.width / 2, -object.height / 2, object.width, object.height);
          g.endFill();
          g.beginFill(0xb37111, active ? 1 : 0.4);
          g.drawRect(-object.width / 2, object.height / 2 - 6, object.width, 6);
          g.endFill();
          box.addChild(g);
        }
        const label = object.text ?? object.label ?? '';
        if (label) {
          const text = new PIXI.Text(label.toUpperCase(), {
            fill: object.textColor ? hexToNum(object.textColor) : COL_INK,
            fontSize: Math.min(14, object.height - 8),
            fontFamily: object.fontFamily || 'monospace',
            fontWeight: 'bold',
          });
          text.anchor.set(0.5);
          text.resolution = 2;
          box.addChild(text);
        }
        display = box;
      }
      const runtime = stateRef.current.editorMode === 'play' ? stateRef.current.objectRuntime.get(object.id) : undefined;
      display.x = runtime?.x ?? object.x;
      display.y = runtime?.y ?? object.y;
      if (object.rotation) display.rotation = (object.rotation * Math.PI) / 180;
      return display;
    };

    // Resolve where a link target sits on screen (object centre, or the door).
    const targetPoint = (targetId: string) => {
      const target = stateRef.current.config.objects.find((object) => object.id === targetId);
      if (target) return { x: target.x, y: target.y - target.height / 2, label: target.label };
      return { x: stateRef.current.config.doorSpawnX, y: GROUND_Y - DOOR_H / 2, label: 'Door' };
    };

    // One connector: a thick arrow from source -> target with an action label and a draggable end handle.
    const drawConnector = (
      sourceKind: 'trigger' | 'object',
      id: string,
      sx: number,
      sy: number,
      targetId: string,
      action: string,
      selected: boolean,
      baseColor: number = COL_CONNECTOR,
    ) => {
      const live = dragging && dragging.kind === 'link' && dragging.id === id ? { x: dragging.x, y: dragging.y } : null;
      const tp = live || targetPoint(targetId);
      const color = selected || live ? 0xffffff : baseColor;
      connectorsLayer.lineStyle(selected || live ? 4 : 2.5, color, 0.95);
      connectorsLayer.moveTo(sx, sy);
      connectorsLayer.lineTo(tp.x, tp.y);

      // arrowhead
      const ang = Math.atan2(tp.y - sy, tp.x - sx);
      const ah = 11;
      connectorsLayer.beginFill(color, 1);
      connectorsLayer.drawPolygon([
        tp.x, tp.y,
        tp.x - ah * Math.cos(ang - 0.4), tp.y - ah * Math.sin(ang - 0.4),
        tp.x - ah * Math.cos(ang + 0.4), tp.y - ah * Math.sin(ang + 0.4),
      ]);
      connectorsLayer.endFill();

      // action label at midpoint
      const mid = { x: (sx + tp.x) / 2, y: (sy + tp.y) / 2 };
      const tag = new PIXI.Text(action, {
        fill: 0x231708,
        fontSize: 9,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        stroke: COL_CONNECTOR,
        strokeThickness: 3,
      });
      tag.anchor.set(0.5);
      tag.x = mid.x;
      tag.y = mid.y;
      tag.resolution = 2;
      connectorHandles.addChild(tag);

      // large draggable end handle to re-target the link
      const handle = new PIXI.Graphics();
      handle.beginFill(color, 0.18);
      handle.lineStyle(2, color, 0.9);
      handle.drawCircle(0, 0, 13);
      handle.endFill();
      handle.beginFill(color, 1);
      handle.drawCircle(0, 0, 4);
      handle.endFill();
      handle.x = tp.x;
      handle.y = tp.y;
      handle.eventMode = 'static';
      handle.cursor = 'grab';
      handle.on('pointerdown', (e: any) => {
        if (stateRef.current.editorMode !== 'constructor') return;
        e.stopPropagation?.();
        const p = e.data.getLocalPosition(world);
        dragging = { kind: 'link', sourceKind, id, x: p.x, y: p.y };
        onSelectEntity(id);
      });
      connectorHandles.addChild(handle);
    };

    // Resolve a trigger's layer definition (color/hidden); undefined = built-in default look.
    const triggerLayerDef = (trigger: TriggerZone) => {
      if (!trigger.layer) return undefined;
      return (stateRef.current.config.triggerLayers || []).find((l) => l.name === trigger.layer);
    };

    const drawConnectors = () => {
      connectorsLayer.clear();
      connectorHandles.removeChildren();
      const s = stateRef.current;
      if (s.editorMode !== 'constructor' || !s.showConnectors) return;

      s.config.triggers.forEach((trigger) => {
        const layer = triggerLayerDef(trigger);
        if (layer?.hidden) return; // layer toggled off
        const selected = s.selectedEntityId === trigger.id || s.selectedEntityId === trigger.targetId;
        drawConnector('trigger', trigger.id, trigger.x + trigger.width / 2, trigger.y + trigger.height / 2, trigger.targetId, trigger.action, selected, layer ? hexToNum(layer.color, COL_CONNECTOR) : COL_CONNECTOR);
      });

      // objects that carry their own action (touch / clickable buttons) also show a link
      s.config.objects.forEach((object) => {
        const action = object.action;
        if (!action || action.kind === 'none') return;
        const selected = s.selectedEntityId === object.id || s.selectedEntityId === action.targetId;
        drawConnector('object', object.id, object.x, object.y - object.height / 2, action.targetId, action.kind, selected);
      });
    };

    const drawTriggers = () => {
      triggersLayer.removeChildren();
      const s = stateRef.current;
      if (s.editorMode !== 'constructor' || !s.showTriggers) return;

      s.config.triggers.forEach((trigger) => {
        const layer = triggerLayerDef(trigger);
        if (layer?.hidden) return; // layer toggled off
        const layerColor = layer ? hexToNum(layer.color, COL_TRIGGER) : COL_TRIGGER;
        const box = new PIXI.Container();
        const g = new PIXI.Graphics();
        const selected = s.selectedEntityId === trigger.id;
        const target = s.config.objects.find((object) => object.id === trigger.targetId);
        g.beginFill(layerColor, selected ? 0.28 : 0.16);
        g.lineStyle(selected ? 4 : 2, selected ? 0xffffff : layerColor, 0.9);
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
        label.y = 16;
        label.resolution = 2;
        box.addChild(label);

        // real Level Devil trigger-plate icon in the corner as a visual cue
        const icon = new PIXI.Sprite(texTrigger);
        icon.anchor.set(1, 0);
        icon.width = 16;
        icon.height = 16;
        icon.x = trigger.width - 3;
        icon.y = 3;
        icon.alpha = selected ? 1 : 0.85;
        box.addChild(icon);

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

    // Cache of live display objects by id, reused across frames instead of rebuilt every tick.
    const objectSprites = new Map<string, PIXI.DisplayObject>();

    // present = inside the object's [appearDelay, appearDelay+vanishAfter] visible window
    const presentNow = (object: LevelObject, rt?: ObjectRuntime) => {
      const since = rt ? rt.since : 0;
      if (since < (object.appearDelay || 0)) return false;
      if (object.vanishAfter && since >= (object.appearDelay || 0) + object.vanishAfter) return false;
      return true;
    };

    // fire an object's own action plus any extra links (touch or tap)
    const fireObjectAction = (object: LevelObject) => {
      if (object.action && object.action.kind !== 'none') runActionRef.current(object.action.kind, object.action.targetId, object.label);
      for (const l of (object.links || [])) runActionRef.current(l.action, l.targetId, object.label);
    };

    // Full (re)build of object sprites. Called on structural changes (reset, edits, activation),
    // not every frame — per-frame motion uses syncObjectTransforms() which only moves/hides them.
    const drawObjects = () => {
      objectsLayer.removeChildren();
      objectSprites.clear();
      const s = stateRef.current;
      const play = s.editorMode === 'play';
      objectsLayer.y = s.config.groundOffset || 0; // visual nudge so traps sit on the ground

      s.config.objects.forEach((object) => {
        const runtime = s.objectRuntime.get(object.id);
        const active = (s.activeObjectIds.has(object.id) || object.initiallyActive) && !s.hiddenObjectIds.has(object.id);
        const appeared = !play || presentNow(object, runtime);

        if (play) {
          // pits are rendered by the floor; never draw a separate pit sprite in play
          if (object.type === 'pit') return;
          // skip not-yet-triggered objects entirely (they get rebuilt when activated)
          if (!active) return;
        }

        const display = makeObjectSprite(object);
        const selected = s.selectedEntityId === object.id;
        const opacity = object.opacity ?? 1;
        if (!play && 'alpha' in display) {
          display.alpha = (active || object.type === 'spike' ? 1 : 0.55) * opacity;
        } else if (play && 'alpha' in display) {
          display.alpha = opacity;
        }
        if (play) {
          display.visible = appeared; // appear-delay objects start hidden, revealed by sync
        }

        const hasAction = (object.action?.kind || 'none') !== 'none' || !!(object.links && object.links.length);
        if (play && object.clickable && hasAction) {
          display.eventMode = 'static';
          (display as any).cursor = 'pointer';
          display.on('pointertap', () => fireObjectAction(object));
        }

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

        objectSprites.set(object.id, display);
        objectsLayer.addChild(display);
      });
    };

    // Cheap per-frame update in play: reposition cached sprites and toggle appear-delay visibility.
    // No allocation or listener churn. Active-state visual changes go through drawObjects instead.
    const syncObjectTransforms = () => {
      const s = stateRef.current;
      s.config.objects.forEach((object) => {
        const display = objectSprites.get(object.id);
        if (!display) return;
        const rt = s.objectRuntime.get(object.id);
        if (rt) {
          rt.moving = Math.abs(rt.x - (rt.lastX ?? rt.x)) > 0.05 || Math.abs(rt.y - (rt.lastY ?? rt.y)) > 0.05;
          rt.lastX = rt.x; rt.lastY = rt.y;
          display.x = rt.x;
          display.y = rt.y;
          if (object.spin) display.rotation = ((object.rotation || 0) * Math.PI) / 180 + (rt.spinAngle || 0);
        }
        const active = (s.activeObjectIds.has(object.id) || object.initiallyActive) && !s.hiddenObjectIds.has(object.id);
        display.visible = active && presentNow(object, rt);
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

      // Make sure every object (incl. ones just added in the editor) has a runtime entry.
      s.config.objects.forEach((object) => {
        if (!s.objectRuntime.has(object.id)) {
          s.objectRuntime.set(object.id, { x: object.x, y: object.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 });
        }
      });

      // keep the canvas clear color in sync with the configured background
      app.renderer.background.color = hexToNum(s.config.bgColor, hexToNum(DEFAULT_BG));

      drawFloor(s.floorCollapsed);
      drawObjects();
      drawTriggers();
      drawConnectors();

      const gOff = s.config.groundOffset || 0; // visual-only downward nudge (physics unchanged)
      player.anchor.set(0.5, 1 - gOff / PLAYER_H);
      player.x = s.config.playerSpawnX;
      player.y = GROUND_Y;
      player.alpha = 1;
      setPlayerTexture(heroTex.idle);
      player.scale.set(PLAYER_SCALE, PLAYER_SCALE);

      doorContainer.x = s.config.doorSpawnX;
      doorContainer.y = GROUND_Y + gOff;
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
      s.hiddenObjectIds = new Set();
      s.firedTriggerIds = new Set();
      s.triggerTimers = new Map();
      s.splitPitIds = new Set();
      // Motion is allowed to run immediately for objects whose motion starts on spawn.
      s.motionRunIds = new Set(
        s.config.objects.filter((object) => objectMotion(object).startOn === 'spawn').map((object) => object.id),
      );
      s.objectRuntime = new Map(
        s.config.objects.map((object) => [object.id, { x: object.x, y: object.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 }]),
      );
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

    const ensureRuntime = (id: string) => {
      const s = stateRef.current;
      const obj = s.config.objects.find((o) => o.id === id);
      if (obj && !s.objectRuntime.has(id)) {
        s.objectRuntime.set(id, { x: obj.x, y: obj.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 });
      }
    };

    // Single entry point for every action, fired by trigger zones, touch-objects, or button taps.
    const runAction = (kind: ObjectActionKind, targetId: string, sourceLabel: string) => {
      const s = stateRef.current;
      const targetLabel = s.config.objects.find((o) => o.id === targetId)?.label || (targetId === 'door' ? 'Door' : targetId);
      switch (kind) {
        case 'none':
          return;
        case 'startDoorChase':
          s.doorTriggered = true;
          setDoorArmed(true);
          onLogEvent('TRAP_ACTIVATE', `[Action] ${sourceLabel} started door chase`);
          break;
        case 'collapseFloor':
          s.floorCollapsed = true;
          onLogEvent('TRAP_ACTIVATE', `[Action] ${sourceLabel} collapsed the floor`);
          break;
        case 'nextRun':
          onLogEvent('PROGRESS', `[Action] ${sourceLabel} skipped to the next run`);
          onRunComplete(s.activeRun + 1);
          return;
        case 'redirectCTA':
          triggerDeath('REDIRECT');
          return;
        case 'chain': {
          // fire another trigger's action (guarded by firedTriggerIds against loops)
          const chained = s.config.triggers.find((t) => t.id === targetId);
          if (chained && !s.firedTriggerIds.has(chained.id)) {
            s.firedTriggerIds.add(chained.id);
            runAction(chained.action as ObjectActionKind, chained.targetId, chained.label);
            for (const l of (chained.links || [])) runAction(l.action as ObjectActionKind, l.targetId, chained.label);
          }
          return;
        }
        case 'splitFloor':
          s.activeObjectIds.add(targetId);
          s.splitPitIds.add(targetId);
          s.motionRunIds.add(targetId);
          ensureRuntime(targetId);
          onLogEvent('TRAP_ACTIVATE', `[Action] ${sourceLabel} split the floor (${targetLabel})`);
          break;
        case 'openPit':
          s.activeObjectIds.add(targetId);
          ensureRuntime(targetId);
          onLogEvent('TRAP_ACTIVATE', `[Action] ${sourceLabel} opened ${targetLabel}`);
          break;
        case 'deactivate':
          s.hiddenObjectIds.add(targetId);
          s.activeObjectIds.delete(targetId);
          s.motionRunIds.delete(targetId);
          onLogEvent('TRAP_ACTIVATE', `[Action] ${sourceLabel} deactivated ${targetLabel}`);
          break;
        case 'toggle': {
          const target = s.config.objects.find((o) => o.id === targetId);
          const currentlyActive = !!target && (s.activeObjectIds.has(targetId) || target.initiallyActive) && !s.hiddenObjectIds.has(targetId);
          if (currentlyActive) {
            s.hiddenObjectIds.add(targetId);
            s.activeObjectIds.delete(targetId);
            s.motionRunIds.delete(targetId);
          } else {
            s.hiddenObjectIds.delete(targetId);
            s.activeObjectIds.add(targetId);
            s.motionRunIds.add(targetId);
            ensureRuntime(targetId);
          }
          onLogEvent('TRAP_ACTIVATE', `[Action] ${sourceLabel} toggled ${targetLabel}`);
          break;
        }
        case 'activate':
        default:
          s.hiddenObjectIds.delete(targetId);
          s.activeObjectIds.add(targetId);
          s.motionRunIds.add(targetId);
          ensureRuntime(targetId);
          onLogEvent('TRAP_ACTIVATE', `[Action] ${sourceLabel} activated ${targetLabel}`);
          break;
      }
      redrawHazards();
    };
    runActionRef.current = runAction;

    const activateTrigger = (trigger: TriggerZone) => {
      const s = stateRef.current;
      if (s.firedTriggerIds.has(trigger.id)) return;
      s.firedTriggerIds.add(trigger.id);
      runAction(trigger.action as ObjectActionKind, trigger.targetId, trigger.label);
      for (const l of (trigger.links || [])) runAction(l.action as ObjectActionKind, l.targetId, trigger.label);
    };

    floorGraphics.eventMode = 'static';
    floorGraphics.cursor = 'crosshair';
    floorGraphics.on('pointerdown', (e: any) => {
      const s = stateRef.current;
      if (s.editorMode !== 'constructor') return;
      const local = e.data.getLocalPosition(world);
      const x = clamp(snapVal(local.x), 20, VIEW_W - 20);

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
          // keep triggers; retarget any that pointed at the erased object
          next.triggers = next.triggers.map((trigger) =>
            trigger.targetId === nearestObject.id ? { ...trigger, targetId: 'door' } : trigger,
          );
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
      const id = `${s.currentTool}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      if (s.currentTool === 'trigger') {
        // link the new trigger to the nearest object by default (or the door if none)
        const target = [...next.objects].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
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
        const preset = objectPreset(type);
        next.objects.push({
          id,
          type,
          x,
          y: preset.y,
          width: preset.width,
          height: preset.height,
          label: `${preset.label} ${next.objects.length + 1}`,
          initiallyActive: preset.initiallyActive,
          role: preset.role,
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
        dragging.display.x = clamp(snapVal(p.x - dragging.dx), 20, VIEW_W - 20);
        dragging.display.y = clamp(snapVal(p.y - dragging.dy), BAND_TOP + 24, GROUND_Y + 1);
      } else if (dragging.kind === 'trigger') {
        dragging.display.x = clamp(snapVal(p.x - dragging.dx), 0, VIEW_W - 20);
        dragging.display.y = clamp(snapVal(p.y - dragging.dy), BAND_TOP, GROUND_Y - 20);
      } else if (dragging.kind === 'player') {
        dragging.display.x = clamp(snapVal(p.x - dragging.dx), 40, VIEW_W - 40);
      } else if (dragging.kind === 'door') {
        dragging.display.x = clamp(snapVal(p.x - dragging.dx), 80, VIEW_W - 40);
      } else if (dragging.kind === 'link') {
        dragging.x = p.x;
        dragging.y = p.y;
        drawConnectors();
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
      } else if (dragging.kind === 'link') {
        // Re-target the link: drop the handle onto an object, or near the door.
        const drag = dragging;
        const px = drag.x;
        const py = drag.y;
        const hit = next.objects.find((object) => {
          const rect = objectLocalRect(object);
          return px >= object.x + rect.x - 6 && px <= object.x + rect.x + rect.w + 6 &&
            py >= object.y + rect.y - 6 && py <= object.y + rect.y + rect.h + 6;
        });
        const newTarget = hit ? hit.id : (Math.abs(px - next.doorSpawnX) < 60 ? 'door' : null);
        if (newTarget) {
          if (drag.sourceKind === 'trigger') {
            next.triggers = next.triggers.map((trigger) =>
              trigger.id === drag.id ? { ...trigger, targetId: newTarget } : trigger,
            );
          } else {
            next.objects = next.objects.map((object) =>
              object.id === drag.id && object.action
                ? { ...object, action: { ...object.action, targetId: newTarget } }
                : object,
            );
          }
          onLogEvent('LINK', `Re-linked ${drag.id} -> ${newTarget}`);
        }
        dragging = null;
        onConfigChange(next);
        return;
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

      const inOpenPit = s.config.objects.some((object) => {
        if (object.type !== 'pit' || !s.activeObjectIds.has(object.id)) return false;
        const progress = s.splitPitIds.has(object.id) ? (s.objectRuntime.get(object.id)?.split ?? 0) : 1;
        if (progress < 0.35) return false; // floor not open wide enough yet
        const halfW = (object.width * progress) / 2;
        return player.x > object.x - halfW && player.x < object.x + halfW && player.y >= GROUND_Y - 4;
      });

      // Land on solid platforms / bounce off springs (one-way: only when dropping onto the top).
      let landedOnSolid = false;
      for (const object of s.config.objects) {
        const role = effectiveRole(object);
        if (role !== 'solid' && role !== 'spring') continue;
        if (!((s.activeObjectIds.has(object.id) || object.initiallyActive) && !s.hiddenObjectIds.has(object.id))) continue;
        if (!presentNow(object, s.objectRuntime.get(object.id))) continue; // vanished platforms stop colliding
        const r = objectWorldRect(object);
        const prevFoot = player.y - s.playerVelY * delta;
        if (s.playerVelY >= 0 && player.x > r.x && player.x < r.x + r.w && prevFoot <= r.y + 2 && player.y >= r.y) {
          player.y = r.y;
          if (role === 'spring') {
            s.playerVelY = -(object.bounce || 18); // launch the player upward
            s.isGrounded = false;
          } else {
            s.playerVelY = 0;
            s.isGrounded = true;
            landedOnSolid = true;
          }
        }
      }

      if (!landedOnSolid && player.y >= GROUND_Y) {
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
        const delay = trigger.delay || 0;
        if (trigger.auto) {
          // fires on a timer from run start, no touch needed
          const t = (s.triggerTimers.get(trigger.id) || 0) + (1 / 60) * delta;
          s.triggerTimers.set(trigger.id, t);
          if (t >= delay) activateTrigger(trigger);
          return;
        }
        const over = rectsOverlap(playerRect.x, playerRect.y, playerRect.w, playerRect.h, trigger.x, trigger.y, trigger.width, trigger.height);
        if (over) {
          const t = (s.triggerTimers.get(trigger.id) || 0) + (1 / 60) * delta;
          s.triggerTimers.set(trigger.id, t);
          if (t >= delay) activateTrigger(trigger); // activateTrigger guards against re-firing
        } else {
          s.triggerTimers.set(trigger.id, 0);
          if (trigger.repeat) s.firedTriggerIds.delete(trigger.id); // allow re-fire on re-entry
        }
      });

      // --- advance per-object timers, reveal-on-delay, floor-split and motion ---
      let objectsDirty = false;
      for (const object of s.config.objects) {
        const active = (s.activeObjectIds.has(object.id) || object.initiallyActive) && !s.hiddenObjectIds.has(object.id);
        if (!active) continue;
        const rt = s.objectRuntime.get(object.id);
        if (!rt) continue;
        const before = rt.since;
        rt.since += (1 / 60) * delta;
        if (object.spin) rt.spinAngle = (rt.spinAngle || 0) + (object.spin * Math.PI / 180) * delta; // continuous spin

        if ((object.appearDelay || 0) > 0 && before < object.appearDelay! && rt.since >= object.appearDelay!) {
          objectsDirty = true; // object just became visible
        }
        if (object.type === 'pit' && s.splitPitIds.has(object.id) && rt.split < 1) {
          rt.split = Math.min(1, rt.split + (1 / 24) * delta); // floor splits over ~0.4s
          objectsDirty = true;
        }

        // attached objects follow their parent (e.g. spikes riding the door); no self-motion
        if (object.attachTo) {
          let baseX: number | undefined, baseY = 0, curX = 0, curY = 0;
          if (object.attachTo === 'door') { baseX = s.config.doorSpawnX; baseY = GROUND_Y; curX = doorContainer.x; curY = doorContainer.y; }
          else if (object.attachTo === 'player') { baseX = s.config.playerSpawnX; baseY = GROUND_Y; curX = player.x; curY = player.y; }
          else {
            const po = s.config.objects.find((o) => o.id === object.attachTo);
            const prt = s.objectRuntime.get(object.attachTo);
            if (po) { baseX = po.x; baseY = po.y; curX = prt ? prt.x : po.x; curY = prt ? prt.y : po.y; }
          }
          if (baseX !== undefined) {
            rt.x = curX + (object.x - baseX);
            rt.y = curY + (object.y - baseY);
            objectsDirty = true;
            continue;
          }
        }

        const m = objectMotion(object);
        if (!s.motionRunIds.has(object.id) || rt.since < m.delay) continue;

        if (m.mode === 'fall') {
          rt.vy = Math.min(rt.vy + 0.62 * delta, 13);
          rt.y = Math.min(rt.y + rt.vy * delta, GROUND_Y - object.height / 2 + 1);
          objectsDirty = true;
        } else if (m.mode === 'linear') {
          const len = Math.hypot(m.dirX, m.dirY) || 1;
          const stepX = (m.dirX / len) * m.speed * rt.pong * delta;
          const stepY = (m.dirY / len) * m.speed * rt.pong * delta;
          rt.x += stepX;
          rt.y += stepY;
          rt.traveled += Math.hypot(stepX, stepY);
          if (m.distance > 0 && rt.traveled >= m.distance) {
            if (m.loop) {
              rt.pong *= -1; // bounce back the other way
              rt.traveled = 0;
            } else {
              rt.pong = 0; // reached the end, stop
            }
          }
          objectsDirty = true;
        } else if (m.mode === 'chase') {
          // target can be the player, the door, or any other object by id
          let tx = player.x;
          let ty = player.y - PLAYER_H / 2;
          if (m.target === 'door') {
            tx = doorContainer.x;
            ty = doorContainer.y + DOOR_CY;
          } else if (m.target !== 'player') {
            const targetRt = s.objectRuntime.get(m.target);
            const targetObj = s.config.objects.find((o) => o.id === m.target);
            if (targetRt) { tx = targetRt.x; ty = targetRt.y; }
            else if (targetObj) { tx = targetObj.x; ty = targetObj.y; }
          }
          const dx = tx - rt.x;
          const dy = ty - rt.y;
          const d = Math.hypot(dx, dy) || 1;
          const step = Math.min(m.speed * delta, d);
          rt.x += (dx / d) * step;
          rt.y += (dy / d) * step;
          objectsDirty = true;
        } else if (m.mode === 'orbit') {
          // circle around the placed point; radius = distance, loop = reverse direction
          rt.orbit = (rt.orbit || 0) + m.speed * 0.03 * delta * (m.loop ? -1 : 1);
          const R = m.distance || 40;
          rt.x = object.x + Math.cos(rt.orbit) * R;
          rt.y = object.y + Math.sin(rt.orbit) * R;
        } else if (m.mode === 'pendulum') {
          // swing on an arc; rest position = placed point, pivot R above it
          rt.orbit = (rt.orbit || 0) + m.speed * 0.05 * delta;
          const R = m.distance || 40;
          const swing = Math.sin(rt.orbit) * 1.2;
          rt.x = object.x + Math.sin(swing) * R;
          rt.y = (object.y - R) + Math.cos(swing) * R;
        }
        rt.x = clamp(rt.x, 0, VIEW_W);
        rt.y = clamp(rt.y, BAND_TOP, GROUND_Y + 40);
      }
      if (objectsDirty) {
        drawFloor(s.floorCollapsed);
        syncObjectTransforms();
      }

      for (const object of s.config.objects) {
        const active = (s.activeObjectIds.has(object.id) || object.initiallyActive) && !s.hiddenObjectIds.has(object.id);
        if (!active) continue;
        const rt = s.objectRuntime.get(object.id);
        if (!presentNow(object, rt)) continue; // not appeared yet, or already vanished
        const wr = objectWorldRect(object);
        const touching = rectsOverlap(playerRect.x, playerRect.y, playerRect.w, playerRect.h, wr.x, wr.y, wr.w, wr.h);

        // any active object can carry a touch action (acts as a trigger), fired once
        const hasTouchAction = (object.action && object.action.kind !== 'none') || !!(object.links && object.links.length);
        if (touching && hasTouchAction && !object.clickable) {
          const key = `obj:${object.id}`;
          if (!s.firedTriggerIds.has(key)) {
            s.firedTriggerIds.add(key);
            fireObjectAction(object);
          }
        }

        if (!isLethal(object, rt ? !!rt.moving : false)) continue;
        const cx = rt ? rt.x : object.x;
        if (object.type === 'spike') {
          const oy = rt ? rt.y : object.y;
          const floorSpike = !object.rotation && oy >= GROUND_Y - 14;
          if (floorSpike) {
            if (Math.abs(player.x - cx) < object.width / 2 && player.y > GROUND_Y - 12) {
              triggerDeath('SPIKE');
              return;
            }
          } else if (touching) {
            // ceiling / wall / repositioned spike: use the bounding box
            triggerDeath('SPIKE');
            return;
          }
          continue;
        }
        if (touching) {
          triggerDeath(object.type === 'saw' ? 'SAW' : object.type === 'laser' ? 'LASER' : 'CRUSH');
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
  const frameBg = config.bgColor || DEFAULT_BG;
  const frameBand = config.groundColor || DEFAULT_GROUND;
  const stageButtonBase: CSSProperties = { position: 'absolute', zIndex: 20 };
  const levelViewportStyle: CSSProperties = {
    position: 'absolute',
    left: isPortrait ? '2.8%' : '23.4375%',
    top: isPortrait ? '39.0625%' : '30.56%',
    width: isPortrait ? '94.4%' : '53.125%',
    height: isPortrait ? '21.875%' : '38.89%',
    overflow: 'hidden',
    backgroundColor: frameBand,
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
          backgroundColor: frameBg,
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
  gridSnap: number;
  onConfigChange: (config: GameConfig) => void;
  onSelectEntity: (id: string | null) => void;
  onLogEvent: (type: string, msg: string) => void;
  onRunComplete: (nextRun: ActiveRun) => void;
  onDeath: () => void;
}

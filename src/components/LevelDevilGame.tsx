import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as PIXI from 'pixi.js';
import { GameConfig, EditorTool, ActiveRun } from '../types';
import { Pause, Play, RotateCcw, Download } from 'lucide-react';
import * as A from '../assets';

// Where the playable should redirect on CTA / Install. Replace with the real store URL.
const STORE_URL = 'https://play.google.com/store/apps/details?id=com.leveldevil';

const VIEW_W = 800;
const VIEW_H = 450;
const GROUND_Y = 300;     // y of the floor line (player feet)
const BAND_TOP = 150;     // top of the play zone / ceiling
const PLAYER_H = 36;      // player display height (ceiling collision)
const PLAYER_SCALE = PLAYER_H / 16; // hero sprites are 16px tall
const DOOR_W = 40;
const DOOR_H = 56;
const DOOR_CY = -DOOR_H / 2;

// Warm flat palette tuned to the reference.
const COL_BG = 0xc5802b;
const COL_BAND = 0xe2a33c;
const COL_BAND_HI = 0xeab451;
const COL_INK = 0x231708;   // player / spikes / text tint

export default function LevelDevilGame({
  config,
  activeRun,
  currentTool,
  orientation,
  onConfigChange,
  onLogEvent,
  onRunComplete,
  onDeath,
}: LevelDevilGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const headerTextRef = useRef<PIXI.Text | null>(null);
  const indicatorPanelRef = useRef<PIXI.Graphics | null>(null);

  const [isMuted, setIsMuted] = useState(false);

  const resetGameRef = useRef<() => void>(() => {});
  const drawSpikesRef = useRef<() => void>(() => {});
  const drawFloorRef = useRef<(collapsed: boolean) => void>(() => {});
  const triggerDeathRef = useRef<((cause: 'SAW' | 'SPIKE' | 'PIT' | 'REDIRECT') => void) | null>(null);

  const stateRef = useRef({
    config,
    activeRun,
    currentTool,
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
    paused: false,
    splashActive: true,
    playerMoved: false,
  });

  const [isSkipVisible, setIsSkipVisible] = useState(false);
  const [isCtaVisible, setIsCtaVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showHand, setShowHand] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => { stateRef.current.activeRun = activeRun; }, [activeRun]);
  useEffect(() => { stateRef.current.currentTool = currentTool; }, [currentTool]);

  useEffect(() => {
    stateRef.current.config = config;
    drawSpikesRef.current();
  }, [config]);

  useEffect(() => {
    resetGameRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun]);

  useEffect(() => {
    stateRef.current.splashActive = true;
    const t = setTimeout(() => {
      stateRef.current.splashActive = false;
      setShowSplash(false);
      onLogEvent('SCENE', '[Scene 1] Start screen — REACH THE DOOR');
    }, 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (headerTextRef.current) {
      headerTextRef.current.visible = orientation === 'horizontal';
    }
    if (indicatorPanelRef.current) {
      indicatorPanelRef.current.visible = orientation === 'horizontal';
    }
  }, [orientation]);

  const LevelIndicators = () => {
    const total = 5;
    return (
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
        {Array.from({ length: total }).map((_, i) => {
          const isActive = i < activeRun;
          return (
            <div
              key={i}
              style={{
                width: '18px',
                height: '18px',
                backgroundColor: isActive ? '#231708' : 'transparent',
                border: '4px solid #231708',
                boxSizing: 'border-box',
              }}
            />
          );
        })}
      </div>
    );
  };

  const GameTitle = () => (
    <h2
      style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '22px',
        fontWeight: 'normal',
        color: '#231708',
        textAlign: 'center',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        margin: '0 0 24px 0',
      }}
    >
      Reach The Door
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
        width: 52,
        height: 52,
        backgroundColor: '#fbe2a0',
        border: '4px solid #231708',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#231708',
        cursor: 'pointer',
        boxSizing: 'border-box',
        padding: 0,
        ...style
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#231708" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" style={{ width: '60%', height: '60%', imageRendering: 'pixelated' }}>
        <polygon points="9 7 5 11 2 11 2 13 5 13 9 17 9 7" fill="#231708"/>
        {!isMuted && (
          <>
            <path d="M14 8 a 5 5 0 0 1 0 8" />
            <path d="M18 5 a 10 10 0 0 1 0 14" />
          </>
        )}
        {isMuted && (
          <>
            <line x1="21" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="21" y2="15"/>
          </>
        )}
      </svg>
    </button>
  );

  const InstallButton = ({ style }: { style?: CSSProperties }) => (
    <button
      onClick={() => goToStore('install_now')}
      style={{
        height: 52,
        padding: '0 24px',
        backgroundColor: '#fbe2a0',
        color: '#231708',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        fontWeight: 'normal',
        border: '4px solid #231708',
        borderRadius: '4px',
        cursor: 'pointer',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style
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

  // ---- PixiJS scene (built once) ----
  useEffect(() => {
    if (!containerRef.current) return;
    let alive = true;

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

    // Crisp pixel-art textures
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

    const world = new PIXI.Container();
    app.stage.addChild(world);

    const floorGraphics = new PIXI.Graphics();
    const spikesContainer = new PIXI.Container();
    const doorContainer = new PIXI.Container();
    const secondDoorContainer = new PIXI.Container();
    const indicatorPanel = new PIXI.Graphics();

    // --- Player sprite ---
    const player = new PIXI.Sprite(heroTex.idle);
    player.anchor.set(0.5, 1);
    player.tint = COL_INK;

    world.addChild(floorGraphics, spikesContainer, doorContainer, secondDoorContainer, player, indicatorPanel);

    const setPlayerTexture = (t: PIXI.Texture) => { if (player.texture !== t) player.texture = t; };

    // --- Main door (safe → killer) ---
    const doorSprite = new PIXI.Sprite(texDoorSafe);
    doorSprite.anchor.set(0.5, 1);
    doorSprite.scale.set(DOOR_W / 16, DOOR_H / 16); // door.png is 16x16
    const doorEdge = new PIXI.Container();
    doorEdge.visible = false;
    doorContainer.addChild(doorSprite, doorEdge);

    // Spikes framing the door edges (built once, shown when armed)
    const buildEdgeSpikes = () => {
      doorEdge.removeChildren();
      const mk = (x: number, y: number, rot: number) => {
        const s = new PIXI.Sprite(texSpike); // spike.png is 16x16
        s.anchor.set(0.5, 1);
        s.tint = 0x8a1f10;
        s.scale.set(14 / 16, 12 / 16);
        s.x = x; s.y = y; s.rotation = rot;
        doorEdge.addChild(s);
      };
      const hw = DOOR_W / 2;
      // top (tips up) / bottom (tips down)
      for (const x of [-13, 0, 13]) { mk(x, -DOOR_H, 0); mk(x, 0, Math.PI); }
      // left (tips left) / right (tips right)
      for (const y of [-14, -42]) { mk(-hw, y, -Math.PI / 2); mk(hw, y, Math.PI / 2); }
    };
    buildEdgeSpikes();

    const setDoorArmed = (armed: boolean) => {
      doorSprite.texture = armed ? texDoorKiller : texDoorSafe;
      doorSprite.tint = 0xffffff;
      // door.png = 16x16, door_2.png = 20x23 — scale from known pixel sizes.
      if (armed) doorSprite.scale.set(DOOR_W / 20, DOOR_H / 23);
      else doorSprite.scale.set(DOOR_W / 16, DOOR_H / 16);
      doorEdge.visible = armed;
    };

    // --- Second (safe) door for Run 3 ---
    const secondDoor = new PIXI.Sprite(texDoorSafe);
    secondDoor.anchor.set(0.5, 1);
    secondDoor.scale.set(DOOR_W / 16, DOOR_H / 16);
    secondDoor.tint = 0x9fe6a8; // hint of green = "safe / new"
    secondDoorContainer.addChild(secondDoor);
    secondDoorContainer.visible = false;

    // --- Header text ---
    const headerText = new PIXI.Text('REACH THE DOOR', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: 18, fontWeight: '700',
      fill: COL_INK, align: 'center', letterSpacing: 1,
    });
    headerText.anchor.set(0.5, 0.5);
    headerText.x = VIEW_W / 2;
    headerText.y = 78;
    world.addChild(headerText);
    headerTextRef.current = headerText;
    headerText.visible = orientation === 'horizontal';

    indicatorPanelRef.current = indicatorPanel;
    indicatorPanel.visible = orientation === 'horizontal';

    // --- Level indicator squares ---
    const drawIndicators = (run: number) => {
      indicatorPanel.clear();
      const total = 5, size = 14, gap = 8;
      const startX = VIEW_W / 2 - (total * size + (total - 1) * gap) / 2;
      for (let i = 0; i < total; i++) {
        const x = startX + i * (size + gap);
        if (i < run) { indicatorPanel.beginFill(COL_INK); indicatorPanel.drawRect(x, 26, size, size); indicatorPanel.endFill(); }
        else { indicatorPanel.lineStyle(2, COL_INK, 0.5); indicatorPanel.drawRect(x, 26, size, size); indicatorPanel.lineStyle(0); }
      }
    };

    // --- Floor strip ---
    const drawFloor = (collapsed: boolean) => {
      if (!alive) return;
      floorGraphics.clear();
      if (!collapsed) {
        floorGraphics.beginFill(COL_BAND);
        floorGraphics.drawRect(40, BAND_TOP, VIEW_W - 80, GROUND_Y - BAND_TOP + 6);
        floorGraphics.endFill();
        floorGraphics.beginFill(COL_BAND_HI, 0.7);
        floorGraphics.drawRect(40, BAND_TOP, VIEW_W - 80, 5);
        floorGraphics.endFill();
        floorGraphics.beginFill(0x000000, 0.12);
        floorGraphics.drawRect(40, GROUND_Y + 6, VIEW_W - 80, 4);
        floorGraphics.endFill();
      } else {
        floorGraphics.beginFill(COL_BAND);
        floorGraphics.drawRect(40, BAND_TOP, 60, GROUND_Y - BAND_TOP + 6);
        floorGraphics.drawRect(VIEW_W - 100, BAND_TOP, 60, GROUND_Y - BAND_TOP + 6);
        floorGraphics.endFill();
      }
    };
    drawFloorRef.current = drawFloor;

    // --- Spikes (sprites, live-editable) ---
    const drawSpikes = () => {
      if (!alive) return;
      spikesContainer.removeChildren();
      stateRef.current.config.spikes.forEach((sx) => {
        const s = new PIXI.Sprite(texSpike); // 16x16
        s.anchor.set(0.5, 1);
        s.tint = COL_INK;
        s.scale.set(30 / 16, 22 / 16);
        s.x = sx; s.y = GROUND_Y + 1;
        spikesContainer.addChild(s);
      });
    };
    drawSpikesRef.current = drawSpikes;

    // --- Full level draw / reset ---
    const drawLevel = () => {
      if (!alive) return;
      const s = stateRef.current;
      drawFloor(s.floorCollapsed);

      player.x = s.config.playerSpawnX;
      player.y = GROUND_Y;
      player.alpha = 1;
      s.facing = 1;
      s.animTimer = 0;
      setPlayerTexture(heroTex.idle);
      player.scale.set(PLAYER_SCALE, PLAYER_SCALE);
      s.spawnFrames = 10;

      doorContainer.x = s.config.doorSpawnX;
      doorContainer.y = GROUND_Y;
      doorContainer.rotation = 0;
      setDoorArmed(false);

      drawSpikes();
      drawIndicators(s.activeRun);

      if (s.activeRun === 2) {
        setDoorArmed(true);
        headerText.text = 'REACH THE DOOR';
        secondDoorContainer.visible = false;
      } else if (s.activeRun === 3) {
        headerText.text = 'TRY NEW DOOR';
        secondDoorContainer.x = (s.config.playerSpawnX + s.config.doorSpawnX) / 2 - 40;
        secondDoorContainer.y = GROUND_Y;
        secondDoorContainer.visible = true;
        setDoorArmed(true); // killer door already armed, waiting
      } else {
        headerText.text = 'REACH THE DOOR';
        secondDoorContainer.visible = false;
      }
    };

    const doReset = () => {
      if (!alive) return;
      const s = stateRef.current;
      s.isDead = false;
      s.isDyingAnim = false;
      s.doorTriggered = false;
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
      setIsSkipVisible(false);
      setIsCtaVisible(false);
      onLogEvent('INFO', `[Game] Reset — Run ${s.activeRun}`);
      drawLevel();
    };
    resetGameRef.current = doReset;

    // --- Death + respawn ---
    const triggerDeath = (cause: 'SAW' | 'SPIKE' | 'PIT' | 'REDIRECT') => {
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
      // squash
      setPlayerTexture(heroTex.idle);
      player.scale.set(s.facing * PLAYER_SCALE, 0.4 * PLAYER_SCALE);

      let shake = 0;
      const shakeTimer = setInterval(() => {
        world.x = (Math.random() - 0.5) * 12;
        world.y = (Math.random() - 0.5) * 12;
        if (++shake > 12) { clearInterval(shakeTimer); world.x = 0; world.y = 0; }
      }, 25);

      setTimeout(() => {
        s.isDyingAnim = false;
        if (s.activeRun === 1) onRunComplete(2);
        else if (s.activeRun === 2) onRunComplete(3);
        else doReset();
      }, 1100);
    };
    triggerDeathRef.current = triggerDeath;

    // --- Canvas pointer: edit spikes / Run 3 tap-to-store ---
    floorGraphics.eventMode = 'static';
    floorGraphics.on('pointerdown', (e) => {
      const s = stateRef.current;
      if (s.activeRun === 3 && !s.endcardActive && !s.splashActive) {
        triggerDeath('REDIRECT');
        return;
      }
      if (s.currentTool === 'view') return;
      const local = e.data.getLocalPosition(world);
      const cx = Math.round(local.x);
      if (local.y < BAND_TOP || local.y > GROUND_Y + 12) return;
      if (s.currentTool === 'spike') {
        if (!s.config.spikes.some((sx) => Math.abs(sx - cx) < 22)) {
          const next = [...s.config.spikes, cx].sort((a, b) => a - b);
          onConfigChange({ ...s.config, spikes: next });
          onLogEvent('SPIKE_ADD', `Placed spike at X:${cx}`);
        }
      } else if (s.currentTool === 'erase') {
        const next = s.config.spikes.filter((sx) => Math.abs(sx - cx) >= 22);
        if (next.length !== s.config.spikes.length) {
          onConfigChange({ ...s.config, spikes: next });
          onLogEvent('SPIKE_ERASE', `Erased spike near X:${cx}`);
        }
      }
    });

    // --- Keyboard ---
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      const move = ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'ArrowUp', 'KeyW'].includes(e.code);
      if (move) firstMove();
      if (move && stateRef.current.activeRun === 3 && !stateRef.current.endcardActive && !stateRef.current.isDead && !stateRef.current.splashActive) {
        triggerDeath('REDIRECT');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { delete stateRef.current.keys[e.code]; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // --- Main loop ---
    const ticker = (tickerObj: any) => {
      const delta = typeof tickerObj === 'number' ? tickerObj : (tickerObj?.deltaTime ?? 1);
      const s = stateRef.current;

      // Menacing wobble while the door is armed
      doorContainer.rotation = doorEdge.visible ? Math.sin(Date.now() / 90) * 0.04 : 0;

      if (s.paused || s.splashActive || s.isDead || s.isDyingAnim) return;

      if (player.y > VIEW_H + 40) { triggerDeath('PIT'); return; }

      // Input
      s.playerVelX = 0;
      if (s.keys['ArrowLeft'] || s.keys['KeyA']) s.playerVelX = -s.config.playerSpeed;
      if (s.keys['ArrowRight'] || s.keys['KeyD']) s.playerVelX = s.config.playerSpeed;
      if ((s.keys['Space'] || s.keys['ArrowUp'] || s.keys['KeyW']) && s.isGrounded) {
        s.playerVelY = -s.config.jumpForce;
        s.isGrounded = false;
      }

      // Physics
      s.playerVelY += s.config.gravity * delta;
      player.x += s.playerVelX * delta;
      player.y += s.playerVelY * delta;
      if (player.x < 50) player.x = 50;
      if (player.x > VIEW_W - 50) player.x = VIEW_W - 50;

      // Ceiling
      if (player.y - PLAYER_H < BAND_TOP) {
        player.y = BAND_TOP + PLAYER_H;
        if (s.playerVelY < 0) s.playerVelY = 0;
      }

      // Grounding
      if (player.y >= GROUND_Y) {
        if (!s.floorCollapsed) { player.y = GROUND_Y; s.playerVelY = 0; s.isGrounded = true; }
        else s.isGrounded = false;
      }

      // Player animation (texture frames) + facing + respawn pop
      if (s.playerVelX < 0) s.facing = -1;
      else if (s.playerVelX > 0) s.facing = 1;
      if (!s.isGrounded) setPlayerTexture(heroTex.jump);
      else if (s.playerVelX !== 0) {
        s.animTimer += delta;
        setPlayerTexture(heroTex.run[Math.floor(s.animTimer / 5) % 4]);
      } else { s.animTimer = 0; setPlayerTexture(heroTex.idle); }
      const pop = s.spawnFrames > 0 ? 0.4 + 0.6 * (1 - s.spawnFrames / 10) : 1;
      if (s.spawnFrames > 0) s.spawnFrames--;
      player.scale.set(s.facing * pop * PLAYER_SCALE, pop * PLAYER_SCALE);

      // Floor spikes
      for (const sx of s.config.spikes) {
        if (Math.abs(player.x - sx) < 15 && player.y > GROUND_Y - 12) { triggerDeath('SPIKE'); return; }
      }

      // RUN 1 & 2 — armed door hunts the player with inertia (rises on jumps,
      // overshoots when the player doubles back). Run 2 also reveals SKIP LEVEL.
      if (s.activeRun === 1 || s.activeRun === 2) {
        if (s.activeRun === 1) {
          if (!s.doorTriggered && doorContainer.x - player.x < s.config.triggerDistance) {
            s.doorTriggered = true;
            setDoorArmed(true);
            onLogEvent('TRAP_ACTIVATE', `[Trap] Door armed with edge spikes and started hunting (Run 1)`);
          }
        } else { // Run 2
          // On level 2, the door already has spikes but only starts chasing after first action (playerMoved)
          if (!s.doorTriggered && s.playerMoved) {
            s.doorTriggered = true;
            setDoorArmed(true);
            onLogEvent('TRAP_ACTIVATE', `[Trap] Door already spiked starts hunting after first action (Run 2)`);
          }
        }
        if (s.doorTriggered) {
          s.doorTimer += (1 / 60) * delta;
          
          // Gradually increase door speed over time to guarantee killing the player
          s.doorCurrentSpeed = s.config.doorBaseSpeed + (s.doorTimer * 1.5);
          if (s.doorTimer > 3.0) {
            s.doorCurrentSpeed += (s.doorTimer - 3.0) * 3.5;
          }

          if (s.activeRun === 2 && s.doorTimer > s.config.skipButtonDelay && !s.skipClicked && !s.skipButtonActive) {
            s.skipButtonActive = true;
            setIsSkipVisible(true);
            onLogEvent('SKIP_SHOW', '[Trap] SKIP LEVEL button revealed');
          }
          const maxSp = s.doorCurrentSpeed;
          const accel = s.config.doorHoming;
          s.doorVelX += Math.sign(player.x - doorContainer.x) * accel * delta;
          s.doorVelY += Math.sign((player.y - 16) - (doorContainer.y + DOOR_CY)) * accel * delta;
          s.doorVelX = Math.max(-maxSp, Math.min(maxSp, s.doorVelX));
          s.doorVelY = Math.max(-maxSp, Math.min(maxSp, s.doorVelY));
          s.doorVelX *= 0.97; s.doorVelY *= 0.97;
          doorContainer.x += s.doorVelX * delta;
          doorContainer.y += s.doorVelY * delta;
          doorContainer.x = Math.max(40, Math.min(VIEW_W - 40, doorContainer.x));
          doorContainer.y = Math.max(BAND_TOP + 40, Math.min(GROUND_Y, doorContainer.y));
          const ddx = doorContainer.x - player.x;
          const ddy = (doorContainer.y + DOOR_CY) - (player.y - 16);
          if (Math.hypot(ddx, ddy) < 30) { triggerDeath('SAW'); return; }
        }
      }

      // RUN 3 — endcard scene: any input or reaching the new door → store.
      if (s.activeRun === 3 && !s.endcardActive) {
        const moving = !!(s.keys['ArrowLeft'] || s.keys['KeyA'] || s.keys['ArrowRight'] || s.keys['KeyD'] ||
          s.keys['Space'] || s.keys['ArrowUp'] || s.keys['KeyW']);
        const atDoor = Math.abs(player.x - secondDoorContainer.x) < 24 && player.y > GROUND_Y - 40;
        if (moving || atDoor) { triggerDeath('REDIRECT'); return; }
      }
    };

    app.ticker.add(ticker);
    drawLevel();

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

  // --- SKIP LEVEL trap: collapse the floor ---
  const executeSkipAction = () => {
    const s = stateRef.current;
    if (!s.skipButtonActive || s.skipClicked) return;
    s.skipClicked = true;
    s.floorCollapsed = true;
    setIsSkipVisible(false);
    onLogEvent('SKIP_CLICK', '[Skip Clicked] Fake SKIP LEVEL — floor collapses!');
    drawFloorRef.current(true);
  };

  const press = (key: string) => {
    stateRef.current.keys[key] = true;
    firstMove();
    if (stateRef.current.activeRun === 3 && !stateRef.current.endcardActive && !stateRef.current.splashActive) {
      triggerDeathRef.current?.('REDIRECT');
    }
  };
  const release = (key: string) => { delete stateRef.current.keys[key]; };

  const togglePause = () => {
    const next = !stateRef.current.paused;
    stateRef.current.paused = next;
    setIsPaused(next);
  };

  const playFromStart = () => {
    stateRef.current.paused = false;
    setIsPaused(false);
    setShowHand(true);
    onRunComplete(1);
    resetGameRef.current();
    onLogEvent('PLAY', '[Play] Playable restarted from the beginning');
  };

  // On-screen control built from the real game button sprites (hollow ↔ filled).
  const ControlButton = ({ keyCode, hollow, filled, label, width }: {
    keyCode: string; hollow: string; filled: string; label: string; width: number;
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
    position: 'absolute', inset: 0, zIndex: 40, display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  };
  const pix: CSSProperties = { imageRendering: 'pixelated' };

  return (
    <div style={{ position: 'relative', userSelect: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @keyframes ld-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes ld-fade { from{opacity:0} to{opacity:1} }
      `}</style>

      <button
        onClick={playFromStart}
        style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', borderRadius: 10, background: '#10b981', color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: 1, border: 'none', cursor: 'pointer', boxShadow: '0 6px 16px rgba(16,185,129,0.35)' }}
      >
        <Play size={18} fill="#fff" /> PLAY
      </button>

      {orientation === 'vertical' ? (
        /* PORTRAIT MODE (VERTICAL RETRO PHONE VIEWPORT) */
        <div
          id="game-container"
          style={{
            position: 'relative',
            width: '360px',
            height: '640px',
            backgroundColor: '#c5802b',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '36px 20px 24px 20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Top: HUD */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <LevelIndicators />
            <GameTitle />
          </div>

          {/* Center: 16:9 Canvas Viewport */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              overflow: 'hidden',
              border: '4px solid #231708',
              backgroundColor: '#c5802b',
            }}
          >
            <div
              ref={containerRef}
              style={{ width: '100%', height: '100%' }}
            />

            {/* Small overlaid pause/restart inside canvas corner */}
            <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 20, display: 'flex', gap: 6 }}>
              <button onClick={togglePause} title="Pause"
                style={{ width: 28, height: 28, borderRadius: 4, background: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, border: 'none', cursor: 'pointer' }}>
                {isPaused ? <Play size={12} fill={INK} /> : <Pause size={12} fill={INK} />}
              </button>
              <button onClick={() => resetGameRef.current()} title="Restart"
                style={{ width: 28, height: 28, borderRadius: 4, background: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, border: 'none', cursor: 'pointer' }}>
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Tutorial hand */}
            {showHand && !showSplash && (
              <div style={{ position: 'absolute', bottom: '15%', left: '22%', zIndex: 20, fontSize: 24, pointerEvents: 'none', animation: 'ld-bounce 1s infinite', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}>
                👆
              </div>
            )}

            {/* SKIP LEVEL fake button (scaled down for vertical) */}
            {isSkipVisible && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '15%', display: 'flex', justifyContent: 'center', zIndex: 30, animation: 'ld-bounce 0.9s infinite' }}>
                <img src={A.btnSkip} alt="Skip level" onClick={executeSkipAction}
                  style={{ ...pix, width: 140, cursor: 'pointer', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }} />
              </div>
            )}
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <ControlButton keyCode="ArrowLeft" hollow={A.btnLeftHollow} filled={A.btnLeftFilled} label="Move left" width={92} />
              <ControlButton keyCode="ArrowRight" hollow={A.btnRightHollow} filled={A.btnRightFilled} label="Move right" width={92} />
            </div>
            <div>
              <ControlButton keyCode="Space" hollow={A.btnJumpHollow} filled={A.btnJumpFilled} label="Jump" width={100} />
            </div>
          </div>

          {/* Bottom Bar (Mute & CTA) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px', marginTop: '16px' }}>
            <SoundButton />
            <InstallButton />
          </div>

          {/* Start-screen splash (fills the mobile frame) */}
          {showSplash && (
            <div style={{ ...overlayCenter, background: 'radial-gradient(circle at 50% 40%, #d2912f, #9c5f1d)' }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>😈</div>
              <div style={{ fontSize: 26, fontFamily: '"Press Start 2P", monospace', fontWeight: 'normal', color: INK, textAlign: 'center', lineHeight: '36px' }}>LEVEL DEVIL</div>
              <div style={{ marginTop: 12, fontSize: 11, fontFamily: '"Press Start 2P", monospace', fontWeight: 'normal', letterSpacing: 1, color: 'rgba(35,23,8,0.7)' }}>REACH THE DOOR</div>
            </div>
          )}

          {/* Endcard / CTA (fills the mobile frame) */}
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
              <span style={{ color: '#71717a', fontSize: 9, marginTop: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Free Playable • Ad Endcard</span>
            </div>
          )}
        </div>
      ) : (
        /* LANDSCAPE MODE (HORIZONTAL RETRO BOARD) */
        <div
          id="game-container"
          style={{
            position: 'relative',
            width: '800px',
            maxWidth: '100%',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            borderRadius: '16px',
            border: '8px solid #231708',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            backgroundColor: '#c5802b',
          }}
        >
          {/* Top-left: sound / pause / restart */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
            <SoundButton style={{ width: 36, height: 36, border: '3px solid #231708' }} />
            <button onClick={togglePause} title="Pause"
              style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, border: 'none', cursor: 'pointer' }}>
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button onClick={() => resetGameRef.current()} title="Restart"
              style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, border: 'none', cursor: 'pointer' }}>
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Top-right: Install Now */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
            <InstallButton style={{ height: 36, padding: '0 14px', fontSize: '10px', border: '3px solid #231708' }} />
          </div>

          {/* Canvas inside horizontal viewport */}
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%' }}
          />

          {/* Bottom-left: movement (real game buttons) */}
          <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <ControlButton keyCode="ArrowLeft" hollow={A.btnLeftHollow} filled={A.btnLeftFilled} label="Move left" width={92} />
            <ControlButton keyCode="ArrowRight" hollow={A.btnRightHollow} filled={A.btnRightFilled} label="Move right" width={92} />
          </div>

          {/* Bottom-right: jump */}
          <div style={{ position: 'absolute', bottom: 14, right: 16, zIndex: 20 }}>
            <ControlButton keyCode="Space" hollow={A.btnJumpHollow} filled={A.btnJumpFilled} label="Jump" width={96} />
          </div>

          {/* Tutorial hand */}
          {showHand && !showSplash && (
            <div style={{ position: 'absolute', bottom: 72, left: '22%', zIndex: 20, fontSize: 30, pointerEvents: 'none', animation: 'ld-bounce 1s infinite', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}>
              👆
            </div>
          )}

          {/* SKIP LEVEL fake button (real sprite) */}
          {isSkipVisible && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '20%', display: 'flex', justifyContent: 'center', zIndex: 30, animation: 'ld-bounce 0.9s infinite' }}>
              <img src={A.btnSkip} alt="Skip level" onClick={executeSkipAction}
                style={{ ...pix, width: 200, cursor: 'pointer', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }} />
            </div>
          )}

          {/* Start-screen splash */}
          {showSplash && (
            <div style={{ ...overlayCenter, background: 'radial-gradient(circle at 50% 40%, #d2912f, #9c5f1d)' }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>😈</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: INK, letterSpacing: -0.5 }}>LEVEL DEVIL</div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, letterSpacing: 3, color: 'rgba(35,23,8,0.7)' }}>REACH THE DOOR</div>
            </div>
          )}

          {/* Endcard / CTA */}
          {isCtaVisible && (
            <div style={{ ...overlayCenter, background: 'rgba(0,0,0,0.85)', padding: 24, textAlign: 'center', cursor: 'pointer', animation: 'ld-fade 0.3s ease' }}
              onClick={() => goToStore('endcard_tap')}>
              <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 30, letterSpacing: -0.5, marginBottom: 8, textTransform: 'uppercase' }}>YOU DIED... AGAIN?</span>
              <p style={{ color: '#d4d4d8', maxWidth: 340, fontSize: 14, marginBottom: 24 }}>
                Level Devil is brutal. Can you outsmart every moving spike and fake door?
              </p>
              <button onClick={(e) => { e.stopPropagation(); goToStore('cta_button'); }}
                style={{ padding: '16px 32px', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 18, borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,0.4)', borderBottom: '4px solid #047857', border: 'none', width: '100%', maxWidth: 280, cursor: 'pointer' }}>
                PLAY LEVEL DEVIL
              </button>
              <span style={{ color: '#71717a', fontSize: 10, marginTop: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Free Playable • Ad Endcard</span>
            </div>
          )}
        </div>
      )}

      <p style={{ marginTop: 12, fontSize: 11, color: '#a1865f', textAlign: 'center' }}>
        ⌨️ Move: ← / → or A / D · Jump: Space / ↑ / W · or use the on-screen buttons
      </p>
    </div>
  );
}

interface LevelDevilGameProps {
  config: GameConfig;
  activeRun: ActiveRun;
  currentTool: EditorTool;
  orientation: 'horizontal' | 'vertical';
  onConfigChange: (config: GameConfig) => void;
  onLogEvent: (type: string, msg: string) => void;
  onRunComplete: (nextRun: ActiveRun) => void;
  onDeath: () => void;
}

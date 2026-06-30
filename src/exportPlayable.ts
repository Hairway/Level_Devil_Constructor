import { PlayableProject } from './types';
import pixiRuntime from './vendor/pixi.min.js?raw';

const safeProjectJson = (project: PlayableProject) =>
  JSON.stringify(project, null, 2).replace(/<\/script/gi, '<\\/script');

const safeScript = (code: string) =>
  code.replace(/<\/script/gi, '<\\/script');

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] || char);

export const generateStandalonePlayable = (project: PlayableProject) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>${escapeHtml(project.name)}</title>
  <style>
    html,body,#app{margin:0;width:100%;height:100%;overflow:hidden;background:#c77b00;touch-action:none}
    body{font-family:Arial,sans-serif}
    #app{display:flex;align-items:center;justify-content:center}
    #stage{position:relative;width:min(100vw,56.25vh);height:min(177.7778vw,100vh);background:#c77b00;overflow:hidden}
    #level{position:absolute;left:2.8%;top:39.0625%;width:94.4%;height:21.875%;overflow:hidden;background:#e2a33c}
    canvas{display:block;width:100%;height:100%;image-rendering:pixelated}
    .hud{position:absolute;z-index:5;color:#231708;font-family:monospace;font-weight:900;letter-spacing:0;text-align:center;text-transform:uppercase;user-select:none}
    #title{left:7.5%;top:21.7%;width:85%;font-size:clamp(18px,4.1vw,44px)}
    #dots{left:33%;top:9.7%;width:34%;display:flex;gap:7px;justify-content:center}
    #dots i{width:19px;height:19px;border:4px solid #231708;box-sizing:border-box}
    .filled{background:#231708}
    button{position:absolute;z-index:6;border:0;border-radius:0;font-weight:900;color:#231708;background:#ffc164;box-shadow:inset 0 -6px 0 #b37111;cursor:pointer;touch-action:none}
    #install{left:57.8%;top:89.5%;width:35.6%;height:6.1%;font-size:clamp(8px,1.8vw,14px)}
    #sound{left:6.7%;top:89.5%;width:12%;aspect-ratio:1/1;background:#bf790f;color:#fff36b;font-size:clamp(18px,4vw,34px)}
    .ctrl{background:transparent;box-shadow:none;border:4px solid #ffd184;height:4.8%;font-size:0}
    #left{left:6.9%;top:75.8%;width:21.25%;clip-path:polygon(10% 50%,20% 20%,100% 20%,100% 80%,20% 80%)}
    #right{left:36.1%;top:75.8%;width:21.25%;clip-path:polygon(0 20%,90% 20%,100% 50%,90% 80%,0 80%)}
    #jump{left:71.5%;top:75.8%;width:21.25%;clip-path:polygon(0 70%,50% 10%,100% 70%,100% 90%,0 90%)}
    #skip{display:none;left:41%;top:31%;width:18%;height:6%;animation:bounce .8s infinite}
    #cta{display:none;position:absolute;inset:0;z-index:10;background:rgba(0,0,0,.92);color:white;align-items:center;justify-content:center;flex-direction:column;text-align:center;font-family:monospace;font-weight:900;padding:24px}
    #cta button{position:static;width:240px;height:52px;background:#10b981;color:white;box-shadow:inset 0 -6px 0 #047857}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    @media (orientation:landscape){
      #stage{width:min(100vw,177.7778vh);height:min(56.25vw,100vh)}
      #level{left:23.4375%;top:30.56%;width:53.125%;height:38.89%}
      #title{left:30%;top:16.4%;width:40%;font-size:clamp(18px,3vw,42px)}
      #dots{left:40.6%;top:5%;width:18.8%}
      #sound{left:3.75%;top:6.4%;width:6.7%}
      #install{left:76.25%;top:6.4%;width:20%;height:11.7%}
      #left{left:5%;top:83.3%;width:12%}
      #right{left:21.25%;top:83.3%;width:12%}
      #jump{left:83.2%;top:83.3%;width:12%}
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="stage">
      <div id="dots" class="hud"></div>
      <div id="title" class="hud">REACH THE DOOR</div>
      <div id="level"></div>
      <button id="sound">)))</button>
      <button id="install">Install Now</button>
      <button id="left" class="ctrl" data-key="ArrowLeft">Left</button>
      <button id="right" class="ctrl" data-key="ArrowRight">Right</button>
      <button id="jump" class="ctrl" data-key="Space">Jump</button>
      <button id="skip">SKIP</button>
      <div id="cta"><h1>YOU DIED... AGAIN?</h1><p>LEVEL DEVIL IS BRUTAL. CAN YOU OUTSMART IT?</p><button>PLAY NOW</button></div>
    </div>
  </div>
  <script>${safeScript(pixiRuntime)}</script>
  <script>
    const PROJECT = ${safeProjectJson(project)};
    const STORE_URL = 'https://play.google.com/store/apps/details?id=com.leveldevil';
    const VIEW_W = 800, VIEW_H = 328, GROUND_Y = 280, PLAYER_H = 36, DOOR_CY = -28;
    const COL_BG = 0xc77b00, COL_BAND = 0xe2a33c, COL_HI = 0xeab451, COL_INK = 0x231708, COL_BTN = 0xffc164;
    const app = new PIXI.Application({ width: VIEW_W, height: VIEW_H, backgroundColor: COL_BG, antialias: false });
    document.getElementById('level').appendChild(app.view);
    const g = new PIXI.Graphics();
    const spriteLayer = new PIXI.Container();
    app.stage.addChild(g, spriteLayer);
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    const spriteCache = new Map();
    const keys = {};
    let runIndex = 0, run, config, player, door, activeIds, firedIds, motionRunIds, splitIds, objectRuntime, doorTriggered, doorTimer, doorVx, doorVy, dead, skipActive, skipClicked, floorCollapsed;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const isBottom = (t) => t === 'spike' || t === 'pit';
    const ROLE = { spike: 'hazard', saw: 'hazard', fallingBlock: 'hazard', crusher: 'hazard', laser: 'hazard', pit: 'pit', platform: 'solid', button: 'decor' };
    const roleOf = (o) => o.role || ROLE[o.type] || 'decor';
    const motionOf = (o) => o.motion || (o.type === 'fallingBlock'
      ? { mode: 'fall', target: 'player', speed: 2, dirX: 1, dirY: 0, distance: 0, loop: false, startOn: 'trigger', delay: 0 }
      : { mode: 'static', target: 'player', speed: 2, dirX: 1, dirY: 0, distance: 0, loop: false, startOn: 'spawn', delay: 0 });
    const rtOf = (id) => objectRuntime.get(id);
    const objectRect = (o) => {
      const rt = rtOf(o.id) || o;
      if (isBottom(o.type)) return { x: rt.x - o.width / 2, y: rt.y - o.height, w: o.width, h: o.height };
      return { x: rt.x - o.width / 2, y: rt.y - o.height / 2, w: o.width, h: o.height };
    };

    const title = document.getElementById('title');
    const dots = document.getElementById('dots');
    const skip = document.getElementById('skip');
    const cta = document.getElementById('cta');

    function openStore() {
      try { if (window.mraid && window.mraid.open) return window.mraid.open(STORE_URL); } catch (e) {}
      window.open(STORE_URL, '_blank');
    }

    function loadRun(index) {
      runIndex = Math.min(index, PROJECT.runs.length - 1);
      run = PROJECT.runs[runIndex];
      config = run.config;
      resetRun();
    }

    function resetRun() {
      player = { x: config.playerSpawnX, y: GROUND_Y, vx: 0, vy: 0, grounded: false, face: 1 };
      door = { x: config.doorSpawnX, y: GROUND_Y };
      activeIds = new Set(config.objects.filter(o => o.initiallyActive).map(o => o.id));
      firedIds = new Set();
      splitIds = new Set();
      motionRunIds = new Set(config.objects.filter(o => motionOf(o).startOn === 'spawn').map(o => o.id));
      objectRuntime = new Map(config.objects.map(o => [o.id, { x: o.x, y: o.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 }]));
      doorTriggered = runIndex === 2;
      doorTimer = 0; doorVx = 0; doorVy = 0; dead = false; skipActive = false; skipClicked = false; floorCollapsed = false;
      skip.style.display = 'none';
      cta.style.display = 'none';
      title.textContent = runIndex === 2 ? 'TRY NEW DOOR' : 'REACH THE DOOR';
      dots.innerHTML = Array.from({ length: 5 }, (_, i) => '<i class="' + (i <= runIndex ? 'filled' : '') + '"></i>').join('');
      spriteCache.forEach(s => s.destroy());
      spriteCache.clear();
      spriteLayer.removeChildren();
      draw();
    }

    function ensureRt(id) {
      const o = config.objects.find(x => x.id === id);
      if (o && !objectRuntime.has(id)) objectRuntime.set(id, { x: o.x, y: o.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 });
    }

    function runAction(kind, targetId) {
      if (kind === 'none') return;
      if (kind === 'startDoorChase') { doorTriggered = true; return; }
      if (kind === 'collapseFloor') { floorCollapsed = true; return; }
      if (kind === 'nextRun') { loadRun(runIndex + 1); return; }
      if (kind === 'redirectCTA') { cta.style.display = 'flex'; dead = true; return; }
      if (kind === 'splitFloor') { activeIds.add(targetId); splitIds.add(targetId); motionRunIds.add(targetId); ensureRt(targetId); return; }
      if (kind === 'openPit') { activeIds.add(targetId); ensureRt(targetId); return; }
      activeIds.add(targetId); motionRunIds.add(targetId); ensureRt(targetId);
    }

    function activateTrigger(trigger) {
      if (firedIds.has(trigger.id)) return;
      firedIds.add(trigger.id);
      runAction(trigger.action, trigger.targetId);
    }

    function die(cause) {
      if (dead) return;
      dead = true;
      setTimeout(() => {
        const doorSolved = cause === 'SAW' && doorTriggered;
        const skipSolved = cause === 'PIT' && skipClicked;
        if (runIndex === 0 && doorSolved) loadRun(1);
        else if (runIndex === 1 && (doorSolved || skipSolved)) loadRun(2);
        else resetRun();
      }, 520);
    }

    function drawPlayer() {
      g.beginFill(COL_INK);
      g.drawRect(player.x - 6, player.y - PLAYER_H, 12, PLAYER_H);
      g.endFill();
    }

    function drawDoor() {
      g.beginFill(0xcfcfcf);
      g.drawRect(door.x - 20, door.y - 56, 40, 56);
      g.endFill();
      g.lineStyle(6, doorTriggered ? 0x8a1f10 : 0xb37111, 1);
      g.drawRect(door.x - 20, door.y - 56, 40, 56);
      if (doorTriggered) {
        g.lineStyle(0);
        g.beginFill(0x8a1f10);
        for (let i = -15; i <= 15; i += 15) g.drawPolygon([door.x + i, door.y - 62, door.x + i - 6, door.y - 50, door.x + i + 6, door.y - 50]);
        g.endFill();
      }
    }

    function drawObject(object) {
      if (object.type === 'pit') return; // pits are rendered by the floor
      const rt = rtOf(object.id);
      const active = activeIds.has(object.id) || object.initiallyActive;
      const appeared = rt ? rt.since >= (object.appearDelay || 0) : true;
      if (!active || !appeared) return;
      if (object.spriteUrl) return; // drawn by the sprite layer
      const p = rt || object;
      if (object.type === 'spike') {
        g.beginFill(COL_INK);
        for (let x = p.x - object.width / 2; x < p.x + object.width / 2; x += object.width / 3) {
          g.drawPolygon([x, p.y, x + object.width / 6, p.y - object.height, x + object.width / 3, p.y]);
        }
        g.endFill();
      } else if (object.type === 'saw') {
        g.beginFill(0x8a1f10);
        g.drawCircle(p.x, p.y, object.width / 2);
        g.endFill();
        g.lineStyle(3, COL_INK, .8);
        g.drawCircle(p.x, p.y, object.width / 3);
      } else if (object.type === 'fallingBlock') {
        g.beginFill(0x5b3410);
        g.lineStyle(3, COL_INK, .85);
        g.drawRect(p.x - object.width / 2, p.y - object.height / 2, object.width, object.height);
        g.endFill();
      } else if (object.type === 'crusher') {
        g.beginFill(0x3b2611);
        g.lineStyle(3, 0x8a1f10, .9);
        g.drawRect(p.x - object.width / 2, p.y - object.height / 2, object.width, object.height);
        g.endFill();
        g.beginFill(0x8a1f10);
        for (let x = p.x - object.width / 2; x < p.x + object.width / 2; x += object.width / 4) {
          g.drawPolygon([x, p.y + object.height / 2, x + object.width / 8, p.y + object.height / 2 + 13, x + object.width / 4, p.y + object.height / 2]);
        }
        g.endFill();
      } else if (object.type === 'laser') {
        g.beginFill(0xfef08a, .95);
        g.drawRect(p.x - object.width / 2, p.y - object.height / 2, object.width, object.height);
        g.endFill();
        g.lineStyle(3, 0xef4444, .85);
        g.moveTo(p.x - object.width / 2, p.y);
        g.lineTo(p.x + object.width / 2, p.y);
      } else if (object.type === 'platform') {
        g.beginFill(0xb37111);
        g.drawRect(p.x - object.width / 2, p.y - object.height / 2, object.width, object.height);
        g.endFill();
        g.beginFill(0xeab451, .85);
        g.drawRect(p.x - object.width / 2, p.y - object.height / 2, object.width, 4);
        g.endFill();
        g.lineStyle(2, COL_INK, .7);
        g.drawRect(p.x - object.width / 2, p.y - object.height / 2, object.width, object.height);
      } else if (object.type === 'button') {
        g.beginFill(COL_BTN);
        g.drawRect(p.x - object.width / 2, p.y - object.height / 2, object.width, object.height);
        g.endFill();
        g.beginFill(0xb37111);
        g.drawRect(p.x - object.width / 2, p.y + object.height / 2 - 6, object.width, 6);
        g.endFill();
      }
    }

    function syncSprites() {
      config.objects.forEach(o => {
        if (!o.spriteUrl) return;
        const rt = rtOf(o.id);
        const active = activeIds.has(o.id) || o.initiallyActive;
        const appeared = rt ? rt.since >= (o.appearDelay || 0) : true;
        let s = spriteCache.get(o.id);
        if (active && appeared) {
          if (!s) {
            s = PIXI.Sprite.from(o.spriteUrl);
            s.anchor.set(0.5, isBottom(o.type) ? 1 : 0.5);
            spriteLayer.addChild(s);
            spriteCache.set(o.id, s);
          }
          const p = rt || o;
          s.visible = true; s.width = o.width; s.height = o.height; s.x = p.x; s.y = p.y;
        } else if (s) {
          s.visible = false;
        }
      });
    }

    function draw() {
      g.clear();
      g.beginFill(COL_BAND);
      g.drawRect(0, 0, VIEW_W, GROUND_Y + 8);
      g.endFill();
      g.beginFill(COL_HI, .7);
      g.drawRect(0, 0, VIEW_W, 5);
      g.endFill();
      g.beginFill(0x000000, .12);
      g.drawRect(0, GROUND_Y + 8, VIEW_W, VIEW_H - GROUND_Y - 8);
      g.endFill();
      config.objects.filter(o => o.type === 'pit' && activeIds.has(o.id)).forEach(pit => {
        const rt = rtOf(pit.id);
        const prog = splitIds.has(pit.id) ? (rt ? rt.split : 0) : 1;
        const hw = pit.width * Math.max(0, Math.min(1, prog));
        if (hw <= 0) return;
        g.beginFill(COL_BG);
        g.drawRect(pit.x - hw / 2, GROUND_Y - 2, hw, VIEW_H - GROUND_Y + 16);
        g.endFill();
      });
      if (floorCollapsed) {
        g.beginFill(COL_BG);
        g.drawRect(90, GROUND_Y - 2, VIEW_W - 180, VIEW_H - GROUND_Y + 16);
        g.endFill();
      }
      config.objects.forEach(drawObject);
      drawDoor();
      drawPlayer();
      syncSprites();
    }

    function markInput() {
      if (runIndex === 2 && !dead) {
        cta.style.display = 'flex';
        dead = true;
      }
    }

    // tap clickable button objects to fire their action
    app.stage.on('pointerdown', (e) => {
      if (dead || !config) return;
      const pos = e.data.getLocalPosition(app.stage);
      for (const o of config.objects) {
        if (!o.clickable || !o.action || o.action.kind === 'none') continue;
        const rt = rtOf(o.id);
        const active = activeIds.has(o.id) || o.initiallyActive;
        const appeared = rt ? rt.since >= (o.appearDelay || 0) : true;
        if (!active || !appeared) continue;
        const r = objectRect(o);
        if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
          runAction(o.action.kind, o.action.targetId);
          break;
        }
      }
    });

    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'ArrowUp', 'KeyW'].includes(e.code)) markInput();
    });
    window.addEventListener('keyup', e => delete keys[e.code]);
    document.querySelectorAll('[data-key]').forEach(btn => {
      const key = btn.dataset.key;
      const down = e => { e.preventDefault(); keys[key] = true; markInput(); };
      const up = e => { e.preventDefault(); delete keys[key]; };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
    document.getElementById('install').onclick = openStore;
    cta.onclick = openStore;
    skip.onclick = () => {
      if (!skipActive || skipClicked) return;
      skipClicked = true;
      floorCollapsed = true;
      skip.style.display = 'none';
    };

    app.ticker.add(({ deltaTime }) => {
      if (dead) { draw(); return; }
      const delta = deltaTime || 1;
      player.vx = 0;
      if (keys.ArrowLeft || keys.KeyA) player.vx = -config.playerSpeed;
      if (keys.ArrowRight || keys.KeyD) player.vx = config.playerSpeed;
      if ((keys.Space || keys.ArrowUp || keys.KeyW) && player.grounded) {
        player.vy = -config.jumpForce;
        player.grounded = false;
      }
      player.vy += config.gravity * delta;
      player.x = clamp(player.x + player.vx * delta, 50, VIEW_W - 50);
      player.y += player.vy * delta;
      if (player.y > VIEW_H + 40) return die('PIT');

      // land on solid platforms (one-way)
      let landed = false;
      config.objects.forEach(o => {
        if (roleOf(o) !== 'solid') return;
        if (!(activeIds.has(o.id) || o.initiallyActive)) return;
        const r = objectRect(o);
        const prevFoot = player.y - player.vy * delta;
        if (player.vy >= 0 && player.x > r.x && player.x < r.x + r.w && prevFoot <= r.y + 2 && player.y >= r.y) {
          player.y = r.y; player.vy = 0; player.grounded = true; landed = true;
        }
      });

      const inPit = config.objects.some(o => {
        if (o.type !== 'pit' || !activeIds.has(o.id)) return false;
        const rt = rtOf(o.id);
        const prog = splitIds.has(o.id) ? (rt ? rt.split : 0) : 1;
        if (prog < 0.35) return false;
        const hw = o.width * prog / 2;
        return player.x > o.x - hw && player.x < o.x + hw && player.y >= GROUND_Y - 4;
      });
      if (!landed && player.y >= GROUND_Y) {
        if (!floorCollapsed && !inPit) { player.y = GROUND_Y; player.vy = 0; player.grounded = true; }
        else player.grounded = false;
      }

      // advance timers, reveal-on-delay, floor split and motion
      config.objects.forEach(o => {
        const active = activeIds.has(o.id) || o.initiallyActive;
        if (!active) return;
        const rt = rtOf(o.id);
        if (!rt) return;
        rt.since += delta / 60;
        if (o.type === 'pit' && splitIds.has(o.id) && rt.split < 1) rt.split = Math.min(1, rt.split + delta / 24);
        const m = motionOf(o);
        if (!motionRunIds.has(o.id) || rt.since < m.delay) return;
        if (m.mode === 'fall') {
          rt.vy = Math.min(rt.vy + 0.62 * delta, 13);
          rt.y = Math.min(rt.y + rt.vy * delta, GROUND_Y - o.height / 2 + 1);
        } else if (m.mode === 'linear') {
          const len = Math.hypot(m.dirX, m.dirY) || 1;
          const sx = (m.dirX / len) * m.speed * rt.pong * delta;
          const sy = (m.dirY / len) * m.speed * rt.pong * delta;
          rt.x += sx; rt.y += sy; rt.traveled += Math.hypot(sx, sy);
          if (m.distance > 0 && rt.traveled >= m.distance) {
            if (m.loop) { rt.pong *= -1; rt.traveled = 0; } else { rt.pong = 0; }
          }
        } else if (m.mode === 'chase') {
          const tx = m.target === 'door' ? door.x : player.x;
          const ty = m.target === 'door' ? door.y + DOOR_CY : player.y - PLAYER_H / 2;
          const dx = tx - rt.x, dy = ty - rt.y, d = Math.hypot(dx, dy) || 1;
          const st = Math.min(m.speed * delta, d);
          rt.x += dx / d * st; rt.y += dy / d * st;
        }
        rt.x = clamp(rt.x, 0, VIEW_W);
        rt.y = clamp(rt.y, 0, GROUND_Y + 40);
      });

      const pRect = { x: player.x - 10, y: player.y - PLAYER_H, w: 20, h: PLAYER_H };
      config.triggers.forEach(t => {
        if (overlap(pRect, { x: t.x, y: t.y, w: t.width, h: t.height })) activateTrigger(t);
      });

      for (const o of config.objects) {
        const active = activeIds.has(o.id) || o.initiallyActive;
        if (!active) continue;
        const rt = rtOf(o.id);
        if ((o.appearDelay || 0) > 0 && rt && rt.since < o.appearDelay) continue;
        const wr = objectRect(o);
        const touch = overlap(pRect, wr);
        if (touch && o.action && o.action.kind !== 'none' && !o.clickable) {
          const k = 'obj:' + o.id;
          if (!firedIds.has(k)) { firedIds.add(k); runAction(o.action.kind, o.action.targetId); }
        }
        if (roleOf(o) !== 'hazard') continue;
        const cx = rt ? rt.x : o.x;
        if (o.type === 'spike') {
          if (Math.abs(player.x - cx) < o.width / 2 && player.y > GROUND_Y - 12) return die('SPIKE');
          continue;
        }
        if (touch) return die(o.type === 'saw' ? 'SAW' : o.type === 'laser' ? 'LASER' : 'CRUSH');
      }

      const hasDoorTrigger = config.triggers.some(t => t.action === 'startDoorChase');
      if (runIndex === 0 && !hasDoorTrigger && !doorTriggered && door.x - player.x < config.triggerDistance) doorTriggered = true;
      if (runIndex === 1 && !doorTriggered && (player.vx || keys.Space || keys.ArrowUp || keys.KeyW)) doorTriggered = true;
      if ((runIndex === 0 || runIndex === 1) && doorTriggered) {
        doorTimer += delta / 60;
        const speed = Math.min(config.doorAccelSpeed + doorTimer * 1.5, config.doorAccelSpeed + 7);
        if (runIndex === 1 && doorTimer > config.skipButtonDelay && !skipClicked && !skipActive) {
          skipActive = true;
          skip.style.display = 'block';
        }
        doorVx = clamp((doorVx + Math.sign(player.x - door.x) * config.doorHoming * delta) * .97, -speed, speed);
        doorVy = clamp((doorVy + Math.sign((player.y - 16) - (door.y - 28)) * config.doorHoming * delta) * .97, -speed, speed);
        door.x = clamp(door.x + doorVx * delta, 40, VIEW_W - 40);
        door.y = clamp(door.y + doorVy * delta, 40, GROUND_Y);
        if (Math.hypot(door.x - player.x, door.y - 28 - (player.y - 16)) < 30) return die('SAW');
      }
      draw();
    });

    loadRun(0);
  </script>
</body>
</html>`;

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

export const generateStandalonePlayable = (project: PlayableProject) => {
  const firstConfig = project.runs[0]?.config || ({} as PlayableProject['runs'][number]['config']);
  const cssBg = firstConfig.bgColor || '#c77b00';
  const cssBand = firstConfig.groundColor || '#e2a33c';
  const installText = escapeHtml(firstConfig.installText || 'Install Now');
  const ctaHeadline = escapeHtml(firstConfig.ctaHeadline || 'YOU DIED... AGAIN?');
  const ctaText = escapeHtml(firstConfig.ctaText || 'LEVEL DEVIL IS BRUTAL. CAN YOU OUTSMART IT?');
  const ctaButton = escapeHtml(firstConfig.ctaButton || 'PLAY NOW');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>${escapeHtml(project.name)}</title>
  <style>
    html,body,#app{margin:0;width:100%;height:100%;overflow:hidden;background:${cssBg};touch-action:none}
    body{font-family:Arial,sans-serif}
    #app{display:flex;align-items:center;justify-content:center}
    #stage{position:relative;width:min(100vw,56.25vh);height:min(177.7778vw,100vh);background:${cssBg};overflow:hidden}
    #level{position:absolute;left:2.8%;top:39.0625%;width:94.4%;height:21.875%;overflow:hidden;background:${cssBand}}
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
      <button id="install">${installText}</button>
      <button id="left" class="ctrl" data-key="ArrowLeft">Left</button>
      <button id="right" class="ctrl" data-key="ArrowRight">Right</button>
      <button id="jump" class="ctrl" data-key="Space">Jump</button>
      <button id="skip">SKIP</button>
      <div id="cta"><h1>${ctaHeadline}</h1><p>${ctaText}</p><button>${ctaButton}</button></div>
    </div>
  </div>
  <script>${safeScript(pixiRuntime)}</script>
  <script>
    const PROJECT = ${safeProjectJson(project)};
    const STORE_URL = 'https://play.google.com/store/apps/details?id=com.leveldevil';
    const VIEW_W = 800, VIEW_H = 328, GROUND_Y = 280, PLAYER_H = 36, PLAYER_W = 20, DOOR_CY = -28;
    const COL_INK = 0x231708, COL_BTN = 0xffc164;
    const hx = (h, f) => { if (!h) return f; const s = ('' + h).replace('#', ''); const full = s.length === 3 ? s.split('').map(c => c + c).join('') : s; const n = parseInt(full, 16); return (isFinite(n) && full.length === 6) ? n : f; };
    const lighten = (n, a) => { const r = Math.min(255, Math.round(((n >> 16) & 255) + 255 * a)); const g = Math.min(255, Math.round(((n >> 8) & 255) + 255 * a)); const b = Math.min(255, Math.round((n & 255) + 255 * a)); return (r << 16) | (g << 8) | b; };
    let COL_BG = hx('${cssBg}', 0xc77b00), COL_BAND = hx('${cssBand}', 0xe2a33c), COL_HI = lighten(COL_BAND, 0.12);
    const app = new PIXI.Application({ width: VIEW_W, height: VIEW_H, backgroundColor: COL_BG, antialias: false });
    document.getElementById('level').appendChild(app.view);
    const g = new PIXI.Graphics();          // floor / pits / door / player (immediate mode)
    const objLayer = new PIXI.Container();  // per-object displays (rotation / spin / opacity / text)
    app.stage.addChild(g, objLayer);
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    const objCache = new Map();
    const keys = {};
    let runIndex = 0, run, config, player, door, activeIds, hiddenIds, firedIds, motionRunIds, splitIds, objectRuntime,
      triggerTimers, doorTriggered, doorTimer, doorVx, doorVy, dead, skipActive, skipClicked, floorCollapsed, checkpoint = null, gOff = 0;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const isBottom = (t) => t === 'spike' || t === 'pit';
    const ROLE = { spike: 'hazard', saw: 'hazard', fallingBlock: 'hazard', crusher: 'hazard', laser: 'hazard', pit: 'pit', platform: 'solid', button: 'decor', text: 'decor' };
    const roleOf = (o) => o.role || ROLE[o.type] || 'decor';
    const motionOf = (o) => o.motion || (o.type === 'fallingBlock'
      ? { mode: 'fall', target: 'player', speed: 2, dirX: 1, dirY: 0, distance: 0, loop: false, startOn: 'trigger', delay: 0 }
      : { mode: 'static', target: 'player', speed: 2, dirX: 1, dirY: 0, distance: 0, loop: false, startOn: 'spawn', delay: 0 });
    const rtOf = (id) => objectRuntime.get(id);
    const isActive = (o) => (activeIds.has(o.id) || o.initiallyActive) && !hiddenIds.has(o.id);
    const present = (o, rt) => { const s = rt ? rt.since : 0; if (s < (o.appearDelay || 0)) return false; if (o.vanishAfter && s >= (o.appearDelay || 0) + o.vanishAfter) return false; return true; };
    const isLethal = (o, moving) => { const base = o.deadly !== undefined ? o.deadly : roleOf(o) === 'hazard'; if (!base) return false; return o.deadlyWhileMoving ? !!moving : true; };
    const objectRect = (o) => {
      const rt = rtOf(o.id) || o;
      const base = isBottom(o.type)
        ? { x: -o.width / 2, y: -o.height, w: o.width, h: o.height }
        : { x: -o.width / 2, y: -o.height / 2, w: o.width, h: o.height };
      if (!o.rotation) return { x: rt.x + base.x, y: rt.y + base.y, w: base.w, h: base.h };
      const t = o.rotation * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const x of [base.x, base.x + base.w]) for (const y of [base.y, base.y + base.h]) {
        const rx = x * c - y * s, ry = x * s + y * c;
        minX = Math.min(minX, rx); maxX = Math.max(maxX, rx); minY = Math.min(minY, ry); maxY = Math.max(maxY, ry);
      }
      return { x: rt.x + minX, y: rt.y + minY, w: maxX - minX, h: maxY - minY };
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
      checkpoint = null; // fresh run starts from its own spawn
      resetRun();
    }

    function resetRun() {
      COL_BG = hx(config.bgColor, 0xc77b00);
      COL_BAND = hx(config.groundColor, 0xe2a33c);
      COL_HI = lighten(COL_BAND, 0.12);
      gOff = config.groundOffset || 0;
      objLayer.y = gOff;
      app.renderer.background.color = COL_BG;
      player = { x: checkpoint ? checkpoint.x : config.playerSpawnX, y: checkpoint ? checkpoint.y : GROUND_Y, vx: 0, vy: 0, grounded: false, face: 1 };
      door = { x: config.doorSpawnX, y: GROUND_Y };
      activeIds = new Set(config.objects.filter(o => o.initiallyActive).map(o => o.id));
      hiddenIds = new Set();
      firedIds = new Set();
      splitIds = new Set();
      triggerTimers = new Map();
      motionRunIds = new Set(config.objects.filter(o => motionOf(o).startOn === 'spawn').map(o => o.id));
      objectRuntime = new Map(config.objects.map(o => [o.id, { x: o.x, y: o.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 }]));
      doorTriggered = runIndex === 2;
      doorTimer = 0; doorVx = 0; doorVy = 0; dead = false; skipActive = false; skipClicked = false; floorCollapsed = false;
      skip.style.display = 'none';
      cta.style.display = 'none';
      title.textContent = config.title || (runIndex === 2 ? 'TRY NEW DOOR' : 'REACH THE DOOR');
      dots.innerHTML = Array.from({ length: 5 }, (_, i) => '<i class="' + (i <= runIndex ? 'filled' : '') + '"></i>').join('');
      objCache.forEach(s => s.destroy());
      objCache.clear();
      objLayer.removeChildren();
      draw();
    }

    function ensureRt(id) {
      const o = config.objects.find(x => x.id === id);
      if (o && !objectRuntime.has(id)) objectRuntime.set(id, { x: o.x, y: o.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 });
    }

    function fireTrigger(t) {
      runAction(t.action, t.targetId);
      (t.links || []).forEach(l => runAction(l.action, l.targetId));
    }
    function fireObjectAction(o) {
      if (o.action && o.action.kind !== 'none') runAction(o.action.kind, o.action.targetId);
      (o.links || []).forEach(l => runAction(l.action, l.targetId));
    }

    function runAction(kind, targetId) {
      if (kind === 'none') return;
      if (kind === 'startDoorChase') { doorTriggered = true; return; }
      if (kind === 'collapseFloor') { floorCollapsed = true; return; }
      if (kind === 'nextRun') { loadRun(runIndex + 1); return; }
      if (kind === 'win') { loadRun(runIndex + 1); return; }
      if (kind === 'redirectCTA') { cta.style.display = 'flex'; dead = true; return; }
      if (kind === 'chain') { const c = config.triggers.find(x => x.id === targetId); if (c && !firedIds.has(c.id)) { firedIds.add(c.id); fireTrigger(c); } return; }
      if (kind === 'teleport') { const to = config.objects.find(x => x.id === targetId); const rt = to ? rtOf(targetId) : null; player.x = to ? (rt ? rt.x : to.x) : door.x; player.y = to ? (rt ? rt.y : to.y) : GROUND_Y; player.vy = 0; return; }
      if (kind === 'checkpoint') { checkpoint = { x: player.x, y: GROUND_Y }; return; }
      if (kind === 'deactivate') { hiddenIds.add(targetId); activeIds.delete(targetId); motionRunIds.delete(targetId); return; }
      if (kind === 'toggle') { const o = config.objects.find(x => x.id === targetId); if (o && isActive(o)) { hiddenIds.add(targetId); activeIds.delete(targetId); motionRunIds.delete(targetId); } else { hiddenIds.delete(targetId); activeIds.add(targetId); motionRunIds.add(targetId); ensureRt(targetId); } return; }
      if (kind === 'splitFloor') { hiddenIds.delete(targetId); activeIds.add(targetId); splitIds.add(targetId); motionRunIds.add(targetId); ensureRt(targetId); return; }
      if (kind === 'openPit') { hiddenIds.delete(targetId); activeIds.add(targetId); ensureRt(targetId); return; }
      // activate
      hiddenIds.delete(targetId); activeIds.add(targetId); motionRunIds.add(targetId); ensureRt(targetId);
    }

    function activateTrigger(t) {
      if (firedIds.has(t.id)) return;
      firedIds.add(t.id);
      fireTrigger(t);
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

    // ---- per-object display (built once, cached; transform/visibility updated per frame) ----
    function buildDisplay(o) {
      const w = o.width, h = o.height;
      const col = o.color ? hx(o.color, null) : null;
      if (o.spriteUrl && o.type !== 'button' && o.type !== 'text') {
        const s = PIXI.Sprite.from(o.spriteUrl); s.anchor.set(0.5, isBottom(o.type) ? 1 : 0.5); s.width = w; s.height = h; if (col != null) s.tint = col; return s;
      }
      if (o.type === 'text') {
        const t = new PIXI.Text(o.text || o.label || '', { fill: o.textColor ? hx(o.textColor, 0xffffff) : (col != null ? col : 0xffffff), fontSize: o.fontSize || Math.max(10, h), fontFamily: o.fontFamily || 'Arial', fontWeight: 'bold', align: 'center' });
        t.anchor.set(0.5); t.resolution = 2; return t;
      }
      if (o.type === 'button') {
        const box = new PIXI.Container();
        if (o.spriteUrl) { const s = PIXI.Sprite.from(o.spriteUrl); s.anchor.set(0.5); s.width = w; s.height = h; if (col != null) s.tint = col; box.addChild(s); }
        else { const gg = new PIXI.Graphics(); gg.beginFill(col != null ? col : COL_BTN); gg.drawRoundedRect(-w / 2, -h / 2, w, h, 6); gg.endFill(); gg.beginFill(0xb37111); gg.drawRect(-w / 2, h / 2 - 5, w, 5); gg.endFill(); box.addChild(gg); }
        const lbl = o.text != null ? o.text : (o.label || '');
        if (lbl) { const tt = new PIXI.Text(('' + lbl).toUpperCase(), { fill: o.textColor ? hx(o.textColor, COL_INK) : COL_INK, fontSize: Math.min(14, h - 8), fontFamily: o.fontFamily || 'monospace', fontWeight: 'bold' }); tt.anchor.set(0.5); tt.resolution = 2; box.addChild(tt); }
        box.eventMode = 'static'; box.cursor = 'pointer'; return box;
      }
      const gg = new PIXI.Graphics();
      if (o.type === 'spike') { gg.beginFill(col != null ? col : COL_INK); for (let x = -w / 2; x < w / 2; x += w / 3) gg.drawPolygon([x, 0, x + w / 6, -h, x + w / 3, 0]); gg.endFill(); }
      else if (o.type === 'saw') { gg.beginFill(col != null ? col : 0x8a1f10); gg.drawCircle(0, 0, w / 2); gg.endFill(); gg.lineStyle(3, COL_INK, .8); gg.drawCircle(0, 0, w / 3); }
      else if (o.type === 'fallingBlock') { gg.beginFill(col != null ? col : 0x5b3410); gg.lineStyle(3, COL_INK, .85); gg.drawRect(-w / 2, -h / 2, w, h); gg.endFill(); }
      else if (o.type === 'crusher') { gg.beginFill(col != null ? col : 0x3b2611); gg.lineStyle(3, 0x8a1f10, .9); gg.drawRect(-w / 2, -h / 2, w, h); gg.endFill(); gg.beginFill(0x8a1f10); for (let x = -w / 2; x < w / 2; x += w / 4) gg.drawPolygon([x, h / 2, x + w / 8, h / 2 + 13, x + w / 4, h / 2]); gg.endFill(); }
      else if (o.type === 'laser') { gg.beginFill(col != null ? col : 0xfef08a, .95); gg.drawRect(-w / 2, -h / 2, w, h); gg.endFill(); gg.lineStyle(3, 0xef4444, .85); gg.moveTo(-w / 2, 0); gg.lineTo(w / 2, 0); }
      else if (o.type === 'platform') { gg.beginFill(col != null ? col : 0xb37111); gg.drawRect(-w / 2, -h / 2, w, h); gg.endFill(); gg.beginFill(0xeab451, .85); gg.drawRect(-w / 2, -h / 2, w, 4); gg.endFill(); gg.lineStyle(2, COL_INK, .7); gg.drawRect(-w / 2, -h / 2, w, h); }
      else { gg.beginFill(col != null ? col : 0x777777); gg.drawRect(-w / 2, -h / 2, w, h); gg.endFill(); }
      return gg;
    }

    function syncObjects() {
      config.objects.forEach(o => {
        if (o.type === 'pit') return; // pits are drawn into the floor
        const rt = rtOf(o.id) || o;
        rt.moving = Math.abs(rt.x - (rt.lastX != null ? rt.lastX : rt.x)) > 0.05 || Math.abs(rt.y - (rt.lastY != null ? rt.lastY : rt.y)) > 0.05;
        rt.lastX = rt.x; rt.lastY = rt.y;
        const show = isActive(o) && present(o, rtOf(o.id));
        let d = objCache.get(o.id);
        if (show && !d) {
          d = buildDisplay(o); objLayer.addChild(d); objCache.set(o.id, d);
          if (o.type === 'button' || o.clickable) d.on('pointerdown', (e) => { e.stopPropagation && e.stopPropagation(); if (!dead) fireObjectAction(o); });
        }
        if (!d) return;
        d.x = rt.x; d.y = rt.y;
        d.rotation = (o.rotation || 0) * Math.PI / 180 + (rt.spinAngle || 0);
        if ('alpha' in d) d.alpha = o.opacity != null ? o.opacity : 1;
        d.visible = show;
      });
    }

    function draw() {
      g.clear();
      g.beginFill(COL_BAND); g.drawRect(0, 0, VIEW_W, GROUND_Y + 8); g.endFill();
      g.beginFill(COL_HI, .7); g.drawRect(0, 0, VIEW_W, 5); g.endFill();
      g.beginFill(0x000000, .12); g.drawRect(0, GROUND_Y + 8, VIEW_W, VIEW_H - GROUND_Y - 8); g.endFill();
      config.objects.filter(o => o.type === 'pit' && activeIds.has(o.id)).forEach(pit => {
        const rt = rtOf(pit.id);
        const prog = splitIds.has(pit.id) ? (rt ? rt.split : 0) : 1;
        const hw = pit.width * Math.max(0, Math.min(1, prog));
        if (hw <= 0) return;
        g.beginFill(COL_BG); g.drawRect(pit.x - hw / 2, GROUND_Y - 2, hw, VIEW_H - GROUND_Y + 16); g.endFill();
      });
      if (floorCollapsed || config.noBaseGround) { g.beginFill(COL_BG); g.drawRect(0, GROUND_Y - 2, VIEW_W, VIEW_H - GROUND_Y + 16); g.endFill(); }
      // door
      g.beginFill(0xcfcfcf); g.drawRect(door.x - 20, door.y - 56 + gOff, 40, 56); g.endFill();
      g.lineStyle(6, doorTriggered ? 0x8a1f10 : 0xb37111, 1); g.drawRect(door.x - 20, door.y - 56 + gOff, 40, 56); g.lineStyle(0);
      // player
      g.beginFill(COL_INK); g.drawRect(player.x - 6, player.y - PLAYER_H + gOff, 12, PLAYER_H); g.endFill();
      syncObjects();
    }

    function markInput() { if (runIndex === 2 && !dead) { cta.style.display = 'flex'; dead = true; } }

    app.stage.on('pointerdown', (e) => {
      if (dead || !config) return;
      const pos = e.data.getLocalPosition(app.stage);
      for (const o of config.objects) {
        if (!o.clickable || !((o.action && o.action.kind !== 'none') || (o.links && o.links.length))) continue;
        if (!(isActive(o) && present(o, rtOf(o.id)))) continue;
        const r = objectRect(o);
        if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y + gOff && pos.y <= r.y + r.h + gOff) { fireObjectAction(o); break; }
      }
    });

    window.addEventListener('keydown', e => { keys[e.code] = true; if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'ArrowUp', 'KeyW'].includes(e.code)) markInput(); });
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
    skip.onclick = () => { if (!skipActive || skipClicked) return; skipClicked = true; floorCollapsed = true; skip.style.display = 'none'; };

    app.ticker.add(({ deltaTime }) => {
      if (dead) { draw(); return; }
      const delta = deltaTime || 1;
      player.vx = 0;
      if (keys.ArrowLeft || keys.KeyA) player.vx = -config.playerSpeed;
      if (keys.ArrowRight || keys.KeyD) player.vx = config.playerSpeed;
      if ((keys.Space || keys.ArrowUp || keys.KeyW) && player.grounded) { player.vy = -config.jumpForce; player.grounded = false; }
      player.vy += config.gravity * delta;
      player.x = clamp(player.x + player.vx * delta, PLAYER_W / 2, VIEW_W - PLAYER_W / 2);
      player.y += player.vy * delta;

      // force zones (conveyors / wind)
      config.triggers.forEach(t => {
        if (!t.pushX && !t.pushY) return;
        if (overlap({ x: player.x - PLAYER_W / 2, y: player.y - PLAYER_H, w: PLAYER_W, h: PLAYER_H }, { x: t.x, y: t.y, w: t.width, h: t.height })) { player.x += (t.pushX || 0) * delta; player.y += (t.pushY || 0) * delta; }
      });
      player.x = clamp(player.x, PLAYER_W / 2, VIEW_W - PLAYER_W / 2);
      if (player.y > VIEW_H + 40) return die('PIT');

      // solid / spring landing
      let landed = false;
      config.objects.forEach(o => {
        const role = roleOf(o);
        if ((role !== 'solid' && role !== 'spring') || !isActive(o) || !present(o, rtOf(o.id))) return;
        const r = objectRect(o);
        const prevFoot = player.y - player.vy * delta;
        if (player.vy >= 0 && player.x > r.x && player.x < r.x + r.w && prevFoot <= r.y + 2 && player.y >= r.y) {
          if (role === 'spring') { player.y = r.y; player.vy = -(o.bounce || 18); player.grounded = false; }
          else { player.y = r.y; player.vy = 0; player.grounded = true; landed = true; }
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
        if (!floorCollapsed && !inPit && !config.noBaseGround) { player.y = GROUND_Y; player.vy = 0; player.grounded = true; }
        else player.grounded = false;
      }

      // timers, appear/vanish, split, motion
      config.objects.forEach(o => {
        if (!isActive(o)) return;
        const rt = rtOf(o.id);
        if (!rt) return;
        rt.since += delta / 60;
        if (o.spin) rt.spinAngle = (rt.spinAngle || 0) + (o.spin * Math.PI / 180) * delta;
        if (o.type === 'pit' && splitIds.has(o.id) && rt.split < 1) rt.split = Math.min(1, rt.split + delta / 24);
        if (o.attachTo) {
          let baseX, baseY = 0, curX = 0, curY = 0;
          if (o.attachTo === 'door') { baseX = config.doorSpawnX; baseY = GROUND_Y; curX = door.x; curY = door.y; }
          else if (o.attachTo === 'player') { baseX = config.playerSpawnX; baseY = GROUND_Y; curX = player.x; curY = player.y; }
          else { const po = config.objects.find(x => x.id === o.attachTo); const prt = rtOf(o.attachTo); if (po) { baseX = po.x; baseY = po.y; curX = prt ? prt.x : po.x; curY = prt ? prt.y : po.y; } }
          if (baseX !== undefined) { rt.x = curX + (o.x - baseX); rt.y = curY + (o.y - baseY); return; }
        }
        const m = motionOf(o);
        if (!motionRunIds.has(o.id) || rt.since < m.delay) return;
        if (m.mode === 'fall') { rt.vy = Math.min(rt.vy + 0.62 * delta, 13); rt.y = Math.min(rt.y + rt.vy * delta, GROUND_Y - o.height / 2 + 1); }
        else if (m.mode === 'linear') {
          const len = Math.hypot(m.dirX, m.dirY) || 1;
          const sx = (m.dirX / len) * m.speed * rt.pong * delta, sy = (m.dirY / len) * m.speed * rt.pong * delta;
          rt.x += sx; rt.y += sy; rt.traveled += Math.hypot(sx, sy);
          if (m.distance > 0 && rt.traveled >= m.distance) { if (m.loop) { rt.pong *= -1; rt.traveled = 0; } else rt.pong = 0; }
        } else if (m.mode === 'chase') {
          let tx = player.x, ty = player.y - PLAYER_H / 2;
          if (m.target === 'door') { tx = door.x; ty = door.y + DOOR_CY; }
          else if (m.target !== 'player') { const trt = rtOf(m.target), to = config.objects.find(x => x.id === m.target); if (trt) { tx = trt.x; ty = trt.y; } else if (to) { tx = to.x; ty = to.y; } }
          const dx = tx - rt.x, dy = ty - rt.y, d = Math.hypot(dx, dy) || 1, st = Math.min(m.speed * delta, d);
          rt.x += dx / d * st; rt.y += dy / d * st;
        } else if (m.mode === 'orbit') {
          rt.orbit = (rt.orbit || 0) + m.speed * 0.03 * delta * (m.loop ? -1 : 1);
          const R = m.distance || 40; rt.x = o.x + Math.cos(rt.orbit) * R; rt.y = o.y + Math.sin(rt.orbit) * R;
        } else if (m.mode === 'pendulum') {
          rt.orbit = (rt.orbit || 0) + m.speed * 0.05 * delta;
          const R = m.distance || 40, sw = Math.sin(rt.orbit) * 1.2; rt.x = o.x + Math.sin(sw) * R; rt.y = (o.y - R) + Math.cos(sw) * R;
        } else if (m.mode === 'path') {
          const wps = m.waypoints || [];
          if (wps.length) {
            const path = [{ x: o.x, y: o.y }].concat(wps);
            let idx = rt.wpIndex != null ? rt.wpIndex : 1, wdir = rt.wpDir != null ? rt.wpDir : 1;
            if (idx < 0 || idx >= path.length) { idx = 1; wdir = 1; }
            const tgt = path[idx], dx = tgt.x - rt.x, dy = tgt.y - rt.y, d = Math.hypot(dx, dy) || 1, step = m.speed * delta;
            if (step >= d) { rt.x = tgt.x; rt.y = tgt.y; let ni = idx + wdir; if (ni >= path.length) { if (m.loop) { wdir = -1; ni = path.length - 2; } else { ni = path.length - 1; wdir = 0; } } else if (ni < 0) { wdir = 1; ni = 1; } rt.wpIndex = ni; rt.wpDir = wdir; }
            else { rt.x += dx / d * step; rt.y += dy / d * step; }
          }
        }
        rt.x = clamp(rt.x, 0, VIEW_W); rt.y = clamp(rt.y, 0, GROUND_Y + 40);
      });

      const pRect = { x: player.x - PLAYER_W / 2, y: player.y - PLAYER_H, w: PLAYER_W, h: PLAYER_H };

      // triggers (touch / auto timer + delay + repeat)
      config.triggers.forEach(t => {
        const delay = t.delay || 0;
        if (t.auto) {
          const tt = (triggerTimers.get(t.id) || 0) + delta / 60; triggerTimers.set(t.id, tt);
          if (!firedIds.has(t.id) && tt >= delay) { firedIds.add(t.id); fireTrigger(t); if (t.repeat) { firedIds.delete(t.id); triggerTimers.set(t.id, 0); } }
          return;
        }
        if (overlap(pRect, { x: t.x, y: t.y, w: t.width, h: t.height })) {
          const tt = (triggerTimers.get(t.id) || 0) + delta / 60; triggerTimers.set(t.id, tt);
          if (!firedIds.has(t.id) && tt >= delay) { firedIds.add(t.id); fireTrigger(t); }
        } else { triggerTimers.set(t.id, 0); if (t.repeat) firedIds.delete(t.id); }
      });

      // collisions
      for (const o of config.objects) {
        if (!isActive(o)) continue;
        const rt = rtOf(o.id);
        if (!present(o, rt)) continue;
        const wr = objectRect(o);
        const touch = overlap(pRect, wr);
        if (touch && !o.clickable && ((o.action && o.action.kind !== 'none') || (o.links && o.links.length))) {
          const k = 'obj:' + o.id;
          if (!firedIds.has(k)) { firedIds.add(k); fireObjectAction(o); }
        }
        if (!isLethal(o, rt ? rt.moving : false)) continue;
        const cx = rt ? rt.x : o.x;
        if (o.type === 'spike') {
          const oy = rt ? rt.y : o.y;
          const floorSpike = !o.rotation && oy >= GROUND_Y - 14;
          if (floorSpike) { if (Math.abs(player.x - cx) < o.width / 2 && player.y > GROUND_Y - 12) return die('SPIKE'); }
          else if (touch) return die('SPIKE');
          continue;
        }
        if (touch) return die(o.type === 'saw' ? 'SAW' : o.type === 'laser' ? 'LASER' : 'CRUSH');
      }

      // fake = troll door (runs away & kills); win = safe goal (reach = next run); undefined = legacy
      const dm = config.doorMode;
      const hasDoorTrigger = config.triggers.some(t => t.action === 'startDoorChase');
      if (dm === 'win') {
        if (Math.abs(player.x - door.x) < 26 && player.y >= GROUND_Y - 4) return loadRun(runIndex + 1);
      } else if (dm === 'fake' || runIndex === 0 || runIndex === 1) {
        const fake = dm === 'fake';
        if (!hasDoorTrigger && !doorTriggered) {
          const byProx = door.x - player.x < config.triggerDistance;
          const byInput = player.vx || keys.Space || keys.ArrowUp || keys.KeyW;
          if (fake ? (byProx || byInput) : (runIndex === 0 ? byProx : byInput)) doorTriggered = true;
        }
        if (doorTriggered) {
          doorTimer += delta / 60;
          const speed = Math.min(config.doorAccelSpeed + doorTimer * 1.5, config.doorAccelSpeed + 7);
          if (runIndex === 1 && doorTimer > config.skipButtonDelay && !skipClicked && !skipActive) { skipActive = true; skip.style.display = 'block'; }
          doorVx = clamp((doorVx + Math.sign(player.x - door.x) * config.doorHoming * delta) * .97, -speed, speed);
          doorVy = clamp((doorVy + Math.sign((player.y - 16) - (door.y - 28)) * config.doorHoming * delta) * .97, -speed, speed);
          door.x = clamp(door.x + doorVx * delta, 40, VIEW_W - 40);
          door.y = clamp(door.y + doorVy * delta, 40, GROUND_Y);
          if (Math.hypot(door.x - player.x, door.y - 28 - (player.y - 16)) < 30) return die('SAW');
        }
      }
      draw();
    });

    loadRun(0);
  </script>
</body>
</html>`;
};

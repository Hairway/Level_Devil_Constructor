import { PlayableProject } from './types';

const safeProjectJson = (project: PlayableProject) =>
  JSON.stringify(project, null, 2).replace(/<\/script/gi, '<\\/script');

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
    #stage{position:relative;width:min(100vw,100vh);height:min(100vw,100vh);background:#c77b00;overflow:hidden}
    #level{position:absolute;left:23.4375%;top:39.0625%;width:53.125%;height:21.875%;overflow:hidden;background:#e2a33c}
    canvas{display:block;width:100%;height:100%;image-rendering:pixelated}
    .hud{position:absolute;z-index:5;color:#231708;font-family:monospace;font-weight:900;letter-spacing:0;text-align:center;text-transform:uppercase;user-select:none}
    #title{left:19%;top:21.7%;width:62%;font-size:clamp(18px,4.1vw,44px)}
    #dots{left:40.6%;top:9.7%;width:18.8%;display:flex;gap:7px;justify-content:center}
    #dots i{width:19px;height:19px;border:4px solid #231708;box-sizing:border-box}
    .filled{background:#231708}
    button{position:absolute;z-index:6;border:0;border-radius:0;font-weight:900;color:#231708;background:#ffc164;box-shadow:inset 0 -6px 0 #b37111;cursor:pointer;touch-action:none}
    #install{right:7.5%;top:89.5%;width:20%;height:6.1%;font-size:clamp(8px,1.8vw,14px)}
    #sound{left:25.6%;top:89.5%;width:6.7%;aspect-ratio:1/1;background:#bf790f;color:#fff36b;font-size:clamp(18px,4vw,34px)}
    .ctrl{background:transparent;box-shadow:none;border:4px solid #ffd184;height:4.8%;font-size:0}
    #left{left:25.9%;top:75.8%;width:12%;clip-path:polygon(10% 50%,20% 20%,100% 20%,100% 80%,20% 80%)}
    #right{left:42.3%;top:75.8%;width:12%;clip-path:polygon(0 20%,90% 20%,100% 50%,90% 80%,0 80%)}
    #jump{left:62.2%;top:75.8%;width:12%;clip-path:polygon(0 70%,50% 10%,100% 70%,100% 90%,0 90%)}
    #skip{display:none;left:41%;top:31%;width:18%;height:6%;animation:bounce .8s infinite}
    #cta{display:none;position:absolute;inset:0;z-index:10;background:rgba(0,0,0,.92);color:white;align-items:center;justify-content:center;flex-direction:column;text-align:center;font-family:monospace;font-weight:900;padding:24px}
    #cta button{position:static;width:240px;height:52px;background:#10b981;color:white;box-shadow:inset 0 -6px 0 #047857}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    @media (orientation:landscape){
      #stage{width:100vw;height:min(100vh,56.25vw)}
      #level{left:23.4375%;top:39.0625%;width:53.125%;height:21.875%}
      #title{left:30%;top:31%;width:40%;font-size:clamp(18px,3vw,42px)}
      #dots{top:24.4%}
      #sound{left:3.75%;top:25.5%}
      #install{right:3.75%;top:25.5%}
      #left{left:5%;top:68.8%}
      #right{left:21.25%;top:68.8%}
      #jump{left:83.2%;top:68.8%}
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
  <script src="https://pixijs.download/v7.3.2/pixi.min.js"></script>
  <script>
    const PROJECT = ${safeProjectJson(project)};
    const STORE_URL = 'https://play.google.com/store/apps/details?id=com.leveldevil';
    const VIEW_W = 800, VIEW_H = 328, GROUND_Y = 280, PLAYER_H = 36;
    const COL_BG = 0xc77b00, COL_BAND = 0xe2a33c, COL_HI = 0xeab451, COL_INK = 0x231708;
    const app = new PIXI.Application({ width: VIEW_W, height: VIEW_H, backgroundColor: COL_BG, antialias: false });
    document.getElementById('level').appendChild(app.view);
    const g = new PIXI.Graphics();
    app.stage.addChild(g);
    const keys = {};
    let runIndex = 0, run, config, player, door, activeIds, firedIds, doorTriggered, doorTimer, doorVx, doorVy, dead, skipActive, skipClicked, floorCollapsed;

    const clamp = (v,min,max) => Math.max(min, Math.min(max, v));
    const overlap = (a,b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const title = document.getElementById('title');
    const dots = document.getElementById('dots');
    const skip = document.getElementById('skip');
    const cta = document.getElementById('cta');

    function openStore() {
      try { if (window.mraid && window.mraid.open) return window.mraid.open(STORE_URL); } catch(e) {}
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
      doorTriggered = runIndex === 2;
      doorTimer = 0; doorVx = 0; doorVy = 0; dead = false; skipActive = false; skipClicked = false; floorCollapsed = false;
      skip.style.display = 'none';
      cta.style.display = 'none';
      title.textContent = runIndex === 2 ? 'TRY NEW DOOR' : 'REACH THE DOOR';
      dots.innerHTML = Array.from({ length: 5 }, (_, i) => '<i class="' + (i <= runIndex ? 'filled' : '') + '"></i>').join('');
      draw();
    }

    function activateTrigger(trigger) {
      if (firedIds.has(trigger.id)) return;
      firedIds.add(trigger.id);
      if (trigger.action === 'startDoorChase') doorTriggered = true;
      else activeIds.add(trigger.targetId);
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
      const active = activeIds.has(object.id) || object.initiallyActive;
      if (!active && object.type !== 'pit') return;
      if (object.type === 'spike') {
        g.beginFill(COL_INK);
        for (let x = object.x - object.width / 2; x < object.x + object.width / 2; x += object.width / 3) {
          g.drawPolygon([x, object.y, x + object.width / 6, object.y - object.height, x + object.width / 3, object.y]);
        }
        g.endFill();
      } else if (object.type === 'saw') {
        g.beginFill(0x8a1f10, active ? 1 : .45);
        g.drawCircle(object.x, object.y, object.width / 2);
        g.endFill();
        g.lineStyle(3, COL_INK, .8);
        g.drawCircle(object.x, object.y, object.width / 3);
      }
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
        g.beginFill(COL_BG);
        g.drawRect(pit.x - pit.width / 2, GROUND_Y - 2, pit.width, VIEW_H - GROUND_Y + 16);
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
    }

    function markInput() {
      if (runIndex === 2 && !dead) {
        cta.style.display = 'flex';
        dead = true;
      }
    }

    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (['ArrowLeft','ArrowRight','KeyA','KeyD','Space','ArrowUp','KeyW'].includes(e.code)) markInput();
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

      const inPit = config.objects.some(o => o.type === 'pit' && activeIds.has(o.id) && player.x > o.x - o.width / 2 && player.x < o.x + o.width / 2 && player.y >= GROUND_Y - 4);
      if (player.y >= GROUND_Y && !floorCollapsed && !inPit) {
        player.y = GROUND_Y; player.vy = 0; player.grounded = true;
      } else if (player.y >= GROUND_Y) player.grounded = false;

      const pRect = { x: player.x - 10, y: player.y - PLAYER_H, w: 20, h: PLAYER_H };
      config.triggers.forEach(t => {
        if (overlap(pRect, { x: t.x, y: t.y, w: t.width, h: t.height })) activateTrigger(t);
      });
      config.objects.forEach(o => {
        const active = activeIds.has(o.id) || o.initiallyActive;
        if (!active) return;
        if (o.type === 'spike' && Math.abs(player.x - o.x) < o.width / 2 && player.y > GROUND_Y - 12) die('SPIKE');
        if (o.type === 'saw' && overlap(pRect, { x: o.x - o.width / 2, y: o.y - o.height / 2, w: o.width, h: o.height })) die('SAW');
      });

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
        if (Math.hypot(door.x - player.x, door.y - 28 - (player.y - 16)) < 30) die('SAW');
      }
      draw();
    });

    loadRun(0);
  </script>
</body>
</html>`;

import * as IMPION from "#impion";
import {
	VIEW_W, VIEW_H, GROUND_Y, BAND_TOP, PLAYER_H, PLAYER_W, DOOR_W, DOOR_H, DOOR_CY,
	COL_INK, DEFAULT_BG, DEFAULT_GROUND,
	hx, lightenNum, roleOf, motionOf, isBottomAnchored, objectLocalRect, rectsOverlap, clamp,
} from "./LevelConfig.mjs";
import levelJson from "./level.json"; // level authored by the constructor (source of truth)

// Level Devil engine on the IMPION base — ported from the constructor's PixiJS runtime.
// Authored inside LevelRoot using the legacy 800x328 coordinate space (ground at y=280).

export default class Game extends IMPION.ComponentEmpty {
	#app;

	#runIndex = 0;
	#state = 0;			// 0 idle, 1 playing, 10 ended
	#numClicks = 0;

	#keys = {};
	#vx = 0;
	#vy = 0;
	#grounded = false;
	#facing = 1;
	#dead = false;
	#dying = false;

	#config = null;
	#door = { x: 0, y: 0, armed: false, triggered: false, timer: 0, vx: 0, vy: 0 };
	#floorCollapsed = false;

	#activeIds = new Set();
	#firedIds = new Set();
	#motionRunIds = new Set();
	#splitIds = new Set();
	#runtime = new Map();
	#sprites = new Map();

	// layers (built in initGame)
	#floorGfx = null;
	#objectsLayer = null;
	#hero = null;
	#doorGfx = null;

	#w = 0;
	#h = 0;

	constructor({ app }) {
		super();
		this.#app = app;
		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
	}

	init() {
		window.addEventListener("keydown", this.#onKeyDown);
		window.addEventListener("keyup", this.#onKeyUp);
	}

	#onKeyDown = (e) => {
		this.#keys[e.code] = true;
		if (["Space", "ArrowUp", "KeyW"].includes(e.code)) this.#jump();
		if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) this.#startPlaying();
	};
	#onKeyUp = (e) => { delete this.#keys[e.code]; };

	// on-screen controls (called from CreateObjects2D buttons)
	controlDown(dir) {
		if (dir === "left") this.#keys["ArrowLeft"] = true;
		else if (dir === "right") this.#keys["ArrowRight"] = true;
		else if (dir === "jump") this.#jump();
	}
	controlUp(dir) {
		if (dir === "left") delete this.#keys["ArrowLeft"];
		else if (dir === "right") delete this.#keys["ArrowRight"];
	}

	#startPlaying() {
		if (this.#state !== 0) return;
		this.#state = 1;
		this.#app.statisticManager.handlerEvent("CHALLENGE_STARTED");
		this.#app.soundManager.on(this.#numClicks);
	}
	#jump() {
		this.#startPlaying();
		if (this.#state !== 10 && this.#grounded && !this.#dead) {
			this.#vy = -(this.#config ? this.#config.jumpForce : 11);
			this.#grounded = false;
		}
	}

	handlerTap = () => {
		this.#numClicks++;
		if (this.#app.params.modeClicks.value != 0 && this.#numClicks >= this.#app.params.modeClicks.value) {
			this.components["FullscreenCTA"].visible = true;
		}
		this.#app.platformManager.handlerTap(this.#numClicks);
		this.#app.focusedManager.on(true);
	};
	stageDown = (e) => { this.handlerTap(e); this.#jump(); };
	stageMove = () => {};
	stageUp = () => {};

	//------------------------------------------------------------------------

	#project() {
		// params.levelData overrides the file when set (studio preview), else use level.json.
		const p = this.#app.params.levelData;
		if (p && p.value && Array.isArray(p.value.runs) && p.value.runs.length) return p.value;
		if (levelJson && Array.isArray(levelJson.runs) && levelJson.runs.length) return levelJson;
		return { runs: [{ config: {} }] };
	}

	#tex(name) {
		const a = this.#app.assets;
		const t = (a && a.textures && a.textures.pixi) ? a.textures.pixi[name] : null;
		if (t && t.source) t.source.scaleMode = 'nearest'; // keep pixel art crisp when scaled
		return t;
	}

	#heroTex = null;
	#heroScale = 2.4;
	#animTimer = 0;

	initGame = () => {
		const root = this.components["LevelRoot"];
		this.#floorGfx = new IMPION.Graphics2d();
		this.#objectsLayer = new IMPION.Group2d();

		// Hero: real sprite (idle/run/jump) when assets are present, else a dark rect.
		const idle = this.#tex("ld_hero_idle");
		if (idle) {
			this.#heroTex = {
				idle,
				jump: this.#tex("ld_hero_jump") || idle,
				run: [1, 2, 3, 4].map((i) => this.#tex("ld_hero_run_" + i) || idle),
			};
			this.#hero = new IMPION.Sprite2d(idle);
			this.#hero.anchor.set(0.5, 1);
			this.#hero.tint = COL_INK;
			this.#hero.scale.set(this.#heroScale);
		} else {
			this.#hero = new IMPION.Graphics2d();
			this.#hero.rect(-PLAYER_W / 2, -PLAYER_H, PLAYER_W, PLAYER_H).fill({ color: COL_INK });
		}

		// Door: real sprite (safe/armed) when present, else a rect.
		const doorTex = this.#tex("ld_door");
		if (doorTex) {
			this.#doorGfx = new IMPION.Sprite2d(doorTex);
			this.#doorGfx.anchor.set(0.5, 1);
			this.#doorGfx.scale.set(DOOR_W / 16, DOOR_H / 16);
		} else {
			this.#doorGfx = new IMPION.Graphics2d();
		}

		root.addChild(this.#floorGfx, this.#objectsLayer, this.#doorGfx, this.#hero);
		this.#loadRun(0);
	};

	#loadRun(index) {
		const runs = this.#project().runs || [];
		this.#runIndex = Math.max(0, Math.min(index, runs.length - 1));
		this.#config = this.#normalizeConfig(runs[this.#runIndex] ? runs[this.#runIndex].config : {});
		this.#resetRun();
	}

	#normalizeConfig(c) {
		return {
			playerSpeed: c.playerSpeed ?? 3.5,
			jumpForce: c.jumpForce ?? 11,
			gravity: c.gravity ?? 0.7,
			doorBaseSpeed: c.doorBaseSpeed ?? 2.5,
			doorAccelSpeed: c.doorAccelSpeed ?? 6,
			doorHoming: c.doorHoming ?? 0.25,
			triggerDistance: c.triggerDistance ?? 260,
			skipButtonDelay: c.skipButtonDelay ?? 1.8,
			playerSpawnX: c.playerSpawnX ?? 90,
			doorSpawnX: c.doorSpawnX ?? 720,
			bgColor: c.bgColor || DEFAULT_BG,
			groundColor: c.groundColor || DEFAULT_GROUND,
			objects: Array.isArray(c.objects) ? c.objects : [],
			triggers: Array.isArray(c.triggers) ? c.triggers : [],
		};
	}

	#resetRun() {
		const s = this.#config;
		this.#dead = false;
		this.#dying = false;
		this.#floorCollapsed = false;
		this.#vx = 0; this.#vy = 0; this.#grounded = true;
		this.#door = { x: s.doorSpawnX, y: GROUND_Y, armed: false, triggered: this.#runIndex === 2, timer: 0, vx: 0, vy: 0 };
		this.#activeIds = new Set(s.objects.filter((o) => o.initiallyActive).map((o) => o.id));
		this.#firedIds = new Set();
		this.#splitIds = new Set();
		this.#motionRunIds = new Set(s.objects.filter((o) => motionOf(o).startOn === "spawn").map((o) => o.id));
		this.#runtime = new Map(s.objects.map((o) => [o.id, { x: o.x, y: o.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 }]));

		this.#hero.position.set(s.playerSpawnX, GROUND_Y);
		this.#buildObjectSprites();
		this.#drawFloor();
		this.#drawDoor();
	}

	//------------------------------------------------------------------------

	#makeObjectGraphic(o) {
		const g = new IMPION.Graphics2d();
		const active = this.#activeIds.has(o.id);
		const col = o.color ? hx(o.color, null) : null;
		const w = o.width, h = o.height;

		// real Level Devil sprites for spike/saw when available
		if (!o.spriteUrl && (o.type === "spike" || o.type === "saw")) {
			const t = this.#tex(o.type === "spike" ? "ld_spike" : "ld_saw");
			if (t) {
				const sp = new IMPION.Sprite2d(t);
				sp.anchor.set(0.5, o.type === "spike" ? 1 : 0.5);
				sp.scale.set(w / 16, h / 16);
				if (col != null) sp.tint = col;
				else if (o.type === "spike") sp.tint = COL_INK; // spikes are inked by default
				return sp;
			}
		}
		if (o.type === "spike") {
			g.poly([-w / 2, 0, 0, -h, w / 2, 0]).fill({ color: col ?? COL_INK });
		} else if (o.type === "saw") {
			g.circle(0, 0, w / 2).fill({ color: col ?? 0x8a1f10 });
			g.circle(0, 0, w / 3).stroke({ color: COL_INK, width: 3, alpha: 0.8 });
		} else if (o.type === "pit") {
			g.rect(-w / 2, -h, w, h).fill({ color: col ?? 0x161616, alpha: 0.9 });
		} else if (o.type === "fallingBlock") {
			g.rect(-w / 2, -h / 2, w, h).fill({ color: col ?? 0x5b3410 });
			g.rect(-w / 2, -h / 2, w, h).stroke({ color: COL_INK, width: 3, alpha: 0.85 });
		} else if (o.type === "crusher") {
			g.rect(-w / 2, -h / 2, w, h).fill({ color: col ?? 0x3b2611 });
			g.rect(-w / 2, -h / 2, w, h).stroke({ color: 0x8a1f10, width: 3 });
		} else if (o.type === "laser") {
			g.rect(-w / 2, -h / 2, w, h).fill({ color: col ?? 0xfef08a, alpha: 0.95 });
		} else if (o.type === "platform") {
			g.rect(-w / 2, -h / 2, w, h).fill({ color: col ?? 0xb37111 });
			g.rect(-w / 2, -h / 2, w, 4).fill({ color: 0xeab451, alpha: 0.85 });
		} else { // button
			g.roundRect(-w / 2, -h / 2, w, h, 6).fill({ color: col ?? 0xffc164 });
		}
		if (o.spriteUrl) {
			try {
				const sp = IMPION.Sprite2d.from(o.spriteUrl);
				sp.anchor.set(0.5, isBottomAnchored(o.type) ? 1 : 0.5);
				sp.width = w; sp.height = h;
				return sp;
			} catch (e) { /* fall back to graphic */ }
		}
		return g;
	}

	#buildObjectSprites() {
		this.#objectsLayer.removeChildren();
		this.#sprites.clear();
		for (const o of this.#config.objects) {
			if (o.type === "pit") continue; // pits are drawn by the floor
			if (!(this.#activeIds.has(o.id) || o.initiallyActive)) continue;
			const g = this.#makeObjectGraphic(o);
			const rt = this.#runtime.get(o.id);
			g.position.set(rt ? rt.x : o.x, rt ? rt.y : o.y);
			g.visible = rt ? rt.since >= (o.appearDelay || 0) : true;
			if (o.clickable && o.action && o.action.kind !== "none") {
				g.eventMode = "static";
				g.cursor = "pointer";
				g.on("pointertap", () => this.#runAction(o.action.kind, o.action.targetId));
			}
			this.#objectsLayer.addChild(g);
			this.#sprites.set(o.id, g);
		}
	}

	#syncObjects() {
		for (const o of this.#config.objects) {
			const g = this.#sprites.get(o.id);
			if (!g) continue;
			const rt = this.#runtime.get(o.id);
			if (rt) g.position.set(rt.x, rt.y);
			const active = this.#activeIds.has(o.id) || o.initiallyActive;
			const appeared = rt ? rt.since >= (o.appearDelay || 0) : true;
			g.visible = active && appeared;
		}
	}

	#drawFloor() {
		const band = hx(this.#config.groundColor, 0xe2a33c);
		const bandHi = lightenNum(band, 0.12);
		const bg = hx(this.#config.bgColor, 0xc77b00);
		const g = this.#floorGfx;
		g.clear();
		g.rect(0, BAND_TOP, VIEW_W, GROUND_Y - BAND_TOP + 8).fill({ color: band });
		g.rect(0, BAND_TOP, VIEW_W, 5).fill({ color: bandHi, alpha: 0.7 });
		g.rect(0, GROUND_Y + 8, VIEW_W, VIEW_H - GROUND_Y - 8).fill({ color: 0x000000, alpha: 0.12 });
		for (const o of this.#config.objects) {
			if (o.type !== "pit" || !this.#activeIds.has(o.id)) continue;
			const prog = this.#splitIds.has(o.id) ? (this.#runtime.get(o.id)?.split ?? 0) : 1;
			const holeW = o.width * Math.max(0, Math.min(1, prog));
			if (holeW <= 0) continue;
			g.rect(o.x - holeW / 2, GROUND_Y - 2, holeW, VIEW_H - GROUND_Y + 16).fill({ color: bg });
		}
		if (this.#floorCollapsed) {
			g.rect(90, GROUND_Y - 2, VIEW_W - 180, VIEW_H - GROUND_Y + 16).fill({ color: bg });
		}
	}

	#drawDoor() {
		const g = this.#doorGfx;
		const armed = this.#door.armed || this.#runIndex === 2;
		if (g instanceof IMPION.Sprite2d) {
			const t = this.#tex(armed ? "ld_door_armed" : "ld_door");
			if (t) g.texture = t;
			g.position.set(this.#door.x, this.#door.y);
			return;
		}
		g.clear();
		g.rect(-DOOR_W / 2, -DOOR_H, DOOR_W, DOOR_H).fill({ color: 0xcfcfcf });
		g.rect(-DOOR_W / 2, -DOOR_H, DOOR_W, DOOR_H).stroke({ color: armed ? 0x8a1f10 : 0xb37111, width: 6 });
		g.position.set(this.#door.x, this.#door.y);
	}

	//------------------------------------------------------------------------

	#ensureRuntime(id) {
		const o = this.#config.objects.find((x) => x.id === id);
		if (o && !this.#runtime.has(id)) this.#runtime.set(id, { x: o.x, y: o.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 });
	}

	#runAction(kind, targetId) {
		if (kind === "none") return;
		if (kind === "startDoorChase") { this.#door.triggered = true; this.#door.armed = true; this.#drawDoor(); return; }
		if (kind === "collapseFloor") { this.#floorCollapsed = true; this.#drawFloor(); return; }
		if (kind === "nextRun") { this.#advanceRun(); return; }
		if (kind === "redirectCTA") { this.#redirectCTA(); return; }
		if (kind === "splitFloor") { this.#activeIds.add(targetId); this.#splitIds.add(targetId); this.#motionRunIds.add(targetId); this.#ensureRuntime(targetId); this.#drawFloor(); return; }
		if (kind === "openPit") { this.#activeIds.add(targetId); this.#ensureRuntime(targetId); this.#drawFloor(); return; }
		// activate
		this.#activeIds.add(targetId); this.#motionRunIds.add(targetId); this.#ensureRuntime(targetId);
		this.#buildObjectSprites();
	}

	#advanceRun() {
		const runs = this.#project().runs || [];
		if (this.#runIndex < runs.length - 1) this.#loadRun(this.#runIndex + 1);
		else this.winGame();
	}

	#redirectCTA() {
		if (this.#state === 10) return;
		this.#state = 10;
		this.#app.platformManager.end();
		this.#app.statisticManager.handlerEvent("CTA_TRIGGER");
		this.components["FullscreenCTA"].visible = true;
		this.components["ButtonCTA"].visible = true;
	}

	#die() {
		if (this.#dead) return;
		this.#dead = true;
		this.#app.statisticManager.handlerEvent("CHALLENGE_FAILED");
		// Level Devil retries the current run on death.
		this.#app.tween.set(this, { delay: 0.5, overwrite: "none", onComplete: () => this.#resetRun() });
	}

	failGame = () => { this.#resetRun(); };

	winGame = () => {
		if (this.#state === 10) return;
		this.#state = 10;
		this.#app.platformManager.end();
		this.#app.statisticManager.handlerEvent("CHALLENGE_SOLVED");
		this.#app.statisticManager.handlerEvent("ENDCARD_SHOWN");
		this.components["ButtonCTA"].visible = true;
		if (this.#app.params.fullscreenCta.value) {
			this.#app.tween.set(this.components["FullscreenCTA"], { delay: 1.5, overwrite: "none", visible: true });
		}
	};

	reloadParams() {}

	//------------------------------------------------------------------------

	#updateHeroVisual(dt) {
		const hero = this.#hero;
		if (this.#heroTex) {
			if (!this.#grounded) hero.texture = this.#heroTex.jump;
			else if (this.#vx !== 0) { this.#animTimer += dt; hero.texture = this.#heroTex.run[Math.floor(this.#animTimer / 5) % 4]; }
			else { this.#animTimer = 0; hero.texture = this.#heroTex.idle; }
			hero.scale.set(this.#facing * this.#heroScale, this.#heroScale);
		} else {
			hero.scale.x = this.#facing;
		}
	}

	#objectWorldRect(o) {
		const rt = this.#runtime.get(o.id);
		const r = objectLocalRect(o);
		const x = rt ? rt.x : o.x;
		const y = rt ? rt.y : o.y;
		return { x: x + r.x, y: y + r.y, w: r.w, h: r.h };
	}

	enterframe = (timeDelta) => {
		if (this.#state === 10 || this.#dead || this.#dying || !this.#config) return;
		const dt = timeDelta || 1;
		const s = this.#config;
		const hero = this.#hero;
		let px = hero.position.x;
		let py = hero.position.y;

		if (py > VIEW_H + 40) { this.#die(); return; }

		//- horizontal + jump handled via keys

		this.#vx = 0;
		if (this.#keys["ArrowLeft"] || this.#keys["KeyA"]) this.#vx = -s.playerSpeed;
		if (this.#keys["ArrowRight"] || this.#keys["KeyD"]) this.#vx = s.playerSpeed;
		if (this.#vx < 0) this.#facing = -1; else if (this.#vx > 0) this.#facing = 1;

		this.#vy += s.gravity * dt;
		px = clamp(px + this.#vx * dt, PLAYER_W, VIEW_W - PLAYER_W);
		py += this.#vy * dt;
		if (py - PLAYER_H < BAND_TOP) { py = BAND_TOP + PLAYER_H; if (this.#vy < 0) this.#vy = 0; }

		//- open pit test

		const inOpenPit = s.objects.some((o) => {
			if (o.type !== "pit" || !this.#activeIds.has(o.id)) return false;
			const prog = this.#splitIds.has(o.id) ? (this.#runtime.get(o.id)?.split ?? 0) : 1;
			if (prog < 0.35) return false;
			const hw = (o.width * prog) / 2;
			return px > o.x - hw && px < o.x + hw && py >= GROUND_Y - 4;
		});

		//- solid platforms (one-way)

		let landed = false;
		for (const o of s.objects) {
			if (roleOf(o) !== "solid" || !(this.#activeIds.has(o.id) || o.initiallyActive)) continue;
			const r = this.#objectWorldRect(o);
			const prevFoot = py - this.#vy * dt;
			if (this.#vy >= 0 && px > r.x && px < r.x + r.w && prevFoot <= r.y + 2 && py >= r.y) {
				py = r.y; this.#vy = 0; this.#grounded = true; landed = true;
			}
		}
		if (!landed && py >= GROUND_Y) {
			if (!this.#floorCollapsed && !inOpenPit) { py = GROUND_Y; this.#vy = 0; this.#grounded = true; }
			else this.#grounded = false;
		}

		hero.position.set(px, py);
		this.#updateHeroVisual(dt);

		//- object timers / motion

		let dirty = false;
		for (const o of s.objects) {
			if (!(this.#activeIds.has(o.id) || o.initiallyActive)) continue;
			const rt = this.#runtime.get(o.id);
			if (!rt) continue;
			const before = rt.since;
			rt.since += (1 / 60) * dt;
			if ((o.appearDelay || 0) > 0 && before < o.appearDelay && rt.since >= o.appearDelay) dirty = true;
			if (o.type === "pit" && this.#splitIds.has(o.id) && rt.split < 1) { rt.split = Math.min(1, rt.split + (1 / 24) * dt); this.#drawFloor(); }
			const m = motionOf(o);
			if (!this.#motionRunIds.has(o.id) || rt.since < m.delay) continue;
			if (m.mode === "fall") {
				rt.vy = Math.min(rt.vy + 0.62 * dt, 13);
				rt.y = Math.min(rt.y + rt.vy * dt, GROUND_Y - o.height / 2 + 1);
			} else if (m.mode === "linear") {
				const len = Math.hypot(m.dirX, m.dirY) || 1;
				const sx = (m.dirX / len) * m.speed * rt.pong * dt;
				const sy = (m.dirY / len) * m.speed * rt.pong * dt;
				rt.x += sx; rt.y += sy; rt.traveled += Math.hypot(sx, sy);
				if (m.distance > 0 && rt.traveled >= m.distance) { if (m.loop) { rt.pong *= -1; rt.traveled = 0; } else rt.pong = 0; }
			} else if (m.mode === "chase") {
				let tx = px, ty = py - PLAYER_H / 2;
				if (m.target === "door") { tx = this.#door.x; ty = this.#door.y + DOOR_CY; }
				else if (m.target !== "player") {
					const trt = this.#runtime.get(m.target); const to = s.objects.find((x) => x.id === m.target);
					if (trt) { tx = trt.x; ty = trt.y; } else if (to) { tx = to.x; ty = to.y; }
				}
				const dx = tx - rt.x, dy = ty - rt.y, d = Math.hypot(dx, dy) || 1;
				const step = Math.min(m.speed * dt, d);
				rt.x += (dx / d) * step; rt.y += (dy / d) * step;
			}
			rt.x = clamp(rt.x, 0, VIEW_W); rt.y = clamp(rt.y, BAND_TOP, GROUND_Y + 40);
		}
		if (dirty) this.#buildObjectSprites();
		this.#syncObjects();

		//- triggers

		const pRect = { x: px - PLAYER_W / 2, y: py - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
		for (const t of s.triggers) {
			if (this.#firedIds.has(t.id)) continue;
			if (rectsOverlap(pRect.x, pRect.y, pRect.w, pRect.h, t.x, t.y, t.width, t.height)) {
				this.#firedIds.add(t.id);
				this.#runAction(t.action, t.targetId);
			}
		}

		//- collisions

		for (const o of s.objects) {
			if (!(this.#activeIds.has(o.id) || o.initiallyActive)) continue;
			const rt = this.#runtime.get(o.id);
			if ((o.appearDelay || 0) > 0 && rt && rt.since < o.appearDelay) continue;
			const wr = this.#objectWorldRect(o);
			const touch = rectsOverlap(pRect.x, pRect.y, pRect.w, pRect.h, wr.x, wr.y, wr.w, wr.h);
			if (touch && o.action && o.action.kind !== "none" && !o.clickable) {
				const key = "obj:" + o.id;
				if (!this.#firedIds.has(key)) { this.#firedIds.add(key); this.#runAction(o.action.kind, o.action.targetId); }
			}
			if (roleOf(o) !== "hazard") continue;
			const cx = rt ? rt.x : o.x;
			if (o.type === "spike") { if (Math.abs(px - cx) < o.width / 2 && py > GROUND_Y - 12) { this.#die(); return; } continue; }
			if (touch) { this.#die(); return; }
		}

		//- door chase (runs 0/1) + skip trap

		if (this.#runIndex === 0 || this.#runIndex === 1) {
			const hasDoorTrigger = s.triggers.some((t) => t.action === "startDoorChase");
			if (this.#runIndex === 0 && !hasDoorTrigger && !this.#door.triggered && this.#door.x - px < s.triggerDistance) { this.#door.triggered = true; this.#door.armed = true; this.#drawDoor(); }
			if (this.#runIndex === 1 && !this.#door.triggered && (this.#vx || this.#keys["Space"])) { this.#door.triggered = true; this.#door.armed = true; this.#drawDoor(); }
			if (this.#door.triggered) {
				this.#door.timer += (1 / 60) * dt;
				const speed = Math.min(s.doorAccelSpeed + this.#door.timer * 1.5, s.doorAccelSpeed + 7);
				this.#door.vx = clamp((this.#door.vx + Math.sign(px - this.#door.x) * s.doorHoming * dt) * 0.97, -speed, speed);
				this.#door.vy = clamp((this.#door.vy + Math.sign((py - 16) - (this.#door.y + DOOR_CY)) * s.doorHoming * dt) * 0.97, -speed, speed);
				this.#door.x = clamp(this.#door.x + this.#door.vx * dt, 40, VIEW_W - 40);
				this.#door.y = clamp(this.#door.y + this.#door.vy * dt, BAND_TOP + 40, GROUND_Y);
				this.#drawDoor();
				if (Math.hypot(this.#door.x - px, this.#door.y + DOOR_CY - (py - 16)) < 30) { this.#die(); return; }
			}
		}

		//- reach the (safe) door → advance / win

		if (!this.#door.armed && !this.#door.triggered && Math.abs(px - this.#door.x) < 26 && py >= GROUND_Y - 4) {
			this.#advanceRun();
		}
	};

	resize = (width, height) => {
		this.#w = width; this.#h = height;
		const root = this.components["LevelRoot"];
		if (!root) return;
		const portrait = width < height;
		const designW = portrait ? 720 : 1280;
		const designH = portrait ? 1280 : 720;
		const halfW = designW / 2;
		const halfH = designH / 2;

		// fit the 800x328 corridor; sit it a bit above center so controls have room below
		const scale = Math.min((designW * 0.96) / VIEW_W, (designH * 0.5) / VIEW_H);
		root.scale.set(scale);
		root.position.set(-VIEW_W / 2 * scale, -VIEW_H / 2 * scale - (portrait ? 120 : 40));

		// on-screen controls pinned to the bottom, inside the visible design area
		const left = this.components["CtrlLeft"];
		const right = this.components["CtrlRight"];
		const jump = this.components["CtrlJump"];
		if (left && right && jump) {
			const y = halfH - 90;
			left.position.set(-halfW + 90, y);
			right.position.set(-halfW + 220, y);
			jump.position.set(halfW - 90, y);
		}

		// keep the title just above the corridor
		const title = this.components["Task"];
		if (title) title.position.set(0, root.position.y - 34);
	};
}

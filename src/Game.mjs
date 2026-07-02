import * as IMPION from "#impion";
import {
	VIEW_W, VIEW_H, GROUND_Y, BAND_TOP, PLAYER_H, PLAYER_W, DOOR_W, DOOR_H, DOOR_CY,
	COL_INK, DEFAULT_BG, DEFAULT_GROUND,
	hx, lightenNum, roleOf, isLethal, motionOf, isBottomAnchored, objectLocalRect, rectsOverlap, clamp,
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
	#wasGrounded = true;
	#facing = 1;
	#dead = false;
	#dying = false;

	#config = null;
	#door = { x: 0, y: 0, armed: false, triggered: false, timer: 0, vx: 0, vy: 0 };
	#floorCollapsed = false;
	#checkpoint = null; // {x,y} respawn point set by a checkpoint trigger; cleared per run

	#activeIds = new Set();
	#hiddenIds = new Set();
	#firedIds = new Set();
	#trigTimers = new Map();
	#motionRunIds = new Set();
	#splitIds = new Set();
	#loadedFonts = new Set();

	// true when an object should participate in the scene (respects deactivate/toggle)
	#isActive(o) {
		return (this.#activeIds.has(o.id) || o.initiallyActive) && !this.#hiddenIds.has(o.id);
	}
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

	// default sound per event; overridden by config.sound[event]
	static #SFX_DEFAULT = { jump: "731", death: "733", win: "568", click: "721", land: "SFX_footstep", spring: "SFX_spring", trap: "SFX_shift", music: "bg_music" };

	#soundCfg() { return (this.#config && this.#config.sound) || {}; }
	#soundKey(event) { const s = this.#soundCfg(); return s[event] !== undefined ? s[event] : Game.#SFX_DEFAULT[event]; }

	#startPlaying() {
		if (this.#state !== 0) return;
		this.#state = 1;
		this.#app.statisticManager.handlerEvent("CHALLENGE_STARTED");
		this.#app.soundManager.on(this.#numClicks);
		const music = this.#soundKey("music");
		if (music && !this.#soundCfg().muted) this.#playSound(music, true); // background music on first move
	}

	// play the sound assigned to a gameplay event (config-driven; no-op if muted / unmapped)
	#playSfx(event) {
		if (this.#soundCfg().muted) return;
		const key = this.#soundKey(event);
		if (key) this.#playSound(key, false);
	}

	// safe low-level helper — no-op if the sound/manager isn't available
	#playSound(name, loop = false) {
		try {
			const sm = this.#app.soundManager;
			if (!sm || !name) return;
			const vol = this.#soundCfg().volume;
			if (loop) { if (sm.setMusic) sm.setMusic(name); if (sm.loop) sm.loop(name); else if (sm.play) sm.play(name); }
			else if (sm.play) sm.play(name);
			if (vol !== undefined && sm.volume) { try { sm.volume(name, vol); } catch (e) {} }
		} catch (e) { /* sound optional */ }
	}
	#jump() {
		this.#startPlaying();
		if (this.#state !== 10 && this.#grounded && !this.#dead) {
			this.#vy = -(this.#config ? this.#config.jumpForce : 11);
			this.#grounded = false;
			this.#playSfx("jump");
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
		this.#checkpoint = null; // a fresh run starts from its own spawn
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
			doorMode: c.doorMode || null,
			triggerDistance: c.triggerDistance ?? 260,
			skipButtonDelay: c.skipButtonDelay ?? 1.8,
			playerSpawnX: c.playerSpawnX ?? 90,
			doorSpawnX: c.doorSpawnX ?? 720,
			bgColor: c.bgColor || DEFAULT_BG,
			groundColor: c.groundColor || DEFAULT_GROUND,
			groundOffset: c.groundOffset || 0,
			title: c.title || null,
			ctaButton: c.ctaButton || null,
			sound: c.sound || null,
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
		// door starts safe for explicit modes; legacy auto keeps the run-2 armed look
		const doorTrig = s.doorMode ? false : this.#runIndex === 2;
		this.#door = { x: s.doorSpawnX, y: GROUND_Y, armed: false, triggered: doorTrig, timer: 0, vx: 0, vy: 0 };
		this.#activeIds = new Set(s.objects.filter((o) => o.initiallyActive).map((o) => o.id));
		this.#hiddenIds = new Set();
		this.#firedIds = new Set();
		this.#trigTimers = new Map();
		this.#splitIds = new Set();
		this.#motionRunIds = new Set(s.objects.filter((o) => motionOf(o).startOn === "spawn").map((o) => o.id));
		this.#runtime = new Map(s.objects.map((o) => [o.id, { x: o.x, y: o.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 }]));

		// editable HUD/CTA text (per-run title, CTA button label)
		if (s.title && this.components["Task"]) this.components["Task"].text = s.title;
		if (s.ctaButton && this.components["ButtonCTAText"]) this.components["ButtonCTAText"].text = s.ctaButton;

		// visual-only downward nudge so the hero + traps sit on the ground (physics unchanged)
		const gOff = s.groundOffset || 0;
		this.#objectsLayer.position.y = gOff;
		if (this.#hero.anchor) this.#hero.anchor.set(0.5, 1 - gOff / (this.#hero.height || PLAYER_H));
		// respawn at the last checkpoint if one was reached, else the run's spawn
		this.#hero.position.set(this.#checkpoint ? this.#checkpoint.x : s.playerSpawnX, this.#checkpoint ? this.#checkpoint.y : GROUND_Y);
		this.#loadFonts(s.objects);
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

		// button: optional texture (or a panel) with custom text on top
		if (o.type === "button") {
			const box = new IMPION.Group2d();
			if (o.spriteUrl) {
				try {
					const sp = IMPION.Sprite2d.from(o.spriteUrl);
					sp.anchor.set(0.5); sp.width = w; sp.height = h;
					if (col != null) sp.tint = col;
					box.addChild(sp);
				} catch (e) { /* fall back to panel below */ }
			}
			if (!o.spriteUrl) {
				const bg = new IMPION.Graphics2d();
				bg.roundRect(-w / 2, -h / 2, w, h, 6).fill({ color: col ?? 0xffc164 });
				bg.roundRect(-w / 2, h / 2 - 5, w, 5, 3).fill({ color: 0xb37111 });
				box.addChild(bg);
			}
			const txt = o.text ?? o.label ?? "";
			if (txt) {
				const label = new IMPION.Text2dBase({
					text: txt.toUpperCase(),
					style: { fontFamily: o.fontFamily || "Arial", fontSize: Math.max(9, Math.min(15, h - 8)), fontWeight: "900", fill: o.textColor ? hx(o.textColor, 0x231708) : 0x231708 },
				});
				label.anchor.set(0.5);
				box.addChild(label);
			}
			return box;
		}

		// free text block: just the text, no panel (full behaviors via motion/action/appear)
		if (o.type === "text") {
			const txt = o.text ?? o.label ?? "";
			const label = new IMPION.Text2dBase({
				text: txt,
				style: { fontFamily: o.fontFamily || "Arial", fontSize: o.fontSize || Math.max(10, h), fontWeight: "700", fill: o.textColor ? hx(o.textColor, 0xffffff) : (col ?? 0xffffff), align: "center" },
			});
			label.anchor.set(0.5);
			return label;
		}

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
			// wooden crate: body + diagonal cross-planks + outline
			g.rect(-w / 2, -h / 2, w, h).fill({ color: col ?? 0x5b3410 });
			g.rect(-w / 2, -h / 2, w, 5).fill({ color: 0x7a4a17, alpha: 0.8 });
			g.moveTo(-w / 2, -h / 2).lineTo(w / 2, h / 2).moveTo(w / 2, -h / 2).lineTo(-w / 2, h / 2)
				.stroke({ color: COL_INK, width: 2, alpha: 0.4 });
			g.rect(-w / 2, -h / 2, w, h).stroke({ color: COL_INK, width: 3, alpha: 0.85 });
		} else if (o.type === "crusher") {
			// heavy block with red spikes along the bottom
			g.rect(-w / 2, -h / 2, w, h).fill({ color: col ?? 0x3b2611 });
			g.rect(-w / 2, -h / 2, w, h).stroke({ color: 0x8a1f10, width: 3 });
			const teeth = Math.max(3, Math.round(w / 14));
			const tw = w / teeth;
			for (let i = 0; i < teeth; i++) {
				const x = -w / 2 + i * tw;
				g.poly([x, h / 2, x + tw / 2, h / 2 + 10, x + tw, h / 2]).fill({ color: 0x8a1f10 });
			}
		} else if (o.type === "laser") {
			g.rect(-w / 2, -h / 2, w, h).fill({ color: col ?? 0xfef08a, alpha: 0.6 });
			g.rect(-w / 2, -2, w, 4).fill({ color: col ?? 0xef4444 }); // bright core beam
		} else if (o.type === "platform") {
			// wooden platform: body + top highlight + plank seams
			g.rect(-w / 2, -h / 2, w, h).fill({ color: col ?? 0xb37111 });
			g.rect(-w / 2, -h / 2, w, 4).fill({ color: 0xeab451, alpha: 0.85 });
			const planks = Math.max(2, Math.round(w / 30));
			for (let i = 1; i < planks; i++) {
				const x = -w / 2 + (w / planks) * i;
				g.moveTo(x, -h / 2 + 4).lineTo(x, h / 2).stroke({ color: COL_INK, width: 1, alpha: 0.3 });
			}
			g.rect(-w / 2, -h / 2, w, h).stroke({ color: COL_INK, width: 2, alpha: 0.45 });
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

	// register any uploaded custom fonts (data URLs), then rebuild once they load
	#loadFonts(objs) {
		const jobs = [];
		for (const o of objs) {
			if (o.fontUrl && o.fontFamily && !this.#loadedFonts.has(o.fontFamily)) {
				this.#loadedFonts.add(o.fontFamily);
				try {
					const ff = new FontFace(o.fontFamily, `url(${o.fontUrl})`);
					document.fonts.add(ff);
					jobs.push(ff.load().catch(() => {}));
				} catch (e) { /* ignore bad font */ }
			}
		}
		if (jobs.length) Promise.all(jobs).then(() => this.#buildObjectSprites());
	}

	// present = within its [appearDelay, appearDelay+vanishAfter] visible window
	#present(o, rt) {
		const since = rt ? rt.since : 0;
		if (since < (o.appearDelay || 0)) return false;
		if (o.vanishAfter && since >= (o.appearDelay || 0) + o.vanishAfter) return false;
		return true;
	}

	// fire an object's own action plus any extra links (touch or tap)
	#fireObjectAction(o) {
		if (o.action && o.action.kind !== "none") this.#runAction(o.action.kind, o.action.targetId);
		for (const l of (o.links || [])) this.#runAction(l.action, l.targetId);
	}

	#buildObjectSprites() {
		this.#objectsLayer.removeChildren();
		this.#sprites.clear();
		for (const o of this.#config.objects) {
			if (o.type === "pit") continue; // pits are drawn by the floor
			if (!(this.#isActive(o))) continue;
			const g = this.#makeObjectGraphic(o);
			const rt = this.#runtime.get(o.id);
			g.position.set(rt ? rt.x : o.x, rt ? rt.y : o.y);
			if (o.rotation) g.rotation = (o.rotation * Math.PI) / 180;
			if (o.opacity !== undefined) g.alpha = o.opacity;
			g.visible = this.#present(o, rt);
			const hasAction = (o.action && o.action.kind !== "none") || (o.links && o.links.length);
			if (o.clickable && hasAction) {
				g.eventMode = "static";
				g.cursor = "pointer";
				g.on("pointertap", () => { this.#playSfx("click"); this.#fireObjectAction(o); });
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
			if (rt) {
				// track whether it moved since last frame (for deadly-while-moving)
				rt.moving = Math.abs(rt.x - (rt.lastX ?? rt.x)) > 0.05 || Math.abs(rt.y - (rt.lastY ?? rt.y)) > 0.05;
				rt.lastX = rt.x; rt.lastY = rt.y;
				g.position.set(rt.x, rt.y);
				if (o.spin) g.rotation = ((o.rotation || 0) * Math.PI / 180) + (rt.spinAngle || 0);
			}
			g.visible = this.#isActive(o) && this.#present(o, rt);
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
		const gOff = (this.#config && this.#config.groundOffset) || 0;
		const armed = this.#door.armed || (!(this.#config && this.#config.doorMode) && this.#runIndex === 2);
		if (g instanceof IMPION.Sprite2d) {
			const t = this.#tex(armed ? "ld_door_armed" : "ld_door");
			if (t) g.texture = t;
			g.position.set(this.#door.x, this.#door.y + gOff);
			return;
		}
		g.clear();
		g.rect(-DOOR_W / 2, -DOOR_H, DOOR_W, DOOR_H).fill({ color: 0xcfcfcf });
		g.rect(-DOOR_W / 2, -DOOR_H, DOOR_W, DOOR_H).stroke({ color: armed ? 0x8a1f10 : 0xb37111, width: 6 });
		g.position.set(this.#door.x, this.#door.y + gOff);
	}

	//------------------------------------------------------------------------

	#ensureRuntime(id) {
		const o = this.#config.objects.find((x) => x.id === id);
		if (o && !this.#runtime.has(id)) this.#runtime.set(id, { x: o.x, y: o.y, vy: 0, traveled: 0, pong: 1, since: 0, split: 0 });
	}

	// fire a trigger's primary action plus any extra links
	#fireTrigger(t) {
		this.#runAction(t.action, t.targetId);
		for (const l of (t.links || [])) this.#runAction(l.action, l.targetId);
	}

	#runAction(kind, targetId) {
		if (kind === "none") return;
		if (kind === "startDoorChase") { this.#door.triggered = true; this.#door.armed = true; this.#drawDoor(); return; }
		if (kind === "collapseFloor") { this.#floorCollapsed = true; this.#drawFloor(); return; }
		if (kind === "nextRun") { this.#advanceRun(); return; }
		if (kind === "win") { this.#advanceRun(); return; }
		if (kind === "redirectCTA") { this.#redirectCTA(); return; }
		if (kind === "splitFloor") { this.#activeIds.add(targetId); this.#splitIds.add(targetId); this.#motionRunIds.add(targetId); this.#ensureRuntime(targetId); this.#drawFloor(); return; }
		if (kind === "openPit") { this.#activeIds.add(targetId); this.#ensureRuntime(targetId); this.#drawFloor(); return; }
		if (kind === "chain") {
			const chained = (this.#config.triggers || []).find((t) => t.id === targetId);
			if (chained && !this.#firedIds.has(chained.id)) {
				this.#firedIds.add(chained.id);
				this.#fireTrigger(chained);
			}
			return;
		}
		if (kind === "teleport") {
			// move the player to the target object's position (a teleport pad), or the door
			const to = this.#config.objects.find((o) => o.id === targetId);
			const rt = to ? this.#runtime.get(targetId) : null;
			const tx = to ? (rt ? rt.x : to.x) : this.#door.x;
			const ty = to ? (rt ? rt.y : to.y) : GROUND_Y;
			this.#hero.position.set(tx, ty);
			this.#vy = 0;
			return;
		}
		if (kind === "checkpoint") {
			// remember where the player is now; death respawns here instead of the run start
			this.#checkpoint = { x: this.#hero.position.x, y: GROUND_Y };
			return;
		}
		if (kind === "deactivate") {
			this.#hiddenIds.add(targetId); this.#activeIds.delete(targetId); this.#motionRunIds.delete(targetId);
			this.#playSfx("trap");
			this.#buildObjectSprites(); this.#drawFloor(); return;
		}
		if (kind === "toggle") {
			const o = this.#config.objects.find((x) => x.id === targetId);
			if (o && this.#isActive(o)) { this.#hiddenIds.add(targetId); this.#activeIds.delete(targetId); this.#motionRunIds.delete(targetId); }
			else { this.#hiddenIds.delete(targetId); this.#activeIds.add(targetId); this.#motionRunIds.add(targetId); this.#ensureRuntime(targetId); }
			this.#playSfx("trap");
			this.#buildObjectSprites(); this.#drawFloor(); return;
		}
		// activate
		this.#hiddenIds.delete(targetId); this.#activeIds.add(targetId); this.#motionRunIds.add(targetId); this.#ensureRuntime(targetId);
		this.#playSfx("trap");
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
		this.#playSfx("death");
		this.#app.statisticManager.handlerEvent("CHALLENGE_FAILED");
		// Level Devil retries the current run on death.
		this.#app.tween.set(this, { delay: 0.5, overwrite: "none", onComplete: () => this.#resetRun() });
	}

	failGame = () => { this.#resetRun(); };

	winGame = () => {
		if (this.#state === 10) return;
		this.#state = 10;
		this.#playSfx("win");
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

		//- force zones (conveyors / wind): push the player while inside
		for (const t of s.triggers) {
			if (!t.pushX && !t.pushY) continue;
			if (rectsOverlap(px - PLAYER_W / 2, py - PLAYER_H, PLAYER_W, PLAYER_H, t.x, t.y, t.width, t.height)) {
				px += (t.pushX || 0) * dt;
				py += (t.pushY || 0) * dt;
			}
		}
		px = clamp(px, PLAYER_W, VIEW_W - PLAYER_W);
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
			const role = roleOf(o);
			if ((role !== "solid" && role !== "spring") || !(this.#isActive(o)) || !this.#present(o, this.#runtime.get(o.id))) continue;
			const r = this.#objectWorldRect(o);
			const prevFoot = py - this.#vy * dt;
			if (this.#vy >= 0 && px > r.x && px < r.x + r.w && prevFoot <= r.y + 2 && py >= r.y) {
				if (role === "spring") { py = r.y; this.#vy = -(o.bounce || 18); this.#grounded = false; this.#playSfx("spring"); }
				else { py = r.y; this.#vy = 0; this.#grounded = true; landed = true; }
			}
		}
		if (!landed && py >= GROUND_Y) {
			if (!this.#floorCollapsed && !inOpenPit) { py = GROUND_Y; this.#vy = 0; this.#grounded = true; }
			else this.#grounded = false;
		}

		if (this.#grounded && !this.#wasGrounded) this.#playSfx("land"); // touched down
		this.#wasGrounded = this.#grounded;
		hero.position.set(px, py);
		this.#updateHeroVisual(dt);

		//- object timers / motion

		let dirty = false;
		for (const o of s.objects) {
			if (!(this.#isActive(o))) continue;
			const rt = this.#runtime.get(o.id);
			if (!rt) continue;
			const before = rt.since;
			rt.since += (1 / 60) * dt;
			if (o.spin) rt.spinAngle = (rt.spinAngle || 0) + (o.spin * Math.PI / 180) * dt; // continuous spin (e.g. saws)
			if ((o.appearDelay || 0) > 0 && before < o.appearDelay && rt.since >= o.appearDelay) dirty = true;
			if (o.type === "pit" && this.#splitIds.has(o.id) && rt.split < 1) { rt.split = Math.min(1, rt.split + (1 / 24) * dt); this.#drawFloor(); }

			// attached objects follow their parent (e.g. spikes riding the door); no self-motion
			if (o.attachTo) {
				let baseX, baseY = 0, curX = 0, curY = 0;
				if (o.attachTo === "door") { baseX = s.doorSpawnX; baseY = GROUND_Y; curX = this.#door.x; curY = this.#door.y; }
				else if (o.attachTo === "player") { baseX = s.playerSpawnX; baseY = GROUND_Y; curX = px; curY = py; }
				else {
					const po = s.objects.find((x) => x.id === o.attachTo); const prt = this.#runtime.get(o.attachTo);
					if (po) { baseX = po.x; baseY = po.y; curX = prt ? prt.x : po.x; curY = prt ? prt.y : po.y; }
				}
				if (baseX !== undefined) { rt.x = curX + (o.x - baseX); rt.y = curY + (o.y - baseY); continue; }
			}

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
			} else if (m.mode === "orbit") {
				// circle around the placed point; radius = distance, loop = reverse direction
				rt.orbit = (rt.orbit || 0) + m.speed * 0.03 * dt * (m.loop ? -1 : 1);
				const R = m.distance || 40;
				rt.x = o.x + Math.cos(rt.orbit) * R;
				rt.y = o.y + Math.sin(rt.orbit) * R;
			} else if (m.mode === "pendulum") {
				// swing on an arc; rest position = placed point, pivot R above it
				rt.orbit = (rt.orbit || 0) + m.speed * 0.05 * dt;
				const R = m.distance || 40;
				const swing = Math.sin(rt.orbit) * 1.2; // ~±70°
				rt.x = o.x + Math.sin(swing) * R;
				rt.y = (o.y - R) + Math.cos(swing) * R;
			} else if (m.mode === "path") {
				// travel through waypoints: placed point -> wp0 -> wp1 ...; loop = ping-pong
				const wps = m.waypoints || [];
				if (wps.length) {
					const path = [{ x: o.x, y: o.y }, ...wps];
					let idx = rt.wpIndex ?? 1; let wdir = rt.wpDir ?? 1;
					if (idx < 0 || idx >= path.length) { idx = 1; wdir = 1; }
					const tgt = path[idx];
					const dx = tgt.x - rt.x, dy = tgt.y - rt.y, d = Math.hypot(dx, dy) || 1;
					const step = m.speed * dt;
					if (step >= d) {
						rt.x = tgt.x; rt.y = tgt.y;
						let ni = idx + wdir;
						if (ni >= path.length) { if (m.loop) { wdir = -1; ni = path.length - 2; } else { ni = path.length - 1; wdir = 0; } }
						else if (ni < 0) { wdir = 1; ni = 1; }
						rt.wpIndex = ni; rt.wpDir = wdir;
					} else { rt.x += (dx / d) * step; rt.y += (dy / d) * step; }
				}
			}
			rt.x = clamp(rt.x, 0, VIEW_W); rt.y = clamp(rt.y, BAND_TOP, GROUND_Y + 40);
		}
		if (dirty) this.#buildObjectSprites();
		this.#syncObjects();

		//- triggers

		const pRect = { x: px - PLAYER_W / 2, y: py - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
		for (const t of s.triggers) {
			const delay = t.delay || 0;
			if (t.auto) {
				// fire automatically on a timer counted from run start (no touch needed)
				const tt = (this.#trigTimers.get(t.id) || 0) + (1 / 60) * dt;
				this.#trigTimers.set(t.id, tt);
				if (!this.#firedIds.has(t.id) && tt >= delay) {
					this.#firedIds.add(t.id);
					this.#fireTrigger(t);
					if (t.repeat) { this.#firedIds.delete(t.id); this.#trigTimers.set(t.id, 0); }
				}
				continue;
			}
			const over = rectsOverlap(pRect.x, pRect.y, pRect.w, pRect.h, t.x, t.y, t.width, t.height);
			if (over) {
				const tt = (this.#trigTimers.get(t.id) || 0) + (1 / 60) * dt;
				this.#trigTimers.set(t.id, tt);
				if (!this.#firedIds.has(t.id) && tt >= delay) {
					this.#firedIds.add(t.id);
					this.#fireTrigger(t);
				}
			} else {
				this.#trigTimers.set(t.id, 0);
				if (t.repeat) this.#firedIds.delete(t.id); // re-fire on re-entry
			}
		}

		//- collisions

		for (const o of s.objects) {
			if (!(this.#isActive(o))) continue;
			const rt = this.#runtime.get(o.id);
			if (!this.#present(o, rt)) continue;
			const wr = this.#objectWorldRect(o);
			const touch = rectsOverlap(pRect.x, pRect.y, pRect.w, pRect.h, wr.x, wr.y, wr.w, wr.h);
			if (touch && !o.clickable && ((o.action && o.action.kind !== "none") || (o.links && o.links.length))) {
				const key = "obj:" + o.id;
				if (!this.#firedIds.has(key)) { this.#firedIds.add(key); this.#fireObjectAction(o); }
			}
			if (!isLethal(o, rt ? rt.moving : false)) continue;
			const cx = rt ? rt.x : o.x;
			if (o.type === "spike") {
				const oy = rt ? rt.y : o.y;
				const floorSpike = !o.rotation && oy >= GROUND_Y - 14;
				if (floorSpike) { if (Math.abs(px - cx) < o.width / 2 && py > GROUND_Y - 12) { this.#die(); return; } }
				else if (touch) { this.#die(); return; } // ceiling / wall / repositioned spike
				continue;
			}
			if (touch) { this.#die(); return; }
		}

		//- door chase (runs 0/1) + skip trap

		// fake = troll door that runs away & kills; win = static safe goal; null = legacy per-run
		const dm = s.doorMode;
		const doorChases = dm === "fake" || (dm == null && (this.#runIndex === 0 || this.#runIndex === 1));
		if (doorChases) {
			const hasDoorTrigger = s.triggers.some((t) => t.action === "startDoorChase");
			if (!hasDoorTrigger && !this.#door.triggered) {
				const byProximity = this.#door.x - px < s.triggerDistance;
				const byInput = this.#vx || this.#keys["Space"];
				// legacy: run0 arms on proximity, run1 on first input; fake arms on either
				const trig = dm === "fake" ? (byProximity || byInput) : (this.#runIndex === 0 ? byProximity : byInput);
				if (trig) { this.#door.triggered = true; this.#door.armed = true; this.#drawDoor(); }
			}
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

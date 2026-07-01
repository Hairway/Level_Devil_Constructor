import * as IMPION from "#impion";
import { LEVEL } from "./LevelConfig.mjs";

// Level Devil platformer runtime on the IMPION base.
// Physics/collision port of the constructor engine, adapted to PixiJS v8 + the centered design space.

export default class Game extends IMPION.ComponentEmpty {
	#app;

	#numClicks = 0;
	#state = 0;			// 0 = idle, 1 = playing, 10 = ended
	#stageWidth = 0;
	#stageHeight = 0;

	#keys = {};

	// hero physics (position.y is the feet line)
	#vx = 0;
	#vy = 0;
	#grounded = false;

	// level params (read in initGame)
	#playerSpeed = 5;
	#jumpForce = 15;
	#gravity = 0.9;
	#spawnX = -270;
	#doorX = 290;
	#spikes = [-70, 70];

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

	//------------------------------------------------------------------------

	#startPlaying() {
		if (this.#state !== 0) return;
		this.#state = 1;
		this.#app.statisticManager.handlerEvent("CHALLENGE_STARTED");
		this.#app.soundManager.on(this.#numClicks);
	}

	#jump() {
		this.#startPlaying();
		if (this.#state === 1 && this.#grounded) {
			this.#vy = -this.#jumpForce;
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

	// pointer down on stage = tap to jump (mobile)
	stageDown = (e) => {
		this.handlerTap(e);
		this.#jump();
	};
	stageMove = () => {};
	stageUp = () => {};

	//------------------------------------------------------------------------

	initGame = () => {
		const p = this.#app.params;
		if (p.playerSpeed) this.#playerSpeed = p.playerSpeed.value;
		if (p.jumpForce) this.#jumpForce = p.jumpForce.value;
		if (p.gravity) this.#gravity = p.gravity.value;
		if (p.playerSpawnX) this.#spawnX = p.playerSpawnX.value;
		if (p.doorX) this.#doorX = p.doorX.value;
		if (p.spikes && Array.isArray(p.spikes.value)) this.#spikes = p.spikes.value;

		this.#resetHero();
	};

	#resetHero() {
		const hero = this.components["Hero"];
		hero.position.set(this.#spawnX, LEVEL.groundY);
		this.#vx = 0;
		this.#vy = 0;
		this.#grounded = true;
	}

	reloadParams() {}

	//------------------------------------------------------------------------

	failGame = () => {
		// Level Devil retries on death rather than ending — just respawn.
		this.#resetHero();
	};

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

	//------------------------------------------------------------------------

	enterframe = (timeDelta) => {
		if (this.#state === 10) return;
		const dt = timeDelta || 1;
		const hero = this.components["Hero"];
		if (!hero) return;

		//- horizontal input

		this.#vx = 0;
		if (this.#keys["ArrowLeft"] || this.#keys["KeyA"]) this.#vx = -this.#playerSpeed;
		if (this.#keys["ArrowRight"] || this.#keys["KeyD"]) this.#vx = this.#playerSpeed;

		//- integrate

		this.#vy += this.#gravity * dt;
		let x = hero.position.x + this.#vx * dt;
		let y = hero.position.y + this.#vy * dt;

		const minX = -LEVEL.corridorHalf + LEVEL.heroW / 2;
		const maxX = LEVEL.corridorHalf - LEVEL.heroW / 2;
		x = Math.max(minX, Math.min(maxX, x));

		//- ground collision

		if (y >= LEVEL.groundY) {
			y = LEVEL.groundY;
			this.#vy = 0;
			this.#grounded = true;
		} else {
			this.#grounded = false;
		}

		hero.position.set(x, y);

		//- spike collision (only when low enough that feet reach the spikes)

		for (const sx of this.#spikes) {
			if (Math.abs(x - sx) < LEVEL.heroW / 2 + LEVEL.spikeW / 2 - 6 && y > LEVEL.groundY - LEVEL.spikeH + 6) {
				this.#app.statisticManager.handlerEvent("CHALLENGE_FAILED");
				this.failGame();
				return;
			}
		}

		//- reach the door → win

		if (x >= this.#doorX - LEVEL.doorW / 2 - LEVEL.heroW / 2) {
			this.winGame();
		}
	};

	resize = (width, height) => {
		this.#stageWidth = width;
		this.#stageHeight = height;
	};
}

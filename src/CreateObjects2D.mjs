import * as IMPION from "#impion";
import { LEVEL, hx } from "./LevelConfig.mjs";

// Level Devil scene, authored on the IMPION game_2d base (PixiJS v8).
// Coordinate space: centered design space (0,0 = screen center), fits 720x1280 / 1280x720.

export default class CreateObjects2D {
	#app;
	#gameComponent;

	constructor({ app, gameComponent }) {
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;

		const scene = this.#app.view2d.scene;
		const params = this.#app.params;

		const bg = hx(params.bgColor ? params.bgColor.value : "#c77b00", 0xc77b00);
		const ground = hx(params.groundColor ? params.groundColor.value : "#e2a33c", 0xe2a33c);
		const spikes = (params.spikes && Array.isArray(params.spikes.value)) ? params.spikes.value : [-70, 70];
		const playerSpawnX = params.playerSpawnX ? params.playerSpawnX.value : -270;
		const doorX = params.doorX ? params.doorX.value : 290;

		const half = LEVEL.corridorHalf;

		//- Background fill (whole screen)

		this.components["FullscreenOverlay"] = new IMPION.FullscreenOverlay({
			fill	: bg,
			alpha	: 1,
			cover	: true,
		});
		scene.addChild(this.components["FullscreenOverlay"]);

		//- Level (static geometry): floor band + spikes + door

		const level = new IMPION.Group2d();

		const floor = new IMPION.Graphics2d();
		floor.rect(-half, LEVEL.groundY, half * 2, LEVEL.floorBottom - LEVEL.groundY).fill({ color: ground });
		floor.rect(-half, LEVEL.groundY, half * 2, 6).fill({ color: 0xffffff, alpha: 0.18 });
		level.addChild(floor);

		const spikeGfx = new IMPION.Graphics2d();
		const sw = LEVEL.spikeW;
		const sh = LEVEL.spikeH;
		for (const sx of spikes) {
			spikeGfx
				.poly([sx - sw / 2, LEVEL.groundY, sx, LEVEL.groundY - sh, sx + sw / 2, LEVEL.groundY])
				.fill({ color: 0x231708 });
		}
		level.addChild(spikeGfx);

		const door = new IMPION.Graphics2d();
		door.rect(doorX - LEVEL.doorW / 2, LEVEL.groundY - LEVEL.doorH, LEVEL.doorW, LEVEL.doorH).fill({ color: 0xcfcfcf });
		door.rect(doorX - LEVEL.doorW / 2, LEVEL.groundY - LEVEL.doorH, LEVEL.doorW, LEVEL.doorH).stroke({ color: 0xb37111, width: 6 });
		level.addChild(door);

		scene.addChild(level);
		this.components["Level"] = level;
		this.components["Door"] = door;

		//- Hero

		const hero = new IMPION.Graphics2d();
		hero.rect(-LEVEL.heroW / 2, -LEVEL.heroH, LEVEL.heroW, LEVEL.heroH).fill({ color: 0x231708 });
		hero.position.set(playerSpawnX, LEVEL.groundY);
		scene.addChild(hero);
		this.components["Hero"] = hero;

		//- Title text (task)

		const title = new IMPION.Text2dBase({
			text	: (params.textTask && params.textTask.value) || "REACH THE DOOR",
			style	: { fontFamily: "Arial", fontSize: 46, fontWeight: "900", fill: 0x231708, align: "center" },
		});
		title.anchor.set(0.5);
		title.position.set(0, -430);
		scene.addChild(title);
		this.components["Task"] = title;

		//- Endcard CTA (shown on win): full overlay + button, both wired to clickAd in CreateEvents

		this.components["FullscreenCTA"] = new IMPION.FullscreenOverlay({
			fill	: 0x000000,
			alpha	: 0,
		});
		scene.addChild(this.components["FullscreenCTA"]);

		const cta = new IMPION.Group2d();
		const ctaBg = new IMPION.Graphics2d();
		ctaBg.roundRect(-150, -46, 300, 92, 14).fill({ color: 0x10b981 });
		cta.addChild(ctaBg);
		const ctaText = new IMPION.Text2dBase({
			text	: (params.textBtnWin && params.textBtnWin.value) || "PLAY NOW",
			style	: { fontFamily: "Arial", fontSize: 40, fontWeight: "900", fill: 0xffffff },
		});
		ctaText.anchor.set(0.5);
		cta.addChild(ctaText);
		cta.position.set(0, 250);
		cta.visible = false;
		scene.addChild(cta);
		this.components["ButtonCTA"] = cta;
	}
}

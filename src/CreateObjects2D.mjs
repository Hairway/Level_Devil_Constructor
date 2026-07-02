import * as IMPION from "#impion";
import { hx, DEFAULT_BG } from "./LevelConfig.mjs";

// Level Devil scene shell on the IMPION game_2d base (PixiJS v8).
// Static chrome only (background, LevelRoot container, on-screen controls, title, endcard).
// Per-run level geometry is (re)built by Game.mjs inside LevelRoot.

const arrowButton = (dir, size) => {
	const g = new IMPION.Graphics2d();
	g.roundRect(-size / 2, -size / 2, size, size, 14).fill({ color: 0x231708, alpha: 0.28 });
	g.roundRect(-size / 2, -size / 2, size, size, 14).stroke({ color: 0xffffff, width: 3, alpha: 0.55 });
	const a = size * 0.24;
	if (dir === 'left') g.poly([a, -a, -a, 0, a, a]).fill({ color: 0xffffff, alpha: 0.85 });
	else if (dir === 'right') g.poly([-a, -a, a, 0, -a, a]).fill({ color: 0xffffff, alpha: 0.85 });
	else g.poly([-a, a, 0, -a, a, a]).fill({ color: 0xffffff, alpha: 0.85 }); // up (jump)
	g.eventMode = 'static';
	g.cursor = 'pointer';
	return g;
};

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
		const level = params.levelData ? params.levelData.value : null;
		const firstConfig = level && level.runs && level.runs[0] ? level.runs[0].config : {};
		const bg = hx(firstConfig.bgColor || DEFAULT_BG, 0xc77b00);

		//- Background / input catcher (CreateEvents wires stageDown here)

		this.components["FullscreenOverlay"] = new IMPION.FullscreenOverlay({ fill: bg, alpha: 1, cover: true });
		scene.addChild(this.components["FullscreenOverlay"]);

		//- LevelRoot: authored in legacy 800x328 space; Game positions/scales it in resize()

		const levelRoot = new IMPION.Group2d();
		scene.addChild(levelRoot);
		this.components["LevelRoot"] = levelRoot;

		//- Title

		const title = new IMPION.Text2dBase({
			text: (params.textTask && params.textTask.value) || "REACH THE DOOR",
			style: { fontFamily: "Arial", fontSize: 44, fontWeight: "900", fill: 0x231708, align: "center" },
		});
		title.anchor.set(0.5);
		title.position.set(0, -300);
		scene.addChild(title);
		this.components["Task"] = title;

		//- On-screen controls

		const size = 118;
		const left = arrowButton('left', size);
		const right = arrowButton('right', size);
		const jump = arrowButton('up', size);
		left.position.set(-250, 470);
		right.position.set(-110, 470);
		jump.position.set(250, 470);
		left.on('pointerdown', () => this.#gameComponent.controlDown('left'));
		left.on('pointerup', () => this.#gameComponent.controlUp('left'));
		left.on('pointerupoutside', () => this.#gameComponent.controlUp('left'));
		right.on('pointerdown', () => this.#gameComponent.controlDown('right'));
		right.on('pointerup', () => this.#gameComponent.controlUp('right'));
		right.on('pointerupoutside', () => this.#gameComponent.controlUp('right'));
		jump.on('pointerdown', () => this.#gameComponent.controlDown('jump'));
		scene.addChild(left, right, jump);
		this.components["CtrlLeft"] = left;
		this.components["CtrlRight"] = right;
		this.components["CtrlJump"] = jump;

		//- Endcard CTA (shown on win/redirect); wired to clickAd in CreateEvents

		this.components["FullscreenCTA"] = new IMPION.FullscreenOverlay({ fill: 0x000000, alpha: 0 });
		scene.addChild(this.components["FullscreenCTA"]);

		const cta = new IMPION.Group2d();
		const ctaBg = new IMPION.Graphics2d();
		ctaBg.roundRect(-160, -50, 320, 100, 16).fill({ color: 0x10b981 });
		cta.addChild(ctaBg);
		const ctaText = new IMPION.Text2dBase({
			text: (params.textBtnWin && params.textBtnWin.value) || "PLAY NOW",
			style: { fontFamily: "Arial", fontSize: 42, fontWeight: "900", fill: 0xffffff },
		});
		ctaText.anchor.set(0.5);
		cta.addChild(ctaText);
		cta.position.set(0, 250);
		cta.visible = false;
		scene.addChild(cta);
		this.components["ButtonCTA"] = cta;
		this.components["ButtonCTAText"] = ctaText; // so Game can relabel it per level
	}
}

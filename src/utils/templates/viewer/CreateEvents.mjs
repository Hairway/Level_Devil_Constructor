import * as THREE from "three";
import * as IMPION from "#impion";

export default class CreateEvents{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
		
		//-
		
		this.components["FullscreenOverlay"].eventMode = "static";
		this.components["FullscreenOverlay"].on('pointerdown', this.#gameComponent.stageDown);
		this.components["FullscreenOverlay"].on('pointermove', this.#gameComponent.stageMove);
		this.components["FullscreenOverlay"].on('pointerup', this.#gameComponent.stageUp);
		this.components["FullscreenOverlay"].on('pointerout', this.#gameComponent.stageUp);
		this.components["FullscreenOverlay"].on('pointeroutside', this.#gameComponent.stageUp);
		this.components["FullscreenOverlay"].on('touchendoutside', this.#gameComponent.stageUp);
		
		this.components["FullscreenCTA"].eventMode = "static";
		this.components["FullscreenCTA"].on('pointerup', this.#app.platformManager.clickAd);
		
		this.components["ButtonCTA"].eventMode = "static";
		this.components["ButtonCTA"].on('pointerup', this.#app.platformManager.clickAd);
		
		
	}
}
import * as IMPION from "#impion";

export default class CreateTextures{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
		
		//-

		this.#app.assets.textures.pixi["vfx_noise_perlin"].source.addressMode = "repeat";
		
		
	}
}
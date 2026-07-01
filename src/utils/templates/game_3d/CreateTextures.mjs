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
		
		//this.#app.assets.textures.three["texture"].wrapS = THREE.ClampToEdgeWrapping;
		//this.#app.assets.textures.three["texture"].wrapT = THREE.ClampToEdgeWrapping;
		//this.#app.assets.textures.three["texture"].flipY = false;
		
		//this.#app.assets.textures.three["texture_ground_0"].repeat.set(12, 12);
		
		//this.#app.assets.textures.pixi["texture_world"].source.addressMode = 'repeat';
		
		
	}
}
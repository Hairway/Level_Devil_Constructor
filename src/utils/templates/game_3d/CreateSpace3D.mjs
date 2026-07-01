import * as IMPION from "#impion";

export default class CreateSpace3D{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
		
		//-

		this.#app.view3d.scene.background = new IMPION.Color3d( 0x29c8f6 );
		//this.#app.view3d.scene.fog = new IMPION.Fog3d(0x29c8f6, 15, 25);
		//this.#app.view3d.scene.environment = this.#app.assets.textures.three["texture_environment"];
		//this.#app.view3d.scene.environment.mapping = IMPION.EquirectangularReflectionMapping;
	
	}
}
import * as THREE from "three";
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
		
		this.#app.view3d.scene.background = new THREE.Color( 0x29c8f6 );
		//this.#app.view3d.scene.fog = new THREE.Fog(0x29c8f6, 15, 25);
		//this.#app.view3d.scene.environment = this.#app.assets.textures.three["texture_environment"];
		//this.#app.view3d.scene.environment.mapping = THREE.EquirectangularReflectionMapping;
	}
}
import * as THREE from "three";
import * as IMPION from "#impion";

export default class CreateObjects3D{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
		
		//------------------------
		
		//- World
		
		this.components["World"] = new IMPION.Model3d({
            app			: this.#app,
			name		: "world",
            physics		: true,
        });
		this.#app.view3d.scene.add( this.components["World"] );

		//if(this.#app.view3d.postprocessing){
		//	this.#app.view3d.postprocessing["OutlineEffect"].selection.add( this.components["World"]["Cube"] );
		//}
				
		//------------------------
		
		//- Camera
		
		this.components["Camera"] = new IMPION.CameraTargets({
            camera			: this.#app.view3d.camera,
			position 		: new THREE.Vector3( -25, 25, 25),
			rate			: 0.85,
			joystickAngle	: 0.0*Math.PI,
			deltaVertical	: new THREE.Vector3( 0, 0, 0),
			deltaHorizontal	: new THREE.Vector3( 0, 0, 0),
			targets 		: {
				"target" : {object: this.components["World"], weight:1}
			}
        });		
		
		this.components["Camera"].update(true);
		delete this.components["Camera"];
		
	}
}
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
			material	: this.materials["world"],
        });
		this.#app.view3d.scene.add( this.components["World"] );

		//if(this.#app.view3d.postprocessing){
		//	this.#app.view3d.postprocessing["OutlineEffect"].selection.add( this.components["World"]["Cube"] );
		//}
		
		//------------------------
		
		//- EmitterDust
						
		this.components["EmitterDust"] = new IMPION.Emitter3d({
			particles			: [ new IMPION.Sprite3d( this.materials["dust"] ) ],
			quantity			: 50,
			
			frequency			: 0,
			spawn				: {type:"rect", x:0, y:0, z:0, dx:3, dy:3, dz:3},
			cloneMaterial		: true,
			auto				: true,
			
			scale				: {x:0.30, y:1, z:1, dx:0.15, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:0, dy:0, dz:0},
			opacity				: {a:0.3, da:0.05, easeIn:true},
			
			gravity				: {x:0, y:0, z:0},
			friction			: {x:0.05, y:0.05, z:0.05, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0, y:0.1, z:0, dx:0.01, dy:0.0, dz:0.01},				
			velocityScale		: {x:0, y:0, z:0, dx:0, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:-0.02, da:0.0},				
			velocityAngular		: {x:0, y:0, z:0, dx:0.1, dy:0.0, dz:0.0},
		}).run(20);
		this.#app.view3d.scene.add( this.components["EmitterDust"] );	
		
		//------------------------
		
		//- Camera
		
		this.components["Camera"] = new IMPION.CameraTargets({
            camera			: this.#app.view3d.camera,
			position 		: new IMPION.Vector3( -5, 5, -5),
			rate			: 0.85,
			joystickAngle	: 0.0*Math.PI,
			deltaVertical	: new IMPION.Vector3( 0, 0, 0),
			deltaHorizontal	: new IMPION.Vector3( 0, 0, 0),
			targets 		: {
				"target" : {object: this.components["World"]["Cube"], weight:1}
			}
        });		
		
		
	}
}
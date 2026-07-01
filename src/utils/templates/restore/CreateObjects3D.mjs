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
	
		this.#app.assets.models["vfx_pack_standard"].scene.traverse((object) => {
			if(object.isMesh){
				this.#app.assets.models["vfx_pack_standard"][object.name] = object;
			}
		});
		
		this.#app.assets.models["vfx_pack_standard"]["fragment"].material = new IMPION.MeshLambertMaterial3d({
			color: new IMPION.Color3d(0x8a8caa)
		});
		this.#app.assets.models["vfx_pack_standard"]["fragment"].castShadow = true;
	
		let ground = new IMPION.Group3d();
		ground.wx = 100;
		ground.wy = 10;
		ground.wz = 100;
		ground.position.y = -5;
		this.#app.physics3d.add(ground, {mass: 0});
	
		//------------------------
	
		//-	vfxFire

		this.components["vfxFire"] = new IMPION.Emitter3d({
			particles			: [ new IMPION.Sprite3d( this.materials["vfxFire"] ) ],
			quantity			: 50,
			frequency			: 3,
			
			spawn				: {type:"rect", x:-0.1, y:0, z:0.1, dx:0.0, dy:0, dz:0.0},
			cloneMaterial		: true,
			auto				: true,
			
			scale				: {x:2.5, y:1, z:1, dx:0.5, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:7, dy:0, dz:0},
			opacity				: {a:0.7, da:0.3, easeIn:true},
			
			gravity				: {x:0, y:0, z:0},
			friction			: {x:0, y:0, z:0, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0.0, y:0.020, z:0.0, dx:0.0, dy:0.01, dz:0.0},				
			velocityScale		: {x:-0.08, y:0, z:0, dx:0.003, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:0, da:0.0},				
			velocityAngular		: {x:0, y:0, z:0, dx:0.02, dy:0.0, dz:0.0},
		});			
		this.#app.view3d.scene.add( this.components["vfxFire"] );	
	
		//-	vfxFireSmoke

		this.components["vfxFireSmoke"] = new IMPION.Emitter3d({
			particles			: [
				new IMPION.Sprite3d( this.materials["vfxSmoke_0"] ),
				new IMPION.Sprite3d( this.materials["vfxSmoke_1"] ),
			],
			quantity			: 50,
			frequency			: 5,
			
			spawn				: {type:"rect", x:0, y:0, z:0, dx:0.1, dy:0, dz:0.1},
			cloneMaterial		: true,
			auto				: true,
			
			scale				: {x:0.8, y:1, z:1, dx:0.30, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:7, dy:0, dz:0},
			opacity				: {a:0.6, da:0.3, easeIn:true},
			
			gravity				: {x:0, y:0, z:0},
			friction			: {x:0, y:0, z:0, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0.01, y:0.015, z:0.0, dx:0.002, dy:0.01, dz:0.002},				
			velocityScale		: {x:0.006, y:0, z:0, dx:0.003, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:-0.005, da:0.0},				
			velocityAngular		: {x:0, y:0, z:0, dx:0.02, dy:0.0, dz:0.0},
		});
		this.#app.view3d.scene.add( this.components["vfxFireSmoke"] );
		
		//-	vfxStone
		
		this.components["vfxStone"] = new IMPION.Emitter3d({
			particles			: [
				this.#app.assets.models["vfx_pack_standard"]["fragment"]
			],
			quantity			: 100,
			frequency			: 8,
			
			spawn				: {type:"rect", x:0, y:0.3, z:0, dx:0.0, dy:0, dz:0.0},
			cloneMaterial		: false,
			auto				: true,
			physics				: this.#app.physics3d,
			
			scale				: {x:1.5, y:1, z:1, dx:1.0, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:7, dy:7, dz:7},
			opacity				: {a:1.0, da:0.0, easeIn:false},
			
			gravity				: {x:0, y:0, z:0},
			friction			: {x:0, y:0, z:0, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0.01, y:2.5, z:0.0, dx:3.5, dy:2.5, dz:3.5},				
			velocityScale		: {x:-0.02, y:0, z:0, dx:0.01, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:0.0, da:0.0},				
			velocityAngular		: {x:0, y:0, z:0, dx:0.1, dy:0.1, dz:0.1},
		});
		this.#app.view3d.scene.add( this.components["vfxStone"] );
		
		//------------------------
		
		//- Camera
		
		this.components["Camera"] = new IMPION.CameraTargets({
            camera			: this.#app.view3d.camera,
			position 		: new IMPION.Vector3( -5, 5, 5),
			rate			: 0.85,
			joystickAngle	: 0.0*Math.PI,
			deltaVertical	: new IMPION.Vector3( 0, 0, 0),
			deltaHorizontal	: new IMPION.Vector3( 0, 0, 0),
			targets 		: {
				"target" : {object: new IMPION.Group3d(), weight:1}
			}
        });		
		
		
	}
}
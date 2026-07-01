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
            //material	: this.materials["world"],
        });
		this.#app.view3d.scene.add( this.components["World"] );

			//-
	
		for(let i=0; i<this.components["World"]["grass"].children.length; i++){					
			this.components["World"]["grass"].children[i].castShadow = false;
		}
		
		this.materials["grass"].transparent = true;
		this.materials["grass"].depthWrite = false;
		this.materials["grass"].opacity = 0.5;
			
			//-
			
		this.components["PriceLabel"] = new IMPION.PriceLabel3d({
			mesh 		: this.components["World"]["place"],
			image	 	: this.#app.assets.images["texture_place"],
			fill 		: "#24c717",
			padding 	: 15,
			width 		: 256,
			height 		: 256,
			price 		: 10,
			autoFill 	: true,
			textStyle	: {
				fontFamily 			: "Baloo",				
				fontSize 			: 50,
				fontWeight 			: "normal",
				fill				: "#ffffff",
				align				: "center",
				valign				: "center",
				x					: 80, 
				y					: 50,				
				//stroke				: "#000000",
				//strokeThickness		: 2,
			},
		});
		
		this.components["PriceLabel"].setPrice(8);
		
			//-
			
		this.components["World"]["raft"].rotation.x = 0.05;
		this.components["World"]["raft"].rotation.z = 0.05;
		
		this.#app.tween.to(this.components["World"]["raft"].position,	{duration:0.8, delay:0.0, overwrite: "none", y:"-=0.2", repeat:-1, yoyo:true, ease:"sine.inOut"});
		this.#app.tween.to(this.components["World"]["raft"].rotation,	{duration:1.2, delay:0.0, overwrite: "none", x:"-=0.1", repeat:-1, yoyo:true, ease:"sine.inOut"});
		this.#app.tween.to(this.components["World"]["raft"].rotation,	{duration:1.4, delay:0.0, overwrite: "none", z:"-=0.1", repeat:-1, yoyo:true, ease:"sine.inOut"});
		
		//------------------------
		
		//- PathFinder
		
		this.components["World"]["navigation"].visible = false;

		this.components["PathFinder"] = new IMPION.PathFinder3d({
			debug		: false,
			method		: "AS",
			worldX 		: -30,
			worldZ 		: -30,
			worldWX		: +60,
			worldWZ		: +60,
			worldCell 	: 1.0,
			navigations : [
				this.components["World"]["navigation_mesh"],
			],
		});
		
		//------------------------
		
		//- vfxFire
		
		this.components["vfxFire"] = new IMPION.VfxPack3d({
			app 			: this.#app,
			type 			: "fireSimple",
			gameComponent 	: this.#gameComponent,
			pack			: this.#app.assets.models["vfx_pack_standard"],
			settings		: {}
		});
		this.components["World"]["сamp_fire"].add( this.components["vfxFire"] );
			
		//- vfxFireSpark
	
		this.components["vfxFireSpark"] = new IMPION.VfxPack3d({
			app 			: this.#app,
			type 			: "fireSparkSimple",
			gameComponent 	: this.#gameComponent,
			pack			: this.#app.assets.models["vfx_pack_standard"],
			settings		: {}
		});
		this.components["World"]["сamp_fire"].add( this.components["vfxFireSpark"] );
				
		//- vfxFireSmoke
	
		this.components["vfxFireSmoke"] = new IMPION.VfxPack3d({
			app 			: this.#app,
			type 			: "fireSmokeSimple",
			gameComponent 	: this.#gameComponent,
			pack			: this.#app.assets.models["vfx_pack_standard"],
			settings		: {}
		});
		this.components["World"]["сamp_fire"].add( this.components["vfxFireSmoke"] );
	
		//- EmitterDust
						
		this.components["EmitterDust"] = new IMPION.Emitter3d({
			particles			: [ new IMPION.Sprite3d( this.materials["vfxDust"] ) ],
			quantity			: 100,
			
			frequency			: 0,
			spawn				: {type:"rect", x:0, y:0, z:0, dx:0, dy:0, dz:0},
			cloneMaterial		: true,
			auto				: false,
			//physics				: this.#app.physics3d,
			
			scale				: {x:1.2, y:1, z:1, dx:0.4, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:7, dy:0, dz:0},
			opacity				: {a:0.6, da:0.3, easeIn:true},
			
			gravity				: {x:0, y:0, z:0},
			friction			: {x:0.05, y:0.05, z:0.05, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0, y:0.0, z:0, dx:0.01, dy:0.0, dz:0.01},				
			velocityScale		: {x:0, y:0, z:0, dx:0, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:-0.02, da:0.0},				
			velocityAngular		: {x:0, y:0, z:0, dx:0, dy:0.0, dz:0.0},
		});
		this.#app.view3d.scene.add( this.components["EmitterDust"] );	
		
		//------------------------
		
		let heightMap = new IMPION.HeightMapSampler3d({
			renderer: this.#app.view3d.renderer,
			mesh	: this.components["World"]["ground-terrain"],
			size	: 512,
			bounds	: {
				minX: -30,
				maxX: 30,
				minZ: -30,
				maxZ: 30
			},
			minY: -5,
			maxY: 10
		});
		
		//------------------------
		
		//- Hero
			
		this.components["Hero"] = new IMPION.Character3d({
            app					: this.#app,
            name				: "hero",			
			isAI				: false,
			heightMap			: heightMap,
			//stickMeshGround		: this.components["World"]["ground"],
        });
		this.#app.view3d.scene.add( this.components["Hero"] );
			
			//-
			
	//	if(this.#app.view3d.postprocessing && this.#app.view3d.postprocessing["OutlineEffect"]){
	//		this.#app.view3d.postprocessing["OutlineEffect"].selection.add( this.components["Hero"]["body"] );
	//	}
		
			//-
			
	//	this.components["Hero"].action["idle"].speed = 0.85;
					
			//-
					
	//	this.components["Hero"]["Label"] = new IMPION.Sprite3d( this.materials["labelHero"] );
	//	this.components["Hero"]["Label"].position.set(0, 3.2, 0);		
	//	this.components["Hero"].add( this.components["Hero"]["Label"] );
			
			//-
			
		this.components["Hero"].position.copy( this.components["World"]["point_hero"].position ); 
		this.components["Hero"].positionTo.copy( this.components["Hero"].position ); 
			
			//-
			
		this.#app.physics3d.addCharacter( this.components["Hero"] );
	
		//------------------------
		
		//- People
			
		for(let i = 0; i<this.components["World"]["points_people"].children.length; i++){
		
			this.components["People_"+i] = new IMPION.Character3d({
				app					: this.#app,
				name				: "hero",
				isAI				: true,
				forceRun			: 6,
				//heightMap			: heightMap,
				//stickMeshGround		: this.components["World"]["navigation"],
			});
			this.#app.view3d.scene.add( this.components["People_"+i] );
			
			//-
			
			//this.components["People_"+i].action["idle"].speed = 0.85;
	
			//-
	
			this.components["People_"+i].position.copy( this.components["World"]["points_people"].children[i].position ); 
			this.components["People_"+i].positionTo.copy( this.components["World"]["points_people"].children[i].position ); 
			
			//-
			
			this.#app.physics3d.addCharacter( this.components["People_"+i] );
		}	
			
	//	const bounds = {
	//		minX: -15,
	//		maxX: 15,
	//		minZ: -15,
	//		maxZ: 15
	//	};
	//	
	//	for(let i = 10; i<1000; i++){
	//	
	//		this.components["People_"+i] = new IMPION.Character3d({
	//			app					: this.#app,
	//			name				: "hero",
	//			isAI				: true,
	//			forceRun			: 6,
	//			heightMap			: heightMap,
	//			//stickMeshGround		: this.components["World"]["navigation"],
	//		});
	//		this.#app.view3d.scene.add( this.components["People_"+i] );
	//		
	//		//-
	//		
	//		const pos =  new IMPION.Vector3(
	//			bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
	//			0,
	//			bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
	//		);
	//
	//
	//		//-
	//
	//		this.components["People_"+i].position.copy( pos ); 
	//		this.components["People_"+i].positionTo.copy( pos ); 
	//
	//	}	
		
		//------------------------
		
		//- Camera

		this.components["Camera"] = new IMPION.CameraTargets({
            camera			: this.#app.view3d.camera,
			position 		: new IMPION.Vector3( -12, 22, 12),
			rate			: 0.85,
			joystickAngle	: Math.atan2(0-(-12), 0-12) - 0.5*Math.PI,
			deltaVertical	: new IMPION.Vector3( 0, 0, 0),
			deltaHorizontal	: new IMPION.Vector3( 0, 0, 0),
			targets 		: {
				"hero" : {object: this.components["Hero"], weight:1}
			}
        });		
		
		this.components["Camera"].update(true);
		
	}
}
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import * as IMPION from "#impion";

export default class Character3d extends IMPION.Component3d{

	componentType2D = false;
	componentType3D = true;
	
	#settings;
	#app;
	#name;
	
	character;
	heightMap;
	
	physicsCharacter = false;

	mixer;
	action = {};
	actionPool = {"idle":[], "walk":[], "run":[], "jump":[], "attack":[], "fire":[], "hit":[], "reload":[], "fail":[], "die":[], "up":[], "other":[]};
	actionCurrent;
	isAction = {};
	
	obj = {};
	
	#stickPoint = new IMPION.Group3d();
	#stickDirection = new IMPION.Vector3(0, -1, 0);
	#stickRaycaster = new IMPION.Raycaster3d();
	#stickIntersects;
		
	//------------------------------------------------------------------------
	
	constructor( settings ){
		super();
		
		this.#app = settings.app;
		
		//-
		
		this.#settings = Object.assign({
			
			model			: null,		
			material 		: null,
			name 			: null,
			
			heightMap 		: null,
			
			actionStandard 	: "idle",

			autoMove		: true,
			autoRotation	: true,
			isBoneAnimation	: true,
			isSkeleton		: true,
			isActionAutoplay: true,

			stickMeshGround : null,
			
			dispose 		: [],
				
			castShadow 		: true,
			receiveShadow 	: true,
			frustumCulled 	: true,
			
			forceWalk 		: 5.0,
			forceRun 		: 10.0,
			forceJump 		: 5.0,
			
			angularVelocityRK	: 0.65,
			angularLookRK		: 0.65,
			
			position		: new IMPION.Vector3(0,0,0),
			rotation		: new IMPION.Vector3(0,0,0),
			scale			: new IMPION.Vector3(1,1,1),
			
			life			: 100,
			
			wx 				: 0.6,
			wy 				: 1.8,
			wz 				: 0.6,	
			
			tmAI 			: Math.randomInteger(0, 100),
					
		}, settings);
		
		//- 
		
		this.#updateParams();		
		this.#initMesh();
		this.#traverseModel();		
		this.#disposeMeshes();		
		this.#processMixer();
		
		//-		
		
		this.setActionPool(this.actionStandard, 1, Math.random());
	
		//-		
		
		return this;
    }
	
	//------------------------------------------------------------------------
	
	#updateParams(){
		this.#settings.rotation 	= new IMPION.Euler3d().setFromVector3(this.#settings.rotation);
		
		this.dataModel				= this.#settings.model;
		this.#name					= this.#settings.name;
		
		this.life 					= this.#settings.life;
		this.lifeMax				= this.#settings.life;
		
		this.heightMap				= this.#settings.heightMap;
		
		this.wx 					= this.#settings.wx;
		this.wy 					= this.#settings.wy;
		this.wz 					= this.#settings.wz;
				
		this.isAI 					= this.#settings.isAI;
		this.tmAI 					= this.#settings.tmAI;
				
		this.forceWalk 				= this.#settings.forceWalk;
		this.forceRun 				= this.#settings.forceRun;
		this.forceJump 				= this.#settings.forceJump;
		
		this.angularVelocityRK 		= this.#settings.angularVelocityRK;
		this.angularLookRK 			= this.#settings.angularLookRK;
		
		this.actionStandard 		= this.#settings.actionStandard;
		this.stickMeshGround 		= this.#settings.stickMeshGround;
		this.isBoneAnimation 		= this.#settings.isBoneAnimation;
		this.isActionAutoplay 		= this.#settings.isActionAutoplay;
		this.autoMove 				= this.#settings.autoMove;
		this.autoRotation 			= this.#settings.autoRotation;
		
		this.angularVelocityCurrent = this.#settings.rotation.y;
		this.angularVelocity 		= this.#settings.rotation.y;	
		this.angularLookCurrent 	= this.#settings.rotation.y;
		this.angularLook 			= this.#settings.rotation.y;	
		this.angularUser 			= 0;	
		this.positionTo 			= this.#settings.position;	

		this.navigationPath 		= [];
				
		for(let key in this.actionPool){
			this.isAction[key] = false;
		}
	}
	
	#initMesh(){
		if(!this.#settings.model && this.#name){
			this.dataModel = this.#app.assets.models[this.#name];
			this.#settings.model = this.#app.assets.models[this.#name];
		}
		
		if(this.#settings.model.scene){
			this.#settings.model.scene.traverse((object) => {
				if(object.isSkinnedMesh){		
					this.isSkeleton = true;				
				}			
			});
		}
		
		if(this.isSkeleton){	
			this.character = SkeletonUtils.clone( this.#settings.model.scene );
		}else if(this.#settings.model.scene){
			this.character = this.#settings.model.scene.clone();			
		}else{
			this.character = this.#settings.model.clone();
		}
		
		this.character.position.set(0,0,0);
		this.character.rotation.set(0,0,0);
			
		this.rotation.copy( this.#settings.rotation );
		this.position.copy( this.#settings.position );
		this.scale.copy( this.#settings.scale );
		
		this.character.visible = true;
		
		this.add( this.character );
	}
	
	#traverseModel = () => {
		this.character.traverse((object) => {
			if(object.isMesh){		
				if(this.#settings.material){
					object.material = this.#settings.material;	
				}else if(
					this.#app.assets.json[this.#name] &&
					this.#app.assets.json[this.#name].meta.format == "blender" &&
					this.#app.assets.json[this.#name].objects &&
					this.#app.assets.json[this.#name].objects[object.name] &&
					this.#app.assets.json[this.#name].objects[object.name].materials &&
					this.#app.assets.json[this.#name].objects[object.name].materials[0]
				){
					let material_name = this.#app.assets.json[this.#name].objects[object.name].materials[0];
					let material_data = this.#app.assets.json[this.#name].materials[material_name];
					
					if(
						!this.#app.materials[material_name] &&
						material_data
					){		
						
						//- create material
						
						this.#app.materials[material_name] = new IMPION.MeshStandardMaterial3d({
							color		: new IMPION.Color3d(0xffffff),
							emissive	: new IMPION.Color3d(0x000000)
						});
						this.#app.materials[material_name].shaders = [];
						
						//- base_color
						
						if(
							material_data.params.base_color
						){
							this.#app.materials[material_name].color = new IMPION.Color3d().fromArray(material_data.params.base_color);
						}
						
						//- base_color_texture
						
						if(
							material_data.params.base_color_texture &&
							this.#app.assets.textures.three[material_data.params.base_color_texture]
						){
							this.#app.materials[material_name].map = this.#app.assets.textures.three[material_data.params.base_color_texture];
						}
						
						//- alphaMap / transparent
						
						if(
							material_data.params.alpha_texture &&
							this.#app.assets.textures.three[material_data.params.alpha_texture]
						){
							this.#app.materials[material_name].alphaMap = this.#app.assets.textures.three[material_data.params.alpha_texture];
							this.#app.materials[material_name].alphaTest = 0.1;							
							this.#app.materials[material_name].depthWrite = true;
							//this.#app.materials[material_name].side = IMPION.DoubleSide;
							//this.#app.materials[material_name].forceSinglePass = true;
							//this.#app.materials[material_name].shadowSide = IMPION.DoubleSide;
						}else if(
							material_data.params.alpha_used
						){
							this.#app.materials[material_name].transparent = true;
							this.#app.materials[material_name].depthWrite = false;
						}
						
						//- shaders
						
						this.#app.shadersManager.creatingShaders(this.#app.materials[material_name], material_data.shaders); 
						
					}
					
					object.material = this.#app.materials[material_name];
				}
				
				if(object.geometry && object.geometry.attributes && !object.geometry.attributes.uv1){
					//object.geometry.attributes.uv1 = object.geometry.attributes.uv;
				}			
			}

			object.castShadow = this.#settings.castShadow;
			object.receiveShadow = this.#settings.receiveShadow;
			object.frustumCulled = this.#settings.frustumCulled;

			this[object.name] = object;				
		});
	}
	
	#disposeMeshes(){
		for(let i in this.#settings.dispose){
			if(this[this.#settings.dispose[i]].geometry){
				this[this.#settings.dispose[i]].geometry.dispose();
			}
			if(this[this.#settings.dispose[i]].parent){
				this[this.#settings.dispose[i]].parent.remove( this[this.#settings.dispose[i]] );
			}
		}
	}
	
	#processMixer(){
		if(this.isSkeleton && this.isBoneAnimation){
			
			this.mixer = new IMPION.AnimationMixer3d( this );
			
			//-
			
			for(let i=0; i<this.dataModel.animations.length; i++){	
				
				let actionName = this.dataModel.animations[i].name.toLowerCase();
				let actionRealName = this.dataModel.animations[i].name;

				this.action[ actionRealName ] = this.mixer.clipAction( this.dataModel.animations[i] );
				this.action[ actionRealName ].name =  actionRealName;
				this.action[ actionRealName ].speed = 1;
				this.action[ actionRealName ].speedK = 1 + 0.1 - 0.1*2*Math.random();
				this.action[ actionRealName ].clampWhenFinished = true;		
				
				let test = false;
				
				for(let key in this.actionPool){
					if(actionName.indexOf(key) != -1){
						this.actionPool[key].push( actionRealName );
						this.action[ actionRealName ].setLoop(IMPION.LoopOnce);
						
						if(key == "walk" || key == "run"){
							this.action[ actionRealName ].setLoop(IMPION.LoopRepeat);
						}
						
						test = true;
					}
				}
				
				if(!test){
					this.actionPool["other"].push( actionRealName );
					this.action[ actionRealName ].setLoop(IMPION.LoopOnce);
				}
				
			}
		
			//-
			
			this.mixer.addEventListener('finished', this.#actionFinished);
		
		}else{
			this.actionPool["idle"] = ["idle"];
			this.actionPool["run"] = ["run"];
			this.actionPool["attack"] = ["attack"];
			this.actionPool["other"] = ["other"];
		}
	}
	
	//------------------------------------------------------------------------
	
	commandToPoints( finder, points, zone = 0){
		if(this.isAction["die"]){	return false;	}

		//-

		let path = [];
		let positionFrom = this.position;
		
		while(points.length > 0){
			let pathPart = finder.findPath(positionFrom, points[0], zone);
			if(pathPart && pathPart.length > 0){
				path.push(...pathPart);
			}
			
			positionFrom = points[0];
			points.shift();
		}
		
		if( path.length > 0 ){
			this.navigationPath = path;
			
			if(this.actionPool["run"].length > 0){
				this.setActionPool("run", 0, Math.random());
			}else{
				this.setActionPool("walk", 0, Math.random());
			}
		}
	}

	//------------------------------------------------------------------------
	
	#actionFinished = (e)=>{
		if(this.action[this.actionCurrent].paused && !this.isAction["die"] && this.isActionAutoplay){
			this.setActionPool(this.actionStandard, 0, 0);
		}
	}
	
	//------------------------------------------------------------------------
	
	setActionPool = (action, weight = 0, seek = 0)=>{
		if(this.actionPool[ action ] && this.actionPool[ action ].length > 0){		
			Math.mixArray( this.actionPool[ action ] );			
			this.setAction( this.actionPool[ action ][0], weight, seek );	
		}else{
			this.setAction(action, weight, seek );
		}
	}
	
	setAction = (action, weight = 0, seek = 0)=>{
		if(!this.mixer){ 

			this.#setActionBoolean( "other" );
			
			for(let key in this.actionPool){
				for(let i = 0; i<this.actionPool[key].length; i++){
					if(this.actionPool[key][i] == action){
						this.#setActionBoolean( key );
					}
				}
			}
			
			this.actionCurrent = action;
			
		}else{
			
			this.#setActionBoolean( "other" );
			
			for(let key in this.actionPool){
				for(let i = 0; i<this.actionPool[key].length; i++){
					if(this.actionPool[key][i] == action){
						this.#setActionBoolean( key );
					}
				}
			}
					
			//-
			
			if(action.toLowerCase().indexOf("idle") != -1 && this.physicsCharacter){
				this.physicsObject.velocity.x = 0;
				this.physicsObject.velocity.z = 0;
			}
							
			//-
			
			if(weight == 1){
				this.mixer.stopAllAction();	
			}
			
			//-

			if(this.action[this.actionCurrent]){
				this.action[this.actionCurrent].weight = (1 - weight);
				this.action[this.actionCurrent].paused = true;
			}

			if(this.actionCurrent == action){
				this.action[action].reset();
				weight = 1;
			}
			
			this.actionCurrent = action;
			
			if(this.isBoneAnimation){
				this.mixer.time = seek;				
				this.action[action].weight = weight;
				this.action[action].play();
				this.action[action].enabled = true;
				this.action[action].paused = false;
				this.mixer.update(0.001);
			}
		}
	}
	
	#setActionBoolean( action ){
		for(let key in this.isAction){
			this.isAction[key] = false;
			if(key == action){
				this.isAction[key] = true;
			}
		}
		
		for(let key in this.actionPool){
			for(let i = 0; i<this.actionPool[key].length; i++){
				if(this.actionPool[key][i].toLowerCase() == action.toLowerCase()){
					this.isAction[key] = true;
				}
			}
		}
		
		this.isAction[action] = true;
	}
	
	//------------------------------------------------------------------------
	
	#updateActions(){
		if(this.isBoneAnimation){
			for(let i in this.action){
				let action = this.action[i];
			
				if(action.name != this.actionCurrent){
					if(action.weight > 0.0){
						action.weight -= 0.1;
						if(action.weight <= 0.0){
							action.weight = 0.0;
							action.stop();
						}
					}
				}else{
					if(action.weight < 1.0){
						action.weight += 0.1;
						if(action.weight >= 1.0){
							action.weight = 1.0;
						}
					}
				}
			}	
		}
	}
	
	#updateMixer( timeDelta ){
		if(this.isBoneAnimation && this.mixer && this.action[this.actionCurrent]){
			timeDelta = timeDelta/this.durationFrame;
			if(timeDelta > 2){ timeDelta = 2; }
			this.mixer.update( timeDelta * 0.03 * this.action[this.actionCurrent].speed * this.action[this.actionCurrent].speedK * this.#app.timeScale );
		}
	}
	
	#processNavigationPath(){
		if(this.isAI && this.autoMove){
			if(this.isAction["run"] || this.isAction["walk"]){
				if(this.navigationPath.length > 0){
					let pos = this.navigationPath[0];
					let d = Math.hypot(
						(pos.x - this.position.x),
						(pos.z - this.position.z)
					);
					
					if(d < (this.wx*0.5 + this.forceRun*0.05)){
						this.navigationPath.splice(0, 1);
					}else{
						let a = Math.atan2(
							(pos.x - this.position.x),
							(pos.z - this.position.z)
						);
						
						this.angularVelocity = a;
					}				
				}else{
					if(!this.isAction["die"]){					
						this.setActionPool(this.actionStandard, 0, 0);
					}
				}
			}
		}
	}
	
	#updateLocation(){
		if(!this.physicsCharacter){	
			
			//- rotation 
			
			let a = (this.angularVelocity + this.angularUser);
			
			while(a - this.angularVelocityCurrent > Math.PI){ a -= 2*Math.PI; }
			while(this.angularVelocityCurrent - a > Math.PI){ a += 2*Math.PI; }
			
			this.angularVelocityCurrent = a - this.angularVelocityRK * (a - this.angularVelocityCurrent);
				
			if(this.autoRotation){
				this.angularLookCurrent = this.angularVelocityCurrent;
			}else{					
				a = (this.angularLook + this.angularUser);
				
				while(a - this.angularLookCurrent > Math.PI){ a -= 2*Math.PI; }
				while(this.angularLookCurrent - a > Math.PI){ a += 2*Math.PI; }
				
				this.angularLookCurrent = a - this.angularLookRK * (a - this.angularLookCurrent);				
			}
		
			this.rotation.y = this.angularLookCurrent;
		
			if(this.autoMove){
				//- velocity

				if(this.isAction["walk"]){		
					this.positionTo.x += this.forceWalk * 0.02 * Math.sin(this.angularVelocityCurrent) * this.#app.timeScale;
					this.positionTo.z += this.forceWalk * 0.02 * Math.cos(this.angularVelocityCurrent) * this.#app.timeScale;
				}else if(this.isAction["run"]){	
					this.positionTo.x += this.forceRun * 0.02 * Math.sin(this.angularVelocityCurrent) * this.#app.timeScale;
					this.positionTo.z += this.forceRun * 0.02 * Math.cos(this.angularVelocityCurrent) * this.#app.timeScale;
				}
				
				//- position
					
				this.position.x = this.positionTo.x - 0.65*(this.positionTo.x - this.position.x);	
				this.position.y = this.positionTo.y - 0.65*(this.positionTo.y - this.position.y);	
				this.position.z = this.positionTo.z - 0.65*(this.positionTo.z - this.position.z);

				if(this.heightMap){
					const y = this.heightMap.getHeight(this.position.x, this.position.z);
					
					this.position.y = y;
					this.positionTo.y = y;
				}
			}
		}
	}
	
	#processStickMesh(){
		if(this.stickMeshGround){
				
			this.#stickPoint.position.copy( this.position );
			this.#stickPoint.position.y += 1.8;

			this.#stickRaycaster.set(
				this.#stickPoint.position,
				this.#stickDirection
			);
			
			this.#stickIntersects = this.#stickRaycaster.intersectObject(this.stickMeshGround, false);
			if(this.#stickIntersects.length > 0){			
				this.positionTo.y = this.position.y = this.#stickIntersects[0].point.y;
			}		
			
		}
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		

		if(!this.visible){ return false; }
		
		this.#updateActions();
		this.#updateMixer( timeDelta );
		this.#processNavigationPath();
		this.#updateLocation();
		this.#processStickMesh();
		
    }
    
	//resize = (width, height)=>{
	//	
    //}

}
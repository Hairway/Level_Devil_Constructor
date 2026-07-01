import * as IMPION from "#impion";
import {gsap} from "gsap";

export default class VfxPack3d extends IMPION.Component3d{

	componentType2D = false;
	componentType3D = true;
	
	#app;
	
	#type;
	#pack;	
	#settings;

	//------------------------------------------------------------------------

	constructor({type, pack, settings, app, fps = 60, order = ""}){
		super(fps, order);
		
		this.#app = app;

		this.#type = type;
		this.#pack = pack;
		this.#settings = settings;
		
		//-
		
		if(!this.#pack.isInitVfxPack){
			this.#pack.isInitVfxPack = true;
			
			this.#pack.scene.traverse((object) => {
				this.#pack[object.name] = object;			
			});
		}

		//-
		
		if(this.#type == "fireSimple"){
			this.add( this.#fireSimple(settings) );
			return this;
		}else if(this.#type == "fireShoot"){
			this.fireShoot = this.#fireShoot(settings);
			this.add( this.fireShoot );
			this.show = this.fireShootShow;			
			return this;
		}else if(this.#type == "hit"){
			return this.#hitEmitter(settings);
		}else if(this.#type == "sparkSimple"){
			return this.#sparkSimple(settings);
		}else if(this.#type == "cylinderFlash"){
			this.cylinderFlash = this.#cylinderFlash(settings);
			this.add( this.cylinderFlash );
			this.show = this.cylinderFlashShow;			
			return this;
		}else if(this.#type == "tracerShoot"){
			this.tracerPack = this.#tracerShoot(settings);
			for(let i=0; i<this.tracerPack.length; i++){
				this.add( this.tracerPack[i] );
			}
			this.show = this.tracerShootShow;			
			return this;
		}else if(this.#type == "fireSparkSimple"){
			return this.#fireSparkSimple(settings);
		}else if(this.#type == "fireSmokeSimple"){
			return this.#fireSmokeSimple(settings);
		}else if(this.#type == "electricFlashSimple"){
			return this.#electricFlashSimple(settings);
		}
    }

	//------------------------------------------------------------------------

	#fireSimple(settings){
		if(this.#app && (!settings || !settings.material)){
			if(!this.#app.components["ShaderVfxPackFireSimple"]){
				this.#app.components["ShaderVfxPackFireSimple"] = new IMPION.Shader3dFire({});	
			}

			if(!this.#app.materials["vfxPackFireSimple"]){
				if(!settings.color){ settings.color = 0xff4e00; }
				
				this.#app.materials["vfxPackFireSimple"] = new IMPION.MeshBasicMaterial3d({
					color			: new IMPION.Color3d(settings.color),
					blending		: IMPION.AdditiveBlending,
					depthWrite		: false,
					forceSinglePass	: true,
					transparent		: true,
					side			: IMPION.DoubleSide,
				});
				this.#app.materials["vfxPackFireSimple"].shaders = [	
					this.#app.components["ShaderVfxPackFireSimple"],
				];
			}
		}
		
		let fireObject = this.#pack["fire"].clone();
		if(settings.material){
			fireObject.material = settings.material;
		}else{
			fireObject.material = this.#app.materials["vfxPackFireSimple"];
		}
		fireObject.receiveShadow = false;
		fireObject.castShadow = false;
		return fireObject;
	}

	//------------------------------------------------------------------------

	#fireShoot(settings){
		let fireShootObject = this.#pack["fireShoot"].clone();
		if(settings.material){
			fireShootObject.material = settings.material;
		}else{
			if(!settings.color){ settings.color = 0xff611c; }
			
			fireShootObject.material = new IMPION.MeshBasicMaterial3d({
				map				: this.#app.assets.textures.three["vfx_fire_shoot"],
				alphaMap		: this.#app.assets.textures.three["vfx_fire_shoot"],
				color			: new IMPION.Color3d(settings.color),
				blending		: IMPION.AdditiveBlending,
				depthWrite		: false,
				//forceSinglePass	: true,
				transparent		: true,
				side			: IMPION.DoubleSide,
			});
		}
		fireShootObject.receiveShadow = false;
		fireShootObject.castShadow = false;
		fireShootObject.visible = false;
		
		return fireShootObject;
	}
	
	fireShootShow(){
		gsap.killTweensOf( this.fireShoot );
		gsap.killTweensOf( this.fireShoot.material );
		
		this.fireShoot.visible = true;
		this.fireShoot.rotation.z = 0;
		this.fireShoot.scale.x = 0.7+0.3*Math.random();
		this.fireShoot.scale.y = this.fireShoot.scale.x;
		this.fireShoot.scale.z = this.fireShoot.scale.x;
		this.fireShoot.material.opacity = 0;
		
		gsap.to(this.fireShoot.material,		0.02, 	{delay:0.00, overwrite: "none", opacity:1});
		gsap.to(this.fireShoot.material,		0.04, 	{delay:0.02, overwrite: "none", opacity:0});
		gsap.to(this.fireShoot.material,		0.04, 	{delay:0.06, overwrite: "none", opacity:1});
		gsap.to(this.fireShoot.material,		0.04, 	{delay:0.10, overwrite: "none", opacity:0});
		gsap.set(this.fireShoot,				 		{delay:0.14, overwrite: "none", visible:false});
	}
	
	//------------------------------------------------------------------------

	#cylinderFlash(settings){
		let cylinderFlashObject = this.#pack["aura"].clone();
		if(settings.material){
			cylinderFlashObject.material = settings.material;
		}else{
			if(!settings.color){ settings.color = 0xffffff; }
			
			cylinderFlashObject.material = new IMPION.MeshBasicMaterial3d({
				map				: this.#app.assets.textures.three["vfx_gradient"],
				alphaMap		: this.#app.assets.textures.three["vfx_gradient"],
				color			: new IMPION.Color3d(settings.color),
				blending		: IMPION.AdditiveBlending,
				depthWrite		: false,
				//forceSinglePass	: true,
				transparent		: true,
				side			: IMPION.DoubleSide,
			});
		}
		cylinderFlashObject.receiveShadow = false;
		cylinderFlashObject.castShadow = false;
		cylinderFlashObject.visible = false;
		
		return cylinderFlashObject;
	}
	
	cylinderFlashShow( position, scale = 1, color = null ){
		let cylinderFlashObject = this.cylinderFlash;
		
		gsap.killTweensOf( cylinderFlashObject );
		gsap.killTweensOf( cylinderFlashObject.material );
		
		cylinderFlashObject.visible = true;
		cylinderFlashObject.rotation.set(0, 0, 0);
		cylinderFlashObject.scale.set(scale, scale, scale);
		if(position){
			cylinderFlashObject.position.copy( position );
		}
		if(color){
			cylinderFlashObject.material.color = color;
		}
		cylinderFlashObject.material.opacity = 0.7;
		
		gsap.from(cylinderFlashObject.scale,		0.50, 	{delay:0.00, overwrite: "none", x:0, z:0, ease:"expo.out"});
		gsap.to(cylinderFlashObject.material,		0.30, 	{delay:0.20, overwrite: "none", opacity:0});
		gsap.set(cylinderFlashObject,				 		{delay:0.40, overwrite: "none", visible:false});
	}
	
	//------------------------------------------------------------------------

	#tracerShoot(settings){
		let tracerPack = [];
		
		for(let i=0; i<settings.quantity; i++){
			let tracerShootObject = this.#pack["tracer"].clone();
			if(settings.material){
				tracerShootObject.material = settings.material;
			}else{
				if(!settings.color){ settings.color = 0xffffff; }
				
				tracerShootObject.material = new IMPION.MeshBasicMaterial3d({
					map				: this.#app.assets.textures.three["vfx_gradient"],
					color			: new IMPION.Color3d(settings.color),
					blending		: IMPION.AdditiveBlending,
					depthWrite		: false,
					//forceSinglePass	: true,
					transparent		: true,
					//side			: IMPION.DoubleSide,
				});
			}
			tracerShootObject.receiveShadow = false;
			tracerShootObject.castShadow = false;
			tracerShootObject.visible = false;
			
			tracerPack.push( tracerShootObject );
		}
		
		return tracerPack;
	}
	
	tracerShootShow( from, to, color = null, scale = 1, tm = 0.4, opacity = 0.05){
		let tracerShootObject = this.tracerPack[0];
		
		gsap.killTweensOf( tracerShootObject );
		gsap.killTweensOf( tracerShootObject.material );
		
		tracerShootObject.visible = true;
		tracerShootObject.rotation.set(0,0,0);
		tracerShootObject.scale.set(scale*0.5, scale*0.5, scale*1);
		tracerShootObject.scale.z = from.distanceTo( to ) + 0.1;
		tracerShootObject.position.copy( from );
		tracerShootObject.lookAt( to );
		if(color){
			tracerShootObject.material.color = color;
		}
		tracerShootObject.material.opacity = opacity*(0.8+0.2*Math.random());
		
		gsap.from(tracerShootObject.material,	0.05, 		{delay:0.00, overwrite: "none", opacity:0});
		gsap.to(tracerShootObject.material,		tm-0.05, 	{delay:0.05, overwrite: "none", opacity:0});
		gsap.set(tracerShootObject,				 			{delay:tm, overwrite: "none", visible:false});
		
		this.tracerPack.push( tracerShootObject );
		this.tracerPack.shift();
		
		return tracerShootObject;
	}
	
	//------------------------------------------------------------------------

	#fireSparkSimple(settings){
		if(this.#app && (!settings || !settings.material)){
			if(!this.#app.materials["vfxPackFireSparkSimple"]){
				this.#app.materials["vfxPackFireSparkSimple"] = new IMPION.SpriteMaterial3d({
					map				: this.#app.assets.textures.three["vfx_spark"],
					blending		: IMPION.AdditiveBlending,
					depthWrite		: false,
					transparent		: true,
					sizeAttenuation	: true,			
					color			: new IMPION.Color3d(0xffffff),
				});	
			}
		}
		
		let materialParticle;
		if(settings && settings.material){
			materialParticle = settings.material;
		}else{
			materialParticle = this.#app.materials["vfxPackFireSparkSimple"];
		}

		return new IMPION.Emitter3d({
			particles			: [ new IMPION.Sprite3d( materialParticle ) ],
			quantity			: 50,
			
			frequency			: 0,
			spawn				: {type:"rect", x:0, y:0, z:0, dx:0.3, dy:0.1, dz:0.3},
			auto				: true,
			cloneMaterial		: true,
			
			scale				: {x:0.25, y:1, z:1, dx:0.10, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:0, dy:0, dz:0},
			opacity				: {a:0.8, da:0.2, easeIn:false},
			
			gravity				: {x:0.0, y:0, z:0},
			friction			: {x:0.0, y:0.01, z:0.0, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0, y:0.05, z:0, dx:0.0, dy:0.02, dz:0.0},				
			velocityScale		: {x:-0.015, y:0, z:0, dx:0.01, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:0, da:0.0},				
			velocityAngular		: {x:0, y:0, z:0, dx:0.1, dy:0.0, dz:0.0},
		});
	}

	//------------------------------------------------------------------------

	#hitEmitter(settings){
		if(this.#app && (!settings || !settings.material)){
			if(!this.#app.materials["vfxPackHit"]){
				this.#app.materials["vfxPackHit"] = new IMPION.SpriteMaterial3d({
					map				: this.#app.assets.textures.three["vfx_hit"],
					blending		: IMPION.AdditiveBlending,
					depthWrite		: false,
					transparent		: true,
					sizeAttenuation	: true,			
					color			: new IMPION.Color3d(0xffdc1a),
				});	
			}
		}
		
		let materialParticle;
		
		if(settings && settings.material){
			materialParticle = settings.material;
		}else{
			materialParticle = this.#app.materials["vfxPackHit"];
		}
		
		if(settings && settings.color){
			materialParticle.color = settings.color;
		}


		return new IMPION.Emitter3d({
			particles			: [ new IMPION.Sprite3d( materialParticle ) ],
			quantity			: 10,
			
			frequency			: 0,
			spawn				: {type:"rect", x:0, y:0, z:0, dx:0, dy:0.1, dz:0},
			cloneMaterial		: true,
			
			scale				: {x:0.7, y:1, z:1, dx:0.3, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:7, dy:0, dz:0, dcx:0, dcy:0, dcz:0},
			opacity				: {a:0.8, da:0.2, easeIn:false},
			
			gravity				: {x:0, y:0, z:0},
			friction			: {x:0.0, y:0.0, z:0.0, sx:0.1, sy:0.1, sz:0.1, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0, y:0, z:0, dx:0, dy:0, dz:0},				
			velocityScale		: {x:0.3, y:0, z:0, dx:0, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:-0.12, da:0.0},				
			velocityAngular		: {x:0, y:0, z:0, dx:0, dy:0.0, dz:0.0},
		});
	}

	//------------------------------------------------------------------------

	#sparkSimple(settings){
		if(this.#app && (!settings || !settings.material)){
			if(!this.#app.materials["vfxPackSparkSimple"]){
				this.#app.materials["vfxPackSparkSimple"] = new IMPION.SpriteMaterial3d({
					map				: this.#app.assets.textures.three["vfx_spark"],
					depthWrite		: false,
					transparent		: true,
					sizeAttenuation	: true,			
					color			: new IMPION.Color3d(0xffffff),
				});	
			}
		}
		
		let materialParticle;
		
		if(settings && settings.material){
			materialParticle = settings.material;
		}else{
			materialParticle = this.#app.materials["vfxPackSparkSimple"];
		}
		
		if(settings && settings.color){
			materialParticle.color = settings.color;
		}
		
		if(settings && settings.blending){
			materialParticle.blending = settings.blending;
		}

		return new IMPION.Emitter3d({
			particles			: [ new IMPION.Sprite3d( materialParticle ) ],
			quantity			: 50,
			
			frequency			: 0,
			spawn				: {type:"rect", x:0, y:0, z:0, dx:0, dy:0, dz:0},
			cloneMaterial		: false,
			auto				: false,
			
			scale				: {x:0.50, y:1, z:1, dx:0.3, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:0, dy:0, dz:0},
			opacity				: {a:1, da:0, easeIn:false},
			
			gravity				: {x:0, y:0.0, z:0},
			friction			: {x:0.1, y:0.1, z:0.1, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0, y:0.0, z:0, dx:0.25, dy:0.25, dz:0.25},				
			velocityScale		: {x:-0.02, y:0, z:0, dx:0.01, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:0, da:0.0},				
			velocityAngular		: {x:0, y:0, z:0, dx:0.1, dy:0.0, dz:0.0},
		});
	}

	//------------------------------------------------------------------------

	#electricFlashSimple(settings){
		if(this.#app && (!settings || !settings.material)){
			if(!this.#app.materials["vfxPackElectricFlashSimple"]){
				if(!settings.color){ settings.color = 0xffffff; }
				
				this.#app.materials["vfxPackElectricFlashSimple"] = new IMPION.MeshBasicMaterial3d({
					map				: this.#app.assets.textures.three["vfx_electricity"],
					alphaMap		: this.#app.assets.textures.three["vfx_electricity"],
					blending		: IMPION.AdditiveBlending,
					depthWrite		: false,
					transparent		: true,
					//side			: IMPION.DoubleSide,			
					color			: new IMPION.Color3d(settings.color),
				});	
			}
		}
		
		let electricFlashObject = this.#pack["electric"].clone();

		let materialParticle;
		if(settings && settings.material){
			electricFlashObject.material = settings.material;
		}else{
			electricFlashObject.material = this.#app.materials["vfxPackElectricFlashSimple"];
		}

		return new IMPION.Emitter3d({
			particles			: [ electricFlashObject ],
			quantity			: 20,
			
			frequency			: 0,
			spawn				: {type:"rect", x:0, y:0, z:0, dx:0.6, dy:0.6, dz:0.6},
			cloneMaterial		: true,
			
			scale				: {x:2.0, y:1, z:1, dx:1.5, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:7, dy:7, dz:7},
			opacity				: {a:0.6, da:0.2, easeIn:true},
			
			gravity				: {x:0.0, y:0, z:0},
			friction			: {x:0.0, y:0, z:0.0, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0, y:0.0, z:0, dx:0.0, dy:0.0, dz:0.0},				
			velocityScale		: {x:-0.008, y:0, z:0, dx:0.004, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:-0.018, da:0.008},				
			velocityAngular		: {x:0, y:0, z:0, dx:0.02, dy:0.02, dz:0.02},
		});
	}

	//------------------------------------------------------------------------

	#fireSmokeSimple(settings){
		if(this.#app && (!settings || !settings.material)){
			if(!this.#app.materials["vfxPackFireSmokeSimple"]){
				this.#app.materials["vfxPackFireSmokeSimple"] = new IMPION.SpriteMaterial3d({
					map				: this.#app.assets.textures.three["vfx_smoke"],
					depthWrite		: false,
					transparent		: true,
					sizeAttenuation	: true,			
					color			: new IMPION.Color3d(0xf5f5f5),
				});	
			}
		}
		
		let materialParticle;
		if(settings && settings.material){
			materialParticle = settings.material;
		}else{
			materialParticle = this.#app.materials["vfxPackFireSmokeSimple"];
		}
		
		return new IMPION.Emitter3d({
			particles			: [ new IMPION.Sprite3d( materialParticle ) ],
			quantity			: 50,
			
			frequency			: 5,
			spawn				: {type:"rect", x:0, y:0, z:0, dx:0.3, dy:0.1, dz:0.3},
			auto				: true,
			cloneMaterial		: true,
			
			scale				: {x:0.55, y:1, z:1, dx:0.10, dy:0, dz:0, sync:true},
			rotation			: {x:0, y:0, z:0, dx:7, dy:0, dz:0},
			opacity				: {a:0.3, da:0.1, easeIn:true},
			
			gravity				: {x:0.0, y:0, z:0},
			friction			: {x:0.0, y:0.01, z:0.0, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity			: {x:0, y:0.04, z:0, dx:0.0, dy:0.02, dz:0.0},				
			velocityScale		: {x:+0.01, y:0, z:0, dx:0.005, dy:0, dz:0, sync:true},				
			velocityOpacity		: {a:-0.003, da:0.001},				
			velocityAngular		: {x:0, y:0, z:0, dx:0.05, dy:0.0, dz:0.0},
		});
	}

	//------------------------------------------------------------------------

    //enterframe = ( timeDelta )=>{		
	//
    //}

	//------------------------------------------------------------------------

	//resize = (width, height)=>{
	//
	//}

}

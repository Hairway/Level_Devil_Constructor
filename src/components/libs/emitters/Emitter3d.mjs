import * as IMPION from "#impion";

export default class Emitter3d extends IMPION.Component3d{

	isEmitter = true;
	
	#counter;
	#tm;
	#particlesAll;
	#particlesEmit;
	#app;
	
	//------------------------------------------------------------------------

	constructor(settings){
		super();
	
		this.#app = globalThis.playable;
		
		//-
			
		this.settings = Object.assign({
			
			quantity 		: 20,
			frequency 		: 0,
			
			world 			: {type:"rect", x:0, y:0, z:0, dx:1000, dy:1000, dz:1000},
			spawn 			: {type:"rect", x:0, y:0, z:0, dx:0, dy:0, dz:0},
			auto			: false,
			
			lifeframe 		: {min:900, max:1000},
			scale 			: {x:1, y:1, z:1, dx:0, dy:0, dz:0, sync:true},
			rotation 		: {x:0, y:0, z:0, dx:0, dy:0, dz:0, dcx:0, dcy:0, dcz:0},
			opacity 		: null,
			cloneMaterial 	: false,
			
			physics 		: null,
			
			gravity 		: {x:0, y:0, z:0},
			friction 		: {x:0, y:0, z:0, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			
			velocity 		: {x:0, y:0, z:0, dx:0, dy:0, dz:0},
			velocityScale 	: {x:0, y:0, z:0, dx:0, dy:0, dz:0, sync:true},
			velocityOpacity : {a:0, da:0},
			velocityAngular : {x:0, y:0, z:0, dx:0, dy:0, dz:0},
			
		}, settings);
		
		//-
		
		this.settings.opacity = Object.assign({a:1, da:0, ease:0.3, easeIn:false}, this.settings.opacity);
		
		this.settings.scale = Object.assign(
			{x:1, y:1, z:1, dx:0, dy:0, dz:0, sync:true},
			this.settings.scale
		);
		
		this.settings.rotation = Object.assign(
			{x:0, y:0, z:0, dx:0, dy:0, dz:0, dcx:0, dcy:0, dcz:0},
			this.settings.rotation
		);
		
		this.settings.friction = Object.assign(
			{x:0, y:0, z:0, sx:0, sy:0, sz:0, rx:0, ry:0, rz:0, opacity:0},
			this.settings.friction
		);
		
		//-
		
		this.#counter = 0;
		this.#tm = 0;
		this.#particlesAll = [];
		this.#particlesEmit = [];
		
		//-
		
		for(let i=0; i<this.settings.quantity; i++){
			let emitterParticle = this.settings.particles[Math.randomInteger(0, this.settings.particles.length-1)].clone();
			emitterParticle.position.set(0,0,0);
			emitterParticle.rotation.set(0,0,0);
			emitterParticle.scale.set(1,1,1);
			
			if(this.settings.cloneMaterial){
				emitterParticle.material = emitterParticle.material.clone();
			}
			emitterParticle.visible = false;
					
			emitterParticle.velocity = Object.assign({}, this.settings.velocity);
			emitterParticle.velocityAngular = Object.assign({}, this.settings.velocityAngular);
			emitterParticle.velocityOpacity = Object.assign({}, this.settings.velocityOpacity);
			emitterParticle.velocityScale = Object.assign({}, this.settings.velocityScale);
			
			this.#particlesAll.push( emitterParticle );
			
			this.add( emitterParticle );	
		}
	
		//-
		
		return this;
    }

	//------------------------------------------------------------------------
		
	run = (num, settings = {}) => {
		for (let i = 0; i < num; i++) {
			this.exude(settings);
		}

		return this;
	}
	
	exude( settings = {} ){	
		if(!this.visible){ return false; }
		
		if(this.#tm == 0){
			this.#tm = this.settings.frequency;
			
			//-
			
			if(settings && settings.spawn){
				settings.spawn = Object.assign(
					this.settings.spawn,
					settings.spawn
				);
			}
			
			settings = Object.assign({
				
				quantity 		: 1,			
				spawn 			: this.settings.spawn,
				
			}, settings);
			
			//-
			
			for(let i=0; i<settings.quantity; i++){
				let particleObject = this.#particlesAll[ this.#counter ];
				
				//-
				
				particleObject.visible = true;
				
				//-
				
				if(settings.material){
					particleObject.material = settings.material;
				}
				
				//-
				
				particleObject.position.x = settings.spawn.x + settings.spawn.dx * 0.5 - settings.spawn.dx * Math.random();
				particleObject.position.y = settings.spawn.y + settings.spawn.dy * 0.5 - settings.spawn.dy * Math.random();
				particleObject.position.z = settings.spawn.z + settings.spawn.dz * 0.5 - settings.spawn.dz * Math.random();
					
				particleObject.rotation.x = this.settings.rotation.x + this.settings.rotation.dx - this.settings.rotation.dx*2*Math.random() + this.settings.rotation.dcx * Math.randomInteger(0, 100);
				particleObject.rotation.y = this.settings.rotation.y + this.settings.rotation.dy - this.settings.rotation.dy*2*Math.random() + this.settings.rotation.dcy * Math.randomInteger(0, 100);
				particleObject.rotation.z = this.settings.rotation.z + this.settings.rotation.dz - this.settings.rotation.dz*2*Math.random() + this.settings.rotation.dcz * Math.randomInteger(0, 100);
				
				if(this.settings.scale.sync){
					particleObject.scale.x = this.settings.scale.x + this.settings.scale.dx - this.settings.scale.dx*2*Math.random();
					particleObject.scale.y = particleObject.scale.z = particleObject.scale.x;
				}else{
					particleObject.scale.x = this.settings.scale.x + this.settings.scale.dx - this.settings.scale.dx*2*Math.random();
					particleObject.scale.y = this.settings.scale.y + this.settings.scale.dy - this.settings.scale.dy*2*Math.random();
					particleObject.scale.z = this.settings.scale.z + this.settings.scale.dz - this.settings.scale.dz*2*Math.random();
				}
				
				particleObject.material.opacity = this.settings.opacity.a + this.settings.opacity.da - this.settings.opacity.da*2*Math.random();
				
				if(this.settings.opacity.easeIn){
					particleObject.in_alpha = true;
					particleObject.to_alpha = particleObject.material.opacity;
					particleObject.material.opacity = 0;			
				}	
				
				if(particleObject.material.isSpriteMaterial){
					particleObject.material.rotation = this.settings.rotation.x + this.settings.rotation.dx - this.settings.rotation.dx*2*Math.random() + this.settings.rotation.dcx * Math.randomInteger(0, 100);
				}
				
				//-
				
				particleObject.lifeframe			= Math.randomInteger(this.settings.lifeframe.min, this.settings.lifeframe.max);
					
				particleObject.velocity.x 			= this.settings.velocity.x + this.settings.velocity.dx - this.settings.velocity.dx*2*Math.random();		
				particleObject.velocity.y 			= this.settings.velocity.y + this.settings.velocity.dy - this.settings.velocity.dy*2*Math.random();
				particleObject.velocity.z 			= this.settings.velocity.z + this.settings.velocity.dz - this.settings.velocity.dz*2*Math.random();
				particleObject.velocityScale.x 		= this.settings.velocityScale.x + this.settings.velocityScale.dx - this.settings.velocityScale.dx*2*Math.random();		
				particleObject.velocityScale.y 		= this.settings.velocityScale.y + this.settings.velocityScale.dy - this.settings.velocityScale.dy*2*Math.random();
				particleObject.velocityScale.z 		= this.settings.velocityScale.z + this.settings.velocityScale.dz - this.settings.velocityScale.dz*2*Math.random();
				particleObject.velocityOpacity.a 	= this.settings.velocityOpacity.a + this.settings.velocityOpacity.da - this.settings.velocityOpacity.da*2*Math.random();
				particleObject.velocityAngular.x 	= this.settings.velocityAngular.x + this.settings.velocityAngular.dx - this.settings.velocityAngular.dx*2*Math.random();
				particleObject.velocityAngular.y 	= this.settings.velocityAngular.y + this.settings.velocityAngular.dy - this.settings.velocityAngular.dy*2*Math.random();
				particleObject.velocityAngular.z 	= this.settings.velocityAngular.z + this.settings.velocityAngular.dz - this.settings.velocityAngular.dz*2*Math.random();
					
				//-
				
				if(this.settings.physics){
					this.#calculateSize( particleObject );	
					
					if(particleObject.children.length > 0){
						
						for(let j=0; j<particleObject.children.length; j++){						
							this.#calculateSize( particleObject.children[j] );	
							
							particleObject.children[j].visible = false;
							particleObject.children[j].shape = "box";
						}
						
						this.settings.physics.add( particleObject, {shapes:particleObject.children, velocity:particleObject.velocity, angularVelocity:particleObject.velocityAngular});
					
					}else if(particleObject.name.indexOf("Sphere") != -1){
						
						this.settings.physics.add( particleObject, {shape:"sphere", velocity:particleObject.velocity, angularVelocity:particleObject.velocityAngular});
					
					}else if(particleObject.name.indexOf("Cylinder") != -1){
						
						this.settings.physics.add( particleObject, {shape:"cylinder", velocity:particleObject.velocity, angularVelocity:particleObject.velocityAngular});
					
					}else{
						
						this.settings.physics.add( particleObject, {velocity:particleObject.velocity, angularVelocity:particleObject.velocityAngular});
					
					}		
				}
		
				//-
				
				if(this.#particlesEmit.indexOf( particleObject ) == -1){
					this.#particlesEmit.push( particleObject );
				}
				
				//-
				
				this.#counter++;
				if(this.#counter == this.settings.quantity){ this.#counter = 0; }
			}
		
		}
	}
	
	#update(){
		if(!this.visible){ return false; }
		
		//-
		
		if(this.#tm > 0){ this.#tm--; }
		
		//-
		
		for(let i = this.#particlesEmit.length-1; i >= 0; i--){
			let particleObject = this.#particlesEmit[i];
			
			//-
			
			if(!this.settings.physics){
				particleObject.position.x += particleObject.velocity.x * this.#app.timeScale;
				particleObject.position.y += particleObject.velocity.y * this.#app.timeScale;				
				particleObject.position.z += particleObject.velocity.z * this.#app.timeScale;				
				
				if(particleObject.material.isSpriteMaterial){
					particleObject.material.rotation += particleObject.velocityAngular.x * this.#app.timeScale;
				}else{
					particleObject.rotation.x += particleObject.velocityAngular.x * this.#app.timeScale;
					particleObject.rotation.y += particleObject.velocityAngular.y * this.#app.timeScale;
					particleObject.rotation.z += particleObject.velocityAngular.z * this.#app.timeScale;
				}			
						
				if(particleObject.velocityScale.sync){
					particleObject.scale.x += particleObject.velocityScale.x * this.#app.timeScale;
					particleObject.scale.y = particleObject.scale.x;
					particleObject.scale.z = particleObject.scale.x;
				}else{
					particleObject.scale.x += particleObject.velocityScale.x * this.#app.timeScale;
					particleObject.scale.y += particleObject.velocityScale.y * this.#app.timeScale;
					particleObject.scale.z += particleObject.velocityScale.z * this.#app.timeScale;
				}

				//-
				
				particleObject.velocity.x *= (1 - this.settings.friction.x * this.#app.timeScale);
				particleObject.velocity.y *= (1 - this.settings.friction.y * this.#app.timeScale);
				particleObject.velocity.z *= (1 - this.settings.friction.z * this.#app.timeScale);
				
				particleObject.velocityScale.x *= (1 - this.settings.friction.sx * this.#app.timeScale);
				particleObject.velocityScale.y *= (1 - this.settings.friction.sy * this.#app.timeScale);
				particleObject.velocityScale.z *= (1 - this.settings.friction.sz * this.#app.timeScale);
				
				particleObject.velocityAngular.x *= (1 - this.settings.friction.rx * this.#app.timeScale);
				particleObject.velocityAngular.y *= (1 - this.settings.friction.ry * this.#app.timeScale);
				particleObject.velocityAngular.z *= (1 - this.settings.friction.rz * this.#app.timeScale);
				
				particleObject.velocityOpacity.a *= (1 - this.settings.friction.opacity * this.#app.timeScale);
				
				//-
				
				particleObject.velocity.x += this.settings.gravity.x * this.#app.timeScale;
				particleObject.velocity.y += this.settings.gravity.y * this.#app.timeScale;
				particleObject.velocity.z += this.settings.gravity.z * this.#app.timeScale;
				
			}else{
				
				if(particleObject.velocityScale.sync){
					particleObject.scale.x += particleObject.velocityScale.x * this.#app.timeScale;
					particleObject.scale.y = particleObject.scale.x;
					particleObject.scale.z = particleObject.scale.x;
				}else{
					particleObject.scale.x += particleObject.velocityScale.x * this.#app.timeScale;
					particleObject.scale.y += particleObject.velocityScale.y * this.#app.timeScale;
					particleObject.scale.z += particleObject.velocityScale.z * this.#app.timeScale;
				}
				
				
			}
			
			if(particleObject.in_alpha){
				particleObject.material.opacity += this.settings.opacity.ease * particleObject.to_alpha * this.#app.timeScale;				
				if(particleObject.material.opacity >= particleObject.to_alpha){
					particleObject.in_alpha = false;
				}
			}else{
				if(particleObject.material.opacity <= 1){
					particleObject.material.opacity += particleObject.velocityOpacity.a * this.#app.timeScale;
				}else{
					particleObject.material.opacity = 1;
				}
			}
			
			//-
			
			if(particleObject.lifeframe > 1){
				particleObject.lifeframe--;
			}
			
			if(
				particleObject.x < this.settings.world.x - this.settings.world.dx*0.5 ||
				particleObject.x > this.settings.world.x + this.settings.world.dx*0.5 ||
				particleObject.y < this.settings.world.y - this.settings.world.dy*0.5 ||
				particleObject.y > this.settings.world.y + this.settings.world.dy*0.5 ||
				particleObject.z < this.settings.world.z - this.settings.world.dz*0.5 ||
				particleObject.z > this.settings.world.z + this.settings.world.dz*0.5 ||
				particleObject.material.opacity < 0 ||
				particleObject.scale.x < 0 ||
				particleObject.scale.y < 0 ||
				particleObject.scale.z < 0 ||
				particleObject.lifeframe == 1
			){			
				particleObject.visible = false;
				
				this.#particlesEmit.splice(i, 1);
				
				if(this.settings.physics){
					this.settings.physics.remove( particleObject );
				}
			}
			
		}	
	}

	//------------------------------------------------------------------------

	#calculateSize( object ){
		let quaternion = new IMPION.Quaternion3d();
		quaternion.copy( object.quaternion);		
		object.rotation.set(0,0,0);
		
		let box = new IMPION.Box3d().setFromObject( object );
		let size = box.getSize( new IMPION.Vector3() );
		
		if(!size.x){
			size = object.geometry.boundingBox.getSize( new IMPION.Vector3() );
		}
		
		object.applyQuaternion( quaternion );

		object.wx = size.x;
		object.wy = size.y;
		object.wz = size.z;
	}
	
	//------------------------------------------------------------------------

    enterframe = ( timeDelta )=>{		
		this.#update();
		if(this.settings.auto){ 
			this.exude();
		}
    }

	//------------------------------------------------------------------------

	//resize = (width, height)=>{
	//
	//}

}

import * as IMPION from "#impion";

export default class Emitter2d extends IMPION.Component2d{

	isEmitter = true;
	
	#counter;
	#tm;
	#particlesAll;
	#particlesEmit;
	
	#app;
	
	//------------------------------------------------------------------------

	constructor(
		settings,
		
		fps = 60,
		order = "",
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
	){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute, false, 0);

		this.#app = globalThis.playable;
		
		//-
			
		this.settings = Object.assign({
			
			quantity 		: 20,
			frequency 		: 0,
			
			world 			: {type:"rect", x:0, y:0, dx:2000, dy:2000},
			spawn 			: {type:"rect", x:0, y:0, dx:0, dy:0},
			auto			: false,
			
			lifeframe 		: {min:900, max:1000},
			scale 			: {x:1, y:1, dx:0, dy:0, sync:true},
			rotation 		: {a:0, da:0},
			opacity 		: null,
			blend 			: null,
			
			gravity 		: {x:0, y:0},
			friction 		: {x:0, y:0, sx:0, sy:0, r:0, opacity:0},
			
			physics 		: null,
			
			velocity 		: {x:0, y:0, dx:0, dy:0},
			velocityScale 	: {x:0, y:0, dx:0, dy:0, sync:true},
			velocityOpacity : {a:0, da:0},
			velocityAngular : {a:0, da:0},
			
		}, settings);
		
		this.settings.opacity = Object.assign({a:1, da:0, ease:0.3, easeIn:false}, this.settings.opacity);
				
		this.#counter = 0;
		this.#tm = 0;
		this.#particlesAll = [];
		this.#particlesEmit = [];
		
		//-
		
		for(let i=0; i<this.settings.quantity; i++){
			let emitterParticle = new IMPION.Sprite2d();
			emitterParticle.texture = this.settings.particles[Math.randomInteger(0, this.settings.particles.length-1)];
			emitterParticle.anchor.set(0.5, 0.5);
			emitterParticle.scale.set(1);
			if(this.settings.blend){
				emitterParticle.blendMode = this.settings.blend;
			}
			emitterParticle.visible = false;
					
			emitterParticle.velocity = Object.assign({}, this.settings.velocity);
			emitterParticle.velocityAngular = Object.assign({}, this.settings.velocityAngular);
			emitterParticle.velocityOpacity = Object.assign({}, this.settings.velocityOpacity);
			emitterParticle.velocityScale = Object.assign({}, this.settings.velocityScale);
			
			this.#particlesAll.push( emitterParticle );
			
			this.addChild( emitterParticle );	
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
				
				particleObject.x = settings.spawn.x + 0.5*settings.spawn.dx - settings.spawn.dx * Math.random();
				particleObject.y = settings.spawn.y + 0.5*settings.spawn.dy - settings.spawn.dy * Math.random();
				
				particleObject.rotation = this.settings.rotation.a + this.settings.rotation.da - this.settings.rotation.da*2*Math.random();
				
				if(this.settings.scale.sync){
					particleObject.scale.set(this.settings.scale.x + this.settings.scale.dx - this.settings.scale.dx*2*Math.random());
				}else{
					particleObject.scale.x = this.settings.scale.x + this.settings.scale.dx - this.settings.scale.dx*2*Math.random();
					particleObject.scale.y = this.settings.scale.y + this.settings.scale.dy - this.settings.scale.dy*2*Math.random();
				}
				
				particleObject.alpha = this.settings.opacity.a + this.settings.opacity.da - this.settings.opacity.da*2*Math.random();
				if(this.settings.opacity.easeIn){
					particleObject.in_alpha = true;
					particleObject.to_alpha = particleObject.alpha;
					particleObject.alpha = 0;			
				}	
				
				//-
				
				particleObject.lifeframe			= Math.randomInteger(this.settings.lifeframe.min, this.settings.lifeframe.max);
				
				particleObject.velocity.x 			= this.settings.velocity.x + this.settings.velocity.dx - this.settings.velocity.dx*2*Math.random();		
				particleObject.velocity.y 			= this.settings.velocity.y + this.settings.velocity.dy - this.settings.velocity.dy*2*Math.random();
				particleObject.velocityScale.x 		= this.settings.velocityScale.x + this.settings.velocityScale.dx - this.settings.velocityScale.dx*2*Math.random();		
				particleObject.velocityScale.y 		= this.settings.velocityScale.y + this.settings.velocityScale.dy - this.settings.velocityScale.dy*2*Math.random();
				particleObject.velocityOpacity.a 	= this.settings.velocityOpacity.a + this.settings.velocityOpacity.da - this.settings.velocityOpacity.da*2*Math.random();
				particleObject.velocityAngular.a 	= this.settings.velocityAngular.a + this.settings.velocityAngular.da - this.settings.velocityAngular.da*2*Math.random();
			
				//-
				
				if(this.settings.physics){
					this.#calculateSize( particleObject );	
					
					if(particleObject.children.length > 0){
						
						for(let j=0; j<particleObject.children.length; j++){						
							this.#calculateSize( particleObject.children[j] );	
							
							particleObject.children[j].visible = false;
							particleObject.children[j].type = this.settings.shape;
						}
						
						this.settings.physics.add( particleObject, {shape:this.settings.shape, shapes:particleObject.children, velocity:particleObject.velocity, angularVelocity:particleObject.velocityAngular.a});
					
					}else{
						
						this.settings.physics.add( particleObject, {velocity:particleObject.velocity, angularVelocity:particleObject.velocityAngular.a} );
					
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
				particleObject.x += particleObject.velocity.x * this.#app.timeScale;
				particleObject.y += particleObject.velocity.y * this.#app.timeScale;				
				particleObject.rotation += particleObject.velocityAngular.a * this.#app.timeScale;
				
				if(particleObject.velocityScale.sync){
					particleObject.scale.x += particleObject.velocityScale.x * this.#app.timeScale;
					particleObject.scale.y = particleObject.scale.x;
				}else{
					particleObject.scale.x += particleObject.velocityScale.x * this.#app.timeScale;
					particleObject.scale.y += particleObject.velocityScale.y * this.#app.timeScale;
				}

				//-
				
				particleObject.velocity.x *= (1-this.settings.friction.x * this.#app.timeScale);
				particleObject.velocity.y *= (1-this.settings.friction.y * this.#app.timeScale);
				particleObject.velocityScale.x *= (1-this.settings.friction.sx * this.#app.timeScale);
				particleObject.velocityScale.y *= (1-this.settings.friction.sy * this.#app.timeScale);
				particleObject.velocityAngular.a *= (1-this.settings.friction.r * this.#app.timeScale);
				particleObject.velocityOpacity.a *= (1-this.settings.friction.opacity * this.#app.timeScale);
					
				//-
				
				particleObject.velocity.x += this.settings.gravity.x * this.#app.timeScale;
				particleObject.velocity.y += this.settings.gravity.y * this.#app.timeScale;
				
			}
			
			if(particleObject.in_alpha){
				particleObject.alpha += this.settings.opacity.ease * particleObject.to_alpha * this.#app.timeScale;
				if(particleObject.alpha >= particleObject.to_alpha){
					particleObject.in_alpha = false;
				}
			}else{
				if(particleObject.alpha <= 1){
					particleObject.alpha += particleObject.velocityOpacity.a * this.#app.timeScale;
				}else{
					particleObject.alpha = 1;
				}
			}
			
			//-
			
			if(particleObject.lifeframe > 1){
				particleObject.lifeframe--;
			}
			
			if(
				particleObject.x < this.settings.world.x - this.settings.world.dx * 0.5 ||
				particleObject.x > this.settings.world.x + this.settings.world.dx * 0.5 ||
				particleObject.y < this.settings.world.y - this.settings.world.dy * 0.5 ||
				particleObject.y > this.settings.world.y + this.settings.world.dy * 0.5 ||
				particleObject.alpha < 0 ||
				particleObject.scale.x < 0 ||
				particleObject.scale.y < 0 ||
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
		object.wx = object.width;
		object.wy = object.height;
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
	//}

}

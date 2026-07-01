import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class Component2d extends IMPION.Group2d{

	componentType2D = true;
	componentType3D = false;
	
	fps;
	order;
	timePrevious = 0;
    durationFrame = 0;

	needsUpdate = null;
	
	character;
	
	physicsCharacter = false;

	frame = 0;
	
	action = {};
	actionPool = {"idle":[], "walk":[], "run":[], "jump":[], "attack":[], "fire":[], "hit":[], "reload":[], "fail":[], "die":[], "up":[], "other":[]};
	actionCurrent;
	isAction = {};
	
	#assets;
	#settings;
	#app;
	
	//------------------------------------------------------------------------
	
	constructor( settings, fps = 60, order = "" ){
		super();

		this.fps = fps;
		this.order = order;
		this.durationFrame = 1000/this.fps;

		this.#app = globalThis.playable;

		//-
		
		this.gsapContainer = new IMPION.Group2d();
		this.addChild( this.gsapContainer );
				
			this.showingContainer = new IMPION.Group2d();
			this.gsapContainer.addChild( this.showingContainer );
					
				this.animationContainer = new IMPION.Group2d();
				this.showingContainer.addChild( this.animationContainer );
				
		//-
		
		this.#assets = settings.assets;

		//-
		
		this.#settings = Object.assign({

			actionStandard 	: "idle",

			autoMove		: true,
			autoRotation	: false,
			autoBreath		: false,
			mirrorX			: false,
			isActionAutoplay: true,
			debug			: false,
		
			forceWalk 		: 25.0,
			forceRun 		: 50.0,
			forceJump 		: 3.0,
			
			angleVelocityRK	: 0.65,
			
			positionTo		: {x:0, y:0},
			
			anchor			: {x:0.5, y:0.9},
			position		: {x:0, y:0},
			rotation		: 0,
			scale			: {x:1, y:1},
			
			extraAngle		: 0,
			tmUpdateAngle	: 0,
			
			life			: 100,
			
			wx 				: 30,
			wy 				: 30,
			
			isAI 			: true,
			tmAI 			: Math.randomInteger(0, 100),
			
			angleUser		: 0,
			
			navigationPath	: [],
			
		}, settings);
		
		this.#settings.lifeMax = this.#settings.life;
		
		this.#settings.angleVelocity = this.#settings.rotation;
		this.#settings.angleVelocityCurrent = this.#settings.rotation;
		
		this.#settings.angleBreath = Math.randomInteger(0, 360);
		
		//- 
		
		this.#updateParams();		
		this.#initSprite();	
		this.#processMixer();
		
		//-		
		
		this.setActionPool(this.actionStandard, 1);
	
		//-		
		
		return this;
    }
	
	//------------------------------------------------------------------------
	
	#updateParams(){
		for(let key in this.#settings){
			this[key] = this.#settings[key];
		}

		for(let key in this.actionPool){
			this.isAction[key] = false;
		}
	}
	
	#initSprite(){
		
		this.breathContainer = new IMPION.Group2d();		
		this.animationContainer.addChild( this.breathContainer );
				
			this.mirrorContainer = new IMPION.Group2d();		
			this.breathContainer.addChild( this.mirrorContainer );
				
				this["character"] = new IMPION.Sprite2d();		
				this["character"].anchor.set( this.#settings.anchor.x, this.#settings.anchor.y );
				this.mirrorContainer.addChild( this["character"] );
				
				if(this.#settings.debug){
					this.debugContainer = new IMPION.Graphics2d();				
					this.debugContainer.lineStyle(2, 0xffffff);			
					this.debugContainer.moveTo(-15, 0);
					this.debugContainer.lineTo(+15, 0);
					this.debugContainer.moveTo(0, -15);
					this.debugContainer.lineTo(0, +15);
					this.debugContainer.beginFill(0xff0000);			
					this.debugContainer.drawCircle(0,0,5);
					this.debugContainer.endFill();	
					this.mirrorContainer.addChild( this.debugContainer );
				}
		
		//-
		
		this.rotation = this.#settings.rotation;
		
		this.positionTo.x = this.#settings.position.x;
		this.positionTo.y = this.#settings.position.y;
		
		this.position.x = this.#settings.position.x;
		this.position.y = this.#settings.position.y;
	}
	
	#processMixer(){
		this.frame = 0;
		
		for(let i in this.#assets.textures.pixi){	
				
			if(i.indexOf(this.#settings.sprite + "_") != -1){
				let actionRealName = i.split("_")[1];
				let actionName = actionRealName.toLowerCase();
				
				this.action[ actionRealName ] = {};
				this.action[ actionRealName ].name = actionRealName;
				this.action[ actionRealName ].speed = 1;
				this.action[ actionRealName ].speedK = 1 + 0.1 - 0.1*2*Math.random();
				this.action[ actionRealName ].position = {x:0, y:0};		
				this.action[ actionRealName ].clampWhenFinished = true;		
									
				let test = false;
				
				for(let key in this.actionPool){
					if(actionName.indexOf(key) != -1){
						this.actionPool[key].push( actionRealName );
						this.action[ actionRealName ].isLoop = false;
						
						if(key == "walk" || key == "run"){
							this.action[ actionRealName ].isLoop = true;
						}
						
						test = true;
					}
				}
				
				if(!test){
					this.actionPool["other"].push( actionRealName );
					this.action[ actionRealName ].isLoop = false;
				}
				
			}						
		}
		
		this["character"].texture = this.#assets.textures.pixi[this.#settings.sprite + "_" + this.actionStandard + "_" + this.frame];
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
				this.setActionPool("run", 0);
			}else{
				this.setActionPool("walk", 0);
			}
		}
	}
	
	//------------------------------------------------------------------------
	
	setSprite( sprite ){
		this.#settings.sprite = sprite;
	}
	
	//------------------------------------------------------------------------
	
	setActionPool = (action, seek = 0)=>{
		if(this.actionPool[ action ] && this.actionPool[ action ].length > 0){		
			Math.mixArray( this.actionPool[ action ] );	
			this.setAction( this.actionPool[ action ][0], seek );	
		}else{
			this.setAction(action, seek );
		}
	}
	
	setAction = (action, seek = 0)=>{		
		if(this.actionCurrent != action){
			
			this.#setActionBoolean( "other" );
			
			for(let key in this.actionPool){
				for(let i = 0; i<this.actionPool[key].length; i++){
					if(this.actionPool[key][i] == action){
						this.#setActionBoolean( key );
					}
				}
			}
			
			//-
			
			this.frame = seek;
			this.frameInt = Math.ceil( this.frame );
			
			if(!this.#assets.textures.pixi[this.#settings.sprite + "_" + action + "_" + this.frameInt]){
				this.frame = 0;
				this.frameInt = 0;		
			}
			
			this.actionCurrent = action;
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
	
	#updateMixer(){
		if(this.autoRotation){
			let extraAngle = Math.ceil(this.angleVelocityCurrent*180/Math.PI);
			
			while(extraAngle < 0){ extraAngle += 360; }
			while(extraAngle >= 360){ extraAngle -= 360; }
			
			if(extraAngle < 15 || extraAngle > 360-15){
				extraAngle = 0;
			}else if(extraAngle >= 0+15 && extraAngle < 30+15){
				extraAngle = 30;
			}else if(extraAngle >= 30+15 && extraAngle < 60+15){
				extraAngle = 60;
			}else if(extraAngle >= 60+15 && extraAngle < 90+15){
				extraAngle = 90;
			}else if(extraAngle >= 90+15 && extraAngle < 120+15){
				extraAngle = 120;
			}else if(extraAngle >= 120+15 && extraAngle < 150+15){
				extraAngle = 150;
			}else if(extraAngle >= 150+15 && extraAngle < 180+15){
				extraAngle = 180;
			}else if(extraAngle >= 180+15 && extraAngle < 210+15){
				extraAngle = 210;
			}else if(extraAngle >= 210+15 && extraAngle < 240+15){
				extraAngle = 240;
			}else if(extraAngle >= 240+15 && extraAngle < 270+15){
				extraAngle = 270;
			}else if(extraAngle >= 270+15 && extraAngle < 300+15){
				extraAngle = 300;
			}else if(extraAngle >= 300+15 && extraAngle < 330+15){
				extraAngle = 330;
			}
			
			this.tmUpdateAngle++;
			if(this.tmUpdateAngle > 10){
				this.tmUpdateAngle = 0;
				this.extraAngle = extraAngle;
			}
			
			//-
			
			this.frame += this.action[ this.actionCurrent ].speed * this.action[ this.actionCurrent ].speedK * this.#app.timeScale;
			this.frameInt = Math.ceil( this.frame );
			
			if(!this.#assets.textures.pixi[this.#settings.sprite + "_" + this.actionCurrent + "_a"+this.extraAngle+"_" + this.frameInt]){
				if(this.action[ this.actionCurrent ].isLoop){
					
					this.frame = 0;
					this.frameInt = 0;
				
				}else{

					this.frameInt--;
				
				}
			}
			
			this["character"].texture = this.#assets.textures.pixi[this.#settings.sprite + "_" + this.actionCurrent + "_a"+this.extraAngle+"_" + this.frameInt];
			
		}else{
			
			this.frame += this.action[ this.actionCurrent ].speed * this.action[ this.actionCurrent ].speedK * this.#app.timeScale;
			this.frameInt = Math.ceil( this.frame );
			
			if(!this.#assets.textures.pixi[this.#settings.sprite + "_" + this.actionCurrent + "_" + this.frameInt]){
				if(this.action[ this.actionCurrent ].isLoop){
					
					this.frame = 0;
					this.frameInt = 0;
				
				}else{
					
					this.setActionPool( this.actionStandard );
					
					this.frame = 0;
					this.frameInt = 0;
				
				}
			}
			
			this["character"].texture = this.#assets.textures.pixi[this.#settings.sprite + "_" + this.actionCurrent + "_" + this.frameInt];
			
		}
		
		this["character"].x = this.action[this.actionCurrent].position.x;
		this["character"].y = this.action[this.actionCurrent].position.y;
	}
	
	#processNavigationPath(){
		if(this.isAI && this.autoMove){
			if(this.isAction["run"] || this.isAction["walk"]){
				if(this.navigationPath.length > 0){
					let pos = this.navigationPath[0];
					let d = Math.hypot(
						(pos.x - this.x),
						(pos.y - this.y)
					);
					
					if(d < (this.wx*0.5 + this.forceRun*0.5)){
						this.navigationPath.splice(0, 1);
					}else{
						let a = Math.atan2(
							(pos.y - this.y),
							(pos.x - this.x)
						);
						
						this.angleVelocity = a;
					}				
				}else{
					if(!this.isAction["die"]){					
						this.setActionPool(this.actionStandard, 0);
					}
				}
			}
		}
	}
	
	#updateLocation(){
		if(!this.physicsCharacter){	
			
			//- rotation 
			
			let a = (this.angleVelocity + this.angleUser);
			
			while(a - this.angleVelocityCurrent > Math.PI){ a -= 2*Math.PI; }
			while(this.angleVelocityCurrent - a > Math.PI){ a += 2*Math.PI; }
			
			this.angleVelocityCurrent = a - this.angleVelocityRK*(a - this.angleVelocityCurrent);
			
			if(this.autoRotation){
				this.rotation = this.angleVelocityCurrent;
			}
		
			if(this.autoMove){
				
				//- velocity
				
				let _vx;
				let _vy;
				
				if(this.isAction["walk"]){		
					_vx = this.forceWalk * 0.17 * Math.cos(this.angleVelocityCurrent);
					_vy = this.forceWalk * 0.17 * Math.sin(this.angleVelocityCurrent);
				}else if(this.isAction["run"] || this.isRun){	
					_vx = this.forceRun * 0.17 * Math.cos(this.angleVelocityCurrent);
					_vy = this.forceRun * 0.17 * Math.sin(this.angleVelocityCurrent);
				}
				
				if(this.isAction["walk"] || this.isAction["run"] || this.isRun){
					this.positionTo.x += _vx;
					this.positionTo.y += _vy;
					
					if(this.mirrorX){
						this["mirrorContainer"].scale.x = 1;
						if(_vx < 0){
							this["mirrorContainer"].scale.x = -1;
						}
					}
				}
				
				//- position
					
				this.position.x = this.positionTo.x - 0.65*(this.positionTo.x - this.position.x);	
				this.position.y = this.positionTo.y - 0.65*(this.positionTo.y - this.position.y);	
				
				
			}
		}
	}
	
	#updateBreath(){
		if(this.autoBreath){
			this.angleBreath += 10;
			if(this.angleBreath >= 360){ this.angleBreath -= 360; }
			this.breathContainer.scale.x = 1+0.015*Math.sin(this.angleBreath*Math.toRAD);
			this.breathContainer.scale.y = 1+0.015*Math.sin(this.angleBreath*Math.toRAD + 1.5);
		}	
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		

		if(!this.visible){ return false; }
		
		this.#updateMixer();
		this.#processNavigationPath();
		this.#updateLocation();
		this.#updateBreath();
		
    }
    
	//resize = (width, height)=>{
	//	
    //}

}
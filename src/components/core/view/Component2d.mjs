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
		
	gsapContainer;			// for user
	showingContainer;		// for show/hide
	animationContainer;		// for animation
	
	positionRelative;
	positionAbsolute;
	scaleAbsolute;
	rotationAbsolute;
	
	animationAngle = 0;
	
	#asBitmap;
	#borderBitmap;
	
	onClick = null;

	//------------------------------------------------------------------------

	constructor(
		fps 		= 60,
		order 		= "",		
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
		asBitmap 		= false,
		borderBitmap 	= 0,
	){
		super();

		this.#asBitmap = asBitmap;
		this.#borderBitmap = borderBitmap;
		
		this.fps = fps;
		this.order = order;
		this.durationFrame = 1000/this.fps;

		//-
		
		this.positionRelative = positionRelative;
		this.positionAbsolute = positionAbsolute;
		this.scaleAbsolute = scaleAbsolute;
		this.rotationAbsolute = rotationAbsolute;
		
		this.setPositionRelative( this.positionRelative );
		this.setPositionAbsolute( this.positionAbsolute );
		this.setScale( this.scaleAbsolute );
		this.setRotation( this.rotationAbsolute );	
		
		//-
		
		this.gsapContainer = new IMPION.Group2d();
		this.addChild( this.gsapContainer );
			
		this.showingContainer = new IMPION.Group2d();
		this.gsapContainer.addChild( this.showingContainer );
			
		this.animationContainer = new IMPION.Group2d();
		this.showingContainer.addChild( this.animationContainer );
		
    }

	//------------------------------------------------------------------------

	setAsBitmap( asBitmap ){
		this.#asBitmap = asBitmap;
		
		if(asBitmap){
			if(this.#borderBitmap != 0){
				this.staticContainerGraphics = new PIXI.Graphics();
				this.staticContainerGraphics.beginFill(0xFFFFFF, 0.0001);
				this.staticContainerGraphics.drawRect(
					-this.animationContainer.width*0.5 - this.#borderBitmap, 
					-this.animationContainer.height*0.5 - this.#borderBitmap, 
					+this.animationContainer.width + this.#borderBitmap*2, 
					+this.animationContainer.height + this.#borderBitmap*2
				);
				this.staticContainerGraphics.endFill();
				this.animationContainer.addChildAt( this.staticContainerGraphics, 0);
			}
		}
		
		this.animationContainer.cacheAsTexture = asBitmap;
	}

	setPositionRelative({ vertical, horizontal }){
		this.positionRelative.vertical.x = vertical.x;
		this.positionRelative.vertical.y = vertical.y;
		this.positionRelative.horizontal.x = horizontal.x;
		this.positionRelative.horizontal.y = horizontal.y;

		if(this.needsUpdate !== null){
			this.needsUpdate()
		}

		if(this.onClick !== null){
			this.onClick()
		}
		
		return this;
	}

	setPositionAbsolute({ vertical, horizontal }){
		this.positionAbsolute.vertical.x = vertical.x;
		this.positionAbsolute.vertical.y = vertical.y;
		this.positionAbsolute.horizontal.x = horizontal.x;
		this.positionAbsolute.horizontal.y = horizontal.y;

		if(this.needsUpdate !== null){
			this.needsUpdate()
		}

		return this;
	}

	setScale({ vertical, horizontal }){
		this.scaleAbsolute.vertical.x = vertical.x;
		this.scaleAbsolute.vertical.y = vertical.y;

		this.scaleAbsolute.horizontal.x = horizontal.x;
		this.scaleAbsolute.horizontal.y = horizontal.y;

		if(this.needsUpdate !== null){
			this.needsUpdate()
		}

		return this;
	}

	setRotation({ vertical, horizontal }){
		this.rotationAbsolute.vertical = vertical;
		this.rotationAbsolute.horizontal = horizontal;

		if(this.needsUpdate !== null){
			this.needsUpdate()
		}

		return this;
	}

	//------------------------------------------------------------------------
	
	playAnimation(type = "bounce", duration = 0, delay = 0, ease = "", scale = 1.04){
		if(type == "bounce"){
			if(ease == ""){ ease = "sine.inOut"; }
			if(duration == 0){ duration = 0.2; }
			
			if(delay == 0){
				gsap.killTweensOf( this.animationContainer.scale );
			}
			
			this.animationContainer.x = 0;
			this.animationContainer.y = 0;
			this.animationContainer.rotation = 0;
			this.animationContainer.scale.set(1)
			
			gsap.to(this.animationContainer.scale,	duration, 	{delay:delay, overwrite: "none", x:scale, y:scale, repeat:-1, yoyo:true, ease:ease});
		
		}else if(type == "rotation"){
			
			if(ease == ""){ ease = "linear"; }
			if(duration == 0){ duration = 2.0; }
			
			if(delay == 0){
				gsap.killTweensOf( this.animationContainer.scale );
			}
			
			this.animationContainer.x = 0;
			this.animationContainer.y = 0;
			this.animationContainer.rotation = 0;
			
			gsap.to(this.animationContainer,			duration, 	{delay:delay, overwrite: "none", rotation:"+="+2*Math.PI, repeat:-1, ease:ease});
		
		}else if(type == "circle"){
			if(ease == ""){ ease = "sine.inOut"; }
			if(duration == 0){ duration = 0.5; }
			
			if(delay == 0){
				gsap.killTweensOf( this.animationContainer.scale );
			}
			
			this.animationContainer.x = -40;
			this.animationContainer.y = -35;
			this.animationContainer.rotation = 0;
			
			gsap.to(this.animationContainer,			duration*1.00, 	{delay:delay, overwrite: "none", x:"+=80", repeat:-1, yoyo:true, ease:ease});
			gsap.to(this.animationContainer,			duration*1.00, 	{delay:delay+0.50*duration, overwrite: "none", y:"+=80", repeat:-1, yoyo:true, ease:ease});
			gsap.to(this.animationContainer,			duration*1.00, 	{delay:delay+0.50*duration, overwrite: "none", rotation:0.2, repeat:-1, yoyo:true, ease:ease});

		}else if(type == "infinity"){
			if(ease == ""){ ease = "sine.inOut"; }
			if(duration == 0){ duration = 0.8; }
			
			if(delay == 0){
				gsap.killTweensOf( this.animationContainer.scale );
			}
			
			this.animationContainer.x = -70;
			this.animationContainer.y = -25;
			this.animationContainer.rotation = 0;
			
			gsap.to(this.animationContainer,			duration*1.00, 	{delay:delay, overwrite: "none", x:"+=140", repeat:-1, yoyo:true, ease:ease});
			gsap.to(this.animationContainer,			duration*0.50, 	{delay:delay+0.25*duration, overwrite: "none", y:"+=50", repeat:-1, yoyo:true, ease:ease});
			gsap.to(this.animationContainer,			duration*1.00, 	{delay:delay+0.25*duration, overwrite: "none", rotation:0.2, repeat:-1, yoyo:true, ease:ease});
		}
		
		return this;
	}
	
	stopAnimation(){
		gsap.killTweensOf( this.animationContainer );
		gsap.killTweensOf( this.animationContainer.scale );
		this.animationContainer.scale.set(1);
		
		return this;
	}
	
	//------------------------------------------------------------------------

	show( duration = 0, delay = 0, type = "alpha", ease = "expo.out" ){
		if(!this.visible || (this.alpha==0 && type == "alpha")){
			
			this.alpha = 1;
			this.visible = true;
			
			if(type == "alpha"){
				if(delay == 0){
					gsap.killTweensOf( this );
				}
				
				gsap.from(this,							duration, 	{delay:delay, overwrite: "none", alpha:0, ease:"linear"});
				
			}else if(type == "scale"){
				if(delay == 0){
					gsap.killTweensOf( this.showingContainer.scale );
				}
				
				this.showingContainer.scale.set(1);
				gsap.from(this.showingContainer.scale,	duration, 	{delay:delay, overwrite: "none", x:0, y:0, ease:ease});
			}
		}
		
		return this;
	}

	hide( duration = 0, delay = 0 ){
		if(this.visible){
			if(delay == 0){
				gsap.killTweensOf( this );
			}
			
			gsap.to(this,		duration, 	{delay:delay, overwrite: "none", alpha:0, ease:"linear"});			
			gsap.set(this,		 			{delay:delay + duration, overwrite: "none", visible:false});
		}
		
		return this;
	}

	killAnimation(){
		gsap.killTweensOf( this );
		gsap.killTweensOf( this.showingContainer.scale );
		
		return this;
	}
	
	//------------------------------------------------------------------------

    //enterframe = ( timeDelta )=>{
	//
    //}

	resize = (width, height)=>{
		if(width < height){
			this.x = this.positionAbsolute.vertical.x +  this.positionRelative.vertical.x * width;
			this.y = this.positionAbsolute.vertical.y +  this.positionRelative.vertical.y * height;
			this.scale.set(this.scaleAbsolute.vertical.x, this.scaleAbsolute.vertical.y);
			this.rotation = this.rotationAbsolute.vertical;
		}else{
			this.x = this.positionAbsolute.horizontal.x +  this.positionRelative.horizontal.x * width;
			this.y = this.positionAbsolute.horizontal.y +  this.positionRelative.horizontal.y * height;
			this.scale.set(this.scaleAbsolute.horizontal.x, this.scaleAbsolute.horizontal.y);
			this.rotation = this.rotationAbsolute.horizontal;
		}
		
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
    }

	setResizeHandler( needsUpdate ) {
		this.needsUpdate = needsUpdate;
		return this
	}

}

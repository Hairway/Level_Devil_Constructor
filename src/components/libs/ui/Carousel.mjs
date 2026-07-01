import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class Carousel extends IMPION.Component2d{

	#items;		
	#assets;

	carouselAngle = 0;
	carouselDeltaAngle = 0;
	carouselRadius = 180;
	carouselFov = 0.5;
	
	//------------------------------------------------------------------------

	constructor({
		items = [],
		assets,
		carouselAngle = 0,
		carouselRadius = 180,
		carouselFov = 0.5,

		fps = 60,
		order = "",
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute);

		//-
		
		this.#items = items;
		this.#assets = assets;
		
		this.carouselAngle = carouselAngle;
		this.carouselRadius = carouselRadius;
		this.carouselFov = carouselFov;

		this.carouselDeltaAngle = 2*Math.PI/this.#items.length;

		//-
		
		this["carouselItems"] = new IMPION.Group2d();
		this.animationContainer.addChild( this["carouselItems"] );	
			
			for(let i=0; i<this.#items.length; i++){
				this["carouselItem_"+i] = new IMPION.Sprite2d();
				this["carouselItem_"+i].texture = this.#items[i];
				this["carouselItem_"+i].anchor.set(0.5);
				
				this["carouselItem_"+i].carouselItemAngle = this.carouselAngle + -0.5*Math.PI + 2*Math.PI*i/this.#items.length;			
				this["carouselItem_"+i].carouselItemX = this.carouselRadius * Math.cos( this["carouselItem_"+i].carouselItemAngle );
				this["carouselItem_"+i].carouselItemZ = this.carouselRadius * Math.sin( this["carouselItem_"+i].carouselItemAngle );
				this["carouselItem_"+i].carouselItemD = Math.hypot(
					(0 - this["carouselItem_"+i].x),
					(this.carouselRadius - this["carouselItem_"+i].carouselZ)
				);
				
				this["carouselItem_"+i].x = this["carouselItem_"+i].carouselItemX;
				this["carouselItem_"+i].y = 0;
				this["carouselItem_"+i].scale.set(0.5+0.5*this["carouselItem_"+i].carouselItemD/(2*this.carouselRadius));
				
				this["carouselItems"].addChild( this["carouselItem_"+i] );	
			}
			
			this["carouselItems"].children.sort( this.#carouselSortZ );
			
		//-
		
		this["cursor"] = new IMPION.Group2d();
		this["cursor"].x = 60;
		this["cursor"].y = 200;
		this["cursor"].visible = false;
		this.animationContainer.addChild( this["cursor"] );	
				
			this["cursorAn"] = new IMPION.Group2d();
			this["cursor"].addChild( this["cursorAn"] );	
				
				this["cursorB0"] = new IMPION.Sprite2d();
				this["cursorB0"].texture = this.#assets.textures.pixi["uiCursor_0"];
				this["cursorB0"].anchor.set(0.5, 0.5);
				this["cursorAn"].addChild( this["cursorB0"] );
				
				this["cursorB1"] = new IMPION.Sprite2d();
				this["cursorB1"].texture = this.#assets.textures.pixi["uiCursor_1"];
				this["cursorB1"].anchor.set(0.5, 0.5);
				this["cursorAn"].addChild( this["cursorB1"] );
				
		//-

		return this;
    }

	play = (delay = 0) => {		
		gsap.killTweensOf( this["cursorAn"] );
		gsap.killTweensOf( this["cursorB1"] );
	
		if(!this["cursor"].visible){
			this["cursor"].visible = true;
			
			gsap.from(this["cursorAn"].scale,	0.5,	{delay:delay+0.0, overwrite: "none", x:0, y:0, ease:"expo.out"});
			gsap.from(this["cursorAn"],			1.0,	{delay:delay+0.0, overwrite: "none", y:"+=200", ease:"expo.out"});
		}
		
		gsap.to(this["cursorAn"],				0.5,	{delay:delay+0.5, overwrite: "none", x:60, y:0, rotation:0.2, ease:"back.in"});
		gsap.to(this["cursorAn"],				0.4,	{delay:delay+1.0, overwrite: "none", x:-120, y:20, rotation:-0.2, ease:"sine.in"});
		gsap.to(this["cursorAn"],				1.4,	{delay:delay+1.4, overwrite: "none", x:0, y:80, rotation:0.0, ease:"expo.out"});
	
		gsap.to(this["cursorB1"],				0.5,	{delay:delay+0.5, overwrite: "none", rotation:0.25, ease:"back.in"});
		gsap.to(this["cursorB1"],				0.4,	{delay:delay+1.0, overwrite: "none", rotation:-0.22, ease:"sine.in"});
		gsap.to(this["cursorB1"],				1.2,	{delay:delay+1.4, overwrite: "none", rotation:0.0, ease:"expo.out"});
		gsap.to(this["cursorB1"].scale,			0.4,	{delay:delay+1.0, overwrite: "none", y:0.9, ease:"sine.in"});
		gsap.to(this["cursorB1"].scale,			1.2,	{delay:delay+1.4, overwrite: "none", y:1.0, ease:"expo.out"});
	
		gsap.to(this,							0.8,	{delay:delay+1.0, overwrite: "none", carouselAngle:"-="+(this.carouselDeltaAngle), ease:"expo.inOut"});
		
		gsap.set(this["cursorAn"],						{delay:delay+2.6, overwrite: "none", onComplete:this.play});
	}

	//------------------------------------------------------------------------
	
	#carouselSortZ = function ( a, b ) {
		if ( a.carouselItemZ < b.carouselItemZ ){
			return 1;
		}
		if ( a.carouselItemZ > b.carouselItemZ ){
			return -1;
		}
		return 0;
	}
	
	//------------------------------------------------------------------------

	enterframe = ( timeDelta )=>{
		if(this.visible){
			for(let i=0; i<this.#items.length; i++){
				let item = this["carouselItem_"+i];
				
				item.carouselItemX = this.carouselRadius * Math.cos( this.carouselAngle + item.carouselItemAngle );
				item.carouselItemZ = this.carouselRadius * Math.sin( this.carouselAngle + item.carouselItemAngle );
				item.carouselItemD = Math.hypot(
					(0 - item.x),
					(this.carouselRadius - item.carouselItemZ)
				);
				
				item.x = item.carouselItemX;
				item.y = 0;
				item.scale.set(this.carouselFov+(1-this.carouselFov) * item.carouselItemD/(2*this.carouselRadius));
			}
			
			this["carouselItems"].children.sort( this.#carouselSortZ );
		}
    }

	//resize = (width, height)=>{
	//	if(width < height){
	//		this.x = this.positionAbsolute.vertical.x +  this.positionRelative.vertical.x * width;
	//		this.y = this.positionAbsolute.vertical.y +  this.positionRelative.vertical.y * height;
	//		this.scale.set(this.scaleAbsolute.vertical.x, this.scaleAbsolute.vertical.y);
	//		this.rotation = this.rotationAbsolute.vertical;
	//	}else{
	//		this.x = this.positionAbsolute.horizontal.x +  this.positionRelative.horizontal.x * width;
	//		this.y = this.positionAbsolute.horizontal.y +  this.positionRelative.horizontal.y * height;
	//		this.scale.set(this.scaleAbsolute.horizontal.x, this.scaleAbsolute.horizontal.y);
	//		this.rotation = this.rotationAbsolute.horizontal;
	//	}
    //}

}

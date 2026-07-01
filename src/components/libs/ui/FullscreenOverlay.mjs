import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class FullscreenOverlay extends IMPION.Component2d{

	#cover;
	
	//------------------------------------------------------------------------

	constructor({
		fill = null,
		alpha = 1,
		cover = false,
		texture = null,
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
	}){
		super();

		//-
		
		this.positionRelative = positionRelative;
		this.positionAbsolute = positionAbsolute;
		this.scaleAbsolute = scaleAbsolute;
		this.rotationAbsolute = rotationAbsolute;
		
		this.#cover = cover;

		if(fill != null ){
			this.bgObject = new IMPION.Graphics2d();			
			this.bgObject.rect(-1282*0.5, -1282*0.5, 1282, 1282);		
			this.bgObject.fill({color: fill, alpha:1});
			this.animationContainer.addChild( this.bgObject );
		}else if(texture){
			this.bgObject = new IMPION.Sprite2d();
			this.bgObject.texture = texture;
			this.bgObject.anchor.set(0.5, 0.5);
			this.animationContainer.addChild( this.bgObject );
		}
		
		this.alpha = alpha;
		
		//-

		return this;
    }

	//------------------------------------------------------------------------
	
	setFill( color ){
		this.bgObject.clear();
		this.bgObject.beginFill(color, 1);
		this.bgObject.drawRect(-1282*0.5, -1282*0.5, 1282, 1282);
		this.bgObject.endFill();	
	}
	
	//------------------------------------------------------------------------

	resize = (width, height)=>{
		if(this.bgObject && this.bgObject.texture){
			if(this.#cover){			
				this.scale.x = width/(this.bgObject.width-2);
				this.scale.y = height/(this.bgObject.height-2);
			}else{
				this.scale.set(Math.max(width/(this.bgObject.width-2), height/(this.bgObject.height-2)));
			}
		}else if(this.bgObject){
			if(this.#cover){			
				this.scale.x = width/(this.bgObject.width-2);
				this.scale.y = height/(this.bgObject.height-2);
			}else{
				this.scale.set(Math.max(width/(1280-2), height/(1280-2)));
			}
		}else{
			if(this.#cover){			
				this.scale.x = width/(1280-2);
				this.scale.y = height/(1280-2);
			}else{
				this.scale.set(Math.max(width/(1280-2), height/(1280-2)));
			}
		}
		
		if(width < height){
			this.x = this.positionAbsolute.vertical.x +  this.positionRelative.vertical.x * width;
			this.y = this.positionAbsolute.vertical.y +  this.positionRelative.vertical.y * height;
			this.rotation = this.rotationAbsolute.vertical;
		}else{
			this.x = this.positionAbsolute.horizontal.x +  this.positionRelative.horizontal.x * width;
			this.y = this.positionAbsolute.horizontal.y +  this.positionRelative.horizontal.y * height;
			this.rotation = this.rotationAbsolute.horizontal;
		}
	}

}

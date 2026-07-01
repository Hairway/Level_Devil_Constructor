import * as IMPION from "#impion";
import {gsap} from "gsap";

export default class SpriteText extends IMPION.Component2d{

	#text;
	#textStyle;
	#asBitmap;

	//------------------------------------------------------------------------

	constructor({
		texture = null,
		textures = null,
		graphics = null,
		anchor = {x:0.5, y:0.5},
		
		text = null,
		textStyle,

		fps = 60,
		order = "",
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
		asBitmap = false,
		borderBitmap = 0,
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute, asBitmap, borderBitmap);

		//-

		this.#text = text;
		this.#asBitmap = asBitmap;
		
		//-
		
		if(textures){
			
			for(let i in textures){
				this["bgObject_"+i] = new IMPION.Sprite2d();
				this["bgObject_"+i].texture = textures[i];
				this["bgObject_"+i].anchor.set(anchor.x, anchor.y);
				this.animationContainer.addChild( this["bgObject_"+i] );
			}
			
		}else if(texture){
			
			this.bgObject = new IMPION.Sprite2d();
			this.bgObject.texture = texture;
			this.bgObject.anchor.set(anchor.x, anchor.y);
			this.animationContainer.addChild( this.bgObject );
		
		}else if(graphics){
			
			this.bgObject = new IMPION.Graphics2d();
			this.bgObject.beginFill(graphics.fill, graphics.alpha);
			this.bgObject.drawRect(graphics.x, graphics.y, graphics.w, graphics.h);
			this.bgObject.endFill();
			this.animationContainer.addChild( this.bgObject );
		
		}
		
		if(this.#text){
			if(Array.isArray(this.#text)){
				this.#textStyle = [];
				
				for(let i=0; i<this.#text.length; i++){
					this.#textStyle[i] = Object.assign({x:0, y:0}, textStyle[i]);
					
					if(this.#textStyle[i].autoWordWrap && texture){
						this.#textStyle[i].wordWrapWidth = texture.width*0.85;	
						this.#textStyle[i][i].wordWrapHeight = texture.height*0.85;
					}
					
					this["textObject_"+i] = new IMPION.Text2d(
						this.#text[i],
						this.#textStyle[i],
					);	
					this["textObject_"+i].x = this.#textStyle[i].x;			
					this["textObject_"+i].y = this.#textStyle[i].y;	
					this.animationContainer.addChild( this["textObject_"+i] );
				}				
			}else{
				this.#textStyle = Object.assign({x:0, y:0}, textStyle);
				
				if(this.#textStyle.autoWordWrap && texture){
					this.#textStyle.wordWrapWidth = texture.width*0.85;	
					this.#textStyle.wordWrapHeight = texture.height*0.85;
				}
				
				this.textObject = new IMPION.Text2d(
					this.#text,
					this.#textStyle
				);	
				this.textObject.x = this.#textStyle.x;			
				this.textObject.y = this.#textStyle.y;	
				this.animationContainer.addChild( this.textObject );
			}
			
		}
		
		//-

		this.setAsBitmap( this.#asBitmap );
		
		//-

		return this;
    }

	//------------------------------------------------------------------------

	setText( text, id=-1 ){
		this.setAsBitmap( false );
		if(id != -1){
			this["textObject_"+id].setText( text );
		}else{			
			this.textObject.setText( text );			
		}
		this.setAsBitmap( this.#asBitmap );
	}

	setFill( fill, id=-1 ){
		this.setAsBitmap( false );
		if(id != -1){
			this["textObject_"+id].setFill( fill );		
		}else{			
			this.textObject.setFill( fill );			
		}
		this.setAsBitmap( this.#asBitmap );
	}

	//------------------------------------------------------------------------

	//enterframe = ( timeDelta )=>{
	//
    //}

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

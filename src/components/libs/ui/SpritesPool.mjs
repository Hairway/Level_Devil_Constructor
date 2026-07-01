import * as IMPION from "#impion";
import {gsap} from "gsap";

export default class SpritesPool extends IMPION.Component2d{

	componentType2D = true;
	componentType3D = false;
	
	quantity;
	particles = [];
	
	//------------------------------------------------------------------------

	constructor({
		texture,
		textures,
		quantity = 10,
		blend,
		
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

		this.quantity = quantity;
		
		//-
		
		let j = 0;
		
		for(let i=0; i<this.quantity; i++){
			let particle = new IMPION.Sprite2d();
			if(textures){
				particle.texture = textures[j];
				j++;
				if(j == textures.length){ j = 0;}
			}else{
				particle.texture = texture;
			}
			particle.anchor.set(0.5, 0.5);
			particle.scale.set(1);
			if(this.blend){
				particle.blendMode = this.blend;
			}
			particle.visible = false;

			this.particles.push( particle );
			
			this.animationContainer.addChild( particle );	
		}
		
		//-

		return this;
    }

	//------------------------------------------------------------------------

	//enterframe = ( timeDelta ) => {
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

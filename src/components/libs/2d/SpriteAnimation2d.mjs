import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class SpriteAnimation2d extends IMPION.Component2d{

	componentType2D = false;
	componentType3D = false;
	
	#name;
	#assets;
	#frame = 0;
	#frameInt = 0;
	#speed;
	#isPlay = false;
	#isLoop = false;
	#stopAtEnd = false;

	//------------------------------------------------------------------------

	constructor({
		name,
		assets,
		stopAtEnd,
		speed = 1,
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
		
		this.#name = name;
		this.#assets = assets;
		this.#speed = speed;
		this.#stopAtEnd = stopAtEnd;

		//-
	
		this.bgObject = new IMPION.Sprite2d();
		this.bgObject.texture = this.#assets.textures.pixi[this.#name+"_"+this.#frame];
		this.bgObject.anchor.set(0.5, 0.5);
		this.animationContainer.addChild( this.bgObject );

		//-

		return this;
    }

	//------------------------------------------------------------------------

	setLoop( loop ){
		this.#isLoop = loop;
		return this;
	}
	
	restart(){
		this.#frame = 0;
		return this;
	}
	
	getFrame(){
		return this.#frame;
	}
	
	play(){
		this.#isPlay = true;
		return this;
	}
	
	pause(){
		this.#isPlay = false;
		return this;
	}

	//------------------------------------------------------------------------

	enterframe = ( timeDelta ) => {
		if(this.visible && this.#isPlay){
			this.#frame += this.#speed;
			this.#frameInt = Math.ceil(this.#frame);
			
			if(!this.#assets.textures.pixi[this.#name+"_"+this.#frameInt]){
				if(this.#isLoop){
					this.#frame = 0;
				}else{
					if(this.#stopAtEnd){
						this.#isPlay = false;
					}else{
						this.visible = false;
					}
				}
			}else{
				this.bgObject.texture = this.#assets.textures.pixi[this.#name+"_"+this.#frameInt];
			}
		}
    }

}

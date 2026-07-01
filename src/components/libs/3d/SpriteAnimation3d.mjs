import * as IMPION from "#impion";

export default class SpriteAnimation3d extends IMPION.Component3d{

	componentType2D = false;
	componentType3D = false;
	
	#name;
	#assets;
	#materials;
	#frame = 0;
	#frameInt = 0;
	#speed;
	#isRandomRotation = false;
	#isPlay = false;
	#isLoop = false;

	//------------------------------------------------------------------------

	constructor({
		name,
		assets,
		materials,
		blending = 1,
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
		this.#materials = materials;
		this.#speed = speed;

		//-
	
		this.#materials[this.#name] = new IMPION.SpriteMaterial3d({
			map				: this.#assets.textures.three[this.#name+"_"+this.#frameInt],
			blending		: blending,
			depthWrite		: false,
			transparent		: true,
			sizeAttenuation	: true,	
			fog				: false,
			color			: new IMPION.Color3d(0xffffff),
		});		
	
		this.objectSprite = new IMPION.Sprite3d();
		this.objectSprite.material = this.#materials[this.#name];
		this.add( this.objectSprite );
		
		this.visible = false;
		
		//-

		return this;
    }

	//------------------------------------------------------------------------

	setLoop( loop ){
		this.#isLoop = loop;
		return this;
	}
	
	setRandomRotation( isRandomRotation ){
		this.#isRandomRotation = isRandomRotation;
		return this;
	}
	
	restart(){
		this.#frame = 0;
		return this;
	}
	
	play( randomRotation = false ){
		this.#isPlay = true;		
		return this;
	}
	
	seek( frame ){
		this.#frame = Math.ceil(frame);
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
			
			if(!this.#assets.textures.three[this.#name+"_"+this.#frameInt]){
				if(this.#isLoop){
					this.#frame = 0;
					if(this.#isRandomRotation){
						this.objectSprite.material.rotation = 7*Math.random();
					}
				}else{
					this.#frame = 0;
					this.visible = false;
				}
			}else{
				this.objectSprite.material.map = this.#assets.textures.three[this.#name+"_"+this.#frameInt];
			}
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

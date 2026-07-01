import * as IMPION from "#impion";

export default class ButtonSound extends IMPION.Component2d{

	#textureOn;
	#textureOff;

	#soundManager;

	#active = true;

	bg;

	//------------------------------------------------------------------------

	constructor({
		textureOn,
		textureOff,
		soundManager,
		
		fps = 60,
		order = "",
		
		positionRelative = {vertical: {x: -0.5, y: 0.5}, horizontal: {x: -0.5, y: 0.5}},
		positionAbsolute = {vertical: {x: 50, y: -100}, horizontal: {x: 50, y: -100}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
		asBitmap = false,
		borderBitmap = 0,
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute, asBitmap, borderBitmap);

		//-

		this.#textureOn = textureOn;
		this.#textureOff = textureOff;
		this.#soundManager = soundManager;

		//-

		this.bgObject = new IMPION.Sprite2d();
		this.bgObject.texture = this.#textureOn;
		this.bgObject.anchor.set(0.5, 0.5);
		this.bgObject.alpha = 0.5;
		this.animationContainer.addChild( this.bgObject );

		//-

		this.eventMode = "static";
		this.on('pointerup', this.#btnUp);

		//-

		return this;
    }

	//------------------------------------------------------------------------

	#btnUp(e){
		if(this.#active){
			this.#active = false;

			//-

			this.bgObject.texture = this.#textureOff;

			//-

			this.#soundManager.activeUser = false;
			this.#soundManager.off();

		}else{
			this.#active = true;

			//-

			this.bgObject.texture = this.#textureOn;

			//-

			this.#soundManager.activeUser = true;
			this.#soundManager.on();

		}
	}

}

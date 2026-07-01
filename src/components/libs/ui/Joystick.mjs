import * as IMPION from "#impion";
import {gsap} from "gsap";

export default class Joystick extends IMPION.Component2d{

	#textureBg;
	#textureBar;

	//------------------------------------------------------------------------

	constructor({
		textureBg,
		textureBar,
		
		fps = 60,
		order = "",		
		positionRelative = {vertical: {x: 0, y: 0.5}, horizontal: {x: 0.5, y: 0.5}},
		positionAbsolute = {vertical: {x: 0, y: -200}, horizontal: {x: -200, y: -200}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
		asBitmap = false,
		borderBitmap = 0,
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute, asBitmap, borderBitmap);

		//-

		this.#textureBg = textureBg;
		this.#textureBar = textureBar;

		//-

		this.bgObject = new IMPION.Sprite2d();
		this.bgObject.texture = this.#textureBg;
		this.bgObject.anchor.set(0.5, 0.5);
		this.animationContainer.addChild( this.bgObject );

		this.barObject = new IMPION.Sprite2d();
		this.barObject.texture = this.#textureBar;
		this.barObject.anchor.set(0.5, 0.5);
		this.animationContainer.addChild( this.barObject );

		//-

		return this;
    }

}

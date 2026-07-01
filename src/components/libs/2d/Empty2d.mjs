import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class Empty2d extends IMPION.Component2d{

	/**
	* Creates an instance of Empty2d.
	* @param {Object} settings - Configuration object for the Empty2d container.
	* @param {number} [settings.fps=60] - Frames per second for animation updates.
	* @param {string} [settings.order=""] - Rendering order of the object.
	* @param {Object} [settings.positionRelative] - Relative positioning settings.
	* @param {Object} [settings.positionRelative.vertical] - Vertical positioning.
	* @param {number} [settings.positionRelative.vertical.x=0] - X position.
	* @param {number} [settings.positionRelative.vertical.y=0] - Y position.
	* @param {Object} [settings.positionRelative.horizontal] - Horizontal positioning.
	* @param {number} [settings.positionRelative.horizontal.x=0] - X position.
	* @param {number} [settings.positionRelative.horizontal.y=0] - Y position.
	* @param {Object} [settings.positionAbsolute] - Absolute positioning settings.
	* @param {Object} [settings.positionAbsolute.vertical] - Vertical absolute position.
	* @param {Object} [settings.positionAbsolute.horizontal] - Horizontal absolute position.
	* @param {Object} [settings.scaleAbsolute] - Absolute scale settings.
	* @param {Object} [settings.rotationAbsolute] - Absolute rotation settings.
	* @param {boolean} [settings.asBitmap=false] - Whether to render as a bitmap.
	* @param {number} [settings.borderBitmap=0] - Border size for the bitmap.
	*/

	componentType2D = true;
	componentType3D = false;
	
	//------------------------------------------------------------------------

	constructor({
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

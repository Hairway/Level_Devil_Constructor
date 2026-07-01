import * as IMPION from "#impion";
import {gsap} from "gsap";

export default class Countdown extends IMPION.Component2d {

	/**
	* Creates an instance of Countdown.
	* @param {Object} settings - Configuration object for the countdown.
	* @param {Object} settings.textStyle - Text style settings for the countdown numbers.
	* @param {Object} settings.soundManager - Sound manager responsible for playing countdown sounds.
	* @param {Array} [settings.filters=null] - Filters applied to the countdown text.
	* @param {Function} [settings.callback=() => {}] - Function to execute after the countdown finishes.
	* @param {number} [settings.fps=45] - Frames per second for animation updates.
	* @param {string} [settings.order=""] - Rendering order of the countdown display.
	* @param {Object} [settings.positionRelative] - Relative positioning settings.
	* @param {Object} [settings.positionRelative.vertical] - Vertical positioning.
	* @param {number} [settings.positionRelative.vertical.x=-0.5] - X position.
	* @param {number} [settings.positionRelative.vertical.y=0.5] - Y position.
	* @param {Object} [settings.positionRelative.horizontal] - Horizontal positioning.
	* @param {number} [settings.positionRelative.horizontal.x=-0.5] - X position.
	* @param {number} [settings.positionRelative.horizontal.y=0.5] - Y position.
	* @param {Object} [settings.positionAbsolute] - Absolute positioning settings.
	* @param {Object} [settings.positionAbsolute.vertical] - Vertical absolute position.
	* @param {number} [settings.positionAbsolute.vertical.x=50] - X position.
	* @param {number} [settings.positionAbsolute.vertical.y=-100] - Y position.
	* @param {Object} [settings.positionAbsolute.horizontal] - Horizontal absolute position.
	* @param {number} [settings.positionAbsolute.horizontal.x=50] - X position.
	* @param {number} [settings.positionAbsolute.horizontal.y=-100] - Y position.
	* @param {Object} [settings.scaleAbsolute] - Absolute scale settings.
	* @param {Object} [settings.rotationAbsolute] - Absolute rotation settings.
	*/

	 
    #soundManager;
    #callback;
    #countdownText = 3;
    #textObject;
    #textStyle;

    constructor({
		textStyle,
		soundManager,
		filters = null,
		callback = () => {},
		fps = 60,
		order = "",
		positionRelative = {vertical: {x: -0.5, y: 0.5}, horizontal: {x: -0.5, y: 0.5}},
		positionAbsolute = {vertical: {x: 50, y: -100}, horizontal: {x: 50, y: -100}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},		
    }) {
        super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute);

		//-
		
        this.#callback = callback;
        this.#soundManager = soundManager;

		//-
		
        this.#textStyle = Object.assign({
            fontFamily 		: "Baloo",
            fontSize 		: 100,
            fontWeight 		: "bold",
            fill			: 0xfafafa,
            align			: "center",
            valign			: "center",
            letterSpacing	: -2,
            lineHeight		: 0,
            filters			: filters,
            wordWrapWidth	: 1000,
            wordWrapHeight	: 1000,
            wordWrap		: false,
            autoWordWrap	: false
        }, textStyle);

        this.#textObject = new IMPION.Text2d(
            this.#countdownText,
            this.#textStyle
        );
		
        this.animationContainer.addChild( this.#textObject );
		
		//-
		
		return this;
    }

    start() {
		gsap.killTweensOf( this.animationContainer.scale );

		//-
		
		gsap.set(this.animationContainer.scale, 	 	{delay: 0.0, x: 4, y: 4, onComplete: () => {
			this.#textObject.setText("3");			
			if( this.#soundManager){ this.#soundManager.play("321"); }
		}})
        gsap.to(this.animationContainer.scale, 	0.8, 	{delay: 0.0, x: 1, y: 1, ease:"expo.out"})
		
		//-
		
        gsap.set(this.animationContainer.scale, 	 	{delay: 0.8, x: 4, y: 4, onComplete: () => {
			this.#textObject.setText("2");			
			if( this.#soundManager){ this.#soundManager.play("321"); }
		}})
        gsap.to(this.animationContainer.scale, 	0.8, 	{delay: 0.8, x: 1, y: 1, ease:"expo.out"})
		
		//-
		
		gsap.set(this.animationContainer.scale, 	 	{delay: 1.6, x: 4, y: 4, onComplete: () => {
			this.#textObject.setText("1");			
			if( this.#soundManager){ this.#soundManager.play("321"); }
		}})
        gsap.to(this.animationContainer.scale, 	0.8, 	{delay: 1.6, x: 1, y: 1, ease:"expo.out"})
		
		//-
		
		gsap.set(this.animationContainer.scale, 	 	{delay: 2.4, x: 0, y: 0, onComplete: () => {
			this.#textObject.setText("GO");			
			if( this.#soundManager){ this.#soundManager.play("go"); }
			
			this.#callback();
		}})
        gsap.to(this.animationContainer.scale, 	1.4, 	{delay: 2.4, x: 1, y: 1, ease:"elastic.out", onComplete: () => {
            this.hide();
		}});
		
		//-
		
		return this;
    }
}
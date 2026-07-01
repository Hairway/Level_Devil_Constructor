import * as IMPION from "#impion";
import {gsap} from "gsap";

export default class VfxSpeedLines2d extends IMPION.Component2d{

	#assets;
	
	itemsObject = [];		
	vfxObject = [];		

	//------------------------------------------------------------------------

	constructor({
		texture = null,
		quantity = 100,
		assets,

		fps = 60,
		order = "",
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute);

		//-

		this.#assets = assets;
		
		//-
		
		for(let i=0; i<quantity; i++){
			this["vfxLine_"+i] = new IMPION.Sprite2d();
			if(texture){
				this["vfxLine_"+i].texture = texture;
			}else{
				this["vfxLine_"+i].texture = this.#assets.textures.pixi["vfxCircle"];
			}
			this["vfxLine_"+i].anchor.set(0.5);
			this["vfxLine_"+i].scale.x = 15;			
			this["vfxLine_"+i].scale.y = 0.4;	
			this["vfxLine_"+i].rotation = 2*Math.PI*Math.random();
			this["vfxLine_"+i].v = Math.randomInteger(60, 80);
			this["vfxLine_"+i].vx = this["vfxLine_"+i].v * Math.cos(this["vfxLine_"+i].rotation);
			this["vfxLine_"+i].vy = this["vfxLine_"+i].v * Math.sin(this["vfxLine_"+i].rotation);
			this["vfxLine_"+i].x += 10*this["vfxLine_"+i].vx;
			this["vfxLine_"+i].y += 10*this["vfxLine_"+i].vy;
			this["vfxLine_"+i].k = Math.random();
			this["vfxLine_"+i].vk = 0.07+0.07*Math.random();
			this["vfxLine_"+i].alpha = Math.random();
			this.animationContainer.addChild( this["vfxLine_"+i] );	
		}
		
		//-

		return this;
    }

	//------------------------------------------------------------------------

	enterframe = ( timeDelta )=>{
		if(this.visible){
			for(let i=0; i<100; i++){
				let line = this["vfxLine_"+i];
				
				line.x += line.vx;
				line.y += line.vy;
				
				if(line.k < 1){
					line.k += line.vk;
					line.alpha = 0.7*line.k;
				}else{
					line.alpha -= 0.5*line.vk;
					if(line.alpha < 0){
						line.k = -0.1;
						line.alpha = 0;
						line.rotation = 2*Math.PI*Math.random();
						line.v = Math.randomInteger(60, 80);
						line.vx = line.v * Math.cos(line.rotation);
						line.vy = line.v * Math.sin(line.rotation);
						line.x = 5*line.vx;
						line.y = 5*line.vy;
					}
				}
			}
		}
    }

}

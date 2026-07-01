import * as IMPION from "#impion";
import {gsap} from "gsap";

export default class DebugRuler extends IMPION.Component2d{
	
	//------------------------------------------------------------------------

	constructor({
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
		
		//-
			
		this.bgObject = new IMPION.Graphics2d();		
		this.bgObject.visible = false;		
		this.animationContainer.addChild( this.bgObject );
			
		//-
		
		window.addEventListener('keydown', (event) => {
			const key = event.key.toLowerCase();

			if (key === 'r' || key === 'к') {
				this.toggle();
			}
		});

		//-

		return this;
    }

	toggle(){
		this.bgObject.visible = !this.bgObject.visible;
		this.parent.addChild( this );
	}

	show(){
		this.bgObject.visible = true;
		this.parent.addChild( this );
	}

	hide(){
		this.bgObject.visible = false;
	}

	//------------------------------------------------------------------------

	resize = (width, height)=>{
		//this.scale.set(Math.max(width/(1280-2), height/(1280-2)));
		
		let border = 30;
		
		this.bgObject.clear();
		this.bgObject.rect(-width*0.5+border, -height*0.5+border, width - 2*border, height - 2*border);
		if(width < height){
			this.bgObject.rect(-150, -height*0.5+border, 150*2, border);
		}else{
			this.bgObject.rect(-width*0.5+border, -150, border , 150*2);
		}
		this.bgObject.stroke({width: 1, color: 0xff0000});

		this.parent.addChild( this );		
	}

}

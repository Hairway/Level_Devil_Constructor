import * as IMPION from "#impion";

export default class Control2dJoysticTPI extends IMPION.ComponentEmpty{

	#worldComponent;
	#joystickComponent;
	#character;

	//------------------------------------------------------------------------
	
	constructor({
		world,
		joystick,
		character,
	}){
		super();
		
		this.#worldComponent = world;
		this.#joystickComponent = joystick;
		this.#character = character;
		
		//-
		
		this.#worldComponent.camera.targetObject = this.#character;
		
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------
	
	updateDown( mouse ){
		mouse.downX = mouse.x;
		mouse.downY = mouse.y;
		
		this.#joystickComponent.show();

		this.#joystickComponent.barObject.x = 0;
		this.#joystickComponent.barObject.y = 0;
		this.#joystickComponent.x = mouse.x;
		this.#joystickComponent.y = mouse.y;
	}
	
	updateMove( mouse ){	
		mouse.a = Math.atan2(
			(mouse.y - mouse.downY),
			(mouse.x - mouse.downX),
		);
		mouse.d = Math.hypot(
			(mouse.downY - mouse.y),
			(mouse.downX - mouse.x),
		);
		
		if(mouse.d > 100){ mouse.d = 100; }
		
		this.#joystickComponent.barObject.x = mouse.d * Math.cos(mouse.a);
		this.#joystickComponent.barObject.y = mouse.d * Math.sin(mouse.a);
		
		//-
		
		this.#character.angleVelocity = mouse.a;
		
		if(!this.#character.isAction["run"] && this.#character.actionPool["run"].length){
			this.#character.isRun = true;
			this.#character.setActionPool("run");
		}else if(!this.#character.isAction["walk"] && this.#character.actionPool["walk"].length){
			this.#character.isRun = true;
			this.#character.setActionPool("walk");
		}
		
	}
		
	updateUp(){	
		if(this.#character.isAction["run"] || this.#character.isAction["walk"]){
			this.#character.isRun = false;
			this.#character.setActionPool("idle");
		}
		
		this.#joystickComponent.visible = false;
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		
    }
    
	//resize = (width, height)=>{
	//	
    //}

}
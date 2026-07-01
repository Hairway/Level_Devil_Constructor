import * as IMPION from "#impion";

export default class Control3dJoysticTPI extends IMPION.ComponentEmpty{

	#cameraComponent;
	#joystickComponent;
	#character;
	#light;

	//------------------------------------------------------------------------
	
	constructor({
		camera,
		joystick,
		character,
		light,
		isSubtract = true,
	}){
		super();
		
		this.#cameraComponent = camera;
		this.#joystickComponent = joystick;
		this.#character = character;
		this.#light = light;
		
		//-		
		
		this.#light.mPos = this.#light.position.clone();
		if(isSubtract){
			this.#light.mPosSubtract = this.#cameraComponent.position.clone();
			this.#light.mPosSubtract.y = 0;
		}
		
		if(this.#light){
			this.updateLight();
		}
		
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
		
		this.#character.angularVelocity = this.#cameraComponent.getAngleFrom2d( mouse.a );
		
		if(!this.#character.isMove){
			this.#character.isMove = true;
			
			if(this.#character.actionPool["run"].length > 0){
				this.#character.setActionPool("run");
			}else if(this.#character.actionPool["walk"].length > 0){
				this.#character.setActionPool("walk");
			} 
		}
	}
		
	updateUp(){	
		if(this.#character.isMove){
			this.#character.isMove = false;
			
			this.#character.setActionPool("idle");
		}
		
		this.#joystickComponent.visible = false;
	}
	
	updateLight(){		
		this.#light.position.copy( this.#light.mPos ).add( this.#character.position );			
		this.#light.target.position.copy( this.#character.position );	

		if(this.#light.mPosSubtract){
			this.#light.position.sub( this.#light.mPosSubtract );
			this.#light.target.position.sub( this.#light.mPosSubtract );
		}
		
		this.#light.target.updateMatrixWorld(true);	
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		if(this.#light && this.#character.isMove){
			this.updateLight();
		}
    }
    
	//resize = (width, height)=>{
	//	
    //}

}
import * as IMPION from "#impion";

export default class Control3dProduct extends IMPION.ComponentEmpty{

	#cameraComponent;
	
	#angle;
	#velocity = 0;
	#tm = 0;

	//------------------------------------------------------------------------
	
	constructor({
		camera
	}){
		super();
		
		this.#cameraComponent = camera;
		
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------
	
	updateDown( stateGame, mouse ){
		mouse.velocityX = mouse.x;
		mouse.downX = mouse.x;
		mouse.downY = mouse.y;
		
		this.#cameraComponent.velocityAngle = 0;
		this.#cameraComponent.stopRotation();
		
		this.#velocity = 0;
		this.#angle = this.#cameraComponent.getAngle();
	}
	
	updateMove( stateGame, mouse ){	
		mouse.dx = mouse.downX - mouse.x;
		
		this.#cameraComponent.setAngle(this.#angle + 0.01*mouse.dx);
				
		this.#velocity = 0.02*(mouse.velocityX - mouse.x);
		
		mouse.velocityX = mouse.x;
		
		this.#tm = 1;		
	}
		
	updateUp( stateGame, mouse ){	
		if(stateGame == 1){
			this.#cameraComponent.setVelocity( this.#velocity/this.#tm );
			this.#cameraComponent.playRotation();
		}		
	}
	
	resetAngle(duration = 0, delay = 0){	
		this.#cameraComponent.resetAngle(duration, delay);		
	}
	
	stopRotation(){	
		this.#cameraComponent.stopRotation();		
	}
	
	playRotation(){	
		this.#cameraComponent.playRotation();		
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		if(this.#tm < 1000){
			this.#tm += 3;
		}
    }
    
	//resize = (width, height)=>{
	//	
    //}

}
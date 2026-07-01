import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class CameraTPI extends IMPION.ComponentEmpty{

	#camera;
	
	#positionAbsolute;
	#positionLook;
	
	#positionView = new IMPION.Vector3();
	#lookTarget = new IMPION.Vector3();
	
	#lookAtTarget;
	#lookLate;
	#lookAngle;
	
	lookTargetShake = new IMPION.Vector3();

	active = true; 
	 
	//------------------------------------------------------------------------
	
	constructor({
		camera,
		positionAbsolute = {vertical: new IMPION.Vector3( -7, 8, 0), horizontal: new IMPION.Vector3( -7, 8, 0 )},
		positionLook = {vertical: new IMPION.Vector3( 0, 0, 0 ), horizontal: new IMPION.Vector3( 0, 0, 0 )}
	}){
		super();
		
		this.#positionAbsolute = positionAbsolute;
		this.#positionLook = positionLook;
		
		this.#camera = camera;
		this.#lookTarget.copy( positionLook.vertical );
		
		//-		
		
		this.#camera.position.copy( this.#positionAbsolute.vertical );
		this.#positionView.copy( this.#positionAbsolute.vertical );
		this.#camera.lookAt( this.#lookTarget );
		
		this.#updateLookAngle();
		
		//-		
		
		this.resize();
		
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------
	
	lookAt( viewObject, lookLate = 0.8){
		this.#lookAtTarget = viewObject;
		this.#lookLate = lookLate;
		
		this.#updateLookAngle();
		
		return this;
	}
	
	setPosition( positionAbsolute ){
		this.#positionAbsolute = positionAbsolute;
		
		this.resize();
	}
	
	setPositionLook( positionLook ){
		this.#positionLook = positionLook;

		this.resize();
	}
	
	getAngleFrom2d( angle ){
		return -angle + this.#lookAngle;
	}
	
	#updateLookAngle(){		
		this.#lookAngle = Math.atan2(
			(this.#positionView.x - this.#lookTarget.x),
			(this.#positionView.z - this.#lookTarget.z)
		) + 0.5*Math.PI;		
	}
	
	shake( amplitude, duration = 0.6, delay = 0 ){
		amplitude = 0.6*amplitude;
		
		if(delay == 0){
			gsap.killTweensOf( this.lookTargetShake );
		}
		
		this.lookTargetShake.x = this.lookTargetShake.y = this.lookTargetShake.z = 0;
		
		gsap.from(this.lookTargetShake,		duration, 	{delay:delay, overwrite: "none",
			x:0.5*amplitude - amplitude*Math.random(),
			y:0.5*amplitude - amplitude*Math.random(),
			z:0.5*amplitude - amplitude*Math.random(),
			ease:"elastic.out"
		});
	}
	
	shakeX( amplitude, duration = 0.6, delay = 0 ){
		amplitude = 0.6*amplitude;
		
		if(delay == 0){
			gsap.killTweensOf( this.lookTargetShake );
		}
		
		this.lookTargetShake.x = this.lookTargetShake.y = this.lookTargetShake.z = 0;
		
		gsap.from(this.lookTargetShake,		duration, 	{delay:delay, overwrite: "none",
			x:0.5*amplitude - amplitude*Math.random(),
			ease:"elastic.out"
		});
	}
	
	shakeY( amplitude, duration = 0.6, delay = 0 ){
		amplitude = 0.6*amplitude;
		
		if(delay == 0){
			gsap.killTweensOf( this.lookTargetShake );
		}
		
		this.lookTargetShake.x = this.lookTargetShake.y = this.lookTargetShake.z = 0;
		
		gsap.from(this.lookTargetShake,		duration, 	{delay:delay, overwrite: "none",
			y:0.5*amplitude - amplitude*Math.random(),
			ease:"elastic.out"
		});
	}
	
	shakeZ( amplitude, duration = 0.6, delay = 0 ){
		amplitude = 0.6*amplitude;
		
		if(delay == 0){
			gsap.killTweensOf( this.lookTargetShake );
		}
		
		this.lookTargetShake.x = this.lookTargetShake.y = this.lookTargetShake.z = 0;
		
		gsap.from(this.lookTargetShake,		duration, 	{delay:delay, overwrite: "none",
			z:0.5*amplitude - amplitude*Math.random(),
			ease:"elastic.out"
		});
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		if(this.active && this.#lookAtTarget){
			let to_x = this.#lookAtTarget.position.x + this.#positionView.x + this.lookTargetShake.x;
			let to_z = this.#lookAtTarget.position.z + this.#positionView.z + this.lookTargetShake.z;
			
			this.#camera.position.x = to_x - this.#lookLate * (to_x - this.#camera.position.x);
			this.#camera.position.z = to_z - this.#lookLate * (to_z - this.#camera.position.z);
		}
    }
    
	resize = (width, height)=>{
		if(width < height){
			this.#camera.position.copy( this.#positionAbsolute.vertical );			
			this.#camera.lookAt( this.#positionLook.vertical );
			this.#positionView.copy( this.#positionAbsolute.vertical );
			this.#lookTarget.copy( this.#positionLook.vertical );
		}else{			
			this.#camera.position.copy( this.#positionAbsolute.horizontal );
			this.#camera.lookAt( this.#positionLook.horizontal );
			this.#positionView.copy( this.#positionAbsolute.horizontal );
			this.#lookTarget.copy( this.#positionLook.horizontal );
		}
		
		if(this.#lookAtTarget){
			this.#camera.position.x = this.#lookAtTarget.position.x + this.#positionView.x;
			this.#camera.position.z = this.#lookAtTarget.position.z + this.#positionView.z;
		}
		
		this.#updateLookAngle();
    }
}
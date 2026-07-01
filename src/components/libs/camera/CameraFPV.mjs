import * as IMPION from "#impion";

export default class CameraFPV extends IMPION.ComponentEmpty{

	#camera;
	#lookTarget = new IMPION.Vector3();
	#positionView = new IMPION.Vector3();
	
	#lookAtTarget;
	#lookDistance;
	#lookLate;

	//------------------------------------------------------------------------
	
	constructor({
		camera,
		position = new IMPION.Vector3(0, +1.8, -3.5),
		lookTarget = new IMPION.Vector3(0, -0.5, +3.5)
	}){
		super();
		
		this.#camera = camera;
		this.#lookTarget.copy( lookTarget );
		
		//-		
		
		this.#camera.position.copy( position );
		this.#positionView.copy( position );
		this.#camera.lookAt( this.#lookTarget );
		
		this.#lookDistance = Math.hypot(
			(this.#lookTarget.x - this.#camera.position.x),
			(this.#lookTarget.z - this.#camera.position.z)
		);
		
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------
	
	lookAt( viewObject, lookLate = 1.0){
		this.#lookAtTarget = viewObject;
		this.#lookLate = lookLate;
		
		return this;
	}
	
	getAngleFrom2d( angle ){
		return -angle
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		if(this.#lookAtTarget){
			let to_x = this.#lookAtTarget.position.x + this.#lookDistance*Math.sin(Math.PI);
			let to_z = this.#lookAtTarget.position.z + this.#lookDistance*Math.cos(Math.PI);
			
			this.#camera.position.x = to_x - this.#lookLate * (to_x - this.#camera.position.x);
			this.#camera.position.z = to_z - this.#lookLate * (to_z - this.#camera.position.z);
			
			//-
			
			//this.#lookTarget.x = this.#camera.position.x + this.#lookDistance * Math.sin(this.#lookAtTarget.rotation.y);
			//this.#lookTarget.z = this.#camera.position.z + this.#lookDistance * Math.cos(this.#lookAtTarget.rotation.y);
			
			//-
			
			this.#camera.lookAt( this.#lookAtTarget.position );
		}
    }
    
	//resize = (width, height)=>{
	//	
    //}

}
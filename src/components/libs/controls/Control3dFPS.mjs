import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class Control3dFPS extends IMPION.ComponentEmpty{

	#cameraComponent;
	#characterComponent;

	#angleVelocityDown;
	
	#m_lookTargetUserY;	
	#lookTargetUserY = 0;
	
	lookTargetDistance = 0;
	lookTargetStandardY = 0;
	
	lookTargetShake = new IMPION.Vector2();
	
	#state = "";
	
	//------------------------------------------------------------------------
	
	constructor({
		camera,
		character,
		lookTargetDistance = 5,
		lookTargetStandardY = 0,
	}){
		super();
		
		//-
		
		this.#cameraComponent = camera;
		this.#characterComponent = character;
		
		this.lookTargetDistance = lookTargetDistance;
		this.lookTargetStandardY = lookTargetStandardY;
		
		//-		
		
		this.#characterComponent.characterFPS = new IMPION.Group3d();	
		this.#characterComponent.characterFPS.position.y = 1.7;
		this.#characterComponent.characterFPS.add( this.#characterComponent.character );
		this.#characterComponent.add( this.#characterComponent.characterFPS );
			
		this.#characterComponent.rotation.y = character.rotation.y;
		this.#characterComponent.angleVelocity = this.#characterComponent.rotation.y;
		this.#characterComponent.angleVelocityCurrent = this.#characterComponent.rotation.y;
		this.#characterComponent.angleUser = 0;
		
		this.#cameraComponent.camera.position.y = this.#characterComponent.position.y + 1.7;
		
		this.#updateCamera();
	
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------
	
	updateDown( stateGame, mouse ){
		mouse.downX = mouse.x;
		mouse.downY = mouse.y;
		
		this.#angleVelocityDown = this.#characterComponent.angleUser;
		this.#m_lookTargetUserY = this.#lookTargetUserY;
		
	}
	
	updateMove( stateGame, mouse ){	
		mouse.a = Math.atan2(
			(mouse.y - mouse.downY),
			(mouse.x - mouse.downX),
		);
		
		mouse.dx = mouse.downX - mouse.x;
		mouse.dy = mouse.downY - mouse.y;
		
		mouse.d = Math.hypot(
			(mouse.dy),
			(mouse.dx),
		);
		
		if(mouse.d > 100){ mouse.d = 100; }
		
		//-
		
		this.#characterComponent.angleUser  = this.#angleVelocityDown + 0.002*mouse.dx;
		
		if(this.#characterComponent.angleUser > +0.5){ this.#characterComponent.angleUser = +0.5; }
		if(this.#characterComponent.angleUser < -0.5){ this.#characterComponent.angleUser = -0.5; }
		
		//-
		
		this.#lookTargetUserY = this.#m_lookTargetUserY + 0.02*mouse.dy;
		
		if(this.#lookTargetUserY > +10){  this.#lookTargetUserY = +10; }
		if(this.#lookTargetUserY < -10){  this.#lookTargetUserY = -10; }
		
	}
		
	updateUp( stateGame, mouse ){	
		if(stateGame == 1){
			//if(this.#character.isAction["run"]){
			//	this.#character.setActionPool("idle");
			//}
		}
	}
	
	shake( amplitude, duration = 0.8, delay = 0 ){	
		amplitude = 0.05*amplitude;
		
		if(delay == 0){
			gsap.killTweensOf( this.lookTargetShake );
		}
		
		this.lookTargetShake.x = this.lookTargetShake.y = 0;
		
		gsap.from(this.lookTargetShake,		duration, 	{delay:delay, overwrite: "none", x:0.5*amplitude - amplitude*Math.random(), ease:"elastic.out"});
		gsap.from(this.lookTargetShake,		duration, 	{delay:delay, overwrite: "none", y:0.5*amplitude - amplitude*Math.random(), ease:"elastic.out"});
	}
		
	#updateCamera(){	
		if(this.#state != "die"){
			this.#cameraComponent.camera.position.x = this.#characterComponent.position.x;
			this.#cameraComponent.camera.position.y = this.#characterComponent.position.y + 1.7;
			this.#cameraComponent.camera.position.z = this.#characterComponent.position.z;
			 
			this.#cameraComponent.lookTarget.x = this.#characterComponent.position.x + this.lookTargetDistance * Math.sin(this.#characterComponent.rotation.y) + this.lookTargetShake.x;
			this.#cameraComponent.lookTarget.y = this.lookTargetStandardY + this.#lookTargetUserY + this.#cameraComponent.camera.position.y - 0.2;
			this.#cameraComponent.lookTarget.z = this.#characterComponent.position.z + this.lookTargetDistance * Math.cos(this.#characterComponent.rotation.y) + this.lookTargetShake.y;
			
			//-
			
			this.#cameraComponent.camera.lookAt( this.#cameraComponent.lookTarget );
			
			//-
			
			this.#characterComponent.parent.attach( this.#characterComponent.characterFPS );
			this.#characterComponent.characterFPS.lookAt( this.#cameraComponent.lookTarget );
			this.#characterComponent.attach( this.#characterComponent.characterFPS );
		}
	}
	
	die(){		
		this.#state = "die";
		
		gsap.killTweensOf( this.#cameraComponent.camera.position );		
		gsap.killTweensOf( this.#cameraComponent.camera.rotation );		
		gsap.killTweensOf( this.#characterComponent.character.position );		

		gsap.to(this.#cameraComponent.camera.position,			0.8,	{delay:0.1, overwrite: "none", y:"-=1.5", ease:"bounce.out"});
		gsap.to(this.#cameraComponent.camera.rotation,			0.8,	{delay:0.1, overwrite: "none", x:"+=0.1", z:"+=0.3", ease:"bounce.out"});
		
		gsap.to(this.#characterComponent.character.position,	0.2,	{delay:0.0, overwrite: "none", y:"-1", ease:"sine.out"});
		gsap.set(this.#characterComponent.character,					{delay:0.2, overwrite: "none", visible:false});
	
	}
	
    update = ()=>{		
		this.#updateCamera();
    }
	
	zoom = ( zoom, duration = 0, delay = 0) => {
		
		gsap.killTweensOf( this.#cameraComponent.camera );		
		
		if(duration == 0){
			this.#cameraComponent.camera.zoom = zoom;
			this.cameraMatrixUpdate();
		}else{			
			gsap.to(this.#cameraComponent.camera,	duration,	{delay:delay, overwrite: "none", zoom:zoom, ease:"expo.out", onUpdate:this.cameraMatrixUpdate});
		}
		
	}
	
	cameraMatrixUpdate = () => {
		this.#cameraComponent.camera.updateProjectionMatrix();
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		this.#updateCamera();
    }
    
	resize = (width, height)=>{
		if(width < height){
			this.#characterComponent.character.position.x = -0.00;
			this.#characterComponent.character.position.y = -0.22*1;
			this.#characterComponent.character.position.z = +0.45*1;
		}else{
			this.#characterComponent.character.position.x = -0.15;
			this.#characterComponent.character.position.y = -0.24;
			this.#characterComponent.character.position.z = +0.75;
		}
    }

}
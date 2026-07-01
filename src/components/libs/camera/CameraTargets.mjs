import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class CameraTargets extends IMPION.ComponentEmpty{

	active = true; 
	 
	targets;
	position = new IMPION.Vector3( 0, 0, 0);
	rate;
	deltaVertical;	
	deltaHorizontal;
	deltaLookVertical;
	deltaLookHorizontal;
	needsShake = 0;
	needsShakeLook = 0;
	
	#camera;	
	#targetPosition = new IMPION.Vector3( 0, 0, 0);
	#lookPosition = new IMPION.Vector3( 0, 0, 0);
	#cameraPosition = new IMPION.Vector3( 0, 0, 0);
	#shakePosition = new IMPION.Vector3( 0, 0, 0);
	#shakeLookPosition = new IMPION.Vector3( 0, 0, 0);
	#joystickAngle;
	
	#shakeD = new IMPION.Vector3( 0, 0, 0);
	#shakeA = new IMPION.Vector3( 0, 0, 0);
	#shakeLookD = new IMPION.Vector3( 0, 0, 0);
	#shakeLookA = new IMPION.Vector3( 0, 0, 0);
	
	#stageWidth = 0;	
	#stageHeight = 0;
	
	//------------------------------------------------------------------------
	
	constructor({
		camera,
		position = new IMPION.Vector3( -7, 8, 0),
		rate = 0.85,
		joystickAngle = 0,
		deltaVertical = new IMPION.Vector3( 0, 0, 0),
		deltaHorizontal = new IMPION.Vector3( 0, 0, 0),
		deltaLookVertical = new IMPION.Vector3( 0, 0, 0),
		deltaLookHorizontal = new IMPION.Vector3( 0, 0, 0),
		targets = {}
	}){
		super();
		
		this.#camera = camera;
		
		this.#joystickAngle = joystickAngle;
		this.targets = targets;
		this.rate = rate;
		this.deltaVertical = deltaVertical;
		this.deltaHorizontal = deltaHorizontal;
		this.deltaLookVertical = deltaLookVertical;
		this.deltaLookHorizontal = deltaLookHorizontal;
		
		this.position.copy( position );
				
		this.update( true );
		
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------

	getAngleFrom2d( angle ){
		return -angle + this.#joystickAngle;
	}
	
	//------------------------------------------------------------------------
	
	getZoom(){
		return this.#camera.zoom;
	}

	zoom( zoom, duration = 0.8, delay = 0.0){
		if(delay == 0){
			gsap.killTweensOf( this.#camera );
		}
		
		gsap.set(this.#camera,	{delay:delay, overwrite: "none",
			onComplete : this.zoomTo,
			onCompleteParams : [zoom, duration]
		});

	}

	zoomTo = (zoom, duration)=>{
		gsap.killTweensOf( this.#camera );
		
		gsap.to(this.#camera,		duration, 	{delay:0, overwrite: "none",
			zoom		: zoom,
			ease		: "sine.inOut",
			onUpdate	: this.updateMatrix
		});
	}

	updateMatrix = ()=>{
		this.#camera.updateProjectionMatrix();
	}
	
	//------------------------------------------------------------------------
	
	update = (lookForce = false)=>{
		if(!this.active){ return false; }
		
		this.#targetPosition.x = 0;
		this.#targetPosition.y = 0;
		this.#targetPosition.z = 0;
		let totalWeight = 0;
		
		//- weight
		
		for(let i in this.targets){
			let target = this.targets[i];
			
			this.#targetPosition.x += target.object.position.x * target.weight;
			this.#targetPosition.y += target.object.position.y * target.weight;
			this.#targetPosition.z += target.object.position.z * target.weight;
			
			totalWeight += target.weight;
		}
		
		if(totalWeight == 0){
			return false;
		}
		
		this.#targetPosition.x = this.#targetPosition.x / totalWeight;
		this.#targetPosition.y = this.#targetPosition.y / totalWeight;
		this.#targetPosition.z = this.#targetPosition.z / totalWeight;
		
		this.#cameraPosition.copy( this.#targetPosition ).add( this.position );
		
		//- resize
		
		if(this.#stageWidth != 0){
			if(this.#stageWidth < this.#stageHeight){
				this.#cameraPosition.add( this.deltaVertical );
				this.#targetPosition.add( this.deltaLookVertical );
			}else{
				this.#cameraPosition.add( this.deltaHorizontal );
				this.#targetPosition.add( this.deltaLookHorizontal );
			}
		}
		
		//- shake
		
		if(this.needsShake != 0){
			this.shake( this.needsShake );			
			this.needsShake = 0;
		}
		
		if(this.needsShakeLook != 0){
			this.shakeLook( this.needsShakeLook );			
			this.needsShakeLook = 0;
		}
		
		let axes = ["x", "y", "z"];
		
		for(let i = 0; i < 3; i++){
			if(this.#shakeD[axes[i]] > 0){
				this.#shakeA[axes[i]] += 70+10*i;
				if(this.#shakeA[axes[i]] >= 360){ this.#shakeA[axes[i]] -= 360; }

				this.#shakePosition[axes[i]] = this.#shakeD[axes[i]] * Math.sin( this.#shakeA[axes[i]] * Math.toRAD );
				
				this.#shakeD[axes[i]] *= 0.85;
				if(this.#shakeD[axes[i]] < 0.05){ this.#shakeD[axes[i]] = 0; }
			}
		}
		
		for(let i = 0; i < 3; i++){
			if(this.#shakeLookD[axes[i]] > 0){
				this.#shakeLookA[axes[i]] += 70+10*i;
				if(this.#shakeLookA[axes[i]] >= 360){ this.#shakeLookA[axes[i]] -= 360; }

				this.#shakeLookPosition[axes[i]] = this.#shakeLookD[axes[i]] * Math.sin( this.#shakeLookA[axes[i]] * Math.toRAD );
				
				this.#shakeLookD[axes[i]] *= 0.85;
				if(this.#shakeLookD[axes[i]] < 0.05){ this.#shakeLookD[axes[i]] = 0; }
			}
		}
				
		this.#cameraPosition.add( this.#shakePosition );
		this.#targetPosition.add( this.#shakeLookPosition );
		
		//- position
		
		if(lookForce){
			this.#camera.position.x = this.#cameraPosition.x;
			this.#camera.position.y = this.#cameraPosition.y;
			this.#camera.position.z = this.#cameraPosition.z;
		
			this.#lookPosition.x = this.#targetPosition.x;
			this.#lookPosition.y = this.#targetPosition.y;
			this.#lookPosition.z = this.#targetPosition.z;
		}else{			
			this.#camera.position.x = this.#cameraPosition.x - this.rate*(this.#cameraPosition.x - this.#camera.position.x);
			this.#camera.position.y = this.#cameraPosition.y - this.rate*(this.#cameraPosition.y - this.#camera.position.y);
			this.#camera.position.z = this.#cameraPosition.z - this.rate*(this.#cameraPosition.z - this.#camera.position.z);
		
			this.#lookPosition.x = this.#targetPosition.x - this.rate*(this.#targetPosition.x - this.#lookPosition.x);
			this.#lookPosition.y = this.#targetPosition.y - this.rate*(this.#targetPosition.y - this.#lookPosition.y);
			this.#lookPosition.z = this.#targetPosition.z - this.rate*(this.#targetPosition.z - this.#lookPosition.z);
		}
		
		//-
		
		this.#camera.lookAt( this.#lookPosition );
		
	}
	
	//------------------------------------------------------------------------
	
	shake = ( strength = 1, type = "xyz" ) => {
		if(type.indexOf("x") != -1){ this.#shakeD.x += strength; }
		if(type.indexOf("y") != -1){ this.#shakeD.y += strength; }
		if(type.indexOf("z") != -1){ this.#shakeD.z += strength; }
	}
	
	shakeLook = ( strength = 1, type = "xyz" ) => {
		if(type.indexOf("x") != -1){ this.#shakeLookD.x += strength; }
		if(type.indexOf("y") != -1){ this.#shakeLookD.y += strength; }
		if(type.indexOf("z") != -1){ this.#shakeLookD.z += strength; }
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		this.update();
    }
    
	resize = (width, height)=>{
		this.#stageWidth = width;
		this.#stageHeight = height;
		
		this.update();
    }
}
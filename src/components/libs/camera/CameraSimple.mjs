import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class CameraSimple extends IMPION.ComponentEmpty{

	#camera;
	positionAbsolute;
	positionLook;

	//------------------------------------------------------------------------
	
	constructor({
		camera,
		positionAbsolute = {vertical: new IMPION.Vector3( -10, 10, -10 ), horizontal: new IMPION.Vector3( -10, 10, 10 )},
		positionLook = {vertical: new IMPION.Vector3( 0, 0, 0 ), horizontal: new IMPION.Vector3( 0, 0, 0 )}
	}){
		super();
		
		this.#camera = camera;
		this.positionAbsolute = positionAbsolute;
		this.positionLook = positionLook;

		this.#camera.mp = this.#camera.position.clone();
		
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------

	shake( strength = 1, duration = 0.8 ){
		strength = 0.5*strength;
	
		gsap.killTweensOf( this.#camera.position );
		
		this.#camera.position.copy( this.#camera.mp );
		
		gsap.from(this.#camera.position,		duration, 	{delay:0.00, overwrite: "none",
			x: "+="+(0.5*strength - strength*Math.random()),
			y: "+="+(0.5*strength - strength*Math.random()),
			z: "+="+(0.5*strength - strength*Math.random()),
			ease:"elastic.out"
		});

	}

	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	resize = (width, height)=>{
		if(width < height){
			this.#camera.position.copy( this.positionAbsolute.vertical );
			this.#camera.lookAt( this.positionLook.vertical );
		}else{
			this.#camera.position.copy( this.positionAbsolute.horizontal );
			this.#camera.lookAt( this.positionLook.horizontal );
		}
		
		this.#camera.mp.copy( this.#camera.position );
    }

}
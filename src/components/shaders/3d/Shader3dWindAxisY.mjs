import * as IMPION from "#impion";

export default class Shader3dWindAxisY extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();
	#app;
	
	uSpeed;
	uStrengthX;
	uStrengthY;
	uStrengthZ;
	
	//------------------------------------------------------------------------
	
	constructor({
		uSpeed = 1,
		uStrengthX = 0,
		uStrengthY = 0,
		uStrengthZ = 0,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dWindAxisY", fps, order, orderShader);
		
		this.#app = globalThis.playable;
		
		//-
		
		this.uSpeed = uSpeed;
		this.uStrengthX = uStrengthX;		
		this.uStrengthY = uStrengthY;
		this.uStrengthZ = uStrengthZ;
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uTime			: { value: 0.0 },
			uSpeed 			: { value: this.uSpeed },
			uStrengthX 		: { value: this.uStrengthX },
			uStrengthY		: { value: this.uStrengthY },
			uStrengthZ		: { value: this.uStrengthZ }
		}
	}
	
	vertexShaderHead(){
		return `
			uniform float uTime;
			uniform float uSpeed;	
			uniform float uStrengthX;	
			uniform float uStrengthY;	
			uniform float uStrengthZ;
			
			vec3 Shader3dWindAxisY(){
				vec3 Shader3dWindAxisY_vPos = vec3(position);
				
				float dx = uStrengthX * position.y;
				float dy = uStrengthY * position.y;
				float dz = uStrengthZ * position.y;

				float sinx = cos(position.x*5.0 + uSpeed*2.1*uTime);
				float siny = sin(position.y*5.0 + uSpeed*2.5*uTime);
				float sinz = cos(position.z*5.0 + uSpeed*2.9*uTime);
				
				Shader3dWindAxisY_vPos.x += (dx*0.5 + dx * sinx);
				Shader3dWindAxisY_vPos.y += (dy*0.5 + dy * siny);
				Shader3dWindAxisY_vPos.z += (dz*0.5 + dz * sinz);
						
				return vec3(Shader3dWindAxisY_vPos);				
			}
		`;
	}
	
	vertexShaderBody(){
		return `					
			transformed = Shader3dWindAxisY();
		`;
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		if(this.uniforms && this.uniforms.uTime){
			this.#clock.update();
			this.uniforms.uTime.value = this.#clock.getElapsed() * this.#app.timeScale;
		}
    }
}
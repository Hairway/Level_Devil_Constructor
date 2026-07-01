import * as IMPION from "#impion";

export default class Shader3dWind extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();
	#app;
	
	uSpeed;
	uStrength;
	
	//------------------------------------------------------------------------
	
	constructor({
		app,
		
		uSpeed = 1,
		uStrength = [0.1, 0.1, 0.1],
		
		fps = 45,
		order = "",
		orderShader = 0
	}){
		super("Shader3dWind", fps, order, orderShader);
		
		this.#app = app;
		
		//-
		
		this.uSpeed = uSpeed;
		this.uStrength = uStrength;		
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uTime			: { value: 0.0 },
			uSpeed 			: { value: this.uSpeed },
			uStrength 		: { value: this.uStrength },
		}
	}

	vertexShaderHead(){
		return `
			uniform float uTime;
			uniform float uSpeed;	
			uniform vec3 uStrength;	
			
			vec3 Shader3dWind(){
				vec3 Shader3dWind_vPos = vec3(position);
				vec4 vertexGlobalPos = modelMatrix * vec4( position, 1.0 );
				
				//-
				
				float dx = 0.05 * uStrength.x * color.g;
				float dy = 0.05 * uStrength.y * color.g;
				float dz = 0.05 * uStrength.z * color.g;

				float sinx = cos(position.x*20.0 + uSpeed*3.0*uTime);
				float siny = sin(position.y*20.0 + uSpeed*3.0*uTime);
				float sinz = cos(position.z*20.0 + uSpeed*3.0*uTime);
				
				Shader3dWind_vPos.x += (dx*0.5 + dx * sinx);
				Shader3dWind_vPos.y += (dy*0.5 + dy * siny);
				Shader3dWind_vPos.z += (dz*0.5 + dz * sinz);
				
				//-
				
			//	dx = 0.2 * uStrength.x * smoothstep(1.0, 3.0, position.y);
			//	dy = 0.2 * uStrength.y * smoothstep(1.0, 3.0, position.y);
			//	dz = 0.2 * uStrength.z * smoothstep(1.0, 3.0, position.y);
			//
			//	sinx = cos(vertexGlobalPos.x*1.0 + uSpeed*1.7*uTime);
			//	siny = sin(vertexGlobalPos.y*1.0 + uSpeed*1.5*uTime);
			//	
			//	Shader3dWind_vPos.x += (dx*0.5 + dx * sinx);
			//	Shader3dWind_vPos.y += (dy*0.5 + dy * siny);
			//	Shader3dWind_vPos.z += (dz*0.5 + dz * sinx);
				
				//-
				
				return vec3(Shader3dWind_vPos);				
			}
		`;
	}
	
	vertexShaderBody(){
		return `					
			transformed = Shader3dWind();
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
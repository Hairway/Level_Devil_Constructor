import * as IMPION from "#impion";

export default class Shader3dGalo extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();	
	#app;
	
	//------------------------------------------------------------------------
	
	constructor({
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dGalo", fps, order, orderShader);
		
		this.#app = globalThis.playable;
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uTime	: { value: 0.0 },
			rimColor: { value: new IMPION.Color3d(0x00ffff) },
			rimPower: { value: 2.0 },
			rimIntensity: { value: 1.5 },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec3 vNormal_local;
   			varying vec3 vViewPosition_local;

			vec4 Shader3dGalo_vertex(){
				

			
				vNormal_local = normalize(normalMatrix * normal);
				vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
				vViewPosition_local = -mvPosition.xyz;
				return projectionMatrix * mvPosition;

			}

		`;
	}
	
	vertexShaderBody(){
		return `
			gl_Position = Shader3dGalo_vertex();
		`;
	}
	
	fragmentShaderHead(){
		return `
			
			// uniform float uTime;

			uniform vec3 rimColor;
			uniform float rimPower;
			uniform float rimIntensity;

			varying vec3 vNormal_local;
			varying vec3 vViewPosition_local;

			vec4 Shader3dGalo(vec4 colorFrag){
			 	vec3 normal = normalize(vNormal_local);
			 	vec3 viewDir = normalize(vViewPosition_local);

				// Calculate rim light using Fresnel effect
				float rim = 1.0 - max(0.0, dot(normal, viewDir));
				rim = pow(rim, rimPower) * rimIntensity;

			 	// Base color with rim light
			 	vec3 finalColor = vec3(0.0, 0.0, 0.0) + rimColor * rim;


			 	//gl_FragColor = vec4(finalColor ,step(0.5, ( finalColor.r+finalColor.g+finalColor.b)/3.0));
			 	gl_FragColor = vec4(finalColor ,1.0);
				
				return gl_FragColor;
			}


			

		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dGalo(gl_FragColor.rgba);
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
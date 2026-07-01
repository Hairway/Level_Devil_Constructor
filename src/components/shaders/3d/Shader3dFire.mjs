import * as IMPION from "#impion";

export default class Shader3dFire extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();	
	#app;
	
	//------------------------------------------------------------------------
	
	constructor({
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dFire", fps, order, orderShader);
		
		this.#app = globalThis.playable;
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uTime			: { value: 0.0 },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dFire_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dFire_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dFire_vUv;
			
			uniform float uTime;
			
			float randFire(vec2 n) { 
				return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
			}

			float noiseFire(vec2 p){
				vec2 ip = floor(p);
				vec2 u = fract(p);
				u = u*u*(3.0-2.0*u);
				
				float res = mix(
					mix(randFire(ip), randFire(ip+vec2(1.0, 0.0)), u.x),
					mix(randFire(ip+vec2(0.0, 1.0)), randFire(ip+vec2(1.0, 1.0)), u.x), u.y);
				return res*res;
			}
			  
			float blendOverlay(float base, float blend) {
				return base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));
			}

			vec3 blendOverlay(vec3 base, vec3 blend) {
				return vec3(blendOverlay(base.r,blend.r),blendOverlay(base.g,blend.g),blendOverlay(base.b,blend.b));
			} 

			vec4 Shader3dFire(vec4 colorFrag, vec2 vUv){
				float PI = 3.1415926535897932384626433832795;
				
				float noiseFire_0 = noiseFire(10.0*vec2(vUv.x - 1.5*uTime, vUv.y));
				float noiseFire_1 = noiseFire(5.0*vec2(vUv.x - 1.2*uTime, vUv.y));
				float noiseFireForm = noiseFire_0 * noiseFire_1;
				
				float d = 1.0 - smoothstep(0.35, 0.5, length(vec2(0.5, 0.5) - vUv));
				
				noiseFireForm += d*0.20;				
			
				vec3 colorFragOverlay = vec3(0.1, 0.1, 0.1);				
				colorFragOverlay.rgb += 5.0*step(0.35, noiseFireForm);
				colorFragOverlay.rgb += 5.0*step(0.40, noiseFireForm);
				
				colorFrag.rgb = 2.0 * blendOverlay(colorFrag.rgb, colorFragOverlay.rgb);
				colorFrag.a = d * step(0.25, noiseFireForm);
			
				return colorFrag.rgba;
				
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dFire(gl_FragColor.rgba, Shader3dFire_vUv);
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
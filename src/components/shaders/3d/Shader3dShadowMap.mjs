import * as IMPION from "#impion";

export default class Shader3dShadowMap extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();
	
	uTexture;
	uIntensity;
	
	//------------------------------------------------------------------------
	
	constructor({
		uTexture,
		uIntensity = 1,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dShadowMap", fps, order, orderShader);
		
		//-
		
		this.uTexture = uTexture;	
		this.uIntensity = uIntensity;

    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {			
			uTexture 		: { value: this.uTexture },
			uIntensity 		: { value: this.uIntensity },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dShadowMap_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dShadowMap_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dShadowMap_vUv;
			
			uniform sampler2D uTexture;
			uniform float uIntensity;
			
			vec4 Shader3dShadowMap(vec4 colorFrag, vec2 vUv){
				vec4 colorShadow = texture2D(uTexture, vUv);

				colorFrag.rgb *= (1.0 - uIntensity * (1.0 - colorShadow.r));

				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dShadowMap(gl_FragColor.rgba, Shader3dShadowMap_vUv);
		`;
	}
	
	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	if(this.uniforms && this.uniforms.uTime){
	//		this.#clock.update();
	//		this.uniforms.uTime.value = this.#clock.getElapsed() * this.#app.timeScale;
	//	}
    //}

}
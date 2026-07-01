import * as IMPION from "#impion";

export default class Shader3dMixThree extends IMPION.ComponentShader{


	#app;

	uTextureMap_0;
	uTextureMap_1;
	uTextureMap_2;
	uTextureMask;
	uRepeat;
	
	//------------------------------------------------------------------------
	
	constructor({
		app,
		
		uTextureMap_0,
		uTextureMap_1,
		uTextureMap_2,
		uTextureMask,
		uRepeat = [1,1,1],

		fps = 40,
		order = "",
		orderShader = 0
	}){
		super("Shader3dMixThree", fps, order, orderShader);
		
		this.#app = app;
		
		//-

		this.uTextureMap_0 = uTextureMap_0;
		this.uTextureMap_1 = uTextureMap_1;
		this.uTextureMap_2 = uTextureMap_2;
		this.uTextureMask = uTextureMask;
		this.uRepeat = uRepeat;	
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uTextureMap_0 	: { value: this.uTextureMap_0 },
			uTextureMap_1 	: { value: this.uTextureMap_1 },
			uTextureMap_2 	: { value: this.uTextureMap_2 },
			uTextureMask 	: { value: this.uTextureMask },
			uRepeat			: { value: this.uRepeat },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dMixThree_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `					
			Shader3dMixThree_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dMixThree_vUv;
			
			uniform sampler2D uTextureMap_0;
			uniform sampler2D uTextureMap_1;
			uniform sampler2D uTextureMap_2;
			uniform sampler2D uTextureMask;
			uniform vec3 uRepeat;
			
			vec4 Shader3dMixThree(vec4 colorFrag, vec2 vUv){
				
				//- 
				
				vec4 colorTL = texture2D(uTextureMap_0, vUv * uRepeat.r);
				vec4 colorTR = texture2D(uTextureMap_1, vUv * uRepeat.g);
				vec4 colorBL = texture2D(uTextureMap_2, vUv * uRepeat.b);
				
				vec4 colorMask = texture2D(uTextureMask, vUv);
				
				vec4 mixedColor = vec4(colorTL);
					
				mixedColor.rgba = mix(mixedColor.rgba, colorTR.rgba, colorMask.r);
				mixedColor.rgba = mix(mixedColor.rgba, colorBL.rgba, colorMask.g);

				//-
				
				colorFrag.rgba *= mixedColor;
				//colorFrag.rgba = colorMask.rgba;
				
				return colorFrag.rgba;
				
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dMixThree(gl_FragColor.rgba, Shader3dMixThree_vUv);
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
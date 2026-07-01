import * as IMPION from "#impion";

export default class Shader3dWaterBorder extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();
	#app;
	
	uTexture;
	uNoise;
	uSize;
	uAlpha;
	
	//------------------------------------------------------------------------
	
	constructor({
		uTexture,
		uNoise,
		uAlpha = 0.4,
		uSize = 1.0,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dWaterBorder", fps, order, orderShader);
		
		this.#app = globalThis.playable;
		
		//-
		
		this.uTexture = uTexture;	
		this.uNoise = uNoise;
		this.uAlpha = uAlpha;
		this.uSize = uSize;

    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {			
			uTexture 		: { value: this.uTexture },
			uNoise 			: { value: this.uNoise },
			uAlpha			: { value: this.uAlpha },
			uSize			: { value: this.uSize },
			uTime			: { value: 0.0 },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dWaterBorder_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dWaterBorder_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dWaterBorder_vUv;
			
			uniform sampler2D uTexture;
			uniform sampler2D uNoise;
			uniform float uAlpha;
			uniform float uSize;
			uniform float uTime;
			
			vec4 Shader3dWaterBorder(vec4 colorFrag, vec2 vUv){
				float size = 3.0/uSize;

				vec4 colorNoiseA = texture2D(uNoise, vec2(vUv.x * 1.5 * size + 0.04 * uTime * size, vUv.y * 1.5 * size + 0.04 * uTime * size));
				vec4 colorNoiseB = texture2D(uNoise, vec2(vUv.x * 2.5 * size - 0.04 * uTime * size, vUv.y * 2.5 * size - 0.04 * uTime * size));
				
				vec4 colorNoiseSum = 0.3 + 1.5*colorNoiseA * colorNoiseB;		

				vec4 colorNoiseC = texture2D(uTexture, vec2(vUv.x - 0.02 + 0.04*colorNoiseSum.r, vUv.y - 0.015 + 0.04*colorNoiseSum.r));

				colorNoiseC.rgb = step(0.15, colorNoiseC.rgb);
								
				colorFrag.r += uAlpha * colorNoiseC.r;
				colorFrag.g += uAlpha * colorNoiseC.g;
				colorFrag.b += uAlpha * colorNoiseC.b;
							
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dWaterBorder(gl_FragColor.rgba, Shader3dWaterBorder_vUv);
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
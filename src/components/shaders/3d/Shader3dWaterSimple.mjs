import * as IMPION from "#impion";

export default class Shader3dWaterSimple extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();
	#app;

	uTexture;
	uRepeat;
	uSpeed;
	
	//------------------------------------------------------------------------
	
	constructor({
		uTexture,		
		uRepeat = 1,
		uSpeed = 1,
		
		fps = 40,
		order = "",
		orderShader = 0
	}){
		super("Shader3dWaterSimple", fps, order, orderShader);
		
		this.#app = globalThis.playable;
		
		//-
		
		this.uTexture = uTexture;	
		this.uRepeat = uRepeat;		
		this.uSpeed = uSpeed;		
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uTexture 		: { value: this.uTexture },
			uRepeat			: { value: this.uRepeat },
			uSpeed			: { value: this.uSpeed },
			uTime			: { value: 0.0 },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dWaterSimple_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dWaterSimple_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dWaterSimple_vUv;

			uniform sampler2D uTexture;
			uniform float uSpeed;
			uniform float uRepeat;
			uniform float uTime;
			
			vec4 Shader3dWaterSimple(vec4 colorFrag, vec2 vUv){
				vec2 waveUv = vec2(vUv.xy);
				
				vec4 colorNoiseA;
				vec4 colorNoiseB;
				vec4 colorNoiseSum ;			
								
				//-
				
				colorNoiseA = texture2D(uTexture, vec2(vUv.x * uRepeat * 1.0 + 0.07 * uTime * uSpeed, vUv.y * uRepeat * 1.0 - 0.06 * uTime * uSpeed));
				colorNoiseB = texture2D(uTexture, vec2(vUv.y * uRepeat * 1.3 - 0.06 * uTime * uSpeed, vUv.x * uRepeat * 1.3 + 0.07 * uTime * uSpeed));
				colorNoiseSum = colorNoiseA * colorNoiseB;			
				
				waveUv *= uRepeat * (1.0+0.3*colorNoiseSum.x);
				
				//-
				
				colorNoiseA = texture2D(uNoisePerlin, vec2(vUv.x * uRepeat * 0.5 * 1.0 + 0.09 * uTime * uSpeed, vUv.y * uRepeat * 0.5 * 1.0 - 0.09 * uTime * uSpeed));
				colorNoiseB = texture2D(uNoisePerlin, vec2(vUv.y * uRepeat * 0.5 * 2.3 - 0.06 * uTime * uSpeed, vUv.x * uRepeat * 0.5 * 2.3 + 0.07 * uTime * uSpeed));
				colorNoiseSum = colorNoiseA * colorNoiseB;			
				
				waveUv += uRepeat * (1.0+0.05*colorNoiseSum.x);
				
				//-
				
				vec4 colorTexture = texture2D(uTexture, waveUv)*3.0;
				
				//-
				
				colorNoiseA = texture2D(uTexture, vec2(vUv.x * uRepeat * 0.8 - 0.01 * uTime * uSpeed, vUv.y * uRepeat * 0.8 + 0.01 * uTime * uSpeed));
				colorNoiseB = texture2D(uTexture, vec2(vUv.x * uRepeat * 0.6 + 0.06 * uTime * uSpeed, vUv.y * uRepeat * 0.6 - 0.06 * uTime * uSpeed));
				colorNoiseSum = smoothstep(0.70, 1.15, 6.0*colorNoiseA * colorNoiseB);			
				
				colorTexture.rgb *= (1.0+2.0*colorNoiseSum.x);
				
				//-
				
				colorNoiseA = texture2D(uNoisePerlin, vec2(vUv.x * 1.0 + 0.025 * uTime * uSpeed, vUv.y * 0.5 * 1.0 - 0.020 * uTime * uSpeed));
				colorNoiseB = texture2D(uNoisePerlin, vec2(vUv.y * 2.3 - 0.035 * uTime * uSpeed, vUv.x * 0.5 * 2.3 + 0.015 * uTime * uSpeed));
				colorNoiseSum = colorNoiseA * colorNoiseB;			
				
				colorTexture.rgb *= (0.5 + 3.0*colorNoiseSum.x);
				
				//-
				
				colorFrag.r *= colorTexture.r;
				colorFrag.g *= colorTexture.g;
				colorFrag.b *= colorTexture.b;
								
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dWaterSimple(gl_FragColor.rgba, Shader3dWaterSimple_vUv);
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
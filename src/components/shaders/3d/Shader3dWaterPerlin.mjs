import * as IMPION from "#impion";

export default class Shader3dWaterPerlin extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();
	
	#app;

	uSpeed;
	uSize;
	uAlpha;
	uAngle;
	uStrength;
	
	#uWaveVX;
	#uWaveVY;
		
	//------------------------------------------------------------------------
	
	constructor({
		app,
		
		uSpeed = 0.1,
		uSize = 1,
		uAlpha = 0.5,		
		uStrength = 0.5,
		uAngle = 0,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dWaterPerlin", fps, order, orderShader);
		
		this.#app = app;
		
		//-

		this.uSpeed = uSpeed;	
		this.uSize = uSize;
		this.uAlpha = uAlpha;	
		this.uStrength = uStrength;
		this.uAngle = uAngle;
		
		this.#uWaveVX = Math.sin(2*Math.PI - uAngle + Math.PI);
		this.#uWaveVY = Math.cos(2*Math.PI - uAngle + Math.PI);

    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uSpeed			: { value: this.uSpeed },
			uSize			: { value: this.uSize },
			uAlpha			: { value: this.uAlpha },
			uStrength		: { value: this.uStrength },
			uWaveVX			: { value: this.#uWaveVX },
			uWaveVY			: { value: this.#uWaveVY },
			uTime			: { value: 0.0 },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dWaterPerlin_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dWaterPerlin_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dWaterPerlin_vUv;
			
			uniform float uSize;
			uniform float uSpeed;
			uniform float uAlpha;
			uniform float uWaveVX;
			uniform float uWaveVY;
			uniform float uStrength;
			uniform float uTime;

			vec4 Shader3dWaterPerlin(vec4 colorFrag, vec2 vUv){
				float size = 1.0/uSize;
				float strength = 1.0 - uStrength;
				
				vec2 uvA = vec2(vUv.x * 0.5 * size + uWaveVX * uTime * uSpeed, vUv.y * 0.5 * size + uWaveVY * uTime * uSpeed);
				vec2 uvB = vec2(vUv.x * 1.1 * size + uWaveVX * 0.8 * uTime * uSpeed + 0.1, vUv.y * 1.1 * size + uWaveVY * 0.8 * uTime * uSpeed + 0.1);
				vec2 uvC = vec2(vUv.x * 1.8 * size + uWaveVX * 1.3 * uTime * uSpeed + 0.3, vUv.y * 1.8 * size + uWaveVY * 1.3 * uTime * uSpeed + 0.2);
								
				vec4 colorNoiseA = texture2D(uNoisePerlin, uvA);
				vec4 colorNoiseB = texture2D(uNoisePerlin, uvB);
				vec4 colorNoiseC = texture2D(uNoisePerlin, uvC);
							
				float colorNoiseSum = 10.0 * colorNoiseA.r * colorNoiseB.r * (0.5 + 0.5*colorNoiseC.r);			
				colorNoiseSum = step(strength, colorNoiseSum);
				
				colorFrag.r += 0.05 * uAlpha * colorNoiseSum;
				colorFrag.g += 0.05 * uAlpha * colorNoiseSum;
				colorFrag.b += 0.05 * uAlpha * colorNoiseSum;
				
				colorFrag.r *= (1.0 + uAlpha * colorNoiseSum);
				colorFrag.g *= (1.0 + uAlpha * colorNoiseSum);
				colorFrag.b *= (1.0 + uAlpha * colorNoiseSum);
				
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dWaterPerlin(gl_FragColor.rgba, Shader3dWaterPerlin_vUv);
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
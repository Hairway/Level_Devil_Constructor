import * as IMPION from "#impion";

export default class Shader3dWaterLevel extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();
	#app;

	uStrength;
	uThickness;
	uLevel;
	
	//------------------------------------------------------------------------
	
	constructor({
		app,
		
		uStrength = 1,
		uThickness = 0.05,
		uLevel = 0,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dWaterLevel", fps, order, orderShader);
		
		this.#app = app;
		
		//-
		
		this.uStrength = uStrength;
		this.uThickness = uThickness;
		this.uLevel = uLevel;

    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {			
			uStrength	: { value: this.uStrength },
			uThickness	: { value: this.uThickness },
			uLevel		: { value: this.uLevel },
			uTime		: { value: 0.0 },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dWaterLevel_vUv;
			varying vec4 Shader3dWaterLevel_vPos;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dWaterLevel_vUv = uv;
			Shader3dWaterLevel_vPos = modelMatrix * vec4( position, 1.0 );
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dWaterLevel_vUv;
			varying vec4 Shader3dWaterLevel_vPos;
			
			uniform float uStrength;
			uniform float uLevel;
			uniform float uThickness;
			uniform float uTime;
			
			vec4 Shader3dWaterLevel(vec4 colorFrag, vec2 vUv){
				vec4 colorWave = vec4(1.0, 1.0, 1.0, 1.0);

				vec4 colorNoiseA = texture2D(uNoisePerlin, Shader3dWaterLevel_vPos.xz*0.5 + 0.5*uTime);
				vec4 colorNoiseB = texture2D(uNoisePerlin, Shader3dWaterLevel_vPos.zx*0.5 - 0.5*uTime);
		
				float colorNoiseSum = colorNoiseA.r * colorNoiseB.r;			
				
				float range = uThickness + uThickness*colorNoiseSum;
				float lower = step(uLevel - range, Shader3dWaterLevel_vPos.y);
				float upper = step(Shader3dWaterLevel_vPos.y, uLevel + range);
				float n = lower * upper;

				colorFrag.rgb *= (1.0 + 10.0*n*uStrength);
				
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dWaterLevel(gl_FragColor.rgba, Shader3dWaterLevel_vUv);
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
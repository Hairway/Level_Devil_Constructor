import * as IMPION from "#impion";

export default class Shader3dWaterVoronoi extends IMPION.ComponentShader{

	#clock = new IMPION.Timer3d();
	#app;
	
	uNoise;
	uSpeed;
	uSize;
	uAlpha;
	uAngle;
	uStrength;
	
	#uWaveVX;
	#uWaveVY;
		
	//------------------------------------------------------------------------
	
	constructor({
		uNoise,
		uSpeed = 1,
		uSize = 1,
		uAlpha = 0.3,
		uAngle = 0,
		uStrength = 0.15,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dWaterVoronoi", fps, order, orderShader);
		
		this.#app = globalThis.playable;
		
		//-
		
		this.uNoise = uNoise;	
		this.uAlpha = uAlpha;
		this.uAngle = uAngle;
		this.uSize = uSize;
		this.uStrength = uStrength;
		this.#uWaveVX = uSpeed * Math.cos(uAngle);
		this.#uWaveVY = uSpeed * Math.sin(uAngle);

    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uNoise 			: { value: this.uNoise },
			uSize			: { value: this.uSize },
			uAlpha			: { value: this.uAlpha },
			uWaveVX			: { value: this.#uWaveVX },
			uWaveVY			: { value: this.#uWaveVY },
			uTime			: { value: 0.0 },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dWaterVoronoi_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dWaterVoronoi_vUv = uv;
			//position
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dWaterVoronoi_vUv;
			
			uniform sampler2D uNoise;
			uniform float uSize;
			uniform float uAlpha;
			uniform float uWaveVX;
			uniform float uWaveVY;
			uniform float uTime;
			
			float Shader3dWaterVoronoiRandom(vec2 st) {
				return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
			}
	
			float Shader3dWaterVoronoiNoise(vec2 st) {
				vec2 i_st = floor(st);
				vec2 f_st = fract(st);
				float min_dist = 1.0;
	
				for (int y = -1; y <= 1; y++) {
					for (int x = -1; x <= 1; x++) {
						vec2 neighbor = vec2(float(x), float(y));
						vec2 point = vec2(Shader3dWaterVoronoiRandom(i_st + neighbor), Shader3dWaterVoronoiRandom(i_st + neighbor + vec2(0.5, 0.5)));
						
						point += 0.2 * vec2(sin(uTime*2.0 + (i_st.x + neighbor.x) * 1.5), cos(uTime*2.0 + (i_st.y + neighbor.y) * 1.5));
         
						vec2 diff = neighbor + point - f_st;
						 
						float dist = length(diff);
						
						min_dist = min(min_dist, dist);
					}
				}
				return min_dist;
			}
			
			vec4 Shader3dWaterVoronoi(vec4 colorFrag, vec2 vUv){
				float size = 20.0/uSize;
				
				vec4 colorPerlinA = texture2D(uNoise, vUv.xy * size * 0.2 + 0.1*uTime);
				vec4 colorPerlinB = texture2D(uNoise, vUv.yx * size * 0.2 - 0.1*uTime);
				float colorPerlinC = 2.0*(colorPerlinA.r + colorPerlinB.r);

				float colorNoiseA = Shader3dWaterVoronoiNoise(vec2(vUv.x * size + uWaveVX * uTime, vUv.y * size + uWaveVY * uTime));

				colorNoiseA = smoothstep(0.2, 0.8, colorNoiseA*colorPerlinC);
				//colorNoiseA += smoothstep(0.7, 1.2, colorNoiseA);

				colorFrag.rgb *= (0.8 + uAlpha * colorNoiseA);	
						
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dWaterVoronoi(gl_FragColor.rgba, Shader3dWaterVoronoi_vUv);
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
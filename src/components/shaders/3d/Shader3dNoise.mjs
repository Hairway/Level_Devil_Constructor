import * as IMPION from "#impion";

export default class Shader3dNoise extends IMPION.ComponentShader{

	uIntensity;
	
	//------------------------------------------------------------------------
	
	constructor({
		uIntensity = 1,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dNoise", fps, order, orderShader);
		
		//-
		
		this.uIntensity = uIntensity;
		
   	 }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uIntensity : { value: this.uIntensity }
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dNoise_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dNoise_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dNoise_vUv;
			uniform float uIntensity;
			
			vec4 Shader3dNoise(vec4 colorFrag, vec2 vUv){
				float noise = (fract(sin(dot(vUv, vec2(12.9898,78.233)*2.0)) * 43758.5453));

				colorFrag.rgb = colorFrag.rgb - noise * uIntensity * 0.1;
								
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dNoise(gl_FragColor.rgba, Shader3dNoise_vUv);
		`;
	}
	
}
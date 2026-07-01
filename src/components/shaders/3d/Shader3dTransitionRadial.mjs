import * as IMPION from "#impion";

export default class Shader3dTransitionRadial extends IMPION.ComponentShader{

	uRadius;
	uColor;
	uResolution;

	//------------------------------------------------------------------------
	
	constructor({
		uRadius = 1,
		uColor = new IMPION.Color3d(0x000000),
		uResolution,

		fps = 40,
		order = "",
		orderShader = 0
	}){
		super("Shader3dTransitionRadial", fps, order, orderShader);
		
		//-
		
		this.uRadius = uRadius;
		this.uColor = uColor;
		this.uResolution = uResolution;
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uRadius			: { value: this.uRadius },
			uColor			: { value: this.uColor },
			uResolution		: { value: this.uResolution },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 ShaderTransitionRadial_vScreenPos;
			uniform vec2 uResolution;
		`;
	}
	
	vertexShaderBody(){
		return `
			vec4 localPosition = vec4( position, 1.0);
			vec4 worldPosition = modelMatrix * localPosition;
			vec4 viewPosition = viewMatrix * worldPosition;
			vec4 projectedPosition = projectionMatrix * viewPosition;

			ShaderTransitionRadial_vScreenPos = projectedPosition.xy;			
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 ShaderTransitionRadial_vScreenPos;
			
			uniform vec2 uResolution;
			uniform vec3 uColor;
			uniform float uRadius;
			
			vec4 ShaderTransitionRadial(vec4 colorFrag){
				vec2 center = vec2(0.0, 0.0);
				float aspect = uResolution.y / uResolution.x;
				
				vec2 screenPos = vec2(ShaderTransitionRadial_vScreenPos.x, ShaderTransitionRadial_vScreenPos.y * aspect);
				
				float distanceFromCenter = distance(screenPos, center);
			
				if(distanceFromCenter > uRadius){
					colorFrag.a = 0.0;
				}
				
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = ShaderTransitionRadial(gl_FragColor.rgba);
		`;
	}
	
}
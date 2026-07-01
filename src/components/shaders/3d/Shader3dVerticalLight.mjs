import * as IMPION from "#impion";

export default class Shader3dVerticalLight extends IMPION.ComponentShader{
	
	uIntensity;
	uDownY;
	uUpY;
	
	//------------------------------------------------------------------------
	
	constructor({
		uIntensity = 0.1,
		uDownY = -2.5,
		uUpY = 0,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dVerticalLight", fps, order, orderShader);
		
		//-
		
		this.uIntensity = uIntensity;
		this.uDownY = uDownY;		
		this.uUpY = uUpY;
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uIntensity 	: { value: this.uIntensity },
			uDownY		: { value: this.uDownY },
			uUpY		: { value: this.uUpY }
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec4 Shader3dVerticalLight_vPos;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dVerticalLight_vPos = modelMatrix * vec4( position, 1.0 );
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec4 Shader3dVerticalLight_vPos;
			
			uniform float uIntensity;
			uniform float uDownY;
			uniform float uUpY;
			
			vec4 Shader3dVerticalLight(vec4 colorFrag){
				float m = smoothstep(uUpY, uDownY, Shader3dVerticalLight_vPos.y);
				vec3 colorOverlay = vec3(2.0, 1.7, 1.7);
				colorFrag.rgb = mix(colorFrag.rgb*0.95, colorFrag.rgb * colorOverlay * (1.0 + uIntensity), m);
								
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dVerticalLight(gl_FragColor.rgba);
		`;
	}
	
}
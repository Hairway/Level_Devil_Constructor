import * as IMPION from "#impion";

export default class Shader3dBrightness extends IMPION.ComponentShader{

	uBrightness;
	
	//------------------------------------------------------------------------
	
	constructor({
		uBrightness = 1,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dBrightness", fps, order, orderShader);
		
		//-

		this.uBrightness = uBrightness;	
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uBrightness	: { value: this.uBrightness }
		}
	}
	
	fragmentShaderHead(){
		return `
			uniform float uBrightness;
			
			vec4 Shader3dBrightness(vec4 colorFrag){
				colorFrag.rgb *= uBrightness;
								
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dBrightness(gl_FragColor.rgba);
		`;
	}
	
}
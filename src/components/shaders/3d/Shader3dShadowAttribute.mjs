import * as IMPION from "#impion";

export default class Shader3dShadowAttribute extends IMPION.ComponentShader{

	#app;
	
	uStrength;
	
	//------------------------------------------------------------------------
	
	constructor({
		app,
		uStrength = 1,
	}){
		super("Shader3dShadowAttribute");	

		this.#app = app;
		
		//-
		
		this.uStrength = uStrength;				
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uStrength	: { value: this.uStrength },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec3 colorAttr;
		`;
	}
	
	vertexShaderBody(){
		return `
			colorAttr = color;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec3 colorAttr;
			uniform float uStrength;	
			
			vec4 Shader3dShadowAttribute(vec4 colorFrag){
				colorFrag.rgb *= (1.0 - uStrength * colorAttr.b);
								
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dShadowAttribute(gl_FragColor.rgba);
		`;
	}
	
}
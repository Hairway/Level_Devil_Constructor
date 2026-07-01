import * as IMPION from "#impion";

export default class Shader3dVerticalFog extends IMPION.ComponentShader{

	uColor;
	uY0;
	uY1;
	
	//------------------------------------------------------------------------
	
	constructor({
		uColor = new IMPION.Color3d(0xffffff),
		uY0 = -2.5,
		uY1 = 0,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dVerticalFog", fps, order, orderShader);
		
		//-
		
		this.uColor = uColor;
		this.uY0 = uY0;		
		this.uY1 = uY1;
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uColor 		: { value: this.uColor },
			uY0		: { value: this.uY0 },
			uY1		: { value: this.uY1 }
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec4 Shader3dVerticalFog_vPos;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dVerticalFog_vPos = modelMatrix * vec4( position, 1.0 );
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec4 Shader3dVerticalFog_vPos;
			
			uniform vec3 uColor;
			uniform float uY0;
			uniform float uY1;
			
			vec4 Shader3dVerticalFog(vec4 colorFrag){
				float m = smoothstep(uY1, uY0, Shader3dVerticalFog_vPos.y);
				colorFrag.rgb = mix(colorFrag.rgb, uColor.rgb, m);
								
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dVerticalFog(gl_FragColor.rgba);
		`;
	}
	
}
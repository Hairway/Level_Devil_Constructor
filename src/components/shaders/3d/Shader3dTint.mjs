import * as IMPION from "#impion";

export default class Shader3dTint extends IMPION.ComponentShader{

	uColor;
	uTint;
	uOverlay;
	uBrightness;
	
	//------------------------------------------------------------------------
	
	constructor({
		uColor = new IMPION.Color3d(0xff0000),
		uOverlay = 0,
		uTint = 1,
		uBrightness = 1,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dTint", fps, order, orderShader);
		
		//-
		
		this.uColor = uColor;
		this.uOverlay = uOverlay;
		this.uTint = uTint;	
		this.uBrightness = uBrightness;	
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uColor 			: { value: this.uColor },
			uTint			: { value: this.uTint },
			uBrightness		: { value: this.uBrightness }
		}
	}
	
	fragmentShaderHead(){
		return `
			uniform vec3 uColor;
			uniform float uTint;
			uniform float uOverlay;
			uniform float uBrightness;
			
			vec4 Shader3dTint(vec4 colorFrag){
				float colorPixel = (colorFrag.r + colorFrag.g + colorFrag.b) / 3.0;
				vec3 colorTint = vec3(colorPixel, colorPixel, colorPixel) * 2.0;
				
				colorFrag.rgb = mix(colorFrag.rgb, colorTint.rgb * uColor.rgb, uOverlay);
				colorFrag.rgb = mix(colorFrag.rgb, uColor.rgb, uTint);
				colorFrag.rgb *= uBrightness;
				
				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dTint(gl_FragColor.rgba);
		`;
	}
	
}
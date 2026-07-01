import * as IMPION from "#impion";

export default class Shader2dSharpen extends IMPION.ComponentEmpty{

	#app;
	
	filter;	
	uniforms;
	
	//------------------------------------------------------------------------
	
	constructor({
		uStrength = 0.3,
			
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super();
		
		this.#app = globalThis.playable;	

		this.uniforms = {
			uStrength : {value: uStrength},
		};	

		this.filter = new IMPION.Filter2d(this.vertexShader(), this.fragmentShader(), this.uniformsShader(this.uniforms));
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader( uniforms ){
		let uniformsProcess = {};
		for (let key in uniforms) {
			uniformsProcess[key] = uniforms[key].value;
		}
		return uniformsProcess;
	}
	
	vertexShader(){
		return null;
	}

	fragmentShader(){
		return `
			precision mediump float;
			//precision highp float;
						
			varying vec2 vTextureCoord;			
			uniform sampler2D uSampler;
			
			uniform float uStrength;

			void main(void){
			//	vec2 texCoord = vTextureCoord;
			//	vec4 color = texture2D(uSampler, texCoord);
			//
			//	vec4 north = texture2D(uSampler, texCoord + vec2(0.0, -1.0) * uStrength * 0.4);
			//	vec4 south = texture2D(uSampler, texCoord + vec2(0.0, 1.0) * uStrength * 0.4);
			//	vec4 east = texture2D(uSampler, texCoord + vec2(1.0, 0.0) * uStrength * 0.4);
			//	vec4 west = texture2D(uSampler, texCoord + vec2(-1.0, 0.0) * uStrength * 0.4);
			//
			//	vec3 sharpened = color.rgb * 5.0 - (north.rgb + south.rgb + east.rgb + west.rgb);
			//
			//	gl_FragColor = vec4(sharpened.rgb, color.a);
				
				vec4 inputColor = texture2D(uSampler, vTextureCoord);
				
				float kernel[9];
				kernel[0] = -1.0; kernel[1] = -1.0; kernel[2] = -1.0;
				kernel[3] = -1.0; kernel[4] =  9.0; kernel[5] = -1.0;
				kernel[6] = -1.0; kernel[7] = -1.0; kernel[8] = -1.0;

				vec3 colorSharpen = vec3(0.0);
				
				vec2 texel = vec2(0.002, 0.002);
				
				vec2 offsets[9];
				offsets[0] = texel * vec2(-1.0, -1.0);
				offsets[1] = texel * vec2( 0.0, -1.0);
				offsets[2] = texel * vec2( 1.0, -1.0);
				offsets[3] = texel * vec2(-1.0,  0.0);
				offsets[4] = texel * vec2( 0.0,  0.0);
				offsets[5] = texel * vec2( 1.0,  0.0);
				offsets[6] = texel * vec2(-1.0,  1.0);
				offsets[7] = texel * vec2( 0.0,  1.0);
				offsets[8] = texel * vec2( 1.0,  1.0);

				for(int i = 0; i < 9; i++) {
					colorSharpen += texture2D(uSampler, vTextureCoord + offsets[i]).rgb * kernel[i];
				}

				colorSharpen.rgb *= inputColor.a;

				gl_FragColor = vec4(mix(inputColor.rgb, colorSharpen, uStrength), inputColor.a);
			}
		`;
	}
	
	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
	
	//resize = (width, height)=>{
	//	
    //}
}
import * as IMPION from "#impion";

export default class Shader3dStochastics extends IMPION.ComponentShader{

	uMethod;	
	uTexture_0;
	uTexture_1;
	uTextureMask;
	uRepeatUV;
	uRepeatTile;
	uBrightness;
	uMix = 0;
	
	//------------------------------------------------------------------------
	
	constructor({
		uMethod = 0,
		uBrightness = 1.0,
		uTexture_0 = null,
		uTexture_1 = null,
		uTextureMask = null,
		uRepeatUV = 15,
		uRepeatTile = 15,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dStochastics", fps, order, orderShader);
		
		//-
		
		this.uMethod = uMethod;		
		this.uBrightness = uBrightness;
		this.uTexture_0 = uTexture_0;
		this.uTexture_1 = uTexture_1;		
		this.uTextureMask = uTextureMask;
		this.uRepeatUV = uRepeatUV;
		this.uRepeatTile = uRepeatTile;
		
		if(this.uTexture_1){
			this.uMix = 1;
		}
		
		let phoneData = globalThis.playable.getPhoneData();
		if(phoneData.type == "android" && phoneData.version < 12){
			this.uMethod = 2;
		}
    }

	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uMethod 		: { value: this.uMethod },
			uMix 			: { value: this.uMix },
			uBrightness		: { value: this.uBrightness },
			uTexture_0 		: { value: this.uTexture_0 },
			uTexture_1		: { value: this.uTexture_1 },
			uTextureMask	: { value: this.uTextureMask },
			uRepeatUV		: { value: this.uRepeatUV },
			uRepeatTile		: { value: this.uRepeatTile },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dStochastics_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dStochastics_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec2 Shader3dStochastics_vUv;
			
			uniform float uMethod;
			uniform float uMix;
			uniform float uBrightness;
			uniform sampler2D uTexture_0;
			uniform sampler2D uTexture_1;
			uniform sampler2D uTextureMask;
			uniform float uRepeatUV;
			uniform float uRepeatTile;
			
			vec2 uvHash(vec2 s){
				float a = dot(s, vec2(127.1, 311.7));
				float b = dot(s, vec2(269.5, 183.3));
				vec2 hash;
				hash.x = fract(sin(a * 3.14159) * 43758.5453);
				hash.y = fract(sin(b * 3.14159) * 43758.5453);
				return hash;
			}
			
			vec2 uvRotation(vec2 p_input, float p_theta){
				float cosTheta = cos(p_theta);
				float sinTheta = sin(p_theta);
				vec2 rotated;
				rotated.x = cosTheta * p_input.x - sinTheta * p_input.y;
				rotated.y = sinTheta * p_input.x + cosTheta * p_input.y;
				return rotated;
			}
			
			int mod3( int n ){
				int div = n / 3;
				int mod = n - (div * 3);
				if (n < 0) {
					if (mod != 0){ mod += 3; }
				}			
				return mod;
			}

			ivec2 getHexagonID( in vec2 p ){
				vec2 q = vec2( p.x, p.x*0.5+p.y*0.8660254037 );

				ivec2 i = ivec2(floor(q));
				vec2 f = fract(q);
				
				int v = mod3(i.x + i.y);
				ivec2 id = i + v;
				if( v==2 ){ id -= (f.x>f.y)?ivec2(1,2):ivec2(2,1); }
				
				return ivec2( id.x, (2*id.y - id.x)/3 );
			}

			vec4 Shader3dStochasticsHex(sampler2D TEXTURE, vec2 UV, float REPEAT_UV, float REPEAT_TILE){	
				vec2 UVR_1 = UV*REPEAT_TILE;	
				UVR_1.x += UVR_1.y * 0.25;
				UVR_1.y -= UVR_1.x * 0.25;
				UVR_1.x += 4.8;
				UVR_1.y += 2.8;
				
				ivec2 hId_0 = getHexagonID(UV*REPEAT_TILE);
				vec3 colorNoise_0 = vec3(0.3+0.2*sin(float(15*hId_0.x)+cos(float(33*hId_0.y))));
				
				ivec2 hId_1 = getHexagonID(UVR_1);
				vec3 colorNoise_1 = vec3(0.3+0.2*sin(float(15*hId_1.x)+cos(float(33*hId_1.y))));
				
				vec4 colorStochasticA = texture2D(TEXTURE, REPEAT_UV * uvRotation(UV, 7.0*colorNoise_0.r));
				vec4 colorStochasticB = texture2D(TEXTURE, REPEAT_UV * uvRotation(UV, 7.0*colorNoise_1.r));
				
				vec4 colorStochastic = 3.0*pow(mix(colorStochasticA, colorStochasticB, 0.5), vec4(2.0, 2.0, 2.0, 1.0));
				
				return colorStochastic;
			}
			
			vec4 Shader3dStochasticsRect(sampler2D TEXTURE, vec2 cUV, float REPEAT_UV, float REPEAT_TILE){
				
				vec2 UVS_0 = cUV*REPEAT_TILE;						
				
				vec2 UVS_1 = (cUV)*REPEAT_TILE;						
				UVS_1.x += UVS_1.y * 0.2;
				UVS_1.y -= UVS_1.x * 0.5;
				
				vec2 UVS_2 = (cUV)*REPEAT_TILE;						
				UVS_2.x += UVS_2.y * 0.8;
				UVS_2.y -= UVS_2.x * 0.8;
				UVS_2.x += 4.8;
				UVS_2.y += 2.8;
				
				float numNoise_0 = uvHash(floor(UVS_0)).r;
				float numNoise_1 = uvHash(floor(UVS_1)).r;
				float numNoise_2 = uvHash(floor(UVS_2)).r;
						
				vec4 colorStochasticA = texture2D(TEXTURE, REPEAT_UV * uvRotation(cUV, 7.0*numNoise_0));
				vec4 colorStochasticB = texture2D(TEXTURE, REPEAT_UV * uvRotation(cUV, 7.0*numNoise_1));
				vec4 colorStochasticC = texture2D(TEXTURE, REPEAT_UV * uvRotation(cUV, 7.0*numNoise_2));
				
				vec4 colorStochastic = 3.0*pow(mix(colorStochasticA, colorStochasticB, 0.5), vec4(2.0, 2.0, 2.0, 1.0));
				colorStochastic = mix(colorStochastic, colorStochasticC, 0.5);
				
				return colorStochastic;
				
			}
						
			vec4 Shader3dStochastics(vec4 colorFrag, vec2 vUv){
				vec4 colorA;
				vec4 colorB;
				vec3 colorResult;
				vec4 colorBMask;

				if (uMethod == 2.0) {
					colorA = texture2D(uTexture_0, vUv * uRepeatUV);
					if (uMix == 1.0) {
						colorB = texture2D(uTexture_1, vUv * uRepeatUV);
					}
				} else if (uMethod == 0.0) {
					colorA = Shader3dStochasticsRect(uTexture_0, vUv, uRepeatUV, uRepeatTile);
					if (uMix == 1.0) {
						colorB = Shader3dStochasticsRect(uTexture_1, vUv, uRepeatUV, uRepeatTile);
					}
				} else {
					colorA = Shader3dStochasticsHex(uTexture_0, vUv, uRepeatUV, uRepeatTile);
					if (uMix == 1.0) {
						colorB = Shader3dStochasticsHex(uTexture_1, vUv, uRepeatUV, uRepeatTile);
					}
				}
				
				if (uMix == 1.0) {
					colorBMask = texture2D(uTextureMask, vUv);
					colorResult.rgb = mix(colorA.rgb, colorB.rgb, colorBMask.r);
				} else {
					colorResult.rgb = colorA.rgb;
				}

				colorFrag.rgb *= colorResult.rgb * uBrightness;
				
				return colorFrag;
			}
			
			
		`;
	}
	
	fragmentShaderBody(){
		return `
			gl_FragColor.rgba = Shader3dStochastics(gl_FragColor.rgba, Shader3dStochastics_vUv);
		`;
	}

	
}
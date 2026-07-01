import * as IMPION from "#impion";

export default class Shader3dMixer extends IMPION.ComponentShader{
	
	#uTextures;
	#uMasks;
	#uRepeats;
	
	//------------------------------------------------------------------------
	
	constructor({
		uTextures 	= [],
		uMasks 		= [],
		uRepeats 	= [],
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super("Shader3dMixer", fps, order, orderShader);
		
		this.#uTextures = uTextures;
		this.#uMasks = uMasks;
		this.#uRepeats = uRepeats;
		
		//-

		for(let i=0; i<uTextures.length; i++){
			this["uTexture_"+i] = uTextures[i];
			
			if(!uRepeats[i]){
				this["uRepeat_"+i] = 1;
			}else{
				this["uRepeat_"+i] = uRepeats[i];
			}
		}

		for(let i=0; i<uMasks.length; i++){
			this["uMask_"+i] = uMasks[i];
		}
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		let uniform = {};
		
		for(let i=0; i<this.#uTextures.length; i++){
			uniform["uTexture_"+i] = {value: this["uTexture_"+i]};
			uniform["uRepeat_"+i] = {value: this["uRepeat_"+i]};
		}

		for(let i=0; i<this.#uMasks.length; i++){
			uniform["uMask_"+i] = {value: this["uMask_"+i]};
		}
		
		return uniform;
	}
	
	vertexShaderHead(){
		return `
			varying vec2 Shader3dMixer_vUv;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dMixer_vUv = uv;
		`;
	}
	
	fragmentShaderHead(){
		let strUniforms = "";
		let strCode = "";
		
		strCode += "vec4 colorCurrent = texture2D(uTexture_0, vUv * uRepeat_0);\n";
		strCode += "vec4 colorAdd;\n";
		strCode += "vec4 colorMask;\n";
		
		for(let i=0; i<this.#uTextures.length; i++){
			strUniforms += "uniform sampler2D uTexture_"+i+";\n";
			
			if(i > 0){
				strCode += "colorAdd = texture2D(uTexture_"+(i)+", vUv * uRepeat_"+(i)+");\n";
				strCode += "colorMask = texture2D(uMask_"+(i-1)+", vUv);\n";
				strCode += "colorCurrent.rgb = mix(colorCurrent.rgb, colorAdd.rgb, colorMask.r);\n";
			}
		}
		for(let i=0; i<this.#uMasks.length; i++){
			strUniforms += "uniform sampler2D uMask_"+i+";\n";
		}
		for(let i=0; i<this.#uTextures.length; i++){
			strUniforms += "uniform float uRepeat_"+i+";\n";
		}
		
		return `
			varying vec2 Shader3dMixer_vUv;
			
			` + strUniforms + `		
				
			vec4 Shader3dMixer(vec4 colorFrag, vec2 vUv){

				`+strCode+`
				
				colorFrag.rgb *= colorCurrent.rgb;
				
				return colorFrag.rgba;
			}			
		`;
	}
	
	fragmentShaderBody(){
		return `
			gl_FragColor.rgba = Shader3dMixer(gl_FragColor.rgba, Shader3dMixer_vUv);
		`;
	}

	
}
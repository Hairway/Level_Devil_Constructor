import * as IMPION from "#impion";

export default class Shader3dMetal extends IMPION.ComponentShader{
	
	uMap;

	//------------------------------------------------------------------------
	
	constructor({
		fps = 45,
		order = "",
		orderShader = 0
	}){
		super("Shader3dMetal", fps, order, orderShader);
		
    }
	
	//------------------------------------------------------------------------
	
	uniformsShader(){
		return {
			uMap	: { value: this.uMap },
		}
	}
	
	vertexShaderHead(){
		return `
			varying vec4 Shader3dMetal_vPos;
			varying vec2 Shader3dMetal_vUv;			
			varying vec3 Shader3dMetal_nor;
   			varying vec3 Shader3dMetal_loc;
		`;
	}
	
	vertexShaderBody(){
		return `
			Shader3dMetal_vPos = modelMatrix * vec4( position, 1.0 );
			Shader3dMetal_vUv = uv;
			Shader3dMetal_nor = normalize(normalMatrix * normal);
			Shader3dMetal_loc = -(modelViewMatrix * vec4(position, 1.0)).xyz;
		`;
	}
	
	fragmentShaderHead(){
		return `
			varying vec4 Shader3dMetal_vPos;
			varying vec2 Shader3dMetal_vUv;
			varying vec3 Shader3dMetal_nor;
   			varying vec3 Shader3dMetal_loc;
			
			vec4 Shader3dMetal(vec4 colorFrag, vec2 vUv){
				
				vec4 colorNoiseA = texture2D(uNoisePerlin, vUv);
				
				vec2 uvB = vec2(0.0, 0.0);				
				uvB.x = +0.05*Shader3dMetal_vPos.x + 0.02*Shader3dMetal_vPos.y + 0.1*colorNoiseA.r;
				uvB.y = -0.05*Shader3dMetal_vPos.z + 0.02*Shader3dMetal_vPos.y - 0.1*colorNoiseA.r;
								
				vec4 colorNoiseB = texture2D(uNoisePerlin, uvB);
				
				colorFrag.rgb *= (1.0 + (0.25 - 0.50*colorNoiseB.rgb));
				
				//-
				
				vec3 normal = normalize(Shader3dMetal_nor);
			 	vec3 viewDir = normalize(Shader3dMetal_loc);
				float rim = 1.0 - max(0.0, dot(normal, viewDir));
				rim = smoothstep(0.6, 0.8, rim);
				
				colorFrag.rgb *= (0.5 + 0.8 * rim);

				return colorFrag.rgba;
			}
		`;
	}
	
	fragmentShaderBody(){
		return `			
			gl_FragColor.rgba = Shader3dMetal(gl_FragColor.rgba, Shader3dMetal_vUv);
		`;
	}
	
}
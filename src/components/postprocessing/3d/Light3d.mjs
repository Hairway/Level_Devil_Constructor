import {Effect} from "postprocessing";
import * as THREE from "three";

export default class Light3d extends Effect {

	#scene;
	#camera;

	constructor(
		scene,
		camera,
	{
		uScreen,
	}) {

		super(
			'Light3d',
			`
				uniform sampler2D uScreen;
				uniform vec2 resolution;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					
					outputColor = inputColor;
					
					//- sharp
					
					vec2 texel = vec2(1.0 / resolution.x, 1.0 / resolution.y);
					
					float kernel[9];
					kernel[0] = -1.0; kernel[1] = -1.0; kernel[2] = -1.0;
					kernel[3] = -1.0; kernel[4] =  9.0; kernel[5] = -1.0;
					kernel[6] = -1.0; kernel[7] = -1.0; kernel[8] = -1.0;
				
					vec3 colorSharpen = vec3(0.0);
				
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
						colorSharpen += texture2D(inputBuffer, uv + offsets[i]).rgb * kernel[i];
					}
				
					outputColor = vec4(mix(outputColor.rgb, colorSharpen, 0.03), 1.0);
					
					//- overlay
					
					vec4 screenColor = texture2D(uScreen, uv);
					
					vec3 result;

					for(int i = 0; i < 3; i++){
						if(outputColor[i] < 0.5)
							result[i] = 2.0 * outputColor[i] * screenColor[i];
						else
							result[i] = 1.0 - 2.0 * (1.0 - outputColor[i]) * (1.0 - screenColor[i]);
					}
					outputColor.rgb = mix(outputColor.rgb, result.rgb, 0.25); 
				
					//- contrast
					
					outputColor.rgb *= (0.9 + 0.2*outputColor.rgb);
					
					//- colorize
					
				//	vec3 warmColor = outputColor.rgb + vec3(-0.03, 0.0, 0.05);
				//	outputColor.rgb = clamp(warmColor, 0.0, 1.0);
					
					//- noise
					
					float noise = (fract(sin(dot(vUv, vec2(12.9898,78.233)*2.0)) * 43758.5453));
					outputColor.rgb -= noise * 0.015;
					
				}
			`,
			{
				uniforms: new Map([
					['uScreen', new THREE.Uniform( new THREE.Texture() )],
					['resolution', new THREE.Uniform( new THREE.Vector2(1, 1) )],
				])
			}
		);
		
		//-
		
		this.#scene = scene;
		this.#camera = camera;				
	}

	update(renderer, inputBuffer, deltaTime) {
		if(window.innerWidth != 0 && window.innerHeight != 0){
			this.uniforms.get('resolution').value.x = window.innerWidth;
			this.uniforms.get('resolution').value.y = window.innerHeight;
		}
	}
}

import {Effect} from "postprocessing";
import * as THREE from "three";

export default class Sharpen3d extends Effect {

	constructor({
		uStrength = 0.1,
	}) {

		super(
			'Sharpen3d',
			`
				uniform float uStrength;
				uniform vec2 resolution;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
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

					outputColor = vec4(mix(inputColor.rgb, colorSharpen, uStrength), 1.0);
				}
			`,
			{
				uniforms: new Map([
					['uStrength', new THREE.Uniform( uStrength )],
					['resolution', new THREE.Uniform( new THREE.Vector2(1, 1) )],
				])
			}
		);
	
	}

	update(renderer, inputBuffer, deltaTime) {
		if(window.innerWidth != 0 && window.innerHeight != 0){
			this.uniforms.get('resolution').value.x = window.innerWidth;
			this.uniforms.get('resolution').value.y = window.innerHeight;
		}
	}
}

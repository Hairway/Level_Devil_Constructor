import {Effect} from "postprocessing";
import * as THREE from "three";

export default class BlurRadial3d extends Effect {
	
	constructor({
		uStrength = 0,
		uRadius = 0,
	}) {
		super(
			'BlurRadial3d',
			`
				uniform float uStrength;
				uniform float uRadius;
				uniform vec2 resolution;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					vec2 center = vec2(0.5, 0.5);
					vec2 dir =  uv - center;
					dir.x *= (resolution.x / resolution.y);
					float distance =  length(dir) * 1.0;
					float blurR = smoothstep(0.0, uRadius, distance);
					float blur = distance * uStrength * blurR * 0.01;
					
					vec4 color = vec4(0.0);
					float total = 0.0;

					for (float x = -4.0; x <= 4.0; x++) {
						for (float y = -4.0; y <= 4.0; y++) {
							vec2 offset = vec2(x, y) * blur;
							color += texture2D(inputBuffer, vUv + offset);
							total += 1.0;
						}
					}

					outputColor = color / total;

				}
			`,
			{
				uniforms: new Map([
					['uStrength', new THREE.Uniform(uStrength)],
					['uRadius', new THREE.Uniform(uRadius)],
					['resolution', new THREE.Uniform( new THREE.Vector2() )]
				])
			}
		);
	}

	update(renderer, inputBuffer, deltaTime) {
		if(window.innerWidth > 0 && window.innerHeight > 0){
			this.uniforms.get('resolution').value.x = window.innerWidth;
			this.uniforms.get('resolution').value.y = window.innerHeight;
		}
	}
}

import {Effect} from "postprocessing";
import * as IMPION from "#impion";

export default class BloomSimple3d extends Effect {

	#scene;
	#camera;

	constructor(
		scene,
		camera,
	{
		uStrength = 0.6,
		uBlur = 1,
	}) {

		super(
			'BloomSimple3d',
			`
				uniform float uStrength;
				uniform float uBlur;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					vec4 colorBloom = vec4(0.0, 0.0, 0.0,1.0);
					vec4 colorBlur = vec4(0.0, 0.0, 0.0, 0.0);
					float total = 0.0;

					for (float x = -5.0; x <= 5.0; x++) {
						for (float y = -5.0; y <= 5.0; y++) {
							vec2 offset = vec2(x, y);
							offset.x *= (uBlur * 0.0030);
							offset.y *= (uBlur * 0.0020);
							colorBlur += texture2D(inputBuffer, vUv + offset);
							total += 1.0;
						}
					}
					
					colorBloom = colorBlur / total;
					
					float colorPixelBloom = (colorBloom.r + colorBloom.g + colorBloom.b) / 3.0;
					
					colorPixelBloom = smoothstep(0.10, 0.60, pow(colorPixelBloom, 1.3));
					
					colorBloom.r = colorBloom.g = colorBloom.b = colorPixelBloom;
					
					outputColor = inputColor + uStrength * colorBloom;
					//outputColor = colorBloom;
				}
			`,
			{
				uniforms: new Map([
					['uStrength', new IMPION.Uniform3d( uStrength )],
					['uBlur', new IMPION.Uniform3d( uBlur )],
				])
			}
		);
		
		//-
		
		this.#scene = scene;
		this.#camera = camera;
				
	}

	//update(renderer, inputBuffer, deltaTime) {
	//
	//}
}

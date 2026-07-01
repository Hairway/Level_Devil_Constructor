import {Effect} from "postprocessing";
import {Uniform} from "three";

export default class BlurSimple3d extends Effect {
	
	constructor({
		uStrength = 0,
	}) {
		super(
			'BlurSimple3d',
			`
				uniform float uStrength;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
					float total = 0.0;

					for (float x = -3.0; x <= 3.0; x++) {
						for (float y = -3.0; y <= 3.0; y++) {
							vec2 offset = vec2(x, y) * uStrength * 0.001;
							color += texture2D(inputBuffer, uv + offset);
							total += 1.0;
						}
					}

					outputColor = color / total;

				}
			`,
			{
				uniforms: new Map([
					['uStrength', new Uniform(uStrength)]
				])
			}
		);
	}

	//update(renderer, inputBuffer, deltaTime) {
	//	
	//}
}

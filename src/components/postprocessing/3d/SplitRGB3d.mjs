import {Effect} from "postprocessing";
import {Uniform} from "three";

export default class SplitRGB3d extends Effect {
	
	constructor({
		uStrength = 0,
	}) {
		super(
			'SplitRGB3d',
			`
				uniform float uStrength;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {

					vec4 color;
					
					color.r = texture2D(inputBuffer, vec2(vUv.x + uStrength*0.01, vUv.y)).r;
					color.g = texture2D(inputBuffer, vUv).g;
					color.b = texture2D(inputBuffer, vec2(vUv.x - uStrength*0.01, vUv.y)).b;
					color.a = 1.0;
				
					outputColor = color;

				}
			`,
			{
				uniforms: new Map([
					['uStrength', new Uniform(uStrength)],
				])
			}
		);
	}

	//update(renderer, inputBuffer, deltaTime) {
	//	
	//}
}

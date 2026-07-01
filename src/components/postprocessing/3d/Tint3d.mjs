import {Effect} from "postprocessing";
import {Uniform, Color} from "three";

export default class Tint3d extends Effect {
	
	constructor({
		uColor = 0xffffff,
		uTint = 0,
		uBrightness = 1,
	}) {
		super(
			'Tint3d',
			`
				uniform vec3 uColor;
				uniform float uTint;
				uniform float uBrightness;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					vec4 color = inputColor;

					float colorPixel = (color.r + color.g + color.b) / 3.0;
					vec3 colorTint = vec3(colorPixel, colorPixel, colorPixel) * 2.0 * uBrightness;
					
					outputColor = vec4(mix(color.rgb, (colorTint.rgb * uColor.rgb), uTint), color.a);

				}
			`,
			{
				uniforms: new Map([
					['uColor', new Uniform(new Color(uColor))],
					['uBrightness', new Uniform(uBrightness)],
					['uTint', new Uniform(uTint)]
				])
			}
		);
	}

	//update(renderer, inputBuffer, deltaTime) {
	//	
	//}
}

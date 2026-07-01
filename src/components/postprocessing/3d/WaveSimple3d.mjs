import {Effect} from "postprocessing";
import {Uniform} from "three";

export default class WaveSimple3d extends Effect {
	
	constructor({
		uStrength = 0,
		uSpeed = 1,
	}) {
		super(
			'WaveSimple3d',
			`
				uniform float uTime;
				uniform float uSpeed;
				uniform float uStrength;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					vec2 vUv = uv;
					vUv.x += sin(vUv.y * 20.0 + uTime) * uStrength * 0.05;
					outputColor = texture2D(inputBuffer, vUv);
				}
			`,
			{
				uniforms: new Map([
					['uStrength', new Uniform(uStrength)],
					['uSpeed', new Uniform(uSpeed)],
					['uTime', new Uniform(0.0)],
				])
			}
		);
	}

	update(renderer, inputBuffer, deltaTime) {
		this.uniforms.get('uTime').value += deltaTime * this.uniforms.get('uSpeed').value;
	}
}

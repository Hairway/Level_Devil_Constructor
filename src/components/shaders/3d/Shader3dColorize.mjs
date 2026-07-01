import * as IMPION from "#impion";

export default class Shader3dColorize extends IMPION.ComponentShader {

	uHue;
	uSaturation;
	uBrightness;
	uContrast;
	uTemperature;
	uTint;

	constructor({
		uHue = 0.0,           
		uSaturation = 1.0,   
		uBrightness = 1.0,   
		uContrast = 1.0,     
		uTemperature = 0.0,  
		uTint = 0.0,         
		uNegative = 0.0,

		fps = 60,
		order = "",
		orderShader = 0
	}) {
		super("Shader3dColorize", fps, order, orderShader);

		this.uHue = uHue;
		this.uSaturation = uSaturation;
		this.uBrightness = uBrightness;
		this.uContrast = uContrast;
		this.uTemperature = uTemperature;
		this.uTint = uTint;
		this.uNegative = uNegative;
	}

	uniformsShader() {
		return {
			uHue			: { value: this.uHue },
			uSaturation		: { value: this.uSaturation },
			uBrightness		: { value: this.uBrightness },
			uContrast		: { value: this.uContrast },
			uTemperature	: { value: this.uTemperature },
			uTint			: { value: this.uTint },
			uNegative		: { value: this.uNegative },
		};
	}

	fragmentShaderHead() {
		return `
			uniform float uHue;
			uniform float uSaturation;
			uniform float uBrightness;
			uniform float uContrast;
			uniform float uTemperature;
			uniform float uTint;
			uniform float uNegative;
			
			vec3 Shader3dColorize_rgb2hsv(vec3 c) {
				vec4 K = vec4(0., -1./3., 2./3., -1.);
				vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
				vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

				float d = q.x - min(q.w, q.y);
				float e = 1e-10;
				return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x);
			}

			vec3 Shader3dColorize_hsv2rgb(vec3 c) {
				vec3 p = abs(fract(c.xxx + vec3(0., 2./3., 1./3.)) * 6. - 3.);
				return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y);
			}

			vec3 Shader3dColorize_applyHue(vec3 color, float hue) {
				vec3 hsv = Shader3dColorize_rgb2hsv(color);
				hsv.x += hue;
				return Shader3dColorize_hsv2rgb(hsv);
			}

			vec3 Shader3dColorize_applySaturation(vec3 color, float sat) {
				float gray = dot(color, vec3(0.299, 0.587, 0.114));
				return mix(vec3(gray), color, sat);
			}

			vec3 Shader3dColorize_applyContrast(vec3 color, float contrast) {
				return (color - 0.5) * contrast + 0.5;
			}

			vec3 Shader3dColorize_applyTemperature(vec3 color, float temp) {
				color.r += temp * 0.1;
				color.b -= temp * 0.1;
				return color;
			}

			vec3 Shader3dColorize_applyTint(vec3 color, float tint) {
				color.g += tint * 0.1;
				return color;
			}

			vec4 Shader3dColorize(vec4 colorFrag) {

				vec3 color = colorFrag.rgb;

				color = Shader3dColorize_applyHue(color, uHue);
				color = Shader3dColorize_applySaturation(color, uSaturation);
				color *= uBrightness;
				color = mix(color, 1.0 - color, uNegative);
				color = Shader3dColorize_applyContrast(color, uContrast);
				color = Shader3dColorize_applyTemperature(color, uTemperature);
				color = Shader3dColorize_applyTint(color, uTint);

				return vec4(color, colorFrag.a);
			}
		`;
	}

	fragmentShaderBody() {
		return `
			gl_FragColor = Shader3dColorize(gl_FragColor);
		`;
	}
}


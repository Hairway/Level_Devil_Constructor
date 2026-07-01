import {Effect} from "postprocessing";
import * as THREE from "three";

export default class ColorFilters3d extends Effect {
		
	filters = {
		None        : 0,
		TealOrange  : 1,
		VintageFade : 2,
		Vignette    : 3,
		GlamourGlow : 4,
		Cold        : 5,
		Autumn      : 6,
		Dark        : 7,
		SplitRGB    : 8,
		Negative    : 9,
	};
	
	#scene;
	#camera;
	#scaleFactor;
	
	#initTexture = false;
	#depthMaterial;
	#depthRenderTarget;
	#overrideMaterial;
	
	#near;
	#far;

	constructor(
		scene,
		camera,
	{
		near = 5,
		far = 50,
		
		uFilter = "None",		
	}) {
		super(
			'ColorFilters3d',
			`
				uniform float uMethod;
				uniform sampler2D sceneDepth;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {

					vec3 color = inputColor.rgb;

					//- sharp
					
					if (uMethod != 0.0) {
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
					
						color.rgb = mix(color.rgb, colorSharpen, 0.1);
					}
					
					//-
					
					if (uMethod == 0.0) {
						// None
						outputColor = inputColor;
						return;
					}

					else if (uMethod == 1.0) {
						// TealOrange
						color.r += 0.1;
						color.b -= 0.1;
						color.rgb *= (0.8+0.5*color.rgb);
					}

					else if (uMethod == 2.0) {
						// VintageFade
						float gray = dot(color, vec3(0.299,0.587,0.114));
						color = mix(color, vec3(gray), 0.4);
						color *= vec3(1.1, 1.05, 0.9);
						color.rgb *= (0.5+1.2*color.rgb);
					}

					else if (uMethod == 3.0) {
						// Vignette
						float dist = distance(uv, vec2(0.5));
						color *= smoothstep(0.8, 0.4, dist);
					}

					else if (uMethod == 4.0) {
						// GlamourGlow (fake glow)
						color += color * 0.20;
					}

					else if (uMethod == 5.0) {
						// Cold (синий тон + чуть desaturate)
						float gray = dot(color, vec3(0.299,0.587,0.114));
						//color = mix(color, vec3(gray), 0.3);
						color.b += 0.15;
						color.r -= 0.10;
						//color.rgb *= (0.5+1.0*color.rgb);
					}

					else if (uMethod == 6.0) {
						// Autumn (теплый + насыщенность)
						// 1. теплый сдвиг (основа)
						color.r += 0.25;
						color.g += 0.12;
						color.b -= 0.2;

						// 2. подавление синего (ключ к "осени")
						color.b *= 0.6;

						// 3. легкий fade (выцветание)
						float gray = dot(color, vec3(0.299,0.587,0.114));
						color = mix(color, vec3(gray), 0.15);

						// 4. теплый баланс (как LUT)
						color *= vec3(1.2, 1.05, 0.8);

						// 5. мягкий контраст (чтобы не было грязи)
						color = (color - 0.5) * 1.1 + 0.5;
						
						color.rgb -= 0.17*(1.0 - color.rgb);
					}

					else if (uMethod == 7.0) {
						
						// 1. базовое затемнение
						color *= 0.6;

						// 2. холодный сдвиг
						color.b += 0.15;
						color.r -= 0.05;

						// 3. фиолетовый тон (магия тут)
						color.r += 0.08;
						color.b += 0.1;

						// 4. легкая десатурация (чтобы не кислотно)
						float gray = dot(color, vec3(0.299,0.587,0.114));
						color = mix(color, vec3(gray), 0.2);

						// 5. контраст (но мягкий)
						color = (color - 0.5) * 1.2 + 0.5;

						// 6. чуть "film look"
						color.rgb *= (0.6 + 0.8 * color.rgb);
					}
										
					else if (uMethod == 8.0) {
						// SPLIT RGB (chromatic aberration)
						float strength = 0.005;

						vec2 dir = uv - 0.5;
						vec2 offset = dir * strength;

						float r = texture2D(inputBuffer, uv + offset).r;
						float g = texture2D(inputBuffer, uv).g;
						float b = texture2D(inputBuffer, uv - offset).b;

						color = vec3(r, g, b);
					}
					
					else if (uMethod == 9.0) {
						// NEGATIVE
						color = 1.0 - color;
						color.b += 0.1;
					}
					
					outputColor = vec4(color, inputColor.a);
				}
			`,
			{
				uniforms: new Map([
					['uMethod', new THREE.Uniform(0)],
				])
			}
		);
		
		//-
		
		this.uniforms.get('uMethod').value = this.filters[uFilter];

	}
	
	setFilter(name){
		if(this.filters[name] !== undefined){
			this.uniforms.get('uMethod').value = this.filters[name];
		}
	}

	update(renderer, inputBuffer, deltaTime) {
	
	}
}

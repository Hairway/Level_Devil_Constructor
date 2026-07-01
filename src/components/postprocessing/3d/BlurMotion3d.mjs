import {Effect} from "postprocessing";
import * as IMPION from "#impion";

export default class BlurMotion3d extends Effect {

	#scene;
	#camera;
	#scaleFactor;
	
	#initScene = false;
	#depthMaterial;
	#renderTargetA;
	#renderTargetB;
	#renderTarget;
	#overrideMaterial;

	constructor(
		scene,
		camera,
	{
		uStrength = 1,
	}) {

		super(
			'BlurMotion3d',
			`
				uniform sampler2D prevFrame;
				uniform float uStrength;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					vec4 prevFrameColor = texture2D(prevFrame, uv);					
				//
				//	float blurK = 1.0 - smoothstep(uDepth - 0.1, uDepth + 0.1, sceneDepthR);
				//	
				//	vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
				//	float total = 0.0;
				//
				//	for (float x = -3.0; x <= 3.0; x++) {
				//		for (float y = -3.0; y <= 3.0; y++) {
				//			vec2 offset = vec2(x, y) * uStrength * 0.002;
				//			color += texture2D(inputBuffer, vUv + offset);
				//			total += 1.0;
				//		}
				//	}
					
				///	outputColor = mix(inputColor, color/total, blurK);
										
					outputColor = mix(inputColor, prevFrameColor, 0.5);
										
				}
			`,
			{
				uniforms: new Map([
					['uStrength', new IMPION.Uniform3d( uStrength )],
					['prevFrame', new IMPION.Uniform3d( new IMPION.Texture3d() )],
				])
			}
		);
		
		//-
		
		this.#scene = scene;
		this.#camera = camera;
		
		this.#scaleFactor = window.devicePixelRatio;
				
	}
	
	#initRenderTextures = ()=>{
		this.#renderTargetA = new IMPION.WebGLRenderTarget3d(
			this.#scaleFactor * window.innerWidth,
			this.#scaleFactor * window.innerHeight,
			{
				format: IMPION.RGBAFormat,
				type: IMPION.FloatType,
				depthBuffer: true,
				depthTexture: new IMPION.DepthTexture3d()
			}
		);
		
		this.#renderTargetB = new IMPION.WebGLRenderTarget3d(
			this.#scaleFactor * window.innerWidth,
			this.#scaleFactor * window.innerHeight,
			{
				format: IMPION.RGBAFormat,
				type: IMPION.FloatType,
				depthBuffer: true,
				depthTexture: new IMPION.DepthTexture3d()
			}
		);
	}

	update(renderer, inputBuffer, deltaTime) {
		if(!this.#initScene && window.innerWidth > 0 && window.innerHeight > 0){
			this.#initScene = true;
			
			this.#initRenderTextures();
			
			this.tm = 0;
			
		}else if(!this.#initScene){
			return false;
		}

		//-
		
		renderer.setRenderTarget( this.#renderTargetA );
		renderer.render(this.#scene, this.#camera);
		renderer.setRenderTarget(null);
		
		//-
		
		this.#renderTarget = this.#renderTargetA;
		this.#renderTargetA = this.#renderTargetB;
		this.#renderTargetB = this.#renderTarget;

		//-
		
		this.uniforms.get('prevFrame').value = this.#renderTargetA.texture;
		
	}
}

import {Effect} from "postprocessing";
import * as IMPION from "#impion";

export default class BlurDepth3d extends Effect {

	#scene;
	#camera;
	#scaleFactor;
	
	#initScene = false;
	#depthMaterial;
	#depthRenderTarget;
	#overrideMaterial;
	
	#sprites = [];
	
	#near;
	#far;

	constructor(
		scene,
		camera,
	{
		uStrength = 1,
		uDepth = 0.4,
		debug = false,
		near = 5,
		far = 50
	}) {
		
		let debugCode = "";
		if(debug){
			debugCode = "outputColor = texture2D(sceneDepth, uv);";
		}
		
		super(
			'BlurDepth3d',
			`
				uniform sampler2D sceneDepth;
				uniform float uStrength;
				uniform float uDepth;

				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					float sceneDepthR = clamp(texture2D(sceneDepth, uv).r, 0.0, 1.0) * 10.0;					

					float blurK = 1.0 - smoothstep(uDepth - 0.1, uDepth + 0.1, sceneDepthR);
					
					vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
					float total = 0.0;
				
					for (float x = -3.0; x <= 3.0; x++) {
						for (float y = -3.0; y <= 3.0; y++) {
							vec2 offset = vec2(x, y) * uStrength * 0.002;
							color += texture2D(inputBuffer, vUv + offset);
							total += 1.0;
						}
					}
					
					outputColor = mix(inputColor, color/total, blurK);
					
					//sceneDepthR = step(0.5, sceneDepthR);
					//outputColor = vec4(vec3(blurK), 1.0);
					
					` + debugCode + `
				}
			`,
			{
				uniforms: new Map([
					['uStrength', new IMPION.Uniform3d( uStrength )],
					['uDepth', new IMPION.Uniform3d( uDepth )],
					['sceneDepth', new IMPION.Uniform3d( new IMPION.Texture3d() )],
				])
			}
		);
		
		//-
		
		this.#scene = scene;
		this.#camera = camera;
		
		this.#near = near;
		this.#far = far;
		
		this.#scaleFactor = window.devicePixelRatio;
		
		this.#depthMaterial = new IMPION.MeshDepthMaterial3d();
		
	}
	
	#initRenderTextures = ()=>{
		this.#depthRenderTarget = new IMPION.WebGLRenderTarget3d(
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
	
	#initSprites = ()=>{
		this.#scene.traverse((object) => {
			if (object.isSprite) {
				this.#sprites.push( object );
			}
		});
	}
	
	update(renderer, inputBuffer, deltaTime) {
		if(!this.#initScene && window.innerWidth > 0 && window.innerHeight > 0 && this.#scene.children.length > 0){
			this.#initScene = true;
			
			this.#initRenderTextures();
			this.#initSprites();
			
		}else if(!this.#initScene){
			return false;
		}
		
		//-

		this.#camera.near = this.#near;
		this.#camera.far = this.#far;
		this.#camera.updateProjectionMatrix();
  
		//-
		
		this.#sprites.forEach((sprite) => {
			sprite.targetVisible = sprite.visible;
			sprite.visible = false;
		}); 
		
		//-

		let overrideMaterial = this.#scene.overrideMaterial;
		this.#scene.overrideMaterial = this.#depthMaterial;
	
		renderer.setRenderTarget( this.#depthRenderTarget );
		renderer.render(this.#scene, this.#camera);
		renderer.setRenderTarget(null);
				
		this.#scene.overrideMaterial = overrideMaterial;
		
		//-
		
		this.#sprites.forEach((sprite) => {
			sprite.visible = sprite.targetVisible;
		});
		
		//-
		
		this.#camera.near = 0.01;
		this.#camera.far = 2000;
		this.#camera.updateProjectionMatrix();
  
		//-
		
		this.uniforms.get('sceneDepth').value = this.#depthRenderTarget.texture;
		
	}
}

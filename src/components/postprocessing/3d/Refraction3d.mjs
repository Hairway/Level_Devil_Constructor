import {Effect} from "postprocessing";
import * as THREE from "three";

export default class Refraction3d extends Effect {
	
	selection = {};
	
	#scene;
	#camera;
	#depthScene;
	#objectsList = [];
	#scaleFactor;
	
	#initTexture = false;
	#depthMaterial;
	#depthRenderTargetA;
	#depthRenderTargetB;
	#overrideMaterial;
	
	#near;
	#far;

	constructor(
		scene,
		camera,
	{
		border = false,
		near = 1,
		far = 100,
		uBlur = 1,
		uDistortionX = 1,
		uDistortionY = 1,
	}) {
		
		let codeBorder = "";
		if(border){
			codeBorder = `
				float borderWidth = 0.004;
				
				float left = texture2D(objectsDepth, uv + vec2(-borderWidth, 0.0)).r;
				float right = texture2D(objectsDepth, uv + vec2(borderWidth, 0.0)).r;
				float top = texture2D(objectsDepth, uv + vec2(0.0, borderWidth)).r;
				float bottom = texture2D(objectsDepth, uv + vec2(0.0, -borderWidth)).r;
				
				float abs_left = abs(sceneDepthR - left);
				float abs_right = abs(sceneDepthR - right);
				float abs_top = abs(sceneDepthR - top);
				float abs_bottom = abs(sceneDepthR - bottom);
				
				if (objectsDepthR > 0.1 && ((left == 0.0 || abs_left > 0.005) || (right == 0.0 || abs_right > 0.005) || (top == 0.0 || abs_top > 0.005) || (bottom == 0.0 || abs_bottom > 0.005))) {
					outputColor.r *= 0.92;
					outputColor.g *= 0.92;
					outputColor.b *= 0.92;
				}
			`
		}
		
		super(
			'Refraction3d',
			`
				uniform sampler2D objectsDepth;
				uniform sampler2D sceneDepth;
				uniform float uBlur;
				uniform float uDistortionX;
				uniform float uDistortionY;
				
				void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
					
					float sceneDepthR = texture2D(sceneDepth, uv).r;
					float objectsDepthR = texture2D(objectsDepth, uv).r;
					
					if(abs(sceneDepthR - objectsDepthR) < 0.01 && objectsDepthR > 0.01){
						vec2 vUv = uv;
						vUv.x += sin(vUv.y * 50.0) * uDistortionX * 0.010;
						vUv.y += sin(vUv.x * 20.0) * uDistortionY * 0.010;
						
						vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
						float total = 0.0;

						for (float x = -3.0; x <= 3.0; x++) {
							for (float y = -3.0; y <= 3.0; y++) {
								vec2 offset = vec2(x, y) * uBlur * 0.003;
								color += texture2D(inputBuffer, vUv + offset);
								total += 1.0;
							}
						}
						
						outputColor = color / total;
					
				`+ codeBorder +`
					}else{
						outputColor = inputColor;					
					}
					
					//outputColor = texture2D(sceneDepth, uv); // debug
				}
			`,
			{
				uniforms: new Map([					
					['objectsDepth', new THREE.Uniform( new THREE.Texture() )],
					['sceneDepth', new THREE.Uniform( new THREE.Texture() )],
					['uBlur', new THREE.Uniform( uBlur )],
					['uDistortionX', new THREE.Uniform( uDistortionX )],
					['uDistortionY', new THREE.Uniform( uDistortionY )],
				])
			}
		);
			
		//-
		
		this.#scene = scene;
		this.#camera = camera;

		this.#near = near;
		this.#far = far;
		
		this.#scaleFactor = window.devicePixelRatio;
		
		//-
		
		this.#depthMaterial = new THREE.MeshDepthMaterial();
		
		this.#depthScene = new THREE.Scene();
        this.#depthScene.background = new THREE.Color(0x000000);
		this.#depthScene.overrideMaterial = this.#depthMaterial;
		
		this.selection.add = this.addObject;
	}
	
	addObject = ( object )=>{
		this.#objectsList.push( object );
	}
	
	#initRenderTextures = ()=>{
		this.#depthRenderTargetA = new THREE.WebGLRenderTarget(
			this.#scaleFactor * window.innerWidth,
			this.#scaleFactor * window.innerHeight,
			{
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				depthBuffer: true,
				depthTexture: new THREE.DepthTexture()
			}
		);

		this.#depthRenderTargetB = new THREE.WebGLRenderTarget(
			this.#scaleFactor * window.innerWidth,
			this.#scaleFactor * window.innerHeight,
			{
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				depthBuffer: true,
				depthTexture: new THREE.DepthTexture()
			}
		);
	}
	
	update(renderer, inputBuffer, deltaTime) {
		if(!this.#initTexture && window.innerWidth > 0 && window.innerHeight > 0){
			this.#initTexture = true;
			
			this.#initRenderTextures();
			
		}else if(!this.#initTexture){
			return false;
		}
		
		//if(!this.initLight && this.#scene.children.length > 0){
		//	this.initLight = true;
		//	
		//	let lights = this.#scene.children.filter(object => object.isLight);
		//
		//	lights.forEach(light => {
		//		let lightClone = light.clone();
		//		this.#depthScene.add( lightClone ); 
		//	});
		//}
		
		//-
		
		this.#camera.near = this.#near;
		this.#camera.far = this.#far;
		this.#camera.updateProjectionMatrix();
  
		let overrideMaterial = this.#scene.overrideMaterial;
		this.#scene.overrideMaterial = this.#depthMaterial;
	
		renderer.setRenderTarget( this.#depthRenderTargetA );
		renderer.render(this.#scene, this.#camera);
		renderer.setRenderTarget(null);
				
		this.#scene.overrideMaterial = overrideMaterial;
		
		//-
		
		for(let i=0; i<this.#objectsList.length; i++){
			let targetObject = this.#objectsList[i];
			targetObject.targetParent = targetObject.parent;
			this.#depthScene.add( targetObject );
		}
		
		renderer.setRenderTarget( this.#depthRenderTargetB );
		renderer.render(this.#depthScene, this.#camera);
		renderer.setRenderTarget(null);
		
		for(let i=0; i<this.#objectsList.length; i++){
			let targetObject = this.#objectsList[i];
			if(targetObject.targetParent){
				targetObject.targetParent.add( targetObject );
			}
		}
		
		this.#camera.near = 0.01;
		this.#camera.far = 2000;
		this.#camera.updateProjectionMatrix();
  
		//-
		
		this.uniforms.get('sceneDepth').value = this.#depthRenderTargetA.texture;
		this.uniforms.get('objectsDepth').value = this.#depthRenderTargetB.texture;
	}
}

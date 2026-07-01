import * as POSTPROCESSING from "postprocessing";
import {GLTFLoader} from "#gltfloader";
import * as IMPION from "#impion";

export default class Renderer3d extends IMPION.ComponentEmpty{

	type = "view3d";

	scaleFactorReal = 1;
	
	scene;	
	camera;
	fov;	
	renderer;
	dynamicResolution;
	
	width;
	height;	
	
	#layers;
	#canvas;
	
	loaderGLTF;
	loaderTexture;
	
	postprocessing;
	#postprocessing3d;
	
	performanceData = {
		scaleFactor 	: 1,
		lastTime 		: null,
		timer 			: 0,
		samples 		: [],
		targetQuality 	: 3,
		minQuality 		: 0,
		maxQuality 		: 3,
	};
	
	//------------------------------------------------------------------------
	
	constructor({
		dynamicResolution = false,
		perspective,
		fov = [60, 30],
		postprocessingForce = false,
		postprocessing = null,
		layers = 1,
		logarithmicDepthBuffer = false,
		shadowMap = IMPION.PCFShadowMap,
		fps = 60,
		order = "pre"
	}){
		super(fps, order);
		
		//-
		
		this.fov = fov;
		this.#layers = layers;
		this.#postprocessing3d = postprocessing;
		this.dynamicResolution = dynamicResolution;
		
		this.loaderGLTF = new GLTFLoader();
		this.loaderTexture = new IMPION.TextureLoader3d();

		//-
		
		this.#canvas = document.getElementById('canvas_3d');
				
		//-
		
		this.renderer = new IMPION.WebGLRenderer3d({ 
			canvas					: this.#canvas,
			antialias				: true,
			logarithmicDepthBuffer	: logarithmicDepthBuffer,
			preserveDrawingBuffer	: true,
			//alpha					: true,
		});
		
		this.renderer.shadowMap.enabled 	= true;		
		this.renderer.shadowMap.type 		= shadowMap;
		
		this.renderer.outputColorSpace 		= IMPION.SRGBColorSpace;
	
		//-
		
		this.scene = new IMPION.Scene3d();
        this.scene.background = new IMPION.Color3d(0x000000);
		
		//-
		
		if(perspective){
			this.camera = new IMPION.PerspectiveCamera3d( fov[0], window.innerWidth / window.innerHeight, 0.01, 2000 );
		}else{
			this.camera = new IMPION.OrthographicCamera3d( -1280/2, 1280/2, 1280/2, -1280/2, -10, 100 );
		}
		
		this.camera.position.set(1,1,1);
		this.camera.lookAt(new IMPION.Vector3(0,0,0));
		this.camera.fovExtra = 0;
		
		//-
		
		if(globalThis.params.visualMode.value != "None"){
			postprocessingForce = true;
			
			const existsColorFilters3d = this.#postprocessing3d.effects.some(item => item?.name === "ColorFilters3d");			
			if(!existsColorFilters3d){
				this.#postprocessing3d.effects.push({name:"ColorFilters3d", pass: (scene, camera) => { return new IMPION.ColorFilters3d(scene, camera, {}); }});
			}
			
			const indexFXAAEffect = this.#postprocessing3d.effects.findIndex(item => item?.name === "FXAAEffect");	
			if(indexFXAAEffect === -1){
				this.#postprocessing3d.effects.push({name:"FXAAEffect", pass: (scene, camera) => { return new POSTPROCESSING.FXAAEffect(); }});
			} else if (indexFXAAEffect !== this.#postprocessing3d.effects.length - 1) {				
				const [itemFXAAEffect] = this.#postprocessing3d.effects.splice(indexFXAAEffect, 1);
				this.#postprocessing3d.effects.push(itemFXAAEffect);
			}
		}
		
		//-
		
		let androidVersion = this.#getAndroidVersion();
		if (androidVersion && !postprocessingForce) {
			if (parseFloat(androidVersion) < 12) {
				this.#postprocessing3d = null;
			}
		}

		if(this.#postprocessing3d && this.#postprocessing3d.effects.length > 0){
			this.postprocessing = {active: true};
			
			this.composer = this.#postprocessing3d.getComposer( this.renderer );
			this.composer.addPass( this.#postprocessing3d.getRenderPass(this.scene, this.camera) );
			
			for(let i=0; i<this.#postprocessing3d.effects.length; i++){
				let pass = this.#postprocessing3d.effects[i].pass(this.scene, this.camera);
				this.postprocessing[ this.#postprocessing3d.effects[i].name ] = pass;

				this.composer.addPass( this.#postprocessing3d.getEffectPass(this.camera, pass) );
			}
		}

    }

	#getAndroidVersion(ua) {
		ua = (ua || navigator.userAgent).toLowerCase(); 
		var match = ua.match(/android\s([0-9\.]+)/);
		return match ? match[1] : false;
	}
	
	//------------------------------------------------------------------------
	
	#updatePerformance() {
		let now = performance.now();

		if (this.performanceData.lastTime == null) {
			this.performanceData.lastTime = now;

			return;
		}

		let dt = now - this.performanceData.lastTime;

		this.performanceData.lastTime = now;

		this.performanceData.timer += dt;
		this.performanceData.samples.push( dt );

		if (this.performanceData.timer < 1000 || this.performanceData.samples.length < 5) {
			return;
		}

		//-

		let sum = 0;
		for (let i = 0; i < this.performanceData.samples.length; i++) {
			sum += this.performanceData.samples[i];
		}

		let ms = sum / this.performanceData.samples.length;

		this.performanceData.timer = 0;
		this.performanceData.samples.length = 0;

		//-

		let slow = 1000/30;
		let mid = 1000/45;
		let fast = 1000/60;

		let newQuality = this.performanceData.targetQuality;

		if (ms > slow && this.performanceData.targetQuality > this.performanceData.minQuality) {
			newQuality --;
		} else if (ms < mid && this.performanceData.targetQuality < this.performanceData.maxQuality) {
			newQuality ++;
		}

		if (newQuality == this.performanceData.targetQuality) {
			return;
		}

		this.performanceData.targetQuality = newQuality;

		//-

		this.#applyQuality();
	}

	#applyQuality() {
		let multipliers = [0.35, 0.5, 0.75, 1.0];
		let m = multipliers[this.performanceData.targetQuality];

		this.performanceData.scaleFactor = multipliers[this.performanceData.targetQuality];

		this.resize( this.width, this.height );
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta = 0 )=>{  		
	   	if(this.#layers > 1){
			let backgroundScene = this.scene.background;
			
			this.renderer.autoClear = true;
			this.camera.layers.set(0);  
			if(this.composer && this.postprocessing && this.postprocessing.active){
				this.composer.render();
			}else{
				this.renderer.render( this.scene, this.camera );
			}
			
			this.scene.background = null;
				
			this.renderer.autoClear = false;
			this.renderer.clearDepth();

			for(let i=1; i<this.#layers; i++){
				this.camera.layers.set(i);  
				if(this.composer && this.postprocessing && this.postprocessing.active){
					this.composer.render();
				}else{
					this.renderer.render( this.scene, this.camera );
				}		
			}

			this.scene.background = backgroundScene;
	   	}else{
			if(this.composer && this.postprocessing && this.postprocessing.active){
				this.composer.render();
			}else{
				this.renderer.render( this.scene, this.camera );
			}
		}
		
		if(this.dynamicResolution){
			this.#updatePerformance();
		}
    }
	
	//------------------------------------------------------------------------
	
	resize = (width, height)=>{  		
		this.scaleFactorReal = window.devicePixelRatio * this.performanceData.scaleFactor;

		let canvasWidth		= Math.ceil(this.scaleFactorReal * width);
		let canvasHeight	= Math.ceil(this.scaleFactorReal * height); 
		
		this.width			= width;
		this.height			= height;

		//-
		
		this.#canvas.style.width	= width+"px";
		this.#canvas.style.height	= height+"px";							
		//this.#canvas.width			= canvasWidth;
		//this.#canvas.height			= canvasHeight;
		
		//-
		
		this.camera.aspect = width / height;	
			
		if(this.composer){
			this.composer.setSize( canvasWidth, canvasHeight, false);
		}
		
		this.renderer.setSize( canvasWidth, canvasHeight, false);
		
		//-
				
		if(width < height){
			if(!this.camera.isPerspectiveCamera){
				this.camera.viewSize = this.fov[0];
			}else{
				this.camera.fov = this.fov[0] + this.camera.fovExtra;
			}
		}else{
			if(!this.camera.isPerspectiveCamera){
				this.camera.viewSize = this.fov[1];
			}else{
				this.camera.fov = this.fov[1] + this.camera.fovExtra;
			}
		}
		
		if(!this.camera.isPerspectiveCamera){
			this.camera.left 	= -this.camera.aspect * this.camera.viewSize / 2;
			this.camera.right 	= +this.camera.aspect * this.camera.viewSize  / 2;
			this.camera.top 	= +this.camera.viewSize / 2;
			this.camera.bottom 	= -this.camera.viewSize / 2;
		}
		
		this.camera.updateProjectionMatrix();
				
		//-

		this.enterframe();
		
    }
}
import * as IMPION from "#impion";

export default class Renderer2d extends IMPION.ComponentEmpty{

	type = "view2d";

	scaleFactorReal = 1;
	
	width;
	height;	
	
	scene;
	app;
	
	#canvas;
	
	dynamicResolution = false;
	performanceData = {
		scaleFactor 		: 1,
		lastTime 			: null,
		timer 				: 0,
		samples 			: [],
		targetQuality 		: 3,
		minQuality 			: 0,
		maxQuality 			: 3,
	};
	
	//------------------------------------------------------------------------
	
	constructor({dynamicResolution = false, fps = 60, order = "pre"}){
		super(fps, order);
		
		//-
		
		this.dynamicResolution = dynamicResolution;
		
		//-
		
		this.#canvas = document.getElementById('canvas_2d');
    }

	init = async ( playable, funComplete )=>{
		let _antialias = true;
		let _v = ""+this.#checkVersionIOS();
		
		if(_v.indexOf("OS 15.4") != -1){
			_antialias = false;
		}
		
		this.app = new IMPION.Application2d();
		
		await this.app.init({
            canvas					: this.#canvas,
            backgroundAlpha			: 0,
			preserveDrawingBuffer	: true,
            //background			: 0xcccccc,
			autoStart				: false,
			autoDensity				: true,
			resolution				: window.devicePixelRatio,
			autoResize				: false,
			resizeTo				: window,
		    antialias				: _antialias
        });
		
		//-
		
		this.scene = new IMPION.Group2d();
		this.app.stage.addChild( this.scene );
		
		//-
		
		funComplete();
	}
	
	//------------------------------------------------------------------------
	
	#checkVersionIOS(){
		var agent = window.navigator.userAgent,
		start = agent.indexOf( 'OS' );
		if( ( agent.indexOf( 'iPhone' ) > -1 || agent.indexOf( 'iPad' ) > -1 ) && start > -1 ){
			return agent.replace( '_', '.' );
		}
		return "";
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
		let multipliers = [0.7, 0.8, 0.9, 1.0];
		let m = multipliers[this.performanceData.targetQuality];

		this.performanceData.scaleFactor = multipliers[this.performanceData.targetQuality];

		this.resize( this.width, this.height );
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{			
		this.app.renderer.render( this.scene );
		
		if(this.dynamicResolution){
			this.#updatePerformance();
		}
    }
	
	//------------------------------------------------------------------------
	
    resize = (width, height)=>{  		
		this.scaleFactorReal = window.devicePixelRatio * this.performanceData.scaleFactor;

	//	let canvasWidth		= Math.ceil(this.scaleFactorReal * width);
	//	let canvasHeight	= Math.ceil(this.scaleFactorReal * height); 
		this.width			= Math.round(width);
		this.height			= Math.round(height);

		//-

		IMPION.AbstractRenderer2d.defaultOptions.resolution = this.scaleFactorReal;
		
		//-
	
		this.app.renderer.resize(this.width, this.height);	
		
		//-
		
		this.#canvas.style.width	= width+"px";
		this.#canvas.style.height	= height+"px";							
		//this.#canvas.width			= canvasWidth;
		//this.#canvas.height			= canvasHeight;			
		
		//-		
		
		this.scene.position.set(Math.round(width*0.5), Math.round(height*0.5));
		this.scene.scale.set(1);

		if(this.width < this.height){
			this.scene.scale.set( this.width/720 );
			if(this.scene.scale.y*1280 > this.height){
				this.scene.scale.set( this.height/1280 );
			}
		}else{		
			this.scene.scale.set( this.width/1280 );
			if(this.scene.scale.y*720 > this.height){
				this.scene.scale.set( this.height/720 );
			}
		}

		//-

		this.app.renderer.render( this.scene );
    }
}
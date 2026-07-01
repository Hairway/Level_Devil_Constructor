import * as IMPION from "#impion";

export default class Game extends IMPION.ComponentEmpty {
    #app;

	#numClicks = 0;
	#state = 0;
	#mouse = {};
	#mouseAim = {x:0, y:0};
	#mouseCurrent;
	#isStageDown = false;

	#stageWidth = 0;	
	#stageHeight = 0;
	
	#point3d = new IMPION.Group3d();
	#raycaster3d = new IMPION.Raycaster3d();

	#soundsSfxTimer = {
		step : 0		
	};
	
    constructor({app}) {
        super();
		
        this.#app = app;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
	}
	
	init(){
        //- debug
		
		new IMPION.Debugger3d({
			app					: this.#app,
			ruler				: false,
			hide2d				: false,
			rebootCamera		: true,
			console				: false,
			fpsHelper			: false,
			gridHelper			: false,
			axesHelper			: false,
			transformControls	: true,
			orbitControls		: true,
			lightsHelper		: false,
			//gui					: new IMPION.CreateDebugGUI({app: this.#app, gameComponent: this}),
			components			: [
				//this.#app.physics3d
			]	
		});

        //- sounds settings
		
	//	this.#app.soundManager.loop("bg_0");
	//	this.#app.soundManager.setMusic("bg_0");
	//	this.#app.soundManager.volume("bg_0", 0.2);
    		
		//-
				
		//this.#app.tween.set(this, {delay:0.1, overwrite: "none", onComplete:this.failGame});
		//this.#app.tween.set(this, {delay:0.1, overwrite: "none", onComplete:this.winGame});
    }

    //------------------------------------------------------------------------

	handlerTap = (e) => {

		this.#numClicks++;
		if(this.#app.params.modeClicks.value != 0){		
			if(this.#numClicks >= this.#app.params.modeClicks.value){			
				this.components["FullscreenCTA"].visible = true;
			}	
		}
		
		this.#app.platformManager.handlerTap( this.#numClicks );
		
		//-
		
		this.#app.focusedManager.on(true);
	
		//-
		
		if(this.#state == 0){
			this.#state = 1;
			
			this.#app.statisticManager.handlerEvent("CHALLENGE_STARTED");
			this.#app.soundManager.on( this.#numClicks );
			  
			//this.#app.soundManager.play("bg_0");
			//this.#app.soundManager.fadeIn("bg_0", 1);
					
		}		
	}

    //------------------------------------------------------------------------

	stageDown = (e) => {
		this.handlerTap(e);
		
		if(this.#state == 1){
			this.#isStageDown = true;
		
			//-
			
			if(!this.#mouse[e.data.pointerId]){ this.#mouse[e.data.pointerId] = {}; }
			
			this.#mouseCurrent = this.#mouse[e.data.pointerId];
			
			this.#mouseCurrent.type = "";
			this.#mouseCurrent.isDown = true;
			this.#mouseCurrent.x = 0;
			this.#mouseCurrent.y = 0;
			this.#mouseCurrent.downX = 0;
			this.#mouseCurrent.downY = 0;
				
			this.#app.view2d.scene.toLocal( e.global, null, this.#mouseCurrent);	
			
			this.#mouseCurrent.downX = this.#mouseCurrent.x;
			this.#mouseCurrent.downY = this.#mouseCurrent.y;
			
			//this.#mouseCurrent.x = +this.#mouseCurrent.x * this.#app.view2d.scene.scale.x/(0.5 * this.#app.view2d.width);
			//this.#mouseCurrent.y = -this.#mouseCurrent.y * this.#app.view2d.scene.scale.x/(0.5 * this.#app.view2d.height);
			
			//-
			
		}
    }

    stageMove = (e) => {
		this.#mouseCurrent = this.#mouse[e.data.pointerId];
		
		if(this.#isStageDown && this.#state == 1 && this.#mouseCurrent && this.#mouseCurrent.isDown){
			
			this.#app.view2d.scene.toLocal( e.global, null, this.#mouseCurrent);	
			
		}
    }

    stageUp = (e) => {		
		this.#mouseCurrent = this.#mouse[e.data.pointerId];
		
		if(this.#isStageDown && this.#state == 1 && this.#mouseCurrent){
			this.#mouseCurrent.isDown = false;
		}
		
		this.#isStageDown = false;		
    }

    //------------------------------------------------------------------------

    initGame = () => {	
		//this.#app.tween.globalTimeline.timeScale(0.2);
		//this.#app.timeScale = 1;
		
		//this.#app.statisticManager.handlerEvent("CHALLENGE_RETRY");		// Пользователь повторно пытается пройти проверку, которая оказалась неудачной
		//this.#app.statisticManager.handlerEvent("CHALLENGE_PASS_25");		// Пользователь достигает 25% выполнения задания.
		//this.#app.statisticManager.handlerEvent("CHALLENGE_PASS_50");		// Пользователь достигает 50% выполнения задания.
		//this.#app.statisticManager.handlerEvent("CHALLENGE_PASS_75");		// Пользователь выполнил задание на 75%.
		
		//- Ground
		
		// Плоскость XZ 100x100, клетки 1x1 метр
		const size = 200;
		const cells = 200;

		// Canvas-текстура шахматки
		const canvas = document.createElement('canvas');
		canvas.width = cells;
		canvas.height = cells;

		const ctx = canvas.getContext('2d');

		const lightColor = '#63647c';
		const darkColor = '#4e5067';

		for (let x = 0; x < cells; x++) {
		  for (let y = 0; y < cells; y++) {
			ctx.fillStyle = (x + y) % 2 === 0 ? lightColor : darkColor;
			ctx.fillRect(x, y, 1, 1);
		  }
		}

		const texture = new IMPION.CanvasTexture3d(canvas);
		texture.magFilter = IMPION.NearestFilter;
		texture.minFilter = IMPION.NearestFilter;
		texture.colorSpace = IMPION.SRGBColorSpace;

		const plane = new IMPION.Mesh3d(
			new IMPION.PlaneGeometry3d(size, size),
			new IMPION.MeshLambertMaterial3d({
				map		: texture,
				side	: IMPION.DoubleSide
			})
		);

		// PlaneGeometry лежит в XY, поворачиваем в XZ
		plane.receiveShadow = true;
		plane.rotation.x = -Math.PI / 2;
		this.#app.view3d.scene.add(plane);
		
		//- people
		
		this.components["People"] = new IMPION.Model3d({
            app			: this.#app,
            name		: "people",
        });
		this.components["People"].position.z = -2;
		this.#app.view3d.scene.add( this.components["People"] );
		
	}

    //------------------------------------------------------------------------

	reloadParams(){
		//this.#app.params
		
	}

    //------------------------------------------------------------------------

    failGame = (e) => {
		if(this.#state != 10){
			this.#state = 10;

			//-
			
			this.#app.platformManager.end();
			this.#app.statisticManager.handlerEvent("CHALLENGE_FAILED");
			this.#app.statisticManager.handlerEvent("ENDCARD_SHOWN");
			
			//-
			
			
			if(this.#app.params.fullscreenCta.value){
				this.#app.tween.set(this.components["FullscreenCTA"],				{delay:2.0, overwrite: "none", visible:true});
			}
		}
    }

    winGame = (e) => {
		if(this.#state != 10){
			this.#state = 10;
			
			//-
			
			this.#app.platformManager.end();
			this.#app.statisticManager.handlerEvent("CHALLENGE_SOLVED");
			this.#app.statisticManager.handlerEvent("ENDCARD_SHOWN");
			
			//-
			
			//this.#app.soundManager.play("win");
			
			//-
			
			//this.#app.tween.killTweensOf( this );
			
			//-
				
			this.components["Task"].hide(0.1).stopAnimation();
			this.components["Logo"].hide(0.1);
			this.components["Cursor"].hide(0.1);
			
			//this.components["FullscreenOverlay"].show(0.1, 0.4);
			 
			this.components["ButtonCTA"].show(0.4, 0.4, "scale").playAnimation("bounce");
			 
			//-
			
			this.components["VfxConfetti"].exude({quantity : 30, spawn : {type : "rect", x : -this.#stageWidth*0.5, y : +this.#stageHeight*0.5, dx : 0, dy : 0}});			
			this.components["VfxConfetti"].exude({quantity : 30, spawn : {type : "rect", x : +this.#stageWidth*0.5, y : +this.#stageHeight*0.5, dx : 0, dy : 0}});

			//-
						
			if(this.#app.params.fullscreenCta.value){
				this.#app.tween.set(this.components["FullscreenCTA"],				{delay:2.0, overwrite: "none", visible:true});
			}
		   
		}
    }

    //------------------------------------------------------------------------

    enterframe = ( timeDelta )=>{		
		
		//- Sounds
		
		for(let i in this.#soundsSfxTimer){
			if(this.#soundsSfxTimer[i] > 0){this.#soundsSfxTimer[i]--;}
		}
    }

    resize = (width, height)=>{
		this.#stageWidth = width;
		this.#stageHeight = height;
    }

}

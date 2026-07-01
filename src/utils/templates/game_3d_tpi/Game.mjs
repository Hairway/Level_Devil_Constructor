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
		
	//	new IMPION.Debugger3d({
	//		app					: this.#app,
	//		ruler				: false,
	//		hide2d				: false,
	//		rebootCamera		: false,
	//		console				: false,
	//		fpsHelper			: true,
	//		gridHelper			: false,
	//		axesHelper			: false,
	//		transformControls	: false,
	//		orbitControls		: false,
	//		lightsHelper		: false,
	//		gui					: new IMPION.CreateDebugGUI({app: this.#app, gameComponent: this}),
	//		components			: [
	//			this.#app.physics3d
	//		]	
	//	});
		
		
        //- sounds settings
		
		this.#app.soundManager.loop("bg_0");
		this.#app.soundManager.setMusic("bg_0");
		this.#app.soundManager.volume("bg_0", 0.2);
    		
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
			  
			this.#app.soundManager.play("bg_0");
			this.#app.soundManager.fadeIn("bg_0", 1);
			
			this.components["Cursor"].hide(0.1).stopAnimation();		
			this.components["Task"].hide(0.1).stopAnimation();			
		}		
	}

    //------------------------------------------------------------------------

	stageDown = (e) => {
		this.handlerTap(e);
		
		if(this.#state == 1){
			if(this.#mouseCurrent && this.#mouseCurrent.isDown && this.#mouseCurrent != this.#mouse[e.data.pointerId]){
				return false;			
			}
			
			this.#isStageDown = true;
		
			//-
			
			if(!this.#mouse[e.data.pointerId]){
				this.#mouse[e.data.pointerId] = {};
			}
			
			this.#mouseCurrent = this.#mouse[e.data.pointerId];
			
			this.#mouseCurrent.type = "move";
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
			
			this.components["Control"].updateDown( this.#mouseCurrent );

		}
    }

    stageMove = (e) => {
		if(this.#isStageDown && this.#state == 1 && this.#mouseCurrent && this.#mouseCurrent == this.#mouse[e.data.pointerId] && this.#mouseCurrent.isDown){
			
			this.#app.view2d.scene.toLocal( e.global, null, this.#mouseCurrent);	
			
			this.components["Control"].updateMove( this.#mouseCurrent );
		}
    }

    stageUp = (e) => {		
		if(this.#isStageDown && this.#state == 1 && this.#mouse[e.data.pointerId]){
			this.#mouse[e.data.pointerId].isDown = false;
			
			if(this.#mouseCurrent == this.#mouse[e.data.pointerId]){
				this.#mouseCurrent = null;
				
				this.components["Control"].updateUp();
			}
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
		
		//this.components["Camera"].active = false;
		
	}

    //------------------------------------------------------------------------

	reloadParams(){
		//this.#app.params
		
	}

    //------------------------------------------------------------------------
	
	updateLabelHero(){		
		if(!this.components["HeroLabel"]){ return false; }
		
		this.#point3d.position.copy( this.components["Hero"].position );
		this.#point3d.position.y += 2.4;
		
		let p = this.#app.ThreeExtension.positionTo2d( this.#point3d );
		
		this.components["HeroLabel"].x = p.x;
		this.components["HeroLabel"].y = p.y;			
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
			this.components["Joystick"].hide(0.1);
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
		
		//- Hero
		
		if(this.components["Hero"].actionCurrent == "run"){
			this.components["EmitterDust"].exude({
				quantity 	: 1,
				spawn 		: this.components["Hero"].position
			});
			
			//-
			
			if(this.#soundsSfxTimer.step == 0){
				this.#soundsSfxTimer.step = Math.randomInteger(10, 15) ;
				
				this.#app.soundManager.play("step_"+Math.randomInteger(0, 2), 0.5, 0.95+0.1*Math.random());
			}
		}

		this.updateLabelHero();	
			
		//- People

		for(let i = 0; i<this.components["World"]["points_people"].children.length; i++){
			let people = this.components["People_"+i];
			
			people.tmAI++;
			if(people.tmAI > 200){
				people.tmAI = Math.randomInteger(0, 100);
				
				this.components["People_"+i].commandToPoints(this.components["PathFinder"], [
					new IMPION.Vector3(
						20-20*2*Math.random(),
						0,
						20-20*2*Math.random(),
					)
				]);
			}
			
		}		
			
		//- Cursor
		
		if(this.components["Cursor"].visible){
			this.components["Cursor"].bgObject_1.rotation = 0.8*this.components["Cursor"].animationContainer.rotation;
			
			this.components["Joystick"].barObject.x = 0.2*this.components["Cursor"].animationContainer.x;
			this.components["Joystick"].barObject.y = 0.2*this.components["Cursor"].animationContainer.y;
		}

		//- Sounds
		
		for(let i in this.#soundsSfxTimer){
			if(this.#soundsSfxTimer[i] > 0){this.#soundsSfxTimer[i]--;}
		}
    }

    resize = (width, height)=>{
		this.#stageWidth = width;
		this.#stageHeight = height;
		
		this.updateLabelHero();
    }

}

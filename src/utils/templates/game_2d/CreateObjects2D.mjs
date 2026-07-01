import * as PIXIFilter from "pixi-filters";
import * as IMPION from "#impion";

export default class CreateObjects2D{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
	
		//------------------------
		
		//- FullscreenOverlay
		
        this.components["FullscreenOverlay"] = new IMPION.FullscreenOverlay({
			//texture	: this.#app.assets.textures.pixi["bg"]
			fill	: 0x29c8f6,
			alpha	: 1,	
			cover	: false,
		});		
		this.#app.view2d.scene.addChild( this.components["FullscreenOverlay"] );
		
		//------------------------
			
		//this.#app.physics2d.add({x:0, y:200, wx:300, wy:40}, {mass:0});
		//this.#app.physics2d.add({x:-50, y:0, wx:50, wy:50, rotation:0.5}, {mass:1});
		//this.#app.physics2d.add({x:+50, y:0, wx:50, wy:50, rotation:0.5}, {mass:1});
	
		//------------------------
			
		//- Hero
		
		this.components["Hero"] = new IMPION.SpriteSpine2d({
			data				: this.#app.assets.spine["imp"],
			positionRelative 	: {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
			positionAbsolute 	: {vertical: {x: 0, y: 180}, horizontal: {x: 30, y: 180}},
			scaleAbsolute 		: {vertical: {x: 0.5, y: 0.5}, horizontal: {x: 0.5, y: 0.5}},
			rotationAbsolute 	: {vertical: 0, horizontal: 0}
		});
		//this.components["Hero"].log();
		this.components["Hero"].action['animation'].speed = 0.5;
		this.components["Hero"].setAction('animation', 0, true);
		this.#app.view2d.scene.addChild( this.components["Hero"] );
	
		//------------------------
			
		//- Logo
		
        this.components["Logo"] = new IMPION.SpriteText({
            texture				: this.#app.assets.textures.pixi["ui_logo"],
			positionRelative 	: {vertical: {x: -0.5, y: -0.5}, horizontal: {x: -0.5, y: -0.5}},
			positionAbsolute 	: {vertical: {x: 160, y: 100}, horizontal: {x: 160, y: 80}},
			scaleAbsolute 		: {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
			rotationAbsolute 	: {vertical: 0, horizontal: 0}
        });
		this.#app.view2d.scene.addChild( this.components["Logo"] );
		
		//- Cursor
		
		this.components["Cursor"] = new IMPION.SpriteText({
            textures			: [
				this.#app.assets.textures.pixi["ui_cursor_0"],
				this.#app.assets.textures.pixi["ui_cursor_1"],				
			],
			positionRelative 	: {vertical: {x: 0, y: 0.5}, horizontal: {x: 0.5, y: 0.5}},
			positionAbsolute 	: {vertical: {x: 10, y: -250}, horizontal: {x: -160, y: -140}},
			scaleAbsolute 		: {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
			rotationAbsolute 	: {vertical: 0, horizontal: 0}
        }).playAnimation("infinity");
		this.#app.view2d.scene.addChild( this.components["Cursor"] );
	
		//- Task

        this.components["Task"] = new IMPION.SpriteText({
			textures				: [
				//this.#app.assets.textures.pixi["ui_task_bg"],
			],
            text					: this.#app.params.textTask.value,
            textStyle				: {
				fontFamily 			: "Baloo",				
				fontSize 			: 50,
				fontWeight 			: "normal",
				fill				: "#ffffff",
				fillGradientType	: 1,
				align				: "center",
				valign				: "center",
				letterSpacing		: 0.5,
				lineHeight			: 0,
				wordWrapWidth		: 500,
				wordWrapHeight		: 1000,
				wordWrap			: false,
				autoWordWrap		: false,				
					
				stroke				: {
					color	: "#000000",
					width	: 5,
					join	: "round"
				},
				
				dropShadow			: {
					color		: '#000000',
					blur		: 0,
					angle		: 0.5*Math.PI,
					distance	: 2,
					alpha		: 1
				},
								
				filters				: [				 
					//new PIXIFilter.OutlineFilter(12, 0x111111, 1),
					//new PIXIFilter.DropShadowFilter({
					//	alpha 		: 0.2,	
					//	blur 		: 2,	
					//	color 		: 0x000000,	
					//	offset 		: {x:0, y:5},	
					//	quality 	: 4,
					//})			
				]
			},
			asBitmap			: false,
			borderBitmap		: 30,
			positionRelative 	: {vertical: {x: 0.0, y: 0.5}, horizontal: {x: 0, y: 0.5}},
			positionAbsolute 	: {vertical: {x: 0, y: -100}, horizontal: {x: 0, y: -100}},
			scaleAbsolute 		: {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
			rotationAbsolute 	: {vertical: 0, horizontal: 0}
        }).playAnimation("bounce");
		this.#app.view2d.scene.addChild( this.components["Task"] );
	
		//------------------------
			
		//- EmitterDust
		
		this.components["EmitterDust"] = new IMPION.Emitter2d({
			particles			: [ this.#app.assets.textures.pixi["vfx_circle"] ],
			quantity			: 50,
			
			frequency			: 5,
			spawn				: {type:"rect", x:0, y:0, dx:300, dy:300},
			blend				: false,
			auto				: false,
		
			scale				: {x:1.35, y:1, dx:0.30, dy:0, sync:true},
			rotation			: {a:0, da:0},
			opacity				: {a:0.4, da:0.05, easeIn:true},
			
			gravity				: {x:0, y:0},
			friction			: {x:0, y:0, sx:0, sy:0, r:0, opacity:0},
			
			velocity			: {x:0, y:-10, dx:0.0, dy:5},				
			velocityScale		: {x:0, y:0, dx:0, dy:0, sync:true},				
			velocityOpacity		: {a:-0.05, da:0.0},				
			velocityAngular		: {a:0, da:0},
		});
		this.#app.view2d.scene.addChild( this.components["EmitterDust"] );	
		
		//------------------------
		
		//- Video
		
    //    this.components["Video"] = new IMPION.Video2d({			
	//		app					: this.#app,
	//		video				: this.#app.assets.videos["movie"],
	//		width 			 	: 720*0.5,
	//		height 				: 360*0.5,
	//		autoplay 			: true,
	//		positionRelative 	: {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
	//		positionAbsolute 	: {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
	//		scaleAbsolute 		: {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
	//		rotationAbsolute 	: {vertical: 0, horizontal: 0}
    //    });
	//	this.#app.view2d.scene.addChild( this.components["Video"] );
		
		//------------------------
		
		//- ButtonCTA
		
        this.components["ButtonCTA"] = new IMPION.SpriteText({
            texture				: this.#app.assets.textures.pixi["ui_button"],
            text				: this.#app.params.textBtnWin.value,
            textStyle			: {
				fontFamily 		: "Baloo",				
				fontSize 		: 50,
				fontWeight 		: "normal",
				fill			: 0x111111,
				letterSpacing	: 0,
				lineHeight		: 0,
				autoWordWrap	: true,
				filters			: []
			},
			positionRelative 	: {vertical: {x: 0.0, y: 0.5}, horizontal: {x: 0, y: 0.5}},
			positionAbsolute 	: {vertical: {x: 0, y: -150}, horizontal: {x: 0, y: -150}},
			scaleAbsolute 		: {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
			rotationAbsolute 	: {vertical: 0, horizontal: 0},
        }).hide();
		this.#app.view2d.scene.addChild( this.components["ButtonCTA"] );
	
		//------------------------
		
		//- VfxConfetti
		
		this.components["VfxConfetti"] = new IMPION.VfxPack2d({
			app 			: this.#app,
			type 			: "confettiSimple",
			gameComponent 	: this.#gameComponent,
			settings		: {}
		});
		this.#app.view2d.scene.addChild( this.components["VfxConfetti"] );	
		
		//- FullscreenCTA
		
        this.components["FullscreenCTA"] = new IMPION.FullscreenOverlay({
			fill	: 0x000000,
			alpha	: 0
		});
		this.#app.view2d.scene.addChild( this.components["FullscreenCTA"] );
		
		//- ButtonSound
		
        this.components["ButtonSound"] = new IMPION.ButtonSound({
            textureOn			: this.#app.assets.textures.pixi["ui_btn_sound_on"],
            textureOff			: this.#app.assets.textures.pixi["ui_btn_sound_off"],
            soundManager		: this.#app.soundManager,
			positionRelative 	: {vertical: {x: -0.5, y: 0.5}, horizontal: {x: -0.5, y: 0.5}},
			positionAbsolute 	: {vertical: {x: 50, y: -100}, horizontal: {x: 50, y: -100}},
			scaleAbsolute 		: {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
			rotationAbsolute 	: {vertical: 0, horizontal: 0},
        });
		this.#app.view2d.scene.addChild( this.components["ButtonSound"] );
		
	}
}
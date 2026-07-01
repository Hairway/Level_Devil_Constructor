import * as PIXIFilter from "pixi-filters";
import * as IMPION from "#impion";

export default class CreateObjects2D{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
	
		//- FullscreenOverlay
		
        this.components["FullscreenOverlay"] = new IMPION.FullscreenOverlay({
			//texture	: this.#app.assets.textures.pixi["bg"]
			fill	: 0x29c8f6,
			alpha	: 0,	
			cover	: false,
		});		
		this.#app.view2d.scene.addChild( this.components["FullscreenOverlay"] );
		
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
		
		//------------------------
		
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
				fill				: 0xfafafa,
				fillGradientType	: 1,
				align				: "center",
				valign				: "center",
				letterSpacing		: 0.5,
				lineHeight			: 0,
				padding				: 0,
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
			app				: this.#app,
			type 			: "confettiSimple",
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
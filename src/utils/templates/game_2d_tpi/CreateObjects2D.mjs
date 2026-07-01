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
			fill	: 0x0096ff,
			alpha	: 1,	
			cover	: false,
		});		
		this.#app.view2d.scene.addChild( this.components["FullscreenOverlay"] );
		
		//------------------------
		
		//- World
		
		this.components["World"] = new IMPION.WorldTPI2d({
			debug			: false,
			frustumCalled	: true,
			app				: this.#app,
			gameComponent	: this.#gameComponent,
			data			: this.#app.assets.json["world"],
        });
		this.#app.view2d.scene.addChild( this.components["World"] );
		
			//-

		this.components["World"]["water"].filters = [ this.components["Shader2dDisplacement"].filter ];
		this.components["World"]["water"].alpha = 0.7;
		
		//------------------------
		
		//- PathFinder
		
		this.components["PathFinder"] = new IMPION.PathFinder2d({
			debug			: false,
			method			: "AS",
			allowDiagonal	: true,
			world			: this.components["World"],
			worldX 			: -800,
			worldY 			: -700,
			worldWX 		: 1600,
			worldWY 		: 1400,
			worldCell 		: 30,
		});
		
		//------------------------
		
		//- Hero
			
		this.components["Hero"] = new IMPION.Character2d({
            assets				: this.#app.assets,
            sprite				: "character",
			forceWalk 			: 40.0,
			forceRun 			: 80.0,
			//anchor			: {x: 0.5, y:0.8},			
			position			: {x: 0, y: -250},
			debug				: false,
			autoBreath			: true,
			mirrorX				: true,
			autoRotation		: false,
			isAI				: false,
        });
		this.#app.physics2d.addCharacter( this.components["Hero"] );
		this.components["World"]["elementsLayer"].addChild( this.components["Hero"] );
	
		this.components["Hero"].shadow = new IMPION.Sprite2d();
		this.components["Hero"].shadow.texture = this.#app.assets.textures.pixi["character_shadow"];
		this.components["Hero"].shadow.anchor.set(0.5);
		this.components["Hero"].addChild( this.components["Hero"].shadow );
		
		this.components["Hero"].scale.set(0.5);
		
		this.components["Hero"].action["idle"].position.x = 0;
		this.components["Hero"].action["idle"].position.y = 0;
		
		this.components["Hero"].action["run"].position.x = 0;
		this.components["Hero"].action["run"].position.y = 0;
		
		this.components["Hero"].actionPool["idle"] = ["idle"];
		this.components["Hero"].actionPool["run"] = ["run"];
		this.components["Hero"].actionPool["walk"] = [];
				
		this.components["Hero"].setActionPool("idle");	
		
		this.components["World"]["camera"].targetObject = this.components["Hero"];
		
		//- People
		
		for(let i=0; i<5; i++){
			this.components["People_"+i] = new IMPION.Character2d({
				assets				: this.#app.assets,
				sprite				: "character",
				forceWalk 			: 40.0,
				forceRun 			: 60.0,
				//anchor			: {x: 0.5, y:0.8},			
				position			: {x: 150-150*2*Math.random(), y: -200+100*Math.random()},
				debug				: false,
				autoBreath			: true,
				mirrorX				: true,
				autoRotation		: false,
				isAI				: true,
			});
			this.#app.physics2d.addCharacter( this.components["People_"+i] );
			this.components["World"]["elementsLayer"].addChild( this.components["People_"+i] );
			
			this.components["People_"+i].scale.set(0.5);
		
			this.components["People_"+i].shadow = new IMPION.Sprite2d();
			this.components["People_"+i].shadow.texture = this.#app.assets.textures.pixi["character_shadow"];
			this.components["People_"+i].shadow.anchor.set(0.5);
			this.components["People_"+i].addChild( this.components["People_"+i].shadow );
			
			this.components["People_"+i].action["idle"].position.x = 0;
			this.components["People_"+i].action["idle"].position.y = 0;
			
			this.components["People_"+i].action["run"].position.x = 0;
			this.components["People_"+i].action["run"].position.y = 0;
			
			this.components["People_"+i].actionPool["idle"] = ["idle"];
			this.components["People_"+i].actionPool["run"] = ["run"];
			this.components["People_"+i].actionPool["walk"] = [];
					
			this.components["People_"+i].setActionPool("idle");	
			
			this.components["People_"+i].commandToPoints(this.components["PathFinder"], [
				{x:300-300*2*Math.random(), y:300-300*2*Math.random()},
				{x:300-300*2*Math.random(), y:300-300*2*Math.random()},
				{x:300-300*2*Math.random(), y:300-300*2*Math.random()},
			]);
		}
		
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
		
		//- Logo
		
        this.components["Logo"] = new IMPION.SpriteText({
            texture				: this.#app.assets.textures.pixi["ui_logo"],
			positionRelative 	: {vertical: {x: -0.5, y: -0.5}, horizontal: {x: -0.5, y: -0.5}},
			positionAbsolute 	: {vertical: {x: 160, y: 100}, horizontal: {x: 160, y: 80}},
			scaleAbsolute 		: {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
			rotationAbsolute 	: {vertical: 0, horizontal: 0}
        });
		this.#app.view2d.scene.addChild( this.components["Logo"] );
		
		//- Joystick
		
		this.components["Joystick"] = new IMPION.Joystick({
            textureBg			: this.#app.assets.textures.pixi["ui_joystick_bg"],
            textureBar			: this.#app.assets.textures.pixi["ui_joystick_bar"],
			positionRelative 	: {vertical: {x: 0, y: 0.5}, horizontal: {x: 0.5, y: 0.5}},
			positionAbsolute 	: {vertical: {x: 0, y: -300}, horizontal: {x: -200, y: -200}},
			scaleAbsolute 		: {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
			rotationAbsolute 	: {vertical: 0, horizontal: 0}
        });
		this.#app.view2d.scene.addChild( this.components["Joystick"] );
		
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
        }).playAnimation("circle");
		this.#app.view2d.scene.addChild( this.components["Cursor"] );

		//- Task
		
        this.components["Task"] = new IMPION.SpriteText({
            textures				: [
				//this.#app.assets.textures.pixi["uiTaskBg"],
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
					//new IMPION.OutlineFilter(2, 0x111111, 0.3),
					//new IMPION.DropShadowFilter({
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
            textureOn		: this.#app.assets.textures.pixi["ui_btn_sound_on"],
            textureOff		: this.#app.assets.textures.pixi["ui_btn_sound_off"],
            soundManager	: this.#app.soundManager
        });
		this.#app.view2d.scene.addChild( this.components["ButtonSound"] );
		
	}
}
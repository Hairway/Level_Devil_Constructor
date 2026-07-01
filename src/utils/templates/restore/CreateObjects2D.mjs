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
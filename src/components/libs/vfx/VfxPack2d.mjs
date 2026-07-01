import * as IMPION from "#impion";

export default class VfxPack2d extends IMPION.Component2d{

	componentType2D = true;
	componentType3D = false;
	
	#app;
	#type;	
	#settings;

	//------------------------------------------------------------------------

	constructor({		
		app,
		
		type,
		settings,
		
		fps = 60,
		order = "",
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
		asBitmap = false,
		borderBitmap = 0,	
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute, asBitmap, borderBitmap);
		
		this.#app = app;

		this.#type = type;
		this.#settings = settings;
		
		//-
		
		if(this.#type == "tested"){
			//this.add( this.#fireSimple(settings) );
			//return this;
		}else if(this.#type == "confettiSimple"){
			return this.#confettiSimple(settings);
		}
	}
	
	//------------------------------------------------------------------------

	#confettiSimple(settings){
		let particles;
		if(settings && settings.particles){
			particles = settings.particles;
		}else{
			particles = [
				this.#app.assets.textures.pixi["vfx_confetti_0"],
				this.#app.assets.textures.pixi["vfx_confetti_1"],
				this.#app.assets.textures.pixi["vfx_confetti_2"],		
				this.#app.assets.textures.pixi["vfx_confetti_3"],		
			];
		}

		return new IMPION.Emitter2d({
			quantity			: 60,
			particles 			: particles,
			
			world				: {type:"rect", x:0, y:0, dx:2000, dy:2000},
			spawn				: {type:"rect", x:0, y:0, dx:0, dy:0},
			
			scale				: {x:1.0, y:1.0, dx:0.4, dy:0.0, sync:true},
			rotation			: {a:0, da:4},
			opacity				: {a:1, da:0, easeIn:true},
			
			gravity				: {x:0, y:0.8},
			friction			: {x:0.02, y:0, sx:0, sy:0, r:0, opacity:0},
			
			velocity			: {x:0, y:-30, dx:15, dy:20},				
			velocityScale		: {x:-0.02, y:0, dx:0.01, dy:0, sync:true},				
			velocityOpacity		: {a:0, da:0.0},				
			velocityAngular		: {a:0, da:0.2},
		});
	}

	//------------------------------------------------------------------------

    //enterframe = ( timeDelta )=>{		
	//
    //}

	//------------------------------------------------------------------------

	//resize = (width, height)=>{
	//
	//}

}

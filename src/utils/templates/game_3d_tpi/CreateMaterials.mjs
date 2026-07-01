import * as IMPION from "#impion";

export default class CreateMaterials{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
				
		//-
		
		let phoneData = this.#app.getPhoneData();
		
		//-
			
		this.materials["vfxDust"] = new IMPION.SpriteMaterial3d({
			map				: this.#app.assets.textures.three["vfx_smoke"],
			//blending		: IMPION.AdditiveBlending,
			depthWrite		: false,
			transparent		: true,
			sizeAttenuation	: true,			
			color			: new IMPION.Color3d(0xf6eed3),
		});
			//	
	//	//-
	//		
	//	this.materials["labelHero"] = new IMPION.SpriteMaterial3d({
	//		map				: new IMPION.TextureFromCanvas3d({width:256, height:256, isMask:false}),
	//		//blending		: IMPION.AdditiveBlending,
	//		depthWrite		: false,
	//		transparent		: true,
	//		sizeAttenuation	: true,			
	//		color			: new IMPION.Color3d(0xf5f5f5),
	//	});	
	}
}
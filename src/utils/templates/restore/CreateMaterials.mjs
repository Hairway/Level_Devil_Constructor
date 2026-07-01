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
			
		this.materials["vfxFire"] = new IMPION.SpriteMaterial3d({
			map				: this.#app.assets.textures.three["vfx_spark"],
			depthWrite		: false,
			transparent		: true,
			sizeAttenuation	: true,			
			blending		: IMPION.AdditiveBlending,		
			color			: new IMPION.Color3d(0xffffff),
		});	
			
		this.materials["vfxSmoke_0"] = new IMPION.SpriteMaterial3d({
			map				: this.#app.assets.textures.three["vfx_smoke"],
			depthWrite		: false,
			transparent		: true,
			sizeAttenuation	: true,			
			color			: new IMPION.Color3d(0x424353),
		});	
			
		this.materials["vfxSmoke_1"] = new IMPION.SpriteMaterial3d({
			map				: this.#app.assets.textures.three["vfx_smoke"],
			depthWrite		: false,
			transparent		: true,
			sizeAttenuation	: true,			
			color			: new IMPION.Color3d(0x232430),
		});	
		
		this.materials["vfxSpark"] = new IMPION.SpriteMaterial3d({
			map				: this.#app.assets.textures.three["vfx_spark"],
			depthWrite		: false,
			transparent		: true,
			sizeAttenuation	: true,	
			blending		: IMPION.AdditiveBlending,		
		});	
		
	}
}
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
			
		this.materials["world"] = new IMPION.MeshLambertMaterial3d({
            map			: this.#app.assets.textures.three["texture_world"], 
            color		: new IMPION.Color3d(0xffffff),
            emissive	: new IMPION.Color3d(0x000000)
        });
		this.materials["world"].shaders = [	
			
		];
		
		//-
			
		this.materials["dust"] = new IMPION.SpriteMaterial3d({
			map				: this.#app.assets.textures.three["vfx_circle"],
			depthWrite		: false,
			transparent		: true,
			sizeAttenuation	: true,			
			color			: new IMPION.Color3d(0xffffff),
		});	
		
	}
}
import * as THREE from "three";
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
			
		this.materials["world"] = new THREE.MeshLambertMaterial({
            map			: this.#app.assets.textures.three["texture_world"], 
            color		: new THREE.Color(0xffffff),
            emissive	: new THREE.Color(0x000000)
        });
		this.materials["world"].shaders = [	
			
		];
		
		//-
			
		this.materials["dust"] = new THREE.SpriteMaterial({
			map				: this.#app.assets.textures.three["vfx_circle"],
			depthWrite		: false,
			transparent		: true,
			sizeAttenuation	: true,			
			color			: new THREE.Color(0xffffff),
		});	
		
	}
}
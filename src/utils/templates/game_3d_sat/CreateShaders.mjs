import * as THREE from "three";
import * as PIXI from "pixi.js";
import * as IMPION from "#impion";

export default class CreateShaders{
	
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
		//console.log( phoneData )
		
		//-
		
		//this.components["Shader3dMixFour_0"].uTextureMap_0 = this.#app.assets.textures.three["texture_ground_0"];
        //this.components["Shader3dMixFour_0"].uTextureMap_1 = this.#app.assets.textures.three["texture_ground_1"];
        //this.components["Shader3dMixFour_0"].uTextureMap_2 = this.#app.assets.textures.three["texture_ground_2"];
        //this.components["Shader3dMixFour_0"].uTextureMap_3 = this.#app.assets.textures.three["texture_ground_3"];
		
		//-

	//	this.components["Shader3dVerticalFog"] = new IMPION.Shader3dVerticalFog({
	//		uColor 	: new THREE.Color(0x29c8f6),
	//		uY0 	: -1.5,
	//		uY1 	: -0.5,
	//	});	
	//	
	//	this.components["Shader3dShadowMap"] = new IMPION.Shader3dShadowMap({
	//		uIntensity	 	: 1.0,
	//		uTexture	 	: this.#app.assets.textures.three["textureGroundShadow"],
	//		orderShader		: 101,
	//	});	
	//	
	//	this.components["Shader3dWaterBorder"] = new IMPION.Shader3dWaterBorder({
	//		uTexture	: this.#app.assets.textures.three["textureWaterBorder"],
	//		uNoise		: this.#app.assets.textures.three["vfxNoise"],
	//		uSize		: 0.30,
	//		uAlpha		: 0.05,
	//	});

	//	this.components["Shader3dTint"] = new IMPION.Shader3dTint({
	//		uColor 			: new THREE.Color(0xcccccc),
	//		uTint 			: 0,
	//		uBrightness 	: 1,
	//		orderShader		: 200,
	//	});	

	}
}
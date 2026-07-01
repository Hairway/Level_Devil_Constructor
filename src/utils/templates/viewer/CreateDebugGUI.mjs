import * as THREE from "three";
import * as PIXI from "pixi.js";
import {gsap} from "gsap";
import {GUI} from "three/addons/libs/lil-gui.module.min.js";

import Debug3dGUI from "./components/core/debugger/Debug3dGUI.mjs";

export default class CreateDebugGUI extends Debug3dGUI{
	
	#app;
	#gameComponent;

	guiObject;
	#guiClosed = false;
	#isUserGUI = false;

	constructor({app, gameComponent}){
		super({app:app, gameComponent:gameComponent});
		
		this.#app = app;
		this.#gameComponent = gameComponent;
		this.components = gameComponent.components;

		//-
		
		this.createUserGUI();

	}
	
	createUserGUI(){
	//	this.resetGUI();
	//	
	//	this.#isUserGUI = true;
	//	
	//	let folder = this.guiObject.addFolder('Cube');
	//	
	//	folder.add(this.components["World"]["Cube"].rotation, 'x', 0, Math.PI * 2);
	//	folder.add(this.components["World"]["Cube"].rotation, 'y', 0, Math.PI * 2);
	//	folder.add(this.components["World"]["Cube"].rotation, 'z', 0, Math.PI * 2);
	//	
	//	let materials = {
	//		'Material 1': new THREE.MeshLambertMaterial({ color: 0xff0000 }),
	//		'Material 2': new THREE.MeshLambertMaterial({ color: 0x00ff00 }),
	//		'Material 3': new THREE.MeshLambertMaterial({ color: 0x0000ff })
	//	};
	//	
	//	let materialParams = {selectedMaterial: 'Material 1'};
	//	
	//	this.components["World"]["Cube"].material = materials[materialParams.selectedMaterial];
	//	
	//	folder.add(materialParams, 'selectedMaterial', Object.keys(materials)).onChange((value)=>{
	//		this.components["World"]["Cube"].material = materials[value];
	//	});
	//	
	//	folder.add(this.components["World"]["Cube"], 'visible');
	//	
	//	folder.open();
	}
}
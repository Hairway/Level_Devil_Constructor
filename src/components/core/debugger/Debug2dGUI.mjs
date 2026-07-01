import * as IMPION from "#impion";
import {GUI} from "three/addons/libs/lil-gui.module.min.js";

export default class Debug2dGUI{
	
	#app;
	#gameComponent;

	guiObject;
	#guiClosed = false;
	#isUserGUI = false;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;
		this.components = gameComponent.components;
	}
	
	resetGUI(){
		if(this.guiObject){
			this.#guiClosed = this.guiObject._closed;
			this.guiObject.destroy();
		}else{
			this.#guiClosed = false;
		}
		
		this.guiObject = new GUI();

	}
	
	createObjectGUI( object ){
		if(this.#isUserGUI){ return false; }
		
		this.resetGUI();
				
		//-
	
		if(object){
			
			let folderObject = this.guiObject.addFolder( "Object" );
			this.addObjectParamsGUI(folderObject, object);
			folderObject.open();
		
		}
		
		if(this.#guiClosed){
			this.guiObject.close();
		}else{
			this.guiObject.open();
		}
	}
	
	addObjectParamsGUI( folder, object ){
		
		//- position
		
		folder.add(object, 'x', -1000, 1000).name("position x").step(0.01);
		folder.add(object, 'y', -1000, 1000).name("position y").step(0.01);
		
		//- scale
		
		folder.add(object.scale, 'x', -2, 2).name("scale x").step(0.01);
		folder.add(object.scale, 'y', -2, 2).name("scale y").step(0.01);
		
		//- skew
		
		folder.add(object.skew, 'x', -2, 2).name("skew x").step(0.01);
		folder.add(object.skew, 'y', -2, 2).name("skew y").step(0.01);
		
		//- rotation
		
		folder.add(object, 'rotation', 0, 2*Math.PI).step(0.01);
		
		//- alpha
		
		folder.add(object, 'alpha', 0, 1).step(0.01);
		
		//- visible
		
		folder.add(object, 'visible');
	}
	
}
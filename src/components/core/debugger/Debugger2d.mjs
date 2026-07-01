import * as PIXI from "pixi.js";

import ComponentEmpty from "../view/ComponentEmpty.mjs";

import Stats from "stats.js";

export default class Debugger2d extends ComponentEmpty{

	type = "debugger2d";
	
	#app;	
	#mouse = {x:0, y:0};
	
	#console;
	#gui;
	#fpsHelper;
	#gridHelper;
	#axesHelper;
	#selectedObject;
	#selectedRect = new PIXI.Graphics();
	#moveForward = false;
	#moveBackward = false;
	#moveLeft = false;
	#moveRight = false;
	#sprites2d = [];

	#componentsDebug = [];
	
	//------------------------------------------------------------------------
	
	constructor({
		app,
		
		ruler = false,
		console = true,
		spritesHelper = true,
		fpsHelper = true,
		gridHelper = true,
		axesHelper = true,
		
		gui,
		components = [],
		
		fps = 60,
		order = "pre"
	}){
		super(fps, order);
		
		//-
		
		this.#app = app;
		this.#console = console;
		this.#componentsDebug = components;
		this.#gui = gui;
			
		this.#sprites2d = this.#getAllSprites( this.#app.view2d.scene );
		
		//-
		
		if(ruler){ this.#app.debugRuler.show(); }
		if(this.#console){ this.getRendererInfo(); }
		if(fpsHelper){ this.addFpsHelper(); }
		if(axesHelper){ this.addAxesHelper( 200 ); }
		if(gridHelper){ this.addGridHelper( 50 ); }	
		if(spritesHelper){ this.addSpritesHelper(); }		
		this.addComponentsHelper();
		
		//-
		
		window.addEventListener('keydown', this.onDebugger2dKeyDown);
		window.addEventListener('keyup', this.onDebugger2dKeyUp);
		
		//-
		
		this.#app.add( this.type, this );
    }

	//------------------------------------------------------------------------
	
	getRendererInfo(){
	
	}
	
	addSpritesHelper(){
		
		if(this.#app.components["FullscreenOverlay"]){
			this.#app.components["FullscreenOverlay"].removeAllListeners(); 
		}
		
		for(let i=0; i<this.#sprites2d.length; i++){
			this.#sprites2d[i].removeAllListeners(); 
			this.#sprites2d[i].eventMode = "static";
			this.#sprites2d[i].on('pointerdown', this.onDebugger2dClick);
		}
	}
	
	addComponentsHelper(){
		for(let i=0; i<this.#componentsDebug.length; i++){
			console.log(this.#componentsDebug[i])
			if(this.#componentsDebug[i].showDebugger){
				this.#componentsDebug[i].showDebugger( this.#app );
			}
		}
	}
	
	addFpsHelper(){
		this.#fpsHelper = new Stats();
		this.#fpsHelper.showPanel( 0 );
		document.body.appendChild( this.#fpsHelper.dom );
		
		this.#app.enterframeManager.setStats( this.#fpsHelper );
	}
	
	addGridHelper( size ){
		this.gridHelper = new PIXI.Graphics();
		this.gridHelper.lineStyle(1, 0xffffff, 0.3);
		for(let i=0; i<40; i++){
			this.gridHelper.moveTo(size*(i-20), -1000);
			this.gridHelper.lineTo(size*(i-20), +1000);
		}
		for(let i=0; i<40; i++){
			this.gridHelper.moveTo(-1000, size*(i-20));
			this.gridHelper.lineTo(+1000, size*(i-20));
		}
		this.#app.view2d.scene.addChildAt( this.gridHelper, 1);
	}	
		
	addAxesHelper( size ){
		this.axesHelper = new PIXI.Graphics();
		this.axesHelper.lineStyle(3, 0xff0000);
		this.axesHelper.moveTo(0, 0);
		this.axesHelper.lineTo(size, 0);
		this.axesHelper.lineStyle(3, 0x00ff00);
		this.axesHelper.moveTo(0, 0);
		this.axesHelper.lineTo(0, size);
		this.#app.view2d.scene.addChildAt( this.axesHelper, 1);
	}	
		
	#getAllSprites( container ) {
		let sprites2d = [];
		container.children.forEach(child => {
			if(child instanceof PIXI.Sprite || child instanceof PIXI.Graphics) {
				sprites2d.push(child);
			}else if(child.attachment && child.attachment.bones) {
				sprites2d.push( child.parent );
			}else if(child instanceof IMPION.Group2d) {
				sprites2d.push(...this.#getAllSprites(child));
			}
		});
		return sprites2d;
	}

	//------------------------------------------------------------------------
	
	onDebugger2dClick = (event) => {
		
		//this.#app.view2d.scene.toLocal( event.global, null, this.#mouse);
		if(this.#selectedObject){
			
		}
	
		this.#selectedObject = event.target;
			
		if(this.#selectedRect.parent){
			this.#selectedRect.parent.removeChild( this.#selectedRect );
		}	
			
		this.#selectedRect.clear();
		this.#selectedRect.lineStyle(2, 0xfffc00);
		this.#selectedRect.drawRect(
			-this.#selectedObject.width*0.5,
			-this.#selectedObject.height*0.5,
			this.#selectedObject.width,
			this.#selectedObject.height,
		);
		
		this.#selectedRect.x = 0;
		this.#selectedRect.y = 0;
		
		if(this.#selectedObject.anchor){
			this.#selectedRect.x -= this.#selectedObject.width * (this.#selectedObject.anchor.x - 0.5);
			this.#selectedRect.y -= this.#selectedObject.height * (this.#selectedObject.anchor.y - 0.5);
		}
		
		this.#selectedObject.addChild( this.#selectedRect );
		
		if(this.#console){
			console.log( this.#selectedObject )
		}
			
		if(this.#gui){
			this.#gui.createObjectGUI( this.#selectedObject );
		}
		
	}
	
	onDebugger2dKeyDown = (event) => {
	
		switch (event.key) {
			case 'ArrowUp':
				this.#moveForward = true;
				break;
			case 'ArrowLeft':
				this.#moveLeft = true;
				break;
			case 'ArrowDown':
				this.#moveBackward = true;
				break;
			case 'ArrowRight':
				this.#moveRight = true;
				break;
			case 'w':
				this.#moveForward = true;
				break;
			case 'a':
				this.#moveLeft = true;
				break;
			case 'd':
				this.#moveRight = true;
				break;
			case 'g':
				
				break;
			case 'r':
				
				break;
			case 's':				
				
				this.#moveBackward = true;
				break;
			case 'i':				
				if(this.#selectedObject){
					console.log( this.#selectedObject )
				}
				break;
			case 'Delete':				
				if(this.#selectedObject){
					this.#selectedObject.visible = !this.#selectedObject.visible;
				}
				break;
			case '.':

				break;
			
		}
	}
	
	onDebugger2dKeyUp = (event) => {
		switch (event.key) {
			case 'ArrowUp':
			case 'w':
				this.#moveForward = false;
				break;
			case 'ArrowLeft':
			case 'a':
				this.#moveLeft = false;
				break;
			case 'ArrowDown':
			case 's':
				this.#moveBackward = false;
				break;
			case 'ArrowRight':
			case 'd':
				this.#moveRight = false;
				break;
		}
	}
		
	updateCameraPosition = ()=>{
	    const moveSpeed = 0.3;
	
		//if(this.#moveForward){ this.#app.view3d.camera.position.addScaledVector(this.#directionCamera, moveSpeed); }
		//if(this.#moveBackward){ this.#app.view3d.camera.position.addScaledVector(this.#directionCamera, -moveSpeed); }
		//if(this.#moveLeft){ this.#app.view3d.camera.position.addScaledVector(this.#rightCamera, -moveSpeed); }
		//if(this.#moveRight){ this.#app.view3d.camera.position.addScaledVector(this.#rightCamera, moveSpeed); }
			
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{  		
		this.updateCameraPosition();
    }
	
	//------------------------------------------------------------------------
	
	//resize = (width, height)=>{  		
	//	
    //}
}
import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class WorldTPI2d extends IMPION.Component2d{

    /**
	* Creates an instance of WorldTPI2d.
	* @param {Object} config - Configuration object for the world.
	* @param {Object} config.app - Reference to the application.
	* @param {Object} config.assets - Assets available for the world.
	* @param {string} config.data - JSON string representing the world's structure.
	* @param {boolean} [config.debug=false] - Whether to enable debugging.
	* @param {boolean} [config.frustumCalled=true] - Whether frustum culling is enabled.
	* @param {number} [config.fps=60] - Frames per second.
	* @param {string} [config.order=""] - Rendering order.
	* @param {Object} [config.positionRelative] - Relative position.
	* @param {Object} [config.positionAbsolute] - Absolute position.
	* @param {Object} [config.scaleAbsolute] - Absolute scaling.
	* @param {Object} [config.rotationAbsolute] - Absolute rotation.
	* @param {boolean} [config.asBitmap=false] - Whether to render as a bitmap.
	* @param {number} [config.borderBitmap=0] - Bitmap border size.
	*/

	componentType2D = false;
	componentType3D = false;
		
	#data;
	#app;
	#gameComponent;
	#prefabs;
	#debug;
	components;

	physicalWalls;

	#frustumCalled = true;
	#frustumObjects = [];
	
	#width = 0;
	#height = 0;
	
	//------------------------------------------------------------------------

	constructor({
		app,
		data,
		
		debug = false,
		frustumCalled = true,
		
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

		//-
		
		this.#app = app;

		this.#debug = debug;
		this.#frustumCalled = frustumCalled;
		
		this.#data = data;
		
		//-

		this.#prefabs = this.#data.prefabs;
		
		//-
	
		this.#app.physics2d.setGravity(0, 0);
		
		//-
	
		this.cameraShake = new IMPION.Group2d();
		this.animationContainer.addChild( this.cameraShake );

			this.cameraScale = new IMPION.Group2d();
			this.cameraShake.addChild( this.cameraScale );

				this.camera = new IMPION.Group2d();
				this.camera.lookK = 0.8;
				this.cameraScale.addChild( this.camera );

					this.layersContainer = new IMPION.Group2d();
					this.camera.addChild( this.layersContainer );

					this.debugContainer = new IMPION.Graphics2d();
					this.camera.addChild( this.debugContainer );

		//-

		for(let layerName in this.#data.layers){
			this[layerName] = new IMPION.Group2d();
			this.layersContainer.addChild( this[layerName] );
				
				for(let i=0; i<this.#data.layers[layerName].length; i++){
					
					//- element
					
					this.addPrefab(
						this.#prefabs[ this.#data.layers[layerName][i].prefab ].texture,
						this.#data.layers[layerName][i],
						layerName
					);
						
					//- physicalWalls
					
					if(this.#prefabs[ this.#data.layers[layerName][i].prefab ].physicalWalls){
						for(let j=0; j<this.#prefabs[ this.#data.layers[layerName][i].prefab ].physicalWalls.length; j++){
							this.#prefabs[ this.#data.layers[layerName][i].prefab ].physicalWalls[j].x += this.#data.layers[layerName][i].x;
							this.#prefabs[ this.#data.layers[layerName][i].prefab ].physicalWalls[j].y += this.#data.layers[layerName][i].y;
							
							this.#data.physicalWalls.push( this.#prefabs[ this.#data.layers[layerName][i].prefab ].physicalWalls[j] );
						}
					}
										
				}
		}
		
		for(let layerName in this.#data.layers){
			for(let i=0; i<this.#data.layers[layerName].length; i++){
				
				//- shadow
				
				if(this.#prefabs[ this.#data.layers[layerName][i].prefab ].textureShadow){
					let elementWorld = this.addPrefab(
						this.#prefabs[ this.#data.layers[layerName][i].prefab ].textureShadow,
						this.#data.layers[layerName][i],
						"shadowsLayer"
					);						
				}
				
			}
		}
		
		//- physics
				
		for(let i=0; i<this.#data.physicalWalls.length; i++){
			this.#app.physics2d.add(this.#data.physicalWalls[i], {mass:0, shape: this.#data.physicalWalls[i].shape});
		}
		
		this.physicalWalls = this.#data.physicalWalls;
		
		//-

		if(this.#debug){
			this.showDebugger( this.#app );
		}

		//-

		return this;
    }

	//------------------------------------------------------------------------
	
	addPrefab(name, settings, layerName){
		settings = Object.assign({
			label 		: "",
			x 			: 0,
			y 			: 0,
			blendMode 	: 0,
			alpha 		: 1,
			rotation 	: 0,
			anchor 		: {x:0.5, y:0.5},
			skew 		: {x:0.0, y:0.0},
			scale 		: {x:1, y:1},
		}, settings);
		
		let elementWorld;

		if(settings.tile){
			elementWorld = new IMPION.TilingSprite2d({
				texture	: this.#app.assets.textures.pixi[ name ],
				width	: settings.w,
				height	: settings.h,
			});	
			elementWorld = Object.assign(elementWorld, settings);
			elementWorld.userData = {name: name};
		}else{
			elementWorld = new IMPION.Sprite2d();
			elementWorld.texture = this.#app.assets.textures.pixi[ name ];		
			elementWorld = Object.assign(elementWorld, settings);
			elementWorld.userData = {name: name};
		}
		
		if(settings.label != ""){
			this[settings.label] = elementWorld;
		}
		
		this[layerName].addChild( elementWorld );
			
		this.#frustumObjects.push( elementWorld );	
	}
	
	//------------------------------------------------------------------------
	
	showDebugger( app ){
		this.#debug = true;
		
		this.debugContainer.clear();
		
		for(let i=0; i<this.#data.physicalWalls.length; i++){
			if(this.#debug){
				if(this.#data.physicalWalls[i].shape == "circle"){
					
					this.debugContainer.circle(
						this.#data.physicalWalls[i].x,
						this.#data.physicalWalls[i].y,
						this.#data.physicalWalls[i].wx*0.5,
						0,
						2*Math.PI
					);

					this.debugContainer.moveTo(this.#data.physicalWalls[i].x, this.#data.physicalWalls[i].y);
					this.debugContainer.lineTo(
						this.#data.physicalWalls[i].x + this.#data.physicalWalls[i].wx * Math.cos(this.#data.physicalWalls[i].rotation),
						this.#data.physicalWalls[i].y + this.#data.physicalWalls[i].wx * Math.sin(this.#data.physicalWalls[i].rotation)
					);		
					
				}else if(this.#data.physicalWalls[i].shape == "box"){
					
					let width = this.#data.physicalWalls[i].wx;
					let height = this.#data.physicalWalls[i].wy;
					let angle = this.#data.physicalWalls[i].rotation;
					let x = this.#data.physicalWalls[i].x;
					let y = this.#data.physicalWalls[i].y;
				
					let vertices = [
						[-width*0.5, -height*0.5],
						[+width*0.5, -height*0.5],
						[+width*0.5, +height*0.5],
						[-width*0.5, +height*0.5]
					];
					
					let rotatedVertices = vertices.map(vertex => {
						const rotatedX = vertex[0] * Math.cos(angle) - vertex[1] * Math.sin(angle);
						const rotatedY = vertex[0] * Math.sin(angle) + vertex[1] * Math.cos(angle);
						return [rotatedX + x, rotatedY + y];
					});
						
					this.debugContainer.moveTo(rotatedVertices[0][0], rotatedVertices[0][1]);
					for (let j = 1; j < rotatedVertices.length; j++) {
						this.debugContainer.lineTo(rotatedVertices[j][0], rotatedVertices[j][1]);
					}
					this.debugContainer.lineTo(rotatedVertices[0][0], rotatedVertices[0][1]);
					
					this.debugContainer.moveTo(rotatedVertices[0][0], rotatedVertices[0][1]);
					this.debugContainer.lineTo(rotatedVertices[2][0], rotatedVertices[2][1]);	
					
				}
			}
			
			this.#app.physics2d.add(this.#data.physicalWalls[i], {mass:0, shape: this.#data.physicalWalls[i].shape});
		}
		
		this.debugContainer.stroke({width:2, color:0xfff600, alpha:1});
	}
	
	//------------------------------------------------------------------------
	
	shake( strength = 1, duration = 0.6){
		strength = 10*strength;
	
		gsap.killTweensOf( this.cameraShake );
		
		gsap.to(this.cameraShake,		0.05, 			{delay:0.00, overwrite: "none", x:"+="+(0.5*strength - strength*Math.random()), y:"+="+(0.5*strength - strength*Math.random())});
		gsap.to(this.cameraShake,		duration, 		{delay:0.05, overwrite: "none", x:0, y:0, ease:"elastic.out"});
	}
	
	shakeX( strength = 1, duration = 0.6){
		strength = 10*strength;
	
		gsap.killTweensOf( this.cameraShake );
		
		gsap.to(this.cameraShake,		0.05, 			{delay:0.00, overwrite: "none", x:"+="+(0.5*strength - strength*Math.random())});
		gsap.to(this.cameraShake,		duration, 		{delay:0.05, overwrite: "none", x:0, y:0, ease:"elastic.out"});
	}
	
	shakeY( strength = 1, duration = 0.6){
		strength = 10*strength;
	
		gsap.killTweensOf( this.cameraShake );
		
		gsap.to(this.cameraShake,		0.05, 			{delay:0.00, overwrite: "none", y:"+="+(0.5*strength - strength*Math.random())});
		gsap.to(this.cameraShake,		duration, 		{delay:0.05, overwrite: "none", x:0, y:0, ease:"elastic.out"});
	}
	
	sortLayers(){

		this["elementsLayer"].children.sort( Math.sortY );
		
	}
	
	updateCameraLook(){
		let objTemp = this["camera"];
		
		if(objTemp.targetObject && !this.#debug){
			objTemp.x = -objTemp.targetObject.x - objTemp.lookK*(-objTemp.targetObject.x - objTemp.x);
			objTemp.y = -objTemp.targetObject.y - objTemp.lookK*(-objTemp.targetObject.y - objTemp.y);
		}
	}

	frustumCall(){
		if(this.#frustumCalled){
			for(let i=0; i<this.#frustumObjects.length; i++){
				let obj = this.#frustumObjects[i];
				
				obj.visible = true;
				
				obj.gxr = (obj.x + obj.width*0.5 + this.camera.x)*this.cameraScale.scale.x;
				obj.gxl = (obj.x - obj.width*0.5 + this.camera.x)*this.cameraScale.scale.x;
				obj.gyb = (obj.y + obj.height*0.5 + this.camera.y)*this.cameraScale.scale.x;
				obj.gyt = (obj.y - obj.height*0.5 + this.camera.y)*this.cameraScale.scale.x
				
				if(obj.gxr < -this.#width*0.5-20){
					obj.visible = false;
				}else if(obj.gxl > +this.#width*0.5+20){
					obj.visible = false;
				}else if(obj.gyb < -this.#height*0.5-20){
					obj.visible = false;
				}else if(obj.gyt > +this.#height*0.5+20){
					obj.visible = false;
				}	
				
			}
		}
	}

	//------------------------------------------------------------------------

	enterframe = ( timeDelta ) => {
		
		this.sortLayers();
		this.updateCameraLook();
		this.frustumCall();
		
    }

	resize = (width, height)=>{
		this.#width = width;
		this.#height = height;
    }

}

import * as IMPION from "#impion";

import Stats from "stats.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {TransformControls} from 'three/addons/controls/TransformControls.js';

export default class Debugger3d extends IMPION.ComponentEmpty{

	type = "debugger3d";
	
	#app;
	
	#console;
	#gui;
	#hide2d;
	#rebootCamera;
	#raycaster = new IMPION.Raycaster3d();
	#mouse = new IMPION.Vector2();
	#fpsHelper;
	#gridHelper;
	#axesHelper;
	#transformControls;
	#orbitControls;
	#selectedObject;
	#moveForward = false;
	#moveBackward = false;
	#moveLeft = false;
	#moveRight = false;
	#velocityCamera = new IMPION.Vector3();
	#directionCamera = new IMPION.Vector3();
	#rightCamera = new IMPION.Vector3();
	#componentsDebug = [];
	
	//------------------------------------------------------------------------
	
	constructor({
		app,
		
		ruler = false,
		hide2d = false,
		rebootCamera = true,
		console = true,
		fpsHelper = true,
		gridHelper = true,
		axesHelper = true,
		lightsHelper = true,
		transformControls = true,
		orbitControls = true,
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
		this.#rebootCamera = rebootCamera;
		
		if(hide2d){
			if(document.getElementById("pixi")){
				document.getElementById("pixi").style.display = "none";
			}
		}
		
		//-
		
		if(ruler){ this.#app.debugRuler.show(); }
		if(this.#console){ this.getRendererInfo(); }
		if(fpsHelper){ this.addFpsHelper(); }
		if(gridHelper){ this.addGridHelper( 50 ); }
		if(axesHelper){ this.addAxesHelper( 2 ); }
		if(transformControls){ this.addTransformControls(); }
		if(orbitControls){ this.addOrbitControls( 0.5 ); }
		if(lightsHelper){ this.addLightsHelper(); }
		this.addComponentsHelper();
		
		//-
		
		document.getElementById("three").addEventListener('click', this.onDebugger3dClick);
		window.addEventListener('keydown', this.onDebugger3dKeyDown);
		window.addEventListener('keyup', this.onDebugger3dKeyUp);

		//-
		
		this.#app.add( this.type, this );
    }

	//------------------------------------------------------------------------
	
	getRendererInfo(){
		console.log("geometries: "+this.#app.view3d.renderer.info.memory.geometries );
		console.log("textures: "+this.#app.view3d.renderer.info.memory.textures );
		console.log("materials: "+this.#app.view3d.renderer.info.programs.length );
	}
	
	addComponentsHelper(){
		for(let i=0; i<this.#componentsDebug.length; i++){
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
		this.#gridHelper = new IMPION.GridHelper3d(size, size);
		this.#gridHelper.name = "gridHelper";
		this.#app.view3d.scene.add( this.#gridHelper );
	}	
		
	addAxesHelper( size ){
		this.#axesHelper = new IMPION.AxesHelper3d(size);
		this.#axesHelper.name = "axesHelper";
		this.#app.view3d.scene.add( this.#axesHelper );
	}	
			
	addLightsHelper(){
		this.#app.view3d.scene.traverse((object) => {
			if (object.isPointLight) {
				let helper = new IMPION.PointLightHelper3d(object);
				object.helperObject = helper;
				this.#app.view3d.scene.add(helper);
			} else if (object.isDirectionalLight) {
				let helper = new IMPION.DirectionalLightHelper3d(object);
				object.helperObject = helper;
				this.#app.view3d.scene.add(helper);
			} else if (object.isSpotLight) {
				let helper = new IMPION.SpotLightHelper3d(object);
				object.helperObject = helper;
				this.#app.view3d.scene.add(helper);
			} else if (object.isHemisphereLight) {
				let helper = new IMPION.HemisphereLightHelper3d(object);
				object.helperObject = helper;
				this.#app.view3d.scene.add(helper);
			}
		});
	}		
			
	addTransformControls(){
		if(document.getElementById("pixi")){
			document.getElementById("pixi").style.pointerEvents = "none";
		}
		
		if(this.#app.components["Camera"] && this.#rebootCamera){
			if(this.#app.components["Camera"].resize){
				this.#app.components["Camera"].resize();
			}
			if(this.#app.components["Camera"].enterframe){
				this.#app.components["Camera"].enterframe();
			}
			this.#app.components["Camera"].resize = function(){};
			this.#app.components["Camera"].enterframe = function(){};
		}
		
		//-
		
		this.#transformControls = new TransformControls(
			this.#app.view3d.camera,
			this.#app.view3d.renderer.domElement
		);
			
		this.#app.view3d.scene.add( this.#transformControls.getHelper() );
		
		this.#transformControls.addEventListener('dragging-changed', (event)=>{
			if(this.#orbitControls){
				this.#orbitControls.enabled = !event.value;
			}
			
			if( this.#selectedObject.update ){
				this.#selectedObject.update();
			}
			
		});
		
		this.#transformControls.addEventListener('change', (e) => {
		//	let object = this.components["World"]["Cube"]
		//	positionDisplay.textContent = `Position: x=${object.position.x.toFixed(2)}, y=${object.position.y.toFixed(2)}, z=${object.position.z.toFixed(2)}`;
		//	rotationDisplay.textContent = `Rotation: x=${object.rotation.x.toFixed(2)}, y=${object.rotation.y.toFixed(2)}, z=${object.rotation.z.toFixed(2)}`;
		});
	}	
		
	addOrbitControls( zoomSpeed ){
		const direction = new IMPION.Vector3();
		this.#app.view3d.camera.getWorldDirection(direction);
		const target = new IMPION.Vector3();
		target.copy(this.#app.view3d.camera.position).add(direction);

		this.#orbitControls = new OrbitControls(this.#app.view3d.camera, this.#app.view3d.renderer.domElement);
		this.#orbitControls.zoomSpeed = zoomSpeed;
		
		this.#orbitControls.target.copy(target);
		this.#orbitControls.update();
	}	
		
	//------------------------------------------------------------------------
	
	onDebugger3dClick = (event) => {
		
		this.#mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.#mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	
		this.#raycaster.setFromCamera(this.#mouse, this.#app.view3d.camera);
	
		let intersects = this.#raycaster.intersectObjects(this.#app.view3d.scene.children, true);
	
		if(intersects){
			for(let i=intersects.length-1; i>=0; i--){
				if(
					intersects[i].object.name == "X" ||
					intersects[i].object.name == "Y" ||
					intersects[i].object.name == "Z" ||
					intersects[i].object.name == "XY" ||
					intersects[i].object.name == "YZ" ||
					intersects[i].object.name == "XZ" ||
					intersects[i].object.name == "XYZ" ||
					intersects[i].object.name == "XYZE" ||
					intersects[i].object.name == "E" ||
					intersects[i].object.name == "gridHelper" ||
					intersects[i].object.name == "axesHelper" ||
					intersects[i].object.tag == "helper" ||
					intersects[i].object.type == "TransformControlsPlane" ||
					intersects[i].object.type == "Line" ||
					intersects[i].object.type == "SkinnedMesh" ||
					!intersects[i].object.visible
				){		
					if(intersects[i].object.parent.type == "DirectionalLightHelper"){
						intersects.push( {object: intersects[i].object.parent} );
					}else if(intersects[i].object.type == "SkinnedMesh"){
						intersects.unshift( {object: intersects[i].object.parent} );
					}
					
					intersects.splice(i, 1);
				}
			}
		}
	
		if (intersects.length > 0) {
			
			if(this.#selectedObject && this.#selectedObject != intersects[0].object){
				if(this.#selectedObject.memory_physicsObject && this.#selectedObject.memory_physicsObject.mass != 0){
					this.#app.physics3d.add( this.#selectedObject, this.#selectedObject.memory_physicsObject);
				}
			}
			
			this.#selectedObject = intersects[0].object;
			
			//-
			
			if(this.#selectedObject.parent.light){
				this.#selectedObject = this.#selectedObject.parent;
			}else if(this.#selectedObject.parent.isEmitter){
				this.#selectedObject = this.#selectedObject.parent;
			}
			
			//-
			
			if(this.#transformControls){
				if(this.#selectedObject.light){
					this.#transformControls.attach( this.#selectedObject.light );
				}else{
					this.#transformControls.attach( this.#selectedObject );
				}
			}
			
			if(this.#gui){
				this.#gui.createObjectGUI( this.#selectedObject );
			}
			
			if(this.#console){
				if(this.#selectedObject.light){					
					console.log( this.#selectedObject.light )
				}else{
					console.log( this.#selectedObject )
				}
			}
			
			if(this.#selectedObject.physicsObject){
				this.#selectedObject.memory_physicsObject = {
					mass		: this.#selectedObject.physicsObject.mass,					
					children	: this.#selectedObject.children,					
				};
				
				if(this.#selectedObject.physicsObject.mass != 0){
					this.#app.physics3d.remove( this.#selectedObject );
				}
			}
			
		}
	}
	
	onDebugger3dKeyDown = (event) => {
	
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
				if(this.#transformControls){
					this.#transformControls.setMode('translate');
				}
				break;
			case 'r':
				if(this.#transformControls){
					this.#transformControls.setMode('rotate');
				}
				break;
			case 's':				
				if(this.#transformControls){
					this.#transformControls.setMode('scale');
				}
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

				if(this.#selectedObject){					
					let objectTarget = this.#selectedObject;
					if(this.#selectedObject.light){
						objectTarget = this.#selectedObject.light;
					}
					
					let direction = new IMPION.Vector3().subVectors(
						this.#app.view3d.camera.position,
						this.#selectedObject.position
					).normalize();
					
					this.#app.view3d.camera.position.copy(objectTarget.position).add(direction.multiplyScalar(10));
							
					this.#app.view3d.camera.lookAt( objectTarget.position );

					if(this.#orbitControls){
						this.#orbitControls.target.copy( objectTarget.position );
					}
				}
				
				break;
			case '7':

				if(this.#selectedObject){					
					let objectTarget = this.#selectedObject;
					if(this.#selectedObject.light){
						objectTarget = this.#selectedObject.light;
					}
					
					this.#app.view3d.camera.position.copy(objectTarget.position);
					this.#app.view3d.camera.position.y += 10;
					
					this.#app.view3d.camera.lookAt( objectTarget.position );

					if(this.#orbitControls){
						this.#orbitControls.target.copy( objectTarget.position );
					}
				}
				
				break;
			case '1':

				if(this.#selectedObject){					
					let objectTarget = this.#selectedObject;
					if(this.#selectedObject.light){
						objectTarget = this.#selectedObject.light;
					}
					
					this.#app.view3d.camera.position.copy(objectTarget.position);
					this.#app.view3d.camera.position.z += 10;
					
					this.#app.view3d.camera.lookAt( objectTarget.position );

					if(this.#orbitControls){
						this.#orbitControls.target.copy( objectTarget.position );
					}
				}
				
				break;
			case '3':

				if(this.#selectedObject){					
					let objectTarget = this.#selectedObject;
					if(this.#selectedObject.light){
						objectTarget = this.#selectedObject.light;
					}
					
					this.#app.view3d.camera.position.copy(objectTarget.position);
					this.#app.view3d.camera.position.x += 10;
					
					this.#app.view3d.camera.lookAt( objectTarget.position );

					if(this.#orbitControls){
						this.#orbitControls.target.copy( objectTarget.position );
					}
				}
				
				break;
		}
	}
	
	onDebugger3dKeyUp = (event) => {
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
	
		this.#directionCamera.set(0, 0, -1).applyQuaternion(this.#app.view3d.camera.quaternion);
		this.#rightCamera.set(1, 0, 0).applyQuaternion(this.#app.view3d.camera.quaternion);

		if(this.#moveForward){ this.#app.view3d.camera.position.addScaledVector(this.#directionCamera, moveSpeed); }
		if(this.#moveBackward){ this.#app.view3d.camera.position.addScaledVector(this.#directionCamera, -moveSpeed); }
		if(this.#moveLeft){ this.#app.view3d.camera.position.addScaledVector(this.#rightCamera, -moveSpeed); }
		if(this.#moveRight){ this.#app.view3d.camera.position.addScaledVector(this.#rightCamera, moveSpeed); }
		
		if(this.#moveForward){ this.#orbitControls.target.addScaledVector(this.#directionCamera, moveSpeed); }
		if(this.#moveBackward){ this.#orbitControls.target.addScaledVector(this.#directionCamera, -moveSpeed); }
		if(this.#moveLeft){ this.#orbitControls.target.addScaledVector(this.#rightCamera, -moveSpeed); }
		if(this.#moveRight){ this.#orbitControls.target.addScaledVector(this.#rightCamera, moveSpeed); }	
		
		if(this.#orbitControls && (this.#moveForward || this.#moveBackward || this.#moveLeft || this.#moveRight)){
			this.#orbitControls.update();
		}
	
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
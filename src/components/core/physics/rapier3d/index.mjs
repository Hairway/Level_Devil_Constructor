import * as THREE from "three";
import * as IMPION from "#impion";

//import * as RAPIER from "@dimforge/rapier3d-compat";
//import * as RAPIER from "./rapier.mjs";
import RapierDebugRenderer from "./RapierDebugRenderer.mjs";

export default class Physics3dRapier extends IMPION.ComponentEmpty{

	type = "physics3d";
	
	#app;
	
	world;

	//------------------------------------------------------------------------
	
	constructor({fps = 60, order = ""}){
		super(fps, order);
    }

	//------------------------------------------------------------------------
	
	showDebugger( app ){		
		if(!this.debugRenderer){
			this.debugRenderer = new RapierDebugRenderer(app.view3d.scene, this.world);
		}
	}
	
	//------------------------------------------------------------------------

	async init( app, funComplete ){
		this.#app = app;

		//await RAPIER.init({});
		await RAPIER.init();
		this.world = new RAPIER.World({ x:0, y:-9.81, z:0 });
		
		funComplete();
	}

	add = ( viewObject, settings = {} ) => {
		
		this.remove( viewObject );
		
		//-

		settings = Object.assign({
			
			mass					: 1,
			scaleSize				: 1,
			
			kinetic					: false,
			allowSleep				: false,
			
			velocity				: new THREE.Vector3(0, 1, 0),
			angularVelocity			: new THREE.Vector3(0, 0, 0),
			
			shape					: "box",
			shapes					: [],
					
		}, settings);
		
		//-
		
		if(settings.kinetic){
			viewObject.physicsObjectDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.KinematicPositionBased);
		}else if(settings.mass == 0){
			viewObject.physicsObjectDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Fixed);			
		}else{
			viewObject.physicsObjectDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic);
			//viewObject.physicsObjectDesc.setCanSleep(true);
			//viewObject.physicsObjectDesc.setSleepingThresholds(0.1, 0.1);
		}
		
		viewObject.physicsObjectDesc.setCanSleep( settings.allowSleep );		
		viewObject.physicsObjectDesc.setTranslation(viewObject.position.x, viewObject.position.y, viewObject.position.z)
		viewObject.physicsObjectDesc.setRotation(viewObject.quaternion);
		//viewObject.physicsObjectDesc.setAdditionalMass( settings.mass );
		//viewObject.physicsObjectDesc.lockTranslations()
		//viewObject.physicsObjectDesc.lockRotations()
		//viewObject.physicsObjectDesc.setLinearDamping(0.5)
		//viewObject.physicsObjectDesc.setAngularDamping(1.0);
		//viewObject.physicsObjectDesc.setEnabledRotations(true, true, true);		
		viewObject.physicsObject = this.world.createRigidBody( viewObject.physicsObjectDesc );
		
		viewObject.physicsObject.setLinvel(settings.velocity, true);
		viewObject.physicsObject.setAngvel(settings.angularVelocity, true);
		
		viewObject.physicsObject.setLinvel(settings.velocity, true);
        viewObject.physicsObject.setAngvel(settings.angularVelocity, true);
		
		viewObject.positionTo		= new THREE.Vector3(0, 0, 0);
		viewObject.quaternionTo		= new THREE.Quaternion();
		
		//-
		
		if(settings.shapes.length > 0){
			for(let i=0; i<settings.shapes.length; i++){
				this.#addShape( viewObject, settings.shapes[i] );
			}
		}else{	
			
			this.#addShape( viewObject, settings );		
		}
		
		//-
		
		viewObject.physicsObject.viewObject = viewObject;
	}
	
	#addShape( viewObject, shapeObject = {}){
		let physicsShape;
		
		//-
		
		if(!viewObject.wx || !viewObject.wy || !viewObject.wz){
			this.#calculateSize( viewObject );
		}
		
		if(!shapeObject.wx || !shapeObject.wy || !shapeObject.wz){
			this.#calculateSize( shapeObject );
		}
		
		//-
	
		shapeObject = Object.assign({
				
			shape 			: "box",
			
			wx 				: viewObject.wx,
			wy 				: viewObject.wy,
			wz 				: viewObject.wz,
			scaleSize 		: 1,
			
			position 		: new THREE.Vector3(),
			quaternion 		: new THREE.Quaternion(),
					
		}, shapeObject);
		
		//-

		if(shapeObject.shape == "box"){		
		
			physicsShape = RAPIER.ColliderDesc.cuboid(
				shapeObject.scaleSize * shapeObject.wx * 0.5,
				shapeObject.scaleSize * shapeObject.wy * 0.5,
				shapeObject.scaleSize * shapeObject.wz * 0.5
			);
		
		}else if(shapeObject.shape == "sphere"){		
			
			physicsShape = RAPIER.ColliderDesc.ball(shapeObject.scaleSize * shapeObject.wx * 0.5);
		
		}else if(shapeObject.shape == "cylinder"){		
			
			physicsShape = RAPIER.ColliderDesc.cylinder(
				shapeObject.scaleSize * shapeObject.wy * 0.5,
				shapeObject.scaleSize * shapeObject.wx * 0.5
			);

		}

		//physicsShape.setTranslation(shapeObject.position.x, shapeObject.position.y, shapeObject.position.z);
		//physicsShape.setRotation( shapeObject.quaternion );
		
		this.world.createCollider(physicsShape, viewObject.physicsObject);		
	}
	
	remove = ( viewObject ) => {
		if(viewObject.physicsObject){
			this.world.removeRigidBody( viewObject.physicsObject );	
			
			viewObject.physicsObject = null;
			viewObject.physicsCharacter = false;			
		}	
	}
	
	removeJoint = ( joint ) => {
		if(joint){
			this.world.removeImpulseJoint( joint );		
		}	
	}

	removeAll = () => {
		for(let body of this.world.bodies) {
			this.remove( body.viewObject );	
		}		
		for(let constraint of this.world.constraints) {
			this.removeJoint( constraint );
		}
	}

	//------------------------------------------------------------------------
	
	addCharacter( viewObject, settings = {} ){

		settings = Object.assign({
			
			shape 					: "sphere",
			mass 					: 40,
			
			kinetic					: true,
			allowSleep				: false,
			
			wx 						: 0.2,
			wy 						: 0.2,
			wz 						: 0.2,
			
			scaleSize 				: 1.0,
					
		}, settings);
				
		//-
		
		settings.shapes = [{
			shape 		: settings.shape,
			wx			: settings.wx * settings.scaleSize,
			wy			: settings.wy * settings.scaleSize,
			wz			: settings.wz * settings.scaleSize,
			position	: new THREE.Vector3(0, 0, 0)
		}];
			
		//-
		
		viewObject.position.y += viewObject.wy*0.5;
		
		this.add(viewObject, settings);
		
		//-
		
		viewObject.physicsCharacter 		= true;

		viewObject.wx 						= settings.wx;
		viewObject.wy 						= settings.wy;
		viewObject.wz 						= settings.wz;
		
		viewObject.angleQuaternion			= new THREE.Quaternion();
		viewObject.axisY 					= new THREE.Vector3( 0, 1, 0 );

	}
	
	removeCharacter( viewObject ){
		this.remove(viewObject);	
		viewObject.isPhysicsCharacter = false;
	}

	//------------------------------------------------------------------------
	
	#calculateSize( viewObject ){	
		if(!viewObject.isObject3D){ return false; }
	
		let quaternion = new THREE.Quaternion();
		quaternion.copy( viewObject.quaternion);		
		viewObject.rotation.set(0,0,0);
		
		let box = new THREE.Box3().setFromObject( viewObject );
		let size = box.getSize( new THREE.Vector3() );
		
		if(!size.x){
			viewObject.geometry.computeBoundingBox();
			size = viewObject.geometry.boundingBox.getSize( new THREE.Vector3() );
		}
		
		viewObject.applyQuaternion( quaternion );

		if(!viewObject.physicsSize){ viewObject.physicsSize = 1; }

		viewObject.wx = size.x * viewObject.physicsSize;
		viewObject.wy = size.y * viewObject.physicsSize;
		viewObject.wz = size.z * viewObject.physicsSize;
	}
	
	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta ) => { 
		if(this.world){
			this.world.step();
			
			let i = 0;
	
			this.world.bodies.forEach(body => {
				let physicsObject = body;
				let viewObject = body.viewObject;
				
				//-
				
				if(!viewObject.physicsCharacter){
					viewObject.position.copy( physicsObject.translation() );
					viewObject.quaternion.copy( physicsObject.rotation() );
					
				}else{
											
				//	//- sleep
				//	
				//	physicsObject.sleepState = 1;
				//							
				//	//- location
				//	
				//	viewObject.positionTo.copy( physicsObject.translation() );
				//	viewObject.quaternion.copy( physicsObject.rotation() );
				//	
				//	//- rotation 
				//	
				//	while(viewObject.angleVelocity - viewObject.angleVelocityCurrent > Math.PI){ viewObject.angleVelocity -= 2*Math.PI; }
				//	while(viewObject.angleVelocityCurrent - viewObject.angleVelocity > Math.PI){ viewObject.angleVelocity += 2*Math.PI; }
				//	
				//	viewObject.angleVelocityCurrent = viewObject.angleVelocity - 0.65*(viewObject.angleVelocity - viewObject.angleVelocityCurrent);
				//	
				//	viewObject.angleQuaternion.setFromAxisAngle( viewObject.axisY, viewObject.angleVelocityCurrent );
				//	physicsObject.quaternion = viewObject.angleQuaternion;
				//	
				//	//- velocity
				//	
				//	if(viewObject.isAction["walk"]){							
				//		physicsObject.velocity.x = +viewObject.forceWalk * Math.sin(viewObject.angleVelocityCurrent);
				//		physicsObject.velocity.z = +viewObject.forceWalk * Math.cos(viewObject.angleVelocityCurrent);
				//		physicsObject.position.y = 0.1;
				//	}else if(viewObject.isAction["run"]){							
				//		physicsObject.velocity.x = +viewObject.forceRun * Math.sin(viewObject.angleVelocityCurrent);
				//		physicsObject.velocity.z = +viewObject.forceRun * Math.cos(viewObject.angleVelocityCurrent);
				//	}
				//	
				//	//- position
				//	
				//	viewObject.positionTo.y -= viewObject.wy*0.5;
				//		
				//	viewObject.position.x = viewObject.positionTo.x - 0.65*(viewObject.positionTo.x - viewObject.position.x);	
				//	viewObject.position.y = viewObject.positionTo.y - 0.65*(viewObject.positionTo.y - viewObject.position.y);	
				//	viewObject.position.z = viewObject.positionTo.z - 0.65*(viewObject.positionTo.z - viewObject.position.z);
				
				}
			});
			
			if(this.debugRenderer){
				this.debugRenderer.update();
			}
		}
    }
	
	//------------------------------------------------------------------------
	
	//resize = (width, height)=>{  		
	//	
    //}
}
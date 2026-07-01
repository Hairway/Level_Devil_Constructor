import * as IMPION from "#impion";
import {Ammo} from "ammo.js";

export default class Physics3dAmmo extends IMPION.ComponentEmpty{

	type = "physics3d";
	
	world;
	rigidBodies = [];
	
	//------------------------------------------------------------------------
	
	constructor({fps = 60, order = ""}){
		super(fps, order);
    }

	//------------------------------------------------------------------------
	
	showDebugger( app ){
		//if(!this.cannonDebugger3d){
		//	this.cannonDebugger3d = new CannonDebugger(app.view3d.scene, this.world);
		//}
	}
	
	//------------------------------------------------------------------------

	init( funComplete ){
		this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		this.dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
		this.broadphase = new Ammo.btDbvtBroadphase();
		this.solver = new Ammo.btSequentialImpulseConstraintSolver();
		
		this.world = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
		this.world.setGravity(new Ammo.btVector3(0, -9.81, 0));
		
		//-
		
		this.funComplete();
	}

	add = ( viewObject, settings = {} ) => {
		
		this.remove( viewObject );
		
		//-

		settings = Object.assign({
			
			mass					: 1,
			scaleSize				: 1,
			
			kinetic					: true,
			allowSleep				: false,
			
			velocity				: new IMPION.Vector3(0, 1, 0),
			angularVelocity			: new IMPION.Vector3(0, 0, 0),
			
			shape					: "box",
			shapes					: [],
					
		}, settings);
		
		//-
		
		viewObject.positionTo		= new IMPION.Vector3(0, 0, 0);
		viewObject.quaternionTo		= new IMPION.Quaternion3d();
		
		//-
		
		viewObject.physicsShapes = [];
		
		if(settings.shapes.length > 0){
			for(let i=0; i<settings.shapes.length; i++){
				this.#addShape( viewObject, settings.shapes[i] );
			}
		}else{	
			
			this.#addShape( viewObject, settings );		
		}
		
		
		//-
		
		let transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin( viewObject.position );
		transform.setRotation( viewObject.rotation );
		
		//const localInertia = new Ammo.btVector3(0, 0, 0);
		//boxShape.calculateLocalInertia( settings.mass, new Ammo.btVector3(0, 0, 0));
	
		let rigidBodyInfo;
		
		if(viewObject.physicsShapes.length > 1){
			
		}else{
			rigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(
				settings.mass,
				new Ammo.btDefaultMotionState(transform),
				viewObject.physicsShapes[0],
				velocity.velocity
			);
		}
		
		viewObject.physicsObject = new Ammo.btRigidBody( rigidBodyInfo );
		
		this.world.addRigidBody( viewObject.physicsObject );
		
		//-
		
		viewObject.physicsObject.viewObject = viewObject;
		
		//-
		
		this.rigidBodies.push( viewObject.physicsObject );
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
			
			position 		: new IMPION.Vector3(),
			quaternion 		: new IMPION.Quaternion3d(),
					
		}, shapeObject);
		
		//-

		if(shapeObject.shape == "box"){		
		
			physicsShape = new Ammo.btBoxShape(new Ammo.btVector3(
				shapeObject.scaleSize * shapeObject.wx * 0.5,
				shapeObject.scaleSize * shapeObject.wy * 0.5,
				shapeObject.scaleSize * shapeObject.wz * 0.5
			));
		
		}else if(shapeObject.shape == "sphere"){		
			
			physicsShape = new Ammo.btSphereShape( shapeObject.scaleSize * shapeObject.wx * 0.5 );
		
		}else if(shapeObject.shape == "cylinder"){		
			
			physicsShape = new Ammo.btCylinderShape(new Ammo.btVector3(
				shapeObject.scaleSize * shapeObject.wx * 0.5,
				shapeObject.scaleSize * shapeObject.wy * 0.5,
				shapeObject.scaleSize * shapeObject.wx * 0.5
			));

		}

		physicsShape.shapeData = shapeObject;
		
		viewObject.physicsShapes.push( physicsShape );	
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
		for(let i=this.world.bodies.length-1; i>=0; i--){
			this.remove( this.world.bodies[i].viewObject );	
		}		
		for(let i=this.world.constraints.length-1; i>=0; i--){
			this.removeJoint( this.world.constraints[i] );
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
			position	: new IMPION.Vector3(0, 0, 0)
		}];
			
		//-
		
		viewObject.position.y += viewObject.wy*0.5;
		
		this.add(viewObject, settings);
		
		//-
		
		viewObject.physicsCharacter 		= true;

		viewObject.wx 						= settings.wx;
		viewObject.wy 						= settings.wy;
		viewObject.wz 						= settings.wz;
		
		viewObject.angleQuaternion			= new IMPION.Quaternion3d();
		viewObject.axisY 					= new IMPION.Vector3( 0, 1, 0 );

	}
	
	removeCharacter( viewObject ){
		this.remove(viewObject);	
		viewObject.isPhysicsCharacter = false;
	}

	//------------------------------------------------------------------------
	
	#calculateSize( viewObject ){	
		if(!viewObject.isObject3D){ return false; }
	
		let quaternion = new IMPION.Quaternion3d();
		quaternion.copy( viewObject.quaternion);		
		viewObject.rotation.set(0,0,0);
		
		let box = new IMPION.Box3d().setFromObject( viewObject );
		let size = box.getSize( new IMPION.Vector3() );
		
		if(!size.x){
			size = viewObject.geometry.boundingBox.getSize( new IMPION.Vector3() );
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
			this.world.stepSimulation(timeDelta, 10);
			
			for(let i = this.rigidBodies.length-1; i>=0; i--){
				let physicsObject = this.rigidBodies[i];
				let viewObject = this.rigidBodies[i].viewObject;
				
				//-
				
				if(!viewObject.physicsCharacter){
					viewObject.position.copy( physicsObject.translation() );
					//viewObject.quaternion.copy( physicsObject.rotation() );
					
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
			}
		}
    }
	
	//------------------------------------------------------------------------
	
	//resize = (width, height)=>{  		
	//	
    //}
}
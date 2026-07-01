import * as THREE from "three";
import {
	ReferenceFrame,
	World,
} from "@perplexdotgg/bounce";

import Physics3d from "../Physics3d.mjs";

export default class Physics3dBounce extends Physics3d{

	world;

	#app;

	constructor({fps = 60, order = ""}){
		super(fps, order);
	}

	init( app, funComplete ){
		this.#app = app;

		this.world = new World({
			gravity : {x:0, y:-9.81, z:0},
		});

		funComplete();
	}

	showDebugger(){
	}

	add = ( viewObject, settings = {} ) => {
		if(!this.world){
			return null;
		}

		this.remove( viewObject );

		settings = Object.assign({
			mass					: 1,
			scaleSize				: 1,
			position				: viewObject.position,
			quaternion				: viewObject.quaternion,
			velocity				: {x:0, y:0, z:0},
			angularVelocity			: {x:0, y:0, z:0},
			linearDamping			: 0.01,
			angularDamping			: 0.01,
			kinematic				: false,
			collisionFilterGroup	: undefined,
			collisionFilterMask		: undefined,
			allowSleep				: false,
			shape					: "box",
			shapes					: [],
		}, settings);

		const physicsShape = settings.shapes.length > 0
			? this.#createCompoundShape( viewObject, settings.shapes )
			: this.#createShape( viewObject, settings );

		if(!physicsShape){
			return null;
		}

		const bodySettings = {
			shape				: physicsShape,
			position			: this.toVec3( settings.position ),
			orientation			: this.toQuat( settings.quaternion ),
			linearVelocity		: this.toVec3( settings.velocity ),
			angularVelocity		: this.toVec3( settings.angularVelocity ),
			friction			: settings.friction ?? 0.3,
			restitution			: settings.restitution ?? 0.1,
			linearDamping		: settings.linearDamping,
			angularDamping		: settings.angularDamping,
			isSleepingEnabled	: settings.allowSleep,
		};

		if(settings.collisionFilterGroup !== undefined){
			bodySettings.belongsToGroups = settings.collisionFilterGroup;
		}

		if(settings.collisionFilterMask !== undefined){
			bodySettings.collidesWithGroups = settings.collisionFilterMask;
		}

		let physicsObject;

		if(settings.kinematic){
			physicsObject = this.world.createKinematicBody( bodySettings );
		}else if(settings.mass == 0){
			physicsObject = this.world.createStaticBody( bodySettings );
		}else{
			bodySettings.mass = settings.mass;
			physicsObject = this.world.createDynamicBody( bodySettings );
		}

		this.#decoratePhysicsObject( physicsObject );

		physicsObject.viewObject = viewObject;
		physicsObject.isKinematic = settings.kinematic;
		physicsObject.setVelocity = this.setVelocity;
		physicsObject.setAngularVelocity = this.setAngularVelocity;

		viewObject.physicsObject = physicsObject;
		viewObject.positionTo = new THREE.Vector3();
		viewObject.quaternionTo = new THREE.Quaternion();

		return physicsObject;
	}

	#createCompoundShape( viewObject, shapes ){
		const children = [];

		for(let i=0; i<shapes.length; i++){
			const shape = this.#createShape( viewObject, shapes[i] );

			if(shape){
				children.push({
					shape,
					transform : {
						position	: this.toVec3( shapes[i].position ),
						rotation	: this.toQuat( shapes[i].quaternion ),
						scale		: 1,
					},
				});
			}
		}

		if(children.length == 0){
			return null;
		}

		return this.world.createCompoundShape( children );
	}

	#createShape( viewObject, shapeObject = {} ){
		if(!viewObject.wx || !viewObject.wy || !viewObject.wz){
			this.calculateSize( viewObject );
		}

		if(shapeObject.isObject3D && (!shapeObject.wx || !shapeObject.wy || !shapeObject.wz)){
			this.calculateSize( shapeObject );
		}

		shapeObject = Object.assign({
			shape		: "box",
			wx			: shapeObject.wx || viewObject.wx,
			wy			: shapeObject.wy || viewObject.wy,
			wz			: shapeObject.wz || viewObject.wz,
			scaleSize	: 1,
			rTop		: shapeObject.wx*0.5 || viewObject.wx*0.5,
			rBottom		: shapeObject.wx*0.5 || viewObject.wx*0.5,
			height		: shapeObject.wy || viewObject.wy,
		}, shapeObject);

		if(shapeObject.shape == "box"){
			return this.world.createBox({
				width	: shapeObject.scaleSize * shapeObject.wx,
				height	: shapeObject.scaleSize * shapeObject.wy,
				depth	: shapeObject.scaleSize * shapeObject.wz,
			});
		}

		if(shapeObject.shape == "sphere"){
			return this.world.createSphere({
				radius : shapeObject.scaleSize * shapeObject.wx * 0.5,
			});
		}

		if(shapeObject.shape == "cylinder"){
			return this.world.createCylinder({
				radius	: shapeObject.scaleSize * Math.max(shapeObject.rTop, shapeObject.rBottom),
				height	: shapeObject.scaleSize * shapeObject.height,
			});
		}

		if(shapeObject.shape == "terrain"){
			return this.#createTriangleMeshShape( viewObject );
		}

		return null;
	}

	#createTriangleMeshShape( viewObject ){
		if(!viewObject.geometry || !viewObject.geometry.attributes || !viewObject.geometry.attributes.position){
			return null;
		}

		const geometry = viewObject.geometry.clone();
		geometry.applyMatrix4(
			new THREE.Matrix4().makeScale(
				viewObject.scale.x,
				viewObject.scale.y,
				viewObject.scale.z
			)
		);

		const vertexPositions = new Float32Array( geometry.attributes.position.array );
		const faceIndices = geometry.index
			? new Uint32Array( geometry.index.array )
			: new Uint32Array( vertexPositions.length / 3 ).map((_, index) => index);

		return this.world.createTriangleMesh({
			vertexPositions,
			faceIndices,
			forceCreateConvexHull : false,
		});
	}

	remove = ( viewObject ) => {
		if(viewObject.physicsObject && this.world){
			this.removeBodyJoints( viewObject );

			this.world.destroyBody( viewObject.physicsObject );
			viewObject.physicsObject = null;
			viewObject.physicsCharacter = false;
		}
	}

	removeAll = () => {
		if(!this.world){
			return;
		}

		for(const body of Array.from( this.world.bodies() )){
			if(body.viewObject){
				this.remove( body.viewObject );
			}else{
				this.world.destroyBody( body );
			}
		}
	}

	setVelocity(vx = 0, vy = 0, vz = 0){
		this.linearVelocity.set([vx, vy, vz]);
		this.wakeUp?.();
		return this;
	}

	setAngularVelocity(vx = 0, vy = 0, vz = 0){
		this.angularVelocity.set([vx, vy, vz]);
		this.wakeUp?.();
		return this;
	}

	addCharacter( viewObject, settings = {} ){
		return this.addCharacterBody( viewObject, settings );
	}

	removeCharacter( viewObject ){
		this.removeCharacterBody( viewObject );
	}

	addJoint( viewA, viewB, type = "distance", settings = {} ){
		if(!this.world || !viewA.physicsObject || !viewB.physicsObject){
			return null;
		}

		let joint = null;

		if(type == "distance"){
			settings = Object.assign({
				distance : 1,
			}, settings);

			joint = this.world.createDistanceConstraint({
				bodyA			: viewA.physicsObject,
				bodyB			: viewB.physicsObject,
				positionA		: [0, 0, 0],
				positionB		: [0, 0, 0],
				minDistance		: settings.distance,
				maxDistance		: settings.distance,
				referenceFrame	: ReferenceFrame.local,
			});
		}else if(type == "lock"){
			settings = Object.assign({
				pivotA : {x:0, y:0, z:0},
				pivotB : {x:0, y:0, z:0},
			}, settings);

			joint = this.world.createPointConstraint({
				bodyA			: viewA.physicsObject,
				bodyB			: viewB.physicsObject,
				positionA		: this.toVec3( settings.pivotA ),
				positionB		: this.toVec3( settings.pivotB ),
				referenceFrame	: ReferenceFrame.local,
			});
		}

		if(joint){
			joint.viewA = viewA;
			joint.viewB = viewB;

			this.addJointReference( joint, viewA, viewB );
		}

		return joint;
	}

	addSpring(){
		return null;
	}

	addRagdoll(){
		return null;
	}

	removeRagdoll(){
	}

	removeJoint = ( joint ) => {
		if(joint && this.world){
			this.world.destroyConstraint( joint );
			this.removeJointReference( joint.viewA, joint );
			this.removeJointReference( joint.viewB, joint );
		}
	}

	enterframe = () => {
		if(!this.world){
			return;
		}

		const timeScale = this.#app.timeScale;

		for(const physicsObject of this.world.kinematicBodies){
			if(physicsObject.isKinematic && physicsObject.viewObject && !physicsObject.viewObject.physicsCharacter){
				physicsObject.position.set( this.toVec3( physicsObject.viewObject.position ) );
				physicsObject.orientation.set( this.toQuat( physicsObject.viewObject.quaternion ) );
				physicsObject.commitChanges();
			}
		}

		if(timeScale != 0){
			this.world.takeOneStep((1 / 60) * timeScale);
		}

		for(const physicsObject of this.world.bodies()){
			const viewObject = physicsObject.viewObject;

			if(!viewObject){
				continue;
			}

			if(!viewObject.physicsCharacter){
				if(physicsObject.mass != 0 && !physicsObject.isKinematic){
					this.copyVector3( viewObject.position, physicsObject.position );
					this.copyQuaternion( viewObject.quaternion, physicsObject.orientation );
				}
			}else{
				this.updateCharacterBody( viewObject, physicsObject, timeScale, {
					position		: physicsObject.position,
					quaternion		: physicsObject.orientation,
					velocity		: physicsObject.linearVelocity,
					linearDamping	: physicsObject.linearDamping,
					setQuaternion	: quaternion => {
						physicsObject.orientation.set( this.toQuat( quaternion ) );
					},
					commit			: () => {
						physicsObject.commitChanges();
					},
				});
			}
		}
	}

	#decoratePhysicsObject( physicsObject ){
		Object.defineProperty(physicsObject, "velocity", {
			configurable : true,
			enumerable : true,
			get(){
				return this.linearVelocity;
			}
		});
	}

}

Physics3d.registerEngine("bounce", Physics3dBounce);

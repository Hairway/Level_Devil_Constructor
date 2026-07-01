import * as THREE from "three";

import {
	addBroadphaseLayer,
	addObjectLayer,
	box,
	coneConstraint,
	compound,
	ConstraintSpace,
	createWorld,
	createWorldSettings,
	cylinder,
	distanceConstraint,
	dof,
	enableCollision,
	MotionType,
	pointConstraint,
	registerAll,
	rigidBody,
	sphere,
	triangleMesh,
	updateWorld,
} from "crashcat";

import Physics3d from "../Physics3d.mjs";

const DEFAULT_BODY_SETTINGS = {
	mass					: 1,
	scaleSize				: 1,
	velocity				: {x:0, y:0, z:0},
	angularVelocity			: {x:0, y:0, z:0},
	linearDamping			: 0.01,
	angularDamping			: 0.01,
	kinematic				: false,
	collisionFilterGroup	: 1,
	collisionFilterMask		: 1|2|4,
	allowSleep				: false,
	fixedRotation			: false,
	allowedDegreesOfFreedom	: null,
	shape					: "box",
	shapes					: [],
};

export default class Physics3dCrashcat extends Physics3d {

	world;

	#app;
	#objectLayerMoving = 0;
	#objectLayerStatic = 0;

	constructor({fps = 60, order = ""}){
		super(fps, order);
	}

	init( app, funComplete ){
		this.#app = app;

		registerAll();

		const worldSettings = createWorldSettings();

		const broadphaseLayerMoving = addBroadphaseLayer( worldSettings );
		const broadphaseLayerStatic = addBroadphaseLayer( worldSettings );

		this.#objectLayerMoving = addObjectLayer( worldSettings, broadphaseLayerMoving );
		this.#objectLayerStatic = addObjectLayer( worldSettings, broadphaseLayerStatic );

		enableCollision( worldSettings, this.#objectLayerMoving, this.#objectLayerStatic );
		enableCollision( worldSettings, this.#objectLayerMoving, this.#objectLayerMoving );

		worldSettings.gravity = [0, -9.81, 0];

		this.world = createWorld( worldSettings );

		funComplete();
	}

	showDebugger(){
	}

	/**
	* Adds a Crashcat rigid body.
	* @param {THREE.Object3D} viewObject - View object linked to physics body.
	* @param {Object} [settings={}] - Rigid body settings.
	* @param {number} [settings.mass=1] - Body mass. 0 creates a static body.
	* @param {string} [settings.shape="box"] - Shape type: box, sphere, cylinder, terrain.
	* @param {Object[]} [settings.shapes=[]] - Compound child shapes.
	* @param {THREE.Vector3|Object|Array} [settings.position=viewObject.position] - Initial position.
	* @param {THREE.Quaternion|Object|Array} [settings.quaternion=viewObject.quaternion] - Initial rotation.
	* @param {THREE.Vector3|Object|Array} [settings.velocity={x:0,y:0,z:0}] - Initial velocity.
	* @param {THREE.Vector3|Object|Array} [settings.angularVelocity={x:0,y:0,z:0}] - Initial angular velocity.
	* @param {number} [settings.linearDamping=0.01] - Linear damping.
	* @param {number} [settings.angularDamping=0.01] - Angular damping.
	* @param {boolean} [settings.kinematic=false] - Whether body is kinematic.
	* @param {number} [settings.collisionFilterGroup=1] - Collision group.
	* @param {number} [settings.collisionFilterMask=7] - Collision mask.
	* @param {boolean} [settings.allowSleep=false] - Whether body can sleep.
	* @param {boolean} [settings.fixedRotation=false] - Whether rotation is locked.
	* @param {number} [settings.friction=0.3] - Contact friction.
	* @param {number} [settings.restitution=0.1] - Contact restitution.
	* @returns {*} Created Crashcat rigid body.
	*/
	add = ( viewObject, settings = {} ) => {
		if(!this.world){
			return null;
		}

		this.remove( viewObject );

		settings = Object.assign({
			position				: viewObject.position,
			quaternion				: viewObject.quaternion,
		}, DEFAULT_BODY_SETTINGS, settings);

		let physicsShape = null;

		if(settings.shapes.length > 0){
			const children = [];

			for(let i=0; i<settings.shapes.length; i++){
				const child = this.#createCompoundChild( viewObject, settings.shapes[i] );

				if(child){
					children.push( child );
				}
			}

			if(children.length > 0){
				physicsShape = compound.create({ children });
			}
		}else{
			physicsShape = this.#createShape( viewObject, settings );
		}

		if(!physicsShape){
			return null;
		}

		const motionType = settings.kinematic
			? MotionType.KINEMATIC
			: settings.mass == 0
				? MotionType.STATIC
				: MotionType.DYNAMIC;

		const physicsObject = rigidBody.create(this.world, {
			shape					: physicsShape,
			objectLayer				: motionType == MotionType.STATIC ? this.#objectLayerStatic : this.#objectLayerMoving,
			motionType				: motionType,
			position				: this.toVec3( settings.position ),
			quaternion				: this.toQuat( settings.quaternion ),
			linearDamping			: settings.linearDamping,
			angularDamping			: settings.angularDamping,
			allowSleeping			: settings.allowSleep,
			collisionGroups			: settings.collisionFilterGroup,
			collisionMask			: settings.collisionFilterMask,
			friction				: settings.friction ?? 0.3,
			restitution				: settings.restitution ?? 0.1,
			allowedDegreesOfFreedom	: settings.allowedDegreesOfFreedom || (settings.fixedRotation ? dof(true, true, true, false, false, false) : undefined),
			mass					: motionType == MotionType.DYNAMIC ? settings.mass : undefined,
		});

		rigidBody.setLinearVelocity( this.world, physicsObject, this.toVec3( settings.velocity ) );
		rigidBody.setAngularVelocity( this.world, physicsObject, this.toVec3( settings.angularVelocity ) );

		this.#decoratePhysicsObject( physicsObject );

		physicsObject.viewObject = viewObject;
		physicsObject.physicsWorld = this.world;
		physicsObject.isKinematic = settings.kinematic;
		physicsObject.setVelocity = this.setVelocity;
		physicsObject.setAngularVelocity = this.setAngularVelocity;

		viewObject.physicsObject = physicsObject;
		viewObject.positionTo = new THREE.Vector3();
		viewObject.quaternionTo = new THREE.Quaternion();

		return physicsObject;
	}

	#decoratePhysicsObject( physicsObject ){
		if(!physicsObject.velocity){
			physicsObject.velocity = this.#createVectorProxy( physicsObject.motionProperties.linearVelocity );
		}

		if(!physicsObject.angularVelocity){
			physicsObject.angularVelocity = this.#createVectorProxy( physicsObject.motionProperties.angularVelocity );
		}

		if(physicsObject.mass === undefined){
			Object.defineProperty(physicsObject, "mass", {
				configurable : true,
				enumerable : true,
				get(){
					return this.massProperties?.mass || 0;
				}
			});
		}

		if(physicsObject.type === undefined){
			Object.defineProperty(physicsObject, "type", {
				configurable : true,
				enumerable : true,
				get(){
					return this.motionType;
				}
			});
		}

		if(physicsObject.linearDamping === undefined){
			Object.defineProperty(physicsObject, "linearDamping", {
				configurable : true,
				enumerable : true,
				get(){
					return this.motionProperties?.linearDamping || 0;
				},
				set(value){
					this.motionProperties.linearDamping = value;
				}
			});
		}

		if(physicsObject.angularDamping === undefined){
			Object.defineProperty(physicsObject, "angularDamping", {
				configurable : true,
				enumerable : true,
				get(){
					return this.motionProperties?.angularDamping || 0;
				},
				set(value){
					this.motionProperties.angularDamping = value;
				}
			});
		}
	}

	#createVectorProxy( vector ){
		return {
			get x(){ return vector[0]; },
			set x(value){ vector[0] = value; },
			get y(){ return vector[1]; },
			set y(value){ vector[1] = value; },
			get z(){ return vector[2]; },
			set z(value){ vector[2] = value; },
		};
	}

	#createCompoundChild( viewObject, shapeObject = {} ){
		const innerShape = this.#createShape( viewObject, shapeObject );

		if(!innerShape){
			return null;
		}

		return {
			position	: this.toVec3( shapeObject.position ),
			quaternion	: this.toQuat( shapeObject.quaternion ),
			shape		: innerShape,
		};
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
			return box.create({
				halfExtents : [
					shapeObject.scaleSize * shapeObject.wx * 0.5,
					shapeObject.scaleSize * shapeObject.wy * 0.5,
					shapeObject.scaleSize * shapeObject.wz * 0.5,
				]
			});
		}

		if(shapeObject.shape == "sphere"){
			return sphere.create({
				radius : shapeObject.scaleSize * shapeObject.wx * 0.5,
			});
		}

		if(shapeObject.shape == "cylinder"){
			return cylinder.create({
				radius		: shapeObject.scaleSize * Math.max(shapeObject.rTop, shapeObject.rBottom),
				halfHeight	: shapeObject.scaleSize * shapeObject.height * 0.5,
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

		const positions = Array.from( geometry.attributes.position.array );
		const indices = geometry.index
			? Array.from( geometry.index.array )
			: positions.map((_, index) => index).filter((_, index) => index % 3 == 0).flatMap(index => [index, index + 1, index + 2]);

		return triangleMesh.create({
			positions,
			indices,
		});
	}

	remove = ( viewObject ) => {
		if(viewObject.physicsObject && this.world){
			this.removeBodyJoints( viewObject );

			rigidBody.remove( this.world, viewObject.physicsObject );
			viewObject.physicsObject = null;
			viewObject.physicsCharacter = false;
		}
	}

	removeAll = () => {
		if(!this.world){
			return;
		}

		const bodies = [];

		for(const body of rigidBody.iterate(this.world)){
			bodies.push( body );
		}

		for(let i=0; i<bodies.length; i++){
			if(bodies[i].viewObject){
				this.remove( bodies[i].viewObject );
			}
		}
	}

	setVelocity(vx = 0, vy = 0, vz = 0){
		rigidBody.setLinearVelocity(this.physicsWorld, this, [vx, vy, vz]);
		return this;
	}

	setAngularVelocity(vx = 0, vy = 0, vz = 0){
		rigidBody.setAngularVelocity(this.physicsWorld, this, [vx, vy, vz]);
		return this;
	}

	getCharacterDegreesOfFreedom(){
		return dof(true, true, true, false, true, false);
	}

	/**
	* Adds a Crashcat character body.
	* @param {THREE.Object3D} viewObject - Character view object.
	* @param {Object} [settings={}] - Character physics settings.
	* @returns {*} Created Crashcat rigid body.
	*/
	addCharacter( viewObject, settings = {} ){
		return this.addCharacterBody( viewObject, settings );
	}

	removeCharacter( viewObject ){
		this.removeCharacterBody( viewObject );
	}

	/**
	* Adds a Crashcat joint.
	* @param {THREE.Object3D} viewA - First connected object.
	* @param {THREE.Object3D} viewB - Second connected object.
	* @param {string} [type="distance"] - Joint type: distance, cone, lock.
	* @param {Object} [settings={}] - Joint settings.
	* @returns {*} Created Crashcat joint.
	*/
	addJoint( viewA, viewB, type = "distance", settings = {} ){
		if(!this.world || !viewA.physicsObject || !viewB.physicsObject){
			return null;
		}

		let joint = null;

		if(type == "distance"){
			settings = Object.assign({
				distance	: 1,
			}, settings);

			joint = distanceConstraint.create(this.world, {
				bodyIdA		: viewA.physicsObject.id,
				bodyIdB		: viewB.physicsObject.id,
				pointA		: [0, 0, 0],
				pointB		: [0, 0, 0],
				minDistance	: settings.distance,
				maxDistance	: settings.distance,
				space		: ConstraintSpace.LOCAL,
			});
		}else if(type == "cone"){
			settings = Object.assign({
				pivotA 		: {x:0, y:0, z:0},
				pivotB 		: {x:0, y:0, z:0},
				axisA		: {x:0, y:1, z:0},
				axisB		: {x:0, y:1, z:0},
				angle		: 0.25 * Math.PI,
			}, settings);

			joint = coneConstraint.create(this.world, {
				bodyIdA			: viewA.physicsObject.id,
				bodyIdB			: viewB.physicsObject.id,
				pointA			: this.toVec3( settings.pivotA ),
				pointB			: this.toVec3( settings.pivotB ),
				twistAxisA		: this.toVec3( settings.axisA ),
				twistAxisB		: this.toVec3( settings.axisB ),
				halfConeAngle	: settings.angle,
				space			: ConstraintSpace.LOCAL,
			});
		}else if(type == "lock"){
			settings = Object.assign({
				pivotA : {x:0, y:0, z:0},
				pivotB : {x:0, y:0, z:0},
			}, settings);

			joint = pointConstraint.create(this.world, {
				bodyIdA		: viewA.physicsObject.id,
				bodyIdB		: viewB.physicsObject.id,
				pointA		: this.toVec3( settings.pivotA ),
				pointB		: this.toVec3( settings.pivotB ),
				space		: ConstraintSpace.LOCAL,
			});
		}

		if(joint){
			joint._kind = type;
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
		if(!joint || !this.world || joint._pooled){
			return;
		}

		if(joint._kind == "distance"){
			distanceConstraint.remove(this.world, joint);
		}else if(joint._kind == "cone"){
			coneConstraint.remove(this.world, joint);
		}else if(joint._kind == "lock"){
			pointConstraint.remove(this.world, joint);
		}

		this.removeJointReference( joint.viewA, joint );
		this.removeJointReference( joint.viewB, joint );
	}

	enterframe = () => {
		if(!this.world){
			return;
		}

		const timeScale = this.#app.timeScale;

		for(const physicsObject of rigidBody.iterate(this.world)){
			if(physicsObject.isKinematic && physicsObject.viewObject && !physicsObject.viewObject.physicsCharacter){
				rigidBody.setTransform(
					this.world,
					physicsObject,
					this.toVec3( physicsObject.viewObject.position ),
					this.toQuat( physicsObject.viewObject.quaternion ),
					false
				);
			}
		}

		if(timeScale != 0){
			updateWorld(this.world, undefined, (1 / 60) * timeScale);
		}

		for(const physicsObject of rigidBody.iterate(this.world)){
			let viewObject = physicsObject.viewObject;

			if(!viewObject){
				continue;
			}

			if(!viewObject.physicsCharacter){
				if(physicsObject.motionType != MotionType.STATIC && !physicsObject.isKinematic){
					this.copyVector3( viewObject.position, physicsObject.position );
					this.copyQuaternion( viewObject.quaternion, physicsObject.quaternion );
				}
			}else{
				this.updateCharacterBody( viewObject, physicsObject, timeScale, {
					position		: physicsObject.position,
					quaternion		: physicsObject.quaternion,
					velocity		: physicsObject.velocity,
					linearDamping	: physicsObject.linearDamping,
					setQuaternion	: quaternion => {
						rigidBody.setQuaternion(
							this.world,
							physicsObject,
							this.toQuat( quaternion ),
							false
						);
					},
				});
			}
		}
	}
}

Physics3d.registerEngine("crashcat", Physics3dCrashcat);

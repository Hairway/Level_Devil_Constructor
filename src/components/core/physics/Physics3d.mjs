import * as THREE from "three";

import ComponentEmpty from "../view/ComponentEmpty.mjs";

/**
* Creates an instance of Physics3d.
* @param {Object|number} [options={}] - Configuration object or fps value.
* @param {string} [options.engine="crashcat"] - Engine name: "cannon", "crashcat", or "bounce".
* @param {number} [options.fps=60] - Update frequency.
* @param {string} [options.order=""] - Component update order.
* @param {Object} [options.settings={}] - Engine-specific settings.
* @param {string} [orderDefault=""] - Update order when first argument is fps.
*
* Methods:
* @method registerEngine - Registers a physics engine class.
* @method supports - Checks if an engine is available.
* @method init - Stores playable app reference.
* @method is - Checks current engine name.
* @method calculateSize - Calculates wx/wy/wz for physics shapes.
* @method toVec3 - Converts vector-like value to [x, y, z].
* @method toQuat - Converts quaternion-like value to [x, y, z, w].
* @method createVector3 - Creates engine-compatible vector.
* @method createQuaternion - Creates engine-compatible quaternion.
* @method getCharacterDefaults - Creates default character physics settings.
* @method getCharacterDegreesOfFreedom - Returns engine-specific character DOF.
* @method createCharacterShapes - Creates default capsule-like character shapes.
* @method buildCharacterSettings - Merges character defaults with overrides.
* @method addCharacterBody - Adds character body using engine add().
* @method removeCharacterBody - Removes character physics body.
* @method addJointReference - Stores joint links on connected bodies.
* @method removeJointReference - Removes joint link from a body.
* @method removeBodyJoints - Removes all joints connected to a body.
* @method copyVector3 - Copies vector-like value into target.
* @method copyQuaternion - Copies quaternion-like value into target.
* @method updateCharacterBody - Updates character movement and view transform.
* @method updateCharacterLook - Smooths visual character look rotation.
* @method updateCharacterAngularVelocity - Smooths physics character rotation.
* @method smoothCharacterPosition - Smooths visual character position.
*/
export default class Physics3d extends ComponentEmpty{

	static #engines = {};

	type = "physics3d";
	app;
	engineName = "";

	static registerEngine( name, Engine ){
		this.#engines[name] = Engine;
		Engine.physics3dEngineName = name;

		return Engine;
	}

	static supports( engine ){
		return Boolean( this.#engines[engine] );
	}

	constructor(options = {}, orderDefault = ""){
		let engine;
		let fps = 60;
		let order = orderDefault;
		let settings = {};

		if(typeof options == "number"){
			fps = options;
		}else{
			({
				engine,
				fps = 60,
				order = "",
				settings = {},
			} = options || {});
		}

		super(fps, order);

		if(new.target == Physics3d){
			const Engine = Physics3d.#engines[engine || "crashcat"];

			if(!Engine){
				throw new Error(`Unknown physics3d engine: ${engine}`);
			}

			return new Engine({
				fps,
				order,
				...settings,
			});
		}

		this.engineName = new.target.physics3dEngineName || "";
	}

	get engine(){
		return this.engineName;
	}

	get engineInstance(){
		return this;
	}

	init( app, funComplete = () => {} ){
		this.app = app;
		funComplete();
	}

	is( engine ){
		return this.engineName == engine;
	}

	supports( engine ){
		return Physics3d.supports( engine );
	}

	calculateSize( viewObject ){
		if(!viewObject.isObject3D){
			return false;
		}

		let quaternion = new THREE.Quaternion();
		quaternion.copy( viewObject.quaternion );
		viewObject.rotation.set(0, 0, 0);

		let box3 = new THREE.Box3().setFromObject( viewObject );
		let size = box3.getSize( new THREE.Vector3() );

		if(!size.x && viewObject.geometry && viewObject.geometry.boundingBox){
			size = viewObject.geometry.boundingBox.getSize( new THREE.Vector3() );
		}else if(!size.x && viewObject.geometry){
			viewObject.geometry.computeBoundingBox();
			size = viewObject.geometry.boundingBox.getSize( new THREE.Vector3() );
		}

		viewObject.applyQuaternion( quaternion );

		if(!viewObject.physicsSize){
			viewObject.physicsSize = 1;
		}

		viewObject.wx = size.x * viewObject.physicsSize;
		viewObject.wy = size.y * viewObject.physicsSize;
		viewObject.wz = size.z * viewObject.physicsSize;

		return true;
	}

	toVec3( value ){
		if(Array.isArray(value)){
			return [value[0] || 0, value[1] || 0, value[2] || 0];
		}

		if(value){
			return [value.x || 0, value.y || 0, value.z || 0];
		}

		return [0, 0, 0];
	}

	toQuat( value ){
		if(Array.isArray(value)){
			return [
				value[0] || 0,
				value[1] || 0,
				value[2] || 0,
				value[3] === undefined ? 1 : value[3],
			];
		}

		if(value){
			return [
				value.x || 0,
				value.y || 0,
				value.z || 0,
				value.w === undefined ? 1 : value.w,
			];
		}

		return [0, 0, 0, 1];
	}

	createVector3( x = 0, y = 0, z = 0 ){
		return new THREE.Vector3( x, y, z );
	}

	createQuaternion( x = 0, y = 0, z = 0, w = 1 ){
		return new THREE.Quaternion( x, y, z, w );
	}

	getCharacterDefaults( viewObject ){
		return {
			shape 					: "sphere",
			mass 					: 70,
			position				: this.createVector3(
				viewObject.position.x,
				viewObject.position.y + 0.5 * viewObject.wy * 0.5 + viewObject.wx,
				viewObject.position.z
			),
			allowSleep				: false,
			linearDamping 			: 0.01,
			angularDamping 			: 1.00,
			collisionFilterGroup 	: 1,
			collisionFilterMask 	: 1|2|4,
			wx 						: viewObject.wx,
			wy 						: viewObject.wy,
			wz 						: viewObject.wz,
			scaleSize 				: 1.0,
		};
	}

	getCharacterDegreesOfFreedom(){
		return null;
	}

	createCharacterShapes( settings ){
		return [
			{
				shape 		: "sphere",
				wx			: settings.wx * settings.scaleSize,
				wy			: settings.wx * settings.scaleSize,
				wz			: settings.wx * settings.scaleSize,
				position	: this.createVector3(0, -settings.wy * 0.5 + 0.5 * settings.wx, 0),
			},
			{
				shape 		: "cylinder",
				rTop		: 0.5 * settings.wx * settings.scaleSize,
				rBottom		: 0.5 * settings.wx * settings.scaleSize,
				height		: (settings.wy - settings.wx) * settings.scaleSize,
				numSegments	: 6,
				position	: this.createVector3(0, 0, 0),
			},
			{
				shape 		: "sphere",
				wx			: settings.wx * settings.scaleSize,
				wy			: settings.wx * settings.scaleSize,
				wz			: settings.wx * settings.scaleSize,
				position	: this.createVector3(0, settings.wy * 0.5 - 0.5 * settings.wx, 0),
			},
		];
	}

	buildCharacterSettings( viewObject, settings = {} ){
		const result = Object.assign( this.getCharacterDefaults( viewObject ), settings );
		const allowedDegreesOfFreedom = this.getCharacterDegreesOfFreedom();

		if(allowedDegreesOfFreedom && result.allowedDegreesOfFreedom === undefined){
			result.allowedDegreesOfFreedom = allowedDegreesOfFreedom;
		}

		if(!result.shapes){
			result.shapes = this.createCharacterShapes( result );
		}

		return result;
	}

	addCharacterBody( viewObject, settings = {} ){
		const result = this.add( viewObject, this.buildCharacterSettings( viewObject, settings ) );

		viewObject.physicsCharacter = true;
		viewObject.angleQuaternion = this.createQuaternion();
		viewObject.axisY = this.createVector3(0, 1, 0);

		return result;
	}

	removeCharacterBody( viewObject ){
		this.remove( viewObject );
		viewObject.isPhysicsCharacter = false;
		viewObject.physicsCharacter = false;
	}

	addJointReference( joint, viewA, viewB ){
		if(!viewA.physicsObject.joinsPhysics){
			viewA.physicsObject.joinsPhysics = [];
		}

		if(!viewB.physicsObject.joinsPhysics){
			viewB.physicsObject.joinsPhysics = [];
		}

		viewA.physicsObject.joinsPhysics.push( joint );
		viewB.physicsObject.joinsPhysics.push( joint );
	}

	removeJointReference( viewObject, joint ){
		if(!viewObject || !viewObject.physicsObject || !viewObject.physicsObject.joinsPhysics){
			return;
		}

		const id = viewObject.physicsObject.joinsPhysics.indexOf( joint );

		if(id != -1){
			viewObject.physicsObject.joinsPhysics.splice(id, 1);
		}

		if(viewObject.physicsObject.joinsPhysics.length == 0){
			viewObject.physicsObject.joinsPhysics = null;
		}
	}

	removeBodyJoints( viewObject ){
		const joinsPhysics = viewObject.physicsObject?.joinsPhysics;

		if(!joinsPhysics){
			return;
		}

		for(const joint of Array.from( joinsPhysics )){
			if(joint){
				this.removeJoint( joint );
			}
		}
	}

	copyVector3( target, value ){
		const vector = this.toVec3( value );

		if(target.set){
			target.set( vector[0], vector[1], vector[2] );
		}else{
			target.x = vector[0];
			target.y = vector[1];
			target.z = vector[2];
		}
	}

	copyQuaternion( target, value ){
		const quaternion = this.toQuat( value );

		if(target.set){
			target.set( quaternion[0], quaternion[1], quaternion[2], quaternion[3] );
		}else{
			target.x = quaternion[0];
			target.y = quaternion[1];
			target.z = quaternion[2];
			target.w = quaternion[3];
		}
	}

	updateCharacterBody( viewObject, physicsObject, timeScale, adapter = {} ){
		this.copyVector3( viewObject.positionTo, adapter.position );

		if(viewObject.autoRotation){
			this.copyQuaternion( viewObject.quaternion, adapter.quaternion );
		}else{
			this.updateCharacterLook( viewObject );
		}

		this.updateCharacterAngularVelocity( viewObject );
		viewObject.angleQuaternion.setFromAxisAngle( viewObject.axisY, viewObject.angularVelocityCurrent );
		adapter.setQuaternion?.( viewObject.angleQuaternion );

		const velocity = adapter.velocity;

		if(velocity){
			const linearDamping = adapter.linearDamping ?? 1;

			if(velocity.y > 0){
				velocity.y *= 0.8;
			}

			velocity.x *= linearDamping;
			velocity.z *= linearDamping;

			if(viewObject.isAction["walk"]){
				velocity.x = +viewObject.forceWalk * Math.sin(viewObject.angularVelocityCurrent) * timeScale;
				velocity.z = +viewObject.forceWalk * Math.cos(viewObject.angularVelocityCurrent) * timeScale;
			}else if(viewObject.isAction["run"]){
				velocity.x = +viewObject.forceRun * Math.sin(viewObject.angularVelocityCurrent) * timeScale;
				velocity.z = +viewObject.forceRun * Math.cos(viewObject.angularVelocityCurrent) * timeScale;
			}
		}

		adapter.commit?.();

		this.smoothCharacterPosition( viewObject );
	}

	updateCharacterLook( viewObject ){
		let angle = (viewObject.angularLook + viewObject.angularUser);

		while(angle - viewObject.angularLookCurrent > Math.PI){ angle -= 2*Math.PI; }
		while(viewObject.angularLookCurrent - angle > Math.PI){ angle += 2*Math.PI; }

		viewObject.angularLookCurrent = angle - viewObject.angularLookRK * (angle - viewObject.angularLookCurrent);
		viewObject.rotation.y = viewObject.angularLookCurrent;
	}

	updateCharacterAngularVelocity( viewObject ){
		while(viewObject.angularVelocity - viewObject.angularVelocityCurrent > Math.PI){ viewObject.angularVelocity -= 2*Math.PI; }
		while(viewObject.angularVelocityCurrent - viewObject.angularVelocity > Math.PI){ viewObject.angularVelocity += 2*Math.PI; }

		viewObject.angularVelocityCurrent = viewObject.angularVelocity - viewObject.angularVelocityRK * (viewObject.angularVelocity - viewObject.angularVelocityCurrent);
	}

	smoothCharacterPosition( viewObject ){
		viewObject.positionTo.y -= viewObject.wy * 0.5;

		viewObject.position.x = viewObject.positionTo.x - 0.65 * (viewObject.positionTo.x - viewObject.position.x);
		viewObject.position.y = viewObject.positionTo.y - 0.65 * (viewObject.positionTo.y - viewObject.position.y);
		viewObject.position.z = viewObject.positionTo.z - 0.65 * (viewObject.positionTo.z - viewObject.position.z);
	}
}

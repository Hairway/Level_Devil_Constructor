import * as THREE from "three";

import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
	
import Physics3d from "../Physics3d.mjs";

export default class Physics3dCannon extends Physics3d{
	
	world;
	
	#app;
	#ragdolls = [];
	#springs = [];
	
	#characterGroundContactMaterial;
	#characterMaterial = new CANNON.Material("characterMaterial");
	#staticMaterial = new CANNON.Material("staticMaterial");


	constructor({fps = 60, order = ""}){
		super(fps, order);

		this.world = new CANNON.World();
		this.world.gravity.set(0, -9.81, 0);
		this.world.allowSleep = true;
		//this.world.broadphase = new CANNON.NaiveBroadphase();
		//this.world.solver.iterations = 10;
		//this.world.defaultContactMaterial.friction = 0.3;	
		//this.world.defaultContactMaterial.restitution = 0.3;	
		//this.world.defaultContactMaterial.contactEquationStiffness = 1e5;
		
		this.#characterGroundContactMaterial = new CANNON.ContactMaterial(
			this.#characterMaterial,
			this.#staticMaterial,
			{
				friction	: 0,
				restitution	: 0.1
			}
		);

		this.world.addContactMaterial( this.#characterGroundContactMaterial );

    }

	//------------------------------------------------------------------------

	init( app, funComplete ){
		this.#app = app;
		
		funComplete();
	}
	
	//------------------------------------------------------------------------
	
	showDebugger( app ){
		if(!this.cannonDebugger3d){
			this.cannonDebugger3d = new CannonDebugger(app.view3d.scene, this.world);
		}
	}

	createVector3( x = 0, y = 0, z = 0 ){
		return new CANNON.Vec3( x, y, z );
	}

	createQuaternion( x = 0, y = 0, z = 0, w = 1 ){
		return new CANNON.Quaternion( x, y, z, w );
	}

	getCharacterDefaults( viewObject ){
		return Object.assign(super.getCharacterDefaults( viewObject ), {
			material		: this.#characterMaterial,
			linearFactor	: new CANNON.Vec3(1, 1, 1),
			angularFactor	: new CANNON.Vec3(0, 1, 0),
		});
	}
		
	//------------------------------------------------------------------------

	add = ( viewObject, settings = {} ) => {
		
		this.remove( viewObject );
		
		//-
	
		settings = Object.assign({
			
			mass					: 1,
			scaleSize				: 1,
			
			position				: viewObject.position,
			quaternion				: viewObject.quaternion,
			
			velocity				: new CANNON.Vec3(0, 0, 0),
			angularVelocity			: new CANNON.Vec3(0, 0, 0),
			
			linearDamping			: 0.01,
			angularDamping			: 0.01,
			
			linearFactor			: new CANNON.Vec3(1, 1, 1),
			angularFactor			: new CANNON.Vec3(1, 1, 1),
			
			kinematic				: false,
			
			collisionFilterGroup	: 1,
			collisionFilterMask		: 1|2|4,
			
			allowSleep				: false,		
			fixedRotation			: false,		
			material				: null,
			
			shape					: "box",
			shapes					: [],
					
		}, settings);
		
		//-
		
		if(settings.mass == 0){
			settings.material = this.#staticMaterial;
		}
		
		//-
		
		settings._shape = settings.shape;
		settings._shapes = settings.shapes;
		
		settings.shape = null;
		settings.shapes = null;
		
		viewObject.physicsObject = new CANNON.Body( settings );

		settings.shape = settings._shape;
		settings.shapes = settings._shapes;
		
		//-
		
		viewObject.positionTo	= new CANNON.Vec3(0, 1, 0);
		viewObject.quaternionTo	= new THREE.Quaternion();
		
		//-
		
		if(settings.shapes.length > 0){ 
			for(let i=0; i<settings.shapes.length; i++){
				this.#addShape( viewObject, settings.shapes[i] );
			}
		}else{		
			settings.position = new CANNON.Vec3();
			settings.quaternion = new CANNON.Quaternion();
			
			this.#addShape( viewObject, settings );		
		}
		
		//-

		if(settings.kinematic){
			viewObject.physicsObject.type = CANNON.Body.KINEMATIC;
		}
		
		//-
		
		this.world.addBody( viewObject.physicsObject );
		
		//-
		
		viewObject.physicsObject.viewObject = viewObject;
		viewObject.physicsObject.setVelocity = this.setVelocity;
		viewObject.physicsObject.setAngularVelocity = this.setAngularVelocity;
	}
	
	#addShape( viewObject, shapeObject = {}){
		let physicsShape;
		
		//-
		
		if(!viewObject.wx || !viewObject.wy || !viewObject.wz){
			this.calculateSize( viewObject );
		}
	
		if(!shapeObject.wx || !shapeObject.wy || !shapeObject.wz){
			this.calculateSize( shapeObject );
		}
		
		//-

		shapeObject = Object.assign({
				
			shape 			: "box",
			
			wx 				: shapeObject.wx || viewObject.wx,
			wy 				: shapeObject.wy || viewObject.wy,
			wz 				: shapeObject.wz || viewObject.wz,
			scaleSize 		: 1,
			
			rTop 			: shapeObject.wx*0.5 || viewObject.wx*0.5,
			rBottom 		: shapeObject.wx*0.5 || viewObject.wx*0.5,
			height			: shapeObject.wy || viewObject.wy,
			numSegments 	: 12,
			
			matrix			: null,
			elementSize		: 1,
			steps			: 10,
			
			position 		: new CANNON.Vec3(),
			quaternion 		: new CANNON.Quaternion(),
					
		}, shapeObject);
		
		//-

		if(shapeObject.shape == "box"){		
		
			physicsShape = new CANNON.Box(new CANNON.Vec3(
				shapeObject.scaleSize * shapeObject.wx * 0.5,
				shapeObject.scaleSize * shapeObject.wy * 0.5,
				shapeObject.scaleSize * shapeObject.wz * 0.5
			));
			
		}else if(shapeObject.shape == "sphere"){		
			
			physicsShape = new CANNON.Sphere( shapeObject.scaleSize * shapeObject.wx * 0.5 );
		
		}else if(shapeObject.shape == "cylinder"){		
			
			physicsShape = new CANNON.Cylinder(
				shapeObject.scaleSize * shapeObject.rTop,
				shapeObject.scaleSize * shapeObject.rBottom,
				shapeObject.scaleSize * shapeObject.height,
				shapeObject.scaleSize * shapeObject.numSegments			
			);	
			
		}else if(shapeObject.shape == "terrain"){	
			
			let raycaster = new THREE.Raycaster();
			//raycaster.params.Points.threshold = 0.1;
			
			let direction = new THREE.Vector3(0, -1, 0);
			let step = 16/(shapeObject.steps);
			let width = shapeObject.wx;
			let height = shapeObject.wz;
			let heights = [];
			
			for (let i = -width*0.5; i <= width*0.5; i += step){			
				let row = [];
				
				for (let j = -height*0.5; j <= height*0.5; j += step) {
					let origin = new THREE.Vector3(i, 100, -j);
					raycaster.set(origin, direction);
					let intersects = raycaster.intersectObject(viewObject);

					if (intersects.length > 0) {
						row.push(intersects[0].point.y);
					}else{
						row.push(-2);
					}
				}

				heights.push(row);
			}

			shapeObject.matrix = heights;
			shapeObject.elementSize = step;
			
			physicsShape = new CANNON.Heightfield(
				shapeObject.matrix,
				{
					elementSize : shapeObject.elementSize,
				}
			);	
			
		}

		viewObject.physicsObject.addShape( physicsShape, shapeObject.position, shapeObject.quaternion);
		
		if(shapeObject.shape == "terrain"){
					
			viewObject.physicsObject.quaternion.setFromEuler(-Math.PI*0.5, 0, 0);
			viewObject.physicsObject.position.set(
				-((shapeObject.matrix.length - 1) * shapeObject.elementSize) * 0.5,
				0,
				+((shapeObject.matrix[0].length - 1) * shapeObject.elementSize) * 0.5
			)
		}
	}
	
	addJoint( viewA, viewB, type="distance", settings={}){
		let joint;
		
		if(type == "distance"){
			
			settings = Object.assign({
				distance			: 1,
				collideConnected	: true,
			}, settings);
			
			joint = new CANNON.DistanceConstraint(
				viewA.physicsObject,
				viewB.physicsObject,
				settings.distance,
				settings
			);
			
		}else if(type == "gear"){
			
		}else if(type == "revolute"){
			
		}else if(type == "cone"){
						
			settings = Object.assign({
				pivotA 		: new CANNON.Vec3(0, 0, 0),
				pivotB 		: new CANNON.Vec3(0, 0, 0),
				axisA		: new CANNON.Vec3(0, 1, 0),
				axisB		: new CANNON.Vec3(0, 1, 0),
				angle		: 0.25*Math.PI,
				twistAngle	: 0.25*Math.PI,
			}, settings);
			
			joint = new CANNON.ConeTwistConstraint(
				viewA.physicsObject,				
				viewB.physicsObject,
				settings
			);
						
		}else if(type == "lock"){
			
			settings = Object.assign({
				pivotA : new CANNON.Vec3(0, 0, 0),
				pivotB : new CANNON.Vec3(0, 0, 0),
			}, settings);
			
			joint = new CANNON.PointToPointConstraint(
				viewA.physicsObject,
				settings.pivotA,
				viewB.physicsObject,
				settings.pivotB,
			);
			
		}else if(type == "prismatic"){
			
		}
	
		if(joint){
			joint.viewA = viewA;
			joint.viewB = viewB;

			this.addJointReference( joint, viewA, viewB );
			
			this.world.addConstraint( joint );
			
		}
		
		return joint;
	}
	
	addSpring( viewA, viewB, settings={}){
		settings = Object.assign({
			restLength	: 1,
			stiffness	: 100,
			damping		: 0.01,
		}, settings);
		
		let spring = new CANNON.Spring(
			viewA.physicsObject,
			viewB.physicsObject,
			settings
		);
		
		if(!viewA.physicsObject.springPhysics){
			viewA.physicsObject.springPhysics = [];
		}
		
		if(!viewB.physicsObject.springPhysics){
			viewB.physicsObject.springPhysics = [];
		}
	
		viewA.physicsObject.springPhysics.push( spring );
		viewB.physicsObject.springPhysics.push( spring );
		
		spring.views = [viewA, viewB];
		
		this.#springs.push( spring );

		return spring;
	}
	
	remove = ( viewObject ) => {
		if(viewObject.physicsObject){
			this.removeBodyJoints( viewObject );
			
			this.world.removeBody( viewObject.physicsObject );	
			
			viewObject.physicsObject = null;
			viewObject.physicsCharacter = false;			
		}	
	}
	
	removeSpring( spring ){
		for(let i=0; i<spring.views.length; i++){
			let id = spring.views[i].physicsObject.springPhysics.indexOf( spring );
			spring.views[i].physicsObject.springPhysics.splice(id, 1);
			if(spring.views[i].physicsObject.springPhysics.length == 0){
				spring.views[i].physicsObject.springPhysics = null;
			}
		}
		
		this.#springs.splice(this.#springs.indexOf(spring), 1);
		
		spring.views = null;
		spring = null;
	}
	
	removeJoint = ( joint ) => {
		if(joint){
			this.world.removeConstraint( joint );
			this.removeJointReference( joint.viewA, joint );
			this.removeJointReference( joint.viewB, joint );
		}	
	}

	removeAllBodies = () => {
		for(let i=this.world.bodies.length-1; i>=0; i--){
			this.remove( this.world.bodies[i].viewObject );	
		}
	}
	
	removeAllSprings = () => {
		for(let i=this.#springs.length-1; i>=0; i--){
			this.removeSpring( this.#springs[i] );	
		}
	}
	
	removeAllJoints = () => {
		for(let i=this.world.constraints.length-1; i>=0; i--){
			this.removeJoint( this.world.constraints[i] );
		}
	}
	
	removeAll = () => {
		this.removeAllSprings();	
		this.removeAllJoints();	
		this.removeAllBodies();
	}

	//------------------------------------------------------------------------
	
	setVelocity(vx = 0, vy = 0, vz = 0){
		this.velocity.x = vx;
		this.velocity.y = vy;
		this.velocity.z = vz;
		
		return this;
	}
	
	setAngularVelocity(vx = 0, vy = 0, vz = 0){
		this.angularVelocity.x = vx;
		this.angularVelocity.y = vy;
		this.angularVelocity.z = vz;
		
		return this;
	}
	
	//------------------------------------------------------------------------
	
	addCharacter( viewObject, settings = {} ){
		return this.addCharacterBody( viewObject, settings );
	}
	
	removeCharacter( viewObject ){
		this.removeCharacterBody( viewObject );
	}

	//------------------------------------------------------------------------
	
	addRagdoll( viewObject, settings = {shape:"box"} ){
		
		if(!viewObject.ragdoll.isInit){
			viewObject.ragdoll.isInit = true;
			viewObject.ragdoll.items = [];
			
			for(let i=0; i<viewObject.ragdoll.children.length; i++){
				let item = viewObject.ragdoll.children[i];
				
				item.mPos = item.position.clone();
				item.mRot = item.rotation.clone();		

				item.targetBone = viewObject["Bone"+(item.name.replace("phs", ""))];
				
				viewObject.ragdoll.items.push( item );	
			}
		}
			
		//-

		for(let i=0; i<viewObject.ragdoll.items.length; i++){
			let item = viewObject.ragdoll.items[i];
			
			//-
			
			this.remove( item );
			
			//-
			
			viewObject.ragdoll.add( item );
		
			item.position.copy( item.mPos );
			item.rotation.copy( item.mRot );
			
			if(viewObject.parent){
				viewObject.parent.attach( item );
			}
			
			//-
	
			this.add(item, {mass: 5, shape: settings.shape});
		}
	
		//-
		
		if(viewObject["physicsJointBodyHead"]){
			this.removeJoint( viewObject["physicsJointBodyHead"] );
		}
		
		viewObject["physicsJointBodyHead"] = this.addJoint(
			viewObject["phsBody_0"],
			viewObject["phsHead"],
			"cone",
			{
				pivotA: new CANNON.Vec3(
					0,
					+viewObject["phsBody_0"].wy*0.5-0.02,
					0
				),
				pivotB: new CANNON.Vec3(
					0,
					-viewObject["phsHead"].wy*0.5+0.02,
				   0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.2 + 0.8,
				twistAngle	: 0.2 + 0.8,
			}
		);
	
		//-
		
		if(viewObject["physicsJointBodyBody"]){
			this.removeJoint( viewObject["physicsJointBodyBody"] );
		}
	
		viewObject["physicsJointBodyBody"] = this.addJoint(
			viewObject["phsBody_0"],
			viewObject["phsBody_1"],
			"cone",
			{
				pivotA: new CANNON.Vec3(
					0,
					-viewObject["phsBody_0"].wy*0.5-0.00,
					0
				),
				pivotB: new CANNON.Vec3(
					0,
					+viewObject["phsBody_1"].wy*0.5+0.00,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.0 + 0.8,
				twistAngle	: 0.0 + 0.8,
			}
		);
		
		//-
		
		if( viewObject["physicsJointBodyHandL_0"] ){
			this.removeJoint( viewObject["physicsJointBodyHandL_0"] );
		}
	
		viewObject["physicsJointBodyHandL_0"] = this.addJoint(
			viewObject["phsBody_0"],
			viewObject["phsHandL_0"],
			"cone",
			{
				pivotA: new CANNON.Vec3(
					+viewObject["phsBody_0"].wx*0.5-0.02,
					+viewObject["phsBody_0"].wy*0.5-0.02,
					+viewObject["phsBody_0"].wz*0.5-0.15
				),
				pivotB: new CANNON.Vec3(
					-viewObject["phsHandL_0"].wx*0.5-0.0,
					0,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.8 + 0.8,
				twistAngle	: 0.8 + 0.8,
			}
		);
		
		//-
		
		if(viewObject["physicsJointHandL_01"]){
			this.removeJoint( viewObject["physicsJointHandL_01"] );
		}
	
		viewObject["physicsJointHandL_01"] = this.addJoint(
			viewObject["phsHandL_0"],
			viewObject["phsHandL_1"],				
			"cone",
			{
				pivotA: new CANNON.Vec3(
					+viewObject["phsHandL_0"].wx*0.5+0.0,
					0,
					0
				),
				pivotB: new CANNON.Vec3(
					-viewObject["phsHandL_1"].wx*0.5-0.0,
					0,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.3 + 0.8,
				twistAngle	: 0.3 + 0.8,
			}
		);
		
		//-
		
		if(viewObject["physicsJointBodyHandR_0"]){
			this.removeJoint( viewObject["physicsJointBodyHandR_0"] );
		}
	
		viewObject["physicsJointBodyHandR_0"] = this.addJoint(
			viewObject["phsBody_0"],
			viewObject["phsHandR_0"],	
			"cone",
			{
				pivotA: new CANNON.Vec3(
					-viewObject["phsBody_0"].wx*0.5+0.05,
					+viewObject["phsBody_0"].wy*0.5-0.02,
					+viewObject["phsBody_0"].wz*0.5-0.15
				),
				pivotB: new CANNON.Vec3(
					+viewObject["phsHandR_0"].wx*0.5-0.0,
					0,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.8 + 0.8,
				twistAngle	: 0.8 + 0.8,
			}
		);
		
		//-
		
		if(viewObject["physicsJointHandR_01"]) {
			this.removeJoint( viewObject["physicsJointHandR_01"] );
		}
	
		viewObject["physicsJointHandR_01"] = this.addJoint(
			viewObject["phsHandR_0"],
			viewObject["phsHandR_1"],
			"cone",
			{
				pivotA: new CANNON.Vec3(
					-viewObject["phsHandR_0"].wx*0.5-0.0,
					0,
					0
				),
				pivotB: new CANNON.Vec3(
					+viewObject["phsHandR_1"].wx*0.5+0.0,
					0,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.3 + 0.8,
				twistAngle	: 0.3 + 0.8,
			}
		);
		
		//-
		
		if(viewObject["physicsJointBodyLegL_0"]) {
			this.removeJoint( viewObject["physicsJointBodyLegL_0"] );
		}
	
		viewObject["physicsJointBodyLegL_0"] = this.addJoint(
			viewObject["phsBody_1"],
			viewObject["phsLegL_0"],
			"cone",
			{
				pivotA: new CANNON.Vec3(
					+viewObject["phsBody_1"].wx*0.3-0.00,
					-viewObject["phsBody_1"].wy*0.5+0.00,
					0
				),
				pivotB: new CANNON.Vec3(
					0,
					+viewObject["phsLegL_0"].wy*0.5-0.00,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.2 + 0.8,
				twistAngle	: 0.2 + 0.8,
			}
		);
		
		//-
		
		if(viewObject["physicsJointBodyLegL_01"]){
			this.removeJoint( viewObject["physicsJointBodyLegL_01"] );
		}
	
		viewObject["physicsJointBodyLegL_01"] = this.addJoint(
			viewObject["phsLegL_0"],
			viewObject["phsLegL_1"],
			"cone",
			{
				pivotA: new CANNON.Vec3(
					0,
					-viewObject["phsLegL_0"].wy*0.5-0.00,
					-0.02
				),
				pivotB: new CANNON.Vec3(
					0,
					+viewObject["phsLegL_1"].wy*0.5+0.00,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.2 + 0.8,
				twistAngle	: 0.2 + 0.8,
			}
		);
			
		//-
		
		if(viewObject["physicsJointBodyLegR_0"]){
			this.removeJoint( viewObject["physicsJointBodyLegR_0"] );
		}
	
		viewObject["physicsJointBodyLegR_0"] = this.addJoint(
			viewObject["phsBody_1"],
			viewObject["phsLegR_0"],
			"cone",
			{
				pivotA: new CANNON.Vec3(
					-viewObject["phsBody_1"].wx*0.3+0.00,
					-viewObject["phsBody_1"].wy*0.5+0.00,
					-0
				),
				pivotB: new CANNON.Vec3(
					0,
					+viewObject["phsLegR_0"].wy*0.5-0.00,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.2 + 0.8,
				twistAngle	: 0.2 + 0.8,
			}
		);
		
		//-
		
		if(viewObject["physicsJointBodyLegR_01"]){
			this.removeJoint( viewObject["physicsJointBodyLegR_01"] );
		}
	
		viewObject["physicsJointBodyLegR_01"] = this.addJoint(
			viewObject["phsLegR_0"],
			viewObject["phsLegR_1"],
			"cone",
			{
				pivotA: new CANNON.Vec3(
					0,
					-viewObject["phsLegR_0"].wy*0.5-0.00,
					-0.00
				),
				pivotB: new CANNON.Vec3(
					0,
					+viewObject["phsLegR_1"].wy*0.5+0.00,
					0
				),
				axisA		: CANNON.Vec3.UNIT_Y,
				axisB		: CANNON.Vec3.UNIT_Y,
				angle		: 0.2 + 0.8,
				twistAngle	: 0.2 + 0.8,
			}
		);
		
		//-
		
		viewObject.physicsRagdoll = true;
		
		this.#ragdolls.push( viewObject );
	}
	
	removeRagdoll( viewObject ){
		if(viewObject.physicsRagdoll){
			
			if(viewObject["physicsJointBodyLegR_01"]){ this.removeJoint( viewObject["physicsJointBodyLegR_01"] ); }
			if(viewObject["physicsJointBodyHead"]){ this.removeJoint( viewObject["physicsJointBodyHead"] ); }
			if(viewObject["physicsJointBodyBody"]){ this.removeJoint( viewObject["physicsJointBodyBody"] ); }
			if( viewObject["physicsJointBodyHandL_0"] ){ this.removeJoint( viewObject["physicsJointBodyHandL_0"] ); }
			if(viewObject["physicsJointHandL_01"]){ this.removeJoint( viewObject["physicsJointHandL_01"] ); }
			if(viewObject["physicsJointBodyHandR_0"]){ this.removeJoint( viewObject["physicsJointBodyHandR_0"] ); }
			if(viewObject["physicsJointHandR_01"]) { this.removeJoint( viewObject["physicsJointHandR_01"] ); }
			if(viewObject["physicsJointBodyLegL_0"]) { this.removeJoint( viewObject["physicsJointBodyLegL_0"] ); }
			if(viewObject["physicsJointBodyLegL_01"]){ this.removeJoint( viewObject["physicsJointBodyLegL_01"] ); }
			if(viewObject["physicsJointBodyLegR_0"]){ this.removeJoint( viewObject["physicsJointBodyLegR_0"] ); }
			
			for(let i=0; i<viewObject.ragdoll.items.length; i++){
				this.remove( viewObject.ragdoll.items[i] );
			}
			
			//-
			
			viewObject.physicsRagdoll = false;
			
			this.#ragdolls.splice( this.#ragdolls.indexOf(viewObject), 1);
		}
	}
	
	#updateRagdoll( viewObject ) {
		if(viewObject.physicsRagdoll){
			viewObject.position.set(0, 0, 0);
		
			for(let i=0; i<viewObject.ragdoll.items.length; i++){
				viewObject.position.x += viewObject.ragdoll.items[i].position.x;
				viewObject.position.y += viewObject.ragdoll.items[i].position.y;
				viewObject.position.z += viewObject.ragdoll.items[i].position.z;
			}
		
			viewObject.position.x = viewObject.position.x / viewObject.ragdoll.items.length;
			viewObject.position.y = viewObject.position.y / viewObject.ragdoll.items.length;
			viewObject.position.z = viewObject.position.z / viewObject.ragdoll.items.length;			
		
			for(let i=0; i<viewObject.ragdoll.items.length; i++){
				let item = viewObject.ragdoll.items[i];
				
				item.targetBone.parent.attach( item );
				
				item.targetBone.position.copy( item.position );			
				item.targetBone.quaternion.copy( item.quaternion );
				
				viewObject.parent.attach( item );
			}
		}
	}

	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta ) => { 
		if(this.#app.timeScale != 1){
			if(this.#app.timeScale != 0){
				this.world.step(1/60*this.#app.timeScale);
			}
		}else{
			this.world.fixedStep();
		}

		for(let i=this.world.bodies.length-1; i>=0; i--){
			let physicsObject = this.world.bodies[i];
			let viewObject = this.world.bodies[i].viewObject;
			
			//-
			
			//physicsObject.velocity.x *= physicsObject.linearDamping.x;
			//physicsObject.velocity.y *= physicsObject.linearDamping.y;
			//physicsObject.velocity.z *= physicsObject.linearDamping.z;
			//
			//physicsObject.angularVelocity.x *= physicsObject.angularFactor.x;
			//physicsObject.angularVelocity.y *= physicsObject.angularFactor.y;
			//physicsObject.angularVelocity.z *= physicsObject.angularFactor.z;
			
			//-
			
			if(!viewObject.physicsCharacter){
				if(physicsObject.mass != 0){	
					viewObject.position.copy( physicsObject.position );
					viewObject.quaternion.copy( physicsObject.quaternion );
				}
			}else{
				physicsObject.sleepState = 1;
				this.updateCharacterBody( viewObject, physicsObject, this.#app.timeScale, {
					position		: physicsObject.position,
					quaternion		: physicsObject.quaternion,
					velocity		: physicsObject.velocity,
					linearDamping	: physicsObject.linearDamping,
					setQuaternion	: quaternion => {
						physicsObject.quaternion = quaternion;
					},
				});
			}
		}
		
		for(let i=0; i<this.#springs.length; i++){
			this.#springs[i].applyForce();
		}
		
		for(let i=0; i<this.#ragdolls.length; i++){
			this.#updateRagdoll( this.#ragdolls[i] );
		}
		
		if(this.cannonDebugger3d)this.cannonDebugger3d.update();	
    }
	
	//------------------------------------------------------------------------
	
	//resize = (width, height)=>{  		
	//	
    //}
}

Physics3d.registerEngine("cannon", Physics3dCannon);

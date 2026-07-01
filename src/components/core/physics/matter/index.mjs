import * as IMPION from "#impion";
import Matter from "matter-js";	

export default class Physics2dMatter extends IMPION.ComponentEmpty{

	type = "physics2d";
	
	engine;
	world;
	
	#app;
	
	#isDebug = false;
	#debugView;
	
	//------------------------------------------------------------------------
	
	constructor({fps = 60, order = ""}){
		super(fps, order);
		
		//-
	
		this.engine = new Matter.Engine.create();
		this.world = this.engine.world;			
		
		this.engine.positionIterations = 15;
		this.engine.velocityIterations = 15;
		this.engine.constraintIterations = 4;
		this.engine.enableSleeping = false;
		
		this.engine.gravity.y = 1.5;
    }

	//------------------------------------------------------------------------

	init( app, funComplete ){
		this.#app = app;
		
		funComplete();
	}
	
	//------------------------------------------------------------------------

	showDebugger( app ){
		this.#isDebug = true;
		this.#debugView = app.view2d.scene;
				
		this.debugObject = new IMPION.Graphics2d();
		this.#debugView.addChild( this.debugObject );
	}

	//------------------------------------------------------------------------
	
	setGravity(vx, vy){
		this.engine.world.gravity.x = vx;
		this.engine.world.gravity.y = vy;
	}
	
	setVelocity(vx, vy){
		Matter.Body.setVelocity(this, Matter.Vector.create(vx*0.3, vy*0.3) );
	}
	
	//------------------------------------------------------------------------

	add( viewObject, settings = {} ){
		
		this.remove( viewObject );
		
		//-

		settings = Object.assign({
			
			isStatic			: false,				
			shapes				: [],		
			shape				: "box",		
			mass				: 50,
			
			kinetic				: false,
			
			density				: 0.1,
			friction			: 0.1,
			frictionStatic		: 0.0,
			restitution			: 0.1,

		}, settings);
		
		//-
		
		if(settings.mass > 0 && !settings.kinetic){
			settings.isStatic = false;
		}else{
			settings.isStatic = true;
		}
		
		//-
		
		if(viewObject.wx == undefined){
			if(settings.wx !== undefined){
				viewObject.wx = settings.wx;
			}else{
				viewObject.wx = viewObject.width;
			}
			if(settings.wy !== undefined){
				viewObject.wy = settings.wy;
			}else{
				viewObject.wy = viewObject.height;
			}
		}
		
		if(viewObject.rotation == undefined){
			viewObject.rotation = 0;
		}
		
		//-
		
		if(settings.shapes.length > 0){
			
			let parts = [];
			
			for(let i=0; i<settings.shapes.length; i++){
				settings.shapes[i] = Object.assign({
					isStatic			: false,				
					shapes				: [],		
					shape				: "box",		
					mass				: 50,
					
					kinetic				: false,
					
					density				: 0.1,
					friction			: 0.1,
					frictionStatic		: 0.0,
					restitution			: 0.1,
					
					x					: 0,
					y					: 0,
					wx					: null,
					wy					: null,
					
				}, settings.shapes[i]);
				
				if(!settings.shapes[i].wx || !settings.shapes[i].wy){
					settings.shapes[i].wx = settings.shapes[i].width;
					settings.shapes[i].wy = settings.shapes[i].height;
				}
				
				parts.push( this.createBody( settings.shapes[i].shape, settings.shapes[i], settings.shapes[i] ) );

			}
			
			viewObject.physicsObject = Matter.Body.create({
				parts : parts
			});
			
		}else{
			
			if(settings.shape == "capsule"){
				
				settings.parts = [];
						
				settings.parts.push( this.createBody( "box", 	{x:0, y:0, wx:2*settings.radius, wy:settings.length}, {} ) );
				settings.parts.push( this.createBody( "circle", {x:0, y:-0.5*settings.length, wx:2*settings.radius, wy:settings.length}, {} ) );
				settings.parts.push( this.createBody( "circle", {x:0, y:+0.5*settings.length, wx:2*settings.radius, wy:settings.length}, {} ) );
				
				viewObject.physicsObject = Matter.Body.create( settings );
				
			}else{
				
				viewObject.physicsObject = this.createBody( settings.shape, viewObject, settings );
				
			}
			
			
			
		}
		
		Matter.Body.setAngle(viewObject.physicsObject, viewObject.rotation);
			
		//-
		
		Matter.Composite.add(this.world, viewObject.physicsObject);	
	
		//-
		
		viewObject.physicsObject.viewObject = viewObject;
		viewObject.physicsObject.setVelocity = this.setVelocity;
			
	}
	
	createBody = ( shape, viewObject, settings) => {
		
		if(shape == "box"){
			
			return Matter.Bodies.rectangle(
				viewObject.x - 0*viewObject.wx*0.5,
				viewObject.y - 0*viewObject.wy*0.5,
				viewObject.wx,
				viewObject.wy,
				settings,				
			);
			
		}else if(shape == "circle"){
			
			return Matter.Bodies.circle(
				viewObject.x,
				viewObject.y,
				viewObject.wx*0.5,
				settings,
			);
			
		}else if(shape == "convex" || shape == "polygon"){
			
			console.log("Only convex objects are processed");
			
			return Matter.Bodies.fromVertices(
				viewObject.x,
				viewObject.y,
				[Matter.Vertices.clockwiseSort(settings.points.flat())],
				settings,
				true
			);
			
		}
		
	}
	
	addJoint( viewA, viewB, type="distance", settings={}){
		let joint;
		
		if(type == "distance"){
			
			settings = Object.assign({
				distance			: 100,
				localAnchorA		: [0.5, 0.5],
				localAnchorB		: [0.5, 0.5],
				collideConnected	: true,
			}, settings);
			
			
		}else if(type == "gear"){
			
			settings = Object.assign({
				angle				: 1,
				ratio				: 2,
				maxTorque			: 1000,
			}, settings);
			
		}else if(type == "revolute"){
			
			settings = Object.assign({
				//worldPivot			: [0,0],
				//localPivotA			: [0,0],
				//localPivotB			: [0,0],
				//maxForce				: 10,
			}, settings);
			
		}else if(type == "lock"){
			
			settings = Object.assign({
				//localOffsetB			: [0,0],
				//localAngleB			: 0,
				//maxForce				: 10,
			}, settings);
			
		}else if(type == "prismatic"){
			
			settings = Object.assign({
				//localAnchorA				: [0,0],
				//localAnchorB				: [0,0],
				//localAxisA				: [0,0],
				//disableRotationalLock		: false,
				//upperLimit				: 10,
				//lowerLimit				: 10,
				//maxForce					: 10,
			}, settings);
			
		}
	
		if(joint){
			if(!viewA.physicsObject.joinsPhysics){
				viewA.physicsObject.joinsPhysics = [];
			}
			if(!viewB.physicsObject.joinsPhysics){
				viewB.physicsObject.joinsPhysics = [];
			}
			
			viewA.physicsObject.joinsPhysics.push( joint );
			viewB.physicsObject.joinsPhysics.push( joint );
			
			Matter.World.add(this.world, joint );
		}
	}

	remove( viewObject ){
		if(viewObject.physicsObject){
			if(viewObject.physicsObject.joinsPhysics){
				for(let i=0; i<viewObject.physicsObject.joinsPhysics.length; i++){
					if(viewObject.physicsObject.joinsPhysics[i]){
						this.removeJoint( viewObject.physicsObject.joinsPhysics[i] );			
					}
				}
			}
			
			Matter.World.remove(this.world, viewObject.physicsObject);
			viewObject.physicsObject = null;
		}
	}
	
	removeJoint( joint ){
		if(joint){
			Matter.World.remove(this.world, joint);
		}		
	}

	removeAll(){
		for(let i = this.world.bodies.length-1; i >= 0; i--){
			this.remove( this.world.bodies[i].viewObject );	
		}

		for(let i = this.world.constraints.length-1; i >= 0; i--){
			this.removeJoint( this.world.constraints[i] );
		}
	}
	
	//------------------------------------------------------------------------
	
	addCharacter( viewObject, settings = {} ){

		settings = Object.assign({

			isStatic			: false,				
			shape				: "circle",		
			mass				: 5,
			
			density				: 1.0,
			friction			: 1.0,
			frictionStatic		: 1.0,
			frictionAir			: 0.2,
			restitution			: 0.1,
	
			scaleSize			: 1,
				
		}, settings);
			
		//-
		
		this.add(viewObject, settings);
		
		//-
		
		viewObject.physicsCharacter = true;
		
	}
	
	removeCharacter( viewObject ){
		this.remove(viewObject);
		
		viewObject.physicsCharacter = false;
	}

	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{  		
		Matter.Engine.update( this.engine );
		
		let bodies = Matter.Composite.allBodies( this.world );
		
		if(this.#isDebug){
			this.debugObject.clear();
			this.debugObject.lineStyle(2, 0xfff600, 1);
		}
		
		for (let i = 0; i < bodies.length; i++) {
			let physicsObject = bodies[i];
			let viewObject = bodies[i].viewObject;
			
			if(!viewObject.physicsCharacter){
				
				viewObject.x = physicsObject.position.x;
				viewObject.y = physicsObject.position.y;
				viewObject.rotation = physicsObject.angle;
			
			}else{
				
				//- location
				
				viewObject.positionTo.x = physicsObject.position.x;
				viewObject.positionTo.y = physicsObject.position.y;
				
				//- rotation 
				
				while(viewObject.angleVelocity - viewObject.angleVelocityCurrent > Math.PI){ viewObject.angleVelocity -= 2*Math.PI; }
				while(viewObject.angleVelocityCurrent - viewObject.angleVelocity > Math.PI){ viewObject.angleVelocity += 2*Math.PI; }
				
				viewObject.angleVelocityCurrent = viewObject.angleVelocity - 0.65*(viewObject.angleVelocity - viewObject.angleVelocityCurrent);
				
				if(viewObject.autoRotation){
					viewObject.rotation = viewObject.angleVelocityCurrent;
				}
				
				//- velocity
				
				let _vx;
				let _vy;
				
				if(viewObject.isAction["walk"]){							
					_vx = +viewObject.forceWalk * Math.cos(viewObject.angleVelocityCurrent);
					_vy = +viewObject.forceWalk * Math.sin(viewObject.angleVelocityCurrent);
				}else if(viewObject.isAction["run"] || viewObject.isRun){							
					_vx = +viewObject.forceRun * Math.cos(viewObject.angleVelocityCurrent);
					_vy = +viewObject.forceRun * Math.sin(viewObject.angleVelocityCurrent);
				}
				
				if(viewObject.isAction["walk"] || viewObject.isAction["run"] || viewObject.isRun){
					physicsObject.setVelocity(_vx, _vy);
					
					if(viewObject.mirrorX){
						viewObject["mirrorContainer"].scale.x = 1;
						if(_vx < 0){
							viewObject["mirrorContainer"].scale.x = -1;
						}
					}
				}
				
				//- position
				
				viewObject.x = viewObject.positionTo.x - 0.65*(viewObject.positionTo.x - viewObject.x);	
				viewObject.y = viewObject.positionTo.y - 0.65*(viewObject.positionTo.y - viewObject.y);
			
			}
			
			if(this.#isDebug){
				let vertices = physicsObject.vertices;
				
				this.debugObject.moveTo(vertices[0].x, vertices[0].y);
				for (let j = 1; j < vertices.length; j++) {
					this.debugObject.lineTo(vertices[j].x, vertices[j].y);
				}
				this.debugObject.lineTo(vertices[0].x, vertices[0].y);		

				if(physicsObject.shape == "box")	{
					
					this.debugObject.moveTo(vertices[0].x, vertices[0].y);
					this.debugObject.lineTo(vertices[2].x, vertices[2].y);		
				
				}else if(physicsObject.shape == "circle")	{
					this.debugObject.moveTo(physicsObject.position.x, physicsObject.position.y);
					this.debugObject.lineTo(vertices[0].x, vertices[0].y);		
				
				}else if(physicsObject.shape == "polygon")	{
					
				}
			}
		}
		
		if(this.#isDebug){
			this.debugObject.endFill();
			this.#debugView.addChild( this.debugObject );
		}
		
    }
}
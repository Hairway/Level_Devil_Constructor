import * as IMPION from "#impion";
import * as p2 from "p2-es";

export default class Physics2dP2 extends IMPION.ComponentEmpty{

	type = "physics2d";
	
	world;
	
	#app;
	
	#isDebug = false;
	#debugView;
	
	constructor({fps = 60, order = ""}){
		super(fps, order);
		
		//-
	
		this.world = new p2.World({
			gravity		: [0, 9.8],
			islandSplit	: true
		});
		this.world.sleepMode = p2.World.NO_SLEEPING;

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
		this.world.gravity[0] = vx;
		this.world.gravity[1] = vy;
	}
	
	setVelocity(vx, vy){
		this.velocity[0] = vx;
		this.velocity[1] = vy;
	}
	
	//------------------------------------------------------------------------

	add( viewObject, settings = {} ){
		
		this.remove( viewObject );
		
		//-

		settings = Object.assign({
			
			mass					: 5,
			
			allowSleep				: true,		
			material				: null,
			
			kinematic				: false,
			
			fixedX					: false,
			fixedY					: false,
			fixedRotation			: false,		
			
			velocity				: {x:0, y:0},
			angularVelocity			: 0,
			
			damping					: 0.1,
			angularDamping			: 0.1,

			shape					: "box",
			shapes					: [],
					
		}, settings);

		//-
		
		viewObject.physicsObject = new p2.Body({
			mass					: settings.mass,
			
			position				: [viewObject.x, viewObject.y],
			angle					: viewObject.rotation,
			
			damping					: settings.damping,
			angularDamping			: settings.angularDamping,
			
			fixedX					: settings.fixedX,
			fixedY					: settings.fixedY,
			fixedRotation			: settings.fixedRotation,		
			
			allowSleep				: settings.allowSleep,
			material				: settings.material,
			
			velocity				: [settings.velocity.x, settings.velocity.y],
			angularVelocity			: settings.angularVelocity,

		});
				
		if(settings.kinematic){
			viewObject.physicsObject.type = p2.Body.KINEMATIC;
		}
		
		//-
		
		if(settings.shapes.length > 0){
			for(let i=0; i<settings.shapes.length; i++){
				if(!settings.shapes[i].position){
					settings.shapes[i].position = [];
					settings.shapes[i].position[0] = settings.shapes[i].x;
					settings.shapes[i].position[1] = settings.shapes[i].y;
				}
				
				if(settings.shapes[i].angle == undefined){
					if(settings.shapes[i].rotation != undefined){
						settings.shapes[i].angle = settings.shapes[i].rotation;
					}else{
						settings.shapes[i].angle = 0;
					}
				}
				
				this.#addShape( viewObject, settings.shapes[i] );
			}
		}else{		
			this.#addShape( viewObject, settings );		
		}
		
		//-
					
		this.world.addBody( viewObject.physicsObject );
	
		//-
		
		viewObject.physicsObject.viewObject = viewObject;
		viewObject.physicsObject.setVelocity = this.setVelocity;
		
	}
	
	#addShape( viewObject, settings = {}){
		let physicsShape;
		
		if(viewObject.wx == undefined){
			viewObject.wx = viewObject.width;
			viewObject.wy = viewObject.height;
		}
		
		settings = Object.assign({
				
			shape 			: "box",

			wx 				: viewObject.wx,
			wy 				: viewObject.wy,
			
			length 			: 1,
			radius 			: 2,
			
			vertices 		: [],
			
			position 		: [0, 0],
			angle 			: 0,
					
		}, settings);
		
		//-

		if(settings.shape == "box"){		
			
			physicsShape = new p2.Box({
				width	: settings.wx,
				height	: settings.wy
			});

		}else if(settings.shape == "circle"){		
			
			physicsShape = new p2.Circle({
				radius : settings.wx*0.5
			});
		
		}else if(settings.shape == "capsule"){		
			
			physicsShape = new p2.Capsule({
				length : settings.length,
				radius : settings.radius,		
			});	
			
		}else if(settings.shape == "plane"){		
			
			physicsShape = new p2.Plane();	
			
		}else if(settings.shape == "convex"){		
			
			if(settings.points){
				settings.vertices = [];
				for(let i=0; i<settings.points.length; i++){
					settings.vertices.push([settings.points[i].x, settings.points[i].y]);
				}
			}
			
			physicsShape = new p2.Convex({
				vertices : settings.vertices		
			});	
			
		}else if(settings.shape == "polygon"){		
			
			if(settings.points){
				settings.vertices = [];
				for(let i=0; i<settings.points.length; i++){
					settings.vertices.push([settings.points[i].x, settings.points[i].y]);
				}
			}
			
			physicsShape = new p2.Convex();
		}

		viewObject.physicsObject.addShape(physicsShape, settings.position, settings.angle);
		
		if(settings.shape == "polygon"){
			viewObject.physicsObject.fromPolygon( settings.vertices );
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
			
			joint = new p2.DistanceConstraint(viewA.physicsObject, viewB.physicsObject, settings);
			
		}else if(type == "gear"){
			
			settings = Object.assign({
				angle				: 1,
				ratio				: 2,
				maxTorque			: 1000,
			}, settings);
			
			joint = new p2.GearConstraint(viewA.physicsObject, viewB.physicsObject, settings);

		}else if(type == "revolute"){
			
			settings = Object.assign({
				worldPivot			: [0,0],
				localPivotA			: [0,0],
				localPivotB			: [0,0],
				maxForce				: 10,
			}, settings);
			
			joint = new p2.RevoluteConstraint(viewA.physicsObject, viewB.physicsObject, settings);

		}else if(type == "lock"){
			
			settings = Object.assign({
				localOffsetB		: [0,0],
				localAngleB			: 0,
				maxForce			: 10,
			}, settings);
			
			joint = new p2.LockConstraint(viewA.physicsObject, viewB.physicsObject, settings);

		}else if(type == "prismatic"){
			
			settings = Object.assign({
				localAnchorA				: [0,0],
				localAnchorB				: [0,0],
				localAxisA					: [0,0],
				disableRotationalLock		: false,
				upperLimit					: 10,
				lowerLimit					: 10,
				maxForce					: 10,
			}, settings);
			
			joint = new p2.PrismaticConstraint(viewA.physicsObject, viewB.physicsObject, settings);

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
			
			this.world.addConstraint( joint );
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
			
			this.world.removeBody( viewObject.physicsObject );			
			
			viewObject.physicsObject = null;
		}
	}
	
	removeJoint( joint ){
		if(joint){
			this.world.removeConstraint( joint );
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

			mass					: 5,
			
			allowSleep				: false,		
			material				: null,
			
			fixedX					: false,
			fixedY					: false,
			fixedRotation			: true,		
			
			velocity				: {x:0, y:0},
			angularVelocity			: 0,
			
			damping					: 0.9,
			angularDamping			: 0.9,
			inertia					: 0.0,

			shape					: "circle",
			shapes					: [],
				
			scaleSize				: 1,
				
		}, settings);
				
		//-
		
		settings.shapes = [{
			shape 		: settings.shape,
			radius		: viewObject.wx * settings.scaleSize,
			wx			: viewObject.wx * settings.scaleSize,
			wy			: viewObject.wy * settings.scaleSize,
			position	: [0, 0]
		}];
			
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
		this.world.step( 1/60 * this.#app.timeScale, timeDelta, 10 );
		
		if(this.#isDebug){
			this.debugObject.clear();
			this.debugObject.lineStyle(2, 0xfff600, 1);
		}
		
		for(let i=this.world.bodies.length-1; i>=0; i--){
			let physicsObject = this.world.bodies[i];
			let viewObject = this.world.bodies[i].viewObject;
			
			if(!viewObject.physicsCharacter){
				
				viewObject.x = physicsObject.position[0];
				viewObject.y = physicsObject.position[1];
				viewObject.rotation = physicsObject.angle;
			
			}else{
				
				//- location
				
				viewObject.positionTo.x = physicsObject.position[0];
				viewObject.positionTo.y = physicsObject.position[1];
				
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
					_vx = +viewObject.forceWalk * Math.cos(viewObject.angleVelocityCurrent) * this.#app.timeScale;
					_vy = +viewObject.forceWalk * Math.sin(viewObject.angleVelocityCurrent) * this.#app.timeScale;
				}else if(viewObject.isAction["run"] || viewObject.isRun){							
					_vx = +viewObject.forceRun * Math.cos(viewObject.angleVelocityCurrent) * this.#app.timeScale;
					_vy = +viewObject.forceRun * Math.sin(viewObject.angleVelocityCurrent) * this.#app.timeScale;
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

				for(let i=0; i<physicsObject.shapes.length; i++){
					
					if(physicsObject.shapes[i] instanceof p2.Capsule){
						
						let angle = physicsObject.angle + physicsObject.shapes[i].angle;						
						let length = physicsObject.shapes[i].length;
						let radius = physicsObject.shapes[i].radius;

						let halfLength = length / 2;
						let cosAngle = Math.cos(angle);
						let sinAngle = Math.sin(angle);

						let x1 = physicsObject.position[0] + cosAngle * halfLength;
						let y1 = physicsObject.position[1] + sinAngle * halfLength;
						let x2 = physicsObject.position[0] - cosAngle * halfLength;
						let y2 = physicsObject.position[1] - sinAngle * halfLength;

						let perpX = -sinAngle * radius;
						let perpY = cosAngle * radius;

						this.debugObject.moveTo(x1 + perpX, y1 + perpY);
						this.debugObject.lineTo(x2 + perpX, y2 + perpY);
						this.debugObject.arc(x2, y2, radius, angle + Math.PI / 2, angle - Math.PI / 2);
						this.debugObject.lineTo(x1 - perpX, y1 - perpY);
						this.debugObject.arc(x1, y1, radius, angle - Math.PI / 2, angle + Math.PI / 2);
						this.debugObject.endFill();
											
					}else if(physicsObject.shapes[i] instanceof p2.Convex){

						let width = physicsObject.shapes[i].width;
						let height = physicsObject.shapes[i].height;
						let angle = physicsObject.angle + physicsObject.shapes[i].angle;
						let x = physicsObject.position[0];
						let y = physicsObject.position[1];
										
						let vertices = [];
						
						for(let j=0; j<physicsObject.shapes[i].vertices.length; j++){
							vertices.push(
								[physicsObject.shapes[i].vertices[j][0] + physicsObject.shapes[i].position[0], physicsObject.shapes[i].vertices[j][1] + physicsObject.shapes[i].position[1]]
							);
						}

						let rotatedVertices = vertices.map(vertex => {
							const rotatedX = vertex[0] * Math.cos(angle) - vertex[1] * Math.sin(angle);
							const rotatedY = vertex[0] * Math.sin(angle) + vertex[1] * Math.cos(angle);
							return [rotatedX + x, rotatedY + y];
						});
							
						this.debugObject.moveTo(rotatedVertices[0][0], rotatedVertices[0][1]);
						for (let j = 1; j < rotatedVertices.length; j++) {
							this.debugObject.lineTo(rotatedVertices[j][0], rotatedVertices[j][1]);
						}
						this.debugObject.lineTo(rotatedVertices[0][0], rotatedVertices[0][1]);
						
					}else if(physicsObject.shapes[i] instanceof p2.Box){

						let width = physicsObject.shapes[i].width;
						let height = physicsObject.shapes[i].height;
						let angle = physicsObject.angle + physicsObject.shapes[i].angle;
						let x = physicsObject.position[0];
						let y = physicsObject.position[1];
					
						let vertices = [
							[-width*0.5 + physicsObject.shapes[i].position[0], -height*0.5 + physicsObject.shapes[i].position[1]],
							[+width*0.5 + physicsObject.shapes[i].position[0], -height*0.5 + physicsObject.shapes[i].position[1]],
							[+width*0.5 + physicsObject.shapes[i].position[0], +height*0.5 + physicsObject.shapes[i].position[1]],
							[-width*0.5 + physicsObject.shapes[i].position[0], +height*0.5 + physicsObject.shapes[i].position[1]]
						];
						
						let rotatedVertices = vertices.map(vertex => {
							const rotatedX = vertex[0] * Math.cos(angle) - vertex[1] * Math.sin(angle);
							const rotatedY = vertex[0] * Math.sin(angle) + vertex[1] * Math.cos(angle);
							return [rotatedX + x, rotatedY + y];
						});
							
						this.debugObject.moveTo(rotatedVertices[0][0], rotatedVertices[0][1]);
						for (let j = 1; j < rotatedVertices.length; j++) {
							this.debugObject.lineTo(rotatedVertices[j][0], rotatedVertices[j][1]);
						}
						this.debugObject.lineTo(rotatedVertices[0][0], rotatedVertices[0][1]);
						
						this.debugObject.moveTo(rotatedVertices[0][0], rotatedVertices[0][1]);
						this.debugObject.lineTo(rotatedVertices[2][0], rotatedVertices[2][1]);		
						
					}else if(physicsObject.shapes[i] instanceof p2.Circle){
						
						let angle = physicsObject.angle + physicsObject.shapes[i].angle;
						let x = physicsObject.position[0];
						let y = physicsObject.position[1];
						
						let vertices = [
							[physicsObject.shapes[i].position[0], physicsObject.shapes[i].position[1]],
						];
						
						let rotatedVertices = vertices.map(vertex => {
							const rotatedX = vertex[0] * Math.cos(angle) - vertex[1] * Math.sin(angle);
							const rotatedY = vertex[0] * Math.sin(angle) + vertex[1] * Math.cos(angle);
							return [rotatedX + x, rotatedY + y];
						});
						
						this.debugObject.drawCircle(
							rotatedVertices[0][0],
							rotatedVertices[0][1],
							physicsObject.shapes[i].radius,
							0,
							2*Math.PI
						);
					
						this.debugObject.moveTo(rotatedVertices[0][0], rotatedVertices[0][1]);
						this.debugObject.lineTo(
							rotatedVertices[0][0] + physicsObject.shapes[i].radius*Math.cos(physicsObject.angle),
							rotatedVertices[0][1] + physicsObject.shapes[i].radius*Math.sin(physicsObject.angle)
						);		
						
					}
				}
			}
		}
		
		if(this.#isDebug){
			for(let i = 0; i < this.world.constraints.length; i++){
				if(this.world.constraints[i].type == 1){
					this.debugObject.moveTo(
						this.world.constraints[i].bodyA.position[0] + this.world.constraints[i].bodyA.viewObject.wx*(this.world.constraints[i].localAnchorA[0] - 0.5),
						this.world.constraints[i].bodyA.position[1] + this.world.constraints[i].bodyA.viewObject.wy*(this.world.constraints[i].localAnchorA[1] - 0.5)
					);
					
					this.debugObject.lineTo(
						this.world.constraints[i].bodyB.position[0] + this.world.constraints[i].bodyB.viewObject.wx*(this.world.constraints[i].localAnchorB[0] - 0.5),
						this.world.constraints[i].bodyB.position[1] + this.world.constraints[i].bodyB.viewObject.wy*(this.world.constraints[i].localAnchorB[1] - 0.5)
					);
				}				
			}

			this.debugObject.endFill();
			this.#debugView.addChild( this.debugObject );
		}
    }
	
}
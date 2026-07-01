import * as PIXI from "pixi.js";
import * as p2 from "p2-es";

import ComponentEmpty from "../../view/ComponentEmpty.mjs";

import CharacterManager from "./core/CharacterManager.mjs";
import DebuggerManager from "./core/DebuggerManager.mjs";
import ForcesManager from "./core/ForcesManager.mjs";
import JointsManager from "./core/JointsManager.mjs";
import ObjectsManager from "./core/ObjectsManager.mjs";

export default class Physics2dP2 extends ComponentEmpty{

	type = "physics2d";
	
	world;
	
	#app;	
	#isDebug = false;
	#debugView;
	
	CharacterManager;
	DebuggerManager;
	ForcesManager;
	JointsManager;
	ObjectsManager;
	
	constructor({fps = 60, order = ""}){
		super(fps, order);		
    }
	
	//------------------------------------------------------------------------

	init( app, funComplete ){
		this.#app = app;
		
		//-

		this.world = new p2.World({
			gravity		: [0, 9.8],
			islandSplit	: true
		});
		this.world.sleepMode = p2.World.NO_SLEEPING;
		
		//-
		
		this.CharacterManager = new CharacterManager( this );
		this.DebuggerManager = new DebuggerManager( this );
		this.ForcesManager = new ForcesManager( this );
		this.JointsManager = new JointsManager( this );
		this.ObjectsManager = new ObjectsManager( this );

		//-

		funComplete();
	}
	
	//------------------------------------------------------------------------
	
	add( viewObject, settings = {} ){
		this.ObjectsManager.add( viewObject, settings );
	}
	
	remove( viewObject ){
		this.ObjectsManager.remove( viewObject );
	}
	
	//------------------------------------------------------------------------
	
	setGravity(vx, vy){
		this.ForcesManager.setGravity(vx, vy);
	}

	//------------------------------------------------------------------------

	showDebugger( app ){
		this.#isDebug = true;
		this.#debugView = app.view2d.scene;
				
		this.debugObject = new PIXI.Graphics();
		this.#debugView.addChild( this.debugObject );
	}

	//------------------------------------------------------------------------

	
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
			
			velocity				: [0, 0],
			angularVelocity			: 0,
			
			damping					: 0.9,
			angularDamping			: 0.9,
			inertia					: 0.0,

			shape					: "circle",
			shapes					: [{
				shape 		: "circle",
				radius		: viewObject.wx * settings.scaleSize,
				wx			: viewObject.wx * settings.scaleSize,
				wy			: viewObject.wy * settings.scaleSize,
				position	: [0, 0]
			}],
				
			scaleSize				: 1,
				
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
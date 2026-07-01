import * as p2 from "p2-es";

export default class ObjectsManager{

	#physicsComponent;

	constructor( physicsComponent ){		
		this.#physicsComponent = physicsComponent;
    }
	
	add( viewObject, settings = {} ){
		
		this.remove( viewObject );
		
		//-

		settings = Object.assign({
			
			mass					: 5,
			
			position				: [viewObject.x, viewObject.y],
			angle					: viewObject.rotation,
			
			allowSleep				: true,		
			material				: null,
			
			kinematic				: false,
			
			fixedX					: false,
			fixedY					: false,
			fixedRotation			: false,		
			
			velocity				: [0, 0],
			angularVelocity			: 0,
			
			damping					: 0.1,
			angularDamping			: 0.1,

			shape					: "box",
			shapes					: [],
					
		}, settings);

		//-
		
		viewObject.physicsObject = new p2.Body( settings );
		
		//-
		
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
					
		this.#physicsComponent.world.addBody( viewObject.physicsObject );
	
		//-
		
		viewObject.physicsObject.viewObject = viewObject;
		viewObject.physicsObject.setVelocity = this.#physicsComponent.ForcesManager.setVelocity;

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
	
	remove( viewObject ){
		if(viewObject.physicsObject){
			if(viewObject.physicsObject.joinsPhysics){
				for(let i=0; i<viewObject.physicsObject.joinsPhysics.length; i++){
					if(viewObject.physicsObject.joinsPhysics[i]){
						this.removeJoint( viewObject.physicsObject.joinsPhysics[i] );			
					}
				}
			}
			
			this.#physicsComponent.world.removeBody( viewObject.physicsObject );			
			
			viewObject.physicsObject = null;
		}
	}
	
}
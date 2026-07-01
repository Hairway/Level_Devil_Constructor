export default class ForcesManager{

	#physicsComponent;

	constructor( physicsComponent ){		
		this.#physicsComponent = physicsComponent;
    }
	
	setGravity(vx, vy){
		this.#physicsComponent.world.gravity[0] = vx;
		this.#physicsComponent.world.gravity[1] = vy;
	}
	
	setVelocity(vx, vy){
		this.velocity[0] = vx;
		this.velocity[1] = vy;
	}
}
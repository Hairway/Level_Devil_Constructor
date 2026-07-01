import * as IMPION from "#impion";

export default class CreateControls{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
		
		//-

		this.components["Control"] = new IMPION.Control3dJoysticTPI({
            camera		: this.components["Camera"],
			joystick	: this.components["Joystick"],
			character	: this.components["Crowd"].characters[0],		
			light		: this.lights["DirectionalLight"],			
			isSubtract	: true,			
        });	
		
	}
}
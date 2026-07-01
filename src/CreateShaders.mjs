import * as IMPION from "#impion";

export default class CreateShaders{
	
	#app;
	#gameComponent;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;

		this.components = this.#app.components;
		this.materials = this.#app.materials;
		this.lights = this.#app.lights;
		
		//-
		
		let phoneData = this.#app.getPhoneData();
		
		//-
		
		
	}
}
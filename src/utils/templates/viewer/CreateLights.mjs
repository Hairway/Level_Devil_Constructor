import * as THREE from "three";
import * as IMPION from "#impion";

export default class CreateLights{
	
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
		
		//this.lights["AmbientLight"] = new THREE.AmbientLight( 0xfffed9, 2.0);
		//this.#app.view3d.scene.add( this.lights["AmbientLight"]  );
		
		this.lights["HemisphereLight"] = new THREE.HemisphereLight( 0xfef4e1, 0xfee1e1, 2.0);
		this.#app.view3d.scene.add( this.lights["HemisphereLight"]  );
		
		this.lights["DirectionalLight"] = new THREE.DirectionalLight( 0xfffed9, 2.2);
		this.lights["DirectionalLight"].position.set( -10, 50, 5 );
		this.lights["DirectionalLight"].castShadow = true;		
		this.lights["DirectionalLight"].shadow.camera.left = -15;
		this.lights["DirectionalLight"].shadow.camera.right = 15;
		this.lights["DirectionalLight"].shadow.camera.top = 15;
		this.lights["DirectionalLight"].shadow.camera.bottom = -15;		
		this.lights["DirectionalLight"].shadow.mapSize.width = 1024*1;
		this.lights["DirectionalLight"].shadow.mapSize.height = 1024*1;
		//this.lights["DirectionalLight"].shadow.bias= 0.0001;
		this.#app.view3d.scene.add( this.lights["DirectionalLight"] );	
		
		//this.lights["SpotLight"] =  new THREE.SpotLight(0xfffed9, 350, 30, 0.2, 0.5);					
		//this.lights["SpotLight"].position.set( -1, 7.0, 0 );
		//this.lights["SpotLight"].target = new THREE.Object3D();
		//this.lights["SpotLight"].target.position.set( 0, 0.0, 0.0 );					
		//this.lights["SpotLight"].castShadow = true;
		//this.lights["SpotLight"].shadow.mapSize.width = 1024*1;
		//this.lights["SpotLight"].shadow.mapSize.height = 1024*1;
		//this.lights["SpotLight"].shadow.camera.near = 0.2;
		//this.lights["SpotLight"].shadow.camera.far = 40;
		//this.#app.view3d.scene.add( this.lights["SpotLight"] );	
				
		//this.lights["PointLight_0"] = new THREE.PointLight( 0xfffed9, 2, 15 );
		//this.lights["PointLight_0"].position.set( 0, 1.5, 0 );
		//this.#app.view3d.scene.add( this.lights["PointLight_0"] );
		
		if(phoneData.type == "android" && phoneData.version < 12){
			
		}
	}
}
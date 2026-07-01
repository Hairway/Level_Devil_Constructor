import * as IMPION from "#impion";
import {gsap} from "gsap";
import {GUI} from "three/addons/libs/lil-gui.module.min.js";

export default class Debug3dGUI{
	
	#app;
	#gameComponent;

	guiObject;
	#guiClosed = false;
	#isUserGUI = false;

	constructor({app, gameComponent}){
		this.#app = app;
		this.#gameComponent = gameComponent;
		this.components = gameComponent.components;
	}
	
	resetGUI(){
		if(this.guiObject){
			this.#guiClosed = this.guiObject._closed;
			this.guiObject.destroy();
		}else{
			this.#guiClosed = false;
		}
		
		this.guiObject = new GUI();

	}
	
	createObjectGUI( object ){
		if(this.#isUserGUI){ return false; }
		
		this.resetGUI();
		
		//-
		
		let folderScene = this.guiObject.addFolder( "Scene" );
		if(this.#gameComponent.lights["HemisphereLight"]){
			this.addLightParamsGUI(folderScene, this.#gameComponent.lights["HemisphereLight"]);
		}
		folderScene.close();
		
		//-
		
		if(object.type == "Mesh"){
			
			let folderObject = this.guiObject.addFolder( object.name );
			this.addObjectParamsGUI(folderObject, object);
			folderObject.open();
			
			if(object.material){
				if(!object.material.name){ object.material.name = "Material"; }
				let folderMaterial = this.guiObject.addFolder( object.material.name );
				this.addMaterialParamsGUI(folderMaterial, object);
				folderMaterial.open();
				
				if(object.material.shaders){
					for(let i=0; i<object.material.shaders.length; i++){
						let folderShader = this.guiObject.addFolder( object.material.shaders[i].name );
						this.addShaderParamsGUI(folderShader, object.material.shaders[i]);
						folderShader.close();
					}
				}
			}
			
		}else if(object.type == "Sprite"){

			let folderObject = this.guiObject.addFolder( "Sprite" );
			this.addObjectParamsGUI(folderObject, object);
			
			if(object.material){
				if(!object.material.name){ object.material.name = "Material"; }
				let folderMaterial = this.guiObject.addFolder( object.material.name );
				this.addMaterialParamsGUI(folderMaterial, object);
				folderMaterial.open();
			}
			
		}else if(object.light){
			
			if(object.light.type == "DirectionalLight"){
				
				let folderLight = this.guiObject.addFolder( "DirectionalLight" );
				this.addLightParamsGUI(folderLight, object.light);
				folderLight.open();

			}else if(object.light.type == "HemisphereLight"){
				
				let folderLight = this.guiObject.addFolder( "HemisphereLight" );
				this.addLightParamsGUI(folderLight, object.light);
				folderLight.open();

			}else if(object.light.type == "SpotLight"){
				
				let folderLight = this.guiObject.addFolder( "SpotLight" );
				this.addLightParamsGUI(folderLight, object.light);
				folderLight.open();

			}else if(object.light.type == "PointLight"){
				
				let folderLight = this.guiObject.addFolder( "PointLight" );
				this.addLightParamsGUI(folderLight, object.light);
				folderLight.open();

			}
			
		}
		
		if(this.#guiClosed){
			this.guiObject.close();
		}else{
			this.guiObject.open();
		}
	}
	
	addShaderParamsGUI( folder, object ){
		for(let i in object.uniforms){
			if(typeof object.uniforms[i].value === 'number'){
				if(i.indexOf("Time") != -1){
				
				}else if(i.indexOf("Alpha") != -1 || i.indexOf("Opacity") != -1){
					folder.add(object.uniforms[i], 'value', 0, 1).name(i).step(0.01);
				}else{
					folder.add(object.uniforms[i], 'value', 0, 10).name(i).step(0.01);
				}
			}else if(object.uniforms[i].value instanceof IMPION.Texture3d){
				
				let params = {map: ''};
				
				for(let j in this.#app.assets.textures.three){
					if(this.#app.assets.textures.three[j] == object.uniforms[i].value){
						params.map = j;
						break;
					}
				}
				
				folder.add(params, "map", Object.keys( this.#app.assets.textures.three )).onChange((value)=>{
					object.uniforms[i].value = this.#app.assets.textures.three[ value ];
				}).name(i);
				
			}else if(object.uniforms[i].value instanceof IMPION.Color3d){
				let colorParams = {
					color: object.uniforms[i].value.getHex()
				};
				
				folder.addColor(colorParams, 'color').onChange((value)=>{
					object.uniforms[i].value.setHex( value );
				}).name(i);
			}
		}
	}
	
	addLightParamsGUI( folder, object ){
		
		//- color
		
		if(object.color){
			let colorParams = {
				color: object.color.getHex()
			};
			
			folder.addColor(colorParams, 'color').onChange((value)=>{
				object.color.setHex( value );
				if(object.helperObject){
					object.helperObject.update();
				}
			});
		}
		
		//- groundColor
		
		if(object.groundColor){
			let colorGroundParams = {
				groundColor: object.groundColor.getHex()
			};
			
			folder.addColor(colorGroundParams, 'groundColor').onChange((value)=>{
				object.groundColor.setHex( value );
				if(object.helperObject){
					object.helperObject.update();
				}
			});
		}
		
		//- intensity
		
		if(object.intensity || object.intensity == 0){
			let maxIntensity = 6;
			
			if(object.type == "PointLight"){
				maxIntensity = 20;
			}else if(object.type == "SpotLight"){
				maxIntensity = 1000;
			}
			
			folder.add(object, 'intensity', 0, maxIntensity).step(0.01).onChange((value)=>{
				object.intensity = value;
				if(object.helperObject){
					object.helperObject.update();
				}
			});
		}
		
		//- distance 
		
		if(object.distance || object.distance == 0){
			folder.add(object, 'distance', 0, 100).step(0.01).onChange((value)=>{
				object.distance = value;
				if(object.helperObject){
					object.helperObject.update();
				}
			});
		}
		
		//- angle 
		
		if(object.angle || object.angle == 0){
			folder.add(object, 'angle', 0, 0.5*Math.PI).step(0.01).onChange((value)=>{
				object.angle = value;
				if(object.helperObject){
					object.helperObject.update();
				}
			});
		}
		
		//- decay 
		
		if(object.decay || object.decay == 0){
			folder.add(object, 'decay', 0, 5).step(0.01).onChange((value)=>{
				object.decay = value;
				if(object.helperObject){
					object.helperObject.update();
				}
			});
		}
		
		//- penumbra 
		
		if(object.penumbra || object.penumbra == 0){
			folder.add(object, 'penumbra', 0, 1).step(0.01).onChange((value)=>{
				object.penumbra = value;
				if(object.helperObject){
					object.helperObject.update();
				}
			});
		}
		
	}
	
	addObjectParamsGUI( folder, object ){
		
		//- material
		
		let params = {material: ''};
		
		for(let i in this.#gameComponent.materials){
			if(this.#gameComponent.materials[i] == object.material){
				params.material = i;
				break;
			}
		}
		
		folder.add(params, 'material', Object.keys( this.#gameComponent.materials )).onChange((value)=>{
			if(object.material != this.#gameComponent.materials[ value ]){
				if(object.type == "Sprite" && this.#gameComponent.materials[ value ].type == "SpriteMaterial"){
					object.material = this.#gameComponent.materials[ value ];
					this.createObjectGUI( object );					
				}else if(object.type == "Mesh" && this.#gameComponent.materials[ value ].type != "SpriteMaterial"){
					object.material = this.#gameComponent.materials[ value ];
					this.createObjectGUI( object );
				}
			}
		});
		
		//- visible
		
		folder.add(object, 'visible');
	}
		
	addMaterialParamsGUI( folder, object ){
		
		//- map
		
		let params = {map: ''};
		
		for(let i in this.#app.assets.textures.three){
			if(this.#app.assets.textures.three[i] == object.material.map){
				params.map = i;
				break;
			}
		}
		
		folder.add(params, 'map', Object.keys( this.#app.assets.textures.three )).onChange((value)=>{
			object.material.map = this.#app.assets.textures.three[ value ];
			object.material.map.needsUpdate = true;
			object.material.needsUpdate = true;
		});
		
		//- color
		
		let colorParams = {
			color: object.material.color.getHex()
		};
		
		folder.addColor(colorParams, 'color').onChange((value)=>{
			object.material.color.setHex( value );
		});
		
		//- emissive
		
		if(object.material.emissive){
			let emissiveParams = {
				emissive: object.material.emissive.getHex()
			};
			
			folder.addColor(emissiveParams, 'emissive').onChange((value)=>{
				object.material.emissive.setHex( value );
			});
		}
		
		//- opacity
		
		if(object.material.transparent){
			folder.add(object.material, 'opacity', 0, 1).step(0.01);
		}
		
		//- roughness
		
		if(object.material.roughness || object.material.roughness == 0){
			folder.add(object.material, 'roughness', 0, 1).step(0.01);
		}
		
		//- ior
		
		if(object.material.ior || object.material.ior == 0){
			folder.add(object.material, 'ior', 0, 1).step(0.01);
		}
		
		//- reflectivity
		
		if(object.material.reflectivity || object.material.reflectivity == 0){
			folder.add(object.material, 'reflectivity', 0, 1).step(0.01);
		}
		
		//- iridescence
		
		if(object.material.iridescence || object.material.iridescence == 0){
			folder.add(object.material, 'iridescence', 0, 1).step(0.01);
		}
		
		//- sheen
		
		if(object.material.sheen || object.material.sheen == 0){
			folder.add(object.material, 'sheen', 0, 1).step(0.01);
		}
		
		//- sheenRoughness
		
		if(object.material.sheenRoughness || object.material.sheenRoughness == 0){
			folder.add(object.material, 'sheenRoughness', 0, 1).step(0.01);
		}
		
		//- specularIntensity
		
		if(object.material.specularIntensity || object.material.specularIntensity == 0){
			folder.add(object.material, 'specularIntensity', 0, 1).step(0.01);
		}
		
		//- clearcoat
		
		if(object.material.clearcoat || object.material.clearcoat == 0){
			folder.add(object.material, 'clearcoat', 0, 1).step(0.01);
		}
		
		//- clearcoatRoughness
		
		if(object.material.clearcoatRoughness || object.material.clearcoatRoughness == 0){
			folder.add(object.material, 'clearcoatRoughness', 0, 1).step(0.01);
		}
		
	}

}
import * as IMPION from "#impion";

export default class Model3d extends IMPION.Component3d{

	componentType2D	= false;
	componentType3D	= true;
	
	#app;
	#name;
	
	model;
	material;
	
	//------------------------------------------------------------------------
	
	constructor({
		app,
		name,
		material,
		shaders = [],
		physics = false,
		castShadow  = true,
		receiveShadow  = true
	}){
		super();
		
		this.#app = app;
		this.#name = name;
		
		this.model = this.#app.assets.models[this.#name];
		this.material = material;
		
		if(!this.model){
			console.log("The model does not exist");
			return new IMPION.Group3d();
		}
		
		//- add
		
		this.add( this.model.scene );
		
		//- materials
		
		this.model.scene.traverse((object) => {
			if(object.isMesh){		
				if(this.material){
					object.material = this.material;	
				}else if(
					this.#app.assets.json[this.#name] &&
					this.#app.assets.json[this.#name].meta.format == "blender" &&
					this.#app.assets.json[this.#name].objects &&
					this.#app.assets.json[this.#name].objects[object.name] &&
					this.#app.assets.json[this.#name].objects[object.name].materials &&
					this.#app.assets.json[this.#name].objects[object.name].materials[0]
				){
					let material_name = this.#app.assets.json[this.#name].objects[object.name].materials[0];
					let material_data = this.#app.assets.json[this.#name].materials[material_name];
					
					if(
						!this.#app.materials[material_name] &&
						material_data
					){		
						
						//- create material
						
						this.#app.materials[material_name] = new IMPION.MeshLambertMaterial3d({
							color		: new IMPION.Color3d(0xffffff),
							emissive	: new IMPION.Color3d(0x000000)
						});
						this.#app.materials[material_name].shaders = [...shaders];
						
						//- base_color
						
						if(
							material_data.params.base_color
						){
							this.#app.materials[material_name].color = new IMPION.Color3d().fromArray(material_data.params.base_color);
						}
						
						//- base_color_texture
						
						if(
							material_data.params.base_color_texture &&
							this.#app.assets.textures.three[material_data.params.base_color_texture]
						){
							this.#app.materials[material_name].map = this.#app.assets.textures.three[material_data.params.base_color_texture];
													
							let mappingNode = material_data.nodes?.nodes?.find(n => n.type === "ShaderNodeMapping");
							if (mappingNode?.params?.Scale) {
								let [sx, sy] = mappingNode.params.Scale;
								let tex = this.#app.materials[material_name].map;
								tex.wrapS = tex.wrapT = IMPION.RepeatWrapping;
								tex.repeat.set(sx, sy);
							}
						}
						
						//- emission_texture
						
						if(
							material_data.params.emission_texture &&
							this.#app.assets.textures.three[material_data.params.emission_texture]
						){
							this.#app.materials[material_name].emissiveMap = this.#app.assets.textures.three[material_data.params.emission_texture];
							this.#app.materials[material_name].emissive = new IMPION.Color3d(0xffffff);
						}
						
						//- alphaMap / transparent
						
						if(
							material_data.params.alpha_texture &&
							this.#app.assets.textures.three[material_data.params.alpha_texture]
						){
							this.#app.materials[material_name].alphaMap = this.#app.assets.textures.three[material_data.params.alpha_texture];
							this.#app.materials[material_name].alphaTest = 0.1;							
							this.#app.materials[material_name].depthWrite = true;
							this.#app.materials[material_name].side = IMPION.DoubleSide;
							this.#app.materials[material_name].forceSinglePass = true;
							//this.#app.materials[material_name].shadowSide = IMPION.DoubleSide;
						}else if(
							material_data.params.alpha_used
						){
							this.#app.materials[material_name].transparent = true;
							this.#app.materials[material_name].depthWrite = false;
						}
						
						//- shaders
						
						this.#app.shadersManager.creatingShaders(this.#app.materials[material_name], material_data.shaders); 
						
					}
					
					object.material = this.#app.materials[material_name];
				}
				
				if(!object.geometry.attributes.uv1){
					object.geometry.attributes.uv1 = object.geometry.attributes.uv;
				}
			}
		
			object.castShadow = castShadow;
			object.receiveShadow = receiveShadow;

			this[object.name] = object;			
		});

		//- camera

		this.model.scene.traverse((object) => {
			if(object.isCamera){	
				if(!this.#app.view3d.cameraStandard){
					this.#app.view3d.cameraStandard = this.#app.view3d.camera;
				}
				console.log(object.rotation.x)
				console.log(object.rotation.y)
				console.log(object.rotation.z)
				this.#app.view3d.camera = object;
				this.#app.view3d.camera.fovExtra = 0;
				this.#app.view3d.camera.updateProjectionMatrix();
				
				this.#app.view3d.fov = [this.#app.view3d.camera.fov, this.#app.view3d.camera.fov*0.6];
			}
		});
		
		//- lights
		
		this.model.scene.traverse((object) => {
			if(object.isLight){	
				this.#app.lights[object.name] = object;
				this.#app.lights[object.name].castShadow = true;
				this.#app.lights[object.name].intensity /= 1000;
			}
		});

		//- curve
				
		if (
			this.#app.assets.json[this.#name] &&
			this.#app.assets.json[this.#name].curves
		) {

			let curves = this.#app.assets.json[this.#name].curves;
			for (let name in curves) {
				let data = curves[name];
				let vectors = [];

				for (let p of data.points) {
					vectors.push(
						new IMPION.Vector3(p[0], p[1], p[2])
					);
				}

				this[name].curve = new IMPION.CatmullRomCurve3(vectors);
			}
		}
		
		//- physics
		
		if(physics && this["physical_walls"]){
			let physical_walls = this["physical_walls"];
			physical_walls.visible = false;
			physical_walls.parent.remove( physical_walls );
			
			if(this.#app.physics3d){
				for (let i = 0; i < physical_walls.children.length; i++) {
					physical_walls.children[i].visible = false;
					
					if(physical_walls.children[i].name.toLowerCase().indexOf("sphere") != -1){
						this.#app.physics3d.add( physical_walls.children[i], {
							mass : 0,
							shape	: "sphere",
						});
					}else if(physical_walls.children[i].name.toLowerCase().indexOf("cylinder") != -1){
						this.#app.physics3d.add( physical_walls.children[i], {
							mass 	: 0,
							shape	: "cylinder",
						});
					}else{
						this.#app.physics3d.add( physical_walls.children[i], {
							mass 	: 0
						});
					}
				}
			}		
		}
		
		if(physics && this["physical_objects"]){
			let physical_objects = this["physical_objects"];

			if(this.#app.physics3d){
				for (let i = 0; i < physical_objects.children.length; i++) {
					if(physical_objects.children[i].name.toLowerCase().indexOf("sphere") != -1){
						this.#app.physics3d.add( physical_objects.children[i], {
							mass 	: 5,
							shape	: "sphere",
						});
					}else if(physical_objects.children[i].name.toLowerCase().indexOf("cylinder") != -1){
						this.#app.physics3d.add( physical_objects.children[i], {
							mass 	: 5,
							shape	: "cylinder",
						});
					}else{
						this.#app.physics3d.add( physical_objects.children[i], {
							mass 	: 5
						});
					}
				}
			}		
		}
		
		if (
			this.#app.assets.json[this.#name] &&
			this.#app.assets.json[this.#name].terrain
		) {
	
			let terrain = this.#app.assets.json[this.#name].terrain;

			for (let name in terrain) {
				this.#app.physics3d.add( this[name], {
					shape	: "terrain",
					mass 	: 0,
				});
				
			//	let data = terrain[name];
			//	console.log(terrain)
			//	this.#app.physics3d.add( this[name], {		
			//		shape	: "terrainJson",			
			//		json	: data,
			//		extra	: [],
			//		mass 	: 0,
			//	});
			}
		}
		

			
		//- navigation
		
		if(this["navigation"]){
			if(this["navigation"].parent){
				this["navigation"].parent.remove( this["navigation"] );
			}
		}
		
		//- vfx
		
		if(this["vfx"]){
			if(this["vfx"].parent){
				this["vfx"].parent.remove( this["vfx"] );
			}
		}
		
		//- animations
		
		if(this.model.scene.animations.length > 0){
			this.addAnimationMixer( this.model );
		}
		
		//-		
		
		return this;
    }
		
	addAnimationMixer( obj ){
		this.mixer = new IMPION.AnimationMixer3d( obj.scene );
		this.action = {};

		for(let i=0; i<obj.animations.length; i++){
			this.action[ obj.animations[i].name ] = this.mixer.clipAction( obj.animations[i] );
			this.action[ obj.animations[i].name ].name = obj.animations[i].name;
			this.action[ obj.animations[i].name ].clampWhenFinished = true;
			this.action[ obj.animations[i].name ].setLoop( IMPION.LoopOnce );
		}

		this.mixer.update(0.01);	
	}

	setAction( actionCurrent ){
		if(this.actionCurrent != actionCurrent){
			this.actionCurrent = actionCurrent;
			this.mixer.time = 0;
			this.action[ actionCurrent ].play();
		}
	}

	setActionAll(){
		this.mixer.time = 0;
		
		for(let i=0; i<this.model.animations.length; i++){
			this.action[ this.model.animations[i].name ].play();
		}
	}

	seekMixer( timeInSeconds ){
		this.mixer.time = 0;

		for(let i=0; i<this.mixer._actions.length; i++){
		  this.mixer._actions[i].time = 0;
		}
		
		this.mixer.update( timeInSeconds )
	}

	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	//resize = (width, height)=>{
	//	
    //}

}
import * as IMPION from "#impion";

export default class Skybox extends IMPION.Component3d{
	
	componentType2D = false;
	componentType3D = true;
	
	model;
	materials;
	rotate;
	rotateSpeed;

	#texture;
	#assets;
	#shaders;	
	
	//------------------------------------------------------------------------
	
	constructor({
		texture,
		assets,
		materials,
		shaders = [],
		rotateSpeed = 0.0,
	}){
		super();

		this.#texture = texture;
		this.#assets = assets;
		this.materials = materials;
		this.#shaders = shaders;

		this.rotateSpeed = rotateSpeed

		//- materials
		
		let a = [
			"Back",
			"Down",
			"Front",
			"Left",
			"Right",
			"Up",
		];
		
		let m = {};
				
		for(let i=0; i<a.length; i++){
			this.#assets.textures.three[this.#texture + "" + a[i]].flipY = true;
			this.#assets.textures.three[this.#texture + "" + a[i]].magFilter = IMPION.NearestFilter;
			this.#assets.textures.three[this.#texture + "" + a[i]].minFilter = IMPION.NearestFilter;
			this.#assets.textures.three[this.#texture + "" + a[i]].wrapS = IMPION.ClampToEdgeWrapping;
			this.#assets.textures.three[this.#texture + "" + a[i]].wrapT = IMPION.ClampToEdgeWrapping;
			
			m[this.#texture + "" + a[i]] = new IMPION.MeshBasicMaterial3d({
				map			: this.#assets.textures.three[this.#texture + "" + a[i]],
				fog			: false,
				color		: 0xffffff,
				side		: IMPION.BackSide
			});	
			m[this.#texture + "" + a[i]].shaders = this.#shaders;
			
			this.materials[this.#texture + "" + a[i]] = m[this.#texture + "" + a[i]];			
		}

		//- mesh
		
		this.model = new IMPION.Mesh3d(
			new IMPION.BoxGeometry3d( 1850, 1850, 1850),
			[
				m[this.#texture + "" + "Left"],
				m[this.#texture + "" + "Right"],
				m[this.#texture + "" + "Up"],	
				m[this.#texture + "" + "Down"],			
				m[this.#texture + "" + "Front"],
				m[this.#texture + "" + "Back"],		
			]
		);
		this.model.receiveShadow = false;
		this.model.castShadow = false;
		this.add( this.model );

		//-
		
		return this;
    }

	//------------------------------------------------------------------------

	enterframe = ( timeDelta )=>{
		if(this.rotateSpeed){ this.model.rotation.y += this.rotateSpeed; }
	}

	//resize = (width, height)=>{
	//	
    //}

}
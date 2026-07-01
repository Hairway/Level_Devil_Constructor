export default class ComponentShader{
			
	componentType2D = false;
	componentType3D = false;
	componentTypeShader = true;
	
	#uniqueName;
	name;
	
	fps;
	order;
	timePrevious = 0;
    durationFrame = 0;
	
	orderShader;
	
	uniforms = {};
	vertexHead = "";
	vertexBody = "";
	fragmentHead = "";
	fragmentBody = "";
	
	#shaderInit = false;

	#isInit = false;
	
	#nIndex = "";
	#materials = [];
	
	//------------------------------------------------------------------------
	
	constructor(uniqueName, fps = 60, order = "", orderShader = 100){
		
		this.fps = fps;
		this.order = order;
		this.durationFrame = 1000/this.fps;
		this.orderShader = orderShader;
		
		this.#uniqueName = this.name = uniqueName;
    }
	
	uniformsShader(){
		return {};
	}
	vertexShaderHead(){
		return ``;
	}
	vertexShaderBody(){
		return ``;
	}
	fragmentShaderHead(){
		return ``;
	}
	fragmentShaderBody(){
		return ``;
	}
	
	//------------------------------------------------------------------------
	
	addMaterial( material ){
		this.#materials.push( material );
	}
	
	getUniqueName(){
		return this.#uniqueName;
	}
	
	process = (nIndex) => {

		this.uniforms = this.uniformsShader();
		this.vertexHead = this.vertexShaderHead();
		this.vertexBody = this.vertexShaderBody();
		this.fragmentHead = this.fragmentShaderHead();
		this.fragmentBody = this.fragmentShaderBody();	
		this.uniformsObject = {};
		
		this.#nIndex = nIndex;
		
		//-
				
		this.uniforms["isActiveShader"] = {value:false};
		
		this.vertexHead = 'uniform bool isActiveShader;\n' + this.vertexHead;
		this.vertexBody = '\nif(isActiveShader == true){ ' + this.vertexBody + '}\n';
		
		this.fragmentHead = 'uniform bool isActiveShader;\n' + this.fragmentHead;
		this.fragmentBody = '\nif(isActiveShader == true){ ' + this.fragmentBody + '}\n';
		
		//-
		
		let keys = [];
		
		for(let key in this.uniforms){
			keys.push(key);
		}		
		
		keys.sort((a, b) => b.length - a.length);
			
		//-
			
		for(let i in keys){
			this.uniformsObject[this.#uniqueName+""+nIndex+"_"+keys[i]] = this.uniforms[ keys[i] ];

			this.vertexHead = this.vertexHead.replaceAll(keys[i], this.#uniqueName+""+nIndex+"_"+keys[i]);
			this.vertexBody = this.vertexBody.replaceAll(keys[i], this.#uniqueName+""+nIndex+"_"+keys[i]);
			this.fragmentHead = this.fragmentHead.replaceAll(keys[i], this.#uniqueName+""+nIndex+"_"+keys[i]);
			this.fragmentBody = this.fragmentBody.replaceAll(keys[i], this.#uniqueName+""+nIndex+"_"+keys[i]);
		}

		this.vertexHead = this.vertexHead.replaceAll(this.#uniqueName+"(", this.#uniqueName+""+nIndex+"(");
		this.vertexBody = this.vertexBody.replaceAll(this.#uniqueName+"(", this.#uniqueName+""+nIndex+"(");
		this.fragmentHead = this.fragmentHead.replaceAll(this.#uniqueName+"(", this.#uniqueName+""+nIndex+"(");
		this.fragmentBody = this.fragmentBody.replaceAll(this.#uniqueName+"(", this.#uniqueName+""+nIndex+"(");
		
		this.vertexHead = this.vertexHead.replaceAll(this.#uniqueName+"_", this.#uniqueName+""+nIndex+"_");
		this.vertexBody = this.vertexBody.replaceAll(this.#uniqueName+"_", this.#uniqueName+""+nIndex+"_");
		this.fragmentHead = this.fragmentHead.replaceAll(this.#uniqueName+"_", this.#uniqueName+""+nIndex+"_");
		this.fragmentBody = this.fragmentBody.replaceAll(this.#uniqueName+"_", this.#uniqueName+""+nIndex+"_");
		
		
    }
	
	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	//------------------------------------------------------------------------
	
	//resize = (width, height)=>{
	//	
    //}
}
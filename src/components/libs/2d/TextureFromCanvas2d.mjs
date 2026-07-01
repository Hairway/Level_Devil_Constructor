import * as IMPION from "#impion";

export default class TextureFromCanvas2d extends IMPION.ComponentEmpty{

	componentType2D 	= false;
	componentType3D 	= false;
	
	//------------------------------------------------------------------------
	
	constructor({
		width = 512,
		height = 512,
		fill = null
	}){
		
		super();
		
		//-		
		
		this.canvas = document.createElement('canvas');
		this.canvas.style.visibility = "hidden";
		this.ctx = this.canvas.getContext && this.canvas.getContext('2d');
		document.getElementById('main').appendChild( this.canvas );
		
		this.canvas.width = width;
		this.canvas.height = height;
		
		if(fill || fill == 0){
			this.ctx.fillStyle = fill;
			this.ctx.fillRect(0, 0, width, height);
		}
		
		//-
		
		this.texture = IMPION.Texture2d.from( this.canvas );
		this.texture.canvas = this.canvas;
		this.texture.ctx = this.ctx;
		
		//-
		
		return this.texture;
    }

	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	//resize = (width, height)=>{
	//	
    //}

}
import * as IMPION from "#impion";

export default class TextureFromCanvas3d extends IMPION.ComponentEmpty{

	componentType2D 	= false;
	componentType3D 	= false;
	
	//------------------------------------------------------------------------
	
	constructor({
		width = 512,
		height = 512,
		isMask = false,
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
		
		let canvasMask;
		let ctxMask;
		
		if(isMask){
			canvasMask = document.createElement('canvas');
			canvasMask.style.visibility = "hidden";
			ctxMask = canvasMask.getContext && canvasMask.getContext('2d');
			document.getElementById('main').appendChild( canvasMask );
			
			canvasMask.width = width;
			canvasMask.height = height;		
		}

		//-
		
		this.texture = new IMPION.CanvasTexture3d( this.canvas );
		this.texture.canvas = this.canvas;
		this.texture.ctx = this.ctx;
		this.texture.canvasMask = canvasMask;
		this.texture.ctxMask = ctxMask;
		this.texture.w = width;
		this.texture.h = height;
		//this.texture.flipY = false;
		this.texture.colorSpace = IMPION.SRGBColorSpace;
		
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
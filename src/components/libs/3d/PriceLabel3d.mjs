import * as IMPION from "#impion";

export default class PriceLabel3d extends IMPION.ComponentEmpty{

	componentType2D 	= false;
	componentType3D 	= false;
	
	price = 0;
	priceMax = 0;
	autoFill = true;
	
	mesh;
	canvas;
	ctx;
	image;
	texture;
	
	fill;
	padding;
	
	percent = 0;
	
	#textStyle;
	
	//------------------------------------------------------------------------
	
	constructor({
		mesh,
		image,
		price = 5,
		autoFill = true,
		textStyle = 5,
		width = 512,
		height = 512,
		fill = 0x00ff00,
		padding = 10,
	}){
		
		super();
		
		//-		
		
		this.mesh = mesh;		
		this.image = image;
		
		this.price = this.priceMax = price;
		this.autoFill = autoFill;
		this.fill = fill;
		this.padding = padding;
		
		this.#textStyle = Object.assign({
			fontFamily		: "Arial",
			fontSize 		: 50,
			fontWeight 		: "normal",
			fill			: 0xffffff,
			align			: "center",
			valign			: "center",
			lineJoin		: 'round',
			lineCap			: 'round',
			letterSpacing	: 0,
			lineHeight		: 0,
			wordWrapWidth	: 1000,
			wordWrapHeight	: 1000,
			wordWrap		: false,
			x				: 0,
			y				: 0,
			filters			: null
		}, textStyle);
		
		if(this.#textStyle.valign == "center"){ this.#textStyle.valign = "middle"; }
		
		//-		
		
		this.canvas = document.createElement('canvas');
		this.canvas.style.visibility = "hidden";
		this.ctx = this.canvas.getContext && this.canvas.getContext('2d');
		document.getElementById('main').appendChild( this.canvas );
		
		this.canvas.width = width;
		this.canvas.height = height;
			
		//-
		
		this.texture = new IMPION.CanvasTexture3d( this.canvas );
		this.texture.w = width;
		this.texture.h = height;
		this.texture.flipY = false;
		this.texture.colorSpace = IMPION.SRGBColorSpace;
		
		//-
		
		this.mesh.material = new IMPION.MeshLambertMaterial3d({
			map			: this.texture,
			transparent	: true,
			depthWrite	: false,
		});
			
		//-
		
		this.update();
		
		//-
		
		return this;
    }
	
	setPrice( price ){
		this.price = price;		
		this.percent = 1 - this.price/this.priceMax;
		
		this.update();
	}
	
	update =()=>{	
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);	
		//if(ctxMask){
		//	ctxMask.clearRect(0, 0, canvasMask.width, canvasMask.height);
		//}
		
		this.ctx.save(); 		
		
		//-
		
		if(this.autoFill){
			//this.ctx.beginPath();
			//this.ctx.strokeStyle = '#9d11fc';
			//this.ctx.lineWidth = 14;
			//this.ctx.arc(0, 0, 68, -0.5*Math.PI, -0.5*Math.PI+2*Math.PI * value)
			//this.ctx.stroke();
			
			this.ctx.beginPath();
			this.ctx.fillStyle = this.fill;
			this.ctx.rect(
				this.padding,
				(this.canvas.height - this.padding) - (this.canvas.height - 2*this.padding)*this.percent,
				(this.canvas.width - 2*this.padding),
				(this.canvas.height - 2*this.padding)*this.percent
			);
			this.ctx.fill();
		}
		
		//-
		
		this.ctx.drawImage(
			this.image,
			0,
			0,
			this.canvas.width,
			this.canvas.height,
		);
		
		//ctxMask.save();	
		//ctxMask.drawImage(gameComponent.#app.assets.images[value], 0, 0, canvas.width, canvas.height);
		//ctxMask.globalCompositeOperation = 'source-in';
		//ctxMask.drawImage(gameComponent.#app.assets.images[value], 0, 0, canvas.width, canvas.height);
		//ctxMask.restore();
		
		//-
		
		this.ctx.translate(
			this.canvas.width * 0.5,
			this.canvas.height * 0.5
		);	

		this.ctx.translate(
			this.#textStyle.x * this.canvas.width/512,
			this.#textStyle.y * this.canvas.height/512
		);	

		this.ctx.font 			= this.#textStyle.fontWeight + " "+(this.#textStyle.fontSize * 5 * this.canvas.width/512)+"px "+this.#textStyle.fontFamily+", sans-serif";
		this.ctx.fillStyle 		= this.#textStyle.fill;
		this.ctx.textAlign 		= this.#textStyle.align;
		this.ctx.textBaseline 	= this.#textStyle.valign;
		if(this.#textStyle.stroke){
			this.ctx.strokeStyle 	= this.#textStyle.stroke;
			this.ctx.lineWidth 		= this.#textStyle.strokeThickness * 5 * this.canvas.width/512;
			this.ctx.strokeText(this.price, 0, 0.0*this.canvas.width);
		}
		this.ctx.fillText(this.price, 0, 0.0*this.canvas.width);
		
		//-
		
		this.ctx.restore(); 		
		
		//-
		
		this.texture.needsUpdate = true;
	}
	
	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	//resize = (width, height)=>{
	//	
    //}

}
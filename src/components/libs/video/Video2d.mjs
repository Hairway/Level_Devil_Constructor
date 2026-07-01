import * as IMPION from "#impion";
import {gsap} from "gsap";

export default class Video2d extends IMPION.Component2d{

	componentType2D = true;
	componentType3D = false;
	
	#app;
	#width;
	#height;
	#asBitmap;
	
	video;
	bgObject;
	
	isPlaing = false;
	isMuted = false;
	
	//------------------------------------------------------------------------
	
	constructor({
		app,
		video,
		width = 512,
		height = 512,
		autoplay = false,
		anchor = {x:0.5, y:0.5},
		
		fps = 60,
		order = "",
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
		asBitmap = false,
		borderBitmap = 0,
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute, asBitmap, borderBitmap);
		
		//-
		
		this.#app = app;
		
		this.#width	= width;
		this.#height = height;
		this.#asBitmap = asBitmap;
		
		this.video = video;
		
		//-
		
		this.bgObject = new IMPION.Sprite2d();
		this.bgObject.texture = new IMPION.TextureFromCanvas2d({width: width-2, height:height-2});
		this.bgObject.anchor.set(anchor.x, anchor.y);
		this.animationContainer.addChild( this.bgObject );
		
		//-
		
		if(autoplay && this.video.readyState >= 2){
			this.play();
			this.video.muted = true;
		}
		
		return this;
    }

	//------------------------------------------------------------------------
	
	play(){
		this.isPlaing = true;
		try{
			this.video.play();
		}catch(e){}
	}	

	stop(){
		this.isPlaing = false;
		try{
			this.video.pause();
		}catch(e){}
	}	

	pause(){
		this.isPlaing = false;
		try{
			this.video.pause();
		}catch(e){}
	}	

	restart(){
		this.isPlaing = true;
		try{
			this.video.currentTime = 0;
			this.video.play();
		}catch(e){}
	}	

	muted(isMuted = true){
		this.isMuted = isMuted;
		this.video.isMuted = isMuted;
		this.video.muted = isMuted;
	}

	#drawCanvas(video, width, height ){
		try{
			this.bgObject.texture.ctx.clearRect(0, 0, this.bgObject.texture.canvas.width, this.bgObject.texture.canvas.height);	
			
			this.bgObject.texture.ctx.drawImage(
				video,
				-1,
				-1,
				width,
				height
			);
			
			this.bgObject.texture.update();
		}catch(e){}
	}

	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{	
		if(this.isPlaing){
			this.#drawCanvas(this.video, this.#width, this.#height);

			if(!this.isMuted && this.video.muted && this.#app.soundManager.active){
				this.video.muted = false;
			}
		}
    }
    
	//resize = (width, height)=>{
	//	
    //}

}
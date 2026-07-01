import {gsap} from "gsap";
import * as IMPION from "#impion";

export default class Items extends IMPION.Component2d{

	#pattern;	
	#assets;
	#matrix;
	#margin;

	items = [];		

	//------------------------------------------------------------------------

	constructor({
		pattern,
		assets,
		matrix,
		margin = 10,
		
		fps = 60,
		order = "",
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute);

		//-
		
		this.#pattern = pattern;
		this.#assets = assets;
		this.#matrix = matrix;
		this.#margin = margin;
		
		//-
		
		let w = 0;
		let h = 0;

		if(pattern.bg){
			w = this.#assets.textures.pixi[ pattern.bg.texture ].width;
			h = this.#assets.textures.pixi[ pattern.bg.texture ].height;
		}else if(pattern.icon){
			w = this.#assets.textures.pixi[ pattern.icon.texture + "_0" ].width;
			h = this.#assets.textures.pixi[ pattern.icon.texture + "_0" ].height;
		}
				
		for(let i=0; i<this.#matrix.length; i++){
			for(let j=0; j<this.#matrix[i].length; j++){
				let k = this.items.length;
				
				this["item_"+k] = new IMPION.Group2d();
				this["item_"+k].v_id = k;
				this["item_"+k].x = 0.5*w + j*(w + this.#margin) - 0.5*(this.#matrix[i].length*(w + this.#margin) - this.#margin);
				this["item_"+k].y = 0.5*h + i*(h + this.#margin) - 0.5*(this.#matrix.length*(h + this.#margin) - this.#margin);
				this["item_"+k].wx = w;
				this["item_"+k].wy = h;
				this.animationContainer.addChild( this["item_"+k] );	
					
					if(pattern.bg){
						pattern.bg.scale = Object.assign({x:1, y:1}, pattern.bg.scale);
						
						this["item_"+k].bg = new IMPION.Sprite3d();
						this["item_"+k].bg.texture = this.#assets.textures.pixi[ pattern.bg.texture ];
						this["item_"+k].bg.anchor.set(0.5);					
						this["item_"+k].addChild( this["item_"+k].bg );	
					}
					
					if(pattern.icon){
						pattern.icon.scale = Object.assign({x:1, y:1}, pattern.icon.scale);
						
						this["item_"+k].icon = new IMPION.Sprite3d();
						this["item_"+k].icon.texture = this.#assets.textures.pixi[pattern.icon.texture + "_" + k];
						this["item_"+k].icon.anchor.set(0.5);					
						this["item_"+k].addChild( this["item_"+k].icon );	
					}
					
					if(pattern.video){
						pattern.video.scale = Object.assign({x:1, y:1}, pattern.video.scale);
						
						this["item_"+k].video = new IMPION.Sprite3d();
						this["item_"+k].video.texture = pattern.video.texture;
						this["item_"+k].video.anchor.set(0);	
						this["item_"+k].video.scale.x = pattern.video.scale.x;
						this["item_"+k].video.scale.y = pattern.video.scale.y;
						this["item_"+k].video.x = -0.5*pattern.video.rect.w*pattern.video.scale.x - j*(pattern.video.rect.w*pattern.video.scale.x);
						this["item_"+k].video.y = -0.5*pattern.video.rect.h*pattern.video.scale.x - i*(pattern.video.rect.h*pattern.video.scale.x);
						this["item_"+k].addChild( this["item_"+k].video );	
					}
					
					if(pattern.mask){
						this["item_"+k].maskObject = new IMPION.Sprite2d();
						this["item_"+k].maskObject.texture = this.#assets.textures.pixi[ pattern.mask.texture ];
						this["item_"+k].maskObject.anchor.set(0.5);					
						this["item_"+k].addChild( this["item_"+k].maskObject );	
						
						if(pattern.icon){
							this["item_"+k].icon.mask = this["item_"+k].maskObject;
						}
						
						if(pattern.video){
							this["item_"+k].video.mask = this["item_"+k].maskObject;
						}
					}
					
					if(pattern.text){
						if(Array.isArray(pattern.text)){
							for(let m=0; m<pattern.text.length; m++){
								pattern.textStyle[m] = Object.assign({x:0, y:0}, pattern.textStyle[m]);
						
								this["item_"+k]["textObject_"+m] = new IMPION.Text2d(
									pattern.text[m].split(",")[k],
									pattern.textStyle[m],
								);		
								this["item_"+k]["textObject_"+m].x = pattern.textStyle[m].x;			
								this["item_"+k]["textObject_"+m].y = pattern.textStyle[m].y;			
								this["item_"+k].addChild( this["item_"+k]["textObject_"+m] );
							}
						}else{
							pattern.textStyle = Object.assign({x:0, y:0}, pattern.textStyle);
						
							this["item_"+k].textObject = new IMPION.Text2d(
								pattern.text.split(",")[k],
								pattern.textStyle,
							);		
							this["item_"+k].textObject.x = pattern.textStyle.x;			
							this["item_"+k].textObject.y = pattern.textStyle.y;			
							this["item_"+k].addChild( this["item_"+k].textObject );
						}						
					}
					
					if(pattern.overlay){
						this["item_"+k].overlay = new PIXI.Sprite();
						this["item_"+k].overlay.texture = this.#assets.textures.pixi[pattern.overlay.texture];
						this["item_"+k].overlay.anchor.set(0.5);					
						this["item_"+k].overlay.alpha = 0;		
						this["item_"+k].addChild( this["item_"+k].overlay );	
					}else{
						this["item_"+k].overlay = new IMPION.Group2d();
					}
					
				this.items.push( this["item_"+k] );	
			}
		}
		
		//-
		
		this["cursor"] = new IMPION.Group2d();
		if(this.items.length == 2 && this.#matrix.length == 1){
			this["cursor"].x = 20;
			this["cursor"].y = 0.5 * h;
			this["cursor"].dx = 0.5 * w;			
		}else if(this.items.length == 2 && this.#matrix.length == 2){
			this["cursor"].x = 0.45 * w;
			this["cursor"].y = 0;			
			this["cursor"].dy = 0.5 * h;
		}else{
			this["cursor"].x = 20;
			this["cursor"].y = 0.5 * h;			
			this["cursor"].dx = 0.8 * w;
		}
		this["cursor"].a = 0;
		this["cursor"].visible = false;
		this.animationContainer.addChild( this["cursor"] );	
				
			this["cursorAn"] = new IMPION.Group2d();
			this["cursor"].addChild( this["cursorAn"] );	
				
				this["cursorB0"] = new PIXI.Sprite();
				this["cursorB0"].texture = this.#assets.textures.pixi["uiCursor_0"];
				this["cursorB0"].anchor.set(0.5, 0.5);
				this["cursorAn"].addChild( this["cursorB0"] );
				
				this["cursorB1"] = new PIXI.Sprite();
				this["cursorB1"].texture = this.#assets.textures.pixi["uiCursor_1"];
				this["cursorB1"].anchor.set(0.5, 0.5);
				this["cursorAn"].addChild( this["cursorB1"] );
				
		//-

		return this;
    }

	play(){
		this["cursor"].visible = true;
	}

	//------------------------------------------------------------------------

	enterframe = ( timeDelta )=>{
		if(this.visible && this["cursor"].visible){
			let cursor = this["cursor"];			
			if(cursor.a >= 360){ cursor.a -= 360; }
			
			if(this.items.length == 2 && this.#matrix.length == 1){
				cursor.a += 10;
				
				cursor.x = 20 + cursor.dx * Math.sin(cursor.a*Math.toRAD);
				cursor.rotation = 0.1 * Math.sin(cursor.a*Math.toRAD - 1);
				this["cursorB1"].rotation = 0.1 * Math.sin(cursor.a*Math.toRAD - 1.5);
				
				for(let i=0; i<this.items.length; i++){
					this.items[i].to_y = 0;
					this.items[i].overlay.to_a = 0;
				}
				
				if(cursor.x < 0){
					this.items[0].to_y = -10;
					this.items[0].overlay.to_a = 1;
				}else{
					this.items[1].to_y = -10;
					this.items[1].overlay.to_a = 1;
				}
				
				for(let i=0; i<this.items.length; i++){
					this.items[i].y = this.items[i].to_y - 0.8*(this.items[i].to_y - this.items[i].y);
					this.items[i].overlay.alpha = this.items[i].overlay.to_a - 0.6*(this.items[i].overlay.to_a - this.items[i].overlay.alpha);
				}
			
			}else if(this.items.length == 2 && this.#matrix.length == 2){
				cursor.a += 6;
				
				cursor.y = 20 + cursor.dy * Math.sin(cursor.a*Math.toRAD);
				cursor.rotation = 0.1 * Math.sin(cursor.a*Math.toRAD - 1);
				this["cursorB1"].rotation = 0.1 * Math.sin(cursor.a*Math.toRAD - 1.5);
				
				for(let i=0; i<this.items.length; i++){
					this.items[i].to_s = 0.98;
					this.items[i].overlay.to_a = 0;
				}
				
				if(cursor.y < 0){
					this.items[0].to_s = 1.02;
					this.items[0].overlay.to_a = 1;
				}else{
					this.items[1].to_s = 1.02;
					this.items[1].overlay.to_a = 1;
				}
				
				for(let i=0; i<this.items.length; i++){
					this.items[i].scale.set(this.items[i].to_s - 0.8*(this.items[i].to_s - this.items[i].scale.x));
					this.items[i].overlay.alpha = this.items[i].overlay.to_a - 0.6*(this.items[i].overlay.to_a - this.items[i].overlay.alpha);
				}
				
			}else if(this.items.length == 3 && this.#matrix.length == 1){
				cursor.a += 8;
				
				cursor.x = 20 + cursor.dx * Math.sin(cursor.a*Math.toRAD);
				cursor.rotation = 0.1 * Math.sin(cursor.a*Math.toRAD - 1);
				this["cursorB1"].rotation = 0.1 * Math.sin(cursor.a*Math.toRAD - 1.5);
				
				for(let i=0; i<this.items.length; i++){
					this.items[i].to_y = 0;
					this.items[i].overlay.to_a = 0;
				}
				
				if(cursor.x < this.items[0].x + this.items[0].wx*0.5){
					this.items[0].to_y = -10;
					this.items[0].overlay.to_a = 1;
				}else if(cursor.x < this.items[1].x + this.items[0].wx*0.5){
					this.items[1].to_y = -10;
					this.items[1].overlay.to_a = 1;
				}else{
					this.items[2].to_y = -10;
					this.items[2].overlay.to_a = 1;
				}
				
				for(let i=0; i<this.items.length; i++){
					this.items[i].y = this.items[i].to_y - 0.8*(this.items[i].to_y - this.items[i].y);
					this.items[i].overlay.alpha = this.items[i].overlay.to_a - 0.6*(this.items[i].overlay.to_a - this.items[i].overlay.alpha);
				}
				
			}
		}
    }

	//resize = (width, height)=>{
	//	if(width < height){
	//		this.x = this.positionAbsolute.vertical.x +  this.positionRelative.vertical.x * width;
	//		this.y = this.positionAbsolute.vertical.y +  this.positionRelative.vertical.y * height;
	//		this.scale.set(this.scaleAbsolute.vertical.x, this.scaleAbsolute.vertical.y);
	//		this.rotation = this.rotationAbsolute.vertical;
	//	}else{
	//		this.x = this.positionAbsolute.horizontal.x +  this.positionRelative.horizontal.x * width;
	//		this.y = this.positionAbsolute.horizontal.y +  this.positionRelative.horizontal.y * height;
	//		this.scale.set(this.scaleAbsolute.horizontal.x, this.scaleAbsolute.horizontal.y);
	//		this.rotation = this.rotationAbsolute.horizontal;
	//	}
    //}

}

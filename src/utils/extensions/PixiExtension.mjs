import * as IMPION from "#impion";

export default class PixiExtension{
	
	#app;

	constructor({app}){
		this.#app = app;
	}
		
	//------------------------------------------------------------------------
	   
	calculateSize(object){
		object.wx = object.width;
		object.wy = object.height;
	}

	cutSpritesheet(assetsManager, texture, json, scale = 1){
		if(json.frames){
			for(let i in json.frames){
				const data = json.frames[i];
				const name = i.replaceAll(".png","").replaceAll(".jpg","").replaceAll(".webp","");

				let rotated = data.rotated === true;

				let x = data.frame.x * scale;
				let y = data.frame.y * scale;
				let w = data.frame.w * scale;
				let h = data.frame.h * scale;

				//-
				
				let frame = rotated
					? new IMPION.Rectangle2d(x, y, h, w)
					: new IMPION.Rectangle2d(x, y, w, h);

				let crop = new IMPION.Rectangle2d(0, 0, w/scale, h/scale);
				let trim = crop;

				let tex = new IMPION.Texture2d(texture.baseTexture, frame, crop, trim, rotated ? 2 : 0);

				tex.wx = rotated ? h : w;
				tex.wy = rotated ? w : h;

				assetsManager.textures.pixi[name] = tex;
			}
		}
	}
	
	cutSpritesheetFromGrid(assetsManager, texture, nx, ny, name = "", scale = 1){
		let json = {frames:[]};
		
		for(let i = 0; i < ny; i++){
			for(let j = 0; j < nx; j++){
				let frame = {
					x : j*(Math.ceil(texture.width/nx)),
					y : i*(Math.ceil(texture.height/ny)),
					w : (Math.ceil(texture.width/nx)),
					h : (Math.ceil(texture.height/ny)),
				}
				
				if(frame.x + frame.w > texture.width){
					frame.w = texture.width - frame.x;
				}
				
				if(frame.y + frame.h > texture.height){
					frame.h = texture.height - frame.y;
				}
				
				json.frames.push({frame: frame});	
			}
		}
		
		for(let i in json.frames){
			var texture = texture;
			var x = json.frames[i].frame.x * scale;
			var y = json.frames[i].frame.y * scale;
			var w = json.frames[i].frame.w * scale;
			var h = json.frames[i].frame.h * scale;
			var frame = new IMPION.Rectangle2d(x, y, w, h);
			var crop = new IMPION.Rectangle2d(0, 0, w, h);
			var trim = crop;

			assetsManager.textures.pixi[name+"_"+i] = new IMPION.Texture2d(texture.baseTexture, frame, crop, trim, 0);
			assetsManager.textures.pixi[name+"_"+i].wx = w;
			assetsManager.textures.pixi[name+"_"+i].wy = h;
		}
	}
	
	textureFromMask(view2d, texture, textureMask){
		let container = new IMPION.Group2d();
			
			let spriteTexture = new IMPION.Sprite2d();
			spriteTexture.texture = texture;
			spriteTexture.anchor.set(0,0);
			container.addChild(spriteTexture);
			
			let spriteMask = new IMPION.Sprite2d();
			spriteMask.texture = textureMask;
			spriteMask.anchor.set(0,0);
			container.addChild(spriteMask);
			
			spriteTexture.mask = spriteMask;
		
		let renderTexture = IMPION.RenderTexture2d.create({width: container.width, height: container.height});
		
		view2d.renderer.render(container, {renderTexture});
		
		return renderTexture;
	}
}
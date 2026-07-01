export default class UtilsExtension{
	
	#app;
	
	canvas;
	ctx;
	
	constructor({app}){
		this.#app = app;
		
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
	}
	
	splitBase(name){
		let iAt  = name.indexOf("@");
		let iDash = name.indexOf("-");

		let i = -1;
		if (iAt === -1) i = iDash;
		else if (iDash === -1) i = iAt;
		else i = Math.min(iAt, iDash);

		return i === -1 ? name : name.substring(0, i);
	}

	async processingTextures( assets ) {
		let canvas = this.canvas;
		let ctx = this.ctx;

		let textures = Object.values(assets.images);
		let output = [];

		let parseInfo = (name) => {
			let result = {
				base	: this.splitBase(name),
				scale	: 1,
				isMask	: name.includes('@mask'),
				grid	: null
			};
			
			let scaleMatch = name.match(/@(\d+(\.\d+)?)x?/);			
			if (scaleMatch){ result.scale = parseFloat(scaleMatch[1]); }
			
			let gridMatch = name.match(/[@-]grid(\d+)x(\d+)/);	
			if (gridMatch){ result.grid = [parseInt(gridMatch[1]), parseInt(gridMatch[2])];}
			
			return result;
		};

		for (let name in assets.images) {				
			let nameBase = this.splitBase(name);
			let scale = 1;
			let maskTexture =
				assets.images[nameBase + "@mask"] ||
				assets.images[nameBase + "-mask"] ||
				null;
			let grid = null;
			let jsonData = assets.json[nameBase];
			
			let scaleMatch = name.match(/@(\d+(\.\d+)?)x?/);			
			if (scaleMatch){ scale = parseFloat(scaleMatch[1]); }
			
			let gridMatch = name.match(/[@-]grid(\d+)x(\d+)/);
			if (gridMatch){ grid = [parseInt(gridMatch[1]), parseInt(gridMatch[2])];}
				
			let needsProcessing = jsonData?.frames || grid || maskTexture;
			
			if (!needsProcessing || maskTexture == assets.images[name]){ continue; }
			
			//- info
			
			let src = assets.images[name].src || "";
			let formatMatch = src.match(/^data:image\/(\w+);base64,/);
			let format = formatMatch ? formatMatch[1] : "png";
			let mimeType = `image/${format}`;
			
			//- mask
			
			if(maskTexture){				
				canvas.width = assets.images[name].width;
				canvas.height = assets.images[name].height;
	
				ctx.clearRect(0, 0, assets.images[name].width, assets.images[name].height);
				ctx.drawImage(maskTexture, 0, 0);
				let maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);

				ctx.clearRect(0, 0, assets.images[name].width, assets.images[name].height);
				ctx.drawImage(assets.images[name], 0, 0);
				let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	
				for (let i = 0; i < imageData.data.length; i += 4) {
					let brightness = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3;
					imageData.data[i + 3] = brightness;
				}
	
				ctx.putImageData(imageData, 0, 0);
				let maskedBase64 = canvas.toDataURL(mimeType).split(',')[1];
				
				//-
				
				output.push({
					prefix		: "",
					fileData	: maskedBase64,
					nameFull	: `${nameBase}.${format}`,
					nameFile	: `${nameBase}`,
					nameFormat	: format
				});
				
				let imgReload = new Image();
				imgReload.src = `data:${mimeType};base64,` + maskedBase64;
				await new Promise(r => (imgReload.onload = r));
				assets.images[name] = imgReload;
			}
			
			//- json
			
			if(jsonData?.frames){
				let isAdobe = jsonData.meta?.app?.toLowerCase().includes("adobe animate");
				let isPixi = jsonData.meta?.app?.toLowerCase().includes("impionatlas");
				
				for (const frameName in jsonData.frames) {
					let f = jsonData.frames[frameName].frame;
					let rotated = jsonData.frames[frameName].rotated;
					let sourceSize = jsonData.frames[frameName].sourceSize;
					let spriteSourceSize = jsonData.frames[frameName].spriteSourceSize;
					let sx = f.x * scale;
					let sy = f.y * scale;
					let sw = f.w * scale;
					let sh = f.h * scale;
					let cw = f.w;
					let ch = f.h;
	
					canvas.width = rotated ? ch : cw;
					canvas.height = rotated ? cw : ch;
					
					if(isPixi){
						canvas.width = sourceSize.w;
						canvas.height = sourceSize.h;
					}
					
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.save();
	
					if (rotated) {
						if (isAdobe) {
							ctx.translate(0, cw);
							ctx.rotate(-Math.PI / 2);
						}else if(isPixi){							
							ctx.translate(spriteSourceSize.x, spriteSourceSize.y);							
							ctx.rotate(-Math.PI / 2);
						} else {
							ctx.translate(ch, 0);
							ctx.rotate(Math.PI / 2);
						}
					}
	
					if(isPixi){						
						if(rotated){
							ctx.drawImage(assets.images[name], sx, sy, sh, sw, -ch, 0, sh, sw);
						}else{
							ctx.drawImage(
								assets.images[name],
								sx, sy, sw, sh,
								spriteSourceSize.x, spriteSourceSize.y, sw, sh
							);
						}
					}else{
						ctx.drawImage(assets.images[name], sx, sy, sw, sh, 0, 0, cw, ch);
					}
					
					ctx.restore();
	
					output.push({
						prefix		: "",
						fileData	: canvas.toDataURL(mimeType).split(',')[1],
						nameFull	: frameName.replace(/\.[^/.]+$/, "." + format),
						nameFile	: (frameName.split(".").slice(0, -1).join('.')) || (frameName.replace(/\.[^/.]+$/, "." + format)),
						nameFormat	: format
					});
				}
			}
			
			//- grid
			
			if(grid){
				let [cols, rows] = grid;
				let cw = assets.images[name].width / cols;
				let ch = assets.images[name].height / rows;
	
				for (let y = 0; y < rows; y++) {
					for (let x = 0; x < cols; x++) {
						let index = y * cols + x;
						
						canvas.width = cw;
						canvas.height = ch;
						ctx.clearRect(0, 0, cw, ch);
						ctx.drawImage(assets.images[name], x * cw, y * ch, cw, ch, 0, 0, cw, ch);
						
						output.push({
							prefix		: "",
							fileData	: canvas.toDataURL(mimeType).split(',')[1],
							nameFull	: `${nameBase}_${index}` + "." + format,
							nameFile	: `${nameBase}_${index}`,
							nameFormat	: format
						});					
					}
				}
			}
		}

		canvas.width = canvas.height = 0;

		return output;
	}
	
}
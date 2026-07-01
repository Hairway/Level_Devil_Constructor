import {zip, unzip} from 'fflate';
import fs from 'fs';
import path from 'path';
import { packAsync } from 'free-tex-packer-core';
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

import AssetMinifyFont from './AssetMinifyFont.mjs';

//---------------------------------------------------------------------

let currentDir = './src/assets/';

let packStack = [
    { src: path.join(currentDir, 'models'), 	repack:".glb.fbx.json", 					pack: ".glb.fbx.json.jpg.png.webp" },
    { src: path.join(currentDir, 'sounds'), 	repack:".mp3.wav", 							pack: ".mp3.wav.json.jpg.png.webp" },
    { src: path.join(currentDir, 'textures'), 	repack:".jpg.png.webp.svg.atlas.json.skel", pack: ".jpg.png.webp.svg.atlas.json.skel" },
    { src: path.join(currentDir, 'fonts'),		repack:".ttf.json", 						pack: ".ttf.json" },
    { src: path.join(currentDir, 'videos'),		repack:".mp4.webm", 						pack: ".mp4.webm.json" },
    { src: path.join(currentDir, 'scripts'),	repack:".js.mjs", 							pack: ".js.mjs.json" },
];

let dirZipFile = path.join(currentDir, 'Assets.zip');
let dirDataFile = path.join(currentDir, 'Assets.js');
let dirAssetsUtils = path.join(currentDir, "_temp");

let isAssetDir = true;

let assetMinifyFont = new AssetMinifyFont();

ffmpeg.setFfmpegPath(ffmpegStatic);

if (!fs.existsSync(dirAssetsUtils)){
	fs.mkdirSync(dirAssetsUtils);
}else{
	for (const f of fs.readdirSync(dirAssetsUtils)) {
		fs.unlinkSync(path.join(dirAssetsUtils, f));
	}
}

//---------------------------------------------------------------------

function extractJSObject(text, startKey){
    let startIndex = text.indexOf(startKey);
    if (startIndex === -1) return null;

    let braceStart = text.indexOf("{", startIndex);
    if (braceStart === -1) return null;

    let braceCount = 0;
    let i = braceStart;

    for(i=braceStart; i < text.length; i++){
        if (text[i] === "{") braceCount++;
        else if (text[i] === "}") braceCount--;

        if (braceCount === 0){
            break;
        }
    }

    let objectText = text.slice(braceStart, i + 1);
    return objectText;
}

function jsObjectToJson(js){
    let str = js;

    str = str.replace(/\/\*[\s\S]*?\*\//g, "");
    str = str.replace(/(^|[^:])\/\/.*$/gm, "$1");
    str = str.replace(/[\r\n\t]+/g, " ");
    str = str.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
    str = str.replace(/,\s*([}\]])/g, "$1");

    return str;
}

function loadAssetHandler(){
    let text = fs.readFileSync("./src/Main.mjs", "utf8");

    let raw = extractJSObject(text, "assetHandler");
    if (!raw){
        console.log("assetHandler not found");
        return null;
    }

    let jsonReady = jsObjectToJson(raw);

    try{
        return JSON.parse(jsonReady);
    }catch(e){
        console.error("JSON parse error:", e.message);
        console.log("Parsed text:", jsonReady);
        return null;
    }
}

let assetHandler = loadAssetHandler();

//---------------------------------------------------------------------

checkAssetPack();

//---------------------------------------------------------------------

async function checkAssetDir() {
	for(let i=0; i<packStack.length; i++){
		await new Promise((resolve) => {
            fs.access(packStack[i].src, fs.constants.F_OK, (err) => {
                if (err) {
                    console.log("Not found: " + packStack[i].src);
                    isAssetDir = false;
                }
                resolve();
            });
        });
	}
}

async function checkAssetPack() {
    await checkAssetDir();

	if (isAssetDir) {		
		createAssetPack();		
	}else{

		fs.access(dirZipFile, fs.constants.F_OK, async (err) => {
			if (!err) {
				const data = fs.readFileSync(dirZipFile);
				const zipContent = new Uint8Array(data);

				unzip(zipContent, (err, unzipped) => {
					if (err) {
						console.error('Error during unzip:', err);
						return;
					}

					for (let i in packStack) {
						if (!fs.existsSync(packStack[i].src)) {
							fs.mkdirSync(packStack[i].src, { recursive: true });
						}
					}

					for (let relativePath in unzipped) {
						const file = unzipped[relativePath];
						const extension = "." + relativePath.match(/\.([^.]+)$|$/)[1];

						if (!file) continue;

						 let targetDir = null;
						 
						if (extension === ".json") {
							try {
								let jsonText = Buffer.from(file).toString("utf8");
								
								if (jsonText.charCodeAt(0) === 0xFEFF) {
									jsonText = jsonText.slice(1);
								}

								let jsonData = JSON.parse(jsonText.replaceAll("ï»¿", ""));

								if (
									jsonData.meta && jsonData.meta.format === "blender" ||
									relativePath.indexOf("-sat") != -1
								) {
									targetDir = path.join(currentDir, "models");
								} else {
									targetDir = path.join(currentDir, "textures");
								}
							} catch (e) {
								console.warn("Invalid JSON:", relativePath, e);
								targetDir = path.join(currentDir, "textures");
							}
						} else {
							for (let i in packStack) {
								if (relativePath.indexOf("-sat") != -1) {
									targetDir = path.join(currentDir, "models");
								}else{
									if (packStack[i].repack.indexOf(extension) !== -1) {
										targetDir = packStack[i].src;
										break;
									}
								}
							}
						}

						if (targetDir) {
							fs.writeFileSync(path.join(targetDir, relativePath), Buffer.from(file));
						}
					}
				
					createAssetPack();
									
				});
			}
		});
	}
   
}

//---------------------------------------------------------------------

// ================================
// OPTIMIZER FUNCTIONS (IN-MEMORY)
// ================================

async function optimizeImageFile(buffer, settings, filePath, fallbackName = "image"){
    const safeName = filePath
        ? path.basename(filePath, path.extname(filePath))
        : path.basename(fallbackName, path.extname(fallbackName));

    let pathPNG 	= path.join(dirAssetsUtils, safeName + ".png");
    let pathWEBP	= path.join(dirAssetsUtils, safeName + ".webp");

    try{
		let image = sharp(filePath);
		
		if (settings.sharpen && settings.sharpen > 0) {
			buffer = await image
				.sharpen(settings.sharpen)
				.toBuffer();

			image = sharp(buffer);
		}
		
		if (!settings.optimizer) {
			return buffer;
		}
		
        await image
			.clone()
            .png({ compressionLevel: 9 })
            .toFile(pathPNG);

       await image
			.clone()
            .webp({ quality: settings.quality * 100 })
            .toFile(pathWEBP);

        let sizeIn = buffer.length;
        let sizePng  = fs.statSync(pathPNG).size;
        let sizeWebp = fs.statSync(pathWEBP).size;

        let bestSize = Math.min(sizePng, sizeWebp);
        let bestPath = (sizeWebp < sizePng ? pathWEBP : pathPNG);

        //-
		
        if(bestSize + 100 < sizeIn){
            let outBuffer = await fs.promises.readFile(bestPath);
			
			if(assetHandler.clearCache){
				fs.unlinkSync(pathPNG);
				fs.unlinkSync(pathWEBP);
			}
			
            return outBuffer;
        }

        //-
		
        fs.unlinkSync(pathPNG);
        fs.unlinkSync(pathWEBP);

        return buffer;

    }catch(e){
        try{ fs.unlinkSync(tempPNG);}catch{}
        try{ fs.unlinkSync(tempWEBP);}catch{}
        return buffer;
    }
}

function optimizeSoundFile(buffer, settings, name, ext){
    return new Promise(async (resolve) => {
        let isBG = name.toLowerCase().startsWith("bg_");
        let bitrate = isBG ? settings.qualityBackground : settings.quality;

        let pathIn  = path.join(currentDir, 'sounds', name + ext);
        let pathOut = path.join(dirAssetsUtils, name + ".mp3");

        let sizeIn = buffer.length;
       
        ffmpeg(pathIn)
            .audioBitrate(bitrate)
            .toFormat("mp3")
            .on("end", async ()=>{

                let sizeOut = fs.existsSync(pathOut) ? fs.statSync(pathOut).size : sizeIn;

                let outBuffer = buffer;

                if(sizeOut + 50 < sizeIn){
                    outBuffer = await fs.promises.readFile(pathOut);
                }

				if(assetHandler.clearCache && fs.existsSync(pathOut)){ fs.unlinkSync(pathOut); }

                resolve(outBuffer);
            })
            .on("error", ()=> resolve(buffer))
            .save(pathOut);
    });
}

function optimizeVideoFile(buffer, settings, name, ext){
    return new Promise(async (resolve) => {
        let pathIn  = path.join(currentDir, 'videos', name + ext);
        let pathOut = path.join(dirAssetsUtils, name + ".mp4");
       
		let sizeIn = buffer.length;

        let crf = Math.round(40 - settings.quality * 30);

        ffmpeg(pathIn)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions(["-crf", crf.toString()])
            .toFormat("mp4")
            .on("end", async ()=>{

                let sizeOut = fs.existsSync(pathOut) ? fs.statSync(pathOut).size : sizeIn;

                let outBuffer = buffer;

                if(sizeOut + 200 < sizeIn){
                    outBuffer = await fs.promises.readFile(pathOut);
                }

                if(assetHandler.clearCache && fs.existsSync(pathOut)){ fs.unlinkSync(pathOut); }

                resolve(outBuffer);
            })
            .on("error", ()=> resolve(buffer))
            .save(pathOut);
    });
}

async function optimizeFontBuffer(buffer, settings, fileName){
    try{
        let files = await assetMinifyFont.minifyFont(Buffer.from(buffer), fileName);
        return files[0].contents;
    }catch(e){
		console.log("Error: "+e)
        return buffer;
    }
}

//---------------------------------------------------------------------

async function fixTransparency(atlasName, buffer) {
    let img = sharp(buffer).ensureAlpha();
    let { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    let dataMask = Buffer.alloc(data.length);

    let hasAlpha = 0;

    //-
	
    for (let i = 0; i < data.length; i += info.channels) {
        if (data[i + 3] < 255) { hasAlpha += (1-data[i + 3]/255); }
    }

    //-
	
	let procentAlpha = hasAlpha*100/(data.length/4);

    //-
	
    for (let i = 0; i < data.length; i += info.channels) {
		if(procentAlpha > 0.1){
			dataMask[i+0] = (data[i+3]);
			dataMask[i+1] = (data[i+3]);
			dataMask[i+2] = (data[i+3]);
			dataMask[i+3] = 255;
		}
		
		//-
		
		data[i+3] = 255;
    }

	let imageBuf = await sharp(data, {raw: { width: info.width, height: info.height, channels: info.channels }}).png().toBuffer();
	let maskBuf = null;
	
	if(procentAlpha > 0.1){
		maskBuf= await sharp(dataMask, {raw: { width: info.width, height: info.height, channels: info.channels }}).png().toBuffer();
	}
	
    return {
		buffer	: imageBuf,
		mask	: maskBuf
	};
}

async function createAtlasesIfNeeded(aFilesZip) {
	let sorted = [];
	
	let texturesDir = path.join(currentDir, "textures");

	let atlasIndex = 0;
	let atlasName = "auto_atlas_" + atlasIndex;
   
	//- allFiles
	
    const allFiles = await fs.promises.readdir(texturesDir);
	
    //- sources
	
	const ignoreList = assetHandler?.textures?.ignoreAtlas || [];
			
	const sources = allFiles.filter(f => {
		const ext = path.extname(f).toLowerCase();
		if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return false;

		const name = f.toLowerCase();

		if (ignoreList.some(p => name.includes(p))) return false;

		const base = f.replace(ext, "");
		return !allFiles.includes(base + ".json");
	});

    if (sources.length === 0){ return []; }

    //- sorted
	
	for (let fileName of sources) {
		let full = path.join(texturesDir, fileName);

		try {
			let meta = await sharp(full).metadata();
			
			sorted.push({
				meta: meta,
				fileName: fileName,
				baseName: path.basename(fileName, path.extname(fileName).toLowerCase()),
				area: meta.width * meta.height,
			});
			
		} catch(e) {
			console.warn("Cannot read metadata for", fileName, e);
		}
	}

	sorted.sort((a, b) => b.area - a.area);
	
	//-
	
	//console.log("sorted")
	//console.log(sorted)

    //-
	
    while (sorted.length > 2 && atlasIndex < 5) {
        let batch = [];
        let testBatch = [];
        let isTextures = false;
	
        //-
		
		atlasName = "auto_atlas_" + atlasIndex;
		
        //-
		
		let resultAtlas;
		let result;
		
        for (let i = sorted.length-1; i>=0; i--) {
            let fileName = sorted[i].fileName;
            let filePath = path.join(texturesDir, fileName);
            let ext = path.extname(fileName).toLowerCase();
            let base = path.basename(fileName, ext);
            let meta = sorted[i].meta;
	
			//-
			
            let pngBuffer;
			
            if(ext === ".webp"){
                pngBuffer = await sharp(filePath).png().toBuffer();
            }else{
                pngBuffer = fs.readFileSync(filePath);
            }
			
			if(!pngBuffer || pngBuffer.length === 0){
				console.warn("❗ pngBuffer is empty ("+filePath+")");				
			}

			//-
			
            testBatch = [...batch, { path: base + ".png", contents: pngBuffer, meta: meta }];
	
            //-
			
			if(testBatch.length == 1){
				isTextures = true;
				
				if(meta.width % assetHandler.textures.atlasCell !== 0 && meta.height % assetHandler.textures.atlasCell !== 0){
					isTextures = false;
				}
			}else{
				if(meta.width % assetHandler.textures.atlasCell !== 0 && meta.height % assetHandler.textures.atlasCell !== 0){
					if(isTextures){
						continue;
					}
				}else{
					if(!isTextures){
						continue;
					}
				}				
			}
			
            //-
			
			let atlasWidth = assetHandler.textures.atlasSize;
			let atlasHeight = assetHandler.textures.atlasSize;
			let atlasPadding = 0;
			
			for (const f of testBatch) {
				if (f.meta.width % assetHandler.textures.atlasCell !== 0 && f.meta.height % assetHandler.textures.atlasCell !== 0){
					atlasPadding = assetHandler.textures.atlasPadding;
				}
			}
	
            //-
			
            try {
                result = await packAsync(testBatch, {
                    textureName			: atlasName,
                    width				: atlasWidth,
					height				: atlasHeight,
					allowRotation		: assetHandler.textures.allowRotation,
					padding				: atlasPadding,
					detectIdentical		: true,
					trim				: assetHandler.textures.trim,
					exporter			: "JsonHash",
					packer				: "OptimalPacker",
					appInfo				: {url :"ImpionAtlas"},
					//packerMethod		: "BestShortSideFit",
					removeFileExtension	: true
                });
				
				resultAtlas = result;
				
                //-
				
				batch.push({ path: base + ".png", contents: pngBuffer, meta: meta});

				if(base == "texture_ground_mask"){
					break
				}
				
			}catch(e){
                break;
            }
        }
		
	//	console.log("batch")
	//	for(let i in batch){
	//		console.log(batch[i].path)
	//	}
		
		//-
		
		if(!resultAtlas || batch.length < 2){
			break;
		}
		
		//- save atlas
		
        let pngBuf = null;
        let maskBuf = null;
        let jsonBuf = null;
	
        for (const out of resultAtlas) {
            if (out.name.endsWith(".png")){ pngBuf = out.buffer; }
            if (out.name.endsWith(".json")){ jsonBuf = out.buffer; }
        }
	
        if (!pngBuf || !jsonBuf) {
            console.warn("Atlas generation failed");
            continue;
        }
	
		if(assetHandler.textures.atlasMask){
			let dataBuf = await fixTransparency(atlasName, pngBuf);
			
			pngBuf = dataBuf.buffer;
			maskBuf = dataBuf.mask;
		}
		
        let webpBuf = await sharp(pngBuf).webp({ quality: assetHandler.textures.quality*100 }).toBuffer();
        
        fs.writeFileSync(path.join(dirAssetsUtils, atlasName + ".webp"), webpBuf);
        fs.writeFileSync(path.join(dirAssetsUtils, atlasName + ".json"), jsonBuf);
		
		let webpMaskBuf;
		
		if(maskBuf){
			webpMaskBuf = await sharp(maskBuf).webp({ quality: assetHandler.textures.qualityMask*100 }).toBuffer();
			
			fs.writeFileSync(path.join(dirAssetsUtils, atlasName + "@mask.webp"), webpMaskBuf);
		}
		
		//-

		const imgPath = path.join(dirAssetsUtils, atlasName + ".webp");
		const maskPath = path.join(dirAssetsUtils, atlasName + "@mask.webp");
		const jsonPath = path.join(dirAssetsUtils, atlasName + ".json");
		
		const jsonText = fs.readFileSync(jsonPath, "utf8");
		const jsonData = JSON.parse(jsonText);

		if(jsonData && jsonData.frames){
			let n = 0;
			for(let i in jsonData.frames){
				n++;
			}

			for(let i in jsonData.frames){
				for(let j in sorted){
					if(sorted[j].baseName == i){
						if(n > 1){
							delete aFilesZip[sorted[j].fileName];
						}
						
						sorted.splice(j, 1);
					}
				}
			}
			
			if(n > 1){
				aFilesZip[atlasName + ".webp"] = webpBuf;				
				aFilesZip[atlasName + ".json"] = jsonBuf;
				
				if(maskBuf){
					aFilesZip[atlasName + "@mask.webp"] = webpMaskBuf;
				}				
			}
			
			if(assetHandler.clearCache){
				if(fs.existsSync(imgPath)){ fs.unlinkSync(imgPath); }
				if(fs.existsSync(jsonPath)){ fs.unlinkSync(jsonPath); }
				if(fs.existsSync(maskPath)){ fs.unlinkSync(maskPath); }
			}
			
		}
		
		//-

		atlasIndex++;
    }

    return [];
}

async function safeWriteFile(filePath, data, retries = 5, delay = 300) {
	for (let i = 0; i < retries; i++) {
		try {
			await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

			const tempPath = filePath + ".tmp";

			await fs.promises.writeFile(tempPath, data);

			try {
				await fs.promises.rm(filePath, { force: true });
			} catch (e) {}

			await fs.promises.rename(tempPath, filePath);

			return true;
		} catch (e) {
			console.warn(`Write failed: ${filePath}. Retry ${i + 1}/${retries}`, e.message);

			if (i === retries - 1) {
				console.error(`Cannot write file: ${filePath}`, e);
				return false;
			}

			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

async function createAssetPack() {
    const aFilesZip = {};
    const aFilesZipPath = {};

    //-

    for (let i in packStack) {
        let files = await fs.promises.readdir(packStack[i].src);

        for (let fileName of files) {
            let extension = path.extname(fileName);
            let filePath = path.join(packStack[i].src, fileName);

            if (packStack[i].pack.indexOf(extension) === -1) {
                continue;
            }

            const fileData = fs.readFileSync(filePath);
            
			aFilesZip[fileName] = fileData;
			aFilesZipPath[fileName] = filePath;
        }
    }

    //-
	
	if(assetHandler.textures.atlas){
		let result = await createAtlasesIfNeeded(aFilesZip);
	}
	
    //-
	
	const ignoreListTextures = assetHandler?.textures?.ignoreOptimize || [];

	for (let fileName in aFilesZip) {
		let buffer = aFilesZip[fileName];
		let ext = path.extname(fileName).toLowerCase();
		let base = path.basename(fileName, ext);
		let lower = fileName.toLowerCase();
		
		if(ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp"){				
			if (ignoreListTextures.some(p => lower.includes(p))) {
				continue;
			}
		
			if(assetHandler.textures.optimizer || assetHandler.textures.sharpen > 0){ // && !assetHandler.textures.atlas
				aFilesZip[fileName] =
					await optimizeImageFile(buffer, assetHandler.textures, aFilesZipPath[fileName]);
			}
		}else if(ext === ".wav" || ext === ".mp3" || ext === ".ogg"){
			if(assetHandler.sounds.optimizer){
				aFilesZip[fileName] =
					await optimizeSoundFile(buffer, assetHandler.sounds, base, ext);
			}
		}else if(ext === ".mp4" || ext === ".webm"){
			if(assetHandler.videos.optimizer){
				aFilesZip[fileName] =
					await optimizeVideoFile(buffer, assetHandler.videos, base, ext);
			}
		}else if(ext === ".ttf"){
			if(assetHandler.fonts.optimizer){
				aFilesZip[fileName] =
					await optimizeFontBuffer(buffer, assetHandler.fonts, base);
			}
		}
	}
	
	//-
	
	if(assetHandler.clearCache){
		if(fs.existsSync(dirAssetsUtils)){
			fs.rmSync(dirAssetsUtils, { recursive: true, force: true });
		}
	}
	
    //-
	
    const zipContent = await new Promise((resolve, reject) => {
        zip(aFilesZip, { level: 9 }, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });

	//-

	const isZipSaved = await safeWriteFile(dirZipFile, zipContent);

	if (!isZipSaved) {
		console.warn("Assets.zip was not saved, build continues without repacking zip");
		return;
	}
	
	//-
	
    saveDataPack();
}

//---------------------------------------------------------------------

function encodeShift(str) {
    const n = 27;
    return str.slice(-n) + str.slice(0, -n);
}

function xorBase64(str, key = 7) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    return [...str].map(c => {
        const i = chars.indexOf(c);
        if (i === -1) return c;

        return chars[(i ^ key) % chars.length];
    }).join('');
}

//---------------------------------------------------------------------

async function saveDataPack() {
    let content = '';

    //------------------------------

    let zipBuffer = fs.readFileSync(dirZipFile);
    let base64 = zipBuffer.toString('base64');
	let encoded = xorBase64(encodeShift(base64));
	
	let sizeBytes = base64.length * 3 / 4;
	let sizeMB = sizeBytes / (1024 * 1024);

    console.log('Base64 size (MB):', sizeMB.toFixed(2));
	
	
    content = `
		window.impionData = ${JSON.stringify(encoded)};
	`;

    //------------------------------
	
	try{
		const isDataSaved = await safeWriteFile(dirDataFile, content);

		if (!isDataSaved) {
			console.warn("Assets.js was not saved");
			return;
		}
		
		console.log("Assets repacked");
	}catch(err){
		console.log("Assets not repacked: "+err);
	}
	
    //------------------------------

   
}
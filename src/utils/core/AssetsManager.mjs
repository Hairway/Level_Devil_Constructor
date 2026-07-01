import {Howl, Howler} from "howler";
import * as IMPION from "#impion";

export default class AssetsManager{
    
	#app;
	
	#types = {
		"png"	: { prefix: "data:image/png;base64,", 					method:"base64", 		load: this.#loadImage.bind(this), 	files:[] },
		"jpg"	: { prefix: "data:image/jpeg;base64,", 					method:"base64", 		load: this.#loadImage.bind(this), 	files:[] },
		"webp"	: { prefix: "data:image/webp;base64,", 					method:"base64", 		load: this.#loadImage.bind(this), 	files:[] },
		"svg"	: { prefix: "data:image/svg+xml;base64,", 				method:"base64", 		load: this.#loadSvg.bind(this), 	files:[] },
		"mp3"	: { prefix: "data:audio/mpeg;base64,", 					method:"base64", 		load: this.#loadSound.bind(this), 	files:[] },
		"ogg"	: { prefix: "data:audio/ogg;base64,", 					method:"base64", 		load: this.#loadSound.bind(this), 	files:[] },
		"json"	: { prefix: "data:application/json;base64,", 			method:"base64", 		load: this.#loadJson.bind(this), 	files:[] },
		"atlas"	: { prefix: "", 										method:"base64", 		load: this.#loadAtlas.bind(this), 	files:[] },
		"glb"	: { prefix: "data:application/octet-stream;base64,", 	method:"arraybuffer", 	load: this.#loadModel.bind(this), 	files:[] },
		"ttf"	: { prefix: "data:font/ttf;base64,", 					method:"base64", 		load: this.#loadFont.bind(this), 	files:[] },
		"mp4"	: { prefix: "data:video/mp4;base64,", 					method:"base64", 		load: this.#loadVideo.bind(this), 	files:[] },
		"webm"	: { prefix: "data:video/webm;base64,", 					method:"base64", 		load: this.#loadVideo.bind(this), 	files:[] },
		"js"	: { prefix: "data:application/javascript;base64,", 		method:"base64", 		load: this.#loadScripts.bind(this), files:[] },
		"mjs"	: { prefix: "data:application/javascript;base64,", 		method:"base64", 		load: this.#loadScripts.bind(this), files:[] },
	}
	
	#funComplete;
	
	#loaderGLTF;
	#loaderTexture;

	#settings;
	#zipFiles = [];
	#isProcessingTexture = false;
	
	//------------------------------------------------------------------------
	
	constructor({app, dataAssets, settings = {addons:{}}, funComplete}){
		this.#funComplete = funComplete;
		
		//-

		this.#app = app;
		this.#settings = settings;
		
		//-
		
		if(this.#settings.addons["view3d"]){
			this.#loaderGLTF = this.#settings.addons["view3d"].loaderGLTF;
			this.#loaderGLTF.setCrossOrigin('anonymous');
			this.#loaderTexture = this.#settings.addons["view3d"].loaderTexture;
		}
		
		if(this.#settings.addons["DRACOLoader"]){
			//this.#settings.addons["DRACOLoader"].setDecoderConfig( { type: 'js' } );
			this.#loaderGLTF.setDRACOLoader( this.#settings.addons["DRACOLoader"] );
		}
				
		//-
		
		let zipSource;
		
		if (this.#settings.addons["viewer3d"] && this.#settings.addons["viewer3d"].zip) {
			zipSource = this.#settings.addons["viewer3d"].zip;
		}else if (dataAssets) {
			zipSource = dataAssets;
		}

		if (!zipSource) {
			console.warn("[AssetsManager] ZIP not found");
			return;
		}

		let base64String = zipSource.replace('data:application/zip;base64,', '');

		//-
		
		let binaryString = atob(base64String);
		let zipData = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			zipData[i] = binaryString.charCodeAt(i);
		}
		
		let unzippedFiles = IMPION.unzipSync(zipData);
		
		//-
		
		for(let i in unzippedFiles){			
			let fileData	= unzippedFiles[i].buffer;
			let nameFull 	= i;
			let nameFile 	= (nameFull.split(".")).slice(0, -1).join('.');
			let nameFormat 	= (nameFull.split(".")).reverse()[0];
			
			if(this.#types[ nameFormat ]){	
				if(nameFormat == "js"){					
					this.#zipFiles.unshift({
						fileData	: fileData,
						nameFull	: nameFull,
						nameFile	: nameFile,
						nameFormat	: nameFormat
					});
				}else{
					
					this.#zipFiles.push({
						fileData	: fileData,
						nameFull	: nameFull,
						nameFile	: nameFile,
						nameFormat	: nameFormat
					});
				}
			}
		}
		
		for(let i in this.#app.params){
			let value = this.#app.params[i].value+"";
			
			if(value.indexOf("base64") != -1){ 
				for(let j in this.#types){
					if(this.#types[j].prefix != "" && value.indexOf(this.#types[j].prefix) != -1){
						let fileData	= value;
						let nameFull 	= i+"."+j;
						let nameFile 	= i;
						let nameFormat 	= j;
						
						fileData = fileData.replace(this.#types[j].prefix,"");
						
						if(this.#types[ nameFormat ]){	
							this.#zipFiles.push({
								fromParams	: true,
								fileData	: fileData,
								nameFull	: nameFull,
								nameFile	: nameFile,
								nameFormat	: nameFormat
							});
						}
					}
				}
			}
		}			

		if(this.#settings.addons["viewer3d"]){

			for(let i in this.#app.params){
				let arr = ((this.#app.params[i].value+"").split(".")).reverse();
				let format = arr[0];

				if(this.#app.params[i].type == "file"){
					for(let j in this.#types){						
						if(j == format){
							let fileName = this.#app.params[i].name;
							let [nameOnly, ext] = fileName.split(/\.(?=[^\.]+$)/);

							let fileData	= this.#app.params[i].value;
							let nameFull 	= nameOnly+"."+ext;
							let nameFile 	= nameOnly;
							let nameFormat 	= ext;
							
							if(this.#types[ nameFormat ]){	
								this.#zipFiles.push({
									fromFile	: true,
									prefix		: "",
									fileData	: fileData,
									nameFull	: nameFull,
									nameFile	: nameFile,
									nameFormat	: nameFormat
								});
							}
						}
					}
				}
			}			
	
		}
		
		this.#clearMacFiles();
		this.#parseFiles();

    }

	#clearMacFiles(){
		for(let i=this.#zipFiles.length-1; i>=0; i--){
			if(this.#zipFiles[i].nameFull.indexOf("__MACOSX/") != -1){
				this.#zipFiles.splice(i, 1);
			}
		}
	}
	
	#parseFiles(){
		if(this.#zipFiles.length > 0){
			if(this.#zipFiles[0].fromFile){
				
				this.#types[ this.#zipFiles[0].nameFormat ].load(
					this.#zipFiles[0].prefix,
					this.#zipFiles[0].fileData
				);
			
			}else if(this.#zipFiles[0].fromParams){
				
				this.#loadFile( this.#zipFiles[0].fileData );
			
			}else{
				if(this.#types[ this.#zipFiles[0].nameFormat ].method == "base64"){
					this.#zipFiles[0].fileData = this.#arrayBufferToBase64( this.#zipFiles[0].fileData );
				}
				
				this.#loadFile( this.#zipFiles[0].fileData );				
			}		
		}else{
			
			//- spine
			
			if(this.#settings.addons["SPINELoader"]){				
				for(let key in this.#app.assets.atlas){	
					if(this.#app.assets.atlas[key] && this.#app.assets.images[key] && this.#app.assets.json[key]){				
						this.#app.assets.spine[key] = this.#settings.addons["SPINELoader"].parseData( this.#app.assets, key );							
					}			
				}
			}
			
			//- json atlas
			
		//	for(let key in this.#app.assets.json){
		//		if(this.#app.assets.textures.pixi[key]){
		//			this.#app.PixiExtension.cutSpritesheet(
		//				this.#app.assets,
		//				this.#app.assets.textures.pixi[key],
		//				this.#app.assets.json[key],
		//			);
		//		}else{
		//			for(let keyName in this.#app.assets.textures.pixi){
		//				
		//				if(keyName.indexOf(key+"@") != -1){
		//					let scale = keyName.split("@")[1];
		//				
		//					this.#app.PixiExtension.cutSpritesheet(
		//						this.#app.assets,
		//						this.#app.assets.textures.pixi[keyName],
		//						this.#app.assets.json[key],
		//						scale
		//					);
		//				}
		//			}
		//			
		//		}
		//	}
			
			if(!this.#isProcessingTexture){
				this.#isProcessingTexture = true;

				this.processingTextures().then(() => {
					this.#parseFiles();
				});				
				
			}else{
				
				this.#funComplete();
				
			}
		}	
	}	
	
	async processingTextures() {
		const data = await this.#app.UtilsExtension.processingTextures( this.#app.assets );
		this.#zipFiles.push(...data);
	}

	#arrayBufferToBase64(buffer) {
		if(this.#isBase64(buffer)){ return buffer; }
		
		let binary = '';
		const bytes = new Uint8Array(buffer);
		const len = bytes.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	#isBase64(str) {
		if (typeof str !== "string") return false;
		if (str.length % 4 !== 0) return false;
		return /^[A-Za-z0-9+/]+={0,2}$/.test(str);
	}

	#loadFileArrayBuffer( arraybuffer ){
		this.#types[ this.#zipFiles[0].nameFormat ].load(
			this.#zipFiles[0],
			arraybuffer
		);
	}
	
	#loadFile( encoded ){
		this.#types[ this.#zipFiles[0].nameFormat ].load(
			this.#types[ this.#zipFiles[0].nameFormat ].prefix,
			encoded
		);
	}
	
	//------------------------------------------------------------------------
	
	async #loadSvg ( prefix, path ){
		this.#app.assets.svg[ this.#zipFiles[0].nameFile ] = await IMPION.Assets2d.load({
			src: prefix + path,			
			format: "svg",
			data: {
				parseAsGraphicsContext: true,
			},
		});
	
		this.#zipFiles.shift();
		this.#parseFiles();
	}
	
	//------------------------------------------------------------------------
	
	#loadImage( prefix, path ){
		this.#app.assets.images[ this.#zipFiles[0].nameFile ] = new Image();
		this.#app.assets.images[ this.#zipFiles[0].nameFile ].name = this.#zipFiles[0].nameFile;
		this.#app.assets.images[ this.#zipFiles[0].nameFile ].crossOrigin = 'anonymous';
		this.#app.assets.images[ this.#zipFiles[0].nameFile ].addEventListener('load', this.#loadImageComplete.bind(this) );
		this.#app.assets.images[ this.#zipFiles[0].nameFile ].addEventListener('error', this.#loadImageError.bind(this) );
		this.#app.assets.images[ this.#zipFiles[0].nameFile ].src = prefix + path;
	}
	
	#loadImageComplete(){

		let source = new IMPION.CanvasSource2d({ resource: this.#app.assets.images[ this.#zipFiles[0].nameFile ] });		
		this.#app.assets.textures.pixi[ this.#zipFiles[0].nameFile ] = new IMPION.Texture2d({ source  });		
		this.#app.assets.textures.pixi[ this.#zipFiles[0].nameFile ].source.addressMode = 'clamp-to-edge';
		//this.#app.assets.textures.pixi[ this.#zipFiles[0].nameFile ].source.addressMode = 'repeat';
		
		if(this.#loaderTexture){
			this.#loaderTexture.load(
				this.#app.assets.images[ this.#zipFiles[0].nameFile ].src,
				
				function( texture ){
					this.#app.assets.textures.three[ this.#zipFiles[0].nameFile ] = texture;
					this.#app.assets.textures.three[ this.#zipFiles[0].nameFile ].wrapS = IMPION.RepeatWrapping; 
					this.#app.assets.textures.three[ this.#zipFiles[0].nameFile ].wrapT = IMPION.RepeatWrapping;
					this.#app.assets.textures.three[ this.#zipFiles[0].nameFile ].flipY = false;
					this.#app.assets.textures.three[ this.#zipFiles[0].nameFile ].colorSpace = IMPION.SRGBColorSpace;

					this.#zipFiles.shift();
					this.#parseFiles();
				}.bind(this)
			);
		}else{
			this.#zipFiles.shift();
			this.#parseFiles();
		}
	}
	#loadImageError( error ){}
		
	#loadSound( prefix, path ){
		this.#app.assets.sounds[ this.#zipFiles[0].nameFile ] = new Howl({
			src: prefix + path,
			xhrWithCredentials: false
		});
		this.#app.assets.sounds[ this.#zipFiles[0].nameFile ].once('load', this.#loadSoundComplete.bind(this) );
	}
	#loadSoundComplete(){
		this.#zipFiles.shift();
		this.#parseFiles();
	}
		
	async #loadJson(prefix, input) {
		let text;

		const decodeUtf8 = (u8) => new TextDecoder("utf-8").decode(u8);
		const b64ToU8 = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
		const stripBOM = (s) => (s && s.charCodeAt(0) === 0xFEFF) ? s.slice(1) : s;

		try {
			if(input instanceof Uint8Array){
				text = decodeUtf8(input);
			}else if(input instanceof ArrayBuffer){
				text = decodeUtf8(new Uint8Array(input));
			}else if(typeof Blob !== "undefined" && input instanceof Blob) {
				text = await input.text();
			}else if(typeof input === "string"){
				const s = input.trim();

				if(s.startsWith("{") || s.startsWith("[")){
					text = s;
				}else if (/^data:.*;base64,/.test(s)) {					
					const b64 = s.split(",")[1] || "";
					text = decodeUtf8(b64ToU8(b64));
				}else if (/^https?:\/\//i.test(s) || /^file:\/\//i.test(s) || /^[a-zA-Z]:\\/.test(s) || s.startsWith("/")) {					
					const resp = await fetch(s);
					if (!resp.ok) throw new Error(`fetch fail ${resp.status}`);
					text = await resp.text();
				}else{
					text = decodeUtf8(b64ToU8(s));
				}
			}else{
				throw new Error("Unsupported input type for JSON");
			}

			//-
			
			text = stripBOM(text).replace(/\uFEFF/g, "").replace(/ï»¿/g, "");

			const json = JSON.parse(text);

			this.#app.assets.json[this.#zipFiles[0].nameFile] = json;
			this.#loadJsonComplete();

		}catch (err){
			console.error("[#loadJson] failed:", err);
			throw err;
		}
	}
	#loadJsonComplete(){
		this.#zipFiles.shift();
		this.#parseFiles();
	}
	
	
	#loadAtlas( prefix, path ){
		this.#app.assets.atlas[ this.#zipFiles[0].nameFile ] = atob(path);
		this.#loadAtlasComplete();
	}
	#loadAtlasComplete(){
		this.#zipFiles.shift();
		this.#parseFiles();
	}	
	
	#loadModel( prefix, path ){
		if(this.#loaderGLTF){
			if(path instanceof ArrayBuffer){
				this.#loaderGLTF.parse( path, "", this.#loadModelComplete.bind(this) );
			}else{
				this.#loaderGLTF.load( path, this.#loadModelComplete.bind(this), null, ()=>{
					this.#zipFiles.shift();
					this.#parseFiles();	
				});
			}
		}else{
			this.#zipFiles.shift();
			this.#parseFiles();		
		}
	}
	#loadModelComplete( model ){
		this.#app.assets.models[ this.#zipFiles[0].nameFile ] = model;
		
		this.#zipFiles.shift();
		this.#parseFiles();		
	}

	#loadScripts( prefix, path ){
		let scriptTag = document.createElement('script');			
		scriptTag.onload = ()=>{
			this.#loadScriptsComplete();
		};
		//scriptTag.onreadystatechange = loader.loadScriptComplete;
		scriptTag.src =(prefix + path);	
		document.body.appendChild(scriptTag);
	}
	#loadScriptsComplete(){		
		this.#zipFiles.shift();
		this.#parseFiles();		
	}

	async #loadFont( prefix, path ){
		let fontFace = new FontFace(this.#zipFiles[0].nameFile, "url("+(prefix + path)+")");
		fontFace.load().then(( data )=>{
			document.fonts.add( data );
			this.#loadFontComplete();
		})
	}
	#loadFontComplete(){
		this.#zipFiles.shift();
		this.#parseFiles();
	}
	
	#loadVideo( prefix, path ){
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ] = document.createElement('video');
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].src = prefix + path;
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].loop = true;
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].muted = true;
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].autoplay = false;
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].starttime = 0;
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].controls = false;
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].setAttribute('playsinline', '');
		
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].addEventListener('loadeddata', this.#loadVideoComplete.bind(this) );
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].addEventListener('error', this.#loadVideoError.bind(this) );
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].addEventListener('webkitbeginfullscreen', function(event) {
			event.preventDefault();
		});

		this.#app.assets.videos[ this.#zipFiles[0].nameFile ].load();
	}
	
	#loadVideoComplete(){
		this.#zipFiles.shift();
		this.#parseFiles();		
	}
	
	#loadVideoError( event ){
		this.#app.assets.videos[ this.#zipFiles[0].nameFile ] = null;
		
		this.#zipFiles.shift();
		this.#parseFiles();		
	}
	
	
}
import * as IMPION from "#impion";

export default class Playable {

	params;
	
	components = {};
    materials = {};
    lights = {};
	
	tween;
	view2d;
    view3d;
    physics2d;
    physics3d;

	timeScale = 1;
	platformName = "";
	
    statisticManager;
    platformManager;
	eventManager;
	enterframeManager;
    resizeManager;
    languageManager;
	soundManager;
	assetsManager;
	shadersManager;
	focusedManager;
	tweenManager;
	
	debugRuler;
	
	assets = {
		images 		: {},
		sounds 		: {},
		models 		: {},	
		fonts 		: {},
		spine 		: {},	
		svg			: {},
		json		: {},
		atlas 		: {},	
		videos		: {},
		textures 	: {
			three 	: {},
			pixi 	: {},		
		}
	};
	
	//----

	MathExtension;
	PixiExtension;
	ThreeExtension;
	UtilsExtension;

	#componentsStart;
	#componentsInit = [];
	#addons = {};
	
	onCompleteLoad;

	//------------------------------------------------------------------------

	constructor( {addons, components, onCompleteLoad, params, platform, platformName} ){
		this.params = this.processParams(params);

		this.platformName = platformName;
		this.onCompleteLoad = onCompleteLoad;
		this.#componentsStart = components;
		
		for(let i in addons){
			this.#addons[ addons[i].name ] = addons[i];
		}
		
		for(let i in components){
			if(components[i].init){
				this.#componentsInit.push( components[i] );
			}
			
			if(components[i].type == "view3d"){
				this.#addons["view3d"] = components[i];
			}
		}
		
		//-
		
		this.MathExtension = new IMPION.MathExtension({app: this});
		this.UtilsExtension = new IMPION.UtilsExtension({app: this});
		
		//-
		
		this.statisticManager = new IMPION.StatisticManager({
			app : this,
        });
		
		this.statisticManager.handlerEvent("LOADING");
		
		//-

		this.platformManager = new IMPION.PlatformManager({
			value			: platformName,
			platform		: platform,
            onCompleteLoad	: async () => {
				const data = await this.waitImpionData();
				
				if(this.#addons["viewer3d"]){
					this.#addons["viewer3d"].load(()=>{
						this.#loadAssets(this.decodeShift(this.xorBase64(globalThis.impionData)), {addons: this.#addons} );
					})
				}else{
					this.#loadAssets(this.decodeShift(this.xorBase64(globalThis.impionData)), {addons: this.#addons} );
				}
			}
        });
    }
	
	//------------------------------------------------------------------------
	
	waitImpionData() {
		return new Promise(resolve => {
			if (typeof globalThis.impionData === "string" && globalThis.impionData !== "") {
				return resolve(globalThis.impionData);
			}

			let value;

			Object.defineProperty(globalThis, "impionData", {
				configurable: true,
				set(v) {
					value = v;

					delete globalThis.impionData;
					globalThis.impionData = v;

					resolve(v);
				},
				get() {
					return value;
				}
			});
		});
	}

	decodeShift(str) {
		const n = 27;
		return str.slice(n) + str.slice(0, n);
	}
	
	xorBase64(str, key = 7) {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

		return Array.from(str).map(function(c) {
			const i = chars.indexOf(c);
			if (i === -1) return c;

			return chars[(i ^ key) % chars.length];
		}).join('');
	}

	//------------------------------------------------------------------------

	processParams(params){
		for(let key in params){
			let p = params[key];

			if(p.value === undefined){
				p.value = this.normalizeValue(p.value);
			}

			switch(p.type){
				case "int":
					p.value = parseInt(p.value ?? 0);
					break;

				case "number":
					p.value = parseFloat(p.value ?? 0);
					break;

				case "boolean":
					p.value = p.value === true || p.value === "true" || p.value === 1;
					break;

				case "string":
					p.value = String(p.value ?? "");
					break;
					
				case "selector":
					if (typeof p.value === "object" && p.value.value !== undefined) {
						p.value = p.value.value;
					}
					p.value = String(p.value ?? "");
					break;

				case "array":
					p.value = Array.isArray(p.value) ? p.value : [];
					break;
					
				case "vector2":
					p.value = {
						x: parseFloat(p.value?.x ?? 0),
						y: parseFloat(p.value?.y ?? 0),
					};
					break;

				case "vector3":
					p.value = {
						x: parseFloat(p.value?.x ?? 0),
						y: parseFloat(p.value?.y ?? 0),
						z: parseFloat(p.value?.z ?? 0),
					};
					break;	
			}
		}

		return params;
	}
		
	normalizeValue(v){
		while(v && typeof v === "object" && v.value !== undefined){
			v = v.value;
		}
		return v;
	}

	//------------------------------------------------------------------------

	#loadAssets( dataAssets, settings ){
		this.assetsManager = new IMPION.AssetsManager({
			app				: this,
			dataAssets		: dataAssets,			
			settings		: settings,
			funComplete		: this.#initComponents
		});
    }
	
	#initComponents = ()=>{			
		if(this.#componentsInit.length > 0){
			let component = this.#componentsInit[0];
			
			this.#componentsInit.shift();

			component.init( this, this.#initComponents );
			
		}else{
			this.#initPlayable();
		}
	}
	
	//------------------------------------------------------------------------

	#initPlayable(){
		this.statisticManager.handlerEvent("LOADED");
		
		//-

		this.#saveCoreComponents();
		this.#initExtentions();
		
		//-
		
		this.#initManagers();
		this.#initCoreComponents();
		
		//-
		
		if(this.physics2d){
			this.physics2d.init( this, this.#physics2dInitComplete );
		}else{
			this.#physics2dInitComplete();
		}
    }
	
	#physics2dInitComplete = ()=>{
		if(this.physics3d){
			this.physics3d.init( this, this.#physics3dInitComplete );
		}else{
			this.onCompleteLoad();
		}
	}
	
	#physics3dInitComplete = ()=>{
		this.onCompleteLoad();
	}

	#initManagers() {
		this.resizeManager = new IMPION.ResizeManager({
			view2d: this.view2d,
			view3d: this.view3d
		});

		this.eventManager = new IMPION.EventManager({
			app: this
		});

		this.enterframeManager = new IMPION.EnterFrameManager(
			this.components,
			this.resizeManager,
		);

		this.languageManager = new IMPION.LanguageManager({params: this.params});

		this.shadersManager = new IMPION.ShadersManager(this);

		this.soundManager = new IMPION.SoundManager({
			assets: this.assets,
			params: this.params,
		});

		this.focusedManager = new IMPION.FocusedManager({
			assets				: this.assets,
			enterframeManager	: this.enterframeManager,
			soundManager		: this.soundManager,
			platformManager		: this.platformManager,
			components			: this.components			
		})
		
		this.tweenManager = new IMPION.TweenManager({
			app					: this		
		})
		
		this.tween = this.tweenManager;
	}
	
	#saveCoreComponents(){
		for(let component of this.#componentsStart){
			if(component.type == "view2d"){
				this.view2d = component;
				this.view2d.scene.add = this.view2d.scene.addChild;
				this.view2d.scene.remove = this.view2d.scene.removeChild;
			}else if(component.type == "view3d"){
				this.view3d = component;
			}else if(component.type == "physics2d"){
				this.physics2d = component;
			}else if(component.type == "physics3d"){
				this.physics3d = component;
			}
		}
	}
	
	#initCoreComponents(){		
		for(let component of this.#componentsStart){
			this.add( "_", component );
		}

		this.add("OrientationChange", new IMPION.OrientationChange({
			enterframeManager 	: this.enterframeManager,
			resizeManager 		: this.resizeManager
		}));
		
		this.debugRuler = new IMPION.DebugRuler({});
		this.view2d.scene.addChild( this.debugRuler );
		this.add("debugRuler", this.debugRuler);
		
	}
	
	#initViewHtml() {
		//this.runAfterFrames(5, () => {
			document.getElementById('main').style.visibility = "visible";
		
			if(globalThis.preloaderPlayableComplete){
				globalThis.preloaderPlayableComplete();
			}
			
			['progress', 'main', 'three', 'pixi'].forEach(id => {
				let element = document.getElementById(id);
				if(element){
					element.ontouchstart = function(e) {
						e.preventDefault();
					};
				}
			});	

			this.statisticManager.handlerEvent("DISPLAYED");					
		//});		
	}
	
	runAfterFrames(frames, callback) {
		let counter = 0;

		function tick() {
			counter++;
			if (counter >= frames) {
				callback();
			} else {
				requestAnimationFrame(tick);
			}
		}

		requestAnimationFrame(tick);
	}
	
	#initExtentions() {
		if(this.view2d){ this.PixiExtension = new IMPION.PixiExtension({app: this}); }
		if(this.view3d){ this.ThreeExtension = new IMPION.ThreeExtension({app: this}); }
	}
	
	//------------------------------------------------------------------------
		
	async initScene( gameComponent ) {		
		await this.waitFrame();
		new IMPION.CreateSpace3D({app: this, gameComponent: gameComponent});
		await this.waitFrame();
		new IMPION.CreateTextures({app: this, gameComponent: gameComponent});
		await this.waitFrame();
		new IMPION.CreateShaders({app: this, gameComponent: gameComponent});
		await this.waitFrame();
		new IMPION.CreateMaterials({app: this, gameComponent: gameComponent});
		await this.waitFrame();
		new IMPION.CreateObjects3D({app: this, gameComponent: gameComponent});
		await this.waitFrame();
		new IMPION.CreateObjects2D({app: this, gameComponent: gameComponent});
		await this.waitFrame();
		new IMPION.CreateLights({app: this, gameComponent: gameComponent});
		await this.waitFrame(); 
		new IMPION.CreateControls({app: this, gameComponent: gameComponent});
		await this.waitFrame();
		new IMPION.CreateEvents({app: this, gameComponent: gameComponent});	
		await this.waitFrame();			
	}
	
	waitFrame(){
		return new Promise(resolve => requestAnimationFrame(resolve));
	}

	processingScene(){
		
	//	if(this.params.visualMode){
	//		if(this.params.visualMode.value == "normal"){
	//			
	//		}else if(this.params.visualMode.value == "negative"){
	//			if(this.view3d){
	//				this.components["Shader3dColorize"] = new IMPION.Shader3dColorize({
	//					uNegative		: 0.0,
	//					uSaturation		: 0.0,
	//					orderShader		: 500,
	//				});
	//
	//				for(let name in this.materials){
	//					if(
	//						this.materials[name].isMeshStandardMaterial ||
	//						this.materials[name].isMeshLambertMaterial ||
	//						this.materials[name].isMeshPhongMaterial ||
	//						this.materials[name].isMeshBasicMaterial
	//					){
	//						if(!this.materials[name].shaders){ this.materials[name].shaders = []; }
	//						
	//						this.materials[name].shaders.push( this.components["Shader3dColorize"] );
	//					}
	//				}
	//			}
	//		}else if(this.params.visualMode.value == "warm"){
	//
	//		}
	//	}
		
		//- FullscreenCTA
		
		if(this.params.modeClicks.value != 1){
			this.components["FullscreenCTA"].visible = false;
		}
		
        //- ButtonSound

        if (this.platformManager.value == "ironsource_dapi" || this.platformManager.value == "ironsource_mraid" || (this.params.playMusic.value === false && this.params.playSfx.value === false)) {
            this.components["ButtonSound"].hide();
        }
       
        //- init shaders
		
		if(this.view3d){
			this.shadersManager.init3d( this.components, this.materials );
		}
		
       //- add components

        for (let componentName in this.components) {
            this.add(componentName, this.components[componentName]);
        }
		
		//- platformManager
		
		this.platformManager.init();
		
		//- resize
		
		this.resizeManager.on();
		this.resizeManager.call();
		
		//- enterframe
			
		this.enterframeManager.enterframe();
		
		//- initViewHtml
			
		this.#initViewHtml();
	}
	
	//------------------------------------------------------------------------
		
	applyVisualMode = () => {
		if(this.params.visualMode.value != "None"){
			if(!this.view3d){ return; }
			if(!this.view3d.postprocessing){
				this.eventManager.postMessage({ type: "iframe-reload" });
				return;
			}

			const effect = this.view3d.postprocessing["ColorFilters3d"];
			if(!effect){ return; }

			effect.setFilter( this.params.visualMode.value );
		}else{
			if(this.view3d && this.view3d.postprocessing){
				this.eventManager.postMessage({ type: "iframe-reload" });
				return;
			}			
		}
	}	
		
	//------------------------------------------------------------------------
	
	getPhoneData(){
		var agent = window.navigator.userAgent,
		start = agent.indexOf( 'OS' );
		if( ( agent.indexOf( 'iPhone' ) > -1 || agent.indexOf( 'iPad' ) > -1 || agent.indexOf( 'Mac' ) > -1 ) && start > -1 ){
			return {type: "iOS", version: agent.replace( '_', '.' ), description:"iOS,android"};
		}else{		
			let ua = (navigator.userAgent).toLowerCase(); 
			var match = ua.match(/android\s([0-9\.]+)/);
			
			return {type: "android", version: (match ? match[1] : 0), description:"iOS,android"};
		}
	}
	
	//------------------------------------------------------------------------

	add( name, component){
		this.components[name] = component;

		if(component.enterframe){ this.enterframeManager.add( component, component.order ); }
		if(component.resize){ this.resizeManager.add( component, component.order ); }

	}

	remove( name ){
		if(this.components[name].enterframe){ this.enterframeManager.remove( this.components[name] ); }
		if(this.components[name].resize){ this.resizeManager.remove( this.components[name] ); }

		this.components[name] = {};
	}
}

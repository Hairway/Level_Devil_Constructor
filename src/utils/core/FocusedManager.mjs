import {gsap} from "gsap";

export default class FocusedManager {
	
	#active = false;
	
	#enterframeManager;
	#soundManager;
	#platformManager;
	#components;
	#assets;

	#hidden;
	#state;
	#visibilityChange;
	
	#isOn = true;
	
	//------------------------------------------------------------------------
	
    constructor({assets, enterframeManager, soundManager, platformManager, components}){		
		this.#enterframeManager = enterframeManager;
		this.#soundManager = soundManager;
		this.#platformManager = platformManager;
		this.#components = components;
		this.#assets = assets;	
		
		//-
		
		if(typeof document.hidden !== "undefined"){
			this.#hidden = "hidden";
			this.#visibilityChange = "visibilitychange";
			this.#state = "visibilityState";
		}else if(typeof document.mozHidden !== "undefined"){
			this.#hidden = "mozHidden";
			this.#visibilityChange = "mozvisibilitychange";
			this.#state = "mozVisibilityState";
		}else if(typeof document.msHidden !== "undefined"){
			this.#hidden = "msHidden";
			this.#visibilityChange = "msvisibilitychange";
			this.#state = "msVisibilityState";
		}else if(typeof document.webkitHidden !== "undefined"){
			this.#hidden = "webkitHidden";
			this.#visibilityChange = "webkitvisibilitychange";
			this.#state = "webkitVisibilityState";
		}
		
		//-
		
		window.addEventListener(this.#visibilityChange, this.documentVisibilityChange, false);
		window.addEventListener('blur', this.off);
		window.addEventListener('focus', this.on);
		
		if(this.#platformManager.value == "vungle"){
			window.addEventListener('ad-event-pause', this.off);
			window.addEventListener('ad-event-resume', this.on);
		}
    }

	//------------------------------------------------------------------------
	
	documentVisibilityChange = ()=>{
		if(document[this.#hidden] || document[this.#state]=="hidden"){	
			this.off();			
		}else{
			this.on();
		}
	};
	
	off = ()=>{
		if(this.isOn){
			this.isOn = false;
			
			this.#enterframeManager.off();
			
			this.#soundManager.activeFocus = false;
			this.#soundManager.off();
			
			try{ gsap.globalTimeline.pause() }catch(e){}	
			
			for(let key in this.#components){ 
				if(this.#components[key].componentTypeSpine && this.#components[key].spine){
					this.#components[key].spine.state.timeScaleMemory = this.#components[key].spine.state.timeScale;
					this.#components[key].spine.state.timeScale = 0;
				}
			}
			
			for(let i in this.#assets.videos){
				if(!this.#assets.videos[i].paused && !this.#assets.videos[i].ended && this.#assets.videos[i].readyState > 2){
					this.#assets.videos[i].isPlay = true;
				}else{
					this.#assets.videos[i].isPlay = false;
				}
		
				this.#assets.videos[i].pause();
				this.#assets.videos[i].muted = true;
				this.#assets.videos[i].isFocus = false;
			};
		}
	};
	
	on = (important = false)=>{
		if(important || this.#platformManager.value != "ironsource_dapi"){		
			this.#enterframeManager.on();
			
			this.#soundManager.activeFocus = true;
			this.#soundManager.on();
			
			try{ gsap.globalTimeline.resume(); }catch(e){}
				
			for(let key in this.#components){ 
				if(this.#components[key].componentTypeSpine && this.#components[key].spine){
					if(this.#components[key].spine.state.timeScaleMemory || this.#components[key].spine.state.timeScaleMemory === 0){
						this.#components[key].spine.state.timeScale = this.#components[key].spine.state.timeScaleMemory;
					}else{
						this.#components[key].spine.state.timeScale = 1;
					}					
				}
			}
			
			for(let i in this.#assets.videos){
				if(this.#assets.videos[i].isPlay){
					this.#assets.videos[i].play().catch(err => {});
				}
				
				if(!this.#assets.videos[i].isMuted){	
					if(this.#soundManager.active){
						this.#assets.videos[i].muted = false;
					}
					this.#assets.videos[i].isFocus = true;
				};
			}
		}

		this.isOn = true;
	};
	
	//------------------------------------------------------------------------
	
}
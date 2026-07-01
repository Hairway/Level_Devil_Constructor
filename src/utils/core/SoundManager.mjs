import {Howl, Howler} from "howler";
import {gsap} from "gsap";

export default class SoundManager {
	
	activeFocus = true;
	activeUser = true;
    
	active = false;
	#isFirstСlick = false;
	
	#assets;
	#params;

	#buttonSound = [];
	
	//------------------------------------------------------------------------
	
    constructor({assets, params}){
		this.#assets = assets;		
		this.#params = params;
		
		this.off();
    }
 
	//------------------------------------------------------------------------
	
	on(numClicks = 0){
		if(numClicks > 0){this.#isFirstСlick = true;}
		
		if(this.activeFocus && this.activeUser && this.#isFirstСlick){
			this.active = true;
			
			try{ 
				Howler.mute(false);
			}catch(e){}
		}
		
		for(let i=0; i<this.#buttonSound.length; i++){
			if(this.activeUser){
				this.#buttonSound[i].turnOn();
			}else{
				this.#buttonSound[i].turnOff();
			}
		}
			
		for(let i in this.#assets.videos){
			if(!this.#assets.videos[i].paused && !this.#assets.videos[i].isMuted){					
				this.#assets.videos[i].muted = false;					
			};
		}
	}
	
	off(){
		this.active = false;
		
		try{ 
			Howler.mute(true);
		}catch(e){}
		
		for(let i=0; i<this.#buttonSound.length; i++){
			if(this.activeUser){
				this.#buttonSound[i].turnOn(); 
			}else{
				this.#buttonSound[i].turnOff();
			}
		}

		for(let i in this.#assets.videos){
			this.#assets.videos[i].muted = true;
		};		
	}
	
	//------------------------------------------------------------------------
	
	addButtonSound( btn ){
		this.#buttonSound.push( btn );
	}
	
	//------------------------------------------------------------------------
	
	play( name, volume, rate = 1, delay = 0 ){		
		if(this.active && this.#isFirstСlick && this.#assets.sounds[ name ]){
			
			if(volume == undefined){
				
			}else if(volume != null){
				this.volume(name, volume);
			}
			
			if(rate != null){
				this.rate(name, rate);
			}
			
			if(delay == 0){
				this.playByName( name );
			}else{
				gsap.set(this,	{delay:delay, overwrite: "none", onComplete:this.playByName, onCompleteParams:[ name ]});
			}
		}
	}
	
	playByName = ( name ) => {
		let sound = this.#assets.sounds[ name ];

		if(sound){
			if((this.#params.playSfx.value && !sound.isTypeMusic) || (this.#params.playMusic.value && sound.isTypeMusic===true)){
				if(sound._sprite.main){
					sound.play("main");
				}else{
					sound.play();
				}
			}
		}
	}
	
	stop(name){		
		let sound = this.#assets.sounds[ name ];		
		if(sound){
			sound.stop();
		}
	}
	
	volume(name, volume){		
		let sound = this.#assets.sounds[ name ];		
		if(sound){
			sound.volume(volume);
		}
	}
	
	rate(name, rate){		
		let sound = this.#assets.sounds[ name ];		
		if(sound){
			if(rate < 0.5){ rate = 0.5; }else if(rate > 4){ rate = 4; }
			try{
				sound.rate(rate);
			}catch(e){}
		}
	}
	
	loop(name){
		let sound = this.#assets.sounds[ name ];		
		if(sound){
			sound.loop(true);
			sound._sprite.main = [
				50,
				sound._duration*1000-50
			];
		}		
	}
	
	setMusic(name){
		let sound = this.#assets.sounds[ name ];		
		if(sound){
			sound.isTypeMusic = true;
		}
	}
	
	fadeIn(name, duration){
		let sound = this.#assets.sounds[ name ];		
		if(sound){
			sound.fade(
				0,
				sound.volume(),
				duration*1000
			);
		}
	}
	
	fadeOut(name, duration, to = 0){
		let sound = this.#assets.sounds[ name ];		
		if(sound){
			sound.fade(
				sound.volume(),
				to,
				duration*1000
			);
		}
	}
	
}
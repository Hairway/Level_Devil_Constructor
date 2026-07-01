export default class PlatformManager {
	
	value;
	
	init;
	end;
	clickAd;
	
	#platform;
	#onCompleteLoad;
	
	//------------------------------------------------------------------------
	
	constructor( {platform, value, onCompleteLoad} ){
		this.value = value;	
		this.#platform = platform;	
		this.#onCompleteLoad = onCompleteLoad;	
			
		this.init = this.#platform.init;	
		this.end = this.#platform.end ;	
		this.clickAd = this.#platform.clickAd;	
		this.handlerTap = this.#platform.handlerTap;	
		
		this.#platform.load( this.#onCompleteLoad );	
	}
	
}
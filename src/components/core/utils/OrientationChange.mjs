
import ComponentEmpty from '../view/ComponentEmpty.mjs';

export default class OrientationChange extends ComponentEmpty{
	
	#resizeManager;
	#enterframeManager;
		
	//------------------------------------------------------------------------
	
	constructor({resizeManager, enterframeManager, fps = 20, order = "extra"}){
		super(fps, order);
		
		this.#resizeManager = resizeManager;		
		this.#enterframeManager = enterframeManager;		
    }

	//------------------------------------------------------------------------
	
    enterframe = ( timeDelta )=>{		
		if(this.#resizeManager.windowWidth != window.innerWidth || this.#resizeManager.windowHeight != window.innerHeight){
			this.#resizeManager.call();
			this.#resizeManager.needUpdateResize = false;
			
			this.#enterframeManager.draw();
		}
    }

}
export default class EnterFrameManager{

	#active = true;

	#componentsStackExtra = new Set();
	#componentsStackPre = new Set();
	#componentsStack = new Set();
	#componentsStackPost = new Set();

	#timeCurrent = 0;
	#components;
	#resizeManager;
	#stats = null;

	//------------------------------------------------------------------------

	constructor(components, resizeManager){
		this.#components = components;
		this.#resizeManager = resizeManager;
		
		this.on();
    }

	//------------------------------------------------------------------------

    on(){
        this.#active = true;
    }

    off(){
        this.#active = false;
    }

	//------------------------------------------------------------------------

	setStats( stats ){
		this.#stats = stats
	}

	//------------------------------------------------------------------------

    add( component, order = "" ){
		if(order == "pre"){
			this.#componentsStackPre.add( component );
		}else if(order == "post"){
			this.#componentsStackPost.add( component );
		}else if(order == "extra"){
			this.#componentsStackExtra.add( component );
		}else{
			this.#componentsStack.add( component );
		}
    }

    remove( component ){
        this.#componentsStack.delete( component );
        this.#componentsStackPre.delete( component );
        this.#componentsStackPost.delete( component );
    }

	//------------------------------------------------------------------------

	#ticker = ( component ) => {
		let timeDelta = this.#timeCurrent - component.timePrevious;

        if(timeDelta >= component.durationFrame){
			component.timePrevious = this.#timeCurrent;

			component.enterframe( timeDelta );
		}
	}

	//------------------------------------------------------------------------

	draw = () => {
		//console.time("Code");			
		for(let component of this.#componentsStackPre){ this.#ticker( component ); }
		for(let component of this.#componentsStack){ this.#ticker( component ); }
		//console.timeEnd("Code");
		//console.time("Code");
		for(let component of this.#componentsStackPost){ this.#ticker( component ); }
		//console.timeEnd("Code");
	}

	//------------------------------------------------------------------------

    enterframe = () => {		        
		if(this.#stats){ this.#stats.begin(); }
		
		this.#timeCurrent = performance.now();
		
		for(let component of this.#componentsStackExtra){ this.#ticker( component ); }
		
		if( this.#active ){
			this.draw();
			
			if(this.#resizeManager.needUpdateResize){ this.#resizeManager.call() }
		}
		
		if(this.#stats){ this.#stats.end(); }
		
        requestAnimationFrame( this.enterframe );
    }
}

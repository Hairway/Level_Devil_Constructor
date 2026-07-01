export default class ResizeManager {

	#active = false;

	call;

	windowWidth;
	windowHeight;

	#view2d;
	#view3d;

	#componentsStackPre = new Set();
	#componentsStack = new Set();
	#componentsStackPost = new Set();

	//------------------------------------------------------------------------

    constructor({view2d, view3d}){
        this.#view2d = view2d;
        this.#view3d = view3d;

		//-

		window.addEventListener( 'resize', this.resize );

		//-

		this.call = this.resize;
    }

	//------------------------------------------------------------------------

    on(){
        this.#active = true;
    }

    off(){
        this.#active = false;
    }

	//------------------------------------------------------------------------

    add ( component, order = "" ) {
       if(order == "pre"){
			this.#componentsStackPre.add( component );
		}else if(order == "post"){
			this.#componentsStackPost.add( component );
		}else{
			this.#componentsStack.add( component );
		}
    }

    remove ( component ) {
        this.#componentsStack.delete( component );
        this.#componentsStackPre.delete( component );
        this.#componentsStackPost.delete( component );
    }

	//------------------------------------------------------------------------

	#ticker = ( component ) => {
		if(component == this.#view2d || component == this.#view3d){
			component.resize(this.windowWidth, this.windowHeight);			
		}else if(component.componentType3D){
			component.resize(this.windowWidth, this.windowHeight);
		}else if(component.componentType2D){
			component.resize(this.#view2d.width/this.#view2d.scene.scale.x, this.#view2d.height/this.#view2d.scene.scale.x);
		}else{
			component.resize(this.#view2d.width/this.#view2d.scene.scale.x, this.#view2d.height/this.#view2d.scene.scale.x);
		}
	}

	//------------------------------------------------------------------------

    resize = ()=>{
		if(!this.#active){ return; }
		
		this.needUpdateResize = false

		this.windowWidth = window.innerWidth;
		this.windowHeight = window.innerHeight;

		for(let component of this.#componentsStackPre){ this.#ticker( component ); }
		for(let component of this.#componentsStack){ this.#ticker( component ); }
		for(let component of this.#componentsStackPost){ this.#ticker( component ); }
		//for(let component of this.#componentsStackPre){ this.#ticker( component ); }
    }

	needUpdate() {
		this.needUpdateResize = true
	}

}

export default class ComponentEmpty{
			
	componentType2D = false;
	componentType3D = false;
	
	fps;
	order;	
	timePrevious = 0;
    durationFrame = 0; 
	
	//------------------------------------------------------------------------
	
	constructor(fps = 60, order = ""){
		this.fps = fps;
		this.order = order;
		this.durationFrame = 1000/this.fps;
    }

	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	//------------------------------------------------------------------------
	
	//resize = (width, height)=>{
	//	
    //}

}
import * as IMPION from "#impion";

export default class Component3d extends IMPION.Group3d{
	
	componentType2D = false;
	componentType3D = true;
	
	fps;
	order;	
	timePrevious = 0;
    durationFrame = 0; 
	
	//------------------------------------------------------------------------
	
	constructor(fps = 60, order = ""){
		super();
		
		this.fps = fps;
		this.order = order;
		this.durationFrame = 1000/this.fps;
    }

	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	//resize = (width, height)=>{
	//	
    //}

}
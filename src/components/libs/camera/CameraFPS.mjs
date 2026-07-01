import * as IMPION from "#impion";

export default class CameraFPS extends IMPION.Component3d{

	camera;
	lookTarget = new IMPION.Vector3();

	//------------------------------------------------------------------------
	
	constructor({
		camera,
		position = new IMPION.Vector3(0, 0.1, 0),
		lookTarget = new IMPION.Vector3(0, -0.1, 5)
	}){
		super();
		
		this.camera = camera;
		this.lookTarget.copy( lookTarget );
		
		//-		
		
		this.camera.position.copy( position );
		this.camera.lookAt( this.lookTarget );
		
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------

	//#updateLookAngle(){		
	//
	//}
	
	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//
    //}
    
	//resize = (width, height)=>{
	//	
    //}

}
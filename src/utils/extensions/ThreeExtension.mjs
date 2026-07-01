import * as IMPION from "#impion";

export default class ThreeExtension{
		
	#app;

	//------------------------------------------------------------------------
	
	constructor({app}){
		this.#app = app;
    }
	
	//------------------------------------------------------------------------

	positionTo2d( object ){		
		let worldPosition3d = new IMPION.Vector3();
		let worldPosition2d = new IMPION.Vector2();
		
		object.getWorldPosition( worldPosition3d );

		let screenPosition = worldPosition3d.clone().project( this.#app.view3d.camera );
		
		let x = (screenPosition.x * +0.5 + 0.0) * this.#app.view3d.width * this.#app.view3d.scaleFactorReal;
		let y = (screenPosition.y * -0.5 + 0.0) * this.#app.view3d.height * this.#app.view3d.scaleFactorReal;
		
		worldPosition2d.x = x * ((this.#app.view2d.width * this.#app.view2d.scaleFactorReal) / (this.#app.view3d.width * this.#app.view3d.scaleFactorReal));
		worldPosition2d.y = y * ((this.#app.view2d.height * this.#app.view2d.scaleFactorReal) / (this.#app.view3d.height * this.#app.view3d.scaleFactorReal));
		
		worldPosition2d.x /= (this.#app.view2d.scene.scale.x * this.#app.view2d.scaleFactorReal);
		worldPosition2d.y /= (this.#app.view2d.scene.scale.y * this.#app.view2d.scaleFactorReal);

		return worldPosition2d;
	};

	calculateSize( object ){		
		let quaternion = new IMPION.Quaternion3d();
		quaternion.copy( object.quaternion);		
		object.rotation.set(0,0,0);
		
		let box = new IMPION.Box3d().setFromObject( object );
		let size = box.getSize( new IMPION.Vector3() );
		
		if(!size.x){
			size = object.geometry.boundingBox.getSize( new IMPION.Vector3() );
		}
		
		object.applyQuaternion( quaternion );

		object.wx = size.x;
		object.wy = size.y;
		object.wz = size.z;
	}

}
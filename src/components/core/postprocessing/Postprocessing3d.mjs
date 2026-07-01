import * as POSTPROCESSING from "postprocessing";

export default class Postprocessing3d{

	effects;
	
	//------------------------------------------------------------------------
	
	constructor(effects = []){
		
		this.effects = effects;
		
    }
	
	getComposer( renderer ){
		return new POSTPROCESSING.EffectComposer( renderer );
	}
	
	getRenderPass( scene, camera ){
		return new POSTPROCESSING.RenderPass(scene, camera);
	}
	
	getEffectPass( camera, pass ){
		return new POSTPROCESSING.EffectPass(camera, pass);
	}
}
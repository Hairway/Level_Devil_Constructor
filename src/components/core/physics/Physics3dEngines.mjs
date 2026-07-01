import Physics3dBase from "./Physics3d.mjs";
import Physics3dCannon from "./cannon/index.mjs";
import Physics3dCrashcat from "./crashcat/index.mjs";
import Physics3dBounce from "./bounce/index.mjs";

const physics3dEngines = {
	bounce		: Physics3dBounce,
	cannon		: Physics3dCannon,
	crashcat	: Physics3dCrashcat,
};

export default class Physics3d extends Physics3dBase{
	constructor({engine = "crashcat", fps = 60, order = "", settings = {}} = {}){
		super({fps, order});

		const Engine = physics3dEngines[engine];

		if(!Engine){
			throw new Error(`Unknown physics3d engine: ${engine}`);
		}

		return new Engine({
			fps,
			order,
			...settings,
		});
	}
}

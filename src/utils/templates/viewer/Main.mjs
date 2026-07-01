import * as THREE from "three";
import * as IMPION from "#impion";

import Playable from './utils/Playable.mjs';
import Game from "./Game.mjs";

import * as POSTPROCESSING from "postprocessing";

globalThis.playable = new Playable({
    params			: globalThis.params,
    platform		: globalThis.platform,
    platformName	: globalThis.adPlatform.value,
    dataAssets		: IMPION.DataAssets,
    onCompleteLoad	: startPlayable,
	
	fps				: 60,
	
	addons			: [
		new IMPION.Viewer3d(globalThis.params),
		new IMPION.DRACOLoader(),
		//new IMPION.SPINELoader()
	],

	components		: [
		new IMPION.Renderer2d({
			dynamicResolution		: false,
		}),
		
		new IMPION.Renderer3d({
			dynamicResolution		: false,
			perspective 			: true,
			layers 					: 1,
			fov 					: [60, 30],
			logarithmicDepthBuffer	: false,
			postprocessingForce		: false,
			shadowMap 				: THREE.PCFShadowMap,	// PCFSoftShadowMap
			//postprocessing 	: new IMPION.Postprocessing3d([
			//	//{name:"OutlineEffect", 	pass: (scene, camera) => { return new POSTPROCESSING.OutlineEffect(scene, camera, {blur: false, blendFunction: 1, edgeStrength : 15, visibleEdgeColor: 0x111111}); }},
			//	//{name:"BlurSimple3d", 	pass: (scene, camera) => { return new IMPION.BlurSimple3d({ uStrength: 3.0 }); }},
			//	//{name:"BlurRadial3d", 	pass: (scene, camera) => { return new IMPION.BlurRadial3d({ uStrength: 1.0, uRadius: 1}); }},
			//	//{name:"WaveSimple3d", 	pass: (scene, camera) => { return new IMPION.WaveSimple3d({ uSpeed:2, uStrength: 1.0 }); }},
			//	//{name:"Tint3d", 	pass: (scene, camera) => { return new IMPION.Tint3d({ uColor:0x555555, uTint: 1 }); }},
			//	//{name:"SplitRGB3d", 	pass: (scene, camera) => { return new IMPION.SplitRGB3d({ uStrength: 1.0 }); }},
			//	//{name:"FXAAEffect", 	pass: (scene, camera) => { return new POSTPROCESSING.FXAAEffect(); }},
			//]),
		}),
		
		new IMPION.Physics3dCannon({}),
	],	

	assetHandler	: {		
		clearCache		: true,
		textures		: {
			optimizer			: false,			
			sharpen				: 0.0,	
			quality				: 0.80,
			qualityMask			: 0.70,
			atlas				: false,
			atlasMask			: false,
			atlasSize			: 2048,
			atlasCell			: 256,
			atlasPadding		: 1,
			allowRotation		: true,
			trim				: true,
			ignoreOptimize		: [
				"-sat",
			],
			ignoreAtlas			: [
				"-sat",
				"-grid",
				"-mask",
				"texture_ground",
				"texture_sky",
			],
		},
		sounds			: {
			optimizer			: true,		
			quality				: "96k",
			qualityBackground	: "64k",
		},
		videos			: {
			optimizer			: true,		
			quality				: 0.3,
		},
		fonts			: {
			optimizer			: false,		
		}
	},
		
});

//----------------------------------------------------

function startPlayable(){
	if(globalThis.isStartPlayable){ return false; }else{ globalThis.isStartPlayable = true; }	
	
	globalThis.playable.add("Game", new Game({app: globalThis.playable}));	
	globalThis.playable.initScene( globalThis.playable.components["Game"] ).then(()=>{
		globalThis.playable.components["Game"].init();
		globalThis.playable.components["Game"].initGame();
		globalThis.playable.processingScene();	
		
		if(!globalThis.isCreatePlayable){ globalThis.isCreatePlayable = true; }
	});	
}


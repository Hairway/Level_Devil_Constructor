import * as IMPION from "#impion";

//----------------------------------------------------

globalThis.playable = new IMPION.Playable({
    params			: globalThis.params,
    platform		: globalThis.platform,
    platformName	: globalThis.adPlatform.value,
    onCompleteLoad	: startPlayable,
	
	fps				: 60,
	
	addons			: [
		new IMPION.SPINELoader()
	],

	components		: [
		new IMPION.Renderer2d({
			dynamicResolution : false,
		}),
		
		new IMPION.Physics2dP2({}),
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
	
	globalThis.playable.add("Game", new IMPION.Game({app: globalThis.playable}));	
	globalThis.playable.initScene( globalThis.playable.components["Game"] ).then(()=>{
		globalThis.playable.components["Game"].init();
		globalThis.playable.components["Game"].initGame();
		globalThis.playable.processingScene();	
		
		if(!globalThis.isCreatePlayable){ globalThis.isCreatePlayable = true; }
	});	
}


import {AtlasAttachmentLoader, SkeletonJson, TextureAtlas, SpineTexture} from "@esotericsoftware/spine-pixi-v8";

export class SPINELoader{
	
	name = "SPINELoader";

	constructor() {
	
	}
	
	parseData( assetsManager, key){
		let baseTexture = assetsManager.textures.pixi[ key ].source;

		let spineAtlas = new TextureAtlas( assetsManager.atlas[key] );

		for (const page of spineAtlas.pages) {
            page.setTexture( SpineTexture.from( assetsManager.textures.pixi[ key ].source ) );
        }		

		let spineAtlasLoader = new AtlasAttachmentLoader( spineAtlas );
		let spineJsonParser = new SkeletonJson( spineAtlasLoader );

		let skeletonData = spineJsonParser.readSkeletonData( assetsManager.json[key] );
		
		return skeletonData;		
	}
}



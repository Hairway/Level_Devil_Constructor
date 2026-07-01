import {Spine, Physics} from "@esotericsoftware/spine-pixi-v8";
import * as IMPION from "#impion";

export default class SpriteSpine2d extends IMPION.Component2d{

	componentType2D = true;
	componentType3D = false;
	componentTypeSpine = true;
	
	spine;
	action = {};
	
	actionStandard 	= "idle";
	
	//------------------------------------------------------------------------
	
	constructor({
		data,
		fps = 45,
		order = "",
		positionRelative = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		positionAbsolute = {vertical: {x: 0, y: 0}, horizontal: {x: 0, y: 0}},
		scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
		rotationAbsolute = {vertical: 0, horizontal: 0},
		asBitmap = false,
		borderBitmap = 0,	
	}){
		super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute, asBitmap, borderBitmap);

		//-
		
		if(data.isObject){		
			this.spine = Spine.from( data );	
		}else{
			this.spine = new Spine( data );	
		}
		//console.log(this.spine)
		this.spine.autoUpdate = true;	
		//this.spine.drawDebug = true;
		//this.spine.drawBones = true;

		this.animationContainer.addChild( this.spine );
		
		//this.spine.debug  = new SpineDebugRenderer(globalThis.playable.view2d.app.renderer);		
		//this.spine.debug.drawDebug = true;
		//this.spine.debug.drawClipping = true;
		
		//-
		
		for(let i=0; i<this.spine.skeleton.data.animations.length; i++){
			let animation = this.spine.skeleton.data.animations[i];
			let loop = false;
			
			if(
				(animation.name.toLowerCase()).indexOf("idle") != -1 ||
				(animation.name.toLowerCase()).indexOf("run") != -1 ||
				(animation.name.toLowerCase()).indexOf("walk") != -1
			){
				loop = true;
			}
			
			this.action[animation.name] = {
				name	: animation.name,
				speed	: 1,				
				loop	: loop,				
			};
		}
		
		//-
		
		this.spine.state.addListener({
			complete: this.#endAnimation
		});

		//-

		return this;
    }
	
	//------------------------------------------------------------------------
	
	#endAnimation = (entry)=>{
		if(!this.action[entry.animation.name].loop && entry.animation.name != this.actionStandard){
			this.setAction( this.actionStandard );
		}
	}
	
	//------------------------------------------------------------------------
	
	setAction( action, delay = 0, loop = null){
		if(!this.action[action]){ return false; }
		
		this.action[action].loop = loop;

		this.spine.state.setAnimation(delay, action, this.action[action].loop);
		
		this.setActionSpeed(action, this.action[action].speed);
	}
	
	setActionSpeed( action, speed = 1){
		for(let i=0; i<this.spine.state.tracks.length; i++){
			let track = this.spine.state.tracks[i];
			if (track.animation.name === action) {
				this.spine.state.tracks[0].timeScale = speed;
				this.action[action].speed = speed;
			}
		};
	}
	
	setSkin( skinName ){
		this.spine.skeleton.setSkinByName( skinName );
		this.spine.skeleton.setSlotsToSetupPose();
	}
	
	setAttachment(skinName, slotName, attachmentName){
		let slot = this.spine.skeleton.findSlot( slotName );
		let skin = this.spine.skeleton.data.findSkin(skinName);
		let attachment = skin.getAttachment(slot.data.index, attachmentName);
		slot.setAttachment(attachment);
		this.spine.skeleton.updateWorldTransform( Physics.update );
	}
	
	getSlot( slotName ){
		let slot = this.spine.skeleton.findSlot( slotName );
		return slot;
	}
	
	getSprite( slotName ){
		let slot = this.spine.skeleton.findSlot( slotName );
		let sprite = this.spine.slotContainers[slot.data.index];
		return sprite;
	}
	
	hideSlot( slotName ){
		let slot = this.spine.skeleton.findSlot( slotName );
		slot.setAttachment(null);
	}

	log(){
		for(let i=0; i<this.spine.skeleton.data.skins.length; i++){
			let skin = this.spine.skeleton.data.skins[i];
			
			console.log("skin: "+skin.name);
			
			skin.attachments.forEach((slotAttachments, slotIndex) => {
				const slotName = this.spine.skeleton.data.slots[slotIndex].name;
				
				console.log("  slot: " + slotName);
				
				Object.keys(slotAttachments).forEach(attachmentName => {
					console.log("    attachment: " + attachmentName);
				});
			});
			
			console.log("");
		}
		
		console.log("animations:");
		
		for(let i=0; i<this.spine.skeleton.data.animations.length; i++){
			let animation = this.spine.skeleton.data.animations[i];
			console.log("  "+animation.name);
		}	
		
		console.log("");
	}

}

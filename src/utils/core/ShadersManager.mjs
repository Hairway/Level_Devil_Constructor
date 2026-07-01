import * as IMPION from "#impion";

export default class ShadersManager {

	#app;
	#view3d;
	
	//------------------------------------------------------------------------
	
	constructor( app ){	
		this.#app = app;		
	}
	
	init3d( components, materials){
		let commonShadersList = [];
		let commonUniforms = {};
		let commonVertexHead = "";
		let commonVertexBody = "#include <morphtarget_vertex>";
		let commonFragmentHead = "";
		let commonFragmentBody = "#include <tonemapping_fragment>";	
			
		//- create shaders list
		
		for(let key in materials){
			if(materials[key].shaders && materials[key].shaders.length > 0){
				for(let i in materials[key].shaders){
					if(commonShadersList.indexOf(materials[key].shaders[i]) == -1){
						commonShadersList.push( materials[key].shaders[i] );
						
						materials[key].shaders[i].addMaterial( materials[key] );
					}
				}
			}
		}			
		
		//- sort list by order
		
		commonShadersList.sort((a, b) => a.orderShader - b.orderShader);
		
		//-
		
		for(let key in commonShadersList){
			commonShadersList[key].process(""+key);
			
			//-
			
			for(let u in commonShadersList[key].uniformsObject){
				commonUniforms[u] = commonShadersList[key].uniformsObject[u];
			}
			
			commonVertexHead += commonShadersList[key].vertexHead;
			commonVertexBody += commonShadersList[key].vertexBody;
			commonFragmentHead += commonShadersList[key].fragmentHead;
			commonFragmentBody += commonShadersList[key].fragmentBody;
		}
		
		//-
				
		commonVertexHead = "attribute vec3 color;\n" + commonVertexHead;
		
		if(this.#app.assets.textures.three["vfx_noise_perlin"]){
			commonFragmentHead = "uniform sampler2D uNoisePerlin;\n" + commonFragmentHead;
			commonUniforms.uNoisePerlin = {value: this.#app.assets.textures.three["vfx_noise_perlin"]};
		}
		
		//-
		
		let sceneForcedCompile = new IMPION.Group3d();
		let geometryForcedCompile = new IMPION.BoxGeometry3d( 1, 1, 1 );
		
		for(let key in materials){
			if(materials[key].shaders && materials[key].shaders.length > 0){
				materials[key].userData.commonUniforms = {};
				
				for(let u in commonUniforms){
					if(u.indexOf("isActiveShader") != -1){
						materials[key].userData.commonUniforms[u] = {value: commonUniforms[u].value};
					}else{
						materials[key].userData.commonUniforms[u] = commonUniforms[u];
					}
				}

				materials[key].userData.commonVertexHead = commonVertexHead;
				materials[key].userData.commonVertexBody = commonVertexBody;
				materials[key].userData.commonFragmentHead = commonFragmentHead;
				materials[key].userData.commonFragmentBody = commonFragmentBody;

				materials[key].onBeforeCompile = this.shaderBeforeCompile.bind(materials[key]);	
			}
		}

		//-

		//this.traverseSceneIn( this.#app.view3d.scene );
				
		this.#app.view3d.enterframe();
		
		//this.traverseSceneOut( this.#app.view3d.scene );

		//-
		
		for(let key in materials){

			if(materials[key].shaders && materials[key].shaders.length > 0){
				materials[key].userData.shadersTimeList = [];
				
				//for(let key in commonShadersList){
				
				for(let i in materials[key].shaders){					
					for(let u in materials[key].shaders[i].uniformsObject){
						if(u.indexOf("isActiveShader") != -1){
							materials[key].userData.commonUniforms[u].value = true;
						}else if(u.indexOf("uTime") != -1){
							materials[key].userData.shadersTimeList.push( u );
						}							
					}
				}			
				
				if(materials[key].userData.shadersTimeList.length > 0){
					materials[key].shaderUpdate = ( material, time ) => {
						if(material.userData.shader && material.userData.shader.uniforms){
							for(let i in material.userData.shadersTimeList){
								let u = material.userData.shadersTimeList[i];
								material.userData.commonUniforms[u].value = time;
							}
						}
					}
				}
			}			

		}

	}
		
	traverseSceneIn(object) {
		if(object.isMesh){
			object._m_visible = object.visible;
			object._m_fc = object.frustumCulled;
			object.visible = true;
			object.frustumCulled = false;
		}

		object.children.forEach(child => this.traverseSceneIn(child));
	}
	
	traverseSceneOut(object) {
		if(object.isMesh){
			object.visible = object._m_visible;
			object.frustumCulled = object._m_fc;
		}

		object.children.forEach(child => this.traverseSceneOut(child));
	}

	shaderBeforeCompile(shader, renderer){
		if(this.userData.isInit){ return false; }
		this.userData.isInit = true;
		
		for(let key in this.userData.commonUniforms){
			shader.uniforms[key] = this.userData.commonUniforms[key];
		}

		shader.vertexShader = this.userData.commonVertexHead + shader.vertexShader;
		shader.vertexShader = shader.vertexShader.replace('#include <morphtarget_vertex>', this.userData.commonVertexBody );
		
		shader.fragmentShader = this.userData.commonFragmentHead + shader.fragmentShader;
		shader.fragmentShader = shader.fragmentShader.replace('#include <tonemapping_fragment>', this.userData.commonFragmentBody );
		
		this.userData.shader = shader;		
	}
		
	creatingShaders(material, shadersData){
		for(let key in shadersData){
			let shaderData = shadersData[key];
			
			if(!this.#app.components[shaderData.name]){ 
				
				if(shaderData.id == "water_perlin"){
					
					this.#app.components[shaderData.name] = new IMPION.Shader3dWaterPerlin({
						app			: this.#app,
						uStrength	: shaderData.params.strength.value,
						uSpeed		: shaderData.params.speed.value,
						uSize		: shaderData.params.size.value,
						uAngle		: shaderData.params.angle.value,
						uAlpha		: shaderData.params.alpha.value,
					});
				
				}else if(shaderData.id == "mix_four"){
						
					this.#app.components[shaderData.name] = new IMPION.Shader3dMixFour({
						app				: this.#app,
						uTextureMap_0	: this.#app.assets.textures.three[shaderData.params.tex_1.value],
						uTextureMap_1	: this.#app.assets.textures.three[shaderData.params.tex_2.value],
						uTextureMap_2	: this.#app.assets.textures.three[shaderData.params.tex_3.value],
						uTextureMap_3	: this.#app.assets.textures.three[shaderData.params.tex_4.value],
						uTextureMask	: this.#app.assets.textures.three[shaderData.params.tex_mask.value],
						uRepeat			: [
							shaderData.params.repeat_1.value,
							shaderData.params.repeat_2.value,
							shaderData.params.repeat_3.value,
							shaderData.params.repeat_4.value,
						],
					});				
						
				}else if(shaderData.id == "mix_three"){
									
					this.#app.components[shaderData.name] = new IMPION.Shader3dMixThree({
						app				: this.#app,
						uTextureMap_0	: this.#app.assets.textures.three[shaderData.params.tex_1.value],
						uTextureMap_1	: this.#app.assets.textures.three[shaderData.params.tex_2.value],
						uTextureMap_2	: this.#app.assets.textures.three[shaderData.params.tex_3.value],
						uTextureMask	: this.#app.assets.textures.three[shaderData.params.tex_mask.value],
						uRepeat			: [
							shaderData.params.repeat_1.value,
							shaderData.params.repeat_2.value,
							shaderData.params.repeat_3.value,
						],
					});				
						
				}else if(shaderData.id == "mix_two"){
									
					this.#app.components[shaderData.name] = new IMPION.Shader3dMixTwo({
						app				: this.#app,
						uTextureMap_0	: this.#app.assets.textures.three[shaderData.params.tex_1.value],
						uTextureMap_1	: this.#app.assets.textures.three[shaderData.params.tex_2.value],
						uTextureMask	: this.#app.assets.textures.three[shaderData.params.tex_mask.value],
						uRepeat			: [
							shaderData.params.repeat_1.value,
							shaderData.params.repeat_2.value,
						],
					});				
					
				}else if(shaderData.id == "wind"){
					
					this.#app.components[shaderData.name] = new IMPION.Shader3dWind({
						app				: this.#app,
						uSpeed			: shaderData.params.speed.value,
						uStrength		: shaderData.params.strength.value,					
					});
					
				}else if(shaderData.id == "shadow_attribute"){
					
					this.#app.components[shaderData.name] = new IMPION.Shader3dShadowAttribute({
						app				: this.#app,
						uStrength		: shaderData.params.strength.value,					
					});
					
				}else if(shaderData.id == "water_level"){
					
					this.#app.components[shaderData.name] = new IMPION.Shader3dWaterLevel({
						app				: this.#app,
						uThickness		: shaderData.params.thickness.value,					
						uStrength		: shaderData.params.strength.value,					
						uLevel			: shaderData.params.level.value,	
					});
					
				}else if(shaderData.id === "tint"){

					this.#app.components[shaderData.name] = new IMPION.Shader3dTint({
						app         : this.#app,
						uColor      : new IMPION.Color3d(...shaderData.params.color.value),
						uTint       : shaderData.params.tint.value,
						uBrightness : shaderData.params.brightness.value,
						uOverlay    : shaderData.params.overlay.value,
					});
					
				}else if(shaderData.id === "water_simple"){

					this.#app.components[shaderData.name] = new IMPION.Shader3dWaterSimple({
						app         : this.#app,
						uTexture    : this.#app.assets.textures.three[shaderData.params.texture.value],
						uRepeat     : shaderData.params.repeat.value,
						uSpeed      : shaderData.params.speed.value,
					});
					
				}

			}
			
			if(this.#app.components[shaderData.name]){ 
				material.shaders.push( this.#app.components[shaderData.name] );
			}
		}
	}
		
}

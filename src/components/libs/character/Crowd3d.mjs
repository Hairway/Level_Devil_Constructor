import * as IMPION from "#impion";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

export default class Crowd3d extends IMPION.Component3d {

    componentType3D = true;

    #app;
    #name;

	characters = [];
	action = {};
	
    model;
    sat;

	textureSourceSat = null;
	jsonSat = null;
	
    textureSat = null;

    quantity = 0;
    sourceMeshes = [];
    instancedMeshes = [];    
    time = 0;
    isBoneOrderValid = true;
    isReady = false;
    initPromise = null;
    _vatFloatBuffer = null;
    _vatFloatView = null;
	shadowIM;
	heightMap;
	
	#stickPoint = new IMPION.Group3d();
	#stickDirection = new IMPION.Vector3(0, -1, 0);
	#stickRaycaster = new IMPION.Raycaster3d();
	#stickIntersects;
	
	#clock = new IMPION.Timer3d();	
	
	
    constructor({ app, name, heightMap = null, castShadow = true, receiveShadow = true, planeShadow = false, quantity = 1000, dispose = [] }) {
        super();

        this.#app = app;
        this.#name = name;
        this.quantity = quantity;
        this.dispose = new Set(Array.isArray(dispose) ? dispose : [dispose]);
		this.castShadow = castShadow;
        this.receiveShadow = receiveShadow;
        this.heightMap = heightMap;
			
        this.model = SkeletonUtils.clone( this.#app.assets.models[this.#name].scene );;
        this.jsonSat = this.#app.assets.json[this.#name + "-sat"];

        const defaultAction = this.jsonSat?.actions?.[0] || { name: "idle", start: 0, end: 1 };

        for (let i = 0; i < this.quantity; i++) {
            let character = new IMPION.Object3d();
			
			character.index 					= i;
			character.jsonSat 					= this.jsonSat;
			character.instancedMeshes 			= this.instancedMeshes;
			
			character.positionTo				= character.position.clone();
			
			character.speed						= 1;
			character.timeOffset				= Math.random() * 10;
			
			character.isAI						= true;
			character.autoMove					= true;
			character.autoRotation				= true;
			character.isBoneAnimation			= true;
			character.isSkeleton				= true;
			character.isActionAutoplay			= true;
	
			character.stickMeshGround 			= null;
			
			character.forceWalk 				= 5.0;
			character.forceRun 					= 10.0;
			character.forceJump 				= 5.0;
			
			character.angularVelocityRK			= 0.65;
			character.angularLookRK				= 0.65;
			
			character.angularLook				= 0;
			character.angularLookCurrent		= 0;
			
			character.angularVelocity			= 0;
			character.angularVelocityCurrent	= 0;
			
			character.angularUser				= 0;
			
			character.life						= 100;
		
			character.navigationPath			= [];
		
			character.wx 						= 0.6;
			character.wy 						= 1.8;
			character.wz 						= 0.6;	
			
			character.tmAI 						= Math.randomInteger(0, 100);
			
			character.actionStandard 			= "idle";
			character.action 					= {};
			character.actionPool 				= {"idle":[], "walk":[], "run":[], "jump":[], "attack":[], "fire":[], "hit":[], "reload":[], "fail":[], "die":[], "up":[], "other":[]};
			character.actionCurrent 			= defaultAction.name;
			character.isAction 					= {};
			
			character.actionStart				= defaultAction.start;
			character.actionEnd					= defaultAction.end;
			
			character.commandToPoints 			= this.commandToPoints;
			character.setAction 				= this.setAction;
			character.setActionPool 			= this.setActionPool;
			character.setActionBoolean 			= this.setActionBoolean;
			
			this.#processMixer( character );
			
			this.characters.push( character );
        }
		
		if (planeShadow) {
			this.#createShadowIM();
		}
		
        this.initPromise = this.init();
    }

	#createShadowIM() {
		const geo = new IMPION.PlaneGeometry3d(1, 1);

		const tex = this.#app.assets.textures.three["texture_shadow"]

		const mat = new IMPION.MeshBasicMaterial3d({
			map: tex,
			transparent: true,
			depthWrite: false,
			opacity: 0.5,
		});

		mat.polygonOffset = true;
		mat.polygonOffsetFactor = -18;
		mat.polygonOffsetUnits = -18;

		const im = new IMPION.InstancedMesh3d(geo, mat, this.quantity);
		
		im.frustumCulled = false;
		im.castShadow = false;
		im.receiveShadow = false;
		//im.renderOrder = 999;

		const tempMatrix = new IMPION.Matrix4();
		const scale = new IMPION.Vector3();

		for (let i = 0; i < this.quantity; i++) {
			const c = this.characters[i];

			scale.set(1, 1, 1);

			tempMatrix.compose(
				c.position,
				new IMPION.Quaternion3d(),
				scale
			);

			im.setMatrixAt(i, tempMatrix);
		}

		im.instanceMatrix.needsUpdate = true;

		this.shadowIM = im;
		this.add(im);
	}

    async init(){
        const modelMeta = this.#app.assets.json[this.#name];

        if (!this.model || !this.jsonSat) {
            console.warn("SAT missing");
            return;
        }

        this.textureSourceSat = this.#app.assets.textures.three[this.#name + "-sat"];

        if (!this.textureSourceSat) {
            console.warn("SAT texture missing");
            return;
        }

        this.textureSourceSat.minFilter = IMPION.NearestFilter;
        this.textureSourceSat.magFilter = IMPION.NearestFilter;
        this.textureSourceSat.generateMipmaps = false;
        this.textureSourceSat.flipY = false;
        this.textureSourceSat.colorSpace = IMPION.NoColorSpace;
        this.textureSourceSat.needsUpdate = true;

        const preparedSat = await this.createPredecodedsatTexture(this.textureSourceSat, this.jsonSat);

        if (!preparedSat) {
            console.warn("[SAT] Failed to predecode SAT texture");
            return;
        }

        this.textureSat = preparedSat.texture;
        this.satPixelsPerBone = preparedSat.pixelsPerBone;

        const tempMatrix = new IMPION.Matrix4();

        this.model.traverse((obj) => {
			this.model[obj.name] = obj;
			
			if (!obj.isMesh) return;
            if (this.dispose.has(obj.name)) return;

            const srcGeo = obj.geometry;
            const skeleton = obj.skeleton;

            const hasSkin = !!(
                srcGeo.attributes.position &&
                srcGeo.attributes.skinIndex &&
                srcGeo.attributes.skinWeight
            );

            if (!hasSkin || !skeleton) return;

            this.sourceMeshes.push( obj );

			//-
			
            const skeletonBoneNames = skeleton.bones.map((b) => b.name);
            const skeletonBoneNamesNormalized = skeletonBoneNames.map((name) => this.normalizeBoneName(name));

            const vatBoneNames = Array.isArray(this.jsonSat.bone_names) ? this.jsonSat.bone_names : [];
            const vatBoneNamesNormalized = Array.isArray(this.jsonSat.bone_names_normalized)
                ? this.jsonSat.bone_names_normalized
                : vatBoneNames.map((name) => this.normalizeBoneName(name));

            if (vatBoneNamesNormalized.length !== skeletonBoneNamesNormalized.length) {
                this.isBoneOrderValid = false;
				
                console.error("[SAT] Bone count mismatch", {
                    vatBoneCount: vatBoneNamesNormalized.length,
                    skeletonBoneCount: skeletonBoneNamesNormalized.length,
                    vatBoneNames,
                    vatBoneNamesNormalized,
                    skeletonBoneNames,
                    skeletonBoneNamesNormalized
                });
                return;
            }

            for (let i = 0; i < skeletonBoneNamesNormalized.length; i++) {
                if (skeletonBoneNamesNormalized[i] !== vatBoneNamesNormalized[i]) {
                    this.isBoneOrderValid = false;
                    console.error("[SAT] Bone order mismatch", {
                        index: i,
                        vatBoneName: vatBoneNames[i],
                        vatBoneNameNormalized: vatBoneNamesNormalized[i],
                        skeletonBoneName: skeletonBoneNames[i],
                        skeletonBoneNameNormalized: skeletonBoneNamesNormalized[i]
                    });
                    return;
                }
            }

            const geo = srcGeo.clone();

			this.limitSkinInfluences(geo, 2);
			
            const materialName = modelMeta?.objects?.[obj.name]?.materials?.[0];
            const materialData = materialName ? modelMeta?.materials?.[materialName] : null;

            let mat;

            if (materialName && this.#app.materials[materialName]) {
                mat = this.#app.materials[materialName];
            } else {
				mat = new IMPION.MeshLambertMaterial3d({
                    color: new IMPION.Color3d(0xffffff)
                });
				
                if (materialName) {
                    this.#app.materials[materialName] = mat;
                }

                if (materialData) {
                    if (materialData.params.base_color) {
                        mat.color = new IMPION.Color3d().fromArray(materialData.params.base_color);
                    }
			
                    if (
                        materialData.params.base_color_texture &&
                        this.#app.assets.textures.three[materialData.params.base_color_texture]
                    ) {
                        const tex = this.#app.assets.textures.three[materialData.params.base_color_texture];
                        
						mat.map = tex;
			
                        const mappingNode = materialData.nodes?.nodes?.find((n) => n.type === "ShaderNodeMapping");
                        
						if (mappingNode?.params?.Scale) {
                            const [sx, sy] = mappingNode.params.Scale;
                            tex.wrapS = tex.wrapT = IMPION.RepeatWrapping;
                            tex.repeat.set(sx, sy);
                        }
                    }
			
                    if (
                        materialData.params.emission_texture &&
                        this.#app.assets.textures.three[materialData.params.emission_texture]
                    ) {
                        mat.emissiveMap = this.#app.assets.textures.three[materialData.params.emission_texture];
                        mat.emissive = new IMPION.Color3d(0xffffff);
                    }
			
                    if (
                        materialData.params.alpha_texture &&
                        this.#app.assets.textures.three[materialData.params.alpha_texture]
                    ) {
                        mat.alphaMap = this.#app.assets.textures.three[materialData.params.alpha_texture];
                        mat.alphaTest = 0.1;
                        mat.depthWrite = true;
                        mat.side = IMPION.DoubleSide;
                        mat.forceSinglePass = true;
                    } else if (materialData.params.alpha_used) {
                        mat.transparent = true;
                        mat.depthWrite = false;
                    }
                }
            }
			
            const instancedMesh = new IMPION.InstancedMesh3d(geo, mat, this.quantity);
            instancedMesh.castShadow = this.castShadow;
            instancedMesh.receiveShadow = this.receiveShadow;
            instancedMesh.frustumCulled = false;

            for (let i = 0; i < this.quantity; i++) {
                tempMatrix.compose(
                    this.characters[i].position,
                    this.characters[i].quaternion,
                    this.characters[i].scale
                );
				
                instancedMesh.setMatrixAt(i, tempMatrix);
            }
			
            instancedMesh.instanceMatrix.needsUpdate = true;

            const actionStartArray = new Float32Array(this.quantity);
            const actionEndArray = new Float32Array(this.quantity);
            const speedArray = new Float32Array(this.quantity);
            const timeOffsetArray = new Float32Array(this.quantity);

            for (let i = 0; i < this.quantity; i++) {
                actionStartArray[i] = this.characters[i].actionStart;
                actionEndArray[i] = this.characters[i].actionEnd;
                speedArray[i] = this.characters[i].speed;
                timeOffsetArray[i] = this.characters[i].timeOffset;
            }

            geo.setAttribute("aActionStart", new IMPION.InstancedBufferAttribute3d(actionStartArray, 1));
            geo.setAttribute("aActionEnd", new IMPION.InstancedBufferAttribute3d(actionEndArray, 1));
            geo.setAttribute("aAnimSpeed", new IMPION.InstancedBufferAttribute3d(speedArray, 1));
            geo.setAttribute("aTimeOffset", new IMPION.InstancedBufferAttribute3d(timeOffsetArray, 1));
			
			//-
			
			mat.onBeforeCompile = (shader) => {
                shader.uniforms.uJointTex = { value: this.textureSat };
                shader.uniforms.uFrameCount = { value: this.jsonSat.frame_count || 1 };
                shader.uniforms.uBoneCount = { value: this.jsonSat.bone_count || 1 };
                shader.uniforms.uPixelsPerBone = { value: this.satPixelsPerBone };
                shader.uniforms.uFPS = { value: this.jsonSat.fps || 30 };
                shader.uniforms.uTime = { value: 0 };

                shader.vertexShader = shader.vertexShader.replace(
                    "#include <common>",
                    `
                    #include <common>

                    attribute vec4 skinIndex;
                    attribute vec4 skinWeight;

                    attribute float aActionStart;
                    attribute float aActionEnd;
                    attribute float aAnimSpeed;
                    attribute float aTimeOffset;
                    `
                );

                shader.vertexShader = shader.vertexShader.replace(
                    "#include <beginnormal_vertex>",
                    `
                    vec3 objectNormal = vec3( normal );
                    `
                );

                shader.vertexShader = shader.vertexShader.replace(
                    "#include <begin_vertex>",
                    `
                    vec3 transformed = vec3( position );
                    `
                );

                shader.vertexShader = shader.vertexShader.replace(
                    "#include <skinning_pars_vertex>",
                    `
                    uniform highp sampler2D uJointTex;
                    uniform float uFrameCount;
                    uniform float uBoneCount;
                    uniform float uPixelsPerBone;
                    uniform float uFPS;
                    uniform float uTime;

                    const mat4 VAT_BASIS_BLENDER_TO_THREE = mat4(
                        vec4( 1.0, 0.0,  0.0, 0.0 ),
                        vec4( 0.0, 0.0, -1.0, 0.0 ),
                        vec4( 0.0, 1.0,  0.0, 0.0 ),
                        vec4( 0.0, 0.0,  0.0, 1.0 )
                    );

                    const mat4 VAT_BASIS_THREE_TO_BLENDER = mat4(
                        vec4( 1.0, 0.0, 0.0, 0.0 ),
                        vec4( 0.0, 0.0, 1.0, 0.0 ),
                        vec4( 0.0,-1.0, 0.0, 0.0 ),
                        vec4( 0.0, 0.0, 0.0, 1.0 )
                    );

                    vec4 readRow4(const in float basePixel, const in float texW, const in float y) {
                        return texture2D(uJointTex, vec2((basePixel + 0.5) / texW, y));
                    }

                    float getInstanceFrame() {
                        float durationFrames = aActionEnd - aActionStart;
                        if (durationFrames <= 0.0) return aActionStart;

                        float localFrame = mod((uTime + aTimeOffset) * uFPS * aAnimSpeed, durationFrames);
                        return aActionStart + localFrame;
                    }

                    mat4 getBoneMatrixVAT(const in float i, const in float frame) {
                        float base = i * uPixelsPerBone;
                        float y = 1.0 - ((floor(frame) + 0.5) / uFrameCount);
                        float texW = uBoneCount * uPixelsPerBone;

                        vec4 r0 = readRow4(base + 0.0, texW, y);
                        vec4 r1 = readRow4(base + 1.0, texW, y);
                        vec4 r2 = readRow4(base + 2.0, texW, y);

                        mat4 blenderMatrix = mat4(
                            vec4(r0.x, r1.x, r2.x, 0.0),
                            vec4(r0.y, r1.y, r2.y, 0.0),
                            vec4(r0.z, r1.z, r2.z, 0.0),
                            vec4(r0.w, r1.w, r2.w, 1.0)
                        );

                        return VAT_BASIS_BLENDER_TO_THREE * blenderMatrix * VAT_BASIS_THREE_TO_BLENDER;
                    }
                    `
                );

                shader.vertexShader = shader.vertexShader.replace(
                    "#include <skinning_vertex>",
                    `
					float frame = getInstanceFrame();

					vec4 skinVertex = vec4(transformed, 1.0);
					vec4 skinned = vec4(0.0);
					
					mat4 m0 = getBoneMatrixVAT(skinIndex.x, frame);
					mat4 m1 = getBoneMatrixVAT(skinIndex.y, frame);

					skinned += m0 * skinVertex * skinWeight.x;
					skinned += m1 * skinVertex * skinWeight.y;

					transformed = skinned.xyz;
                    `
                );

                mat.userData.shader = shader;
            };	
			
			//-
			
			mat.userData.isSAT = true;
			mat.skinning = false;			
			mat.needsUpdate = true;

            this.instancedMeshes.push( instancedMesh );
			
            this.add( instancedMesh );
        });

        this.isReady = true;
    }

    normalizeBoneName(name) {
        return String(name).replace(/[^A-Za-z0-9_]/g, "");
    }

    unpackFloatRGBA8Bytes(r, g, b, a) {
        if (!this._vatFloatBuffer) {
            this._vatFloatBuffer = new ArrayBuffer(4);
            this._vatFloatView = new DataView(this._vatFloatBuffer);
        }

        this._vatFloatView.setUint8(0, r);
        this._vatFloatView.setUint8(1, g);
        this._vatFloatView.setUint8(2, b);
        this._vatFloatView.setUint8(3, a);

        return this._vatFloatView.getFloat32(0, false);
    }

    async createPredecodedsatTexture(textureSat, sat) {
        const image = textureSat?.image;

        if (!image) {
            console.warn("[SAT] Source SAT image is not ready");
            return null;
        }

        const imageUrl = image.currentSrc || image.src;
        if (!imageUrl) {
            console.warn("[SAT] Source SAT image url is missing");
            return null;
        }

        const response = await fetch(imageUrl);
        if (!response.ok) {
            console.warn("[SAT] Failed to fetch SAT png:", response.status);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const png = this.decodePNG(new Uint8Array(arrayBuffer));

        if (!png) {
            console.warn("[SAT] PNG decode failed");
            return null;
        }

        const packedPixelsPerBone = sat.pixels_per_bone || 12;
        const boneCount = sat.bone_count || 1;
        const frameCount = sat.frame_count || png.height || 1;

        if (packedPixelsPerBone % 4 !== 0) {
            console.warn("[SAT] pixels_per_bone must be divisible by 4");
            return null;
        }

        const pixelsPerBone = packedPixelsPerBone / 4;
        const outWidth = boneCount * pixelsPerBone;
        const outHeight = frameCount;

        if (png.width !== boneCount * packedPixelsPerBone) {
            console.warn("[SAT] PNG width mismatch", {
                pngWidth: png.width,
                expectedWidth: boneCount * packedPixelsPerBone
            });
        }

        if (png.height !== frameCount) {
            console.warn("[SAT] PNG height mismatch", {
                pngHeight: png.height,
                expectedHeight: frameCount
            });
        }

        const rgba = png.data;
        const out = new Float32Array(outWidth * outHeight * 4);

        for (let y = 0; y < outHeight; y++) {
            for (let boneIndex = 0; boneIndex < boneCount; boneIndex++) {
                const packedBaseX = boneIndex * packedPixelsPerBone;
                const outBaseX = boneIndex * pixelsPerBone;

                for (let row = 0; row < pixelsPerBone; row++) {
                    const dstPixelIndex = ((y * outWidth) + (outBaseX + row)) * 4;

                    for (let c = 0; c < 4; c++) {
                        const packedX = packedBaseX + row * 4 + c;
                        const srcIndex = (y * png.width + packedX) * 4;

                        out[dstPixelIndex + c] = this.unpackFloatRGBA8Bytes(
                            rgba[srcIndex + 0],
                            rgba[srcIndex + 1],
                            rgba[srcIndex + 2],
                            rgba[srcIndex + 3]
                        );
                    }
                }
            }
        }

        const texture = new IMPION.DataTexture3d(
            out,
            outWidth,
            outHeight,
            IMPION.RGBAFormat,
            IMPION.FloatType
        );

        texture.minFilter = IMPION.NearestFilter;
        texture.magFilter = IMPION.NearestFilter;
        texture.wrapS = IMPION.ClampToEdgeWrapping;
        texture.wrapT = IMPION.ClampToEdgeWrapping;
        texture.generateMipmaps = false;
        texture.flipY = false;
        texture.colorSpace = IMPION.NoColorSpace;
        texture.needsUpdate = true;

        return {
            texture,
            pixelsPerBone
        };
    }

    decodePNG(bytes) {
        const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

        for (let i = 0; i < SIGNATURE.length; i++) {
            if (bytes[i] !== SIGNATURE[i]) {
                console.warn("[SAT] Invalid PNG signature");
                return null;
            }
        }

        let offset = 8;
        let width = 0;
        let height = 0;
        let bitDepth = 0;
        let colorType = 0;
        let compression = 0;
        let filterMethod = 0;
        let interlace = 0;
        const idatChunks = [];

        while (offset < bytes.length) {
            const length = this.readUint32BE(bytes, offset);
            offset += 4;

            const type =
                String.fromCharCode(bytes[offset + 0]) +
                String.fromCharCode(bytes[offset + 1]) +
                String.fromCharCode(bytes[offset + 2]) +
                String.fromCharCode(bytes[offset + 3]);
            offset += 4;

            const chunkData = bytes.subarray(offset, offset + length);
            offset += length;

            offset += 4;

            if (type === "IHDR") {
                width = this.readUint32BE(chunkData, 0);
                height = this.readUint32BE(chunkData, 4);
                bitDepth = chunkData[8];
                colorType = chunkData[9];
                compression = chunkData[10];
                filterMethod = chunkData[11];
                interlace = chunkData[12];
            } else if (type === "IDAT") {
                idatChunks.push(chunkData);
            } else if (type === "IEND") {
                break;
            }
        }

        if (!width || !height) {
            console.warn("[SAT] PNG missing IHDR");
            return null;
        }

        if (bitDepth !== 8) {
            console.warn("[SAT] Unsupported PNG bit depth:", bitDepth);
            return null;
        }

        if (compression !== 0 || filterMethod !== 0) {
            console.warn("[SAT] Unsupported PNG compression/filter method");
            return null;
        }

        if (interlace !== 0) {
            console.warn("[SAT] Interlaced PNG is not supported");
            return null;
        }

        const channels = this.getPNGChannels(colorType);
        if (!channels) {
            console.warn("[SAT] Unsupported PNG color type:", colorType);
            return null;
        }

        let totalSize = 0;
        for (const chunk of idatChunks) totalSize += chunk.length;

        const compressed = new Uint8Array(totalSize);
        let writeOffset = 0;
        for (const chunk of idatChunks) {
            compressed.set(chunk, writeOffset);
            writeOffset += chunk.length;
        }

        const inflated = IMPION.unzlibSync(compressed);
        const stride = width * channels;
        const expectedSize = height * (1 + stride);

        if (inflated.length < expectedSize) {
            console.warn("[SAT] Inflated PNG data is too small");
            return null;
        }

        const raw = new Uint8Array(height * stride);
        let src = 0;

        for (let y = 0; y < height; y++) {
            const filterType = inflated[src++];
            const rowStart = y * stride;
            const prevRowStart = (y - 1) * stride;

            for (let x = 0; x < stride; x++) {
                const rawByte = inflated[src++];
                const left = x >= channels ? raw[rowStart + x - channels] : 0;
                const up = y > 0 ? raw[prevRowStart + x] : 0;
                const upLeft = (y > 0 && x >= channels) ? raw[prevRowStart + x - channels] : 0;

                let value = 0;

                if (filterType === 0) {
                    value = rawByte;
                } else if (filterType === 1) {
                    value = (rawByte + left) & 255;
                } else if (filterType === 2) {
                    value = (rawByte + up) & 255;
                } else if (filterType === 3) {
                    value = (rawByte + Math.floor((left + up) * 0.5)) & 255;
                } else if (filterType === 4) {
                    value = (rawByte + this.paethPredictor(left, up, upLeft)) & 255;
                } else {
                    console.warn("[SAT] Unsupported PNG filter:", filterType);
                    return null;
                }

                raw[rowStart + x] = value;
            }
        }

        const rgba = new Uint8Array(width * height * 4);

        if (colorType === 6) {
            rgba.set(raw);
        } else if (colorType === 2) {
            let si = 0;
            let di = 0;
            while (si < raw.length) {
                rgba[di + 0] = raw[si + 0];
                rgba[di + 1] = raw[si + 1];
                rgba[di + 2] = raw[si + 2];
                rgba[di + 3] = 255;
                si += 3;
                di += 4;
            }
        } else {
            console.warn("[SAT] PNG decoded color type is not converted:", colorType);
            return null;
        }

        return {
            width,
            height,
            data: rgba
        };
    }

    getPNGChannels(colorType) {
        if (colorType === 2) return 3;
        if (colorType === 6) return 4;
        return 0;
    }

    paethPredictor(a, b, c) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);

        if (pa <= pb && pa <= pc) return a;
        if (pb <= pc) return b;
        return c;
    }

    readUint32BE(bytes, offset) {
        return (
            (bytes[offset + 0] << 24) |
            (bytes[offset + 1] << 16) |
            (bytes[offset + 2] << 8) |
            (bytes[offset + 3] << 0)
        ) >>> 0;
    }
	
	//-
	
	limitSkinInfluences(geometry, maxInfluences = 2) {
		const skinIndex = geometry.attributes.skinIndex;
		const skinWeight = geometry.attributes.skinWeight;

		if (!skinIndex || !skinWeight) return;

		const indexArray = skinIndex.array;
		const weightArray = skinWeight.array;

		for (let i = 0; i < skinWeight.count; i++) {
			const base = i * 4;

			const items = [
				{ index: indexArray[base + 0], weight: weightArray[base + 0] },
				{ index: indexArray[base + 1], weight: weightArray[base + 1] },
				{ index: indexArray[base + 2], weight: weightArray[base + 2] },
				{ index: indexArray[base + 3], weight: weightArray[base + 3] }
			];

			items.sort((a, b) => b.weight - a.weight);

			for (let j = maxInfluences; j < 4; j++) {
				items[j].weight = 0;
				items[j].index = 0;
			}

			let sum = 0;
			for (let j = 0; j < maxInfluences; j++) {
				sum += items[j].weight;
			}

			if (sum > 0) {
				for (let j = 0; j < maxInfluences; j++) {
					items[j].weight /= sum;
				}
			}

			for (let j = 0; j < 4; j++) {
				indexArray[base + j] = items[j].index;
				weightArray[base + j] = items[j].weight;
			}
		}

		skinIndex.needsUpdate = true;
		skinWeight.needsUpdate = true;
	}
	
	//------------------------------------------------------------------------

	#processMixer( character ){
		const actions = this.jsonSat.actions;
			
		for(let action of actions){
			this.action[ action.name ] = action;
			
			//-
			
			let actionName = action.name.toLowerCase();
			let actionRealName = action.name;
			
			character.action[ actionRealName ] = {};
			character.action[ actionRealName ].name =  actionRealName;
			character.action[ actionRealName ].speed = 1;
			character.action[ actionRealName ].speedK = 1 + 0.1 - 0.1*2*Math.random();
			character.action[ actionRealName ].clampWhenFinished = true;	
			
			let test = false;
			
			for(let key in character.actionPool){
				if(actionName.indexOf(key) != -1){
					character.actionPool[key].push( actionRealName );
					character.action[ actionRealName ].loop = false;
					
					if(key == "walk" || key == "run"){
						character.action[ actionRealName ].loop = true;
					}
					
					test = true;
				}
			}
			
			if(!test){
				character.actionPool["other"].push( actionRealName );
				character.action[ actionRealName ].loop = false;
			}
		}	
	}

	//------------------------------------------------------------------------
	
	commandToPoints( finder, points, zone = 0){
		if(this.isAction["die"]){	return false;	}

		//-

		let path = [];
		let positionFrom = this.position;
		
		while(points.length > 0){
			let pathPart = finder.findPath(positionFrom, points[0], zone);
			if(pathPart && pathPart.length > 0){
				path.push(...pathPart);
			}
			
			positionFrom = points[0];
			points.shift();
		}
		
		if( path.length > 0 ){
			this.navigationPath = path;
			
			if(this.actionPool["run"].length > 0){
				this.setActionPool("run", 0, Math.random());
			}else{
				this.setActionPool("walk", 0, Math.random());
			}
		}
	}
	
	setActionPool(action, weight = 0, seek = 0){
		if(this.actionPool[ action ] && this.actionPool[ action ].length > 0){		
			Math.mixArray( this.actionPool[ action ] );			
			this.setAction( this.actionPool[ action ][0], weight, seek );	
		}else{
			this.setAction(action, weight, seek );
		}
	}
	
	setAction(action, weight = 0, seek = 0){

		this.setActionBoolean( "other" );
		
		for(let key in this.actionPool){
			for(let i = 0; i<this.actionPool[key].length; i++){
				if(this.actionPool[key][i] == action){
					this.setActionBoolean( key );
				}
			}
		}
				
		//-
		
		if(action.toLowerCase().indexOf("idle") != -1 && this.physicsCharacter){
			this.physicsObject.velocity.x = 0;
			this.physicsObject.velocity.z = 0;
		}
		
		//-
		
		this.actionCurrent = action;
		
		//-
		
		const actionData = this.jsonSat.actions?.find((a) => a.name === action);
		if (!actionData) {
			console.warn("[SAT] action not found:", action);
			return;
		}

		this.actionCurrent = action;
		this.actionStart = actionData.start;
		this.actionEnd = actionData.end;

		//for (const im of this.instancedMeshes) {
			const geo = this.instancedMeshes[0].geometry;

			geo.attributes.aActionStart.setX(this.index, actionData.start);
			geo.attributes.aActionEnd.setX(this.index, actionData.end);
			geo.attributes.aAnimSpeed.setX(this.index, this.action[action].speed);
			geo.attributes.aTimeOffset.setX(this.index, seek);

			geo.attributes.aActionStart.needsUpdate = true;
			geo.attributes.aActionEnd.needsUpdate = true;
			geo.attributes.aAnimSpeed.needsUpdate = true;
			geo.attributes.aTimeOffset.needsUpdate = true;
		//}
	}
	
	setActionBoolean( action ){
		for(let key in this.isAction){
			this.isAction[key] = false;
			if(key == action){
				this.isAction[key] = true;
			}
		}
		
		for(let key in this.actionPool){
			for(let i = 0; i<this.actionPool[key].length; i++){
				if(this.actionPool[key][i].toLowerCase() == action.toLowerCase()){
					this.isAction[key] = true;
				}
			}
		}
		
		this.isAction[action] = true;
	}
	
	//------------------------------------------------------------------------
	
	#updateTime(){
		for (const im of this.instancedMeshes) {
			this.#clock.update();
			
			const shader = im.material?.userData?.shader;
            if (shader?.uniforms?.uTime) {
                shader.uniforms.uTime.value = this.#clock.getElapsed() * this.#app.timeScale;
            }
        }
	}
	
	#processNavigationPath(){
		for (let character of this.characters) {
			if(character.isAI && character.autoMove){
				if(character.isAction["run"] || character.isAction["walk"]){
					if(character.navigationPath.length > 0){
						let pos = character.navigationPath[0];
						let d = Math.hypot(
							(pos.x - character.position.x),
							(pos.z - character.position.z)
						);
						
						if(d < (character.wx*0.5 + character.forceRun*0.05)){
							character.navigationPath.splice(0, 1);
						}else{
							let a = Math.atan2(
								(pos.x - character.position.x),
								(pos.z - character.position.z)
							);

							character.angularVelocity = a;
						}				
					}else{
						if(!character.isAction["die"]){					
							character.setActionPool(character.actionStandard, 0, 0);
						}
					}
				}
			}
		}
	}
	
	#updateLocation(){
		for (let character of this.characters) {
			if(!character.physicsCharacter){	
				
				//- rotation 
				
				let a = (character.angularVelocity + character.angularUser);
				
				while(a - character.angularVelocityCurrent > Math.PI){ a -= 2*Math.PI; }
				while(character.angularVelocityCurrent - a > Math.PI){ a += 2*Math.PI; }
				
				character.angularVelocityCurrent = a - character.angularVelocityRK * (a - character.angularVelocityCurrent);
					
				if(character.autoRotation){
					character.angularLookCurrent = character.angularVelocityCurrent;
				}else{					
					a = (character.angularLook + character.angularUser);
					
					while(a - character.angularLookCurrent > Math.PI){ a -= 2*Math.PI; }
					while(character.angularLookCurrent - a > Math.PI){ a += 2*Math.PI; }
					
					character.angularLookCurrent = a - character.angularLookRK * (a - character.angularLookCurrent);				
				}
			
				character.rotation.y = character.angularLookCurrent;
			
				if(character.autoMove){
					//- velocity

					if(character.isAction["walk"]){		
						character.positionTo.x += character.forceWalk * 0.02 * Math.sin(character.angularVelocityCurrent) * this.#app.timeScale;
						character.positionTo.z += character.forceWalk * 0.02 * Math.cos(character.angularVelocityCurrent) * this.#app.timeScale;
					}else if(character.isAction["run"]){	
						character.positionTo.x += character.forceRun * 0.02 * Math.sin(character.angularVelocityCurrent) * this.#app.timeScale;
						character.positionTo.z += character.forceRun * 0.02 * Math.cos(character.angularVelocityCurrent) * this.#app.timeScale;
					}
					
					//- position
						
					character.position.x = character.positionTo.x - 0.65*(character.positionTo.x - character.position.x);	
					character.position.y = character.positionTo.y - 0.65*(character.positionTo.y - character.position.y);	
					character.position.z = character.positionTo.z - 0.65*(character.positionTo.z - character.position.z);

					//-
					
					if(this.heightMap){
						const y = this.heightMap.getHeight(character.position.x, character.position.z);
						
						character.position.y = y;
						character.positionTo.y = y;
					}
				}
			}
		}
	}
	
	#processStickMesh(){
		for (let character of this.characters) {
			if(character.stickMeshGround){
					
				this.#stickPoint.position.copy( character.position );
				this.#stickPoint.position.y += 1.8;

				this.#stickRaycaster.set(
					this.#stickPoint.position,
					this.#stickDirection
				);
				
				this.#stickIntersects = this.#stickRaycaster.intersectObject(character.stickMeshGround, false);
				if(this.#stickIntersects.length > 0){			
					character.positionTo.y = character.position.y = this.#stickIntersects[0].point.y;
				}		
				
			}
		}
	}
	
	#sync(){
		for (let character of this.characters) {	
			if (character.index < 0 || character.index >= this.quantity){ return; }
			if (!this.isReady) return;

			let tempMatrix = new IMPION.Matrix4();
			
			tempMatrix.compose(
				character.position,
				character.quaternion,
				character.scale
			);

			this.instancedMeshes[0].setMatrixAt(character.index, tempMatrix);
			
			//-
			
			let scale = new IMPION.Vector3();
			
			if (this.shadowIM) {
				scale.set(2, 2, 2);
				
				const shadowQuat = new IMPION.Quaternion3d().setFromEuler(
					new IMPION.Euler3d(-Math.PI / 2, 0, 0)
				);

				tempMatrix.compose(
					new IMPION.Vector3(
						character.position.x,
						character.position.y + 0.03,
						character.position.z
					),
					shadowQuat,
					scale
				);

				this.shadowIM.setMatrixAt(character.index, tempMatrix);
			}
		}
		
		this.instancedMeshes[0].instanceMatrix.needsUpdate = true;
		if(this.shadowIM){
			this.shadowIM.instanceMatrix.needsUpdate = true;
		}
	}
	
	//------------------------------------------------------------------------
	
    enterframe( timeDelta ) {
        if (!this.isReady){ return; }
		
		this.#updateTime();
		this.#processNavigationPath();
		this.#updateLocation();
		this.#processStickMesh();		
		this.#sync();		
        
    }
	
	
}

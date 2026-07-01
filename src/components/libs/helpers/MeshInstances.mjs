import * as IMPION from "#impion";

export default class MeshInstances extends IMPION.ComponentEmpty {

    clock = new IMPION.Timer3d();

    // items: [
    //     { name: "Tree", wind: true },
    //     { name: "Rock", wind: false }
    // ]
    //
    // Также можно коротко:
    // items: ["Tree", "Bush"]
    // Тогда wind будет true по умолчанию.
	
    constructor(
        {
            scene,

            items,

            windStrength = 0.10,
            windSpeed = 1.0,
            windFrequency = 1.5,

            frustumCulled = true
        }
    ) {
        super();

        this.scene = scene;

        this.group = new IMPION.Group3d();
        this.group.name = "TreeInstances";

        this.instancedMeshes = [];

        this.windStrength = windStrength;
        this.windSpeed = windSpeed;
        this.windFrequency = windFrequency;

        this.frustumCulled = frustumCulled;

        this._items = this._normalizeItems(items);

        this._build();
    }

    _normalizeItems(items) {
        if (!Array.isArray(items)) {
            throw new Error("[MeshInstances] items must be array.");
        }

        return items.map((item) => {
            if (typeof item === "string") {
                return {
                    name: item,
                    wind: true
                };
            }

            if (!item || typeof item.name !== "string") {
                throw new Error("[MeshInstances] item.name must be string.");
            }

            return {
                name: item.name,
                wind: item.wind !== false
            };
        });
    }

    _build() {
        this.scene.updateMatrixWorld(true);

        const buckets = this._findMeshesByItems();

        for (const bucket of buckets) {
            if (bucket.meshes.length === 0) continue;

            const sourceMesh = bucket.meshes[0];

            const instancedMesh = this._createInstancedMeshFromBucket({
                bucket,
                sourceMesh,
                useWind: bucket.wind
            });

            instancedMesh.castShadow = true;
            instancedMesh.receiveShadow = true;

            this.group.add(instancedMesh);
            this.instancedMeshes.push(instancedMesh);

            for (const mesh of bucket.meshes) {
                this._removeMesh(mesh);
            }
        }

        this.scene.add(this.group);
        this.scene.updateMatrixWorld(true);
    }

    _findMeshesByItems() {
        const buckets = this._items.map((item) => {
            return {
                name: item.name,
                wind: item.wind,
                meshes: []
            };
        });

        const usedMeshes = new Set();

        this.scene.traverse((child) => {
            if (!child.isMesh) return;
            if (child.isInstancedMesh) return;

            for (const bucket of buckets) {
                if (usedMeshes.has(child)) continue;

                if (child.name.includes(bucket.name)) {
                    bucket.meshes.push(child);
                    usedMeshes.add(child);
                    break;
                }
            }
        });

        return buckets;
    }

    _createInstancedMeshFromBucket({
        bucket,
        sourceMesh,
        useWind
    }) {
        const count = bucket.meshes.length;

        sourceMesh.updateMatrixWorld(true);

        const geometry = sourceMesh.geometry.clone();

        if (useWind) {
            this._addWindOffsetAttribute(geometry, count);
            this._addWindMaskAttribute(geometry);
        }

        const material = useWind
            ? this._createWindMaterial(sourceMesh.material)
            : this._cloneMaterial(sourceMesh.material);

        const instancedMesh = new IMPION.InstancedMesh3d(
            geometry,
            material,
            count
        );

        instancedMesh.name = useWind
            ? `${bucket.name}_Instanced_Wind`
            : `${bucket.name}_Instanced_Static`;

        instancedMesh.frustumCulled = this.frustumCulled;

        for (let i = 0; i < count; i++) {
            const mesh = bucket.meshes[i];

            mesh.updateMatrixWorld(true);

            instancedMesh.setMatrixAt(i, mesh.matrixWorld);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;

        instancedMesh.computeBoundingBox();
        instancedMesh.computeBoundingSphere();

        return instancedMesh;
    }

    _cloneMaterial(sourceMaterial) {
        if (Array.isArray(sourceMaterial)) {
            return sourceMaterial[0].clone();
        }

        return sourceMaterial.clone();
    }

    _addWindOffsetAttribute(geometry, count) {
        const windOffset = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            windOffset[i] = Math.random() * Math.PI * 2.0;
        }

        geometry.setAttribute(
            "aWindOffset",
            new IMPION.InstancedBufferAttribute3d(windOffset, 1)
        );
    }

    _addWindMaskAttribute(geometry) {
        const colorAttribute = geometry.attributes.color;

        const vertexCount = geometry.attributes.position.count;
        const windMask = new Float32Array(vertexCount);

        if (colorAttribute) {
            for (let i = 0; i < vertexCount; i++) {
                windMask[i] = colorAttribute.getY(i); // green channel
            }
        } else {
            console.warn("[MeshInstances] geometry has no vertex color attribute. aWindMask will be 0.");
        }

        geometry.setAttribute(
            "aWindMask",
            new IMPION.BufferAttribute3d(windMask, 1)
        );
    }

    _createWindMaterial(sourceMaterial) {
        const material = this._cloneMaterial(sourceMaterial);

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uWindStrength = { value: this.windStrength };
            shader.uniforms.uWindSpeed = { value: this.windSpeed };
            shader.uniforms.uWindFrequency = { value: this.windFrequency };

            material.userData.shader = shader;

            shader.vertexShader = shader.vertexShader.replace(
                "#include <common>",
                `
                #include <common>

                uniform float uTime;
                uniform float uWindStrength;
                uniform float uWindSpeed;
                uniform float uWindFrequency;

                attribute float aWindOffset;
                attribute float aWindMask;
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                "#include <begin_vertex>",
                `
                #include <begin_vertex>

                float wind = sin(uTime * uWindSpeed +aWindOffset +position.y * uWindFrequency);

                transformed.x += wind * uWindStrength * aWindMask;
                `
            );
        };

        return material;
    }

    _removeMesh(mesh) {
        if (mesh.parent) {
            mesh.parent.remove(mesh);
        }
    }

    dispose() {
        for (const mesh of this.instancedMeshes) {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }

            mesh.geometry.dispose();

            if (Array.isArray(mesh.material)) {
                for (const material of mesh.material) {
                    material.dispose();
                }
            } else {
                mesh.material.dispose();
            }
        }

        this.instancedMeshes.length = 0;

        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }

        this.scene.updateMatrixWorld(true);
    }

    enterframe = (timeDelta) => {
        this.clock.update();

        for (const mesh of this.instancedMeshes) {
            const material = mesh.material;

            if (!material || !material.userData.shader) continue;

            const shader = material.userData.shader;

            shader.uniforms.uTime.value = this.clock.getElapsed();

            // Если нужно менять параметры ветра в рантайме — можно раскомментировать:
            // shader.uniforms.uWindStrength.value = this.windStrength;
            // shader.uniforms.uWindSpeed.value = this.windSpeed;
            // shader.uniforms.uWindFrequency.value = this.windFrequency;
        }
    };
}
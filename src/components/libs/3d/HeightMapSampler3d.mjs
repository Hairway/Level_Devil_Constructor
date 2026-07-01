import * as IMPION from "#impion";

export default class HeightMapSampler3d {

    constructor({
        renderer,
        mesh,
        size = 512,
        bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
        minY = -5,
        maxY = 10
    }) {

        this.renderer = renderer;
        this.mesh = mesh;
        this.size = size;
        this.bounds = bounds;
        this.minY = minY;
        this.maxY = maxY;

        this.data = null;

        this.#bake();
    }

    // ------------------------

    #bake() {

        const scene = new IMPION.Scene3d();
        const cam = new IMPION.OrthographicCamera3d(
            this.bounds.minX,
            this.bounds.maxX,
            this.bounds.maxZ,
            this.bounds.minZ,
            -100,
            100
        );

        cam.position.set(0, 10, 0);
        cam.lookAt(0, 0, 0);

        const mat = new IMPION.ShaderMaterial3d({
            vertexShader: `
                varying float vHeight;
                void main() {
                    vHeight = position.y;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `,
            fragmentShader: `
                varying float vHeight;
                uniform float minY;
                uniform float maxY;

                void main() {
                    float h = (vHeight - minY) / (maxY - minY);
                    gl_FragColor = vec4(h, h, h, 1.0);
                }
            `,
            uniforms: {
                minY: { value: this.minY },
                maxY: { value: this.maxY }
            }
        });

        const clone = this.mesh.clone();
        clone.material = mat;
        scene.add(clone);

        const rt = new IMPION.WebGLRenderTarget3d(this.size, this.size);

        this.renderer.setRenderTarget(rt);
        this.renderer.render(scene, cam);
        this.renderer.setRenderTarget(null);

        const pixels = new Uint8Array(this.size * this.size * 4);

        this.renderer.readRenderTargetPixels(
            rt,
            0,
            0,
            this.size,
            this.size,
            pixels
        );

        this.data = pixels;
    }

    // ------------------------

    getHeight(x, z) {

        const { minX, maxX, minZ, maxZ } = this.bounds;

        const u = (x - minX) / (maxX - minX);
        const v = (z - minZ) / (maxZ - minZ);

        const px = Math.floor(u * this.size);
        const py = Math.floor((1 - v) * this.size);

        const index = (py * this.size + px) * 4;

        const value = this.data[index] / 255;

        return this.minY + value * (this.maxY - this.minY);
    }
}
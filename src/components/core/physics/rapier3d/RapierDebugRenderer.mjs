import * as THREE from "three";

export default class RapierDebugRenderer {
  constructor(scene, world) {
    this.world = world;
   
    this.mesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ vertexColors: true })
    );
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.enabled = true;
  }

  update() {
    if (!this.enabled) {
      this.mesh.visible = false;
      return;
    }
    
    const { vertices, colors } = this.world.debugRender();
   
    this.mesh.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3)
    );
    this.mesh.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 4)
    );
    this.mesh.visible = true;
  }
}

import type { BufferGeometry, Material } from 'three';

// Owns each GPU asset once, even when many meshes share it. No physics dependencies.
export class SceneAssets {
  private geometries = new Set<BufferGeometry>();
  private materials = new Set<Material>();
  private created = { geometries: 0, materials: 0 };
  private released = { geometries: 0, materials: 0 };
  private closed = false;

  geometry<T extends BufferGeometry>(resource: T): T {
    if (this.closed) { resource.dispose(); throw new Error('Scene assets already released'); }
    if (!this.geometries.has(resource)) { this.geometries.add(resource); this.created.geometries++; }
    return resource;
  }
  material<T extends Material>(resource: T): T {
    if (this.closed) { resource.dispose(); throw new Error('Scene assets already released'); }
    if (!this.materials.has(resource)) { this.materials.add(resource); this.created.materials++; }
    return resource;
  }
  get info() {
    return {
      created: { ...this.created }, released: { ...this.released },
      live: { geometries: this.geometries.size, materials: this.materials.size }, closed: this.closed,
    };
  }
  dispose() {
    this.closed = true;
    for (const geometry of this.geometries) {
      geometry.dispose(); this.geometries.delete(geometry); this.released.geometries++;
    }
    for (const material of this.materials) {
      material.dispose(); this.materials.delete(material); this.released.materials++;
    }
    return this.info;
  }
}

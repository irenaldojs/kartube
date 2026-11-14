import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import type { SceneAssets } from './assets.ts';

export const KART_MODEL_URL = new URL('../../../assets/karts/Cart.fbx', import.meta.url).href;
let source: Promise<ArrayBuffer> | undefined;
export function loadKartSource() {
  source ??= fetch(KART_MODEL_URL).then(response => {
    if (!response.ok) throw new Error(`Não foi possível carregar Cart.fbx (${response.status}).`);
    return response.arrayBuffer();
  }).catch((error: unknown) => { source = undefined; throw error; });
  return source;
}

export function createKartModel(data: ArrayBuffer, assets: SceneAssets) {
  const model = new FBXLoader().parse(data, '');
  const extras: THREE.Object3D[] = [];
  model.traverse(object => {
    if (object instanceof THREE.Camera || object instanceof THREE.Light) extras.push(object);
    if (object instanceof THREE.Mesh) {
      assets.geometry(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) assets.material(material);
    }
  });
  extras.forEach(object => object.removeFromParent());
  // Source faces +Z; the controller and camera use -Z as forward.
  model.rotation.y += Math.PI;
  const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
  const scale = Math.min(1.8 / size.x, 2.8 / size.z);
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Cart.fbx não contém dimensões válidas.');
  const center = bounds.getCenter(new THREE.Vector3());
  const normalized = new THREE.Group(); normalized.add(model); normalized.scale.setScalar(scale);
  model.position.x -= center.x; model.position.z -= center.z;
  model.position.y -= bounds.min.y + 0.35 / scale;
  return { object: normalized, dimensions: size.multiplyScalar(scale).toArray() };
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Box3, Camera, Light, Vector3 } from 'three';
import { SceneAssets } from '../apps/web/src/assets.ts';
import { createKartModel } from '../apps/web/src/kart-model.ts';

test('Cart.fbx fits the collider footprint and disposes all imported geometry/materials', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  // The FBX contains an authoring camera; the loader requires viewport dimensions when parsing it.
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerWidth: 1280, innerHeight: 720 } });
  const assets = new SceneAssets();
  try {
    const bytes = readFileSync(new URL('../assets/karts/Cart.fbx', import.meta.url));
    const loaded = createKartModel(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), assets);
    const bounds = new Box3().setFromObject(loaded.object), center = bounds.getCenter(new Vector3());
    assert.ok(Math.abs(center.x) < 1e-6 && Math.abs(center.z) < 1e-6);
    assert.ok(Math.abs(bounds.min.y + 0.35) < 1e-6);
    assert.ok(loaded.dimensions[0]! <= 1.801 && loaded.dimensions[2]! <= 2.801);
    loaded.object.traverse(object => { assert.equal(object instanceof Camera || object instanceof Light, false); });
    assert.ok(assets.info.live.geometries > 0); assert.ok(assets.info.live.materials > 0);
    assets.dispose(); assert.deepEqual(assets.info.live, { geometries: 0, materials: 0 });
    assert.deepEqual(assets.info.created, assets.info.released);
  } finally {
    assets.dispose();
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

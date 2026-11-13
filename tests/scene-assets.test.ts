import assert from 'node:assert/strict';
import test from 'node:test';
import { BoxGeometry, MeshBasicMaterial } from 'three';
import { SceneAssets } from '../apps/web/src/assets.ts';

test('shared scene assets are released once and repeated disposal is safe', () => {
  const scope = new SceneAssets(), geometry = new BoxGeometry(), material = new MeshBasicMaterial();
  let geometryReleases = 0, materialReleases = 0;
  geometry.addEventListener('dispose', () => { geometryReleases++; });
  material.addEventListener('dispose', () => { materialReleases++; });
  for (let i = 0; i < 20; i++) { scope.geometry(geometry); scope.material(material); }
  assert.deepEqual(scope.info.live, { geometries: 1, materials: 1 });
  scope.dispose(); scope.dispose();
  assert.deepEqual(scope.info.live, { geometries: 0, materials: 0 });
  assert.deepEqual(scope.info.created, scope.info.released);
  assert.equal(geometryReleases, 1); assert.equal(materialReleases, 1);
});
test('late assets cannot attach to a released scene and are disposed immediately', () => {
  const scope = new SceneAssets(); scope.dispose();
  const geometry = new BoxGeometry(); let released = false;
  geometry.addEventListener('dispose', () => { released = true; });
  assert.throws(() => scope.geometry(geometry), /already released/);
  assert.equal(released, true);
  assert.equal(scope.info.live.geometries, 0);
});

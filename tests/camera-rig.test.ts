import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera } from 'three';
import { createCameraRig } from '../apps/web/src/camera.ts';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
test('chase camera rotates its trailing position and look-ahead with the kart heading', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const rig = createCameraRig(new PerspectiveCamera(), 'track', 'chase');
    rig.update({ x: 12, y: 0.35, z: -4, yaw }, 0);
    const { position, target } = rig.info;
    near(position[0]!, 12 + Math.sin(yaw) * 9);
    near(position[2]!, -4 + Math.cos(yaw) * 9);
    near(target[0]!, 12 - Math.sin(yaw) * 2);
    near(target[2]!, -4 - Math.cos(yaw) * 2);
    near(position[1]!, 5.35);
  }
});
test('camera smoothing converges consistently at 30/60 Hz and mode changes reframe immediately', () => {
  function simulate(hz: number) {
    const rig = createCameraRig(new PerspectiveCamera(), 'track', 'chase');
    rig.update({ x: 0, y: 3, z: 0 }, 0);
    for (let i = 0; i < hz; i++) rig.update({ x: 8, y: 0.35, z: -5 }, 1 / hz);
    return rig;
  }
  const slow = simulate(30), fast = simulate(60);
  slow.info.position.forEach((value, index) => near(value, fast.info.position[index]!));
  assert.ok(Math.abs(slow.info.position[0]! - 8) < 0.01);
  slow.setMode('overview'); slow.update({ x: 8, y: 0.35, z: -5 }, 0);
  assert.deepEqual(slow.info.position, [48, 58, 62]);
  slow.setMode('chase'); slow.update({ x: 8, y: 0.35, z: -5 }, 0);
  slow.info.position.forEach((value, index) => near(value, [8, 5.35, 4][index]!));
});

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
  assert.deepEqual(slow.info.position, [65, 78, 84]);
  slow.setMode('chase'); slow.update({ x: 8, y: 0.35, z: -5 }, 0);
  slow.info.position.forEach((value, index) => near(value, [8, 5.35, 4][index]!));
});

test('arcade camera anticipates turns, banks gently, widens for speed/boost and frames jumps', () => {
  const camera = new PerspectiveCamera(45), rig = createCameraRig(camera, 'track', 'chase');
  const pose = { x: 0, y: 0.35, z: 0, yaw: 0 };
  rig.update(pose, 0, { speed: 0, grounded: true });
  near(rig.info.fov, 45);
  for (let i = 0; i < 180; i++) rig.update(pose, 1 / 60, { speed: 12, steering: 1, drifting: true, grounded: true });
  assert.ok(rig.info.fov > 50 && rig.info.fov <= 52);
  assert.ok(Math.abs(rig.info.bankRadians) <= 0.035);
  assert.ok(rig.info.target[0]! > 0, 'Look-ahead must point into the right turn');
  const groundedHeight = rig.info.position[1]!;
  for (let i = 0; i < 120; i++) rig.update(pose, 1 / 60, { speed: 15, boosting: true, grounded: false });
  assert.ok(rig.info.fov > 57 && rig.info.fov <= 58);
  assert.ok(rig.info.position[1]! > groundedHeight + 0.5);
  rig.update(pose, 1 / 60, { speed: 15, boosting: true, drifting: true, steering: 1, grounded: false, reducedMotion: true });
  near(rig.info.fov, 45); near(rig.info.bankRadians, 0); near(rig.info.position[2]!, 9);
  rig.setMode('overview'); rig.update(pose, 0, { speed: 15, boosting: true, steering: 1 });
  near(rig.info.fov, 45); near(rig.info.bankRadians, 0);
});
test('elastic orbit follows the short yaw arc without adding moving-world lag on a steady straight', () => {
  const rig = createCameraRig(new PerspectiveCamera(45), 'track', 'chase');
  rig.update({ x: 0, y: 0.35, z: 0, yaw: 0 }, 0, { speed: 12, grounded: true });
  const initialDistance = rig.info.position[2]!;
  for (let i = 0; i < 200; i++) {
    const z = -i * 0.1;
    rig.update({ x: 0, y: 0.35, z, yaw: 0 }, i % 2 ? 1 / 90 : 1 / 144, { speed: 12, grounded: true });
    near(rig.info.position[2]! - z, initialDistance);
  }
  rig.update({ x: 0, y: 0.35, z: 0, yaw: Math.PI / 2 }, 1 / 60, { speed: 12, grounded: true, drifting: true });
  assert.ok(rig.info.position[0]! > 0 && rig.info.position[0]! < initialDistance * 0.5);
});

test('impact FOV pulse expires and reduced motion suppresses it', () => {
  const rig = createCameraRig(new PerspectiveCamera(45), 'track', 'chase'), pose = { x: 0, y: 0.35, z: 0, yaw: 0 };
  rig.update(pose, 0, { speed: 0, grounded: true, impacts: 0 });
  rig.update(pose, 1 / 60, { speed: 0, grounded: true, impacts: 1 });
  assert.ok(rig.info.fov > 45);
  for (let i = 0; i < 120; i++) rig.update(pose, 1 / 60, { speed: 0, grounded: true, impacts: 1 });
  assert.ok(rig.info.fov < 45.001);
  rig.update(pose, 1 / 60, { speed: 0, grounded: true, impacts: 2, reducedMotion: true });
  near(rig.info.fov, 45); near(rig.info.bankRadians, 0);
});

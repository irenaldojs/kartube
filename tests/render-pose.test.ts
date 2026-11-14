import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera } from 'three';
import { createPoseInterpolator } from '../apps/web/src/render-pose.ts';
import { createCameraRig } from '../apps/web/src/camera.ts';

test('interpolated kart and camera move evenly at 144 Hz and irregular frame intervals', () => {
  for (const intervals of [[1 / 144], [1 / 144, 1 / 90, 1 / 120, 1 / 75]]) {
    const pose = createPoseInterpolator({ x: 0, y: 0.35, z: 0, yaw: 0 });
    const rig = createCameraRig(new PerspectiveCamera(), 'track', 'chase');
    let time = 0, tick = 0;
    for (let frame = 0; frame < 300; frame++) {
      const dt = intervals[frame % intervals.length]!; time += dt;
      const desiredTick = Math.floor(time * 60);
      while (tick < desiredTick) { tick++; pose.push({ x: 0, y: 0.35, z: -12 * tick / 60, yaw: 0 }); }
      const rendered = pose.sample((time - tick / 60) * 60);
      if (tick > 0) assert.ok(Math.abs(rendered.z + 12 * (time - 1 / 60)) < 1e-8);
      rig.update(rendered, dt);
      assert.ok(Math.abs(rig.info.position[2]! - rendered.z - 9) < 1e-8);
      assert.ok(Math.abs(rig.info.target[2]! - rendered.z + 2) < 1e-8);
    }
  }
});
test('yaw interpolates across the shortest arc; recovery and pause snapshots never blend backwards', () => {
  const pose = createPoseInterpolator({ x: 0, y: 0.35, z: 0, yaw: Math.PI - 0.01 });
  pose.push({ x: 0.1, y: 0.35, z: 0, yaw: -Math.PI + 0.01 });
  assert.ok(Math.abs(Math.abs(pose.sample(0.5).yaw!) - Math.PI) < 1e-8);
  pose.snap({ x: 10, y: 0.4, z: 20, yaw: 1 });
  assert.equal(pose.sample(0).x, 10); assert.equal(pose.sample(1).z, 20);
  pose.push({ x: -30, y: 0.4, z: 7, yaw: 0 });
  assert.equal(pose.sample(0.2).x, -30);
});

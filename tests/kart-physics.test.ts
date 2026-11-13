import assert from 'node:assert/strict';
import test from 'node:test';
import { createPhysics } from '../apps/web/src/physics.ts';
import { NEUTRAL_INPUT } from '../apps/web/src/driving.ts';

const forward = { throttle: 1, steering: 0, brake: false };
const brake = { throttle: 0, steering: 0, brake: true };
test('prototype kart accelerates, brakes, reverses and resets with fixed-step Rapier physics', async () => {
  const kart = await createPhysics('track');
  try {
    for (let i = 0; i < 120; i++) kart.step();
    assert.ok(Math.abs(kart.position.y - 0.35) < 0.02);
    const startZ = kart.position.z;
    for (let i = 0; i < 90; i++) kart.step(forward);
    assert.ok(kart.position.z < startZ - 5);
    assert.ok(kart.telemetry.speed > 6 && kart.telemetry.speed <= 12.1);
    for (let i = 0; i < 60; i++) kart.step(brake);
    assert.ok(kart.telemetry.speed < 0.1);
    const stoppedZ = kart.position.z;
    for (let i = 0; i < 90; i++) kart.step({ ...forward, throttle: -1 });
    assert.ok(kart.position.z > stoppedZ + 3);
    assert.ok(kart.telemetry.speed <= 4.1);
    const ticks = kart.steps;
    kart.reset();
    assert.equal(kart.steps, ticks);
    assert.equal(kart.position.x, -20); assert.equal(kart.position.z, 7);
    assert.equal(kart.telemetry.speed, 0); assert.equal(kart.telemetry.yaw, 0);
    for (let i = 0; i < 120; i++) kart.step(NEUTRAL_INPUT);
    assert.ok(Math.abs(kart.position.y - 0.35) < 0.02);
  } finally { kart.dispose(); }
});
test('sustained throttle stays behind the guardrail and steering updates physical heading', async () => {
  const kart = await createPhysics('track');
  try {
    for (let i = 0; i < 120; i++) kart.step();
    for (let i = 0; i < 600; i++) kart.step(forward);
    assert.ok(kart.position.z > -22.6 && kart.position.z < -21.5, JSON.stringify(kart.pose));
    assert.ok(kart.position.y > 0.25);
    kart.reset();
    for (let i = 0; i < 120; i++) kart.step();
    for (let i = 0; i < 40; i++) kart.step({ ...forward, steering: 1 });
    assert.ok(kart.telemetry.yaw < -0.2);
    assert.ok(kart.position.x > -19.8);
    assert.ok(kart.position.x < -16.5, 'Inner guardrail must contain the kart');
  } finally { kart.dispose(); }
});
test('fixed-step control inputs traverse the complete circuit and both ramps without resetting', async () => {
  const kart = await createPhysics('track');
  try {
    for (let i = 0; i < 120; i++) kart.step();
    const route = [[-20, -20], [20, -20], [20, 20], [-20, 20], [-20, 7]] as const;
    let next = 0, highest = 0;
    for (let tick = 0; tick < 6000 && next < route.length; tick++) {
      const pose = kart.pose, [x, z] = route[next]!;
      highest = Math.max(highest, pose.y);
      const dx = x - pose.x, dz = z - pose.z;
      if (Math.hypot(dx, dz) < 3) { next++; continue; }
      const desired = Math.atan2(-dx, -dz);
      const error = Math.atan2(Math.sin(desired - pose.yaw), Math.cos(desired - pose.yaw));
      // Test-only driver: all movement goes through the same inputs as human control.
      kart.step({ throttle: 0.35, steering: Math.max(-1, Math.min(1, -error * 2)), brake: false });
    }
    assert.equal(next, route.length, JSON.stringify(kart.pose));
    assert.ok(highest > 1, 'Route must climb the ramps');
    assert.equal(kart.telemetry.resets, 0);
  } finally { kart.dispose(); }
});

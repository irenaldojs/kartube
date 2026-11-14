import { TRACK_MAIN_ROUTE, TRACK_ALTERNATIVE_ROUTE } from '../apps/web/src/track.ts';
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
    assert.equal(kart.position.x, -30); assert.equal(kart.position.z, 7);
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
    assert.ok(kart.position.z > -34 && kart.position.z < 8, JSON.stringify(kart.pose));
    assert.ok(kart.position.y > 0.25);
    kart.reset();
    for (let i = 0; i < 120; i++) kart.step();
    for (let i = 0; i < 40; i++) kart.step({ ...forward, steering: 1 });
    assert.ok(kart.telemetry.yaw < -0.2);
    assert.ok(kart.position.x > -29.8);
    assert.ok(kart.position.x < -26.5, 'Inner guardrail must contain the kart');
  } finally { kart.dispose(); }
});
test('fixed-step control inputs traverse the complete circuit and both ramps without resetting', async () => {
  const kart = await createPhysics('track');
  try {
    for (let i = 0; i < 120; i++) kart.step();
    const route = TRACK_MAIN_ROUTE;
    let next = 0, highest = 0, airborne = 0, landings = 0, wasGrounded = true;
    for (let tick = 0; tick < 6000 && next < route.length; tick++) {
      const pose = kart.pose, [x, z] = route[next]!;
      highest = Math.max(highest, pose.y);
      const dx = x - pose.x, dz = z - pose.z;
      if (Math.hypot(dx, dz) < 3) { next++; continue; }
      const desired = Math.atan2(-dx, -dz);
      const error = Math.atan2(Math.sin(desired - pose.yaw), Math.cos(desired - pose.yaw));
      // Test-only driver: all movement goes through the same inputs as human control.
      kart.step({ throttle: 0.35, steering: Math.max(-1, Math.min(1, -error * 2)), brake: false });
      if (!kart.telemetry.grounded && pose.y > 0.7) airborne++;
      if (!wasGrounded && kart.telemetry.grounded) landings++;
      wasGrounded = kart.telemetry.grounded;
    }
    assert.equal(next, route.length, JSON.stringify(kart.pose));
    assert.ok(highest > 1, 'Route must climb the ramps');
    assert.ok(airborne > 0 && landings >= 2, 'Route must include airborne motion and both landings');
    assert.equal(kart.telemetry.resets, 0);
  } finally { kart.dispose(); }
});
test('holding reverse first brakes forward motion and then reverses from rest', async () => {
  const kart = await createPhysics('track');
  try {
    for (let i = 0; i < 120; i++) kart.step();
    for (let i = 0; i < 60; i++) kart.step(forward);
    const movingZ = kart.position.z, movingSpeed = kart.telemetry.speed;
    const reverse = { throttle: -1, steering: 0, brake: false };
    for (let i = 0; i < 20; i++) kart.step(reverse);
    assert.ok(kart.telemetry.speed < movingSpeed);
    assert.ok(kart.position.z < movingZ, 'Kart must brake before changing direction');
    const brakingZ = kart.position.z;
    for (let i = 0; i < 90; i++) kart.step(reverse);
    assert.ok(kart.position.z > brakingZ + 2, 'The same held control must reverse after stopping');
    assert.ok(kart.telemetry.speed <= 4.1);
  } finally { kart.dispose(); }
});
test('physics worlds and colliders can be released repeatedly without touching freed WASM', async () => {
  for (let cycle = 0; cycle < 4; cycle++) {
    const kart = await createPhysics(cycle % 2 === 0 ? 'track' : 'drop');
    assert.equal(kart.resources.worlds, 1); assert.equal(kart.resources.bodies, 1);
    assert.ok(kart.resources.colliders >= 2);
    kart.dispose(); kart.dispose(); kart.step(forward); kart.reset();
    assert.deepEqual(kart.resources, { worlds: 0, bodies: 0, colliders: 0 });
  }
});

test('drift uses the same Rapier body and is cancelled by brake and reset', async () => {
  const kart = await createPhysics('track');
  try {
    for (let i = 0; i < 120; i++) kart.step();
    for (let i = 0; i < 60; i++) kart.step(forward);
    for (let i = 0; i < 15; i++) kart.step({ ...forward, steering: 1, drift: true });
    assert.equal(kart.telemetry.drifting, true);
    assert.ok(kart.telemetry.yaw < -0.3);
    kart.step({ ...forward, brake: true, drift: true });
    assert.equal(kart.telemetry.drifting, false);
    kart.reset(); assert.equal(kart.telemetry.drifting, false); assert.equal(kart.telemetry.airControl, false);
    assert.equal(kart.resources.bodies, 1);
  } finally { kart.dispose(); }
});

test('a barrier produces a bounded arcade push without rotating the kart', async () => {
  const kart = await createPhysics('track');
  try {
    kart.reset({ x: -32.7, y: 0.4, z: 10 }, Math.PI / 2);
    for (let i = 0; i < 60; i++) kart.step(forward);
    assert.ok(kart.telemetry.bumps > 0);
    assert.ok(Math.abs(kart.telemetry.yaw - Math.PI / 2) < 1e-6);
    assert.ok(kart.position.x > -34.2);
    assert.ok(kart.telemetry.speed <= 12);
  } finally { kart.dispose(); }
});

test('top speed remains physically steady across the welded road surface', async () => {
  const kart = await createPhysics('track');
  try {
    kart.reset({ x: -2, y: 0.4, z: -30 }, -Math.PI / 2);
    for (let i = 0; i < 120; i++) kart.step();
    for (let i = 0; i < 62; i++) kart.step(forward);
    const heights: number[] = [], speeds: number[] = [];
    for (let i = 0; i < 50; i++) { kart.step(forward); heights.push(kart.position.y); speeds.push(kart.telemetry.speed); assert.equal(kart.telemetry.commandedSpeed, 12); }
    assert.ok(Math.max(...speeds) - Math.min(...speeds) < 0.01, JSON.stringify(speeds));
    assert.ok(Math.max(...heights) - Math.min(...heights) < 0.003);
  } finally { kart.dispose(); }
});

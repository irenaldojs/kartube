import assert from 'node:assert/strict';
import test from 'node:test';
import { controlKart, KART_TUNING, NEUTRAL_INPUT } from '../apps/web/src/driving.ts';

const dt = 1 / 60;
test('explicit drift preserves sideways momentum and recovers grip on release', () => {
  function corner(drift: boolean) {
    let velocity = { x: 0, y: 0, z: -10 }, yaw = 0;
    for (let i = 0; i < 25; i++) {
      const next = controlKart(velocity, yaw, true, { throttle: 1, steering: 1, brake: false, drift }, dt);
      velocity = next.velocity; yaw = next.yaw;
      assert.ok(Math.hypot(velocity.x, velocity.z) <= KART_TUNING.maxSpeed + 1e-8);
    }
    return { velocity, yaw, slip: Math.abs(velocity.x * Math.cos(yaw) - velocity.z * Math.sin(yaw)) };
  }
  const drifting = corner(true), normal = corner(false);
  assert.ok(drifting.slip > normal.slip + 1, JSON.stringify({ drifting, normal }));
  let velocity = drifting.velocity;
  for (let i = 0; i < 60; i++) velocity = controlKart(velocity, drifting.yaw, true, NEUTRAL_INPUT, dt).velocity;
  const slip = Math.abs(velocity.x * Math.cos(drifting.yaw) - velocity.z * Math.sin(drifting.yaw));
  assert.ok(slip < 0.01);
  for (const velocity of [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 4 }]) {
    assert.equal(controlKart(velocity, 0, true, { throttle: 1, steering: 1, brake: false, drift: true }, dt).drifting, false);
  }
  assert.equal(controlKart({ x: 0, y: 0, z: -10 }, 0, true, { throttle: 1, steering: 1, brake: true, drift: true }, dt).drifting, false);
});
test('air steering is limited, conserves horizontal speed and leaves gravity to Rapier', () => {
  let velocity = { x: 0, y: 3, z: -10 }, yaw = 0;
  for (let i = 0; i < 60; i++) {
    const next = controlKart(velocity, yaw, false, { throttle: 1, steering: 1, brake: false, drift: true }, dt);
    velocity = next.velocity; yaw = next.yaw;
    assert.equal(next.drifting, false); assert.equal(next.airControl, true);
  }
  assert.ok(Math.abs(yaw + KART_TUNING.airTurnRate) < 1e-8);
  assert.ok(Math.abs(Math.hypot(velocity.x, velocity.z) - 10) < 1e-8);
  assert.equal(velocity.y, 3); assert.ok(velocity.x > 0);
  const neutral = controlKart(velocity, yaw, false, NEUTRAL_INPUT, dt);
  assert.deepEqual(neutral.velocity, velocity); assert.equal(neutral.yaw, yaw);
  const invalid = controlKart(velocity, yaw, false, { throttle: NaN, steering: Infinity, brake: false }, dt);
  assert.deepEqual(invalid.velocity, velocity);
});

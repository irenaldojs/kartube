import assert from 'node:assert/strict';
import test from 'node:test';
import { controlKart, KART_TUNING, NEUTRAL_INPUT } from '../apps/web/src/driving.ts';

const dt = 1 / 60;
test('fake drift changes visual heading without lateral tyre-slip physics', () => {
  const input = { throttle: 1, steering: 1, brake: false, drift: true };
  const drifting = controlKart({ x: 0, y: 0, z: -10 }, 0, true, input, dt);
  assert.equal(drifting.drifting, true);
  assert.ok(drifting.state.visualYawOffset < 0);
  const lateral = drifting.velocity.x * Math.cos(drifting.yaw) - drifting.velocity.z * Math.sin(drifting.yaw);
  assert.ok(Math.abs(lateral) < 1e-8);
  assert.equal(controlKart({ x: 0, y: 0, z: 0 }, 0, true, input, dt).drifting, false);
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

test('normal corners preserve speed instead of losing energy through projection', () => {
  let velocity = { x: 0, y: 0, z: -12 }, yaw = 0;
  for (let i = 0; i < 180; i++) {
    const next = controlKart(velocity, yaw, true, { throttle: 1, steering: 1, brake: false }, dt);
    velocity = next.velocity; yaw = next.yaw;
    assert.ok(Math.abs(Math.hypot(velocity.x, velocity.z) - 12) < 1e-6);
  }
});
test('drift latches side, countersteering widens the turn and release grants one bounded mini turbo', () => {
  let velocity = { x: 0, y: 0, z: -12 }, yaw = 0;
  let state = { steering: 0, driftDirection: 0, driftCharge: 0, boostRemaining: 0, driftHeld: false, visualYawOffset: 0 };
  const tick = (input: { throttle: number; steering: number; brake: boolean; drift?: boolean }, grounded = true) => {
    const next = controlKart(velocity, yaw, grounded, input, dt, state); velocity = next.velocity; yaw = next.yaw; state = next.state; return next;
  };
  for (let i = 0; i < 70; i++) tick({ throttle: 1, steering: 1, brake: false, drift: true });
  assert.equal(state.driftDirection, 1); assert.ok(state.driftCharge >= 1);
  const tight = Math.abs(controlKart(velocity, yaw, true, { throttle: 1, steering: 1, brake: false, drift: true }, dt, state).yaw - yaw);
  for (let i = 0; i < 20; i++) tick({ throttle: 1, steering: -1, brake: false, drift: true });
  assert.equal(state.driftDirection, 1);
  const wide = Math.abs(controlKart(velocity, yaw, true, { throttle: 1, steering: -1, brake: false, drift: true }, dt, state).yaw - yaw);
  assert.ok(wide < tight);
  tick({ throttle: 1, steering: 0, brake: false, drift: false });
  assert.equal(state.boostRemaining, KART_TUNING.turboDuration); assert.equal(state.driftDirection, 0);
  for (let i = 0; i < 20; i++) tick({ throttle: 1, steering: 0, brake: false });
  assert.ok(Math.hypot(velocity.x, velocity.z) > 12);
  assert.ok(Math.hypot(velocity.x, velocity.z) <= KART_TUNING.turboSpeed + 1e-8);
  for (let i = 0; i < 120; i++) tick({ throttle: 1, steering: 0, brake: false });
  assert.equal(state.boostRemaining, 0); assert.ok(Math.abs(Math.hypot(velocity.x, velocity.z) - 12) < 0.01);
  const cancelled = controlKart(velocity, yaw, false, { throttle: 1, steering: 1, brake: false, drift: false }, dt,
    { ...state, driftDirection: 1, driftHeld: true, driftCharge: 1 });
  assert.equal(cancelled.state.boostRemaining, 0); assert.equal(cancelled.state.driftCharge, 0);
});

test('a jump preserves a held drift without charging; release in air cancels without turbo', () => {
  const state = { steering: 1, driftDirection: 1, driftCharge: 0.5, boostRemaining: 0, driftHeld: true, visualYawOffset: 0 };
  const airborne = controlKart({ x: 0, y: 2, z: -10 }, 0, false, { throttle: 1, steering: 1, brake: false, drift: true }, dt, state);
  assert.equal(airborne.state.driftDirection, 1); assert.equal(airborne.state.driftCharge, 0.5);
  const landed = controlKart(airborne.velocity, airborne.yaw, true, { throttle: 1, steering: 0, brake: false, drift: true }, dt, airborne.state);
  assert.equal(landed.drifting, true); assert.ok(landed.state.driftCharge > 0.5);
  const released = controlKart(airborne.velocity, airborne.yaw, false, { throttle: 1, steering: 0, brake: false }, dt, { ...state, driftCharge: 1 });
  assert.equal(released.state.boostRemaining, 0); assert.equal(released.state.driftDirection, 0);
});

test('steering is direct and both ground and air enforce the expired-boost cap', () => {
  const state = { steering: 0, driftDirection: 0, driftCharge: 0, boostRemaining: 0, driftHeld: false, visualYawOffset: 0 };
  const turned = controlKart({ x: 0, y: 0, z: -12 }, 0, true, { throttle: 1, steering: 1, brake: false }, dt, state);
  assert.equal(turned.state.steering, 1); assert.ok(turned.yaw < 0);
  assert.ok(Math.abs(Math.atan2(-turned.velocity.x, -turned.velocity.z) - turned.yaw) < 1e-8);
  for (const grounded of [true, false]) {
    const expired = controlKart({ x: 0, y: 0, z: -15 }, 0, grounded, { throttle: 1, steering: 0, brake: false }, dt, { ...state, boostRemaining: 0.001 });
    assert.ok(Math.hypot(expired.velocity.x, expired.velocity.z) <= 12 + 1e-8);
  }
});

test('linear speed reaches an exact ceiling and ignores noisy contact velocity samples', () => {
  let state = { steering: 0, driftDirection: 0, driftCharge: 0, boostRemaining: 0, driftHeld: false, visualYawOffset: 0, speed: 0 };
  for (let i = 0; i < 62; i++) {
    const next = controlKart({ x: 0, y: 0, z: -Math.max(0, (state.speed ?? 0) - 0.2) }, 0, true, { throttle: 1, steering: 0, brake: false }, dt, state);
    state = next.state as typeof state;
    assert.ok((state.speed ?? 0) <= 12);
    if (i < 59) assert.ok(Math.abs((state.speed ?? 0) - (i + 1) * 12 * dt) < 1e-8);
  }
  for (let i = 0; i < 600; i++) {
    const next = controlKart({ x: 0, y: 0, z: -(i % 2 ? 11.7 : 12.2) }, 0, true, { throttle: 1, steering: 0, brake: false }, dt, state);
    state = next.state as typeof state; assert.equal(state.speed, 12); assert.equal(Math.hypot(next.velocity.x, next.velocity.z), 12);
  }
});

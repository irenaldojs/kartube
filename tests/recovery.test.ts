import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecoveryDetector } from '../apps/web/src/recovery.ts';
import { NEUTRAL_INPUT } from '../apps/web/src/driving.ts';
import { createPhysics } from '../apps/web/src/physics.ts';
import { RACE_GATES, recoveryPointFor } from '../apps/web/src/race-track.ts';
const forward = { throttle: 1, steering: 0, brake: false };

test('stuck detection requires sustained intent without progress, never idle, brake or airborne', () => {
  const detector = createRecoveryDetector(1 / 60), position = { x: 0, y: 0.35, z: 0 };
  for (let i = 0; i < 600; i++) assert.equal(detector.sample(position, true, NEUTRAL_INPUT), null);
  for (let i = 0; i < 600; i++) assert.equal(detector.sample(position, false, forward), null);
  for (let i = 0; i < 600; i++) assert.equal(detector.sample(position, true, { ...forward, brake: true }), null);
  for (let i = 0; i < 600; i++) assert.equal(detector.sample({ ...position, z: -i * 0.05 }, true, forward), null);
  detector.clear();
  for (let i = 0; i < 179; i++) assert.equal(detector.sample(position, true, forward), null);
  assert.equal(detector.sample(position, true, forward), 'stuck');
  detector.sample(position, true, NEUTRAL_INPUT); assert.equal(detector.stuckSeconds, 0);
  assert.equal(detector.sample({ x: 0, y: -4, z: 0 }, false, NEUTRAL_INPUT), 'fall');
  assert.equal(detector.sample({ x: 37, y: 1, z: 0 }, false, NEUTRAL_INPUT), 'fall');
});
test('every approved anchor has support, space and correct heading; unsafe points are rejected', async () => {
  const kart = await createPhysics('track');
  try {
    for (const id of [null, ...RACE_GATES.map(gate => gate.id)]) {
      const point = recoveryPointFor(id);
      assert.equal(kart.setRecoveryPoint(point), true, String(id));
      assert.equal(kart.recover(), true);
      assert.ok(Math.abs(kart.position.x - point.x) < 1e-5 && Math.abs(kart.position.z - point.z) < 1e-5);
      assert.ok(Math.abs(kart.telemetry.yaw - point.yaw) < 1e-8);
      assert.equal(kart.telemetry.speed, 0);
    }
    const safe = kart.telemetry.recoveryPoint;
    assert.equal(kart.setRecoveryPoint({ x: -16, y: 0.4, z: 10, yaw: 0 }), false);
    assert.equal(kart.setRecoveryPoint({ x: 0, y: 0.4, z: 10, yaw: 0 }), false);
    assert.equal(kart.setRecoveryPoint({ x: NaN, y: 0.4, z: 0, yaw: 0 }), false);
    assert.deepEqual(kart.telemetry.recoveryPoint, safe);
    kart.dispose(); assert.equal(kart.recover(), false);
  } finally { kart.dispose(); }
});
test('Rapier recovers falls and wall-stuck intent to the selected anchor without repeated idle recovery', async () => {
  const kart = await createPhysics('track');
  try {
    const anchor = recoveryPointFor('alternative');
    assert.equal(kart.setRecoveryPoint(anchor), true);
    kart.reset({ x: 0, y: -4, z: 10 }); kart.step();
    assert.equal(kart.telemetry.lastRecoveryReason, 'fall'); assert.equal(kart.telemetry.recoveries, 1);
    assert.ok(Math.abs(kart.position.x - anchor.x) < 1e-5); assert.equal(kart.telemetry.yaw, anchor.yaw);
    kart.reset({ x: -20, y: 0.4, z: -22.3 });
    for (let i = 0; i < 240; i++) kart.step();
    assert.equal(kart.telemetry.recoveries, 1);
    for (let i = 0; i < 180; i++) kart.step(forward);
    assert.equal(kart.telemetry.lastRecoveryReason, 'stuck'); assert.equal(kart.telemetry.recoveries, 2);
    assert.ok(Math.abs(kart.position.x - anchor.x) < 1e-5); assert.equal(kart.telemetry.speed, 0);
    for (let i = 0; i < 240; i++) kart.step();
    assert.equal(kart.telemetry.recoveries, 2); assert.ok(Math.abs(kart.position.y - 0.35) < 0.02);
  } finally { kart.dispose(); }
});

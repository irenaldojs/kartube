import assert from 'node:assert/strict';
import test from 'node:test';
import { createCheckpointRace } from '../packages/game-core/src/checkpoint-race.ts';
import { RACE_GATES, RACE_FINISH_ID, RACE_SPAWN, recoveryPointFor } from '../apps/web/src/race-track.ts';
import { createPhysics } from '../apps/web/src/physics.ts';
const config = { gates: RACE_GATES, finishId: RACE_FINISH_ID, laps: 3, tickRate: 60, countdownTicks: 0 };
function driver(laps = 3) {
  const race = createCheckpointRace({ ...config, laps }, RACE_SPAWN);
  let position = { ...RACE_SPAWN };
  const move = (x: number, z: number, y = 0.35) => {
    const from = position, distance = Math.hypot(x - from.x, y - from.y, z - from.z), steps = Math.max(1, Math.ceil(distance / 0.2));
    for (let step = 1; step <= steps; step++) {
      const alpha = step / steps;
      position = { x: from.x + (x - from.x) * alpha, y: from.y + (y - from.y) * alpha, z: from.z + (z - from.z) * alpha };
      race.step(position);
    }
  };
  const lap = (alternative = false) => {
    for (const [x, z] of alternative ? [[-20, 0], [20, 0], [20, 20], [-20, 20], [-20, 7]] : [[-20, -20], [20, -20], [20, 20], [-20, 20], [-20, 7]]) move(x!, z!);
  };
  const recover = () => { const point = recoveryPointFor(race.snapshot.lastCheckpointId); position = { x: point.x, y: point.y, z: point.z }; race.rebaseAfterRespawn(position); };
  return { race, move, lap, recover };
}
test('countdown uses fixed ticks and initial finish crossing arms without granting a lap', () => {
  const race = createCheckpointRace({ ...config, countdownTicks: 180 }, RACE_SPAWN);
  for (let i = 0; i < 179; i++) race.step(RACE_SPAWN);
  assert.equal(race.phase, 'countdown'); assert.equal(race.snapshot.countdown, 1);
  race.step(RACE_SPAWN); assert.equal(race.phase, 'racing'); assert.equal(race.snapshot.elapsedSeconds, 0);
  const { race: moving, move } = driver(); move(-20, 7);
  assert.equal(moving.snapshot.completedLaps, 0); assert.equal(moving.snapshot.armed, true);
  assert.deepEqual(moving.snapshot.expected, ['branch']);
});
test('three legal laps accept both graph routes and finish exactly once', () => {
  const { race, lap } = driver();
  lap(); assert.equal(race.snapshot.completedLaps, 1);
  lap(true); assert.equal(race.snapshot.completedLaps, 2);
  lap(); assert.equal(race.snapshot.completedLaps, 3); assert.equal(race.phase, 'finished');
  const final = race.snapshot; lap(); assert.deepEqual(race.snapshot, final);
  const single = driver(1); single.lap(true); assert.equal(single.race.phase, 'finished');
});
test('finish oscillation, reverse traversal, cut and airborne gate miss cannot grant laps', () => {
  const forward = driver(); forward.move(-20, 7);
  for (let i = 0; i < 4; i++) { forward.move(-20, 14); forward.move(-20, 7); }
  assert.equal(forward.race.snapshot.completedLaps, 0);
  forward.move(-20, 0); forward.move(20, 8); forward.move(0, 20); forward.move(-20, 20); forward.move(-20, 7);
  assert.equal(forward.race.snapshot.completedLaps, 0);
  const reverse = driver();
  for (const [x, z] of [[-20, 20], [20, 20], [20, -20], [-20, -20], [-20, 14]]) reverse.move(x!, z!);
  assert.equal(reverse.race.snapshot.completedLaps, 0);
  const high = driver(); high.move(-20, 7, 8);
  assert.equal(high.race.snapshot.armed, false);
});
test('teleport invalidates the in-progress route, and malformed checkpoint graphs fail', () => {
  const { race, move } = driver(); move(-20, 0);
  race.step({ x: 20, y: 0.35, z: 8 });
  assert.equal(race.snapshot.rejectedJumps, 1); assert.equal(race.snapshot.armed, false);
  assert.deepEqual(race.snapshot.expected, ['finish']);
  assert.throws(() => createCheckpointRace({ ...config, laps: 0 }, RACE_SPAWN), /Invalid race/);
  const cyclic = RACE_GATES.map(gate => gate.id === 'alternative' ? { ...gate, next: ['alternative'] } : gate);
  assert.throws(() => createCheckpointRace({ ...config, gates: cyclic }, RACE_SPAWN), /cycle/);
});
test('actual Rapier controls complete three laps with both legal routes and a fall recovery', async () => {
  const kart = await createPhysics('track');
  try {
    kart.reset(RACE_SPAWN); kart.setRecoveryPoint(recoveryPointFor(null));
    let recoveredOnAlternative = false;
    const race = createCheckpointRace(config, kart.position);
    for (let i = 0; i < 120; i++) { kart.step(); race.step(kart.position); }
    for (let lap = 0; lap < 3; lap++) {
      const route = lap === 1 ? [[-20, 0], [20, 0], [20, 20], [-20, 20], [-20, 7]] : [[-20, -20], [20, -20], [20, 20], [-20, 20], [-20, 7]];
      let next = 0;
      for (let tick = 0; tick < 6000 && next < route.length && race.phase !== 'finished'; tick++) {
        const pose = kart.pose, [x, z] = route[next]!, dx = x! - pose.x, dz = z! - pose.z;
        if (Math.hypot(dx, dz) < 3) { next++; continue; }
        const desired = Math.atan2(-dx, -dz), error = Math.atan2(Math.sin(desired - pose.yaw), Math.cos(desired - pose.yaw));
        kart.step({ throttle: 0.35, steering: Math.max(-1, Math.min(1, -error * 2)), brake: false });
        const previousCheckpoint = race.snapshot.lastCheckpointId;
        race.step(kart.position);
        if (race.snapshot.lastCheckpointId !== previousCheckpoint) kart.setRecoveryPoint(recoveryPointFor(race.snapshot.lastCheckpointId));
        if (lap === 1 && race.snapshot.lastCheckpointId === 'alternative' && !recoveredOnAlternative) {
          const before = race.snapshot;
          kart.reset({ x: 0, y: -4, z: 10 }); kart.step();
          assert.equal(kart.telemetry.lastRecoveryReason, 'fall');
          race.rebaseAfterRespawn(kart.position); race.step(kart.position);
          assert.equal(race.snapshot.completedLaps, before.completedLaps);
          assert.deepEqual(race.snapshot.expected, before.expected);
          recoveredOnAlternative = true;
        }
      }
      assert.equal(race.snapshot.completedLaps, lap + 1, JSON.stringify({ race: race.snapshot, kart: kart.pose }));
    }
    assert.equal(race.phase, 'finished'); assert.equal(kart.telemetry.resets, 3);
    assert.equal(race.snapshot.respawns, 1); assert.equal(race.snapshot.rejectedJumps, 0);
  } finally { kart.dispose(); }
});

test('authorized recovery preserves completed laps, chosen route and clock without granting gates', () => {
  const run = driver(); run.lap();
  const before = run.race.snapshot;
  for (let i = 0; i < 5; i++) run.recover();
  const after = run.race.snapshot;
  assert.equal(after.completedLaps, 1); assert.equal(after.elapsedSeconds, before.elapsedSeconds);
  assert.equal(after.lastCheckpointId, before.lastCheckpointId); assert.deepEqual(after.expected, before.expected);
  assert.equal(after.armed, before.armed); assert.equal(after.rejectedJumps, 0); assert.equal(after.respawns, 5);
  run.move(-20, 14); run.move(-20, 7); assert.equal(run.race.snapshot.completedLaps, 1);
  run.move(-20, 0); run.move(2, 0);
  assert.equal(run.race.snapshot.lastCheckpointId, 'alternative');
  run.recover(); assert.deepEqual(run.race.snapshot.expected, ['merge']);
  for (const [x, z] of [[20, 0], [20, 20], [-20, 20], [-20, 7]]) run.move(x!, z!);
  assert.equal(run.race.snapshot.completedLaps, 2); assert.equal(run.race.snapshot.rejectedJumps, 0);
});

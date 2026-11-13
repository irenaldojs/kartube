import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_POINTS, validateRaceSnapshot, validateRaceTransition, validateRaceResult } from '@kartube/game-core';
import type { RaceSnapshot, RaceResult } from '@kartube/game-core';

function snapshot(phase: RaceSnapshot['phase'], serverTick: number): RaceSnapshot {
  return {
    config: { raceId: 'race-1', track: { id: 'track-1', version: 1, checksum: 'a'.repeat(64) }, laps: 3, tickRate: 20 },
    phase, serverTick, startTick: phase === 'waiting' ? null : 100,
    participants: Array.from({ length: 8 }, (_, slotId) => ({ slotId, driverId: `driver-${slotId}`, controller: slotId === 0 ? 'human' : 'bot', completedLaps: 0, checkpointId: null, position: { x: 0, y: 0, z: 0 }, yaw: 0, speed: 0, finishTick: null })),
  };
}
test('accepts full lifecycle and authority replacement of a controller', () => {
  const waiting = snapshot('waiting', 0), countdown = snapshot('countdown', 1), racing = snapshot('racing', 100);
  validateRaceTransition(waiting, countdown);
  validateRaceTransition(countdown, racing);
  validateRaceTransition(racing, { ...snapshot('racing', 101), participants: racing.participants.map(p => ({ ...p, controller: 'bot' })) });
  validateRaceTransition(racing, snapshot('finished', 200));
  validateRaceTransition(countdown, snapshot('aborted', 2));
});
test('rejects stale ticks, phase skips, rollback and terminal mutations', () => {
  assert.throws(() => validateRaceTransition(snapshot('waiting', 0), snapshot('racing', 100)), /transition/);
  assert.throws(() => validateRaceTransition(snapshot('racing', 100), snapshot('racing', 100)), /Stale/);
  assert.throws(() => validateRaceTransition(snapshot('racing', 100), snapshot('countdown', 101)));
  assert.throws(() => validateRaceTransition(snapshot('finished', 200), snapshot('finished', 201)), /Terminal/);
  assert.throws(() => validateRaceTransition(snapshot('aborted', 200), snapshot('racing', 201)), /Terminal/);
});
test('rejects configuration, start time and slot identity changes', () => {
  const first = snapshot('racing', 100), next = snapshot('racing', 101);
  assert.throws(() => validateRaceTransition(first, { ...next, config: { ...next.config, laps: 4 } }), /configuration/);
  assert.throws(() => validateRaceTransition(first, { ...next, startTick: 99 }), /Start tick/);
  assert.throws(() => validateRaceTransition(first, { ...next, participants: next.participants.map(p => ({ ...p, driverId: `changed-${p.slotId}` })) }), /identity/);
});
test('rejects invalid clocks, poses, pre-start progress and missing finish tick', () => {
  assert.throws(() => validateRaceSnapshot(snapshot('countdown', 100)), /Countdown/);
  const racing = snapshot('racing', 100);
  assert.throws(() => validateRaceSnapshot({ ...racing, startTick: 101 }), /started/);
  assert.throws(() => validateRaceSnapshot({ ...racing, participants: racing.participants.map(p => ({ ...p, speed: NaN })) }), /pose/);
  assert.throws(() => validateRaceSnapshot({ ...racing, participants: racing.participants.map(p => ({ ...p, completedLaps: 3 })) }), /finish tick/);
  const waiting = snapshot('waiting', 0);
  assert.throws(() => validateRaceSnapshot({ ...waiting, participants: waiting.participants.map(p => ({ ...p, completedLaps: 1 })) }), /before start/);
});
test('rejects decreasing lap progress and changing finish timestamps', () => {
  const base = snapshot('racing', 150);
  const progressed = { ...base, participants: base.participants.map(p => ({ ...p, completedLaps: 1 })) };
  assert.throws(() => validateRaceTransition(progressed, snapshot('racing', 151)), /backwards/);
  const finished = { ...base, participants: base.participants.map(p => ({ ...p, completedLaps: 3, finishTick: 140 })) };
  assert.throws(() => validateRaceTransition(finished, { ...finished, serverTick: 151, participants: finished.participants.map(p => ({ ...p, finishTick: 141 })) }), /Finish tick changed/);
});
function resultFixture(): { result: RaceResult; state: RaceSnapshot } {
  const base = snapshot('finished', 200);
  const participants = base.participants.map(p => ({ ...p, completedLaps: p.slotId < 7 ? 3 : 1, finishTick: p.slotId < 7 ? 110 + p.slotId : null }));
  const state = { ...base, participants };
  const result: RaceResult = { raceId: 'race-1', resultId: 'result-1', startTick: 100, endTick: 200,
    positions: participants.map((p, index) => ({ slotId: p.slotId, position: index + 1, status: p.finishTick === null ? 'dnf' : 'finished', finishTick: p.finishTick, points: RACE_POINTS[index]! })) };
  return { state, result };
}
test('validates eight official result positions including a DNF', () => {
  const { result, state } = resultFixture(); validateRaceResult(result, state);
});
test('rejects fabricated points, duplicate slots, incorrect clocks and unfinished result', () => {
  const { result, state } = resultFixture();
  assert.throws(() => validateRaceResult({ ...result, positions: result.positions.map(p => ({ ...p, points: 99 })) }, state), /points/);
  assert.throws(() => validateRaceResult({ ...result, positions: result.positions.map(p => ({ ...p, slotId: 0 })) }, state));
  assert.throws(() => validateRaceResult({ ...result, endTick: 201 }, state), /clock/);
  assert.throws(() => validateRaceResult(result, { ...state, phase: 'racing' }), /finished race/);
  assert.throws(() => validateRaceResult({ ...result, positions: result.positions.slice(1) }, state), /eight/);
});
test('rejects results with inconsistent finish times or DNF status', () => {
  const { result, state } = resultFixture();
  assert.throws(() => validateRaceResult({ ...result, positions: result.positions.map(p => ({ ...p, finishTick: 100 })) }, state), /mismatch/);
  assert.throws(() => validateRaceResult({ ...result, positions: result.positions.map(p => ({ ...p, status: 'dnf' })) }, state), /DNF/);
});
test('equal finish ticks require stable slot order', () => {
  const { result, state } = resultFixture();
  const tied = { ...state, participants: state.participants.map(p => p.slotId < 2 ? { ...p, finishTick: 110 } : p) };
  const positions = result.positions.map(p => p.slotId < 2 ? { ...p, finishTick: 110 } : p);
  validateRaceResult({ ...result, positions }, tied);
  const swapped = [...positions];
  swapped[0] = { ...positions[1]!, position: 1, points: 15 };
  swapped[1] = { ...positions[0]!, position: 2, points: 12 };
  assert.throws(() => validateRaceResult({ ...result, positions: swapped }, tied), /stable slot/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRoster, RACE_POINTS } from '@kartube/game-core';
import { isInputFrame } from '@kartube/protocol';

const roster = Array.from({ length: 8 }, (_, slotId) => ({ slotId, driverId: `driver-${slotId}`, controller: slotId === 0 ? 'human' as const : 'bot' as const }));
test('accepts one human and seven bots with stable unique slots', () => validateRoster(roster));
test('rejects missing, duplicate and out-of-range slots', () => {
  assert.throws(() => validateRoster(roster.slice(1)));
  assert.throws(() => validateRoster([...roster.slice(1), roster[1]!]));
  assert.throws(() => validateRoster([...roster.slice(1), { ...roster[0]!, slotId: 8 }]));
});
test('canonical input fixtures are portable to the future Rust validator', () => {
  const fixtures = JSON.parse(readFileSync(new URL('../fixtures/input-frames.json', import.meta.url), 'utf8'));
  for (const fixture of fixtures) assert.equal(isInputFrame(fixture.input), fixture.valid, fixture.name);
});
test('rejects malformed and non-finite inputs', () => {
  for (const value of [null, {}, [], { seq: -1 }, { steer: NaN }]) assert.equal(isInputFrame(value), false);
});
test('points match the initial eight-position championship proposal', () => {
  assert.deepEqual(RACE_POINTS, [15, 12, 10, 8, 6, 4, 2, 1]);
});

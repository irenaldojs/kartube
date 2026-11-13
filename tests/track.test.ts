import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTrackDefinition } from '@kartube/game-data';

function fixture() { return JSON.parse(readFileSync(new URL('../fixtures/track-definition.json', import.meta.url), 'utf8')); }

test('accepts branching and merging routes with eight spawns', () => {
  const track = parseTrackDefinition(fixture());
  assert.equal(track.checkpoints.length, 5);
  assert.deepEqual(track.checkpoints[1]?.next, ['main', 'alternate']);
  assert.equal(track.spawnSlots.length, 8);
});
test('rejects malformed metadata and coordinates', () => {
  for (const value of [null, [], {}, { ...fixture(), schemaVersion: 2 }, { ...fixture(), version: 0 }, { ...fixture(), checksum: '' }]) {
    assert.throws(() => parseTrackDefinition(value));
  }
  for (const invalid of [NaN, Infinity, '0', null]) {
    const track = fixture(); track.checkpoints[0].center.x = invalid;
    assert.throws(() => parseTrackDefinition(track), /finite number/);
  }
  const track = fixture(); track.checkpoints[0].halfExtents.z = 0;
  assert.throws(() => parseTrackDefinition(track), /positive/);
});
test('rejects missing finish, duplicate ids and unknown successors', () => {
  const missing = fixture(); missing.startCheckpointId = 'absent';
  assert.throws(() => parseTrackDefinition(missing), /missing finish/);
  const duplicate = fixture(); duplicate.checkpoints[1].id = 'finish';
  assert.throws(() => parseTrackDefinition(duplicate), /unique checkpoints/);
  const dangling = fixture(); dangling.checkpoints[1].next = ['absent'];
  assert.throws(() => parseTrackDefinition(dangling), /unknown successor/);
});
test('rejects dead ends, repeated edges and self loops', () => {
  for (const next of [[], ['main', 'main'], ['entry']]) {
    const track = fixture(); track.checkpoints[1].next = next;
    assert.throws(() => parseTrackDefinition(track));
  }
});
test('rejects unreachable checkpoints and cycles bypassing finish', () => {
  const unreachable = fixture(); unreachable.checkpoints[1].next = ['main'];
  assert.throws(() => parseTrackDefinition(unreachable), /unreachable/);
  const cycle = fixture(); cycle.checkpoints[4].next = ['entry', 'finish'];
  assert.throws(() => parseTrackDefinition(cycle), /cycle bypasses/);
});
test('rejects missing, duplicate, invalid and malformed spawn slots', () => {
  const missing = fixture(); missing.spawnSlots.pop();
  assert.throws(() => parseTrackDefinition(missing), /eight unique/);
  const duplicate = fixture(); duplicate.spawnSlots[0].slotId = 1;
  assert.throws(() => parseTrackDefinition(duplicate), /eight unique/);
  for (const slotId of [-1, 8, 0.5, '0']) {
    const track = fixture(); track.spawnSlots[0].slotId = slotId;
    assert.throws(() => parseTrackDefinition(track), /slot 0–7/);
  }
  const yaw = fixture(); yaw.spawnSlots[0].yaw = Infinity;
  assert.throws(() => parseTrackDefinition(yaw), /finite number/);
});

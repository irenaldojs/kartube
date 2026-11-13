import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalTrackBytes, computeTrackChecksum, parseTrackDefinition, parseVerifiedTrackDefinition } from '@kartube/game-data';
const read = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
const fixture = () => JSON.parse(read('track-definition.json'));
test('canonical bytes and SHA-256 match independent golden fixture', async () => {
  const track = await parseVerifiedTrackDefinition(fixture());
  assert.equal(Buffer.from(canonicalTrackBytes(track)).toString('hex'), read('track-canonical.hex').trim());
  assert.equal(await computeTrackChecksum(track), track.checksum);
});
test('shared TS/Rust mutation cases match structural and checksum outcomes', async () => {
  for (const example of JSON.parse(read('track-cases.json'))) {
    const value = fixture();
    for (const patch of example.patches) {
      const keys = patch.path.slice(1).split('/');
      let target = value;
      for (const key of keys.slice(0, -1)) target = target[key];
      target[keys.at(-1)!] = patch.value;
    }
    let structural = true;
    try { parseTrackDefinition(value); } catch { structural = false; }
    assert.equal(structural, example.structural, example.name);
    let verified = true;
    try { await parseVerifiedTrackDefinition(value); } catch { verified = false; }
    assert.equal(verified, example.verified, example.name);
  }
});
test('canonicalization ignores list order, object keys, unknown metadata and negative zero', async () => {
  const track = fixture();
  track.checkpoints.reverse(); track.spawnSlots.reverse();
  for (const c of track.checkpoints) c.next.reverse();
  track.spawnSlots[0].position.y = -0;
  track.editorNote = 'not gameplay';
  assert.equal((await parseVerifiedTrackDefinition(track)).checksum, fixture().checksum);
});

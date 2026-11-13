import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeServerMessage, encodeServerMessage } from '@kartube/protocol';
const cases = JSON.parse(readFileSync(new URL('../fixtures/server-messages.json', import.meta.url), 'utf8'));
test('shared server wire cases and roundtrip match the Rust codec', () => {
  for (const example of cases) {
    const result = decodeServerMessage(example.raw);
    assert.equal(result.ok, example.ok, example.name);
    if (!result.ok) assert.equal(result.code, example.code, example.name);
    else assert.deepEqual(decodeServerMessage(encodeServerMessage(result.message)), result, example.name);
  }
});
test('server encoder rejects non-finite values before JSON can replace them with null', () => {
  const example = JSON.parse(cases.find(c => c.name === 'race_result').raw);
  example.payload.result.positions[7].finishTick = NaN;
  assert.throws(() => encodeServerMessage(example), /Invalid server message/);
});
test('decoder never accepts nullable fields omitted from a message', () => {
  const example = JSON.parse(cases.find(c => c.name === 'snapshot').raw);
  delete example.payload.snapshot.participants[0].finishTick;
  assert.equal(decodeServerMessage(JSON.stringify(example)).ok, false);
});

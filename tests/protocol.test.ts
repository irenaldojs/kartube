import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ClientMessageGate, decodeClientMessage, MAX_MESSAGE_BYTES } from '@kartube/protocol';

const hello = { protocolVersion: 1, eventId: 'hello-1', seq: 0, payload: { type: 'hello', build: 'dev' } };
const input = { protocolVersion: 1, eventId: 'input-1', seq: 1, payload: { type: 'input', raceId: 'race-1', input: { seq: 0, clientTick: 0, steer: 0, throttle: 1, brake: 0, drift: false, jump: false, useItem: false } } };

test('decodes canonical protocol fixtures', () => {
  const fixtures = JSON.parse(readFileSync(new URL('../fixtures/client-messages.json', import.meta.url), 'utf8'));
  for (const fixture of fixtures) {
    const result = decodeClientMessage(fixture.raw);
    assert.equal(result.ok, fixture.ok, fixture.name);
    if (!result.ok) assert.equal(result.code, fixture.code, fixture.name);
  }
});
test('rejects malformed envelopes and input without trusting casts', () => {
  for (const value of [null, [], {}, { ...hello, seq: -1 }, { ...hello, seq: 1.5 },
    { ...hello, eventId: '' }, { ...hello, payload: { type: 'unknown' } },
    { ...input, payload: { ...input.payload, input: { ...input.payload.input, throttle: 2 } } }]) {
    assert.equal(decodeClientMessage(JSON.stringify(value)).ok, false);
  }
});
test('limits UTF-8 bytes including multibyte characters', () => {
  assert.deepEqual(decodeClientMessage(' '.repeat(MAX_MESSAGE_BYTES + 1)), { ok: false, code: 'too_large' });
  assert.deepEqual(decodeClientMessage('é'.repeat(MAX_MESSAGE_BYTES / 2 + 1)), { ok: false, code: 'too_large' });
  assert.deepEqual(decodeClientMessage('🚗'.repeat(MAX_MESSAGE_BYTES / 4 + 1)), { ok: false, code: 'too_large' });
});
test('requires handshake, rejects replay and preserves state on rejection', () => {
  const gate = new ClientMessageGate();
  const h = decodeClientMessage(JSON.stringify(hello));
  const i = decodeClientMessage(JSON.stringify(input));
  assert.ok(h.ok && i.ok);
  assert.equal(gate.accept(i.message), 'hello_required');
  assert.equal(gate.accept(h.message), 'accepted');
  assert.equal(gate.accept(h.message), 'stale');
  assert.equal(gate.accept({ ...h.message, seq: 5 }), 'already_initialized');
  assert.equal(gate.accept(i.message), 'accepted');
  assert.equal(gate.accept(i.message), 'stale');
  assert.equal(gate.accept({ ...i.message, seq: 0 }), 'stale');
});

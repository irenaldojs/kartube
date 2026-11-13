import assert from 'node:assert/strict';
import { once } from 'node:events';
import { decodeServerMessage } from '@kartube/protocol';
const socket = new WebSocket('ws://127.0.0.1:3001/ws');
const timer = setTimeout(() => { console.error('WebSocket smoke timed out'); process.exit(1); }, 5000);
try {
  await once(socket, 'open');
  let serverSeq = 0;
  async function exchange(message) {
    const reply = once(socket, 'message');
    socket.send(JSON.stringify(message));
    const result = decodeServerMessage((await reply)[0].data);
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(result.message.seq, serverSeq++);
    return result.message;
  }
  const hello = { protocolVersion: 1, eventId: 'smoke-hello', seq: 0, payload: { type: 'hello', build: 'smoke' } };
  assert.equal((await exchange({ ...hello, protocolVersion: 2 })).payload.code, 'incompatible_version');
  assert.equal((await exchange(hello)).payload.type, 'welcome');
  assert.equal((await exchange(hello)).payload.code, 'stale');
  const input = { ...hello, seq: 1, eventId: 'smoke-input', payload: { type: 'input', raceId: 'test', input: { seq: 0, clientTick: 0, steer: 0, throttle: 1, brake: 0, drift: false, jump: false, useItem: false } } };
  assert.equal((await exchange(input)).payload.type, 'input_ack');
  assert.equal((await exchange({ ...input, seq: 2, payload: { ...input.payload, input: { ...input.payload.input, steer: 2 } } })).payload.code, 'invalid_message');
  console.log('WebSocket smoke passed: version, handshake, replay, input and invalid input');
} finally { clearTimeout(timer); socket.close(); }

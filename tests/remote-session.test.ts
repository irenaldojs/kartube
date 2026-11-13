import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RemoteRaceSession } from '@kartube/network-client';
import { encodeServerMessage } from '@kartube/protocol';
import type { RaceEvent, RaceSnapshot } from '@kartube/game-core';
import type { RaceTransport, TransportHandlers } from '@kartube/network-client';
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/server-messages.json', import.meta.url), 'utf8'));
function payload(name: string) { return JSON.parse(fixtures.find(c => c.name === name).raw).payload; }
const frame = (seq = 0) => ({ seq, clientTick: 100, steer: 0, throttle: 1, brake: 0, drift: false, jump: false, useItem: false });
class FakeTransport implements RaceTransport {
  isOpen = false;
  handlers: TransportHandlers | null = null;
  sent: string[] = [];
  closeCount = 0;
  subscribe(handlers: TransportHandlers) { this.handlers = handlers; return () => { this.handlers = null; }; }
  send(raw: string) { this.sent.push(raw); }
  close() { this.closeCount++; this.isOpen = false; }
  open() { this.isOpen = true; this.handlers?.open(); }
}
function setup() {
  const transport = new FakeTransport();
  const errors: unknown[] = [];
  const snapshot = payload('snapshot').snapshot as RaceSnapshot;
  const session = new RemoteRaceSession({ transport, config: snapshot.config, localSlotId: 0, build: 'test', onListenerError: error => errors.push(error) });
  const events: RaceEvent[] = [];
  session.subscribe(event => events.push(event));
  let seq = 0;
  const send = (body: any, eventId = `server-${seq}`) => {
    transport.handlers?.message(encodeServerMessage({ protocolVersion: 1, eventId, seq: seq++, payload: body }));
  };
  const connect = () => { transport.open(); send(payload('welcome')); };
  return { transport, session, errors, events, send, connect, snapshot };
}
test('handshakes once and queues validated racing inputs with independent sequence', () => {
  const { session, transport, connect, send } = setup();
  assert.throws(() => session.submitInput(frame()), /disconnected/);
  connect(); transport.open();
  assert.equal(transport.sent.length, 1);
  assert.equal(JSON.parse(transport.sent[0]!).payload.type, 'hello');
  assert.equal(session.getConnectionState(), 'connected');
  assert.throws(() => session.submitInput(frame()), /not racing/);
  send(payload('snapshot'));
  session.submitInput(frame()); session.submitInput(frame(1));
  assert.deepEqual(transport.sent.map(raw => JSON.parse(raw).seq), [0, 1, 2]);
  assert.equal(JSON.parse(transport.sent[1]!).payload.raceId, 'race-1');
  assert.throws(() => session.submitInput(frame(1)), /stale/);
  assert.throws(() => session.submitInput({ ...frame(2), throttle: 2 }), /Invalid/);
  send({ type: 'input_ack', inputSeq: 1 });
  assert.equal(session.getConnectionState(), 'connected');
  session.dispose();
});
test('ignores replayed sequence and disconnects on a gap or reused event identity', () => {
  const first = setup(); first.connect(); first.send(payload('snapshot'));
  first.transport.handlers?.message(encodeServerMessage({ protocolVersion: 1, eventId: 'server-1', seq: 1, payload: payload('snapshot') }));
  assert.equal(first.events.filter(e => e.type === 'snapshot').length, 1);
  first.transport.handlers?.message(encodeServerMessage({ protocolVersion: 1, eventId: 'gap', seq: 3, payload: payload('error') }));
  assert.ok(first.events.some(e => e.type === 'error' && e.code === 'sequence_gap'));
  assert.equal(first.transport.handlers, null);
  const second = setup(); second.connect(); second.send(payload('snapshot'), 'server-0');
  assert.ok(second.events.some(e => e.type === 'error' && e.code === 'duplicate_event'));
});
test('rejects binary/malformed messages and events before welcome', () => {
  for (const data of ['{', new Uint8Array(2)]) {
    const { transport, session } = setup(); transport.open(); transport.handlers?.message(data);
    assert.equal(session.getConnectionState(), 'disconnected'); assert.equal(transport.closeCount, 1);
  }
  const state = setup(); state.transport.open(); state.send(payload('snapshot'));
  assert.ok(state.events.some(e => e.type === 'error' && e.code === 'welcome_required'));
});
test('keeps accepted state intact when configuration or continuity is invalid', () => {
  for (const change of [s => { s.config.track.checksum = 'b'.repeat(64); }, s => { s.participants[0].driverId = 'other'; }, s => { s.serverTick = 100; }]) {
    const state = setup(); state.connect(); state.send(payload('snapshot'));
    const previous = state.session.getSnapshot();
    const next = payload('snapshot'); next.snapshot.serverTick = 101; change(next.snapshot);
    state.send(next);
    assert.equal(state.session.getSnapshot(), previous);
    assert.equal(state.session.getConnectionState(), 'disconnected');
  }
});
test('applies same-race events in tick order, and rejects cross-race or old events', () => {
  const state = setup(); state.connect(); state.send(payload('snapshot'));
  state.send(payload('checkpoint_ack')); state.send(payload('item_granted')); state.send(payload('item_used'));
  assert.deepEqual(state.events.slice(-3).map(e => e.type), ['checkpoint_ack', 'item_granted', 'item_used']);
  state.send({ ...payload('item_used'), serverTick: 99 });
  assert.equal(state.session.getConnectionState(), 'disconnected');
  const other = setup(); other.connect(); other.send(payload('snapshot'));
  other.send({ ...payload('item_used'), raceId: 'other' });
  assert.equal(other.session.getConnectionState(), 'disconnected');
});
test('emits result once after the matching final snapshot', () => {
  const state = setup(); state.connect(); state.send(payload('snapshot'));
  const final = payload('snapshot'); final.snapshot.phase = 'finished'; final.snapshot.serverTick = 200;
  const result = payload('race_result');
  for (const entry of result.result.positions) {
    const p = final.snapshot.participants[entry.slotId]; p.finishTick = entry.finishTick; p.completedLaps = entry.status === 'finished' ? 3 : 1;
  }
  state.send(final); state.send(result); state.send(result);
  assert.equal(state.events.filter(e => e.type === 'race_result').length, 1);
  state.send({ type: 'race_result', result: { ...result.result, resultId: 'conflict' } });
  assert.equal(state.session.getConnectionState(), 'disconnected');
});
test('rejects result before final state and unknown input acknowledgement', () => {
  const state = setup(); state.connect(); state.send(payload('snapshot')); state.send(payload('race_result'));
  assert.equal(state.events.filter(e => e.type === 'race_result').length, 0);
  assert.equal(state.session.getConnectionState(), 'disconnected');
  const ack = setup(); ack.connect(); ack.send({ type: 'input_ack', inputSeq: 0 });
  assert.ok(ack.events.some(e => e.type === 'error' && e.code === 'unknown_input_ack'));
});
test('freezes state and isolates failing listeners', () => {
  const state = setup(); state.connect();
  state.session.subscribe(() => { throw new Error('listener failure'); });
  let delivered = 0; state.session.subscribe(() => delivered++);
  state.send(payload('snapshot'));
  assert.equal(delivered, 1); assert.equal(state.errors.length, 1);
  assert.throws(() => { state.session.getSnapshot()!.participants[0]!.position.x = 99; }, TypeError);
  assert.equal(state.session.getSnapshot()!.participants[0]!.position.x, 0.1);
  state.session.dispose();
});
test('unsubscribe and dispose are idempotent and callbacks stop after disposal', () => {
  const state = setup(); state.connect(); state.send(payload('snapshot'));
  const retained = state.session.getSnapshot(); const handlers = state.transport.handlers!;
  const off = state.session.subscribe(() => { throw new Error('removed'); }); off(); off();
  const count = state.events.length;
  state.session.dispose(); state.session.dispose();
  handlers.message('{}'); handlers.close(); handlers.error(); handlers.open();
  assert.equal(state.events.length, count); assert.equal(state.transport.handlers, null); assert.equal(state.transport.closeCount, 1);
  assert.equal(state.session.getSnapshot(), retained);
  assert.throws(() => state.session.subscribe(() => {}), /disposed/);
  assert.throws(() => state.session.submitInput(frame()), /disposed/);
});
test('transport failure detaches once and bot-controlled local slot cannot send input', () => {
  const state = setup(); state.connect();
  const snapshot = payload('snapshot'); snapshot.snapshot.participants[0].controller = 'bot'; state.send(snapshot);
  assert.throws(() => state.session.submitInput(frame()), /not racing/);
  const handlers = state.transport.handlers!; handlers.error(); handlers.close();
  assert.equal(state.transport.closeCount, 1);
  assert.equal(state.events.filter(e => e.type === 'connection' && e.state === 'disconnected').length, 1);
});
test('an already-open transport sends hello once, and send failures terminate cleanly', () => {
  const transport = new FakeTransport(); transport.isOpen = true;
  const session = new RemoteRaceSession({ transport, config: payload('snapshot').snapshot.config, localSlotId: 0, build: 'test' });
  assert.equal(transport.sent.length, 1); transport.open(); assert.equal(transport.sent.length, 1);
  session.dispose();
  const state = setup(); state.connect(); state.send(payload('snapshot'));
  state.transport.send = () => { throw new Error('network failure'); };
  assert.throws(() => state.session.submitInput(frame()), /send failed/);
  assert.equal(state.transport.closeCount, 1); assert.equal(state.transport.handlers, null);
});
test('rejects terminal snapshots and does not allow a locally finished kart to send input', () => {
  const state = setup(); state.connect();
  const snapshot = payload('snapshot'); snapshot.snapshot.serverTick = 110;
  snapshot.snapshot.participants[0].completedLaps = 3; snapshot.snapshot.participants[0].finishTick = 110;
  state.send(snapshot);
  assert.throws(() => state.session.submitInput(frame()), /not racing/);
  const next = payload('snapshot'); next.snapshot.serverTick = 120; next.snapshot.phase = 'finished';
  next.snapshot.participants[0] = snapshot.snapshot.participants[0];
  state.send(next);
  next.snapshot.serverTick = 121; state.send(next);
  assert.equal(state.session.getConnectionState(), 'disconnected');
  assert.equal(state.session.getSnapshot()!.serverTick, 120);
});
test('copies expected configuration and build before the transport opens', () => {
  const transport = new FakeTransport();
  const options = { transport, config: payload('snapshot').snapshot.config, localSlotId: 0, build: 'test' };
  const session = new RemoteRaceSession(options);
  options.config.laps = 4; options.build = 'changed invalid';
  transport.open();
  assert.equal(JSON.parse(transport.sent[0]!).payload.build, 'test');
  transport.handlers!.message(encodeServerMessage({ protocolVersion: 1, eventId: 's-0', seq: 0, payload: payload('welcome') }));
  transport.handlers!.message(encodeServerMessage({ protocolVersion: 1, eventId: 's-1', seq: 1, payload: payload('snapshot') }));
  assert.equal(session.getSnapshot()!.config.laps, 3);
  session.dispose();
});

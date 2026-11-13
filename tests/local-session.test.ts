import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LocalRaceSession, RACE_POINTS } from '@kartube/game-core';
import { RemoteRaceSession } from '@kartube/network-client';
import { encodeServerMessage } from '@kartube/protocol';
import type { InputFrame, LocalRaceAuthority, LocalAuthorityFrame, RaceSnapshot, RaceEvent } from '@kartube/game-core';
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/server-messages.json', import.meta.url), 'utf8'));
const seed = () => JSON.parse(fixtures.find(c => c.name === 'snapshot').raw).payload.snapshot as RaceSnapshot;
function state(phase: RaceSnapshot['phase'], tick: number): RaceSnapshot {
  return { ...seed(), phase, serverTick: tick, startTick: phase === 'waiting' ? null : 2 };
}
function finalFrame(): LocalAuthorityFrame {
  const snapshot = { ...state('finished', 3), participants: seed().participants.map(p => ({ ...p, completedLaps: p.slotId < 7 ? 3 : 1, finishTick: p.slotId < 7 ? 3 : null })) };
  return { snapshot, events: [{ type: 'race_result', result: { raceId: snapshot.config.raceId, resultId: 'result-local', startTick: 2, endTick: 3,
    positions: snapshot.participants.map((p, i) => ({ slotId: p.slotId, position: i + 1, points: RACE_POINTS[i]!, status: p.finishTick === null ? 'dnf' : 'finished', finishTick: p.finishTick })) } }] };
}
const input = (seq = 0): InputFrame => ({ seq, clientTick: 2, steer: 0, throttle: 1, brake: 0, drift: false, jump: false, useItem: false });
class ScriptedAuthority implements LocalRaceAuthority {
  initialSnapshot = state('waiting', 0);
  frames: LocalAuthorityFrame[] = [{ snapshot: state('countdown', 1), events: [] }, { snapshot: state('racing', 2), events: [] }, finalFrame()];
  inputs: (InputFrame | null)[] = [];
  disposeCount = 0;
  step(frame: InputFrame | null) { this.inputs.push(frame); const next = this.frames.shift(); if (!next) throw new Error('No scripted frame'); return next; }
  dispose() { this.disposeCount++; }
}
function setup(authority = new ScriptedAuthority()) {
  const errors: unknown[] = [];
  const session = new LocalRaceSession({ authority, localSlotId: 0, onError: error => errors.push(error) });
  const events: RaceEvent[] = []; session.subscribe(event => events.push(event));
  return { authority, session, errors, events };
}
test('offline reference runs all lifecycle phases and produces one official result', () => {
  const { session, authority, events } = setup();
  assert.equal(session.mode, 'local'); assert.equal(session.getSnapshot().phase, 'waiting');
  assert.equal(events.length, 0);
  assert.throws(() => session.submitInput(input()), /not racing/);
  session.advance(); session.advance(); session.submitInput(input()); session.advance();
  assert.deepEqual(events.map(e => e.type), ['snapshot', 'snapshot', 'snapshot', 'race_result']);
  assert.deepEqual(authority.inputs, [null, null, input()]);
  assert.equal(session.getSnapshot().participants.length, 8); assert.equal(authority.disposeCount, 1);
  assert.throws(() => session.advance(), /stopped/); session.dispose(); session.dispose(); assert.equal(authority.disposeCount, 1);
});
test('consumes only the latest input once and freezes it independently of the caller', () => {
  const { authority, session } = setup(); session.advance(); session.advance();
  authority.frames = [{ snapshot: state('racing', 3), events: [] }, { snapshot: state('racing', 4), events: [] }];
  session.submitInput(input()); const latest = { ...input(1) }; session.submitInput(latest); latest.throttle = 0;
  assert.throws(() => session.submitInput(input(1)), /stale/);
  assert.throws(() => session.submitInput({ ...input(2), steer: 2 }), /Invalid/);
  session.advance(); session.advance();
  assert.equal(authority.inputs[2]?.throttle, 1); assert.equal(authority.inputs[3], null);
  assert.ok(Object.isFrozen(authority.inputs[2])); session.dispose();
});
test('rejects invalid initial authority and multiple offline humans', () => {
  const authority = new ScriptedAuthority();
  authority.initialSnapshot = state('racing', 2);
  assert.throws(() => setup(authority), /start waiting/);
  authority.initialSnapshot = state('waiting', 0);
  authority.initialSnapshot = { ...authority.initialSnapshot, participants: authority.initialSnapshot.participants.map(p => p.slotId === 1 ? { ...p, controller: 'human' } : p) };
  assert.throws(() => setup(authority), /one local human/);
  assert.throws(() => new LocalRaceSession({ authority: new ScriptedAuthority(), localSlotId: 1 }), /one local human/);
  assert.throws(() => new LocalRaceSession({ authority: new ScriptedAuthority(), localSlotId: 8 }), /Invalid local slot/);
});
test('invalid authority batches never publish a partial snapshot and permanently stop the session', () => {
  const { session, authority, events } = setup(); session.advance(); const previous = session.getSnapshot();
  authority.frames[0] = { snapshot: state('racing', 2), events: [{ type: 'item_granted', raceId: 'other', slotId: 0, instanceId: 'i', itemType: 'boost', serverTick: 2 }] };
  assert.throws(() => session.advance(), /context/);
  assert.equal(session.getSnapshot(), previous); assert.equal(events.filter(e => e.type === 'snapshot').length, 1);
  assert.equal(events.at(-1)?.type, 'error'); assert.equal(authority.disposeCount, 1);
  assert.throws(() => session.advance(), /stopped/); session.dispose(); assert.equal(authority.disposeCount, 1);
});
test('rejects tick gaps and invalid transitions without advancing published state', () => {
  for (const next of [{ ...state('countdown', 2), startTick: 3 }, state('racing', 2)]) {
    const authority = new ScriptedAuthority(); authority.frames = [{ snapshot: next, events: [] }];
    const { session } = setup(authority);
    assert.throws(() => session.advance()); assert.equal(session.getSnapshot().serverTick, 0); session.dispose();
  }
});
test('final batch must contain exactly one result tied to the final snapshot', () => {
  for (const mutate of [f => { f.events = []; }, f => { f.events.push(f.events[0]); }, f => { f.events[0].result.endTick = 4; }]) {
    const { session, authority, events } = setup(); session.advance(); session.advance();
    const frame = structuredClone(finalFrame()); mutate(frame); authority.frames = [frame];
    assert.throws(() => session.advance()); assert.equal(session.getSnapshot().phase, 'racing');
    assert.equal(events.filter(e => e.type === 'race_result').length, 0); session.dispose();
  }
});
test('aborted races stop and release authority without emitting a result', () => {
  const { authority, session, events } = setup(); session.advance(); authority.frames = [{ snapshot: state('aborted', 2), events: [] }]; session.advance();
  assert.equal(session.getSnapshot().phase, 'aborted'); assert.equal(events.filter(e => e.type === 'race_result').length, 0);
  assert.equal(authority.disposeCount, 1); assert.throws(() => session.submitInput(input()), /stopped/);
});
test('dispatch isolates listener errors and forbids reentrant stepping', () => {
  const { session, errors } = setup(); let delivered = 0;
  session.subscribe(() => { throw new Error('listener'); });
  session.subscribe(() => { delivered++; assert.throws(() => session.advance(), /Reentrant/); });
  session.advance(); assert.equal(delivered, 1); assert.equal(errors.length, 1); assert.equal(session.getSnapshot().phase, 'countdown'); session.dispose();
});
test('disposal during final snapshot suppresses remaining callbacks and cleans up once', () => {
  const { authority, session, events } = setup(); session.advance(); session.advance();
  session.subscribe(event => { if (event.type === 'snapshot') session.dispose(); });
  session.advance(); assert.equal(events.filter(e => e.type === 'race_result').length, 0); assert.equal(authority.disposeCount, 1);
  session.dispose(); assert.throws(() => session.subscribe(() => {}), /disposed/); assert.throws(() => session.advance(), /disposed/);
});
test('handles authority step/dispose exceptions while retaining last valid state', () => {
  const { session, authority, errors } = setup(); const retained = session.getSnapshot();
  authority.step = () => { throw new Error('simulation failed'); }; authority.dispose = () => { authority.disposeCount++; throw new Error('cleanup failed'); };
  assert.throws(() => session.advance(), /simulation failed/); assert.equal(session.getSnapshot(), retained); assert.equal(errors.length, 1);
  session.dispose(); assert.equal(authority.disposeCount, 1);
});
test('shared consumer observes identical lifecycle events from local and remote RaceSession', () => {
  const local = setup();
  local.authority.frames[1] = { snapshot: state('racing', 2), events: [
    { type: 'checkpoint_ack', raceId: 'race-1', slotId: 0, checkpointId: 'gate-1', accepted: true, reason: null, serverTick: 2 },
    { type: 'item_granted', raceId: 'race-1', slotId: 0, instanceId: 'item-1', itemType: 'boost', serverTick: 2 },
    { type: 'item_used', raceId: 'race-1', slotId: 0, instanceId: 'item-1', targetSlotId: null, serverTick: 2 },
  ] };
  let handlers: any; const sent: string[] = [];
  const remote = new RemoteRaceSession({ config: seed().config, localSlotId: 0, build: 'test', transport: {
    isOpen: true, subscribe(h) { handlers = h; return () => { handlers = null; }; }, send(raw) { sent.push(raw); }, close() {},
  } });
  let seq = 0;
  const deliver = (payload: any) => handlers.message(encodeServerMessage({ protocolVersion: 1, eventId: `event-${seq}`, seq: seq++, payload }));
  deliver({ type: 'welcome', connectionId: 'reference' }); deliver({ type: 'snapshot', snapshot: state('waiting', 0) });
  const remoteEvents: RaceEvent[] = []; remote.subscribe(event => remoteEvents.push(event));
  for (const frame of structuredClone(local.authority.frames)) {
    local.session.advance(); deliver({ type: 'snapshot', snapshot: frame.snapshot }); for (const event of frame.events) deliver(event);
  }
  assert.deepEqual(local.events, remoteEvents); assert.deepEqual(local.session.getSnapshot(), remote.getSnapshot());
  assert.throws(() => { local.session.getSnapshot().participants[0]!.position.x = 99; }, TypeError);
  assert.throws(() => { remote.getSnapshot()!.participants[0]!.position.x = 99; }, TypeError);
  local.session.dispose(); remote.dispose(); assert.equal(handlers, null);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RemoteRaceSession, createWebSocketTransport } from '@kartube/network-client';
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/server-messages.json', import.meta.url), 'utf8'));
const { config } = JSON.parse(fixtures.find(c => c.name === 'snapshot').raw).payload.snapshot;
// Pre-provisioned fixture allocation: the diagnostic server has no authoritative lobby yet.
const session = new RemoteRaceSession({ config, localSlotId: 0, build: 'smoke', transport: createWebSocketTransport('ws://127.0.0.1:3001/ws') });
let timer;
let unsubscribe = () => {};
try {
  await new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Remote session handshake timed out')), 5000);
    unsubscribe = session.subscribe(event => {
      if (event.type === 'error') reject(new Error(event.code));
      if (event.type === 'connection' && event.state === 'connected') resolve();
    });
  });
  assert.equal(session.getConnectionState(), 'connected');
  assert.equal(session.getSnapshot(), null);
  console.log('Remote session smoke passed: transport → hello → Rust welcome → connected');
} finally { clearTimeout(timer); unsubscribe(); session.dispose(); }

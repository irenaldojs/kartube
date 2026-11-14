import assert from 'node:assert/strict';
import test from 'node:test';
import { createAudioProbe } from '../apps/web/src/audio-probe.ts';

test('cancelling a pending audio resume closes its context and prevents a late tone', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  let resume!: () => void, closed = 0, contexts = 0;
  class Context {
    state = 'suspended';
    constructor() { contexts++; }
    resume() { return new Promise<void>(resolve => { resume = resolve; }); }
    close() { this.state = 'closed'; closed++; return Promise.resolve(); }
    createOscillator() { throw new Error('A cancelled probe must never create a tone'); }
  }
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
  try {
    const probe = createAudioProbe(() => {});
    const pending = probe.play();
    await probe.play(); assert.equal(contexts, 1);
    probe.cancel(); resume(); await pending;
    assert.equal(closed, 1); assert.equal(probe.report.activeContexts, 0);
    assert.equal(probe.report.status, 'cancelled');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'AudioContext', previous);
    else Reflect.deleteProperty(globalThis, 'AudioContext');
  }
});

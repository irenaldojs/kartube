import assert from 'node:assert/strict';
import test from 'node:test';
import { createFrameSample, readHeap } from '../apps/web/src/diagnostics.ts';

test('frame measurements retain stalls without the physics clamp and bound the sample window', () => {
  const sample = createFrameSample(4);
  for (const ms of [10, 10, 10, 200]) sample.add(ms);
  assert.equal(sample.report.averageFps, 17.4);
  assert.equal(sample.report.frameMsP95, 200);
  assert.equal(sample.report.framesOver50Ms, 1);
  for (const ms of [20, 20, 20, 20, NaN, -1, 0, Infinity]) sample.add(ms);
  assert.equal(sample.report.samples, 4);
  assert.equal(sample.report.averageFps, 50);
  assert.equal(sample.report.frameMsP99, 20);
  assert.equal(sample.report.framesOver50Ms, 0);
  assert.equal(createFrameSample().report.averageFps, null);
});
test('heap estimates explicitly leave total RAM unavailable and tolerate unsupported engines', () => {
  assert.equal(readHeap({} as Performance).usedBytes, null);
  const heap = readHeap({ memory: { usedJSHeapSize: 12, totalJSHeapSize: 20, jsHeapSizeLimit: 50 } } as unknown as Performance);
  assert.equal(heap.usedBytes, 12); assert.equal(heap.totalProcessRamBytes, null);
  assert.equal(readHeap({ memory: {} } as Performance).source, 'unavailable');
});

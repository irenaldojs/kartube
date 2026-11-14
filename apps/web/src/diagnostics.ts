// Bounded samples of visible, unpaused animation intervals; never use the physics clamp.
export function createFrameSample(capacity = 600) {
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Invalid sample capacity');
  const intervals: number[] = [];
  let cursor = 0;
  return {
    add(milliseconds: number) {
      if (!Number.isFinite(milliseconds) || milliseconds <= 0) return;
      intervals[cursor] = milliseconds; cursor = (cursor + 1) % capacity;
    },
    get report() {
      const sorted = intervals.slice().sort((a, b) => a - b);
      const duration = intervals.reduce((sum, value) => sum + value, 0);
      const percentile = (fraction: number) => sorted.length ? Number(sorted[Math.ceil(sorted.length * fraction) - 1]!.toFixed(2)) : null;
      return { scope: 'visible-unpaused-raf-intervals', capacity, samples: intervals.length,
        durationMs: Number(duration.toFixed(2)), averageFps: duration ? Number((intervals.length * 1000 / duration).toFixed(1)) : null,
        frameMsP50: percentile(0.5), frameMsP95: percentile(0.95), frameMsP99: percentile(0.99),
        framesOver50Ms: intervals.filter(value => value > 50).length };
    },
  };
}

export function readHeap(source: Performance = performance) {
  // Chromium-only estimate. It excludes total process, GPU and native/WASM allocations.
  const memory = (source as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (!memory || ![memory.usedJSHeapSize, memory.totalJSHeapSize, memory.jsHeapSizeLimit].every(value => Number.isFinite(value) && value >= 0)) {
    return { source: 'unavailable', usedBytes: null, allocatedBytes: null, limitBytes: null, totalProcessRamBytes: null };
  }
  return { source: 'performance.memory-estimate', usedBytes: memory.usedJSHeapSize, allocatedBytes: memory.totalJSHeapSize,
    limitBytes: memory.jsHeapSizeLimit, totalProcessRamBytes: null };
}

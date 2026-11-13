import type { Checkpoint, TrackDefinition, Vector3 } from './index.ts';

type ObjectValue = Record<string, unknown>;
function fail(path: string, reason: string): never { throw new Error(`${path}: ${reason}`); }
function object(value: unknown, path: string): ObjectValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'expected object');
  return value as ObjectValue;
}
function id(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(value)) fail(path, 'invalid identifier');
  return value;
}
function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected finite number');
  return value;
}
function vector(value: unknown, path: string, positive = false): Vector3 {
  const v = object(value, path);
  const result = { x: number(v.x, `${path}.x`), y: number(v.y, `${path}.y`), z: number(v.z, `${path}.z`) };
  if (positive && Object.values(result).some(n => n <= 0)) fail(path, 'extents must be positive');
  return result;
}
function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'expected array');
  return value;
}

/** Parse untrusted data, then verify every route forms a lap through the finish gate. */
export function parseTrackDefinition(value: unknown): TrackDefinition {
  const t = object(value, 'track');
  if (t.schemaVersion !== 1) fail('schemaVersion', 'unsupported version');
  if (typeof t.version !== 'number' || !Number.isSafeInteger(t.version) || t.version < 1) fail('version', 'expected positive safe integer');
  // Hash verification is asynchronous; use parseVerifiedTrackDefinition at load boundaries.
  if (typeof t.checksum !== 'string' || !/^[0-9a-f]{64}$/.test(t.checksum)) fail('checksum', 'expected lowercase SHA-256 hex');
  const checksum = t.checksum;
  const startCheckpointId = id(t.startCheckpointId, 'startCheckpointId');
  const checkpoints: Checkpoint[] = array(t.checkpoints, 'checkpoints').map((value, index) => {
    const path = `checkpoints[${index}]`;
    const checkpoint = object(value, path);
    const next = array(checkpoint.next, `${path}.next`).map((v, i) => id(v, `${path}.next[${i}]`));
    if (next.length === 0 || new Set(next).size !== next.length) fail(`${path}.next`, 'expected unique nonempty successors');
    return { id: id(checkpoint.id, `${path}.id`), center: vector(checkpoint.center, `${path}.center`),
      halfExtents: vector(checkpoint.halfExtents, `${path}.halfExtents`, true), next };
  });
  const byId = new Map(checkpoints.map(checkpoint => [checkpoint.id, checkpoint]));
  if (checkpoints.length < 2 || byId.size !== checkpoints.length) fail('checkpoints', 'expected at least two unique checkpoints');
  if (!byId.has(startCheckpointId)) fail('startCheckpointId', 'missing finish gate');
  for (const checkpoint of checkpoints) {
    for (const successor of checkpoint.next) {
      if (!byId.has(successor)) fail(`checkpoint ${checkpoint.id}`, `unknown successor ${successor}`);
      if (successor === checkpoint.id) fail(`checkpoint ${checkpoint.id}`, 'self loop');
    }
  }
  const visited = new Set<string>();
  const pending = [startCheckpointId];
  while (pending.length) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of byId.get(current)!.next) pending.push(next);
  }
  if (visited.size !== byId.size) fail('checkpoints', 'unreachable checkpoint');

  // Remove the finish gate: remaining graph must be acyclic. Thus all reachable
  // branches must eventually return through the finish, never loop independently.
  const indegree = new Map(checkpoints.filter(c => c.id !== startCheckpointId).map(c => [c.id, 0]));
  for (const checkpoint of checkpoints) {
    if (checkpoint.id === startCheckpointId) continue;
    for (const next of checkpoint.next) if (next !== startCheckpointId) indegree.set(next, indegree.get(next)! + 1);
  }
  const ready = [...indegree].filter(([, degree]) => degree === 0).map(([key]) => key);
  let processed = 0;
  while (ready.length) {
    const current = ready.pop()!;
    processed++;
    for (const next of byId.get(current)!.next) {
      if (next === startCheckpointId) continue;
      const degree = indegree.get(next)! - 1;
      indegree.set(next, degree);
      if (degree === 0) ready.push(next);
    }
  }
  if (processed !== indegree.size) fail('checkpoints', 'cycle bypasses finish gate');

  const spawnSlots = array(t.spawnSlots, 'spawnSlots').map((value, index) => {
    const path = `spawnSlots[${index}]`;
    const spawn = object(value, path);
    if (typeof spawn.slotId !== 'number' || !Number.isInteger(spawn.slotId) || spawn.slotId < 0 || spawn.slotId > 7) fail(`${path}.slotId`, 'expected slot 0–7');
    return { slotId: spawn.slotId, position: vector(spawn.position, `${path}.position`), yaw: number(spawn.yaw, `${path}.yaw`) };
  });
  if (spawnSlots.length !== 8 || new Set(spawnSlots.map(s => s.slotId)).size !== 8) fail('spawnSlots', 'expected eight unique slots');
  return { schemaVersion: 1, id: id(t.id, 'id'), version: t.version, checksum, startCheckpointId, checkpoints, spawnSlots };
}

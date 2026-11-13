import type { TrackDefinition, Vector3 } from './index.ts';
import { parseTrackDefinition } from './validate-track.ts';

/** v1 binary canonical format. Validate before canonicalization; checksum is excluded. */
export function canonicalTrackBytes(value: TrackDefinition): Uint8Array<ArrayBuffer> {
  const track = parseTrackDefinition(value);
  const bytes: number[] = [];
  const uint32 = (n: number) => {
    const buffer = new ArrayBuffer(4); new DataView(buffer).setUint32(0, n, true);
    for (const byte of new Uint8Array(buffer)) bytes.push(byte);
  };
  const text = (s: string) => { uint32(s.length); for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)); };
  const float = (n: number) => {
    const buffer = new ArrayBuffer(8); new DataView(buffer).setFloat64(0, n === 0 ? 0 : n, true);
    for (const byte of new Uint8Array(buffer)) bytes.push(byte);
  };
  const vector = (v: Vector3) => { float(v.x); float(v.y); float(v.z); };
  for (const c of 'kartube-track-v1\n') bytes.push(c.charCodeAt(0));
  text(track.id);
  const version = new ArrayBuffer(8); new DataView(version).setBigUint64(0, BigInt(track.version), true);
  for (const byte of new Uint8Array(version)) bytes.push(byte);
  text(track.startCheckpointId);
  uint32(track.checkpoints.length);
  const sorted = [...track.checkpoints].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  for (const checkpoint of sorted) {
    text(checkpoint.id); vector(checkpoint.center); vector(checkpoint.halfExtents);
    uint32(checkpoint.next.length);
    for (const next of [...checkpoint.next].sort()) text(next);
  }
  uint32(track.spawnSlots.length);
  for (const spawn of [...track.spawnSlots].sort((a, b) => a.slotId - b.slotId)) {
    uint32(spawn.slotId); vector(spawn.position); float(spawn.yaw);
  }
  return new Uint8Array(bytes);
}
export async function computeTrackChecksum(track: TrackDefinition): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', canonicalTrackBytes(track));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function parseVerifiedTrackDefinition(value: unknown): Promise<TrackDefinition> {
  const track = parseTrackDefinition(value);
  if (await computeTrackChecksum(track) !== track.checksum) throw new Error('checksum: content mismatch');
  return track;
}

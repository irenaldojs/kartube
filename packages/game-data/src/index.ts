export interface Vector3 { readonly x: number; readonly y: number; readonly z: number }
export interface Checkpoint {
  readonly id: string;
  readonly center: Vector3;
  readonly halfExtents: Vector3;
  readonly next: readonly string[];
}
// Coordinates in meters, angles in radians. The finish gate is also a checkpoint.
export interface TrackDefinition {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: number;
  readonly checksum: string;
  readonly startCheckpointId: string;
  readonly checkpoints: readonly Checkpoint[];
  readonly spawnSlots: readonly { readonly slotId: number; readonly position: Vector3; readonly yaw: number }[];
}

export { parseTrackDefinition } from './validate-track.ts';
export { canonicalTrackBytes, computeTrackChecksum, parseVerifiedTrackDefinition } from './track-checksum.ts';

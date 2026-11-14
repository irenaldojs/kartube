import type { DrivingInput } from './driving.ts';
export type RecoveryReason = 'manual' | 'fall' | 'stuck';
export type RecoveryPoint = { x: number; y: number; z: number; yaw: number };
export const RECOVERY_TUNING = { fallHeight: -3, mapLimit: 36, stuckSeconds: 3, progressRadius: 0.5 };
export function createRecoveryDetector(dt: number) {
  let anchor: { x: number; z: number } | null = null, ticks = 0;
  return {
    clear() { anchor = null; ticks = 0; },
    get stuckSeconds() { return ticks * dt; },
    sample(position: { x: number; y: number; z: number }, grounded: boolean, input: DrivingInput): 'fall' | 'stuck' | null {
      if (position.y < RECOVERY_TUNING.fallHeight || Math.abs(position.x) > RECOVERY_TUNING.mapLimit || Math.abs(position.z) > RECOVERY_TUNING.mapLimit) return 'fall';
      if (!grounded || !Number.isFinite(input.throttle) || Math.abs(input.throttle) < 0.2 || input.brake) { anchor = null; ticks = 0; return null; }
      if (!anchor || Math.hypot(position.x - anchor.x, position.z - anchor.z) >= RECOVERY_TUNING.progressRadius) { anchor = { x: position.x, z: position.z }; ticks = 0; }
      ticks++;
      return ticks * dt >= RECOVERY_TUNING.stuckSeconds ? 'stuck' : null;
    },
  };
}

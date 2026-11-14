import { controlKart, createDrivingState, NEUTRAL_INPUT, type DrivingInput } from './driving.ts';
export type MotionPosition = { x: number; y: number; z: number };
export type CollisionQueries = {
  ground(position: MotionPosition, yaw: number, reach: number): number | null;
  sweep(position: MotionPosition, yaw: number, movement: MotionPosition): { fraction: number; normal: MotionPosition } | null;
};
export const MOTION_TUNING = { height: 0.35, gravity: 30, groundReach: 0.18, stepHeight: 0.25, bumpSpeed: 2, bumpSeconds: 1 / 6 };

// Owns all movement. No engine types, rigid bodies, force, mass or contact impulses.
export function createKartMotion(spawn: MotionPosition, gravity = MOTION_TUNING.gravity) {
  let position = { ...spawn }, velocity = { x: 0, y: 0, z: 0 }, yaw = 0, driving = createDrivingState();
  let grounded = false, drifting = false, airControl = false, bumps = 0, bumpTime = 0, bump = { x: 0, z: 0 };
  return {
    reset(point = spawn, heading = 0) {
      position = { ...point }; velocity = { x: 0, y: 0, z: 0 }; yaw = heading; driving = createDrivingState();
      grounded = false; drifting = false; airControl = false; bumpTime = 0;
    },
    step(dt: number, queries: CollisionQueries, input: DrivingInput = NEUTRAL_INPUT, drive = true) {
      const floor = queries.ground(position, yaw, 1.3);
      const gap = floor === null ? Infinity : position.y - floor - MOTION_TUNING.height;
      grounded = gap >= -MOTION_TUNING.stepHeight && gap <= MOTION_TUNING.groundReach && velocity.y <= 0;
      if (drive) {
        const controlled = controlKart(velocity, yaw, grounded, input, dt, driving);
        driving = controlled.state; yaw = controlled.yaw; velocity = controlled.velocity;
        drifting = controlled.drifting; airControl = controlled.airControl;
      }
      if (grounded) { position.y = floor! + MOTION_TUNING.height; velocity.y = 0; }
      else velocity.y -= gravity * dt;
      if (bumpTime > 0) {
        velocity.x = bump.x; velocity.z = bump.z; driving.speed = 0;
        bumpTime = Math.max(0, bumpTime - dt);
      }
      const movement = { x: velocity.x * dt, y: 0, z: velocity.z * dt };
      const hit = queries.sweep(position, yaw, movement);
      const fraction = hit ? Math.max(0, hit.fraction - 0.001) : 1;
      const next = { x: position.x + movement.x * fraction, y: position.y + velocity.y * dt, z: position.z + movement.z * fraction };
      if (hit && bumpTime === 0) {
        const length = Math.hypot(hit.normal.x, hit.normal.z);
        if (length > 0.01) {
          bump = { x: hit.normal.x / length * MOTION_TUNING.bumpSpeed, z: hit.normal.z / length * MOTION_TUNING.bumpSpeed };
          bumpTime = MOTION_TUNING.bumpSeconds; bumps++; driving = createDrivingState(); drifting = false;
          velocity.x = bump.x; velocity.z = bump.z;
        }
      }
      const landing = queries.ground({ ...next, y: Math.max(position.y, next.y) }, yaw, Math.abs(velocity.y * dt) + 1.3);
      const target = landing === null ? null : landing + MOTION_TUNING.height;
      // Ground is height-only. Downward crossings land; small climbs follow ramps without impulses.
      if (target !== null && velocity.y <= 0 && next.y <= target && target - position.y <= MOTION_TUNING.stepHeight) {
        next.y = target; velocity.y = 0; grounded = true;
      } else if (grounded && (target === null || next.y - target > MOTION_TUNING.groundReach)) grounded = false;
      position = next;
    },
    get position() { return { ...position }; },
    get yaw() { return yaw; },
    get state() { return { grounded, drifting, airControl, bumps, driving: { ...driving }, velocity: { ...velocity } }; },
    get pose() { return { ...position, yaw, visualYawOffset: driving.visualYawOffset,
      visualRoll: -driving.steering * (drifting ? 0.08 : 0.04) * Math.min(Math.hypot(velocity.x, velocity.z) / 4, 1) }; },
  };
}

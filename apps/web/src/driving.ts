export type DrivingInput = { throttle: number; steering: number; brake: boolean; drift?: boolean };
export const NEUTRAL_INPUT: DrivingInput = { throttle: 0, steering: 0, brake: false, drift: false };
// Metres, seconds and radians. Drift has no mini-boost yet.
export const KART_TUNING = {
  maxSpeed: 12, reverseSpeed: 4, acceleration: 8, braking: 18,
  rollingDrag: 1.8, grip: 12, turnRate: 1.9,
  driftGrip: 2.2, driftTurnMultiplier: 1.3, driftMinSpeed: 4,
  airTurnRate: 0.65, airVelocityTurn: 0.35,
};
const approach = (value: number, target: number, amount: number) => value + Math.max(-amount, Math.min(amount, target - value));
const axis = (value: number) => Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function controlKart(velocity: { x: number; y: number; z: number }, yaw: number, grounded: boolean, input: DrivingInput, dt: number) {
  const tuning = KART_TUNING, throttle = axis(input.throttle), steering = axis(input.steering);
  const forwardX = -Math.sin(yaw), forwardZ = -Math.cos(yaw);
  const projected = velocity.x * forwardX + velocity.z * forwardZ;
  const drifting = grounded && input.drift === true && projected >= tuning.driftMinSpeed && !input.brake && throttle >= 0;
  if (!grounded) {
    const airControl = Math.hypot(velocity.x, velocity.z) > 0.5 && steering !== 0;
    const turn = airControl ? -steering * tuning.airTurnRate * dt : 0;
    const angle = turn * tuning.airVelocityTurn;
    return { yaw: wrap(yaw + turn), velocity: { x: velocity.x * Math.cos(angle) + velocity.z * Math.sin(angle), y: velocity.y,
      z: -velocity.x * Math.sin(angle) + velocity.z * Math.cos(angle) }, drifting: false, airControl };
  }
  let speed = projected;
  if (input.brake) speed = approach(speed, 0, tuning.braking * dt);
  else if (throttle !== 0) speed = approach(speed, throttle > 0 ? tuning.maxSpeed * throttle : tuning.reverseSpeed * throttle,
    (speed * throttle < 0 ? tuning.braking : tuning.acceleration) * dt);
  else speed = approach(speed, 0, tuning.rollingDrag * dt);
  const heading = wrap(yaw - steering * tuning.turnRate * (drifting ? tuning.driftTurnMultiplier : 1) * Math.min(Math.abs(speed) / 4, 1) * Math.sign(speed) * dt);
  const targetX = -Math.sin(heading), targetZ = -Math.cos(heading);
  let x: number, z: number;
  if (drifting) {
    // Preserve momentum while the nose turns. Throttle changes speed without creating energy from sideways slip.
    const magnitude = Math.hypot(velocity.x, velocity.z);
    const targetSpeed = approach(magnitude, throttle > 0 ? tuning.maxSpeed * throttle : 0, (throttle > 0 ? tuning.acceleration : tuning.rollingDrag) * dt);
    const blend = 1 - Math.exp(-tuning.driftGrip * dt);
    x = velocity.x + (targetX * targetSpeed - velocity.x) * blend;
    z = velocity.z + (targetZ * targetSpeed - velocity.z) * blend;
  } else {
    const slip = Math.exp(-tuning.grip * dt);
    x = targetX * speed + (velocity.x - forwardX * projected) * slip;
    z = targetZ * speed + (velocity.z - forwardZ * projected) * slip;
  }
  const limit = Math.max(1, Math.hypot(x, z) / tuning.maxSpeed);
  return { yaw: heading, velocity: { x: x / limit, y: velocity.y, z: z / limit }, drifting, airControl: false };
}

export type DrivingInput = { throttle: number; steering: number; brake: boolean; drift?: boolean };
export const NEUTRAL_INPUT: DrivingInput = { throttle: 0, steering: 0, brake: false, drift: false };
// Original arcade tuning in metres/seconds/radians; not Nintendo engine constants.
export const KART_TUNING = {
  maxSpeed: 12, reverseSpeed: 4, acceleration: 12, braking: 20,
  rollingDrag: 2.4, turnRate: 1.75, highSpeedTurnRate: 1.25,
  driftMinSpeed: 4,
  driftTurnRate: 1.25, driftTurnAdjustment: 0.55,
  turboChargeSeconds: 1, turboDuration: 0.65, turboSpeed: 15,
  airTurnRate: 0.65, airVelocityTurn: 0.35,
};
export type DrivingState = { speed?: number; steering: number; driftDirection: number; driftCharge: number; boostRemaining: number; driftHeld: boolean; visualYawOffset: number };
export const createDrivingState = (): DrivingState => ({ steering: 0, driftDirection: 0, driftCharge: 0, boostRemaining: 0, driftHeld: false, visualYawOffset: 0, speed: 0 });
const approach = (value: number, target: number, amount: number) => value + Math.max(-amount, Math.min(amount, target - value));
const axis = (value: number) => Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function controlKart(velocity: { x: number; y: number; z: number }, yaw: number, grounded: boolean, input: DrivingInput, dt: number, previous?: DrivingState) {
  const tuning = KART_TUNING, throttle = axis(input.throttle), rawSteering = axis(input.steering);
  const state = { ...(previous ?? createDrivingState()) };
  state.steering = rawSteering;
  const steering = rawSteering, held = input.drift === true;
  const magnitude = Math.hypot(velocity.x, velocity.z);
  const projected = velocity.x * -Math.sin(yaw) + velocity.z * -Math.cos(yaw);
  state.boostRemaining = Math.max(0, state.boostRemaining - dt);
  const eligible = grounded && projected >= tuning.driftMinSpeed && !input.brake && throttle > 0;
  // Side is chosen once. Countersteering opens the arc rather than switching sides.
  if (!state.driftDirection && held && !state.driftHeld && eligible && Math.abs(rawSteering) > 0.1) state.driftDirection = Math.sign(rawSteering);
  if (state.driftDirection && (!held || input.brake || throttle <= 0 || (grounded && projected < tuning.driftMinSpeed))) {
    if (!held && eligible && state.driftCharge >= tuning.turboChargeSeconds) state.boostRemaining = tuning.turboDuration;
    state.driftDirection = 0; state.driftCharge = 0;
  }
  state.driftHeld = held;
  if (input.brake || throttle < 0) state.boostRemaining = 0;
  if (!grounded) {
    // No airborne propulsion, drift charge or turbo award; preserve horizontal energy.
    // Holding through a jump preserves the chosen side, but never charges or awards turbo in air.
    const airControl = magnitude > 0.5 && rawSteering !== 0;
    const airScale = Math.min(1, (state.boostRemaining > 0 ? tuning.turboSpeed : tuning.maxSpeed) / Math.max(magnitude, 0.001));
    const turn = airControl ? -rawSteering * tuning.airTurnRate * dt : 0, angle = turn * tuning.airVelocityTurn;
    state.speed = magnitude * airScale * (projected < -0.1 ? -1 : 1);
    return { state, yaw: wrap(yaw + turn), velocity: { x: (velocity.x * Math.cos(angle) + velocity.z * Math.sin(angle)) * airScale, y: velocity.y,
      z: (-velocity.x * Math.sin(angle) + velocity.z * Math.cos(angle)) * airScale }, drifting: false, airControl };
  }
  const drifting = state.driftDirection !== 0;
  state.visualYawOffset = approach(state.visualYawOffset, drifting ? -state.driftDirection * 0.38 : 0, 3 * dt);
  if (drifting) state.driftCharge = Math.min(tuning.turboChargeSeconds, state.driftCharge + dt);
  // Speed and travel direction are independent: cornering itself does not act as a brake.
  let speed = previous?.speed ?? magnitude * (projected < -0.1 ? -1 : 1);
  if (input.brake) speed = approach(speed, 0, tuning.braking * dt);
  else if (throttle !== 0) {
    const maximum = state.boostRemaining > 0 ? tuning.turboSpeed : tuning.maxSpeed;
    speed = approach(speed, throttle > 0 ? maximum * throttle : tuning.reverseSpeed * throttle,
      (speed * throttle < 0 ? tuning.braking : state.boostRemaining > 0 ? 28 : tuning.acceleration) * dt);
  } else speed = approach(speed, 0, tuning.rollingDrag * dt);
  const speedLimit = state.boostRemaining > 0 ? tuning.turboSpeed : tuning.maxSpeed;
  if (state.boostRemaining > 0 && throttle > 0 && !input.brake) speed = speedLimit * throttle;
  speed = Math.max(-tuning.reverseSpeed, Math.min(speedLimit, speed));
  state.speed = speed;
  const authority = Math.min(Math.abs(speed) / 3, 1);
  const rate = tuning.turnRate + (tuning.highSpeedTurnRate - tuning.turnRate) * Math.min(Math.abs(speed) / tuning.maxSpeed, 1);
  const turn = drifting ? state.driftDirection * (tuning.driftTurnRate + steering * state.driftDirection * tuning.driftTurnAdjustment)
    : steering * rate * Math.sign(speed);
  const heading = wrap(yaw - turn * authority * dt);
  // Fake kart: travel turns directly; sliding is a visual offset, not simulated tyre slip.
  return { state, yaw: heading, velocity: { x: -Math.sin(heading) * speed, y: velocity.y, z: -Math.cos(heading) * speed }, drifting, airControl: false };
}

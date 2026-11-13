export type DrivingInput = { throttle: number; steering: number; brake: boolean };
export const NEUTRAL_INPUT: DrivingInput = { throttle: 0, steering: 0, brake: false };
// Prototype tuning: metres, seconds and radians. No drift/boost or race rules yet.
export const KART_TUNING = {
  maxSpeed: 12, reverseSpeed: 4, acceleration: 8, braking: 18,
  rollingDrag: 1.8, grip: 12, turnRate: 1.9,
};

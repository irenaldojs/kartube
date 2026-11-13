import type { InputFrame } from '@kartube/game-core';
export const PROTOCOL_VERSION = 1;
export interface Envelope<T> {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly eventId: string;
  readonly seq: number;
  readonly payload: T;
}
export type ClientMessage = Envelope<
  | { readonly type: 'hello'; readonly build: string }
  | { readonly type: 'input'; readonly raceId: string; readonly input: InputFrame }
>;
// A boundary check, not a complete network decoder. Never cast untrusted JSON.
export function isInputFrame(value: unknown): value is InputFrame {
  if (typeof value !== 'object' || value === null) return false;
  const input = value as Record<string, unknown>;
  const integer = (v: unknown): boolean => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  const range = (v: unknown, min: number, max: number): boolean => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  return integer(input.seq) && integer(input.clientTick)
    && range(input.steer, -1, 1) && range(input.throttle, 0, 1) && range(input.brake, 0, 1)
    && typeof input.drift === 'boolean' && typeof input.jump === 'boolean' && typeof input.useItem === 'boolean';
}

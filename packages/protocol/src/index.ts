import { isInputFrame } from '@kartube/game-core';
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
export { isInputFrame } from '@kartube/game-core';

export const MAX_MESSAGE_BYTES = 4096;
export type DecodeResult =
  | { readonly ok: true; readonly message: ClientMessage }
  | { readonly ok: false; readonly code: 'too_large' | 'invalid_json' | 'incompatible_version' | 'invalid_message' };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(value);
}

/** Decode before dispatch. Transport must also cap frames before buffering. */
export function decodeClientMessage(raw: string): DecodeResult {
  // UTF-8 byte count without a dependency on browser or Node APIs.
  let bytes = 0;
  for (const character of raw) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes > MAX_MESSAGE_BYTES) return { ok: false, code: 'too_large' };
  }
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { ok: false, code: 'invalid_json' }; }
  if (!record(value)) return { ok: false, code: 'invalid_message' };
  if (value.protocolVersion !== PROTOCOL_VERSION) return { ok: false, code: 'incompatible_version' };
  if (!identifier(value.eventId) || !Number.isSafeInteger(value.seq) || (value.seq as number) < 0
    || !record(value.payload)) return { ok: false, code: 'invalid_message' };
  const payload = value.payload;
  const envelope = { protocolVersion: PROTOCOL_VERSION, eventId: value.eventId, seq: value.seq as number } as const;
  if (payload.type === 'hello' && identifier(payload.build)) {
    return { ok: true, message: { ...envelope, payload: { type: 'hello', build: payload.build } } };
  }
  if (payload.type === 'input' && identifier(payload.raceId) && isInputFrame(payload.input)) {
    return { ok: true, message: { ...envelope, payload: { type: 'input', raceId: payload.raceId, input: payload.input } } };
  }
  return { ok: false, code: 'invalid_message' };
}

/** One instance per connection. Reconnect starts a fresh sequence after handshake. */
export class ClientMessageGate {
  private lastSeq = -1;
  private welcomed = false;

  accept(message: ClientMessage): 'accepted' | 'stale' | 'hello_required' | 'already_initialized' {
    if (message.seq <= this.lastSeq) return 'stale';
    if (!this.welcomed && message.payload.type !== 'hello') return 'hello_required';
    if (this.welcomed && message.payload.type === 'hello') return 'already_initialized';
    this.lastSeq = message.seq;
    this.welcomed = true;
    return 'accepted';
  }
}

// Race-only wire contract. Lobby/championship messages are added in their stages.
// Connection events are local adapter state, never server payloads.
export type RaceServerPayload = Exclude<import('@kartube/game-core').RaceEvent, { readonly type: 'connection' }>;
export type ServerMessage = Envelope<
  | { readonly type: 'welcome'; readonly connectionId: string }
  | { readonly type: 'input_ack'; readonly inputSeq: number }
  | RaceServerPayload
>;

export { decodeServerMessage, encodeServerMessage, MAX_SERVER_MESSAGE_BYTES } from './server-codec.ts';

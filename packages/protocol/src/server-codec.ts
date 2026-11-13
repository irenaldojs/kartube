import { validateRaceSnapshot, validateRaceResultData } from '@kartube/game-core';
import type { RaceSnapshot, RaceResult } from '@kartube/game-core';
import type { ServerMessage } from './index.ts';

export const MAX_SERVER_MESSAGE_BYTES = 16_384;
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(v);
const tick = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const slot = (v: unknown): v is number => tick(v) && v < 8;
const nullableTick = (v: unknown) => v === null || tick(v);
function snapshot(v: unknown): v is RaceSnapshot {
  if (!object(v) || !object(v.config) || !object(v.config.track) || !Array.isArray(v.participants)) return false;
  const c = v.config, t = v.config.track;
  if (!id(c.raceId) || !id(t.id) || !tick(t.version) || typeof t.checksum !== 'string'
    || !tick(c.laps) || !tick(c.tickRate) || !tick(v.serverTick) || !nullableTick(v.startTick) || typeof v.phase !== 'string') return false;
  if (!v.participants.every((p: unknown) => object(p) && slot(p.slotId) && id(p.driverId)
    && (p.controller === 'human' || p.controller === 'bot') && tick(p.completedLaps)
    && (p.checkpointId === null || id(p.checkpointId)) && object(p.position)
    && [p.position.x, p.position.y, p.position.z, p.yaw, p.speed].every(finite) && nullableTick(p.finishTick))) return false;
  // All required fields have been narrowed above; domain validator checks relationships.
  try { validateRaceSnapshot(v as unknown as RaceSnapshot); return true; } catch { return false; }
}
function result(v: unknown): v is RaceResult {
  if (!object(v) || !id(v.raceId) || !id(v.resultId) || !tick(v.startTick) || !tick(v.endTick) || !Array.isArray(v.positions)) return false;
  if (!v.positions.every((p: unknown) => object(p) && slot(p.slotId) && tick(p.position)
    && (p.status === 'finished' || p.status === 'dnf') && nullableTick(p.finishTick) && tick(p.points))) return false;
  try { validateRaceResultData(v as unknown as RaceResult); return true; } catch { return false; }
}
function payload(v: unknown): boolean {
  if (!object(v)) return false;
  switch (v.type) {
    case 'welcome': return id(v.connectionId);
    case 'input_ack': return tick(v.inputSeq);
    case 'error': return id(v.code);
    case 'snapshot': return snapshot(v.snapshot);
    case 'race_result': return result(v.result);
    case 'checkpoint_ack':
      return id(v.raceId) && slot(v.slotId) && id(v.checkpointId) && tick(v.serverTick)
        && typeof v.accepted === 'boolean' && (v.accepted ? v.reason === null : id(v.reason));
    case 'item_granted': return id(v.raceId) && slot(v.slotId) && id(v.instanceId) && id(v.itemType) && tick(v.serverTick);
    case 'item_used': return id(v.raceId) && slot(v.slotId) && id(v.instanceId) && tick(v.serverTick)
      && (v.targetSlotId === null || slot(v.targetSlotId));
    default: return false;
  }
}
export type ServerDecodeResult =
  | { readonly ok: true; readonly message: ServerMessage }
  | { readonly ok: false; readonly code: 'too_large' | 'invalid_json' | 'incompatible_version' | 'invalid_message' };
export function decodeServerMessage(raw: string): ServerDecodeResult {
  if (raw.length > MAX_SERVER_MESSAGE_BYTES || new TextEncoder().encode(raw).byteLength > MAX_SERVER_MESSAGE_BYTES) return { ok: false, code: 'too_large' };
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return { ok: false, code: 'invalid_json' }; }
  if (!object(v)) return { ok: false, code: 'invalid_message' };
  if (v.protocolVersion !== 1) return { ok: false, code: 'incompatible_version' };
  if (!id(v.eventId) || !tick(v.seq) || !payload(v.payload)) return { ok: false, code: 'invalid_message' };
  return { ok: true, message: v as unknown as ServerMessage };
}
export function encodeServerMessage(message: ServerMessage): string {
  if (!object(message) || message.protocolVersion !== 1 || !id(message.eventId) || !tick(message.seq) || !payload(message.payload)) throw new Error('Invalid server message');
  const raw = JSON.stringify(message);
  const decoded = decodeServerMessage(raw);
  if (!decoded.ok) throw new Error(`Invalid server message: ${decoded.code}`);
  return raw;
}

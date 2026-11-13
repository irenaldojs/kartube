import { RACE_POINTS, validateRoster } from './index.ts';
import type { InputFrame, Participant } from './index.ts';

export type RacePhase = 'waiting' | 'countdown' | 'racing' | 'finished' | 'aborted';
export interface TrackReference {
  readonly id: string;
  readonly version: number;
  readonly checksum: string;
}
export interface RaceConfig {
  readonly raceId: string;
  readonly track: TrackReference;
  readonly laps: number;
  readonly tickRate: number;
}
export interface KartState extends Participant {
  readonly completedLaps: number;
  readonly checkpointId: string | null;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly yaw: number;
  readonly speed: number; // signed meters/second; negative means reverse
  readonly finishTick: number | null;
}
export interface RaceSnapshot {
  readonly config: RaceConfig;
  readonly serverTick: number;
  readonly phase: RacePhase;
  readonly startTick: number | null;
  readonly participants: readonly KartState[];
}
export interface FinishPosition {
  readonly slotId: number;
  readonly position: number;
  readonly status: 'finished' | 'dnf';
  readonly finishTick: number | null;
  readonly points: number;
}
export interface RaceResult {
  readonly raceId: string;
  readonly resultId: string;
  readonly startTick: number;
  readonly endTick: number;
  readonly positions: readonly FinishPosition[];
}
export type RaceEvent =
  | { readonly type: 'snapshot'; readonly snapshot: RaceSnapshot }
  | { readonly type: 'checkpoint_ack'; readonly raceId: string; readonly slotId: number; readonly checkpointId: string; readonly accepted: boolean; readonly reason: string | null; readonly serverTick: number }
  | { readonly type: 'item_granted'; readonly raceId: string; readonly slotId: number; readonly instanceId: string; readonly itemType: string; readonly serverTick: number }
  | { readonly type: 'item_used'; readonly raceId: string; readonly slotId: number; readonly instanceId: string; readonly targetSlotId: number | null; readonly serverTick: number }
  | { readonly type: 'race_result'; readonly result: RaceResult }
  | { readonly type: 'connection'; readonly state: 'connected' | 'reconnecting' | 'disconnected' }
  | { readonly type: 'error'; readonly code: string };

/** Both implementations expose authority-issued events. submitInput only queues intent. */
export interface RaceSession {
  readonly mode: 'local' | 'remote';
  readonly localSlotId: number;
  getSnapshot(): RaceSnapshot | null;
  submitInput(input: InputFrame): void;
  subscribe(listener: (event: RaceEvent) => void): () => void;
  dispose(): void;
}
function ensure(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}
function tick(n: number): boolean { return Number.isSafeInteger(n) && n >= 0; }
function identifier(s: string): boolean { return typeof s === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(s); }
export function validateRaceSnapshot(snapshot: RaceSnapshot): void {
  const { config, serverTick, startTick, phase } = snapshot;
  ensure(identifier(config.raceId) && identifier(config.track.id), 'Invalid race/track identifier');
  ensure(Number.isSafeInteger(config.track.version) && config.track.version > 0 && /^[0-9a-f]{64}$/.test(config.track.checksum), 'Invalid track reference');
  ensure(Number.isSafeInteger(config.laps) && config.laps > 0 && Number.isSafeInteger(config.tickRate) && config.tickRate > 0, 'Invalid race configuration');
  ensure(tick(serverTick), 'Invalid server tick');
  ensure(['waiting', 'countdown', 'racing', 'finished', 'aborted'].includes(phase), 'Invalid race phase');
  if (phase === 'waiting') ensure(startTick === null, 'Waiting race cannot have start tick');
  if (phase === 'countdown') ensure(startTick !== null && tick(startTick) && startTick > serverTick, 'Countdown must precede start');
  if (phase === 'racing' || phase === 'finished') ensure(startTick !== null && tick(startTick) && startTick <= serverTick, 'Race must have started');
  if (phase === 'aborted') ensure(startTick === null || tick(startTick), 'Invalid abort start tick');
  validateRoster(snapshot.participants);
  for (const p of snapshot.participants) {
    ensure(identifier(p.driverId), 'Invalid driver identifier');
    ensure(Number.isInteger(p.completedLaps) && p.completedLaps >= 0 && p.completedLaps <= config.laps, 'Invalid completed laps');
    ensure(p.checkpointId === null || identifier(p.checkpointId), 'Invalid checkpoint identifier');
    ensure([p.position.x, p.position.y, p.position.z, p.yaw, p.speed].every(Number.isFinite), 'Invalid kart pose');
    ensure(p.finishTick === null || (tick(p.finishTick) && startTick !== null && p.finishTick >= startTick && p.finishTick <= serverTick && p.completedLaps === config.laps), 'Invalid finish tick');
    ensure(p.completedLaps !== config.laps || p.finishTick !== null, 'Completed race requires finish tick');
    if (phase === 'waiting' || phase === 'countdown') ensure(p.completedLaps === 0 && p.finishTick === null, 'Progress before start');
  }
}
const transitions: Readonly<Record<RacePhase, readonly RacePhase[]>> = {
  waiting: ['countdown', 'aborted'], countdown: ['racing', 'aborted'], racing: ['finished', 'aborted'], finished: [], aborted: [],
};
/** For consecutive authority snapshots; an adapter must recover gaps with a full resync. */
export function validateRaceTransition(previous: RaceSnapshot, next: RaceSnapshot): void {
  validateRaceSnapshot(previous); validateRaceSnapshot(next);
  ensure(next.serverTick > previous.serverTick, 'Stale snapshot');
  const a = previous.config, b = next.config;
  ensure(a.raceId === b.raceId && a.laps === b.laps && a.tickRate === b.tickRate && a.track.id === b.track.id && a.track.version === b.track.version && a.track.checksum === b.track.checksum, 'Race configuration changed');
  ensure(previous.phase !== 'finished' && previous.phase !== 'aborted', 'Terminal race is immutable');
  ensure(previous.phase === next.phase || transitions[previous.phase].includes(next.phase), 'Invalid race transition');
  if (previous.startTick !== null) ensure(next.startTick === previous.startTick, 'Start tick changed');
  for (const p of previous.participants) {
    const n = next.participants.find(candidate => candidate.slotId === p.slotId)!;
    ensure(n.driverId === p.driverId, 'Slot identity changed');
    ensure(n.completedLaps >= p.completedLaps, 'Lap progress moved backwards');
    if (p.finishTick !== null) ensure(n.finishTick === p.finishTick, 'Finish tick changed');
  }
}
/** Validate a result without session context. An adapter must additionally bind it to a final snapshot. */
export function validateRaceResultData(result: RaceResult): void {
  ensure(identifier(result.raceId) && identifier(result.resultId), 'Invalid result identity');
  ensure(tick(result.startTick) && tick(result.endTick) && result.endTick >= result.startTick, 'Invalid result clock');
  ensure(result.positions.length === 8, 'Expected eight result positions');
  const slots = new Set<number>();
  let previousFinish = -1;
  let previousSlot = -1;
  let sawDnf = false;
  for (const [index, entry] of result.positions.entries()) {
    ensure(Number.isInteger(entry.slotId) && entry.slotId >= 0 && entry.slotId < 8 && !slots.has(entry.slotId), 'Invalid result slot');
    slots.add(entry.slotId);
    ensure(entry.position === index + 1 && entry.points === RACE_POINTS[index], 'Invalid position/points');
    ensure(entry.status === 'finished' || entry.status === 'dnf', 'Invalid finish status');
    if (entry.status === 'finished') {
      ensure(!sawDnf && entry.finishTick !== null && tick(entry.finishTick) && entry.finishTick >= result.startTick && entry.finishTick <= result.endTick && entry.finishTick >= previousFinish, 'Invalid finish ordering');
      ensure(entry.finishTick !== previousFinish || entry.slotId > previousSlot, 'Finish tie must use stable slot order');
      previousFinish = entry.finishTick;
      previousSlot = entry.slotId;
    } else {
      sawDnf = true;
      ensure(entry.finishTick === null, 'DNF cannot have finish tick');
    }
  }
}
export function validateRaceResult(result: RaceResult, snapshot: RaceSnapshot): void {
  validateRaceSnapshot(snapshot);
  ensure(snapshot.phase === 'finished' && result.raceId === snapshot.config.raceId && identifier(result.resultId), 'Result requires finished race');
  ensure(result.startTick === snapshot.startTick && result.endTick === snapshot.serverTick, 'Result clock mismatch');
  validateRaceResultData(result);
  for (const entry of result.positions) {
    const participant = snapshot.participants.find(p => p.slotId === entry.slotId)!;
    ensure(entry.finishTick === participant.finishTick, 'Result finish tick mismatch');
  }
}

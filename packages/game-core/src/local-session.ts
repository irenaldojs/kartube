import { isInputFrame } from './input-frame.ts';
import { validateRaceResult, validateRaceSnapshot, validateRaceTransition } from './race-contracts.ts';
import type { InputFrame } from './index.ts';
import type { RaceEvent, RaceSession, RaceSnapshot } from './race-contracts.ts';

export type LocalAuthorityEvent = Exclude<RaceEvent, { type: 'snapshot' | 'connection' | 'error' }>;
export interface LocalAuthorityFrame {
  readonly snapshot: RaceSnapshot;
  readonly events: readonly LocalAuthorityEvent[];
}
/** Trusted offline simulation boundary; this reference adapter supplies no physics/race rules. */
export interface LocalRaceAuthority {
  readonly initialSnapshot: RaceSnapshot;
  step(input: InputFrame | null): LocalAuthorityFrame;
  dispose(): void;
}
export interface LocalSessionOptions {
  readonly authority: LocalRaceAuthority;
  readonly localSlotId: number;
  readonly onError?: (error: unknown) => void;
}
function frozenCopy<T>(value: T): T {
  const copy = structuredClone(value);
  const pending: unknown[] = [copy];
  while (pending.length) {
    const current = pending.pop();
    if (typeof current !== 'object' || current === null || Object.isFrozen(current)) continue;
    for (const child of Object.values(current)) pending.push(child);
    Object.freeze(current);
  }
  return copy;
}
function offlineRoster(snapshot: RaceSnapshot, localSlotId: number): void {
  if (snapshot.participants.filter(p => p.controller === 'human').length !== 1
    || snapshot.participants.find(p => p.slotId === localSlotId)?.controller !== 'human') throw new Error('Offline race requires one local human and seven bots');
}
export class LocalRaceSession implements RaceSession {
  readonly mode = 'local';
  readonly localSlotId: number;
  private readonly authority: LocalRaceAuthority;
  private readonly onError: (error: unknown) => void;
  private readonly listeners = new Set<(event: RaceEvent) => void>();
  private snapshot: RaceSnapshot;
  private pendingInput: InputFrame | null = null;
  private inputSeq = -1;
  private disposed = false;
  private stopped = false;
  private stepping = false;
  private authorityDisposed = false;

  constructor(options: LocalSessionOptions) {
    if (!Number.isInteger(options.localSlotId) || options.localSlotId < 0 || options.localSlotId > 7) throw new Error('Invalid local slot');
    const snapshot = frozenCopy(options.authority.initialSnapshot);
    validateRaceSnapshot(snapshot);
    if (snapshot.phase !== 'waiting') throw new Error('Local authority must start waiting');
    offlineRoster(snapshot, options.localSlotId);
    this.localSlotId = options.localSlotId;
    this.snapshot = snapshot;
    this.authority = options.authority;
    this.onError = options.onError ?? (error => console.error('Local session callback/lifecycle failed', error));
  }
  getSnapshot(): RaceSnapshot { return this.snapshot; }
  subscribe(listener: (event: RaceEvent) => void): () => void {
    if (this.disposed) throw new Error('Session disposed');
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  submitInput(input: InputFrame): void {
    this.assertActive();
    const local = this.snapshot.participants.find(p => p.slotId === this.localSlotId)!;
    if (this.snapshot.phase !== 'racing' || local.finishTick !== null) throw new Error('Local slot is not racing');
    if (!isInputFrame(input) || input.seq <= this.inputSeq) throw new Error('Invalid or stale input');
    // Only the latest valid frame is consumed once at the next simulation tick.
    this.pendingInput = frozenCopy(input);
    this.inputSeq = input.seq;
  }
  /** Call once per fixed simulation tick. Scheduling/rendering stay outside game-core. */
  advance(): void {
    this.assertActive();
    if (this.stepping) throw new Error('Reentrant simulation step');
    this.stepping = true;
    const input = this.pendingInput;
    this.pendingInput = null;
    let frame: LocalAuthorityFrame;
    try {
      frame = frozenCopy(this.authority.step(input));
      this.validateFrame(frame);
    } catch (error) {
      this.stepping = false;
      this.stopped = true;
      this.releaseAuthority();
      this.emit({ type: 'error', code: 'invalid_authority_frame' });
      throw error;
    }
    // An authority may trigger external disposal during step; never publish afterwards.
    if (this.disposed) { this.stepping = false; return; }
    this.snapshot = frame.snapshot;
    const terminal = frame.snapshot.phase === 'finished' || frame.snapshot.phase === 'aborted';
    if (terminal) { this.stopped = true; this.pendingInput = null; }
    try {
      this.emit({ type: 'snapshot', snapshot: this.snapshot });
      for (const event of frame.events) this.emit(event);
    } finally {
      this.stepping = false;
      if (terminal) this.releaseAuthority();
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopped = true;
    this.pendingInput = null;
    this.listeners.clear();
    this.releaseAuthority();
  }
  private assertActive(): void {
    if (this.disposed) throw new Error('Session disposed');
    if (this.stopped) throw new Error('Session stopped');
  }
  private report(error: unknown): void {
    try { this.onError(error); } catch { /* Reporting cannot interrupt cleanup or listeners. */ }
  }
  private releaseAuthority(): void {
    if (this.authorityDisposed) return;
    this.authorityDisposed = true;
    try { this.authority.dispose(); } catch (error) { this.report(error); }
  }
  private emit(event: RaceEvent): void {
    if (this.disposed) return;
    Object.freeze(event);
    for (const listener of [...this.listeners]) {
      if (this.disposed || !this.listeners.has(listener)) continue;
      try { listener(event); } catch (error) { this.report(error); }
    }
  }
  private validateFrame(frame: LocalAuthorityFrame): void {
    validateRaceTransition(this.snapshot, frame.snapshot);
    offlineRoster(frame.snapshot, this.localSlotId);
    if (frame.snapshot.serverTick !== this.snapshot.serverTick + 1) throw new Error('Authority must advance exactly one tick');
    if (!Array.isArray(frame.events)) throw new Error('Expected authority events');
    if (frame.snapshot.phase === 'finished') {
      if (frame.events.length !== 1 || frame.events[0]?.type !== 'race_result') throw new Error('Final frame requires exactly one result');
      validateRaceResult(frame.events[0].result, frame.snapshot);
      return;
    }
    for (const event of frame.events) {
      if (frame.snapshot.phase !== 'racing' || event.type === 'race_result') throw new Error('Unexpected authority event');
      if (event.raceId !== frame.snapshot.config.raceId || event.serverTick !== frame.snapshot.serverTick
        || !Number.isInteger(event.slotId) || event.slotId < 0 || event.slotId > 7) throw new Error('Invalid authority event context');
      const id = (v: string) => typeof v === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(v);
      switch (event.type) {
        case 'checkpoint_ack':
          if (!id(event.checkpointId) || typeof event.accepted !== 'boolean' || (event.accepted ? event.reason !== null : !id(event.reason!))) throw new Error('Invalid checkpoint acknowledgement');
          break;
        case 'item_granted':
          if (!id(event.instanceId) || !id(event.itemType)) throw new Error('Invalid granted item');
          break;
        case 'item_used':
          if (!id(event.instanceId) || (event.targetSlotId !== null && (!Number.isInteger(event.targetSlotId) || event.targetSlotId < 0 || event.targetSlotId > 7))) throw new Error('Invalid used item');
          break;
        default: throw new Error('Unknown authority event');
      }
    }
  }
}

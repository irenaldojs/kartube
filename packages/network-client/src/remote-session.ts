import { validateRaceConfig, validateRaceResult, validateRaceTransition } from '@kartube/game-core';
import type { InputFrame, RaceConfig, RaceEvent, RaceResult, RaceSession, RaceSnapshot } from '@kartube/game-core';
import { decodeServerMessage, isInputFrame } from '@kartube/protocol';
import type { ClientMessage, ServerMessage } from '@kartube/protocol';
import type { RaceTransport } from './transport.ts';

export interface RemoteSessionOptions {
  readonly config: RaceConfig;
  readonly localSlotId: number; // supplied by a future authoritative lobby, never chosen by input
  readonly build: string;
  readonly transport: RaceTransport;
  readonly onListenerError?: (error: unknown) => void;
}
function immutable<T>(value: T): T {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  while (pending.length) {
    const current = pending.pop();
    if (typeof current !== 'object' || current === null || visited.has(current)) continue;
    visited.add(current);
    for (const child of Object.values(current)) pending.push(child);
    Object.freeze(current);
  }
  return value;
}
function sameConfig(a: RaceConfig, b: RaceConfig): boolean {
  return a.raceId === b.raceId && a.laps === b.laps && a.tickRate === b.tickRate && a.track.id === b.track.id && a.track.version === b.track.version && a.track.checksum === b.track.checksum;
}
function resultKey(result: RaceResult): string {
  return JSON.stringify([result.raceId, result.resultId, result.startTick, result.endTick,
    result.positions.map(p => [p.slotId, p.position, p.status, p.finishTick, p.points])]);
}
export class RemoteRaceSession implements RaceSession {
  readonly mode = 'remote';
  readonly localSlotId: number;
  private readonly config: RaceConfig;
  private readonly transport: RaceTransport;
  private readonly listeners = new Set<(event: RaceEvent) => void>();
  private readonly seenEvents = new Set<string>();
  private readonly onListenerError: (error: unknown) => void;
  private detach: () => void = () => {};
  private snapshot: RaceSnapshot | null = null;
  private result: RaceResult | null = null;
  private welcomed = false;
  private helloSent = false;
  private closed = false;
  private disposed = false;
  private serverSeq = -1;
  private clientSeq = 0;
  private inputSeq = -1;
  private authorityTick = -1;

  constructor(options: RemoteSessionOptions) {
    validateRaceConfig(options.config);
    if (!Number.isInteger(options.localSlotId) || options.localSlotId < 0 || options.localSlotId > 7) throw new Error('Invalid local slot');
    if (typeof options.build !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(options.build)) throw new Error('Invalid build');
    const build = options.build;
    this.localSlotId = options.localSlotId;
    this.config = immutable(structuredClone(options.config));
    this.transport = options.transport;
    this.onListenerError = options.onListenerError ?? (error => console.error('Remote session listener failed', error));
    this.detach = this.transport.subscribe({ open: () => this.open(build), message: data => this.receive(data), close: () => this.disconnect(), error: () => this.disconnect('transport_error') });
    if (this.transport.isOpen) this.open(build);
  }
  getSnapshot(): RaceSnapshot | null { return this.snapshot; }
  getConnectionState(): 'connected' | 'disconnected' { return this.welcomed && !this.closed ? 'connected' : 'disconnected'; }
  subscribe(listener: (event: RaceEvent) => void): () => void {
    if (this.disposed) throw new Error('Session disposed');
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  submitInput(input: InputFrame): void {
    if (this.disposed) throw new Error('Session disposed');
    if (this.closed || !this.welcomed || !this.transport.isOpen) throw new Error('Session disconnected');
    const local = this.snapshot?.participants.find(p => p.slotId === this.localSlotId);
    if (!this.snapshot || this.snapshot.phase !== 'racing' || local?.controller !== 'human' || local.finishTick !== null) throw new Error('Local slot is not racing');
    if (!isInputFrame(input) || input.seq <= this.inputSeq) throw new Error('Invalid or stale input');
    const seq = this.clientSeq;
    if (!Number.isSafeInteger(seq)) { this.disconnect('sequence_exhausted'); throw new Error('Sequence exhausted'); }
    const message: ClientMessage = { protocolVersion: 1, eventId: `client-${seq}`, seq, payload: { type: 'input', raceId: this.config.raceId, input } };
    // Commit cursors before sending, so even a synchronous transport cannot reuse them.
    this.inputSeq = input.seq;
    this.clientSeq++;
    try { this.transport.send(JSON.stringify(message)); } catch { this.disconnect('transport_error'); throw new Error('Input send failed'); }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    this.disconnect();
    this.seenEvents.clear();
  }
  private emit(event: RaceEvent): void {
    if (this.disposed) return;
    immutable(event);
    for (const listener of [...this.listeners]) {
      if (this.disposed || !this.listeners.has(listener)) continue;
      try { listener(event); } catch (error) {
        try { this.onListenerError(error); } catch { /* Listener reporting cannot corrupt session state. */ }
      }
    }
  }
  private disconnect(code?: string): void {
    if (this.closed) return;
    this.closed = true;
    this.detach();
    try { this.transport.close(); } catch { /* Closure is best effort after detaching. */ }
    if (code) this.emit({ type: 'error', code });
    this.emit({ type: 'connection', state: 'disconnected' });
  }
  private open(build: string): void {
    if (this.closed || this.disposed || this.helloSent) return;
    this.helloSent = true;
    this.clientSeq = 1;
    const message: ClientMessage = { protocolVersion: 1, eventId: 'client-0', seq: 0, payload: { type: 'hello', build } };
    try { this.transport.send(JSON.stringify(message)); } catch { this.disconnect('transport_error'); }
  }
  private receive(data: unknown): void {
    if (this.closed || this.disposed) return;
    if (typeof data !== 'string') { this.disconnect('text_required'); return; }
    const decoded = decodeServerMessage(data);
    if (!decoded.ok) { this.disconnect(decoded.code); return; }
    const message = decoded.message;
    if (message.seq <= this.serverSeq) return;
    if (message.seq !== this.serverSeq + 1) { this.disconnect('sequence_gap'); return; }
    if (this.seenEvents.has(message.eventId)) { this.disconnect('duplicate_event'); return; }
    const payload = message.payload;
    if (!this.helloSent) { this.disconnect('hello_required'); return; }
    if (!this.welcomed && payload.type !== 'welcome' && payload.type !== 'error') { this.disconnect('welcome_required'); return; }
    // Consume accepted envelope identity before callbacks, including repeated result payloads.
    this.serverSeq = message.seq;
    this.seenEvents.add(message.eventId);
    if (payload.type === 'welcome') {
      if (this.welcomed) { this.disconnect('already_initialized'); return; }
      this.welcomed = true;
      this.emit({ type: 'connection', state: 'connected' });
      return;
    }
    if (payload.type === 'error') {
      if (!this.welcomed) this.disconnect(payload.code);
      else this.emit(payload);
      return;
    }
    if (payload.type === 'input_ack') {
      if (payload.inputSeq > this.inputSeq) this.disconnect('unknown_input_ack');
      return;
    }
    try { this.apply(payload); } catch { this.disconnect('invalid_race_event'); }
  }
  private apply(payload: Exclude<ServerMessage['payload'], { type: 'welcome' | 'error' | 'input_ack' }>): void {
    if (payload.type === 'snapshot') {
      if (!sameConfig(this.config, payload.snapshot.config) || payload.snapshot.serverTick < this.authorityTick) throw new Error('Unexpected snapshot');
      if (this.snapshot) validateRaceTransition(this.snapshot, payload.snapshot);
      this.snapshot = immutable(payload.snapshot);
      this.authorityTick = payload.snapshot.serverTick;
      this.emit(payload);
      return;
    }
    if (!this.snapshot) throw new Error('Snapshot required');
    if (payload.type === 'race_result') {
      validateRaceResult(payload.result, this.snapshot);
      if (this.result) {
        if (resultKey(this.result) !== resultKey(payload.result)) throw new Error('Conflicting result');
        return;
      }
      this.result = immutable(payload.result);
      this.emit(payload);
      return;
    }
    if (payload.raceId !== this.config.raceId || this.snapshot.phase !== 'racing' || payload.serverTick < this.authorityTick) throw new Error('Unexpected race event');
    this.authorityTick = payload.serverTick;
    this.emit(payload);
  }
}

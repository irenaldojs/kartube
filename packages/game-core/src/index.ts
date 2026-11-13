export const PARTICIPANT_COUNT = 8;
export const DEFAULT_LAPS = 3;
export const RACE_POINTS = [15, 12, 10, 8, 6, 4, 2, 1] as const;

export interface InputFrame {
  readonly seq: number;
  readonly clientTick: number;
  readonly steer: number; // [-1, 1]
  readonly throttle: number; // [0, 1]
  readonly brake: number; // [0, 1]
  readonly drift: boolean;
  readonly jump: boolean;
  readonly useItem: boolean;
}
export interface InputAdapter {
  sample(clientTick: number): InputFrame;
  dispose(): void;
}
export interface PlatformAdapter {
  readonly kind: 'browser' | 'desktop' | 'android';
  loadSetting(key: string): Promise<string | null>;
  saveSetting(key: string, value: string): Promise<void>;
}
export interface Participant {
  readonly slotId: number;
  readonly driverId: string;
  readonly controller: 'human' | 'bot';
}
export function validateRoster(participants: readonly Participant[]): void {
  if (participants.length !== PARTICIPANT_COUNT) throw new Error('Expected eight participants');
  const slots = new Set<number>();
  const drivers = new Set<string>();
  for (const participant of participants) {
    if (!Number.isInteger(participant.slotId) || participant.slotId < 0 || participant.slotId >= PARTICIPANT_COUNT
      || slots.has(participant.slotId) || !participant.driverId || drivers.has(participant.driverId)
      || !['human', 'bot'].includes(participant.controller)) throw new Error('Invalid participant');
    slots.add(participant.slotId);
    drivers.add(participant.driverId);
  }
}

export * from './race-contracts.ts';
export { isInputFrame } from './input-frame.ts';
export { LocalRaceSession } from './local-session.ts';
export type { LocalRaceAuthority, LocalAuthorityFrame, LocalAuthorityEvent, LocalSessionOptions } from './local-session.ts';

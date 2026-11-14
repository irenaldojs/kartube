import type { RaceGate } from '../../../packages/game-core/src/checkpoint-race.ts';
function gate(id: string, label: string, x: number, z: number, dx: number, dz: number, next: string[], width = 4): RaceGate {
  return { id, label, center: { x, y: 1.5, z }, halfExtents: { x: dx ? 0.5 : width, y: 2, z: dz ? 0.5 : width }, forward: { x: dx, y: 0, z: dz }, next };
}
export const RACE_SPAWN = { x: -30, y: 0.36, z: 14 };
export const RACE_FINISH_ID = 'finish';
export const RACE_GATES: readonly RaceGate[] = [
  gate('finish', 'Largada / chegada', -30, 10.3, 0, -1, ['branch']),
  gate('branch', 'Entrada das rotas', -30, 1, 0, -1, ['north-west', 'alternative']),
  gate('north-west', 'Reta norte', -30, -12, 0, -1, ['north']),
  gate('north', 'Rampa norte', 0, -30, 1, 0, ['east']),
  gate('east', 'Curva leste', 30, -10, 0, 1, ['merge']),
  gate('alternative', 'Caminho alternativo', 0, 0, 1, 0, ['merge'], 2.5),
  gate('merge', 'Reencontro das rotas', 30, 8, 0, 1, ['south']),
  gate('south', 'Reta sul', 0, 30, -1, 0, ['west']),
  gate('west', 'Curva da chegada', -30, 16, 0, -1, ['finish']),
];

// Place anchors behind the accepted plane: recovery never skips new metres or grants a gate.
export function recoveryPointFor(checkpointId: string | null) {
  const checkpoint = RACE_GATES.find(gate => gate.id === checkpointId);
  if (!checkpoint) return { ...RACE_SPAWN, yaw: 0 };
  return { x: checkpoint.center.x - checkpoint.forward.x * 1.8, y: 0.4,
    z: checkpoint.center.z - checkpoint.forward.z * 1.8, yaw: Math.atan2(-checkpoint.forward.x, -checkpoint.forward.z) };
}

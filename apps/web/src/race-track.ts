import type { RaceGate } from '../../../packages/game-core/src/checkpoint-race.ts';
function gate(id: string, label: string, x: number, z: number, dx: number, dz: number, next: string[], width = 4): RaceGate {
  return { id, label, center: { x, y: 1.5, z }, halfExtents: { x: dx ? 0.5 : width, y: 2, z: dz ? 0.5 : width }, forward: { x: dx, y: 0, z: dz }, next };
}
export const RACE_SPAWN = { x: -20, y: 0.36, z: 14 };
export const RACE_FINISH_ID = 'finish';
export const RACE_GATES: readonly RaceGate[] = [
  gate('finish', 'Largada / chegada', -20, 10.3, 0, -1, ['branch']),
  gate('branch', 'Entrada das rotas', -20, 1, 0, -1, ['north-west', 'alternative']),
  gate('north-west', 'Reta norte', -20, -12, 0, -1, ['north']),
  gate('north', 'Rampa norte', 0, -20, 1, 0, ['east']),
  gate('east', 'Curva leste', 20, -10, 0, 1, ['merge']),
  gate('alternative', 'Caminho alternativo', 0, 0, 1, 0, ['merge'], 2.5),
  gate('merge', 'Reencontro das rotas', 20, 8, 0, 1, ['south']),
  gate('south', 'Reta sul', 0, 20, -1, 0, ['west']),
  gate('west', 'Curva da chegada', -20, 16, 0, -1, ['finish']),
];

import type { Checkpoint, Vector3 } from '../../game-data/src/index.ts';
export type RaceGate = Checkpoint & { readonly forward: Vector3; readonly label: string };
export type CheckpointRaceConfig = { gates: readonly RaceGate[]; finishId: string; laps: number; tickRate: number; countdownTicks: number };

// Pure single-driver progress. Pose samples must be consecutive fixed physics ticks.
export function createCheckpointRace(config: CheckpointRaceConfig, initialPosition: Vector3) {
  const gates = new Map(config.gates.map(gate => [gate.id, gate]));
  if (gates.size !== config.gates.length || !gates.has(config.finishId) || !Number.isInteger(config.laps) || config.laps < 1 || config.laps > 99
    || !Number.isInteger(config.tickRate) || config.tickRate < 1 || !Number.isInteger(config.countdownTicks) || config.countdownTicks < 0) throw new Error('Invalid race config');
  for (const gate of gates.values()) {
    if (![...Object.values(gate.center), ...Object.values(gate.halfExtents)].every(Number.isFinite)
      || Object.values(gate.halfExtents).some(value => value <= 0) || gate.forward.y !== 0
      || !((Math.abs(gate.forward.x) === 1 && gate.forward.z === 0) || (Math.abs(gate.forward.z) === 1 && gate.forward.x === 0))
      || !gate.next.length || gate.next.some(id => !gates.has(id))) throw new Error('Invalid race gate');
  }
  // Require every route to return to finish, with no cycle that bypasses it.
  const visited = new Set<string>(), visiting = new Set<string>();
  function visit(id: string) {
    if (id === config.finishId) return;
    if (visiting.has(id)) throw new Error('Checkpoint cycle bypasses finish');
    if (visited.has(id)) return;
    visiting.add(id); gates.get(id)!.next.forEach(visit); visiting.delete(id); visited.add(id);
  }
  gates.get(config.finishId)!.next.forEach(visit);
  if (visited.size !== gates.size - 1) throw new Error('Unreachable race gate');
  let phase: 'countdown' | 'racing' | 'finished' = config.countdownTicks ? 'countdown' : 'racing';
  let countdownTicks = config.countdownTicks, raceTicks = 0, completedLaps = 0, armed = false;
  let expected = [config.finishId], lastCheckpointId: string | null = null, rejectedJumps = 0, respawns = 0;
  let previous = { ...initialPosition };
  return {
    get phase() { return phase; },
    get snapshot() { return { phase, laps: config.laps, completedLaps, currentLap: Math.min(completedLaps + 1, config.laps),
      countdown: Math.ceil(countdownTicks / config.tickRate), elapsedSeconds: raceTicks / config.tickRate,
      expected: [...expected], nextLabels: expected.map(id => gates.get(id)!.label), lastCheckpointId, armed, rejectedJumps, respawns }; },
    rebaseAfterRespawn(position: Vector3) {
      if (![position.x, position.y, position.z].every(Number.isFinite)) throw new Error('Invalid recovery position');
      previous = { ...position };
      if (phase !== 'finished') respawns++;
    },
    step(position: Vector3) {
      if (![position.x, position.y, position.z].every(Number.isFinite)) throw new Error('Invalid race position');
      const from = previous; previous = { ...position };
      if (phase === 'finished') return;
      if (phase === 'countdown') { if (--countdownTicks <= 0) phase = 'racing'; return; }
      raceTicks++;
      // Max kart speed is 12 m/s. Two metres in one tick is a discontinuity, not a gate crossing.
      if (Math.hypot(position.x - from.x, position.y - from.y, position.z - from.z) > 2) {
        expected = [config.finishId]; armed = false; lastCheckpointId = null; rejectedJumps++; return;
      }
      for (const id of expected) {
        const gate = gates.get(id)!;
        const before = (from.x - gate.center.x) * gate.forward.x + (from.z - gate.center.z) * gate.forward.z;
        const after = (position.x - gate.center.x) * gate.forward.x + (position.z - gate.center.z) * gate.forward.z;
        if (before >= 0 || after < 0) continue;
        const fraction = -before / (after - before);
        const crossing = { x: from.x + (position.x - from.x) * fraction, y: from.y + (position.y - from.y) * fraction, z: from.z + (position.z - from.z) * fraction };
        if (Math.abs(crossing.x - gate.center.x) > gate.halfExtents.x || Math.abs(crossing.y - gate.center.y) > gate.halfExtents.y
          || Math.abs(crossing.z - gate.center.z) > gate.halfExtents.z) continue;
        lastCheckpointId = id;
        if (id === config.finishId) {
          if (armed) completedLaps++; else armed = true;
          if (completedLaps === config.laps) { phase = 'finished'; expected = []; return; }
        }
        expected = [...gate.next]; return;
      }
    },
  };
}

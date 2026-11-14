import { TRACK_PARTS, TRACK_SPAWN, buildRoadSurface, type SceneKind } from './track.ts';
import { NEUTRAL_INPUT, type DrivingInput } from './driving.ts';
import { createRecoveryDetector, RECOVERY_TUNING, type RecoveryPoint, type RecoveryReason } from './recovery.ts';
import { createKartMotion, type CollisionQueries } from './kart-motion.ts';
import RAPIER from '@dimforge/rapier3d-compat';
let initialization: Promise<void> | undefined;
export const PHYSICS_DT = 1 / 60;
export async function createPhysics(sceneKind: SceneKind = 'drop') {
  initialization ??= RAPIER.init().catch((error: unknown) => { initialization = undefined; throw error; });
  await initialization;
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const supports = new Set<number>(), barriers = new Set<number>();
    if (sceneKind === 'track') {
      const surface = buildRoadSurface();
      supports.add(world.createCollider(RAPIER.ColliderDesc.trimesh(surface.vertices, surface.indices)).handle);
      for (const part of TRACK_PARTS) if (part.solid && !(part.kind === 'road' && part.rotationY !== undefined)) {
        const angle = (part.rotationZ ?? 0) / 2, yawAngle = (part.rotationY ?? 0) / 2;
        const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(part.size[0] / 2, part.size[1] / 2, part.size[2] / 2)
          .setTranslation(...part.position).setRotation({ x: 0, y: Math.sin(yawAngle), z: Math.sin(angle), w: Math.cos(angle) * Math.cos(yawAngle) }));
        if (part.kind === 'road' || part.kind === 'ramp') supports.add(collider.handle);
        if (part.kind === 'rail') barriers.add(collider.handle);
      }
    } else supports.add(world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.25, 7).setTranslation(0, -0.25, 0)).handle);
    const spawn = sceneKind === 'track' ? TRACK_SPAWN : { x: 0, y: 3, z: 0 };
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z));
    // Query proxy only: never advanced by the Rapier solver.
    // Small rounded edges cross flush slab seams without changing the outer kart dimensions.
    world.createCollider(RAPIER.ColliderDesc.roundCuboid(0.85, 0.30, 1.35, 0.05), body);
    let disposed = false;
    let steps = 0, resets = 0;
    const motion = createKartMotion(spawn, sceneKind === 'track' ? 30 : 9.81);
    const sync = () => {
      const yaw = motion.yaw;
      body.setTranslation(motion.position, false); body.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, false);
      world.propagateModifiedBodyPositionsToColliders(); world.updateSceneQueries();
    };
    const shape = new RAPIER.RoundCuboid(0.85, 0.30, 1.35, 0.05);
    const queries: CollisionQueries = {
      ground(position, yaw, reach) {
        let height: number | null = null;
        for (const offset of [-1, 0, 1]) {
          const origin = { x: position.x - Math.sin(yaw) * offset, y: position.y + 0.5, z: position.z - Math.cos(yaw) * offset };
          const hit = world.castRayAndGetNormal(new RAPIER.Ray(origin, { x: 0, y: -1, z: 0 }), reach + 0.5, true,
            undefined, undefined, undefined, body, collider => supports.has(collider.handle));
          if (hit && hit.normal.y > 0.7) height = Math.max(height ?? -Infinity, origin.y - hit.toi);
        }
        return height;
      },
      sweep(position, yaw, movement) {
        if (Math.hypot(movement.x, movement.z) < 1e-9) return null;
        const hit = world.castShape(position, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, movement,
          shape, 1, false, undefined, undefined, undefined, body, collider => barriers.has(collider.handle));
        if (!hit) return null;
        let normal = { ...hit.normal1 };
        if (normal.x * movement.x + normal.z * movement.z > 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
        return { fraction: hit.toi, normal };
      },
    };
    sync();
    const detector = createRecoveryDetector(PHYSICS_DT);
    const fallback: RecoveryPoint = { ...spawn, y: 0.4, yaw: 0 };
    let recoveryPoint = { ...fallback }, recoveries = 0, lastRecoveryReason: RecoveryReason | null = null;
    const safePoint = (candidate: RecoveryPoint): RecoveryPoint | null => {
      if (disposed || !Object.values(candidate).every(Number.isFinite)) return null;
      world.propagateModifiedBodyPositionsToColliders(); world.updateSceneQueries();
      const ray = new RAPIER.Ray({ x: candidate.x, y: candidate.y + 4, z: candidate.z }, { x: 0, y: -1, z: 0 });
      const support = world.castRayAndGetNormal(ray, 8, true, undefined, undefined, undefined, body, collider => supports.has(collider.handle));
      if (!support || support.normal.y < 0.95) return null;
      const point = { ...candidate, y: ray.origin.y - support.toi + 0.4 };
      const rotation = { x: 0, y: Math.sin(point.yaw / 2), z: 0, w: Math.cos(point.yaw / 2) };
      const blocked = world.intersectionWithShape(point, rotation, new RAPIER.Cuboid(0.95, 0.36, 1.45), undefined, undefined, undefined, body);
      return blocked ? null : point;
    };
    const setRecoveryPoint = (candidate: RecoveryPoint) => {
      const point = safePoint(candidate);
      if (!point) return false;
      recoveryPoint = point; detector.clear(); return true;
    };
    const reset = (position = spawn, heading = 0) => {
      if (disposed) return;
      motion.reset(position, heading); sync(); resets++; detector.clear();
    };
    const recover = (reason: RecoveryReason = 'manual') => {
      const point = safePoint(recoveryPoint) ?? safePoint(fallback);
      if (!point) return false;
      recoveryPoint = point; reset(point, point.yaw); recoveries++; lastRecoveryReason = reason; return true;
    };
    const step = (input: DrivingInput = NEUTRAL_INPUT) => {
      if (disposed) return;
      if (sceneKind === 'track') {
        const position = motion.position;
        if (position.y < RECOVERY_TUNING.fallHeight || Math.abs(position.x) > RECOVERY_TUNING.mapLimit || Math.abs(position.z) > RECOVERY_TUNING.mapLimit) { recover('fall'); input = NEUTRAL_INPUT; }
      }
      motion.step(PHYSICS_DT, queries, input, sceneKind === 'track'); sync(); steps++;
      if (sceneKind === 'track') { const reason = detector.sample(motion.position, motion.state.grounded, input); if (reason) recover(reason); }
    };
    return {
      version: RAPIER.version(),
      step, reset, recover, setRecoveryPoint,
      get steps() { return steps; },
      get resources() { return { worlds: disposed ? 0 : 1, bodies: disposed ? 0 : world.bodies.len(), colliders: disposed ? 0 : world.colliders.len() }; },
      get position() { return motion.position; },
      get pose() { return motion.pose; },
      get telemetry() { const state = motion.state, velocity = state.velocity; return { integration: 'custom-arcade', rapierSolver: false,
        grounded: state.grounded, drifting: state.drifting, airControl: state.airControl, bumps: state.bumps,
        commandedSpeed: state.driving.speed ?? 0, driftDirection: state.driving.driftDirection, driftCharge: state.driving.driftCharge,
        boostRemaining: state.driving.boostRemaining, yaw: motion.yaw, speed: Math.hypot(velocity.x, velocity.z), resets, recoveries,
        lastRecoveryReason, stuckSeconds: detector.stuckSeconds, recoveryPoint: { ...recoveryPoint } }; },
      dispose() { if (!disposed) { disposed = true; world.free(); } },
    };
  } catch (error) { world.free(); throw error; }
}

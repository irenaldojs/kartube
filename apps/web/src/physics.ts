import { TRACK_PARTS, TRACK_SPAWN, type SceneKind } from './track.ts';
import { controlKart, NEUTRAL_INPUT, type DrivingInput } from './driving.ts';
import { createRecoveryDetector, RECOVERY_TUNING, type RecoveryPoint, type RecoveryReason } from './recovery.ts';
import RAPIER from '@dimforge/rapier3d-compat';
let initialization: Promise<void> | undefined;
export const PHYSICS_DT = 1 / 60;
export async function createPhysics(sceneKind: SceneKind = 'drop') {
  initialization ??= RAPIER.init().catch((error: unknown) => { initialization = undefined; throw error; });
  await initialization;
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    world.timestep = PHYSICS_DT;
    const supports = new Set<number>();
    if (sceneKind === 'track') {
      for (const part of TRACK_PARTS) if (part.solid) {
        const angle = (part.rotationZ ?? 0) / 2;
        const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(part.size[0] / 2, part.size[1] / 2, part.size[2] / 2)
          .setTranslation(...part.position).setRotation({ x: 0, y: 0, z: Math.sin(angle), w: Math.cos(angle) }));
        if (part.kind === 'road' || part.kind === 'ramp') supports.add(collider.handle);
      }
    } else supports.add(world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.25, 7).setTranslation(0, -0.25, 0)).handle);
    const spawn = sceneKind === 'track' ? TRACK_SPAWN : { x: 0, y: 3, z: 0 };
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(spawn.x, spawn.y, spawn.z).lockRotations());
    body.enableCcd(true);
    // Small rounded edges cross flush slab seams without changing the outer kart dimensions.
    world.createCollider(RAPIER.ColliderDesc.roundCuboid(0.85, 0.30, 1.35, 0.05).setRestitution(0).setFriction(0), body);
    let disposed = false;
    let steps = 0, yaw = 0, grounded = false, resets = 0, drifting = false, airControl = false;
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
      body.setTranslation(position, true); body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setRotation({ x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }, true); yaw = heading; grounded = false; drifting = false; airControl = false; resets++; detector.clear();
    };
    const recover = (reason: RecoveryReason = 'manual') => {
      const point = safePoint(recoveryPoint) ?? safePoint(fallback);
      if (!point) return false;
      recoveryPoint = point; reset(point, point.yaw); recoveries++; lastRecoveryReason = reason; return true;
    };
    const step = (input: DrivingInput = NEUTRAL_INPUT) => {
      if (disposed) return;
      if (sceneKind === 'track') {
        const position = body.translation();
        if (position.y < RECOVERY_TUNING.fallHeight || Math.abs(position.x) > RECOVERY_TUNING.mapLimit || Math.abs(position.z) > RECOVERY_TUNING.mapLimit) { recover('fall'); input = NEUTRAL_INPUT; }
        const hit = world.castRay(new RAPIER.Ray(body.translation(), { x: 0, y: -1, z: 0 }), 0.55, true, undefined, undefined, undefined, body);
        grounded = hit !== null;
        const controlled = controlKart(body.linvel(), yaw, grounded, input, PHYSICS_DT);
        yaw = controlled.yaw; drifting = controlled.drifting; airControl = controlled.airControl;
        body.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
        body.setLinvel(controlled.velocity, true);
      }
      world.step(); steps++;
      if (sceneKind === 'track') { const reason = detector.sample(body.translation(), grounded, input); if (reason) recover(reason); }
    };
    return {
      version: RAPIER.version(),
      step, reset, recover, setRecoveryPoint,
      get steps() { return steps; },
      get resources() { return { worlds: disposed ? 0 : 1, bodies: disposed ? 0 : world.bodies.len(), colliders: disposed ? 0 : world.colliders.len() }; },
      get position() { return body.translation(); },
      get pose() { return { ...body.translation(), yaw }; },
      get telemetry() { const velocity = body.linvel(); return { grounded, drifting, airControl, yaw, speed: Math.hypot(velocity.x, velocity.z), resets, recoveries, lastRecoveryReason, stuckSeconds: detector.stuckSeconds, recoveryPoint: { ...recoveryPoint } }; },
      dispose() { if (!disposed) { disposed = true; world.free(); } },
    };
  } catch (error) { world.free(); throw error; }
}

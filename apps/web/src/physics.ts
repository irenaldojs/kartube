import { TRACK_PARTS, TRACK_SPAWN, type SceneKind } from './track.ts';
import { controlKart, NEUTRAL_INPUT, type DrivingInput } from './driving.ts';
import RAPIER from '@dimforge/rapier3d-compat';
let initialization: Promise<void> | undefined;
export const PHYSICS_DT = 1 / 60;
export async function createPhysics(sceneKind: SceneKind = 'drop') {
  initialization ??= RAPIER.init().catch((error: unknown) => { initialization = undefined; throw error; });
  await initialization;
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    world.timestep = PHYSICS_DT;
    if (sceneKind === 'track') {
      for (const part of TRACK_PARTS) if (part.solid) {
        const angle = (part.rotationZ ?? 0) / 2;
        world.createCollider(RAPIER.ColliderDesc.cuboid(part.size[0] / 2, part.size[1] / 2, part.size[2] / 2)
          .setTranslation(...part.position).setRotation({ x: 0, y: 0, z: Math.sin(angle), w: Math.cos(angle) }));
      }
    } else world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.25, 7).setTranslation(0, -0.25, 0));
    const spawn = sceneKind === 'track' ? TRACK_SPAWN : { x: 0, y: 3, z: 0 };
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(spawn.x, spawn.y, spawn.z).lockRotations());
    body.enableCcd(true);
    // Small rounded edges cross flush slab seams without changing the outer kart dimensions.
    world.createCollider(RAPIER.ColliderDesc.roundCuboid(0.85, 0.30, 1.35, 0.05).setRestitution(0).setFriction(0), body);
    let disposed = false;
    let steps = 0, yaw = 0, grounded = false, resets = 0, drifting = false, airControl = false;
    const reset = (position = spawn) => {
      if (disposed) return;
      body.setTranslation(position, true); body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); yaw = 0; grounded = false; drifting = false; airControl = false; resets++;
    };
    const step = (input: DrivingInput = NEUTRAL_INPUT) => {
      if (disposed) return;
      if (sceneKind === 'track') {
        if (body.translation().y < -8) reset();
        const hit = world.castRay(new RAPIER.Ray(body.translation(), { x: 0, y: -1, z: 0 }), 0.55, true, undefined, undefined, undefined, body);
        grounded = hit !== null;
        const controlled = controlKart(body.linvel(), yaw, grounded, input, PHYSICS_DT);
        yaw = controlled.yaw; drifting = controlled.drifting; airControl = controlled.airControl;
        body.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
        body.setLinvel(controlled.velocity, true);
      }
      world.step(); steps++;
    };
    return {
      version: RAPIER.version(),
      step, reset,
      get steps() { return steps; },
      get resources() { return { worlds: disposed ? 0 : 1, bodies: disposed ? 0 : world.bodies.len(), colliders: disposed ? 0 : world.colliders.len() }; },
      get position() { return body.translation(); },
      get pose() { return { ...body.translation(), yaw }; },
      get telemetry() { const velocity = body.linvel(); return { grounded, drifting, airControl, yaw, speed: Math.hypot(velocity.x, velocity.z), resets }; },
      dispose() { if (!disposed) { disposed = true; world.free(); } },
    };
  } catch (error) { world.free(); throw error; }
}

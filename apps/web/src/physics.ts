import { TRACK_PARTS, TRACK_SPAWN, type SceneKind } from './track.ts';
import RAPIER from '@dimforge/rapier3d-compat';
let initialization: Promise<void> | undefined;
export const PHYSICS_DT = 1 / 60;
export async function createPhysics(sceneKind: SceneKind = 'drop') {
  initialization ??= RAPIER.init();
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
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.9, 0.35, 1.4).setRestitution(0.1), body);
    let disposed = false;
    let steps = 0;
    return {
      version: RAPIER.version(),
      step() { if (!disposed) { world.step(); steps++; } },
      get steps() { return steps; },
      get position() { return body.translation(); },
      dispose() { if (!disposed) { disposed = true; world.free(); } },
    };
  } catch (error) { world.free(); throw error; }
}

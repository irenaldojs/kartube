import RAPIER from '@dimforge/rapier3d-compat';
let initialization: Promise<void> | undefined;
export const PHYSICS_DT = 1 / 60;
export async function createPhysics() {
  initialization ??= RAPIER.init();
  await initialization;
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    world.timestep = PHYSICS_DT;
    world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.25, 7).setTranslation(0, -0.25, 0));
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 3, 0).lockRotations());
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

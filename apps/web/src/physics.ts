import { TRACK_PARTS, TRACK_SPAWN, type SceneKind } from './track.ts';
import { KART_TUNING as tuning, NEUTRAL_INPUT, type DrivingInput } from './driving.ts';
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
    body.enableCcd(true);
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.9, 0.35, 1.4).setRestitution(0).setFriction(0), body);
    let disposed = false;
    let steps = 0, yaw = 0, grounded = false, resets = 0;
    const reset = () => {
      if (disposed) return;
      body.setTranslation(spawn, true); body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); yaw = 0; grounded = false; resets++;
    };
    const approach = (value: number, target: number, amount: number) => value + Math.max(-amount, Math.min(amount, target - value));
    const step = (input: DrivingInput = NEUTRAL_INPUT) => {
      if (disposed) return;
      if (sceneKind === 'track') {
        if (body.translation().y < -8) reset();
        const hit = world.castRay(new RAPIER.Ray(body.translation(), { x: 0, y: -1, z: 0 }), 0.55, true, undefined, undefined, undefined, body);
        grounded = hit !== null;
        if (grounded) {
          const velocity = body.linvel();
          let forwardX = -Math.sin(yaw), forwardZ = -Math.cos(yaw);
          let speed = velocity.x * forwardX + velocity.z * forwardZ;
          const throttle = Number.isFinite(input.throttle) ? Math.max(-1, Math.min(1, input.throttle)) : 0;
          const steering = Number.isFinite(input.steering) ? Math.max(-1, Math.min(1, input.steering)) : 0;
          if (input.brake) speed = approach(speed, 0, tuning.braking * PHYSICS_DT);
          else if (throttle !== 0) {
            const opposing = speed * throttle < 0;
            speed = approach(speed, throttle > 0 ? tuning.maxSpeed * throttle : tuning.reverseSpeed * throttle,
              (opposing ? tuning.braking : tuning.acceleration) * PHYSICS_DT);
          } else speed = approach(speed, 0, tuning.rollingDrag * PHYSICS_DT);
          yaw -= steering * tuning.turnRate * Math.min(Math.abs(speed) / 4, 1) * Math.sign(speed) * PHYSICS_DT;
          yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
          const lateralX = velocity.x - forwardX * (velocity.x * forwardX + velocity.z * forwardZ);
          const lateralZ = velocity.z - forwardZ * (velocity.x * forwardX + velocity.z * forwardZ);
          forwardX = -Math.sin(yaw); forwardZ = -Math.cos(yaw);
          const slip = Math.exp(-tuning.grip * PHYSICS_DT);
          body.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
          body.setLinvel({ x: forwardX * speed + lateralX * slip, y: velocity.y, z: forwardZ * speed + lateralZ * slip }, true);
        }
      }
      world.step(); steps++;
    };
    return {
      version: RAPIER.version(),
      step, reset,
      get steps() { return steps; },
      get position() { return body.translation(); },
      get pose() { return { ...body.translation(), yaw }; },
      get telemetry() { const velocity = body.linvel(); return { grounded, yaw, speed: Math.hypot(velocity.x, velocity.z), resets }; },
      dispose() { if (!disposed) { disposed = true; world.free(); } },
    };
  } catch (error) { world.free(); throw error; }
}

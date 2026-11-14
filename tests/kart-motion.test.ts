import assert from 'node:assert/strict';
import test from 'node:test';
import RAPIER from '@dimforge/rapier3d-compat';
import { createKartMotion, type CollisionQueries } from '../apps/web/src/kart-motion.ts';
import { createPhysics } from '../apps/web/src/physics.ts';
const forward = { throttle: 1, steering: 0, brake: false };
const flat: CollisionQueries = { ground: () => 0, sweep: () => null };

test('the whole arcade movement runs without a physics engine', () => {
  const kart = createKartMotion({ x: 0, y: 3, z: 0 });
  for (let i = 0; i < 120; i++) kart.step(1 / 60, flat);
  assert.equal(kart.position.y, 0.35);
  for (let i = 0; i < 120; i++) kart.step(1 / 60, flat, forward);
  assert.equal(kart.state.driving.speed, 12);
  for (let i = 0; i < 600; i++) { kart.step(1 / 60, flat, forward); assert.equal(kart.position.y, 0.35); assert.equal(kart.state.velocity.z, -12); }
});
test('swept queries clip movement and arcade code applies the response', () => {
  const kart = createKartMotion({ x: 0, y: 0.35, z: 0 });
  kart.step(1 / 60, flat, forward);
  const before = kart.position.z;
  kart.step(1 / 60, { ...flat, sweep: () => ({ fraction: 0.25, normal: { x: 0, y: 0, z: 1 } }) }, forward);
  assert.ok(kart.position.z > before - 0.4 / 60);
  assert.equal(kart.state.bumps, 1); assert.equal(kart.state.velocity.z, 2);
});
test('Rapier is used for queries without dynamic bodies, solver stepping or velocity integration', async () => {
  const step = RAPIER.World.prototype.step, dynamic = RAPIER.RigidBodyDesc.dynamic, velocity = RAPIER.RigidBody.prototype.setLinvel;
  RAPIER.World.prototype.step = () => { throw new Error('Solver must never run'); };
  RAPIER.RigidBodyDesc.dynamic = () => { throw new Error('No dynamic kart'); };
  RAPIER.RigidBody.prototype.setLinvel = () => { throw new Error('No Rapier velocity'); };
  try {
    const kart = await createPhysics('track');
    try {
      for (let i = 0; i < 240; i++) kart.step(forward);
      assert.ok(kart.position.z < 0);
      assert.equal(kart.telemetry.rapierSolver, false);
      assert.equal(kart.telemetry.integration, 'custom-arcade');
      assert.equal(kart.recover(), true);
    } finally { kart.dispose(); }
  } finally { RAPIER.World.prototype.step = step; RAPIER.RigidBodyDesc.dynamic = dynamic; RAPIER.RigidBody.prototype.setLinvel = velocity; }
});

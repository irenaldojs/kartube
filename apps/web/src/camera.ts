import * as THREE from 'three';
import type { SceneKind } from './track.ts';

export type CameraMode = 'chase' | 'overview';
export type KartPose = { x: number; y: number; z: number; yaw?: number; visualYawOffset?: number; visualRoll?: number };
export type CameraMotion = { speed?: number; steering?: number; drifting?: boolean; boosting?: boolean; grounded?: boolean; impacts?: number; reducedMotion?: boolean };

export const CAMERA_TUNING = {
  baseFov: 60,
  speedFov: 5,
  boostFov: 12,
  maxFov: 80,
  maxBank: 0,
  maxReferenceSpeed: 15,

  distance: 7,            // distância "em repouso"
  height: 3.4,
  lookAhead: 4,
  lookHeight: 1.1,

  // --- Corda elástica (distância) ---
  stretchMax: 2.5,        // quanto afasta na velocidade máxima
  accelGain: 2.2,         // quanto a aceleração puxa/empurra a câmera
  accelClamp: 2.5,        // limite desse efeito
  boostKick: 2.2,         // chute extra no boost
  stretchStiffness: 30,   // menor = corda mais mole
  stretchDamping: 0.5,    // 0.3 = quica bastante | 1 = sem repique

  // --- Rotação elástica (yaw) ---
  yawStiffness: 80,       // menor = câmera fica mais atrás na curva
  driftYawStiffness: 22,  // no drift fica ainda mais frouxa
  yawDamping: 0.85,
  turnSwingGain: 0.1,     // rad extra por (rad/s) de giro: exagera a rotação do kart
  maxTurnSwing: 0.35,
};

const finite = (v: number | undefined) => (Number.isFinite(v) ? v! : 0);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

type Spring = { x: number; v: number };

// Mola amortecida (integração em subpassos para ficar estável com dt grande)
function stepSpring(s: Spring, target: number, stiffness: number, ratio: number, dt: number, angular = false) {
  const steps = Math.max(1, Math.ceil(dt * 120));
  const h = dt / steps;
  const c = 2 * ratio * Math.sqrt(stiffness);
  for (let i = 0; i < steps; i++) {
    const err = angular ? wrapAngle(target - s.x) : target - s.x;
    s.v += (stiffness * err - c * s.v) * h;
    s.x += s.v * h;
  }
}

export function createCameraRig(camera: THREE.PerspectiveCamera, scene: SceneKind, initialMode: CameraMode) {
  const T = CAMERA_TUNING;
  let mode = initialMode, initialized = false, previousReduced = false;

  let focusY = 0, height: number = T.height;
  const yaw: Spring = { x: 0, v: 0 };
  const stretch: Spring = { x: 0, v: 0 };
  let prevHeading = 0, turnRate = 0;
  let prevSpeed = 0, accel = 0;
  let bank = 0, fov: number = T.baseFov;
  let lastImpact = 0, impactTime = 0;

  const desired = new THREE.Vector3(), target = new THREE.Vector3();

  return {
    setMode(value: CameraMode) {
      mode = value;
      initialized = false;
    },

    update(pose: KartPose, elapsed: number, motion: CameraMotion = {}) {
      const dt = clamp(elapsed, 0, 0.1);
      const reduced = motion.reducedMotion === true;

      if (reduced !== previousReduced) initialized = false;
      previousReduced = reduced;

      const blend = (rate: number) => (initialized ? 1 - Math.exp(-rate * dt) : 1);
      const active = mode === 'chase' && !reduced;

      const rawSpeed = finite(motion.speed);
      const speed = clamp(rawSpeed / T.maxReferenceSpeed, 0, 1);
      const steering = clamp(finite(motion.steering), -1, 1);
      const drifting = active && motion.drifting === true;
      const boost = active && motion.boosting ? 1 : 0;
      const air = active && motion.grounded === false ? 1 : 0;
      const heading = pose.yaw ?? 0;

      if (!initialized) {
        focusY = pose.y;
        height = T.height;
        yaw.x = heading; yaw.v = 0;
        stretch.x = 0; stretch.v = 0;
        prevHeading = heading; turnRate = 0;
        prevSpeed = rawSpeed; accel = 0;
        lastImpact = motion.impacts ?? 0;
        impactTime = 0;
      }

      if (active && (motion.impacts ?? 0) > lastImpact) impactTime = 0.16;
      lastImpact = motion.impacts ?? 0;
      impactTime = Math.max(0, impactTime - dt);

      // Aceleração longitudinal suavizada (u/s²)
      if (dt > 1e-4) {
        const a = (rawSpeed - prevSpeed) / dt;
        accel += (a - accel) * blend(8);
      }
      prevSpeed = rawSpeed;

      // Taxa de giro do kart (rad/s) suavizada: dá o sentido da curva
      if (dt > 1e-4) {
        const w = wrapAngle(heading - prevHeading) / dt;
        turnRate += (w - turnRate) * blend(10);
      }
      prevHeading = heading;

      // FOV
      const targetFov = active
        ? Math.min(T.maxFov, T.baseFov + speed * T.speedFov + boost * T.boostFov + clamp(stretch.x, 0, 4) * 0.8 + air * 1.5 + (impactTime / 0.16) * 2)
        : T.baseFov;
      fov += (targetFov - fov) * blend(6);

      const targetBank = active ? -steering * speed * T.maxBank : 0;
      bank += (targetBank - bank) * blend(8);

      if (mode === 'overview') {
        if (scene === 'track') {
          desired.set(65, 78, 84);
          target.set(0, 0, 0);
        } else {
          desired.set(13, 10, 14);
          target.set(0, 0.8, 0);
        }
      } else {
        if (active) {
          // ---- Corda elástica: alvo = velocidade + aceleração + boost ----
          const accelNorm = accel / T.maxReferenceSpeed;
          const stretchTarget =
            speed * T.stretchMax +
            clamp(accelNorm * T.accelGain, -T.accelClamp, T.accelClamp) +
            boost * T.boostKick;
          stepSpring(stretch, stretchTarget, T.stretchStiffness, T.stretchDamping, dt);

          // ---- Yaw elástico ----
          stepSpring(yaw, heading, drifting ? T.driftYawStiffness : T.yawStiffness, T.yawDamping, dt, true);
        } else {
          stretch.x = 0; stretch.v = 0;
          yaw.x = heading; yaw.v = 0;
        }

        const dist = Math.max(4.5, T.distance + stretch.x);

        // Altura: um pouco mais baixa em velocidade, sobe no ar
        const targetHeight = active ? T.height - speed * 0.25 + air * 0.8 : T.height;
        height += (targetHeight - height) * blend(5);
        focusY += (pose.y - focusY) * blend(active ? 8 : 100);

        // Giro extra no sentido da curva (mesmo sentido do atraso natural)
        const swing = active
          ? clamp(-turnRate * T.turnSwingGain * (drifting ? 1.6 : 1), -T.maxTurnSwing, T.maxTurnSwing)
          : 0;
        const camYaw = yaw.x + swing;

        desired.set(
          pose.x + Math.sin(camYaw) * dist,
          focusY + height,
          pose.z + Math.cos(camYaw) * dist,
        );
        target.set(
          pose.x - Math.sin(camYaw) * T.lookAhead,
          focusY + T.lookHeight + air * 0.3,
          pose.z - Math.cos(camYaw) * T.lookAhead,
        );
      }

      camera.position.copy(desired);
      camera.lookAt(target);
      if (Math.abs(bank) > 0.0001) camera.rotateZ(bank);

      if (Math.abs(camera.fov - fov) > 1e-6) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      initialized = true;
    },

    get info() {
      return { mode, position: camera.position.toArray(), target: target.toArray(), fov, bankRadians: bank, reducedMotion: previousReduced };
    },
  };
}
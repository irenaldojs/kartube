import * as THREE from 'three';
import type { SceneKind } from './track.ts';

export type CameraMode = 'chase' | 'overview';
export type KartPose = { x: number; y: number; z: number; yaw?: number };

export function createCameraRig(camera: THREE.PerspectiveCamera, scene: SceneKind, initialMode: CameraMode) {
  let mode = initialMode, initialized = false;
  const desired = new THREE.Vector3(), target = new THREE.Vector3(), lookAt = new THREE.Vector3();
  return {
    setMode(value: CameraMode) { mode = value; initialized = false; },
    update(pose: KartPose, elapsed: number) {
      if (mode === 'overview') {
        if (scene === 'track') { desired.set(65, 78, 84); target.set(0, 0, 0); }
        else { desired.set(13, 10, 14); target.set(0, 0.8, 0); }
      } else {
        const yaw = pose.yaw ?? 0;
        // Forward is -Z. Rotate the trailing offset and look-ahead by the kart heading.
        desired.set(pose.x + Math.sin(yaw) * 9, pose.y + 5, pose.z + Math.cos(yaw) * 9);
        target.set(pose.x - Math.sin(yaw) * 2, pose.y + 0.6, pose.z - Math.cos(yaw) * 2);
      }
      const alpha = initialized ? 1 - Math.exp(-8 * Math.min(Math.max(elapsed, 0), 0.1)) : 1;
      camera.position.lerp(desired, alpha); lookAt.lerp(target, alpha);
      camera.lookAt(lookAt); initialized = true;
    },
    get info() { return { mode, position: camera.position.toArray(), target: lookAt.toArray() }; },
  };
}

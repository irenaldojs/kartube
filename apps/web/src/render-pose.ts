import type { KartPose } from './camera.ts';
const angle = (from: number, to: number, alpha: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * alpha;
// One fixed tick of visual latency; simulation, input and checkpoint positions are untouched.
export function createPoseInterpolator(initial: KartPose) {
  let previous = { ...initial }, current = { ...initial };
  const snap = (pose: KartPose) => { previous = { ...pose }; current = { ...pose }; };
  return {
    snap,
    push(pose: KartPose) {
      if (Math.hypot(pose.x - current.x, pose.y - current.y, pose.z - current.z) > 2) { snap(pose); return; }
      previous = current; current = { ...pose };
    },
    sample(fraction: number): KartPose {
      const alpha = Math.max(0, Math.min(1, fraction));
      return { x: previous.x + (current.x - previous.x) * alpha, y: previous.y + (current.y - previous.y) * alpha,
        z: previous.z + (current.z - previous.z) * alpha, yaw: angle(previous.yaw ?? 0, current.yaw ?? 0, alpha),
        visualYawOffset: angle(previous.visualYawOffset ?? 0, current.visualYawOffset ?? 0, alpha),
        visualRoll: (previous.visualRoll ?? 0) + ((current.visualRoll ?? 0) - (previous.visualRoll ?? 0)) * alpha };
    },
  };
}

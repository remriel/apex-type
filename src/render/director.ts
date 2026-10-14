import * as THREE from 'three';
import type { Phase } from '../simulation/race';

type Pose = { camera: THREE.Vector3; target: THREE.Vector3; fov: number };

/** Auto is an explicit camera choice, independent of ambient motion effects. */
export function raceCameraPose(mode: 'auto' | 'chase', phase: Phase, chase: Pose,
  position: THREE.Vector3, tangent: THREE.Vector3, progress: number, aspect: number) {
  return mode==='auto'&&phase!=='finished'
    ?directedPose(chase,position,tangent,progress,aspect):chase;
}
// Long chase holds, with slower bridges into overview and reverse tracking shots.
const shots = [
  [0, 'chase'], [.12, 'chase'], [.23, 'circuit'], [.28, 'circuit'],
  [.39, 'chase'], [.49, 'chase'], [.60, 'front'], [.66, 'front'],
  [.78, 'chase'], [1, 'chase']
] as const;

/** Blend around the player on an orbit, never on a straight line through the car. */
export function directedPose(chase: Pose, position: THREE.Vector3, tangent: THREE.Vector3,
  progress: number, aspect: number): Pose {
  const portrait = THREE.MathUtils.clamp(1 / Math.max(aspect, .3) - 1, 0, 1.4);
  const forward = tangent.clone().setY(0).normalize();
  const side = forward.clone().cross(new THREE.Vector3(0, 1, 0));
  const front: Pose = {
    camera: position.clone().addScaledVector(forward, 29 + portrait * 10)
      .addScaledVector(side, 9).add(new THREE.Vector3(0, 10 + portrait * 6, 0)),
    target: position.clone().addScaledVector(forward, -4).add(new THREE.Vector3(0, 1.5, 0)), fov: 53
  };
  const factor = Math.max(1, 1.38 / aspect);
  const circuit: Pose = {
    camera: position.clone().addScaledVector(forward, -210 * factor)
      .addScaledVector(side, -114 * factor).add(new THREE.Vector3(0, 185 * factor, 0)),
    target: position.clone().multiplyScalar(.25), fov: 43
  };
  const poses = { chase, front, circuit };
  const lap = THREE.MathUtils.clamp(progress, 0, 1);
  let index = 0;
  while (index < shots.length - 2 && lap > shots[index + 1][0]) index++;
  const [start, from] = shots[index], [end, to] = shots[index + 1];
  const u = THREE.MathUtils.clamp((lap - start) / (end - start), 0, 1);
  const blend = u * u * u * (u * (u * 6 - 15) + 10);
  const a = poses[from], b = poses[to];
  const offsetA = a.camera.clone().sub(position), offsetB = b.camera.clone().sub(position);
  // Measure in the track frame so changing track heading cannot flip the orbit path.
  const angleA = Math.atan2(offsetA.dot(side), offsetA.dot(forward));
  const angleB = Math.atan2(offsetB.dot(side), offsetB.dot(forward));
  const delta = Math.atan2(Math.sin(angleB - angleA), Math.cos(angleB - angleA));
  const angle = angleA + delta * blend;
  const radius = THREE.MathUtils.lerp(Math.hypot(offsetA.x, offsetA.z), Math.hypot(offsetB.x, offsetB.z), blend);
  const camera = position.clone().addScaledVector(side, Math.sin(angle) * radius)
    .addScaledVector(forward, Math.cos(angle) * radius);
  camera.y += THREE.MathUtils.lerp(offsetA.y, offsetB.y, blend);
  const target = a.target.clone().lerp(b.target, blend);
  // Narrow screens need the subject closer to center during the side-on bridges.
  if(aspect<1)target.lerp(position, (1-aspect)*.9);
  return { camera, target, fov: THREE.MathUtils.lerp(a.fov, b.fov, blend) };
}

import * as THREE from 'three';
import type { Phase } from '../simulation/race';

const up = new THREE.Vector3(0, 1, 0);

/** Continuous race-directed framing; no timed cuts while the player is typing. */
export function chasePose(position: THREE.Vector3, tangent: THREE.Vector3,
  ahead: THREE.Vector3, speed: number, battle: number, phase: Phase,
  aspect: number, reducedMotion: boolean) {
  const pace = reducedMotion ? 0 : THREE.MathUtils.clamp(speed / 24, 0, 1);
  const contest = reducedMotion || phase !== 'running' ? 0 : THREE.MathUtils.clamp(battle, 0, 1);
  const turn = reducedMotion ? 0 : THREE.MathUtils.clamp(
    tangent.clone().cross(ahead).y * 2, -1, 1);
  const side = tangent.clone().cross(up).normalize();
  const portrait = THREE.MathUtils.clamp(1 / Math.max(aspect, 0.3) - 1, 0, 1.4);
  const finished = phase === 'finished' && !reducedMotion;
  const distance = (finished ? 17 : 20 + pace * 7 + contest * 5) + portrait * 8;
  const height = (finished ? 9 : 10 + pace * 2 + contest * 4) + portrait * 4;
  const camera = position.clone().addScaledVector(tangent, -distance)
    .addScaledVector(side, finished ? 10 : -turn * 5).addScaledVector(up, height);
  const target = position.clone().addScaledVector(tangent, finished ? 3 : 9 + pace * 7)
    .addScaledVector(reducedMotion ? tangent : ahead, finished ? 0 : 6 + pace * 4).addScaledVector(up, 1.5);
  return { camera, target, fov: reducedMotion ? 48 : finished ? 45 : 48 + pace * 9 + contest * 3 };
}

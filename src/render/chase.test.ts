import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { chasePose } from './chase.ts';

const p = new THREE.Vector3(0, 1, 0);
const t = new THREE.Vector3(0, 0, 1);
const pose = (speed = 0, battle = 0, phase: 'running' | 'finished' = 'running', aspect = 1.8, reduced = false,
  ahead = t) => chasePose(p, t, ahead, speed, battle, phase, aspect, reduced);

test('speed and nearby rivals widen chase framing while retaining the player', () => {
  const idle = pose(), fast = pose(24), battle = pose(24, 1);
  assert.ok(fast.fov > idle.fov && fast.camera.z < idle.camera.z);
  assert.ok(battle.fov > fast.fov && battle.camera.y > fast.camera.y);
  for (const shot of [idle, fast, battle, pose(24, 1, 'finished'), pose(24, 1, 'running', 0.45)]) {
    const camera = new THREE.PerspectiveCamera(shot.fov, 0.45, 0.1, 1800);
    camera.position.copy(shot.camera); camera.lookAt(shot.target); camera.updateMatrixWorld();
    const screen = p.clone().project(camera);
    assert.ok(Math.abs(screen.x) < 0.9 && Math.abs(screen.y) < 0.9 && screen.z < 1);
  }
});

test('corner anticipation mirrors for left and right turns', () => {
  const left = pose(12, 0, 'running', 1.8, false, new THREE.Vector3(-0.5, 0, 0.866));
  const right = pose(12, 0, 'running', 1.8, false, new THREE.Vector3(0.5, 0, 0.866));
  assert.ok(Math.abs(left.camera.x + right.camera.x) < 1e-8);
  assert.ok(left.camera.x !== 0 && left.target.x * right.target.x < 0);
});

test('reduced motion disables speed zoom, corner swing, battle and finish effects', () => {
  assert.deepEqual(pose(24, 1, 'running', 1.8, true, new THREE.Vector3(1, 0, 0)),
    pose(0, 0, 'running', 1.8, true));
  assert.deepEqual(pose(24, 1, 'finished', 1.8, true, new THREE.Vector3(1, 0, 0)).camera,
    pose(0, 0, 'running', 1.8, true).camera);
  assert.equal(pose(24, 1, 'running', 1.8, true).fov, 48);
});

test('portrait framing and extreme speed stay bounded', () => {
  assert.ok(pose(12, 0, 'running', 0.45).camera.y > pose(12).camera.y);
  assert.deepEqual(pose(1e6, 1).camera, pose(24, 1).camera);
  assert.equal(pose(1e6, 1).fov, 60);
});

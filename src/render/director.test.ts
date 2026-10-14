import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { directedPose } from './director.ts';
import { chasePose } from './chase.ts';

test('director visits chase, circuit and ahead-looking-back shots by lap progress', () => {
  const p = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(0, 0, 1);
  const chase = chasePose(p,t,t,12,0,'running',1.8,false);
  const shot = (lap: number) => directedPose(chase,p,t,lap,1.8);
  assert.ok(shot(.05).camera.z < 0);
  assert.ok(shot(.25).camera.y > 180);
  assert.ok(shot(.63).camera.z > 0);
  assert.ok(shot(.63).target.z < p.z);
  assert.ok(shot(.8).camera.distanceTo(chase.camera) < 1e-8);
});

test('dense lap samples keep player visible, above ground, and transitions continuous', () => {
  for (const aspect of [1.8, .45]) {
    let previous: THREE.Vector3 | undefined;
    for (let i=0; i<=4000; i++) {
      const lap=i/4000, heading=lap*Math.PI*6;
      const p=new THREE.Vector3(Math.cos(lap*6.28)*100,2,Math.sin(lap*6.28)*100);
      const t=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading));
      const chase=chasePose(p,t,t,12,0,'running',aspect,false);
      const shot=directedPose(chase,p,t,lap,aspect);
      assert.ok(shot.camera.y-p.y>=9);
      assert.ok(Math.hypot(shot.camera.x-p.x,shot.camera.z-p.z)>19);
      if(previous)assert.ok(shot.camera.distanceTo(previous)<12, `jump at ${lap}`);
      previous=shot.camera;
      const camera=new THREE.PerspectiveCamera(shot.fov,aspect,.1,1800);
      camera.position.copy(shot.camera);camera.lookAt(shot.target);camera.updateMatrixWorld();
      const screen=p.clone().project(camera);
      assert.ok(Math.abs(screen.x)<.95&&Math.abs(screen.y)<.95&&screen.z<1, `player outside at ${lap}/${aspect}`);
    }
  }
});

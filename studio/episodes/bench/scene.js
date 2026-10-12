// petit décor de test pour mesurer la vitesse de tournage
import { THREE, createStage, makeSky, M, add, box, bake, terrain, noise2, makePerson, HUD, sm, dirAzEl } from '../../engine.js';
import { building, makeWater } from '../../lib.js';
export default async function () {
  const QQ = new URLSearchParams(location.search); const stage = createStage({ samples: Number(QQ.get('samples') ?? 0), fxaaOn: QQ.get('fxaa') !== '0' });
  const { scene, camera, renderer } = stage; const Q = new URLSearchParams(location.search);
  if (Q.get('bloom') === '0') stage.bloomPass.enabled = false;
  if (Q.get('shadows') === '0') renderer.shadowMap.enabled = false;
  const sky = makeSky(scene, { stars: 1 }); sky.u.uDay.value = 0.6;
  const world = new THREE.Group();
  const n = noise2(3);
  add(new THREE.BufferGeometry().copy(terrain(400, 400, 120, (x, z) => n(x * 0.02, z * 0.02) * 20 - 5, (x, z, y) => (y > 3 ? '#7d8f5f' : '#c9b48a'))), M('#ffffff', { vc: true }), world);
  for (let i = 0; i < 10; i++) building(world, { x: -20 + i * 5, z: -30, w: 5, h: 10 + (i % 3) * 3, R: Math.random });
  scene.add(bake(world));
  const water = makeWater(scene, { w: 400, d: 200, z: -150 });
  const sun = new THREE.DirectionalLight('#ffe1b8', 3); sun.position.set(30, 60, 20); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60 }); scene.add(sun);
  scene.add(new THREE.HemisphereLight('#cfe0f5', '#9a8466', 0.9));
  const people = []; for (let i = 0; i < 8; i++) { const p = makePerson(scene, { shirt: '#c4473a', pants: '#2f3a4f' }); p.root.position.set(-6 + i * 1.6, 0, 8); people.push(p); }
  const T = { duration: 10 };
  return { stage, T, update(t) {
    camera.position.set(0, 6, 25); camera.lookAt(0, 5, -20); sky.follow(camera);
    water.U.uTime.value = t; people.forEach((p, i) => p.walk(t * 4 + i));
    HUD.block(1, { label: 'TEST', value: String(t.toFixed(2)), sub: 'SUB' }); HUD.show2(false); HUD.live(t, 'LIGNE 1', 'LIGNE 2'); HUD.subs(t, [[0, 10, 'Un sous-titre de test.']]);
  } };
}

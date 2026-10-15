// test : la cagoule moulée (gros plans de face et de profil)
import { THREE, createStage } from '../../engine.js';
import { makePS2 } from '../../lib-ps2.js';
import { loadMixamo, balaclava } from '../../lib-mixamo.js';
const Q = new URLSearchParams(location.search);
export default async function () {
  const stage = createStage({ fov: 30, far: 200 }); const { scene, camera } = stage;
  makePS2(stage, { width: 360 });
  scene.background = new THREE.Color('#5d6a7c');
  scene.add(new THREE.HemisphereLight('#dfe8f5', '#4a3e30', 1.3)); const kl = new THREE.DirectionalLight('#fff0d6', 2.6); kl.position.set(3, 6, 5); scene.add(kl);
  const names = (Q.get('n') || 'Josh,Leonard').split(',');
  const CAST = await loadMixamo({ chars: names, anims: ['idle', 'texting'] });
  const P = names.map((n, i) => { const p = CAST.make(n); p.root.position.set((i - (names.length - 1) / 2) * 0.6, 0, 0); scene.add(p.root); balaclava(p); return p; });
  const view = Q.get('v') || 'face';
  return { stage, T: { duration: 4 }, update(t) {
    for (const p of P) p.pose('texting', t + 2);
    if (view === 'face') { camera.position.set(0, 1.6, 2.2); camera.lookAt(0, 1.58, 0); camera.fov = 22; }
    else if (view === 'side') { camera.position.set(2.2, 1.6, 0.2); camera.lookAt(0, 1.58, 0); camera.fov = 22; }
    else { camera.position.set(0, 1.2, 5); camera.lookAt(0, 1.0, 0); camera.fov = 30; }
    camera.updateProjectionMatrix();
  } };
}

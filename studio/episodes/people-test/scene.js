// laboratoire de poses : quel axe fait quoi ? (bras GAUCHE du personnage = côté droit de l'image, il nous regarde)
import { THREE, createStage, HUD } from '../../engine.js';
import { loadPeople } from '../../lib-people.js';

export default async function () {
  const stage = createStage({ fov: 30, far: 500, bloom: [0.1, 0.4, 0.95] });
  const { scene, camera, renderer } = stage;
  scene.background = new THREE.Color('#20242c');
  const PEOPLE = await loadPeople(renderer);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const key = new THREE.DirectionalLight('#fff1dc', 2.5); key.position.set(3, 6, 5); scene.add(key);
  scene.add(new THREE.HemisphereLight('#bcd0ff', '#2a2420', 1.0));
  const specs = [
    { LeftArm: [['x', 1.2]] }, { LeftArm: [['x', -1.2]] }, { LeftArm: [['y', 1.2]] }, { LeftArm: [['y', -1.2]] },
    { LeftArm: [['y', -1.3]], LeftForeArm: [['y', -1.8]] }, { LeftArm: [['y', -1.3]], LeftForeArm: [['y', 1.8]] },
  ];
  const P = specs.map((s, i) => { const p = PEOPLE.make({ outfit: i }); p.root.position.set(-1.5 + i * 0.6, 0, 0); p.root.rotation.y = -0.6; scene.add(p.root); p.do(s); return p; });
  const T = { duration: 1 };
  return { stage, T, update() { camera.position.set(0, 1.3, 8); camera.lookAt(0, 1.0, 0); HUD.show2(false); } };
}

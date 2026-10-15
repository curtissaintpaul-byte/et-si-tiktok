// =====================================================================
//  LE SUPERMARCHÉ (style « reconstitution », avec lib-ps2.js) — pour « Et si Internet s'arrêtait partout sur Terre ? » (v2)
//  Une allée entre deux grandes étagères pleines de produits génériques (boîtes, bouteilles, paquets : aucune vraie marque),
//  les néons au plafond, le carrelage, les panneaux de rayon. M.empty(k) vide les rayons (0 = plein, 1 = presque vide) :
//  chaque produit a son « tour », comme quand les gens se servent les uns après les autres.
//
//  const M = buildMarket(scene, { at });  → M.empty(k), M.lights, M.amb, M.aisle (le milieu de l'allée), M.sign(txt)
// =====================================================================
import { THREE, rng } from './engine.js';
import { pixTex } from './lib-ps2.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
const bx = (w, h, d, mat, p, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; p.add(m); return m; };

export function buildMarket(scene, { at = V3(0, 0, 800), L = 18 } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, L + 6), std({ map: pixTex(16, 16, (g, w, h) => { g.fillStyle = '#a8a39a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); }, [10, 24]), roughness: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, L + 6), std({ color: '#9a9a96' })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 4.2; G.add(ceil);
  bx(10, 4.2, 0.1, std({ color: '#c9c3b6' }), G, 0, 2.1, -L / 2 - 2); bx(0.1, 4.2, L + 6, std({ color: '#c9c3b6' }), G, -5, 2.1, 0); bx(0.1, 4.2, L + 6, std({ color: '#c9c3b6' }), G, 5, 2.1, 0);
  // les néons
  const neon = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#eef4ff', emissiveIntensity: 1.4 });
  for (let z = -L / 2; z <= L / 2; z += 3) bx(0.25, 0.06, 2.2, neon, G, 0, 4.12, z);
  // les étagères (côté x = -1.35 et x = +1.35, tournées vers l'allée), 5 niveaux
  const metal = std({ color: '#d9dcdf', roughness: 0.5, metalness: 0.4 }), tagM = std({ color: '#f4d03f', emissive: '#f4d03f', emissiveIntensity: 0.15 });
  const LEV = [0.12, 0.55, 0.98, 1.41, 1.84];
  for (const s of [-1, 1]) {
    const x = s * 1.55; bx(0.06, 2.3, L, metal, G, x + s * 0.32, 1.15, 0);   // le fond
    for (const y of LEV) { bx(0.7, 0.03, L, metal, G, x, y, 0); bx(0.02, 0.05, L, tagM, G, x - s * 0.35, y - 0.02, 0); }
    bx(0.7, 0.12, L, std({ color: '#7d8590' }), G, x, 0.06, 0);
  }
  // les produits : des instances (boîtes, bouteilles, paquets), chacun avec son « tour » pour disparaître
  const r = rng(31), COLS = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#ecf0f1', '#d35400', '#16a085', '#7f8c8d', '#f5cba7', '#2c3e50'];
  const kinds = [{ geo: new THREE.BoxGeometry(0.18, 0.28, 0.07), w: 0.2 }, { geo: new THREE.CylinderGeometry(0.04, 0.045, 0.3, 8), w: 0.1 }, { geo: new THREE.BoxGeometry(0.13, 0.2, 0.13), w: 0.15 }, { geo: new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), w: 0.12 }];
  const items = kinds.map(() => []);
  for (const s of [-1, 1]) for (const y of LEV) {
    let z = -L / 2 + 0.1; let block = 0, kind = 0, col = 0;
    while (z < L / 2 - 0.1) {
      if (block <= 0) { kind = Math.floor(r() * kinds.length); col = Math.floor(r() * COLS.length); block = 3 + Math.floor(r() * 8); }
      const K = kinds[kind];
      for (let d = 0; d < 2; d++) items[kind].push({ x: s * (1.55 - 0.12 + d * 0.22), y: y + 0.015, z, col, turn: r(), h: K.geo.parameters.height ?? K.geo.parameters.height });
      z += K.w + 0.02; block--;
    }
  }
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), S1 = V3(1, 1, 1), S0 = V3(0, 0, 0), POS = V3(0, 0, 0), colr = new THREE.Color();
  const meshes = kinds.map((K, i) => {
    const im = new THREE.InstancedMesh(K.geo, std({ roughness: 0.6 }), items[i].length); im.castShadow = false; im.receiveShadow = true;
    items[i].forEach((it, j) => { const hh = K.geo.parameters.height || 0.2; POS.set(it.x, it.y + hh / 2, it.z); M4.compose(POS, Q0, S1); im.setMatrixAt(j, M4); im.setColorAt(j, colr.set(COLS[it.col]).offsetHSL(0, 0, (r() - 0.5) * 0.08)); });
    G.add(im); return im;
  });
  let shownK = -1;
  function empty(k) {
    k = Math.round(k * 200) / 200; if (k === shownK) return; shownK = k;
    meshes.forEach((im, i) => { const K = kinds[i], hh = K.geo.parameters.height || 0.2;
      items[i].forEach((it, j) => { POS.set(it.x, it.y + hh / 2, it.z); M4.compose(POS, Q0, it.turn < k * 0.93 ? S0 : S1); im.setMatrixAt(j, M4); }); im.instanceMatrix.needsUpdate = true; });
  }
  empty(0);
  // les panneaux de rayon (suspendus)
  const signC = document.createElement('canvas'); signC.width = 256; signC.height = 64; const sg = signC.getContext('2d'); const signT = new THREE.CanvasTexture(signC); signT.colorSpace = THREE.SRGBColorSpace;
  const sign = (txt) => { sg.fillStyle = '#1f6f4a'; sg.fillRect(0, 0, 256, 64); sg.fillStyle = '#fff'; sg.font = 'bold 26px Inter'; sg.textAlign = 'center'; sg.fillText(txt, 128, 42); signT.needsUpdate = true; };
  sign('PÂTES · RIZ · CONSERVES');
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: signT })); sm.position.set(0, 3.2, -3); G.add(sm);
  const sm2 = sm.clone(); sm2.rotation.y = Math.PI; sm2.position.z = -2.99; G.add(sm2);
  // les lumières : un plafond de néons (deux grandes lumières douces), et l'ambiance
  const L1 = new THREE.PointLight('#f2f6ff', 0, 14, 1.2); L1.position.set(0, 3.9, -3); G.add(L1);
  const L2 = new THREE.PointLight('#f2f6ff', 0, 14, 1.2); L2.position.set(0, 3.9, 4); G.add(L2);
  const amb = new THREE.HemisphereLight('#e8ecf2', '#8a857c', 0); G.add(amb);
  return { root: G, at, empty, sign, lights: [L1, L2], amb, aisle: at.clone(), on(k) { L1.intensity = L2.intensity = 9 * k; amb.intensity = 0.38 * k; neon.emissiveIntensity = 1.0 * k; } };
}

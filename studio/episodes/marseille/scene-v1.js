// =====================================================================
//  ÉPISODE : « Et si la Terre s'arrêtait de tourner ? »
//  Décor : le Vieux-Port de Marseille, vu du quai des Belges (on regarde vers l'ouest, vers la mer).
//  Faits : Marseille (43,3° N) tourne à 1 674 × cos(43,3°) ≈ 1 218 km/h. Record de vent : 408 km/h.
//  Si le sol freine, l'air et la mer continuent vers l'EST… c'est-à-dire vers la caméra.
// =====================================================================
import { THREE, dotTex, createStage, makeSky, makeSun, M, add, box, cyl, prismZ, bake, noise2, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, FX, canvasTex } from '../../engine.js';
import { makeWater, Fleet } from '../../lib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const T = {
  hookOut: 3.0, brake: 14.0, stopped: 26.0, surge: 29.0, waveHit: 47.4, black: 48.2, endCard: 53.0, duration: 57.0,
};
const SUBS = [
  [3.4, 8.2, 'Marseille tourne avec la Terre à 1 200 km/h.'],
  [8.6, 13.0, 'Tu ne le sens pas : tout tourne avec toi.'],
  [13.4, 17.8, 'Et si la Terre s’arrêtait en une minute ?'],
  [18.2, 23.0, 'L’air, lui, ne s’arrête pas.'],
  [23.4, 28.4, '1 200 km/h : trois fois le record du monde.'],
  [28.8, 33.6, 'La mer non plus ne s’arrête pas.'],
  [34.0, 39.0, 'Elle déferle sur la ville.'],
  [39.4, 44.4, 'Puis tout le reste suit.'],
  [48.9, 52.6, 'Et après ? Une journée y durerait un an.'],
];
const V0 = 1218;                                   // km/h, vitesse de Marseille autour de l'axe de la Terre
const brakeK = (t) => sm(T.brake, T.stopped, t);   // 0 → 1 : la Terre freine pendant « une minute » (accélérée ×5)
const windKmh = (t) => 11 + (V0 - 11) * brakeK(t); // l'air continue : le vent = la différence de vitesse
// distance parcourue par l'air (en m, temps de la vidéo), pour faire défiler nuages, embruns, débris
function windTravel(t) {
  // intégrale numérique simple (assez précise pour l'image)
  let s = 0; const dt = 0.05;
  for (let x = 0; x < t; x += dt) s += windKmh(Math.min(x, t)) / 3.6 * dt;
  return s;
}

export default async function () {
  const stage = createStage({ fov: 70, far: 12000, bloom: [0.25, 0.4, 0.92], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 0.92;
  document.documentElement.style.setProperty('--accent', '#ffb547');
  const R = rng(1599);
  const CAM = new THREE.Vector3(0, 55, 112);         // une webcam sur un toit, au fond du port
  const SUN_DIR = dirAzEl(-38, 44);

  // ciel de jour + Soleil
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.02, 0.09, 0.38], dayHor: [0.30, 0.45, 0.66], stars: 0 });
  sky.u.uDay.value = 1; sky.u.uSunGlow.value = 0.6;
  const sunSprite = makeSun(scene, SUN_DIR, 70);
  scene.fog = new THREE.Fog('#b9c8d6', 1500, 9000);
  const fogCalm = new THREE.Color('#b9c8d6'), fogDust = new THREE.Color('#c7b9a2');

  const sun = new THREE.DirectionalLight('#fff1dc', 3.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 600 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#bcd6ff', '#8f7f66', 0.7); scene.add(hemi);

  // un reflet "métal poli" pour l'Ombrière (environnement de studio pré-calculé)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // -------------------------------------------------------------------
  // FAÇADES : une texture de fenêtres qui se répète (bien moins lourd que des milliers de fenêtres en 3D)
  // -------------------------------------------------------------------
  function facadeTex(wall, win, shutter, style) {
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = wall; g.fillRect(0, 0, w, h);
      const r = rng(style.length * 13);
      for (let fl = 0; fl < 4; fl++) for (let c = 0; c < 4; c++) {
        const x = c * 128 + 34, y = fl * 128 + 26;
        if (style === 'pouillon') {
          g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(c * 128, fl * 128 + 112, 128, 6);
          g.fillStyle = win; g.fillRect(x - 6, y + 4, 72, 82);
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 6, y + 4, 72, 6);
        } else {
          g.fillStyle = win; g.fillRect(x + 8, y + 6, 44, 80);
          if (r() < 0.85) { g.fillStyle = shutter; g.fillRect(x - 14, y + 4, 20, 84); g.fillRect(x + 54, y + 4, 20, 84); }
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 2, y + 86, 64, 8);
          if (r() < 0.3) { g.fillStyle = '#2b2b2b'; g.fillRect(x - 4, y + 66, 68, 3); for (let k = 0; k < 9; k++) g.fillRect(x - 4 + k * 8, y + 66, 2, 22); }
        }
      }
    });
  }
  const STYLES = [
    ['#e9dfc8', '#59718a', '#000', 'pouillon'], ['#e3d6bc', '#4f6880', '#000', 'pouillon'],
    ['#e9c99a', '#3d4c5a', '#6d8f80', 'prov'], ['#f0d9b5', '#3d4c5a', '#7b96a5', 'prov'], ['#e7b98e', '#3d4c5a', '#8a6a4a', 'prov'],
    ['#f2e2c4', '#3d4c5a', '#5f7f6a', 'prov'], ['#dcae8a', '#3d4c5a', '#7c95a3', 'prov'], ['#efe6d2', '#3d4c5a', '#a05a48', 'prov'],
  ].map(([wall, win, sh, st]) => { const tx = facadeTex(wall, win, sh, st); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return M('#ffffff', { map: tx, flat: false, unique: true }); });
  const roofTile = M('#b8664a'), roofFlat = M('#cfc3a8'), plainWall = M('#e3d4b8');
  const MOD = 12.4;   // une texture = 4 étages × 4 fenêtres ≈ 12,4 m
  function facadeBlock(parent, { x, z, w, h, d = 16, side, style, roof }) {
    // façade le long de z ; side = +1 (côté nord, façade vers -x) ou -1 (côté sud, façade vers +x)
    const g = new THREE.BoxGeometry(d, h, w);
    // les UV de chaque face sont mises à l'échelle pour que les fenêtres gardent la même taille
    const uv = g.attributes.uv;
    for (let f = 0; f < 6; f++) {
      const [su, sv] = f < 2 ? [w / MOD, h / MOD] : f < 4 ? [w / MOD, d / MOD] : [d / MOD, h / MOD];
      for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv); }
    }
    const m = new THREE.Mesh(g, STYLES[style]); m.position.set(x + side * d / 2, h / 2 + 1.5, z); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    if (roof === 'tile') add(new THREE.BoxGeometry(d + 0.6, 0.6, w + 0.4), roofTile, parent, x + side * d / 2, h + 1.8, z);
    else add(new THREE.BoxGeometry(d, 0.5, w), roofFlat, parent, x + side * d / 2, h + 1.75, z);
    return m;
  }

  // -------------------------------------------------------------------
  // LE PORT : quais, bassin, bâtiments, Notre-Dame-de-la-Garde, les forts, le MuCEM
  // -------------------------------------------------------------------
  const world = new THREE.Group();
  const quayStone = canvasTex(512, 512, (g, w, h) => { const r = rng(9); g.fillStyle = '#9d907a'; g.fillRect(0, 0, w, h); for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) { const v = 160 + r() * 30 | 0; g.fillStyle = `rgb(${v},${v - 8},${v - 26})`; g.fillRect(i * 64 + 2, j * 32 + 2, 60, 28); } }, 30);
  const quayMat = M('#ffffff', { map: quayStone, flat: false });
  // quai des Belges (est, où est la caméra), quai du Port (nord, à droite), quai de Rive-Neuve (sud, à gauche)
  add(new THREE.BoxGeometry(520, 3, 160), quayMat, world, 0, 0, 98);
  add(new THREE.BoxGeometry(70, 3, 960), quayMat, world, 135, 0, -440);
  add(new THREE.BoxGeometry(70, 3, 1000), quayMat, world, -135, 0, -460);
  // la ville derrière (sol), et la colline de Notre-Dame-de-la-Garde
  const landMat = M('#bfae92');
  add(new THREE.PlaneGeometry(1900, 4000), landMat, world, 1120, 1.45, 1000, -Math.PI / 2);
  add(new THREE.PlaneGeometry(1900, 4000), landMat, world, -1120, 1.45, 1000, -Math.PI / 2);
  add(new THREE.PlaneGeometry(280, 3000), landMat, world, 0, 1.45, 1518, -Math.PI / 2);
  // bâtiments du quai du Port (nord) : longues barres claires (style Pouillon)
  { let z = 60; while (z > -700) { const w = 32 + R() * 26; facadeBlock(world, { x: 150, z: z - w / 2, w: w - 0.5, h: 22 + R() * 8, side: 1, style: R() < 0.7 ? 0 : 1, roof: 'flat' }); z -= w; } }
  // quai de Rive-Neuve (sud) : immeubles plus colorés, toits de tuiles
  { let z = 60; while (z > -760) { const w = 14 + R() * 16; facadeBlock(world, { x: -150, z: z - w / 2, w: w - 0.4, h: 17 + R() * 9, side: -1, style: 2 + (R() * 6 | 0), roof: 'tile' }); z -= w; } }
  // l'est, derrière la caméra (la Canebière) — un peu de bâti pour les reflets et les ombres
  for (let i = 0; i < 10; i++) facadeBlock(world, { x: -260 + i * 52, z: 190, w: 50, h: 20 + R() * 8, side: 1, style: 2 + (i % 6), roof: 'tile' });
  // auvents et parasols des cafés du quai sud
  const awnCols = ['#a8322b', '#2f5544', '#c48a2e', '#2c4a6e', '#7a2f4e'];
  { let z = 40; while (z > -700) { add(new THREE.BoxGeometry(2.6, 0.12, 9), M(awnCols[(R() * 5) | 0]), world, -148.5, 4.6, z, 0, 0, -0.35); z -= 11 + R() * 6; } }

  // la colline et Notre-Dame-de-la-Garde (à gauche, au loin)
  const nz = noise2(4);
  { const hill = new THREE.ConeGeometry(420, 150, 18, 6); const p = hill.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > -70 && y < 70) { p.setX(i, p.getX(i) * (0.85 + nz(p.getX(i) * 0.01, p.getZ(i) * 0.01) * 0.3)); } } hill.computeVertexNormals();
    add(hill, M('#7c8a5c'), world, -300, 76, -1180); }
  for (let i = 0; i < 160; i++) { const a = R() * Math.PI * 2, rr = 60 + R() * 330, x = -300 + Math.cos(a) * rr, z = -1180 + Math.sin(a) * rr, y = 150 * (1 - rr / 420) + 1; add(new THREE.IcosahedronGeometry(5 + R() * 5, 0), M(R() < 0.5 ? '#4e6339' : '#5d7046'), world, x, y + 4, z); }
  { // la basilique : nef rayée (pierre blanche et verte), dôme, clocher, statue dorée
    const g = new THREE.Group(); g.position.set(-300, 150, -1180); g.rotation.y = 0.5; world.add(g);
    const w1 = M('#e9e3d2'), w2 = M('#7b8f78');
    for (let k = 0; k < 8; k++) box(44, 2.0, 14, k % 2 ? w1 : w2, g, 0, 1 + k * 2, 0);
    prismZ(15, 6, 45, M('#8c8c8c'), g, 0, 16, 0);
    add(new THREE.SphereGeometry(6.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#cfc6b0'), g, 4, 22, 0);
    for (let k = 0; k < 14; k++) box(11, 3.0, 11, k % 2 ? w1 : w2, g, -24, 1.5 + k * 3, 0);
    box(9, 9, 9, w1, g, -24, 46.5, 0);
    cyl(1.6, 2.6, 4, 8, M('#d8b04a', { e: '#b38a2a', ei: 0.4, r: 0.3, m: 0.8 }), g, -24, 53, 0);
    add(new THREE.ConeGeometry(1.7, 9.5, 8), M('#e1bb52', { e: '#b38a2a', ei: 0.5, r: 0.3, m: 0.8 }), g, -24, 59.5, 0);
    add(new THREE.SphereGeometry(1.1, 8, 6), M('#e1bb52', { e: '#b38a2a', ei: 0.5, r: 0.3, m: 0.8 }), g, -24, 64.8, 0);
  }
  // l'entrée du port : fort Saint-Nicolas (gauche), fort Saint-Jean + tour du Roi René (droite), le MuCEM (cube noir ajouré)
  const fortStone = M('#d3c09a');
  box(150, 22, 90, fortStone, world, -150, 11, -960); box(60, 14, 40, fortStone, world, -110, 29, -930);
  box(120, 18, 70, fortStone, world, 135, 9, -930); box(20, 34, 20, fortStone, world, 90, 17, -905); cyl(7, 8, 30, 12, fortStone, world, 150, 15, -965);
  { const lace = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4a4440'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fb2c2'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse((i * 37) % w, (i * 53) % h, 14, 22, i, 0, Math.PI * 2); g.fill(); } }); lace.wrapS = lace.wrapT = THREE.RepeatWrapping; lace.repeat.set(5, 2);
    add(new THREE.BoxGeometry(72, 19, 72), M('#ffffff', { map: lace, flat: false }), world, 215, 10.5, -1010); }
  // les îles du Frioul au loin
  add(new THREE.SphereGeometry(1, 16, 8).scale(900, 90, 260), M('#9aa38c'), world, 300, -20, -4300);
  add(new THREE.SphereGeometry(1, 16, 8).scale(500, 60, 180), M('#a1a892'), world, -700, -15, -4800);

  // les pontons (les bateaux y sont amarrés)
  const PONT = []; for (let z = -20; z > -800; z -= 40) for (const s of [1, -1]) PONT.push({ z, s });
  PONT.forEach(({ z, s }) => add(new THREE.BoxGeometry(78, 0.5, 2.2), M('#8c7a62'), world, s * 61, 0.45, z));

  // la petite terrasse de café et l'étal de poissons, au premier plan
  const loose = [];   // objets que le vent emporte : { obj, p0, r0, kmh (vent qui l'arrache), mass, w }
  const addLoose = (obj, kmh, mass = 1) => { scene.add(obj); loose.push({ obj, p0: obj.position.clone(), r0: obj.rotation.clone(), kmh: kmh * (0.85 + R() * 0.3), mass, w: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(6), side: (R() - 0.5) * 0.6 }); return obj; };
  const iron = M('#2c2c2c', { r: 0.5 });
  const paraCols = ['#f2efe6', '#2f5544', '#a8322b'];
  for (let i = 0; i < 3; i++) {
    const x = -18 + i * 3.4, z = 30 + (i % 2) * 2.5;
    const tb = new THREE.Group(); tb.position.set(x, 1.5, z);
    cyl(0.38, 0.38, 0.04, 14, M('#d9d4cc', { r: 0.4 }), tb, 0, 0.74, 0); cyl(0.035, 0.04, 0.72, 6, iron, tb, 0, 0.37, 0);
    addLoose(tb, 160 + i * 20, 1.2);
    const pa = new THREE.Group(); pa.position.set(x, 1.5, z);
    cyl(0.03, 0.03, 2.5, 6, M('#d8d0bf'), pa, 0, 1.25, 0); add(new THREE.ConeGeometry(1.5, 0.55, 10, 1, true), M(paraCols[i], { side: THREE.DoubleSide }), pa, 0, 2.55, 0);
    addLoose(pa, 70 + i * 12, 0.5);
    for (const dx of [-0.6, 0.6]) { const ch = new THREE.Group(); ch.position.set(x + dx, 1.5, z + 0.1); ch.rotation.y = dx > 0 ? -Math.PI / 2 : Math.PI / 2; box(0.42, 0.04, 0.42, iron, ch, 0, 0.46, 0); box(0.42, 0.44, 0.04, iron, ch, 0, 0.68, -0.2); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.03, 0.46, 0.03, iron, ch, a, 0.23, b); addLoose(ch, 120 + R() * 50, 0.8); }
  }
  { const st = new THREE.Group(); st.position.set(11, 1.5, 32); box(3.2, 0.9, 1.2, M('#e8e4dc'), st, 0, 0.45, 0); addLoose(st, 420, 4);
    for (let k = 0; k < 5; k++) { const cr = new THREE.Group(); cr.position.set(9.9 + k * 0.55, 2.45, 32 + (k % 2) * 0.3); box(0.5, 0.18, 0.36, M('#2d63b8'), cr, 0, 0, 0); box(0.4, 0.06, 0.26, M('#c9d4dc', { r: 0.2, m: 0.4 }), cr, 0, 0.1, 0); addLoose(cr, 140 + k * 15, 0.6); } }
  // lampadaires du quai
  for (let i = 0; i < 6; i++) { const x = -26 + i * 10.4; cyl(0.08, 0.12, 5, 6, iron, world, x, 4, 20); box(0.5, 0.35, 0.5, M('#3a3a3a'), world, x, 6.6, 20); }
  // l'Ombrière : grand miroir posé sur des piliers fins
  const ombMat = new THREE.MeshStandardMaterial({ color: '#9aa3ab', metalness: 0.85, roughness: 0.18, envMap: envTex, envMapIntensity: 0.8 });
  const ombriere = new THREE.Mesh(new THREE.BoxGeometry(46, 0.25, 22), ombMat); ombriere.position.set(30, 8.0, 32); ombriere.castShadow = true; scene.add(ombriere);
  for (const [x, z] of [[11, 24], [11, 40], [49, 24], [49, 40], [24, 24], [36, 40], [24, 40], [36, 24]]) cyl(0.12, 0.12, 6.5, 8, ombMat, scene, x, 4.75, z);

  scene.add(bake(world));

  // -------------------------------------------------------------------
  // LA MER (le bassin + le large)
  // -------------------------------------------------------------------
  const sea = makeWater(scene, { w: 4200, d: 5200, z: -2200, segX: 150, segZ: 420, color: '#155a73', foam: '#eef6f8', opacity: 0.97, dir: 1,
    mask: 'max(smoothstep(-90.0, -98.0, -abs(wp0.x)) * smoothstep(20.0, 12.0, wp0.z), smoothstep(-860.0, -900.0, wp0.z))' });
  sea.U.uChop.value = 0.18;

  // -------------------------------------------------------------------
  // LES BATEAUX (des centaines de voiliers amarrés aux pontons)
  // -------------------------------------------------------------------
  const boats = [];
  PONT.forEach(({ z, s }) => { for (let x = 26; x < 98; x += 4.3) for (const dz of [-5.2, 5.2]) { if (R() < 0.14) continue; boats.push({ x: s * x + (R() - 0.5) * 0.6, z: z + dz, ry: dz > 0 ? 0 : Math.PI, side: s, ph: R() * 6, s: 0.8 + R() * 0.45, heel: 0.7 + R() * 0.6, k: R() }); } });
  // quelques bateaux au milieu du bassin et la « navette » qui traverse
  for (let i = 0; i < 12; i++) boats.push({ x: (R() - 0.5) * 34, z: -60 - R() * 600, ry: R() * 6, side: 1, ph: R() * 6, s: 0.9, heel: 1, k: R() });
  const fleet = new Fleet(scene, boats);
  const Eu = new THREE.Euler(), Pv = new THREE.Vector3();

  // -------------------------------------------------------------------
  // LES GENS SUR LE QUAI, LES MOUETTES
  // -------------------------------------------------------------------
  const SHIRTS = ['#c4473a', '#3d6e9e', '#e0c45a', '#f2f0ea', '#6b8f5e', '#8a5a9a', '#d98a4a', '#2f3e57', '#1f1f1f'];
  const PANTS = ['#2f3a4f', '#5a4a3a', '#d8cfb8', '#3b3b3b', '#7a8ea8'];
  const HAIR = ['#2a1d15', '#5a3a22', '#c9a35f', '#8a8a8a', '#1a1a1a'];
  const pick = (a) => a[(R() * a.length) | 0];
  const people = [];
  for (let i = 0; i < 26; i++) {
    const near = i < 14;
    const x = near ? -22 + R() * 44 : (R() < 0.5 ? -1 : 1) * (104 + R() * 40);
    const zz = near ? 22 + R() * 22 : -260 - R() * 300;
    const P = makePerson(scene, { shirt: pick(SHIRTS), pants: pick(PANTS), hair: pick(HAIR), skin: pick(['#e2b994', '#c99a74', '#8d5e3c', '#f0c8a8']) });
    people.push({ P, x0: x, z0: zz, dir: R() < 0.5 ? 1 : -1, v: 0.6 + R() * 0.7, kmh: 150 + R() * 140, seed: R() * 10, along: near ? 'x' : 'z' });
  }
  const gulls = [];
  { const gm = new THREE.MeshBasicMaterial({ color: '#f4f4f0' }), gd = new THREE.MeshBasicMaterial({ color: '#4a4a4a' });
    for (let i = 0; i < 9; i++) { const b = new THREE.Group(); const wl = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.22), gm), wr = wl.clone(); wl.position.x = -0.36; wr.position.x = 0.36; const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.5), gm); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.2), gd); tip.position.set(-0.7, 0, 0); wl.add(tip); b.add(wl, wr, body); scene.add(b); gulls.push({ b, wl, wr, c: new THREE.Vector3(-25 + R() * 50, 30 + R() * 22, 40 - R() * 140), r: 8 + R() * 14, sp: 0.25 + R() * 0.3, ph: R() * 6 }); } }

  // -------------------------------------------------------------------
  // LE VENT : nuages qui filent, embruns, poussière, débris arrachés aux façades
  // -------------------------------------------------------------------
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, emissive: '#dfe8f2', emissiveIntensity: 0.35, transparent: true, opacity: 1 });
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const geoms = []; for (let k = 0; k < 6; k++) { const g = new THREE.IcosahedronGeometry(60 + R() * 60, 1); g.scale(1.7, 0.6, 1); g.translate((k - 2.5) * 70 + R() * 30, R() * 30, R() * 40); geoms.push(g); }
    const merged = new THREE.Mesh(mergeG(geoms), cloudMat);
    merged.position.set(-2500 + R() * 5000, 700 + R() * 600, -4500 + R() * 3500); merged.userData.z0 = merged.position.z; scene.add(merged); clouds.push(merged);
  }
  function mergeG(list) { const pos = []; for (const g of list) { const gg = g.toNonIndexed(); pos.push(...gg.attributes.position.array); } const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); b.computeVertexNormals(); return b; }

  const NSP = 3000, spray = [];
  for (let i = 0; i < NSP; i++) spray.push({ x: (R() - 0.5) * 200, z: -900 + R() * 940, y: 0.3 + R() ** 2 * 18, k: 0.5 + R() * 0.8, th: 120 + R() * 400 });
  const sprayGeo = new THREE.BufferGeometry(); sprayGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NSP * 3), 3));
  const sprayPts = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, color: '#f2f6f8', map: dotTex(), alphaTest: 0.05, transparent: true, opacity: 0.8, depthWrite: false })); sprayPts.frustumCulled = false; scene.add(sprayPts);
  // débris : tuiles, vitres, morceaux de façades, chaises de café, feuilles…
  const debris = [];
  for (let i = 0; i < 1400; i++) {
    const side = R() < 0.5 ? 1 : -1, far = R();
    const x = side * (142 + R() * 6), z = 40 - R() * 700, y = 3 + R() * 24;
    debris.push({ p0: new THREE.Vector3(x, y, z), th: 520 + R() * 500, k: 0.35 + R() * 0.6, s: new THREE.Vector3(0.3 + R() * 1.4, 0.05 + R() * 0.6, 0.3 + R() * 1.2), w: new THREE.Vector3(R() * 9, R() * 9, R() * 9), c: R() < 0.25 ? '#b8664a' : R() < 0.5 ? '#9fb7c8' : R() < 0.75 ? '#e3d6bc' : '#e9c99a', drift: (R() - 0.5) * 0.5 });
  }
  for (let i = 0; i < 500; i++) debris.push({ p0: new THREE.Vector3((R() - 0.5) * 50, 1.6, 20 + R() * 30), th: 60 + R() * 200, k: 0.6 + R() * 0.7, s: new THREE.Vector3(0.05 + R() * 0.15, 0.01, 0.05 + R() * 0.12), w: new THREE.Vector3(R() * 14, R() * 14, R() * 14), c: R() < 0.5 ? '#d9d2c2' : '#8a9a5a', drift: (R() - 0.5) * 1.2 });
  const NWV = 5000, wave = [];
  for (let i = 0; i < NWV; i++) wave.push({ x: (R() - 0.5) * 205, dz: R() ** 1.6 * 34, h: R() ** 0.7, ph: R() * 6, k: R() });
  const waveGeo = new THREE.BufferGeometry(); waveGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NWV * 3), 3));
  const wavePts = new THREE.Points(waveGeo, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, color: '#f6fbfd', map: dotTex(), alphaTest: 0.05, transparent: true, opacity: 0, depthWrite: false })); wavePts.frustumCulled = false; scene.add(wavePts);
  const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M('#ffffff', { unique: true }), debris.length);
  debris.forEach((d, i) => debMesh.setColorAt(i, new THREE.Color(d.c))); debMesh.castShadow = true; debMesh.frustumCulled = false; scene.add(debMesh);
  const D = new THREE.Object3D();

  // -------------------------------------------------------------------
  // LA CAMÉRA
  // -------------------------------------------------------------------
  const LOOK = new THREE.Vector3(0, -20, -500);
  const tmp = new THREE.Vector3();
  // tables de "vent intégré" pré-calculées (rapide)
  const WT = []; { let s = 0; for (let i = 0; i <= T.duration * 20; i++) { WT.push(s); s += windKmh(i / 20) / 3.6 / 20; } }
  const travel = (t) => { const f = clamp(t * 20, 0, WT.length - 1), i = Math.floor(f); return lerp(WT[i], WT[Math.min(i + 1, WT.length - 1)], f - i); };
  const BASE = Date.UTC(2026, 5, 21, 14, 31, 0);

  function update(t) {
    const wk = windKmh(t), wf = (wk - 11) / (V0 - 11);           // 0 → 1
    const vGround = V0 * (1 - brakeK(t));
    const trav = travel(t), trav0 = travel(T.brake);
    // --- la vague : se forme à l'entrée du port puis traverse le bassin vers nous
    const front = lerp(-1000, 118, sm(T.surge, T.waveHit, t) ** 1.25);
    const surgeH = 13 * sm(T.surge, T.surge + 4, t) + 20 * sm(40, T.waveHit, t), crestH = 9 * sm(T.surge + 1, T.surge + 6, t) + 34 * sm(41, T.waveHit, t);
    sea.U.uTime.value = t; sea.U.uFront.value = front; sea.U.uSurge.value = surgeH; sea.U.uCrest.value = crestH;
    sea.U.uChop.value = 0.18 + 2.6 * wf; sea.U.uStream.value = 0.9 * wf;
    const waterAt = (z) => (z < front ? surgeH * (1 - clamp((z - (front - 70)) / 74)) + crestH * Math.exp(-(((z - front + 9) / 11) ** 2)) : 0);
    FX.uWet.value = Math.min(surgeH + 1.5, waterAt(-200) + 1.5) - 0.2;
    {
      const a = waveGeo.attributes.position.array;
      wave.forEach((w, i) => {
        const z = front - w.dz - 4, base = waterAt(z);
        a[i * 3] = w.x; a[i * 3 + 1] = base + w.h * (crestH * 0.75 + 4) + Math.sin(t * 3 + w.ph) * 1.2; a[i * 3 + 2] = z + Math.sin(t * 2 + w.ph) * 2 + w.k * 6;
      });
      waveGeo.attributes.position.needsUpdate = true; wavePts.material.opacity = 0.9 * sm(T.surge + 0.5, T.surge + 3, t);
      wavePts.material.size = 2.2 + 3.5 * sm(T.surge, T.waveHit, t);
    }
    // --- caméra : le pied tremble avec le vent ; la vague finit par la frapper
    const shake = 0.004 + 0.09 * wf ** 2 + 0.25 * sm(T.waveHit - 1.5, T.waveHit, t);
    camera.position.copy(CAM).add(tmp.set((Math.sin(t * 31) + Math.sin(t * 17.3)) * shake, (Math.sin(t * 23.7) + Math.cos(t * 41)) * shake * 0.7, 0));
    camera.fov = 52; camera.updateProjectionMatrix();
    camera.lookAt(LOOK.x, LOOK.y + 30 * sm(T.surge + 8, T.waveHit, t), LOOK.z); camera.updateMatrixWorld();
    sky.follow(camera); sunSprite.follow(camera);
    sun.position.copy(SUN_DIR).multiplyScalar(300).add(tmp.set(0, 0, -40)); sun.target.position.set(0, 0, -40);
    // poussière et embruns dans l'air : la vue se bouche
    scene.fog.color.lerpColors(fogCalm, fogDust, sm(18, 30, t));
    scene.fog.far = lerp(9000, 2600, sm(19, 34, t)); scene.fog.near = lerp(1500, 250, sm(19, 34, t));
    sky.u.uDayHor.value.setRGB(lerp(0.30, 0.55, sm(18, 30, t)), lerp(0.45, 0.50, sm(18, 30, t)), lerp(0.66, 0.46, sm(18, 30, t)));
    // --- nuages : ils filent vers l'est, à la vitesse du vent
    clouds.forEach((c) => { c.position.z = c.userData.z0 + (trav - trav0) * 0.9; if (c.position.z > 2500) c.position.z -= 7000; });
    // --- les bateaux : ils se balancent, gîtent, puis la vague les emporte vers nous
    fleet.update((b, i) => {
      const lift = waterAt(b.z);
      const carried = b.z < front ? (front - b.z) * (0.55 + 0.3 * b.k) : 0;
      const slide = sm(0.45, 1, wf) * (12 + 30 * b.k) * wf;
      Pv.set(b.x + Math.sin(i) * slide * 0.15, Math.sin(t * 1.3 + b.ph) * 0.08 * (1 + 8 * wf) + lift, b.z + slide + carried);
      const heel = Math.sin(t * 2.1 + b.ph) * 0.03 + b.heel * 0.9 * sm(0.08, 0.55, wf) + (b.z < front ? 1.2 * b.k : 0);
      Eu.set(Math.sin(t * 1.7 + b.ph) * 0.03 + heel * 0.35 + (carried > 0 ? (carried * 0.02 * b.k) : 0), b.ry + (carried > 0 ? carried * 0.004 * (b.k - 0.5) : 0), heel * b.side * (b.ry > 1 ? -1 : 1));
      return { pos: Pv, rot: Eu, scale: b.s };
    });
    // --- les objets du café et de l'étal : arrachés quand le vent dépasse leur seuil
    for (const o of loose) {
      o.obj.position.copy(o.p0); o.obj.rotation.copy(o.r0); o.obj.visible = true;
      if (wk > o.kmh) {
        // à partir du moment où il est arraché, l'objet suit le vent (plus ou moins vite selon son poids)
        const tA = tStart(o);
        const d = (trav - travel(tA)) / (1 + o.mass * 1.5);
        o.obj.position.z += d; o.obj.position.y += Math.min(d * 0.18, 30) + Math.sin(d * 0.1) * 1.5; o.obj.position.x += d * o.side;
        o.obj.rotation.x += o.w.x * d * 0.05; o.obj.rotation.y += o.w.y * d * 0.05; o.obj.rotation.z += o.w.z * d * 0.05;
      } else if (wk > o.kmh * 0.6) { o.obj.rotation.x -= Math.sin(t * 20 + o.p0.x) * 0.04 * (wk / o.kmh); }
      if (o.obj.position.distanceTo(CAM) < 25 || o.obj.position.z > CAM.z - 8) o.obj.visible = false;
    }
    // --- les gens : ils marchent… s'arrêtent, se penchent, puis sont emportés
    people.forEach((H, i) => {
      const { P } = H; P.reset();
      const tw = Math.min(t, T.brake + 2);
      let x = H.x0, z = H.z0, ry;
      if (H.along === 'x') { x += (tw * H.v - 8) * H.dir; ry = H.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { z += tw * H.v * H.dir; ry = H.dir > 0 ? 0 : Math.PI; }
      const walking = 1 - sm(T.brake + 1, T.brake + 2.5, t);
      P.walk(tw * H.v * 4.4 + H.seed, walking);
      // le sol freine : ils sont poussés vers l'est (vers nous), se retournent et se protègent
      const brace = sm(T.brake + 1.5, T.brake + 3.5, t);
      P.body.rotation.x = -0.35 * brace * (0.6 + 0.4 * Math.sin(t * 9 + H.seed));
      P.armL.rotation.set(-2.2 * brace, 0, 0.3 * brace); P.armR.rotation.set(-2.2 * brace, 0, -0.3 * brace);
      if (wk > H.kmh) {
        const tA = tPeople(H);
        const d = (trav - travel(tA)) / 3.2;
        z += d; x += Math.sin(H.seed) * d * 0.25; P.root.position.y = 1.5 + Math.min(d * 0.12, 25);
        P.body.rotation.x = d * 0.08; P.body.rotation.z = d * 0.05 * Math.sin(H.seed);
        P.armL.rotation.z = 1.2; P.armR.rotation.z = -1.2;
      } else P.root.position.y = 1.5;
      P.root.position.x = x; P.root.position.z = z; P.root.rotation.y = ry;
      P.root.visible = z < CAM.z - 10 && P.root.position.distanceTo(CAM) > 25;
    });
    // --- les mouettes : elles tournent, puis le vent les emporte
    gulls.forEach((g, i) => {
      const a = t * g.sp + g.ph;
      g.b.position.set(g.c.x + Math.cos(a) * g.r, g.c.y + Math.sin(a * 1.7) * 2, g.c.z + Math.sin(a) * g.r * 0.6);
      g.b.position.z += Math.max(0, trav - trav0) * 0.5; g.b.position.y += Math.max(0, trav - trav0) * 0.03;
      g.b.rotation.set(0, -a + Math.PI / 2, 0);
      const f = Math.sin(t * 9 + i) * 0.5; g.wl.rotation.z = f; g.wr.rotation.z = -f;
      g.b.visible = g.b.position.z < CAM.z - 6 && g.b.position.distanceTo(CAM) > 8;
    });
    // --- embruns arrachés à la surface de l'eau
    {
      const a = sprayGeo.attributes.position.array; let vis = 0;
      spray.forEach((s, i) => {
        let z = -1e5, y = 0, x = s.x;
        if (wk > s.th) { vis = 1; const per = 1000; const ofs = ((trav * s.k + s.z * 3.1 + i * 7.3) % per + per) % per; z = -930 + ofs; y = s.y + waterAt(z) + Math.sin(ofs * 0.05 + i) * 1.5; }
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      });
      sprayGeo.attributes.position.needsUpdate = true; sprayPts.material.opacity = 0.75 * vis * sm(150, 400, wk);
    }
    // --- débris des façades et du quai
    debris.forEach((d, i) => {
      D.position.copy(d.p0); D.scale.copy(d.s); D.rotation.set(0, 0, 0);
      if (wk > d.th) { const tA = tDeb(d); const dist = (trav - travel(tA)) * d.k; D.position.z += dist; D.position.y += Math.sin(dist * 0.02 + i) * 4 + dist * 0.05 - (d.p0.y < 2 ? 0 : 0); D.position.x += d.drift * dist * 0.2 - Math.sign(d.p0.x) * Math.min(dist * 0.1, 30); D.rotation.set(d.w.x * dist * 0.02, d.w.y * dist * 0.02, d.w.z * dist * 0.02); }
      else if (d.p0.y > 2) D.scale.setScalar(0);
      if (D.position.z > CAM.z - 8 || D.position.distanceTo(CAM) < 25) D.scale.setScalar(0);
      D.updateMatrix(); debMesh.setMatrixAt(i, D.matrix);
    });
    debMesh.instanceMatrix.needsUpdate = true;

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const date = new Date(BASE + t * 5000);
    HUD.live(t, 'MARSEILLE · VIEUX-PORT · CAM 01', `${t > T.surge + 0.5 && t < T.waveHit ? 'RALENTI · ' : ''}${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`);
    const red = sm(T.brake, T.brake + 1, t);
    HUD.block(1, { label: 'VITESSE DE MARSEILLE', value: `${fr(Math.round(vGround))} km/h`, sub: 'AUTOUR DE L’AXE DE LA TERRE', color: `rgb(255,${Math.round(255 - 60 * red)},${Math.round(255 - 140 * red)})` });
    HUD.show2(true);
    const wr = sm(300, 408, wk);
    const beat = wk > 408 && t < T.waveHit ? Math.exp(-(t % 0.5) * 9) : 0;
    HUD.block(2, { label: 'VENT', value: `${fr(Math.round(wk))} km/h`, sub: wk > 408 ? `RECORD DU MONDE : 408 KM/H  ·  ×${(wk / 408).toFixed(1).replace('.', ',')}` : 'RECORD DU MONDE : 408 KM/H', color: `rgb(255,${Math.round(255 - 160 * wr)},${Math.round(255 - 170 * wr)})`, scale: 1 + 0.06 * beat });
    HUD.hook(t, 'Et si la Terre<br><em>s’arrêtait</em> de tourner ?', T.hookOut);
    HUD.subs(t, SUBS);
    HUD.reticle('ndg', tmp.set(-305, 210, -1170), camera, 'NOTRE-DAME-DE-LA-GARDE', sm(4, 4.6, t) * (1 - sm(7.6, 8.2, t)), 70);
    HUD.flash(sm(T.waveHit - 0.25, T.waveHit, t) * (1 - sm(T.waveHit + 0.1, T.black, t)) * 0.85);
    HUD.fade(sm(T.waveHit, T.black, t));
    HUD.end(t, T.endCard, { kicker: 'SANS ROTATION, LES OCÉANS FINIRAIENT PAR FILER VERS LES PÔLES', q: 'Et toi, tu te serais<br>accroché à quoi ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  // moment où le vent dépasse un seuil (pour savoir quand un objet a été arraché)
  const tAt = (kmh) => { if (kmh <= 11) return 0; const k = (kmh - 11) / (V0 - 11); let lo = T.brake, hi = T.stopped; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (brakeK(m) < k) lo = m; else hi = m; } return lo; };
  const tStart = (o) => (o._t ??= tAt(o.kmh)); const tPeople = (H) => (H._t ??= tAt(H.kmh)); const tDeb = (d) => (d._t ??= tAt(d.th));
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

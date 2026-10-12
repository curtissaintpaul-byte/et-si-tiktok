// =====================================================================
//  ÉPISODE : « Et si la Terre tournait 10 fois plus vite ? » — Nice, la promenade des Anglais, face à la mer (plein sud)
//  Hypothèse : la Terre accélère en 3 semaines jusqu'à 10× sa vitesse (un tour en 2 h 24), assez doucement pour que rien ne soit projeté.
//  Faits (calculs dans la fiche) :
//   - Nice (43,7° N) file à 1 674 × cos 43,7° ≈ 1 210 km/h → 12 100 km/h.
//   - force centrifuge × 100 : à Nice, poids −16 % et pesanteur penchée de 11,8° vers l'équateur (le sol « semble » en pente vers le sud) ;
//     à l'équateur, poids −34 % ; à 17× plus vite, on y serait en apesanteur.
//   - la différence de potentiel centrifuge entre équateur et pôle passe de 11 km à ~1 100 km (équivalent hauteur) : les océans et l'air,
//     des fluides, filent vers l'équateur ; la planète solide se déforme (séismes).
//   - En vrai, le jour s'allonge de +1,8 ms par siècle (Stephenson et al. 2016) ; il y a 1,4 milliard d'années, il durait un peu plus de 18 h
//     (Meyers & Malinverno, PNAS 2018).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, add, box, cyl, makePerson, HUD, FX, sm, lerp, clamp, rng, dirAzEl, fr, pad, bake, terrain, canvasTex, dotTex, noise2, keys } from '../../engine.js';
import { makeWater } from '../../lib.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, spin: 9.0, spun: 15.0, cycle0: 15.4, cycle1: 22.4, tilt: 22.6, sea: 30.0, air: 42.0, quake: 50.0, fly: 56.0, real: 61.0, endCard: 68.0, duration: 72.2 };
const SUBS = [
  [3.3, 6.0, 'Nice, 14 h. La Terre fait un tour en 24 h.'],
  [6.2, 8.8, 'Ici, le sol file déjà vers l’est à 1 200 km/h.'],
  [9.2, 14.8, 'Imagine qu’elle accélère, en 3 semaines, jusqu’à 10 fois plus vite.'],
  [15.4, 18.8, 'Un jour ne dure plus que 2 h 24…'],
  [19.0, 22.3, '…dont à peine plus d’une heure de soleil.'],
  [22.6, 26.0, 'La force centrifuge te pousse vers l’équateur : tu pèses 16 % de moins.'],
  [26.2, 29.8, 'Et le sol semble penché de 12° vers le sud : tout ce qui roule dévale.'],
  [30.2, 35.8, 'L’eau aussi dévale : la Méditerranée se vide vers le sud.'],
  [36.0, 41.8, 'Les océans s’entassent autour de l’équateur : les tropiques sont engloutis.'],
  [42.2, 45.8, 'L’air aussi file vers l’équateur. Ici, il se raréfie…'],
  [46.0, 49.8, '…comme au sommet de l’Everest, puis pire : on étouffe.'],
  [50.2, 55.8, 'Et la planète entière se déforme pour s’aplatir : séismes géants.'],
  [56.2, 60.8, 'À 17 fois plus vite, à l’équateur, on s’envolerait.'],
  [61.4, 64.6, 'En vrai, c’est l’inverse : la Terre ralentit, de 1,8 ms par siècle.'],
  [64.8, 67.8, 'Il y a 1,4 milliard d’années, un jour durait à peine plus de 18 h.'],
];
// --- la physique à Nice (φ = 43,7°) en fonction du facteur de vitesse k
const PHI = 43.7 * Math.PI / 180, W0R = 0.03392;   // ω²R aujourd'hui (m/s²)
const G0 = 9.805;
const weightAt = (k) => { const e = k * k - 1, av = e * W0R * Math.cos(PHI) ** 2, ah = e * W0R * Math.cos(PHI) * Math.sin(PHI); return Math.hypot(G0 - av, ah) / G0; };
const tiltAt = (k) => { const e = k * k - 1; return Math.atan2(e * W0R * Math.cos(PHI) * Math.sin(PHI), G0 - e * W0R * Math.cos(PHI) ** 2); };
// facteur de vitesse selon le temps de la vidéo
const kAt = (t) => (t < T.spin ? 1 : t < T.spun ? 1 + 9 * sm(T.spin, T.spun, t) : t < T.real ? 10 : 1);
// le Soleil : déclinaison d'octobre, latitude de Nice ; angle horaire H (0 = midi solaire, + l'après-midi)
const DEC = -6.5 * Math.PI / 180;
function sunDir(H) {
  const el = Math.asin(Math.sin(PHI) * Math.sin(DEC) + Math.cos(PHI) * Math.cos(DEC) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(PHI) - Math.tan(DEC) * Math.cos(PHI));   // depuis le sud, vers l'ouest (+x)
  return dirAzEl(az * 180 / Math.PI, el * 180 / Math.PI);
}
const H14 = 11.5 * Math.PI / 180;   // 14 h à Nice en octobre ≈ 46 min après midi solaire

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 64, far: 30000, bloom: [0.25, 0.4, 0.9], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.05;
  document.documentElement.style.setProperty('--accent', '#ffd36b');
  const R = rng(1210), N2 = noise2(43);

  const sky = makeSky(scene, { sunDir: sunDir(H14), dayZen: [0.03, 0.13, 0.42], dayHor: [0.38, 0.5, 0.64], stars: 0 });
  const DAYZ = new THREE.Color(0.03, 0.13, 0.42), DAYH = new THREE.Color(0.38, 0.5, 0.64), THINZ = new THREE.Color(0.004, 0.012, 0.08), THINH = new THREE.Color(0.10, 0.18, 0.36);
  const sunSprite = makeSun(scene, sunDir(H14), 60);
  scene.fog = new THREE.Fog('#c3d0dc', 2500, 26000);
  const sun = new THREE.DirectionalLight('#fff2dc', 3.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c8deff', '#9a8a70', 0.95); scene.add(hemi);

  // -------------------------------------------------------------------
  // LE RELIEF : la promenade (4 m), la plage de galets, puis le fond de la baie des Anges, qui plonge très vite (canyon)
  // nord = +z (derrière la caméra), sud = −z (la mer), est = −x (la colline du Château), ouest = +x
  // -------------------------------------------------------------------
  function H(x, z) {
    let y;
    if (z > 0) y = 4.2;
    else if (z > -32) y = 4.2 * (1 + z / 32);
    else { const d = -32 - z; y = -(0.07 * Math.min(d, 450) + 0.32 * Math.max(0, d - 450) * (1 - 0.35 * sm(4000, 9000, d))); y += 25 * N2(x * 0.004, z * 0.004) * sm(200, 1200, d); y -= 260 * Math.exp(-(((x - 900) / 700) ** 2)) * sm(600, 3000, d); }
    // la colline du Château à l'est (gauche)
    const hill = 95 * Math.exp(-(((x + 420) / 170) ** 2) - (((z + 10) / 140) ** 2)); y = Math.max(y, hill > 4 ? hill + 3 : y);
    return y;
  }
  const seabedCol = (x, z, y) => { if (y > 12) return new THREE.Color(0.36, 0.45, 0.30); if (z > 0.5) return new THREE.Color(0.72, 0.70, 0.66); if (y > 0.3) return new THREE.Color(0.56, 0.55, 0.53);
    const k = clamp(-y / 900), n = 0.08 * N2(x * 0.012, z * 0.012), grass = -y < 40 && N2(x * 0.03 + 5, z * 0.03) > 0.35 ? 1 : 0;   // herbiers de posidonie (morts, bruns)
    if (grass) return new THREE.Color(0.20 + n, 0.18 + n, 0.12);
    if (-y < 40) return new THREE.Color(0.55 + n, 0.50 + n, 0.41 + n);   // sable et roches
    return new THREE.Color(lerp(0.40, 0.25, k) + n, lerp(0.37, 0.24, k) + n, lerp(0.33, 0.25, k) + n); };   // vase grise
  const groundMat = M('#ffffff', { vc: true });
  // deux morceaux : près (fin, pour la plage) et loin (grossier, pour le fond de la mer)
  const near = new THREE.Mesh(terrain(3000, 820, 220, (x, z) => H(x, z - 210), (x, z, y) => seabedCol(x, z - 210, y)), groundMat); near.position.z = -210;
  const farG = new THREE.Mesh(terrain(18000, 16000, 240, (x, z) => H(x, z - 8600) - (Math.abs(x) < 1500 && z - 8600 > -640 ? 3 : 0), (x, z, y) => seabedCol(x, z - 8600, y)), groundMat); farG.position.z = -8600;
  near.receiveShadow = true; farG.receiveShadow = true; scene.add(near, farG);
  // au-delà : le fond du bassin ligure, très loin et très bas (on ne le voit que quand la mer s'est vidée)
  add(new THREE.PlaneGeometry(400000, 200000), M('#6f6a62', { nc: true }), scene, 0, -2700, -116000, -Math.PI / 2);
  const ground = near;
  FX.uWet.value = -1e5;
  // la mer
  const sea = makeWater(scene, { w: 30000, d: 30000, z: -14000, seg: 300, color: '#1f5f86', foam: '#e6f0f4', opacity: 0.97 });
  sea.U.uChop.value = 0.35;
  // l'horizon lointain : le cap d'Antibes à droite, en silhouette
  add(new THREE.IcosahedronGeometry(1, 2), M('#8a9c9a', { nc: true }), scene, 9000, -2000, -16000).scale.set(3000, 2160, 1600);

  // -------------------------------------------------------------------
  // LA PROMENADE : dallage, chaises bleues, palmiers, réverbères ; la plage : parasols, transats, poste de secours
  // -------------------------------------------------------------------
  const world = new THREE.Group();
  const paveTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b9b2a4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#b3ac9e' : '#bdb7aa'; g.fillRect(0, i * 32, w, 31); } }, 30);
  add(new THREE.PlaneGeometry(3000, 40), M('#ffffff', { map: paveTex, flat: false }), world, 0, 4.22, 20, -Math.PI / 2);
  box(1497, 1.0, 0.5, M('#e7e2d6'), world, -3.2 - 748.5, 4.7, 0.2); box(1497, 1.0, 0.5, M('#e7e2d6'), world, 0.2 + 748.5, 4.7, 0.2);   // le parapet bas, ouvert vers la plage
  // galets : petites taches
  const pebbleTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8f8b84'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 120 + R() * 90 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.beginPath(); g.ellipse(R() * w, R() * h, 2 + R() * 4, 1.5 + R() * 3, R() * 3, 0, 7); g.fill(); } }, 40);
  { const g = new THREE.PlaneGeometry(3000, 34, 60, 8); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i) - 16; p.setY(i, H(p.getX(i), z) + 0.04); } add(g, M('#ffffff', { map: pebbleTex, flat: false }), world, 0, 0, -16); }
  const blue = M('#2b74b8', { r: 0.45, m: 0.3, nc: true });
  const chairs = [];
  for (let i = 0; i < 9; i++) { const g = new THREE.Group(); const x = i < 4 ? -14 + i * 2.6 : 1.8 + (i - 4) * 2.6, z = 1.0 + R() * 0.4; g.position.set(x, 4.22, z); g.rotation.y = Math.PI + (R() - 0.5) * 0.4; world.add(g);
    box(0.55, 0.06, 0.5, blue, g, 0, 0.42, 0); box(0.55, 0.5, 0.05, blue, g, 0, 0.72, -0.25); for (const [a, b] of [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]]) box(0.04, 0.42, 0.04, blue, g, a, 0.21, b); chairs.push(g); }
  // palmiers (tronc en segments un peu courbé + palmes)
  const trunkM = M('#8a7454', { nc: true }), frondM = M('#4f7b3a', { nc: true, side: THREE.DoubleSide }), frond2 = M('#5f8a43', { nc: true, side: THREE.DoubleSide });
  const palms = [];
  for (const x of [-16, -7.5, 9, 19]) {
    const g = new THREE.Group(); g.position.set(x, 4.22, 6.8); scene.add(g); const top = new THREE.Group(); g.add(top);
    let px = 0, py = 0; const bend = (R() - 0.5) * 0.12;
    for (let s = 0; s < 8; s++) { cyl(0.22 - s * 0.012, 0.26 - s * 0.012, 1.25, 7, trunkM, g, px, py + 0.62, 0); py += 1.2; px += bend * s * 0.3; }
    top.position.set(px, py, 0);
    for (let f = 0; f < 11; f++) { const fr_ = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 4.0, 1, 4).translate(0, 2.0, 0), f % 2 ? frondM : frond2); const pp = fr_.geometry.attributes.position; for (let i = 0; i < pp.count; i++) { const yy = pp.getY(i); pp.setZ(i, -0.09 * yy * yy); pp.setX(i, pp.getX(i) * (1 - yy / 4.6)); }
      fr_.geometry.computeVertexNormals(); fr_.rotation.set(-1.0 - R() * 0.4, f * 0.571, 0, 'YXZ'); fr_.castShadow = true; top.add(fr_); }
    palms.push({ g, top, ph: R() * 6 });
  }
  // réverbères
  const lampGlass = M('#2a2620', { e: '#ffc27a', ei: 0, unique: true, nc: true });
  const lampLights = [];
  for (const x of [-15, 9, 33]) { cyl(0.07, 0.1, 5, 8, M('#2a2f33', { nc: true }), world, x, 6.7, 6.5); box(0.4, 0.5, 0.4, lampGlass, scene, x, 9.4, 6.5); const L = new THREE.PointLight('#ffbf78', 0, 30, 1.6); L.position.set(x, 9.2, 6.5); scene.add(L); lampLights.push(L); }
  // parasols et transats (plage privée bleue et blanche)
  const umbM = M('#f3f3ee', { nc: true, side: THREE.DoubleSide }), umbB = M('#2b6aa8', { nc: true, side: THREE.DoubleSide });
  const beachThings = [];
  for (let i = 0; i < 7; i++) { const x = -12 + i * 4.2, z = -12 - (i % 2) * 5; const y = H(x, z);
    const g = new THREE.Group(); g.position.set(x, y, z); world.add(g); cyl(0.04, 0.04, 2.4, 6, M('#ddd', { nc: true }), g, 0, 1.2, 0);
    add(new THREE.ConeGeometry(1.4, 0.5, 10, 1, true), i % 2 ? umbM : umbB, g, 0, 2.5, 0);
    box(0.65, 0.12, 1.8, M('#e8e2d2', { nc: true }), g, 0.9, 0.3, 0.2); beachThings.push(g); }
  // poste de secours
  { const g = new THREE.Group(); g.position.set(24, H(24, -6), -6); world.add(g); for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) cyl(0.06, 0.06, 2.4, 6, M('#ddd', { nc: true }), g, a, 1.2, b);
    box(2.0, 1.4, 2.0, M('#e04a3a', { nc: true }), g, 0, 3.0, 0); box(2.3, 0.15, 2.3, M('#f2f2f2', { nc: true }), g, 0, 3.8, 0); }
  // la colline du Château : des pins, la vieille ville au pied
  const pineM = M('#3f6334', { nc: true });
  for (let i = 0; i < 80; i++) { const x = -420 + (R() - 0.5) * 300, z = -10 + (R() - 0.5) * 230, y = H(x, z); if (y < 12) continue; const m = add(new THREE.IcosahedronGeometry(6 + R() * 5, 0), pineM, world, x, y + 4, z); m.scale.y = 0.7; }
  const oldTown = ['#e8b77c', '#e3a46a', '#f0d29a', '#d98c5e', '#efc58e'];
  for (let i = 0; i < 70; i++) { const x = -330 + R() * 210, z = 10 + R() * 120; const h = 10 + R() * 12; box(10 + R() * 8, h, 10 + R() * 6, M(oldTown[i % 5]), world, x, 4 + h / 2, z); }
  for (let i = 0; i < 26; i++) { const x = -200 + i * 30, h = 18 + R() * 10; box(26, h, 16, M(oldTown[(i + 2) % 5]), world, x, 4 + h / 2, 34); }   // façades de la promenade (au loin, derrière)
  scene.add(bake(world));
  scene.traverse((o) => { if (o.isMesh && o !== near && o !== farG && o !== sea.mesh) { o.castShadow = true; o.receiveShadow = true; } });

  // les bateaux
  const boats = [[-60, -260, 'peche'], [80, -520, 'peche'], [-220, -900, 'voilier'], [300, -1500, 'yacht'], [-500, -2600, 'voilier']].map(([x, z, kind], i) => {
    const g = new THREE.Group(); scene.add(g);
    if (kind === 'peche') { box(2.2, 0.9, 6, M('#f1f1ea', { nc: true }), g, 0, 0.35, 0); box(1.6, 1.0, 1.6, M('#3a6ea8', { nc: true }), g, 0, 1.2, -0.6); g.scale.setScalar(1.6); }
    else if (kind === 'voilier') { box(2.6, 1.0, 9, M('#f6f6f2', { nc: true }), g, 0, 0.4, 0); cyl(0.08, 0.08, 12, 6, M('#ddd', { nc: true }), g, 0, 6.5, 0.5); add(new THREE.PlaneGeometry(4, 10).translate(-2, 6.5, 0), M('#fbfbf6', { nc: true, side: THREE.DoubleSide }), g, 0, 0, 0.5, 0, Math.PI / 2, 0); g.scale.setScalar(2); }
    else { box(6, 2.4, 30, M('#fbfbf8', { nc: true }), g, 0, 1, 0); box(4.6, 2.2, 14, M('#fbfbf8', { nc: true }), g, 0, 3.2, 2); box(4.7, 0.8, 13, M('#1f2a33', { nc: true }), g, 0, 3.4, 2); }
    return { g, x, z, ry: R() * 6, tilt: (R() - 0.5) * 0.6 }; });

  // -------------------------------------------------------------------
  // LES GENS
  // -------------------------------------------------------------------
  const SH = ['#3d6e9e', '#e8e2d4', '#b2453a', '#6a7f4a', '#d8b04a', '#7a5a8a', '#2f2f2f', '#c86a8a', '#5a8fb0', '#f0f0f0'];
  const mkP = (o) => { const P = makePerson(scene, o); P.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return P; };
  // promeneurs (le long de la promenade, est ↔ ouest), assis sur les chaises bleues, une poussette, un enfant au ballon, un skateur
  const walkers = Array.from({ length: 9 }, (_, i) => { const P = mkP({ shirt: SH[i % 10], pants: R() < 0.5 ? '#2b3448' : '#c9c2b0', hair: ['#2a1d15', '#5a3a22', '#c79a5a', '#8a8a8a'][(R() * 4) | 0], skin: ['#e2b994', '#c99872', '#a8714c', '#e6bf9e'][(R() * 4) | 0] });
    P.z = 1.4 + R() * 2.4, P.x0 = -40 + R() * 80, P.dir = R() < 0.5 ? -1 : 1, P.spd = 1.0 + R() * 0.5, P.ph = R() * 6; P.mask = R() < 0.6; return P; });
  const sitters = chairs.slice(0, 5).map((c, i) => { const P = mkP({ shirt: SH[(i + 3) % 10], pants: '#3b3b3b', hair: ['#2a1d15', '#d8d0c0'][i % 2] }); P.chair = c; P.mask = i % 2 === 0; return P; });
  const sunbathers = Array.from({ length: 5 }, (_, i) => { const P = mkP({ shirt: ['#e2b994', '#c99872', '#e6bf9e'][i % 3], pants: ['#2b6aa8', '#d03a3a', '#1f1f1f'][i % 3] }); const x = -10 + i * 4.2 + 1.1, z = -12 - (i % 2) * 5 + 0.2; P.pos = new THREE.Vector3(x, H(x, z) + 0.45, z); return P; });
  const standers = [[-4.6, -9.5, 0.5], [-3.8, -9.9, -2.3], [6.3, -14.5, 1.2]].map(([x, z, ry], i) => { const P = mkP({ shirt: ['#f2f2f2', '#e2b994', '#2b6aa8'][i], pants: ['#d03a3a', '#1f1f1f', '#e2d9c2'][i], skin: ['#c99872', '#e2b994', '#a8714c'][i] }); P.pos = new THREE.Vector3(x, H(x, z), z); P.ry = ry; return P; });
  const swimmerM = M('#d9a982', { nc: true });
  const swimmers = Array.from({ length: 5 }, (_, i) => ({ m: add(new THREE.SphereGeometry(0.13, 10, 8), swimmerM, scene, 0, 0, 0), x: -6 + i * 5, z: -45 - i * 4, ph: R() * 6 }));
  const kid = mkP({ shirt: '#ff8a2a', pants: '#24324a', hair: '#7a4a28', s: 0.6 });
  const ballTex = canvasTex(128, 64, (g, w, h) => { const C = ['#e8452f', '#ffd23f', '#2b74b8', '#f4f4f0', '#3fae5a', '#ffd23f']; for (let i = 0; i < 6; i++) { g.fillStyle = C[i]; g.fillRect(i * w / 6, 0, w / 6 + 1, h); } });
  const ball = add(new THREE.SphereGeometry(0.22, 18, 12), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.4 }), scene, 0, 0, 0);
  // une bouée de sauvetage suspendue à une potence : un vrai « fil à plomb »
  const gibbet = new THREE.Group(); gibbet.position.set(0.9, 4.22, 0.6); scene.add(gibbet);
  box(0.12, 2.6, 0.12, M('#e8e8e2', { nc: true }), gibbet, 0, 1.3, 0); box(0.1, 0.1, 0.9, M('#e8e8e2', { nc: true }), gibbet, 0, 2.55, -0.4);
  const swing = new THREE.Group(); swing.position.set(0, 2.5, -0.8); gibbet.add(swing);
  box(0.02, 0.9, 0.02, M('#c9b48a', { nc: true }), swing, 0, -0.45, 0); add(new THREE.TorusGeometry(0.28, 0.08, 8, 20), M('#ff6a1a', { nc: true }), swing, 0, -1.1, 0);
  const parent = mkP({ shirt: '#7a9ab8', pants: '#2f2f2f', hair: '#3a2a20' });
  const stroller = new THREE.Group(); scene.add(stroller);
  { box(0.5, 0.35, 0.8, M('#2a3a4a', { nc: true }), stroller, 0, 0.6, 0); add(new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#2a3a4a', { nc: true, side: THREE.DoubleSide }), stroller, 0, 0.78, -0.2, 0.4, 0, 0);
    for (const [a, b] of [[-0.25, -0.3], [0.25, -0.3], [-0.25, 0.3], [0.25, 0.3]]) add(new THREE.TorusGeometry(0.12, 0.03, 5, 12), M('#111', { nc: true }), stroller, a, 0.13, b, 0, Math.PI / 2, 0);
    box(0.04, 0.6, 0.04, M('#888', { nc: true }), stroller, 0, 0.95, 0.5); }
  const skate = new THREE.Group(); scene.add(skate); box(0.22, 0.03, 0.8, M('#d23b3b', { nc: true }), skate, 0, 0.09, 0); for (const b of [-0.28, 0.28]) box(0.24, 0.06, 0.06, M('#222', { nc: true }), skate, 0, 0.04, b);
  // masque à oxygène (petite boîte sur le visage) pour certains quand l'air se raréfie
  const maskM = M('#f0f4f6', { nc: true });
  [...walkers, ...sitters].forEach((P) => { if (P.mask) { const m = add(new THREE.BoxGeometry(0.12, 0.1, 0.06), maskM, P.head, 0, 0.06, 0.13); P.maskMesh = m; } });

  // gravats de la colline (séisme), poussière
  const rocks = Array.from({ length: 90 }, () => ({ m: add(new THREE.IcosahedronGeometry(0.8 + R() * 2.2, 0), M('#9a8f80', { nc: true }), scene, 0, -100, 0), x: -420 + (R() - 0.5) * 220, z: -60 + (R() - 0.5) * 120, t0: T.quake + 0.8 + R() * 4.5, v: 4 + R() * 8 }));
  rocks.forEach((r) => { r.y0 = H(r.x, r.z) + 2; });

  // étiquette « une image par jour » / accéléré, déchirure
  const hud = document.getElementById('hud');
  const mk = (css) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;pointer-events:none;opacity:0;' + css; hud.appendChild(d); return d; };
  const tag = mk("left:0;right:0;top:560px;text-align:center;font-family:'Inter';font-weight:800;font-size:28px;letter-spacing:0.16em;");
  const tagIn = document.createElement('span'); tagIn.style.cssText = 'display:inline-block;padding:11px 20px;border-radius:6px;background:rgba(20,24,30,0.72);color:#fff;'; tag.appendChild(tagIn);
  const tear = mk('left:0;width:1080px;height:70px;background:linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.35), rgba(160,220,255,0.25), rgba(255,255,255,0.0));mix-blend-mode:screen;');

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(0, 9.5, 9.5), LOOK = new THREE.Vector3(0, -38, -290);
  const tmp = new THREE.Vector3(), up = new THREE.Vector3();
  function update(t) {
    const real = t >= T.real;                          // retour au présent
    const k = kAt(t);
    const tilt = real ? 0 : tiltAt(k), wgt = real ? 1 : weightAt(k);
    // --- phases « une image par jour » : le Soleil est toujours à 14 h ; pendant le cycle, il fait un tour complet en 7 s
    let Hh = H14 + (t < T.spin ? (t / 3600) * 2 * Math.PI / 24 : 0);
    let day = 1;
    if (t >= T.cycle0 && t < T.cycle1) { const u = (t - T.cycle0) / (T.cycle1 - T.cycle0); Hh = H14 + u * 2 * Math.PI; }
    const sd = sunDir(Hh); sky.u.uSunDir.value.copy(sd); sunSprite.userData.dir.copy(sd);
    day = sm(-0.12, 0.08, sd.y);
    sky.u.uDay.value = day; sky.u.uStars.value = 1 - day;
    sunSprite.visible = sd.y > -0.05; sun.intensity = 3.3 * sm(-0.02, 0.12, sd.y); hemi.intensity = 0.15 + 0.8 * day;
    sun.position.copy(sd).multiplyScalar(200).add(tmp.set(0, 0, -10)); sun.target.position.set(0, 0, -10);
    // l'air qui se raréfie : ciel plus sombre, moins de brume
    const thin = real ? 0 : sm(T.air, T.quake, t);
    sky.u.uDayZen.value.copy(DAYZ).lerp(THINZ, thin); sky.u.uDayHor.value.copy(DAYH).lerp(THINH, thin);
    scene.fog.far = lerp(26000, 60000, thin);
    lampLights.forEach((L) => { L.intensity = 4 * (1 - day); }); lampGlass.emissiveIntensity = 2.5 * (1 - day);
    // --- la caméra (séisme : elle tremble)
    const q = real ? 0 : sm(T.quake, T.quake + 0.6, t) * (1 - sm(T.fly - 0.5, T.fly + 1.5, t)) * (0.6 + 0.4 * Math.sin(t * 2.3));
    camera.position.copy(CAM); camera.position.x += (Math.sin(t * 37) + Math.sin(t * 59)) * 0.06 * q; camera.position.y += Math.sin(t * 43) * 0.05 * q;
    camera.lookAt(LOOK); camera.rotation.z += Math.sin(t * 29) * 0.006 * q; camera.fov = 64; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sky.follow(camera); sunSprite.follow(camera);
    // --- la mer qui se vide (une image par jour), puis plus rien
    const drain = real ? 0 : sm(T.sea, T.air + 2, t);
    const level = -2200 * Math.pow(drain, 1.6);
    sea.U.uLevel.value = level; sea.U.uTime.value = t; sea.U.uChop.value = 0.35 * (1 - 0.6 * drain);
    sea.mesh.visible = !real ? drain < 0.999 : true;
    // les bateaux : flottent, puis se posent sur le fond, couchés
    boats.forEach((b) => { const yb = H(b.x, b.z); const onBed = level + 0.3 < yb + 0.6;
      b.g.position.set(b.x, onBed ? yb + 0.3 : level + 0.3 + Math.sin(t * 1.1 + b.ry) * 0.15 * (1 - drain), b.z); b.g.rotation.set(onBed ? 0.08 : Math.sin(t * 0.9 + b.ry) * 0.03, b.ry, onBed ? b.tilt : 0); });
    swimmers.forEach((s) => { s.m.visible = drain < 0.02; s.m.position.set(s.x + Math.sin(t * 0.4 + s.ph), 0.05 + Math.sin(t * 2 + s.ph) * 0.06, s.z); });
    // --- les fissures (séisme)
    FX.uDCrack.value = real ? 0 : 0.7 * sm(T.quake + 0.3, T.quake + 4, t);
    palms.forEach((p) => { p.top.rotation.z = Math.sin(t * 1.3 + p.ph) * 0.03 + Math.sin(t * 7 + p.ph) * 0.12 * q; p.g.rotation.z = Math.sin(t * 6 + p.ph) * 0.03 * q; });
    rocks.forEach((r) => { const u = t - r.t0; r.m.visible = !real && u > 0 && u < 6; if (!r.m.visible) return; const y = Math.max(H(r.x + r.v * 2 * u, r.z) + 1, r.y0 - 4.9 * u * u); r.m.position.set(r.x + r.v * 2 * u, y, r.z); r.m.rotation.set(u * 3, u * 2, 0); });

    // --- les gens : penchés de « tilt » vers le nord (+z) pour rester droits ; masques ; certains s'assoient, s'effondrent
    const sitDown = real ? 0 : sm(T.air + 3, T.air + 7, t);
    const crouch = q;
    const lean = (P) => { P.root.rotation.x = tilt; };
    const inCycle = t >= T.cycle0 && t < T.cycle1;
    walkers.forEach((P, i) => {
      P.reset(); P.root.rotation.set(0, 0, 0); P.root.visible = !inCycle;
      const moving = real || t < T.spin || (t > T.tilt && t < T.sea);
      const u = (t * P.spd * (t >= T.cycle0 && t < T.cycle1 ? 0 : 1)) + i * 7;
      const x = ((P.x0 + P.dir * u + 15) % 30 + 30) % 30 - 15;
      P.root.position.set(x, 4.22, P.z); P.root.rotation.y = P.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (moving) P.walk(t * 5.5 + P.ph, 1);
      lean(P);
      if (P.maskMesh) P.maskMesh.visible = !real && t > T.air + 1.5;
      if (!real && t > T.air) { const s = i % 3 === 0 ? sitDown : 0; P.body.position.y = 0.9 - 0.42 * s; for (const L of P.legs) { L.hip.rotation.x = -1.4 * s; L.knee.rotation.x = 1.6 * s; } P.head.rotation.x = 0.4 * s; }
      if (crouch > 0) { const c = Math.min(1, crouch * 1.5); P.body.position.y = 0.9 - 0.4 * c; for (const L of P.legs) { L.hip.rotation.x = -1.1 * c; L.knee.rotation.x = 1.9 * c; } P.armL.rotation.set(-0.7 * c, 0, 0.5); P.armR.rotation.set(-0.7 * c, 0, -0.5); }
    });
    sitters.forEach((P) => { P.reset(); P.root.rotation.set(0, 0, 0); P.root.visible = !inCycle; P.root.position.copy(P.chair.position); P.root.rotation.y = P.chair.rotation.y; P.sit(1); P.root.position.z -= 0.02;
      P.body.rotation.x = -tilt * 0.6; if (P.maskMesh) P.maskMesh.visible = !real && t > T.air + 1.5; if (!real && t > T.air + 4) P.head.rotation.x = 0.5; });
    sunbathers.forEach((P, i) => { P.reset(); P.root.position.copy(P.pos); P.root.rotation.set(0, Math.PI / 2, 0); P.root.rotateX(-Math.PI / 2 + 0.1); P.root.visible = real || t < T.sea + 3; P.armL.rotation.set(0, 0, 0.6); P.armR.rotation.set(0, 0, -0.6); });
    standers.forEach((P, i) => { P.reset(); P.root.position.copy(P.pos); P.root.rotation.set(0, P.ry, 0); P.root.rotation.order = 'YXZ'; P.root.rotation.set(tilt, Math.PI, 0); P.root.rotation.y = Math.PI + (P.ry - Math.PI) * 0; P.root.visible = (real || t < T.sea + 3) && !inCycle;
      P.armR.rotation.set(-0.4 - 0.3 * Math.sin(t * 2 + i), 0, -0.2); P.head.rotation.y = i === 1 ? 0.5 : -0.4; });
    swing.rotation.x = real ? 0 : tilt + Math.sin(t * 2.1) * 0.02 * (t > T.tilt ? 1 : 0);   // la bouée pend vers le sud (−z)
    // l'enfant pose son ballon… qui file vers la mer ; la poussette lâchée une seconde ; le skate
    const R0 = T.tilt + 0.6, slope = Math.sin(tiltAt(10)) * G0 * 0.7, rollOn = !real && t > T.tilt;   // accélération le long de la « pente » (roulement)
    kid.reset(); kid.root.position.set(-1.1, 4.22, 3.3); kid.root.rotation.set(tilt, Math.PI, 0); kid.root.visible = !inCycle; ball.visible = !inCycle;
    { const u = Math.max(0, t - R0 - 0.8); const d = rollOn ? 0.5 * slope * u * u : 0;
      const bz = Math.max(-34, 2.8 - d); ball.position.set(-1.4 + 0.3 * Math.sin(d * 0.3), Math.max(bz > 0 ? 4.36 : H(-1.4, bz) + 0.14, 0.12) + (bz < 0 && bz > -32 ? 0.12 * Math.abs(Math.sin(d * 2.2)) : 0), bz);
      ball.rotation.x = -d / 0.14;
      kid.armR.rotation.set(t > T.tilt && t < R0 + 0.8 ? -0.9 : t > R0 + 1.4 && t < T.sea ? -2.4 : 0, 0, -0.2); }
    parent.reset(); parent.root.position.set(2.4, 4.22, 4.6); parent.root.rotation.set(tilt, Math.PI, 0); parent.root.visible = stroller.visible = skate.visible = !inCycle;
    { const let_ = t > T.tilt + 2.6 && !real; const u = Math.max(0, t - (T.tilt + 2.6)); const d = let_ ? Math.min(2.6, 0.5 * slope * u * u) : 0;
      stroller.position.set(2.4, 4.22, 3.7 - d); stroller.rotation.y = Math.PI; parent.root.position.z = 4.6 - Math.max(0, d - 0.6);
      parent.armL.rotation.set(-1.2 - 0.6 * (d > 0.2 ? 1 : 0), 0, 0.1); parent.armR.rotation.set(-1.2 - 0.6 * (d > 0.2 ? 1 : 0), 0, -0.1); if (d > 0.3) parent.walk(t * 9, 1.2); parent.root.rotation.x = tilt; }
    { const u = Math.max(0, t - (T.tilt + 1.2)); const d = rollOn ? 0.5 * slope * 1.1 * u * u : 0;
      const sz = Math.max(-33, 4.0 - d); skate.position.set(-2.2, sz > 0 ? 4.22 : Math.max(H(-2.2, sz) + 0.02, 0.05), sz); skate.rotation.x = sz < 0 && sz > -32 ? -0.13 - tilt * 0 : 0; }

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const dayH = 24 / k, dh = Math.floor(dayH), dm = Math.round((dayH - dh) * 60);
    const dayTxt = dm === 60 ? `${dh + 1} h` : dm === 0 ? `${dh} h` : `${dh} h ${pad(dm)}`;
    let days = t < T.spin ? 0 : t < T.spun ? Math.floor(21 * sm(T.spin, T.spun, t)) : t < T.real ? 21 + Math.floor(Math.max(0, t - T.sea) * 2.2) : 0;
    const clock = t < T.spin ? 14 * 3600 + t : (t >= T.cycle0 && t < T.cycle1) ? 14 * 3600 + (t - T.cycle0) / (T.cycle1 - T.cycle0) * 8640 : 14 * 3600 + (t - T.cycle1) * (t > T.cycle1 ? 1 : 0);
    const hh = Math.floor(clock / 3600) % 24, mmn = Math.floor(clock / 60) % 60;
    HUD.live(t, 'NICE · PROMENADE DES ANGLAIS · CAM 03', real ? `09/10/2026 · 14:${pad(Math.floor((t - T.real) / 60))}:${pad(Math.floor(t - T.real) % 60)}` : `${days > 0 ? `JOUR ${days} · ` : '09/10/2026 · '}${pad(hh)}:${pad(mmn)}`);
    HUD.show2(true);
    HUD.block(1, { label: 'DURÉE D’UN JOUR', value: real ? '24 h' : dayTxt, sub: `NICE FILE VERS L’EST À ${fr(Math.round(1210 * k / 10) * 10)} KM/H`, color: k > 1.01 ? '#ffd36b' : '#fff' });
    if (real) HUD.block(2, { label: 'EN RÉALITÉ', value: '+1,8 ms', sub: 'PAR SIÈCLE : LE JOUR S’ALLONGE', color: '#9fe3a0' });
    else if (t < T.sea) HUD.block(2, { label: 'TON POIDS', value: `${wgt < 0.995 ? '−' : ''}${Math.round((1 - wgt) * 100)} %`, sub: `LE SOL SEMBLE PENCHÉ DE ${fr(tilt * 180 / Math.PI, 1)}° VERS LE SUD`, color: wgt < 0.995 ? '#ffd36b' : '#fff' });
    else if (t < T.air) HUD.block(2, { label: 'NIVEAU DE LA MER', value: drain > 0.97 ? 'à sec' : `−${fr(Math.round(-level / (level < -100 ? 10 : 1)) * (level < -100 ? 10 : 1))} m`, sub: 'L’EAU FILE VERS L’ÉQUATEUR', color: '#ffd36b' });
    else if (t < T.quake) { const hpa = Math.round(1013 * Math.exp(-2.1 * sm(T.air, T.quake, t) ** 1.2)); HUD.block(2, { label: 'PRESSION DE L’AIR', value: `${fr(hpa)} hPa`, sub: hpa < 360 ? 'MOINS QU’AU SOMMET DE L’EVEREST (≈ 340)' : 'NORMALE : 1 013 HPA', color: hpa < 600 ? '#ff6b5e' : '#ffd36b' }); }
    else if (t < T.fly) HUD.block(2, { label: 'LA PLANÈTE SE DÉFORME', value: 'séismes', sub: 'PARTOUT SUR TERRE', color: '#ff6b5e' });
    else HUD.block(2, { label: 'À L’ÉQUATEUR', value: '−34 %', sub: 'DE POIDS · À 17× : APESANTEUR', color: '#ffd36b' });
    let tg = '';
    if (t >= T.spin && t < T.spun) tg = 'UNE IMAGE PAR JOUR · 3 SEMAINES';
    else if (t >= T.cycle0 && t < T.cycle1) tg = 'ACCÉLÉRÉ ×1 200 · UNE JOURNÉE ENTIÈRE';
    else if (t >= T.sea && t < T.quake) tg = 'UNE IMAGE PAR JOUR';
    else if (t >= T.real && t < T.real + 2.2) tg = 'RETOUR À LA RÉALITÉ';
    if (tagIn.textContent !== tg) tagIn.textContent = tg; tag.style.opacity = tg ? 1 : 0;
    let tearOp = 0, tearY = 0;
    for (const j of [T.spin, T.cycle0, T.cycle1, T.sea, T.real]) { const u = t - j; if (u > -0.02 && u < 0.3) { tearOp = 1 - u / 0.3; tearY = 300 + ((j * 997) % 1200) + u * 900; } }
    tear.style.opacity = tearOp; tear.style.top = `${tearY}px`;
    HUD.hook(t, 'Et si la Terre tournait<br><em>10 fois</em> plus vite ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.end(t, T.endCard, { kicker: 'C’EST LA LUNE QUI FREINE LA TERRE, PAR LES MARÉES', q: 'Tu ferais quoi d’une<br>journée de 2 h 24 ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

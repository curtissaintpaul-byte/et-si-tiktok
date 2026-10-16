// =====================================================================
//  ÉPISODE : « Et si la Terre était deux fois plus grosse ? » — Chamonix, la place face au mont Blanc
//  Un seul personnage suivi : Camille (60 kg, un sac de 10 kg), qui part en randonnée.
//  Faits (sources dans la légende ; calculs refaits en Python) :
//   - diamètre de la Terre 12 742 km (NASA). Deux fois plus large, même roche (même densité) :
//     masse × 8 (volume × 8), gravité de surface g ∝ M / R² → × 8 / 4 = × 2 (9,81 → 19,6 m/s²).
//   - poids ressenti × 2 : 60 kg → 120 kg ; sac 10 kg → 20 kg ; tête ≈ 5 kg → 10 kg.
//   - même vitesse au départ → un jet d'eau ou une balle montent 2 fois moins haut (h = v² / 2g), et retombent 2 fois plus vite.
//   - tomber : énergie à l'impact = m·g·h → × 2, comme tomber de 2 fois plus haut aujourd'hui.
//   - colonne de sang (ρ = 1 060 kg/m³) : cœur → cerveau ≈ 30 cm : 23 mmHg perdus à 1 g, 47 mmHg à 2 g ;
//     cœur → pieds ≈ 1,2 m : 94 mmHg en plus à 1 g, 187 mmHg à 2 g → le sang s'accumule dans les jambes.
//   - à +2 Gz : poids doublé, tissus du visage qui tombent, gestes difficiles ; 3 g supportés 60 min
//     (NASA, « Issues on Human Acceleration Tolerance », 1993). Animaux 6 mois à 1-1,5 g : squelette plus gros,
//     plus grande capacité d'effort (même rapport, réf. Smith).
//   - vitesse orbitale au ras du sol √(gR) : 7,9 km/s → 15,8 km/s (× 2) ; vitesse de libération 11,2 → 22,4 km/s.
//   - Kepler-452b (NASA, juillet 2015) : 1 400 années-lumière, ~60 % plus large que la Terre, gravité « environ deux fois ».
//   - NASA Ames (Cowings et al., 2003) : 4 volontaires ont vécu 22 h à bord d'une centrifugeuse, à 1,25 g et 1,5 g.
//   - mont Blanc : 4 805,59 m (mesure 2023), Chamonix ≈ 1 035 m.
// =====================================================================
import { THREE, createStage, makeSky, M, box, cyl, prism, bake, HUD, sm, lerp, clamp, rng, dirAzEl, pad, keys, fr, dotTex, canvasTex, signTex, terrain, noise2 } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makeInsets } from '../../lib-insets.js';
import { insetList } from './insets.js';

const Q = new URLSearchParams(location.search);
const E0 = 15.0;                                // la gravité double (temps de scène)
const H0 = 35.0, H1 = 42.4;                     // « quelques heures plus tard »
const W1 = 42.4;                                // « des semaines plus tard »
const RW0 = 49.6, RW1 = 51.0;                   // retour au réel (on rembobine)
const sceneEnd = 69.4;
const T = { hookOut: 3.0, event: E0, rewind: RW0, real: RW1, endCard: 65.4, duration: sceneEnd };
const SUBS = [
  [3.2, 6.6, 'Chamonix, au pied du mont Blanc. Camille part en rando.'],
  [6.8, 10.2, 'La Terre mesure 12 742 km de large.'],
  [10.4, 14.6, 'Et si elle était deux fois plus large, faite de la même roche ?'],
  [15.0, 18.0, 'Elle aurait 8 fois plus de masse. Sur toi, la gravité doublerait.'],
  [18.2, 21.4, 'D’un coup, les 60 kg de Camille pèsent comme 120 kg.'],
  [21.6, 24.2, 'Son sac de 10 kg tire comme 20 kg sur ses épaules.'],
  [24.6, 27.8, 'Le jet de la fontaine monte deux fois moins haut.'],
  [28.0, 31.4, 'Trébucher, c’est comme tomber de deux fois plus haut.'],
  [31.6, 35.0, 'Se relever, c’est soulever 60 kg de plus que d’habitude.'],
  [35.2, 38.6, 'Quelques heures plus tard, le sang descend : ses chevilles gonflent.'],
  [38.8, 42.2, 'Les fusées ne décollent plus : elles sont devenues trop lourdes.'],
  [42.4, 45.8, 'Des semaines plus tard, son corps s’adapte : ses muscles s’épaississent.'],
  [46.2, 49.4, 'Mais chaque pas pèse deux fois plus sur ses genoux et son dos.'],
  [51.2, 54.4, 'Rassure-toi : la Terre ne va pas grossir.'],
  [54.6, 58.0, 'Mais en 2015, la NASA a découvert Kepler-452b.'],
  [58.2, 61.6, 'Sa gravité serait environ deux fois celle de la Terre.'],
  [61.8, 65.2, 'Et des volontaires ont déjà passé 22 h à 1,5 fois notre gravité.'],
];
// le temps écoulé depuis le changement (en secondes), selon le temps de scène : réel, puis accéléré (heures, puis semaines)
const EL = [[E0, 0], [H0, 20], [H1 - 0.01, 8 * 3600], [W1, 8 * 3600 + 60], [RW0, 42 * 86400]];
const elapsed = (ts) => (ts < E0 || ts >= RW0 ? -1 : keys(EL, ts));

export default async function () {
  const insets = makeInsets();
  const stage = createStage({ fov: 62, far: 40000, bloom: [0.14, 0.4, 0.94], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffb35c');
  const R = rng(452);
  const SUN_AM = dirAzEl(150, 42), SUN_PM = dirAzEl(255, 12);   // 10 h du matin, puis la fin d'après-midi
  const sky = makeSky(scene, { sunDir: SUN_AM.clone(), dayZen: [0.03, 0.12, 0.42], dayHor: [0.45, 0.58, 0.72], stars: 0, sunGlow: 0.35 });
  const FOG_AM = new THREE.Color('#b4c4d6'), FOG_PM = new THREE.Color('#d4b49a');
  scene.fog = new THREE.Fog(FOG_AM.clone(), 2500, 26000);
  const sun = new THREE.DirectionalLight('#fff3e2', 2.7); sun.target.position.set(0, 0, -4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 300 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c8d8ee', '#7a705f', 0.95); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;

  // -------------------------------------------------------------------
  // LES MONTAGNES : le massif du Mont-Blanc au fond (sud), les Aiguilles Rouges derrière la caméra
  // (1 unité = 1 m ; le fond de vallée est à 0 = 1 035 m d'altitude)
  // -------------------------------------------------------------------
  const nz = noise2(7);
  const PEAKS = [ // [x, z, hauteur, largeur] : le dôme du mont Blanc, le dôme du Goûter, l'aiguille du Midi, les aiguilles de Chamonix
    [-1800, -6800, 3770, 2100], [-4300, -5600, 3000, 1500], [1100, -4300, 2800, 520], [2600, -4600, 2500, 480], [3900, -4900, 2600, 520],
    [5400, -5200, 2400, 700], [-6800, -5200, 2300, 1300], [-200, -5200, 2900, 900], [7600, -5600, 2200, 1100]];
  const hMont = (x, z) => {
    if (z > -900) return Math.max(0, (Math.abs(x) - 1800) * 0.25);
    let h = sm(-900, -2600, z) * 1000;                                       // le pied du massif (forêt)
    for (const [px, pz, ph, pw] of PEAKS) { const d = Math.hypot((x - px) / pw, (z - pz) / (pw * 1.2)); h = Math.max(h, 1.15 * ph * Math.exp(-d * d * 1.3)); }
    h += (nz(x / 700, z / 700, 4) - 0.45) * 520 * sm(-1500, -3500, z);       // les crêtes
    h += Math.max(0, (Math.abs(x) - 2200) * 0.22);                           // les flancs de la vallée
    return h;
  };
  const colMont = (x, z, y) => {
    const n = nz(x / 300 + 9, z / 300, 2);
    if (y > 2050 + n * 500) return n > 0.62 ? '#9aa1aa' : (y > 2900 ? '#f4f7fb' : '#e8eef5');   // neige (et quelques rochers)
    if (y > 1250 + n * 300) return n > 0.5 ? '#7b7f84' : '#8d8a80';                              // roche
    if (y > 120) return n > 0.5 ? '#2f4a33' : '#36533a';                                         // forêt de sapins
    return '#5f7d47';
  };
  const mGeo = terrain(26000, 16000, 220, hMont, colMont); mGeo.translate(0, -2, -7600);
  const mont = new THREE.Mesh(mGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })); mont.receiveShadow = false; scene.add(mont);
  // -------------------------------------------------------------------
  // LA PLACE (pavés), LES CHALETS, LA FONTAINE, LA STATUE, LA TERRASSE
  // -------------------------------------------------------------------
  const deco = new THREE.Group();
  const pave = canvasTex(512, 512, (g, w) => { const n = 14, s = w / n; g.fillStyle = '#8f8a82'; g.fillRect(0, 0, w, w);
    for (let j = 0; j < n; j++) for (let i = -1; i < n; i++) { const v = 150 + R() * 40 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.beginPath(); g.roundRect(i * s + (j % 2) * s / 2 + 3, j * s + 3, s - 6, s - 6, 6); g.fill(); } }, 16);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 160), M('#ffffff', { map: pave, flat: false, r: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -50); ground.receiveShadow = true; deco.add(ground);
  box(4000, 0.1, 4000, M('#5f7d47'), deco, 0, -0.08, -1200);
  const WOOD = ['#6e4a2e', '#7c5534', '#5e3f27', '#87603b'], STONE = ['#d8d2c6', '#cfc8b8', '#e2dccf'], SHUT = ['#3f6a46', '#8b3a2f', '#3e5a74', '#6b4b2a'];
  function chalet(x, z, w, d, h, side, sign) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; deco.add(g);
    const wood = M(WOOD[Math.floor(R() * 4)]), stone = M(STONE[Math.floor(R() * 3)]), sh = M(SHUT[Math.floor(R() * 4)]);
    box(w, 3.2, d, stone, g, 0, 1.6, -d / 2);                       // rez-de-chaussée en pierre
    box(w, h - 3.2, d, wood, g, 0, 3.2 + (h - 3.2) / 2, -d / 2);    // les étages en bois
    prism(d + 2.4, 3.2, w + 2.2, M('#4c5157'), g, 0, h, -d / 2);    // le grand toit d'ardoise qui déborde
    for (let fl = 0; fl < Math.floor((h - 3.2) / 2.7); fl++) {
      const y = 4.4 + fl * 2.7;
      box(w - 0.6, 0.12, 1.1, M('#5a3a22'), g, 0, y - 0.95, 0.5);   // le balcon
      box(w - 0.6, 0.9, 0.06, M('#5a3a22'), g, 0, y - 0.45, 1.02);
      for (let i = 0; i < 3; i++) { const wx = (i - 1) * w / 3.2; box(0.9, 1.3, 0.08, M('#2e3640', { r: 0.35 }), g, wx, y, 0.03); box(0.45, 1.3, 0.06, sh, g, wx - 0.7, y, 0.06); box(0.45, 1.3, 0.06, sh, g, wx + 0.7, y, 0.06); }
    }
    for (let i = 0; i < 2; i++) box(1.6, 2.1, 0.08, M('#2e3640', { r: 0.3 }), g, (i - 0.5) * w / 2, 1.3, 0.03);   // vitrines
    if (sign) { const st = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 0.55), new THREE.MeshStandardMaterial({ map: signTex(sign, '#24323f', '#efe6d0'), roughness: 0.8 })); st.position.set(0, 2.75, 0.06); g.add(st); }
    // fleurs aux balcons
    box(w - 1, 0.25, 0.3, M('#b23a3a'), g, 0, 3.45 + 0.1, 1.0);
  }
  const SIGNS = ['CAFÉ DES GUIDES', 'LOCATION SKI', 'BOULANGERIE', 'FROMAGERIE', 'HÔTEL', 'SPORTS', 'PHARMACIE', 'BAR'];
  let si = 0;
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    const w = 8 + R() * 3, h = 9 + R() * 4.5; chalet(side * 10.5, 9 - i * 11.5 - R() * 1.5, w, 9, h, side, i < 4 ? SIGNS[si++] : null);
  }
  // l'église Saint-Michel (clocher à bulbe), au fond à gauche
  box(7, 9, 14, M('#e6dfd0'), deco, -16, 4.5, -78); prism(15, 4, 8, M('#4c5157'), deco, -16, 9, -78);
  cyl(2.0, 2.0, 16, 8, M('#e6dfd0'), deco, -16, 8, -70); const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.3, 10, 8), M('#4c5157')); bulb.scale.set(1, 1.4, 1); bulb.position.set(-16, 18, -70); deco.add(bulb);
  cyl(0.05, 0.3, 4, 6, M('#4c5157'), deco, -16, 22, -70);
  // la fontaine
  const FX0 = -2.4, FZ0 = -5.0;
  cyl(1.6, 1.7, 0.55, 20, M('#b9b2a4'), deco, FX0, 0.27, FZ0); cyl(0.18, 0.24, 1.2, 10, M('#a69f91'), deco, FX0, 0.6, FZ0); cyl(0.5, 0.35, 0.18, 12, M('#a69f91'), deco, FX0, 1.2, FZ0);
  const fw = new THREE.Mesh(new THREE.CircleGeometry(1.45, 24), new THREE.MeshStandardMaterial({ color: '#4d7f93', roughness: 0.15 })); fw.rotation.x = -Math.PI / 2; fw.position.set(FX0, 0.5, FZ0); deco.add(fw);
  // la statue de Balmat et de Saussure (bronze), sur son socle, tournée vers le mont Blanc : faite plus bas avec les personnages
  box(3.2, 2.4, 2.0, M('#9d968a'), deco, 5.0, 1.2, -19); box(3.6, 0.3, 2.4, M('#8e877b'), deco, 5.0, 2.45, -19);
  // les bancs, la terrasse du café (tables, parasols)
  const BENCH = [[-0.8, 2.3], [4.2, 1.6]];
  for (const [x, z] of BENCH) { box(2.0, 0.08, 0.5, M('#6b4a32'), deco, x, 0.46, z); box(2.0, 0.45, 0.06, M('#6b4a32'), deco, x, 0.74, z - 0.24); for (const dx of [-0.85, 0.85]) box(0.08, 0.44, 0.45, M('#2a2a2a'), deco, x + dx, 0.22, z); }
  const TABLES = [[7.0, -4.5], [7.0, -7.8], [6.6, -11.2]];
  for (const [x, z] of TABLES) {
    cyl(0.4, 0.4, 0.05, 14, M('#d9d4c8'), deco, x, 0.74, z); cyl(0.04, 0.04, 0.72, 6, M('#2a2a2a'), deco, x, 0.37, z);
    cyl(0.03, 0.03, 2.4, 6, M('#d9d4c8'), deco, x, 1.2, z); const pa = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 10, 1, true), M('#e9e1cf', { side: THREE.DoubleSide })); pa.position.set(x, 2.3, z); deco.add(pa);
    for (const dz of [-0.6, 0.6]) { box(0.42, 0.05, 0.42, M('#4a4a4a'), deco, x, 0.45, z + dz); box(0.42, 0.45, 0.04, M('#4a4a4a'), deco, x, 0.7, z + dz * 1.32); }
  }
  // sapins et lampadaires
  const spruce = (x, z, s) => { cyl(0.12 * s, 0.18 * s, 1.2 * s, 6, M('#4a3426'), deco, x, 0.6 * s, z); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.5 - k * 0.38) * s, 2.2 * s, 8), M('#2d4a30')); c.position.set(x, (1.6 + k * 1.3) * s, z); c.castShadow = true; deco.add(c); } };
  for (const [x, z, s] of [[-7.2, -13, 1.6], [7.4, -16, 1.4], [-7.6, -40, 1.8], [7.2, -46, 1.7], [-6.8, 6.5, 1.3]]) spruce(x, z, s);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const x = sx * 6.6, z = 4 - i * 14; cyl(0.06, 0.09, 4, 6, M('#20262b'), deco, x, 2, z); box(0.3, 0.45, 0.3, M('#2a3036'), deco, x, 4.2, z); }
  // le fond : la rue qui file vers les sapins, des chalets plus loin
  for (let i = 0; i < 18; i++) { const sx = i % 2 ? 1 : -1, x = sx * (16 + R() * 60), z = -90 - R() * 260, h = 8 + R() * 6; box(9, h, 9, M(WOOD[i % 4]), deco, x, h / 2, z); prism(11, 3, 11, M('#4c5157'), deco, x, h, z); }
  for (let i = 0; i < 140; i++) { const x = (R() - 0.5) * 900, z = -120 - R() * 900; if (Math.abs(x) < 25) continue; const c = new THREE.Mesh(new THREE.ConeGeometry(3 + R() * 2, 11 + R() * 6, 6), M('#2b452e')); c.position.set(x, 6, z); deco.add(c); }
  scene.add(bake(deco));

  // -------------------------------------------------------------------
  // L'EAU DE LA FONTAINE (le jet) et LA BALLE : même vitesse au départ, gravité × 2 → 2 fois moins haut
  // -------------------------------------------------------------------
  const NJ = 260, jg = new THREE.BufferGeometry(); jg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NJ * 3), 3));
  const jm = new THREE.PointsMaterial({ map: dotTex(), size: 0.2, color: '#eef6fb', transparent: true, opacity: 0.8, depthWrite: false });
  const jp = new THREE.Points(jg, jm); jp.frustumCulled = false; scene.add(jp);
  const JR = Array.from({ length: NJ }, () => [R(), R(), R()]);
  const JET_H = 2.2, V0 = Math.sqrt(2 * 9.81 * JET_H);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: '#e8622c', roughness: 0.6 })); ball.castShadow = true; scene.add(ball);
  const BALL_H = 1.5, BV = Math.sqrt(2 * 9.81 * BALL_H);

  // -------------------------------------------------------------------
  // LES PERSONNAGES (réalistes) : Camille, les passants, la statue de bronze
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer);
  function person(outfit, x, z, yaw, o = {}) {
    const P = PEOPLE.make({ outfit, shadows: true }); const pivot = new THREE.Group(); pivot.add(P.root); P.root.rotation.y = yaw; scene.add(pivot);
    return { P, pivot, x, z, yaw, base: P.body.scale.x, ...o };
  }
  const CAM = person(3, 1.0, 3.6, 0.0);
  const bag = new THREE.Group();
  box(0.34, 0.46, 0.2, M('#b8432f', { flat: false, r: 0.8 }), bag, 0, 0, 0); box(0.3, 0.12, 0.06, M('#8a2f21'), bag, 0, -0.1, -0.12);
  CAM.P.attach(bag, 'chest', { dz: -0.27, dy: -0.06 });
  const BALLER = person(1, 4.2, 1.75, -Math.PI / 2);                    // assis sur le banc de droite, il joue avec une balle
  const WALK1 = person(4, -8, -1.5, Math.PI / 2, { from: -8, speed: 1.2 });   // traverse la place de gauche à droite
  const WALK2 = person(7, -0.6, 2.0, Math.PI);                         // part vers le fond (elle trébuchera)
  const CAFE1 = person(2, 7.0, -3.9, Math.PI);                          // en terrasse
  const CAFE2 = person(5, 7.0, -8.4, 0);
  const FAR = [person(0, 2.5, -24, 0.3), person(3, -3, -30, Math.PI), person(1, 1.5, -36, Math.PI)];
  const OTHERS = [BALLER, WALK1, WALK2, CAFE1, CAFE2, ...FAR];
  // la statue : deux silhouettes bronze tournées vers le mont Blanc, l'une montre le sommet du bras
  const STAT = [PEOPLE.make({ outfit: 0, height: 1.9, shadows: true }), PEOPLE.make({ outfit: 0, height: 1.85, shadows: true })];
  STAT.forEach((S, i) => { for (const m of S.mats) { m.map = null; m.color = new THREE.Color(i ? '#5b4a33' : '#4e3f2b'); m.metalness = 0.6; m.roughness = 0.45; }
    S.root.position.set(5.0 + (i ? 0.6 : -0.6), 2.6, -19); S.root.rotation.y = Math.PI + (i ? -0.2 : 0.15); scene.add(S.root); });
  STAT[0].do({ RightArm: [['z', -1.25], ['y', -1.2], ['z', 0.5]], RightForeArm: [['x', 0.25]], Head: [['x', -0.15]] });
  STAT[1].do({ Head: [['x', -0.2]], LeftArm: [['x', -0.3]] });

  // les poses
  const KNEEL = (k, up = 0) => ({ Spine: [['x', 0.42 * k]], Spine1: [['x', 0.1 * k]], Head: [['x', -0.35 * k * (0.5 + up)]],
    LeftUpLeg: [['x', -0.25 * k]], RightUpLeg: [['x', -0.15 * k]], LeftLeg: [['x', 1.75 * k]], RightLeg: [['x', 1.8 * k]],
    LeftArm: [['x', -0.55 * k]], RightArm: [['x', -0.55 * k]], LeftForeArm: [['x', -0.5 * k]], RightForeArm: [['x', -0.5 * k]] });
  const kneelDrop = (k) => -0.42 * k;
  function camille(ts, g2, el) {
    const { P, pivot } = CAM; let x = CAM.x, z = CAM.z, yaw = 0, bulk = 0, swell = 0;
    P.bones.LeftFoot.scale.setScalar(1); P.bones.RightFoot.scale.setScalar(1);
    if (!g2) {   // la vie normale : elle arrive du fond, s'arrête face à la caméra, ajuste son sac
      const wt = ts;
      const u = clamp((wt - 2.5) / 7.5); z = lerp(-7.5, CAM.z, u); x = lerp(1.3, CAM.x, u);
      if (u < 1) P.walk(wt * 6.2, 1);
      else P.do({ LeftArm: [['x', -0.35 * sm(10.5, 11.5, wt) * (1 - sm(13, 14, wt))], ['z', 0.3 * sm(10.5, 11.5, wt) * (1 - sm(13, 14, wt))]], LeftForeArm: [['x', -1.3 * sm(10.5, 11.5, wt) * (1 - sm(13, 14, wt))]], Head: [['y', 0.25 * Math.sin(wt * 0.7)], ['x', -0.06]] });
    } else if (ts < 31.6) {   // le choc : elle tombe à genoux, mains sur les cuisses
      const k = sm(E0, E0 + 0.55, ts), up = sm(24.0, 25.0, ts);
      if (k < 1) { const s0 = Math.min(1, k * 1.6); P.do(KNEEL(s0)); P.inner.position.y = kneelDrop(Math.max(0, (k - 0.25) / 0.75)); }
      else { const br = 0.02 * Math.sin(ts * 2.2); P.do(KNEEL(1, up), { Spine: [['x', br]] }); P.inner.position.y = kneelDrop(1); }
    } else if (ts < H0) {     // elle se relève, péniblement
      const k = 1 - sm(31.8, 34.4, ts); const shake = 0.03 * Math.sin(ts * 23) * (k > 0.05 && k < 0.95);
      P.do(KNEEL(k), { Spine: [['x', 0.2 * (1 - k) + shake]], Head: [['x', 0.1 * (1 - k)]] }); P.inner.position.y = kneelDrop(k);
    } else if (ts < W1) {     // quelques heures plus tard : assise sur le banc, les chevilles gonflées
      x = -0.8; z = 2.7; P.sit(1); P.do({ LeftUpLeg: [['x', -1.4]], RightUpLeg: [['x', -1.4]], LeftLeg: [['x', 1.3]], RightLeg: [['x', 1.3]], Spine: [['x', 0.18]], LeftForeArm: [['x', -0.7]], RightForeArm: [['x', -0.7]], Head: [['x', 0.15]] });
      P.inner.position.set(0, -0.4, -0.15);
      swell = sm(H0, 37.5, ts);
    } else {                  // des semaines plus tard : elle marche de nouveau, plus massive, plus lentement
      const u = clamp((ts - W1) / 3.6); z = lerp(-4.5, 3.3, u); x = lerp(1.9, 1.0, u); yaw = -0.1;
      bulk = 1; swell = 0.4;
      if (u < 1) P.walk((ts - W1) * 4.6, 0.75); else P.do({ Spine: [['x', 0.08]] });
      P.do; // (la pose ci-dessus suffit)
      if (u < 1) { P.bones.Spine.rotateX(0.1); }
    }
    P.bones.LeftFoot.scale.setScalar(1 + 0.22 * swell); P.bones.RightFoot.scale.setScalar(1 + 0.22 * swell);
    P.body.scale.set(CAM.base * (1 + 0.09 * bulk), CAM.base, CAM.base * (1 + 0.11 * bulk));
    pivot.position.set(x, 0, z); P.root.rotation.y = yaw;
  }
  function others(ts, g2, el) {
    // le joueur de balle (assis)
    BALLER.P.sit(1); BALLER.pivot.position.set(BALLER.x, 0, BALLER.z);
    const tossing = !g2 || ts < 30.5;
    { const gg = g2 ? 19.62 : 9.81, tf = 2 * BV / gg, tb = g2 ? ts - E0 : ts, u = ((tb % tf) + tf) % tf;
      const hand = new THREE.Vector3(BALLER.x - 0.35, 1.05, BALLER.z);
      if (tossing) { ball.position.set(hand.x, hand.y + BV * u - 0.5 * gg * u * u, hand.z); const hu = u / tf;
        BALLER.P.do({ LeftUpLeg: [['x', -1.5]], RightUpLeg: [['x', -1.5]], LeftLeg: [['x', 1.5]], RightLeg: [['x', 1.5]], RightArm: [['x', -1.1 + 0.25 * Math.cos(hu * 6.283)]], RightForeArm: [['x', -0.9]], Head: [['x', -0.5 * Math.sin(Math.PI * hu)]] }); BALLER.P.inner.position.set(0, -0.42, -0.12); }
      else { ball.position.set(BALLER.x - 0.5, 0.11, BALLER.z + 0.6); BALLER.P.do({ LeftUpLeg: [['x', -1.5]], RightUpLeg: [['x', -1.5]], LeftLeg: [['x', 1.5]], RightLeg: [['x', 1.5]], Spine: [['x', 0.3]], Head: [['x', 0.3]] }); BALLER.P.inner.position.set(0, -0.42, -0.12); } }
    // le premier passant : il traverse ; au choc il plie, puis il s'assoit par terre
    { const H = WALK1; const wt = g2 ? E0 : ts; const x = H.from + H.speed * wt;
      if (!g2) { H.P.walk(wt * 6, 1); H.pivot.position.set(x, 0, H.z); }
      else { const k = sm(E0, E0 + 0.6, ts), sit = sm(20, 23, ts);
        if (ts < H0) { H.P.do(KNEEL(k * (1 - sit))); H.P.inner.position.y = kneelDrop(k * (1 - sit)) - 0.0; if (sit > 0) { H.P.do(KNEEL(1 - sit), { LeftUpLeg: [['x', -1.4 * sit]], RightUpLeg: [['x', -1.4 * sit]], LeftLeg: [['x', 0.4 * sit]], RightLeg: [['x', 0.5 * sit]], LeftArm: [['x', 0.4 * sit]], RightArm: [['x', 0.4 * sit]] }); H.P.inner.position.set(0, -0.82 * sit + kneelDrop(1 - sit) * (1 - sit), 0); } }
        else if (ts < W1) { H.P.do({ LeftUpLeg: [['x', -1.4]], RightUpLeg: [['x', -1.4]], LeftLeg: [['x', 0.4]], RightLeg: [['x', 0.5]], LeftArm: [['x', 0.4]], RightArm: [['x', 0.4]], Spine: [['x', 0.3]], Head: [['x', 0.4]] }); H.P.inner.position.set(0, -0.82, 0); }
        else { const w = (ts - W1); H.P.walk(w * 4.4, 0.7); H.P.bones.Spine.rotateX(0.12); }
        H.pivot.position.set(ts < W1 ? H.from + H.speed * E0 : lerp(4, -6, clamp((ts - W1) / 8)), 0, ts < W1 ? H.z : -9); H.P.root.rotation.y = ts < W1 ? Math.PI / 2 : -Math.PI / 2; } }
    // la deuxième passante : elle part vers le fond ; après le choc elle avance à petits pas, puis trébuche (28,3 s)
    { const H = WALK2, P = H.P;
      let z, rx = 0, y = 0;
      if (!g2) { z = H.z - 0.55 * Math.max(0, ts - 1); P.walk(ts * 4.2 + 1, 0.8); }
      else {
        const zE = H.z - 0.55 * (E0 - 1);
        if (ts < 17) { z = zE; P.do(KNEEL(sm(E0, E0 + 0.6, ts) * 0.5)); P.inner.position.y = kneelDrop(sm(E0, E0 + 0.6, ts) * 0.4); }
        else if (ts < 28.3) { z = zE - 0.15 * (ts - 17); P.walk((ts - 17) * 3.0, 0.4); P.bones.Spine.rotateX(0.25); }
        else if (ts < H0) { z = zE - 0.15 * 11.3; const f = clamp((ts - 28.3) / 0.42); rx = (Math.PI / 2 - 0.12) * f * f; y = 0.1 * f;
          P.do({ LeftArm: [['x', -1.4 * f]], RightArm: [['x', -1.4 * f]], LeftUpLeg: [['x', 0.2 * f]], Head: [['x', -0.5 * f]] }); }
        else if (ts < W1) { z = zE - 0.15 * 11.3; P.sit(1); P.inner.position.set(0, -0.8, 0); P.do({ LeftUpLeg: [['x', -1.45]], RightUpLeg: [['x', -1.45]], LeftLeg: [['x', 0.2]], RightLeg: [['x', 0.3]], Spine: [['x', 0.35]], LeftArm: [['x', -0.3]] }); P.inner.position.set(0, -0.82, 0); }
        else { z = -6 - 0.7 * (ts - W1); P.walk((ts - W1) * 4.4, 0.7); P.bones.Spine.rotateX(0.12); }
      }
      H.pivot.position.set(H.x, y, z); H.pivot.rotation.set(0, 0, rx); }
    // la terrasse : ils s'affaissent sur leur chaise
    for (const H of [CAFE1, CAFE2]) { const k = g2 ? sm(E0, E0 + 0.5, ts) : 0;
      H.P.sit(1); H.P.do({ LeftUpLeg: [['x', -1.5]], RightUpLeg: [['x', -1.5]], LeftLeg: [['x', 1.5]], RightLeg: [['x', 1.5]], Spine: [['x', 0.45 * k]], Head: [['x', 0.35 * k + 0.05 * Math.sin(ts + H.z)]], LeftForeArm: [['x', -0.6 - 0.4 * (1 - k)]], RightArm: [['x', -0.5 * (1 - k)]] });
      H.P.inner.position.set(0, -0.42, -0.12); H.pivot.position.set(H.x, 0, H.z + (H === CAFE1 ? -0.6 : 0.6)); }
    // au loin
    FAR.forEach((H, i) => { if (!g2 || ts >= W1) { const sp = g2 ? 0.55 : 1.1; const w = g2 ? ts - W1 : ts; H.P.walk(w * (g2 ? 4.4 : 6) + i, g2 ? 0.7 : 1); if (g2) H.P.bones.Spine.rotateX(0.12);
        H.pivot.position.set(H.x, 0, H.z + (H.yaw > 1 ? -1 : 1) * sp * w * 0.6); }
      else { H.P.do(KNEEL(sm(E0, E0 + 0.6, ts))); H.P.inner.position.y = kneelDrop(sm(E0, E0 + 0.6, ts)); H.pivot.position.set(H.x, 0, H.z + (H.yaw > 1 ? -1 : 1) * 1.1 * E0 * 0.6); } });
  }

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0) => () => CAM.P.point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ = makeFreeze([
    { at: 24.4, dur: 4.8, title: 'ARRÊT SUR IMAGE · 2 g · 9 S', tags: [
      { at: pt('neck'), title: 'COU', lines: ['ta tête de 5 kg', 'pèse comme 10 kg'], risk: 'mal', side: 'right', dy: -60 },
      { at: pt('nose'), title: 'VISAGE', lines: ['tes joues et tes paupières', 'tombent vers le bas'], risk: 'bof', side: 'left', dy: 0 },
      { at: pt('heart'), title: 'CŒUR', lines: ['il force pour monter', 'le sang jusqu’au cerveau'], risk: 'mal', side: 'left', dy: 300 },
      { at: pt('lKnee'), title: 'JAMBES', lines: ['le sang y pousse', 'deux fois plus fort'], risk: 'mal', side: 'right', dy: 120 } ] },
    { at: 46.0, dur: 4.8, title: 'ARRÊT SUR IMAGE · 3 SEMAINES À 2 g', tags: [
      { at: () => CAM.P.point('LeftUpLeg').add(new THREE.Vector3(0.05, -0.12, 0.08)), title: 'CUISSES', lines: ['plus épaisses :', 'un entraînement permanent'], risk: 'ok', side: 'left', dy: -40 },
      { at: () => CAM.P.point('Spine1'), title: 'DOS', lines: ['tes vertèbres portent', 'deux fois plus'], risk: 'mal', side: 'right', dy: -210 },
      { at: pt('rKnee'), title: 'GENOUX', lines: ['chaque pas les charge', 'deux fois plus'], risk: 'mal', side: 'right', dy: 60 },
      { at: pt('lFoot'), title: 'CHEVILLES', lines: ['elles gonflent', 'chaque soir'], risk: 'bof', side: 'left', dy: 90 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);
  const INSETS = insetList(FZ.realT);

  // --- le rembobinage (calque 2D)
  const rwc = document.createElement('canvas'); rwc.width = 1080; rwc.height = 1920; rwc.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(rwc); const rg = rwc.getContext('2d');
  function drawRewind(k, t) {
    rg.clearRect(0, 0, 1080, 1920); rwc.style.visibility = k > 0 && k < 1 ? 'visible' : 'hidden'; if (k <= 0 || k >= 1) return;
    const a = Math.sin(Math.PI * k), r = rng(Math.floor(t * 30) + 3);
    for (let i = 0; i < 9; i++) { const y = r() * 1920, h = 6 + r() * 40; rg.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.18 * a})`; rg.fillRect(0, y, 1080, h); }
    rg.globalAlpha = Math.min(1, a * 1.6); rg.fillStyle = '#fff'; rg.font = '800 64px Inter'; rg.fillText('◀◀ RETOUR AU RÉEL', 62, 640); rg.globalAlpha = 1;
  }

  // -------------------------------------------------------------------
  // LA CAMÉRA DE SURVEILLANCE (fixe), sur un lampadaire de la place, face au mont Blanc
  // -------------------------------------------------------------------
  const CAMP = new THREE.Vector3(1.4, 3.3, 11.2), LOOK = new THREE.Vector3(0, 7.6, -60);
  const W = 720, H = 1280, tmp = new THREE.Vector3(), sd = new THREE.Vector3();
  const fmtEl = (s) => s < 60 ? `${Math.floor(s)} s` : s < 3600 ? `${Math.floor(s / 60)} min` : s < 2 * 86400 ? `${Math.floor(s / 3600)} h ${pad(Math.floor(s / 60) % 60)}` : s < 14 * 86400 ? `${Math.floor(s / 86400)} jours` : `${Math.floor(s / 604800)} semaines`;

  function update(t) {
    const ts = FZ.sceneT(t), frozen = !!FZ.active(t);
    const rwk = ts >= RW0 && ts < RW1 ? (ts - RW0) / (RW1 - RW0) : 0;
    // le monde : pendant le rembobinage on repart à la vie normale ; après, on rejoue la vie normale (1 g)
    const g2 = ts >= E0 && ts < RW0 + 0.7;
    const tsW = ts >= RW0 + 0.7 ? ts - RW1 + 11.5 : ts;    // après le retour au réel : la vie normale reprend (Camille déjà arrivée)
    const el = elapsed(ts);
    // la lumière : le matin, puis la fin d'après-midi (les heures), puis un autre matin (les semaines)
    const pm = ts >= H0 && ts < W1 ? sm(H0, 37.0, ts) : 0;
    sd.copy(SUN_AM).lerp(SUN_PM, pm).normalize(); sky.u.uSunDir.value.copy(sd);
    sun.position.copy(sd).multiplyScalar(120).add(sun.target.position); sun.intensity = lerp(2.7, 2.1, pm); sun.color.set(pm > 0.5 ? '#ffd2a0' : '#fff3e2');
    hemi.intensity = lerp(0.95, 0.6, pm); scene.fog.color.copy(FOG_AM).lerp(FOG_PM, pm);
    // l'eau : même vitesse au départ ; la gravité double → deux fois moins haut, deux fois plus vite retombée
    { const a = jg.attributes.position.array, gg = g2 ? 19.62 : 9.81, tf = 2 * V0 / gg, base = (g2 ? ts * 1.0 : tsW) * 1.0;
      for (let i = 0; i < NJ; i++) { const [r1, r2, r3] = JR[i]; const u = ((base * (gg / 9.81) * 0.6 + r1 * tf * 3) % tf + tf) % tf; const ang = r2 * 6.283, sp = 0.05 + 0.32 * (u / tf) * r3;
        a[i * 3] = FX0 + Math.cos(ang) * sp; a[i * 3 + 1] = 1.25 + Math.max(-0.75, V0 * u - 0.5 * gg * u * u); a[i * 3 + 2] = FZ0 + Math.sin(ang) * sp; }
      jg.attributes.position.needsUpdate = true; }
    // les gens
    camille(g2 ? ts : tsW, g2, el); others(g2 ? ts : tsW, g2, el);
    // la caméra : au choc, son mât plie un peu sous le poids, puis tient
    camera.position.copy(CAMP); camera.lookAt(LOOK);
    if (g2 && ts < E0 + 2) { const u = ts - E0; camera.rotateX(-0.035 * (1 - Math.exp(-u * 9)) - 0.02 * Math.exp(-u * 3) * Math.sin(u * 30)); }
    else if (g2) camera.rotateX(-0.035);
    camera.clearViewOffset();
    const A = FZ.active(t);
    if (A) {
      camera.updateMatrixWorld(); tmp.copy(A.f.at < 30 ? CAM.P.point('chest').add(new THREE.Vector3(0, -0.05, 0)) : CAM.P.point('belly')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, A.f.at < 30 ? 2.2 : 2.1, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    stage.renderer.domElement.style.filter = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : '';
    HUD.flash(g2 && ts < E0 + 0.4 ? 0.35 * (1 - (ts - E0) / 0.4) : 0);

    // --- textes
    HUD.hook(t, 'Et si la Terre était <em>deux\u00a0fois</em> plus grosse ?', T.hookOut);
    let date = '12/07/2027', clock = 10 * 3600 + 14 * 60 + 2 + (g2 ? E0 : 0) + (el >= 0 ? el : (ts < RW0 ? ts : tsW));
    if (el >= 86400) { const d = 12 + Math.floor(el / 86400); const dd = new Date(2027, 6, d); date = `${pad(dd.getDate())}/${pad(dd.getMonth() + 1)}/2027`; clock = 9 * 3600 + 41 * 60 + (el % 600); }
    HUD.live(t, 'CHAMONIX · PLACE · CAM 01', `${date} · ${pad(Math.floor(clock / 3600) % 24)}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}${ts >= H0 && g2 ? ' · ACCÉLÉRÉ' : ''}`, 'SIMULATION');
    const kg = g2 ? Math.round(lerp(60, 120, sm(E0, E0 + 0.5, ts))) : 60;
    HUD.block(1, { label: 'POIDS RESSENTI DE CAMILLE', value: `${kg} kg`, sub: g2 ? `GRAVITÉ × 2 · ${fr(19.6, 1)} m/s²` : `GRAVITÉ NORMALE · ${fr(9.81, 2)} m/s²`, color: kg > 61 ? '#ff9f0a' : '#fff' });
    if (el >= 0) { HUD.block(2, { label: 'DEPUIS LE CHANGEMENT', value: fmtEl(el), sub: el < 3600 ? 'TEMPS RÉEL' : el < 86400 ? 'LE JOUR MÊME' : 'SON CORPS S’ADAPTE', color: '#ffd60a' }); HUD.show2(true); } else HUD.show2(false);
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    camera.updateMatrixWorld();
    HUD.reticle('you', CAM.P.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'CAMILLE', (frozen || rwk) ? 0 : sm(4.0, 4.6, ts) * (1 - sm(FZ.realT(T.endCard) - 1, FZ.realT(T.endCard), t)), 110);
    HUD.subs(t, SUBS_V);
    insets.draw(t, INSETS);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : NASA · CALCULS DE GRAVITÉ', q: 'À 120 kg ressentis,<br>tu fais quoi en premier ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.set(CAM.pivot.position.x + 1.5, 1.2, CAM.pivot.position.z + 3); camera.lookAt(CAM.pivot.position.x, 0.7, CAM.pivot.position.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), event: FZ.realT(E0), hours: FZ.realT(H0), weeks: FZ.realT(W1), rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard),
    trip: FZ.realT(28.6), rise: [FZ.realT(31.8), FZ.realT(34.4)], ball: [BV] }) };
}

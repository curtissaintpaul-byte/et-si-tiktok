// =====================================================================
//  ÉPISODE : « Et si tu avais la force d'une fourmi ? » — une place de village (église, café, fontaine)
//  Un seul personnage : Julie, 30 ans, 60 kg. Un matin, elle a la force d'une fourmi : 50 fois son poids.
//  Effet multiplication (1 sac de ciment de 25 kg → 120 sacs = 3 000 kg → 50 personnes comme elle), puis elle soulève
//  un scooter et une petite voiture. 1er arrêt sur image : la voiture au-dessus de sa tête (son corps n'a pas changé).
//  Puis on montre le corps qu'il lui faudrait vraiment (loi du carré et du cube). 2e arrêt sur image : ce corps-là.
//  Faits (sources dans la légende ; calculs refaits en Python, voir calc.py) :
//   - des fourmis peuvent porter jusqu'à 50 fois leur poids (T. Latty & C. Forster, Université de Sydney,
//     The Conversation / Phys.org, mars 2023).
//   - le cou d'une fourmi (Formica exsectoides) cède entre 3 400 et 5 000 fois son poids (Nguyen et al., Ohio State,
//     Journal of Biomechanics, 2014 ; centrifugeuse).
//   - 60 kg × 50 = 3 000 kg = 120 sacs de 25 kg = 50 personnes de 60 kg (calcul).
//   - bas du dos : NIOSH (1981) fixe la limite de compression lombaire à 3 400 N (seuil d'action) et 6 400 N
//     (≈ 650 kg, « la plupart des travailleurs ne le supportent pas »). Une voiture d'environ 1 tonne tenue à bout de bras
//     appuie au moins de tout son poids (≈ 9 800 N) sur le bas du dos.
//   - tension : en poussant très lourd (presse à cuisses à 95 % du maximum), 320/250 mmHg en moyenne, plus de 480/350
//     pour l'un des sujets (MacDougall et al., Journal of Applied Physiology, 1985).
//   - la force d'un muscle dépend de sa section (son épaisseur), le poids de son volume (Haldane, « On being the right
//     size », 1926). 50 fois plus de force → 50 fois plus de section → √50 ≈ 7 fois plus épais, et 50 fois plus lourd.
//   - muscles = 30,6 % du poids chez les femmes en moyenne (Janssen et al., J. Appl. Physiol., 2000) → 18,4 kg.
//     × 50 = 918 kg de muscles ; poids total ≈ 60 + 18,4 × 49 ≈ 960 kg (« près d'une tonne ») ; 3 000 / 960 ≈ 3,1.
//   - record du monde du soulevé de terre : 511 kg, Raúl Flores, 5 septembre 2026 (Giants Live, Birmingham).
//  Hypothèse de départ (personnage) : aujourd'hui, Julie soulève à peu près son poids.
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, add, box, cyl, HUD, sm, lerp, clamp, rng, dirAzEl, pad, fr, canvasTex } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { buildVillage } from '../../lib-village.js';
import { makePile, makeCrowd, makeEquation } from '../../lib-multiply.js';

const Q = new URLSearchParams(location.search);
// ---------------------------------------------------------------------
// les chiffres
// ---------------------------------------------------------------------
const POIDS = 60, FOIS = 50, MAXKG = POIDS * FOIS, SAC = 25, NSACS = MAXKG / SAC, NPERS = MAXKG / POIDS;   // 3 000 kg, 120 sacs, 50 personnes
const MUSCLE = POIDS * 0.306, NEWKG = Math.round(POIDS + MUSCLE * (FOIS - 1));                         // ≈ 960 kg
// ---------------------------------------------------------------------
// la partition (temps de SCÈNE)
// ---------------------------------------------------------------------
const SACK = 10.6;                    // un sac de 25 kg, levé d'une main
const PILE0 = 14.6, PILE1 = 17.6;     // le tas : 1 → 120 sacs
const CROWD0 = 18.2, CROWD1 = 20.6;   // la foule : 50 personnes
const CAMOUT0 = 14.2, CAMTOP = 21.4, CAMBACK = 23.2;
const SCOOT = 23.6;                   // le scooter
const CAR = 27.6;                     // la voiture
const FZ1 = 29.4;                     // 1er arrêt (la voiture au-dessus de sa tête)
const GROW0 = 37.4, GROW1 = 47.6;     // le corps change
const BENCH = 50.2;                   // elle s'assoit, le banc cède
const FZ2 = 52.4;                     // 2e arrêt
const RW0 = 60.4, RW1 = 61.8;
const sceneEnd = 74.0;
const T = { hookOut: 3.0, rewind: RW0, real: RW1, endCard: 70.0, duration: sceneEnd };
const SUBS = [
  [3.2, 6.6, 'Une place de village, un samedi matin. Julie, 30 ans, pèse 60 kg.'],
  [6.8, 10.4, 'Une fourmi peut porter jusqu’à 50 fois son poids. Ce matin, Julie aussi.'],
  [10.6, 14.2, 'Un sac de ciment de 25 kg ? Elle le lève d’une main, sans forcer.'],
  [14.4, 18.0, 'Pour elle, 50 fois son poids, c’est 3 000 kg. Soit 120 sacs.'],
  [18.2, 21.8, '3 000 kg, c’est aussi le poids de 50 personnes comme elle.'],
  [23.6, 27.2, 'Elle commence par un scooter. Environ 100 kg, au-dessus de sa tête.'],
  [27.4, 29.4, 'Puis une petite voiture. Environ 1 tonne.'],
  [29.6, 33.2, 'Sa force a changé, mais pas son corps. Son dos et son cœur encaissent tout.'],
  [33.4, 37.0, 'Pour avoir vraiment cette force, il lui faudrait un tout autre corps.'],
  [37.2, 40.8, 'La force d’un muscle dépend de son épaisseur. 50 fois plus forte, c’est 50 fois plus de muscle.'],
  [41.0, 44.6, 'Ses cuisses et ses bras deviendraient environ 7 fois plus épais.'],
  [44.8, 48.4, 'Ses os aussi devraient grossir. Sinon, ils casseraient.'],
  [48.6, 52.2, 'Elle pèserait près d’une tonne. Le banc ne tient pas.'],
  [52.6, 56.2, 'Et avec ce corps, 3 000 kg, ça ne ferait plus que 3 fois son poids.'],
  [56.4, 60.0, 'Une fourmi est forte parce qu’elle est minuscule. À ta taille, c’est impossible.'],
  [62.2, 65.8, 'En vrai, le record du monde du soulevé de terre est de 511 kg. Il date de septembre 2026.'],
  [66.0, 69.6, 'Et le cou d’une fourmi résiste jusqu’à 5 000 fois son poids.'],
];

// ---------------------------------------------------------------------
// les objets : le sac de ciment (générique), le scooter, la petite voiture, le banc
// ---------------------------------------------------------------------
function sackParts() {
  const top = new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(256, 180, (g) => {
    g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, 256, 180); g.fillStyle = '#7a8a9a'; g.fillRect(0, 0, 256, 34); g.fillRect(0, 146, 256, 34);
    g.fillStyle = '#2d3640'; g.font = '800 38px Inter'; g.textAlign = 'center'; g.fillText('CIMENT', 128, 96); g.font = '800 34px Inter'; g.fillText('25 kg', 128, 134); }) });
  const side = new THREE.MeshStandardMaterial({ color: '#cfc4aa', roughness: 0.95 });
  return { geo: new THREE.BoxGeometry(0.62, 0.14, 0.42), mats: [side, side, top, side, side, side] };
}
function makeScooter() {
  const g = new THREE.Group(), RED = M('#c8402f', { r: 0.35, m: 0.15, nc: true }), BLK = M('#1b1c20', { r: 0.6, nc: true }), GRY = M('#8b8f96', { r: 0.4, m: 0.5, nc: true });
  for (const z of [-0.62, 0.62]) { add(new THREE.CylinderGeometry(0.22, 0.22, 0.11, 18), BLK, g, 0, 0.22, z, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12), GRY, g, 0, 0.22, z, 0, 0, Math.PI / 2); }
  box(0.36, 0.1, 0.8, RED, g, 0, 0.36, 0.0);                       // le plancher
  box(0.38, 0.38, 0.62, RED, g, 0, 0.62, -0.38);                   // la coque arrière
  box(0.32, 0.1, 0.56, BLK, g, 0, 0.86, -0.36);                    // la selle
  box(0.34, 0.62, 0.14, RED, g, 0, 0.66, 0.5);                      // le tablier
  cyl(0.03, 0.03, 0.4, 6, GRY, g, 0, 0.98, 0.55); box(0.62, 0.05, 0.05, BLK, g, 0, 1.18, 0.55);   // le guidon
  box(0.16, 0.1, 0.06, M('#f4f1e4', { e: '#fff6d8', ei: 0.3, nc: true }), g, 0, 1.06, 0.62);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function makeCar(color = '#e3d7b5') {
  const g = new THREE.Group(), BODY = M(color, { r: 0.35, m: 0.2, nc: true }), GLASS = M('#26313d', { r: 0.1, m: 0.5, nc: true }), BLK = M('#141518', { r: 0.8, nc: true }), GRY = M('#a8adb4', { r: 0.4, m: 0.6, nc: true });
  box(1.62, 0.62, 3.55, BODY, g, 0, 0.62, 0);                        // la caisse
  box(1.48, 0.55, 1.95, BODY, g, 0, 1.2, -0.25);                     // l'habitacle
  box(1.5, 0.42, 1.7, GLASS, g, 0, 1.22, -0.25);                     // les vitres (côtés)
  box(1.36, 0.44, 0.05, GLASS, g, 0, 1.2, 0.72); box(1.36, 0.4, 0.05, GLASS, g, 0, 1.2, -1.22);
  for (const [x, z] of [[-0.74, 1.15], [0.74, 1.15], [-0.74, -1.15], [0.74, -1.15]]) { add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 18), BLK, g, x, 0.3, z, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.17, 0.17, 0.21, 12), GRY, g, x, 0.3, z, 0, 0, Math.PI / 2); }
  for (const sx of [-0.55, 0.55]) { box(0.3, 0.14, 0.04, M('#f6f2e2', { e: '#fff8e0', ei: 0.2, nc: true }), g, sx, 0.72, 1.78); box(0.28, 0.12, 0.04, M('#b8241f', { nc: true }), g, sx, 0.74, -1.78); }
  box(1.66, 0.14, 0.12, BLK, g, 0, 0.36, 1.78); box(1.66, 0.14, 0.12, BLK, g, 0, 0.36, -1.78);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function makeBench() {
  const W0 = M('#6b4a32', { nc: true }), IR = M('#2a2a2a', { nc: true }), halves = [];
  const root = new THREE.Group();
  for (const sx of [-1, 1]) {
    const h = new THREE.Group(); h.position.set(sx * 0.01, 0, 0); root.add(h);
    const inner = new THREE.Group(); inner.position.set(-sx * 0.0, 0, 0); h.add(inner);
    box(0.9, 0.07, 0.45, W0, inner, sx * 0.45, 0.46, 0); box(0.9, 0.4, 0.06, W0, inner, sx * 0.45, 0.75, -0.22); box(0.08, 0.46, 0.4, IR, inner, sx * 0.82, 0.23, 0);
    halves.push(h);
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, halves };
}

export default async function () {
  const stage = createStage({ fov: 55, far: 2200, bloom: [0.18, 0.4, 0.92], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const R = rng(5050);

  // -------------------------------------------------------------------
  // LE DÉCOR : la place du village, un samedi matin d'automne
  // -------------------------------------------------------------------
  const SUN_DIR = dirAzEl(150, 32);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.04, 0.14, 0.44], dayHor: [0.4, 0.52, 0.66] });
  sky.u.uDay.value = 1;
  const sunS = makeSun(scene, SUN_DIR, 60);
  scene.fog = new THREE.Fog(new THREE.Color('#c3d0dc'), 160, 1300);
  const V = buildVillage(scene, { R, groundColor: '#869660', fgTable: false });
  const sun = new THREE.DirectionalLight('#fff0d8', 3.2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 300 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c4dcff', '#8f7f66', 0.9); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (const L of V.lamps || []) { if (L.light) { L.light.intensity = 0; L.light.visible = false; } }

  // -------------------------------------------------------------------
  // JULIE ET LES OBJETS
  // -------------------------------------------------------------------
  const J0 = new THREE.Vector3(0.7, 0, 9.75), SEATP = new THREE.Vector3(0.64, 0, 8.86);                 // sa place, face à la caméra
  const PEOPLE = await loadPeople(renderer);
  const J = PEOPLE.make({ outfit: 3, shadows: true }); J.root.position.copy(J0); J.root.rotation.y = 0.18; scene.add(J.root);
  const SP = sackParts();
  const sack = new THREE.Mesh(SP.geo, SP.mats); sack.castShadow = true; scene.add(sack);
  const SACK0 = new THREE.Vector3(1.55, 0.07, 9.9);
  const pile = makePile(scene, { geo: SP.geo, mats: SP.mats, count: NSACS, nx: 5, nz: 6, gap: 0.01, t0: PILE0, t1: PILE1, x: -1.55, z: 10.9, drop: 0.6 });
  const scooter = makeScooter(); scene.add(scooter);
  const SCOOT0 = new THREE.Vector3(2.15, 0, 9.3);
  const car = makeCar('#9fc0d4'); scene.add(car);
  const CAR0 = new THREE.Vector3(-2.3, 0, 7.6);
  const bench = makeBench(); scene.add(bench.root); bench.root.position.set(0.62, 0, 8.7); bench.root.rotation.y = 0.18;
  const crowd = makeCrowd(scene, PEOPLE, { count: NPERS, t0: CROWD0, t1: CROWD1, spacing: 0.75, near: 22, cx: 0.4, cz: 5.6, face: [3, 18],
    fog: { color: new THREE.Color('#c3d0dc'), near: 160, far: 1300 },
    exclude: (x, z) => Math.hypot(x, z) < 3.0 || Math.hypot(x - J0.x, z - J0.z) < 0.9 || (x < -0.4 && x > -2.8 && z > 9.9 && z < 12.0) || Math.hypot(x - 0.62, z - 8.7) < 1.1 || Math.hypot(x - CAR0.x, z - CAR0.z) < 2.2 });
  const eq = makeEquation([{ label: '50 FOIS SON POIDS', value: `${fr(MAXKG)} kg` }, '÷', { label: 'UNE PERSONNE', value: `${POIDS} kg` }, '=', { label: 'PERSONNES', value: '0', color: '#ffcf6b' }]);

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0) => () => J.point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ = makeFreeze([
    { at: FZ1, dur: 4.8, title: 'ARRÊT SUR IMAGE · 1 TONNE', tags: [
      { at: pt('belly', -0.08), title: 'BAS DU DOS', lines: ['au moins 1 tonne dessus.', 'Dès 650 kg, la plupart', 'des dos se blessent'], risk: 'grave', side: 'left', dy: 40 },
      { at: pt('heart'), title: 'CŒUR', lines: ['en poussant très lourd,', 'la tension monte à 320/250'], risk: 'grave', side: 'right', dy: -40 },
      { at: pt('lArm'), title: 'BRAS', lines: ['les mêmes muscles', 'qu’hier'], risk: 'mal', side: 'left', dy: -150 } ] },
    { at: FZ2, dur: 5.0, title: 'ARRÊT SUR IMAGE · LE CORPS QU’IL FAUDRAIT', tags: [
      { at: pt('lKnee', 0.25), title: 'CUISSES ET BRAS', lines: ['environ 7 fois', 'plus épais'], risk: 'mal', side: 'right', dy: 40 },
      { at: pt('chest'), title: 'POIDS', lines: ['près d’une tonne,', 'dont 900 kg de muscles'], risk: 'grave', side: 'left', dy: -170 },
      { at: pt('rKnee', -0.1), title: 'OS', lines: ['beaucoup plus épais,', 'sinon ils cassent'], risk: 'mal', side: 'left', dy: 130 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

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
  // LA CAMÉRA DE SURVEILLANCE (fixe, accrochée à une façade) ; elle ne s'envole que pendant l'effet multiplication
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(1.7, 2.7, 14.9), LOOK = new THREE.Vector3(0.1, 1.15, 9.0);
  const CAM_HI = new THREE.Vector3(6.5, 12.5, 25.5), LOOK_HI = new THREE.Vector3(-0.2, 0.2, 6.0);
  const W = 720, H = 1280, tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const LIFTPOSE = (k) => ({ LeftArm: [['z', 2.45 * k]], RightArm: [['z', -2.45 * k]], LeftForeArm: [['x', 0.1 * k]], RightForeArm: [['x', 0.1 * k]], Head: [['x', -0.12 * k]] });
  const handsTop = () => J.point('lHand').add(J.point('rHand')).multiplyScalar(0.5);

  /** ce que Julie tient à l'instant ts : { kg, label } */
  function lifting(ts) {
    if (ts >= SACK + 0.6 && ts < PILE0 - 0.4) return SAC;
    if (ts >= SCOOT + 0.8 && ts < CAR - 0.6) return 100;
    if (ts >= CAR + 0.9 && ts < 33.0) return 1000;
    return 0;
  }

  function update(t) {
    const ts0 = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts0 >= RW0 && ts0 < RW1 ? (ts0 - RW0) / (RW1 - RW0) : 0;
    const real = ts0 >= RW0 + 0.7;
    const ts = ts0;
    // --- le corps qui change (réel : Julie d'avant)
    const grow = real ? 0 : sm(GROW0, GROW1, ts);
    J.inner.scale.set(1 + 1.75 * grow, 1 + 0.02 * grow, 1 + 1.25 * grow);
    // --- les poses
    J.root.position.copy(J0); J.root.rotation.y = 0.18;
    let held = null, heldK = 0;
    if (real) {   // Julie d'avant, avec un seul sac : elle peine
      const u = ts0 - RW1, k = sm(1.5, 3.2, u);
      J.do({ Spine: [['x', 0.5 * (1 - k) + 0.12 * k]], LeftUpLeg: [['x', -0.5 * (1 - k)]], RightUpLeg: [['x', -0.5 * (1 - k)]], LeftLeg: [['x', 0.8 * (1 - k)]], RightLeg: [['x', 0.8 * (1 - k)]],
        LeftArm: [['x', -0.7]], RightArm: [['x', -0.7]], LeftForeArm: [['x', -0.9 * k]], RightForeArm: [['x', -0.9 * k]], Head: [['x', 0.15 + 0.05 * Math.sin(u * 9)]] });
      J.inner.position.y = -0.18 * (1 - k);
      held = sack; heldK = 1;
    } else if (ts < SACK) {   // elle traverse la place, puis s'arrête
      const w = 1 - sm(4.6, 5.6, ts);
      if (w > 0.01) { J.root.position.set(J0.x - 4.0 * (1 - sm(1.0, 5.6, ts)), 0, J0.z); J.root.rotation.y = lerp(0.18, Math.PI / 2, w); J.walk(ts * 6, w); }
      else J.do({ Head: [['y', 0.35 * sm(7.5, 8.5, ts) * (1 - sm(9.6, 10.4, ts))]] });
    } else if (ts < PILE0) {   // un sac d'une main
      const k = sm(SACK + 0.2, SACK + 1.0, ts) * (1 - sm(PILE0 - 0.9, PILE0 - 0.3, ts));
      J.do({ RightArm: [['z', -2.3 * k]], RightForeArm: [['x', 0.05 * k]], Head: [['x', -0.15 * k], ['y', 0.25 * k]] });
      held = sack; heldK = k;
    } else if (ts < SCOOT) {   // elle regarde le tas, puis la foule
      J.do({ Head: [['y', -0.5 * sm(PILE0, PILE0 + 0.8, ts)], ['x', 0.1]] });
    } else if (ts < CAR) {     // le scooter
      const k = sm(SCOOT + 0.3, SCOOT + 1.2, ts) * (1 - sm(CAR - 1.2, CAR - 0.5, ts));
      J.do(LIFTPOSE(k)); held = scooter; heldK = k;
    } else if (ts < GROW0 - 1) {   // la voiture
      const k = sm(CAR + 0.3, CAR + 1.3, ts) * (1 - sm(32.4, 33.6, ts)), sh = (ts > CAR + 1.3 && ts < 32.4) ? 0.02 * Math.sin(ts * 47) : 0;
      J.do(LIFTPOSE(k), { Spine: [['z', sh]], Head: [['x', 0.1 * k]] });
      J.inner.position.y = -0.04 * k;
      held = car; heldK = k;
    } else if (ts < BENCH) {   // le corps change : elle regarde ses bras
      const look = sm(GROW0 + 2, GROW0 + 3, ts) * (1 - sm(46, 47, ts));
      J.do({ LeftArm: [['x', -1.0 * look], ['z', 0.3 * look]], LeftForeArm: [['y', -1.2 * look]], Head: [['x', 0.4 * look], ['y', 0.3 * look]] });
      if (ts > 48.6) { const w = sm(48.8, 49.8, ts); J.root.position.lerpVectors(J0, SEATP, w); J.walk(ts * 5, 0.6 * Math.sin(Math.PI * w)); }
    } else {   // assise sur le banc qui cède
      const k = sm(BENCH, BENCH + 0.6, ts), fall = sm(BENCH + 0.5, BENCH + 0.9, ts);
      J.root.position.copy(SEATP); J.root.rotation.y = 0.18; J.sit(k); J.inner.position.y = -0.42 * k - 0.3 * fall;
    }
    // l'objet tenu : à terre, ou au-dessus des mains
    sack.visible = !(ts >= PILE0 - 0.3 && !real) || false;
    sack.position.copy(SACK0); sack.rotation.set(0, 0.3, 0);
    scooter.position.copy(SCOOT0); scooter.rotation.set(0, 0.15, 0);
    car.position.copy(CAR0); car.rotation.set(0, 0.08, 0);
    const placeHeld = (obj, rest, yOff, rotY) => {
      if (heldK <= 0.001) return;
      J.root.updateMatrixWorld(true); const top = handsTop();
      obj.position.lerpVectors(rest, top.add(new THREE.Vector3(0, yOff, 0)), heldK); obj.rotation.set(0, rotY, 0);
    };
    if (held === sack) placeHeld(sack, real ? SACK0 : SACK0, real ? -0.05 : 0.08, 0.2);
    if (held === scooter) placeHeld(scooter, SCOOT0, 0.25, Math.PI / 2 + 0.18);
    if (held === car) placeHeld(car, CAR0, 0.3, Math.PI / 2 + 0.18);
    if (real) { sack.position.copy(handsTop().add(new THREE.Vector3(0, 0.0, 0.18))); sack.rotation.set(0, 0.2, 0); }
    // le tas et la foule (seulement pendant l'effet multiplication)
    const mulOn = !real && ts >= PILE0 && ts < CAMBACK + 0.2;
    pile.mesh.visible = mulOn; pile.update(mulOn ? ts : 0);
    const nP = crowd.update(mulOn ? ts : 0);
    crowd.flat.visible = mulOn; crowd.real.forEach((p) => { p.root.visible = p.root.visible && mulOn; });
    // le banc
    const brk = real ? 0 : sm(BENCH + 0.5, BENCH + 0.9, ts);
    bench.halves.forEach((h, i) => { const s = i ? 1 : -1; h.rotation.set(0, 0, -s * 0.35 * brk); h.position.set(s * 0.01, -0.12 * brk, 0); });
    // --- la caméra (fixe, sauf pendant l'effet multiplication), avec le zoom pendant les arrêts
    const fly = real ? 0 : sm(CAMOUT0, CAMTOP, ts) * (1 - sm(CAMTOP + 0.2, CAMBACK, ts));
    camera.position.lerpVectors(CAM, CAM_HI, fly); tmp2.lerpVectors(LOOK, LOOK_HI, fly); camera.lookAt(tmp2); camera.fov = 52;
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sunS.follow(camera); sky.follow(camera);
    if (A) {
      tmp.copy(J.point(A.f.at < 40 ? 'head' : 'chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, A.f.at < 40 ? 1.12 : 1.2, k);
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sun.position.copy(SUN_DIR).multiplyScalar(120).add(new THREE.Vector3(0, 0, 6)); sun.target.position.set(0, 0, 6);
    HUD.frost(0); HUD.flash(0);
    const filt = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : '';

    // --- textes
    HUD.hook(t, 'Et si tu avais la force d’une <em>fourmi</em> ?', T.hookOut);
    const cl = 9 * 3600 + 12 * 60 + (real ? 900 + (ts0 - RW1) : ts0 * (ts0 > GROW0 && ts0 < RW0 ? 1 : 1));
    HUD.live(t, 'UNE PLACE DE VILLAGE · CAM 01', `${!real && ts > GROW0 - 0.2 && ts < RW0 ? 'HYPOTHÈSE · ' : 'SAMEDI 31/10/2026 · '}${pad(Math.floor(cl / 3600))}:${pad(Math.floor(cl / 60) % 60)}:${pad(Math.floor(cl) % 60)}`, real ? 'LIVE' : 'SIMULATION');
    const pileN = pile.countAt(ts);
    if (real) {
      HUD.block(1, { label: 'RECORD DU MONDE', value: '511 kg', sub: 'SOULEVÉ DE TERRE · SEPTEMBRE 2026', color: '#ffcf6b' });
      if (ts0 > 66.0) { HUD.block(2, { label: 'LE COU D’UNE FOURMI', value: '× 5 000', sub: 'SON POIDS, AVANT DE CÉDER', color: '#ffcf6b' }); HUD.show2(true); } else HUD.show2(false);
    } else if (ts >= PILE0 - 0.2 && ts < CROWD0) {
      const n = Math.max(1, pileN);
      HUD.block(1, { label: 'SACS DE 25 KG', value: fr(n), sub: n >= NSACS ? '50 FOIS SON POIDS' : 'CE QU’ELLE PEUT PORTER', color: n >= NSACS ? '#ffcf6b' : '#fff' });
      HUD.block(2, { label: 'POIDS TOTAL', value: `${fr(n * SAC)} kg`, sub: '', color: n >= NSACS ? '#ffcf6b' : '#fff' }); HUD.show2(true);
    } else if (ts >= CROWD0 && ts < CAMBACK) {
      HUD.block(1, { label: 'PERSONNES COMME ELLE', value: fr(nP), sub: `${POIDS} KG CHACUNE`, color: '#ffcf6b' }); HUD.show2(false);
    } else if (ts >= GROW0 - 0.2) {
      const kg = Math.round(POIDS + (NEWKG - POIDS) * grow);
      HUD.block(1, { label: 'SON POIDS', value: `${fr(kg)} kg`, sub: grow > 0.99 ? 'LE CORPS QU’IL FAUDRAIT' : 'HYPOTHÈSE', color: kg > 500 ? '#ff9f0a' : '#fff' });
      HUD.block(2, { label: 'SES CUISSES', value: `× ${fr(1 + 6.07 * grow, 1)}`, sub: 'PLUS ÉPAISSES', color: grow > 0.6 ? '#ff9f0a' : '#fff' }); HUD.show2(true);
    } else {
      const kg = lifting(ts);
      HUD.block(1, { label: 'CE QU’ELLE SOULÈVE', value: `${fr(kg)} kg`, sub: kg ? `${fr(kg / POIDS, kg < POIDS ? 1 : 0)} FOIS SON POIDS` : 'SA LIMITE : 3 000 KG', color: kg >= 1000 ? '#ff3b30' : kg >= 100 ? '#ff9f0a' : '#fff' });
      HUD.block(2, { label: 'JULIE', value: `${POIDS} kg`, sub: 'SON CORPS N’A PAS CHANGÉ', color: '#fff' }); HUD.show2(ts > SACK);
    }
    eq.opacity((real ? 0 : sm(CROWD0 + 0.1, CROWD0 + 0.6, ts) * (1 - sm(CAMBACK - 1.4, CAMBACK - 0.9, ts)))); eq.set(2, fr(nP));
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', J.point('chest').add(new THREE.Vector3(0, 0.1, 0)), camera, 'JULIE', (A || rwk) ? 0 : sm(5.4, 6.0, ts0) * (1 - sm(9.8, 10.3, ts0)), 110);
    HUD.subs(t, SUBS_V);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : UNIV. DE SYDNEY · OHIO STATE · NIOSH · J. APPL. PHYSIOL. · HALDANE', q: 'Et toi, tu soulèverais<br>quoi en premier ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.set(J0.x + 0.6, 1.4, J0.z + 3.2); camera.lookAt(J0.x, 1.0, J0.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), sack: FZ.realT(SACK + 0.6), pile: [FZ.realT(PILE0), FZ.realT(PILE1)], crowd: [FZ.realT(CROWD0), FZ.realT(CROWD1)],
    scoot: FZ.realT(SCOOT + 0.8), carUp: FZ.realT(CAR + 0.9), carDown: FZ.realT(33.4), grow: [FZ.realT(GROW0), FZ.realT(GROW1)], bench: FZ.realT(BENCH + 0.5),
    rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard) }) };
}

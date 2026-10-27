// =====================================================================
//  ÉPISODE : « Et si tu conduisais une F1 comme un pilote ? » — circuit Paul-Ricard, au Castellet (Var)
//  La caméra fixe est au bout de la ligne droite, derrière les bandes bleues : la F1 arrive droit sur elle, freine,
//  tourne à gauche de l'image et passe juste devant. Un seul personnage : Camille, 31 ans, conductrice normale.
//  Deux arrêts sur image (le 1er virage, puis après le tête-à-queue du 6e tour). Pas d'effet multiplication.
//  Faits (sources dans la légende) :
//   - tête + casque ≈ 7 kg ; à 5 G dans un virage rapide, le cou retient ≈ 35 kg sur le côté (Men's Health, d'après
//     le préparateur de pilotes A. Italiano ; Aston Martin F1 : 30 à 40 kg).
//   - freinage d'une F1 : environ 5 G (≈ 1 G pour un freinage d'urgence en voiture) ; « bien plus de 100 kg » sur la
//     pédale de frein (Mercedes-AMG F1, « Formula One brake systems explained »).
//   - virages : 4 à 5 G sur le côté (Cosinuss ; Men's Health).
//   - cou non entraîné : il se fatigue vite → la tête bouge, la vue se brouille, les réflexes ralentissent ; le cou d'un
//     pilote est plus de deux fois plus fort que celui d'un adulte non entraîné, entraîné presque toute l'année
//     (Daily News / Independent Media, 07/02/2026).
//   - cockpit : 50 à 60 °C, souvent plus de 50 °C ; cœur à 150-190 battements/min, environ 170 en moyenne, souvent plus
//     de 180 au départ ; 2 à 3 litres de sueur par course (Aston Martin F1, « Why F1 drivers are just like fighter pilots »).
//   - jusqu'à 60 °C sous la combinaison ; une course dure jusqu'à 2 heures (Cosinuss, « Physical strain in the cockpit »).
//   - Paul-Ricard : 5,842 km ; dégagements « Blue Zone » bleus et noirs (asphalte + tungstène) ; Grand Prix de France
//     2022 = 53 tours (5,842 × 53 = 309,6 km ≥ 305 km, la distance minimale d'un Grand Prix).
//  Les vitesses et les G du compteur sont SIMULÉS (calcul : 317 km/h, freinage à 5 G jusqu'à 90 km/h, virage lent de
//  20 m de rayon à 90 km/h → v²/R = 3,2 G).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, add, box, cyl, HUD, sm, lerp, clamp, rng, dirAzEl, pad, keys, fr, canvasTex, terrain, noise2 } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';

const Q = new URLSearchParams(location.search);
// ---------------------------------------------------------------------
// la partition (temps de SCÈNE)
// ---------------------------------------------------------------------
const SEAT = 10.7;          // Camille est dans la F1, casque sur la tête
const GO = 13.4;            // elle part
const P1 = 15.0, P2 = 27.0, P3 = 38.0, P4 = 46.0;   // la F1 passe la ligne au loin (tours 1, 3, 5, 6)
const PR = 62.0;            // retour au réel : un vrai pilote passe
const RW0 = 61.4, RW1 = 62.8;
const sceneEnd = 75.0;
const T = { hookOut: 3.0, rewind: RW0, real: RW1, endCard: 71.0, duration: sceneEnd };
const SUBS = [
  [3.2, 6.8, 'Circuit Paul-Ricard, au Castellet. Camille, 31 ans, conduit une petite citadine tous les jours.'],
  [7.0, 10.6, 'Aujourd’hui, on lui prête une vraie F1. Plus de 300 km/h au bout de cette ligne droite.'],
  [10.8, 14.6, 'Avec le casque, sa tête pèse environ 7 kg. Pour l’instant, elle ne sent rien.'],
  [15.0, 18.6, 'Premier tour. Elle arrive à fond.'],
  [18.8, 20.6, 'Elle freine. D’un coup, 5 fois son poids la pousse vers l’avant.'],
  [21.2, 24.8, 'Son cou doit retenir plus de 30 kg. Il n’est pas fait pour ça.'],
  [25.0, 28.6, 'Et dans les virages rapides, 4 à 5 fois son poids la plaque sur le côté.'],
  [28.8, 32.4, 'Tour 3. Son cou fatigue. Sa tête penche un peu plus à chaque virage.'],
  [32.6, 36.2, 'Un cou épuisé, c’est une tête qui bouge, une vue qui se brouille, des réflexes plus lents.'],
  [36.4, 40.0, 'Dans le cockpit, il fait plus de 50\u00a0°C. Sa combinaison garde toute la chaleur.'],
  [40.2, 43.8, 'Tour 5. Elle ruisselle. Son cœur dépasse 180 battements par minute.'],
  [44.0, 47.6, 'Ses jambes tremblent. Sur la pédale de frein, il faut appuyer avec plus de 100 kg.'],
  [47.8, 51.0, 'Tour 6. Elle arrive trop vite. Sa tête ne tient plus droite.'],
  [51.2, 54.2, 'Elle freine trop tard. Tête-à-queue dans les bandes bleues.'],
  [54.4, 58.0, 'Elle n’a rien. Mais elle n’a tenu que 6 tours.'],
  [58.2, 61.2, 'Un Grand Prix ici, c’est 53 tours.'],
  [63.2, 66.8, 'En vrai, les pilotes entraînent leur cou presque toute l’année. Il est deux fois plus fort que le tien.'],
  [67.0, 70.8, 'En course, leur cœur bat autour de 170 fois par minute. Pendant près de 2 heures.'],
];

// ---------------------------------------------------------------------
// la trajectoire : ligne droite (x = 0, de z = −450 à 0) → virage à gauche de l'image (rayon 30 m, centre (−30, 0, 0))
// → ligne droite de sortie (z = 30, vers −x)
// ---------------------------------------------------------------------
const L1 = 450, R = 20, LA = Math.PI * R / 2, V0 = 88, VC = 25, DEC = 49, ACC = 10, G = 9.81;
const SB = L1 - (V0 * V0 - VC * VC) / (2 * DEC);           // le point de freinage
const U1 = SB / V0, TB = (V0 - VC) / DEC, U2 = U1 + TB, TA = LA / VC, U3 = U2 + TA;
function along(s) {   // position et cap (vecteurs) à l'abscisse s
  if (s <= L1) return { p: new THREE.Vector3(0, 0, s - L1), h: new THREE.Vector3(0, 0, 1) };
  if (s <= L1 + LA) { const th = (s - L1) / R; return { p: new THREE.Vector3(-R + R * Math.cos(th), 0, R * Math.sin(th)), h: new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)) }; }
  return { p: new THREE.Vector3(-R - (s - L1 - LA), 0, R), h: new THREE.Vector3(-1, 0, 0) };
}
/** un passage normal : u = secondes depuis la ligne au loin → { s, v, gLong, gLat } */
function lapAt(u) {
  if (u < U1) return { s: V0 * u, v: V0, gl: 0, gt: 0 };
  if (u < U2) { const a = u - U1; return { s: SB + V0 * a - 0.5 * DEC * a * a, v: V0 - DEC * a, gl: DEC / G, gt: 0 }; }
  if (u < U3) { const a = u - U2; return { s: L1 + VC * a, v: VC, gl: 0, gt: VC * VC / R / G }; }
  const a = u - U3, v = Math.min(85, VC + ACC * a); return { s: L1 + LA + VC * a + 0.5 * ACC * a * a, v, gl: -ACC / G, gt: 0 };
}
// le 6e tour : elle freine 30 m trop tard, arrive au virage à 65 m/s et part en tête-à-queue dans le dégagement
const SB6 = SB + 30, U1b = SB6 / V0, V6 = Math.sqrt(V0 * V0 - 2 * DEC * (L1 - SB6)), U2b = U1b + (V0 - V6) / DEC, SPIN = 1.7;
const SP0 = new THREE.Vector3(0, 0, 0), SP1 = new THREE.Vector3(1.0, 0, 12), SP2 = new THREE.Vector3(-3.0, 0, 22);   // la glissade (courbe de Bézier)
function spinAt(u) {
  if (u < U2b) { const n = u < U1b ? { s: V0 * u, v: V0, gl: 0 } : { s: SB6 + V0 * (u - U1b) - 0.5 * DEC * (u - U1b) ** 2, v: V0 - DEC * (u - U1b), gl: DEC / G }; const A = along(n.s); return { ...A, s: n.s, v: n.v, gl: n.gl, gt: 0, yaw: 0 }; }
  const k = clamp((u - U2b) / SPIN), e = 1 - (1 - k) * (1 - k);   // décélération constante jusqu'à l'arrêt
  const b = (a, c, d, x) => a * (1 - x) * (1 - x) + 2 * c * (1 - x) * x + d * x * x;
  const p = new THREE.Vector3(b(SP0.x, SP1.x, SP2.x, e), 0, b(SP0.z, SP1.z, SP2.z, e));
  const yaw = -Math.PI * 1.88 * (1 - (1 - k) ** 2.2);   // la voiture tourne sur elle-même (presque un tour complet)
  return { p, s: L1, h: new THREE.Vector3(0, 0, 1), v: V6 * (1 - k), gl: k < 1 ? 2.2 : 0, gt: k < 1 ? 1.8 * Math.sin(Math.PI * k) : 0, yaw };
}
// l'horloge du circuit (secondes depuis 10 h 00), selon le temps de scène : un tour ≈ 2 min 05 pour elle
const CLK = [[0, 0], [P1, P1], [24.5, 24.5], [P2, P1 + 250], [36.0, P1 + 259], [P3, P1 + 500], [45.0, P1 + 507], [P4, P1 + 625], [RW0, P1 + 640]];
const lapNo = (ts) => (ts < P1 ? 0 : ts < 24.5 ? 1 : ts < P2 - 0.6 ? 2 : ts < 36 ? 3 : ts < P3 - 0.6 ? 4 : ts < P4 - 0.3 ? 5 : 6);
// le cœur (simulation, calée sur Aston Martin F1 : 150-190 en course, souvent plus de 180)
const BPM = [[0, 82], [SEAT, 96], [GO, 128], [20, 158], [30, 168], [40, 182], [48, 188], [52.2, 196], [56, 176], [RW0, 168]];
const HEAT = [[0, 24], [SEAT, 30], [20, 41], [30, 47], [36.4, 52], [46, 55], [RW0, 55]];

// ---------------------------------------------------------------------
// la F1 (en briques : monocoque, nez, ailerons, pontons, halo, roues), l'avant vers +z
// ---------------------------------------------------------------------
function makeF1() {
  const car = new THREE.Group(), body = new THREE.Group(); car.add(body);
  const ORA = M('#ff6a1a', { r: 0.35, m: 0.2, flat: false, nc: true }), BLK = M('#18191d', { r: 0.5, nc: true }), CARB = M('#2a2c33', { r: 0.4, m: 0.3, nc: true }), WHT = M('#e9e7e2', { r: 0.4, nc: true });
  box(1.5, 0.05, 4.0, CARB, body, 0, 0.07, -0.2);                                       // le fond plat
  const mono = add(new THREE.CylinderGeometry(0.34, 0.42, 2.3, 8, 1), ORA, body, 0, 0.36, 0.55, Math.PI / 2, 0, 0); mono.scale.set(1, 1, 0.55);   // la monocoque
  const nose = add(new THREE.CylinderGeometry(0.14, 0.32, 1.5, 8, 1), ORA, body, 0, 0.3, 2.35, Math.PI / 2 + 0.06, 0, 0); nose.scale.set(1, 1, 0.6);  // le nez
  box(0.9, 0.36, 1.9, ORA, body, 0, 0.42, -1.05);                                       // le capot moteur
  for (const sx of [-1, 1]) {
    box(0.5, 0.36, 1.7, ORA, body, sx * 0.62, 0.3, -0.45);                               // les pontons
    box(0.08, 0.3, 0.36, BLK, body, sx * 0.62, 0.3, 0.42);                               // l'entrée d'air
  }
  box(0.3, 0.32, 0.5, BLK, body, 0, 0.86, -0.75);                                       // la prise d'air au-dessus de la tête
  box(0.06, 0.45, 1.6, ORA, body, 0, 0.8, -1.55);                                        // la dérive
  // l'aileron avant
  box(1.95, 0.03, 0.42, BLK, body, 0, 0.1, 3.0); box(1.9, 0.03, 0.25, ORA, body, 0, 0.17, 2.85);
  for (const sx of [-1, 1]) box(0.03, 0.22, 0.5, BLK, body, sx * 0.98, 0.16, 2.95);
  // l'aileron arrière
  box(1.05, 0.05, 0.36, BLK, body, 0, 0.95, -2.35); box(1.05, 0.04, 0.22, ORA, body, 0, 1.05, -2.4);
  for (const sx of [-1, 1]) box(0.03, 0.62, 0.62, BLK, body, sx * 0.53, 0.72, -2.35);
  box(0.12, 0.5, 0.12, BLK, body, 0, 0.62, -2.15);
  // le numéro sur le nez (inventé)
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshStandardMaterial({ map: canvasTex(128, 76, (g) => { g.fillStyle = '#ff6a1a'; g.fillRect(0, 0, 128, 76); g.fillStyle = '#fff'; g.font = '800 62px Inter'; g.textAlign = 'center'; g.fillText('31', 64, 62); }), roughness: 0.4 }));
  num.position.set(0, 0.44, 1.75); num.rotation.x = -Math.PI / 2 + 0.12; body.add(num);
  // le halo (l'arceau de titane au-dessus du cockpit)
  const halo = add(new THREE.TorusGeometry(0.38, 0.035, 6, 20, Math.PI), BLK, body, 0, 0.78, -0.15, -Math.PI / 2 + 0.12, 0, 0);
  add(new THREE.CylinderGeometry(0.03, 0.035, 0.42, 6), BLK, body, 0, 0.66, 0.36, 0.55, 0, 0);
  // les rétroviseurs
  for (const sx of [-1, 1]) box(0.14, 0.06, 0.04, BLK, body, sx * 0.52, 0.66, 0.42);
  // les roues
  const wheels = [];
  const TYRE = M('#141416', { r: 0.85, nc: true }), RIM = M('#9a9ca2', { r: 0.3, m: 0.6, nc: true }), SIDE = M('#e8d23a', { r: 0.6, nc: true });
  for (const [sx, z, w] of [[-1, 1.75, 0.36], [1, 1.75, 0.36], [-1, -1.6, 0.44], [1, -1.6, 0.44]]) {
    const wg = new THREE.Group(); wg.position.set(sx * 0.82, 0.36, z); body.add(wg);
    const tyre = add(new THREE.CylinderGeometry(0.36, 0.36, w, 22), TYRE, wg, 0, 0, 0, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.22, 0.22, w + 0.01, 14), RIM, wg, 0, 0, 0, 0, 0, Math.PI / 2);
    add(new THREE.TorusGeometry(0.3, 0.012, 4, 22), SIDE, wg, sx * (w / 2 + 0.002), 0, 0, 0, Math.PI / 2, 0);
    for (let i = 0; i < 5; i++) { const sp = box(w + 0.02, 0.03, 0.4, CARB, wg, 0, 0, 0); sp.rotation.x = i * Math.PI / 5; }
    wheels.push(wg);
    // les bras de suspension
    box(0.55, 0.025, 0.05, BLK, body, sx * 0.48, 0.38, z + 0.06); box(0.55, 0.025, 0.05, BLK, body, sx * 0.48, 0.3, z - 0.1);
  }
  car.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { car, body, wheels };
}

export default async function () {
  const stage = createStage({ fov: 58, far: 3500, bloom: [0.2, 0.4, 0.92], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ff8a2a');
  const R0 = rng(5842), N2 = noise2(31);

  // -------------------------------------------------------------------
  // LE DÉCOR : la fin de la ligne droite, le virage, les bandes bleues, la garrigue et les collines du Var
  // -------------------------------------------------------------------
  const SUN_DIR = dirAzEl(205, 38);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.03, 0.14, 0.46], dayHor: [0.42, 0.55, 0.7] });
  sky.u.uDay.value = 1;
  const sunS = makeSun(scene, SUN_DIR, 60);
  scene.fog = new THREE.Fog(new THREE.Color('#c9d5df'), 260, 2600);
  const sun = new THREE.DirectionalLight('#fff3e0', 3.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 400 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#cfe2ff', '#a0896a', 0.9); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;

  // le sol : la garrigue (terre claire, touffes vertes), qui remonte en collines au loin
  const ground = new THREE.Mesh(terrain(5000, 5000, 140, (x, z) => { const d = Math.max(0, Math.hypot(x + 100, z + 300) - 650); return Math.min(260, d * 0.12) * (0.4 + N2(x * 0.002, z * 0.002, 3)) - 0.3; },
    (x, z, y) => (y > 60 ? (N2(x * 0.01, z * 0.01) > 0.55 ? '#a8a294' : '#6d7a4e') : N2(x * 0.03, z * 0.03) > 0.5 ? '#9a9466' : '#b4a57c')), M('#ffffff', { vc: true }));
  scene.add(ground); ground.receiveShadow = true;
  // les dégagements « Blue Zone » : bandes bleues et noires en diagonale
  const blueTex = canvasTex(512, 512, (g) => { g.fillStyle = '#16181f'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#1f5fd6';
    for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128 + 64, 0); g.lineTo(i * 128 + 64 + 512, 512); g.lineTo(i * 128 + 512, 512); g.closePath(); g.fill(); } });
  blueTex.wrapS = blueTex.wrapT = THREE.RepeatWrapping; blueTex.repeat.set(14, 14);
  const runoff = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ map: blueTex, roughness: 0.85 }));
  runoff.rotation.x = -Math.PI / 2; runoff.position.set(-60, 0.02, -40); runoff.receiveShadow = true; scene.add(runoff);
  const runoff2 = new THREE.Mesh(new THREE.PlaneGeometry(80, 900), runoff.material); runoff2.rotation.x = -Math.PI / 2; runoff2.position.set(0, 0.015, -560); runoff2.receiveShadow = true; scene.add(runoff2);
  // l'asphalte
  const ASPH = new THREE.MeshStandardMaterial({ color: '#56575c', roughness: 0.9, map: canvasTex(256, 256, (g) => { g.fillStyle = '#4a4b50'; g.fillRect(0, 0, 256, 256); const r = rng(7); for (let i = 0; i < 2600; i++) { const v = 55 + r() * 40; g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(r() * 256, r() * 256, 2, 2); } }, 40) });
  const TW = 13;
  const straight = new THREE.Mesh(new THREE.PlaneGeometry(TW, 1000), ASPH); straight.rotation.x = -Math.PI / 2; straight.position.set(0, 0.04, -500); scene.add(straight);
  const arc = new THREE.Mesh(new THREE.RingGeometry(R - TW / 2, R + TW / 2, 40, 1, -Math.PI / 2, Math.PI / 2), ASPH); arc.rotation.x = -Math.PI / 2; arc.position.set(-R, 0.04, 0); scene.add(arc);
  const exitS = new THREE.Mesh(new THREE.PlaneGeometry(1000, TW), ASPH); exitS.rotation.x = -Math.PI / 2; exitS.position.set(-R - 500, 0.04, R); scene.add(exitS);
  for (const m of [straight, arc, exitS]) m.receiveShadow = true;
  // les lignes blanches de bord de piste et les vibreurs rouges et blancs
  const WL = M('#f2f2ee', { r: 0.6, nc: true }), KR = M('#d8262a', { r: 0.6, nc: true }), KW = M('#f0efe9', { r: 0.6, nc: true });
  for (const sx of [-1, 1]) { const l = box(0.25, 0.01, 1000, WL, scene, sx * (TW / 2 - 0.3), 0.05, -500); l.receiveShadow = true; }
  for (const sz of [-1, 1]) box(1000, 0.01, 0.25, WL, scene, -R - 500, 0.05, R + sz * (TW / 2 - 0.3));
  const kerbArc = (rad, from, to, n, w) => { for (let i = 0; i < n; i++) { const th = from + (to - from) * (i + 0.5) / n, len = Math.abs(to - from) * rad / n;
    const k = box(w, 0.06, len * 1.02, i % 2 ? KR : KW, scene, -R + rad * Math.cos(th), 0.05, rad * Math.sin(th)); k.rotation.y = -th; k.receiveShadow = true; } };
  kerbArc(R - TW / 2 - 0.6, 0, Math.PI / 2, 26, 1.2);   // le vibreur à la corde
  kerbArc(R + TW / 2 + 0.6, 0.02, 1.1, 30, 1.2);         // le vibreur à l'extérieur
  for (let i = 0; i < 24; i++) { const k = box(1.2, 0.06, 1.6, i % 2 ? KR : KW, scene, TW / 2 + 0.6, 0.05, -i * 1.6 - 0.8); k.receiveShadow = true; }
  // la ligne de freinage : des panneaux 300 / 200 / 100 au bord de la piste
  const BRD = (txt) => new THREE.MeshStandardMaterial({ map: canvasTex(256, 192, (g) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 256, 192); g.strokeStyle = '#111'; g.lineWidth = 10; g.strokeRect(6, 6, 244, 180); g.fillStyle = '#111'; g.font = '800 120px Inter'; g.textAlign = 'center'; g.fillText(txt, 128, 140); }), roughness: 0.6 });
  [[300, '300'], [200, '200'], [100, '100']].forEach(([d, txt]) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), BRD(txt)); b.position.set(TW / 2 + 2.2, 1.0, -d * 0.55); scene.add(b);
    cyl(0.04, 0.04, 0.6, 6, M('#666'), scene, TW / 2 + 2.2, 0.3, -d * 0.55 - 0.02); });
  // les barrières Tecpro (blocs rouges, blancs et bleus) au fond des dégagements
  const TEC = [M('#d1242b', { nc: true }), M('#f1f0ec', { nc: true }), M('#2050c8', { nc: true })];
  for (let i = 0; i < 40; i++) box(1.5, 1.0, 1.0, TEC[i % 3], scene, 24, 0.5, 30 - i * 1.6);
  for (let i = 0; i < 30; i++) box(1.0, 1.0, 1.5, TEC[i % 3], scene, -6 - i * 1.6 + 30, 0.5, 58);
  for (let i = 0; i < 60; i++) box(1.0, 1.0, 1.5, TEC[(i + 1) % 3], scene, -16 - i * 1.6, 0.5, 38);
  // le grillage de sécurité, les tribunes et le portique « CIRCUIT PAUL RICARD » au loin
  const FEN = new THREE.MeshStandardMaterial({ color: '#9aa0a6', transparent: true, opacity: 0.25, roughness: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(700, 4), FEN); fence.rotation.y = Math.PI / 2; fence.position.set(-26, 2, -360); scene.add(fence);
  const STAND = M('#c9ccd2', { nc: true }), SEATS = M('#2450b8', { nc: true }), ROOF = M('#eef0f2', { nc: true });
  for (let k = 0; k < 3; k++) { const g = new THREE.Group(); g.position.set(-46, 0, -140 - k * 95); scene.add(g);
    for (let j = 0; j < 9; j++) box(12 + j * 0, 0.9, 80, j % 2 ? SEATS : STAND, g, -j * 1.6, 0.6 + j * 1.0, 0);
    box(18, 0.4, 84, ROOF, g, -7, 13.5, 0); for (let i = 0; i < 5; i++) cyl(0.25, 0.25, 13, 6, STAND, g, -14, 6.5, -40 + i * 20); }
  const gantry = new THREE.Group(); gantry.position.set(0, 0, -330); scene.add(gantry);
  for (const sx of [-1, 1]) box(0.8, 9, 0.8, M('#2b2d33', { nc: true }), gantry, sx * 9, 4.5, 0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(19, 2.4), new THREE.MeshStandardMaterial({ map: canvasTex(1024, 128, (g) => { g.fillStyle = '#1b3fae'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#fff'; g.font = '800 78px Inter'; g.textAlign = 'center'; g.fillText('CIRCUIT PAUL RICARD', 512, 94); }), roughness: 0.6 }));
  sign.position.set(0, 8.4, 0.45); gantry.add(sign);
  // les pins et les chênes verts de la garrigue (troncs + boules de feuillage)
  const TRUNK = M('#6b4f36', { nc: true }), PINE = [M('#3f5a2c', { nc: true }), M('#4d6a33', { nc: true }), M('#36502a', { nc: true })];
  const trees = new THREE.Group(); scene.add(trees);
  for (let i = 0; i < 260; i++) {
    let x = (R0() - 0.5) * 900 - 60, z = -R0() * 1100 + 120;
    if (Math.abs(x) < 50 && z > -950) continue; if (x < 40 && x > -120 && z > -100) continue; if (z > 70) continue;
    const s = 0.7 + R0() * 0.8, gg = new THREE.Group(); gg.position.set(x, 0, z); trees.add(gg);
    cyl(0.25 * s, 0.35 * s, 6 * s, 5, TRUNK, gg, 0, 3 * s, 0);
    const c = add(new THREE.SphereGeometry(3.2 * s, 7, 5), PINE[i % 3], gg, 0, 6.5 * s, 0); c.scale.set(1.3, 0.55, 1.3);
  }
  // les spectateurs ? non : une séance privée, piste vide. Une cabine de commissaire avec un drapeau.
  const post = new THREE.Group(); post.position.set(26, 0, -24); scene.add(post);
  box(2.4, 2.6, 2.0, M('#e7e5df', { nc: true }), post, 0, 1.3, 0); box(2.8, 0.2, 2.4, M('#c8262c', { nc: true }), post, 0, 2.7, 0);
  scene.traverse((o) => { if (o.isMesh && o !== ground && o !== runoff && o !== runoff2) { o.castShadow = true; o.receiveShadow = true; } });

  // -------------------------------------------------------------------
  // LA F1 ET CAMILLE
  // -------------------------------------------------------------------
  const F = makeF1(); scene.add(F.car);
  const PEOPLE = await loadPeople(renderer);
  const C1 = PEOPLE.make({ outfit: 3, shadows: true });           // Camille debout, à côté de la F1, en jean
  scene.add(C1.root);
  const C2 = PEOPLE.make({ outfit: 1, shadows: true });           // Camille dans le cockpit, casque sur la tête
  F.body.add(C2.root); C2.root.position.set(0, 0.06, -0.62);
  const helmet = new THREE.Group();
  { const shell = add(new THREE.SphereGeometry(0.155, 18, 14), M('#f2f2f2', { r: 0.25, m: 0.1, flat: false, nc: true }), helmet, 0, 0.0, 0.0); shell.scale.set(1, 1.05, 1.12);
    const cap = add(new THREE.SphereGeometry(0.158, 18, 6, 0, Math.PI * 2, 0, 0.75), M('#ff6a1a', { r: 0.3, flat: false, nc: true }), helmet, 0, 0, 0); cap.scale.set(1, 1.05, 1.12);
    const visor = add(new THREE.SphereGeometry(0.1, 16, 10), M('#10131a', { r: 0.1, m: 0.6, flat: false, nc: true }), helmet, 0, 0.005, 0.105); visor.scale.set(1.25, 0.45, 0.6); }
  helmet.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  C2.attach(helmet, 'head', { dy: -0.02, dz: -0.035 }); helmet.scale.multiplyScalar(1.75);
  // la position de pilotage : presque allongée, les jambes à l'horizontale, les mains au volant
  const DROP = Number(Q.get('drop') || -0.62);   // on enfonce Camille dans le cockpit
  const wheelG = new THREE.Group(); F.body.add(wheelG); wheelG.position.set(0, 0.58, 0.18); wheelG.rotation.x = -0.35;
  box(0.32, 0.14, 0.04, M('#1a1b20', { nc: true }), wheelG, 0, 0, 0);
  const DRIVE = { Hips: [['x', -0.32]], LeftUpLeg: [['x', -1.15]], RightUpLeg: [['x', -1.15]], LeftLeg: [['x', 0.25]], RightLeg: [['x', 0.25]],
    LeftArm: [['z', -0.35], ['x', -0.95]], RightArm: [['z', 0.35], ['x', -0.95]], LeftForeArm: [['x', -0.75], ['y', -0.4]], RightForeArm: [['x', -0.75], ['y', 0.4]], Neck: [['x', 0.12]], Head: [['x', 0.18]] };

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0, P = C2) => () => P.point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ1 = P1 + U1 + TB * 0.85;      // à la fin du 1er freinage, au plus fort
  const FZ2 = P4 + U2b + SPIN + 1.1;    // la F1 arrêtée dans le dégagement
  const FZ = makeFreeze([
    { at: FZ1, dur: 5.0, title: 'ARRÊT SUR IMAGE · FREINAGE À 5 G', tags: [
      { at: pt('neck'), title: 'COU', lines: ['tête + casque : 7 kg.', 'À 5 G, ça fait 35 kg'], risk: 'grave', side: 'right', dy: -10 },
      { at: pt('chest'), title: 'POITRINE', lines: ['les ceintures retiennent', '5 fois ton poids'], risk: 'mal', side: 'left', dy: 90 },
      { at: pt('lKnee'), title: 'JAMBE', lines: ['plus de 100 kg', 'sur la pédale de frein'], risk: 'bof', side: 'right', dy: 200 } ] },
    { at: FZ2, dur: 5.2, title: 'ARRÊT SUR IMAGE · TOUR 6', tags: [
      { at: pt('neck'), title: 'COU', lines: ['muscles épuisés :', 'ta tête ne tient plus droite'], risk: 'grave', side: 'left', dy: -20 },
      { at: pt('eyes'), title: 'YEUX', lines: ['la tête bouge, la vue', 'se brouille, tu réagis tard'], risk: 'mal', side: 'right', dy: 10 },
      { at: pt('heart'), title: 'CŒUR', lines: ['plus de 180', 'battements par minute'], risk: 'grave', side: 'right', dy: 150 },
      { at: pt('belly'), title: 'PEAU', lines: ['jusqu’à 60 °C', 'sous la combinaison'], risk: 'mal', side: 'left', dy: 200 } ] },
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
  // la sueur : quelques gouttes sur la visière ? on reste simple : des reflets de chaleur au-dessus du capot moteur
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  F.body.add(haze); haze.position.set(0, 1.1, -1.2);
  // la fumée des pneus pendant le tête-à-queue
  const smoke = [...Array(26)].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#d8d8d8', transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); return s; });
  const smokeTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  smoke.forEach((s) => { s.material.map = smokeTex; });

  // -------------------------------------------------------------------
  // LA CAMÉRA DE SURVEILLANCE (fixe, sur un mât derrière le dégagement)
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(-5, 3.8, 46), LOOK = new THREE.Vector3(-2, -1.8, 0);
  const W = 720, H = 1280, tmp = new THREE.Vector3();
  const PARK = new THREE.Vector3(-4, 0, 28.5);   // la F1 garée dans le dégagement, le nez vers −x
  let lastState = null;

  /** l'état de la F1 à l'instant de scène ts */
  function carState(ts, real) {
    if (real) { const u = ts - PR; const L = lapAt(u); const A = along(L.s); return { ...A, ...L, yaw: 0, vis: u > 0 }; }
    if (ts < GO) return { p: PARK.clone(), h: new THREE.Vector3(-1, 0, 0), v: 0, gl: 0, gt: 0, yaw: 0, vis: true, s: -1 };
    if (ts < P1) { const a = ts - GO, x = PARK.x - 0.5 * 9 * a * a; return { p: new THREE.Vector3(x, 0, PARK.z), h: new THREE.Vector3(-1, 0, 0), v: 9 * a, gl: -0.9, gt: 0, yaw: 0, vis: x > -900, s: -1 }; }
    if (ts >= P4) { const S = spinAt(ts - P4); return { ...S, vis: true }; }
    const t0 = ts >= P3 ? P3 : ts >= P2 ? P2 : P1, u = ts - t0, L = lapAt(u);
    if (L.s > L1 + LA + 900) return { p: new THREE.Vector3(0, 0, -2000), h: new THREE.Vector3(0, 0, 1), v: 80, gl: 0, gt: 0, yaw: 0, vis: false };
    const A = along(L.s); return { ...A, ...L, yaw: 0, vis: true };
  }

  function update(t) {
    const ts0 = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts0 >= RW0 && ts0 < RW1 ? (ts0 - RW0) / (RW1 - RW0) : 0;
    const real = ts0 >= RW0 + 0.7;
    const ts = ts0;
    const fat = real ? 0 : sm(P1 + 4, P4 + 5, ts);   // la fatigue du cou (0 → 1)
    // --- la F1
    const S = carState(ts, real);
    F.car.visible = S.vis; F.car.position.copy(S.p);
    F.car.rotation.set(0, Math.atan2(S.h.x, S.h.z) + (S.yaw || 0), 0);
    const pitch = clamp((S.gl || 0) * 0.006, -0.01, 0.03), roll = (S.gt || 0) * 0.004;
    F.body.rotation.set(pitch, 0, -roll); F.body.position.y = -pitch * 0.5;
    const dist = (ts < GO) ? 0 : (S.s ?? 0);
    F.wheels.forEach((w) => { w.rotation.x = (real ? (ts - PR) : ts) * S.v / 0.36 * 0.02 + dist / 0.36; });
    // --- Camille
    const seated = real || ts >= SEAT;
    C1.root.visible = !seated; C2.root.visible = seated;
    if (!seated) {
      C1.root.position.set(PARK.x + 0.6, 0, PARK.z + 2.2); C1.root.rotation.y = -0.25 + 0.06 * Math.sin(ts * 0.6);
      const look = sm(6.6, 7.6, ts);   // elle se tourne vers la F1
      C1.do({ Head: [['y', -0.7 * look + 0.1 * Math.sin(ts * 0.8)], ['x', 0.12 * look]], RightArm: [['x', -0.25 * look]], RightForeArm: [['x', -0.6 * look]] });
    } else {
      const gl = S.gl || 0, gt = S.gt || 0, shake = S.v > 30 ? 0.012 * Math.sin(ts * 61) : 0;
      const slump = real ? 0 : sm(P4 + U2b + SPIN - 0.2, P4 + U2b + SPIN + 0.6, ts);
      const tilt = real ? gt * 0.04 : gt * (0.07 + 0.09 * fat) + 0.12 * fat * Math.sin(ts * 0.9);   // la tête part vers l'extérieur du virage
      const fwd = clamp(gl, -1, 6) * (real ? 0.02 : 0.05);                                         // et vers l'avant au freinage
      C2.do(DRIVE, { Neck: [['z', tilt * 0.5], ['x', fwd * 0.5]], Head: [['z', tilt * 0.6 + shake + 0.25 * slump], ['x', fwd * 0.6 + 0.35 * slump]],
        Spine2: [['z', (S.gt || 0) * 0.015]], LeftArm: [['x', 0.5 * slump]], RightArm: [['x', 0.5 * slump]] });
      C2.inner.position.set(0, DROP, 0.0);
    }
    // --- la fumée du tête-à-queue
    const sp0 = P4 + U2b;
    smoke.forEach((s, i) => { const born = sp0 + (i / smoke.length) * SPIN, age = ts - born; const on = !real && age > 0 && age < 3.2 && ts > sp0;
      s.visible = on; if (!on) return; const SS = spinAt(born - P4); s.position.set(SS.p.x + Math.sin(i * 7) * 0.8, 0.4 + age * 0.6, SS.p.z + Math.cos(i * 5) * 0.8);
      s.scale.setScalar(1.0 + age * 1.3); s.material.opacity = 0.3 * (1 - age / 3.2) * (A ? 0.4 : 1); });
    // --- la caméra (fixe), avec le zoom pendant les arrêts ; elle tremble un peu quand la F1 passe tout près
    const near = S.vis ? clamp(1 - S.p.distanceTo(CAM) / 60) : 0, jit = near * near * 0.06 * Math.sin(t * 93);
    camera.position.copy(CAM); camera.position.y += jit; camera.lookAt(LOOK); camera.fov = 52;
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sunS.follow(camera);
    if (A) {
      tmp.copy(C2.point('chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, A.f.at < 30 ? 5.0 : 2.3, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    sun.position.copy(SUN_DIR).multiplyScalar(150).add(new THREE.Vector3(-5, 0, 10)); sun.target.position.set(-5, 0, 10);
    HUD.frost(0); HUD.flash(0);
    const heat = real ? 0 : sm(36.4, 40, ts);
    const filt = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : heat > 0 ? `saturate(${(1 + 0.12 * heat).toFixed(3)}) sepia(${(0.12 * heat).toFixed(3)})` : '';

    // --- textes
    HUD.hook(t, 'Et si tu conduisais une <em>F1</em> comme un pilote ?', T.hookOut);
    const clock = real ? 900 + (ts0 - RW1) : keys(CLK, ts);
    const accel = !real && ((ts > 24.5 && ts < P2) || (ts > 36 && ts < P3) || (ts > 45 && ts < P4));
    const lap = real ? 0 : lapNo(ts);
    const cl = 10 * 3600 + Math.max(0, clock);
    HUD.live(t, 'LE CASTELLET · CIRCUIT PAUL-RICARD · CAM 01', `${lap ? `TOUR ${lap} · ` : '27/10/2026 · '}${pad(Math.floor(cl / 3600))}:${pad(Math.floor(cl / 60) % 60)}:${pad(Math.floor(cl) % 60)}${accel ? ' · ACCÉLÉRÉ' : ''}`, real ? 'LIVE' : 'SIMULATION');
    const kmh = Math.round(S.v * 3.6), gNow = Math.max(Math.abs(S.gl || 0), S.gt || 0);
    const kg = Math.round(7 * Math.max(1, gNow));
    if (real) {
      HUD.block(1, { label: 'LE COU D’UN PILOTE', value: '× 2', sub: 'PLUS FORT QU’UN COU NON ENTRAÎNÉ', color: '#ff8a2a' });
      if (ts0 > 67.0) { HUD.block(2, { label: 'SON CŒUR EN COURSE', value: '≈ 170 / min', sub: 'PENDANT PRÈS DE 2 HEURES', color: '#ff3b30' }); HUD.show2(true); } else HUD.show2(false);
    } else {
      const shown = ts < GO ? 0 : S.vis && (S.s ?? 0) > 120 ? kmh : ts < P1 ? kmh : 250 + Math.round(40 * Math.sin(ts * 0.9));
      HUD.block(1, { label: 'VITESSE', value: `${fr(shown)} km/h`, sub: S.vis && (S.s ?? 0) > 120 ? (gNow > 1.5 ? `${fr(gNow, 1)} G` : 'SIMULATION') : ts < GO ? 'À L’ARRÊT' : 'QUELQUE PART SUR LE CIRCUIT', color: shown > 280 ? '#ff8a2a' : '#fff' });
      if (ts < 36.4) HUD.block(2, { label: 'TA TÊTE + TON CASQUE', value: `${fr(S.vis && (S.s ?? 0) > 120 ? kg : 7)} kg`, sub: kg > 25 ? 'CE QUE TON COU RETIENT' : 'AU REPOS', color: kg > 25 ? '#ff3b30' : kg > 12 ? '#ff9f0a' : '#fff' });
      else if (ts < 40.2) HUD.block(2, { label: 'DANS LE COCKPIT', value: `${fr(Math.round(keys(HEAT, ts)))} °C`, sub: 'SIMULATION', color: '#ff9f0a' });
      else { const b = Math.round(keys(BPM, ts)); HUD.block(2, { label: 'TON CŒUR', value: `${b} / min`, sub: 'SIMULATION', color: b > 180 ? '#ff3b30' : '#ff9f0a' }); }
      HUD.show2(true);
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', C1.point('chest').add(new THREE.Vector3(0, 0.1, 0)), camera, 'CAMILLE', (A || rwk || seated) ? 0 : sm(3.6, 4.2, ts0) * (1 - sm(6.6, 7.0, ts0)), 110);
    HUD.reticle('car', F.car.position.clone().add(new THREE.Vector3(0, 0.6, 0)), camera, 'CAMILLE', !real && !A && S.vis && ts > P1 + 2 && ts < P1 + U1 ? 1 : 0, 70);
    HUD.subs(t, SUBS_V);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : ASTON MARTIN F1 · MERCEDES-AMG F1 · MEN’S HEALTH · COSINUSS · DAILY NEWS', q: 'Et toi,<br>tu tiendrais<br>combien de tours ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    lastState = S;
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); const c = F.car.position.clone(); camera.position.copy(new THREE.Vector3(Number(Q.get('cx') || 1.6), 1.3, Number(Q.get('cz') || 3.4)).applyMatrix4(F.car.matrixWorld)); camera.lookAt(c.x, 0.7, c.z); camera.updateProjectionMatrix(); }
  }
  // la trajectoire pour la bande-son : toutes les 1/20 s (temps vidéo), distance à la caméra, vitesse, côté
  function track() {
    const out = [];
    for (let t = 0; t < T.duration; t += 0.05) {
      const ts = FZ.sceneT(t), real = ts >= RW0 + 0.7, S = carState(ts, real);
      tmp.copy(S.p).sub(CAM); out.push([+t.toFixed(2), S.vis ? +tmp.length().toFixed(1) : 9999, +S.v.toFixed(1), +clamp(tmp.x / 40, -1, 1).toFixed(2), FZ.active(t) ? 1 : 0]);
    }
    return out;
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), go: FZ.realT(GO), seat: FZ.realT(SEAT), spin: FZ.realT(P4 + U2b), stop: FZ.realT(P4 + U2b + SPIN),
    passes: [P1, P2, P3, P4].map((p) => FZ.realT(p + U1)), rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard), track: track() }) };
}

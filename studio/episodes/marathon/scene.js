// =====================================================================
//  ÉPISODE : « Et si tu courais à côté du recordman du marathon ? » — Stade de France, à Saint-Denis
//  Un seul personnage : Léa, 30 ans, coureuse du dimanche (10 km en 55 min, son meilleur 400 m à fond : 1 min 20).
//  Elle essaie de suivre le rythme du record du monde du marathon, matérialisé par des lumières vertes au bord de la piste
//  (comme les « Wavelight » des tentatives de record) et par un coureur « fantôme ». Elle craque avant la fin du 1er tour.
//  Le temps accélère : le fantôme boucle les 105 tours et demi en 1 h 59 min 30 s. Retour au réel : Sabastian Sawe, Londres 2026.
//  Caméra fixe sur un mât, au bord de la piste, dans le virage : la ligne droite arrive droit sur elle.
//  Deux arrêts sur image (en pleine ligne droite, puis quand elle s'arrête). Pas d'effet multiplication.
//  Faits (sources dans la légende ; calculs refaits) :
//   - Record du monde du marathon : Sabastian Sawe (Kenya), 1 h 59 min 30 s, marathon de Londres, 26 avril 2026 ;
//     ratifié par World Athletics. Premier marathon officiel sous les 2 heures.
//   - 42,195 km en 7 170 s → 5,885 m/s = 21,2 km/h = 2 min 50 s par km ; un tour de 400 m en 68,0 s ; 105,5 tours.
//   - Les lumières de pacing (Wavelight) : une rangée de LED au bord intérieur de la piste qui s'allume au rythme visé.
//   - Fréquence cardiaque maximale estimée : 208 − 0,7 × âge (Tanaka, Monahan & Seals, JACC 2001) → 187 / min à 30 ans.
//   - Lactate dans le sang après un 400 m à fond : 18,8 mmol/L chez des sprinteurs (Indian J. Physiol. Pharmacol., 2000) ;
//     environ 1 mmol/L au repos.
//   - Léa (hypothèse, personnage) : 10 km en 55 min = 10,9 km/h → en 1 h 59 min 30 s, elle ferait 21,7 km ;
//     il lui faudrait 3 h 52 pour un marathon entier.
//  Son cœur et sa vitesse à l'écran sont SIMULÉS.
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, box, cyl, HUD, sm, lerp, clamp, rng, dirAzEl, pad, fr, canvasTex } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';

const Q = new URLSearchParams(location.search);
// ---------------------------------------------------------------------
// les chiffres
// ---------------------------------------------------------------------
const REC = 7170, MARA = 42195, VR = MARA / REC;          // 5,885 m/s
const KMH = VR * 3.6;                                      // 21,2 km/h
const LAP = 400 / VR;                                      // 68,0 s
const LEA_V = 10000 / (55 * 60);                           // 3,03 m/s (10,9 km/h)
const LEA_KM = LEA_V * REC / 1000;                         // 21,7 km
// ---------------------------------------------------------------------
// la partition (temps de SCÈNE)
// ---------------------------------------------------------------------
const GO = 12.4;                       // le départ
const T1 = 24, T2 = 36, T3 = 39;       // (secondes après le départ) elle tient le rythme / elle ralentit / elle s'arrête
const V1 = 1.5;                        // vitesse à la fin du ralentissement (elle marche presque)
const FZ1 = GO + 27, FZ2 = GO + 40.5;  // les arrêts sur image
const SIT0 = 55.6, SIT1 = 58.6;        // elle va s'asseoir sur la pelouse
const ACC0 = 59.0, ACC1 = 69.0;        // le temps accélère jusqu'à l'arrivée du fantôme
const RW0 = 73.4, RW1 = 74.8;
const sceneEnd = 87.4;
const T = { hookOut: 3.0, rewind: RW0, real: RW1, endCard: 83.4, duration: sceneEnd };
const SUBS = [
  [3.2, 6.8, 'Stade de France, un mardi soir. Léa, 30 ans, court 10 km tous les dimanches, en 55 minutes.'],
  [7.0, 10.6, 'Ce soir, elle va courir à côté du recordman du marathon. À son rythme à lui.'],
  [10.8, 14.6, 'Les lumières vertes au bord de la piste avancent à la vitesse du record : 21 km/h.'],
  [14.8, 18.4, 'Départ. Pour Léa, c’est déjà presque un sprint.'],
  [18.6, 22.2, 'Le record, c’est un tour de piste en 68 secondes. Puis encore 104 tours et demi.'],
  [22.4, 26.0, 'Son meilleur 400 m, à fond, c’est 1 min 20. Là, elle va plus vite que ça.'],
  [26.2, 29.8, 'Son cœur s’emballe. Elle respire par la bouche, de plus en plus fort.'],
  [30.0, 33.6, 'Ses cuisses commencent à brûler. Les lumières vertes prennent un mètre, puis deux.'],
  [33.8, 36.2, '125 mètres. Elle serre les dents.'],
  [36.4, 39.2, '140 mètres. Ses jambes deviennent lourdes. Elle ralentit malgré elle.'],
  [39.8, 43.4, 'Le fantôme du record s’éloigne. Elle n’a même pas fait un demi-tour.'],
  [43.6, 48.2, 'Ses foulées raccourcissent. Elle n’avance presque plus.'],
  [48.4, 52.7, 'Elle s’arrête, les mains sur les genoux. 188 mètres en 39 secondes.'],
  [53.2, 56.8, 'Le fantôme, lui, est déjà loin. Il lui reste près de 105 tours.'],
  [57.0, 60.6, 'Il continue sans jamais ralentir. Léa s’assoit sur la pelouse.'],
  [60.8, 64.4, 'Tour 50. Tour 80. Tour 100. Toujours 68 secondes par tour.'],
  [64.6, 68.8, `1 h 59 min 30 s. À son rythme du dimanche, Léa n’aurait couru que ${fr(LEA_KM, 1)} km.`],
  [69.0, 73.0, 'Il lui faudrait encore près de 2 heures pour finir.'],
  [75.2, 78.8, 'En vrai, ce record existe. Sabastian Sawe, marathon de Londres, 26 avril 2026 : 1 h 59 min 30 s.'],
  [79.0, 83.0, 'Le premier marathon officiel sous les 2 heures. 2 min 50 par kilomètre, 42 fois de suite.'],
];

// ---------------------------------------------------------------------
// la piste : 400 m à la corde (couloir 1, à 30 cm de la bordure). Lignes droites le long de z, à x = ±R ;
// virages centrés en (0, 0, ±HS). On court dans le sens inverse des aiguilles d'une montre (la corde à gauche).
// s = 0 : début de la ligne droite d'en face de la caméra (x = +R, z = +HS), on descend vers −z.
// ---------------------------------------------------------------------
const R = 36.8, HS = 42.195, ST = 2 * HS, BEND = Math.PI * R;   // 84,39 m de ligne droite, 115,61 m de virage
const LANE = 1.22, NL = 8;
function trackPt(s, d = 0) {   // d : décalage vers l'extérieur (m) depuis la ligne de course du couloir 1
  s = ((s % 400) + 400) % 400; const r = R + d;
  if (s < ST) return { p: new THREE.Vector3(r, 0, HS - s), h: Math.PI };                          // ligne droite (face caméra), vers −z
  if (s < ST + BEND) { const th = (s - ST) / R; return { p: new THREE.Vector3(r * Math.cos(th), 0, -HS - r * Math.sin(th)), h: Math.PI + th }; }
  if (s < 2 * ST + BEND) { const u = s - ST - BEND; return { p: new THREE.Vector3(-r, 0, -HS + u), h: 0 }; }
  const th = (s - 2 * ST - BEND) / R; return { p: new THREE.Vector3(-r * Math.cos(th), 0, HS + r * Math.sin(th)), h: th };
}
// (h : la direction de course en angle autour de y, pour rotation.y : le personnage regarde vers +z quand h = 0)

// Léa : distance parcourue depuis le départ (τ = secondes depuis le départ)
const E1 = VR * T1, E2 = E1 + (VR + V1) / 2 * (T2 - T1), E3 = E2 + V1 / 2 * (T3 - T2);
function leaRun(tau) {
  if (tau <= 0) return { e: 0, v: 0 };
  if (tau < T1) return { e: VR * tau, v: VR };
  if (tau < T2) { const a = tau - T1, dv = (VR - V1) / (T2 - T1); return { e: E1 + VR * a - 0.5 * dv * a * a, v: VR - dv * a }; }
  if (tau < T3) { const a = tau - T2, dv = V1 / (T3 - T2); return { e: E2 + V1 * a - 0.5 * dv * a * a, v: V1 - dv * a }; }
  return { e: E3, v: 0 };
}
const STOP_S = 76;                     // où elle s'arrête (sur la ligne droite, à ~25 m de la caméra)
const S0 = STOP_S - E3;                // la ligne de départ (dans le virage d'en face)
// le rythme cardiaque de Léa (simulation ; plafond théorique 208 − 0,7 × 30 = 187)
const BPM = [[0, 78], [GO - 3, 96], [GO, 104], [GO + 8, 150], [GO + 18, 172], [GO + 30, 183], [GO + 40, 186], [GO + 50, 168], [SIT1, 140], [ACC1, 96], [RW0, 90]];
const bpmAt = (ts) => { for (let i = 1; i < BPM.length; i++) if (ts < BPM[i][0]) { const [a, va] = BPM[i - 1], [b, vb] = BPM[i]; return va + (vb - va) * sm(a, b, ts); } return BPM[BPM.length - 1][1]; };

// le temps de course du fantôme selon le temps de scène (accéléré entre ACC0 et ACC1)
function raceTime(ts) {
  if (ts < GO) return 0;
  if (ts < ACC0) return ts - GO;
  const a = ACC0 - GO; if (ts >= ACC1) return REC + (ts - ACC1);
  const k = (ts - ACC0) / (ACC1 - ACC0), e = k * k * (3 - 2 * k);   // lent, puis très vite, puis lent à l'arrivée
  return a + (REC - a) * e;
}

export default async function () {
  const stage = createStage({ fov: 60, far: 3000, bloom: [0.25, 0.45, 0.88], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#4cd964');
  const RN = rng(4219);

  // -------------------------------------------------------------------
  // LE DÉCOR : le stade (piste violette, pelouse, tribunes, toit en anneau, projecteurs), un soir de novembre
  // -------------------------------------------------------------------
  const SUN_DIR = dirAzEl(235, 9);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.05, 0.12, 0.34], dayHor: [0.75, 0.55, 0.45] });
  sky.u.uDay.value = 1;
  const sunS = makeSun(scene, SUN_DIR, 50);
  scene.fog = new THREE.Fog(new THREE.Color('#9aa3b8'), 300, 2400);
  const sun = new THREE.DirectionalLight('#ffd9b0', 1.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 500 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; scene.add(sun, sun.target);
  const key = new THREE.DirectionalLight('#f4f6ff', 1.7); key.position.set(20, 60, -30); scene.add(key);   // les projecteurs du toit
  const hemi = new THREE.HemisphereLight('#c7d3ff', '#6d6a5e', 0.95); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;

  // une bande qui suit la forme de la piste (de d0 à d1, de hauteur y0 à y1) : piste, tribunes, toit
  function band(d0, d1, y0, y1, mat, n = 240, uvLen = 400) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const s = 400 * i / n, a = trackPt(s, d0).p, b = trackPt(s, d1).p;
      pos.push(a.x, y0, a.z, b.x, y1, b.z); uv.push(s / 400 * uvLen, 0, s / 400 * uvLen, 1);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); scene.add(m); return m;
  }
  // la pelouse (bandes de tonte)
  const grassTex = canvasTex(512, 512, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#3f7a34' : '#478a3a'; g.fillRect(0, i * 64, 512, 64); } const r = rng(3); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(20,50,20,${r() * 0.15})`; g.fillRect(r() * 512, r() * 512, 2, 2); } });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(1, 6);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 170), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 }));
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), M('#5c5f63', { nc: true })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
  // la piste violette, 8 couloirs (lignes blanches)
  const trackTex = canvasTex(64, 512, (g) => {
    g.fillStyle = '#6b4b8f'; g.fillRect(0, 0, 64, 512);
    const r = rng(9); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,20,60' : '150,120,190'},${r() * 0.25})`; g.fillRect(r() * 64, r() * 512, 2, 2); }
    g.fillStyle = '#f2f0f4'; for (let k = 0; k <= NL; k++) g.fillRect(0, Math.round((0.6 + k * LANE) / (0.6 + NL * LANE + 1.0) * 512) - 2, 64, 4);
  });
  trackTex.wrapS = THREE.RepeatWrapping;
  const track = band(-0.9, NL * LANE + 0.7, 0.02, 0.02, new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.85 }), 400, 200);
  track.receiveShadow = true;
  // la lice (bordure intérieure blanche) et les lumières de pacing juste à côté
  const kerb = band(-0.42, -0.3, 0.06, 0.06, M('#e9e9ec', { nc: true }), 300); kerb.receiveShadow = true;
  const NLED = 400, ledGeo = new THREE.BoxGeometry(0.14, 0.05, 0.55), ledMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const leds = new THREE.InstancedMesh(ledGeo, ledMat, NLED); scene.add(leds);
  const dummy = new THREE.Object3D(), ledS = [];
  for (let i = 0; i < NLED; i++) { const s = i; const P = trackPt(s, -0.36); dummy.position.set(P.p.x, 0.09, P.p.z); dummy.rotation.set(0, P.h, 0); dummy.updateMatrix(); leds.setMatrixAt(i, dummy.matrix); ledS.push(s); }
  const cOff = new THREE.Color('#9a9ca4'), cOn = new THREE.Color(0.7, 4.0, 1.1), cDim = new THREE.Color('#1f6b32'), cTmp = new THREE.Color();
  // l'anneau gris autour de la piste, la ligne d'arrivée, le muret des tribunes
  band(NL * LANE + 0.7, NL * LANE + 4, 0.015, 0.015, M('#5a5d66', { nc: true }), 200);
  const wall = band(NL * LANE + 4, NL * LANE + 4.05, 0, 2.2, M('#2c3e8f', { nc: true, side: THREE.DoubleSide }), 240);
  // les tribunes : 3 anneaux de gradins (sièges bleus et gris), avec des spectateurs clairsemés (points de couleur)
  const seatTex = canvasTex(256, 256, (g) => { g.fillStyle = '#3d4a6e'; g.fillRect(0, 0, 256, 256); const r = rng(77);
    for (let y = 0; y < 256; y += 8) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 6, 256, 2); }
    for (let i = 0; i < 260; i++) { const c = ['#e8e0d0', '#c43b3b', '#22252b', '#d9b36a', '#5b7bd6', '#f0f0f0'][Math.floor(r() * 6)]; g.fillStyle = c; g.fillRect(Math.floor(r() * 64) * 4, Math.floor(r() * 32) * 8 + 1, 3, 5); } });
  seatTex.wrapS = seatTex.wrapT = THREE.RepeatWrapping; seatTex.repeat.set(1, 3);
  const SEAT = new THREE.MeshStandardMaterial({ map: seatTex, roughness: 0.9, side: THREE.DoubleSide });
  const CONC = M('#b9bcc4', { nc: true, side: THREE.DoubleSide });
  const D0 = NL * LANE + 4.2;
  band(D0, D0 + 26, 2.2, 16, SEAT, 240, 60);                 // le bas
  band(D0 + 26, D0 + 28, 16, 17.5, CONC, 240);               // la coursive
  band(D0 + 28, D0 + 46, 17.5, 30, SEAT, 240, 50);           // le milieu
  band(D0 + 46, D0 + 48, 30, 31.5, CONC, 240);
  band(D0 + 48, D0 + 66, 31.5, 43, SEAT, 240, 50);           // le haut
  band(D0 + 66, D0 + 66.2, 43, 50, CONC, 240);               // le mur du fond
  // le toit en anneau, suspendu au-dessus des tribunes, et sa rangée de projecteurs
  const roof = band(D0 + 8, D0 + 70, 46, 47.5, new THREE.MeshStandardMaterial({ color: '#d6d9df', roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }), 240);
  const roofEdge = band(D0 + 7.6, D0 + 8, 45.5, 46.2, M('#8b8f98', { nc: true, side: THREE.DoubleSide }), 240);
  const lampMat = new THREE.MeshBasicMaterial({ color: '#fffbe8', toneMapped: false });
  for (let i = 0; i < 90; i++) { const P = trackPt(i * 400 / 90, D0 + 8.4).p; const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.4), lampMat); l.position.set(P.x, 45.2, P.z); scene.add(l); }
  for (let i = 0; i < 18; i++) { const P = trackPt(i * 400 / 18 + 5, D0 + 66).p; cyl(0.6, 0.8, 50, 8, CONC, scene, P.x, 25, P.z); }   // les poteaux du toit
  // l'écran géant au-dessus du virage d'en face
  const screenTex = canvasTex(512, 256, (g) => { g.fillStyle = '#05070c'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#4cd964'; g.font = '800 64px Inter'; g.textAlign = 'center'; g.fillText('1:59:30', 256, 120); g.fillStyle = '#fff'; g.font = '700 30px Inter'; g.fillText('RYTHME DU RECORD', 256, 190); });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); scr.position.set(0, 36, HS + R + D0 + 30); scr.rotation.y = Math.PI; scene.add(scr);
  // la ligne de départ (blanche) et quelques plots
  const startP = trackPt(S0, 4.6); const startL = box(0.08, 0.01, NL * LANE, M('#ffffff', { nc: true }), scene, startP.p.x, 0.03, startP.p.z); startL.rotation.y = startP.h + Math.PI / 2;
  scene.traverse((o) => { if (o.isMesh && o !== ground && o !== grass && o !== track && o !== leds) { o.receiveShadow = true; } });

  // -------------------------------------------------------------------
  // LÉA ET LE FANTÔME DU RECORD
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer, undefined, { extra: [[[0.12, 0.12, 0.14], [0.8, 0.6, 0.45], [0.85, 0.3, 0.25]]] });   // 8 : short noir, débardeur rouge
  const L = PEOPLE.make({ outfit: 8, shadows: true }); scene.add(L.root);
  const G = PEOPLE.make({ outfit: 1, height: 1.72, shadows: false }); scene.add(G.root);
  G.mats.forEach((m) => { m.transparent = true; m.opacity = 0.5; m.emissive = new THREE.Color('#3dff6a'); m.emissiveIntensity = 0.9; m.depthWrite = false; });
  const SITP = new THREE.Vector3(32.2, 0, -30.5);   // l'endroit où elle s'assoit, sur la pelouse

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0) => () => L.point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ = makeFreeze([
    { at: FZ1, dur: 4.8, title: 'ARRÊT SUR IMAGE · 157 MÈTRES', tags: [
      { at: pt('heart'), title: 'CŒUR', lines: ['plus de 180 / min,', 'presque son maximum'], risk: 'mal', side: 'left', dy: 40 },
      { at: pt('mouth'), title: 'SOUFFLE', lines: ['elle respire à fond', 'et manque d’air quand même'], risk: 'bof', side: 'right', dy: -60 },
      { at: pt('lKnee', 0.2), title: 'CUISSES', lines: ['elle court plus vite', 'que son 400 m à fond'], risk: 'grave', side: 'right', dy: 160 } ] },
    { at: FZ2, dur: 5.2, title: 'ARRÊT SUR IMAGE · 188 MÈTRES', tags: [
      { at: pt('heart'), title: 'CŒUR', lines: ['à 30 ans, son maximum', 'tourne autour de 187 / min'], risk: 'grave', side: 'left', dy: -20 },
      { at: pt('lKnee', 0.25), title: 'MUSCLES', lines: ['après un 400 m à fond,', 'le lactate peut monter', 'à 19 fois son niveau de repos'], risk: 'mal', side: 'right', dy: 60 },
      { at: pt('head'), title: 'LE RECORD', lines: ['lui, il tient ce rythme', 'pendant 42 km'], risk: 'info', side: 'right', dy: -260 } ] },
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
  // --- la mention « ZOOM ×… » (zoom numérique de la caméra fixe, hors arrêt sur image)
  const zc = document.createElement('canvas'); zc.width = 1080; zc.height = 1920; zc.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(zc); const zg = zc.getContext('2d');
  function drawZoom(z, a) {
    zg.clearRect(0, 0, 1080, 1920); zc.style.visibility = a > 0.01 ? 'visible' : 'hidden'; if (a <= 0.01) return;
    zg.globalAlpha = a; zg.font = '600 19px Inter'; zg.textAlign = 'right'; zg.fillStyle = 'rgba(0,0,0,.45)'; zg.fillText(`ZOOM ×${z.toFixed(1).replace('.', ',')}`, 1020, 342);
    zg.fillStyle = '#fff'; zg.fillText(`ZOOM ×${z.toFixed(1).replace('.', ',')}`, 1018, 340); zg.globalAlpha = 1;
  }

  // -------------------------------------------------------------------
  // LA CAMÉRA DE SURVEILLANCE (fixe, sur un mât au bord de la piste, dans le virage)
  // -------------------------------------------------------------------
  const num = (k, d) => Number(Q.get(k) ?? d);
  const CAM = new THREE.Vector3(num('cx', 46), num('cy', 22), num('cz', -95)), LOOK = new THREE.Vector3(num('lx', 12), num('ly', 0), num('lz', 0));
  const W = 720, H = 1280, tmp = new THREE.Vector3();
  const ZK = [[0, 1], [SIT1 + 2, 1], [SIT1 + 4.5, 0]];   // le poids du zoom numérique qui suit Léa (1 = il la suit, 0 = image entière)

  function placeRunner(P, s, v, ts, lean = 0) {
    const A = trackPt(s, 0); P.root.position.copy(A.p); P.root.rotation.y = A.h;
    if (v > 2.2) P.run(ts * (4.2 + v * 0.5), clamp(v / 5)); else if (v > 0.05) P.walk(ts * 5, clamp(v / 1.5)); else P.stand();
  }

  function update(t) {
    const ts0 = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts0 >= RW0 && ts0 < RW1 ? (ts0 - RW0) / (RW1 - RW0) : 0;
    const real = ts0 >= RW0 + 0.7;
    const ts = ts0;
    const rt = real ? (ts - RW1) * 1.0 + 40 : raceTime(ts);    // le temps de course du fantôme (au réel : un nouveau tour démarre)
    const ghostS = S0 + VR * rt;
    // --- le fantôme du record
    G.root.visible = !rwk && (real || ts >= GO - 2) && !(ts > ACC0 + 0.6 && ts < ACC1 - 0.2);
    if (G.root.visible) { if (ts < GO && !real) { const P0 = trackPt(S0 - 1.0, 0.0); G.root.position.copy(P0.p); G.root.rotation.y = P0.h; G.stand(); } else placeRunner(G, ghostS, VR, real ? ts : ts);
      G.mats.forEach((m) => { m.opacity = 0.48 * (A ? 1 : 1); }); }
    // --- les lumières de pacing : une vague verte de 10 m au niveau du fantôme
    const gpos = ((ghostS % 400) + 400) % 400, blur = ts > ACC0 && ts < ACC1 && !real ? sm(ACC0, ACC0 + 2, ts) * (1 - sm(ACC1 - 2, ACC1, ts)) : 0;
    const ledsOn = real || ts >= GO - 3;
    for (let i = 0; i < NLED; i++) {
      let dd = gpos - ledS[i]; dd = ((dd + 600) % 400) - 200;   // distance derrière le fantôme
      let k = dd > -2 && dd < 9 ? 1 - clamp((dd - 4) / 5) * (dd > 4 ? 1 : 0) : 0;
      if (!ledsOn) k = 0;
      if (blur > 0) k = Math.max(k * (1 - blur), 0.45 * blur);   // en accéléré : tout l'anneau reste allumé
      cTmp.copy(cOff).lerp(k > 0.5 ? cOn : cDim, Math.min(1, k * 1.6)); leds.setColorAt(i, cTmp);
    }
    leds.instanceColor.needsUpdate = true;
    // --- Léa
    let leaV = 0, leaE = 0, leaS = S0;
    if (real) {   // au réel : elle est assise sur la pelouse et regarde
      L.root.position.copy(SITP); L.root.rotation.y = -2.2; L.sit(1); L.inner.position.y = -0.62; L.do({ LeftUpLeg: [['x', -1.45]], RightUpLeg: [['x', -1.45]], LeftLeg: [['x', 0.4]], RightLeg: [['x', 0.4]], LeftArm: [['x', 0.5], ['z', -0.8]], RightArm: [['x', 0.5], ['z', 0.8]], Head: [['y', 0.5 * Math.sin(ts * 0.3)]] }); L.inner.position.set(0, -0.72, -0.1);
    } else if (ts < GO) {   // l'échauffement sur la ligne : quelques petits sauts, puis en position
      const P0 = trackPt(S0, 0.3); L.root.position.copy(P0.p); L.root.rotation.y = P0.h;
      const set = sm(GO - 2.2, GO - 1.4, ts);
      if (set < 0.5) { L.stand(); L.inner.position.y = Math.max(0, Math.sin(ts * 7)) * 0.06 * (ts > 4 && ts < 9 ? 1 : 0); }
      else L.do({ Spine: [['x', 0.35]], LeftUpLeg: [['x', -0.45]], RightUpLeg: [['x', 0.25]], LeftLeg: [['x', 0.5]], RightLeg: [['x', 0.25]], LeftArm: [['x', -0.6]], RightArm: [['x', 0.6]], LeftForeArm: [['x', -1.0]], RightForeArm: [['x', -1.0]] });
    } else if (ts < SIT0) {
      const r = leaRun(ts - GO); leaV = r.v; leaE = r.e; leaS = S0 + r.e;
      if (ts - GO < T3 + 0.4) placeRunner(L, leaS, r.v, ts);
      else {   // à l'arrêt, penchée, les mains sur les genoux
        const A2 = trackPt(STOP_S, 0); L.root.position.copy(A2.p); L.root.rotation.y = A2.h - 0.5;
        const k = sm(GO + T3 + 0.2, GO + T3 + 1.2, ts), br = 0.04 * Math.sin(ts * 7.5) * k;
        L.do({ Hips: [['x', 0.25 * k]], Spine: [['x', 0.5 * k + br]], Spine1: [['x', 0.35 * k]], Spine2: [['x', 0.15 * k]], Head: [['x', -0.5 * k]], LeftUpLeg: [['x', -0.35 * k]], RightUpLeg: [['x', -0.35 * k]], LeftLeg: [['x', 0.35 * k]], RightLeg: [['x', 0.35 * k]],
          LeftArm: [['x', -0.55 * k]], RightArm: [['x', -0.55 * k]], LeftForeArm: [['x', -0.15 * k]], RightForeArm: [['x', -0.15 * k]] });
        L.inner.position.y = -0.08 * k;
      }
    } else {   // elle marche jusqu'à la pelouse et s'assoit
      const A2 = trackPt(STOP_S, 0).p, w = sm(SIT0, SIT1 - 0.8, ts);
      if (w < 1) { L.root.position.lerpVectors(A2, SITP, w); L.root.rotation.y = Math.atan2(SITP.x - A2.x, SITP.z - A2.z); L.walk(ts * 4.5, 0.7); }
      else { L.root.position.copy(SITP); L.root.rotation.y = lerp(Math.atan2(SITP.x - A2.x, SITP.z - A2.z), -2.2, sm(SIT1 - 0.8, SIT1, ts)); const k = sm(SIT1 - 0.8, SIT1, ts);
        L.do({ LeftUpLeg: [['x', -1.45 * k]], RightUpLeg: [['x', -1.45 * k]], LeftLeg: [['x', 0.4 * k]], RightLeg: [['x', 0.4 * k]], LeftArm: [['x', 0.5 * k], ['z', -0.8 * k]], RightArm: [['x', 0.5 * k], ['z', 0.8 * k]], Head: [['x', -0.1 * k], ['y', 0.4 * Math.sin(ts * 0.6) * k]] });
        L.inner.position.set(0, -0.72 * k, -0.1 * k); }
    }
    // --- la caméra (fixe) ; zoom numérique sur Léa au début, et pendant les arrêts sur image
    camera.position.copy(CAM); camera.lookAt(LOOK); camera.fov = 60;
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sunS.follow(camera); sky.follow(camera);
    let zoomShown = 0, zoomZ = 1;
    if (A) {
      tmp.copy(L.point('chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u)), z = clamp(L.root.position.distanceTo(CAM) / num('zf', 10), 1, 12);
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, z, k);
    } else if (!real) {   // la caméra suit Léa avec son zoom numérique (comme une vraie caméra de surveillance)
      const w = ZK.reduce((acc, [a, za], i) => { if (i === 0) return za; const [b0, zb] = ZK[i - 1]; return ts <= b0 ? acc : lerp(zb, za, sm(b0, a, ts)); }, 1);
      const zf = 1 + (clamp(L.root.position.distanceTo(CAM) / num('zd', 18), 1, 9) - 1) * w;   // Léa garde à peu près la même taille à l'écran
      if (zf > 1.02) {
        tmp.copy(L.point('chest')).project(camera);
        zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, zf, 1); zoomZ = zf; zoomShown = 1;
      }
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sun.position.copy(SUN_DIR).multiplyScalar(200).add(new THREE.Vector3(20, 0, -20)); sun.target.position.set(20, 0, -20);
    HUD.frost(0); HUD.flash(0);
    const filt = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : '';

    // --- textes
    HUD.hook(t, 'Et si tu courais à côté du <em>recordman du marathon</em> ?', T.hookOut);
    const accel = !real && ts > ACC0 && ts < ACC1;
    const cl = 19 * 3600 + 30 * 60 + (real ? 3 * 3600 + (ts0 - RW1) : ts < GO ? ts - GO : rt);
    const hms = (x) => `${Math.floor(x / 3600)} h ${pad(Math.floor(x / 60) % 60)} min ${pad(Math.floor(x) % 60)} s`;
    HUD.live(t, 'SAINT-DENIS · STADE DE FRANCE · CAM 01', `${real ? 'MARDI 03/11/2026 · ' : 'HYPOTHÈSE · '}${pad(Math.floor(cl / 3600) % 24)}:${pad(Math.floor(cl / 60) % 60)}:${pad(Math.floor(cl) % 60)}${accel ? ' · ACCÉLÉRÉ' : ''}`, real ? 'LIVE' : 'SIMULATION');
    const bpm = Math.round(bpmAt(ts));
    if (real) {
      HUD.block(1, { label: 'RECORD DU MONDE · LONDRES 2026', value: '1 h 59 min 30 s', sub: 'SABASTIAN SAWE · 42,195 KM', color: '#4cd964' });
      HUD.block(2, { label: 'SON RYTHME', value: '2 min 50 / km', sub: `${fr(KMH, 1)} KM/H DE MOYENNE`, color: '#fff' }); HUD.show2(ts0 > 79.0);
    } else if (ts < GO) {
      HUD.block(1, { label: 'LE RYTHME DU RECORD', value: `${fr(KMH, 1)} km/h`, sub: 'UN TOUR DE PISTE EN 68 S', color: '#4cd964' });
      HUD.block(2, { label: 'LÉA, LE DIMANCHE', value: `${fr(LEA_V * 3.6, 1)} km/h`, sub: '10 KM EN 55 MIN', color: '#fff' }); HUD.show2(ts > 4.5);
    } else if (ts < ACC0 - 5.8) {
      const shown = A ? leaV : leaV;
      HUD.block(1, { label: 'VITESSE DE LÉA', value: `${fr(shown * 3.6, 1)} km/h`, sub: leaE > 0 ? `${fr(Math.round(leaE))} M PARCOURUS · SIMULATION` : 'SIMULATION', color: shown * 3.6 > 19 ? '#4cd964' : shown > 0.2 ? '#ff9f0a' : '#ff3b30' });
      HUD.block(2, { label: 'SON CŒUR', value: `${bpm} / min`, sub: bpm > 180 ? 'PRESQUE SON MAXIMUM' : 'SIMULATION', color: bpm > 180 ? '#ff3b30' : bpm > 160 ? '#ff9f0a' : '#fff' }); HUD.show2(true);
    } else {
      const laps = Math.min(105.5, VR * rt / 400);
      HUD.block(1, { label: 'TOURS DU RECORD', value: `${fr(Math.floor(laps * 10) / 10, 1)} / 105,5`, sub: `CHRONO ${hms(Math.min(rt, REC))}`, color: '#4cd964' });
      const leaKm = Math.min(LEA_KM, LEA_V * rt / 1000);
      HUD.block(2, { label: 'LÉA, À SON RYTHME DU DIMANCHE', value: `${fr(leaKm, 1)} km`, sub: 'SUR 42,195', color: '#fff' }); HUD.show2(ts > 64.6);
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', L.point('chest').add(new THREE.Vector3(0, 0.1, 0)), camera, 'LÉA', (A || rwk) ? 0 : sm(3.6, 4.2, ts0) * (1 - sm(SIT1 + 3, SIT1 + 3.6, ts0)), 110);
    HUD.reticle('ghost', G.point('chest').add(new THREE.Vector3(0, 0.1, 0)), camera, 'RYTHME DU RECORD', (A || rwk || !G.root.visible) ? 0 : sm(GO + 6.5, GO + 7.2, ts0) * (1 - sm(GO + 14, GO + 14.6, ts0)), 90);
    HUD.subs(t, SUBS_V);
    drawRewind(rwk, t);
    drawZoom(zoomZ, zoomShown * (A ? 0 : 1));
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : WORLD ATHLETICS · TANAKA ET AL., JACC (2001) · INDIAN J. PHYSIOL. PHARMACOL. (2000)', q: 'Et toi, tu tiendrais<br>combien de mètres ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'top') { camera.clearViewOffset(); camera.position.set(0, 260, 0.1); camera.lookAt(0, 0, 0); camera.fov = 60; camera.updateProjectionMatrix(); }
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); const p = L.root.position; camera.position.set(p.x + 2.5, 1.4, p.z + 2.5); camera.lookAt(p.x, 0.9, p.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), go: FZ.realT(GO), slow: FZ.realT(GO + T1), stop: FZ.realT(GO + T3), sit: FZ.realT(SIT0), acc: [FZ.realT(ACC0), FZ.realT(ACC1)],
    rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard), lapLen: LAP }) };
}

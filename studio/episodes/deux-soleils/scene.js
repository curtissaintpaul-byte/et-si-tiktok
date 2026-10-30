// =====================================================================
//  ÉPISODE : « Et si la Terre avait deux soleils ? » — un village de Provence (Vaucluse), la place de l'église, en terrasse
//  Un seul personnage suivi : Emma. Deux arrêts sur image (midi le 1er jour, puis le jour 5). Pas d'effet multiplication.
//  Hypothèse de départ (on le dit à la fin) : un 2e Soleil, aussi fort que le nôtre, s'allume dans le ciel. On oublie sa gravité.
//  Faits (sources dans la légende ; calculs refaits en Python) :
//   - au sol, par beau temps, en plein soleil : environ 1 000 W par m² (valeur de référence des panneaux solaires) ; 2 soleils → ~2 000.
//   - indice UV : en juin, 8/9 dans le sud de la France ; l'échelle va de 1 à 11+ (ministère de la Santé, sante.fr).
//     2 soleils → environ 16 (l'indice est proportionnel à l'énergie UV reçue : UVI = 40 × éclairement érythémal en W/m², OMS 2002).
//   - coup de soleil, peau claire (phototype II, dose minimale ~250 J/m² érythémaux) : UVI 8 → 250 / (8 × 0,025) = 1 250 s ≈ 21 min ;
//     UVI 16 → ≈ 10 min (calcul). Les UV peuvent abîmer la cornée (« dommage aigu de la cornée », sante.fr).
//   - à la chaleur, le débit du cœur passe par exemple de 6 à 10 L/min pour envoyer le sang vers la peau
//     (Crandall & González-Alonso, Acta Physiologica 2010).
//   - record de France : 46,0 °C à Vérargues (Hérault), le 28 juin 2019 (Météo-France).
//   - coup de chaleur : température du corps au-dessus de 40 °C, avec malaise, confusion, perte de connaissance (Bouchama & Knochel, NEJM 2002).
//   - quand l'air dépasse ~37 °C, il ne refroidit plus la peau : seule la sueur qui s'évapore peut encore évacuer la chaleur (physique).
//   - emballement de l'effet de serre (les océans finissent par s'évaporer) au-delà d'environ 375 W/m² d'ensoleillement moyen,
//     contre ~340 aujourd'hui, soit ~+10 % (Leconte et al., Nature 2013). Deux soleils = +100 %.
//   - Kepler-16b : première planète découverte en orbite autour de deux étoiles, annoncée en 2011 (mission Kepler, NASA).
//   - environ 46 % des étoiles comme le Soleil ont au moins une étoile compagne (Raghavan et al., ApJS 2010).
//   - les températures de l'air (compteur) : simulation, valeurs approchées (chaque jour, le réchauffement de l'après-midi double).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, box, cyl, HUD, sm, lerp, clamp, rng, dirAzEl, pad, keys, fr, dotTex } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { buildVillage } from '../../lib-village.js';
import { makeInsets } from '../../lib-insets.js';
import { insetList } from './insets.js';

const Q = new URLSearchParams(location.search);
// la partition (temps de SCÈNE)
const SUN2 = 10.8;          // 9 h 12 : le 2e Soleil s'allume
const NOON = 22.8;          // midi
const STAND1 = 24.0;        // Emma se lève
const PARA = 27.2;          // elle ouvre le parasol
const H16 = 31.0;           // 16 h
const SET1 = 35.0, SET2 = 37.6;   // les deux couchers de soleil
const NIGHT3 = 38.8;        // jour 3, 2 h du matin
const DAY5 = 42.6;          // jour 5, l'après-midi
const WEEK2 = 46.6;         // semaine 2
const OCEAN = 50.4;         // les océans
const RW0 = 54.4, RW1 = 55.8;   // retour au réel
const sceneEnd = 71.8;
const T = { hookOut: 3.0, sun2: SUN2, rewind: RW0, real: RW1, endCard: 67.8, duration: sceneEnd };
const SUBS = [
  [3.2, 6.8, '9 h, un matin de juillet en Provence. Emma prend son café en terrasse.'],
  [7.0, 10.6, 'Par beau temps, en plein soleil, chaque mètre carré reçoit environ 1 000 watts.'],
  [10.9, 14.5, '9 h 12. Un deuxième Soleil s’allume dans le ciel. Aussi fort que le nôtre.'],
  [14.7, 18.3, 'Sur la place, chaque chose a maintenant deux ombres.'],
  [18.5, 22.4, 'Au sol, ça fait environ 2 000 watts par mètre carré. Comme deux radiateurs.'],
  [22.9, 26.5, 'Midi. L’indice UV, déjà vers 8 ou 9 l’été ici, monte vers 16. L’échelle s’arrête à 11+.'],
  [27.2, 30.8, 'Emma ouvre le parasol. Mais même à l’ombre, l’air chauffe.'],
  [31.0, 34.6, '16 h. Plus de 45 °C à l’ombre. Le record de France, c’est 46 °C.'],
  [35.0, 38.6, '21 h. Deux couchers de soleil, l’un après l’autre.'],
  [38.9, 42.4, 'Jour 3, 2 h du matin. Il fait encore plus de 30 °C. Impossible de dormir.'],
  [42.7, 46.4, 'Jour 5. L’après-midi, l’air dépasse 50 °C. Emma a la tête qui tourne.'],
  [46.7, 50.2, 'Semaine 2. Les feuilles grillent, la fontaine est à sec.'],
  [50.4, 54.2, 'Avec deux fois plus d’énergie, les océans finiraient par s’évaporer.'],
  [56.0, 59.4, 'En vrai, un deuxième Soleil ne peut pas s’allumer d’un coup.'],
  [59.6, 63.2, 'Mais Kepler-16b, découverte en 2011, tourne bien autour de deux soleils.'],
  [63.4, 67.2, 'Et près de la moitié des étoiles comme le Soleil ont une étoile compagne.'],
];
// l'horloge affichée (secondes depuis le jour 1 à minuit), selon le temps de scène
const H = 3600, DAY = 86400;
const CLK = [[3.0, 9 * H], [SUN2, 9 * H + 720], [NOON, 12 * H], [H16, 16 * H], [SET1, 21 * H], [SET2, 21 * H + 1800], [NIGHT3 - 0.2, 21 * H + 2400],
  [NIGHT3, 2 * DAY + 2 * H], [42.2, 2 * DAY + 2 * H + 1200], [DAY5, 4 * DAY + 15 * H], [WEEK2 - 0.2, 4 * DAY + 15 * H + 1500], [WEEK2, 8 * DAY + 14 * H], [RW0, 8 * DAY + 15 * H]];
const clockAt = (ts) => (ts < 3.0 ? 9 * H - (3.0 - ts) * 20 : keys(CLK, ts));
// l'heure « du ciel » (continue : pendant les sauts, le ciel tourne vite au lieu de clignoter)
const SKYH = [[0, 8.98], [3.0, 9.0], [SUN2, 9.2], [NOON, 12], [H16, 16], [SET1, 21], [SET2, 21.55], [NIGHT3, 26], [42.0, 28.5], [DAY5, 39], [WEEK2, 39.4], [RW0, 39.6]];
// la température à l'ombre (simulation, valeurs approchées)
const TEMP = [[0, 24], [SUN2, 25], [NOON, 37], [H16, 46], [SET1, 39], [SET2, 37], [NIGHT3, 32], [42.2, 31], [DAY5, 51], [WEEK2, 52], [RW0, 53]];
// la température du corps d'Emma (simulation)
const CORE = [[42.6, 38.2], [46.2, 40.3], [WEEK2, 40.3]];

// la course des soleils : azimut et hauteur (en degrés) pour une heure h (le 2e Soleil suit le 1er avec 30 min de retard, 5° à droite)
function sunPath(h) {
  const hh = ((h % 24) + 24) % 24;
  return { az: 5 + 5 * (hh - 9) / 12, el: 30 * Math.sin(Math.PI * (hh - 5.5) / 15.5) };
}

export default async function () {
  const insets = makeInsets();
  const stage = createStage({ fov: 64, far: 3000, bloom: [0.3, 0.42, 0.9], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffb340');
  const R = rng(1611);

  // -------------------------------------------------------------------
  // LE DÉCOR : la place du village, un matin de juillet ; les soleils sont devant la caméra
  // -------------------------------------------------------------------
  const sky = makeSky(scene, { sunDir: dirAzEl(-15, 20), dayZen: [0.05, 0.16, 0.46], dayHor: [0.42, 0.53, 0.64], stars: 0, milky: 0.7, milkyAxis: new THREE.Vector3(0.7, 0.4, 0.4) });
  const sun1S = makeSun(scene, dirAzEl(-15, 20), 70), sun2S = makeSun(scene, dirAzEl(-10, 18), 70);
  const FOG_DAY = new THREE.Color('#c9d3d8'), FOG_HOT = new THREE.Color('#e6d2a8'), FOG_NIGHT = new THREE.Color('#0b0b10'), FOG_SET = new THREE.Color('#e3a272');
  scene.fog = new THREE.Fog(FOG_DAY.clone(), 160, 1300);
  const V = buildVillage(scene, { R, groundColor: '#9a9a5e', fgTable: false });
  const mkSun = () => { const s = new THREE.DirectionalLight('#fff0d8', 3.2); s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
    Object.assign(s.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 300 }); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.04; scene.add(s, s.target); return s; };
  const sun1 = mkSun(), sun2 = mkSun();
  sun1.target.position.set(0, 0, 8); sun2.target.position.set(0, 0, 8);
  const hemi = new THREE.HemisphereLight('#c4dcff', '#8f7f66', 0.85); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // le feuillage (tout ce qui est vert) : il grillera en semaine 2
  const GREENS = [], DRY = new THREE.Color('#9b7a45');
  scene.traverse((o) => { if (o.isMesh && o.material && o.material.color && !GREENS.some((g) => g.m === o.material)) { const c = o.material.color; if (c.g > c.r * 1.08 && c.g > c.b * 1.08) GREENS.push({ m: o.material, c0: c.clone() }); } });

  // la table d'Emma au premier plan (face à la caméra), et le parasol replié
  const TAB = new THREE.Vector3(1.55, 0, 12.4);
  const tableG = new THREE.Group(); tableG.position.copy(TAB); scene.add(tableG);
  cyl(0.42, 0.42, 0.04, 14, M('#d8d4cc', { r: 0.4, nc: true }), tableG, 0, 0.75, 0); cyl(0.04, 0.04, 0.72, 6, M('#2a2a2a', { nc: true }), tableG, 0, 0.38, 0); cyl(0.24, 0.24, 0.03, 10, M('#2a2a2a', { nc: true }), tableG, 0, 0.02, 0);
  cyl(0.06, 0.05, 0.02, 14, M('#f6f4ef', { r: 0.3, nc: true }), tableG, -0.1, 0.775, 0.1);                 // la soucoupe
  cyl(0.04, 0.035, 0.07, 12, M('#f6f4ef', { r: 0.3, nc: true }), tableG, -0.1, 0.82, 0.1);                 // la tasse de café
  cyl(0.035, 0.03, 0.12, 10, M('#d9e7ee', { r: 0.1, nc: true }), tableG, 0.18, 0.83, 0.05);                 // le verre d'eau
  const chair = new THREE.Group(); chair.position.set(TAB.x - 0.75, 0, TAB.z - 0.05); chair.rotation.y = 0.35; scene.add(chair);
  { const rat = M('#b08a5a', { nc: true }); box(0.42, 0.05, 0.42, rat, chair, 0, 0.45, 0); box(0.42, 0.48, 0.05, rat, chair, 0, 0.7, -0.2);
    for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.04, 0.45, 0.04, M('#2a2a2a', { nc: true }), chair, a, 0.22, b); }
  // le parasol : un mât, et une toile qui s'ouvre (cône)
  const para = new THREE.Group(); para.position.set(TAB.x - 0.25, 0, TAB.z - 0.35); scene.add(para);
  cyl(0.025, 0.025, 2.35, 8, M('#e8e2d6', { nc: true }), para, 0, 1.18, 0);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.42, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#f1ead8', roughness: 0.9, side: THREE.DoubleSide }));
  canopy.position.y = 2.3; para.add(canopy);
  for (const o of [chair, tableG, para]) o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // -------------------------------------------------------------------
  // EMMA
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer);
  const SEAT = new THREE.Vector3(TAB.x - 0.75, 0, TAB.z + 0.02);
  const P = PEOPLE.make({ outfit: 3, shadows: true });
  P.root.position.copy(SEAT); P.root.rotation.y = 0.35; scene.add(P.root);

  const scale = (spec, k) => { const o = {}; for (const n in spec) o[n] = spec[n].map(([a, v]) => [a, v * k]); return o; };
  const SIT = { LeftUpLeg: [['x', -1.5]], RightUpLeg: [['x', -1.5]], LeftLeg: [['x', 1.5]], RightLeg: [['x', 1.5]], LeftForeArm: [['x', -0.6]], RightForeArm: [['x', -0.6]],
    LeftArm: [['x', -0.55]], RightArm: [['x', -0.55]] };
  const VISOR = (k) => ({ RightArm: [['x', -1.15 * k], ['z', 0.25 * k]], RightForeArm: [['x', -2.1 * k], ['y', 0.55 * k]], Head: [['x', -0.32 * k]] });   // la main en visière
  const FAN = (k, ph) => ({ RightArm: [['x', -0.9 * k], ['z', -0.2 * k]], RightForeArm: [['x', -1.6 * k], ['y', (0.3 + 0.35 * Math.sin(ph)) * k]], Head: [['x', -0.15 * k]] });   // elle s'évente
  const DIZZY = (k) => ({ LeftArm: [['x', -1.3 * k], ['z', 0.35 * k]], LeftForeArm: [['x', -1.85 * k], ['y', -0.6 * k]], Head: [['x', 0.18 * k]], Spine: [['x', 0.12 * k]] });   // la main sur le front
  function poseEmma(ts, real) {
    const sitAt = (k, extra = {}) => { P.do(scale(SIT, k), extra); P.inner.position.set(0, -0.42 * k, -0.12 * k); };
    if (real) { sitAt(1, { Head: [['y', 0.12 * Math.sin(ts * 0.7)]] }); return; }
    if (ts < STAND1) {   // assise ; elle lève la tête vers le ciel quand le 2e Soleil s'allume
      const up = sm(SUN2 + 0.2, SUN2 + 1.0, ts) * (1 - sm(17.6, 18.6, ts));
      sitAt(1, { Head: [['x', -0.45 * up], ['y', 0.12 * Math.sin(ts * 0.7) * (1 - up)]] }); return;
    }
    if (ts < PARA + 0.6) {   // debout, la main en visière
      const k = 1 - sm(STAND1, STAND1 + 1.1, ts) * (1 - sm(PARA, PARA + 0.6, ts));
      const v = sm(STAND1 + 1.0, STAND1 + 1.6, ts) * (1 - sm(PARA - 0.3, PARA + 0.2, ts));
      P.do(scale(SIT, k), VISOR(v)); P.inner.position.set(0, -0.42 * k, -0.12 * k); return;
    }
    if (ts < NIGHT3 - 0.2) {   // assise à l'ombre ; elle regarde les couchers de soleil
      const up = sm(SET1 - 0.4, SET1 + 0.4, ts);
      sitAt(1, { Head: [['x', -0.2 * up], ['y', 0.1 * Math.sin(ts * 0.6)]] }); return;
    }
    if (ts < 42.2) { sitAt(1, FAN(sm(NIGHT3, NIGHT3 + 0.6, ts), ts * 9)); return; }   // la nuit : elle s'évente
    if (ts < WEEK2 - 0.2) {   // jour 5 : debout, elle vacille, la main sur le front
      const k = 1 - sm(42.2, 42.6, ts);
      const sway = 0.06 * Math.sin(ts * 1.9) * sm(DAY5, DAY5 + 1, ts);
      P.do(scale(SIT, k), DIZZY(sm(43.2, 44.0, ts)), { Spine: [['z', sway]], Hips: [['z', sway * 0.5]] }); P.inner.position.set(0, -0.42 * k, -0.12 * k); return;
    }
    sitAt(1, { Spine: [['x', 0.28]], Head: [['x', 0.35]], LeftArm: [['x', 0.4]], RightArm: [['x', 0.4]] });   // affalée
  }

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0) => () => P.point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ = makeFreeze([
    { at: 26.6, dur: 5.0, title: 'ARRÊT SUR IMAGE · MIDI, UV 16', tags: [
      { at: pt('rArm'), title: 'PEAU', lines: ['peau claire : coup de soleil', 'en ~10 min au lieu de ~20'], risk: 'mal', side: 'left', dy: -40 },
      { at: pt('eyes'), title: 'YEUX', lines: ['2 fois plus d’UV : la cornée', 'peut brûler, comme à la neige'], risk: 'mal', side: 'right', dy: -230 },
      { at: pt('heart'), title: 'CŒUR', lines: ['pour refroidir ta peau, il passe', 'de ~6 à ~10 L de sang/min'], risk: 'bof', side: 'right', dy: 150 } ] },
    { at: 46.2, dur: 5.0, title: 'ARRÊT SUR IMAGE · JOUR 5, 51 °C', tags: [
      { at: pt('head', 0.06), title: 'CERVEAU', lines: ['plus de 40 °C dans ton corps :', 'coup de chaleur, tu peux t’évanouir'], risk: 'grave', side: 'right', dy: -230 },
      { at: pt('chest'), title: 'PEAU', lines: ['l’air est plus chaud que toi :', 'seule la sueur te refroidit encore'], risk: 'mal', side: 'left', dy: -20 },
      { at: pt('heart'), title: 'CŒUR', lines: ['il s’emballe pour envoyer', 'le sang vers ta peau'], risk: 'mal', side: 'right', dy: 170 } ] },
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
  // LA CAMÉRA DE SURVEILLANCE (fixe, accrochée à une façade)
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(1.6, 2.3, 19.0), LOOK = new THREE.Vector3(-0.6, 7.4, -22);
  const W = 720, Hh = 1280, tmp = new THREE.Vector3(), c0 = new THREE.Color();
  const WATERC = new THREE.Color('#5f93a8'), DRYC = new THREE.Color('#8f8068');
  const fmtT = (v, d = 0) => `${v < 0 ? '−' : ''}${d ? Math.abs(v).toFixed(d).replace('.', ',') : fr(Math.abs(Math.round(v)))} °C`;

  function update(t) {
    const ts0 = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts0 >= RW0 && ts0 < RW1 ? (ts0 - RW0) / (RW1 - RW0) : 0;
    const real = ts0 >= RW0 + 0.7;                              // après le rembobinage : un matin ordinaire, un seul Soleil
    const ts = real ? 4.0 + (ts0 - RW1) * 0.3 : ts0;
    const clock = real ? 9 * H + 300 + (ts0 - RW1) : clockAt(ts);
    const skyH = real ? 9.05 + (ts0 - RW1) / 3600 : keys(SKYH, ts);
    // --- les deux soleils
    const s1 = sunPath(skyH), s2 = sunPath(skyH - 0.55); s2.az += 5.5;
    const on2 = real ? 0 : sm(SUN2, SUN2 + 1.2, ts);            // le 2e Soleil s'allume
    const flash2 = real ? 0 : sm(SUN2, SUN2 + 0.25, ts) * (1 - sm(SUN2 + 0.25, SUN2 + 1.4, ts));
    const d1 = dirAzEl(s1.az, Math.max(s1.el, -6)), d2 = dirAzEl(s2.az, Math.max(s2.el, -6));
    // les lumières : un peu plus écartées que les disques à l'écran, pour que les deux ombres se séparent bien
    const L1 = dirAzEl(s1.az - 12, Math.max(s1.el, -6)), L2 = dirAzEl(s2.az + 14, Math.max(s2.el - 4, -6));
    const vis1 = sm(-1.5, 1.0, s1.el), vis2 = sm(-1.5, 1.0, s2.el) * on2;
    const day = Math.max(sm(-6, 4, s1.el), sm(-6, 4, s2.el) * on2);
    const low = Math.max(vis1 * (1 - sm(4, 14, s1.el)), vis2 * (1 - sm(4, 14, s2.el))) * (real ? 0 : 1);   // la lumière dorée du soir
    sun1S.userData.dir.copy(d1); sun2S.userData.dir.copy(d2);
    sun1S.visible = vis1 > 0.01; sun1S.material.opacity = vis1; sun2S.visible = vis2 > 0.01; sun2S.material.opacity = vis2;
    sun1.position.copy(L1).multiplyScalar(120).add(sun1.target.position); sun2.position.copy(L2).multiplyScalar(120).add(sun2.target.position);
    const warm = new THREE.Color('#fff0d8').lerp(new THREE.Color('#ff9a52'), low);
    sun1.color.copy(warm); sun2.color.copy(warm);
    sun1.intensity = 3.2 * vis1 * (1 - 0.4 * low); sun2.intensity = 3.2 * vis2 * (1 - 0.4 * low);
    sun1.visible = sun1.intensity > 0.01; sun2.visible = sun2.intensity > 0.01;
    // --- le ciel, la chaleur, la sécheresse
    const hot = real ? 0 : Math.max(sm(SUN2, NOON + 4, ts) * 0.6, sm(DAY5 - 0.4, OCEAN, ts));   // le ciel blanchit
    const dry = real ? 0 : sm(WEEK2 - 0.3, WEEK2 + 2.5, ts);
    sky.u.uSunDir.value.copy(on2 > 0.5 && s1.el < 0 ? d2 : d1); sky.u.uDay.value = day; sky.u.uSunGlow.value = day * (1 + 0.8 * on2);
    sky.u.uDayZen.value.setRGB(lerp(0.05, 0.32, hot), lerp(0.16, 0.36, hot), lerp(0.46, 0.44, hot));
    sky.u.uDayHor.value.setRGB(lerp(0.42, 0.78, hot), lerp(0.53, 0.70, hot), lerp(0.64, 0.56, hot));
    sky.u.uTint.value.setRGB(1, 0.42, 0.15); sky.u.uTintAmt.value = 0.9 * low; sky.u.uTintDir.value.copy(d1).lerp(d2, 0.5).normalize();
    sky.u.uStars.value = 2.0 * (1 - day); sky.u.uStarThr.value = 0.95;
    hemi.intensity = lerp(0.12, 0.42, day); hemi.color.set(day > 0.5 ? '#c4dcff' : '#6d7aa0'); hemi.groundColor.set(day > 0.5 ? '#8f7f66' : '#2c2a2c');
    scene.environmentIntensity = lerp(0.04, 0.18, day);
    c0.copy(FOG_DAY).lerp(FOG_HOT, hot).lerp(FOG_SET, low * 0.8); c0.lerp(FOG_NIGHT, 1 - day); scene.fog.color.copy(c0);
    scene.fog.near = lerp(160, 50, hot * 0.8); scene.fog.far = lerp(1300, 600, hot * 0.8);
    const lampsOn = real ? 0 : sm(0.6, 0.1, day);
    V.lamps.forEach((L) => { L.glass.emissiveIntensity = 2.4 * lampsOn; L.light.intensity = 3.4 * lampsOn; L.light.visible = L.light.intensity > 0; });
    V.winLit.forEach((m) => { m.emissiveIntensity = 1.2 * lampsOn; });
    V.waterMat.color.copy(WATERC).lerp(DRYC, dry); V.waterMat.emissiveIntensity = 0.4 * (1 - dry); V.waterMat.roughness = lerp(0.15, 0.95, dry);
    for (const g of GREENS) g.m.color.copy(g.c0).lerp(DRY, 0.75 * dry);
    renderer.toneMappingExposure = lerp(1.45, 1.0, day) * (1 - 0.12 * on2 * day);
    // --- Emma et le parasol
    poseEmma(ts, real);
    const op = real ? 0 : sm(PARA, PARA + 0.7, ts);
    canopy.scale.set(lerp(0.12, 1, op), lerp(2.6, 1, op), lerp(0.12, 1, op)); canopy.position.y = lerp(1.9, 2.3, op);
    // --- la caméra (fixe), avec le zoom pendant les arrêts
    camera.position.copy(CAM); camera.lookAt(LOOK); camera.fov = 64;
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    for (const s of [sun1S, sun2S]) s.follow(camera);
    if (A) {
      tmp.copy(P.point('chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * Hh, 2.3, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    HUD.flash(0.55 * flash2);
    const shimmer = hot > 0.2 && !A ? `blur(${(0.35 * hot * (0.6 + 0.4 * Math.sin(t * 13))).toFixed(2)}px) ` : '';
    const filt = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : hot > 0 ? `${shimmer}sepia(${(0.28 * hot).toFixed(3)}) saturate(${(1 + 0.15 * hot).toFixed(3)})` : '';

    // --- textes
    HUD.hook(t, 'Et si la Terre avait <em>deux soleils</em> ?', T.hookOut);
    const dd = Math.floor(clock / DAY), cl = clock % DAY;
    const accel = !real && ts > 3.0;
    HUD.live(t, 'VAUCLUSE · PLACE DU VILLAGE · CAM 01', `${!real && dd >= 1 ? `JOUR ${dd + 1} · ` : '15/07 · '}${pad(Math.floor(cl / 3600))}:${pad(Math.floor(cl / 60) % 60)}:${pad(Math.floor(cl) % 60)}${accel ? ' · ACCÉLÉRÉ' : ''}`, 'SIMULATION');
    const temp = real ? 24 : keys(TEMP, ts);
    if (real) {
      HUD.block(1, { label: 'KEPLER-16b', value: '2 soleils', sub: 'DÉCOUVERTE EN 2011 (NASA)', color: '#ffb340', scale: 0.8 });
      if (ts0 > 63.4) { HUD.block(2, { label: 'ÉTOILES COMME LE SOLEIL', value: '≈ 46 %', sub: 'ONT UNE COMPAGNE (RAGHAVAN ET AL. 2010)', color: '#64d2ff' }); HUD.show2(true); } else HUD.show2(false);
    } else {
      HUD.block(1, { label: 'TEMPÉRATURE · À L’OMBRE', value: fmtT(temp), sub: 'SIMULATION · VALEURS APPROCHÉES', color: temp < 30 ? '#ffd60a' : temp < 40 ? '#ff9f0a' : '#ff3b30' });
      if (ts < SUN2) HUD.block(2, { label: 'SOLEIL REÇU AU SOL', value: '≈ 1 000 W/m²', sub: 'EN PLEIN SOLEIL, PAR BEAU TEMPS', color: '#ffd60a' });
      else if (ts < NOON) HUD.block(2, { label: 'SOLEIL REÇU AU SOL', value: `≈ ${fr(Math.round(1000 + 1000 * on2))} W/m²`, sub: 'DEUX RADIATEURS PAR MÈTRE CARRÉ', color: '#ff9f0a' });
      else if (ts < H16) { const uv = Math.round(lerp(8, 16, sm(NOON + 0.3, NOON + 2.6, ts))); HUD.block(2, { label: 'INDICE UV', value: `${uv}`, sub: uv > 11 ? 'AU-DELÀ DE L’ÉCHELLE (11+)' : 'DÉJÀ « TRÈS ÉLEVÉ » L’ÉTÉ', color: uv > 11 ? '#ff3b30' : '#ff9f0a' }); }
      else if (ts < SET1) HUD.block(2, { label: 'RECORD DE FRANCE', value: '46,0 °C', sub: 'HÉRAULT, 28 JUIN 2019 (MÉTÉO-FRANCE)', color: '#ff9f0a' });
      else if (ts < NIGHT3) HUD.block(2, { label: 'COUCHERS DE SOLEIL', value: ts < SET2 - 0.6 ? '1' : '2', sub: 'L’UN APRÈS L’AUTRE', color: '#ff9f0a' });
      else if (ts < DAY5) HUD.block(2, { label: 'LA NUIT, À 2 H', value: 'plus de 30 °C', sub: 'SIMULATION', color: '#ff9f0a', scale: 0.8 });
      else if (ts < WEEK2) { const c = keys(CORE, ts); HUD.block(2, { label: 'LE CORPS D’EMMA', value: fmtT(c, 1), sub: c >= 40 ? 'AU-DESSUS DE 40 °C : COUP DE CHALEUR' : 'NORMAL : ENVIRON 37 °C', color: c >= 40 ? '#ff3b30' : '#ff9f0a' }); }
      else HUD.block(2, { label: 'LES OCÉANS S’ÉVAPORENT À PARTIR DE', value: '+10 % de soleil', sub: 'ICI : +100 % (LECONTE ET AL., NATURE 2013)', color: '#ff3b30', scale: 0.72 });
      HUD.show2(true);
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', P.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'EMMA', (A || rwk) ? 0 : sm(3.6, 4.2, ts0) * (1 - sm(6.6, 7.0, ts0)), 100);
    HUD.reticle('sun2', sun2S.position.clone(), camera, 'LE 2e SOLEIL', real || A ? 0 : sm(SUN2 + 1.0, SUN2 + 1.4, ts) * (1 - sm(14.2, 14.6, ts)), 110);
    HUD.subs(t, SUBS_V);
    insets.draw(t, INSETS);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : NASA · MÉTÉO-FRANCE · SANTE.FR · NATURE 2013 · NEJM 2002 · ACTA PHYSIOL. 2010 · APJS 2010', q: 'Tu tiendrais<br>combien de jours<br>avec deux soleils ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.set(SEAT.x + 0.8, 1.3, SEAT.z + 2.6); camera.lookAt(SEAT.x, 0.8, SEAT.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), sun2: FZ.realT(SUN2), noon: FZ.realT(NOON), para: FZ.realT(PARA), h16: FZ.realT(H16),
    set1: FZ.realT(SET1), set2: FZ.realT(SET2), night3: FZ.realT(NIGHT3), day5: FZ.realT(DAY5), week2: FZ.realT(WEEK2), ocean: FZ.realT(OCEAN),
    clocks: [NOON, H16, SET1, NIGHT3, DAY5, WEEK2].map(FZ.realT), rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard) }) };
}

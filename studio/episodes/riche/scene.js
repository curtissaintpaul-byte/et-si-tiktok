// =====================================================================
//  ÉPISODE : « Et si tu étais l'homme le plus riche du monde ? » — une place de village (église, café, fontaine)
//  Un seul personnage : Inès, 27 ans, payée au SMIC. Un lundi matin, elle se retrouve avec la fortune de l'homme le plus
//  riche du monde. Effet multiplication : 1 liasse de 10 000 € → ce que la fortune rapporte en UN jour au taux du Livret A
//  (3 625 liasses) → 2 043 personnes payées au SMIC un an. Puis ce qui change dans SA vie et pour son corps : 2 gardes du
//  corps (arrêt sur image : espérance de vie, moral, sécurité), la fortune en actions qui fond de 34 milliards en un jour,
//  les gens qui demandent de l'argent, et la question : est-elle plus heureuse ? Retour au réel : Elon Musk, Bill Gates 2016.
//  Faits (sources dans la légende ; calculs refaits en Python) :
//   - Forbes Real-Time Billionaires, 1er novembre 2026 : Elon Musk, 868,5 milliards de dollars (n° 1).
//   - 1 € = 1,1160 $ le 30 octobre 2026 → 778,2 milliards d'euros.
//   - Livret A : 1,7 % depuis le 1er août 2026 → 13,23 milliards par an, 36,25 M€ par jour (3 625 liasses), 419,5 € par seconde.
//   - SMIC net au 1er juin 2026 : 1 477,93 € par mois (arrêté du 22 mai 2026) → 17 735 € par an → 2 043 personnes par jour d'intérêts.
//   - 778,2 milliards ÷ 1 million par jour = 778 226 jours = 2 130 ans.
//   - Insee, population au 1er janvier 2026 : 69 082 000 habitants → 11 265 € chacun.
//   - Insee Première n° 1687 (2018) : les 5 % de femmes les plus aisées vivent 88,3 ans, les 5 % les plus modestes 80,0 ans (8 ans d'écart).
//   - Lindqvist, Östling & Cesarini, Review of Economic Studies (2020) : plus de 10 ans après, les gros gagnants du loto suédois
//     sont plus satisfaits de leur vie ; un peu plus heureux, mais l'écart n'est pas significatif.
//   - Meta a dépensé plus de 27 millions de dollars pour la sécurité de Mark Zuckerberg en 2024 (Financial Times, via Fortune, 2025).
//   - Bloomberg, 5 juin 2025 : Elon Musk perd environ 34 milliards de dollars en une journée (chute de l'action Tesla).
//   - Forbes 2016 : Bill Gates, n° 1 avec 75 milliards de dollars (868,5 ÷ 75 = 11,6).
//  Hypothèse de départ (personnage) : Inès touche le SMIC ; la fortune « placée à 1,7 % » est une image (taux du Livret A).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, box, HUD, sm, lerp, clamp, rng, dirAzEl, pad, fr } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { buildVillage } from '../../lib-village.js';
import { makeBundle, makePile, makeCrowd, makeEquation } from '../../lib-multiply.js';

const Q = new URLSearchParams(location.search);
// ---------------------------------------------------------------------
// les chiffres
// ---------------------------------------------------------------------
const FORTUNE_USD = 868.5e9, USD = 1.116, FORTUNE = FORTUNE_USD / USD;       // 778,2 milliards d'euros
const TAUX = 0.017, PAR_JOUR = FORTUNE * TAUX / 365, PAR_S = PAR_JOUR / 86400; // 36,25 M€ par jour, 419,5 € par seconde
const LIASSE = 10_000, NL = Math.round(PAR_JOUR / LIASSE);                     // 3 625 liasses
const SMIC_M = 1477.93, SMIC_AN = SMIC_M * 12, NP = Math.floor(PAR_JOUR / SMIC_AN);   // 2 043 personnes
const ANS = Math.round(FORTUNE / 1e6 / 365.25);                               // 2 130 ans
const HAB = 69_082_000, PAR_HAB = Math.round(FORTUNE / HAB);                  // 11 265 €
const PERTE = 34e9 / USD;                                                     // 30,5 milliards d'euros
const mds = (x) => `${fr(x / 1e9, 1)} milliards €`;
// ---------------------------------------------------------------------
// la partition (temps de SCÈNE)
// ---------------------------------------------------------------------
const RICH = 8.4;                     // la fortune tombe
const BILL = 10.6;                    // une liasse de 10 000 € dans sa main
const PILE0 = 14.6, PILE1 = 17.8;     // le tas : 1 → 3 625 liasses (un jour d'intérêts)
const CROWD0 = 18.2, CROWD1 = 21.4;   // la foule : 2 043 personnes au SMIC
const CAMOUT0 = 14.2, CAMTOP = 21.8, CAMBACK = 23.4;
const GUARDS = 31.0;                  // les gardes du corps arrivent
const FZ1 = 34.6;                     // l'arrêt sur image
const DROP0 = 39.2, DROP1 = 41.6;     // la fortune fond de 34 milliards de dollars
const ASK = 43.0;                     // des gens s'approchent
const SIT = 50.6;                     // elle s'assoit sur le banc
const RW0 = 55.6, RW1 = 57.0;
const sceneEnd = 73.6;
const T = { hookOut: 3.0, rewind: RW0, real: RW1, endCard: 69.6, duration: sceneEnd };
const SUBS = [
  [3.2, 6.6, 'Une place de village, un lundi matin. Inès, 27 ans, gagne le SMIC.'],
  [6.8, 10.4, 'À 9 h, elle a la fortune de l’homme le plus riche du monde : 778 milliards d’euros.'],
  [10.6, 14.2, 'Une liasse de 100 billets de 100\u00a0€, c’est 10 000\u00a0€.'],
  [14.4, 18.0, `Placée au taux du Livret A, sa fortune rapporte 36 millions d’euros par jour. ${fr(NL)} liasses.`],
  [18.2, 21.8, `De quoi payer ${fr(NP)} personnes au SMIC pendant un an. Et ça, chaque jour.`],
  [23.6, 27.2, `Pour tout dépenser à 1 million d’euros par jour, il lui faudrait ${fr(ANS)} ans.`],
  [27.4, 31.0, 'Elle pourrait donner plus de 11 000 € à chaque habitant de la France.'],
  [31.2, 34.6, 'Mais elle ne traverse plus la place seule. Deux gardes du corps la suivent partout.'],
  [35.0, 38.8, 'Sa fortune, ce sont surtout des actions. Elles montent et descendent tous les jours.'],
  [39.0, 42.8, 'En juin 2025, l’homme le plus riche du monde a perdu 34 milliards de dollars en une journée.'],
  [43.0, 46.6, 'Sur la place, tout le monde la reconnaît. Et tout le monde a une idée pour son argent.'],
  [46.8, 50.4, 'Elle ne travaille plus. Mais ses journées sont pleines : banquiers, avocats, conseillers.'],
  [50.6, 55.4, 'Plus heureuse ? Plus satisfaite de sa vie, oui. Plus heureuse au jour le jour, pas forcément.'],
  [57.6, 61.2, 'En vrai, l’homme le plus riche du monde, c’est Elon Musk : 868 milliards de dollars au 1er novembre 2026.'],
  [61.4, 65.0, 'En 2016, le plus riche était Bill Gates, avec 75 milliards. Plus de 11 fois moins.'],
  [65.2, 69.2, 'Pendant que tu regardais cette vidéo, une telle fortune au Livret A a rapporté environ 30 000 €.'],
];

function makeBench() {
  const W0 = M('#6b4a32', { nc: true }), IR = M('#2a2a2a', { nc: true }), root = new THREE.Group();
  box(1.8, 0.07, 0.45, W0, root, 0, 0.46, 0); box(1.8, 0.4, 0.06, W0, root, 0, 0.75, -0.22);
  for (const sx of [-0.82, 0.82]) box(0.08, 0.46, 0.4, IR, root, sx, 0.23, 0);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

export default async function () {
  const stage = createStage({ fov: 55, far: 2200, bloom: [0.18, 0.4, 0.92], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const R = rng(7377);

  // -------------------------------------------------------------------
  // LE DÉCOR : la place du village, un lundi matin d'automne
  // -------------------------------------------------------------------
  const SUN_DIR = dirAzEl(150, 30);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.04, 0.14, 0.44], dayHor: [0.4, 0.52, 0.66] });
  sky.u.uDay.value = 1;
  const sunS = makeSun(scene, SUN_DIR, 60);
  const FOGC = new THREE.Color('#c3d0dc');
  scene.fog = new THREE.Fog(FOGC, 160, 1300);
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
  // INÈS, LES GARDES DU CORPS, LES PASSANTS, LA LIASSE, LE TAS, LA FOULE
  // -------------------------------------------------------------------
  const J0 = new THREE.Vector3(0.7, 0, 9.75), SEATP = new THREE.Vector3(0.64, 0, 8.86);
  const SUIT = [0.1, 0.1, 0.12];
  const PEOPLE = await loadPeople(renderer, undefined, { extra: [[SUIT, [0.8, 0.6, 0.45], SUIT], [SUIT, [0.55, 0.38, 0.27], SUIT]] });   // 8, 9 : costumes sombres
  const J = PEOPLE.make({ outfit: 2, shadows: true }); J.root.position.copy(J0); J.root.rotation.y = 0.18; scene.add(J.root);
  const GD = [PEOPLE.make({ outfit: 8, height: 1.8 }), PEOPLE.make({ outfit: 9, height: 1.78 })];
  const GPOS = [new THREE.Vector3(-0.35, 0, 9.45), new THREE.Vector3(1.75, 0, 9.35)], GFROM = [new THREE.Vector3(-6.5, 0, 8.6), new THREE.Vector3(7.5, 0, 9.0)];
  GD.forEach((g) => scene.add(g.root));
  const ASKERS = [3, 5, 7].map((o) => PEOPLE.make({ outfit: o })); ASKERS.forEach((a) => scene.add(a.root));
  const AFROM = [new THREE.Vector3(-3.5, 0, 1.5), new THREE.Vector3(0.6, 0, 0.5), new THREE.Vector3(4.2, 0, 2.0)];
  const ATO = [new THREE.Vector3(-0.9, 0, 7.4), new THREE.Vector3(0.6, 0, 6.9), new THREE.Vector3(2.0, 0, 7.5)];
  const bench = makeBench(); scene.add(bench); bench.position.set(0.62, 0, 8.7); bench.rotation.y = 0.18;

  const B = makeBundle();
  const bill = new THREE.Mesh(B.geo, B.mats); bill.castShadow = true; bill.scale.setScalar(2.0); scene.add(bill);
  const pile = makePile(scene, { geo: B.geo, mats: B.mats, count: NL, nx: 6, nz: 9, gap: 0.003, t0: PILE0, t1: PILE1, x: -1.1, z: 10.6, drop: 0.5 });
  const crowd = makeCrowd(scene, PEOPLE, { count: NP, t0: CROWD0, t1: CROWD1, spacing: 0.5, near: 30, cx: 0.4, cz: 4.0, face: [3, 18], reach: 1.5,
    fog: { color: FOGC, near: 160, far: 1300 },
    exclude: (x, z) => Math.abs(x) > 8.3 || z < -20.5 || z > 12.6 || Math.hypot(x, z) < 3.0 || Math.hypot(x - J0.x, z - J0.z) < 0.9
      || (x > -1.9 && x < -0.3 && z > 9.8 && z < 11.4) || Math.hypot(x - 0.62, z - 8.7) < 1.1 });
  console.log('foule', crowd.spots.length, 'sur', NP);
  const eq = makeEquation([{ label: '1 JOUR À 1,7 %', value: '36,2 M€' }, '÷', { label: '1 AN DE SMIC NET', value: `${fr(Math.round(SMIC_AN))} €` }, '=', { label: 'PERSONNES', value: '0', color: '#ffcf6b' }]);

  // -------------------------------------------------------------------
  // L'ARRÊT SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0) => () => J.point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ = makeFreeze([
    { at: FZ1, dur: 5.0, title: 'ARRÊT SUR IMAGE · TA NOUVELLE VIE', tags: [
      { at: pt('heart'), title: 'ESPÉRANCE DE VIE', lines: ['les femmes les plus aisées', 'vivent 8 ans de plus'], risk: 'ok', side: 'left', dy: 60 },
      { at: pt('head'), title: 'MORAL', lines: ['plus satisfaite de sa vie,', 'pas forcément plus heureuse'], risk: 'bof', side: 'right', dy: -40 },
      { at: pt('lArm'), title: 'SÉCURITÉ', lines: ['tu deviens une cible :', 'Zuckerberg, 27 M$ par an', 'pour sa protection'], risk: 'mal', side: 'right', dy: 210 } ] },
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
  // LA CAMÉRA DE SURVEILLANCE (fixe) ; elle ne s'envole que pendant l'effet multiplication
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(1.7, 2.7, 14.9), LOOK = new THREE.Vector3(0.1, 1.15, 9.0);
  const CAM_HI = new THREE.Vector3(9.0, 19.0, 30.0), LOOK_HI = new THREE.Vector3(-0.5, 0.0, 0.0);
  const W = 720, H = 1280, tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  // un trajet à pied : de a vers b entre t0 et t1, puis debout ; renvoie la position et s'occupe de la pose
  function walkTo(P, a, b, t0, t1, ts, faceEnd) {
    const k = sm(t0, t1, ts), moving = ts > t0 && ts < t1;
    P.root.position.lerpVectors(a, b, k);
    const dir = Math.atan2(b.x - a.x, b.z - a.z);
    P.root.rotation.y = moving ? dir : lerp(dir, faceEnd, sm(t1, t1 + 0.6, ts));
    if (moving) P.walk(ts * 6.5, Math.min(1, 4 * Math.min(k, 1 - k) + 0.3)); else P.stand(ts * 0.05);
  }

  function update(t) {
    const ts0 = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts0 >= RW0 && ts0 < RW1 ? (ts0 - RW0) / (RW1 - RW0) : 0;
    const real = ts0 >= RW0 + 0.7;
    const ts = ts0;
    // --- Inès
    J.root.position.copy(J0); J.root.rotation.y = 0.18;
    let billK = 0;
    if (real) {   // le réel : Inès, un lundi normal, qui regarde son téléphone (sa main)
      J.do({ RightArm: [['x', -0.75]], RightForeArm: [['x', -1.15]], Head: [['x', 0.35]] });
    } else if (ts < BILL) {   // elle traverse la place, puis s'arrête
      const w = 1 - sm(4.6, 5.6, ts);
      if (w > 0.01) { J.root.position.set(J0.x - 4.0 * (1 - sm(1.0, 5.6, ts)), 0, J0.z); J.root.rotation.y = lerp(0.18, Math.PI / 2, w); J.walk(ts * 6, w); }
      else { const s = sm(RICH, RICH + 0.4, ts) * (1 - sm(RICH + 1.6, RICH + 2.4, ts)); J.do({ Head: [['x', -0.12 * s]], Spine: [['x', -0.1 * s]], LeftArm: [['z', 0.3 * s]], RightArm: [['z', -0.3 * s]] }); }
    } else if (ts < PILE0) {   // la liasse dans la main
      billK = sm(BILL + 0.1, BILL + 0.8, ts) * (1 - sm(PILE0 - 0.7, PILE0 - 0.2, ts));
      J.do({ RightArm: [['x', -0.8 * billK]], RightForeArm: [['x', -1.0 * billK]], Head: [['x', 0.3 * billK]] });
    } else if (ts < GUARDS) {   // elle regarde le tas, puis la foule
      J.do({ Head: [['y', -0.5 * sm(PILE0, PILE0 + 0.8, ts) * (1 - sm(CAMBACK, CAMBACK + 1, ts))], ['x', 0.1]] });
    } else if (ts < DROP0) {   // les gardes : elle regarde à gauche puis à droite
      J.do({ Head: [['y', 0.45 * Math.sin((ts - GUARDS) * 1.2) * (1 - sm(FZ1 - 0.5, FZ1, ts))]] });
    } else if (ts < ASK) {     // la chute de la bourse : les mains sur la tête
      const k = sm(DROP0 + 0.2, DROP0 + 0.9, ts) * (1 - sm(ASK - 0.8, ASK - 0.1, ts));
      J.do({ LeftArm: [['z', 2.2 * k], ['x', -0.4 * k]], RightArm: [['z', -2.2 * k], ['x', -0.4 * k]], LeftForeArm: [['y', -1.9 * k]], RightForeArm: [['y', 1.9 * k]], Head: [['x', 0.2 * k]] });
    } else if (ts < SIT - 1.2) {
      J.do({ Head: [['x', -0.05], ['y', 0.2 * Math.sin(ts * 0.8)]] });
    } else {   // elle va s'asseoir sur le banc
      const w = sm(SIT - 1.2, SIT - 0.2, ts);
      if (w < 1) { J.root.position.lerpVectors(J0, SEATP, w); J.walk(ts * 5, 0.6 * Math.sin(Math.PI * w)); }
      else { J.root.position.copy(SEATP); J.sit(sm(SIT - 0.2, SIT + 0.5, ts)); J.inner.position.y = -0.42 * sm(SIT - 0.2, SIT + 0.5, ts); }
    }
    // --- la liasse
    bill.visible = billK > 0.02;
    if (bill.visible) { J.root.updateMatrixWorld(true); bill.position.copy(J.point('rHand')).add(new THREE.Vector3(0.02, 0.05, 0.06)); bill.rotation.set(0.25, 0.18 + 0.2 * Math.sin(ts), 0); }
    // --- les gardes du corps : ils arrivent, puis suivent Inès
    GD.forEach((g, i) => {
      g.root.visible = !real && ts >= GUARDS - 0.1;
      if (!g.root.visible) return;
      const to = GPOS[i].clone(); if (ts > SIT - 1.2) to.add(new THREE.Vector3(i ? 0.2 : -0.1, 0, -0.6 * sm(SIT - 1.2, SIT - 0.2, ts)));
      walkTo(g, GFROM[i], to, GUARDS, GUARDS + 2.6, ts, i ? -0.25 : 0.4);
      if (ts > GUARDS + 3) g.do({ LeftArm: [['x', -0.3], ['z', 0.15]], RightArm: [['x', -0.3], ['z', -0.15]], LeftForeArm: [['x', -0.9]], RightForeArm: [['x', -0.9]], Head: [['y', (i ? 0.3 : -0.3) * Math.sin(ts * 0.7 + i)]] });
      // pendant les demandes, ils s'avancent d'un pas
      if (ts > ASK + 1.5 && ts < SIT - 1.2) g.root.position.z -= 0.35 * sm(ASK + 1.5, ASK + 2.3, ts);
    });
    // --- les passants qui s'approchent
    ASKERS.forEach((a, i) => {
      a.root.visible = !real && ts >= ASK - 0.2 && ts < RW0;
      if (!a.root.visible) return;
      walkTo(a, AFROM[i], ATO[i], ASK + i * 0.5, ASK + 2.6 + i * 0.5, ts, Math.atan2(J0.x - ATO[i].x, J0.z - ATO[i].z));
      if (ts > ASK + 3.2 + i * 0.5) { const w = Math.sin(ts * 2.4 + i * 2); a.do({ RightArm: [['x', -0.9 - 0.25 * w]], RightForeArm: [['x', -0.6]], Head: [['x', -0.05]] }); }
    });
    // --- le tas et la foule (seulement pendant l'effet multiplication)
    const mulOn = !real && ts >= PILE0 && ts < CAMBACK + 0.2;
    pile.mesh.visible = mulOn; pile.update(mulOn ? ts : 0);
    const nP = crowd.update(mulOn ? ts : 0);
    crowd.flat.visible = mulOn; crowd.real.forEach((p) => { p.root.visible = p.root.visible && mulOn; });
    // --- la caméra (fixe, sauf pendant l'effet multiplication), avec le zoom pendant l'arrêt
    const fly = real ? 0 : sm(CAMOUT0, CAMTOP, ts) * (1 - sm(CAMTOP + 0.2, CAMBACK, ts));
    camera.position.lerpVectors(CAM, CAM_HI, fly); tmp2.lerpVectors(LOOK, LOOK_HI, fly); camera.lookAt(tmp2); camera.fov = 52;
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sunS.follow(camera); sky.follow(camera);
    if (A) {
      tmp.copy(J.point('chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, 1.15, k);
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sun.position.copy(SUN_DIR).multiplyScalar(120).add(new THREE.Vector3(0, 0, 6)); sun.target.position.set(0, 0, 6);
    HUD.frost(0);
    HUD.flash(!real && ts >= RICH ? 0.55 * (1 - sm(RICH, RICH + 0.5, ts)) : 0);
    const redK = !real && ts > DROP0 && ts < ASK ? 0.25 * Math.sin(Math.PI * (ts - DROP0) / (ASK - DROP0)) : 0;
    const filt = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : (redK > 0.01 ? `sepia(${redK.toFixed(2)}) hue-rotate(-${(30 * redK).toFixed(0)}deg) saturate(${(1 + redK).toFixed(2)})` : '');

    // --- textes
    HUD.hook(t, 'Et si tu étais <em>l’homme le plus riche</em> du monde ?', T.hookOut);
    const cl = 9 * 3600 - 15 + (real ? 1800 + (ts0 - RW1) : ts0);
    HUD.live(t, 'UNE PLACE DE VILLAGE · CAM 01', `${!real && ts > RICH ? 'HYPOTHÈSE · ' : 'LUNDI 02/11/2026 · '}${pad(Math.floor(cl / 3600))}:${pad(Math.floor(cl / 60) % 60)}:${pad(Math.floor(cl) % 60)}`, real ? 'LIVE' : 'SIMULATION');
    const earned = Math.max(0, t) * PAR_S;   // ce que la fortune rapporte depuis le début de la vidéo
    const pileN = pile.countAt(ts);
    let showTL = true;
    if (real) {
      HUD.block(1, { label: 'ELON MUSK · FORBES', value: '868,5 milliards $', sub: 'L’HOMME LE PLUS RICHE · 1ER NOVEMBRE 2026', color: '#ffcf6b' });
      if (ts0 > 61.4 && ts0 < 65.2) { HUD.block(2, { label: 'BILL GATES · EN 2016', value: '75 milliards $', sub: 'LE PLUS RICHE DU MONDE À L’ÉPOQUE', color: '#fff' }); HUD.show2(true); }
      else if (ts0 >= 65.2) { HUD.block(2, { label: 'RAPPORTÉ PENDANT CETTE VIDÉO', value: `${fr(Math.round(earned))} €`, sub: 'À 1,7 %, LE TAUX DU LIVRET A', color: '#ffcf6b' }); HUD.show2(true); }
      else HUD.show2(false);
    } else if (ts < RICH) {
      HUD.block(1, { label: 'CE QU’INÈS GAGNE', value: `${fr(SMIC_M, 2)} €`, sub: 'PAR MOIS · LE SMIC NET', color: '#fff' }); HUD.show2(false);
    } else if (ts < PILE0 - 0.2) {
      HUD.block(1, { label: 'SA FORTUNE', value: mds(FORTUNE), sub: '868,5 MILLIARDS DE DOLLARS', color: '#ffcf6b' });
      HUD.block(2, { label: 'RAPPORTÉ DEPUIS LE DÉBUT', value: `${fr(Math.round(earned))} €`, sub: 'À 1,7 %, LE TAUX DU LIVRET A', color: '#fff' }); HUD.show2(ts > BILL);
    } else if (ts < CROWD0) {
      const n = Math.max(1, pileN);
      HUD.block(1, { label: 'LIASSES DE 10 000 €', value: fr(n), sub: n >= NL ? 'UN SEUL JOUR D’INTÉRÊTS' : 'CE QUE ÇA RAPPORTE', color: n >= NL ? '#ffcf6b' : '#fff' });
      HUD.block(2, { label: 'EN UN JOUR', value: `${fr(n * LIASSE)} €`, sub: '', color: n >= NL ? '#ffcf6b' : '#fff' }); HUD.show2(true);
    } else if (ts < CAMBACK) {
      HUD.block(1, { label: 'PERSONNES PAYÉES', value: fr(nP), sub: 'AU SMIC PENDANT UN AN', color: '#ffcf6b' }); HUD.show2(false);
    } else if (ts < 27.4) {
      HUD.block(1, { label: 'À 1 MILLION € PAR JOUR', value: `${fr(Math.round(ANS * sm(23.8, 25.6, ts)))} ans`, sub: 'POUR TOUT DÉPENSER', color: '#ffcf6b' }); HUD.show2(false);
    } else if (ts < 31.2) {
      HUD.block(1, { label: 'À CHAQUE HABITANT', value: `${fr(Math.round(PAR_HAB * sm(27.6, 29.0, ts)))} €`, sub: `${fr(HAB)} HABITANTS · INSEE 2026`, color: '#ffcf6b' }); HUD.show2(false);
    } else if (ts < DROP0) {
      HUD.block(1, { label: 'GARDES DU CORPS', value: '2', sub: 'PARTOUT, TOUT LE TEMPS', color: '#fff' });
      HUD.block(2, { label: 'SA FORTUNE', value: mds(FORTUNE), sub: 'SURTOUT DES ACTIONS', color: '#ffcf6b' }); HUD.show2(ts > 35.0);
    } else {
      const lost = PERTE * sm(DROP0, DROP1, ts), red = ts < ASK;
      HUD.block(1, { label: 'SA FORTUNE', value: mds(FORTUNE - lost), sub: red ? '−34 MILLIARDS $ EN UN JOUR' : 'ÇA PEUT REMONTER… OU PAS', color: red && lost > 1e9 ? '#ff3b30' : '#ffcf6b' });
      HUD.block(2, { label: 'RAPPORTÉ DEPUIS LE DÉBUT', value: `${fr(Math.round(earned))} €`, sub: 'À 1,7 %, LE TAUX DU LIVRET A', color: '#fff' }); HUD.show2(ts > 46.8);
    }
    eq.opacity((real ? 0 : sm(CROWD0 + 0.1, CROWD0 + 0.6, ts) * (1 - sm(CAMBACK - 1.4, CAMBACK - 0.9, ts)))); eq.set(2, fr(nP));
    document.getElementById('tl').style.opacity = (showTL ? 1 : 0) * sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', J.point('chest').add(new THREE.Vector3(0, 0.1, 0)), camera, 'INÈS', (A || rwk) ? 0 : sm(5.4, 6.0, ts0) * (1 - sm(9.8, 10.3, ts0)), 110);
    HUD.subs(t, SUBS_V);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : FORBES · INSEE · LIVRET A · BLOOMBERG · REV. ECON. STUDIES · FORTUNE', q: 'Et toi, tu achèterais<br>quoi en premier ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.set(J0.x + 0.6, 1.4, J0.z + 3.2); camera.lookAt(J0.x, 1.0, J0.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), rich: FZ.realT(RICH), bill: FZ.realT(BILL + 0.3), pile: [FZ.realT(PILE0), FZ.realT(PILE1)], crowd: [FZ.realT(CROWD0), FZ.realT(CROWD1)],
    guards: FZ.realT(GUARDS), drop: [FZ.realT(DROP0), FZ.realT(DROP1)], ask: FZ.realT(ASK), sit: FZ.realT(SIT), rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard), NL }) };
}

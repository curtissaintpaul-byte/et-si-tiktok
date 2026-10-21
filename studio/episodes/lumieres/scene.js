// =====================================================================
//  ÉPISODE : « Et si on éteignait toutes les lumières de France ? » — Paris, le Champ-de-Mars, face à la tour Eiffel, la nuit
//  Un seul personnage suivi : Léna. Effet multiplication (1 → 11,6 millions de lampadaires), deux arrêts sur image.
//  Faits (sources dans la légende ; calculs refaits en Python) :
//   - dans le ciel de Paris, on voit « jusqu'à 30 ou 40 étoiles » (Ville de Paris, entretien avec un astronome amateur) ;
//     sous un ciel noir, environ 3 000 étoiles à l'œil nu depuis un hémisphère (Futura Sciences).
//   - éclairage public en France : 11,63 millions de points lumineux, 2,60 TWh consommés en 2024, 0,58 % de l'électricité
//     du pays (AFE, « Les chiffres de l'éclairage », avec l'ADEME et le Cerema, avril 2026).
//     2,60 TWh / 365 = 7,1 millions de kWh par nuit, en moyenne.
//   - population au 1er janvier 2026 : 69,1 millions (Insee) → 69,1 / 11,63 = 5,9 habitants par lampadaire (« 1 pour 6 »).
//   - la pupille : de 2 à 8 mm environ (Watson & Yellott, Journal of Vision 2012) → surface × (8/2)² = 16.
//   - l'œil met 20 à 30 minutes à s'habituer au noir ; d'abord les cônes, puis les bâtonnets (Scientific American).
//     Les bâtonnets n'ont qu'un seul pigment (la rhodopsine) : ils ne voient pas les couleurs.
//   - la lumière d'une pièce avant le coucher raccourcit la durée de la mélatonine d'environ 90 minutes
//     (Gooley et al., J. Clin. Endocrinol. Metab., 2011).
//   - 12 000 communes éteignent déjà leur éclairage en milieu de nuit (ANPCEN, 2019).
//   - la Voie lactée est cachée pour plus d'un tiers de l'humanité et 60 % des Européens (Falchi et al., Science Advances, 2016).
//   - le 2 août 2027, c'est la nouvelle Lune (éclipse totale de Soleil ce jour-là) : une nuit sans Lune.
// =====================================================================
import { THREE, createStage, makeSky, M, box, cyl, bake, HUD, sm, lerp, clamp, rng, dirAzEl, pad, keys, fr, dotTex } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeCrowd, makeEquation } from '../../lib-multiply.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { buildEiffel } from '../../lib-eiffel.js';
import { makeCity } from '../../lib-manif.js';
import { makeInsets } from '../../lib-insets.js';
import { insetList } from './insets.js';

const Q = new URLSearchParams(location.search);
const LAMPS = 11633300;
const M0 = 7.0, MG = 7.8, M1 = 13.8;                // l'effet multiplication : 1 → 11,6 millions (temps de scène)
const RISE = 8.0, AER = 11.6, BACK = 14.2, DOWN = 17.6;   // la caméra s'envole au-dessus de Paris, puis revient à sa place
const C0 = 15.4, C1 = 17.4, COFF = 21.0;            // la conversion : la foule (1 lampadaire pour 6 habitants)
const J = 22.0;                                      // 23 h 30 : on éteint tout
const AD1 = 41.0;                                    // les yeux sont à fond (30 min après)
const RW0 = 56.6, RW1 = 58.0;                        // retour au réel
const sceneEnd = 70.0;
const T = { hookOut: 3.0, off: J, rewind: RW0, real: RW1, endCard: 66.0, duration: sceneEnd };
const Nat = (ts) => (ts < MG ? 1 : ts >= M1 ? LAMPS : Math.round(Math.exp(Math.log(LAMPS) * Math.pow((ts - MG) / (M1 - MG), 1.6))));
const SUBS = [
  [3.2, 6.8, 'Paris, 23 h. Léna lève les yeux. Elle compte 30 à 40 étoiles, pas plus.'],
  [7.0, 10.6, 'Ce qui cache le ciel, c’est d’abord ça : un lampadaire.'],
  [10.8, 14.6, 'En France, il y en a 11,6 millions.'],
  [14.8, 18.6, 'Ça fait un lampadaire pour 6 habitants.'],
  [18.8, 21.8, 'Ce soir à 23 h 30, on éteint tout. Toute la France.'],
  [22.4, 25.8, 'Noir complet. Léna ne voit même plus ses mains.'],
  [26.0, 28.9, 'Ses pupilles s’ouvrent en grand : de 2 à 8 mm.'],
  [29.6, 33.2, 'Quelques minutes plus tard, les étoiles arrivent par centaines.'],
  [33.4, 37.0, 'Ses yeux mettent 20 à 30 minutes à s’habituer au noir.'],
  [37.2, 40.8, 'Mais la nuit, l’œil voit avec ses bâtonnets. Ils ne voient pas les couleurs.'],
  [41.0, 44.6, 'Minuit. Environ 3 000 étoiles. Et la Voie lactée, au-dessus de Paris.'],
  [45.0, 48.6, 'Léna bâille. Dans le noir, son corps fabrique la mélatonine, l’hormone du sommeil.'],
  [48.8, 52.6, 'Sous la lumière d’une pièce, elle dure environ 90 minutes de moins.'],
  [52.8, 56.4, 'Et cette nuit, l’éclairage public ne consomme rien. D’habitude : 7 millions de kWh.'],
  [58.4, 61.8, 'En vrai, 12 000 communes éteignent déjà leurs rues au milieu de la nuit.'],
  [62.0, 65.6, 'Mais 60 % des Européens ne voient plus la Voie lactée de chez eux.'],
];
// l'horloge (secondes depuis minuit le 2 août), selon le temps de scène : réel, puis accéléré après l'extinction
const H23 = 23 * 3600 + 1800;
const CLK = [[J, H23], [29.6, H23 + 300], [33.4, H23 + 900], [37.2, H23 + 1500], [41.0, H23 + 1800], [45.0, H23 + 3600], [48.8, H23 + 4200], [52.8, H23 + 4800], [56.6, H23 + 5400]];
const clockAt = (ts) => (ts < J ? H23 - J + ts : keys(CLK, ts));

export default async function () {
  const insets = makeInsets();
  const stage = createStage({ fov: 62, far: 30000, bloom: [0.32, 0.45, 0.82], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const R = rng(2027);
  const sky = makeSky(scene, { sunDir: dirAzEl(330, -22), stars: 1.2, milky: 0, milkyAxis: new THREE.Vector3(0.9, 0.25, 0.12) });
  sky.u.uDay.value = 0; sky.u.uTintDir.value.set(0, -0.2, -1).normalize();
  const FOG_LIT = new THREE.Color('#2a2119'), FOG_DARK = new THREE.Color('#05070b');
  scene.fog = new THREE.Fog(FOG_LIT.clone(), 250, 4000);
  const hemi = new THREE.HemisphereLight('#6d7690', '#3a3026', 0.3); scene.add(hemi);
  const lamp = new THREE.PointLight('#ffb35c', 12, 40, 1.4); lamp.position.set(-3.5, 4.6, 3); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); scene.add(lamp);   // le réverbère près de Léna
  const lamp2 = new THREE.PointLight('#ffb35c', 10, 30, 1.4); lamp2.position.set(7.5, 4.6, -14); scene.add(lamp2);
  const LIGHTS = [lamp, lamp2];
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;

  // -------------------------------------------------------------------
  // LE DÉCOR : le Champ-de-Mars la nuit (pelouses, allées, arbres), la tour Eiffel illuminée, Paris autour
  // -------------------------------------------------------------------
  const deco = new THREE.Group();
  const TZ = -430;
  box(16000, 0.1, 16000, M('#4a4844'), deco, 0, -0.06, -2000);
  box(250, 0.12, 760, M('#7d7464'), deco, 0, -0.02, TZ + 300);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) box(62, 0.14, 150, M(i % 2 ? '#56723c' : '#53703a'), deco, sx * 42, 0.0, 20 - i * 170 - 60);
  for (const sx of [-1, 1]) for (let row = 0; row < 2; row++) for (let i = 0; i < 34; i++) {
    const x = sx * (88 + row * 16), z = 40 - i * 15;
    cyl(0.22, 0.3, 3.4, 6, M('#4a3a2e'), deco, x, 1.7, z);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 1), M(row ? '#3d5730' : '#445f34')); crown.position.set(x, 6.4, z); crown.scale.set(1, 1.2, 1); deco.add(crown);
  }
  // les réverbères des allées (les 4 premiers près de la caméra, puis de chaque côté jusqu'à la tour)
  const LP = [[-3.5, 3], [7.5, -14], [-8, -30], [8, -46]];
  for (let i = 0; i < 18; i++) { LP.push([-14, -62 - i * 20]); LP.push([14, -72 - i * 20]); }
  for (const [x, z] of LP) { cyl(0.07, 0.11, 4.6, 6, M('#20262b'), deco, x, 2.3, z); box(0.36, 0.55, 0.36, M('#2a3036'), deco, x, 4.85, z); }
  scene.add(bake(deco));
  const glows = LP.map(([x, z], i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3, 1.9, 0.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 1 }));
    s.position.set(x, 4.8, z); s.scale.setScalar(i === 0 ? 1.1 : 1.8); scene.add(s); s.userData.d = Math.hypot(x - 0.7, z); return s;
  });
  // les vitres de la lanterne (elles brillent tant que c'est allumé)
  const lanterns = LP.map(([x, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.7) })); m.position.set(x, 4.72, z); scene.add(m); return m; });
  const { tower, towerLight } = buildEiffel(scene, new THREE.Vector3(0, 0, TZ));
  const towerMats = new Set(); tower.traverse((o) => { if (o.isMesh) towerMats.add(o.material); });
  for (const m of towerMats) { m.emissive = new THREE.Color('#ff9a32'); m.emissiveIntensity = 0; }
  const city = makeCity(scene, [{ a: Math.PI, w: 290, len: 900, r0: 0 }, { a: 0, w: 290, len: 260, r0: 0 }], { size: 2600, step: 46, r0: 150 });
  city.mesh.material.color.setRGB(0.42, 0.4, 0.38); city.roofs.material.color.set('#2f343b'); city.mesh.material.emissive = new THREE.Color('#ffb562'); city.mesh.material.emissiveIntensity = 0;
  // toutes les lumières de la ville, vues du ciel : des points orangés (révélés du centre vers l'extérieur)
  const NPTS = 90000, pts = [];
  for (let i = 0; i < NPTS; i++) { const a = R() * Math.PI * 2, r = 60 + Math.pow(R(), 0.7) * 9000; const x = Math.sin(a) * r, z = Math.cos(a) * r - 300; if (Math.abs(x) < 70 && z > TZ - 40 && z < 60) continue; pts.push([x, 5 + R() * 2, z, Math.hypot(x - 0.7, z)]); }
  pts.sort((a, b) => a[3] - b[3]);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p[0], p[1], p[2]]), 3));
  const pmat = new THREE.PointsMaterial({ map: dotTex(), color: new THREE.Color(2.6, 1.5, 0.6), size: 9, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const cityPts = new THREE.Points(pg, pmat); cityPts.frustumCulled = false; scene.add(cityPts);
  const ptsWithin = (r) => { let lo = 0, hi = pts.length; while (lo < hi) { const m = (lo + hi) >> 1; if (pts[m][3] < r) lo = m + 1; else hi = m; } return lo; };

  // -------------------------------------------------------------------
  // LES PERSONNAGES : Léna, et la foule de la conversion
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer);
  const YOU = new THREE.Vector3(0.7, 0, 0);
  const LENA = PEOPLE.make({ outfit: 6, shadows: true }); LENA.root.position.copy(YOU); LENA.root.rotation.y = 0.15; scene.add(LENA.root);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.3, emissive: new THREE.Color('#8fb8ff'), emissiveIntensity: 0.0 }));
  LENA.attach(phone, 'rHand', { dz: 0.04, dy: -0.02 }); phone.visible = false;
  const FOGC = FOG_LIT.clone();
  const crowd = makeCrowd(scene, PEOPLE, { count: 1600, spacing: 1.05, cx: YOU.x, cz: YOU.z - 1, near: 10, t0: C0, t1: C1, atlas: PEOPLE.atlas(20, 192, 384),
    fog: { color: FOGC, near: 60, far: 400 }, face: [1.5, 8.2],
    exclude: (x, z) => z > YOU.z + 0.6 || Math.hypot(x - YOU.x, z - YOU.z) < 0.9 || Math.hypot(x + 3.5, z - 3) < 0.9 });

  // les poses
  const scale = (spec, k) => { const o = {}; for (const n in spec) o[n] = spec[n].map(([a, v]) => [a, v * k]); return o; };
  const SITG = { LeftUpLeg: [['x', -1.45]], RightUpLeg: [['x', -1.4]], LeftLeg: [['x', 1.9]], RightLeg: [['x', 1.85]], Spine: [['x', 0.2]],
    LeftArm: [['x', -0.75]], RightArm: [['x', -0.75]], LeftForeArm: [['x', -0.6]], RightForeArm: [['x', -0.6]] };   // assise dans l'herbe, les genoux remontés
  const PHONE = (k) => ({ RightArm: [['x', -1.15 * k], ['z', 0.6 * k]], RightForeArm: [['x', -1.5 * k]], Head: [['x', 0.32 * k]] });
  const HANDS = (k) => ({ RightArm: [['x', -1.25 * k], ['z', 0.45 * k]], RightForeArm: [['x', -1.2 * k]], LeftArm: [['x', -1.25 * k], ['z', -0.45 * k]], LeftForeArm: [['x', -1.2 * k]] });   // les mains devant le visage
  const YAWN = (k) => ({ RightArm: [['x', -1.2 * k], ['z', 0.75 * k]], RightForeArm: [['x', -1.75 * k]], Head: [['x', -0.25 * k]] });
  function poseLena(ts, real) {
    LENA.inner.position.set(0, 0, 0);
    if (real) { LENA.do(PHONE(1)); return; }
    if (ts < 7.0) { const up = sm(3.6, 4.4, ts) * (1 - sm(6.4, 7.0, ts)); LENA.do(PHONE(1 - sm(3.2, 3.8, ts)), { Head: [['x', -0.5 * up], ['y', 0.15 * Math.sin(ts * 0.6) * up]] }); return; }
    if (ts < J) { LENA.do({ Head: [['y', 0.3 * Math.sin(ts * 0.5)], ['x', -0.15 * sm(18.8, 20, ts)]] }); return; }
    if (ts < 29.6) { const k = sm(J + 0.3, J + 1.2, ts) * (1 - sm(29.15, 29.6, ts)); LENA.do(HANDS(k), { Head: [['x', 0.15 * k], ['y', 0.25 * Math.sin(ts * 0.9) * sm(24, 25, ts)]] }); return; }
    // elle s'assoit dans l'herbe et regarde le ciel
    const k = sm(29.6, 31.0, ts), y = sm(45.2, 46.0, ts) * (1 - sm(47.6, 48.4, ts));
    LENA.do(scale(SITG, k), YAWN(y), { Head: [['x', -0.55 * sm(30.6, 31.6, ts) * (1 - 0.5 * y)], ['y', 0.12 * Math.sin(ts * 0.4)]] });
    LENA.inner.position.y = -0.74 * k;
  }

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0) => () => LENA.point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ = makeFreeze([
    { at: 29.0, dur: 5.0, title: 'ARRÊT SUR IMAGE · DANS LE NOIR', tags: [
      { at: pt('eyes'), title: 'PUPILLES', lines: ['de 2 à 8 mm de large :', '16 fois plus de lumière'], risk: 'info', side: 'left', dy: 200 },
      { at: pt('rHand'), title: 'MAINS', lines: ['à 30 cm du visage,', 'tu ne les vois plus'], risk: 'bof', side: 'right', dy: 150 },
      { at: pt('lFoot'), title: 'PIEDS', lines: ['une marche, un trottoir :', 'tu ne les vois pas'], risk: 'mal', side: 'right', dy: 90 } ] },
    { at: 44.7, dur: 5.0, title: 'ARRÊT SUR IMAGE · 30 MIN APRÈS', tags: [
      { at: pt('eyes'), title: 'YEUX', lines: ['vision de nuit à fond,', 'mais sans les couleurs'], risk: 'ok', side: 'left', dy: 60 },
      { at: pt('head', 0.06), title: 'CERVEAU', lines: ['dans le noir, la mélatonine', '(hormone du sommeil) monte'], risk: 'ok', side: 'right', dy: 10 },
      { at: pt('lHand'), title: 'MAINS', lines: ['tu les revois,', 'en gris'], risk: 'info', side: 'right', dy: 170 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);
  const INSETS = insetList(FZ.realT);
  const eq = makeEquation([{ label: 'HABITANTS', value: '69,1 M' }, '÷', { label: 'LAMPADAIRES', value: '11,6 M' }, '=', { label: 'PAR LAMPADAIRE', value: '5,9 hab.', color: '#ffcf6b' }]);

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
  // LA CAMÉRA DE SURVEILLANCE (fixe, sur un réverbère), qui ne s'envole que pendant l'effet multiplication
  // -------------------------------------------------------------------
  const CAMP = new THREE.Vector3(1.5, 3.9, 8.2), LOOK = new THREE.Vector3(0, 36, TZ);
  const AERP = new THREE.Vector3(140, 950, 1150), AERL = new THREE.Vector3(0, 0, -600), AERP2 = new THREE.Vector3(90, 1050, 1250), AERL2 = new THREE.Vector3(0, 0, -750);
  const W = 720, H = 1280, tmp = new THREE.Vector3(), c0 = new THREE.Color();
  function camAt(ts) {
    if (ts < RISE || ts > DOWN) return [CAMP, LOOK];
    const lp = (a, b, k) => a.clone().lerp(b, k);
    if (ts < AER) { const k = sm(RISE, AER, ts), k2 = sm(RISE, AER - 1.2, ts); return [lp(CAMP, AERP, k * k), lp(LOOK, AERL, k2)]; }
    if (ts < BACK) { const k = (ts - AER) / (BACK - AER); return [lp(AERP, AERP2, k), lp(AERL, AERL2, k)]; }
    const k = sm(BACK, DOWN, ts); return [lp(AERP2, CAMP, 1 - (1 - k) * (1 - k)), lp(AERL2, LOOK, sm(BACK + 0.8, DOWN, ts))];
  }
  const POLL_HOR = new THREE.Color(0.10, 0.065, 0.04), POLL_ZEN = new THREE.Color(0.03, 0.028, 0.034), DARK_HOR = new THREE.Color(0.004, 0.005, 0.009), DARK_ZEN = new THREE.Color(0.001, 0.0013, 0.003);

  function update(t) {
    const ts0 = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts0 >= RW0 && ts0 < RW1 ? (ts0 - RW0) / (RW1 - RW0) : 0;
    const real = ts0 >= RW0 + 0.7;                              // après le rembobinage : une nuit ordinaire, tout allumé
    const ts = real ? 2.0 + (ts0 - RW1) * 0.3 : ts0;
    const clock = real ? H23 - 1500 + (ts0 - RW1) : clockAt(ts);
    // --- allumé / éteint
    const flick = ts >= J - 0.5 && ts < J ? (Math.sin(ts * 90) > 0.2 ? 1 : 0.35) : 1;   // le réverbère hésite
    const lit = real ? 1 : (ts < J ? 1 : 0) * flick;
    const focus = real ? 0 : sm(M0, M0 + 0.5, ts) * (1 - sm(MG, MG + 0.4, ts));          // on ne garde qu'un lampadaire
    const revR = real || ts < M0 ? 1e9 : ts < MG ? 0 : 3 * Math.exp(Math.log(9200 / 3) * Math.pow(clamp((ts - MG) / (M1 - MG)), 1.35));
    // --- les yeux qui s'habituent (0 → 1 en 30 min) : pupilles en quelques secondes, puis cônes, puis bâtonnets
    const ad = real ? 0 : ts < J ? 0 : clamp(0.18 * sm(J + 0.2, J + 2.6, ts) + 0.27 * sm(J + 2.6, 29.6, ts) + 0.55 * sm(29.6, AD1, ts));
    const rods = real ? 0 : sm(29.6, AD1, ts);
    // --- le ciel
    sky.u.uNightHor.value.copy(DARK_HOR).lerp(POLL_HOR, lit); sky.u.uNightZen.value.copy(DARK_ZEN).lerp(POLL_ZEN, lit);
    sky.u.uTint.value.setRGB(0.9, 0.5, 0.22); sky.u.uTintAmt.value = 0.05 * lit;
    sky.u.uStarThr.value = lerp(0.9988, 0.935, Math.pow(ad, 0.8));
    sky.u.uMilky.value = 1.1 * sm(0.45, 1.0, ad); sky.u.uStars.value = lerp(1.4, 3.0, ad);
    // --- les lumières
    lamp.intensity = 12 * lit * (1 - 0.0 * focus); lamp2.intensity = 10 * lit * (1 - focus);
    for (const l of LIGHTS) l.visible = l.intensity > 0;
    glows.forEach((g, i) => { g.material.opacity = lit * (i === 0 ? 1 : (1 - focus) * (g.userData.d < revR ? 1 : 0)); g.visible = g.material.opacity > 0.01; });
    lanterns.forEach((m, i) => m.material.color.setRGB(2.4, 1.5, 0.7).multiplyScalar(lit * (i === 0 ? 1 : (1 - focus) * (glows[i].userData.d < revR ? 1 : 0.15)) + 0.04));
    for (const m of towerMats) m.emissiveIntensity = 0.55 * lit * (1 - focus * 0.8);
    towerLight.material.opacity = lit;
    city.mesh.material.emissiveIntensity = 0.12 * lit * (1 - focus) * (revR > 800 ? 1 : 0);
    cityPts.visible = lit > 0; cityPts.geometry.setDrawRange(0, ptsWithin(revR));
    hemi.intensity = lerp(0.05, 0.14, lit); scene.environmentIntensity = lerp(0.02, 0.18, lit); hemi.color.set(lit ? '#6d7690' : '#5d6c98');
    renderer.toneMappingExposure = lit ? 1.0 : lerp(1.0, 3.2, Math.pow(ad, 1.25));
    c0.copy(FOG_DARK).lerp(FOG_LIT, lit); scene.fog.color.copy(c0); FOGC.copy(c0);
    // --- la caméra
    const [cp, ct] = camAt(ts); camera.position.copy(cp); camera.lookAt(ct);
    const hk = clamp((camera.position.y - 4) / 600); scene.fog.near = lerp(250, 2500, hk); scene.fog.far = lerp(4000, 14000, hk);
    pmat.size = lerp(3, 14, hk);
    // --- les personnages
    poseLena(ts, real);
    phone.visible = real || ts < 3.8; phone.material.emissiveIntensity = 0.7;
    const cOn = !real && ts < COFF + 0.6;
    crowd.update(cOn ? ts : -10, { light: 0.55, fogNear: 60, fogFar: 400 });
    crowd.flat.visible = cOn && ts < COFF + 0.3 && ts > C0 - 0.1;
    for (const p of crowd.real) { if (ts > COFF) p.pop(1 - (ts - COFF) / 0.4); if (p.root.visible) p.do({ Head: [['x', -0.25], ['y', 0.2 * Math.sin(ts * 0.5 + p.ta * 3)]] }); }
    // --- zoom pendant les arrêts
    camera.clearViewOffset();
    if (A) {
      camera.updateMatrixWorld(); tmp.copy(LENA.point(A.f.at < 40 ? 'lKnee' : 'chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, A.f.at < 40 ? 1.9 : 2.4, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    const filt = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : rods > 0 ? `saturate(${(1 - 0.85 * rods).toFixed(3)})` : '';
    HUD.flash(0);
    const high = !real && ts > RISE + 1.2 && ts < DOWN - 1.0;

    // --- textes
    HUD.hook(t, 'Et si on éteignait toutes les <em>lumières</em> de France ?', T.hookOut);
    const dd = Math.floor(clock / 86400), date = `${pad(2 + dd)}/08/2027`, cl = clock % 86400;
    const accel = !real && ts >= J + 7;
    HUD.live(t, high ? 'VUE AÉRIENNE' : 'PARIS · CHAMP-DE-MARS · CAM 01', high ? `${fr(Math.round(camera.position.y))} M D’ALTITUDE` : `${date} · ${pad(Math.floor(cl / 3600))}:${pad(Math.floor(cl / 60) % 60)}:${pad(Math.floor(cl) % 60)}${accel ? ' · ACCÉLÉRÉ' : ''}`, 'SIMULATION');
    const stars = 35 + (3000 - 35) * Math.pow(ad, 1.6);
    if (real) {
      HUD.block(1, { label: 'COMMUNES QUI ÉTEIGNENT', value: '12 000', sub: 'AU MILIEU DE LA NUIT', color: '#ffcf6b' });
      if (ts0 > 62.0) { HUD.block(2, { label: 'VOIE LACTÉE INVISIBLE', value: '60 %', sub: 'DES EUROPÉENS', color: '#ff9f0a' }); HUD.show2(true); } else HUD.show2(false);
    } else if (ts < M0) {
      HUD.block(1, { label: 'ÉTOILES VISIBLES', value: '30 à 40', sub: 'CIEL DE PARIS' }); HUD.show2(false);
    } else if (ts < J) {
      const N = Nat(ts);
      HUD.block(1, { label: 'LAMPADAIRES EN FRANCE', value: N >= LAMPS ? '11,6 millions' : fr(N), sub: 'ÉCLAIRAGE PUBLIC', color: N >= LAMPS ? '#ffcf6b' : '#fff' });
      if (ts >= 18.8) { const c = Math.ceil(J - ts); HUD.block(2, { label: 'EXTINCTION DANS', value: `${c} s`, sub: 'TOUTE LA FRANCE', color: '#ff9f0a' }); HUD.show2(true); }
      else HUD.show2(false);
    } else {
      HUD.block(1, { label: 'ÉTOILES VISIBLES', value: ad >= 0.999 ? '≈ 3 000' : fr(Math.round(stars / 5) * 5), sub: ad > 0.6 ? 'ET LA VOIE LACTÉE' : 'À L’ŒIL NU', color: ad > 0.6 ? '#9fd3ff' : '#fff' });
      if (ts < 29.6) { const pu = lerp(2, 8, sm(J + 0.2, J + 2.6, ts)); HUD.block(2, { label: 'TES PUPILLES', value: `${fr(pu, 1)} mm`, sub: 'ELLES S’OUVRENT', color: '#64d2ff' }); }
      else if (ts < 45.0) { const mn = Math.min(30, Math.round((clock - H23) / 60)); HUD.block(2, { label: 'TES YEUX DANS LE NOIR', value: `${mn} min`, sub: mn >= 20 ? 'VISION DE NUIT AU MAXIMUM' : 'ILS S’HABITUENT', color: mn >= 20 ? '#4cd964' : '#ffd60a' }); }
      else if (ts < 52.8) HUD.block(2, { label: 'MÉLATONINE', value: 'EN HAUSSE', sub: 'L’HORMONE DU SOMMEIL', color: '#4cd964' });
      else HUD.block(2, { label: 'ÉCLAIRAGE PUBLIC CETTE NUIT', value: '0 kWh', sub: 'D’HABITUDE : 7 MILLIONS', color: '#4cd964' });
      HUD.show2(true);
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    eq.opacity(real || A ? 0 : sm(14.8, 15.4, ts) * (1 - sm(COFF, COFF + 0.5, ts)));
    camera.updateMatrixWorld();
    HUD.reticle('you', LENA.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'LÉNA', (A || rwk || high || (ts > RISE && ts < DOWN + 0.4)) ? 0 : sm(3.6, 4.2, ts0) * (1 - sm(6.8, 7.0, ts0) * (1 - sm(18.0, 18.6, ts0))) * (1 - sm(FZ.realT(T.endCard) - 1, FZ.realT(T.endCard), t)), 100);
    camera.updateMatrixWorld();
    HUD.reticle('lamp', new THREE.Vector3(-3.5, 4.75, 3), camera, '1 LAMPADAIRE', real || A ? 0 : sm(M0 + 0.2, M0 + 0.6, ts) * (1 - sm(RISE - 0.2, RISE + 0.3, ts)), 90);
    HUD.subs(t, SUBS_V);
    insets.draw(t, INSETS);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : AFE · INSEE · SCIENTIFIC AMERICAN · JCEM 2011 · ANPCEN · FALCHI ET AL. 2016', q: 'Tu as déjà vu<br>la Voie lactée<br>de tes yeux ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.set(YOU.x + 1.2, 1.3, YOU.z + 3); camera.lookAt(YOU.x, 0.8, YOU.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), m0: FZ.realT(M0), m1: FZ.realT(M1), rise: FZ.realT(RISE), down: FZ.realT(DOWN),
    crowd: [FZ.realT(C0), FZ.realT(COFF)], off: FZ.realT(J), adapt: [FZ.realT(J), FZ.realT(AD1)], milky: FZ.realT(41.0), yawn: FZ.realT(45.2),
    clocks: [29.6, 33.4, 37.2, 41.0, 45.0, 48.8, 52.8].map(FZ.realT), rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard) }) };
}

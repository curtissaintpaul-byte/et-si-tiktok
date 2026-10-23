// =====================================================================
//  ÉPISODE : « Et si le Soleil s'éteignait ? » — un village de Provence, la place de l'église, en terrasse
//  Un seul personnage suivi : Chloé. Deux arrêts sur image (minuit le 1er jour, puis le 7e jour). Pas d'effet multiplication.
//  Faits (sources dans la légende ; calculs refaits en Python) :
//   - distance Terre-Soleil 149 597 871 km / 299 792 km/s = 499 s = 8 min 19 s (calcul).
//   - au sol, par beau temps, le Soleil apporte environ 1 000 W par m² (valeur de référence des panneaux solaires).
//   - la Lune ne fait que renvoyer la lumière du Soleil : elle s'éteint aussi (à ~1 seconde près).
//   - Jupiter : 5,2 UA du Soleil (43 min de lumière) + 4,2 à 6,2 UA de la Terre (35 à 52 min) → au moins 78 min (calcul).
//   - D. Stevenson (Caltech, « Question of the Month ») : en quelques jours à une semaine, la surface passe sous le point
//     de gel de l'eau de mer ; après environ un an, ~200 K (≈ −73 °C) ; le fond des océans ne gèle qu'après ~1 000 ans ;
//     quelques personnes pourraient survivre longtemps dans un abri creusé à plusieurs km sous terre.
//   - Popular Science (2013, d'après Stevenson) : en une semaine, la moyenne passe sous 0 °F (−18 °C) ; la photosynthèse
//     s'arrête tout de suite, la plupart des plantes meurent en quelques semaines, les grands arbres tiendraient des décennies.
//   - le froid : les vaisseaux de la peau se resserrent, le corps frissonne pour produire de la chaleur (Castellani & Young,
//     Autonomic Neuroscience 2016) ; sous ~15 °C de peau, les mains perdent leur dextérité (Heus, Daanen & Havenith,
//     Applied Ergonomics 1995) ; hypothermie = température du corps sous 35 °C (Brown et al., NEJM 2012).
//   - −18 °C avec un vent de 20 km/h → refroidissement éolien −28 °C (formule d'Environnement Canada, calcul) ;
//     de −28 à −39 : « la peau exposée peut geler en 10 à 30 minutes » (Environnement Canada).
//   - sans repère de lumière, l'horloge interne tourne sur environ 24 h 11 (24,18 h, Czeisler et al., Science 1999).
//   - le Soleil brillera encore environ 5 milliards d'années (NASA).
//   - 1816, « l'année sans été » après l'éruption du Tambora (avril 1815) : à Genève, juillet 1816 a été 5,4 °C plus froid
//     que la normale 1981-2010 (MétéoSuisse).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, makeMoon, M, add, box, cyl, HUD, sm, lerp, clamp, rng, dirAzEl, pad, keys, fr, dotTex, drawFrostLens } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { buildVillage } from '../../lib-village.js';
import { makeInsets } from '../../lib-insets.js';
import { insetList } from './insets.js';

const Q = new URLSearchParams(location.search);
// la partition (temps de SCÈNE)
const OFF = 11.0;          // 12 h 00 : le Soleil s'éteint (mais sa dernière lumière est encore en route)
const DARK = 19.0;         // 12 h 08 min 19 s : la dernière lumière arrive, nuit noire
const MOONOFF = 19.8;      // la Lune s'éteint (à une seconde près)
const LAMPS = 26.8;        // les réverbères s'allument
const JUP0 = 30.6, JUP1 = 34.0;   // Jupiter, puis elle s'éteint à son tour
const COLD = 34.4;         // le froid arrive : Chloé croise les bras
const COAT = 42.2;         // jour 2 : Chloé s'est couverte
const ICE = 49.8;          // jour 7 : −18 °C, la fontaine est gelée
const YEAR = 57.8;         // un an
const RW0 = 61.4, RW1 = 62.8;   // retour au réel
const sceneEnd = 75.0;
const T = { hookOut: 3.0, off: OFF, dark: DARK, rewind: RW0, real: RW1, endCard: 71.0, duration: sceneEnd };
const SUBS = [
  [3.2, 6.8, 'Midi, un village de Provence. Chloé déjeune en terrasse, au soleil.'],
  [7.0, 10.6, 'Sur chaque mètre carré, le Soleil envoie environ 1 000 watts. Un radiateur.'],
  [10.8, 14.4, 'À 12 h pile, le Soleil s’éteint. Chloé ne s’en rend pas compte.'],
  [14.6, 18.6, 'Normal : sa dernière lumière met 8 minutes et 19 secondes pour arriver jusqu’ici.'],
  [19.2, 22.8, '12 h 08. D’un coup, la nuit. En plein midi.'],
  [23.0, 26.6, 'La Lune s’éteint aussi : elle ne fait que renvoyer la lumière du Soleil.'],
  [26.8, 30.4, 'Les réverbères s’allument. Les étoiles, elles, brillent toujours : ce sont d’autres soleils.'],
  [30.6, 34.2, 'Jupiter brille encore plus d’une heure : sa lumière vient de bien plus loin.'],
  [34.4, 38.0, 'Les plantes arrêtent tout de suite de fabriquer leur nourriture.'],
  [38.2, 41.8, 'Minuit. Il fait 4 °C, et Chloé est en tenue d’été.'],
  [42.2, 45.8, 'Jour 2. Il gèle, et ça ne remontera plus jamais.'],
  [46.0, 49.6, 'Sans lumière, son horloge interne dérive : ses journées durent 24 h 11.'],
  [49.8, 53.4, 'Jour 7. En moyenne sur Terre, il fait moins de −18 °C.'],
  [53.8, 57.6, 'Les océans gèlent en surface. Mais dessous, l’eau reste liquide pendant des siècles.'],
  [57.8, 61.2, 'Dans un an, −73 °C. Pour survivre, il faudrait vivre à des kilomètres sous terre.'],
  [63.2, 66.8, 'En vrai, le Soleil ne peut pas s’éteindre d’un coup. Il brillera encore 5 milliards d’années.'],
  [67.0, 70.8, 'Mais en 1816, un volcan a voilé le ciel, et l’Europe a vécu une année sans été.'],
];
// l'horloge (secondes depuis le 23/10 à minuit), selon le temps de scène
const NOON = 12 * 3600, DAY = 86400;
const CLK = [[OFF, NOON], [DARK, NOON + 499], [LAMPS, NOON + 720], [JUP0, NOON + 1800], [JUP1, NOON + 80 * 60], [COLD, NOON + 2 * 3600], [38.2, NOON + 6 * 3600],
  [41.8, DAY], [COAT, DAY + NOON], [46.0, DAY + NOON + 3 * 3600], [ICE, 6 * DAY + NOON], [53.8, 6 * DAY + NOON + 3600], [YEAR, 30 * DAY + NOON], [RW0, 365 * DAY + NOON]];
const clockAt = (ts) => (ts < OFF ? NOON - OFF + ts : keys(CLK, ts));
// la température de l'air (simulation : valeurs approximatives, calées sur Caltech / Popular Science aux étapes clés)
const TEMP = [[0, 22], [DARK, 22], [LAMPS, 21], [JUP1, 17], [38.2, 9], [41.8, 4], [COAT, -3], [46.0, -6], [ICE, -18], [53.8, -19], [YEAR, -35], [RW0, -73]];

export default async function () {
  const insets = makeInsets();
  drawFrostLens();
  const stage = createStage({ fov: 64, far: 3000, bloom: [0.24, 0.42, 0.9], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffc94a');
  const R = rng(1815);

  // -------------------------------------------------------------------
  // LE DÉCOR : la place du village, un midi d'octobre ; le Soleil est devant la caméra, haut à gauche
  // -------------------------------------------------------------------
  const SUN_DIR = dirAzEl(8, 23), MOON_DIR = dirAzEl(-10, 25), JUP_DIR = dirAzEl(12, 29);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.03, 0.12, 0.40], dayHor: [0.36, 0.48, 0.62], stars: 0, milky: 0.7, milkyAxis: new THREE.Vector3(0.7, 0.4, 0.4) });
  const sunSprite = makeSun(scene, SUN_DIR, 70);
  const moon = makeMoon(scene, MOON_DIR, 26);
  const jup = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3.2, 2.9, 2.4), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  jup.scale.setScalar(5); scene.add(jup);
  const FOG_DAY = new THREE.Color('#bccbd8'), FOG_NIGHT = new THREE.Color('#06080d'), FOG_ICE = new THREE.Color('#0a0f18');
  scene.fog = new THREE.Fog(FOG_DAY.clone(), 160, 1300);
  const V = buildVillage(scene, { R, groundColor: '#8a9a62', fgTable: false });
  const sun = new THREE.DirectionalLight('#fff0d8', 3.4);
  sun.position.copy(SUN_DIR).multiplyScalar(120); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 10, far: 300 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c4dcff', '#8f7f66', 0.85); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // la table de Chloé au premier plan (face à la caméra)
  const TAB = new THREE.Vector3(1.55, 0, 12.4);
  const tableG = new THREE.Group(); tableG.position.copy(TAB); scene.add(tableG);
  cyl(0.42, 0.42, 0.04, 14, M('#d8d4cc', { r: 0.4, nc: true }), tableG, 0, 0.75, 0); cyl(0.04, 0.04, 0.72, 6, M('#2a2a2a', { nc: true }), tableG, 0, 0.38, 0); cyl(0.24, 0.24, 0.03, 10, M('#2a2a2a', { nc: true }), tableG, 0, 0.02, 0);
  cyl(0.13, 0.13, 0.015, 18, M('#f6f4ef', { r: 0.3, nc: true }), tableG, -0.08, 0.775, 0.12);               // l'assiette
  cyl(0.035, 0.03, 0.12, 10, M('#d9e7ee', { r: 0.1, nc: true }), tableG, 0.18, 0.83, 0.05);                  // le verre d'eau
  const chair = new THREE.Group(); chair.position.set(TAB.x - 0.75, 0, TAB.z - 0.05); chair.rotation.y = 0.35; scene.add(chair);
  { const rat = M('#b08a5a', { nc: true }); box(0.42, 0.05, 0.42, rat, chair, 0, 0.45, 0); box(0.42, 0.48, 0.05, rat, chair, 0, 0.7, -0.2);
    for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.04, 0.45, 0.04, M('#2a2a2a', { nc: true }), chair, a, 0.22, b); }
  chair.traverse((o) => { if (o.isMesh) o.castShadow = true; }); tableG.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // -------------------------------------------------------------------
  // CHLOÉ (deux tenues : en t-shirt, puis couverte) et son téléphone (lampe torche)
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer);
  const SEAT = new THREE.Vector3(TAB.x - 0.75, 0, TAB.z + 0.02);
  const C1 = PEOPLE.make({ outfit: 7, shadows: true }), C2 = PEOPLE.make({ outfit: 2, shadows: true });
  for (const P of [C1, C2]) { P.root.position.copy(SEAT); P.root.rotation.y = 0.35; scene.add(P.root); }
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.3, emissive: new THREE.Color('#dfe8ff'), emissiveIntensity: 0.0 }));
  C1.attach(phone, 'rHand', { dz: 0.04, dy: -0.02 });
  const torch = new THREE.SpotLight('#eef3ff', 0, 14, 0.6, 0.6, 1.5); scene.add(torch, torch.target);
  // la buée (le souffle dans le froid)
  const puffs = [...Array(6)].map((_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#e8eef6', transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); return s; });

  const scale = (spec, k) => { const o = {}; for (const n in spec) o[n] = spec[n].map(([a, v]) => [a, v * k]); return o; };
  const SIT = { LeftUpLeg: [['x', -1.5]], RightUpLeg: [['x', -1.5]], LeftLeg: [['x', 1.5]], RightLeg: [['x', 1.5]], LeftForeArm: [['x', -0.6]], RightForeArm: [['x', -0.6]],
    LeftArm: [['x', -0.55]], RightArm: [['x', -0.55]] };   // assise, les avant-bras sur la table
  const PHONE = (k) => ({ RightArm: [['x', -1.6 * k], ['z', 0.55 * k]], RightForeArm: [['x', -0.5 * k]], Head: [['x', -0.25 * k]] });   // le bras levé, la lampe vers le ciel
  const HUG = (k) => ({ LeftArm: [['x', -0.7 * k], ['z', -0.25 * k]], RightArm: [['x', -0.7 * k], ['z', 0.25 * k]], LeftForeArm: [['x', -0.3 * k], ['y', -1.6 * k]], RightForeArm: [['x', -0.3 * k], ['y', 1.6 * k]], Spine: [['x', 0.12 * k]], Head: [['x', 0.12 * k]] });
  const HANDS = (k) => ({ RightArm: [['x', -0.75 * k], ['z', 0.3 * k]], RightForeArm: [['x', -1.9 * k], ['y', 0.5 * k]], LeftArm: [['x', -0.75 * k], ['z', -0.3 * k]], LeftForeArm: [['x', -1.9 * k], ['y', -0.5 * k]], Spine: [['x', 0.15 * k]], Head: [['x', 0.2 * k]] });   // souffler dans ses mains
  function poseChloe(ts, real) {
    const coat = false;
    C1.root.visible = !coat; C2.root.visible = coat;
    const P = coat ? C2 : C1;
    P.inner.position.set(0, 0, 0);
    const sitK = real ? 1 : 1 - sm(19.7, 20.8, ts);
    if (sitK > 0.001) {
      const sunUp = real ? 1 : sm(6.8, 7.8, ts) * (1 - sm(10.4, 11.2, ts));   // elle lève le visage vers le soleil
      const startle = real ? 0 : sm(19.15, 19.5, ts);
      P.do(scale(SIT, sitK), { Head: [['x', -0.45 * sunUp - 0.35 * startle], ['y', 0.12 * Math.sin(ts * 0.7) * (1 - sunUp)]] });
      P.inner.position.set(0, -0.42 * sitK, -0.12 * sitK);
      return P;
    }
    const shiver = ts > COLD ? 0.025 * Math.sin(ts * 47) * sm(COLD, COLD + 2, ts) : 0;
    if (ts < COLD) { const k = sm(21.0, 22.0, ts) * (1 - sm(33.6, 34.4, ts)); P.do(PHONE(k), { Head: [['x', -0.45 * (1 - k * 0.4)], ['y', 0.3 * Math.sin(ts * 0.45)]] }); return P; }
    if (ts < COAT) { const k = sm(COLD + 0.2, COLD + 1.2, ts); P.do(HUG(k), { Spine: [['y', shiver]], Head: [['y', 0.2 * Math.sin(ts * 0.5)]] }); return P; }
    const b = 0.5 + 0.5 * Math.sin(ts * 1.6);   // elle souffle dans ses mains, puis les baisse un peu
    P.do(HANDS(0.75 + 0.25 * b), { Spine: [['y', shiver]], Head: [['x', 0.1]] });
    return P;
  }

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0) => () => (C2.root.visible ? C2 : C1).point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ = makeFreeze([
    { at: 41.6, dur: 5.0, title: 'ARRÊT SUR IMAGE · MINUIT, 4 °C', tags: [
      { at: pt('chest'), title: 'PEAU', lines: ['tes vaisseaux se resserrent :', 'le sang garde ton cœur au chaud'], risk: 'bof', side: 'left', dy: -40 },
      { at: pt('lHand'), title: 'MAINS', lines: ['sous 15 °C de peau,', 'tes doigts deviennent maladroits'], risk: 'mal', side: 'right', dy: -60 },
      { at: pt('belly'), title: 'MUSCLES', lines: ['tu frissonnes :', 'tes muscles fabriquent de la chaleur'], risk: 'bof', side: 'left', dy: 220 } ] },
    { at: 53.5, dur: 5.0, title: 'ARRÊT SUR IMAGE · JOUR 7, −18 °C', tags: [
      { at: pt('nose'), title: 'VISAGE', lines: ['avec le vent, ressenti −28 °C :', 'la peau nue gèle en 10 à 30 min'], risk: 'grave', side: 'right', dy: -80 },
      { at: pt('heart'), title: 'CORPS', lines: ['sous 35 °C à l’intérieur,', 'c’est l’hypothermie'], risk: 'mal', side: 'left', dy: 40 },
      { at: pt('head', 0.06), title: 'CERVEAU', lines: ['sans jour ni nuit,', 'il ne sait plus quand dormir'], risk: 'info', side: 'right', dy: 170 } ] },
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
  const W = 720, H = 1280, tmp = new THREE.Vector3(), c0 = new THREE.Color();
  const ICEC = new THREE.Color('#dfeaf2'), WATERC = new THREE.Color('#5f93a8');
  const fmtT = (v) => `${v < 0 ? '−' : ''}${fr(Math.abs(Math.round(v)))} °C`;

  function update(t) {
    const ts0 = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts0 >= RW0 && ts0 < RW1 ? (ts0 - RW0) / (RW1 - RW0) : 0;
    const real = ts0 >= RW0 + 0.7;                              // après le rembobinage : un midi ordinaire, au soleil
    const ts = real ? 4.0 + (ts0 - RW1) * 0.3 : ts0;
    const clock = real ? NOON + 600 + (ts0 - RW1) : clockAt(ts);
    // --- jour / nuit
    const day = real ? 1 : 1 - sm(DARK - 0.04, DARK + 0.04, ts);
    const dusk = real ? 0 : sm(DARK, DARK + 0.7, ts);           // l'œil (et la caméra) s'habituent un peu
    const lampsOn = real ? 0 : sm(LAMPS, LAMPS + 0.25, ts) * (Math.sin(ts * 70) > -0.6 || ts > LAMPS + 0.8 ? 1 : 0.3);
    const cold = real ? 0 : sm(COAT, ICE + 1.5, ts);            // le givre
    const yr = real ? 0 : sm(YEAR, YEAR + 2.5, ts);             // l'année : tout est blanc et noir
    sky.u.uDay.value = day; sky.u.uSunGlow.value = day;
    sky.u.uStars.value = 2.2 * (1 - day) * (1 - 0.35 * lampsOn); sky.u.uStarThr.value = 0.95;
    sunSprite.visible = day > 0.01; sunSprite.material.opacity = day;
    moon.visible = !real ? ts < MOONOFF : true; moon.material.opacity = real ? 0.35 : ts < DARK ? 0.35 : 1;
    jup.visible = !real && ts > DARK && ts < JUP1 + 0.25; jup.material.opacity = 1 - sm(JUP1 - 0.1, JUP1 + 0.25, ts);
    sun.intensity = 3.4 * day; hemi.intensity = lerp(0.11, 0.85, day); hemi.color.set(day > 0.5 ? '#c4dcff' : '#6d7aa0'); hemi.groundColor.set(day > 0.5 ? '#8f7f66' : '#2c2a2c');
    scene.environmentIntensity = lerp(0.03, 0.25, day);
    c0.copy(FOG_NIGHT).lerp(FOG_ICE, cold).lerp(FOG_DAY, day); scene.fog.color.copy(c0); sky.u.uNightHor.value.setRGB(0.006 + 0.01 * cold, 0.008 + 0.012 * cold, 0.016 + 0.02 * cold);
    V.lamps.forEach((L) => { L.glass.emissiveIntensity = 2.4 * lampsOn; L.light.intensity = 3.4 * lampsOn; L.light.visible = L.light.intensity > 0; });
    V.winLit.forEach((m, i) => { m.emissiveIntensity = 1.2 * lampsOn * (i === 1 ? 0.8 : 1) * (1 - 0.6 * yr); });
    V.waterMat.color.copy(WATERC).lerp(ICEC, cold); V.waterMat.emissiveIntensity = 0.4 * (1 - cold); V.waterMat.roughness = lerp(0.15, 0.6, cold);
    renderer.toneMappingExposure = lerp(1.0, 1.55, (1 - day) * dusk);
    // --- Chloé
    const P = poseChloe(ts, real);
    const pOn = !real && ts > 21.0 && ts < COLD;
    phone.visible = pOn || (!real && ts < 3.0); phone.material.emissiveIntensity = pOn ? 3.0 : 0.6;
    torch.intensity = pOn ? 22 * sm(21.4, 21.8, ts) : 0; torch.visible = torch.intensity > 0;
    if (torch.visible) { phone.getWorldPosition(torch.position); torch.target.position.copy(torch.position).add(new THREE.Vector3(0.3, 4, -3)); }
    // la buée (dès qu'il fait moins de ~5 °C)
    const temp = real ? 22 : keys(TEMP, ts);
    const mouth = P.point('mouth');
    puffs.forEach((s, i) => { const u = ((ts * 0.45 + i / puffs.length) % 1); const on = !real && temp < 5 && !A ? 1 : 0;
      s.visible = on > 0; s.position.copy(mouth).add(new THREE.Vector3(0.06 + u * 0.12, 0.02 + u * 0.1, 0.14 + u * 0.32)); s.scale.setScalar(0.04 + u * 0.16); s.material.opacity = on * 0.14 * Math.sin(Math.PI * u); });
    // --- la caméra (fixe), avec le zoom pendant les arrêts
    camera.position.copy(CAM); camera.lookAt(LOOK); camera.fov = 64;
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    for (const s of [sunSprite, moon]) s.follow(camera);
    jup.position.copy(JUP_DIR).multiplyScalar(820).add(camera.position);
    if (A) {
      tmp.copy(P.point('chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, 2.3, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    HUD.frost(real ? 0 : 0.6 * cold);
    HUD.flash(0);
    const filt = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : yr > 0 ? `saturate(${(1 - 0.5 * yr).toFixed(3)})` : '';

    // --- textes
    HUD.hook(t, 'Et si le <em>Soleil</em> s’éteignait ?', T.hookOut);
    const dd = Math.floor(clock / DAY), cl = clock % DAY;
    const dt = new Date(Date.UTC(2026, 9, 23 + dd)), date = `${pad(dt.getUTCDate())}/${pad(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
    const accel = !real && ((ts > OFF && ts < DARK) || ts > LAMPS);
    HUD.live(t, 'PROVENCE · PLACE DU VILLAGE · CAM 01', `${!real && dd >= 1 ? `JOUR ${dd + 1} · ` : `${date} · `}${pad(Math.floor(cl / 3600))}:${pad(Math.floor(cl / 60) % 60)}:${pad(Math.floor(cl) % 60)}${accel ? ' · ACCÉLÉRÉ' : ''}`, 'SIMULATION');
    if (real) {
      HUD.block(1, { label: 'LE SOLEIL BRILLERA ENCORE', value: '5 milliards d’années', sub: 'ENVIRON (NASA)', color: '#ffc94a', scale: 0.62 });
      if (ts0 > 67.0) { HUD.block(2, { label: 'JUILLET 1816 À GENÈVE', value: '−5,4 °C', sub: 'SOUS LA NORMALE (MÉTÉOSUISSE)', color: '#64d2ff' }); HUD.show2(true); } else HUD.show2(false);
    } else {
      HUD.block(1, { label: 'TEMPÉRATURE · ICI', value: fmtT(temp), sub: ts < DARK ? 'EN PLEIN SOLEIL' : 'SIMULATION · VALEURS APPROCHÉES', color: temp > 15 ? '#ffc94a' : temp > 0 ? '#fff' : temp > -30 ? '#9fd3ff' : '#64d2ff' });
      if (ts < OFF) HUD.block(2, { label: 'SOLEIL REÇU AU SOL', value: '≈ 1 000 W/m²', sub: 'UN RADIATEUR PAR MÈTRE CARRÉ', color: '#ffc94a' });
      else if (ts < DARK) { const s = Math.max(0, Math.ceil(499 - (clock - NOON))); HUD.block(2, { label: 'SA DERNIÈRE LUMIÈRE ARRIVE DANS', value: `${Math.floor(s / 60)} min ${pad(s % 60)} s`, sub: 'LE SOLEIL EST DÉJÀ ÉTEINT', color: '#ff9f0a' }); }
      else if (ts < JUP0) HUD.block(2, { label: 'SOLEIL REÇU AU SOL', value: '0 W/m²', sub: 'PLUS RIEN', color: '#ff3b30' });
      else if (ts < COLD) HUD.block(2, { label: 'JUPITER', value: ts < JUP1 ? 'ENCORE VISIBLE' : 'ÉTEINTE', sub: 'SA LUMIÈRE : PLUS DE 78 MIN DE TRAJET', color: ts < JUP1 ? '#ffd60a' : '#ff3b30', scale: 0.7 });
      else if (ts < COAT) HUD.block(2, { label: 'PLANTES', value: 'PHOTOSYNTHÈSE : 0', sub: 'LES GRANDS ARBRES TIENDRAIENT DES DÉCENNIES', color: '#ff9f0a', scale: 0.62 });
      else if (ts < ICE) HUD.block(2, { label: 'TON HORLOGE INTERNE', value: '24 h 11', sub: 'SANS LUMIÈRE, ELLE DÉRIVE', color: '#ffd60a' });
      else if (ts < YEAR) HUD.block(2, { label: 'RESSENTI AVEC LE VENT', value: '−28 °C', sub: 'PEAU NUE : GEL EN 10 À 30 MIN', color: '#ff3b30' });
      else HUD.block(2, { label: 'POUR SURVIVRE', value: 'SOUS TERRE', sub: 'À DES KILOMÈTRES DE PROFONDEUR', color: '#ff9f0a', scale: 0.8 });
      HUD.show2(true);
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', P.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'CHLOÉ', (A || rwk) ? 0 : sm(3.6, 4.2, ts0) * (1 - sm(6.6, 7.0, ts0)), 100);
    HUD.reticle('sun', sunSprite.position.clone(), camera, 'LE SOLEIL', real || A ? 0 : sm(11.0, 11.4, ts) * (1 - sm(18.6, 19.0, ts)), 110);
    HUD.reticle('jup', jup.position.clone(), camera, 'JUPITER', real || A ? 0 : sm(JUP0, JUP0 + 0.4, ts) * (1 - sm(JUP1 - 0.2, JUP1 + 0.2, ts)), 60);
    HUD.subs(t, SUBS_V);
    insets.draw(t, INSETS);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : CALTECH · NASA · POPULAR SCIENCE · SCIENCE 1999 · NEJM 2012 · ENVIRONNEMENT CANADA · MÉTÉOSUISSE', q: 'Tu tiendrais<br>combien de jours<br>sans Soleil ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.set(SEAT.x + 0.8, 1.3, SEAT.z + 2.6); camera.lookAt(SEAT.x, 0.8, SEAT.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), off: FZ.realT(OFF), dark: FZ.realT(DARK), lamps: FZ.realT(LAMPS), jup1: FZ.realT(JUP1),
    cold: FZ.realT(COLD), coat: FZ.realT(COAT), ice: FZ.realT(ICE), year: FZ.realT(YEAR), clocks: [LAMPS, COLD, 38.2, COAT, 46.0, ICE, 53.8, YEAR].map(FZ.realT),
    rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard) }) };
}

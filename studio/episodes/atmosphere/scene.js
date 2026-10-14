// =====================================================================
//  ÉPISODE : « Et si l'atmosphère disparaissait d'un coup ? » — Paris, jardins du Trocadéro, bassin de Varsovie
//  Point de vue : toi, au bord du bassin, face à la caméra de surveillance. La tour Eiffel au fond.
//  Faits (sources dans la légende) :
//   - pression normale ≈ 1 013 hPa = 101 325 Pa → 101 325 / 9,81 ≈ 10 330 kg sur chaque m² (« plus de 10 tonnes »).
//   - sans air, plus de diffusion de la lumière (diffusion de Rayleigh) : le ciel est noir même de jour ; plus de son (pas de milieu).
//   - sous 6,3 kPa (limite d'Armstrong, ≈ 19 km), l'eau bout à 37 °C : salive, larmes, liquide des poumons bouillent ;
//     le sang dans les vaisseaux, lui, ne bout pas (Wikipédia « Armstrong limit », d'après G. Landis et la NASA).
//   - l'air des poumons sort tout seul ; retenir sa respiration peut déchirer les poumons (NASA, Ask an Astrophysicist).
//   - perte de connaissance en une dizaine de secondes (revue de 2013 citée par Live Science ; LeBlanc vers 15 s).
//   - gonflement des tissus par la vapeur (ébullisme), la peau tient : on n'explose pas (NASA ; Bioastronautics Data Book).
//   - l'évaporation refroidit le nez et la bouche presque jusqu'à geler ; le reste du corps refroidit lentement (Live Science, NASA).
//   - chiens remis sous pression vers 90 s : ils survivaient (NASA CR-1223, 1968) ; humain : mort probable en moins de 2 min
//     (Dr Kris Lehnhardt, NASA, dans Live Science).
//   - l'eau de la fontaine (~15 °C, pression de vapeur ≈ 1,7 kPa > 0) bout sans chauffer, puis l'évaporation la refroidit et elle gèle.
//   - 14/12/1966 : Jim LeBlanc, technicien de la NASA, combinaison dépressurisée dans une chambre à vide ; il sent sa salive bouillir,
//     s'évanouit, survit avec seulement mal aux oreilles (Live Science ; Xataka).
//   - la gravité de la Terre retient son atmosphère.
// =====================================================================
import { THREE, createStage, makeSky, M, box, cyl, bake, HUD, sm, lerp, clamp, rng, dirAzEl, pad, keys, fr, dotTex, canvasTex } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { buildEiffel } from '../../lib-eiffel.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const Q = new URLSearchParams(location.search);
const E0 = 15.0;                               // l'air disparaît (temps de scène)
const RW0 = 47.6, RW1 = 49.0;                  // « retour au réel » (on rembobine)
const sceneEnd = 63.6;
const T = { hookOut: 3.0, event: E0, rewind: RW0, real: RW1, endCard: 59.6, duration: sceneEnd };
// secondes réellement passées sans air, selon le temps de scène (temps réel, puis accéléré)
const SK = [[E0, 0], [27.5, 12.5], [29.0, 16], [40.0, 60], [44.0, 100], [47.2, 120]];
const secs = (ts) => (ts < E0 ? -1 : ts >= RW0 ? -1 : Math.min(120, keys(SK, ts)));
const SUBS = [
  [3.2, 6.8, 'Paris, le Trocadéro. Un samedi au soleil.'],
  [7.0, 10.6, 'Au-dessus de toi, l’air pèse plus de 10 tonnes sur chaque mètre carré.'],
  [10.8, 14.6, 'Tu ne le sens pas : ton corps pousse aussi fort de l’intérieur.'],
  [15.0, 17.8, 'Et si, d’un coup, tout cet air disparaissait ?'],
  [18.0, 20.6, 'Le ciel devient noir en plein jour. Et plus aucun bruit.'],
  [20.8, 22.5, 'L’air de tes poumons sort tout seul.'],
  [22.9, 25.6, 'Sans pression, l’eau bout à la température de ton corps.'],
  [25.8, 28.6, 'Au bout d’environ 10 secondes, tu perds connaissance.'],
  [28.8, 31.9, 'Autour de toi, tout le monde s’écroule.'],
  [32.1, 35.6, 'L’eau de la fontaine bout sans chauffer. Puis elle gèle.'],
  [35.8, 39.7, 'Ton corps gonfle. Mais ta peau tient : tu n’exploses pas.'],
  [40.2, 43.6, 'Des chiens testés par la NASA survivaient si l’air revenait avant 90 s.'],
  [43.8, 47.4, 'Pour un humain, la mort arriverait sans doute avant 2 minutes.'],
  [49.2, 51.8, 'Rassure-toi : la gravité de la Terre retient son air.'],
  [52.0, 55.6, 'En 1966, un technicien de la NASA a perdu l’air de sa combinaison.'],
  [55.8, 59.4, 'Il a senti sa salive bouillir, s’est évanoui… et s’en est sorti.'],
];

export default async function () {
  const insets = makeInsets();   // les vignettes (archives)
  const stage = createStage({ fov: 62, far: 4000, bloom: [0.16, 0.4, 0.93], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 0.98;
  document.documentElement.style.setProperty('--accent', '#8fd3ff');
  const R = rng(1966);
  const SUN_DIR = dirAzEl(150, 34);   // soleil d'après-midi, derrière la caméra à droite
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.03, 0.12, 0.40], dayHor: [0.42, 0.54, 0.68], stars: 0, sunGlow: 0.3 });
  const FOG_DAY = new THREE.Color('#b9c6d4'), FOG_VAC = new THREE.Color('#05060a');
  scene.fog = new THREE.Fog(FOG_DAY.clone(), 300, 2600);
  const sun = new THREE.DirectionalLight('#fff2e0', 2.8); sun.position.copy(SUN_DIR).multiplyScalar(120); sun.target.position.set(0, 0, -6);
  sun.position.add(sun.target.position);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 20, far: 300 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c6d6ea', '#7d7466', 1.0); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;

  // -------------------------------------------------------------------
  // LE DÉCOR : le bassin de Varsovie, les pelouses, la Seine, la tour Eiffel (≈ 550 m)
  // -------------------------------------------------------------------
  const deco = new THREE.Group();
  const BW = 46, BZ0 = -1, BZ1 = -150;                 // le bassin : 46 m de large, de z = -1 à -150
  box(400, 0.2, 260, M('#b8ab97'), deco, 0, -0.1, -40);                                    // les allées (pierre claire)
  for (const sx of [-1, 1]) {
    box(60, 0.25, 190, M('#6f8d4c'), deco, sx * (BW / 2 + 14 + 30), 0.0, -60);              // les pelouses
    for (let i = 0; i < 16; i++) {                                                         // les alignements d'arbres
      const x = sx * (BW / 2 + 9 + (i % 2) * 34), z = 8 - i * 12;
      cyl(0.18, 0.25, 3.2, 6, M('#5a4636'), deco, x, 1.6, z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), M('#4d6b3a')); crown.position.set(x, 4.8, z); crown.scale.set(1, 1.15, 1); crown.castShadow = true; deco.add(crown);
    }
  }
  // la margelle du bassin (pierre), et le fond
  box(BW + 1.2, 0.45, 0.6, M('#d8ccb6'), deco, 0, 0.22, BZ0 + 0.3);
  for (const sx of [-1, 1]) box(0.6, 0.45, BZ0 - BZ1, M('#d8ccb6'), deco, sx * (BW / 2 + 0.3), 0.22, (BZ0 + BZ1) / 2);
  box(BW, 0.1, BZ0 - BZ1, M('#4f6a72'), deco, 0, -0.6, (BZ0 + BZ1) / 2);
  // l'escalier / le parapet au bout, puis la Seine et le pont d'Iéna
  box(140, 1.2, 4, M('#cfc2aa'), deco, 0, 0.6, BZ1 - 2);
  box(900, 0.3, 70, M('#3f5d6e', { r: 0.3 }), deco, 0, -6, -250);
  box(36, 2, 80, M('#d4c7ae'), deco, 0, -1.5, -250);
  // les lampadaires (réverbères parisiens)
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
    const x = sx * (BW / 2 + 3), z = 4 - i * 26;
    cyl(0.07, 0.11, 4.2, 6, M('#20262b'), deco, x, 2.1, z); box(0.35, 0.5, 0.35, M('#2a3036'), deco, x, 4.4, z);
  }
  // des bancs
  for (const [x, z] of [[-9, 4.5], [9.5, 4.5]]) { box(2.2, 0.08, 0.5, M('#6b4a32'), deco, x, 0.46, z); box(2.2, 0.5, 0.06, M('#6b4a32'), deco, x, 0.75, z - 0.25); box(0.08, 0.44, 0.45, M('#2a2a2a'), deco, x - 0.95, 0.22, z); box(0.08, 0.44, 0.45, M('#2a2a2a'), deco, x + 0.95, 0.22, z); }
  // les immeubles de la rive gauche, au loin (façades simples)
  for (let i = 0; i < 26; i++) {
    const sx = i % 2 ? 1 : -1, x = sx * (140 + R() * 260), z = -330 - R() * 500, h = 18 + R() * 10, w = 30 + R() * 40;
    box(w, h, 24, M(['#e4d6bc', '#d9cbb0', '#ece0c8'][i % 3]), deco, x, h / 2 - 4, z); box(w + 1, 3, 25, M('#7b8188'), deco, x, h - 2.5, z);
  }
  // le Champ-de-Mars et les arbres autour de la tour
  box(260, 0.3, 700, M('#6a8a4a'), deco, 0, -3.8, -900);
  for (let i = 0; i < 60; i++) { const x = (R() - 0.5) * 300, z = -320 - R() * 380; if (Math.abs(x) < 70 && z < -460 && z > -650) continue;
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(5 + R() * 3, 1), M('#4a6636')); c.position.set(x, 2 + R() * 2, z); deco.add(c); }
  scene.add(bake(deco));
  const { tower } = buildEiffel(scene, new THREE.Vector3(0, -4, -560));

  // -------------------------------------------------------------------
  // L'EAU DU BASSIN (elle bout, puis elle gèle) et les jets
  // -------------------------------------------------------------------
  const waterMat = new THREE.MeshStandardMaterial({ color: '#3d7790', roughness: 0.12, metalness: 0.05 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(BW, BZ0 - BZ1), waterMat); water.rotation.x = -Math.PI / 2; water.position.set(0, 0.05, (BZ0 + BZ1) / 2); water.receiveShadow = true; scene.add(water);
  const WCOL = new THREE.Color('#3d7790'), ICE = new THREE.Color('#b9d0dd');
  // les jets : des gouttes en paraboles (même t = même image)
  const JETS = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) JETS.push({ x: sx * 7, z: -10 - i * 11, h: 5 + (i % 3) * 1.5 });
  for (let i = 0; i < 4; i++) JETS.push({ x: 0, z: -30 - i * 28, h: 11 });
  const PER = 150, NJ = JETS.length * PER;
  const jg = new THREE.BufferGeometry(); jg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NJ * 3), 3));
  const jm = new THREE.PointsMaterial({ map: dotTex(), size: 0.3, color: '#e8f3fa', transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true });
  const jp = new THREE.Points(jg, jm); jp.frustumCulled = false; scene.add(jp);
  const JR = Array.from({ length: NJ }, () => [R(), R(), R()]);
  // les bulles (ébullition), qui éclatent sur toute la surface
  const NB = 2200, bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NB * 3), 3));
  const bm = new THREE.PointsMaterial({ map: dotTex(), size: 0.16, color: '#f4fbff', transparent: true, opacity: 0.9, depthWrite: false });
  const bp = new THREE.Points(bg, bm); bp.frustumCulled = false; scene.add(bp);
  const BR = Array.from({ length: NB }, () => [(R() - 0.5) * (BW - 1), BZ0 - 0.5 - Math.pow(R(), 1.6) * (BZ0 - BZ1 - 2), R(), 0.5 + R()]);

  // -------------------------------------------------------------------
  // LES PERSONNAGES (réalistes) : toi, et les gens autour du bassin
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer);
  function person(outfit, x, z, yaw, o = {}) {
    const P = PEOPLE.make({ outfit, shadows: true }); const pivot = new THREE.Group(); pivot.add(P.root); P.root.rotation.y = yaw; scene.add(pivot);
    const base = P.body.scale.x;
    return { P, pivot, x, z, yaw, base, ...o };
  }
  const YOU = person(3, 0.8, 1.2, 0.12, { down: 11.0, side: -1 });            // toi : au bord du bassin, face à la caméra
  const others = [
    person(1, 4.5, 5.0, -1.57, { walk: [4.5, -0.45], down: 12.6, side: -1 }),   // passe au premier plan, vers la gauche
    person(6, -4, 0.7, 1.57, { walk: [-7.65, 0.45], down: 13.4, side: 1 }),     // longe le bassin, vers la droite
    person(4, -2.7, -0.55, 0.25, { sitting: true, down: 12.0, side: -1 }),       // assis sur la margelle
    person(7, -1.9, -0.55, -0.1, { sitting: true, down: 14.2, side: 1 }),
    person(2, 3.4, -0.1, 2.6, { photo: true, down: 13.0, side: -1 }),             // prend la tour en photo (de dos)
    person(0, 3.6, 3.8, -0.4, { down: 12.2, side: 1 }),
  ];
  const ALL = [YOU, ...others];
  // la pose de chacun à un instant : wt = temps « de la vie normale » (pour marcher), s = secondes sans air (-1 si l'air est là)
  function pose(H, wt, s) {
    const { P, pivot } = H;
    let x = H.x, z = H.z;
    if (H.walk) { x = H.walk[0] + H.walk[1] * ((wt % 40)); }
    const k = s < 0 ? 0 : clamp((s - H.down) / 1.3);           // l'évanouissement : les genoux lâchent, puis on tombe
    const swell = s < 0 ? 0 : sm(4, 70, s);
    P.body.scale.set(H.base * (1 + 0.1 * swell), H.base, H.base * (1 + 0.12 * swell));
    if (k <= 0) {
      if (s >= 0) {   // l'air est parti : on porte les mains à la gorge, on vacille
        const g = sm(0.6, 2.5, s), ph = s * 7 + H.x;
        const spec = { Spine: [['x', 0.12 * g]], Head: [['x', -0.15 * g + 0.04 * Math.sin(ph)]], LeftArm: [['x', -1.0 * g], ['y', -0.4 * g]], RightArm: [['x', -1.0 * g], ['y', 0.4 * g]], LeftForeArm: [['x', -1.6 * g]], RightForeArm: [['x', -1.6 * g]] };
        if (H.sitting) P.apply(P.merge(P.STAND(), { LeftUpLeg: [['x', -1.5]], RightUpLeg: [['x', -1.5]], LeftLeg: [['x', 1.5]], RightLeg: [['x', 1.5]] }, spec));
        else P.do(spec);
        if (H.sitting) P.inner.position.set(0, -0.42, -0.12);
      } else if (H.walk) P.walk(wt * 6 + H.x, 1);
      else if (H.sitting) P.sit(1);
      else if (H.photo) P.do({ LeftArm: [['x', -1.3], ['y', -0.5]], RightArm: [['x', -1.3], ['y', 0.5]], LeftForeArm: [['x', -1.2]], RightForeArm: [['x', -1.2]], Head: [['x', -0.05]] });
      else P.stand(0.04 * Math.sin(wt * 1.3 + H.x));
      pivot.position.set(x, 0, z); pivot.rotation.set(0, 0, 0);
      return;
    }
    // par terre
    const bend = sm(0, 0.45, k), fall = sm(0.25, 1, k) * sm(0.25, 1, k);
    P.do({ Spine: [['x', 0.25 * bend]], Head: [['z', 0.3 * fall * H.side]], LeftUpLeg: [['x', -0.9 * bend + 0.3 * fall]], RightUpLeg: [['x', -0.7 * bend + 0.3 * fall]], LeftLeg: [['x', 1.4 * bend - 0.5 * fall]], RightLeg: [['x', 1.1 * bend - 0.4 * fall]],
      LeftArm: [['x', -0.45 * fall]], RightArm: [['x', -0.35 * fall]], LeftForeArm: [['x', -0.5 * fall]], RightForeArm: [['x', -0.4 * fall]] });
    P.inner.position.y = -0.38 * bend * (1 - fall);
    pivot.position.set(x, 0.13 * fall, z); pivot.rotation.set(0, 0, H.side * (Math.PI / 2) * fall);
  }

  // -------------------------------------------------------------------
  // L'ARRÊT SUR IMAGE (deux fois)
  // -------------------------------------------------------------------
  const pt = (n) => () => YOU.P.point(n);
  const FZ = makeFreeze([
    { at: 22.6, dur: 5.4, title: 'ARRÊT SUR IMAGE · 7 S SANS AIR', tags: [
      { at: pt('lungs'), title: 'POUMONS', lines: ['l’air sort tout seul.', 'Le retenir les déchire'], risk: 'grave', side: 'right', dy: 110 },
      { at: pt('mouth'), title: 'BOUCHE', lines: ['ta salive se met', 'à bouillir'], risk: 'mal', side: 'left', dy: -20 },
      { at: pt('eyes'), title: 'YEUX', lines: ['tes larmes bouillent,', 'tes yeux sèchent'], risk: 'mal', side: 'right', dy: -10 },
      { at: pt('lArm'), title: 'PEAU', lines: ['elle gonfle,', 'mais elle tient'], risk: 'bof', side: 'left', dy: 130 } ] },
    { at: 40.0, dur: 5.0, title: 'ARRÊT SUR IMAGE · 1 MIN SANS AIR', tags: [
      { at: pt('head'), title: 'CERVEAU', lines: ['plus d’oxygène :', 'tu es inconscient'], risk: 'grave', side: 'left', dy: -270 },
      { at: pt('heart'), title: 'CŒUR', lines: ['des bulles de vapeur', 'freinent ton sang'], risk: 'grave', side: 'right', dy: -270 },
      { at: pt('nose'), title: 'NEZ · BOUCHE', lines: ['l’évaporation les', 'refroidit presque à geler'], risk: 'mal', side: 'left', dy: 130 },
      { at: pt('belly'), title: 'TON CORPS', lines: ['il refroidit lentement :', 'le vide isole'], risk: 'info', side: 'right', dy: 130 } ] },
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
  // LA CAMÉRA DE SURVEILLANCE (fixe), sur un lampadaire du jardin
  // -------------------------------------------------------------------
  const CAMP = new THREE.Vector3(1.0, 2.7, 9.5), LOOK = new THREE.Vector3(0, 6.4, -60);
  const W = 720, H = 1280, tmp = new THREE.Vector3();

  function update(t) {
    const ts = FZ.sceneT(t), frozen = !!FZ.active(t);
    const rwk = ts >= RW0 && ts < RW1 ? (ts - RW0) / (RW1 - RW0) : 0;
    // l'état du monde : pendant le rembobinage, on repart en arrière jusqu'à la vie normale
    const s = rwk > 0 ? (rwk < 0.5 ? lerp(120, 0, sm(0, 0.5, rwk)) : -1) : secs(ts);
    const vac = s < 0 ? 0 : sm(0, 0.8, s);                    // 0 : l'air est là ; 1 : le vide
    const wt = ts < RW0 ? Math.min(ts, E0) : ts - RW1 + 3;   // le temps « de la vie normale » (les passants s'arrêtent avec l'air)
    // le ciel
    sky.u.uDay.value = 1 - vac; sky.u.uStars.value = 0.55 * vac; sky.u.uSunGlow.value = 0.3 * (1 - vac);
    scene.fog.color.copy(FOG_DAY).lerp(FOG_VAC, vac); scene.fog.near = lerp(300, 2000, vac); scene.fog.far = lerp(2600, 8000, vac);
    hemi.intensity = lerp(1.0, 0.07, vac); scene.environmentIntensity = lerp(0.25, 0.1, vac); sun.intensity = lerp(2.8, 3.3, vac);
    // l'eau : elle bout dès que l'air part, puis gèle peu à peu
    const boil = s < 0 ? 0 : sm(0.3, 1.5, s) * (1 - sm(30, 48, s)), ice = s < 0 ? 0 : sm(22, 50, s);
    waterMat.color.copy(WCOL).lerp(ICE, ice); waterMat.roughness = lerp(0.12, 0.55, ice);
    { const a = bg.attributes.position.array;
      for (let i = 0; i < NB; i++) { const [bx, bz, ph, sp] = BR[i]; const life = (ts * sp * 2.2 + ph) % 1; const on = R2(i, Math.floor(ts * sp * 2.2 + ph)) < boil;
        a[i * 3] = bx; a[i * 3 + 1] = on ? 0.06 + life * 0.25 : -5; a[i * 3 + 2] = bz; }
      bg.attributes.position.needsUpdate = true; bm.opacity = 0.9; }
    // les jets : des gouttes en paraboles ; dans le vide, elles bouillent et éclatent en poussière blanche
    { const a = jg.attributes.position.array, g = 9.8;
      JETS.forEach((J, j) => { const v0 = Math.sqrt(2 * g * J.h), tf = 2 * v0 / g;
        for (let i = 0; i < PER; i++) { const n = j * PER + i, [r1, r2, r3] = JR[n]; const u = ((wt * 0.8 + r1 * tf) % tf);
          const spread = 0.12 + 0.9 * vac * (u / tf), ang = r2 * 6.283;
          a[n * 3] = J.x + Math.cos(ang) * spread * r3; a[n * 3 + 1] = Math.max(0, v0 * u - 0.5 * g * u * u) * (1 - 0.3 * vac); a[n * 3 + 2] = J.z + Math.sin(ang) * spread * r3; } });
      jg.attributes.position.needsUpdate = true; jm.size = 0.3 + 0.12 * vac; jm.opacity = 0.75 * (1 - 0.6 * ice); }
    // les gens
    for (const Hh of ALL) pose(Hh, wt, s);
    // la caméra, et le zoom pendant l'arrêt sur image
    camera.position.copy(CAMP); camera.lookAt(LOOK); camera.clearViewOffset();
    const A = FZ.active(t);
    if (A) {
      camera.updateMatrixWorld(); tmp.copy(A.f.at < 30 ? YOU.P.point('chest').add(new THREE.Vector3(0, -0.15, 0)) : YOU.P.point('chest').lerp(YOU.P.point('head'), 0.3)).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, A.f.at < 30 ? 2.6 : 3.4, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    stage.renderer.domElement.style.filter = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : '';

    // --- textes
    HUD.hook(t, 'Et si l’<em>atmosphère</em> disparaissait d’un coup ?', T.hookOut);
    const clock = 15 * 3600 + 24 * 60 + 10 + (s >= 0 ? E0 + s : ts < RW0 ? ts : ts - RW1 + E0 + 2);
    HUD.live(t, 'PARIS · TROCADÉRO · CAM 01', `14/11/2026 · ${pad(Math.floor(clock / 3600))}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}${s > 12.5 ? ' · ACCÉLÉRÉ' : ''}`, 'SIMULATION');
    const hpa = s < 0 ? 1013 : Math.round(1013 * (1 - sm(0, 0.5, s)));
    HUD.block(1, { label: 'PRESSION DE L’AIR', value: `${fr(hpa)} hPa`, sub: hpa >= 1013 ? 'NORMALE' : hpa > 0 ? 'EN CHUTE' : 'LE VIDE', color: hpa > 900 ? '#fff' : '#ff3b30' });
    if (s >= 0) {
      const sec = Math.floor(s), lbl = sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${pad(sec % 60)} s`;
      const st = s < 10 ? 'TU ES CONSCIENT' : s < 90 ? 'INCONSCIENT' : 'TROP TARD';
      HUD.block(2, { label: 'SECONDES SANS AIR', value: lbl, sub: st, color: s < 10 ? '#ffd60a' : '#ff3b30' }); HUD.show2(true);
    } else HUD.show2(false);
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    camera.updateMatrixWorld();
    HUD.reticle('you', YOU.P.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'TOI', (frozen || rwk) ? 0 : sm(4.0, 4.6, ts) * (1 - sm(FZ.realT(T.endCard) - 1, FZ.realT(T.endCard), t)), 110);
    HUD.subs(t, SUBS_V);
    insets.draw(t, INSETS);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : NASA · LIVE SCIENCE · LIMITE D’ARMSTRONG', q: 'Tes 10 dernières secondes<br>conscient, tu fais quoi ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.set(YOU.x + 0.5, 1.6, YOU.z + 3); camera.lookAt(YOU.x, 0.8, YOU.z); camera.updateProjectionMatrix(); }
  }
  // petit hasard reproductible (bulle allumée ou non)
  function R2(i, k) { let h = (i * 374761393 + k * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), event: FZ.realT(E0), rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard),
    downs: ALL.map((h) => FZ.realT(keys(SK.map(([a, b]) => [b, a]), h.down + 0.6))), you: FZ.realT(keys(SK.map(([a, b]) => [b, a]), YOU.down + 0.6)), fast: FZ.realT(27.5) }) };
}

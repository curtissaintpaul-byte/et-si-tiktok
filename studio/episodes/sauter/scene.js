// =====================================================================
//  ÉPISODE : « Et si tout le monde sautait en même temps ? » — Paris, le Champ-de-Mars, face à la tour Eiffel
//  Un seul personnage suivi : Manon. Effet multiplication (1 → 8,2 milliards), deux arrêts sur image.
//  Faits (sources dans la légende ; calculs refaits en Python) :
//   - population mondiale : 8,2 milliards (ONU, World Population Prospects 2024).
//   - à 2 personnes par m² : 8,2 milliards / 2 = 4,1 milliards de m² = 4 100 km² ; Paris = 105,4 km² → 38,9 fois Paris ;
//     un disque de 4 100 km² a un rayon de 36 km.
//   - masse : en comptant 62 kg chacun (masse moyenne d'un adulte dans le monde, Walpole et al., BMC Public Health 2012),
//     8,2 milliards × 62 kg = 508 millions de tonnes (une limite haute : les enfants pèsent moins).
//   - la Terre : 5,972 × 10^24 kg, soit 1,2 × 10^13 fois plus (« plus de 10 000 milliards de fois »).
//     Saut de 50 cm (R. Munroe, What If?) : la Terre recule de 0,5 × 8,5 × 10^-14 = 4,3 × 10^-14 m.
//     Un atome ≈ 10^-10 m → 2 300 fois plus petit qu'un atome (« moins d'un 2 000e d'atome »).
//   - vitesse de décollage pour 50 cm : √(2 g h) = 3,13 m/s = 11 km/h ; temps de chute depuis 50 cm : 0,32 s.
//   - à la réception d'un saut, le 2e pic de force au sol vaut en moyenne 9,9 fois le poids du corps
//     (Rojano Ortega et al., Journal of Sports Science and Medicine, 2010).
//   - la réception : un grondement qui dure plusieurs secondes (Munroe) ; les réseaux saturent (hypothèse, d'après Munroe).
//   - Paris-CDG + Orly : 107 millions de passagers en 2025 (Groupe ADP) → 8,2 milliards / 107 millions = 77 ans.
//   - eau : 2 litres par personne et par jour → 16,4 milliards de litres ; la Seine à l'entrée de Paris : 328 m³/s
//     (module, Banque Hydro) = 28,3 milliards de litres par jour → 58 % (« plus de la moitié »).
//   - au-delà de 2 % de la masse du corps perdue en eau, la concentration et la mémoire baissent (Masento et al., BJN 2014).
//   - un corps au repos dégage environ 100 W.
//   - Rungis approvisionne 18 millions de consommateurs (Ville de Paris) → 8,2 milliards / 18 millions = 455.
//   - vers 5 personnes par m², la pression dans une foule devient dangereuse (Fruin 2002 ; Haghani & Lovreglio 2022).
//   - 22 et 23 juillet 2023, Lumen Field, Seattle : les fans de Taylor Swift ont fait trembler le sol comme un séisme de
//     magnitude 2,3 (sismologue Jackie Caplan-Auerbach, Western Washington University ; ABC).
// =====================================================================
import { THREE, createStage, makeSky, M, box, cyl, bake, HUD, sm, lerp, clamp, rng, dirAzEl, pad, keys, fr, dotTex, canvasTex } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeCrowd, makeEquation } from '../../lib-multiply.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { buildEiffel } from '../../lib-eiffel.js';
import { makeCity } from '../../lib-manif.js';
import { makeInsets } from '../../lib-insets.js';
import { insetList } from './insets.js';

const Q = new URLSearchParams(location.search);
const POP = 8.2e9;
const M0 = 7.0, M1 = 15.6;                       // l'effet multiplication : 1 → 8,2 milliards (temps de scène)
const RISE = 7.4, AER = 13.6, BACK = 18.4, DOWN = 21.8;   // la caméra s'envole, puis revient à sa place
const J = 24.0, V0 = Math.sqrt(2 * 9.81 * 0.5), FLY = 2 * V0 / 9.81;   // le saut : 50 cm, 0,64 s en l'air
const RW0 = 61.4, RW1 = 62.8;                    // retour au réel (on rembobine)
const sceneEnd = 78.4;
const T = { hookOut: 3.0, jump: J, rewind: RW0, real: RW1, endCard: 74.4, duration: sceneEnd };
const Nat = (ts) => (ts < M0 ? 1 : ts >= M1 ? POP : Math.round(Math.exp(Math.log(POP) * Math.pow((ts - M0) / (M1 - M0), 1.6))));
const SUBS = [
  [3.2, 6.8, 'Le Champ-de-Mars, à Paris. Manon a rendez-vous à midi pile.'],
  [7.0, 10.4, 'Imagine que les 8,2 milliards d’humains viennent la rejoindre.'],
  [10.6, 14.4, 'À 2 personnes par m², il faut 4 100 km² : 39 fois Paris.'],
  [14.6, 18.2, 'La foule s’étend jusqu’à 36 km autour de la tour Eiffel.'],
  [18.4, 21.8, 'Même à 62 kg chacun, on pèse 500 millions de tonnes.'],
  [21.9, 23.9, 'Et à midi pile, tout le monde saute.'],
  [24.9, 28.4, 'Résultat : la Terre recule de moins d’un 2 000e d’atome.'],
  [28.6, 31.8, 'Elle pèse plus de 10 000 milliards de fois plus que nous tous.'],
  [32.0, 35.4, 'Le vrai problème commence : tout le monde doit rentrer chez soi.'],
  [35.6, 39.0, '3 heures plus tard, les réseaux saturent. Plus personne ne capte.'],
  [39.2, 43.0, 'Roissy et Orly, c’est 107 millions de passagers par an. Il faudrait 77 ans.'],
  [43.2, 47.0, 'Le soir, il faut boire. 2 litres chacun, c’est plus de la moitié de la Seine.'],
  [47.2, 50.2, 'Le 2e jour, Manon n’a presque rien bu depuis la veille.'],
  [51.0, 54.4, 'Le 3e jour, la faim. Rungis nourrit d’habitude 18 millions de personnes.'],
  [54.6, 57.6, 'Ici, il y a 455 fois plus de monde.'],
  [57.8, 61.2, 'La foule pousse vers les sorties. Vers 5 par m², ça devient dangereux.'],
  [63.0, 66.4, 'Rassure-toi : réunir tout le monde au même endroit, c’est impossible.'],
  [66.6, 70.4, 'Mais en 2023 à Seattle, les fans de Taylor Swift ont fait trembler le sol…'],
  [70.6, 74.2, '…comme un séisme de magnitude 2,3.'],
];
// l'horloge (secondes depuis minuit le jour du saut), selon le temps de scène : réel, puis accéléré
const CLK = [[0, 12 * 3600 - J], [32.0, 12 * 3600 + 8], [35.6, 15 * 3600], [39.2, 17 * 3600 + 1800], [43.2, 20 * 3600 + 1800], [47.0, 22 * 3600 + 1200],
  [47.2, 24 * 3600 + 10 * 3600], [51.0, 24 * 3600 + 15 * 3600], [51.01, 48 * 3600 + 9 * 3600], [57.6, 48 * 3600 + 15 * 3600], [61.4, 48 * 3600 + 17 * 3600]];
const clockAt = (ts) => (ts < 32 ? 12 * 3600 - J + ts : keys(CLK, ts));

export default async function () {
  const insets = makeInsets();
  const stage = createStage({ fov: 62, far: 30000, bloom: [0.14, 0.4, 0.94], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const R = rng(2023);
  const sky = makeSky(scene, { sunDir: dirAzEl(180, 60), dayZen: [0.03, 0.12, 0.42], dayHor: [0.45, 0.56, 0.68], stars: 0.6, sunGlow: 0.35 });
  const FOG_DAY = new THREE.Color('#b7c4d2'), FOG_EVE = new THREE.Color('#d8a986'), FOG_NIGHT = new THREE.Color('#10141d');
  scene.fog = new THREE.Fog(FOG_DAY.clone(), 300, 4200);
  const sun = new THREE.DirectionalLight('#fff3e2', 2.7); sun.target.position.set(0, 0, -6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 10, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c8d8ee', '#7a705f', 0.95); scene.add(hemi);
  const lamp = new THREE.PointLight('#ffc27a', 0, 40, 1.4); lamp.position.set(-3.5, 5.2, 3); scene.add(lamp);   // le réverbère, la nuit
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;

  // -------------------------------------------------------------------
  // LE DÉCOR : le Champ-de-Mars (pelouses, allées, arbres), la tour Eiffel au fond, les immeubles de Paris autour
  // (1 unité = 1 m ; Manon est à z = 0, la tour à 430 m)
  // -------------------------------------------------------------------
  const deco = new THREE.Group();
  const TZ = -430;
  box(16000, 0.1, 16000, M('#8f8a7e'), deco, 0, -0.06, -2000);                    // le sol de la ville
  box(250, 0.12, 760, M('#c9b99a'), deco, 0, -0.02, TZ + 300);                     // les allées de sable du Champ-de-Mars
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) box(62, 0.14, 150, M(i % 2 ? '#6f8f4c' : '#6a8a49'), deco, sx * 42, 0.0, 20 - i * 170 - 60);   // les grandes pelouses
  for (const sx of [-1, 1]) for (let row = 0; row < 2; row++) for (let i = 0; i < 34; i++) {   // les alignements d'arbres, de chaque côté
    const x = sx * (88 + row * 16), z = 40 - i * 15;
    cyl(0.22, 0.3, 3.4, 6, M('#5a4636'), deco, x, 1.7, z);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 1), M(row ? '#4a6838' : '#52703c')); crown.position.set(x, 6.4, z); crown.scale.set(1, 1.2, 1); crown.castShadow = true; deco.add(crown);
  }
  // les réverbères parisiens près de la caméra
  for (const [x, z] of [[-3.5, 3], [7.5, -14], [-8, -30], [8, -46]]) { cyl(0.07, 0.11, 4.6, 6, M('#20262b'), deco, x, 2.3, z); box(0.36, 0.55, 0.36, M('#2a3036'), deco, x, 4.85, z); }
  scene.add(bake(deco));
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3, 2.2, 1.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  lampGlow.position.set(-3.5, 4.85, 3); lampGlow.scale.setScalar(1.6); scene.add(lampGlow);
  const { tower, towerLight } = buildEiffel(scene, new THREE.Vector3(0, 0, TZ));
  // les immeubles autour (vus du ciel) : le Champ-de-Mars reste libre
  makeCity(scene, [{ a: Math.PI, w: 290, len: 900, r0: 0 }, { a: 0, w: 290, len: 260, r0: 0 }], { size: 1500, step: 46, r0: 150 });   // (au-delà, la foule va jusqu'à l'horizon)

  // -------------------------------------------------------------------
  // LA FOULE : de vrais personnages autour de Manon, des « photos découpées » jusqu'à ~75 m, puis un tapis de têtes
  // qui s'étend jusqu'à l'horizon (vu du ciel)
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer);
  const YOU = new THREE.Vector3(0.7, 0, 0);
  const SQ = 36000, NEAR = 22, SPACING = 0.76;     // 0,76 m entre voisins (grille en quinconce) ≈ 2 personnes par m²
  const FOGC = FOG_DAY.clone();
  const crowd = makeCrowd(scene, PEOPLE, { count: SQ, spacing: SPACING, cx: YOU.x, cz: YOU.z, near: NEAR, reach: 1.15, atlas: PEOPLE.atlas(20, 192, 384),
    fog: { color: FOGC, near: 300, far: 4200 }, face: [1.2, 14],
    appearAt: (i) => M0 + (M1 - M0) * Math.pow(Math.log(1 + i) / Math.log(POP), 1 / 1.6),
    exclude: (x, z) => z > YOU.z + 0.4 || Math.hypot(x - YOU.x, z - YOU.z) < 0.6 });
  crowd.real.forEach((p, i) => { p.ph = R() * 6; p.dl = (R() - 0.5) * 0.06; });
  // le tapis : un disque immense, des milliers de « têtes » dessinées dans le shader ; il s'étend avec le compteur
  const carpetU = { uR: { value: 0 }, uR0: { value: 70 }, fogColor: { value: FOGC }, fogNear: { value: 300 }, fogFar: { value: 4200 }, uLight: { value: 1 } };
  const carpet = new THREE.Mesh(new THREE.CircleGeometry(14000, 96).rotateX(-Math.PI / 2).translate(YOU.x, 0.3, YOU.z), new THREE.ShaderMaterial({ uniforms: carpetU, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    vertexShader: 'varying vec2 vP; varying float vD; void main(){ vP = position.xz; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uR, uR0, fogNear, fogFar, uLight; uniform vec3 fogColor; varying vec2 vP; varying float vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float d = length(vP - vec2(${YOU.x.toFixed(2)}, ${YOU.z.toFixed(2)}));
        if (d > uR || d < uR0) discard;
        vec2 cell = floor(vP / 0.72), f = fract(vP / 0.72) - 0.5; float r = h(cell);
        vec3 cloth = r < 0.2 ? vec3(0.16, 0.16, 0.2) : r < 0.38 ? vec3(0.22, 0.34, 0.66) : r < 0.52 ? vec3(0.78, 0.68, 0.45) : r < 0.66 ? vec3(0.72, 0.2, 0.2) : r < 0.8 ? vec3(0.9, 0.9, 0.88) : r < 0.9 ? vec3(0.9, 0.75, 0.25) : vec3(0.32, 0.45, 0.32);
        float dd = length(f + (vec2(h(cell + 3.1), h(cell + 7.7)) - 0.5) * 0.25);
        vec3 c = mix(cloth, vec3(0.1, 0.07, 0.05), smoothstep(0.13, 0.06, dd));
        c = mix(c, vec3(0.3, 0.29, 0.27), smoothstep(0.42, 0.5, dd));
        c = mix(c * uLight, mix(cloth, vec3(0.24, 0.2, 0.18), 0.65) * uLight * (0.8 + 0.4 * h(floor(vP / 9.0))), smoothstep(60.0, 400.0, vD));   // au loin : une seule couleur moyenne (pas de moiré)
        if (h(cell + 11.0) > smoothstep(0.0, 8.0, uR - d) + 0.15) discard;   // le front de la foule, un peu clairsemé
        c = mix(c, fogColor, smoothstep(fogNear, fogFar, vD));
        gl_FragColor = vec4(c, 1.0); }` }));
  carpet.frustumCulled = false; scene.add(carpet);
  const radiusOf = (n) => Math.sqrt(n / 2 / Math.PI);   // m (2 personnes par m²)

  // Manon (au premier plan) et son téléphone
  const MAN = PEOPLE.make({ outfit: 3, shadows: true }); MAN.root.position.copy(YOU); MAN.root.rotation.y = 0.15; scene.add(MAN.root);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.3, emissive: new THREE.Color('#8fb8ff'), emissiveIntensity: 0.0 }));
  MAN.attach(phone, 'rHand', { dz: 0.04, dy: -0.02 }); phone.visible = false;
  // les passants de la vie normale (avant le rassemblement, et après le retour au réel)
  const WALK = [[3, -14, 0.9, 1.15], [5, -25, -1.1, 1.3], [1, -38, 1.0, 1.0], [7, -9, -0.9, 1.2], [6, -55, 1.2, 1.1]].map(([o, z, dir, sp], i) => {
    const P = PEOPLE.make({ outfit: o, shadows: i < 2 }); scene.add(P.root); return { P, z, dir, sp, x0: -dir * 14 + (R() - 0.5) * 6 };
  });

  // les poses
  const SITG = { LeftUpLeg: [['x', -1.45]], RightUpLeg: [['x', -1.4]], LeftLeg: [['x', 1.9]], RightLeg: [['x', 1.85]], Spine: [['x', 0.32]], Head: [['x', 0.3]],
    LeftArm: [['x', -0.75]], RightArm: [['x', -0.75]], LeftForeArm: [['x', -0.6]], RightForeArm: [['x', -0.6]] };   // assise par terre, les genoux remontés
  const CROUCH = (k) => ({ Spine: [['x', 0.35 * k]], LeftUpLeg: [['x', -0.9 * k]], RightUpLeg: [['x', -0.9 * k]], LeftLeg: [['x', 1.4 * k]], RightLeg: [['x', 1.4 * k]],
    LeftArm: [['x', 0.6 * k]], RightArm: [['x', 0.6 * k]] });
  const crouchDrop = (k) => -0.2 * k;
  const AIR = (k) => ({ LeftArm: [['z', 2.2 * k]], RightArm: [['z', -2.2 * k]], LeftUpLeg: [['x', -0.25 * k]], RightUpLeg: [['x', -0.25 * k]], LeftLeg: [['x', 0.45 * k]], RightLeg: [['x', 0.45 * k]], Head: [['x', -0.2 * k]] });
  const PHONE = (k) => ({ RightArm: [['x', -1.15 * k], ['z', 0.6 * k]], RightForeArm: [['x', -1.5 * k]], Head: [['x', 0.32 * k]] });
  const ARMS_X = (k) => ({ LeftArm: [['x', -0.7 * k], ['z', 0.6 * k]], RightArm: [['x', -0.7 * k], ['z', -0.6 * k]], LeftForeArm: [['x', -1.6 * k], ['z', -0.5 * k]], RightForeArm: [['x', -1.6 * k], ['z', 0.5 * k]] });
  /** la pose d'une personne de la foule à l'instant de scène ts (dl : un petit décalage, ph : une phase) ; renvoie la hauteur du saut */
  function poseAt(P, ts, dl = 0, ph = 0, hero = false) {
    const u = ts - (J + dl);
    let y = 0, sway = 0;
    if (ts >= 57.8 && ts < RW0 + 0.7) sway = 0.11 * Math.sin((ts - 57.8) * 1.6 + ph * 0.2) * sm(57.8, 59.0, ts);   // la foule pousse
    if (ts < J - 0.45 + dl) {                    // debout, elle regarde autour d'elle
      const look = hero ? 0.35 * Math.sin(ts * 0.6) * sm(8, 9, ts) * (1 - sm(20.5, 21.5, ts)) : 0.25 * Math.sin(ts * 0.5 + ph);
      if (hero && ts < 7) { const w = sm(4.0, 4.6, ts) * (1 - sm(5.8, 6.4, ts)); P.do({ LeftArm: [['x', -0.9 * w], ['z', 0.6 * w]], LeftForeArm: [['x', -1.5 * w]], Head: [['x', 0.35 * w], ['y', 0.2 * Math.sin(ts * 0.7)]] }); }   // elle regarde sa montre
      else P.do({ Head: [['y', look], ['x', -0.05]] });
    } else if (u < 0) {                          // elle s'accroupit pour prendre son élan
      const k = sm(-0.45, -0.05, u); P.do(CROUCH(k)); P.inner.position.y = crouchDrop(k);
    } else if (u < FLY) {                        // en l'air : y = v t − g t² / 2
      y = V0 * u - 0.5 * 9.81 * u * u; const k = sm(0, 0.12, u) * (1 - sm(FLY - 0.12, FLY, u));
      P.do(AIR(k), CROUCH(0.25 * (1 - sm(0, 0.1, u)))); P.inner.position.y = y;
    } else if (u < FLY + 0.55) {                 // la réception : les genoux plient, puis elle se redresse
      const k = Math.sin(Math.PI * clamp((u - FLY) / 0.55)); P.do(CROUCH(0.75 * k)); P.inner.position.y = crouchDrop(0.75 * k);
    } else if (ts < 32.0) P.do({ Head: [['x', 0.25 * sm(J + 1.2, J + 2, ts)], ['y', 0.15 * Math.sin(ts + ph)]] });   // elle regarde le sol
    else if (ts < 43.2) { const k = sm(32.4, 33.2, ts); P.do(PHONE(k), { Head: [['y', 0.1 * Math.sin(ts * 0.7 + ph)]] }); }   // le téléphone
    else if (ts < 47.2) P.do(ARMS_X(sm(43.2, 44, ts)), { Head: [['x', 0.12]] });              // le soir, bras croisés, fatiguée
    else if (ts < 57.8) { P.do(SITG, { Head: [['x', ts > 51 ? 0.15 : 0], ['y', 0.08 * Math.sin(ts * 0.4 + ph)]] }); P.inner.position.y = -0.74; }   // assise par terre
    else P.do({ Spine: [['z', sway], ['x', 0.08]], Head: [['x', 0.1]] });
    if (sway) P.inner.position.x = sway * 0.6;
    return y;
  }

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0) => () => MAN.point(n).add(new THREE.Vector3(0, dy, 0));
  const FZ = makeFreeze([
    { at: J + FLY / 2, dur: 5.0, title: 'ARRÊT SUR IMAGE · EN L’AIR', tags: [
      { at: pt('head'), title: 'TOI', lines: ['en l’air en même temps', 'que 8,2 milliards de gens'], risk: 'info', side: 'left', dy: -10 },
      { at: pt('lKnee'), title: 'JAMBES', lines: ['elles t’ont lancée', 'à 11 km/h'], risk: 'info', side: 'right', dy: -40 },
      { at: pt('lFoot', -0.05), title: 'TES PIEDS', lines: ['50 cm au-dessus', 'du sol'], risk: 'info', side: 'left', dy: 120 },
      { at: pt('rKnee'), title: 'GENOUX', lines: ['dans 0,3 s, à la réception :', 'près de 10 fois ton poids'], risk: 'bof', side: 'right', dy: 110 } ] },
    { at: 50.3, dur: 4.8, title: 'ARRÊT SUR IMAGE · JOUR 2', tags: [
      { at: pt('head'), title: 'CERVEAU', lines: ['après 2 % d’eau perdue,', 'tu te concentres moins bien'], risk: 'mal', side: 'right', dy: -80 },
      { at: pt('chest'), title: 'CHALEUR', lines: ['chaque corps chauffe', 'comme une lampe de 100 W'], risk: 'bof', side: 'left', dy: -40 },
      { at: pt('lFoot'), title: 'JAMBES', lines: ['des heures debout :', 'tes chevilles gonflent'], risk: 'bof', side: 'right', dy: 110 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);
  const INSETS = insetList(FZ.realT);
  const eq = makeEquation([{ label: 'HUMAINS', value: '1' }, '÷', { label: 'PAR M²', value: '2' }, '=', { label: 'SURFACE', value: '0 km²', color: '#ffcf6b' }]);

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
  const AERP = new THREE.Vector3(120, 900, 1100), AERL = new THREE.Vector3(0, 0, -500), AERP2 = new THREE.Vector3(80, 1000, 1200), AERL2 = new THREE.Vector3(0, 0, -650);
  const W = 720, H = 1280, tmp = new THREE.Vector3(), sd = new THREE.Vector3(), c0 = new THREE.Color();
  function camAt(ts) {
    if (ts < RISE || ts > DOWN) return [CAMP, LOOK];
    const lp = (a, b, k) => a.clone().lerp(b, k);
    if (ts < AER) { const k = sm(RISE, AER, ts), k2 = sm(RISE, AER - 1.5, ts); return [lp(CAMP, AERP, k * k), lp(LOOK, AERL, k2)]; }
    if (ts < BACK) { const k = (ts - AER) / (BACK - AER); return [lp(AERP, AERP2, k), lp(AERL, AERL2, k)]; }
    const k = sm(BACK, DOWN, ts); return [lp(AERP2, CAMP, 1 - (1 - k) * (1 - k)), lp(AERL2, LOOK, sm(BACK + 0.8, DOWN, ts))];
  }
  const fmtEl = (s) => s < 60 ? `${Math.floor(s)} s` : s < 3600 ? `${Math.floor(s / 60)} min` : s < 86400 ? `${Math.floor(s / 3600)} h ${pad(Math.floor(s / 60) % 60)}` : `${Math.floor(s / 86400)} j ${Math.floor(s / 3600) % 24} h`;

  function update(t) {
    const ts0 = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts0 >= RW0 && ts0 < RW1 ? (ts0 - RW0) / (RW1 - RW0) : 0;
    const real = ts0 >= RW0 + 0.7;                               // après le rembobinage : la vie normale (avant le rassemblement)
    const ts = real ? 1.0 + (ts0 - RW1) * 0.5 : ts0;             // (on rejoue le début : un midi ordinaire)
    const clock = real ? 12 * 3600 - 300 + (ts0 - RW1) : clockAt(ts);
    // --- le soleil (un jour de juin à Paris : lever ~5 h 50, coucher ~22 h)
    const hr = (clock / 3600) % 24, dayU = (hr - 5.85) / 16.1;
    const el = 64 * Math.sin(Math.PI * clamp(dayU, -0.2, 1.2)), az = 70 + 220 * dayU;
    sd.copy(dirAzEl(az, Math.max(el, -12))); sky.u.uSunDir.value.copy(sd);
    const day = sm(-5, 6, el), eve = sm(18, 4, el) * day;
    sky.u.uDay.value = day;
    sun.position.copy(sd).multiplyScalar(150).add(sun.target.position); sun.intensity = 2.7 * sm(0, 8, el); sun.color.set(eve > 0.5 ? '#ffc690' : '#fff3e2');
    hemi.intensity = lerp(0.22, 0.95, day) - 0.25 * eve; hemi.color.set(day > 0.5 ? '#c8d8ee' : '#5d6c90');
    lamp.intensity = 14 * (1 - day); lampGlow.material.opacity = 1 - day; towerLight.material.opacity = 1 - day;
    c0.copy(FOG_DAY).lerp(FOG_EVE, eve).lerp(FOG_NIGHT, 1 - day); scene.fog.color.copy(c0); FOGC.copy(c0);
    // --- la foule
    const N = real ? 1 : Nat(ts);
    const yAll = real ? 0 : (ts >= J && ts < J + FLY ? V0 * (ts - J) - 4.905 * (ts - J) * (ts - J) : 0);
    const light = lerp(0.35, 1.0, day) * (1 - 0.15 * eve);
    const [cp, ct] = camAt(ts); camera.position.copy(cp); camera.lookAt(ct);
    const hk = clamp((camera.position.y - 4) / 600); scene.fog.near = lerp(300, 1500, hk); scene.fog.far = lerp(4200, 12000, hk);
    crowd.update(real ? -10 : ts, { light, fogNear: scene.fog.near, fogFar: scene.fog.far, lift: yAll });
    for (const p of crowd.real) if (p.root.visible) poseAt(p, ts, p.dl, p.ph);
    carpetU.uR.value = real ? 0 : radiusOf(N); carpetU.uLight.value = light; carpetU.fogNear.value = scene.fog.near; carpetU.fogFar.value = scene.fog.far;
    carpet.position.y = yAll + 8 * hk;   // (vu de haut, on le décolle un peu du sol : sinon il « clignote » avec le sol)
    // --- Manon
    poseAt(MAN, ts, 0, 0, true);
    phone.visible = !real && ts > 32.6 && ts < 43.2; phone.material.emissiveIntensity = 0.6;
    // --- les passants (vie normale seulement)
    for (const w of WALK) { const on = real || ts < M0 + 0.6; w.P.root.visible = on; if (!on) continue;
      w.P.walk(ts * 6 * w.sp, 1); w.P.root.position.set(w.x0 + w.dir * w.sp * ts, 0, w.z); w.P.root.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; w.P.fade(real ? 1 : 1 - sm(M0, M0 + 0.6, ts)); }
    // --- la caméra : au saut, tout tremble (le grondement) ; zoom pendant les arrêts
    camera.clearViewOffset();
    if (!real && ts > J + FLY && ts < J + FLY + 4) { const u = ts - J - FLY; camera.rotateX(0.006 * Math.exp(-u * 1.2) * Math.sin(u * 47)); camera.rotateZ(0.004 * Math.exp(-u * 1.2) * Math.sin(u * 39)); }
    if (A) {
      camera.updateMatrixWorld(); tmp.copy(MAN.point(A.f.at < 40 ? 'chest' : 'chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, A.f.at < 40 ? 2.0 : 2.3, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    stage.renderer.domElement.style.filter = rwk ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : '';
    HUD.flash(!real && ts >= J + FLY && ts < J + FLY + 0.3 ? 0.25 * (1 - (ts - J - FLY) / 0.3) : 0);
    const high = !real && ts > RISE + 1.2 && ts < DOWN - 1.0;

    // --- textes
    HUD.hook(t, 'Et si tout le monde <em>sautait</em> en même temps ?', T.hookOut);
    const dd = Math.floor(clock / 86400), date = `${pad(20 + dd)}/06/2027`, cl = clock % 86400;
    const accel = !real && ts >= 32.0;
    HUD.live(t, high ? 'VUE AÉRIENNE' : 'PARIS · CHAMP-DE-MARS · CAM 01', high ? `${fr(Math.round(camera.position.y))} M D’ALTITUDE` : `${date} · ${pad(Math.floor(cl / 3600))}:${pad(Math.floor(cl / 60) % 60)}:${pad(Math.floor(cl) % 60)}${accel ? ' · ACCÉLÉRÉ' : ''}`, 'SIMULATION');
    const surf = N / 2 / 1e6;
    if (real) {
      HUD.block(1, { label: 'SÉISME DES FANS', value: ts0 > 66.6 ? 'MAGNITUDE 2,3' : '—', sub: 'SEATTLE · JUILLET 2023', color: '#ffcf6b' }); HUD.show2(false);
    } else if (ts < M0) {
      HUD.block(1, { label: 'RENDEZ-VOUS', value: '12:00:00', sub: 'TOUT LE MONDE SAUTE' }); HUD.show2(false);
    } else if (ts < J + FLY + 0.3) {
      HUD.block(1, { label: 'HUMAINS RÉUNIS', value: N >= POP ? '8,2 milliards' : fr(N), sub: N >= POP ? 'TOUTE L’HUMANITÉ' : 'AU CHAMP-DE-MARS ET AUTOUR', color: N >= POP ? '#ffcf6b' : '#fff' });
      if (ts >= 21.9) { const c = Math.ceil(J - ts); HUD.block(2, { label: 'SAUT DANS', value: ts < J ? `${c} s` : 'SAUTEZ !', sub: 'MIDI PILE', color: '#ff9f0a' }); }
      else HUD.block(2, { label: 'SURFACE NÉCESSAIRE', value: `${fr(surf, surf < 10 ? 2 : 0)} km²`, sub: 'À 2 PERSONNES PAR M²' });
      HUD.show2(true);
    } else if (ts < 32.0) {
      HUD.block(1, { label: 'LA TERRE A RECULÉ DE', value: '0,00000000000004 m', sub: 'MOINS D’UN 2 000e D’ATOME', color: '#9fd3ff', scale: 0.78 }); HUD.show2(false);
    } else {
      HUD.block(1, { label: 'DEPUIS LE SAUT', value: fmtEl(clock - 12 * 3600), sub: '8,2 MILLIARDS À REPARTIR', color: '#ffd60a' });
      if (ts < 35.6) HUD.show2(false);
      else if (ts < 39.2) { HUD.block(2, { label: 'RÉSEAU', value: 'AUCUN', sub: 'TÉLÉPHONES SATURÉS', color: '#ff3b30' }); HUD.show2(true); }
      else if (ts < 43.2) { HUD.block(2, { label: 'REPARTIR PAR ROISSY ET ORLY', value: '77 ans', sub: '107 MILLIONS DE PASSAGERS PAR AN', color: '#ff9f0a' }); HUD.show2(true); }
      else if (ts < 51.0) { HUD.block(2, { label: 'EAU À BOIRE PAR JOUR', value: '16,4 milliards L', sub: '58 % DE LA SEINE', color: '#64d2ff' }); HUD.show2(true); }
      else if (ts < 57.8) { HUD.block(2, { label: 'NOURRITURE', value: '1 / 455', sub: 'DE CE QU’IL FAUDRAIT', color: '#ff9f0a' }); HUD.show2(true); }
      else { const d = lerp(2, 5, sm(57.8, 60.6, ts)); HUD.block(2, { label: 'DENSITÉ PRÈS DES SORTIES', value: `${fr(d, 1)} / m²`, sub: d > 4.9 ? 'DANGEREUX' : 'ÇA POUSSE', color: d > 4.9 ? '#ff3b30' : '#ff9f0a' }); HUD.show2(true); }
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    eq.opacity(real || A ? 0 : sm(10.6, 11.2, ts) * (1 - sm(18.0, 18.6, ts)));
    eq.set(0, N >= POP ? '8,2 Md' : N >= 1e6 ? `${fr(N / 1e6, 0)} M` : fr(N)); eq.set(2, `${fr(surf, surf < 10 ? 2 : 0)} km²`);
    camera.updateMatrixWorld();
    HUD.reticle('you', MAN.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'MANON', (A || rwk || high || (ts > RISE && ts < DOWN + 0.4)) ? 0 : sm(3.6, 4.2, ts0) * (1 - sm(FZ.realT(T.endCard) - 1, FZ.realT(T.endCard), t)), 100);
    HUD.subs(t, SUBS_V);
    insets.draw(t, INSETS);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : ONU · R. MUNROE (WHAT IF?) · GROUPE ADP · BANQUE HYDRO · WWU', q: 'Coincé avec 8,2 milliards<br>de personnes,<br>tu rentres comment ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.set(YOU.x + 1.2, 1.3, YOU.z + 3); camera.lookAt(YOU.x, 0.8, YOU.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), m0: FZ.realT(M0), m1: FZ.realT(M1), rise: FZ.realT(RISE), down: FZ.realT(DOWN),
    jump: FZ.realT(J), land: FZ.realT(J + FLY), clocks: [32.0, 35.6, 39.2, 43.2, 47.2, 51.0, 57.8].map(FZ.realT), night: [FZ.realT(46.0), FZ.realT(47.2)],
    rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard), push: FZ.realT(57.8) }) };
}

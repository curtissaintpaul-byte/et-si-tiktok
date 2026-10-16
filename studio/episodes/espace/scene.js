// =====================================================================
//  « Et si tu passais un an dans l'espace ? » — premier test des PLANS MÉLANGÉS (idée de Curtis, 16/10/2026) :
//  certains plans « dans tes yeux » (tes mains qui flottent, la goutte d'eau, la Terre par la coupole, l'ordinateur flou,
//  le retour sur Terre, la boule de papier ratée), d'autres de l'extérieur (la Station au-dessus de la Terre, toi qui flottes,
//  le tapis de course, la capsule sous son parachute, les jumeaux). Inspiration : notsurvivable.pov (gros compteur en haut à
//  gauche qui avance tout le long, petites fiches au centre, phrases très courtes).
//
//  Faits (vérifiés le 16/10/2026, sources dans la légende) :
//   - Scott Kelly, 340 jours dans la Station (mars 2015 → 2 mars 2016), atterrissage au Kazakhstan ; 5 440 tours de la Terre,
//     environ 90 min par tour, 16 levers de soleil par jour, ~28 000 km/h (Space.com, « By the Numbers », 01/03/2016) ;
//   - « tête bouffie, jambes de poulet » : les liquides remontent vers la tête (Smithsonian, Air and Space Museum) ;
//   - os : 1 à 1,5 % de densité perdue par mois, surtout le dos et les hanches (NASA, Human Research Program) ;
//   - yeux : chez Scott Kelly, le nerf au fond de l'œil s'est épaissi (NASA Twins Study, Science, avril 2019) ;
//   - radiations : 80 à 160 mSv en 6 mois dans la Station, contre ~2 mSv par an au sol (NASA, 2017, cité par ABC News)
//     → en une semaine (≥ 3 mSv), plus qu'en un an sur Terre (calcul) ;
//   - taille : jusqu'à +3 %, Scott Kelly a pris 5 cm (NASA, cité par Popular Science / ScienceAlert) ;
//   - au retour : muscles douloureux, peau qui brûle au contact, il rate ce qu'il lance (Kelly, Spaceflight Now, 04/03/2016) ;
//   - relativité : à 7,66 km/s et 408 km d'altitude, une horloge prend ~25 µs de retard par jour → ~8 ms en 340 jours (calcul) ;
//   - record : Valeri Polyakov, 437 jours sur Mir (1994-1995) ; un aller-retour vers Mars : environ 3 ans (NASA).
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, rng, fr } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadMixamo } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makeEarth, makeStars, makeSunGlow, buildModule, buildCupola, buildStation, buildSteppe, makeArms, R_EARTH, ALT } from '../../lib-espace.js';
import { makeSkyDome } from '../../lib-villa.js';
import { buildBedroom } from '../../lib-nuit.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SH = { hook: 0, j1: 3.0, j2: 6.3, j3: 9.6, j7: 12.7, j30: 16.5, j60: 21.0, j120: 24.5, j200: 28.1, j340: 31.5, sol: 34.7, maison: 38.1, jumeaux: 41.5, record: 45.1, fin: 48.5, end: 51.2 };
const sceneEnd = 54.2, FREEZE_AT = 29.4;
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 6.2, 'Jour 1. Plus rien ne pèse. Ton sang remonte vers ta tête.'],
  [6.4, 9.5, 'Ton visage gonfle, tes jambes s’affinent. Et tu as la nausée.'],
  [9.7, 12.6, 'L’eau ne coule plus. Elle flotte, en boule.'],
  [12.8, 16.4, 'Tu fais le tour de la Terre en 1 h 30 : 16 levers de soleil par jour.'],
  [16.6, 18.7, 'Jour 30. Sans gravité, tes os fondent : jusqu’à 1,5 % par mois.'],
  [18.8, 20.9, 'Alors tu fais du sport 2 h par jour, attaché au tapis.'],
  [21.1, 24.4, 'Jour 60. Ta vue se brouille : du liquide appuie au fond de tes yeux.'],
  [24.6, 28.0, 'Ici, en une semaine, tu reçois plus de radiations qu’en un an sur Terre.'],
  [28.2, 31.4, 'Jour 200. Tu as grandi de 5 cm : ta colonne ne se tasse plus.'],
  [31.6, 34.6, 'Jour 340. Retour sur Terre, dans la steppe du Kazakhstan.'],
  [34.8, 38.0, 'Tout pèse une tonne. On te porte jusqu’à une chaise.'],
  [38.2, 41.4, 'Chez toi, ta peau brûle au moindre contact. Et tu rates tout ce que tu lances.'],
  [41.6, 45.0, 'Et tu as vieilli un peu moins vite qu’un jumeau resté sur Terre : 8 millièmes de seconde.'],
  [45.2, 48.4, 'Le record, c’est 437 jours. Pour aller sur Mars et revenir, il faudrait environ 3 ans.'],
  [48.6, 51.0, 'Scott Kelly, qui a vécu 340 jours là-haut, a dit qu’il y retournerait.'],
];
// le compteur (en haut à gauche) et les petites fiches (au centre), plan par plan
const DAY = { hook: 0, j1: 1, j2: 2, j3: 3, j7: 7, j30: 30, j60: 60, j120: 120, j200: 200, j340: 340, sol: 340, maison: 342, jumeaux: 340, record: 340, fin: 340 };
const CARDS = {
  j1: ['ALTITUDE', '≈ 408 km', 'la Terre défile sous tes pieds'],
  j2: ['LES ASTRONAUTES L’APPELLENT', 'tête bouffie, jambes de poulet', 'les liquides remontent vers ta tête'],
  j3: ['L’EAU', 'une boule', 'plus rien ne la tire vers le bas'],
  j7: ['1 TOUR DE LA TERRE', '≈ 1 h 30', 'à environ 28 000 km/h'],
  j30: ['TES OS', '−1 à 1,5 % par mois', 'surtout le dos et les hanches'],
  j60: ['TES YEUX', 'le nerf s’épaissit', 'mesuré chez Scott Kelly'],
  j120: ['RADIATIONS EN 6 MOIS', '40 à 80 fois plus', 'qu’en un an sur Terre'],
  j340: ['MISSION DE SCOTT KELLY', '340 jours', '5 440 tours de la Terre'],
  jumeaux: ['LA RELATIVITÉ', '−0,008 s', 'plus tu vas vite, plus ton temps ralentit'],
};
const CLOCK0 = { hook: '06:10:00', j1: '06:12:40', j2: '07:02:11', j3: '12:30:05', j7: '05:41:20', j30: '15:02:00', j60: '10:20:00', j120: '14:00:00', j200: '09:00:00', j340: '04:22:30', sol: '04:31:00', maison: '18:40:12', fin: '05:20:00' };
const POV = ['j1', 'j3', 'j7', 'j60', 'sol', 'maison', 'fin'];

export default async function () {
  const stage = createStage({ fov: 62, far: 12000, bloom: [0.32, 0.45, 0.86], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.05;
  scene.add(camera);
  document.documentElement.style.setProperty('--accent', '#9fd0ff');
  scene.background = new THREE.Color('#000000');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;

  // --- l'orbite : la Terre (surface 200 unités sous l'origine), les étoiles, le Soleil ; l'intérieur d'un module (origine),
  //     la coupole (x = 60), la Station vue de dehors (x = 300)
  const EARTH = await makeEarth(scene);
  const STARS = makeStars(scene), GLOW = makeSunGlow(scene);
  const MOD = buildModule(scene, { at: v3(0, 0, 0) });
  const CUP = buildCupola(scene, { at: v3(60, 0, 0) });
  const ISS = buildStation(scene, { at: v3(300, 0, 0) });
  const sunL = new THREE.DirectionalLight('#fff6e8', 0); scene.add(sunL, sunL.target);
  const earthL = new THREE.HemisphereLight('#0b1020', '#5d86c4', 0); scene.add(earthL);
  // sur Terre : la steppe (z = 20 000) avec son ciel, le « studio » des jumeaux (z = 25 000), la chambre (z = 30 000)
  const SZ = buildSteppe(scene, { at: v3(0, 0, 20000) });
  const SKY = makeSkyDome(scene, 1500); SKY.dome.position.copy(SZ.at); SKY.set('jour'); SKY.sun.visible = false;
  const steppeSun = new THREE.DirectionalLight('#fff1d8', 0); steppeSun.position.copy(SZ.at).add(v3(-40, 60, 30)); steppeSun.target.position.copy(SZ.at); steppeSun.castShadow = true;
  Object.assign(steppeSun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 200 }); steppeSun.shadow.mapSize.set(1024, 1024); scene.add(steppeSun, steppeSun.target);
  const steppeSky = new THREE.HemisphereLight('#bcd6f2', '#9a8a62', 0); scene.add(steppeSky);
  const chair = new THREE.Group(); chair.position.copy(SZ.at).add(v3(6, 0, 4)); chair.rotation.y = Math.PI; scene.add(chair);
  { const m = new THREE.MeshStandardMaterial({ color: '#2b3a55', roughness: 0.8 }), f = new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 0.6, roughness: 0.4 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.55), m); seat.position.set(0, 0.42, 0.05); chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.08), m); back.position.set(0, 0.8, -0.3); back.rotation.x = -0.7; chair.add(back);
    for (const [x, z] of [[-0.27, -0.2], [0.27, -0.2], [-0.27, 0.28], [0.27, 0.28]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), f); l.position.set(x, 0.21, z); chair.add(l); } }
  const TW = v3(0, 0, 25000);
  const studioFloor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.7 })); studioFloor.rotation.x = -Math.PI / 2; studioFloor.position.copy(TW); studioFloor.receiveShadow = true; scene.add(studioFloor);
  const key = new THREE.SpotLight('#fff0dc', 0, 30, 0.6, 0.6, 1.4); key.position.copy(TW).add(v3(2, 6, 5)); key.target.position.copy(TW).add(v3(0, 1, 0)); key.castShadow = true; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#8fb7ff', 0); rim.position.copy(TW).add(v3(-4, 4, -6)); rim.target.position.copy(TW); scene.add(rim, rim.target);
  const CH = buildBedroom(scene, { at: v3(0, 0, 30000) });
  const R = (x, y, z) => CH.at.clone().add(v3(x, y, z));
  const dayL = new THREE.DirectionalLight('#fff1dc', 0); dayL.position.copy(R(0.3, 4, -8)); dayL.target.position.copy(R(0.8, 0, 0.5)); scene.add(dayL, dayL.target);
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#7f8c8d', side: THREE.DoubleSide, roughness: 0.6 })); bin.position.copy(R(-1.45, 0.17, -0.85)); scene.add(bin);
  const paperBall = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 1), new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.9, flatShading: true })); scene.add(paperBall);

  // --- l'eau qui flotte (une boule qui ondule), le tapis de course, les « rayons cosmiques » (traits de lumière)
  const water = new THREE.Mesh(new THREE.SphereGeometry(0.045, 32, 20), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', roughness: 0.02, transmission: 0.92, thickness: 0.08, ior: 1.33, transparent: true }));
  water.position.copy(MOD.at).add(v3(0.08, 0.02, 1.42)); scene.add(water);
  const drops = []; for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.008 + i * 0.002, 12, 8), water.material); scene.add(d); drops.push(d); }
  const tread = new THREE.Group(); tread.position.copy(MOD.at).add(v3(0, -1.05, -2.6)); scene.add(tread);
  { const m = new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.6 }); const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 1.7), m); b.position.y = 0.06; tread.add(b); }
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.6), new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 32; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, 32, 256); g.fillStyle = '#2c2e33'; for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 32, 6); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); return t; })(), roughness: 0.9 }));
  belt.rotation.x = -Math.PI / 2; belt.position.y = 0.125; tread.add(belt);
  const strapM = new THREE.MeshStandardMaterial({ color: '#2f5fa8', roughness: 0.8 }), straps = [0, 1].map(() => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), strapM); scene.add(s); return s; });
  const rays = []; for (let i = 0; i < 30; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 18, 4), new THREE.MeshBasicMaterial({ color: '#dbe9ff', transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(l); rays.push(l); }
  const rr = rng(9); rays.forEach((l) => { l.userData = { t0: rr() * 3.4, dir: v3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize(), off: v3((rr() - 0.5) * 60, (rr() - 0.5) * 30, (rr() - 0.5) * 60) }; });

  // --- les personnages : toi (Remy), ton jumeau (Remy aussi !), les secouristes dans la steppe
  const CAST = await loadMixamo({ chars: ['Remy', 'Josh', 'Leonard', 'Brian'], anims: ['idle', 'run', 'kneel', 'lookaround', 'sit'] });
  const A = CAST.make('Remy', { height: 1.74 }), TWIN = CAST.make('Remy', { height: 1.74 });
  const HELP = ['Josh', 'Leonard', 'Brian'].map((n) => CAST.make(n, { height: 1.76 }));
  scene.add(A.root, TWIN.root, ...HELP.map((h) => h.root));
  const FLOAT = Q.get('fo') ? JSON.parse(Q.get('fo')) : { LeftArm: [['x', -0.9], ['z', 0.25]], RightArm: [['x', -0.9], ['z', -0.25]], LeftForeArm: [['x', -0.6]], RightForeArm: [['x', -0.6]], LeftUpLeg: [['x', -0.55]], RightUpLeg: [['x', -0.45]], LeftLeg: [['x', 0.9]], RightLeg: [['x', 0.8]], Neck: [['x', -0.1]] };
  function poseAll(ts, S) {
    A.root.visible = ['j2', 'j30', 'j200'].includes(S); TWIN.root.visible = S === 'jumeaux'; HELP.forEach((h) => { h.root.visible = S === 'sol'; });
    A.root.rotation.set(0, 0, 0); A.root.scale.setScalar(1);
    if (S === 'j2' || S === 'j200') {   // toi, qui flottes dans le module (la « posture neutre » : bras et jambes à demi pliés)
      A.root.position.copy(MOD.at).add(v3(0.05 + Math.sin(ts * 0.5) * 0.05, -0.62 + Math.sin(ts * 0.7) * 0.04, -0.4)); A.root.rotation.set(0.12 + Math.sin(ts * 0.3) * 0.05, 0.35 + ts * 0.04, Math.sin(ts * 0.4) * 0.08);
      A.pose('idle', 0.5, FLOAT); return;
    }
    if (S === 'j30') { A.root.position.copy(tread.position).add(v3(0, 0.13, 0)); A.root.rotation.y = 0; A.pose('run', ts * 0.9); return; }
    if (S === 'jumeaux') {
      A.root.visible = true; A.root.position.copy(TW).add(v3(-0.55, 0, 0)); A.root.rotation.y = 0.12; A.pose('idle', ts + 0.3);
      TWIN.root.position.copy(TW).add(v3(0.55, 0, 0)); TWIN.root.rotation.y = -0.12; TWIN.pose('idle', ts + 2.1); return;
    }
    if (S === 'sol') {   // les secouristes penchés sur toi (tu es dans une chaise inclinée, au pied de la capsule)
      const C0 = SZ.at.clone().add(v3(6, 0, 4));
      [[-0.4, -0.88, 0.4], [0.45, -0.8, -0.45], [-0.8, -0.35, 1.3]].forEach(([x, z, ry], i) => { const h = HELP[i]; h.root.position.copy(C0).add(v3(x, 0, z)); h.root.rotation.y = ry;
        if (i === 2) h.pose('kneel', 1.6); else h.pose('idle', ts + i, { Spine: [['x', 0.28]], Spine1: [['x', 0.12]], Neck: [['x', Number(Q.get('nk') ?? 0.05)]] }); });
      return;
    }
  }

  { const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d'); g.fillStyle = '#f2f4f7'; g.fillRect(0, 0, 512, 320); g.fillStyle = '#1d3b6e'; g.fillRect(0, 0, 512, 42);
    g.fillStyle = '#fff'; g.font = 'bold 20px Inter'; g.fillText('PROCÉDURE 4.2 · EXPÉRIENCE MICRO-G', 16, 28); g.fillStyle = '#222'; g.font = '18px Inter';
    ['1. Ouvrir le casier LAB-1, tiroir B', '2. Fixer l’échantillon sur le support', '3. Vérifier la température : 37,0 °C', '4. Lancer l’enregistrement (12 min)', '5. Photographier le résultat', '6. Ranger et noter l’heure'].forEach((l, i) => { g.fillText(l, 22, 80 + i * 38); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; MOD.laptops[0].sc.material = new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); }
  // --- la vue « dans tes yeux » avec ton vrai corps (Remy) : on cache la tête et on pose la caméra entre les yeux.
  //     Chaque plan place ton corps (position, orientation, pose des bras) ; la caméra suit ta tête, inclinée de « pitch ».
  const PO = Q.get('po') ? JSON.parse(Q.get('po')) : null;
  const curl = (side, k, except = []) => { const o = {}; for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) if (!except.includes(f)) for (const j of [1, 2, 3]) o[`${side}Hand${f}${j}`] = [['x', k]]; return o; };
  function povBody(S, ts, u) {
    if (!POV.includes(S)) return null;
    const br = Math.sin(ts * 1.6) * 0.02, dr = Math.sin(ts * 0.7) * 0.05;
    let at, ry = Math.PI, rx = 0, spec, anim = 'idle', at_t = 0.5, pitch = -0.3, list = null, fov = 74;
    if (S === 'j1') { at = MOD.at.clone().add(v3(0, -0.85, 2.6)); pitch = -0.33;
      spec = { RightArm: [['x', -1.15 + br + dr], ['y', 0.25]], LeftArm: [['x', -1.05 - br - dr], ['y', -0.25]], RightForeArm: [['x', -0.7]], LeftForeArm: [['x', -0.75]], RightHand: [['x', 0.3]], LeftHand: [['x', 0.3]] }; }
    else if (S === 'j3') { at = MOD.at.clone().add(v3(0.02, -1.48, 1.95)); pitch = -0.08; const k = sm(0.15, 0.5, u) * (1 - sm(0.62, 0.85, u));
      spec = { RightArm: [['x', -1.15 - 0.42 * k], ['y', 0.12 + 0.2 * k]], RightForeArm: [['x', -0.55 + 0.45 * k]], RightHand: [['x', -0.2]], LeftArm: [['x', -0.55], ['y', -0.3]], LeftForeArm: [['x', -0.6]], ...curl('Right', 1.1, ['Index']) }; }
    else if (S === 'j7' || S === 'fin') { at = CUP.at.clone().add(v3(0, -1.57, 0.32)); pitch = S === 'fin' ? -0.42 : -0.48; fov = 76;
      spec = { RightArm: [['x', -0.95], ['y', 0.35]], LeftArm: [['x', -0.95], ['y', -0.35]], RightForeArm: [['x', -0.35]], LeftForeArm: [['x', -0.35]], RightHand: [['x', 0.5]], LeftHand: [['x', 0.5]], ...curl('Right', 0.9), ...curl('Left', 0.9) }; }
    else if (S === 'j60') { const lp = MOD.laptops[0].sc.getWorldPosition(v3(0, 0, 0)), n = v3(0, 0, 1).applyQuaternion(MOD.laptops[0].sc.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
      at = lp.clone().addScaledVector(n, 0.62).add(v3(0, -1.5, 0)); ry = Math.atan2(-n.x, -n.z); pitch = -0.32; fov = 64;
      spec = { RightArm: [['x', -0.75], ['y', 0.2]], LeftArm: [['x', -0.75], ['y', -0.2]], RightForeArm: [['x', -0.85]], LeftForeArm: [['x', -0.85]], RightHand: [['x', 0.4]], LeftHand: [['x', 0.4]] }; }
    else if (S === 'sol') { at = SZ.at.clone().add(v3(6, 0.2, 4)); ry = Math.PI; rx = -0.55; pitch = Number(Q.get('sp') ?? -0.3); fov = 76; const k = sm(0.3, 0.55, u);
      list = [['sit', 2.0, 1, /^(Hips|Spine|LeftUpLeg|LeftLeg|LeftFoot|LeftToeBase|RightUpLeg|RightLeg|RightFoot|RightToeBase)$/], ['idle', ts, 1, /^(Spine1|Spine2|Neck|Head|LeftShoulder|LeftArm|LeftForeArm|LeftHand.*|RightShoulder|RightArm|RightForeArm|RightHand.*)$/]];
      spec = { LeftArm: [['x', -0.4 - 1.0 * k], ['y', -0.2]], LeftForeArm: [['x', -1.3 * k]], LeftHand: [['x', -0.3 * k]], ...curl('Left', 1.4 * k) }; }
    else if (S === 'maison') { at = R(0.1, -0.07, 1.3); ry = Math.atan2(-1.45 - 0.1, -0.85 - 1.3); pitch = -0.38; fov = 66; const k = sm(0.12, 0.3, u);
      spec = { RightArm: [['x', -0.4 - 1.1 * k], ['y', 0.15]], RightForeArm: [['x', -1.3 * (1 - k) - 0.1]], RightHand: [['x', 0.3 - 0.6 * k]], LeftArm: [['x', -0.3], ['y', -0.15]], LeftForeArm: [['x', -0.5]], ...(u < 0.3 ? curl('Right', 0.9) : {}) }; }
    if (PO) spec = PO;
    A.root.visible = true; A.root.position.copy(at); A.root.rotation.set(0, ry, 0); A.root.rotateX(rx);
    if (list) A.pose(list, spec); else A.pose(anim, at_t, spec);
    A.bones.Head.scale.setScalar(0.001);
    const hd = A.point('Head'), fw = v3(0, 0, 1).applyQuaternion(A.root.quaternion), up = v3(0, 1, 0).applyQuaternion(A.root.quaternion);
    const eye = hd.clone().addScaledVector(fw, 0.09).addScaledVector(up, 0.07), pt = Number(Q.get('pp') ?? pitch);
    return { p: eye, l: eye.clone().addScaledVector(fw, Math.cos(pt)).addScaledVector(up, Math.sin(pt)), up, fov, fw };
  }
  // --- tes bras (vue « dans tes yeux »)
  const ARMS = makeArms(camera);

  // --- le calque 2D (sous les sous-titres) : la fiche du record et de Mars
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  const hud = document.getElementById('hud'); hud.insertBefore(ov, hud.firstChild); const og = ov.getContext('2d');
  function drawRecord(k, ts) {
    og.clearRect(0, 0, 1080, 1920); og.fillStyle = `rgba(0,0,0,${0.55 * sm(0, 0.12, k)})`; og.fillRect(0, 0, 1080, 1920);
    const a = sm(0.05, 0.2, k), b = sm(0.45, 0.6, k); og.textAlign = 'center';
    og.globalAlpha = a; og.font = '600 26px Inter'; og.fillStyle = '#9fd0ff'; og.fillText('LE RECORD', 540, 470); og.font = '300 120px "JetBrains Mono", monospace'; og.fillStyle = '#fff'; og.fillText('437 jours', 540, 590);
    og.font = 'italic 34px Garamond'; og.fillStyle = 'rgba(255,255,255,0.8)'; og.fillText('Valeri Polyakov, station Mir, 1994-1995', 540, 650);
    og.globalAlpha = b; const ex = 300, mx = 790, y0 = 900;
    og.fillStyle = '#3b7bd6'; og.beginPath(); og.arc(ex, y0, 46, 0, 7); og.fill(); og.fillStyle = '#c1502e'; og.beginPath(); og.arc(mx, y0, 30, 0, 7); og.fill();
    og.strokeStyle = 'rgba(255,255,255,0.7)'; og.lineWidth = 4; og.setLineDash([10, 12]); og.lineDashOffset = -ts * 40; og.beginPath(); og.moveTo(ex + 50, y0 - 10); og.quadraticCurveTo(545, y0 - 200, mx - 34, y0 - 10); og.stroke(); og.setLineDash([]);
    og.font = '600 22px Inter'; og.fillStyle = '#fff'; og.fillText('TERRE', ex, y0 + 90); og.fillText('MARS', mx, y0 + 90);
    og.font = '600 26px Inter'; og.fillStyle = '#9fd0ff'; og.fillText('UN ALLER-RETOUR VERS MARS', 540, 1040); og.font = '300 96px "JetBrains Mono", monospace'; og.fillStyle = '#fff'; og.fillText('≈ 3 ans', 540, 1140);
    og.globalAlpha = 1; og.textAlign = 'left';
  }
  // la petite fiche au centre (comme dans les vidéos « POV ») ; la mention en bas
  const card = document.createElement('div'); card.style.cssText = 'position:absolute;left:0;right:0;top:470px;text-align:center;color:#fff;opacity:0;pointer-events:none;';
  card.innerHTML = '<div id="cl" style="font:600 20px Inter;letter-spacing:.22em;opacity:.75"></div><div id="cv" style="font:400 58px \'JetBrains Mono\',monospace;margin-top:6px;text-shadow:0 2px 12px rgba(0,0,0,.6)"></div><div id="cs" style="font:italic 30px Garamond;opacity:.8;margin-top:4px;text-shadow:0 2px 8px rgba(0,0,0,.6)"></div>';
  hud.appendChild(card);
  const note = document.createElement('div'); note.style.cssText = 'position:absolute;left:62px;bottom:330px;font:600 15px Inter;letter-spacing:.18em;color:rgba(255,255,255,.55);pointer-events:none;';
  note.textContent = 'SIMULATION · CHIFFRES ARRONDIS'; hud.appendChild(note);
  let cardKey = '';

  // --- l'arrêt sur image : ton corps au 200e jour
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 4.4, title: 'ARRÊT SUR IMAGE · JOUR 200', tags: [
      { at: () => A.point('Head').add(v3(0, 0.08, 0)), title: 'YEUX', lines: ['la vue se brouille,', 'le nerf s’épaissit'], risk: 'mal', side: 'right', dy: -160 },
      { at: () => A.point('Spine1'), title: 'COLONNE', lines: ['+5 cm :', 'les vertèbres s’écartent'], risk: 'info', side: 'left', dy: -60 },
      { at: () => A.point('Hips'), title: 'OS DES HANCHES', lines: ['jusqu’à −1,5 %', 'par mois'], risk: 'grave', side: 'right', dy: 80 },
      { at: () => A.point('LeftLeg'), title: 'JAMBES', lines: ['« jambes de poulet » :', 'les muscles fondent'], risk: 'mal', side: 'left', dy: 180 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // =====================================================================
  //  LES PLANS (« pov » : la caméra est dans tes yeux)
  // =====================================================================
  const M0 = MOD.at, C0 = CUP.at, I0 = ISS.at, S0 = SZ.at;
  const SHOTS = [
    { id: 'hook', t0: SH.hook, zone: 'orbite', cam: (u) => ({ p: I0.clone().add(v3(lerp(66, 56, u), lerp(76, 66, u), lerp(76, 66, u))), l: I0.clone().add(v3(lerp(2, 0, u), -6, lerp(2, 0, u))), fov: 56 }), sun: [0.55, 0.35, -0.75] },
    { id: 'j1', t0: SH.j1, zone: 'module', near: 0.02, cam: (u, ts) => ({ p: M0.clone().add(v3(Math.sin(ts * 0.6) * 0.04, 0.1 + Math.sin(ts * 0.8) * 0.03, 2.6 - u * 0.4)), l: M0.clone().add(v3(0.1, 0.0, -2)), roll: Math.sin(ts * 0.5) * 0.06, fov: 72 }) },
    { id: 'j2', t0: SH.j2, zone: 'module', cam: (u) => ({ p: M0.clone().add(v3(0.4, 0.3, lerp(2.6, 2.25, u))), l: A.root.position.clone().add(v3(0, 1.1, 0)), fov: 68 }) },
    { id: 'j3', t0: SH.j3, zone: 'module', near: 0.02, cam: (u, ts) => ({ p: M0.clone().add(v3(0.0, 0.08, 1.62)), l: water.position.clone(), roll: Math.sin(ts * 0.5) * 0.04, fov: 60 }) },
    { id: 'j7', t0: SH.j7, zone: 'coupole', near: 0.02, cam: (u, ts) => ({ p: C0.clone().add(v3(0, 0.05, 0.25)), l: C0.clone().add(v3(0.0, -0.75, -1.6)), roll: Math.sin(ts * 0.4) * 0.03, fov: 74 }), sunrise: true },
    { id: 'j30', t0: SH.j30, zone: 'module', cam: (u) => ({ p: M0.clone().add(v3(0.6, -0.1, lerp(0.5, 0.2, u))), l: tread.position.clone().add(v3(0, 1.3, 0)), fov: 62 }) },
    { id: 'j60', t0: SH.j60, zone: 'module', near: 0.02, cam: (u, ts) => { const lp = MOD.laptops[0].sc.getWorldPosition(v3(0, 0, 0)); const n = v3(0, 0, 1).applyQuaternion(MOD.laptops[0].sc.getWorldQuaternion(new THREE.Quaternion())); return { p: lp.clone().addScaledVector(n, 0.62).add(v3(0, 0.12, 0)), l: lp.clone().add(v3(0, -0.06, 0)), roll: Math.sin(ts * 0.5) * 0.03, fov: 62 }; }, blur: true },
    { id: 'j120', t0: SH.j120, zone: 'orbite', cam: (u) => ({ p: I0.clone().add(v3(lerp(-44, -36, u), lerp(32, 28, u), lerp(64, 56, u))), l: I0.clone().add(v3(0, -4, 0)), fov: 58 }), sun: [-0.2, 0.25, -1], rays: true },
    { id: 'j200', t0: SH.j200, zone: 'module', cam: (u) => ({ p: M0.clone().add(v3(-0.55, 0.2, lerp(2.4, 2.2, u))), l: A.root.position.clone().add(v3(0, 1.0, 0)), fov: 66 }) },
    { id: 'j340', t0: SH.j340, zone: 'steppe', cam: (u, ts) => { const alt = 40 * (1 - sm(0, 1, u)); return { p: S0.clone().add(v3(-38, 1.7, 52)), l: S0.clone().add(v3(0, alt * 0.6 + 6, 0)), fov: 46 }; } },
    { id: 'sol', t0: SH.sol, zone: 'steppe', near: 0.02, cam: (u, ts) => ({ p: S0.clone().add(v3(6, 0.85, 4)), l: S0.clone().add(v3(6.15, 2.6, 2.6)), roll: Math.sin(ts * 0.7) * 0.02, fov: 70 }) },
    { id: 'maison', t0: SH.maison, zone: 'chambre', near: 0.02, cam: (u, ts) => ({ p: R(0.1, 1.55, 1.3), l: R(-1.35, 0.4, -0.75), fov: 64 }) },
    { id: 'jumeaux', t0: SH.jumeaux, zone: 'studio', cam: (u) => ({ p: TW.clone().add(v3(lerp(0.2, 0.0, u), 1.45, lerp(4.4, 3.9, u))), l: TW.clone().add(v3(0, 1.1, 0)), fov: 46 }) },
    { id: 'record', t0: SH.record, zone: 'orbite', cam: (u) => ({ p: I0.clone().add(v3(lerp(120, 140, u), 40, lerp(150, 170, u))), l: I0.clone().add(v3(0, -20, 0)), fov: 50 }), sun: [0.6, 0.2, -0.8] },
    { id: 'fin', t0: SH.fin, zone: 'coupole', near: 0.02, cam: (u, ts) => ({ p: C0.clone().add(v3(0, 0.05, 0.25)), l: C0.clone().add(v3(0.1, -0.7, -1.6)), fov: 74 }), sunrise: true, night: true },
    { id: 'end', t0: SH.end, zone: 'orbite', cam: () => ({ p: I0.clone().add(v3(80, 90, 90)), l: I0.clone().add(v3(0, -6, 0)), fov: 56 }), sun: [0.55, 0.35, -0.75] },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };
  const LIGHTS = [sunL, steppeSun, key, rim, dayL, CH.winL, CUP.light, ...MOD.lights, ...SZ.lights];
  const hms = (s) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;
  const qAlign = new THREE.Quaternion(), qSpin = new THREE.Quaternion(), UP = v3(0, 1, 0);
  const latlon = (lat, lon) => { const p = lat * Math.PI / 180, l = lon * Math.PI / 180; return v3(Math.cos(l) * Math.cos(p), Math.sin(p), -Math.sin(l) * Math.cos(p)); };
  qAlign.setFromUnitVectors(latlon(44, 8), UP);   // au début, c'est la Méditerranée et le sud de la France qui sont sous la Station
  const glEl = document.getElementById('c');

  function update(t) {
    const ts0 = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts0); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts0 - S.t0) / (nextT(S) - S.t0));
    const ts = Q.get('shot') ? S.t0 + u * (nextT(S) - S.t0) : ts0;
    const zone = S.zone, space = zone === 'orbite' || zone === 'module' || zone === 'coupole', pov = POV.includes(S.id);
    poseAll(ts, S.id);
    // la Terre tourne sous toi (accéléré 4 fois) ; le Soleil (et le lever de soleil vu de la coupole)
    qSpin.setFromAxisAngle(v3(0, 0, 1), -ts * 0.0046); EARTH.root.quaternion.copy(qSpin).multiply(qAlign); EARTH.update(ts, 0);
    let sun = v3(...(S.sun || [0.4, 0.5, -0.8])).normalize();
    if (S.sunrise) { const k = sm(0.05, 0.9, u), a = lerp(S.night ? -0.55 : -0.32, 0.12, k); sun = v3(0, Math.sin(a), -Math.cos(a)).normalize(); }
    EARTH.setSun(sun); EARTH.root.visible = STARS.visible = space; GLOW.sprite.visible = space && zone !== 'module';
    // les lumières de chaque zone
    MOD.on(zone === 'module' ? 1 : 0);
    sunL.intensity = zone === 'orbite' ? 3.2 : zone === 'coupole' ? 1.6 * clamp(sun.y * 4 + 0.6) : 0; sunL.position.copy(camera.position).addScaledVector(sun, 100); sunL.target.position.copy(camera.position);
    earthL.intensity = zone === 'orbite' ? 0.55 : zone === 'coupole' ? 0.5 : 0; CUP.light.intensity = zone === 'coupole' ? 1.2 : 0;
    const steppe = zone === 'steppe'; SKY.dome.visible = SZ.root.visible = chair.visible = steppe; steppeSun.intensity = steppe ? 2.6 : 0; steppeSky.intensity = steppe ? 0.9 : 0;
    const studio = zone === 'studio'; studioFloor.visible = studio; key.intensity = studio ? 160 : 0; rim.intensity = studio ? 1.4 : 0;
    const room = zone === 'chambre'; CH.view('jour'); CH.winL.intensity = room ? 26 : 0; CH.amb.intensity = room ? 0.8 : 0; dayL.intensity = room ? 2.2 : 0; CH.clock('18:40');
    bin.visible = paperBall.visible = room;
    scene.background.set(steppe ? '#9fc3e6' : studio ? '#0b0c10' : room ? '#101114' : '#000000');
    // la capsule : elle descend sous son parachute, puis (au sol) couchée sur le côté
    if (S.id === 'j340') { const k = sm(0, 1, u); SZ.place(40 * (1 - k), ts, clamp((u - 0.86) / 0.14)); SZ.capsule.rotation.z = 0; }
    else if (steppe) { SZ.place(0, ts, 0); SZ.capsule.position.set(0, 1.0, 0); SZ.capsule.rotation.set(0, 0.4, Math.PI / 2 * 0.95); }
    // l'eau, le tapis, les rayons
    water.visible = S.id === 'j3'; drops.forEach((d) => { d.visible = S.id === 'j3' && u > 0.55; });
    tread.visible = S.id === 'j30'; belt.material.map.offset.y = -ts * 1.6;
    straps.forEach((s, i) => { s.visible = S.id === 'j30'; if (!s.visible) return; const a = A.point(i ? 'RightShoulder' : 'LeftShoulder'), b = tread.position.clone().add(v3(i ? 0.32 : -0.32, 0.12, 0)); s.position.copy(a).add(b).multiplyScalar(0.5); s.scale.y = a.distanceTo(b); s.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize()); });
    rays.forEach((l) => { l.visible = !!S.rays; if (!l.visible) return; const ph = ((ts - SH.j120 + l.userData.t0) % 1.1) / 1.1; l.position.copy(I0).add(l.userData.off).addScaledVector(l.userData.dir, (ph - 0.5) * 140); l.quaternion.setFromUnitVectors(UP, l.userData.dir); l.material.opacity = 0.8 * Math.sin(ph * Math.PI); });
    // la caméra
    let C = S.cam(u, ts); const PB = povBody(S.id, ts, u); if (PB) C = { ...C, ...PB };
    if (S.id === 'j3' && PB) { const w = Math.sin(ts * 6) * 0.08 * (u > 0.45 ? 2.4 * (1 - sm(0.45, 1, u)) + 0.4 : 0.6); water.scale.set(1 + w, 1 - w * 0.8, 1 + w * 0.5); water.position.copy(PB.p).addScaledVector(PB.fw, 0.5).addScaledVector(PB.up, -0.2 + Math.sin(ts) * 0.008).addScaledVector(PB.fw.clone().cross(PB.up), 0.05);
      drops.forEach((d, i) => { const a = i / 6 * Math.PI * 2, r = 0.06 + (u - 0.55) * 0.25; d.position.copy(water.position).add(v3(Math.cos(a) * r, Math.sin(a) * r * 0.7, Math.sin(a * 2) * 0.03)); }); }
    if (Q.get('cp')) { const base = { orbite: I0, module: M0, coupole: C0, steppe: S0, studio: TW, chambre: CH.at }[zone]; C = { p: base.clone().add(v3(...Q.get('cp').split(',').map(Number))), l: base.clone().add(v3(...Q.get('cl').split(',').map(Number))), fov: 60 }; }
    camera.near = S.near ?? 0.1; camera.far = steppe || studio || room ? 3000 : 12000; camera.fov = C.fov; camera.up.copy(C.up || v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); if (C.roll) camera.rotateZ(C.roll);
    const fz = FZ.active(t);
    if (fz) { camera.updateMatrixWorld(); const tp = A.point('Spine2').project(camera); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.15, k); }
    else camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    GLOW.place(camera.position, sun);
    // tes bras, plan par plan
    ARMS.visible = false; if (!PB) A.bones.Head.scale.setScalar(1);
    if (pov) {
      const br = Math.sin(ts * 1.6) * 0.008;   // (la respiration)
      if (S.id === 'j1') { ARMS.pose(ARMS.R, { p: [0.17, -0.3 + br + Math.sin(ts * 0.9) * 0.02, -0.12], r: [0.55, 0.1, 0.1], el: 0.35, w: [-0.2, 0.1], curl: 0.3 }); ARMS.pose(ARMS.L, { p: [-0.18, -0.31 + br + Math.cos(ts * 0.8) * 0.02, -0.1], r: [0.5, -0.12, -0.1], el: 0.4, w: [-0.25, -0.1], curl: 0.35 }); }
      else if (S.id === 'j3') { const k = sm(0.15, 0.5, u) * (1 - sm(0.6, 0.85, u)); ARMS.pose(ARMS.R, { p: [0.13, -0.28 + br, -0.08], r: [0.45 + 0.35 * k, 0.15, 0.05], el: 0.3 - 0.25 * k, w: [0.1, 0.12], curl: 0.75, point: true }); ARMS.pose(ARMS.L, { p: [-0.22, -0.4, -0.05], r: [0.2, -0.1, -0.1], el: 0.5, curl: 0.4 }); }
      else if (S.id === 'j7' || S.id === 'fin') { ARMS.pose(ARMS.R, { p: [0.26, -0.3 + br, -0.12], r: [0.75, -0.25, 0.25], el: 0.25, w: [0.6, 0], curl: 0.75 }); ARMS.pose(ARMS.L, { p: [-0.26, -0.3 + br, -0.12], r: [0.75, 0.25, -0.25], el: 0.25, w: [0.6, 0], curl: 0.75 }); }
      else if (S.id === 'j60') { ARMS.pose(ARMS.R, { p: [0.16, -0.33, -0.12], r: [0.25, 0.05, 0.1], el: 0.6, w: [0.5, 0], curl: 0.35 }); ARMS.pose(ARMS.L, { p: [-0.18, -0.36, -0.1], r: [0.2, -0.05, -0.1], el: 0.6, w: [0.5, 0], curl: 0.35 }); }
      else if (S.id === 'sol') { const k = sm(0.3, 0.55, u); ARMS.pose(ARMS.L, { p: [-0.2, -0.32 + 0.08 * k, -0.12], r: [0.4 + 0.6 * k, -0.15, -0.2], el: 0.9 * k + 0.2, w: [0.2, 0.4], curl: 0.95 }); ARMS.L.th.rotation.set(-0.3 - 0.9 * k, 0.4, 0); ARMS.pose(ARMS.R, { p: [0.25, -0.45, -0.05], r: [0.05, 0, 0.1], el: 0.3, curl: 0.4 }); }
      else if (S.id === 'maison') {   // tu lances une boule de papier vers la poubelle… elle tombe bien avant (tu as oublié la gravité)
        const k = sm(0.12, 0.3, u), rel = 0.3;
        ARMS.pose(ARMS.R, { p: [0.18, -0.28, -0.06], r: [0.2 + 1.0 * k, 0.05, 0.1], el: 1.2 * (1 - k) + 0.1, w: [0.3 - 0.5 * k, 0], curl: u < rel ? 0.8 : 0.2 });
        ARMS.pose(ARMS.L, { p: [-0.22, -0.42, -0.04], r: [0.1, 0, -0.1], el: 0.4, curl: 0.4 });
        const hand = A.point('RightHand').add(v3(0, 0, 0));
        if (u < rel) paperBall.position.copy(hand).add(v3(0, 0.03, 0));
        else { const tt = (u - rel) * (nextT(S) - S.t0), p0 = A.userData_p0 || hand.clone(); A.userData_p0 = p0; const target = bin.position.clone().add(v3(0, 0.2, 0)), Tf = 0.9, vel = target.clone().sub(p0).divideScalar(Tf);   // lancée tout droit, « comme là-haut »
          const floorY = CH.at.y + 0.045, a = 4.905, bq = -vel.y, cq = floorY - p0.y, tHit = (-bq + Math.sqrt(bq * bq - 4 * a * cq)) / (2 * a);
          const p = p0.clone().addScaledVector(vel, Math.min(tt, tHit)); p.y -= a * Math.min(tt, tHit) ** 2;
          if (tt > tHit) { const tb = tt - tHit, hb = Math.max(0, 0.9 * tb - a * tb * tb) * 0.5, roll = 1 - Math.exp(-tb * 2.2); p.y = floorY + hb; p.addScaledVector(vel.clone().setY(0), 0.18 * roll); }
          paperBall.position.copy(p); paperBall.rotation.set(tt * 6, tt * 4, 0); }
        if (u < rel) A.userData_p0 = null;
      }
    } else if (paperBall.visible) paperBall.position.copy(R(-0.9, 0.035, -0.2));
    // la vue qui se brouille (60e jour) : un flou qui va et vient sur toute l'image
    glEl.style.filter = S.blur && !frozen ? `blur(${(2.5 + 2.5 * Math.sin((ts - SH.j60) * 2.2)).toFixed(1)}px)` : 'none';
    for (const l of LIGHTS) l.visible = l.intensity > 0;

    // --- textes : le compteur des jours, la fiche du centre, le calque du record
    HUD.hook(t, 'Et si tu passais <em>un an</em><br>dans l’espace ?', T.hookOut);
    const c0 = CLOCK0[S.id]; let clk = '';
    if (c0) { const [hh, mm, ss] = c0.split(':').map(Number); clk = hms(hh * 3600 + mm * 60 + ss + (ts - S.t0)); }
    const lab = { hook: 'STATION SPATIALE · 408 KM', j1: 'DANS TES YEUX', j2: 'MODULE · CAM 02', j3: 'DANS TES YEUX', j7: 'DANS TES YEUX · LA COUPOLE', j30: 'MODULE · CAM 03', j60: 'DANS TES YEUX', j120: 'STATION SPATIALE · CAM 05',
      j200: 'MODULE · CAM 02', j340: 'STEPPE DU KAZAKHSTAN', sol: 'DANS TES YEUX', maison: 'DANS TES YEUX · CHEZ TOI', jumeaux: 'SIMULATION', record: 'LE RECORD', fin: 'DANS TES YEUX · LA COUPOLE', end: '' }[S.id];
    HUD.live(t, lab, clk, 'SIMULATION');
    const d1 = DAY[S.id];
    let tl = false;
    if (d1) {
      const prev = SHOTS.indexOf(S) > 0 ? DAY[SHOTS[SHOTS.indexOf(S) - 1].id] || 0 : 0, d = Math.round(lerp(prev, d1, sm(0, 0.7, (ts - S.t0) / 0.9)));
      const back = ['sol', 'maison'].includes(S.id);
      HUD.block(1, { label: back ? 'DE RETOUR SUR TERRE' : 'TES JOURS DANS L’ESPACE', value: back ? `JOUR ${d}` : `JOUR ${d}`, sub: back ? 'APRÈS 5 440 TOURS DE LA TERRE' : `ALTITUDE 408 KM · ${fr(d * 16)} TOURS DE LA TERRE`, color: back ? '#ffcf7a' : '#fff', scale: 1.15 });
      HUD.show2(false); tl = !['jumeaux', 'record'].includes(S.id);
    } else HUD.show2(false);
    document.getElementById('tl').style.opacity = tl && !frozen ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    const cd = CARDS[S.id];
    if (cd && cardKey !== S.id) { card.querySelector('#cl').textContent = cd[0]; card.querySelector('#cv').textContent = cd[1]; card.querySelector('#cv').style.fontSize = cd[1].length > 18 ? '44px' : '58px'; card.querySelector('#cs').textContent = cd[2]; cardKey = S.id; }
    card.style.opacity = cd && !frozen ? sm(S.t0 + 0.35, S.t0 + 0.75, ts) * (1 - sm(nextT(S) - 0.35, nextT(S), ts)) : 0;
    note.style.opacity = t > T.hookOut && t < FZ.realT(T.endCard) ? 1 : 0;
    if (S.id === 'record') { ov.style.visibility = 'visible'; drawRecord(u, ts); } else ov.style.visibility = 'hidden';
    if (S.id === 'jumeaux') { HUD.reticle('toi', A.point('Head').add(v3(0, 0.25, 0)), camera, 'TOI · 340 JOURS LÀ-HAUT', sm(0.1, 0.25, u), 150); HUD.reticle('lui', TWIN.point('Head').add(v3(0, 0.25, 0)), camera, 'TON JUMEAU · SUR TERRE', sm(0.2, 0.35, u), 150); }
    else { HUD.reticle('toi', v3(0, 0, 0), camera, '', 0); HUD.reticle('lui', v3(0, 0, 0), camera, '', 0); }
    HUD.subs(t, SUBS_V);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : NASA (TWINS STUDY, HUMAN RESEARCH PROGRAM) · SPACE.COM · SMITHSONIAN · SPACEFLIGHT NOW', q: 'Et toi, tu partirais<br>un an ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)), pov: POV }) };
}

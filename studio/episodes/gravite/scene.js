// =====================================================================
//  ÉPISODE : « Et si la gravité disparaissait 5 secondes ? » — une partie de pétanque sur la place du village
//  Le piège : les vidéos virales montrent tout s'envoler. FAUX.
//  En vrai (principe d'équivalence) : tout ce qui touche le sol est poussé vers le haut exactement comme la gravité tirait
//  vers le bas → tout (toi, le sol, l'air, la mer) accélère ENSEMBLE vers le haut à 9,8 m/s² : on ne sent rien.
//  Mais la Terre entière, comprimée par son poids (3,6 millions de bars au centre), se détend comme un ressort :
//  en 5 s le sol est monté de 123 m à 177 km/h ; quand la gravité revient, l'élan continue → la Terre « respire »
//  (+11 km / −11 km, une période de 20,5 min : son mode propre 0S0, mesuré après les grands séismes).
//  Chiffres : modèle radial élastique de la Terre (PREM), terre_radiale.py → data.js. Vérifié : masse 5,973e24 kg,
//  pression centrale 364 GPa, période 0S0 = 1 229 s (mesurée : 1 228 s).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, add, box, cyl, makePerson, HUD, FX, sm, lerp, clamp, rng, dirAzEl, fr, pad, dotTex } from '../../engine.js';
import { buildVillage } from '../../lib-village.js';
import { SIM } from './data.js';

const T = { hookOut: 3.0, viral: 5.8, mythStart: 8.0, faux: 13.0, rewind: 14.2, real: 15.4, g0: 17.9, g1: 22.9,
  j1: 31.0, j2: 38.0, j3: 46.0, j4: 53.0, einstein: 57.0, endCard: 63.0, duration: 67.2 };
const S_REAL0 = 5.5;                 // temps de la scène quand la « vraie » version reprend
const S_CUT = 8.0, S_BACK = 13.0;    // gravité coupée entre ces deux instants (temps de la scène)
const SEG_TAU = { j1: 60, j2: 300, j3: 900, j4: 1228 };   // secondes écoulées depuis la coupure, au début de chaque saut
const SUBS = [
  [3.3, 5.6, 'Dimanche, 15 h, partie de pétanque.'],
  [5.9, 7.9, 'Ce que montrent les vidéos virales :'],
  [8.2, 12.8, 'Tout s’envolerait…'],
  [15.5, 17.7, 'Maintenant, la vraie physique.'],
  [17.9, 20.0, 'Gravité coupée… et rien ne change.'],
  [20.1, 22.8, 'La boule retombe. L’eau coule. Tu ne sens rien.'],
  [23.0, 26.5, 'Le sol te pousse vers le haut aussi fort que la gravité te tirait.'],
  [26.7, 30.8, 'Car la Terre, écrasée par son propre poids, se détend comme un ressort.'],
  [31.2, 34.4, 'En 5 s, tout est monté de 120 m : toi, le sol, l’air, la mer.'],
  [34.6, 37.8, 'La gravité est revenue… mais l’élan continue.'],
  [38.2, 41.8, 'La Terre gonfle : +11 km. Sa circonférence : +70 km.'],
  [42.0, 45.8, 'Le sol s’étire : murs fissurés, portes qui coincent.'],
  [46.2, 49.4, 'Puis elle se dégonfle : 11 km sous la normale.'],
  [49.6, 52.8, 'Le sol se comprime, des failles lâchent : séismes.'],
  [53.2, 56.8, 'Et ça recommence toutes les 20 minutes, pendant des semaines.'],
  [57.0, 60.0, 'Einstein, 1907 : gravité ou accélération, impossible de les distinguer.'],
  [60.2, 62.8, 'Voilà pourquoi tu n’aurais rien senti.'],
];

// --- la simulation (data.js) : rayon (m), vitesse (m/s), poids ressenti, à la seconde près
const simAt = (key, tau) => { const a = SIM[key], i = clamp(tau, 0, a.length - 1.001), k = Math.floor(i); return lerp(a[k], a[k + 1], i - k); };

/** Où en est-on ? (la vidéo raconte deux fois les mêmes secondes : version virale, retour arrière, version réelle, puis des sauts dans le temps) */
function stateAt(t) {
  if (t < T.mythStart) return { mode: 'real', s: t, seg: 0 };
  if (t < T.rewind) return { mode: 'myth', s: Math.min(t, S_BACK), seg: 0, frozen: t > T.faux };
  if (t < T.real) { const k = (t - T.rewind) / (T.real - T.rewind); return { mode: 'myth', s: lerp(S_BACK, S_REAL0, k * k * (3 - 2 * k)), seg: 0, rew: true }; }
  if (t < T.j1) return { mode: 'real', s: S_REAL0 + (t - T.real), seg: 0 };
  const seg = t < T.j2 ? 1 : t < T.j3 ? 2 : t < T.j4 ? 3 : 4;
  const j = [0, T.j1, T.j2, T.j3, T.j4][seg], tau = [0, SEG_TAU.j1, SEG_TAU.j2, SEG_TAU.j3, SEG_TAU.j4][seg] + (t - j);
  return { mode: 'real', s: S_CUT + tau, seg, tau, local: t - j };
}

export default async function () {
  const stage = createStage({ fov: 64, far: 3000, bloom: [0.2, 0.4, 0.95], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#9fe3ff');
  const R = rng(1907);

  // -------------------------------------------------------------------
  // LE DÉCOR : la place, un dimanche après-midi d'octobre (soleil bas, à gauche)
  // -------------------------------------------------------------------
  const SUN_DIR = dirAzEl(205, 34);   // soleil dans le dos de la caméra, à gauche
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.03, 0.12, 0.40], dayHor: [0.34, 0.47, 0.62], stars: 0 });
  const sunSprite = makeSun(scene, SUN_DIR, 60);
  scene.fog = new THREE.Fog('#b9c8d6', 160, 1300);
  const V = buildVillage(scene, { R, groundColor: '#8a9a62', fgTable: false });
  const sun = new THREE.DirectionalLight('#fff0d8', 3.3);
  sun.position.copy(SUN_DIR).multiplyScalar(120); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 10, far: 300 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c4dcff', '#8f7f66', 0.85); scene.add(hemi);
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  V.lamps[0].light.parent.visible = false;   // le réverbère qui masquait la terrasse

  // le terrain de pétanque (sable stabilisé, bordures en bois)
  const PISTE = { x0: 0.0, x1: 3.6, z0: 4.4, z1: 19.6 };
  add(new THREE.PlaneGeometry(PISTE.x1 - PISTE.x0, PISTE.z1 - PISTE.z0), M('#cdb88e', { nc: true, flat: false }), scene, (PISTE.x0 + PISTE.x1) / 2, 0.012, (PISTE.z0 + PISTE.z1) / 2, -Math.PI / 2).receiveShadow = true;
  const wood = M('#8a6a48', { nc: true });
  for (const x of [PISTE.x0, PISTE.x1]) box(0.08, 0.1, PISTE.z1 - PISTE.z0, wood, scene, x, 0.05, (PISTE.z0 + PISTE.z1) / 2);
  box(PISTE.x1 - PISTE.x0, 0.1, 0.08, wood, scene, (PISTE.x0 + PISTE.x1) / 2, 0.05, PISTE.z0);
  const CIRCLE = new THREE.Vector3(1.75, 0, 17.0);
  add(new THREE.RingGeometry(0.22, 0.25, 32), new THREE.MeshBasicMaterial({ color: '#f2efe6' }), scene, CIRCLE.x, 0.02, CIRCLE.z, -Math.PI / 2);
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa1a8', metalness: 0.95, roughness: 0.28 });
  const steel2 = new THREE.MeshStandardMaterial({ color: '#7d858c', metalness: 0.95, roughness: 0.35 });
  const BOULE = new THREE.SphereGeometry(0.04, 14, 10);
  const cochonnet = add(new THREE.SphereGeometry(0.016, 10, 8), M('#e2b13c', { nc: true }), scene, 1.38, 0.016, 7.4);
  // les boules déjà jouées, autour du cochonnet
  const ground = [[1.22, 7.62], [1.62, 7.1], [1.05, 7.0], [1.9, 7.9]].map(([x, z], i) => ({ m: add(BOULE, i % 2 ? steel : steel2, scene, x, 0.04, z), x, z, ph: R() * 6 }));

  // une table de café en terrasse (premier plan à droite)
  const TAB = new THREE.Vector3(3.75, 0, 13.6);
  const tableG = new THREE.Group(); tableG.position.copy(TAB); scene.add(tableG);
  cyl(0.42, 0.42, 0.04, 14, M('#d8d4cc', { r: 0.4, nc: true }), tableG, 0, 0.75, 0); cyl(0.04, 0.04, 0.72, 6, M('#2a2a2a', { nc: true }), tableG, 0, 0.38, 0); cyl(0.24, 0.24, 0.03, 10, M('#2a2a2a', { nc: true }), tableG, 0, 0.02, 0);
  const glassM = M('#e9b04a', { r: 0.15, nc: true });   // deux pastis
  cyl(0.035, 0.03, 0.12, 10, glassM, tableG, -0.12, 0.83, 0.05); cyl(0.035, 0.03, 0.12, 10, glassM, tableG, 0.15, 0.83, -0.08);
  const chairs = [-0.62, 0.62].map((dx) => { const g = new THREE.Group(); g.position.set(TAB.x + dx, 0, TAB.z); g.rotation.y = dx < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(g); const rat = M('#b08a5a', { nc: true });
    box(0.42, 0.05, 0.42, rat, g, 0, 0.45, 0); box(0.42, 0.48, 0.05, rat, g, 0, 0.7, -0.2);
    for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.04, 0.45, 0.04, M('#2a2a2a', { nc: true }), g, a, 0.22, b);
    return g; });

  // -------------------------------------------------------------------
  // LES GENS
  // -------------------------------------------------------------------
  const P1 = makePerson(scene, { shirt: '#f1ede4', pants: '#3a4660', hair: '#9a9a9a', skin: '#d9a982' });   // le tireur
  const cap = add(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 12), M('#2f4a7a', { nc: true }), P1.head, 0, 0.26, 0); add(new THREE.BoxGeometry(0.16, 0.02, 0.14), M('#2f4a7a', { nc: true }), P1.head, 0, 0.23, 0.15);
  const P2 = makePerson(scene, { shirt: '#c0533c', pants: '#e2d9c2', hair: '#2a1d15' });
  const P3 = makePerson(scene, { shirt: '#5d7f5a', pants: '#2e2e2e', hair: '#5a3a22', skin: '#c99872' });
  const P4 = makePerson(scene, { shirt: '#e3c35a', pants: '#3b3b3b', hair: '#d8d0c0', skin: '#e6bf9e' });
  const KID = makePerson(scene, { shirt: '#3f7fd0', pants: '#24324a', hair: '#7a4a28', s: 0.62 });
  const CA = makePerson(scene, { shirt: '#ffffff', pants: '#46506a', hair: '#1f1712', skin: '#a8714c' });
  const CB = makePerson(scene, { shirt: '#b04a7a', pants: '#2d2d3a', hair: '#c79a5a' });
  const WALK = [makePerson(scene, { shirt: '#6a5a8a', pants: '#2a2a2a', hair: '#3a2a20' }), makePerson(scene, { shirt: '#d8d2c2', pants: '#55606e', hair: '#222' })];
  const people = [P1, P2, P3, P4, KID, CA, CB, ...WALK];
  people.forEach((P) => P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }));
  // une boule dans la main du tireur, et le point « main » pour savoir d'où part le lancer
  const handBoule = add(BOULE, steel, P1.armR, 0, -0.6, 0.02);
  const hand = new THREE.Object3D(); hand.position.set(0, -0.6, 0.02); P1.armR.add(hand);
  // le ballon de l'enfant + le chien
  const ball = add(new THREE.SphereGeometry(0.11, 14, 10), M('#e8452f', { nc: true, flat: false }), scene, 0, 0, 0);
  const dog = new THREE.Group(); scene.add(dog);
  { const fur = M('#b98a52', { nc: true }); box(0.62, 0.26, 0.24, fur, dog, 0, 0.42, 0); box(0.24, 0.22, 0.2, fur, dog, 0.38, 0.6, 0); box(0.1, 0.08, 0.12, M('#3a2a20', { nc: true }), dog, 0.53, 0.58, 0);
    for (const [x, z] of [[-0.24, -0.08], [-0.24, 0.08], [0.24, -0.08], [0.24, 0.08]]) box(0.06, 0.3, 0.06, fur, dog, x, 0.15, z);
    const tail = box(0.24, 0.05, 0.05, fur, dog, -0.4, 0.55, 0); tail.rotation.z = 0.6; dog.userData.tail = tail; }
  dog.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // les pigeons
  const pigeonMat = M('#7c8288', { nc: true }), pigeonDark = M('#4b5158', { nc: true });
  const pigeons = Array.from({ length: 8 }, () => { const g = new THREE.Group(); scene.add(g);
    box(0.2, 0.12, 0.11, pigeonMat, g, 0, 0.1, 0); const hd = box(0.07, 0.07, 0.07, pigeonDark, g, 0.12, 0.17, 0);
    const wl = box(0.16, 0.02, 0.1, pigeonDark, g, 0, 0.15, 0.08), wr = box(0.16, 0.02, 0.1, pigeonDark, g, 0, 0.15, -0.08);
    return { g, hd, wl, wr, x: -1.6 + R() * 3.4, z: 3.2 + R() * 2.6, ry: R() * 6.28, ph: R() * 6, fly: new THREE.Vector3((R() - 0.5) * 2, 1, (R() - 0.5) * 2).normalize() }; });

  // -------------------------------------------------------------------
  // LE LANCER : une boule « en cloche » (montée à ~4 m), mêmes équations dans les deux versions…
  // sauf que dans la version virale, à la coupure, elle file tout droit (plus rien ne la ramène)
  // -------------------------------------------------------------------
  const THROWS = [{ r: 7.3, to: new THREE.Vector3(1.32, 0.04, 7.85), roll: new THREE.Vector3(1.28, 0.04, 7.55) },
                  { r: 10.6, to: new THREE.Vector3(1.55, 0.04, 8.2), roll: new THREE.Vector3(1.47, 0.04, 7.72) }];
  function poseThrower(P, s, r, home) {
    P.reset(); P.root.position.copy(home); P.root.rotation.y = Math.PI;
    const u = s - r;
    const crouch = sm(-1.3, -0.7, u) * (1 - sm(0.6, 1.4, u));
    P.body.rotation.x = 0.22 * crouch; P.body.position.y = 0.9 - 0.12 * crouch;
    for (const L of P.legs) { L.hip.rotation.x = -0.35 * crouch; L.knee.rotation.x = 0.55 * crouch; }
    const back = sm(-0.9, -0.45, u), fwd = sm(-0.45, 0.0, u), relax = sm(0.5, 1.6, u);
    P.armR.rotation.x = lerp(lerp(0.15, 0.95, back), -1.25, fwd) * (1 - relax) + 0.04 * relax;
    P.head.rotation.x = -0.15 * crouch;
  }
  // point de départ de chaque lancer = la main du tireur à l'instant du lâcher
  const tmpV = new THREE.Vector3();
  for (const th of THROWS) {
    poseThrower(P1, th.r, th.r, CIRCLE); P1.root.updateMatrixWorld(true); hand.getWorldPosition(tmpV); th.from = tmpV.clone();
    const apex = 4.0, g = 9.81; th.vy = Math.sqrt(2 * g * (apex - th.from.y)); const tUp = th.vy / g, tDn = Math.sqrt(2 * (apex - th.to.y) / g);
    th.dur = tUp + tDn; th.vx = (th.to.x - th.from.x) / th.dur; th.vz = (th.to.z - th.from.z) / th.dur;
  }
  const flying = THROWS.map(() => add(BOULE, steel, scene, 0, -10, 0));
  function bouleAt(th, s, mode, out) {
    const u = s - th.r;
    if (u < 0) return false;
    const fly = (uu) => out.set(th.from.x + th.vx * uu, th.from.y + th.vy * uu - 4.905 * uu * uu, th.from.z + th.vz * uu);
    if (mode === 'myth' && s > S_CUT && th.r < S_CUT) {   // gravité coupée en plein vol : ligne droite
      const uc = S_CUT - th.r; fly(uc); out.x += th.vx * (s - S_CUT); out.y += (th.vy - 9.81 * uc) * (s - S_CUT); out.z += th.vz * (s - S_CUT); return true;
    }
    if (mode === 'myth' && th.r >= S_CUT) return false;   // pas de second lancer dans la version virale
    if (u < th.dur) { fly(u); return true; }
    const k = sm(0, 0.7, u - th.dur); out.lerpVectors(th.to, th.roll, 1 - (1 - k) * (1 - k)); return true;
  }

  // -------------------------------------------------------------------
  // LE JET D'EAU (des gouttes) + les « bulles » d'eau qui s'envolent dans la version virale
  // -------------------------------------------------------------------
  const NJ = 380, jet = [];
  for (let i = 0; i < NJ; i++) jet.push({ ph: R(), a: R() * Math.PI * 2, v: 0.8 + R() * 0.5, up: 1.6 + R() * 0.8 });
  const jetGeo = new THREE.BufferGeometry(); jetGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NJ * 3), 3));
  const jetPts = new THREE.Points(jetGeo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, map: dotTex(), color: '#d6e8f4', transparent: true, opacity: 0.85, depthWrite: false }));
  jetPts.frustumCulled = false; scene.add(jetPts);
  const waterBlobMat = new THREE.MeshStandardMaterial({ color: '#7fb3cc', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75 });
  const blobs = Array.from({ length: 16 }, () => ({ m: add(new THREE.IcosahedronGeometry(0.12 + R() * 0.22, 2), waterBlobMat, scene, 0, -10, 0), a: R() * 6.28, r: 0.4 + R() * 1.6, up: 0.25 + R() * 0.5, t0: S_CUT + R() * 1.5 }));

  // -------------------------------------------------------------------
  // LES DÉGÂTS (après les sauts dans le temps) : flaque qui fuit de la fontaine, dalles soulevées, gravats
  // -------------------------------------------------------------------
  const puddle = add(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#3a3328', transparent: true, opacity: 0.35, depthWrite: false }), scene, 0, 0.014, 0, -Math.PI / 2);
  puddle.renderOrder = 1;
  const pave = M('#b9a888', { r: 0.95 });
  const RIDGE = Array.from({ length: 9 }, (_, i) => { const g = new THREE.Group(); g.position.set(-1.75 + i * 0.19, 0, 19.4 - i * 0.5); g.rotation.y = 2.78; scene.add(g);
    const a = box(0.42, 0.07, 0.56, pave, g, -0.2, 0, 0), b = box(0.42, 0.07, 0.56, pave, g, 0.2, 0, 0); a.castShadow = b.castShadow = true;
    return { g, a, b, h: 0.1 + R() * 0.14 }; });
  const debris = Array.from({ length: 70 }, () => ({ m: box(0.05 + R() * 0.07, 0.03 + R() * 0.04, 0.05 + R() * 0.06, M('#e4d7bd', { nc: true }), scene, 0, -10, 0),
    x: R() < 0.5 ? 8.7 : -8.7, y: 4 + R() * 6, z: -2 - R() * 16, t0: R() * 6, vx: (R() - 0.5) * 0.6 }));

  // -------------------------------------------------------------------
  // LES ÉLÉMENTS DU HUD propres à l'épisode : l'étiquette « version », le tampon FAUX, le retour arrière, les sauts
  // -------------------------------------------------------------------
  const hud = document.getElementById('hud');
  const mk = (css) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;pointer-events:none;opacity:0;' + css; hud.appendChild(d); return d; };
  const tag = mk("left:0;right:0;top:560px;text-align:center;font-family:'Inter';font-weight:800;font-size:30px;letter-spacing:0.16em;");
  const tagIn = document.createElement('span'); tagIn.style.cssText = 'display:inline-block;padding:12px 22px;border-radius:6px;'; tag.appendChild(tagIn);
  const stamp = mk("left:0;right:0;top:640px;text-align:center;font-family:'Inter';font-weight:800;font-size:190px;letter-spacing:0.06em;color:#ff3b30;");
  stamp.innerHTML = '<span style="display:inline-block;border:14px solid #ff3b30;padding:0 34px;border-radius:18px;transform:rotate(-9deg);text-shadow:0 0 30px rgba(0,0,0,.35);background:rgba(255,59,48,0.10)">FAUX</span>';
  const rew = mk('left:0;top:0;width:1080px;height:1920px;background:repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0 3px, rgba(0,0,0,0.0) 3px 9px);');
  const rewTxt = mk("left:70px;top:1500px;font-family:'Inter';font-weight:800;font-size:64px;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.6);");
  rewTxt.textContent = '◀◀ RETOUR';
  const tear = mk('left:0;width:1080px;height:70px;background:linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.35), rgba(160,220,255,0.25), rgba(255,255,255,0.0));mix-blend-mode:screen;');
  const canvasEl = document.getElementById('c');

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(2.2, 3.05, 23.2), LOOK = new THREE.Vector3(-0.6, 5.0, -22);
  const tmp = new THREE.Vector3(), hp = new THREE.Vector3();
  function update(t) {
    const st = stateAt(t), s = st.s, myth = st.mode === 'myth', seg = st.seg;
    const off = myth && s > S_CUT ? s - S_CUT : 0;          // temps passé « sans gravité » dans la version virale
    const floatY = (a, ph = 0) => 0.5 * a * off * off + (off > 0 ? 0.15 * Math.sin(off * 1.3 + ph) * sm(0, 1, off) : 0);
    // --- caméra (fixe ; tremble pendant le séisme)
    const quake = seg === 3 ? sm(1.8, 2.3, st.local) * (1 - sm(5.0, 6.2, st.local)) : 0;
    camera.position.copy(CAM); camera.position.x += (Math.sin(t * 41) + Math.sin(t * 67)) * 0.03 * quake; camera.position.y += Math.sin(t * 53) * 0.025 * quake;
    camera.lookAt(LOOK); camera.fov = 64; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sky.follow(camera); sunSprite.follow(camera);
    sun.target.position.set(0, 0, 0);

    // --- les joueurs (segment 0 : la partie ; puis d'autres attitudes après chaque saut)
    people.forEach((P) => { P.reset(); P.root.rotation.set(0, 0, 0); P.root.visible = true; });
    handBoule.visible = false;
    if (seg === 0) {
      // le tireur : deux lancers (le second pendant les 5 s sans gravité)
      const th = s < THROWS[0].r + 2.0 ? THROWS[0] : THROWS[1];
      poseThrower(P1, s, th.r, CIRCLE);
      handBoule.visible = s < th.r || (s > THROWS[0].r + 1.6 && s < THROWS[1].r);
      P2.root.position.set(0.25, 0, 18.1); P2.root.rotation.y = Math.PI * 0.92; P2.armL.rotation.set(-0.3, 0, 0.5); P2.armR.rotation.set(-0.3, 0, -0.5);   // mains sur les hanches
      P3.root.position.set(-0.35, 0, 15.4); P3.root.rotation.y = Math.PI * 1.1; P3.head.rotation.x = -0.1;
      P4.root.position.set(2.75, 0, 8.6); P4.root.rotation.y = -0.2; P4.head.rotation.x = 0.12;
      const look1 = sm(THROWS[0].r, THROWS[0].r + 0.6, s) * (1 - sm(THROWS[0].r + 1.7, THROWS[0].r + 2.4, s));
      P3.head.rotation.x = -0.1 - 0.5 * look1; P4.head.rotation.x = 0.12 - 0.45 * look1;
      if (!myth && s > THROWS[0].r + 1.8 && s < THROWS[0].r + 3.2) { P4.armR.rotation.set(-1.4, 0, 0.2); }   // « elle est bonne ! »
    } else if (seg === 1) {   // +1 min : la partie continue, c'est P2 qui tire
      const r = 2.0; poseThrower(P2, st.local, r, CIRCLE);
      P1.root.position.set(0.3, 0, 18.3); P1.root.rotation.y = Math.PI * 0.9; P1.armL.rotation.set(-0.2, 0, 0.4);
      P3.root.position.set(-0.35, 0, 15.4); P3.root.rotation.y = Math.PI * 1.1;
      P4.root.position.set(2.75, 0, 8.6); P4.root.rotation.y = -0.2;
    } else if (seg === 2) {   // +5 min : des fissures ; on s'arrête, on regarde, on montre du doigt
      P1.root.position.set(1.4, 0, 16.2); P1.root.rotation.y = Math.PI * 0.75; P1.head.rotation.x = -0.25;
      P2.root.position.set(0.5, 0, 16.6); P2.root.rotation.y = Math.PI * 1.15; P2.armR.rotation.set(-2.0 * sm(1.0, 1.6, st.local), 0, -0.2);
      P3.root.position.set(-0.6, 0, 14.6); P3.root.rotation.y = Math.PI * 0.6; P3.head.rotation.x = 0.35;   // regarde le sol
      P4.root.position.set(2.2, 0, 9.4); P4.root.rotation.y = Math.PI * 0.9;
    } else if (seg === 3) {   // +15 min : le sol se comprime, le séisme : on s'accroupit, on s'éloigne des façades
      const q = sm(1.9, 2.6, st.local) * (1 - sm(6.0, 7.2, st.local));
      for (const [P, x, z, ry] of [[P1, 1.0, 15.0, Math.PI], [P2, 0.2, 14.4, Math.PI * 0.8], [P3, -0.7, 13.4, Math.PI * 1.2], [P4, 2.3, 10.2, Math.PI]]) {
        P.root.position.set(x, 0, z); P.root.rotation.y = ry;
        P.body.position.y = 0.9 - 0.42 * q; for (const L of P.legs) { L.hip.rotation.x = -1.2 * q; L.knee.rotation.x = 2.0 * q; } P.body.rotation.x = 0.3 * q;
        P.armL.rotation.set(-0.8 * q, 0, 0.5 * q); P.armR.rotation.set(-0.8 * q, 0, -0.5 * q);
      }
    } else {   // +20 min : debout au milieu de la place, téléphones
      for (const [P, x, z, ry] of [[P1, 1.1, 14.2, Math.PI * 0.95], [P2, 0.3, 13.7, Math.PI * 1.05], [P3, -0.6, 12.8, Math.PI * 0.85], [P4, 2.1, 12.2, Math.PI * 1.2]]) {
        P.root.position.set(x, 0, z); P.root.rotation.y = ry; P.armR.rotation.set(-1.3, 0, 0.15); P.head.rotation.x = 0.4;
      }
    }
    // --- le couple en terrasse
    const tableUp = seg >= 2;
    CA.root.position.set(TAB.x - 0.62, 0, TAB.z); CA.root.rotation.y = Math.PI / 2; CB.root.position.set(TAB.x + 0.62, 0, TAB.z); CB.root.rotation.y = -Math.PI / 2;
    if (!tableUp) { CA.sit(1); CB.sit(1); CA.head.rotation.y = -0.6; CB.head.rotation.y = 0.5; CA.armR.rotation.set(-0.9 - 0.3 * Math.sin(s * 0.7), 0, 0); }
    else if (seg === 2) { CA.root.position.x -= 0.3; CA.root.rotation.y = Math.PI * 0.85; CB.root.rotation.y = Math.PI * 0.95; CB.armR.rotation.set(-1.8, 0, 0); }
    else { CA.root.position.set(3.0, 0, 11.6); CA.root.rotation.y = Math.PI; CB.root.position.set(3.5, 0, 11.4); CB.root.rotation.y = Math.PI * 1.1;
      if (seg === 3) { const q = sm(1.9, 2.6, st.local) * (1 - sm(6.0, 7.2, st.local)); for (const P of [CA, CB]) { P.body.position.y = 0.9 - 0.42 * q; for (const L of P.legs) { L.hip.rotation.x = -1.2 * q; L.knee.rotation.x = 2.0 * q; } } } }
    // --- l'enfant qui dribble, le chien
    const dribble = seg <= 1;
    KID.root.position.set(-0.9, 0, 11.6); KID.root.rotation.y = 0.35;
    if (seg === 3) { KID.root.position.set(3.3, 0, 11.9); KID.armL.rotation.set(-1.2, 0, 0.6); KID.armR.rotation.set(-1.2, 0, -0.6); }   // dans les bras… de ses parents
    if (seg === 4) { KID.root.position.set(2.9, 0, 11.2); KID.root.rotation.y = Math.PI; }
    const bPer = 0.62, bu = ((s % bPer) + bPer) % bPer / bPer;
    const hBall = 0.11 + 0.62 * (1 - Math.pow(2 * bu - 1, 2));
    ball.visible = dribble || seg === 2;
    if (dribble) {
      KID.armR.rotation.set(-0.6 - 0.35 * Math.cos(bu * 6.28), 0, -0.2);
      tmp.set(-0.9 + 0.25, hBall, 11.6 + 0.3);
      if (myth && off > 0) { const uc = ((S_CUT % bPer) + bPer) % bPer / bPer; tmp.y = 0.11 + 0.62 * (1 - Math.pow(2 * uc - 1, 2)) - 2.48 * (2 * uc - 1) / bPer * off + floatY(0.12); }
      ball.position.copy(tmp);
    } else if (seg === 2) ball.position.set(-1.6, 0.11, 13.4);
    dog.position.set(-1.7, 0, 12.4); dog.rotation.y = 0.9; dog.userData.tail.rotation.y = Math.sin(s * 9) * 0.5;
    if (seg >= 3) { dog.position.set(2.6, 0, 11.0); dog.rotation.y = 2.2; }
    // --- les promeneurs du fond
    WALK.forEach((P, i) => { const u = (s * 0.9 + i * 13) % 34; P.root.position.set(i ? 5.5 - u * 0.33 : -6 + u * 0.36, 0, -8 - i * 3.5); P.root.rotation.y = i ? -Math.PI / 2 : Math.PI / 2; P.walk(s * 5.2 + i, 1); P.root.visible = seg !== 3; });

    // --- VERSION VIRALE : tout ce qui n'est pas fixé s'envole doucement en tournant
    if (myth && off > 0) {
      const fl = [[P1, 0.55, 0.0], [P2, 0.42, 1.0], [P3, 0.5, 2.0], [P4, 0.62, 3.0], [KID, 0.7, 4.0], [CA, 0.38, 5.0], [CB, 0.45, 6.0], [WALK[0], 0.5, 7], [WALK[1], 0.44, 8]];
      for (const [P, a, ph] of fl) {
        P.root.position.y += floatY(a, ph); P.root.rotation.x += 0.12 * off * Math.sin(ph); P.root.rotation.z += 0.1 * off * Math.cos(ph * 1.7);
        const flail = Math.sin(off * 7 + ph) * 0.6 * sm(0.3, 1.2, off);
        P.armL.rotation.set(-2.2 + flail, 0, 0.6); P.armR.rotation.set(-2.2 - flail, 0, -0.6);
        P.legs[0].hip.rotation.x = 0.4 * flail; P.legs[1].hip.rotation.x = -0.4 * flail;
      }
      tableG.position.y = floatY(0.3, 9); tableG.rotation.z = 0.06 * off;
      chairs.forEach((c, i) => { c.position.y = floatY(0.36 + i * 0.1, 10 + i); c.rotation.x = 0.15 * off * (i ? 1 : -1); });
      dog.position.y = floatY(0.58, 12); dog.rotation.z = 0.2 * off;
    } else { tableG.position.y = 0; tableG.rotation.z = 0; chairs.forEach((c) => { c.position.y = 0; c.rotation.x = 0; }); dog.rotation.z = 0; }

    // --- les boules : en vol, au sol
    THROWS.forEach((th, i) => {
      const live = seg === 0 && bouleAt(th, s, st.mode, hp);
      flying[i].visible = live; if (live) flying[i].position.copy(hp);
    });
    // segment 1 : le lancer de P2
    if (seg === 1) {
      const live = bouleAt({ ...THROWS[0], r: 2.0 }, st.local, 'real', hp);
      flying[0].visible = live; if (live) flying[0].position.copy(hp);
    }
    ground.forEach((g, i) => { g.m.position.set(g.x, 0.04 + (myth ? floatY(0.4 + 0.08 * i, g.ph) : 0), g.z); });
    cochonnet.position.y = 0.016 + (myth ? floatY(0.5, 3) : 0);
    // --- les pigeons : picorent ; s'envolent (version virale : flottent ; séisme : s'enfuient)
    const fleeK = seg === 3 ? sm(2.0, 4.5, st.local) : 0;
    pigeons.forEach((p, i) => {
      const peck = Math.max(0, Math.sin(s * 3 + p.ph * 5)) ** 6;
      p.g.position.set(p.x + 0.15 * Math.sin(s * 0.3 + p.ph), 0, p.z + 0.1 * Math.cos(s * 0.25 + p.ph)); p.g.rotation.set(0, p.ry + 0.3 * Math.sin(s * 0.2 + p.ph), 0);
      p.hd.position.y = 0.17 - 0.07 * peck;
      let flap = 0;
      if (myth && off > 0) { p.g.position.y = floatY(0.35 + 0.05 * i, p.ph); p.g.rotation.z = 0.5 * off; flap = Math.sin(off * 30 + i); }
      if (fleeK > 0) { p.g.position.addScaledVector(p.fly, 14 * fleeK * fleeK); flap = Math.sin(t * 40 + i); }
      p.wl.rotation.x = flap * 0.9; p.wr.rotation.x = -flap * 0.9; p.g.visible = seg !== 4 || i < 3;
    });
    // --- le jet de la fontaine (virale : les gouttes partent en ligne droite et ne retombent plus)
    {
      const a = jetGeo.attributes.position.array;
      jet.forEach((p, i) => {
        const u = ((s * 0.9 + p.ph) % 1) * 0.95, born = s - u;
        if (myth && off > 0) {
          if (born >= S_CUT) { const r = 0.15 + p.v * u; a[i * 3] = Math.cos(p.a) * r; a[i * 3 + 1] = 2.75 + p.up * u; a[i * 3 + 2] = Math.sin(p.a) * r; return; }   // la pompe pousse, rien ne retombe
          const uc = S_CUT - born, r = 0.15 + p.v * uc + p.v * off;   // goutte partie avant la coupure : continue tout droit
          a[i * 3] = Math.cos(p.a) * r; a[i * 3 + 1] = 2.75 + p.up * uc - 4.9 * uc * uc + (p.up - 9.81 * uc) * off; a[i * 3 + 2] = Math.sin(p.a) * r; return;
        }
        const r = 0.15 + p.v * u; a[i * 3] = Math.cos(p.a) * r; a[i * 3 + 1] = Math.max(0.62, 2.75 + p.up * u - 4.9 * u * u); a[i * 3 + 2] = Math.sin(p.a) * r;
      });
      jetGeo.attributes.position.needsUpdate = true;
    }
    blobs.forEach((b) => { const u = myth ? s - b.t0 : -1; b.m.visible = u > 0; if (u > 0) b.m.position.set(Math.cos(b.a) * b.r, 0.62 + b.up * u * u * 0.5 + 0.4 * u, Math.sin(b.a) * b.r); });

    // --- les dégâts : fissures (shader), flaque, dalles soulevées, gravats qui tombent des façades
    const strainSeen = seg >= 2 ? (seg === 2 ? lerp(0.32, 0.5, sm(0.0, 6.0, st.local)) : seg === 3 ? 0.68 : 0.72) : 0;
    FX.uDCrack.value = strainSeen;
    const pr = seg >= 2 ? (seg === 2 ? 2.75 + 0.3 * sm(1, 7, st.local) : seg === 3 ? 3.9 : 4.4) : 0;
    puddle.visible = pr > 0; puddle.scale.setScalar(pr);
    const ridgeK = seg === 3 ? 0.55 + 0.45 * sm(3.2, 3.4, st.local) : seg === 4 ? 0.85 : 0;
    RIDGE.forEach((r) => { const h = r.h * ridgeK; r.g.visible = ridgeK > 0; const tilt = Math.asin(Math.min(0.9, h / 0.42));
      r.a.position.set(-0.2 * Math.cos(tilt), h / 2 + 0.02, 0); r.b.position.set(0.2 * Math.cos(tilt), h / 2 + 0.02, 0); r.a.rotation.z = tilt; r.b.rotation.z = -tilt; });
    debris.forEach((d) => { const u = seg === 2 ? st.local - d.t0 : seg === 3 ? st.local - 1.8 - d.t0 * 0.6 : -1; const y = d.y - 4.9 * u * u;
      d.m.visible = u > 0 && y > 0.03; if (d.m.visible) d.m.position.set(d.x + d.vx * u - Math.sign(d.x) * 0.3 * u, y, d.z); d.m.rotation.set(u * 5, u * 3, 0); });

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const clock = 15 * 3600 + 2 * 60 + s;   // 15 h 02 + temps de la scène
    HUD.live(t, 'PLACE DU VILLAGE · CAM 02', `11/10/2026 · ${pad(Math.floor(clock / 3600))}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}`);
    const gOff = s >= S_CUT && s < S_BACK;
    const kmh = (v) => `${fr(Math.abs(v) * 3.6)} KM/H`;
    const dist = (u) => (Math.abs(u) < 1000 ? `${u < 0 ? '−' : '+'}${fr(Math.abs(u))} m` : `${u < 0 ? '−' : '+'}${fr(Math.abs(u) / 1000, 1)} km`);
    HUD.show2(true);
    if (myth) {
      const z = gOff || st.frozen || (st.rew && s > S_CUT);
      HUD.block(1, { label: 'GRAVITÉ', value: z ? '0 %' : '100 %', sub: z ? 'COUPÉE PENDANT 5 S' : 'NORMALE', color: z ? '#ff6b5e' : '#fff' });
      HUD.block(2, { label: 'TON POIDS', value: z ? '0 %' : '100 %', sub: z ? 'SELON LES VIDÉOS VIRALES' : '', color: z ? '#ff6b5e' : '#fff' });
    } else if (s < S_CUT) {
      HUD.block(1, { label: 'GRAVITÉ', value: '100 %', sub: 'NORMALE', color: '#fff' });
      HUD.block(2, { label: 'TON POIDS RESSENTI', value: '100 %', sub: '', color: '#fff' });
    } else if (gOff) {
      const tau = s - S_CUT;
      HUD.block(1, { label: 'GRAVITÉ', value: '0 %', sub: `COUPÉE · ${fr(Math.min(5, tau), 1)} S / 5`, color: '#ff6b5e' });
      HUD.block(2, { label: 'TON POIDS RESSENTI', value: '100 %', sub: `LE SOL MONTE : ${dist(4.91 * tau * tau).toUpperCase()} · ${kmh(9.82 * tau)}`, color: '#9fe3ff' });
    } else {
      const tau = s - S_CUT, u = simAt('u', tau), v = simAt('v', tau), w = simAt('w', tau);
      HUD.block(1, { label: 'RAYON DE LA TERRE', value: dist(u), sub: `${v >= 0 ? '↑' : '↓'} ${kmh(v)} · GRAVITÉ REVENUE`, color: Math.abs(u) > 2000 ? '#ffb15e' : '#fff' });
      const wp = Math.round((w - 1) * 100);
      HUD.block(2, { label: 'TON POIDS RESSENTI', value: `${fr(Math.round(w * 100))} %`, sub: wp === 0 ? 'COMME D’HABITUDE' : `${wp > 0 ? '+' : '−'}${Math.abs(wp)} % : LE SOL ${wp > 0 ? 'FREINE SA DESCENTE' : 'FREINE SA MONTÉE'}`, color: wp === 0 ? '#fff' : '#ffb15e' });
    }
    HUD.hook(t, 'Et si la gravité<br>disparaissait<br><em>5 secondes</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    // étiquette « version » / sauts dans le temps
    let tagTxt = '', tagBg = '', tagOp = 0;
    if (t > T.viral && t < T.rewind) { tagTxt = 'VERSION DES VIDÉOS VIRALES'; tagBg = 'rgba(214,40,40,0.88)'; tagOp = sm(T.viral, T.viral + 0.25, t); }
    else if (t >= T.real && t < T.j1) { tagTxt = 'LA VRAIE PHYSIQUE'; tagBg = 'rgba(28,140,90,0.9)'; tagOp = sm(T.real, T.real + 0.25, t) * (1 - sm(T.g1 + 1.5, T.g1 + 2.0, t)); }
    else for (const [j, lab] of [[T.j1, '▶▶  1 MINUTE PLUS TARD'], [T.j2, '▶▶  5 MINUTES PLUS TARD'], [T.j3, '▶▶  15 MINUTES PLUS TARD'], [T.j4, '▶▶  20 MINUTES PLUS TARD']]) {
      if (t >= j && t < j + 2.2) { tagTxt = lab; tagBg = 'rgba(20,24,30,0.78)'; tagOp = sm(j, j + 0.12, t) * (1 - sm(j + 1.8, j + 2.2, t)); }
    }
    if (tagIn.textContent !== tagTxt) tagIn.textContent = tagTxt; tagIn.style.background = tagBg; tagIn.style.color = '#fff'; tag.style.opacity = tagOp;
    const fk = t > T.faux && t < T.rewind ? 1 : 0;
    stamp.style.opacity = fk * sm(T.faux, T.faux + 0.08, t); stamp.style.transform = `scale(${1 + 0.35 * (1 - sm(T.faux, T.faux + 0.18, t))})`;
    const rk = t >= T.rewind && t < T.real ? 1 : 0;
    rew.style.opacity = rk * 0.9; rewTxt.style.opacity = rk * (Math.floor(t * 6) % 2 ? 1 : 0.55);
    // déchirure d'image à chaque saut et au retour arrière
    let tearOp = 0, tearY = 0;
    for (const j of [T.rewind, T.real, T.j1, T.j2, T.j3, T.j4]) { const u = t - j; if (u > -0.02 && u < 0.3) { tearOp = 1 - u / 0.3; tearY = 300 + ((j * 997) % 1200) + u * 900; } }
    if (rk) { tearOp = 0.8; tearY = (t * 2300) % 1920; }
    tear.style.opacity = tearOp; tear.style.top = `${tearY}px`;
    canvasEl.style.filter = rk ? 'saturate(0.6) contrast(1.15) hue-rotate(-8deg)' : fk ? 'saturate(0.35) brightness(0.8)' : 'none';
    HUD.end(t, T.endCard, { kicker: 'LE PRINCIPE D’ÉQUIVALENCE, BASE DE LA RELATIVITÉ GÉNÉRALE', q: 'Toi aussi, tu pensais<br>qu’on s’envolerait ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  // pour la bande-son : les instants où une boule touche le sol (en temps vidéo)
  const lands = [THROWS[0].r + THROWS[0].dur + (T.real - S_REAL0), THROWS[1].r + THROWS[1].dur + (T.real - S_REAL0), T.j1 + 2.0 + THROWS[0].dur];
  const throwsV = [THROWS[0].r, THROWS[0].r + (T.real - S_REAL0), THROWS[1].r + (T.real - S_REAL0), T.j1 + 2.0];
  return { stage, T, update, events: () => ({ T, subs: SUBS, lands, throws: throwsV }) };
}

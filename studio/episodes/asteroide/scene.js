// =====================================================================
//  ÉPISODE : « Et si l'astéroïde des dinosaures tombait sur la France ? »
//  Impact au large de la Bretagne ; on regarde depuis les berges du Rhône, à Lyon (~800 km), vers l'ouest :
//  le Rhône, la Presqu'île, la colline de Fourvière (basilique, tour métallique). Fin d'après-midi.
//  Chiffres : physique.py (équations de Collins, Melosh & Marcus 2005 — calculateur « Impact Earth »).
//  Acte 2 : quelques mois plus tard (hiver d'impact : obscurité, froid, plantes mortes ; les petits animaux et les oiseaux survivent).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, add, box, cyl, noise2, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, FX, canvasTex, dotTex } from '../../engine.js';
import { makeWater } from '../../lib.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, entry: 17.9, impact: 18.4, quake: 28.8, ejecta: 33.8, blast: 38.8, blastHit: 43.6, months: 44.3, act2: 46.4, dart: 61.4, endCard: 66.4, duration: 70.6 };
const SUBS = [
  [3.4, 8.0, 'Il y a 66 millions d’années, un astéroïde de 10 km…'],
  [8.4, 13.0, 'Imagine qu’il tombe au large de la Bretagne.'],
  [13.4, 17.8, 'Lyon, à 800 km. Énergie : 5 milliards d’Hiroshima.'],
  [18.8, 23.4, 'Une boule de feu de 270 km de large dépasse l’horizon.'],
  [23.8, 28.4, 'Sa chaleur arrive à la vitesse de la lumière : tout prend feu.'],
  [28.8, 33.4, '3 minutes : le séisme arrive. Magnitude 10 à l’impact.'],
  [33.8, 38.4, '7 minutes : il pleut des roches. 40 cm de débris.'],
  [38.8, 43.4, '40 minutes : le souffle arrive, à plus de 900 km/h.'],
  [44.6, 46.0, 'Quelques mois plus tard…'],
  [46.4, 51.0, 'La poussière cache le Soleil pendant des mois.'],
  [51.4, 56.0, 'Les plantes meurent. Puis ceux qui les mangent.'],
  [56.4, 61.0, 'Presque aucun animal terrestre de plus de 25 kg ne survit.'],
  [61.4, 66.0, 'Aujourd’hui, on sait dévier un astéroïde : mission DART, 2022.'],
];
// secondes écoulées depuis l'impact (histoire) selon le temps de la vidéo
const SINCE = [[18.4, 0], [23.4, 20], [28.8, 160], [33.8, 420], [38.8, 1500], [43.6, 2424]];
const sinceAt = (t) => { if (t <= SINCE[0][0]) return 0; for (let i = 1; i < SINCE.length; i++) if (t <= SINCE[i][0]) { const [a, va] = SINCE[i - 1], [b, vb] = SINCE[i]; return Math.exp(lerp(Math.log(va + 1), Math.log(vb + 1), (t - a) / (b - a))) - 1; } return 2424; };
const fmt = (s) => s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${pad(Math.round(s % 60))}`;

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 60, far: 30000, bloom: [0.35, 0.5, 0.9], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ff8a3a');
  const R = rng(66);
  const nz = noise2(66);
  const SUN_DIR = dirAzEl(-38, 13);
  const IMPACT_AZ = 9;                                    // la Bretagne : à droite de Fourvière, au-dessus de la vallée de la Saône
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.05, 0.13, 0.34], dayHor: [0.62, 0.55, 0.48], stars: 0, sunGlow: 1.0 });
  sky.u.uDay.value = 1;
  const sunSprite = makeSun(scene, SUN_DIR, 60);
  scene.fog = new THREE.Fog('#c9b9a2', 2500, 20000);
  const sun = new THREE.DirectionalLight('#ffd9a8', 2.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 600 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c8d4e8', '#7a6a55', 0.8); scene.add(hemi);
  const fireL = new THREE.DirectionalLight('#ffe2b0', 0); fireL.position.copy(dirAzEl(IMPACT_AZ, 4)).multiplyScalar(300); scene.add(fireL, fireL.target);

  // -------------------------------------------------------------------
  // LE DÉCOR : berges du Rhône, le fleuve, la Presqu'île, Fourvière, les monts du Lyonnais
  // -------------------------------------------------------------------
  // y = 0 : niveau du Rhône. On regarde vers l'ouest = −z.
  function H(x, z) {
    const d = -z;
    let y = 3;
    y = lerp(y, -3, sm(22, 30, d) * (1 - sm(226, 234, d)));                                // le lit du Rhône
    y = lerp(y, 4 + (nz(x * 0.003, z * 0.003, 2) - 0.5) * 3, sm(220, 260, d));            // la Presqu'île
    y = lerp(y, 3, sm(950, 990, d));                                                     // la Saône (cachée)
    const hill = sm(1080, 1500, d) * (1 - sm(2100, 2600, d) * 0.25);
    y += hill * (138 + (nz(x * 0.002, 3, 2) - 0.5) * 30) * (1 - 0.9 * sm(130, 430, x));   // Fourvière ; à droite, la vallée de la Saône
    y += sm(3000, 9000, d) * (260 + (nz(x * 0.0006, z * 0.0006, 3) - 0.5) * 260) * (1 - 0.85 * sm(300, 1500, x));   // les monts du Lyonnais (plus bas au nord-ouest)
    return y;
  }
  const groundMat = M('#7d7a5c', { flat: false });
  { const g = new THREE.PlaneGeometry(30000, 30000, 260, 260); g.rotateX(-Math.PI / 2); g.translate(0, 0, -15000); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i))); g.computeVertexNormals(); const m = new THREE.Mesh(g, groundMat); m.receiveShadow = true; scene.add(m); }
  // le Rhône
  const river = makeWater(scene, { w: 6000, d: 210, z: -128, seg: 120, color: '#3f6a6e', foam: '#dfe6e6', opacity: 1 });
  river.U.uLevel.value = 0.2; river.U.uChop.value = 0.25; river.mat.roughness = 0.55;
  // les berges (bas-port) : promenade, pelouse, escaliers ; le quai haut où se trouve la caméra
  const stoneQ = M('#b9ab90'), lawn = M('#6f8a4a'), path = M('#c8bca2');
  add(new THREE.BoxGeometry(2000, 2, 26), path, scene, 0, 1.0, -10);                // promenade du bas-port
  add(new THREE.BoxGeometry(2000, 0.3, 12), lawn, scene, 0, 2.1, -4);
  add(new THREE.BoxGeometry(2000, 9, 14), stoneQ, scene, 0, 4.5, 14);              // le quai haut (mur)
  add(new THREE.BoxGeometry(2000, 2, 26), path, scene, 0, 1.0, -246);              // le quai d'en face
  // le pont de la Guillotière (à gauche)
  { const deck = M('#cdbf9f'); box(26, 2.2, 260, deck, scene, -150, 9.5, -128); for (const z of [-60, -110, -160, -205]) { box(10, 9, 8, deck, scene, -150, 4.5, z); } for (const sx of [-1, 1]) box(1, 1.2, 260, M('#9a8c72'), scene, -150 + sx * 12.5, 11.2, -128); }
  // des platanes sur les berges
  const trees = [];
  for (let i = 0; i < 30; i++) { const x = -150 + i * 9.5 + (R() - 0.5) * 3; if (Math.abs(x + 2) < 24) continue; trees.push({ x, z: -3 + (R() - 0.5) * 2, s: 0.9 + R() * 0.35 }); }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.42, 6, 7).translate(0, 3, 0), M('#9a8f78'), trees.length);
  const crownMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.4, 1).scale(1, 0.8, 1).translate(0, 8.2, 0), M('#ffffff', { unique: true }), trees.length);
  const D = new THREE.Object3D();
  trees.forEach((tr, i) => { D.position.set(tr.x, 2.2, tr.z); D.scale.setScalar(tr.s); D.rotation.set(0, i, 0); D.updateMatrix(); trunkMesh.setMatrixAt(i, D.matrix); crownMesh.setMatrixAt(i, D.matrix); crownMesh.setColorAt(i, new THREE.Color('#5f8040')); });
  trunkMesh.castShadow = crownMesh.castShadow = true; scene.add(trunkMesh, crownMesh);
  // bancs
  for (let i = 0; i < 6; i++) { const x = -60 + i * 22; box(1.8, 0.08, 0.5, M('#6b4a32'), scene, x, 2.46, -16); box(1.8, 0.45, 0.06, M('#6b4a32'), scene, x, 2.75, -15.75); }
  // la Presqu'île : des immeubles ocre, rose, jaune, aux toits de tuiles rouges
  const WALLS = ['#e3b77a', '#e7c79a', '#d99b74', '#efd9a8', '#e0a98a', '#f2e2c0', '#d8b48c'];
  const blds = [];
  // (x 120…560, au-delà de 380 m : la place Bellecour, une grande ouverture vers le fond)
  for (let i = 0; i < 900; i++) { const x = (R() - 0.5) * 2400, d = 262 + R() * 680; if (Math.abs(x + 150) < 16 && d < 300) continue; if (x > 120 && x < 560 && d > 380) continue; blds.push({ x, z: -d, w: 14 + R() * 18, dd: 12 + R() * 14, h: 15 + R() * 13, c: WALLS[(R() * WALLS.length) | 0], ry: (R() - 0.5) * 0.15, ruin: 0.3 + R() * 0.6 }); }
  // et le Vieux-Lyon au pied de Fourvière
  for (let i = 0; i < 260; i++) { const x = (R() - 0.5) * 1800, d = 990 + R() * 150; if (x > 140 && x < 700) continue; blds.push({ x, z: -d, w: 10 + R() * 12, dd: 10 + R() * 10, h: 14 + R() * 10, c: WALLS[(R() * WALLS.length) | 0], ry: 0, ruin: 0.3 + R() * 0.6 }); }
  const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M('#ffffff', { unique: true }), blds.length);
  const roofMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M('#ffffff', { unique: true }), blds.length);
  const cc = new THREE.Color();
  function poseBuildings(ruinK) {
    blds.forEach((b, i) => {
      const y = H(b.x, b.z), hh = b.h * lerp(1, b.ruin, ruinK);
      D.position.set(b.x, y, b.z); D.rotation.set(0, b.ry, 0); D.scale.set(b.w, hh, b.dd); D.updateMatrix(); wallMesh.setMatrixAt(i, D.matrix);
      wallMesh.setColorAt(i, cc.set(b.c).lerp(new THREE.Color('#4a4642'), ruinK * 0.8));
      D.position.set(b.x, y + hh, b.z); D.scale.set(b.w * 0.95, 2.4 * (1 - ruinK), b.dd * 0.95); D.updateMatrix(); roofMesh.setMatrixAt(i, D.matrix);
      roofMesh.setColorAt(i, cc.set(i % 3 ? '#b2563a' : '#a14a32').lerp(new THREE.Color('#3a3634'), ruinK));
    });
    wallMesh.instanceMatrix.needsUpdate = roofMesh.instanceMatrix.needsUpdate = true; wallMesh.instanceColor.needsUpdate = roofMesh.instanceColor.needsUpdate = true;
  }
  poseBuildings(0); wallMesh.castShadow = true; scene.add(wallMesh, roofMesh);
  // les bois de Fourvière
  const woods = [];
  for (let i = 0; i < 1400; i++) { const x = (R() - 0.5) * 2600, d = 1120 + R() * 700, z = -d; const y = H(x, z); if (y < 30) continue; woods.push({ x, y, z, s: 4 + R() * 5 }); }
  const woodMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0).scale(1, 1.2, 1).translate(0, 1, 0), M('#ffffff', { unique: true }), woods.length);
  function poseWoods(burn, dead) {
    woods.forEach((w, i) => { D.position.set(w.x, w.y, w.z); D.rotation.set(0, i, 0); D.scale.setScalar(w.s * (1 - 0.55 * dead)); D.updateMatrix(); woodMesh.setMatrixAt(i, D.matrix); woodMesh.setColorAt(i, cc.set('#3f5a2c').lerp(new THREE.Color('#2a2420'), burn).lerp(new THREE.Color('#5a554e'), dead)); });
    woodMesh.instanceMatrix.needsUpdate = true; woodMesh.instanceColor.needsUpdate = true;
  }
  poseWoods(0, 0); scene.add(woodMesh);
  // la basilique de Fourvière (blanche, 4 tours) et la tour métallique
  const BAS = new THREE.Vector3(-40, 0, -1470); BAS.y = H(BAS.x, BAS.z);
  const basG = new THREE.Group(); basG.position.copy(BAS); scene.add(basG);
  const white = M('#ece6d8'), slate = M('#7b7f85');
  box(34, 26, 70, white, basG, 0, 13, 0); add(new THREE.BoxGeometry(36, 6, 72).translate(0, 29, 0), slate, basG);
  const towers = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const tw = cyl(5, 5, 48, 8, white, basG, sx * 17, 24, sz * 34); towers.push(tw); }
  add(new THREE.CylinderGeometry(3.5, 3.5, 8, 12), M('#d8b04a', { e: '#8a6a20', ei: 0.3, m: 0.6, r: 0.3 }), basG, 0, 34, 30);
  const TOUR = new THREE.Vector3(60, 0, -1420); TOUR.y = H(TOUR.x, TOUR.z);
  const tourG = new THREE.Group(); tourG.position.copy(TOUR); scene.add(tourG);
  { const iron = M('#5a5f66', { r: 0.5, m: 0.4 }); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = add(new THREE.CylinderGeometry(0.6, 1.0, 86, 5), iron, tourG, sx * 4.5, 43, sz * 4.5); leg.rotation.set(sz * -0.08, 0, sx * 0.08); }
    for (let y = 12; y < 84; y += 12) box(14 - y * 0.12, 0.6, 14 - y * 0.12, iron, tourG, 0, y, 0); box(3, 8, 3, iron, tourG, 0, 88, 0); }

  // -------------------------------------------------------------------
  // L'IMPACT : bolide, boule de feu derrière l'horizon, incendies, pluie de débris, souffle
  // -------------------------------------------------------------------
  const glowTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,240,210,0.95)'); gr.addColorStop(0.75, 'rgba(255,170,90,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  // boule de feu : 272 km de diamètre à 800 km → 19° dans le ciel, son centre 3,6° sous l'horizon (rotondité de la Terre)
  const ballTex = canvasTex(512, 512, (g) => { const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, 'rgba(255,255,250,1)'); gr.addColorStop(0.62, 'rgba(255,236,190,1)'); gr.addColorStop(0.7, 'rgba(255,190,110,0.9)'); gr.addColorStop(0.76, 'rgba(255,140,60,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); });
  const fireball = new THREE.Sprite(new THREE.SpriteMaterial({ map: ballTex, color: new THREE.Color(4, 3.6, 3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
  fireball.renderOrder = -1; scene.add(fireball);
  const FB_DIR = dirAzEl(IMPACT_AZ, -3.6), FB_DIST = 20000, FB_SIZE = 2 * FB_DIST * Math.tan(9.6 * Math.PI / 180);
  // le panache de vapeur et de roche fondue : il monte bien au-dessus de l'atmosphère (visible de très loin)
  const plume = Array.from({ length: 34 }, (_, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false })); sp.renderOrder = -1; scene.add(sp); return { sp, k: i / 33, j: (R() - 0.5) }; });
  const bolide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: new THREE.Color(4, 4, 3.5), transparent: true, opacity: 0, fog: false }));
  bolide.frustumCulled = false; scene.add(bolide);
  // incendies (arbres des berges, bois de Fourvière, toits) et fumées
  const fireTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 80, 0, 64, 70, 64); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.3, 'rgba(255,140,40,0.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const smokeTex = canvasTex(128, 128, (g) => { for (let k = 0; k < 8; k++) { const x = 34 + (k * 37 % 60), y = 34 + (k * 53 % 60), r = 26 + (k % 3) * 8; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } });
  const fires = [];
  trees.forEach((tr) => fires.push({ p: new THREE.Vector3(tr.x, 9.5 * tr.s, tr.z), t0: T.impact + 2.5 + R() * 4, s: 7 * tr.s }));
  for (let i = 0; i < 70; i++) { const w = woods[(R() * woods.length) | 0]; fires.push({ p: new THREE.Vector3(w.x, w.y + w.s * 1.5, w.z), t0: T.impact + 1.5 + R() * 6, s: 30 + R() * 40 }); }
  for (let i = 0; i < 50; i++) { const b = blds[(R() * 900) | 0]; fires.push({ p: new THREE.Vector3(b.x, H(b.x, b.z) + b.h + 2, b.z), t0: T.impact + 4 + R() * 10, s: 14 + R() * 18 }); }
  fires.forEach((f) => { f.sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, color: new THREE.Color(2.6, 1.4, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); f.sp.position.copy(f.p); scene.add(f.sp);
    f.sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: '#3e3833', depthWrite: false, transparent: true, opacity: 0 })); scene.add(f.sm); f.ph = R() * 9; });
  // la pluie de débris incandescents (éjectas qui retombent)
  const NE = 700, ej = [];
  for (let i = 0; i < NE; i++) ej.push({ x: (R() - 0.5) * 2400, z: -R() * 2600 - 30, t0: T.ejecta + R() * 9, dur: 0.8 + R() * 1.2, ang: 0.5 + R() * 0.4 });
  const ejGeo = new THREE.BufferGeometry(); ejGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NE * 6), 3)); ejGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(NE * 6), 3));
  const ejHeadGeo = new THREE.BufferGeometry(); ejHeadGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NE * 3), 3));
  const ejHeads = new THREE.Points(ejHeadGeo, new THREE.PointsMaterial({ size: 3.4, sizeAttenuation: false, map: dotTex(), color: new THREE.Color(3, 1.8, 0.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); ejHeads.frustumCulled = false; scene.add(ejHeads);
  const ejLines = new THREE.LineSegments(ejGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); ejLines.frustumCulled = false; scene.add(ejLines);
  // le souffle : un mur de poussière qui arrive de l'ouest, des débris arrachés
  const wall = []; for (let i = 0; i < 90; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: '#8a7a68', depthWrite: false, transparent: true, opacity: 0 })); scene.add(sp); wall.push({ sp, x: (R() - 0.5) * 4000, h: R(), s: 300 + R() * 500, ph: R() * 6 }); }
  const NDB = 700, deb = [];
  for (let i = 0; i < NDB; i++) deb.push({ x: (R() - 0.5) * 700, z: -40 - R() * 900, y: 3 + R() * 25, s: 0.3 + R() * 2.5, w: new THREE.Vector3(R() * 8, R() * 8, R() * 8), k: 0.5 + R(), c: R() < 0.4 ? '#b2563a' : R() < 0.7 ? '#e3b77a' : '#5f8040' });
  const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), M('#ffffff', { unique: true }), NDB); debMesh.frustumCulled = false; deb.forEach((d, i) => debMesh.setColorAt(i, cc.set(d.c))); scene.add(debMesh);
  // hiver d'impact : neige grise
  const NS = 2400, snow = []; for (let i = 0; i < NS; i++) snow.push({ x: (R() - 0.5) * 140, z: -R() * 160 + 12, h: R(), v: 0.6 + R() * 0.6, sw: R() * 9 });
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NS * 3), 3));
  const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, map: dotTex(), color: '#b8b2aa', transparent: true, opacity: 0, depthWrite: false })); snowPts.frustumCulled = false; scene.add(snowPts);

  // -------------------------------------------------------------------
  // LA VIE SUR LES BERGES : promeneurs, joggeurs, pigeons… et, des mois plus tard, des corbeaux et un renard
  // -------------------------------------------------------------------
  const SH = ['#c4473a', '#3d6e9e', '#e0c45a', '#f2f0ea', '#6b8f5e', '#8a5a9a', '#2f3e57'], PA = ['#2f3a4f', '#5a4a3a', '#d8cfb8', '#3b3b3b'];
  const people = [];
  for (let i = 0; i < 22; i++) {
    const P = makePerson(scene, { shirt: SH[i % 7], pants: PA[i % 4], hair: ['#2a1d15', '#5a3a22', '#c9a35f', '#1a1a1a'][i % 4], skin: ['#e2b994', '#c99a74', '#8d5e3c', '#f0c8a8'][i % 4] });
    P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const role = i < 6 ? 'jog' : i < 14 ? 'walk' : 'sit';
    people.push({ P, role, x0: -40 + R() * 80, z0: -8 - R() * 12, dir: R() < 0.5 ? 1 : -1, v: role === 'jog' ? 2.6 + R() * 0.8 : 1 + R() * 0.4, react: R() < 0.5 ? 'bridge' : R() < 0.6 ? 'drop' : 'flee', seed: R() * 9 });
  }
  const birdMat = new THREE.MeshBasicMaterial({ color: '#2a2a2e', side: THREE.DoubleSide });
  const mkBird = () => { const g = new THREE.Group(); scene.add(g); const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.15), birdMat), wr = wl.clone(); wl.position.x = -0.25; wr.position.x = 0.25; wl.rotation.x = wr.rotation.x = Math.PI / 2; const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.35), birdMat); g.add(wl, wr, b); return { g, wl, wr }; };
  const pigeons = Array.from({ length: 26 }, () => ({ ...mkBird(), x: -30 + R() * 60, z: -12 - R() * 10, ph: R() * 6, d: new THREE.Vector3((R() - 0.5) * 0.6, 0.35 + R() * 0.3, 1) }));
  const crows = Array.from({ length: 7 }, (_, i) => ({ ...mkBird(), x: -20 + i * 6 + R() * 3, z: -14 - R() * 8, ph: R() * 6 }));
  const fox = (() => { const root = new THREE.Group(); scene.add(root); const fur = M('#9a6a40'); const body = new THREE.Group(); body.position.y = 0.34; root.add(body); box(0.2, 0.18, 0.58, fur, body, 0, 0, 0); box(0.16, 0.15, 0.2, fur, body, 0, 0.1, 0.36); box(0.1, 0.1, 0.45, fur, body, 0, 0, -0.5); const legs = []; for (const [x, z] of [[-0.06, 0.22], [0.06, 0.22], [-0.06, -0.2], [0.06, -0.2]]) { const p = new THREE.Group(); p.position.set(x, -0.08, z); body.add(p); box(0.05, 0.28, 0.05, M('#3a2a1e'), p, 0, -0.13, 0); legs.push(p); } return { root, legs }; })();

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(-4, 7.5, 7);
  const LOOK = new THREE.Vector3(105, 34, -1500);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const BASE = Date.UTC(2027, 5, 18, 18, 42, 0);
  function update(t) {
    const act2 = t >= T.months;
    const since = sinceAt(t);
    const heat = sm(T.impact, T.impact + 1.2, t) * (1 - sm(T.blastHit, T.blastHit + 0.1, t));
    const quake = sm(T.quake, T.quake + 0.3, t) * (1 - sm(T.quake + 3.5, T.quake + 4.5, t));
    const blastK = sm(T.blast, T.blastHit, t);
    // --- caméra
    camera.position.copy(CAM).add(tmp.set(Math.sin(t * 0.2) * 0.2, 0, 0));
    const sh = 0.06 * quake * (Math.sin(t * 1.7) > -0.3 ? 1 : 0.4) + 0.15 * sm(T.blastHit - 1.2, T.blastHit, t);
    camera.position.x += (Math.sin(t * 37) + Math.sin(t * 23)) * sh; camera.position.y += (Math.sin(t * 29) + Math.cos(t * 41)) * sh * 0.7;
    camera.fov = 52; camera.updateProjectionMatrix(); camera.lookAt(LOOK); camera.updateMatrixWorld();
    sky.follow(camera); sunSprite.follow(camera);
    // --- lumière et ciel : fin d'après-midi → éclat de la boule de feu → ciel rouge des éjectas → poussière ; acte 2 : pénombre
    const ejK = sm(T.ejecta, T.ejecta + 3, t) * (1 - sm(T.blastHit, T.blastHit + 0.1, t));
    sky.u.uTintDir.value.copy(dirAzEl(IMPACT_AZ, 2)); sky.u.uTint.value.setRGB(1.0, 0.55, 0.25);
    sky.u.uTintAmt.value = act2 ? 0 : 0.45 * heat * (1 - 0.4 * sm(T.impact + 4, T.quake, t)) + 0.6 * ejK;
    sky.u.uDayHor.value.setRGB(...(act2 ? [0.16, 0.14, 0.13] : [lerp(0.62, 0.75, ejK), lerp(0.55, 0.35, ejK), lerp(0.48, 0.22, ejK)]));
    sky.u.uDayZen.value.setRGB(...(act2 ? [0.07, 0.065, 0.06] : [lerp(0.05, 0.35, ejK), lerp(0.13, 0.12, ejK), lerp(0.34, 0.08, ejK)]));
    sky.u.uSunGlow.value = act2 ? 0 : 1; sunSprite.visible = !act2;
    sun.position.copy(SUN_DIR).multiplyScalar(300).add(tmp.set(0, 0, -60)); sun.target.position.set(0, 0, -60);
    sun.intensity = act2 ? 0.12 : 2.8 * (1 - 0.5 * ejK); hemi.intensity = act2 ? 0.55 : 0.8 + 0.1 * heat; hemi.color.setRGB(...(act2 ? [0.5, 0.48, 0.46] : [0.78, 0.83, 0.91]));
    fireL.intensity = act2 ? 0 : 1.1 * heat * (1 - 0.5 * sm(T.impact + 5, T.quake, t)) + 0.7 * ejK; fireL.position.copy(dirAzEl(IMPACT_AZ, 4)).multiplyScalar(300); fireL.target.position.set(0, 0, -60);
    scene.fog.color.setRGB(...(act2 ? [0.22, 0.21, 0.2] : [lerp(0.79, 0.85, ejK), lerp(0.73, 0.45, ejK), lerp(0.64, 0.3, ejK)])); scene.fog.near = act2 ? 120 : lerp(2500, 600, ejK); scene.fog.far = act2 ? 2600 : lerp(20000, 5000, ejK);
    renderer.toneMappingExposure = act2 ? 1.25 : 1.0 - 0.38 * heat * (1 - 0.5 * sm(T.quake, T.ejecta, t));   // la caméra baisse son exposition face à l'éclat
    // --- le bolide puis la boule de feu
    { const u = (t - T.entry) / 0.5, on = u > 0 && u < 1 ? 1 : 0; const a = dirAzEl(IMPACT_AZ - 3 + 3 * u, 14 - 13 * u).multiplyScalar(9000).add(camera.position), b = dirAzEl(IMPACT_AZ - 3 + 3 * Math.max(0, u - 0.3), 14 - 13 * Math.max(0, u - 0.3)).multiplyScalar(9000).add(camera.position); bolide.geometry.setFromPoints([a, b]); bolide.material.opacity = on; }
    const fbK = sm(T.impact - 0.05, T.impact + 0.6, t) * (1 - sm(T.blast, T.blastHit, t)) * (act2 ? 0 : 1);
    fireball.position.copy(FB_DIR).multiplyScalar(FB_DIST).add(camera.position);
    fireball.scale.setScalar(FB_SIZE * 1.3 * lerp(0.85, 1.0, sm(T.impact, T.impact + 3, t)));
    const cool = sm(T.impact + 1, T.quake + 2, t); fireball.material.color.setRGB(lerp(5, 3.4, cool), lerp(4.4, 1.5, cool), lerp(3.4, 0.45, cool)); fireball.material.opacity = fbK;
    HUD.flash(sm(T.impact - 0.05, T.impact, t) * (1 - sm(T.impact + 0.05, T.impact + 0.6, t)));
    {
      const grow = sm(T.impact, T.impact + 7, t), top = 4 + 24 * grow, coolP = sm(T.impact + 3, T.quake + 4, t);
      plume.forEach((p) => {
        const el = lerp(-1, top, p.k), wdt = lerp(6, 3 + 10 * grow, p.k ** 1.5) + 2 * p.j;   // une colonne qui s'évase en haut
        const d = dirAzEl(IMPACT_AZ + p.j * wdt * 0.4, el); p.sp.position.copy(d).multiplyScalar(FB_DIST * 0.98).add(camera.position);
        p.sp.scale.setScalar(2 * FB_DIST * Math.tan(wdt * Math.PI / 360) * 1.6);
        const hot = 1 - coolP * (0.6 + 0.4 * p.k);
        p.sp.material.color.setRGB(lerp(0.9, 2.6, hot), lerp(0.25, 1.5, hot), lerp(0.06, 0.6, hot));
        p.sp.material.opacity = fbK * sm(0, 0.15, grow - p.k * 0.9) * (0.55 + 0.45 * hot) * (1 - 0.5 * ejK);
      });
    }
    // --- incendies et fumées
    const burnK = sm(T.impact + 2, T.ejecta + 6, t);
    fires.forEach((f) => { const u = t - f.t0, on = act2 ? 0 : sm(0, 1.2, u) * (1 - sm(T.blastHit - 0.2, T.blastHit, t)); f.sp.material.opacity = on * (0.6 + 0.4 * Math.sin(t * 9 + f.ph) * Math.sin(t * 5.3 + f.ph)); f.sp.scale.setScalar(f.s * (0.8 + 0.25 * Math.sin(t * 7 + f.ph)));
      const su = ((t * 0.15 + f.ph) % 1); f.sm.position.copy(f.p).add(tmp.set(su * f.s * 0.6, f.s * 0.4 + su * f.s * 3, 0)); f.sm.scale.setScalar(f.s * (1 + su * 3)); f.sm.material.opacity = on * 0.45 * (1 - su); });
    trees.forEach((tr, i) => crownMesh.setColorAt(i, cc.set('#5f8040').lerp(new THREE.Color('#3a2a1a'), burnK * (0.6 + 0.4 * ((i * 7) % 5) / 5))));
    crownMesh.instanceColor.needsUpdate = true; crownMesh.visible = !act2;
    poseWoods(burnK, act2 ? 1 : 0);
    // --- la pluie de débris
    {
      const a = ejGeo.attributes.position.array, c = ejGeo.attributes.color.array;
      ej.forEach((e, i) => { const u = (t - e.t0) / e.dur; const on = u > 0 && u < 1 && !act2; const yTop = 900, yBot = H(e.x, e.z) + 2; const y = lerp(yTop, yBot, u), dx = (1 - u) * 400 * e.ang; const y2 = y + 90, dx2 = dx + 40 * e.ang;
        a.set([e.x + dx, y, e.z, e.x + dx2 * 1.6, y + 220, e.z], i * 6); const k = on ? 3.2 : 0; ejHeadGeo.attributes.position.array.set(on ? [e.x + dx, y, e.z] : [0, -1e5, 0], i * 3); c.set([k, k * 0.55, k * 0.2, k * 0.2, k * 0.06, 0], i * 6); });
      ejGeo.attributes.position.needsUpdate = true; ejGeo.attributes.color.needsUpdate = true; ejHeadGeo.attributes.position.needsUpdate = true;
    }
    FX.uFrostColor.value.setRGB(...(act2 ? [0.42, 0.41, 0.4] : [0.22, 0.2, 0.19])); FX.uFrost.value = act2 ? 0.95 : 0.75 * sm(T.ejecta + 1, T.blast, t);
    // --- le souffle
    wall.forEach((w) => { const front = lerp(-3200, 40, blastK); const on = blastK > 0 && !act2; w.sp.position.set(w.x, 60 + w.h * 400 + Math.sin(t + w.ph) * 20, front - w.h * 200); w.sp.scale.setScalar(w.s * (1 + blastK)); w.sp.material.opacity = on ? 0.85 * sm(0, 0.15, blastK) : 0; });
    deb.forEach((d, i) => { const front = lerp(-3200, 40, blastK); D.position.set(d.x, d.y, d.z); D.scale.setScalar(0);
      if (!act2 && front > d.z) { const dist = (front - d.z) * d.k; D.position.z += dist; D.position.y += Math.sin(dist * 0.02 + i) * 6 + dist * 0.06; D.rotation.set(d.w.x * dist * 0.01, d.w.y * dist * 0.01, d.w.z * dist * 0.01); D.scale.setScalar(d.s); if (D.position.z > CAM.z - 2) D.scale.setScalar(0); }
      D.updateMatrix(); debMesh.setMatrixAt(i, D.matrix); });
    debMesh.instanceMatrix.needsUpdate = true;
    poseBuildings(act2 ? 1 : 0);
    towers.forEach((tw, i) => { tw.visible = !act2 || i % 2 === 0; }); tourG.rotation.z = act2 ? 1.25 : 0; tourG.position.y = TOUR.y + (act2 ? 4 : 0);
    // --- neige grise de l'hiver d'impact
    { const a = snowGeo.attributes.position.array; snow.forEach((p, i) => { a[i * 3] = p.x + Math.sin(t * 0.5 + p.sw) * 1.5; a[i * 3 + 1] = 30 - ((t * p.v + p.h * 30) % 30); a[i * 3 + 2] = p.z; }); snowGeo.attributes.position.needsUpdate = true; snowPts.material.opacity = act2 ? 0.8 : 0; }
    // --- les gens : flânent → se tournent vers l'éclair, se protègent → courent à l'ombre du pont / se couchent / fuient
    people.forEach((H0) => {
      const { P } = H0; P.reset(); P.root.visible = !act2;
      if (act2) return;
      let x = H0.x0, z = H0.z0, ry = H0.dir > 0 ? Math.PI / 2 : -Math.PI / 2, rx = 0;
      const tw = Math.min(t, T.impact);
      if (H0.role !== 'sit') { x += ((tw * H0.v) % 40 - 20) * H0.dir; P.walk(tw * H0.v * (H0.role === 'jog' ? 3.2 : 4.4) + H0.seed, t < T.impact ? (H0.role === 'jog' ? 1.3 : 1) : 0); }
      else { P.sit(t < T.impact + 0.5 ? 1 : 0); ry = Math.PI; }
      const look = sm(T.impact, T.impact + 0.5, t);
      if (look > 0) { ry = lerp(ry, Math.PI + 0.25, look); P.armR.rotation.set(-2.5 * look, 0, -0.3); P.armL.rotation.set(-2.2 * look, 0, 0.3); P.head.rotation.x = 0.2 * look; }
      const u = t - (T.impact + 1.2 + H0.seed * 0.08);
      if (u > 0) {
        if (H0.react === 'bridge') { const k = Math.min(1, u * 4.5 / Math.max(1, Math.abs(-150 - x))); x = lerp(x, -146 + (H0.seed - 4.5) * 1.5, k); ry = -Math.PI / 2; if (k < 1) P.walk(t * 15 + H0.seed, 1.4); else { P.sit(0.6); ry = 0; } }
        else if (H0.react === 'drop') { const k = sm(0, 0.6, u); rx = -Math.PI / 2 * k; P.armL.rotation.set(-2.9 * k, 0, 0.3); P.armR.rotation.set(-2.9 * k, 0, -0.3); }
        else { z += u * 4.2; x += Math.sin(H0.seed) * u; ry = 0; P.walk(t * 15 + H0.seed, 1.4); }
      }
      if (quake > 0 && H0.react !== 'drop') rx += Math.sin(t * 9 + H0.seed) * 0.12 * quake;
      P.root.position.set(x, 2.0, z); P.root.rotation.set(rx, ry, 0, 'YXZ');
      if (z > CAM.z - 3) P.root.visible = false;
    });
    // pigeons : s'envolent à l'éclair
    pigeons.forEach((b, i) => { const u = t - T.impact - 0.2 - (i % 5) * 0.05; b.g.visible = !act2 && u < 6; if (!b.g.visible) return; if (u < 0) { b.g.position.set(b.x, 2.1, b.z); b.g.rotation.set(0, b.ph, 0); b.wl.rotation.z = 0.3; b.wr.rotation.z = -0.3; } else { b.g.position.set(b.x + b.d.x * u * 6, 2.1 + b.d.y * u * 6 + u * u, b.z + b.d.z * u * 7); b.g.rotation.set(0, Math.atan2(b.d.x, b.d.z), 0); const f = Math.sin(t * 16 + b.ph) * 0.8; b.wl.rotation.z = f; b.wr.rotation.z = -f; } });
    // acte 2 : des corbeaux sur les berges (les oiseaux sont des dinosaures… qui ont survécu), un renard
    crows.forEach((b, i) => { b.g.visible = act2; if (!act2) return; const hop = Math.max(0, Math.sin(t * 2.3 + b.ph)) * 0.15; b.g.position.set(b.x + Math.sin(t * 0.3 + b.ph), 2.15 + hop, b.z); b.g.rotation.set(0, b.ph + Math.sin(t * 0.7) * 0.5, 0); b.wl.rotation.z = 0.2; b.wr.rotation.z = -0.2; b.g.scale.setScalar(1.6); });
    { fox.root.visible = act2 && t > 55; const x = lerp(-30, 12, sm(55, 61, t)); fox.root.position.set(x, 2.0, -11); fox.root.rotation.y = Math.PI / 2; fox.legs.forEach((L, i) => { L.rotation.x = Math.sin(t * 10 + i * 1.6) * 0.5 * (t < 61 ? 1 : 0); }); }

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    HUD.live(t, 'LYON · BERGES DU RHÔNE · CAM 01', act2 ? 'QUELQUES MOIS PLUS TARD' : (() => { const d = new Date(BASE + (t < T.impact ? t * 1000 : T.impact * 1000 + since * 1000)); return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; })());
    if (t < T.impact) { HUD.block(1, { label: 'ASTÉROÏDE', value: '10 km', sub: '20 KM/S · CHUTE AU LARGE DE LA BRETAGNE', color: '#fff' }); HUD.show2(false); }
    else if (!act2) {
      HUD.block(1, { label: 'DEPUIS L’IMPACT', value: fmt(since), sub: 'À 800 KM D’ICI', color: '#ffb15e' }); HUD.show2(true);
      const [lab, val, sub] = t < T.quake ? ['CHALEUR REÇUE', '×70 le Soleil', 'PENDANT ~30 MINUTES'] : t < T.ejecta ? ['SÉISME À LYON', 'magnitude 5', 'MAGNITUDE 10 À L’IMPACT'] : t < T.blast ? ['DÉBRIS', '≥ 40 cm', 'ROCHES EN FUSION RETOMBÉES DU CIEL'] : ['VENT', '950 km/h', 'SURPRESSION : 1,8 BAR'];
      HUD.block(2, { label: lab, value: val, sub, color: '#ff8a3a' });
    } else {
      HUD.block(1, { label: 'HIVER D’IMPACT', value: 'nuit en plein jour', sub: 'POUSSIÈRE ET SUIE DANS TOUT LE CIEL', color: '#d8d2c8', scale: 0.8 });
      HUD.show2(true); HUD.block(2, { label: 'TEMPÉRATURE', value: 'jusqu’à −15 °C', sub: 'PAR RAPPORT À AVANT L’IMPACT', color: '#bcd2ff' });
    }
    HUD.hook(t, 'Et si l’astéroïde des dinosaures<br>tombait sur la <em>France</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.reticle('fourv', tmp.copy(BAS).setY(BAS.y + 70), camera, 'FOURVIÈRE', sm(13.6, 14.2, t) * (1 - sm(17.2, 17.7, t)), 70);
    HUD.reticle('bzh', tmp2.copy(dirAzEl(IMPACT_AZ, 1.5)).multiplyScalar(8000).add(camera.position), camera, 'BRETAGNE · 800 KM', sm(9.0, 9.6, t) * (1 - sm(12.6, 13.0, t)), 90);
    HUD.fade(sm(T.blastHit - 0.15, T.blastHit + 0.2, t) * (1 - sm(T.months + 0.3, T.months + 1.2, t)));
    HUD.end(t, T.endCard, { kicker: 'AUCUN ASTÉROÏDE GÉANT CONNU NE DOIT FRAPPER LA TERRE CE SIÈCLE', q: 'Et toi, tu ferais quoi<br>de tes 40 minutes ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

// =====================================================================
//  ÉPISODE : « Et si tu sautais dans un trou qui traverse la Terre ? » — Champ-de-Mars, Paris
//  Hypothèses (dites à l'écran) : tunnel droit par le centre, vide d'air, parois indestructibles.
//  Chiffres : Terre PREM (tunnel.py → data.js) — traversée 38 min 10 s, 35 700 km/h au centre (9,9 km/s),
//  aller-retour 76 min (cf. A. Klotz, « The gravity tunnel in a non-uniform Earth », Am. J. Phys. 83, 231, 2015 : 38 min 11 s).
//  Pression au centre 364 GPa (3,6 millions de bars). Températures ≈ (graine ~6 000 °C : Anzellini et al., Science 2013).
//  L'antipode de Paris est dans le Pacifique Sud, au sud-est de la Nouvelle-Zélande (près des îles des Antipodes).
//  Forage le plus profond : SG-3 de Kola, 12 262 m (1989).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, add, box, cyl, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, bake, keys } from '../../engine.js';
import { buildEiffel } from '../../lib-eiffel.js';
import { SIM } from './data.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS, S } from './insets.js';

const RT = 6371;
const T = { hookOut: 3.0, countdown: 7.6, jump: 11.0, apesanteur: 15.0, center: 32.0, exit: 37.0, back: 41.0, emerge: 53.0, caught: 56.0, real: 57.0, endCard: 66.0, duration: 70.2 };
const TAU_BACK = 2 * SIM.T1;   // retour à Paris (s après le saut)
// temps vidéo → secondes écoulées depuis le saut (accéléré au milieu, temps réel au départ et à l'arrivée)
const TK = [[T.jump, 0], [19, 8], [23, 300], [28, 900], [32, 1146], [37, SIM.T1], [41, 2700], [47, 4400], [50, 4555], [T.emerge, TAU_BACK - 3], [T.caught, TAU_BACK]];
const tauAt = (t) => (t < T.jump ? t - T.jump : t > T.caught ? TAU_BACK + (t - T.caught) : keys(TK, t));
const SUBS = [
  [3.3, 7.4, 'Un tunnel de Paris jusqu’à l’autre bout du monde : 12 742 km.'],
  [7.6, 10.8, 'Sans air, aux parois indestructibles. Tu sautes.'],
  [11.2, 14.8, 'Tu tombes comme une pierre…'],
  [15.0, 18.8, '…et tu ne pèses plus rien : tu es en apesanteur.'],
  [19.2, 22.8, 'En 5 minutes : 440 km sous Paris, à 10 700 km/h.'],
  [23.2, 27.8, 'Tu traverses le manteau : des roches à plus de 2 000 °C.'],
  [28.0, 31.8, 'Puis le noyau de fer : de 4 000 à 6 000 °C.'],
  [32.0, 36.8, '19 minutes : le centre de la Terre, à 35 700 km/h !'],
  [37.0, 40.8, '38 minutes : tu ressors de l’autre côté, dans le Pacifique Sud.'],
  [41.0, 44.8, 'Là-bas, il fait nuit. Et personne pour te rattraper…'],
  [45.0, 49.8, '…alors tu retombes, et tu refais tout le chemin.'],
  [50.2, 52.8, '76 minutes après ton saut…'],
  [53.2, 56.8, '…te revoilà à Paris !'],
  [57.0, 60.8, 'En vrai : la rotation de la Terre te plaquerait contre la paroi.'],
  [61.0, 65.8, 'Et le trou le plus profond jamais creusé ne fait que 12 km.'],
];
// température ≈ selon la profondeur (km)
const TEMP = [[0, 15], [12, 180], [35, 500], [100, 1300], [410, 1550], [660, 1900], [2700, 2600], [2891, 3700], [5150, 5900], [6371, 6000]];
const tempAt = (d) => keys(TEMP, d);
const layerAt = (d) => (d < 35 ? 'CROÛTE' : d < 2891 ? 'MANTEAU' : d < 5150 ? 'NOYAU EXTERNE · FER LIQUIDE' : 'GRAINE · FER SOLIDE');

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 62, far: 6000, bloom: [0.18, 0.4, 0.95], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffb35c');
  const R = rng(1146);

  // -------------------------------------------------------------------
  // LE CIEL, LE SOLEIL (il bouge un peu pendant les 76 minutes)
  // -------------------------------------------------------------------
  const sunDirAt = (tau) => dirAzEl(-122 + 17 * clamp(tau / TAU_BACK), 29 - 8 * clamp(tau / TAU_BACK));
  const sky = makeSky(scene, { sunDir: sunDirAt(0), dayZen: [0.03, 0.12, 0.40], dayHor: [0.36, 0.48, 0.62], stars: 0 });
  const sunSprite = makeSun(scene, sunDirAt(0), 60);
  scene.fog = new THREE.Fog('#b6c4d2', 400, 4200);
  const sun = new THREE.DirectionalLight('#fff0d8', 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 300 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c4dcff', '#8f8466', 0.85); scene.add(hemi);

  // -------------------------------------------------------------------
  // LE CHAMP-DE-MARS : esplanade, pelouses, allées d'arbres, immeubles haussmanniens, la tour au fond
  // -------------------------------------------------------------------
  const HOLE = new THREE.Vector3(0, 0, -9), HR = 2.2;
  const world = new THREE.Group();
  { // le sol (sable stabilisé) percé du trou
    const sh = new THREE.Shape(); sh.moveTo(-1500, -1500); sh.lineTo(1500, -1500); sh.lineTo(1500, 1500); sh.lineTo(-1500, 1500); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(HOLE.x, -HOLE.z, HR, 0, Math.PI * 2, true); sh.holes.push(hole);
    const m = add(new THREE.ShapeGeometry(sh, 48), M('#cbbd9b', { flat: false }), scene, 0, 0, 0, -Math.PI / 2); m.receiveShadow = true;
  }
  const lawn = M('#6f9446'), lawn2 = M('#7aa04f');
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { const z0 = -42 - k * 122; const m = add(new THREE.PlaneGeometry(36, 110), k % 2 ? lawn : lawn2, world, sx * 23, 0.03, z0 - 55, -Math.PI / 2); }
  // bordures basses (petites haies)
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) box(0.4, 0.5, 110, M('#4f6e34'), world, sx * 41.2, 0.25, -42 - k * 122 - 55);
  // allées d'arbres (marronniers) de chaque côté
  const treeCrowns = [], treeTrunks = [];
  for (const x of [-58, -68, 58, 68]) for (let z = -24; z > -520; z -= 11) { treeCrowns.push([x + (R() - 0.5), z + (R() - 0.5) * 2, 0.9 + R() * 0.25]); }
  const crownMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(5.2, 1).scale(1, 0.85, 1).translate(0, 10.5, 0), M('#ffffff', { unique: true }), treeCrowns.length);
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6).translate(0, 3.5, 0), M('#6b5a48'), treeCrowns.length);
  { const D = new THREE.Object3D(), c = new THREE.Color(), G = ['#56783a', '#5f8340', '#4f7034', '#668a44'];
    treeCrowns.forEach(([x, z, s], i) => { D.position.set(x, 0, z); D.scale.setScalar(s); D.rotation.y = i; D.updateMatrix(); crownMesh.setMatrixAt(i, D.matrix); trunkMesh.setMatrixAt(i, D.matrix); crownMesh.setColorAt(i, c.set(G[i % 4])); }); }
  crownMesh.castShadow = trunkMesh.castShadow = true; scene.add(crownMesh, trunkMesh);
  // immeubles haussmanniens (pierre claire, toits de zinc, balcons filants)
  const stone = ['#e6dcc4', '#e9e0ca', '#ddd2b6', '#e3d7bc'], zinc = M('#5f6b78', { r: 0.5 });
  for (const sx of [-1, 1]) {
    let z = -10;
    while (z > -900) { const w = 18 + R() * 14, h = 20 + R() * 4, x = sx * (150 + R() * 6);
      box(26, h, w, M(stone[(R() * 4) | 0]), world, x, h / 2, z - w / 2);
      add(new THREE.BoxGeometry(24, 5, w - 0.5), zinc, world, x, h + 2.5, z - w / 2);
      for (const yy of [h * 0.32, h * 0.8]) box(0.6, 0.35, w, M('#2d2d2d'), world, x - sx * 13.1, yy, z - w / 2);
      z -= w + 0.4; }
    // des rangées plus loin derrière
    for (let z2 = -40; z2 > -1000; z2 -= 60) box(40, 22 + R() * 6, 55, M(stone[(R() * 4) | 0]), world, sx * (215 + R() * 30), 11, z2);
  }
  // au loin, derrière la tour : la colline de Chaillot et le palais du Trocadéro
  { const p = { x: 0, z: -1450 }; add(new THREE.IcosahedronGeometry(1, 2), M('#7c9468'), world, 0, -20, p.z - 40).scale.set(700, 60, 140);
    for (const sx of [-1, 1]) { box(260, 26, 30, M('#e1d6bd'), world, sx * 190, 34, p.z - 20); box(30, 30, 30, M('#e1d6bd'), world, sx * 60, 36, p.z - 20); } }
  scene.add(bake(world));
  const { tower } = buildEiffel(scene, new THREE.Vector3(0, 0, -560));

  // -------------------------------------------------------------------
  // LE TROU : un puits gris qui se perd dans le noir, un col d'acier, une rambarde, un portique avec un projecteur
  // -------------------------------------------------------------------
  { const g = new THREE.CylinderGeometry(HR, HR, 60, 40, 30, true); const col = []; const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) - 30; const k = Math.exp(y / 4.5); col.push(0.5 * k, 0.5 * k, 0.52 * k); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    add(g, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.BackSide, roughness: 0.95 }), scene, HOLE.x, -30, HOLE.z);
    add(new THREE.CircleGeometry(HR, 32), new THREE.MeshBasicMaterial({ color: '#000' }), scene, HOLE.x, -59, HOLE.z, -Math.PI / 2);
    // anneaux de béton qui défilent dans le puits (pour sentir la profondeur)
    for (let y = -1.5; y > -26; y -= 2.5) add(new THREE.TorusGeometry(HR - 0.02, 0.05, 4, 40), M('#3a3a3c'), scene, HOLE.x, y, HOLE.z, Math.PI / 2);
  }
  const steelM = M('#8c949c', { r: 0.35, m: 0.6 });
  add(new THREE.RingGeometry(HR, HR + 0.55, 48), steelM, scene, HOLE.x, 0.03, HOLE.z, -Math.PI / 2);
  add(new THREE.CylinderGeometry(HR + 0.05, HR + 0.05, 0.3, 48, 1, true), steelM, scene, HOLE.x, 0.15, HOLE.z);
  // rambarde (ouverte côté caméra pour voir dans le trou)
  const railM = M('#d9dde0', { r: 0.4, m: 0.4 });
  { const N = 26, gap = 0.9; const pts = [];
    for (let i = 0; i <= N; i++) { const a = Math.PI / 2 + gap + (i / N) * (2 * Math.PI - 2 * gap); const x = HOLE.x + Math.cos(a) * (HR + 0.4), z = HOLE.z + Math.sin(a) * (HR + 0.4);
      cyl(0.03, 0.03, 1.1, 6, railM, scene, x, 0.55, z); pts.push(new THREE.Vector3(x, 1.1, z)); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.035, 6, false), railM, scene);
    const pts2 = pts.map((p) => p.clone().setY(0.6)); add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 80, 0.025, 6, false), railM, scene); }
  // mât avec un bras au-dessus du trou + projecteur
  const yellow = M('#e3b23c', { r: 0.5 });
  box(0.3, 4.7, 0.3, yellow, scene, HOLE.x + 3.9, 2.35, HOLE.z - 1.8); box(4.2, 0.25, 0.25, yellow, scene, HOLE.x + 1.9, 4.6, HOLE.z - 1.8);
  box(0.6, 0.4, 0.6, M('#222'), scene, HOLE.x, 4.3, HOLE.z - 1.8);
  const spot = new THREE.SpotLight('#fff3dc', 150, 70, 0.32, 0.5, 1.4); spot.position.set(HOLE.x, 4.1, HOLE.z - 1.8); spot.target.position.set(HOLE.x, -40, HOLE.z); scene.add(spot, spot.target);
  // pupitre de contrôle avec écran
  const desk = new THREE.Group(); desk.position.set(4.7, 0, -6.2); desk.rotation.y = -0.6; scene.add(desk);
  box(1.4, 0.95, 0.7, M('#3a3f46'), desk, 0, 0.47, 0); const screenM = M('#0d1a24', { e: '#5fd0ff', ei: 1.2 }); box(0.9, 0.55, 0.05, screenM, desk, 0, 1.25, -0.2);
  // barrières de foule (demi-cercle derrière le trou)
  const barM = M('#b8bec4', { r: 0.4, m: 0.5 });
  for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 - 1.05 + i * (2.1 / 8), x = HOLE.x + Math.cos(a) * 7.6, z = HOLE.z + Math.sin(a) * 7.6;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -a + Math.PI / 2; scene.add(g);
    box(2.0, 0.05, 0.05, barM, g, 0, 1.05, 0); box(2.0, 0.05, 0.05, barM, g, 0, 0.25, 0); for (let k = 0; k < 7; k++) box(0.025, 0.8, 0.025, barM, g, -0.9 + k * 0.3, 0.65, 0);
    for (const sx of [-0.95, 0.95]) box(0.05, 1.1, 0.5, barM, g, sx, 0.55, 0); }

  // -------------------------------------------------------------------
  // LES GENS : le sauteur (combinaison blanche, casque), l'équipe en gilets orange, la foule
  // -------------------------------------------------------------------
  const J = makePerson(scene, { shirt: '#f2f2ee', pants: '#e6e6e0', skin: '#d9a982', hair: '#3a2a20' });
  const helmet = add(new THREE.SphereGeometry(0.2, 16, 12), M('#f7f7f3', { r: 0.3, flat: false }), J.head, 0, 0.13, 0);
  add(new THREE.SphereGeometry(0.16, 14, 10, -0.9, 1.8, 0.9, 1.0), M('#1c2a36', { r: 0.1, m: 0.6, flat: false }), J.head, 0, 0.12, 0.06);
  box(0.32, 0.4, 0.16, M('#c9ccd0'), J.body, 0, 0.36, -0.18);   // sac dorsal
  J.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const team = [['#ff7a1a', '#2c3440', 2.9, -7.4, -0.7], ['#ff7a1a', '#3a3a3a', -2.9, -8.3, 0.9], ['#ff7a1a', '#2a3550', 4.2, -5.6, -0.55]].map(([sh, pa, x, z, ry]) => {
    const P = makePerson(scene, { shirt: sh, pants: pa, hair: R() < 0.5 ? '#2a1d15' : '#7a5a3a' }); P.home = { x, z, ry }; P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return P; });
  const SHIRTS = ['#3d6e9e', '#b2453a', '#e8e2d4', '#6a7f4a', '#d8b04a', '#7a5a8a', '#2f2f2f', '#c86a8a', '#5a8fb0', '#a0522d'];
  const crowd = Array.from({ length: 20 }, (_, i) => {
    const a = -Math.PI / 2 - 1.0 + (i / 19) * 2.0 + (R() - 0.5) * 0.05, rr = 8.3 + R() * 1.8;
    const P = makePerson(scene, { shirt: SHIRTS[i % 10], pants: R() < 0.5 ? '#2b3448' : '#4a4a4a', hair: ['#2a1d15', '#5a3a22', '#c79a5a', '#8a8a8a'][(R() * 4) | 0], skin: ['#e2b994', '#c99872', '#a8714c', '#e6bf9e'][(R() * 4) | 0], s: 0.93 + R() * 0.12 });
    P.pos = new THREE.Vector3(HOLE.x + Math.cos(a) * rr, 0, HOLE.z + Math.sin(a) * rr); P.ph = R() * 6; P.phone = R() < 0.6;
    if (P.phone) { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.6, 1.9) })); P.armR.add(ph); ph.position.set(0, -0.56, 0.06); P.ph_ = ph; }
    return P; });

  // nuages (ils filent pendant l'accéléré)
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, emissive: '#e6eef6', emissiveIntensity: 0.45 });
  const clouds = Array.from({ length: 12 }, () => {
    const pos = []; for (let k = 0; k < 5; k++) { const g = new THREE.IcosahedronGeometry(90 + R() * 90, 1).toNonIndexed(); g.scale(1.8, 0.55, 1.1); g.translate((k - 2) * 110 + R() * 50, R() * 40, R() * 60); pos.push(...g.attributes.position.array); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, cloudMat); m.position.set(-5000 + R() * 10000, 1300 + R() * 700, -2200 - R() * 5000); m.userData.x0 = m.position.x; scene.add(m); return m; });

  // -------------------------------------------------------------------
  // LE SCHÉMA (HUD) : la Terre en coupe, le tunnel, le point qui tombe
  // -------------------------------------------------------------------
  const hud = document.getElementById('hud');
  const CX = 890, CY = 560, CR = 128;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', '1080'); svg.setAttribute('height', '1920');
  svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;opacity:0;filter:drop-shadow(0 3px 12px rgba(0,0,0,.45));';
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  el('circle', { cx: CX, cy: CY, r: CR + 3, fill: '#6b4a32' });
  el('circle', { cx: CX, cy: CY, r: CR, fill: '#c2532f' });
  el('circle', { cx: CX, cy: CY, r: CR * (RT - 660) / RT, fill: '#b5462a' });
  el('circle', { cx: CX, cy: CY, r: CR * 3480 / RT, fill: '#ec9a33' });
  el('circle', { cx: CX, cy: CY, r: CR * 1221 / RT, fill: '#ffe39a' });
  el('line', { x1: CX, y1: CY - CR - 4, x2: CX, y2: CY + CR + 4, stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '6 5', opacity: 0.85 });
  const lab = (x, y, txt, size = 17, anchor = 'middle', w = 600) => { const e = el('text', { x, y, 'text-anchor': anchor, fill: '#fff', 'font-family': 'Inter', 'font-weight': w, 'font-size': size, 'letter-spacing': '2.5' }); e.textContent = txt; return e; };
  lab(CX, CY - CR - 14, 'PARIS'); lab(CX, CY + CR + 28, 'PACIFIQUE SUD');
  const layerTxt = lab(CX, CY + CR + 56, '', 15, 'middle', 500);
  const dotGlow = el('circle', { cx: CX, cy: CY - CR, r: 14, fill: '#fff', opacity: 0.35 });
  const dot = el('circle', { cx: CX, cy: CY - CR, r: 7, fill: '#fff' });
  hud.appendChild(svg);

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(0.5, 5.4, 4.0), LOOK = new THREE.Vector3(0, 22, -560);
  const tmp = new THREE.Vector3();
  const idx = (tau) => { const i = clamp(tau, 0, SIM.x.length - 1.001), k = Math.floor(i); return [k, i - k]; };
  // vitesse (km/h) à l'instant vidéo t, et défilement des anneaux de la caméra embarquée :
  // ils passent d'autant plus vite qu'on va vite (échelle logarithmique, sinon on ne verrait rien au début et tout clignoterait au centre)
  const speedAt = (t) => { const tau = tauAt(t); if (tau < 0) return 0; if (tau < 25) return 9.82 * tau * 3.6; if (tau > TAU_BACK - 25) return 9.82 * Math.max(0, TAU_BACK - tau) * 3.6;
    const [k, f] = idx(tau); return Math.abs(lerp(SIM.v[k], SIM.v[k + 1], f)); };
  const ringRate = (v) => 0.5 + 5.5 * Math.pow(Math.log10(1 + v) / Math.log10(36000), 1.4);
  const phaseAt = (t) => { let p = 0; for (let u = T.jump; u < t; u += 1 / 60) p += ringRate(speedAt(u)) * Math.min(1 / 60, t - u); return p; };
  function update(t) {
    const tau = tauAt(t);
    // --- caméra fixe (très légère respiration)
    camera.position.copy(CAM); camera.position.y += 0.01 * Math.sin(t * 0.7); camera.lookAt(LOOK); camera.fov = 66; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    // --- le soleil avance un peu (76 min), les nuages filent
    const sd = sunDirAt(Math.max(0, tau)); sky.u.uSunDir.value.copy(sd); sunSprite.userData.dir.copy(sd);
    sun.position.copy(sd).multiplyScalar(120).add(HOLE); sun.target.position.copy(HOLE);
    sky.follow(camera); sunSprite.follow(camera);
    clouds.forEach((c, i) => { c.position.x = ((c.userData.x0 + 5000 + (Math.max(0, tau) * 4 + t * 6) * (0.8 + 0.1 * (i % 3))) % 10000) - 5000; });

    // --- le sauteur
    J.reset(); J.root.rotation.set(0, Math.PI, 0); J.root.visible = true;
    let depthM;   // profondeur (m) côté Paris, pour la position du sauteur
    if (tau < 0) {   // il s'approche du bord, vérifie son casque, se met en position
      const walk = sm(T.countdown - 3.5, T.countdown - 0.5, t);
      J.root.position.set(HOLE.x + 0.15, 0, lerp(HOLE.z + 5.5, HOLE.z + HR + 0.25, walk));
      if (walk > 0 && walk < 1) J.walk(t * 6, 1);
      const ready = sm(T.countdown, T.countdown + 1, t); J.armL.rotation.set(-0.5 * ready, 0, 0.35 * ready); J.armR.rotation.set(-0.5 * ready, 0, -0.35 * ready);
      J.body.rotation.x = 0.15 * sm(T.jump - 0.6, T.jump, t); J.legs.forEach((L) => { L.hip.rotation.x = -0.3 * sm(T.jump - 0.6, T.jump, t); L.knee.rotation.x = 0.5 * sm(T.jump - 0.6, T.jump, t); });
      depthM = -1;
    } else if (tau < TAU_BACK - 25) {   // en chute : on ne le voit que les premières secondes
      const d = tau < 25 ? 4.905 * tau * tau : 1e6; depthM = d;
      const fwd = Math.min(1, tau * 2.2);
      J.root.position.set(HOLE.x + 0.15, -d, lerp(HOLE.z + HR + 0.25, HOLE.z + 0.1, fwd));
      J.root.rotation.x = -0.35 * fwd; J.armL.rotation.set(-2.6, 0, 0.5); J.armR.rotation.set(-2.6, 0, -0.5); J.legs[0].hip.rotation.x = 0.3; J.legs[1].hip.rotation.x = -0.2;
      J.root.visible = d < 60;
    } else {   // le retour : il remonte, ralentit, s'arrête pile au bord… et on l'attrape
      const dt = Math.max(0, TAU_BACK - tau), d = 4.905 * dt * dt; depthM = d;
      const grab = sm(T.caught - 0.15, T.caught + 0.4, t), lift = sm(T.caught + 0.4, T.caught + 2.2, t);
      J.root.position.set(HOLE.x, -d, HOLE.z + 0.2 + 2.4 * lift);
      J.root.rotation.y = 0; J.armL.rotation.set(-2.8 + 1.0 * grab, 0, 0.3); J.armR.rotation.set(-2.8 + 1.0 * grab, 0, -0.3);
      J.root.visible = d < 60;
    }
    // --- l'équipe : à leurs postes ; se penchent pour regarder ; tendent les bras au retour
    team.forEach((P, i) => {
      P.reset(); P.root.position.set(P.home.x, 0, P.home.z); P.root.rotation.y = P.home.ry;
      const peek = sm(T.jump + 0.3, T.jump + 1.2, t) * (1 - sm(T.jump + 6, T.jump + 8, t)) + sm(T.emerge - 1.5, T.emerge - 0.5, t) * (1 - sm(T.caught + 2.5, T.caught + 3.5, t));
      P.body.rotation.x = 0.35 * peek; P.head.rotation.x = 0.4 * peek;
      if (i < 2) { const reach = sm(T.caught - 0.6, T.caught - 0.1, t) * (1 - sm(T.caught + 2.4, T.caught + 3.2, t)); P.root.position.x = lerp(P.home.x, Math.sign(P.home.x) * 1.0, reach); P.root.position.z = lerp(P.home.z, HOLE.z + 0.9 * (i ? -1 : 1) * 0 + 2.6, reach);
        P.armL.rotation.set(-1.3 * reach, 0, 0); P.armR.rotation.set(-1.3 * reach, 0, 0); }
      if (i === 2) { P.head.rotation.y = 0.5; P.armR.rotation.set(-0.6, 0, 0); P.armL.rotation.set(-0.6, 0, 0); }
    });
    // --- la foule : attend, filme le saut, applaudit le retour (pendant l'accéléré : de petits mouvements rapides)
    crowd.forEach((P, i) => {
      P.reset(); P.root.position.copy(P.pos); P.root.lookAt(HOLE.x, 0, HOLE.z);
      const film = sm(T.countdown, T.countdown + 1, t) * (1 - sm(T.jump + 7, T.jump + 9, t)) + sm(T.emerge - 2.5, T.emerge - 1.5, t);
      const fidget = (tau > 10 && tau < TAU_BACK - 30) ? 0.3 * Math.sin(Math.max(0, tau) * 0.05 + P.ph) : 0;
      P.root.rotation.y += fidget;
      if (P.phone) { P.armR.rotation.set(-1.7 * film - 0.2 * (1 - film), 0, 0.15); P.ph_.visible = film > 0.3; }
      const cheer = sm(T.caught + 0.2, T.caught + 0.7, t) * (1 - sm(T.real + 2, T.real + 3, t));
      if (cheer > 0 && i % 2 === 0) { const b = Math.abs(Math.sin(t * 9 + P.ph)); P.armL.rotation.set(-2.9 * cheer, 0, 0.3); P.armR.rotation.set(-2.9 * cheer, 0, -0.3); P.body.position.y += 0.08 * b * cheer; }
      P.head.rotation.x = 0.25 * (t > T.jump && t < T.jump + 6 ? 1 : 0);
    });
    screenM.emissiveIntensity = 1.0 + 0.3 * Math.sin(t * 3);

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const clock = 15 * 3600 + 4 * 60 + (t < T.jump ? t : T.jump + tau);
    HUD.live(t, 'PARIS · CHAMP-DE-MARS · CAM 01', `14/10/2026 · ${pad(Math.floor(clock / 3600))}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}`);
    HUD.show2(true);
    let xKm = RT, vK = 0;
    if (tau >= 0) { const [k, f] = idx(tau); xKm = lerp(SIM.x[k], SIM.x[k + 1], f); vK = lerp(SIM.v[k], SIM.v[k + 1], f); }
    if (tau >= 0 && tau < 25) { xKm = RT - 4.905 * tau * tau / 1000; vK = 9.82 * tau * 3.6; }
    if (tau > TAU_BACK - 25) { const dt = Math.max(0, TAU_BACK - tau); xKm = RT - 4.905 * dt * dt / 1000; vK = 9.82 * dt * 3.6; }
    const dKm = RT - Math.abs(xKm);
    const depthTxt = dKm < 1 ? `${fr(Math.round(dKm * 1000))} m` : `${fr(Math.round(dKm))} km`;
    if (tau < 0) {
      HUD.block(1, { label: 'LE TUNNEL', value: '12 742 km', sub: 'DE PARIS AU PACIFIQUE SUD · PAR LE CENTRE', color: '#fff' });
      const cd = Math.ceil(T.jump - t);
      HUD.block(2, { label: t > T.countdown ? 'SAUT DANS' : 'DANS LE TUNNEL', value: t > T.countdown ? `${cd}` : 'vide d’air', sub: t > T.countdown ? '' : 'PAROIS INDESTRUCTIBLES', color: t > T.countdown ? '#ffb35c' : '#fff' });
    } else if (t < T.caught) {
      const side = xKm >= 0 ? 'SOUS PARIS' : 'SOUS LE PACIFIQUE';
      HUD.block(1, { label: `PROFONDEUR ${side}`, value: depthTxt, sub: `${fr(Math.round(vK))} KM/H · EN APESANTEUR`, color: '#fff' });
      const di = Math.min(Math.round(dKm / 25), SIM.Pbar.length - 1), bars = Math.max(1, SIM.Pbar[di]);
      HUD.block(2, { label: 'LES ROCHES AUTOUR DU TUNNEL', value: `${fr(Math.round(tempAt(dKm) / (dKm < 20 ? 1 : 50)) * (dKm < 20 ? 1 : 50))} °C`, sub: `PRESSION : ${fr(Math.round(bars / (bars > 1e5 ? 1e4 : bars > 1000 ? 100 : 1)) * (bars > 1e5 ? 1e4 : bars > 1000 ? 100 : 1))} BAR${bars > 1 ? 'S' : ''}`, color: tempAt(dKm) > 1000 ? '#ffb35c' : '#fff' });
    } else {
      HUD.block(1, { label: 'RETOUR À PARIS', value: `${Math.floor(TAU_BACK / 60)} min ${Math.round(TAU_BACK % 60)} s`, sub: 'APRÈS LE SAUT · 0 KM/H AU BORD', color: '#9fe3a0' });
      HUD.block(2, { label: 'DISTANCE PARCOURUE', value: '25 484 km', sub: 'DEUX FOIS LE DIAMÈTRE DE LA TERRE', color: '#fff' });
    }
    // le schéma
    svg.style.opacity = sm(3.2, 3.8, t) * (1 - sm(T.real - 0.4, T.real, t));
    const yDot = CY - CR * xKm / RT; dot.setAttribute('cy', yDot); dotGlow.setAttribute('cy', yDot); dotGlow.setAttribute('r', 10 + 5 * Math.abs(Math.sin(t * 5)));
    layerTxt.textContent = tau < 0 ? '' : t >= T.caught ? 'RETOUR À LA SURFACE' : layerAt(dKm);
    HUD.hook(t, 'Et si tu sautais<br>dans un trou qui<br>traverse <em>la Terre</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    Object.assign(S, { s: RT - xKm, dKm, vK: Math.abs(vK), phase: t > T.jump ? phaseAt(t) : 0, tempAt, layerAt });
    insets.draw(t, INSETS);
    HUD.end(t, T.endCard, { kicker: 'RECORD : 12 262 M, FORAGE SG-3 DE KOLA (RUSSIE), 1989', q: 'Tu sauterais,<br>toi ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS, tk: TK }) };
}

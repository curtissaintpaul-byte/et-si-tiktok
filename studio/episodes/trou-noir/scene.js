// =====================================================================
//  ÉPISODE : « Et si la Terre tombait dans un trou noir ? » — v2, version longue (~78 s)
//  Décor : la terrasse d'un mas provençal, sur une colline, la nuit. La mer en contrebas.
//  Les chiffres viennent de physique.py (vrai trou noir errant OGLE-2011-BLG-0462 :
//  7,1 masses solaires) → table « temps restant → distance ».
//  v2 : on montre les dégâts (marées, exode, séismes, coupure de courant, incendies, l'air qui se raréfie)
//       et le trou noir arrive au-dessus de nos têtes (sinon, ici, on ne « tomberait » pas vers le haut).
// =====================================================================
import { THREE, createStage, makeSky, makeMoon, M, add, box, cyl, prismZ, bake, noise2, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, FX, canvasTex } from '../../engine.js';
import { makeWater } from '../../lib.js';

// ---------------------------------------------------------------------
// 1. LA PARTITION
// ---------------------------------------------------------------------
const T = {
  hookOut: 3.0, coastIn: 16.8, coastOut: 31.8, sol: 33.0, quake: 37.8, tiltUp: 42.8, zoomIn: 43.8, zoomHeld: 44.8,
  moonStretch: 48.6, moonBreak: 50.2, zoomOut: 54.8, wide: 56.0, float: 61.0, tear: 66.0, flash: 71.1, black: 71.6, endCard: 73.4, duration: 77.6,
};
const SUBS = [
  [3.4, 8.0, 'En 2022, on a repéré un trou noir errant.'],
  [8.4, 12.6, '7 fois la masse du Soleil, dans 41 km.'],
  [13.0, 17.0, 'Imagine qu’il fonce vers nous.'],
  [18.0, 22.6, 'À 2 jours, la mer monte et descend de 45 m.'],
  [23.0, 27.6, 'Deux fois par jour, elle noie les côtes.'],
  [28.0, 32.6, '11 % des humains vivent à moins de 10 m d’altitude.'],
  [33.0, 37.4, 'À 1 jour, même le sol monte et descend de 135 m.'],
  [37.8, 42.4, 'La croûte terrestre craque : séismes partout.'],
  [44.8, 49.2, 'On ne le voit pas. Les étoiles se tordent.'],
  [50.2, 54.6, 'À 7 minutes, la Lune part en premier.'],
  [56.2, 60.6, 'Ton poids fond. L’air aussi : comme sur l’Everest.'],
  [61.2, 65.6, 'Animaux, voitures, mer : tout tombe… vers le haut.'],
  [66.0, 70.6, 'Puis la Terre elle-même se déchire.'],
];
// temps restant (secondes « histoire ») selon le temps de la vidéo — interpolation logarithmique
const LEFT = [[0, 345600], [16.8, 180000], [18.0, 172800], [31.8, 92000], [33.0, 86400], [37.8, 74000], [42.6, 60000], [44.0, 20000],
  [44.8, 1500], [48.6, 640], [50.2, 420], [54.6, 330], [56.2, 300], [58.4, 255], [61.0, 156], [66.0, 40], [71.1, 0]];
function leftAt(t) {
  if (t <= LEFT[0][0]) return LEFT[0][1];
  for (let i = 1; i < LEFT.length; i++) {
    const [t0, a] = LEFT[i - 1], [t1, b] = LEFT[i];
    if (t <= t1) { const k = (t - t0) / (t1 - t0); return Math.exp(lerp(Math.log(a + 1), Math.log(b + 1), k)) - 1; }
  }
  return 0;
}
// les marées : phase (en demi-tours) — marée haute aux multiples pairs, basse aux impairs
const PHASE = [[16.8, 0.5], [19.6, 1], [22.0, 2], [24.6, 3], [27.4, 4], [29.8, 5], [32.6, 6], [35.0, 7], [37.6, 8], [40.4, 9], [43.4, 10]];
const phaseAt = (t) => { if (t <= PHASE[0][0]) return PHASE[0][1]; for (let i = 1; i < PHASE.length; i++) if (t <= PHASE[i][0]) { const [a, va] = PHASE[i - 1], [b, vb] = PHASE[i]; return lerp(va, vb, (t - a) / (b - a)); } return 10; };

// physique (mêmes formules que physique.py)
const G = 6.674e-11, MBH = 7.1 * 1.989e30, GM = G * MBH, RE = 6.371e6, g0 = 9.81, MMOON = 7.342e22, DMOON = 3.844e8;
const RS = 2 * GM / (2.998e8 ** 2);
const tideA = (r) => 0.3567 * (MBH / MMOON) * (DMOON / r) ** 3;    // marée d'équilibre (m), au point sous le trou noir
const einsteinAt = (r) => Math.sqrt(2 * RS / r);                    // rayon de l'anneau d'Einstein (rad)
const altFor = (p) => 44330 * (1 - p ** (1 / 5.255));               // altitude où la pression vaut p × celle du niveau de la mer

export default async function () {
  const PHY = await (await fetch(new URL('./physique.json', import.meta.url))).json();
  const TAB = PHY.table.slice().reverse();   // [restant, distance km] du plus petit au plus grand restant
  const rAt = (left) => {   // distance (m) pour un temps restant donné
    const L = Math.log(left + 1);
    for (let i = 1; i < TAB.length; i++) {
      const a = Math.log(TAB[i - 1][0] + 1), b = Math.log(TAB[i][0] + 1);
      if (L <= b) return lerp(TAB[i - 1][1], TAB[i][1], (L - a) / (b - a || 1)) * 1e3;
    }
    return TAB[TAB.length - 1][1] * 1e3;
  };

  // -------------------------------------------------------------------
  // 2. LE PLATEAU
  // -------------------------------------------------------------------
  const stage = createStage({ fov: 70, far: 40000, bloom: [0.45, 0.5, 0.85], shadows: false });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.5;
  document.documentElement.style.setProperty('--accent', '#b9a2ff');
  const R = rng(1789);
  const SEA = -350;                          // niveau de la mer (le mas est 350 m au-dessus)
  // la Lune et le trou noir sont presque au-dessus de nos têtes (à 1,2° l'un de l'autre)
  const MOON_DIR = dirAzEl(4.0, 84.0);
  const BH_DIR = dirAzEl(4.0, 85.2);
  // poids ici : la marée verticale vaut (3 cos² z − 1) × GM·R/r³ (z = distance du trou noir au zénith)
  const F_V = 3 * BH_DIR.y ** 2 - 1;
  const weightAt = (r) => 1 - F_V * GM * RE / (g0 * r ** 3);
  // direction dans laquelle « on tombe » quand le poids devient négatif (presque à la verticale, un peu vers le trou noir)
  const UP = new THREE.Vector3(BH_DIR.x, 0, BH_DIR.z).normalize().multiplyScalar(0.3).add(new THREE.Vector3(0, 1, 0)).normalize();
  const CAM = new THREE.Vector3(0.3, 2.2, 10.8);

  // le ciel de nuit
  const sky = makeSky(scene, { stars: 1.1, milky: 1.3, nightZen: [0.0016, 0.0024, 0.0075], nightHor: [0.010, 0.014, 0.030], milkyAxis: new THREE.Vector3(0.78, 0.6, 0.12).normalize() });
  sky.u.uDay.value = 0; sky.u.uBH.value.copy(BH_DIR);
  scene.fog = new THREE.Fog('#191f30', 2500, 26000);
  sky.u.uTintDir.value.copy(MOON_DIR); sky.u.uTint.value.setRGB(0.05, 0.07, 0.12); sky.u.uTintAmt.value = 0.5;

  // la Lune (taille réelle : 0,52°) + son halo
  const moon = makeMoon(scene, MOON_DIR, 2 * 800 * Math.tan(0.26 * Math.PI / 180));
  const haloTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.12, 'rgba(210,225,255,0.22)'); gr.addColorStop(0.45, 'rgba(160,185,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: '#cfdcff', blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  halo.scale.setScalar(120); halo.renderOrder = 1; scene.add(halo);

  // lumières
  const moonLight = new THREE.DirectionalLight('#c9d6ff', 0.6); scene.add(moonLight, moonLight.target);
  const hemi = new THREE.HemisphereLight('#33467a', '#0d0b09', 0.5); scene.add(hemi);

  // -------------------------------------------------------------------
  // 3. LE PAYSAGE : colline, plaine côtière, cap rocheux, mer
  // -------------------------------------------------------------------
  const nz = noise2(11);
  function H(x, z) {
    const d = 15 - z;
    const k = clamp(d / 4700);
    let y = -340 * (1 - (1 - k) ** 2.2);                          // pente creuse : on voit jusqu'à la côte
    if (d > 5150) y -= (d - 5150) * 0.08;                        // la côte puis le fond marin
    y += 90 * sm(500, 2300, Math.abs(x)) * (1 - sm(2500, 5600, d)); // collines de chaque côté
    const m = Math.exp(-(((x + 2600) / 950) ** 2));              // le cap rocheux à gauche
    if (d > 2000) {
      let cap = 70 - 0.019 * (d - 2500);
      cap = lerp(cap, -430, sm(9000, 9250, d));
      y = lerp(y, Math.max(y, cap), m);
    }
    y += (nz(x * 0.003, z * 0.003, 4) - 0.5) * 70 * sm(80, 900, d);
    y += (nz(x * 0.02, z * 0.02, 2) - 0.5) * 10 * sm(30, 200, d);
    return y * sm(22, 70, d) - 0.4 * (1 - sm(22, 70, d));
  }
  function C(x, z, y) {
    if (y < SEA - 3) return '#1e2b31';
    if (y < SEA + 8) return '#7d725e';
    const k = nz(x * 0.012, z * 0.012, 2), d = 15 - z;
    if (x < -1400 && d > 2400 && y < -150) return k > 0.5 ? '#8a5537' : '#76472e';   // falaises ocre
    return k > 0.58 ? '#56613f' : k > 0.42 ? '#4a5434' : '#606b47';                    // garrigue
  }
  function ground(cx, cz, w, d, seg, dy = 0) {
    const g = new THREE.PlaneGeometry(w, d, seg, seg); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)) + dy);
    const geo = g.toNonIndexed(); const pp = geo.attributes.position, col = new Float32Array(pp.count * 3), c = new THREE.Color();
    for (let i = 0; i < pp.count; i += 3) {
      const x = (pp.getX(i) + pp.getX(i + 1) + pp.getX(i + 2)) / 3, z = (pp.getZ(i) + pp.getZ(i + 1) + pp.getZ(i + 2)) / 3, y = (pp.getY(i) + pp.getY(i + 1) + pp.getY(i + 2)) / 3;
      c.set(C(x, z, y)); for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    return geo;
  }
  const groundMat = M('#ffffff', { vc: true, unique: true });
  const far = new THREE.Mesh(ground(0, -13000, 34000, 34000, 210, 0), groundMat); far.position.y = -2.5; scene.add(far);
  const near = new THREE.Mesh(ground(0, -650, 1700, 1500, 150, 0), groundMat); scene.add(near);
  const coast = new THREE.Mesh(ground(500, 15 - 5050, 3400, 1500, 170, 0), groundMat); coast.position.y = 0.6; scene.add(coast);
  const mid = new THREE.Mesh(ground(0, 15 - 2700, 3000, 2600, 150, 0), groundMat); mid.position.y = 0.3; scene.add(mid);   // la pente que la mer va remonter

  // la mer (et ses marées)
  const sea = makeWater(scene, { w: 30000, d: 31000, z: -15000, seg: 260, color: '#0b2533', foam: '#6f8796', opacity: 1 });
  sea.U.uChop.value = 0.9; sea.mat.roughness = 0.14;
  // la ligne d'écume : là où la mer touche la terre (profils du terrain calculés une fois pour toutes)
  const NSH = 620, SH_D0 = 200, SH_STEP = 20, SH_N = 330, shoreX = [], shoreProf = [];
  for (let i = 0; i < NSH; i++) { const x = -2000 + 3900 * (i + R() * 0.8) / NSH; shoreX.push(x); const pr = new Float32Array(SH_N); for (let j = 0; j < SH_N; j++) pr[j] = H(x, 15 - (SH_D0 + j * SH_STEP)); shoreProf.push(pr); }
  const shorePts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NSH * 3), 3)), new THREE.PointsMaterial({ size: 2.3, sizeAttenuation: false, color: new THREE.Color(1.25, 1.45, 1.65), transparent: true, opacity: 0, depthWrite: false }));
  shorePts.frustumCulled = false; scene.add(shorePts);

  // -------------------------------------------------------------------
  // 4. LA VÉGÉTATION : oliviers, vignes, cyprès (en "instances" : 1 seul objet pour des centaines d'arbres)
  // -------------------------------------------------------------------
  const D = new THREE.Object3D();
  function instanced(geo, mat, list, setup) {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { setup(D, it); D.updateMatrix(); m.setMatrixAt(i, D.matrix); });
    scene.add(m); return m;
  }
  const olives = [];
  for (let i = 0; i < 520; i++) {
    const x = (R() - 0.5) * 1900, d = 45 + R() ** 0.7 * 1500, z = 15 - d;
    if (Math.abs(x) < 9 && d < 60) continue;
    const y = H(x, z); if (y < SEA + 15) continue;
    olives.push({ x, y, z, s: 0.7 + R() * 0.8, r: R() * 6 });
  }
  olives.push({ x: -4.4, y: H(-4.4, -5.5), z: -5.5, s: 1.25, r: 0.4 }, { x: 5.6, y: H(5.6, -9), z: -9, s: 1.1, r: 2 });
  instanced(new THREE.CylinderGeometry(0.18, 0.32, 2.2, 5).translate(0, 1.1, 0), M('#5b4f43'), olives, (o, it) => { o.position.set(it.x, it.y, it.z); o.scale.setScalar(it.s); o.rotation.set(0, it.r, 0.1); });
  instanced(new THREE.IcosahedronGeometry(1.9, 0).scale(1.2, 0.75, 1.1).translate(0, 2.9, 0), M('#6f7b62'), olives, (o, it) => { o.position.set(it.x, it.y, it.z); o.scale.setScalar(it.s); o.rotation.set(0, it.r, 0); });
  const vines = [];
  for (let row = 0; row < 46; row++) for (let k = 0; k < 40; k++) {
    const d = 110 + row * 9, x = -520 + k * 6 + (row % 2) * 3; const z = 15 - d, y = H(x, z);
    if (y < SEA + 15 || nz(x * 0.01, z * 0.01) > 0.62) continue;
    vines.push({ x, y, z });
  }
  instanced(new THREE.BoxGeometry(5.2, 1.0, 0.9).translate(0, 0.5, 0), M('#4c5a35'), vines, (o, it) => { o.position.set(it.x, it.y, it.z); o.rotation.set(0, 0.04, 0); o.scale.setScalar(1); });
  const cypresses = [[-5.6, -7], [-7.6, -12], [-31, -40], [-58, -76], [24, -48], [41, -90], [-95, -150], [70, -210], [-150, -260], [160, -330]].map(([x, z]) => ({ x, z, y: H(x, z), s: 0.8 + R() * 0.5 }));
  cypresses.forEach((c, i) => { if (i < 2) c.y = -0.3; });
  instanced(new THREE.ConeGeometry(1.15, 11, 7).translate(0, 5.5, 0), M('#26331f'), cypresses, (o, it) => { o.position.set(it.x, it.y, it.z); o.scale.set(it.s, it.s, it.s); o.rotation.set(0, 0, 0); });

  // -------------------------------------------------------------------
  // 5. LA CÔTE : village, route, phare, bateaux, voitures qui fuient, pompiers, incendies
  //    (les lumières sous l'eau disparaissent ; une partie s'éteint quand le courant saute)
  // -------------------------------------------------------------------
  const uSeaLvl = { value: SEA }, uCut = { value: 0 }, uHi = { value: SEA };
  function seaAware(mat, cut) {   // les points sous la mer (ou « coupés ») ne sont pas dessinés
    mat.onBeforeCompile = (s) => {
      s.uniforms.uSea = cut ? uHi : uSeaLvl; s.uniforms.uCut = uCut;
      s.vertexShader = 'attribute float seed; varying float vWY; varying float vSeed;\n' + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWY = (modelMatrix * vec4(transformed, 1.0)).y; vSeed = seed;');
      s.fragmentShader = 'varying float vWY; varying float vSeed; uniform float uSea; uniform float uCut;\n' + s.fragmentShader.replace('void main() {', `void main() {\n if (vWY < uSea) discard;\n ${cut ? 'if (vSeed < uCut) discard;' : ''}`);
    };
    mat.customProgramCacheKey = () => 'seaAware' + (cut ? 1 : 0);
    return mat;
  }
  function pointCloud(n, size, cut, colorAttr = true) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const seed = new Float32Array(n); for (let i = 0; i < n; i++) seed[i] = R(); geo.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
    const pts = new THREE.Points(geo, seaAware(new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: colorAttr, transparent: true, depthWrite: false }), cut));
    pts.frustumCulled = false; scene.add(pts); return pts;
  }
  const road = (s) => { const d = lerp(4880, 600, s); const x = lerp(-430, 80, s) + 230 * Math.sin(s * 8.5) * (1 - 0.6 * s); const z = 15 - d; return [x, H(x, z) + 1.6, z]; };
  const houses = [];
  for (let i = 0; i < 520; i++) {
    const x = -650 + R() * 2300, d = 4700 + R() * 560, z = 15 - d, y = H(x, z);
    if (y < SEA + 2) continue; houses.push({ x, y, z, w: 7 + R() * 8, h: 5 + R() * 9, r: R() * 0.4 });
  }
  instanced(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M('#9d9482'), houses, (o, it) => { o.position.set(it.x, it.y - 1, it.z); o.scale.set(it.w, it.h, it.w * 0.8); o.rotation.set(0, it.r, 0); });
  const lightPts = [], lightCol = [];
  const warm = new THREE.Color('#ffbf6a'), cold = new THREE.Color('#dfe6ff');
  houses.forEach((h) => { const n = 1 + (R() * 2.2 | 0); for (let k = 0; k < n; k++) { lightPts.push(h.x + (R() - 0.5) * h.w, h.y + 1.5 + R() * h.h * 0.8, h.z + h.w * 0.45); const c = R() < 0.8 ? warm : cold; lightCol.push(c.r * 2.2, c.g * 2.2, c.b * 2.2); } });
  for (let i = 0; i < 90; i++) { const x = -700 + i * 26, z = 15 - 5200 - Math.sin(i * 0.3) * 30; lightPts.push(x, H(x, z) + 6, z); lightCol.push(2.4, 2.0, 1.4); }   // la route du bord de mer
  // des maisons éparses sur la colline (elles aussi perdent le courant)
  for (let i = 0; i < 90; i++) { const s = R(); const [x, y, z] = road(s); lightPts.push(x + 9, y + 5, z); lightCol.push(2.3, 1.9, 1.3); }   // lampadaires de la route
  for (let i = 0; i < 260; i++) { const x = (R() - 0.5) * 3000, d = 700 + R() * 4000, z = 15 - d, y = H(x, z); if (y < SEA + 20) continue; lightPts.push(x, y + 3, z); const c = R() < 0.85 ? warm : cold; lightCol.push(c.r * 2, c.g * 2, c.b * 2); }
  const village = pointCloud(lightPts.length / 3, 2.6, true);
  village.geometry.attributes.position.array.set(lightPts); village.geometry.attributes.color.array.set(lightCol);
  // le phare
  const LH = new THREE.Vector3(980, H(980, 15 - 5330) + 1, 15 - 5330);
  add(new THREE.CylinderGeometry(2.2, 3, 20, 8).translate(0, 10, 0), M('#d9d4c8'), scene, LH.x, LH.y, LH.z);
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: new THREE.Color(3, 2.6, 1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  beacon.position.set(LH.x, LH.y + 21, LH.z); beacon.scale.setScalar(60); scene.add(beacon);
  // les bateaux du port : la mer les pousse dans les terres, puis les laisse échoués quand elle redescend
  const NB = 26, boats = [];
  for (let i = 0; i < NB; i++) boats.push({ x: -760 + R() * 700, d0: 5230 + R() * 260, k: 5 + R() * 4, w: (R() - 0.5) * 0.6 });
  const boatPts = pointCloud(NB, 2.4, false);
  // la route qui monte du village vers les collines : les voitures qui fuient (phares)
  const NCAR = 170, cars = [];
  for (let i = 0; i < NCAR; i++) cars.push({ t0: 18.4 + i * 0.085 + R() * 0.05, v: 0.026 + R() * 0.006, lane: (R() - 0.5) * 4 });
  const carPts = pointCloud(NCAR, 2.8, false);
  // la route elle-même (un ruban gris clair posé sur la colline)
  { const pos = [], idx = []; const NR = 400;
    for (let i = 0; i <= NR; i++) { const s0 = i / NR; const [x, y, z] = road(s0); const [x2, , z2] = road(Math.min(1, s0 + 0.002)); const dx = x2 - x, dz = z2 - z, L = Math.hypot(dx, dz) || 1; const nx = -dz / L * 4, nzz = dx / L * 4; pos.push(x + nx, H(x + nx, z + nzz) + 0.5, z + nzz, x - nx, H(x - nx, z - nzz) + 0.5, z - nzz); if (i < NR) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const roadMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#2c2d30', side: THREE.DoubleSide })); scene.add(roadMesh); }
  { const c = carPts.geometry.attributes.color.array; for (let i = 0; i < NCAR; i++) c.set(i % 9 === 4 ? [2.2, 0.35, 0.25] : [2.3, 2.15, 1.7], i * 3); }
  // pompiers / police : gyrophares bleus le long de la côte
  const NGY = 12, gyros = [];
  for (let i = 0; i < NGY; i++) { const s = R() * 0.45; const [x, y, z] = road(s); gyros.push({ x: x + (R() - 0.5) * 60, y, z: z + (R() - 0.5) * 40, ph: R() * 6, t0: 22.4 + R() * 6 }); }
  const gyroPts = pointCloud(NGY, 3.2, false);
  // les incendies qui démarrent avec les séismes (sur les hauteurs : la mer ne les atteint pas)
  const fires = [];
  for (let tries = 0; fires.length < 11 && tries < 4000; tries++) {
    const d = 380 + R() * 1500, x = (R() - 0.5) * 0.8 * d, z = 15 - d, y = H(x, z);
    if (y < SEA + 225 || Math.abs(x) < 40 && d < 500) continue;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: new THREE.Color(3.2, 1.3, 0.35), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    sp.position.set(x, y + 6, z); scene.add(sp);
    fires.push({ sp, t0: T.quake + 0.6 + R() * 3.0, s: 14 + R() * 22 * (d / 800), ph: R() * 9 });
  }

  // -------------------------------------------------------------------
  // 6. LA TERRASSE DU MAS (tout ce qui est fixe est "cuit" en un seul objet)
  // -------------------------------------------------------------------
  const world = new THREE.Group();
  const paving = canvasTex(512, 512, (g, w, h) => { const r = rng(5); g.fillStyle = '#7f725e'; g.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = -1; i < 8; i++) { const v = 170 + r() * 40 | 0, off = (j % 2) * 32; g.fillStyle = `rgb(${v},${v - 10},${v - 34})`; g.beginPath(); g.roundRect(i * 64 + off + 3, j * 64 + 3, 58, 58, 8); g.fill(); } }, 6);
  add(new THREE.BoxGeometry(15, 0.3, 17), M('#ffffff', { map: paving, flat: false }), world, -1.5, -0.15, 6.5);
  box(15, 0.36, 0.55, M('#a6957a'), world, -1.5, 0.18, -1.75);                      // le muret au bord de la terrasse
  box(15.2, 0.08, 0.65, M('#bcae92'), world, -1.5, 0.4, -1.75);
  const stone = M('#c9b28d'), tile = M('#a65a3d'), shut = M('#7b96a5'), wood = M('#4a3428');
  box(8, 7, 17, stone, world, 8.5, 3.5, 5.5);
  prismZ(9.2, 2.6, 17.8, tile, world, 8.5, 7, 5.5);
  const winLit = M('#2a221a', { e: '#ffb76a', ei: 2.2, unique: true });
  box(0.12, 1.5, 1.1, winLit, world, 4.46, 2.4, 1.5); box(0.12, 1.5, 1.1, winLit, world, 4.46, 5.2, 7.5); box(0.12, 1.5, 1.1, M('#20262c'), world, 4.46, 5.2, 1.5);
  for (const [y, z] of [[2.4, 1.5], [5.2, 7.5], [5.2, 1.5]]) { box(0.08, 1.55, 0.55, shut, world, 4.42, y, z - 0.85); box(0.08, 1.55, 0.55, shut, world, 4.42, y, z + 0.85); }
  box(0.14, 2.3, 1.2, wood, world, 4.45, 1.15, 10.5);
  box(0.1, 0.4, 1.2, winLit, world, 4.45, 2.5, 10.5);
  for (let i = 0; i < 18; i++) add(new THREE.IcosahedronGeometry(0.45 + R() * 0.3, 0), M('#3f5230'), world, 4.3, 0.6 + R() * 3.6, 12.5 + R() * 3);
  for (let i = 0; i < 22; i++) { const x = -8.2 + i * 0.62; add(new THREE.IcosahedronGeometry(0.26, 1).scale(1, 0.6, 1), M(i % 3 ? '#7a66a6' : '#8a74b6'), world, x, 0.2, -1.15); add(new THREE.IcosahedronGeometry(0.28, 0).scale(1, 0.4, 1), M('#5f6b55'), world, x, 0.08, -1.15); }
  const iron = M('#2a2724');
  for (const z of [5.0, 0.2]) cyl(0.06, 0.08, 3.4, 6, iron, world, -7.3, 1.7, z);
  scene.add(bake(world));

  // la guirlande lumineuse
  const bulbs = [];
  const wires = [[new THREE.Vector3(-7.3, 3.3, 5.0), new THREE.Vector3(4.4, 3.5, 4.6)], [new THREE.Vector3(-7.3, 3.3, 0.2), new THREE.Vector3(4.4, 3.5, 0.6)], [new THREE.Vector3(-7.3, 3.3, 5.0), new THREE.Vector3(-7.3, 3.3, 0.2)]];
  const wireMat = new THREE.LineBasicMaterial({ color: '#141210' }); const wireObjs = [];
  for (const [A, B] of wires) {
    const pts = []; for (let s = 0; s <= 1.0001; s += 0.05) { const p = A.clone().lerp(B, s); p.y -= 0.55 * 4 * s * (1 - s); pts.push(p); if (s > 0.02 && s < 0.98 && Math.round(s * 20) % 2 === 0) bulbs.push(p.clone().add(new THREE.Vector3(0, -0.08, 0))); }
    { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat); scene.add(ln); wireObjs.push(ln); }
  }
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.8) });
  wireObjs.push(instanced(new THREE.SphereGeometry(0.075, 8, 6), bulbMat, bulbs, (o, p) => { o.position.copy(p); o.scale.setScalar(1); o.rotation.set(0, 0, 0); }));
  const lamps = [new THREE.PointLight('#ffc98a', 7, 16, 2), new THREE.PointLight('#ffc98a', 5, 14, 2), new THREE.PointLight('#ffb36a', 3, 9, 2)];
  lamps[0].position.set(-0.6, 2.9, 5.6); lamps[1].position.set(-0.8, 2.9, 2.8); lamps[2].position.set(4.0, 2.6, 6.0);
  lamps.forEach((l) => scene.add(l));

  // -------------------------------------------------------------------
  // 7. LES OBJETS : ce qui tombe pendant le séisme, puis ce qui s'envole
  // -------------------------------------------------------------------
  const loose = [];   // { obj, p0, r0, s0 (départ vers le haut), a, w, drift, fall? }
  const addLoose = (obj, s0 = T.float, a = 1, w = new THREE.Vector3((R() - 0.5) * 0.8, (R() - 0.5) * 0.8, (R() - 0.5) * 0.8), fall = null) => { scene.add(obj); loose.push({ obj, p0: obj.position.clone(), r0: obj.rotation.clone(), s0: s0 + R() * 0.3, a: a * (0.85 + R() * 0.3), w, drift: new THREE.Vector3((R() - 0.5), (R() - 0.5) * 0.3, (R() - 0.5)).multiplyScalar(0.4), fall }); return obj; };
  // fall : { tf (début de la chute), p1 (position au sol), r1 (rotation au sol), h (hauteur de chute) }
  const fallTimes = [];
  const mkFall = (tf, dx, dz, y1, r1) => { fallTimes.push(tf); return { tf, d: new THREE.Vector3(dx, 0, dz), y1, r1 }; };
  const table = new THREE.Group(); table.position.set(-0.4, 0, 6.0);
  cyl(0.48, 0.48, 0.04, 16, M('#30302e', { r: 0.5 }), table, 0, 0.74, 0); cyl(0.04, 0.05, 0.72, 6, iron, table, 0, 0.37, 0); cyl(0.26, 0.26, 0.03, 10, iron, table, 0, 0.02, 0);
  addLoose(table, T.float, 1);
  const bottle = new THREE.Group(); bottle.position.set(-0.35, 0.76, 5.92);
  cyl(0.045, 0.045, 0.22, 8, M('#e7a99b', { r: 0.2 }), bottle, 0, 0.11, 0); cyl(0.015, 0.03, 0.09, 6, M('#e7a99b', { r: 0.2 }), bottle, 0, 0.26, 0);
  addLoose(bottle, T.float, 1.1, undefined, mkFall(T.quake + 0.35, 0.55, -0.2, 0.05, new THREE.Euler(Math.PI / 2, 0.4, 0)));
  for (const [x, z, k] of [[-0.6, 5.85, 0], [-0.18, 6.12, 1]]) { const gl = new THREE.Group(); gl.position.set(x, 0.76, z); cyl(0.035, 0.022, 0.1, 8, M('#e9d3c6', { r: 0.1 }), gl, 0, 0.06, 0); addLoose(gl, T.float, 1.2, undefined, mkFall(T.quake + 0.15 + k * 0.4, k ? 0.5 : -0.6, k ? 0.3 : 0.1, 0.035, new THREE.Euler(Math.PI / 2, k * 2, 0))); }
  const candle = new THREE.Group(); candle.position.set(-0.45, 0.76, 6.15);
  cyl(0.05, 0.05, 0.09, 8, M('#d9c8a8'), candle, 0, 0.045, 0);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 1.2) })); flame.position.y = 0.12; candle.add(flame);
  const candleFall = mkFall(T.quake + 0.6, -0.4, 0.35, 0.05, new THREE.Euler(0, 0, Math.PI / 2));
  addLoose(candle, T.float, 1.0, undefined, candleFall);
  function chair(x, z, ry, fall) {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry;
    const ir = M('#33302c', { r: 0.6 });
    box(0.44, 0.04, 0.42, ir, c, 0, 0.46, 0); box(0.44, 0.46, 0.04, ir, c, 0, 0.7, -0.2);
    for (const [a, b] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) box(0.035, 0.46, 0.035, ir, c, a, 0.23, b);
    return addLoose(c, T.float, 0.95, undefined, fall);
  }
  chair(-1.02, 6.0, Math.PI / 2, mkFall(T.quake + 0.9, -0.35, 0, 0.22, new THREE.Euler(0, Math.PI / 2, Math.PI / 2)));
  chair(0.22, 6.0, -Math.PI / 2, null);
  // la petite voiture garée
  const car = new THREE.Group(); car.position.set(3.15, 0, 2.6); car.rotation.y = 0.05;
  { const body = M('#c9b78f', { r: 0.45 }), glass = M('#1d242a', { r: 0.2 }), tyre = M('#151515');
    box(1.55, 0.6, 3.5, body, car, 0, 0.55, 0); box(1.35, 0.55, 1.9, glass, car, 0, 1.1, -0.1); box(1.4, 0.07, 1.85, body, car, 0, 1.4, -0.1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), tyre, car, sx * 0.72, 0.3, sz * 1.15, 0, 0, Math.PI / 2);
    for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#eae2c8' }), car, sx * 0.5, 0.62, 1.76); }
  addLoose(car, T.float + 0.6, 0.9, new THREE.Vector3(0.12, 0.05, 0.25));
  // les tuiles du toit qui tombent pendant le séisme
  const tiles = [], tileTimes = [];
  for (let i = 0; i < 16; i++) { const tf = T.quake + 0.3 + R() * 1.8; tileTimes.push(tf + Math.sqrt(2 * 6.9 / 9.81)); tiles.push({ z: -3.2 + R() * 3.6, tf, vx: -0.4 - R() * 0.9, w: new THREE.Vector3(R() * 9, R() * 9, R() * 9), lift: T.float + R() * 0.8 }); }
  const tileMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.05, 0.3), M('#a65a3d'), tiles.length); tileMesh.frustumCulled = false; scene.add(tileMesh);
  // le gravier de la terrasse, des cailloux, des pétales de lavande
  const bits = [];
  for (let i = 0; i < 600; i++) {
    const nearB = i < 320;
    const x = nearB ? -8 + R() * 12 : (R() - 0.5) * 140, z = nearB ? -0.5 + R() * 15 : 15 - (25 + R() * 160);
    const y = nearB ? 0.03 : H(x, z) + 0.1;
    const s = nearB ? 0.012 + R() * 0.028 : 0.15 + R() * 0.6;
    bits.push({ p0: new THREE.Vector3(x, y, z), s, s0: T.float + R() * 0.6, a: 0.8 + R() * 0.5, w: new THREE.Vector3(R() * 4, R() * 4, R() * 4), c: i % 7 === 0 ? '#8a74b6' : (nearB ? '#a39782' : '#6e6553') });
  }
  const bitsMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M('#ffffff', { unique: true }), bits.length);
  bits.forEach((b, i) => bitsMesh.setColorAt(i, new THREE.Color(b.c))); bitsMesh.frustumCulled = false; scene.add(bitsMesh);
  // les tuiles et de gros blocs de terrain (pendant la déchirure)
  const chunks = [];
  for (let i = 0; i < 150; i++) chunks.push({ p0: new THREE.Vector3(5 + R() * 7, 7.2 + R() * 2, -2.5 + R() * 16), s: new THREE.Vector3(0.35, 0.05, 0.25), s0: T.tear + 0.6 + R() * 2.2, a: 1.4 + R(), w: new THREE.Vector3(R() * 5, R() * 5, R() * 5), c: '#a65a3d' });
  for (let i = 0; i < 260; i++) { const x = (R() - 0.5) * 3200, d = 120 + R() ** 1.3 * 3600, z = 15 - d; const s = 4 + R() * 26; chunks.push({ p0: new THREE.Vector3(x, H(x, z), z), s: new THREE.Vector3(s, s * 0.6, s), s0: T.tear + R() * 3.5, a: 30 + R() * 60, w: new THREE.Vector3(R(), R(), R()), c: R() < 0.5 ? '#4f5838' : '#6e5a45' }); }
  const chunkMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M('#ffffff', { unique: true }), chunks.length);
  chunks.forEach((b, i) => chunkMesh.setColorAt(i, new THREE.Color(b.c))); chunkMesh.frustumCulled = false; scene.add(chunkMesh);
  // embruns : la mer qui « tombe vers le haut »
  const NSP = 2600, spray = [];
  for (let i = 0; i < NSP; i++) { const x = (R() - 0.5) * 9000, d = 2500 + R() * 9000; spray.push({ x, z: 15 - d, s0: T.float + 0.5 + R() * 6, a: 10 + R() * 40, ph: R() * 6 }); }
  const sprayGeo = new THREE.BufferGeometry(); sprayGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NSP * 3), 3));
  const sprayPts = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, color: '#a9c2d6', transparent: true, opacity: 0, depthWrite: false }));
  sprayPts.frustumCulled = false; scene.add(sprayPts);

  // -------------------------------------------------------------------
  // 8. LA LUNE QUI SE DÉCHIRE : des milliers de fragments qui s'enroulent autour du trou noir
  // -------------------------------------------------------------------
  const NM = 3800, frags = [];
  for (let i = 0; i < NM; i++) frags.push({ lag: R() ** 1.4 * 3.2, off: (R() - 0.5) * 0.11, rad: R() ** 0.5 * 0.26, ang: R() * Math.PI * 2, b: 0.5 + R() * 0.8 });
  const fragGeo = new THREE.BufferGeometry(); fragGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NM * 3), 3)); fragGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(NM * 3), 3));
  const fragPts = new THREE.Points(fragGeo, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  fragPts.frustumCulled = false; fragPts.renderOrder = 3; scene.add(fragPts);
  const e1 = BH_DIR.clone().sub(MOON_DIR).normalize(); const e2 = new THREE.Vector3().crossVectors(BH_DIR, e1).normalize();
  const SEP = MOON_DIR.angleTo(BH_DIR);
  const starRotM4 = new THREE.Matrix4();
  const skyPoint = (u, v, out) => out.copy(BH_DIR).addScaledVector(e1, u).addScaledVector(e2, v).normalize();

  // -------------------------------------------------------------------
  // 9. LES GENS : un couple à table, un ami au muret… et le chien
  // -------------------------------------------------------------------
  const A = makePerson(scene, { shirt: '#ece7dc', pants: '#2f3a4f', hair: '#5a3a22', skin: '#d9ab86' });
  const B = makePerson(scene, { shirt: '#3d6e9e', pants: '#d8cfb8', hair: '#2a1d15' });
  const Cf = makePerson(scene, { shirt: '#b2453a', pants: '#3b3b3b', hair: '#8a8a8a' });
  const people = [
    { P: A, seat: new THREE.Vector3(-1.02, 0, 6.0), sry: Math.PI / 2, wall: new THREE.Vector3(0.75, 0, -0.75), seed: 1, lift: 0.95 },
    { P: B, seat: new THREE.Vector3(0.22, 0, 6.0), sry: -Math.PI / 2, wall: new THREE.Vector3(1.3, 0, -0.75), seed: 2, lift: 1.0 },
    { P: Cf, seat: null, wall: new THREE.Vector3(-2.4, 0, -0.75), seed: 3, lift: 1.05 },
  ];
  const angLerp = (a, b, k) => { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; };
  const liftDist = (u, a = 1) => (u <= 0 ? 0 : a * (0.035 * u ** 3 + 0.06 * u * u));

  function posePeople(t) {
    const q = sm(T.quake, T.quake + 0.3, t) * (1 - sm(T.quake + 3.8, T.quake + 4.6, t));   // le séisme
    for (const H0 of people) {
      const { P, seat, wall, seed } = H0; P.reset();
      let pos, ry;
      if (seat) {
        // assis à table, puis (pendant le zoom sur la côte) ils se lèvent et vont au muret
        const up = sm(21.6 + seed * 0.3, 22.4 + seed * 0.3, t);
        P.sit(1 - up);
        const walk = sm(22.6 + seed * 0.3, 25.4 + seed * 0.3, t);
        pos = seat.clone().lerp(wall, walk);
        ry = angLerp(H0.sry, Math.PI, sm(22.2 + seed * 0.3, 23.0 + seed * 0.3, t));
        if (walk > 0 && walk < 1) P.walk(walk * 22, 1);
        if (up < 0.5) { P.head.rotation.y = Math.sin(t * 1.1 + seed * 2) * 0.3; P.armR.rotation.x = seed === 2 ? -1.1 * sm(6.0, 6.6, t) * (1 - sm(8.2, 8.8, t)) - 0.5 : -0.5; P.armL.rotation.x = -0.5; }
      } else {
        pos = wall.clone(); ry = Math.PI;
        P.armL.rotation.x = -0.3; P.head.rotation.y = Math.sin(t * 0.4) * 0.15 + 0.35 * sm(9, 10, t) * (1 - sm(14, 15, t));
      }
      // au muret : ils regardent la mer qui monte en contrebas ; l'ami montre du doigt
      if (t > 31 && t < T.tiltUp + 2) {
        P.head.rotation.x = 0.28; P.head.rotation.y = 0.15 * Math.sin(t * 0.5 + seed);
        if (seed === 3) { const pt = sm(34.2, 34.8, t) * (1 - sm(36.4, 37.0, t)); P.armR.rotation.x = -1.35 * pt; P.armR.rotation.z = -0.15 * pt; }
        if (seed === 2) { const hold = sm(35.2, 35.8, t) * (1 - sm(37.6, 37.8, t)); P.armL.rotation.set(-0.3 * hold, 0, 0.9 * hold); }
      }
      // le séisme : ils se baissent, bras écartés, l'ami tombe assis par terre puis se relève
      if (q > 0) {
        const sway = Math.sin(t * 9 + seed) * 0.09 * q;
        if (seed === 3) {
          const down = sm(T.quake + 0.5, T.quake + 0.9, t) * (1 - sm(T.quake + 4.0, T.quake + 4.6, t));
          P.body.position.y = lerp(0.9, 0.24, down);
          for (const L of P.legs) { L.hip.rotation.x = -1.35 * down; L.knee.rotation.x = 0.25 * down; }
          P.armL.rotation.set(0.6 * down, 0, 0.5 * down); P.armR.rotation.set(0.6 * down, 0, -0.5 * down);
          P.body.rotation.x = -0.15 * down; P.body.rotation.z = sway;
        } else {
          const c = 0.75 * q;
          P.body.position.y = 0.9 - 0.22 * c;
          for (const L of P.legs) { L.hip.rotation.x = -0.6 * c; L.knee.rotation.x = 1.1 * c; }
          P.body.rotation.x = 0.25 * c; P.body.rotation.z = sway;
          if (seed === 1) { P.armL.rotation.set(-1.0 * c, 0, 0.2 * c); P.armR.rotation.set(-1.0 * c, 0, -0.2 * c); }   // agrippé au muret
          else { P.armL.rotation.set(-0.3 * c, 0, 1.0 * c); P.armR.rotation.set(-0.3 * c, 0, -1.0 * c); }
        }
      }
      // retour sur Terre : la tête levée vers le ciel ; l'air se raréfie : ils peinent à respirer
      if (t > T.zoomOut) {
        P.head.rotation.x = -0.55 + 0.25 * sm(57.2, 58.2, t);
        const gasp = sm(57.0, 58.4, t) * (1 - sm(T.float, T.float + 1.0, t));
        if (gasp > 0) {
          const br = Math.sin(t * 5.2 + seed * 1.7) * 0.5 + 0.5;
          P.body.rotation.x = (0.12 + 0.08 * br) * gasp; P.body.position.y = 0.9 - 0.05 * gasp;
          for (const L of P.legs) { L.hip.rotation.x = -0.25 * gasp; L.knee.rotation.x = 0.45 * gasp; }
          if (seed !== 3) { P.armR.rotation.set(-1.15 * gasp, 0, -0.55 * gasp); } else { P.armL.rotation.set(-0.9 * gasp, 0, 0.3 * gasp); P.armR.rotation.set(-0.9 * gasp, 0, -0.3 * gasp); }
        }
      }
      // ils flottent… puis tombent vers le haut
      const u = t - T.float - seed * 0.12;
      if (u > 0) {
        const zero = sm(0, 2.2, u);
        P.armL.rotation.z = lerp(P.armL.rotation.z, 1.1 + Math.sin(t * 1.3 + seed) * 0.2, zero);
        P.armR.rotation.z = lerp(P.armR.rotation.z, -1.1 - Math.sin(t * 1.1 + seed) * 0.2, zero);
        P.armL.rotation.x = lerp(P.armL.rotation.x, -0.4, zero); P.armR.rotation.x = lerp(P.armR.rotation.x, -0.4, zero);
        P.legs[0].hip.rotation.x = 0.25 * zero * Math.sin(t * 0.9 + seed); P.legs[1].hip.rotation.x = -0.2 * zero; P.legs[0].knee.rotation.x = 0.4 * zero; P.legs[1].knee.rotation.x = 0.6 * zero;
        P.head.rotation.x = lerp(P.head.rotation.x, 0.3, zero * 0.5);
        pos.addScaledVector(UP, liftDist(u, H0.lift));
        pos.x += Math.sin(u * 0.7 + seed) * 0.08 * u;
        P.body.rotation.x = 0.06 * u * u * (seed % 2 ? 1 : -1) * 0.12; P.body.rotation.z = 0.04 * u * (seed - 2);
      }
      P.root.position.copy(pos); P.root.rotation.y = ry;
    }
  }

  // le chien (un petit chien roux de Provence)
  const dog = (() => {
    const root = new THREE.Group(); scene.add(root);
    const fur = M('#b0723f'), dark = M('#5a3a22');
    const body = new THREE.Group(); root.add(body);
    box(0.24, 0.22, 0.56, fur, body, 0, 0, 0);
    const head = new THREE.Group(); head.position.set(0, 0.12, 0.3); body.add(head);
    box(0.2, 0.18, 0.2, fur, head, 0, 0.04, 0.05);
    box(0.11, 0.09, 0.14, fur, head, 0, -0.005, 0.2);
    box(0.05, 0.04, 0.04, dark, head, 0, 0.03, 0.27);
    for (const sx of [-1, 1]) { const ear = box(0.06, 0.11, 0.03, dark, head, sx * 0.07, 0.17, 0.0); ear.rotation.z = sx * 0.3; }
    const legs = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const piv = new THREE.Group(); piv.position.set(sx * 0.08, -0.08, sz * 0.2); body.add(piv); box(0.06, 0.3, 0.06, fur, piv, 0, -0.15, 0); legs.push({ piv, front: sz > 0 }); }
    const tail = new THREE.Group(); tail.position.set(0, 0.06, -0.28); body.add(tail); box(0.045, 0.045, 0.24, dark, tail, 0, 0.0, -0.11);
    return { root, body, head, legs, tail };
  })();
  const DOG0 = new THREE.Vector3(1.35, 0, 5.3), DOG1 = new THREE.Vector3(0.1, 0, -0.35);
  const barkTimes = [T.quake - 0.62, T.quake - 0.36, T.quake + 1.9, T.quake + 2.3, T.quake + 3.2];
  function poseDog(t) {
    const { root, body, head, legs, tail } = dog;
    const stand = sm(T.quake - 0.9, T.quake - 0.7, t);                         // il sent l'onde P avant tout le monde
    const cower = sm(T.quake + 0.1, T.quake + 0.4, t) * (1 - sm(T.zoomIn, T.zoomIn + 0.3, t));
    const moved = sm(T.zoomHeld + 1, T.zoomOut - 1, t);                         // il rejoint ses maîtres pendant qu'on regarde le ciel
    const pos = DOG0.clone().lerp(DOG1, moved);
    let ry = lerp(-0.7, Math.PI, moved);
    const lie = 1 - stand;
    body.position.y = lerp(0.36, 0.17, lie) - 0.1 * cower;
    body.rotation.set(0.12 * cower, 0, 0);
    legs.forEach((L, i) => { L.piv.rotation.set(L.front ? -1.45 * lie : 1.45 * lie, 0, 0); if (cower > 0) L.piv.rotation.x += (L.front ? -0.5 : 0.6) * cower; });
    head.rotation.set(lerp(0.25, -0.15, stand), Math.sin(t * 0.7) * 0.3 * lie, 0);
    let bark = 0; for (const b of barkTimes) bark = Math.max(bark, Math.exp(-(((t - b) / 0.06) ** 2)));
    head.rotation.x -= 0.3 * bark;
    tail.rotation.set(lerp(-0.4, 0.7, cower), Math.sin(t * 9) * 0.5 * lie * (t < 30 ? 1 : 0), 0);
    if (cower > 0) pos.x += Math.sin(t * 47) * 0.012 * cower;   // il tremble
    if (t > T.zoomOut) { head.rotation.x = -0.45; tail.rotation.x = 0.5; }
    // apesanteur : il pédale dans le vide
    const u = t - T.float - 0.05;
    if (u > 0) {
      const z = sm(0, 1.2, u);
      legs.forEach((L, i) => { L.piv.rotation.x = Math.sin(t * 7 + i * 1.6) * 0.7 * z; });
      pos.addScaledVector(UP, liftDist(u, 1.15)); body.rotation.z = 0.25 * u; body.rotation.x = -0.1 * u;
    }
    root.position.copy(pos); root.rotation.y = ry;
  }

  // -------------------------------------------------------------------
  // 10. LA CAMÉRA : plan large → la côte → la terrasse → on lève les yeux (zoom) → plan large tourné vers le ciel
  // -------------------------------------------------------------------
  const lookWide = CAM.clone().add(new THREE.Vector3(-12, -14, -620).normalize().multiplyScalar(100));
  const wideDir0 = lookWide.clone().sub(CAM).normalize();
  const FINAL_DIR = new THREE.Vector3(wideDir0.x, 0, wideDir0.z).normalize().multiplyScalar(Math.cos(9 * Math.PI / 180)).add(new THREE.Vector3(0, Math.sin(9 * Math.PI / 180), 0)).normalize();
  const midDir = MOON_DIR.clone().add(BH_DIR).normalize();
  const COAST_DIR = dirAzEl(-4.7, -3.7);   // le village et le port, vus d'un peu plus haut (la caméra monte de 8 m)
  const vA = new THREE.Vector3(), vB = new THREE.Vector3();
  const quakeAmp = (t) => sm(T.quake - 0.05, T.quake + 0.25, t) * (1 - 0.55 * sm(T.quake + 1.5, T.quake + 4.0, t)) * (1 - sm(T.tiltUp - 0.4, T.zoomIn, t))
    + 0.3 * sm(T.wide - 0.6, T.wide, t) * (1 - sm(T.float, T.float + 1.2, t));
  function camAt(t) {
    const pos = CAM.clone(); pos.z -= 0.8 * sm(0, 24, t); pos.x += 0.12 * Math.sin(t * 0.23);
    const base = t < 50 ? wideDir0 : FINAL_DIR;
    const coastK = sm(T.coastIn, T.coastIn + 1.6, t) * (1 - sm(T.coastOut, T.coastOut + 1.4, t));
    pos.y += 8 * coastK;
    const tiltK = sm(T.tiltUp, T.zoomIn + 0.4, t) * (1 - sm(T.zoomOut + 0.4, T.wide + 0.2, t));
    const zoomK = sm(T.zoomIn, T.zoomHeld, t) * (1 - sm(T.zoomOut, T.zoomOut + 0.8, t));
    const jit = vB.set(Math.sin(t * 1.7) * 0.00025 + Math.sin(t * 4.1) * 0.0001, Math.cos(t * 1.3) * 0.0002, 0);
    const telDir = midDir.clone().add(jit).normalize();
    const dir = vA.copy(base).lerp(COAST_DIR, coastK).normalize().lerp(telDir, tiltK).normalize();
    const fov0 = t < 50 ? 70 : 74;
    const fov = Math.exp(lerp(lerp(Math.log(fov0), Math.log(16), coastK), Math.log(4.0), zoomK));
    // les secousses : la caméra (et ce qu'elle filme) tremblent
    const q = quakeAmp(t) * (1 - zoomK);
    const shake = sm(T.tear, T.flash, t) * 0.12 + 0.05 * q;
    pos.x += (Math.sin(t * 37) + Math.sin(t * 23.1)) * shake; pos.y += (Math.sin(t * 29.3) + Math.cos(t * 41)) * shake * 0.8;
    dir.x += (Math.sin(t * 31.7) + Math.sin(t * 17.3)) * 0.004 * q * (1 - coastK * 0.6); dir.y += (Math.sin(t * 27.1) + Math.cos(t * 19.9)) * 0.003 * q;
    return { pos, dir: dir.normalize(), fov, zoomK, coastK, tiltK };
  }

  // -------------------------------------------------------------------
  // 11. LA MER : marées calculées (marée d'équilibre × 0,69 = ce qu'on voit depuis la côte, car le sol monte aussi)
  // -------------------------------------------------------------------
  const seaOffRaw = (t) => {
    if (t < T.coastIn) return 0;
    const A0 = tideA(rAt(leftAt(t)));
    const h = 0.69 * A0 * (0.25 + 0.75 * Math.cos(Math.PI * phaseAt(t)));
    return clamp(h, -80, 210) * sm(T.coastIn, T.coastIn + 0.8, t);
  };
  // le plus haut niveau atteint jusqu'ici (pour savoir jusqu'où les bateaux ont été poussés)
  const HI = []; { let m = 0; for (let i = 0; i <= T.duration * 20 + 1; i++) { m = Math.max(m, seaOffRaw(i / 20)); HI.push(m); } }
  const hiAt = (t) => HI[clamp(Math.round(t * 20), 0, HI.length - 1)];

  // -------------------------------------------------------------------
  // 12. UNE IMAGE
  // -------------------------------------------------------------------
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const BASE_DATE = Date.UTC(2026, 7, 14, 22, 40, 0);
  function fmtLeft(s) {
    s = Math.max(0, Math.round(s));
    if (s >= 86400) return `${Math.floor(s / 86400)} j ${pad(Math.floor((s % 86400) / 3600))} h ${pad(Math.floor((s % 3600) / 60))} min`;
    if (s >= 3600) return `${Math.floor(s / 3600)} h ${pad(Math.floor((s % 3600) / 60))} min ${pad(s % 60)} s`;
    if (s >= 60) return `${Math.floor(s / 60)} min ${pad(s % 60)} s`;
    return `${s} s`;
  }
  const events = () => ({ T, subs: SUBS, falls: fallTimes, tiles: tileTimes, barks: barkTimes, highs: PHASE.filter(([, p]) => p % 2 === 0).map(([t]) => t) });

  function update(t) {
    const left = leftAt(t), r = rAt(left);
    const W = weightAt(r), A0 = tideA(r);
    // --- caméra
    const C0 = camAt(t);
    camera.position.copy(C0.pos); camera.fov = C0.fov; camera.updateProjectionMatrix();
    camera.lookAt(tmp.copy(C0.pos).add(C0.dir)); camera.updateMatrixWorld();
    sky.follow(camera);
    scene.fog.near = lerp(2500, 7000, C0.coastK);
    sky.u.uStarScale.value = 260 * Math.max(1, 70 / C0.fov) * 0.85;
    sky.u.uStarThr.value = lerp(0.945, 0.957, C0.zoomK);
    sky.u.uStars.value = lerp(1.1, 2.8, C0.zoomK); sky.u.uMilky.value = lerp(1.3, 0.12, C0.zoomK);
    for (const o of wireObjs) o.visible = C0.zoomK < 0.03 && C0.coastK < 0.05;
    starRotM4.makeRotationAxis(e2, -0.0075 * sm(T.zoomHeld - 2, T.flash, t)); sky.u.uStarRot.value.setFromMatrix4(starRotM4);
    // --- la lentille gravitationnelle (rayon réel de l'anneau d'Einstein)
    sky.u.uLensE.value = einsteinAt(r);
    sky.u.uShadow.value = Math.max(2.6 * RS / r, 0.00009);
    // --- la Lune : s'étire vers le trou noir, puis se brise en fragments
    const stretch = sm(T.moonStretch, T.moonBreak + 0.6, t);
    const broken = sm(T.moonBreak + 0.2, T.moonBreak + 1.3, t);
    moon.follow(camera); halo.position.copy(moon.position);
    const sp = moon.material; sp.opacity = 1 - broken; halo.material.opacity = (1 - broken) * (1 - 0.6 * C0.zoomK);
    {
      tmp.copy(moon.position).project(camera); tmp2.copy(camera.position).add(BH_DIR).project(camera);
      sp.rotation = Math.atan2(tmp2.y - tmp.y, (tmp2.x - tmp.x) * camera.aspect);
      const base = 2 * 800 * Math.tan(0.26 * Math.PI / 180);
      moon.scale.set(base * (1 + 0.38 * stretch), base * (1 - 0.1 * stretch), 1);
    }
    moonLight.position.copy(MOON_DIR).multiplyScalar(1000).add(camera.position); moonLight.target.position.copy(camera.position);
    moonLight.intensity = 0.6 * (1 - 0.25 * broken); sky.u.uTintAmt.value = 0.5 * (1 - broken) * (1 - 0.85 * C0.zoomK);
    moon.material.color.setScalar(lerp(1.6, 0.8, C0.zoomK));
    // --- le courant saute pendant le séisme ; l'œil (la caméra) s'habitue au noir
    const flick = (Math.sin(t * 53) > 0.1 ? 1 : 0.25) * (Math.sin(t * 17.3) > -0.6 ? 1 : 0.4);
    const power = t < T.quake + 0.4 ? 1 : t < T.quake + 1.3 ? flick : 0;
    lamps[0].intensity = 7 * power; lamps[1].intensity = 5 * power; lamps[2].intensity = 3 * power;
    bulbMat.color.setRGB(2.4 * power, 1.6 * power, 0.8 * power); winLit.emissiveIntensity = 2.2 * power;
    uCut.value = 0.88 * sm(T.quake + 0.5, T.quake + 2.6, t) * (t > T.quake + 0.5 && t < T.quake + 2.6 && Math.sin(t * 29) > 0.7 ? 0.6 : 1);
    const dark = 1 - power;
    renderer.toneMappingExposure = lerp(lerp(1.5, 1.95, dark * sm(T.quake + 1.3, T.quake + 3.5, t)) + 0.45 * sm(T.zoomOut, T.wide, t) + 0.55 * C0.coastK, 1.2, C0.zoomK);
    hemi.intensity = 0.5 + 0.18 * dark + 0.3 * sm(T.zoomOut, T.wide, t) + 0.25 * sm(T.tear, T.flash, t);
    stage.bloomPass.strength = lerp(0.45, 0.18, Math.max(C0.zoomK, C0.coastK * 0.5)) + 0.5 * sm(T.tear, T.flash, t);
    const cf = candleFall.tf;
    flame.visible = t < cf + 0.12;
    flame.material.color.setRGB(5 * (0.85 + 0.15 * Math.sin(t * 13)), 3, 1.2);
    // fragments de Lune
    {
      const pa = fragGeo.attributes.position.array, ca = fragGeo.attributes.color.array;
      const u0 = t - T.moonBreak;
      fragPts.material.opacity = broken;
      for (let i = 0; i < NM; i++) {
        const f = frags[i];
        let u = 0, v = 0;
        if (u0 <= 0) { u = -SEP + Math.cos(f.ang) * f.rad * 0.0045; v = Math.sin(f.ang) * f.rad * 0.0045; }
        else {
          const k = clamp((u0 * 0.55 - f.lag * 0.35) / 1.6, 0, 1.6);
          const ang = Math.PI + k * 4.2 + f.off * 6;
          const radius = SEP * lerp(1, 0.28 + 0.25 * f.rad, sm(0, 1.3, k));
          u = Math.cos(ang) * radius + Math.cos(f.ang) * f.rad * 0.0045 * (1 - sm(0, 0.4, k));
          v = Math.sin(ang) * radius * 0.55 + f.off * SEP * 0.35 * sm(0, 1, k) + Math.sin(f.ang) * f.rad * 0.0045 * (1 - sm(0, 0.4, k));
        }
        skyPoint(u, v, tmp).multiplyScalar(790).add(camera.position);
        pa[i * 3] = tmp.x; pa[i * 3 + 1] = tmp.y; pa[i * 3 + 2] = tmp.z;
        const b = f.b * lerp(0.1, 0.55, C0.zoomK ** 0.5); ca[i * 3] = b; ca[i * 3 + 1] = b * 0.98; ca[i * 3 + 2] = b * 0.95;
      }
      fragGeo.attributes.position.needsUpdate = true; fragGeo.attributes.color.needsUpdate = true;
      fragPts.material.size = lerp(1.3, 2.6, C0.zoomK);
    }
    // --- la mer : les marées
    const off = seaOffRaw(t);
    const seaY = SEA + off;
    sea.U.uLevel.value = seaY; sea.U.uTime.value = t;
    sea.U.uChop.value = 0.9 + 3 * sm(T.coastIn, 22, t) + 2.5 * sm(T.quake, T.quake + 1, t) + 6 * sm(T.float - 1, T.float + 8, t);
    uSeaLvl.value = seaY + 0.5; uHi.value = SEA + hiAt(t) + 0.5;
    {
      const a = shorePts.geometry.attributes.position.array;
      for (let i = 0; i < NSH; i++) {
        const pr = shoreProf[i]; let j = 0;
        while (j < SH_N && pr[j] > seaY) j++;
        if (j === 0 || j >= SH_N) { a[i * 3 + 1] = -1e5; continue; }
        const f = (pr[j - 1] - seaY) / (pr[j - 1] - pr[j]), d = SH_D0 + (j - 1 + f) * SH_STEP;
        a[i * 3] = shoreX[i] + Math.sin(t * 2 + i) * 3; a[i * 3 + 1] = seaY + 0.8; a[i * 3 + 2] = 15 - d + Math.sin(t * 1.7 + i * 0.7) * 6;
      }
      shorePts.geometry.attributes.position.needsUpdate = true;
      shorePts.material.opacity = 0.8 * sm(T.coastIn, T.coastIn + 1, t) * (1 - sm(T.float, T.float + 2, t));
    }
    // bateaux : poussés dans les terres à chaque marée haute, échoués à marée basse
    {
      const a = boatPts.geometry.attributes.position.array, c = boatPts.geometry.attributes.color.array;
      const hi = hiAt(t);
      boats.forEach((b, i) => {
        const dIn = Math.max(0, b.d0 - b.k * hi), x = b.x + b.w * hi * 3, z = 15 - dIn;
        const land = H(x, z) + 1.2;
        a[i * 3] = x + Math.sin(t * 0.7 + i) * 2 * (seaY > land ? 1 : 0); a[i * 3 + 1] = Math.max(seaY + 1.5 + Math.sin(t * 1.3 + i) * 0.6, land); a[i * 3 + 2] = z;
        const on = (Math.sin(t * 1.9 + i * 2.1) > -0.85 ? 1 : 0.2) * (t > T.quake + 2 && i % 3 === 0 ? 0 : 1);
        c[i * 3] = 2.4 * on; c[i * 3 + 1] = 2.05 * on; c[i * 3 + 2] = 1.5 * on;
      });
      boatPts.geometry.attributes.position.needsUpdate = true; boatPts.geometry.attributes.color.needsUpdate = true;
    }
    beacon.material.opacity = (Math.sin(t * 2.4) > 0.6 ? 1 : 0.08) * (seaY < LH.y + 18 ? 1 : 0) * (t < T.quake + 0.8 ? 1 : 0);
    // les voitures qui fuient vers les collines (un bouchon qui avance lentement)
    {
      const a = carPts.geometry.attributes.position.array;
      cars.forEach((cv, i) => {
        const u = t - cv.t0;
        if (u < 0 || t > T.zoomOut + 6) { a[i * 3 + 1] = -1e5; return; }
        const jam = 0.5 + 0.5 * Math.sin(t * 0.8 - i * 0.35);   // accordéon du bouchon
        const s = Math.min(0.97, 0.43 + 0.7 * cv.v * Math.max(0, u - 0.6 * jam));   // le bouchon commence au pied de la colline
        const [x, y, z] = road(Math.max(0, s));
        a[i * 3] = x + cv.lane; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      });
      carPts.geometry.attributes.position.needsUpdate = true;
    }
    // gyrophares
    {
      const a = gyroPts.geometry.attributes.position.array, c = gyroPts.geometry.attributes.color.array;
      gyros.forEach((gy, i) => {
        const on = t > gy.t0 && t < T.zoomOut + 6 ? 1 : 0;
        a[i * 3] = gy.x; a[i * 3 + 1] = on ? gy.y + 1 : -1e5; a[i * 3 + 2] = gy.z;
        const f = Math.sin(t * 13 + gy.ph) > 0.3 ? 1 : 0.05;
        c[i * 3] = 0.35 * f; c[i * 3 + 1] = 0.6 * f; c[i * 3 + 2] = 3.2 * f;
      });
      gyroPts.geometry.attributes.position.needsUpdate = true; gyroPts.geometry.attributes.color.needsUpdate = true;
    }
    // incendies
    fires.forEach((f) => { const u = t - f.t0; const k = sm(0, 1.2, u); f.sp.material.opacity = k * (0.75 + 0.25 * Math.sin(t * 7 + f.ph) * Math.sin(t * 3.1 + f.ph)); f.sp.scale.setScalar(f.s * (0.6 + 0.4 * k)); });
    // --- les gens et le chien
    posePeople(t); poseDog(t);
    // --- les objets : tombent pendant le séisme, puis "tombent vers le haut"
    for (const o of loose) {
      o.obj.position.copy(o.p0); o.obj.rotation.copy(o.r0);
      if (o.fall) {
        const f = o.fall, u = t - f.tf;
        if (u > 0) {
          const h = o.p0.y - f.y1, tfall = Math.sqrt(2 * Math.max(h, 0.01) / 9.81);
          const k = clamp(u / tfall);
          o.obj.position.addScaledVector(f.d, sm(0, 1, k));
          o.obj.position.y = Math.max(f.y1, o.p0.y - 4.9 * Math.min(u, tfall) ** 2);
          const kr = sm(0, 1, clamp(u / (tfall + 0.15)));
          o.obj.rotation.set(lerp(o.r0.x, f.r1.x, kr), lerp(o.r0.y, f.r1.y, kr), lerp(o.r0.z, f.r1.z, kr));
        }
      }
      const u = t - o.s0;
      if (u > 0) {
        o.obj.position.addScaledVector(UP, liftDist(u, o.a)).addScaledVector(o.drift, u * u * 0.08);
        o.obj.rotation.x += o.w.x * u * u * 0.08; o.obj.rotation.y += o.w.y * u * u * 0.08; o.obj.rotation.z += o.w.z * u * u * 0.08;
      }
      if (q0(t) > 0 && !o.fall && o.obj !== car) { o.obj.position.x += Math.sin(t * 41 + o.p0.z) * 0.01 * q0(t); }   // tout tremble
    }
    // tuiles du toit
    tiles.forEach((tl, i) => {
      const u = t - tl.tf;
      D.position.set(4.0, 6.95, tl.z); D.rotation.set(0.35, 0, 0.5);
      if (u > 0) {
        const tfall = Math.sqrt(2 * 6.9 / 9.81), uu = Math.min(u, tfall);
        D.position.x += tl.vx * uu; D.position.y = Math.max(0.03, 6.95 - 4.9 * uu * uu);
        D.rotation.set(tl.w.x * uu, tl.w.y * uu, tl.w.z * uu);
        const ul = t - tl.lift; if (ul > 0) D.position.addScaledVector(UP, liftDist(ul, 1.2));
      }
      D.scale.setScalar(1); D.updateMatrix(); tileMesh.setMatrixAt(i, D.matrix);
    });
    tileMesh.instanceMatrix.needsUpdate = true;
    // petits morceaux (gravier, pétales, cailloux)
    bits.forEach((b, i) => {
      const u = t - b.s0; D.position.copy(b.p0);
      if (u > 0) D.position.addScaledVector(UP, liftDist(u, b.a) * 1.1).add(tmp.set(Math.sin(u + i) * 0.1 * u, 0, Math.cos(u * 0.8 + i) * 0.1 * u));
      D.rotation.set(b.w.x * Math.max(u, 0), b.w.y * Math.max(u, 0), b.w.z * Math.max(u, 0)); D.scale.setScalar(b.s); D.updateMatrix(); bitsMesh.setMatrixAt(i, D.matrix);
    });
    bitsMesh.instanceMatrix.needsUpdate = true;
    chunks.forEach((b, i) => {
      const u = t - b.s0; D.position.copy(b.p0);
      const vis = u > 0 ? 1 : 0;
      if (u > 0) D.position.addScaledVector(BH_DIR, b.a * (0.6 * u * u + 0.25 * u ** 3));
      D.rotation.set(b.w.x * Math.max(u, 0), b.w.y * Math.max(u, 0), b.w.z * Math.max(u, 0)); D.scale.copy(b.s).multiplyScalar(vis); D.updateMatrix(); chunkMesh.setMatrixAt(i, D.matrix);
    });
    chunkMesh.instanceMatrix.needsUpdate = true;
    {
      const a = sprayGeo.attributes.position.array; let any = 0;
      spray.forEach((s, i) => { const u = t - s.s0; if (u > 0) any = 1; const L = u > 0 ? s.a * (0.5 * u * u + 0.12 * u ** 3) : -1e5; a[i * 3] = s.x + BH_DIR.x * L; a[i * 3 + 1] = seaY + 1 + BH_DIR.y * L + Math.sin(u * 3 + s.ph) * 2; a[i * 3 + 2] = s.z + BH_DIR.z * L; });
      sprayGeo.attributes.position.needsUpdate = true; sprayPts.material.opacity = 0.85 * any;
    }
    // --- la Terre se déchire : fissures de lave, tout s'étire vers le trou noir
    FX.uCrack.value = sm(T.tear, T.tear + 3.2, t); FX.uCrackScale.value = 0.16; FX.uCrackColor.value.setRGB(1.0, 0.42, 0.1);
    FX.uStretch.value = 0.13 * sm(T.tear + 1.0, T.flash, t) ** 2;
    FX.uStretchDir.value.copy(BH_DIR); FX.uStretchOrigin.value.copy(CAM).add(tmp.set(0, -3, -6)); FX.uStretchBias.value = 0;
    tmp.copy(camera.position).add(BH_DIR).project(camera);
    stage.radial.enabled = t > T.tear + 1; stage.radial.uniforms.uCenter.value.set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5); stage.radial.uniforms.uStrength.value = 0.22 * sm(T.tear + 1.5, T.flash, t);

    // -----------------------------------------------------------------
    // HUD (les textes)
    // -----------------------------------------------------------------
    const date = new Date(BASE_DATE + (345600 - left) * 1000);
    HUD.live(t, 'PROVENCE · CAM 02', `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`);
    const urg = sm(46, 52, t);
    const beat = left < 600 ? Math.exp(-(t % 1) * 7) : 0;
    HUD.block(1, { label: 'TEMPS RESTANT', value: fmtLeft(left), sub: `DISTANCE : ${fr(Math.round(r / 1e6) * 1000)} KM`,
      color: `rgb(255,${Math.round(255 - 165 * urg)},${Math.round(255 - 175 * urg)})`, scale: 1 + 0.07 * beat * urg });
    if (t >= T.coastIn + 0.4 && t < T.sol) {
      HUD.show2(true);
      const o = Math.round(off);
      HUD.block(2, { label: 'NIVEAU DE LA MER', value: `${o >= 0 ? '+' : '−'}${fr(Math.abs(o))} m`, sub: `${fr(Math.round(1.035 * A0))} M ENTRE MARÉE HAUTE ET BASSE`, color: o > 20 ? '#ffd2a8' : '#fff' });
    } else if (t >= T.sol && t < T.tiltUp + 0.6) {
      HUD.show2(true);
      HUD.block(2, { label: 'MARÉE DE LA ROCHE', value: `${fr(Math.round(0.9 * A0))} m`, sub: 'LE SOL MONTE ET DESCEND, 2 FOIS PAR JOUR', color: t > T.quake ? '#ffb15e' : '#fff' });
    } else if (t >= T.wide - 0.4) {
      HUD.show2(true);
      const w = Math.round(W * 100);
      const c2 = w < 0 ? '#ff6b5e' : w < 40 ? '#ffb15e' : '#fff';
      const sub = w <= 3 ? 'TU TOMBES VERS LE HAUT' : `L’AIR AUSSI : COMME À ${fr(Math.round(altFor(W) / 100) * 100)} M D’ALTITUDE`;
      HUD.block(2, { label: 'TON POIDS', value: `${w < 0 ? '−' : ''}${Math.abs(w)} %`, sub, color: c2 });
    } else HUD.show2(false);
    HUD.hook(t, 'Et si la Terre tombait<br>dans un <em>trou noir</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    // viseurs : le trou noir (et la Lune) pendant le zoom
    const pxPerRad = 1920 / (C0.fov * Math.PI / 180);
    const bhPos = tmp.copy(camera.position).addScaledVector(BH_DIR, 800);
    const ringPx = Math.max(60, einsteinAt(r) * pxPerRad * 2.3);
    const tele = sm(T.zoomHeld - 0.4, T.zoomHeld + 0.4, t) * (1 - sm(T.zoomOut - 0.3, T.zoomOut, t));
    const blink = Math.floor(t * 4) % 6 === 0 && t < T.zoomHeld + 1.2 ? 0.4 : 1;
    HUD.reticle('bh', bhPos, camera, 'TROU NOIR · 7 MASSES SOLAIRES', tele * blink, Math.min(ringPx, 420));
    HUD.reticle('moon', tmp2.copy(camera.position).addScaledVector(MOON_DIR, 800), camera, 'LUNE', tele * (1 - sm(T.moonBreak - 0.5, T.moonBreak, t)), 300);
    HUD.flash(sm(T.flash - 0.15, T.flash + 0.1, t) * (1 - sm(T.flash + 0.25, T.black, t)));
    HUD.fade(sm(T.flash + 0.2, T.black + 0.8, t));
    HUD.end(t, T.endCard, { kicker: 'LE TROU NOIR CONNU LE PLUS PROCHE EST À 1 560 ANNÉES-LUMIÈRE', q: 'Et toi, tu ferais quoi<br>de tes 4 derniers jours ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  window.__dbg = { scene, camera, THREE };
  const q0 = (t) => sm(T.quake, T.quake + 0.3, t) * (1 - sm(T.quake + 3.8, T.quake + 4.6, t));
  return { stage, T, update, events };
}

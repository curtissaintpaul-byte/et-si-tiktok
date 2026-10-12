// =====================================================================
//  ÉPISODE : « Et si toute la glace de la Terre fondait ? » — Paris
//  Altitudes réelles : la Seine à Paris ≈ 26 m, pied de la tour Eiffel 33,5 m, 1er étage 57,6 m au-dessus du sol,
//  Montmartre 131 m. Toute la glace fondue : la mer monterait d'environ 65 m (National Geographic).
//  Repère : y = altitude au-dessus du niveau ACTUEL de la mer. La caméra regarde vers le nord-est.
// =====================================================================
import { THREE, dotTex, createStage, makeSky, makeSun, M, fxify, add, box, cyl, bake, noise2, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, FX, canvasTex } from '../../engine.js';
import { makeWater } from '../../lib.js';

const T = { hookOut: 3.0, rise: 13.6, zoomIn: 45.2, zoomOut: 50.8, endCard: 65.2, duration: 69.2 };
const SUBS = [
  [3.4, 8.2, 'Paris. La Seine coule à 26 m d’altitude.'],
  [8.6, 13.2, 'Toute la glace du monde, c’est 65 m de mer en plus.'],
  [13.6, 17.8, 'Et si elle fondait entièrement ?'],
  [18.4, 23.2, 'À +26 m, la mer remonte la Seine jusqu’ici.'],
  [23.6, 28.6, 'À +34 m, la tour Eiffel a les pieds dans l’eau.'],
  [29.0, 33.8, 'L’eau salée tue les arbres : des forêts fantômes.'],
  [34.2, 39.2, 'À +45 m, les rues deviennent des canaux.'],
  [39.6, 44.6, 'À +60 m, les immeubles disparaissent.'],
  [45.0, 50.4, 'À +65 m, Montmartre devient une île.'],
  [51.0, 55.8, 'Londres, Amsterdam, Venise, New York : sous l’eau.'],
  [56.0, 60.4, 'Pour que tout fonde, il faudrait plus de 5 000 ans.'],
  [60.8, 64.8, 'Aujourd’hui, la mer monte de 4,5 mm par an.'],
];
// élévation du niveau de la mer (m) selon le temps de la vidéo
const RISE = [[0, 0], [13.6, 0], [18.4, 21], [20.6, 26], [24.4, 34], [29.4, 38], [34.6, 45], [40.2, 60], [45.4, 65], [69.2, 65]];
const riseAt = (t) => { for (let i = 1; i < RISE.length; i++) if (t <= RISE[i][0]) { const [a, va] = RISE[i - 1], [b, vb] = RISE[i]; const k = sm(0, 1, (t - a) / (b - a)); return lerp(va, vb, k); } return 65; };
const SEINE = 26, TOWER_BASE = 33.5;

export default async function () {
  const stage = createStage({ fov: 55, far: 30000, bloom: [0.18, 0.4, 0.95], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 0.95;
  document.documentElement.style.setProperty('--accent', '#8fd3ff');
  const R = rng(1889);
  const CAM = new THREE.Vector3(0, 128, 0);           // en haut d'une tour du Front de Seine
  const TOWER = new THREE.Vector3(0, TOWER_BASE, -1400);
  const SC = new THREE.Vector3(330, 131, -6250);      // Montmartre / Sacré-Cœur
  const SUN_DIR = dirAzEl(128, 38);                   // le soleil vient de derrière nous (sud-ouest)

  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.025, 0.10, 0.36], dayHor: [0.40, 0.52, 0.66], stars: 0 });
  sky.u.uDay.value = 1; sky.u.uSunGlow.value = 0.3;
  scene.fog = new THREE.Fog('#b4c3d2', 2500, 16000);
  const sun = new THREE.DirectionalLight('#fff0da', 3.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -500, right: 500, top: 500, bottom: -500, near: 50, far: 3000 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#c3d8f2', '#8a8070', 0.85));

  // -------------------------------------------------------------------
  // LE RELIEF DE PARIS : la Seine, la colline de Chaillot, Montmartre au loin
  // -------------------------------------------------------------------
  const SEINE_PTS = [[400, -190], [-300, -175], [-1150, -160], [-1500, -120], [-1850, -10], [-2150, 260], [-2400, 640], [-2600, 1300], [-2700, 2000], [-2800, 3200], [-2900, 5000]];
  const seineX = (z) => { for (let i = 1; i < SEINE_PTS.length; i++) { const [z0, x0] = SEINE_PTS[i - 1], [z1, x1] = SEINE_PTS[i]; if (z <= z0 && z >= z1) return lerp(x0, x1, (z - z0) / (z1 - z0)); } return z > 0 ? -340 : 5000; };
  const distSeine = (x, z) => { let best = 1e9; for (let i = 1; i < SEINE_PTS.length; i++) { const [z0, x0] = SEINE_PTS[i - 1], [z1, x1] = SEINE_PTS[i]; const ax = x1 - x0, az = z1 - z0, L = ax * ax + az * az; const k = clamp(((x - x0) * ax + (z - z0) * az) / L); const dx = x - (x0 + ax * k), dz = z - (z0 + az * k); best = Math.min(best, Math.hypot(dx, dz)); } return best; };
  const nz = noise2(3);
  const hill = (x, z, cx, cz, r, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  function H(x, z) {
    const ds = distSeine(x, z);
    if (ds < 80) return lerp(18, 29, sm(55, 80, ds));                    // le lit de la Seine, puis les quais
    let y = 34 + 4 * sm(80, 900, ds);
    y += hill(x, z, -820, -1800, 650, 30);                                // Chaillot / Trocadéro / Passy
    y += hill(x, z, SC.x, SC.z, 520, 86) + hill(x, z, SC.x - 200, SC.z + 300, 700, 20);   // Montmartre
    y += hill(x, z, 2600, -5600, 900, 70);                                // Belleville au loin
    y += (nz(x * 0.0012, z * 0.0012, 3) - 0.5) * 10 * sm(200, 1500, ds);
    return y;
  }
  const isPark = (x, z) => (x > 70 && x < 1050 && Math.abs(z + 1400) < 130) || (Math.abs(x) < 120 && Math.abs(z + 1400) < 120) || (x < -470 && x > -950 && Math.abs(z + 1500) < 190);
  {
    const g = new THREE.PlaneGeometry(16000, 16000, 210, 210); g.rotateX(-Math.PI / 2); g.translate(0, 0, -6000);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
    const geo = g.toNonIndexed(); const pp = geo.attributes.position, col = new Float32Array(pp.count * 3), c = new THREE.Color();
    for (let i = 0; i < pp.count; i += 3) {
      const x = (pp.getX(i) + pp.getX(i + 1) + pp.getX(i + 2)) / 3, z = (pp.getZ(i) + pp.getZ(i + 1) + pp.getZ(i + 2)) / 3;
      c.set(distSeine(x, z) < 82 ? '#9c8f78' : isPark(x, z) ? '#6e8a4e' : '#a6998a');
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M('#ffffff', { vc: true, unique: true })); m.receiveShadow = true; scene.add(m);
  }

  // -------------------------------------------------------------------
  // LES IMMEUBLES HAUSSMANNIENS : des milliers de blocs (une seule "instance" pour tous)
  // -------------------------------------------------------------------
  const blds = [];
  const tryAdd = (x, z, w, d, h) => { if (distSeine(x, z) < 95 + Math.max(w, d) / 2 || isPark(x, z)) return; if (Math.hypot(x, z) < 160) return; blds.push({ x, z, w, d, h, y: H(x, z) - 1, ry: (R() - 0.5) * 0.1 }); };
  for (let z = -150; z > -7000; z -= 0) {
    const near = z > -2600, step = near ? 34 : 95;
    const half = Math.abs(z) * 0.36 + 300;
    for (let x = -half; x < half; x += step) {
      if (R() < 0.12) continue;
      if (near) { tryAdd(x + (R() - 0.5) * 4, z + (R() - 0.5) * 4, 16 + R() * 12, 14 + R() * 12, 18 + R() * 7); if (R() < 0.6) tryAdd(x + 17, z, 12 + R() * 5, 12 + R() * 8, 18 + R() * 6); }
      else tryAdd(x, z, 70 + R() * 20, 70 + R() * 20, 19 + R() * 6);
    }
    z -= near ? 30 + R() * 10 : 90;
  }
  const WALLS = ['#ddd2bc', '#d6c9b0', '#e2d8c4', '#cfc2a8', '#d9ccb2'];
  const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M('#ffffff', { unique: true }), blds.length);
  const roofMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M('#ffffff', { unique: true, r: 0.6 }), blds.length);
  const D = new THREE.Object3D(), cc = new THREE.Color();
  blds.forEach((b, i) => {
    D.position.set(b.x, b.y, b.z); D.rotation.set(0, b.ry, 0); D.scale.set(b.w, b.h, b.d); D.updateMatrix(); wallMesh.setMatrixAt(i, D.matrix); wallMesh.setColorAt(i, cc.set(WALLS[i % 5]));
    D.position.set(b.x, b.y + b.h, b.z); D.scale.set(b.w * 0.9, 3.2, b.d * 0.9); D.updateMatrix(); roofMesh.setMatrixAt(i, D.matrix); roofMesh.setColorAt(i, cc.set(i % 3 ? '#5b6570' : '#66707a'));
  });
  for (const m of [wallMesh, roofMesh]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }

  // arbres : quais, Champ-de-Mars, île aux Cygnes, Trocadéro
  const trees = [];
  for (let i = 0; i < 2200; i++) {
    const z = -100 - R() * 3300, sx = seineX(z), side = R() < 0.5 ? -1 : 1;
    if (i < 900) trees.push({ x: sx + side * (86 + R() * 6), z });
    else if (i < 1500) trees.push({ x: 80 + R() * 960, z: -1400 + (R() < 0.5 ? -1 : 1) * (95 + R() * 30) });
    else if (i < 1700) trees.push({ x: seineX(-300 - (i - 1500) * 4) + (R() - 0.5) * 8, z: -300 - (i - 1500) * 4, island: true });
    else trees.push({ x: -480 - R() * 450, z: -1330 - R() * 340 });
  }
  const treeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0).translate(0, 1, 0), M('#ffffff', { unique: true }), trees.length);
  const GREEN = new THREE.Color('#5c7a42'), DEAD = new THREE.Color('#8f877a'), tcol = new THREE.Color();
  trees.forEach((t0, i) => {
    t0.y = t0.island ? 30 : H(t0.x, t0.z); t0.s = 4 + (i % 7) * 0.5;
    // l'instant où l'eau salée arrive sous ses racines, à ~5 m au-dessus de la mer (le sel tue l'arbre)
    t0.td = 1e9; for (let tt = T.rise; tt < T.duration; tt += 0.05) if (Math.max(SEINE, riseAt(tt)) > t0.y - 5) { t0.td = tt; break; }   // le sel arrive dans le sol avant l'eau
    t0.td += R() * 1.2;
  });
  function poseTrees(t) {
    trees.forEach((t0, i) => {
      const k = sm(t0.td, t0.td + 2.2, t);
      D.position.set(t0.x, t0.y, t0.z); D.rotation.set(0.06 * k * Math.sin(i), i, 0.06 * k * Math.cos(i)); D.scale.set(t0.s * (1 - 0.3 * k), t0.s * 1.3 * (1 - 0.12 * k), t0.s * (1 - 0.3 * k)); D.updateMatrix(); treeMesh.setMatrixAt(i, D.matrix);
      treeMesh.setColorAt(i, tcol.copy(GREEN).lerp(DEAD, k));
    });
    treeMesh.instanceMatrix.needsUpdate = true; treeMesh.instanceColor.needsUpdate = true;
  }
  poseTrees(0);
  treeMesh.castShadow = true; scene.add(treeMesh);

  // -------------------------------------------------------------------
  // LES MONUMENTS
  // -------------------------------------------------------------------
  const world = new THREE.Group();
  // l'île aux Cygnes (avec la petite statue de la Liberté), le pont de Bir-Hakeim, le pont d'Iéna
  { const z0 = -300, z1 = -1120; for (let z = z0; z > z1; z -= 20) box(16, 4, 21, M('#9a8f7c'), world, seineX(z), 28, z);
    const lx = seineX(-290); cyl(1.6, 2.4, 9, 8, M('#8a8e84'), world, lx, 34.5, -290); add(new THREE.ConeGeometry(1.4, 11.5, 8), M('#6f9c8a'), world, lx, 44.7, -290); }
  for (const [z, w, metro] of [[-1150, 26, true], [-1860, 34, false]]) {
    const sx = seineX(z), ang = Math.atan2(seineX(z - 5) - seineX(z + 5), -10);
    const g = new THREE.Group(); g.position.set(sx, 0, z); g.rotation.y = ang + Math.PI / 2; world.add(g);
    box(200, 2.5, w, M('#b9ad96'), g, 0, 31, 0);
    for (let k = -2; k <= 2; k++) box(8, 12, w, M('#a89c86'), g, k * 40, 24, 0);
    if (metro) { box(200, 1.5, 8, M('#3a4a46'), g, 0, 40, 0); for (let k = -9; k <= 9; k++) cyl(0.5, 0.5, 8, 6, M('#3a4a46'), g, k * 10, 36, 0); }
  }
  // le palais de Chaillot (Trocadéro) : deux ailes courbes face à la tour
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(-860, H(-860, -1500), -1500); g.rotation.y = -Math.PI / 2 + s * 0.55; world.add(g); box(18, 22, 190, M('#e3dccb'), g, 0, 11, s * 140); }
  // les Invalides : dôme doré
  { const p = new THREE.Vector3(990, H(990, -2390), -2390);
    box(110, 24, 60, M('#d9cfba'), world, p.x, p.y + 12, p.z); cyl(18, 20, 22, 16, M('#d9cfba'), world, p.x, p.y + 35, p.z);
    add(new THREE.SphereGeometry(18, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#d9a93a', { e: '#8a6a20', ei: 0.35, r: 0.3, m: 0.85 }), world, p.x, p.y + 46, p.z);
    add(new THREE.ConeGeometry(3, 26, 8), M('#d9a93a', { e: '#8a6a20', ei: 0.35, r: 0.3, m: 0.85 }), world, p.x, p.y + 71, p.z); }
  // le Sacré-Cœur, tout en haut de Montmartre
  { const p = new THREE.Vector3(SC.x, H(SC.x, SC.z) - 2, SC.z); const w1 = M('#f2efe6');
    box(60, 30, 40, w1, world, p.x, p.y + 15, p.z); cyl(14, 15, 22, 14, w1, world, p.x, p.y + 41, p.z);
    add(new THREE.SphereGeometry(14, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), w1, world, p.x, p.y + 52, p.z); add(new THREE.ConeGeometry(4, 16, 10), w1, world, p.x, p.y + 72, p.z);
    for (const dx of [-24, 24]) { cyl(6, 6, 14, 10, w1, world, p.x + dx, p.y + 37, p.z + 8); add(new THREE.SphereGeometry(6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), w1, world, p.x + dx, p.y + 44, p.z + 8); }
    box(10, 60, 10, w1, world, p.x, p.y + 30, p.z - 30); }
  // l'École militaire au bout du Champ-de-Mars
  box(40, 26, 220, M('#d6ccb6'), world, 1080, H(1080, -1400) + 13, -1400);
  scene.add(bake(world));

  // -------------------------------------------------------------------
  // LA TOUR EIFFEL : pieds, arcs, étages, et une dentelle de fer (texture ajourée)
  // -------------------------------------------------------------------
  const lattice = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineCap = 'square';
    g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
    g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  });
  lattice.wrapS = lattice.wrapT = THREE.RepeatWrapping;
  const ironMat = fxify(new THREE.MeshStandardMaterial({ color: '#6c5646', map: lattice, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, metalness: 0.25 }), 'fx-lattice');
  const solidIron = M('#5e4a3c', { r: 0.7 });
  const tower = new THREE.Group(); tower.position.copy(TOWER); scene.add(tower);
  // un "tronc" entre deux carrés (bas et haut) : 4 faces ajourées, texture répétée tous les ~12 m
  function frustum(cxB, czB, sB, yB, cxT, czT, sT, yT, mat = ironMat) {
    const B = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(cxB + a * sB / 2, yB, czB + b * sB / 2));
    const Tt = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(cxT + a * sT / 2, yT, czT + b * sT / 2));
    const pos = [], uv = [];
    for (let f = 0; f < 4; f++) {
      const a = B[f], b = B[(f + 1) % 4], c = Tt[(f + 1) % 4], d = Tt[f];
      const wB = a.distanceTo(b) / 12, wT = d.distanceTo(c) / 12, hh = Math.max(1, Math.round((yT - yB) / 12));
      for (const [p, u, v] of [[a, 0, 0], [b, wB, 0], [c, wT, hh], [a, 0, 0], [c, wT, hh], [d, 0, hh]]) { pos.push(p.x, p.y, p.z); uv.push(u, v); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; tower.add(m); return m;
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) frustum(sx * 50, sz * 50, 26, 0, sx * 26, sz * 26, 16, 57.6);
  // les quatre grands arcs décoratifs
  for (let k = 0; k < 4; k++) { const arc = new THREE.Mesh(new THREE.TorusGeometry(34, 1.4, 6, 26, Math.PI), solidIron); arc.position.set(0, 8, 0); arc.rotation.y = k * Math.PI / 2; arc.translateZ(-44); tower.add(arc); }
  box(74, 6, 74, solidIron, tower, 0, 60.5, 0); box(78, 1.5, 78, M('#7a6252'), tower, 0, 64, 0);
  frustum(0, 0, 54, 64, 0, 0, 34, 115.7);
  box(42, 5, 42, solidIron, tower, 0, 118, 0);
  frustum(0, 0, 32, 120, 0, 0, 10, 276);
  box(14, 9, 14, solidIron, tower, 0, 280, 0); cyl(1.2, 2, 40, 6, solidIron, tower, 0, 304, 0);
  const towerLight = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3, 2.6, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  towerLight.position.set(0, 324, 0); towerLight.scale.setScalar(14); tower.add(towerLight);

  // -------------------------------------------------------------------
  // L'EAU : la Seine… puis la mer
  // -------------------------------------------------------------------
  const water = makeWater(scene, { w: 16000, d: 16000, z: -6000, seg: 200, color: '#4f6b6a', foam: '#e6eef0', opacity: 0.96 });
  water.U.uChop.value = 0.25;
  const seaCol = new THREE.Color('#2e6a86'), riverCol = new THREE.Color('#556f68');
  // bateaux-mouches sur la Seine (au début)
  const boats = [0, 1, 2].map((i) => { const g = new THREE.Group(); box(32, 2.5, 7, M('#f0ede4'), g, 0, 1.2, 0); box(24, 2.4, 6, M('#9fb6c4', { r: 0.2 }), g, 0, 3.6, 0); scene.add(g); return { g, z0: -200 - i * 650, v: i % 2 ? 4 : -3.5 }; });
  // nuages qui défilent en accéléré (le temps passe)
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, emissive: '#e6eef6', emissiveIntensity: 0.4 });
  const clouds = [];
  for (let i = 0; i < 18; i++) {
    const pos = []; for (let k = 0; k < 6; k++) { const g = new THREE.IcosahedronGeometry(120 + R() * 120, 1).toNonIndexed(); g.scale(1.8, 0.55, 1.1); g.translate((k - 2.5) * 150 + R() * 60, R() * 50, R() * 80); pos.push(...g.attributes.position.array); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, cloudMat); m.position.set(-9000 + R() * 18000, 1400 + R() * 900, -3000 - R() * 9000); m.userData.x0 = m.position.x; scene.add(m); clouds.push(m);
  }

  // goélands : quand la mer est là, les oiseaux de mer arrivent
  const gullMat = M('#f2f2ee'), gullTip = M('#3a3a3a');
  const gulls = [];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group(); scene.add(g);
    box(0.5, 0.14, 0.16, gullMat, g, 0, 0, 0);
    const wings = [-1, 1].map((sx) => { const piv = new THREE.Group(); piv.position.set(0, 0.04, 0); g.add(piv); box(0.85, 0.03, 0.22, gullMat, piv, sx * 0.44, 0, 0); box(0.18, 0.031, 0.18, gullTip, piv, sx * 0.86, 0, 0); return { piv, sx }; });
    g.scale.setScalar(5 + R() * 2.5);
    gulls.push({ g, wings, c: new THREE.Vector3((R() - 0.5) * 200, 112 + R() * 30, -70 - R() * 230), r: 25 + R() * 45, w: (0.25 + R() * 0.2) * (R() < 0.5 ? -1 : 1), ph: R() * 6, t0: 32 + R() * 6 });
  }
  function poseGulls(t) {
    for (const b of gulls) {
      const u = t - b.t0; b.g.visible = u > 0 && t < T.endCard;
      if (!b.g.visible) continue;
      const a = b.ph + u * b.w, k = sm(0, 3, u);
      b.g.position.set(b.c.x + Math.cos(a) * b.r, b.c.y + 40 * (1 - k) + Math.sin(u * 0.7 + b.ph) * 3, b.c.z + Math.sin(a) * b.r);
      b.g.rotation.set(0, -a + (b.w > 0 ? 0 : Math.PI), Math.sin(u * 0.9) * 0.25 * Math.sign(b.w));
      const flap = Math.sin(t * 7 + b.ph) * 0.5 * (Math.sin(t * 0.8 + b.ph) > -0.2 ? 1 : 0.1);
      b.wings.forEach((w) => { w.piv.rotation.z = w.sx * flap; });
    }
  }

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const LOOK = new THREE.Vector3(30, 124, -1400);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  // -------------------------------------------------------------------
  // LES AUTRES VILLES : 4 « caméras » en vignettes (dessin vectoriel simple), l'eau monte de +65 m
  // (Big Ben : cadrans à ~55 m ; campanile de Venise 99 m ; statue de la Liberté : socle 47 m, sommet 93 m)
  // -------------------------------------------------------------------
  const cityC = document.createElement('canvas'); cityC.width = 1080; cityC.height = 1920;
  cityC.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;opacity:0;';
  document.getElementById('hud').appendChild(cityC); const cg = cityC.getContext('2d');
  const CITY_T0 = 50.9, CITY_T1 = 56.0;
  function drawCity(i, x0, y0, w, h, t) {
    const u = t - CITY_T0 - i * 0.2, k = sm(0.9, 3.0, u), name = ['LONDRES', 'AMSTERDAM', 'VENISE', 'NEW YORK'][i];
    cg.save(); cg.beginPath(); cg.roundRect(x0, y0, w, h, 14); cg.clip();
    const sky = cg.createLinearGradient(0, y0, 0, y0 + h); sky.addColorStop(0, '#7fa6c9'); sky.addColorStop(1, '#c9d8e2'); cg.fillStyle = sky; cg.fillRect(x0, y0, w, h);
    const G = y0 + h * 0.95;   // le sol
    const S = h / 104;         // échelle : 1 m = S px (120 m sur la hauteur de la vignette)
    const bx = (fx) => x0 + fx * w, by = (m) => G - m * S;
    cg.fillStyle = '#8c8f86'; cg.fillRect(x0, G, w, h);
    if (i === 0) {   // Londres : le palais de Westminster + Big Ben (cadrans vers 55 m)
      cg.fillStyle = '#c7b089'; cg.fillRect(bx(0.05), by(30), w * 0.48, 30 * S);
      for (let j = 0; j < 9; j++) { cg.fillRect(bx(0.06 + j * 0.053), by(36), w * 0.012, 6 * S); }
      cg.fillRect(bx(0.62), by(70), w * 0.11, 70 * S); cg.fillStyle = '#b39a72'; cg.fillRect(bx(0.61), by(62), w * 0.13, 8 * S);
      cg.fillStyle = '#3a4048'; cg.beginPath(); cg.moveTo(bx(0.61), by(70)); cg.lineTo(bx(0.675), by(96)); cg.lineTo(bx(0.74), by(70)); cg.fill();
      cg.fillStyle = '#f2ead8'; cg.beginPath(); cg.arc(bx(0.675), by(55), 4.2 * S, 0, 7); cg.fill(); cg.strokeStyle = '#2b2a28'; cg.lineWidth = 2; cg.stroke();
      cg.beginPath(); cg.moveTo(bx(0.675), by(55)); cg.lineTo(bx(0.675), by(58)); cg.moveTo(bx(0.675), by(55)); cg.lineTo(bx(0.69), by(55)); cg.stroke();
    } else if (i === 1) {   // Amsterdam : maisons de canal à pignons + la tour de la Westerkerk (85 m)
      const cols = ['#7a3b2e', '#4a3a32', '#8a5a3a', '#2f3a40', '#6a4a3a', '#9a6a4a', '#5a3028'];
      for (let j = 0; j < 9; j++) { const xx = bx(0.02 + j * 0.075), ww = w * 0.07, hh = (16 + (j * 7) % 8) * S; cg.fillStyle = cols[j % 7]; cg.fillRect(xx, G - hh, ww, hh);
        cg.beginPath(); cg.moveTo(xx, G - hh); cg.lineTo(xx + ww / 2, G - hh - 5 * S); cg.lineTo(xx + ww, G - hh); cg.fill();
        cg.fillStyle = '#e8e2d4'; for (let r = 0; r < 3; r++) cg.fillRect(xx + ww * 0.3, G - hh + (3 + r * 4.5) * S, ww * 0.4, 2.4 * S); }
      cg.fillStyle = '#6a3a2a'; cg.fillRect(bx(0.76), by(55), w * 0.1, 55 * S); cg.fillStyle = '#3a6a5a'; cg.fillRect(bx(0.775), by(72), w * 0.07, 17 * S);
      cg.beginPath(); cg.moveTo(bx(0.77), by(72)); cg.lineTo(bx(0.81), by(85)); cg.lineTo(bx(0.85), by(72)); cg.fill();
    } else if (i === 2) {   // Venise : la basilique (coupoles) + le campanile (99 m)
      cg.fillStyle = '#e2d2b4'; cg.fillRect(bx(0.06), by(28), w * 0.5, 28 * S);
      cg.fillStyle = '#9aa5a0'; for (const fx of [0.14, 0.31, 0.48]) { cg.beginPath(); cg.arc(bx(fx), by(30), 5.5 * S, Math.PI, 0); cg.fill(); }
      cg.fillStyle = '#a5523a'; cg.fillRect(bx(0.66), by(62), w * 0.1, 62 * S); cg.fillStyle = '#efe6d2'; cg.fillRect(bx(0.655), by(74), w * 0.11, 12 * S);
      cg.fillStyle = '#4f7a62'; cg.beginPath(); cg.moveTo(bx(0.655), by(74)); cg.lineTo(bx(0.71), by(99)); cg.lineTo(bx(0.765), by(74)); cg.fill();
    } else {   // New York : Manhattan au fond, la statue de la Liberté devant (socle 47 m, torche 93 m)
      cg.fillStyle = '#7d8794'; for (let j = 0; j < 14; j++) { const hh = (40 + ((j * 37) % 70)) * S * 0.9; cg.fillRect(bx(0.02 + j * 0.07), G - hh - 6 * S, w * 0.055, hh); }
      cg.fillStyle = '#6a7380'; cg.fillRect(bx(0.36), by(110), w * 0.06, 104 * S); cg.fillRect(bx(0.38), by(118), w * 0.02, 8 * S);
      cg.fillStyle = '#9a9488'; cg.fillRect(bx(0.66), by(47), w * 0.16, 47 * S); cg.fillRect(bx(0.63), by(14), w * 0.22, 14 * S);
      cg.fillStyle = '#6fa894'; cg.beginPath(); cg.moveTo(bx(0.69), by(47)); cg.lineTo(bx(0.79), by(47)); cg.lineTo(bx(0.765), by(78)); cg.lineTo(bx(0.715), by(78)); cg.fill();
      cg.beginPath(); cg.arc(bx(0.74), by(81), 3.2 * S, 0, 7); cg.fill(); cg.fillRect(bx(0.757), by(93), w * 0.014, 15 * S);
      cg.fillStyle = '#ffcf6b'; cg.beginPath(); cg.arc(bx(0.764), by(94), 1.6 * S, 0, 7); cg.fill();
    }
    // l'eau : monte jusqu'à +65 m (sol des villes ≈ 0–5 m)
    const lvl = 62 * k, wy = by(lvl);
    const wg = cg.createLinearGradient(0, wy, 0, y0 + h); wg.addColorStop(0, 'rgba(46,106,134,0.92)'); wg.addColorStop(1, 'rgba(22,58,80,0.97)'); cg.fillStyle = wg;
    cg.beginPath(); cg.moveTo(x0, y0 + h); for (let xx = 0; xx <= w; xx += 6) cg.lineTo(x0 + xx, wy + 2.2 * Math.sin(xx * 0.06 + t * 4 + i) + 1.4 * Math.sin(xx * 0.17 - t * 3)); cg.lineTo(x0 + w, y0 + h); cg.fill();
    cg.strokeStyle = 'rgba(230,240,245,0.7)'; cg.lineWidth = 2; cg.beginPath(); for (let xx = 0; xx <= w; xx += 6) { const yy = wy + 2.2 * Math.sin(xx * 0.06 + t * 4 + i) + 1.4 * Math.sin(xx * 0.17 - t * 3); if (xx === 0) cg.moveTo(x0, yy); else cg.lineTo(x0 + xx, yy); } cg.stroke();
    cg.restore();
    cg.strokeStyle = 'rgba(255,255,255,0.85)'; cg.lineWidth = 3; cg.beginPath(); cg.roundRect(x0, y0, w, h, 14); cg.stroke();
    cg.fillStyle = 'rgba(0,0,0,0.45)'; cg.fillRect(x0 + 10, y0 + 10, 180, 30); cg.fillStyle = '#ff3b30'; cg.beginPath(); cg.arc(x0 + 26, y0 + 25, 6, 0, 7); cg.fill();
    cg.fillStyle = '#fff'; cg.font = "600 19px Inter"; cg.fillText(name, x0 + 40, y0 + 32);
    cg.font = "500 40px Garamond"; cg.fillStyle = '#9fdcff'; cg.fillText(`+${Math.round(65 * k)} m`, x0 + w - 120, y0 + h - 18);
  }
  function drawCities(t) {
    const on = t > CITY_T0 - 0.2 && t < CITY_T1 + 0.3;
    cityC.style.opacity = on ? sm(CITY_T0 - 0.2, CITY_T0 + 0.2, t) * (1 - sm(CITY_T1 - 0.1, CITY_T1 + 0.3, t)) : 0;
    if (!on) return;
    cg.clearRect(0, 0, 1080, 1920);
    const w = 470, h = 300;
    [[45, 520], [565, 520], [45, 840], [565, 840]].forEach(([x, y], i) => drawCity(i, x, y, w, h, t));
  }
  function update(t) {
    const rise = riseAt(t), level = Math.max(SEINE, rise);
    // --- caméra (zoom sur Montmartre à la fin)
    const zk = sm(T.zoomIn, T.zoomIn + 1.6, t) * (1 - sm(T.zoomOut, T.zoomOut + 1.4, t));
    camera.position.copy(CAM).add(tmp.set(Math.sin(t * 0.21) * 1.5, Math.sin(t * 0.17) * 0.6, 0));
    const look = tmp2.copy(LOOK).lerp(new THREE.Vector3(SC.x, 150, SC.z), zk);
    camera.fov = Math.exp(lerp(Math.log(55), Math.log(9), zk)); camera.updateProjectionMatrix();
    camera.lookAt(look); camera.updateMatrixWorld();
    sky.follow(camera);
    sun.position.copy(SUN_DIR).multiplyScalar(1600).add(tmp.set(0, 0, -900)); sun.target.position.set(0, 0, -900);
    // --- l'eau
    water.U.uLevel.value = level; water.U.uTime.value = t;
    water.U.uChop.value = lerp(0.25, 1.1, sm(SEINE, 40, rise));
    water.mat.color.lerpColors(riverCol, seaCol, sm(SEINE - 2, SEINE + 10, rise));
    FX.uWet.value = level + 0.6;
    boats.forEach((b) => { const z = b.z0 + b.v * t; b.g.position.set(seineX(z), level + 0.3, z); b.g.rotation.y = Math.atan2(seineX(z - 5) - seineX(z + 5), -10) + Math.PI / 2; b.g.visible = rise < SEINE + 4; });
    clouds.forEach((c, i) => { c.position.x = c.userData.x0 + (t < T.rise ? t * 3 : T.rise * 3 + (t - T.rise) * 900 * sm(T.rise, T.rise + 3, t) * (1 - 0.8 * sm(46.2, 50.2, t))); if (c.position.x > 9000) c.position.x -= 18000; });
    towerLight.material.opacity = 0;
    poseTrees(t); poseGulls(t);
    // --- HUD
    HUD.live(t, 'PARIS · FRONT DE SEINE · CAM 02', t < T.rise ? `14/03/2026 · ${pad(15)}:${pad(2 + Math.floor(t / 60))}:${pad(Math.floor(t) % 60)}` : 'ACCÉLÉRÉ · PLUSIEURS MILLÉNAIRES');
    const rr = Math.round(rise);
    HUD.block(1, { label: 'NIVEAU DE LA MER', value: `+${rr} m`, sub: rr < 1 ? 'AUJOURD’HUI' : 'PAR RAPPORT À AUJOURD’HUI', color: rise > 0.5 ? '#9fdcff' : '#fff' });
    HUD.show2(true);
    const depth = level - TOWER_BASE;
    HUD.block(2, { label: 'AU PIED DE LA TOUR EIFFEL', value: depth <= 0 ? 'à sec' : `${Math.round(depth)} m d’eau`, sub: `LA SEINE : ${SEINE} M · LE PIED DE LA TOUR : 33,5 M`, color: depth > 0 ? '#9fdcff' : '#fff' });
    HUD.hook(t, 'Et si toute la glace<br>de la Terre <em>fondait</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    drawCities(t);
    HUD.reticle('tour', tmp.set(TOWER.x, TOWER.y + 170, TOWER.z), camera, 'TOUR EIFFEL · 330 M', sm(4, 4.6, t) * (1 - sm(7.6, 8.2, t)), 120);
    HUD.reticle('mm', tmp.set(SC.x, 170, SC.z), camera, 'MONTMARTRE · 131 M', sm(T.zoomIn + 1.2, T.zoomIn + 1.8, t) * (1 - sm(T.zoomOut - 0.4, T.zoomOut, t)), zk > 0.5 ? 520 : 90);
    HUD.reticle('mm0', tmp.set(SC.x, 170, SC.z), camera, 'MONTMARTRE', sm(8.8, 9.4, t) * (1 - sm(12.6, 13.2, t)), 70);
    HUD.end(t, T.endCard, { kicker: 'TOUTE LA GLACE DU MONDE = +65 M DE MER', q: 'Et toi, tu habites à combien<br>de mètres d’altitude ?', cta: 'DIS-LE EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

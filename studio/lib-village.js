// =====================================================================
//  LE VILLAGE FRANÇAIS (réutilisable) : une place avec l'église, le café, la boulangerie,
//  la fontaine, des platanes, des voitures, des réverbères. Repris de l'épisode « Soleil ».
//  buildVillage(scene, { R }) → poignées pour animer (réverbères, fenêtres, fontaine…)
//  Repère : la place est centrée en (0, 0, 0), l'église au fond (z = −22), on filme depuis z ≈ +24.
// =====================================================================
import { THREE, M, add, box, cyl, prism, bake, canvasTex, signTex } from './engine.js';

export function buildVillage(scene, { R, groundColor = '#7d8f5f', hillColors = ['#7f9a72', '#748f69', '#86a079'], fgTable = true } = {}) {
  const world = new THREE.Group();
  const pavingTex = canvasTex(512, 512, (g, w, h) => {
    const n = 12, s = w / n; g.fillStyle = '#a89878'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < n; j++) for (let i = -1; i < n; i++) {
      const off = (j % 2) * s / 2, v = 196 + R() * 34 | 0;
      g.fillStyle = `rgb(${v + 12},${v},${v - 30})`; g.beginPath(); g.roundRect(i * s + off + 3, j * s + 3, s - 6, s - 6, 9); g.fill();
    }
  }, 14);
  const awningTex = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#f3ead8' : '#a8322b'; g.fillRect(i * w / 16, 0, w / 16, h); } });
  const clockTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#efe8d8'; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#2b2a28'; g.lineWidth = 10; g.stroke(); g.fillStyle = '#2b2a28';
    for (let i = 0; i < 12; i++) { g.save(); g.translate(128, 128); g.rotate(i * Math.PI / 6); g.fillRect(-4, -112, 8, i % 3 ? 16 : 26); g.restore(); }
  });

  // sol : pavés sur la place, herbe au-delà
  add(new THREE.PlaneGeometry(140, 140), M('#ffffff', { map: pavingTex, flat: false, r: 0.95 }), world, 0, 0, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(1600, 1600), M(groundColor), world, 0, -0.05, 0, -Math.PI / 2);

  const WALLS = ['#e9d9b9', '#e6cda3', '#dcc6a0', '#efe3cb', '#d9b98c', '#e8c9a6', '#e3d2b4'];
  const SHUTTERS = ['#5d8096', '#7a9a6e', '#9c4a3e', '#53708e', '#8aa0a8', '#6f8f62'];
  const ROOFS = ['#b4644a', '#a9583f', '#bf7254', '#9e5a44'];
  const winDark = M('#2e3640', { r: 0.35 });
  const winLit = [0, 1, 2].map(() => M('#3a3630', { r: 0.4, e: '#ffb468', ei: 0, unique: true }));   // fenêtres allumées (3 groupes)
  const stoneLight = M('#efe6d4'), woodDark = M('#4a3428');

  function house(p, { x, z, w, d, h, face, wall, shutter, roof, shop, signText, signBg, signFg }) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.rotation.y = face === 'px' ? Math.PI / 2 : face === 'nx' ? -Math.PI / 2 : 0; p.add(g);
    box(w, h, d, M(wall), g, 0, h / 2, -d / 2);
    prism(d + 0.8, 2.4 + R() * 0.8, w + 0.4, M(roof), g, 0, h, -d / 2);
    if (R() > 0.4) box(0.6, 1.6, 0.6, M(wall), g, (R() - 0.5) * w * 0.6, h + 1.2, -d / 2 - 0.6);
    box(w + 0.3, 0.25, 0.3, stoneLight, g, 0, h - 0.1, 0.05);
    const cols = Math.max(2, Math.floor(w / 2.3)), startY = shop ? 4.3 : 1.6;
    for (let y = startY; y < h - 1.4; y += 3.0) for (let c = 0; c < cols; c++) {
      const cx = -w / 2 + (c + 0.5) * (w / cols);
      box(0.9, 1.45, 0.12, R() < 0.5 ? winLit[(R() * 3) | 0] : winDark, g, cx, y, 0.03);
      box(0.46, 1.5, 0.08, M(shutter), g, cx - 0.7, y, 0.08); box(0.46, 1.5, 0.08, M(shutter), g, cx + 0.7, y, 0.08);
      box(1.1, 0.1, 0.28, stoneLight, g, cx, y - 0.78, 0.1);
    }
    if (shop) {
      box(w * 0.82, 2.9, 0.16, M(shop), g, 0, 1.45, 0.06);
      box(w * 0.5, 2.0, 0.1, winLit[0], g, -w * 0.12, 1.3, 0.16);
      box(1.0, 2.3, 0.1, woodDark, g, w * 0.3, 1.15, 0.16);
      if (signText) add(new THREE.PlaneGeometry(w * 0.7, w * 0.7 * 160 / 1024), M('#ffffff', { map: signTex(signText, signBg, signFg), r: 0.8, flat: false }), g, 0, 3.2, 0.16);
    } else box(1.1, 2.3, 0.12, woodDark, g, -w / 2 + 1.3, 1.15, 0.05);
    return g;
  }
  function row(face, xFacade, zFrom, zTo) {
    let z = zFrom;
    while (z < zTo) {
      const w = 6 + R() * 3.2;
      house(world, { x: xFacade, z: z + w / 2, w, d: 9, h: 7.5 + R() * 4, face, wall: WALLS[(R() * WALLS.length) | 0], shutter: SHUTTERS[(R() * SHUTTERS.length) | 0], roof: ROOFS[(R() * ROOFS.length) | 0] });
      z += w;
    }
  }
  house(world, { x: -9, z: -9.5, w: 8, d: 9, h: 10.5, face: 'px', wall: '#e8d4ae', shutter: '#3f6b54', roof: '#a9583f', shop: '#2f5544', signText: 'CAFÉ DE LA PLACE', signBg: '#26453a', signFg: '#f3e6c4' });
  house(world, { x: 9, z: -10, w: 7.5, d: 9, h: 9.5, face: 'nx', wall: '#efe3cb', shutter: '#53708e', roof: '#b4644a', shop: '#34557a', signText: 'BOULANGERIE', signBg: '#2c4a6e', signFg: '#f6efe0' });
  row('px', -9, -21, -13.5); row('px', -9, -5.5, 30);
  row('nx', 9, -21, -14.25); row('nx', 9, -6.25, 30);
  for (const sx of [-1, 1]) { let x = 7.6; while (x < 24) { const w = 6 + R() * 2.5; house(world, { x: sx * (x + w / 2), z: -22.5, w, d: 9, h: 8 + R() * 3, face: 'pz', wall: WALLS[(R() * 7) | 0], shutter: SHUTTERS[(R() * 6) | 0], roof: ROOFS[(R() * 4) | 0] }); x += w; } }
  // store rayé du café + terrasse
  { const g = new THREE.Group(); g.position.set(-9, 0, -9.5); g.rotation.y = Math.PI / 2; world.add(g); add(new THREE.BoxGeometry(7.2, 0.08, 2.4), M('#ffffff', { map: awningTex, r: 0.85, flat: false }), g, 0, 3.05, 1.15, 0.28, 0, 0); }
  function bistroTable(p, x, z) { cyl(0.42, 0.42, 0.04, 14, M('#d8d4cc', { r: 0.4 }), p, x, 0.75, z); cyl(0.04, 0.04, 0.72, 6, M('#2a2a2a'), p, x, 0.38, z); cyl(0.24, 0.24, 0.03, 10, M('#2a2a2a'), p, x, 0.02, z); }
  function chair(p, x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); const rat = M('#b08a5a');
    box(0.42, 0.05, 0.42, rat, g, 0, 0.45, 0); box(0.42, 0.48, 0.05, rat, g, 0, 0.7, -0.2);
    for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.04, 0.45, 0.04, M('#2a2a2a'), g, a, 0.22, b);
  }
  for (const z of [-12.3, -9.6, -6.9]) { bistroTable(world, -7.4, z); chair(world, -7.95, z, Math.PI / 2); chair(world, -6.85, z, -Math.PI / 2); }
  const FG = { x: -2.2, z: 14.2 };   // la table au premier plan
  if (fgTable) { bistroTable(world, FG.x, FG.z); chair(world, FG.x - 0.62, FG.z, Math.PI / 2); chair(world, FG.x + 0.62, FG.z, -Math.PI / 2);
  cyl(0.05, 0.04, 0.08, 10, M('#f6f4ef', { r: 0.3 }), world, FG.x - 0.15, 0.81, FG.z + 0.05); cyl(0.08, 0.08, 0.012, 12, M('#f6f4ef', { r: 0.3 }), world, FG.x - 0.15, 0.775, FG.z + 0.05);
  cyl(0.05, 0.04, 0.08, 10, M('#f6f4ef', { r: 0.3 }), world, FG.x + 0.16, 0.81, FG.z - 0.08); cyl(0.08, 0.08, 0.012, 12, M('#f6f4ef', { r: 0.3 }), world, FG.x + 0.16, 0.775, FG.z - 0.08); }
  // l'église
  {
    const g = new THREE.Group(); g.position.set(0, 0, -22); world.add(g);
    const stone = M('#d9c8a6'), stone2 = M('#cfbc98'), slate = M('#59616c', { r: 0.7 }), dark = M('#262321');
    box(11, 12, 24, stone, g, 0, 6, -12); prism(11.6, 4.8, 24.6, slate, g, 0, 12, -12);
    { const s = new THREE.Shape(); s.moveTo(-5.5, 0); s.lineTo(5.5, 0); s.lineTo(0, 4.6); s.closePath(); add(new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false }), stone, g, 0, 12, -0.8); }
    for (const sx of [-1, 1]) box(0.9, 10, 1.3, stone2, g, sx * 5.9, 5, 0.2);
    box(5.2, 23, 5.2, stone2, g, 0, 11.5, 1.6);
    for (const y of [11.6, 23]) box(5.7, 0.45, 5.7, stoneLight, g, 0, y, 1.6);
    box(2.2, 3.0, 0.2, dark, g, 0, 1.5, 4.25); add(new THREE.CircleGeometry(1.1, 14, 0, Math.PI), dark, g, 0, 3.0, 4.25);
    for (const [x, z, ry] of [[0, 4.25, 0], [2.65, 1.6, Math.PI / 2], [-2.65, 1.6, -Math.PI / 2]]) { const o = new THREE.Group(); o.position.set(x, 0, z); o.rotation.y = ry; g.add(o); box(1.5, 2.4, 0.1, dark, o, 0, 19.8, 0); add(new THREE.CircleGeometry(0.75, 12, 0, Math.PI), dark, o, 0, 21.0, 0.01); }
    add(new THREE.ConeGeometry(3.75, 11, 4), slate, g, 0, 23.2 + 5.5, 1.6, 0, Math.PI / 4, 0);
    box(0.12, 1.6, 0.12, M('#3a3a3a'), g, 0, 34.9, 1.6); box(0.8, 0.12, 0.12, M('#3a3a3a'), g, 0, 35.2, 1.6);
    add(new THREE.CircleGeometry(0.95, 32), M('#ffffff', { map: clockTex, r: 0.6, flat: false }), g, 0, 16.4, 4.23);
  }
  // la fontaine
  const FOUNTAIN = new THREE.Vector3(0, 0, 0);
  const waterMat = new THREE.MeshStandardMaterial({ color: '#5f93a8', roughness: 0.15, metalness: 0.1, emissive: '#1d3a48', emissiveIntensity: 0.4 });
  { const g = new THREE.Group(); g.position.copy(FOUNTAIN); world.add(g); const st = M('#d8caab', { side: THREE.DoubleSide });
    add(new THREE.LatheGeometry([new THREE.Vector2(2.2, 0.5), new THREE.Vector2(2.2, 0.72), new THREE.Vector2(2.55, 0.74), new THREE.Vector2(2.65, 0.0)], 28), st, g);
    cyl(0.28, 0.36, 1.9, 10, M('#d2c3a3'), g, 0, 1.05, 0);
    add(new THREE.LatheGeometry([new THREE.Vector2(0.1, 1.85), new THREE.Vector2(0.9, 2.08), new THREE.Vector2(1.0, 2.2), new THREE.Vector2(0.95, 2.22)], 20), st, g);
    cyl(0.08, 0.12, 0.5, 8, M('#d2c3a3'), g, 0, 2.4, 0); add(new THREE.IcosahedronGeometry(0.16, 0), M('#d2c3a3'), g, 0, 2.72, 0); }
  add(new THREE.CircleGeometry(2.2, 28), waterMat, scene, 0, 0.6, 0, -Math.PI / 2);
  add(new THREE.CircleGeometry(0.88, 20), waterMat, scene, 0, 2.12, 0, -Math.PI / 2);
  // les platanes
  function planeTree(p, x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
    cyl(0.24, 0.38, 5.2, 7, M('#b6a98d', { nc: true }), g, 0, 2.6, 0); const br = M('#a89b80', { nc: true });
    add(new THREE.CylinderGeometry(0.1, 0.18, 2.6, 6), br, g, -0.6, 5.6, 0.2, 0, 0, 0.5); add(new THREE.CylinderGeometry(0.1, 0.18, 2.6, 6), br, g, 0.6, 5.7, -0.2, 0, 0, -0.5);
    const greens = ['#5f8340', '#6d9049', '#557a3a', '#7a9a52'];
    for (const [bx, by, bz, r] of [[0, 7.6, 0, 2.5], [-1.9, 7.0, 0.6, 1.9], [1.9, 7.2, -0.4, 2.0], [0.4, 8.9, -0.6, 1.9], [-1.0, 8.4, -1.2, 1.7], [1.1, 6.4, 1.3, 1.6], [-0.8, 6.3, -1.5, 1.5]]) { const m = add(new THREE.IcosahedronGeometry(r, 1), M(greens[(R() * 4) | 0], { nc: true }), g, bx, by, bz); m.scale.set(1, 0.82, 1); }
  }
  planeTree(world, -4.6, 5.5, 1.0); planeTree(world, 5.4, -15.5, 0.85); planeTree(world, -5.6, -16.5, 0.8);
  // les voitures
  function car(p, x, z, ry, color) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    const body = M(color, { r: 0.45, nc: true }), glass = M('#2a323a', { r: 0.2, nc: true }), tyre = M('#1d1d1d', { nc: true }), chrome = M('#c9c9c9', { r: 0.3, nc: true });
    box(1.7, 0.62, 3.8, body, g, 0, 0.58, 0); box(1.46, 0.56, 2.0, glass, g, 0, 1.15, -0.2); box(1.52, 0.09, 1.95, body, g, 0, 1.46, -0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12), tyre, g, sx * 0.8, 0.32, sz * 1.25, 0, 0, Math.PI / 2);
    for (const sx of [-1, 1]) box(0.3, 0.14, 0.06, chrome, g, sx * 0.55, 0.68, 1.92);
  }
  car(world, 6.6, 3.0, 0, '#c8553d'); car(world, 6.6, -3.2, 0, '#8fb3c9'); car(world, -6.7, 1.0, Math.PI, '#efe3c2'); car(world, 6.6, 9.2, 0, '#3f6b54');
  function bench(p, x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); const w = M('#6b4a32'); box(1.8, 0.07, 0.45, w, g, 0, 0.46, 0); box(1.8, 0.4, 0.06, w, g, 0, 0.75, -0.22); for (const sx of [-0.8, 0.8]) box(0.08, 0.46, 0.4, M('#2a2a2a'), g, sx, 0.23, 0); }
  bench(world, 3.6, -13.2, 0); bench(world, -3.6, -4.2, Math.PI / 2);
  // collines au loin
  for (let i = 0; i < 9; i++) { const m = add(new THREE.IcosahedronGeometry(1, 1), M(hillColors[i % 3]), world, -260 + i * 65 + R() * 20, -8, -230 - R() * 80); m.scale.set(70 + R() * 40, 26 + R() * 18, 40); }
  scene.add(bake(world));

  // réverbères : chacun a sa propre ampoule (pour clignoter, s'éteindre…)
  const lamps = [];
  function lamp(x, z, i) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const metal = M('#25292d', { r: 0.6 });
    add(new THREE.CylinderGeometry(0.18, 0.24, 0.5, 8), metal, g, 0, 0.25, 0); add(new THREE.CylinderGeometry(0.06, 0.1, 3.6, 8), metal, g, 0, 2.0, 0);
    const glass = M('#2a2620', { e: '#ffc27a', ei: 0, r: 0.3, unique: true });
    add(new THREE.BoxGeometry(0.36, 0.55, 0.36), glass, g, 0, 4.1, 0); add(new THREE.ConeGeometry(0.34, 0.32, 4), metal, g, 0, 4.55, 0, 0, Math.PI / 4, 0);
    const light = new THREE.PointLight('#ffbf78', 0, 22, 1.6); light.position.set(0, 4.0, 0); g.add(light);
    lamps.push({ glass, light, i, x, z });
  }
  [[3.7, 12.6], [-6.4, -2.0], [6.4, -6.8], [-6.4, -15.0], [6.4, -17.5], [-2.6, -19.2]].forEach(([x, z], i) => lamp(x, z, i));
  return { lamps, winLit, waterMat, FOUNTAIN, FG, CHURCH: new THREE.Vector3(0, 0, -22) };
}

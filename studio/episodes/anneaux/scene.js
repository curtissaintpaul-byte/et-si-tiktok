// =====================================================================
//  ÉPISODE : « Et si la Terre avait des anneaux comme Saturne ? » — Carcassonne, une nuit de juillet
//  Hypothèse : des anneaux bâtis comme ceux de Saturne, à l'échelle de la Terre (rayons en rayons planétaires) :
//   anneau C 1,24–1,53 · anneau B 1,53–1,95 (le plus brillant) · division de Cassini 1,95–2,03 · anneau A 2,03–2,27
//   → de 1 500 à 8 100 km d'altitude, dans le plan de l'équateur (comme tous les anneaux).
//  Géométrie calculée exactement depuis Carcassonne (43,2° N) : bord externe à ~23° au-dessus de l'horizon sud ;
//  invisibles au-delà de ~64° N ; vus par la tranche (un trait au zénith) depuis l'équateur.
//  L'ombre de la Terre sur les anneaux est calculée (cylindre d'ombre). Soleil : 15 juillet (déclinaison +21,5°).
//  Fin : Tomkins et al., Earth and Planetary Science Letters, 2024 — un anneau il y a ~466 millions d'années (hypothèse).
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, add, box, cyl, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, bake, terrain, noise2, keys, canvasTex } from '../../engine.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, lapse0: 14.6, lapse1: 24.0, night: 24.0, shadow: 29.0, equator: 34.0, pole: 40.0, past: 48.0, endCard: 64.0, duration: 68.2 };
const SUBS = [
  [3.3, 7.0, 'Des anneaux comme ceux de Saturne, au-dessus de l’équateur.'],
  [7.2, 11.0, 'De la glace et de la roche, de 1 500 à 8 000 km d’altitude.'],
  [11.2, 14.6, 'Depuis Carcassonne : une arche immense au-dessus des Pyrénées.'],
  [15.0, 19.0, 'Au coucher du soleil, elles restent éclairées…'],
  [19.2, 23.8, '…longtemps après la tombée de la nuit.'],
  [24.2, 28.8, 'La nuit, elles éclaireraient bien plus que la pleine Lune.'],
  [29.0, 33.8, 'Au milieu, une bande noire : l’ombre de la Terre.'],
  [34.0, 39.8, 'À l’équateur, on les verrait par la tranche : un trait fin au zénith.'],
  [40.0, 47.8, 'Et plus au nord que la Laponie, elles resteraient sous l’horizon.'],
  [48.2, 53.8, 'Ça s’est peut-être produit : il y a 466 millions d’années.'],
  [54.0, 59.8, 'Un astéroïde brisé aurait entouré la Terre d’un anneau.'],
  [60.0, 63.8, 'Son ombre aurait même pu refroidir le climat.'],
];
const PHI = 43.21 * Math.PI / 180, DEC = 21.5 * Math.PI / 180, RE = 6371;   // km
// angle horaire du Soleil (h → rad) : midi solaire ≈ 13 h 57 (heure d'été) à Carcassonne en juillet
const Hof = (clockH) => (clockH - 13.95) * 15 * Math.PI / 180;
const CLOCK = [[0, 17.0], [T.lapse0, 17.1], [T.lapse1, 22.6], [T.endCard, 26.3], [T.duration, 26.4]];   // heure affichée (26 h = 2 h du matin)
function sunDir(H) {
  const el = Math.asin(Math.sin(PHI) * Math.sin(DEC) + Math.cos(PHI) * Math.cos(DEC) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(PHI) - Math.tan(DEC) * Math.cos(PHI));
  return dirAzEl(az * 180 / Math.PI, el * 180 / Math.PI);
}

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 70, far: 200000, bloom: [0.35, 0.5, 0.85], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffe0a8');
  const R = rng(466), N2 = noise2(1209);

  // repère local : −z = sud, +x = ouest, +y = haut ; l'axe de la Terre pointe vers le nord, à φ au-dessus de l'horizon
  const AXIS = new THREE.Vector3(0, Math.sin(PHI), Math.cos(PHI));
  const U1 = new THREE.Vector3(0, Math.cos(PHI), -Math.sin(PHI)), U2 = new THREE.Vector3(-1, 0, 0);
  const CENTER = new THREE.Vector3(0, -RE, 0);   // le centre de la Terre (en km)

  const sky = makeSky(scene, { sunDir: sunDir(Hof(17)), dayZen: [0.035, 0.13, 0.42], dayHor: [0.40, 0.50, 0.62], stars: 0, milky: 1.0, milkyAxis: new THREE.Vector3(0.62, 0.48, 0.62) });
  sky.mesh.renderOrder = -3;
  const sunSprite = makeSun(scene, sunDir(Hof(17)), 60);
  scene.fog = new THREE.Fog('#c9d3dc', 3000, 90000);
  const sun = new THREE.DirectionalLight('#fff0d8', 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 600 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.06;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c4d8ff', '#8a7a60', 0.9); scene.add(hemi);
  const ringLight = new THREE.DirectionalLight('#e9e2d2', 0); ringLight.position.set(0, 300, -1000); scene.add(ringLight);   // la lumière des anneaux, la nuit (venue du sud)

  // -------------------------------------------------------------------
  // LES ANNEAUX : un vrai anneau 3D, à l'échelle (km), centré sur la Terre ; ombre de la Terre et extinction près de l'horizon
  // -------------------------------------------------------------------
  const ringU = { uSun: { value: new THREE.Vector3() }, uCenter: { value: CENTER.clone() },   // (une copie : sinon le centre « dérive » d'image en image)
    uAxis: { value: AXIS }, uDay: { value: 1 }, uTime: { value: 0 } };
  const ringGeo = new THREE.RingGeometry(1.24 * RE, 2.27 * RE, 720, 24);   // dans le plan (x, y) local → on l'oriente
  const ringMat = new THREE.ShaderMaterial({
    uniforms: ringU, transparent: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false, blending: THREE.NormalBlending,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun, uCenter, uAxis; uniform float uDay; varying vec3 vW;
      float h(float x){ return fract(sin(x * 127.1) * 43758.5453); }
      void main(){
        vec3 pc = vW - uCenter; float r = length(pc) / ${RE.toFixed(1)};
        // profil radial (copié de Saturne) : C pâle, B brillant, division de Cassini, A, division d'Encke
        float op = 0.0, br = 0.0;
        if (r < 1.53) { op = 0.18 + 0.1 * smoothstep(1.24, 1.53, r); br = 0.35; }
        else if (r < 1.95) { op = 0.92; br = 1.0; }
        else if (r < 2.03) { op = 0.06; br = 0.4; }
        else { op = 0.7; br = 0.82; if (abs(r - 2.21) < 0.006) op = 0.08; }
        op *= smoothstep(1.24, 1.26, r) * (1.0 - smoothstep(2.26, 2.27, r));
        float rings = 0.82 + 0.18 * sin(r * 900.0) * sin(r * 233.0 + 1.0) + 0.1 * (h(floor(r * 400.0)) - 0.5);
        br *= rings;
        // ombre de la Terre (cylindre) ; face éclairée (nord en juillet)
        float along = dot(pc, uSun); float perp = length(pc - along * uSun);
        float lit = (along < 0.0 && perp < ${RE.toFixed(1)}) ? 0.0 : 1.0;
        lit *= (dot(uSun, uAxis) > 0.0) ? 1.0 : 0.15;
        // extinction près de l'horizon (vu depuis la caméra, quasi à l'origine)
        vec3 d = normalize(vW - cameraPosition); float el = d.y;
        float ext = smoothstep(-0.01, 0.12, el);
        vec3 tint = mix(vec3(1.0, 0.55, 0.32), vec3(0.98, 0.93, 0.84), smoothstep(0.0, 0.2, el));
        vec3 col = tint * br * lit * mix(0.55, 1.6, uDay) * ext;
        float a = clamp(op * mix(1.0, 0.55, uDay) * smoothstep(-0.02, 0.04, el), 0.0, 1.0);
        gl_FragColor = vec4(col * a, a);
        #include <colorspace_fragment>
      }`,
  });
  ringMat.blending = THREE.CustomBlending; ringMat.blendSrc = THREE.OneFactor; ringMat.blendDst = THREE.OneMinusSrcAlphaFactor;
  const ring = new THREE.Mesh(ringGeo, ringMat);
  { const m = new THREE.Matrix4().makeBasis(U1, U2, AXIS.clone()); ring.quaternion.setFromRotationMatrix(m); ring.position.copy(CENTER); }
  ring.renderOrder = -2; ring.frustumCulled = false; scene.add(ring);

  // -------------------------------------------------------------------
  // LE PAYSAGE : collines, vignes, la Cité sur sa butte, les Pyrénées au loin
  // -------------------------------------------------------------------
  const CITE = new THREE.Vector3(-40, 0, -760);
  function H(x, z) {
    let y = 18 * N2(x * 0.0012, z * 0.0012) + 8 * N2(x * 0.004, z * 0.004);
    y += 55 * Math.exp(-(((x - CITE.x) / 420) ** 2) - (((z - CITE.z) / 300) ** 2));   // la butte de la Cité
    y += 40 * sm(30, -120, z) * Math.exp(-((x / 300) ** 2)) * 0;                       // (réservé)
    y += 30 * Math.exp(-((x / 160) ** 2) - (((z - 40) / 140) ** 2));                 // notre colline (la caméra)
    return y;
  }
  const groundGeo = terrain(14000, 14000, 220, (x, z) => H(x, z - 5000), (x, z, y) => { const n = 0.05 * N2(x * 0.01, z * 0.01 - 30); return new THREE.Color(0.42 + n, 0.47 + n, 0.25 + n * 0.5); });
  const ground = new THREE.Mesh(groundGeo, M('#ffffff', { vc: true })); ground.position.z = -5000; ground.receiveShadow = true; scene.add(ground);
  // vignes au premier plan (rangs)
  const vineM = M('#4f6b2c'), stakeM = M('#7a6448');
  const world = new THREE.Group();
  for (let row = 0; row < 16; row++) { const x = -40 + row * 3.2; for (let z = -10; z > -260; z -= 2.4) { const y = H(x, z); const m = add(new THREE.IcosahedronGeometry(0.75, 0), vineM, world, x + (R() - 0.5) * 0.2, y + 0.75, z); m.scale.set(0.8, 0.9, 1.2); } }
  // un muret et un banc, au belvédère
  box(14, 0.8, 0.5, M('#b9a07a'), world, 2, H(2, 4) + 0.4, 4);
  // LA CITÉ : deux enceintes ovales, des tours rondes à toits d'ardoise pointus, le château, la basilique
  const stone = M('#cdb488'), stone2 = M('#c3a97c'), slate = M('#4d545e', { r: 0.6 });
  const cy = H(CITE.x, CITE.z);
  function enceinte(a, b, hWall, nT, rT, hT, roofs) {
    const pts = []; for (let i = 0; i < nT; i++) { const th = (i / nT) * Math.PI * 2; pts.push(new THREE.Vector3(CITE.x + a * Math.cos(th), 0, CITE.z + b * Math.sin(th))); }
    for (let i = 0; i < nT; i++) { const p = pts[i], q = pts[(i + 1) % nT]; const mid = p.clone().lerp(q, 0.5), len = p.distanceTo(q);
      const y0 = Math.min(H(p.x, p.z), H(q.x, q.z)); const w = box(len, hWall, 3, stone, world, mid.x, y0 + hWall / 2 - 2, mid.z); w.rotation.y = -Math.atan2(q.z - p.z, q.x - p.x);
      for (let k = 0; k < len / 2.2; k++) { const c = p.clone().lerp(q, (k + 0.5) / (len / 2.2)); box(1.1, 1.2, 3.2, stone2, world, c.x, y0 + hWall - 1.4, c.z).rotation.y = w.rotation.y; } }
    for (const p of pts) { const y0 = H(p.x, p.z); cyl(rT, rT * 1.08, hT, 12, stone, world, p.x, y0 + hT / 2 - 2, p.z); if (roofs) add(new THREE.ConeGeometry(rT * 1.15, rT * 2.6, 12), slate, world, p.x, y0 + hT - 2 + rT * 1.3, p.z); }
  }
  enceinte(250, 140, 9, 18, 4.2, 15, false);
  enceinte(205, 108, 13, 24, 5.0, 22, true);
  // le château comtal (côté ouest = +x) et la basilique (au sud)
  { const x = CITE.x + 120, z = CITE.z - 10, y = H(x, z); box(55, 24, 40, stone, world, x, y + 10, z); for (const [dx, dz] of [[-27, -20], [27, -20], [-27, 20], [27, 20]]) { cyl(5.5, 6, 32, 12, stone, world, x + dx, y + 14, z + dz); add(new THREE.ConeGeometry(6.3, 15, 12), slate, world, x + dx, y + 37.5, z + dz); } }
  { const x = CITE.x - 80, z = CITE.z - 50, y = H(x, z); box(22, 26, 70, stone2, world, x, y + 11, z); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 15, 10, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 3.3), slate); r.position.set(x, y + 29, z); world.add(r); }
  // quelques maisons de la ville basse
  for (let i = 0; i < 120; i++) { const x = -1400 + R() * 2800, z = -1100 - R() * 900; if (Math.hypot((x - CITE.x) / 300, (z - CITE.z) / 200) < 1.3) continue; const y = H(x, z), h = 6 + R() * 6; box(9 + R() * 8, h, 9 + R() * 6, M(['#e6d2b0', '#dcc3a0', '#e9dcc4'][i % 3]), world, x, y + h / 2, z); add(new THREE.ConeGeometry(8, 3, 4), M('#b4644a'), world, x, y + h + 1.5, z, 0, Math.PI / 4, 0); }
  scene.add(bake(world));
  // les Pyrénées au loin (au sud), avec un peu de neige sur les sommets
  { const g = new THREE.PlaneGeometry(220000, 30000, 260, 30); g.rotateX(-Math.PI / 2); const p = g.attributes.position; const col = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const ridge = Math.exp(-((z / 9000) ** 2)); const hgt = (1500 + 1200 * N2(x * 0.00004, 3) + 500 * N2(x * 0.00015, 7) + 250 * N2(x * 0.0006, 9)) * ridge; p.setY(i, hgt - 300);
      const snow = hgt > 2350 ? 1 : 0; col.push(...(snow ? [0.86, 0.88, 0.9] : [0.36, 0.40, 0.42])); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g.toNonIndexed(), M('#ffffff', { vc: true })); m.position.set(0, 0, -78000); scene.add(m); }
  // l'éclairage de la Cité la nuit (projecteurs dorés)
  const citeGlow = new THREE.PointLight('#ffb35a', 0, 420, 1.4); citeGlow.position.set(CITE.x, cy + 40, CITE.z + 180); scene.add(citeGlow);
  const citeGlow2 = new THREE.PointLight('#ffb35a', 0, 320, 1.4); citeGlow2.position.set(CITE.x + 160, cy + 30, CITE.z + 150); scene.add(citeGlow2);
  const townLights = [];
  { const pos = []; for (let i = 0; i < 700; i++) { const x = -3500 + R() * 7000, z = -1100 - R() * 3000; if (Math.hypot((x - CITE.x) / 280, (z - CITE.z) / 170) < 1.05) continue; pos.push(x, H(x, z) + 3, z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.5, 0.8), size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false })); scene.add(pts); townLights.push(pts); }

  // -------------------------------------------------------------------
  // LES GENS au belvédère : un couple sur le muret, des curieux avec leurs téléphones
  // -------------------------------------------------------------------
  const people = [['#e8e2d4', '#2b3448', -0.6, 4.6], ['#b2453a', '#3b3b3b', 0.3, 4.6], ['#3d6e9e', '#c9c2b0', 2.2, 3.2], ['#6a7f4a', '#2f2f2f', -2.4, 2.6], ['#d8b04a', '#2b3448', 3.6, 1.8]].map(([sh, pa, x, z], i) => {
    const P = makePerson(scene, { shirt: sh, pants: pa, hair: ['#2a1d15', '#c79a5a', '#5a3a22', '#8a8a8a', '#2a1d15'][i] }); P.x = x; P.z = z; P.phone = i >= 2;
    if (P.phone) { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.6, 1.9) })); P.armR.add(ph); ph.position.set(0, -0.56, 0.06); }
    P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return P; });

  // -------------------------------------------------------------------
  // LE SCHÉMA (HUD) : la Terre, ses anneaux, et l'observateur selon la latitude
  // -------------------------------------------------------------------
  const hud = document.getElementById('hud');
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', '1080'); svg.setAttribute('height', '1920');
  svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;opacity:0;filter:drop-shadow(0 3px 12px rgba(0,0,0,.5));';
  const el = (tag, attrs) => { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  const CX = 800, CY = 640, ER = 80;
  el('ellipse', { cx: CX, cy: CY, rx: ER * 2.27, ry: ER * 2.27 * 0.16, fill: 'none', stroke: '#efe4cc', 'stroke-width': 9, opacity: 0.85 });
  el('circle', { cx: CX, cy: CY, r: ER, fill: '#2f6fa8' });
  el('ellipse', { cx: CX, cy: CY, rx: ER * 2.27, ry: ER * 2.27 * 0.16, fill: 'none', stroke: '#efe4cc', 'stroke-width': 9, opacity: 0.85, 'stroke-dasharray': `0 ${Math.PI * ER * 2.27 * 0.55} ${Math.PI * ER * 2.27} 999` });
  el('line', { x1: CX - ER - 6, y1: CY, x2: CX + ER + 6, y2: CY, stroke: '#fff', 'stroke-width': 1.5, opacity: 0.6, 'stroke-dasharray': '4 4' });
  const obs = el('circle', { cx: CX, cy: CY - ER, r: 8, fill: '#ffe0a8' });
  const obsLab = el('text', { x: CX + 16, y: CY - ER, fill: '#fff', 'font-family': 'Inter', 'font-weight': 600, 'font-size': 18, 'letter-spacing': 2 });
  hud.appendChild(svg);

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(0, H(0, 8) + 2.2, 9);
  const camAz = -10, camEl = 10;   // un peu à l'est du plein sud, légèrement levée vers le ciel
  const tmp = new THREE.Vector3();
  function update(t) {
    const clockH = keys(CLOCK, t), H_ = Hof(clockH);
    const sd = sunDir(H_);
    sky.u.uSunDir.value.copy(sd); sunSprite.userData.dir.copy(sd);
    const day = sm(-0.16, 0.06, sd.y), dusk = sm(-0.2, -0.02, sd.y);
    sky.u.uDay.value = day; sky.u.uStars.value = 1 - sm(-0.25, -0.05, sd.y); sky.u.uMilky.value = 1 - sm(-0.25, -0.08, sd.y);
    sunSprite.visible = sd.y > -0.03; sun.intensity = 3.0 * sm(-0.01, 0.1, sd.y); hemi.intensity = 0.16 + 0.74 * day; hemi.color.setRGB(lerp(0.75, 0.77, day), lerp(0.78, 0.85, day), lerp(0.85, 1.0, day));
    sun.color.setRGB(1, lerp(0.62, 0.94, sm(0.0, 0.25, sd.y)), lerp(0.42, 0.85, sm(0.0, 0.25, sd.y)));
    sun.position.copy(sd).multiplyScalar(300).add(tmp.set(0, H(0, -30), -30)); sun.target.position.set(0, H(0, -30), -30);
    // les anneaux
    ringU.uSun.value.copy(sd); ringU.uDay.value = day; ringU.uTime.value = t;
    ring.position.copy(CENTER).add(CAM); ringU.uCenter.value.copy(ring.position);   // centré sur la Terre, vu depuis la caméra (pas de parallaxe parasite)
    ringLight.intensity = 0.55 * (1 - day);   // la nuit, ils éclairent le paysage
    // la nuit : la Cité illuminée, la ville
    const nightK = 1 - sm(-0.1, 0.02, sd.y);
    citeGlow.intensity = 380 * nightK; citeGlow2.intensity = 220 * nightK; townLights[0].material.opacity = nightK;
    scene.fog.color.setRGB(lerp(0.02, 0.79, day), lerp(0.025, 0.83, day), lerp(0.05, 0.86, day));
    renderer.toneMappingExposure = lerp(1.35, 1.0, day);
    // caméra fixe
    camera.position.copy(CAM); camera.lookAt(tmp.copy(CAM).add(dirAzEl(camAz, camEl))); camera.fov = 70; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sky.follow(camera); sunSprite.follow(camera);
    // les gens : regardent l'arche, la montrent, la filment
    people.forEach((P, i) => {
      P.reset(); const y = H(P.x, P.z); P.root.position.set(P.x, y, P.z); P.root.rotation.y = Math.PI + (i - 2) * 0.12;
      if (i < 2) { P.sit(1); P.root.position.y = y + 0.38; P.root.position.z = 4.3; }
      P.head.rotation.x = -0.35; if (i === 0) P.armL.rotation.set(-0.3, 0, 0.9);
      if (P.phone) P.armR.rotation.set(-2.0 - 0.1 * Math.sin(t + i), 0, 0.15);
      if (i === 1 && ((t > 11.5 && t < 14) || (t > 29.5 && t < 32))) P.armR.rotation.set(-2.5, 0, 0.1);   // montre du doigt
    });

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const hh = Math.floor(clockH) % 24, mm = Math.floor((clockH % 1) * 60);
    HUD.live(t, 'CARCASSONNE · LA CITÉ · CAM 01', `15/07/2027 · ${pad(hh)}:${pad(mm)}`);
    HUD.show2(true);
    HUD.block(1, { label: 'LES ANNEAUX', value: '1 500 → 8 000 km', sub: 'D’ALTITUDE · DANS LE PLAN DE L’ÉQUATEUR', color: '#fff', scale: 0.82 });
    if (t < T.night) HUD.block(2, { label: 'HAUTEUR DE L’ARCHE', value: '23°', sub: 'AU-DESSUS DE L’HORIZON SUD', color: '#ffe0a8' });
    else if (t < T.equator) HUD.block(2, { label: 'LA NUIT', value: 'plus clair', sub: 'QU’À LA PLEINE LUNE · OMBRE DE LA TERRE AU MILIEU', color: '#ffe0a8' });
    else if (t < T.past) HUD.block(2, { label: 'SELON LA LATITUDE', value: t < T.pole ? 'à l’équateur' : 'au-delà de 64° N', sub: t < T.pole ? 'UN TRAIT FIN QUI PASSE AU ZÉNITH' : 'INVISIBLES : SOUS L’HORIZON', color: '#ffe0a8' });
    else HUD.block(2, { label: 'IL Y A 466 MILLIONS D’ANNÉES', value: 'un anneau ?', sub: '21 CRATÈRES, TOUS PRÈS DE L’ANCIEN ÉQUATEUR', color: '#ffe0a8' });
    // le schéma : on promène l'observateur de Carcassonne à l'équateur puis au pôle
    svg.style.opacity = sm(T.equator - 0.3, T.equator + 0.3, t) * (1 - sm(T.past - 0.4, T.past, t));
    const lat = t < T.equator + 1.5 ? 43 : t < T.pole ? lerp(43, 0, sm(T.equator + 1.5, T.equator + 3.0, t)) : lerp(0, 75, sm(T.pole + 0.5, T.pole + 2.5, t));
    const la = lat * Math.PI / 180;
    obs.setAttribute('cx', String(CX - ER * Math.cos(la))); obs.setAttribute('cy', String(CY - ER * Math.sin(la)));
    obsLab.setAttribute('x', String(CX - ER * Math.cos(la) - 16)); obsLab.setAttribute('y', String(CY - ER * Math.sin(la) - 14)); obsLab.setAttribute('text-anchor', 'end');
    obsLab.textContent = lat > 60 ? 'LAPONIE' : lat > 30 ? 'CARCASSONNE' : 'ÉQUATEUR';
    HUD.hook(t, 'Et si la Terre avait<br>des <em>anneaux</em><br>comme Saturne ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.end(t, T.endCard, { kicker: 'HYPOTHÈSE : A. TOMKINS ET AL., EARTH AND PLANETARY SCIENCE LETTERS, 2024', q: 'Tu aimerais voir ça<br>chaque soir ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

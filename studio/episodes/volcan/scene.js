// =====================================================================
//  ÉPISODE : « Et si un volcan se réveillait en Auvergne ? »
//  Vue depuis le plateau de Gergovie (744 m), à la tombée de la nuit : des vaches au premier plan,
//  Clermont-Ferrand dans la plaine, la chaîne des Puys au fond (le puy de Dôme, 1 465 m, à ~14 km).
//  Faits : 80 volcans (culture.gouv.fr, UNESCO 2018) ; endormis, pas éteints (Futura) ; dernier réveil en Auvergne
//  il y a ~7 000 ans (lac Pavin) ; Parícutin 1943 : 50 m le 1er jour, 100–150 m la 1re semaine (Wikipédia) ;
//  Eyjafjallajökull 2010 : ~100 000 vols annulés ; Laki 1783 : ~80 % des moutons d'Islande morts (fluor des cendres).
//  Repère : 1 unité = 1 m, y = altitude − 744 m (le plateau de Gergovie est à 0). On regarde vers le nord-ouest (−z).
// =====================================================================
import { THREE, createStage, makeSky, M, add, box, cyl, noise2, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, FX, canvasTex, dotTex } from '../../engine.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, quake: 18.2, open: 23.2, zoomIn: 23.6, zoomOut: 31.8, fount: 33.2, ash: 38.2, planes: 43.2, grass: 48.2, laki: 53.2, warn: 58.2, endCard: 63.2, duration: 67.4 };
const SUBS = [
  [3.4, 8.0, 'Clermont-Ferrand. Derrière : la chaîne des Puys.'],
  [8.4, 12.8, '80 volcans. Pas éteints : endormis.'],
  [13.2, 17.8, 'Le dernier réveil en Auvergne date de 7 000 ans.'],
  [18.2, 22.8, 'Un réveil commencerait par des semaines de séismes.'],
  [23.2, 27.8, 'Puis le sol s’ouvre et un nouveau volcan naît.'],
  [28.2, 32.8, 'Au Mexique en 1943, l’un d’eux a pris 50 m en un jour.'],
  [33.2, 37.8, 'Fontaines de lave, coulées, forêts en feu.'],
  [38.2, 42.8, 'Les cendres retombent sur la ville. On évacue.'],
  [43.2, 47.8, 'En 2010, un volcan islandais a fait annuler 100 000 vols.'],
  [48.2, 52.8, 'Les cendres empoisonnent l’herbe… et les troupeaux.'],
  [53.2, 57.8, 'En 1783, en Islande, 80 % des moutons en sont morts.'],
  [58.2, 62.8, 'Mais un tel réveil se verrait venir des semaines avant.'],
];

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 58, far: 60000, bloom: [0.6, 0.55, 0.85], shadows: false });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.25;
  document.documentElement.style.setProperty('--accent', '#ff9a4a');
  const R = rng(7000);
  const nz = noise2(23);
  const SUNSET = dirAzEl(-28, -3.5);   // le soleil vient de se coucher derrière la chaîne

  const sky = makeSky(scene, { sunDir: SUNSET, dayZen: [0.03, 0.06, 0.16], dayHor: [0.42, 0.24, 0.20], nightZen: [0.002, 0.003, 0.010], nightHor: [0.03, 0.025, 0.035], stars: 0.6, milky: 0.3, sunGlow: 1.2 });
  sky.u.uDay.value = 0.32; sky.u.uTintDir.value.copy(SUNSET); sky.u.uTint.value.setRGB(0.6, 0.25, 0.1); sky.u.uTintAmt.value = 0.12;
  scene.fog = new THREE.Fog('#2c2a33', 3000, 42000);
  const hemi = new THREE.HemisphereLight('#5a5f80', '#2a2018', 0.7); scene.add(hemi);
  const dusk = new THREE.DirectionalLight('#ffb38a', 0.5); dusk.position.copy(SUNSET).multiplyScalar(1000).setY(120); scene.add(dusk);
  const glowL = new THREE.DirectionalLight('#ff6a2a', 0); glowL.position.set(700, 900, -11300); scene.add(glowL);   // la lueur de l'éruption éclaire tout le paysage

  // -------------------------------------------------------------------
  // LE RELIEF : plateau (vaches) → falaise → plaine (Clermont) → montée → plateau des Dômes et les puys
  // -------------------------------------------------------------------
  const cone = (x, z, cx, cz, r, h, crater = 0, dome = 0) => {
    const d = Math.hypot(x - cx, z - cz) / r; if (d > 1) return 0;
    let y = h * (dome ? Math.cos(d * Math.PI / 2) ** 0.7 : (1 - d) ** 1.25 * (1 - 0.15 * d));
    if (crater) y -= crater * h * Math.max(0, 1 - d / 0.28) ** 2;
    return y;
  };
  const PUYS = [   // x, distance, rayon, hauteur au-dessus du plateau des Dômes, cratère, dôme
    [-1200, 14000, 1300, 571, 0, 1],   // puy de Dôme (1 465 m)
    [-200, 12900, 700, 300, 0.35, 0],  // puy de Pariou (cratère)
    [-2000, 13400, 600, 220, 0, 1],    // petit puy de Dôme
    [-3600, 15600, 900, 340, 0.25, 0], // puy de Côme
    [-5200, 13800, 650, 230, 0, 1],    // grand Sarcoui (en cloche)
    [1900, 14800, 800, 300, 0.3, 0],   // puy de Lassolas
    [3200, 15800, 750, 260, 0.3, 0],   // puy de la Vache
    [-7000, 15200, 900, 280, 0.2, 0], [5200, 16800, 900, 300, 0.2, 0], [-8800, 14200, 700, 220, 0, 1], [7000, 17800, 800, 260, 0.2, 0],
  ];
  function H(x, z) {
    const d = -z;
    let y = 0;
    y = lerp(0, -330, sm(150, 700, d));                                  // le bord du plateau de Gergovie
    y += (nz(x * 0.002, z * 0.002, 3) - 0.5) * 40 * sm(1500, 3000, d);    // la plaine ondule un peu
    y = lerp(y, 150 + (nz(x * 0.0015, z * 0.0015, 3) - 0.5) * 80, sm(8800, 11800, d));   // montée vers le plateau des Dômes
    for (const [px, pd, r, h, c, dm] of PUYS) y += cone(x, z, px, -pd, r, h, c, dm);
    if (d < 150) y = (nz(x * 0.01, z * 0.01, 2) - 0.5) * 3 - 0.02 * Math.max(0, d - 60) ** 1.3;   // le pré, qui s'arrête au bord du plateau
    return y;
  }
  function C(x, z, y) {
    const d = -z, k = nz(x * 0.004, z * 0.004, 2);
    if (d < 160) return k > 0.55 ? '#5d7a3e' : '#6b8746';
    if (d < 700) return k > 0.5 ? '#3f4c2a' : '#4a5631';   // la pente boisée
    if (y > 220) return k > 0.5 ? '#3f4a2c' : '#4a5533';            // les puys : forêts sombres
    if (d > 8800) return k > 0.5 ? '#465331' : '#53603a';
    return k > 0.5 ? '#4e5a36' : '#5a6640';
  }
  function ground(cx, cz, w, dd, seg) {
    const g = new THREE.PlaneGeometry(w, dd, seg, seg); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
    const geo = g.toNonIndexed(); const pp = geo.attributes.position, col = new Float32Array(pp.count * 3), c = new THREE.Color();
    for (let i = 0; i < pp.count; i += 3) { const x = (pp.getX(i) + pp.getX(i + 1) + pp.getX(i + 2)) / 3, z = (pp.getZ(i) + pp.getZ(i + 1) + pp.getZ(i + 2)) / 3, y = (pp.getY(i) + pp.getY(i + 1) + pp.getY(i + 2)) / 3; c.set(C(x, z, y)); for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo;
  }
  const gmat = M('#ffffff', { vc: true, unique: true });
  scene.add(new THREE.Mesh(ground(0, -20000, 40000, 40000, 260), gmat));
  const meadow = new THREE.Mesh(ground(0, -380, 1000, 760, 150), gmat); meadow.position.y = 0.05; scene.add(meadow);
  const chain = new THREE.Mesh(ground(-1500, -14500, 16000, 6000, 220), gmat); chain.position.y = 0.5; scene.add(chain);
  // l'antenne au sommet du puy de Dôme (feux rouges)
  const DOME_TOP = new THREE.Vector3(-1200, H(-1200, -14000), -14000);
  add(new THREE.CylinderGeometry(4, 7, 90, 6), M('#c9c9c9'), scene, DOME_TOP.x, DOME_TOP.y + 45, DOME_TOP.z);

  // -------------------------------------------------------------------
  // CLERMONT-FERRAND : des milliers de lumières dans la plaine, les autoroutes
  // -------------------------------------------------------------------
  const city = [], cityCol = [];
  const warm = new THREE.Color('#ffc27a'), white = new THREE.Color('#e8eeff'), sodium = new THREE.Color('#ffae55');
  for (let i = 0; i < 9000; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(-2 * Math.log(1 - R() * 0.999)) * 1100;
    const x = -500 + Math.cos(a) * rr * 1.5, z = -7300 + Math.sin(a) * rr;
    if (-z < 4200 || -z > 9800) continue;
    city.push(x, H(x, z) + 3 + R() * 12, z); const c = R() < 0.55 ? warm : R() < 0.6 ? sodium : white; const b = 0.55 + R() * 0.8; cityCol.push(c.r * b, c.g * b, c.b * b);
  }
  const cityGeo = new THREE.BufferGeometry(); cityGeo.setAttribute('position', new THREE.Float32BufferAttribute(city, 3)); cityGeo.setAttribute('color', new THREE.Float32BufferAttribute(cityCol, 3));
  const cityPts = new THREE.Points(cityGeo, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }));
  scene.add(cityPts);
  // l'autoroute qui passe au pied du plateau puis file vers le sud-est (vers nous) : phares et feux arrière
  const hw = (s) => { const d = lerp(9500, 1600, s), x = lerp(-300, 2600, s) + 500 * Math.sin(s * 3); return [x, H(x, -d) + 2, -d]; };
  const NCAR = 260, cars = [];
  for (let i = 0; i < NCAR; i++) cars.push({ s0: R(), v: (0.004 + R() * 0.004) * (i % 2 ? 1 : -1), lane: (i % 2 ? 8 : -8), exo: i % 2 === 1 && R() < 0.85 });
  const carGeo = new THREE.BufferGeometry(); carGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NCAR * 3), 3)); carGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(NCAR * 3), 3));
  const carPts = new THREE.Points(carGeo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false })); carPts.frustumCulled = false; scene.add(carPts);
  // un avion qui descend vers l'aéroport (clignotants) — il n'y en aura plus ensuite
  const planeLights = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3)).setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(9), 3)), new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }));
  planeLights.frustumCulled = false; scene.add(planeLights);

  // -------------------------------------------------------------------
  // LE PRÉ : clôture, quelques arbres, et un troupeau de vaches Salers
  // -------------------------------------------------------------------
  const wood = M('#4a3a2c');
  for (let i = 0; i < 26; i++) { const x = -60 + i * 5; box(0.14, 1.2, 0.14, wood, scene, x, 0.6 + H(x, -64), -64 - Math.sin(i * 0.4) * 2); }
  for (const y of [0.55, 1.0]) { const pts = []; for (let i = 0; i < 26; i++) pts.push(new THREE.Vector3(-60 + i * 5, y, -64 - Math.sin(i * 0.4) * 2)); scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#3a2f25' }))); }
  for (const [x, z, s] of [[-38, -120, 1.2], [55, -150, 1.0], [-80, -210, 1.4], [30, -260, 0.9]]) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); cyl(0.3, 0.45, 4, 6, M('#4a3b2e'), g, 0, 2, 0); add(new THREE.IcosahedronGeometry(3.2, 1), M('#3e5a2c'), g, 0, 5.6, 0); }
  const cowMat = M('#7a3418'), cowDark = M('#3a1c10'), horn = M('#e8dcc4');
  const cows = [];
  for (const [x, z, ry] of [[-6, -22, 0.6], [4, -30, -0.9], [-14, -36, 1.8], [10, -18, 2.6], [-2, -44, -0.2], [16, -40, 1.2], [-20, -26, -1.4]]) {
    const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = ry; scene.add(root);
    const body = new THREE.Group(); root.add(body); body.position.y = 0.95;
    box(0.62, 0.62, 1.55, cowMat, body, 0, 0.15, 0);
    const head = new THREE.Group(); head.position.set(0, 0.3, 0.82); body.add(head);
    box(0.36, 0.36, 0.52, cowMat, head, 0, 0, 0.18); box(0.3, 0.2, 0.14, cowDark, head, 0, -0.08, 0.45);
    for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.34, 5), horn); h.position.set(sx * 0.2, 0.2, 0.08); h.rotation.set(0.4, 0, sx * -0.9); head.add(h); }
    const legs = [];
    for (const [lx, lz] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]]) { const p = new THREE.Group(); p.position.set(lx, -0.15, lz); body.add(p); box(0.14, 0.8, 0.14, cowMat, p, 0, -0.4, 0); legs.push(p); }
    const tail = new THREE.Group(); tail.position.set(0, 0.35, -0.78); body.add(tail); box(0.05, 0.7, 0.05, cowDark, tail, 0, -0.35, 0);
    cows.push({ root, body, head, legs, tail, x, z, ry, ph: R() * 9 });
  }

  // -------------------------------------------------------------------
  // L'ÉRUPTION : fissure, fontaines, nouveau cône, panache, éclairs, coulées, incendies, cendres
  // -------------------------------------------------------------------
  const VENT = new THREE.Vector3(700, 0, -11300); VENT.y = H(VENT.x, VENT.z);
  const coneMesh = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true).translate(0, 0.5, 0), M('#1e1a18', { e: '#ff5a1a', ei: 0.12, unique: true }));
  coneMesh.position.copy(VENT); scene.add(coneMesh);
  const coneH = (t) => (t < T.open ? 0 : 50 * sm(T.open, 28.2, t) + 70 * sm(28.2, T.ash, t) + 40 * sm(T.ash, T.endCard, t));   // 50 m le 1er jour, ~120 m la 1re semaine
  const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,190,120,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const ventGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(4, 1.6, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
  ventGlow.position.copy(VENT); scene.add(ventGlow);
  const ventLight = new THREE.PointLight('#ff6a20', 0, 2500, 1.3); ventLight.position.copy(VENT).setY(VENT.y + 200); scene.add(ventLight);
  // fontaines de lave (bombes incandescentes)
  const NF = 1600, fount = [];
  for (let i = 0; i < NF; i++) fount.push({ ph: R(), a: R() * Math.PI * 2, vh: 4 + R() * 22, vv: 30 + R() * 34, b: 0.6 + R() * 0.8 });
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NF * 3), 3)); fGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(NF * 3), 3));
  const fPts = new THREE.Points(fGeo, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  fPts.frustumCulled = false; scene.add(fPts);
  // le panache de cendres : des bouffées sombres qui montent, éclairées en orange par le bas, et que le vent pousse vers la ville
  const smokeTex = canvasTex(128, 128, (g) => { for (let k = 0; k < 9; k++) { const x = 34 + Math.random() * 60, y = 34 + Math.random() * 60, r = 22 + Math.random() * 28; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } });
  const NPU = 150, puffs = [];
  for (let i = 0; i < NPU; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: '#3a3532', depthWrite: false, transparent: true, opacity: 0, fog: false })); scene.add(sp); puffs.push({ sp, ph: i / NPU, r0: R(), sx: (R() - 0.5), rot: R() * 6 }); }
  const bolt = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 6), 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(3, 3, 4), transparent: true, opacity: 0, fog: false }));
  bolt.frustumCulled = false; scene.add(bolt);
  // les coulées : on suit la pente depuis le cratère (descente la plus raide), vers la ville
  function flowPath(x0, z0, n, step, bias) {
    const pts = [new THREE.Vector3(x0, H(x0, z0), z0)]; let x = x0, z = z0;
    for (let i = 0; i < n; i++) {
      let best = null, by = Infinity;
      for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2, nx = x + Math.cos(ang) * step, nz2 = z + Math.sin(ang) * step; const y = H(nx, nz2) - bias * Math.sin(ang); if (y < by) { by = y; best = [nx, nz2]; } }
      x = best[0]; z = best[1]; pts.push(new THREE.Vector3(x, H(x, z), z));
    }
    return pts;
  }
  const flows = [flowPath(VENT.x + 60, VENT.z + 80, 70, 40, 6), flowPath(VENT.x - 70, VENT.z + 60, 60, 40, 3), flowPath(VENT.x + 120, VENT.z + 20, 55, 40, 2)];
  const flowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFront: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'attribute float aS; varying float vS; varying vec2 vUv; void main(){ vS = aS; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uFront; varying float vS; varying vec2 vUv;
      void main(){ if (vS > uFront) discard;
        float age = uFront - vS; float hot = exp(-age * 2.5) * 0.8 + 0.25;
        float crust = 0.55 + 0.45 * sin(vS * 140.0 + sin(vUv.y * 9.0 + uTime) * 2.0);
        float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
        vec3 c = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.75, 0.3), hot * 0.6) * (hot * crust) * edge * 3.2;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const flowMeshes = flows.map((pts, fi) => {
    const pos = [], aS = [], uv = [], idx = [];
    pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) || 1; const w = 55 + 70 * (i / pts.length); const nx = -dz / L * w, nzz = dx / L * w;
      pos.push(p.x + nx, H(p.x + nx, p.z + nzz) + 3, p.z + nzz, p.x - nx, H(p.x - nx, p.z - nzz) + 3, p.z - nzz); const s = i / (pts.length - 1); aS.push(s, s); uv.push(s, 0, s, 1);
      if (i < pts.length - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, flowMat.clone()); m.frustumCulled = false; scene.add(m); m.userData.delay = fi * 1.8; m.userData.pts = pts; return m;
  });
  // incendies de forêt le long des coulées
  const fires = [];
  flows.forEach((pts, fi) => { for (let k = 0; k < 7; k++) { const i = 6 + ((k * 7 + fi * 3) % (pts.length - 8)), p = pts[i]; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(3, 1.1, 0.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false })); sp.position.set(p.x + (R() - 0.5) * 160, p.y + 25, p.z + (R() - 0.5) * 160); scene.add(sp); fires.push({ sp, s: i / (pts.length - 1), fi, ph: R() * 9, k: 0.6 + R() * 0.8 }); } });
  // les cendres qui tombent autour de nous
  const NA = 2600, ash = [];
  for (let i = 0; i < NA; i++) ash.push({ x: (R() - 0.5) * 120, z: -R() * 160 + 6, h: R(), v: 0.6 + R() * 0.9, sw: R() * 9 });
  const aGeo = new THREE.BufferGeometry(); aGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NA * 3), 3));
  const aPts = new THREE.Points(aGeo, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, map: dotTex(), color: '#9a958e', transparent: true, opacity: 0, depthWrite: false }));
  aPts.frustumCulled = false; scene.add(aPts);

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(0, 9, 22);   // au bord du plateau, à hauteur de la table d'orientation
  const LOOK = new THREE.Vector3(-300, 900, -14000);
  const TELE = VENT.clone().setY(VENT.y + 90);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const flowFront = (t) => sm(T.fount - 1.5, T.endCard, t) * 0.92;
  function update(t) {
    const zk = sm(T.zoomIn, T.zoomIn + 1.6, t) * (1 - sm(T.zoomOut, T.zoomOut + 1.4, t));
    const qk = sm(T.quake, T.quake + 0.6, t) * (1 - sm(T.open + 0.5, T.open + 2, t));
    camera.position.copy(CAM).add(tmp.set(Math.sin(t * 0.2) * 0.2, 0, 0));
    camera.position.x += (Math.sin(t * 43) + Math.sin(t * 27)) * 0.012 * qk * (Math.sin(t * 1.7) > 0 ? 1 : 0.3);
    const look = tmp2.copy(LOOK).lerp(TELE, zk).add(tmp.set(0, 1400 * sm(T.fount, T.ash, t) * (1 - zk), 0));
    camera.fov = Math.exp(lerp(Math.log(58), Math.log(4.2), zk)); camera.updateProjectionMatrix();
    camera.lookAt(look); camera.updateMatrixWorld();
    sky.follow(camera);
    // la nuit tombe peu à peu ; le ciel s'assombrit encore sous les cendres
    const night = sm(0, 40, t), ashK = sm(T.ash - 1, T.grass + 2, t);
    sky.u.uDay.value = 0.32 * (1 - 0.75 * night) * (1 - 0.6 * ashK); sky.u.uStars.value = 0.6 * night * (1 - ashK);
    sky.u.uTint.value.setRGB(lerp(0.6, 0.9, sm(T.open, T.fount, t)), lerp(0.25, 0.22, sm(T.open, T.fount, t)), 0.08); sky.u.uTintDir.value.copy(SUNSET).lerp(tmp.copy(VENT).normalize().setY(0.3), sm(T.open, T.fount, t)).normalize();
    sky.u.uTintAmt.value = 0.12 * (1 - night) + 0.22 * sm(T.open, T.fount, t) * (1 - 0.4 * ashK);
    scene.fog.color.setRGB(lerp(0.17, 0.2, ashK), lerp(0.165, 0.17, ashK), lerp(0.2, 0.17, ashK)); scene.fog.far = lerp(42000, 16000, ashK); scene.fog.near = lerp(3000, 400, ashK);
    hemi.intensity = lerp(0.7, 0.35, night) + 0.25 * sm(T.open, T.fount, t); dusk.intensity = 0.5 * (1 - night);
    hemi.color.setRGB(lerp(0.35, 0.75, sm(T.open, T.fount, t)), lerp(0.37, 0.33, sm(T.open, T.fount, t)), lerp(0.5, 0.3, sm(T.open, T.fount, t)));
    glowL.intensity = 1.1 * sm(T.open, T.fount, t) * (0.85 + 0.15 * Math.sin(t * 9));
    // --- le nouveau volcan
    const h = coneH(t), erupt = sm(T.open, T.open + 0.8, t);
    coneMesh.scale.set(Math.max(0.01, h * 3.2), Math.max(0.01, h), Math.max(0.01, h * 3.2)); coneMesh.visible = h > 0.5;
    ventGlow.position.copy(VENT).setY(VENT.y + h + 10); ventGlow.material.opacity = erupt * (0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.1)); ventGlow.scale.setScalar(lerp(70, 220, sm(T.open, T.fount, t)) * (1 - 0.6 * zk));
    ventLight.intensity = erupt * 6e3 * (0.8 + 0.2 * Math.sin(t * 11)); ventLight.position.copy(VENT).setY(VENT.y + h + 200);
    // fissure qui s'ouvre (avant le cône) : lueur étirée
    {
      const a = fGeo.attributes.position.array, c = fGeo.attributes.color.array;
      fount.forEach((p, i) => {
        if (!erupt) { a[i * 3 + 1] = -1e5; return; }
        const s = ((t * 0.55 + p.ph) % 1) * 5.2; const vv = p.vv * (0.6 + 0.6 * sm(T.open, T.fount, t));
        a[i * 3] = VENT.x + Math.cos(p.a) * p.vh * s; a[i * 3 + 1] = VENT.y + h + vv * s - 4.9 * s * s; a[i * 3 + 2] = VENT.z + Math.sin(p.a) * p.vh * s;
        if (a[i * 3 + 1] < VENT.y + h * 0.7) a[i * 3 + 1] = -1e5;
        const k = p.b * Math.max(0, 1 - s / 5.2) * erupt * (1 - 0.65 * zk); c[i * 3] = 3.2 * k; c[i * 3 + 1] = 1.3 * k; c[i * 3 + 2] = 0.35 * k;
      });
      fGeo.attributes.position.needsUpdate = true; fGeo.attributes.color.needsUpdate = true;
      fPts.material.size = lerp(2.0, 3.4, zk);
    }
    // panache
    const plume = sm(T.open + 0.5, T.fount + 2, t);
    puffs.forEach((p) => {
      const u = (t * 0.05 + p.ph) % 1; const hgt = u * 5200 * (0.4 + 0.6 * plume);
      const drift = Math.max(0, hgt - 1500) * 0.9;   // le vent d'ouest pousse le haut du panache vers la ville
      p.sp.position.set(VENT.x + p.sx * (200 + hgt * 0.35) + drift * 0.35, VENT.y + h + 60 + hgt, VENT.z + drift * 1.0);
      const s = 400 + hgt * 0.55; p.sp.scale.set(s, s, 1);
      const lit = Math.exp(-hgt / 450) * erupt;
      p.sp.material.color.setRGB(0.10 + 0.9 * lit, 0.09 + 0.3 * lit, 0.09 + 0.05 * lit);
      p.sp.material.opacity = plume * 0.92 * sm(0, 0.08, u) * (1 - sm(0.8, 1, u)); p.sp.material.rotation = p.rot + u * 0.5;
    });
    // éclairs volcaniques dans le panache
    {
      const on = plume > 0.5 && (Math.sin(t * 5.3) * Math.sin(t * 3.1 + 1) > 0.82) ? 1 : 0;
      const a = bolt.geometry.attributes.position.array; let x = VENT.x + Math.sin(Math.floor(t * 5) * 7) * 400, y = VENT.y + 1500, z = VENT.z + 300;
      for (let i = 0; i < 16; i++) { const nx = x + (Math.sin(i * 12.9 + Math.floor(t * 5)) * 160), ny = y - 90 - Math.abs(Math.sin(i * 4.1)) * 60, nzz = z + Math.cos(i * 7.7) * 60; a.set([x, y, z, nx, ny, nzz], i * 6); x = nx; y = ny; z = nzz; }
      bolt.geometry.attributes.position.needsUpdate = true; bolt.material.opacity = on;
    }
    // coulées
    const front = flowFront(t);
    flowMeshes.forEach((m) => { m.material.uniforms.uTime.value = t; m.material.uniforms.uFront.value = Math.max(0, front - m.userData.delay * 0.04) * (t > T.fount - 1.5 ? 1 : 0); });
    fires.forEach((f) => { const on = sm(0, 0.03, front - f.s - 0.02); f.sp.material.opacity = on * (0.45 + 0.3 * Math.sin(t * 6 + f.ph)); f.sp.scale.setScalar(140 * f.k * (0.7 + 0.3 * on)); });
    // cendres autour de nous, le pré et les vaches grisent
    {
      const a = aGeo.attributes.position.array; const k = sm(T.ash, T.ash + 3, t);
      ash.forEach((p, i) => { const y = 30 - (((t * p.v * 1.4 + p.h * 30) % 30)); a[i * 3] = p.x + Math.sin(t * 0.6 + p.sw) * 1.5 + t * 0.6; a[i * 3 + 1] = y; a[i * 3 + 2] = p.z; });
      aGeo.attributes.position.needsUpdate = true; aPts.material.opacity = 0.85 * k;
    }
    FX.uFrostColor.value.setRGB(0.24, 0.22, 0.21); FX.uFrost.value = 0.85 * sm(T.ash + 2, T.laki, t);
    // ville : les lumières tiennent (on évacue), les voitures fuient vers le sud-est
    {
      const a = carGeo.attributes.position.array, c = carGeo.attributes.color.array; const exode = sm(T.ash, T.ash + 2, t);
      cars.forEach((cv, i) => {
        if (!cv.exo && exode > 0.5 && i % 4 !== 0) { a[i * 3 + 1] = -1e5; return; }
        const v = cv.v * (cv.exo ? lerp(1, 0.35, exode) : 1);   // embouteillage dans le sens de la fuite
        let s = (cv.s0 + v * t) % 1; if (s < 0) s += 1;
        const dens = cv.exo ? 1 : 0; const [x, y, z] = hw(s);
        a[i * 3] = x + cv.lane; a[i * 3 + 1] = (cv.exo || exode < 0.5 || i % 4 === 0) ? y : -1e5; a[i * 3 + 2] = z;
        const toward = cv.v > 0; c.set(toward ? [2.4, 2.2, 1.8] : [2.2, 0.25, 0.2], i * 3); if (!cv.exo && exode > 0.5) c.set([0, 0, 0], i * 3); void dens;
      });
      carGeo.attributes.position.needsUpdate = true; carGeo.attributes.color.needsUpdate = true;
    }
    {
      const a = planeLights.geometry.attributes.position.array, c = planeLights.geometry.attributes.color.array;
      const u = (t - 1) / 14, on = u > 0 && u < 1 ? 1 : 0;
      const px = lerp(-9000, 4000, u), py = lerp(2600, 900, u), pz = lerp(-16000, -6000, u);
      a.set([px - 18, py, pz, px + 18, py, pz, px, py + 3, pz]); const bl = Math.sin(t * 6) > 0.7 ? 1 : 0;
      c.set([2.5 * on, 0.2 * on, 0.2 * on, 0.2 * on, 2.5 * on, 0.3 * on, 2.5 * on * bl, 2.5 * on * bl, 2.5 * on * bl]);
      planeLights.geometry.attributes.position.needsUpdate = true; planeLights.geometry.attributes.color.needsUpdate = true;
    }
    // les vaches : broutent, relèvent la tête au séisme et à l'éruption, se serrent sous les cendres
    cows.forEach((cw, i) => {
      const alert = Math.max(sm(T.quake, T.quake + 0.6, t) * (1 - sm(T.quake + 3, T.quake + 4, t)), sm(T.open, T.open + 1, t) * (1 - sm(T.fount + 2, T.ash, t)));
      const huddle = sm(T.ash, T.ash + 4, t);
      const graze = (1 - alert) * (0.5 + 0.5 * Math.sin(t * 0.4 + cw.ph));
      cw.head.rotation.x = lerp(-0.15, 0.85, graze * (1 - huddle * 0.6)); cw.head.rotation.y = alert * 0.5 * Math.sin(cw.ph);
      cw.root.position.set(lerp(cw.x, cw.x * 0.45 + 2, huddle), 0, lerp(cw.z, cw.z * 0.6 - 14, huddle));
      cw.root.rotation.y = lerp(cw.ry, Math.atan2(VENT.x - cw.x, VENT.z - cw.z) + Math.PI + (i - 3) * 0.2, huddle) + alert * 0.25 * Math.sin(cw.ph);
      cw.tail.rotation.z = Math.sin(t * 2 + cw.ph) * 0.25; cw.body.position.y = 0.95;
      const walk = huddle > 0.02 && huddle < 0.98 ? 1 : 0; cw.legs.forEach((L, j) => { L.rotation.x = walk * Math.sin(t * 6 + j * 1.7) * 0.35; });
    });

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const day = t < T.open ? null : Math.floor(lerp(1, 9, sm(T.open, T.endCard, t)));
    HUD.live(t, 'GERGOVIE · CAM 01', t < T.quake ? `14/03/2027 · 19:${pad(42 + Math.floor(t / 60))}:${pad(Math.floor(t) % 60)}` : t < T.open ? 'ACCÉLÉRÉ · 3 SEMAINES' : `ACCÉLÉRÉ · JOUR ${day}`);
    if (t < T.quake) HUD.block(1, { label: 'CHAÎNE DES PUYS', value: '80 volcans', sub: 'DERNIER RÉVEIL EN AUVERGNE : ~7 000 ANS', color: '#fff' });
    else if (t < T.open) HUD.block(1, { label: 'SÉISMES', value: 'en hausse', sub: 'SOUS LA CHAÎNE DES PUYS', color: '#ffb15e' });
    else HUD.block(1, { label: 'NOUVEAU VOLCAN', value: `${fr(Math.round(coneH(t)))} m`, sub: `JOUR ${day}`, color: '#ff9a4a' });
    HUD.show2(t > T.ash - 0.4);
    if (t > T.ash - 0.4) HUD.block(2, { label: 'AÉROPORT DE CLERMONT', value: 'fermé', sub: 'CENDRES DANS LE CIEL · ÉVACUATION', color: '#ff6b5e' });
    HUD.hook(t, 'Et si un volcan<br>se réveillait en <em>Auvergne</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.reticle('dome', tmp.copy(DOME_TOP).setY(DOME_TOP.y + 140), camera, 'PUY DE DÔME · 1 465 M', sm(4.0, 4.6, t) * (1 - sm(7.6, 8.2, t)), 90);
    HUD.reticle('city', tmp.set(-500, -300, -7300), camera, 'CLERMONT-FERRAND', sm(4.6, 5.2, t) * (1 - sm(7.6, 8.2, t)), 120);
    HUD.reticle('vent', tmp.copy(VENT).setY(VENT.y + 60), camera, 'NOUVEAU VOLCAN', sm(T.open + 0.3, T.open + 0.9, t) * (1 - sm(T.zoomIn + 1.4, T.zoomIn + 2.0, t)), 80);
    HUD.end(t, T.endCard, { kicker: 'LA CHAÎNE DES PUYS EST INSCRITE AU PATRIMOINE MONDIAL DE L’UNESCO', q: 'Et toi, tu irais voir…<br>ou tu partirais ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

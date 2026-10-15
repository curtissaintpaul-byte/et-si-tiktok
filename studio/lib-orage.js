// =====================================================================
//  LE PLATEAU SOUS L'ORAGE (style « reconstitution », avec lib-ps2.js)
//  Un haut plateau d'herbe (façon Aubrac) : des pâturages, des murets de pierre sèche, des blocs de granit,
//  un buron (la cabane de berger en pierre), un chemin, et UN arbre isolé. Au-dessus : un ciel d'orage qui avance.
//  Et la « machinerie » de l'orage : la pluie, les éclairs (le trait de lumière), le flash qui éclaire tout,
//  le courant qui court sur le sol.
//
//  const PL = buildPlateau(scene);          → PL.tree (l'arbre), PL.y(x, z) (hauteur du sol), PL.buron…
//  const SKY = stormSky(scene);              → SKY.u.uCover (0 → 1 : le ciel se ferme), SKY.flash(v, direction), SKY.follow(cam)
//  const RAIN = makeRain(scene);             → RAIN.update(t, camera.position, quantité 0…1)
//  const B = makeBolt(seed, A, B, {…});      → un éclair (Group) de A à B ; B.visible = true pendant les flashs
//  strike(ts, t0) → { on, flash } : le profil d'un coup de foudre (3 « coups » en 0,15 s, puis la lueur qui retombe)
//
//  Analogie : un éclair, c'est un fil électrique géant qui apparaît et disparaît en un clin d'œil. On le dessine comme
//  une ligne brisée (on casse un segment en deux, on décale le milieu, et on recommence), avec quelques branches.
// =====================================================================
import { THREE, mergeGeometries, rng, noise2, terrain, lerp, sm, clamp } from './engine.js';
import { pixTex } from './lib-ps2.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// --- les textures « peintes à la main », petites et sans lissage
const grassTex = () => pixTex(32, 32, (g, w, h) => { const r = rng(21); g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 520; i++) { const v = 100 + (r() * 90) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w | 0, r() * h | 0, 1, 1 + (r() * 2 | 0)); } }, 1);
const stoneTex = (base = '#77756f') => pixTex(32, 32, (g, w, h) => { const r = rng(31); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 5) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, w, 1); let x = (r() * 6) | 0; while (x < w) { g.fillRect(x, y, 1, 5); x += 4 + (r() * 7 | 0); } }
  for (let i = 0; i < 160; i++) { const v = r() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},.12)`; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } }, 2);
const lauzeTex = () => pixTex(32, 32, (g, w, h) => { const r = rng(33); g.fillStyle = '#4a4b4f'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y, w, 1); for (let x = (y / 4) % 2 ? 3 : 0; x < w; x += 6) g.fillRect(x, y, 1, 4); } for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(r() * w | 0, r() * h | 0, 2, 1); } }, 3);
const barkTex = () => pixTex(16, 32, (g, w, h) => { const r = rng(41); g.fillStyle = '#5b5248'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.08)'; g.fillRect(r() * w | 0, 0, 1, h); } for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(r() * w | 0, r() * h | 0, 2, 1); } }, [1, 2]);
const leafTex = () => pixTex(32, 32, (g, w, h) => { const r = rng(43); g.fillStyle = '#2f4a22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 420; i++) { g.fillStyle = ['#3d5e2b', '#24391a', '#4a6d33', '#1b2c14'][(r() * 4) | 0]; g.fillRect(r() * w | 0, r() * h | 0, 2, 2); } }, [2, 2]);
const granite = () => pixTex(32, 32, (g, w, h) => { const r = rng(47); g.fillStyle = '#85847e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { const v = (r() * 80) | 0; g.fillStyle = `rgb(${90 + v},${88 + v},${84 + v})`; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(60,70,40,.5)'; g.fillRect(r() * w | 0, r() * h | 0, 2, 2); } }, 1);

/** fusionne les géométries d'un groupe par matériau (comme bake() du moteur, mais en gardant les UV) */
function merge(group) {
  group.updateMatrixWorld(true);
  const by = new Map();
  group.traverse((o) => { if (!o.isMesh) return; let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(g); });
  const out = new THREE.Group();
  for (const [m, gs] of by) { const mesh = new THREE.Mesh(mergeGeometries(gs, false), m); mesh.castShadow = mesh.receiveShadow = true; out.add(mesh); }
  return out;
}
const mesh = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };

// =====================================================================
//  L'ARBRE ISOLÉ (un hêtre d'environ 9 m) : tronc, grosses branches, houppier en « boules » de feuillage
// =====================================================================
export function makeTree(seed = 3, { h = 9 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const barkM = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 1 }), leafM = new THREE.MeshStandardMaterial({ map: leafTex(), roughness: 1, flatShading: true });
  const T = h / 9;
  g.add(mesh(new THREE.CylinderGeometry(0.3 * T, 0.42 * T, 3.6 * T, 9), barkM, 0, 1.8 * T, 0));
  const tips = [];
  for (let k = 0; k < 6; k++) {   // les grosses branches : elles partent du haut du tronc vers l'extérieur
    const a = k / 6 * Math.PI * 2 + r() * 0.5, tilt = 0.45 + r() * 0.35, L = (2.6 + r() * 1.2) * T;
    const dir = V3(Math.sin(a) * Math.sin(tilt), Math.cos(tilt), Math.cos(a) * Math.sin(tilt)), base = V3(0, (3.1 + r() * 0.5) * T, 0);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * T, 0.16 * T, L, 6), barkM);
    b.position.copy(base).addScaledVector(dir, L / 2); b.quaternion.setFromUnitVectors(V3(0, 1, 0), dir); g.add(b);
    tips.push(base.clone().addScaledVector(dir, L));
  }
  for (const p of tips) for (let k = 0; k < 2; k++) {   // le feuillage : des boules un peu écrasées autour du bout des branches
    const s = (1.3 + r() * 0.8) * T, m = mesh(new THREE.IcosahedronGeometry(s, 1), leafM, p.x + (r() - 0.5) * 1.2 * T, p.y + (r() - 0.2) * 0.9 * T, p.z + (r() - 0.5) * 1.2 * T, r(), r(), r());
    m.scale.y = 0.8; g.add(m);
  }
  g.add(mesh(new THREE.IcosahedronGeometry(2.2 * T, 1), leafM, 0, 7.2 * T, 0)); g.children.at(-1).scale.y = 0.75;
  const root = merge(g);
  return { root, top: V3(0, h - 0.3 * T, 0), trunkR: 0.36 * T };
}

/** un buron : la cabane de berger de l'Aubrac (murs de granit, toit de lauzes) */
export function makeBuron() {
  const g = new THREE.Group(), wall = new THREE.MeshStandardMaterial({ map: stoneTex('#7a776f'), roughness: 1 }), roof = new THREE.MeshStandardMaterial({ map: lauzeTex(), roughness: 1, flatShading: true });
  g.add(mesh(new THREE.BoxGeometry(7, 2.6, 4.4), wall, 0, 1.3, 0));
  const s = new THREE.Shape(); s.moveTo(-2.6, 0); s.lineTo(2.6, 0); s.lineTo(0, 2.4); s.closePath();
  const rg = new THREE.ExtrudeGeometry(s, { depth: 7.4, bevelEnabled: false }); rg.translate(0, 0, -3.7); rg.rotateY(Math.PI / 2); g.add(mesh(rg, roof, 0, 2.6, 0));
  g.add(mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), new THREE.MeshStandardMaterial({ color: '#1d1a17', roughness: 1 }), 1.2, 0.85, 2.21));
  g.add(mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), wall, -2.6, 4.3, 0));
  return merge(g);
}

// =====================================================================
//  LE PLATEAU : le sol (plat autour de l'arbre, qui ondule plus loin), le chemin, les murets, les blocs de granit, le buron
// =====================================================================
export function buildPlateau(scene, { seed = 5, path = [[-160, 44], [-60, 22], [-20, 13.5], [-6, 9.5], [20, 8], [70, 16], [160, 34]] } = {}) {
  const nz = noise2(seed), r = rng(seed);
  const y = (x, z) => { const d = Math.hypot(x, z), k = sm(40, 110, d); return k * ((nz(x / 150 + 9, z / 150 + 3) - 0.45) * 30 + d * 0.012); };
  const distPath = (x, z) => { let best = 1e9; for (let i = 0; i < path.length - 1; i++) { const [ax, az] = path[i], [bx, bz] = path[i + 1]; const vx = bx - ax, vz = bz - az, u = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)); best = Math.min(best, Math.hypot(x - ax - u * vx, z - az - u * vz)); } return best; };
  const col = new THREE.Color();
  const geo = terrain(1600, 1600, 200, y, (x, z) => {
    const p = nz(x / 30, z / 30), q = nz(x / 9 + 50, z / 9 + 50);
    if (distPath(x, z) < 1.1 + q * 0.4) return '#7b6b52';                         // le chemin de terre
    col.set('#7d8a3c').lerp(new THREE.Color('#566d2c'), p).lerp(new THREE.Color('#8d8650'), clamp((q - 0.6) * 2));   // pâturage : vert, jaune sec
    if (q < 0.25) col.lerp(new THREE.Color('#6b5b4c'), 0.5);                       // des touffes de bruyère
    return '#' + col.getHexString();
  });
  // (le sol fin, avec le chemin, est trop petit pour la grille : on ajoute une plaque fine autour de l'arbre)
  const grassM = new THREE.MeshStandardMaterial({ map: grassTex(), vertexColors: true, roughness: 1, flatShading: true });
  grassM.map.repeat.set(400, 400);
  const ground = new THREE.Mesh(geo, grassM); ground.receiveShadow = true; scene.add(ground);
  const near = terrain(76, 76, 76, () => 0.02, (x, z) => {
    const p = nz(x / 6, z / 6), q = nz(x / 2.5 + 50, z / 2.5 + 50);
    if (distPath(x, z) < 0.9 + q * 0.35) return q > 0.55 ? '#857459' : '#6d5f48';
    col.set('#7a8a3a').lerp(new THREE.Color('#4f672a'), p).lerp(new THREE.Color('#8e8a52'), clamp((q - 0.62) * 2.5));
    return '#' + col.getHexString();
  });
  const nearM = grassM.clone(); nearM.map = grassTex(); nearM.map.repeat.set(30, 30);
  const groundNear = new THREE.Mesh(near, nearM); groundNear.receiveShadow = true; scene.add(groundNear);

  const stuff = new THREE.Group();
  // les murets de pierre sèche (on les voit bien d'en haut : ils dessinent les parcelles)
  const wallM = new THREE.MeshStandardMaterial({ map: stoneTex('#6f6c64'), roughness: 1 });
  const murets = [[[-120, -30], [-30, -18], [40, -28], [130, -10]], [[-30, -18], [-36, 60], [-50, 140]], [[40, -28], [52, 70]]];
  for (const line of murets) for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 1.6);
    for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, x = lerp(ax, bx, u), z = lerp(az, bz, u);
      const b = mesh(new THREE.BoxGeometry(1.7, 0.75 + r() * 0.2, 0.7), wallM, x, y(x, z) + 0.38, z, 0, Math.atan2(bx - ax, bz - az) + Math.PI / 2 + (r() - 0.5) * 0.08, 0); stuff.add(b); }
  }
  // les blocs de granit
  const rockM = new THREE.MeshStandardMaterial({ map: granite(), roughness: 1, flatShading: true });
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 14 + r() * 260, x = Math.sin(a) * d, z = Math.cos(a) * d; if (distPath(x, z) < 3) continue;
    const s = 0.4 + r() * r() * 2.2, m = mesh(new THREE.DodecahedronGeometry(s, 0), rockM, x, y(x, z) + s * 0.25, z, r() * 3, r() * 3, 0); m.scale.y = 0.6; stuff.add(m); }
  // des bosquets de hêtres au loin
  const T2 = makeTree(9, { h: 11 });
  const woods = [[-150, -160], [-110, -175], [180, -120], [210, -90], [-240, 60], [260, 110], [-60, -260]];
  for (const [wx, wz] of woods) for (let k = 0; k < 5; k++) { const x = wx + (r() - 0.5) * 30, z = wz + (r() - 0.5) * 20, t = T2.root.clone(); t.position.set(x, y(x, z) - 0.3, z); t.rotation.y = r() * 6; t.scale.setScalar(0.8 + r() * 0.5); stuff.add(t); }
  scene.add(merge(stuff));
  // le buron, et l'arbre isolé (au centre de la scène)
  const buron = makeBuron(); buron.position.set(-46, y(-46, -42), -42); buron.rotation.y = 0.5; scene.add(buron);
  const tree = makeTree(3); scene.add(tree.root);
  return { y, tree, buron, path, ground, groundNear };
}

// =====================================================================
//  LE CIEL D'ORAGE : des nuages qui défilent, plus sombres du côté de l'orage (le nord, -z) ;
//  une bande claire à l'horizon de l'autre côté (le ciel encore dégagé) ; le flash éclaire les nuages de l'intérieur.
// =====================================================================
export function stormSky(scene, { stormDir = [0, -1] } = {}) {
  const u = { uFlash: { value: 0 }, uFlashDir: { value: V3(0, 0.5, -1).normalize() }, uCover: { value: 0.3 }, uTime: { value: 0 }, uStorm: { value: new THREE.Vector2(...stormDir).normalize() } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.99999; }',
    fragmentShader: `uniform float uFlash, uCover, uTime; uniform vec3 uFlashDir; uniform vec2 uStorm; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir); float hh = d.y;
        vec2 hd = normalize(d.xz + vec2(1e-4));
        float towards = dot(hd, uStorm) * 0.5 + 0.5;                         // 1 = on regarde vers l'orage
        vec2 p = d.xz / (max(hh, 0.0) + 0.1) * 0.9 + vec2(uTime * 0.012, -uTime * 0.03);
        float c = fbm(p), c2 = fbm(p * 2.7 + 7.0);
        float dark = clamp(uCover * 1.1 + (towards - 0.55) * 1.1 + (c - 0.5) * 0.9, 0.0, 1.0);
        vec3 col = mix(vec3(0.20, 0.21, 0.23), vec3(0.012, 0.014, 0.02), dark) * (0.75 + 0.5 * c2);
        float hor = exp(-max(hh, 0.0) * 10.0) * (1.0 - towards) * (1.0 - uCover * 0.8);   // la bande claire au loin (ciel dégagé)
        col = mix(col, vec3(0.42, 0.38, 0.28), clamp(hor, 0.0, 1.0) * 0.7);
        // les rideaux de pluie sous l'orage : des traînées verticales sombres juste au-dessus de l'horizon
        float az = atan(hd.x, hd.y);
        float shaft = smoothstep(0.35, 0.75, n(vec2(az * 9.0, 0.5)) * 0.7 + n(vec2(az * 31.0, 3.0)) * 0.3) * (1.0 - smoothstep(0.0, 0.22, hh)) * smoothstep(0.55, 0.9, towards);
        col = mix(col, vec3(0.025, 0.028, 0.035), shaft * 0.75);
        col = mix(col, vec3(0.03, 0.035, 0.03), smoothstep(0.0, -0.08, hh));            // sous l'horizon
        float fd = pow(max(dot(d, uFlashDir), 0.0), 3.0);
        col += vec3(0.55, 0.6, 0.9) * uFlash * (0.25 + 1.6 * fd) * (0.4 + c) * (1.0 - smoothstep(0.0, -0.05, hh));
        gl_FragColor = vec4(col, 1.0);
      }` });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat); m.renderOrder = -10; m.frustumCulled = false; scene.add(m);
  return { mesh: m, u, follow(cam) { m.position.copy(cam.position); }, flash(v, dir) { u.uFlash.value = v; if (dir) u.uFlashDir.value.copy(dir).normalize(); } };
}

// =====================================================================
//  LA PLUIE : des milliers de petits traits (1 pixel en rendu PS2) qui tombent autour de la caméra.
//  Chaque goutte a sa place fixe dans le monde (pavage autour de la caméra) : même t = même image.
// =====================================================================
export function makeRain(scene, { n = 4000, W = 24, H = 14, speed = 9, wind = -2.2, color = '#b9c4d4', opacity = 0.42 } = {}) {
  const r = rng(77), base = new Float32Array(n * 3).map(() => r());
  const pos = new Float32Array(n * 6), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  lines.frustumCulled = false; scene.add(lines);
  const md = (a, m) => ((a % m) + m) % m;
  return { lines, update(t, cam, amount = 1) {
    const k = Math.floor(n * clamp(amount)); geo.setDrawRange(0, k * 2); lines.visible = k > 0; if (!k) return;
    const y0 = Math.max(-0.5, cam.y - H * 0.35), L = 0.045;
    for (let i = 0; i < k; i++) {
      const yy = y0 + md(base[i * 3 + 1] * H - t * speed, H);
      const x = cam.x + md(base[i * 3] * W - t * wind - cam.x + W / 2, W) - W / 2, z = cam.z + md(base[i * 3 + 2] * W - cam.z + W / 2, W) - W / 2;
      pos[i * 6] = x; pos[i * 6 + 1] = yy; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x - wind * L; pos[i * 6 + 4] = yy + speed * L; pos[i * 6 + 5] = z;
    }
    geo.attributes.position.needsUpdate = true;
  } };
}

/** un rideau de pluie au loin (sous l'orage) : un grand panneau vertical strié, semi-transparent */
export function rainCurtain(scene, { x = 0, z = -420, w = 900, h = 260 } = {}) {
  const tex = pixTex(64, 64, (g, W, H) => { const r = rng(5); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(40,44,52,0.0)'); gr.addColorStop(0.25, 'rgba(40,44,52,0.85)'); gr.addColorStop(1, 'rgba(40,44,52,0.95)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(20,22,28,${0.2 + r() * 0.3})`; g.fillRect(r() * W | 0, 0, 1 + (r() * 3 | 0), H); } }, [6, 1]);
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
  m.position.set(x, h / 2 - 20, z); scene.add(m); return m;
}

// =====================================================================
//  L'ÉCLAIR : une ligne brisée (déplacement du point milieu), avec des branches ; un cœur blanc et un halo bleuté
//  flat: true → l'éclair reste au ras du sol (le courant qui court dans l'herbe)
// =====================================================================
export function makeBolt(seed, a, b, { width = 0.08, rough = 0.22, depth = 6, branches = 3, flat = false, glow = 4, power = 3.2 } = {}) {
  const r = rng(seed), segs = [];
  function jag(p, q, w, d) {
    let pts = [p.clone(), q.clone()];
    for (let it = 0; it < d; it++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const A = pts[i], B = pts[i + 1], m = A.clone().lerp(B, 0.5), l = A.distanceTo(B), dir = B.clone().sub(A).normalize();
        const rv = V3(r() - 0.5, flat ? 0 : r() - 0.5, r() - 0.5); rv.sub(dir.clone().multiplyScalar(rv.dot(dir))); if (rv.lengthSq() > 1e-6) rv.normalize();
        m.addScaledVector(rv, l * rough * (0.4 + r() * 0.6)); if (flat) m.y = p.y;
        out.push(m, B);
      }
      pts = out;
    }
    for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1], w * (1 - 0.4 * i / pts.length)]);
    return pts;
  }
  const main = jag(a, b, width, depth), along = b.clone().sub(a);
  for (let k = 0; k < branches; k++) {
    const s = main[Math.floor((0.12 + r() * 0.6) * (main.length - 1))], L = along.length() * (0.12 + r() * 0.22);
    const side = V3(r() - 0.5, 0, r() - 0.5).normalize(), e = s.clone().addScaledVector(along.clone().normalize(), L * (flat ? 0.3 : 0.75)).addScaledVector(side, L * 0.75);
    if (flat) e.y = a.y;
    jag(s, e, width * 0.5, Math.max(2, depth - 2));
  }
  const up = V3(0, 1, 0), core = [], halo = [];
  for (const [p, q, w] of segs) {
    const l = p.distanceTo(q); if (l < 1e-4) continue;
    const m4 = new THREE.Matrix4().compose(p.clone().lerp(q, 0.5), new THREE.Quaternion().setFromUnitVectors(up, q.clone().sub(p).normalize()), V3(1, 1, 1));
    const g1 = new THREE.CylinderGeometry(w, w, l, 4, 1, true); g1.applyMatrix4(m4); core.push(g1);
    const g2 = new THREE.CylinderGeometry(w * glow, w * glow, l, 4, 1, true); g2.applyMatrix4(m4); halo.push(g2);
  }
  const cm = new THREE.MeshBasicMaterial({ fog: false, toneMapped: false }); cm.color.setRGB(power, power, power * 1.15);
  const hm = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }); hm.color.setRGB(0.5, 0.62, 1.4);
  const G = new THREE.Group(), c1 = new THREE.Mesh(mergeGeometries(core), cm), c2 = new THREE.Mesh(mergeGeometries(halo), hm);
  c1.frustumCulled = c2.frustumCulled = false; c1.renderOrder = 5; c2.renderOrder = 6; G.add(c1, c2); G.visible = false;
  G.userData.mats = [cm, hm];
  return G;
}

/** le profil d'un coup de foudre : 3 « arcs en retour » en 0,15 s (l'éclair clignote), puis la lueur retombe */
export function strike(ts, t0, { pulses = [0, 0.07, 0.15], len = 0.045 } = {}) {
  const u = ts - t0; if (u < 0 || u > 1.5) return { on: false, flash: 0, u };
  let on = false, f = 0;
  for (const p of pulses) { const v = u - p; if (v >= 0 && v < len) { on = true; f = Math.max(f, 1 - 0.4 * v / len); } }
  f = Math.max(f, 0.3 * Math.exp(-(u - pulses.at(-1)) * 5));
  return { on, flash: f, u };
}

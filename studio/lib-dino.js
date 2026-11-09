// =====================================================================
//  LE T. REX (fait entièrement par code : pas de modèle téléchargé, aucun droit à payer)
//
//  Comme une sculpture en tranches : le corps (de la queue au cou), la tête et la mâchoire sont des « boudins » dont on
//  donne le contour tous les mètres (largeur, dessus, dessous) ; l'ordinateur lisse entre les tranches.
//  Les pattes sont des segments (cuisse, jambe, pied, 3 doigts) placés à chaque image par une « cinématique inverse » :
//  on dit où le pied se pose, le genou se plie tout seul.
//  Taille : celle de « Scotty » (Université d'Alberta, 2019) : environ 13 m du museau au bout de la queue, hanches à ~3,7 m.
//
//  const R = makeTRex();  scene.add(R.root);  R.root.position.set(x, 0, z);  R.root.rotation.y = cap;
//  dans update(t) :  R.pose({ phase, stride, yaw, pitch, jaw, sway, breathe, t, lean })
//    phase  : distance parcourue / longueur d'un cycle (2 pas) → les pattes marchent sans glisser si phase = d / stride
//    yaw, pitch : la tête tourne / se baisse (radians) ; jaw : 0 → 1 (bouche ouverte) ; lean : le corps se penche en avant
//  R.point('head' | 'eye' | 'jaw' | 'nose' | 'chest' | 'foot') → position dans le monde
// =====================================================================
import { THREE } from './engine.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smk = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
function rngD(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Catmull-Rom sur des tableaux de nombres (les tranches)
function cat(P, u) {
  const n = P.length - 1, f = Math.min(n - 1e-6, Math.max(0, u * n)), i = Math.floor(f), k = f - i;
  const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[Math.min(n, i + 1)], p3 = P[Math.min(n, i + 2)];
  return p1.map((_, j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * k + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * k * k + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * k * k * k));
}
/** un « boudin » : tranches [z, y, demi-largeur, dessus, dessous] (x au centre = 0) → géométrie lissée.
 *  La couture de l'anneau est sous le ventre (on ne la voit pas). uv : u le long, v autour. */
function loft(ST, nLen = 60, nRing = 28, sq = 0.85) {
  const pos = [], uv = [], idx = [], rings = [];
  for (let i = 0; i <= nLen; i++) {
    const u = i / nLen, [z, y, rx, rt, rb] = cat(ST, u); rings.push(z);
    for (let j = 0; j <= nRing; j++) {
      const th = Math.PI + j / nRing * Math.PI * 2;           // 0 = dessus ; on part du dessous
      const s = Math.sin(th), c = Math.cos(th);
      const ss = Math.sign(s) * Math.pow(Math.abs(s), sq), cc = Math.sign(c) * Math.pow(Math.abs(c), sq);
      pos.push(Math.max(0.004, rx) * ss, y + (c > 0 ? rt : rb) * cc, z); uv.push(u, j / nRing);
    }
  }
  const R = nRing + 1;
  for (let i = 0; i < nLen; i++) for (let j = 0; j < nRing; j++) { const a = i * R + j, b = a + R; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  g.userData = { base: Float32Array.from(pos), rings, R };
  return g;
}
/** un segment de patte, le long de +Y de 0 à 1 (on l'étire en Y à la bonne longueur) ; prof : [[u, rayon], …] */
function limb(prof, seg = 14) {
  const pts = []; const n = 16;
  for (let i = 0; i <= n; i++) { const u = i / n; let r = prof[0][1];
    for (let k = 1; k < prof.length; k++) if (u <= prof[k][0]) { const [u0, r0] = prof[k - 1], [u1, r1] = prof[k]; const kk = (u - u0) / (u1 - u0); r = r0 + (r1 - r0) * (kk * kk * (3 - 2 * kk)); break; }
    pts.push(new THREE.Vector2(Math.max(0.002, r), u)); }
  pts.unshift(new THREE.Vector2(0.001, 0)); pts.push(new THREE.Vector2(0.001, 1));
  return new THREE.LatheGeometry(pts, seg);
}

// --- la peau : dessus sombre, flancs tachetés, ventre clair, bandes en travers ; + une carte de relief (les écailles)
function skinTex({ w = 1024, h = 512, seed = 7, bands = 14, base = ['#3d3a2b', '#5e5439', '#a59674'] } = {}) {
  const r = rngD(seed), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  // v = 0 dessous, 0,5 dessus, 1 dessous (la couture)
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, base[2]); gr.addColorStop(0.22, base[1]); gr.addColorStop(0.5, base[0]); gr.addColorStop(0.78, base[1]); gr.addColorStop(1, base[2]);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < bands; i++) {   // les bandes sombres en travers du dos
    const x = (i + 0.3 + r() * 0.4) / bands * w, bw = 10 + r() * 22;
    const bg = g.createLinearGradient(0, h * 0.18, 0, h * 0.82); bg.addColorStop(0, 'rgba(25,22,15,0)'); bg.addColorStop(0.35, 'rgba(25,22,15,.55)'); bg.addColorStop(0.5, 'rgba(25,22,15,.65)'); bg.addColorStop(0.65, 'rgba(25,22,15,.55)'); bg.addColorStop(1, 'rgba(25,22,15,0)');
    g.fillStyle = bg; g.beginPath(); g.ellipse(x, h / 2, bw, h * 0.34, 0, 0, 7); g.fill();
  }
  for (let i = 0; i < 2600; i++) { const x = r() * w, y = r() * h, s = 1 + r() * 4; g.fillStyle = `rgba(${r() < 0.5 ? '20,18,12' : '170,150,110'},${0.08 + r() * 0.18})`; g.beginPath(); g.ellipse(x, y, s * 1.6, s, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function scaleBump({ w = 1024, h = 512, seed = 3, n = 9000 } = {}) {
  const r = rngD(seed), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, s = 2 + r() * 4.5; const gg = g.createRadialGradient(x, y, 0, x, y, s); gg.addColorStop(0, '#c8c8c8'); gg.addColorStop(1, 'rgba(60,60,60,.0)'); g.fillStyle = gg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  for (let i = 0; i < 160; i++) { const x = r() * w; g.strokeStyle = 'rgba(40,40,40,.3)'; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < h; y += 20) g.lineTo(x + Math.sin(y * 0.03 + i) * 5, y); g.stroke(); }   // les plis (en travers du corps)
  const t = new THREE.CanvasTexture(c); return t;
}

export function makeTRex({ seed = 7 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = new THREE.MeshStandardMaterial({ map: skinTex({ seed }), bumpMap: scaleBump({ seed }), bumpScale: 1.6, roughness: 0.82, metalness: 0 });
  const skinL = new THREE.MeshStandardMaterial({ map: skinTex({ seed: seed + 1, bands: 3 }), bumpMap: scaleBump({ seed: seed + 2, w: 512, h: 256, n: 3000 }), bumpScale: 1.4, roughness: 0.85 });
  const legM = new THREE.MeshStandardMaterial({ map: skinTex({ seed: seed + 5, bands: 0, base: ['#4a4330', '#4d4532', '#585037'] }), bumpMap: scaleBump({ seed: seed + 6, w: 512, h: 256, n: 4000 }), bumpScale: 1.5, roughness: 0.85 });
  const claw = new THREE.MeshStandardMaterial({ color: '#2a251d', roughness: 0.45 });
  const tooth = new THREE.MeshStandardMaterial({ color: '#b9a985', roughness: 0.55 });
  const gum = new THREE.MeshStandardMaterial({ color: '#5a2620', roughness: 0.7, side: THREE.DoubleSide });

  // ---------------- le corps : de la queue au cou
  const BODY = [
    [-7.0, 2.55, 0.02, 0.02, 0.02], [-6.2, 2.75, 0.1, 0.1, 0.11], [-5.0, 3.0, 0.2, 0.2, 0.24], [-3.6, 3.28, 0.33, 0.33, 0.4],
    [-2.2, 3.55, 0.52, 0.5, 0.66], [-0.9, 3.78, 0.72, 0.62, 0.95], [0.3, 3.85, 0.84, 0.66, 1.25], [1.4, 3.72, 0.9, 0.6, 1.42],
    [2.35, 3.58, 0.78, 0.55, 1.22], [3.0, 3.66, 0.56, 0.5, 0.72], [3.45, 3.92, 0.48, 0.45, 0.55], [3.8, 4.12, 0.45, 0.42, 0.48],
  ];
  const bodyG = loft(BODY, 90, 30);
  const bodyM = new THREE.Mesh(bodyG, skin); body.add(bodyM);
  // ---------------- la tête (pivot au bout du cou) et la mâchoire
  const neck = new THREE.Group(); neck.position.set(0, 4.1, 3.62); body.add(neck);
  const head = new THREE.Group(); head.scale.setScalar(1.3); neck.add(head);
  const HEAD = [[-0.15, 0.04, 0.33, 0.33, 0.2], [0.15, 0.1, 0.42, 0.4, 0.16], [0.5, 0.07, 0.36, 0.36, 0.12], [0.9, 0.0, 0.26, 0.29, 0.09], [1.25, -0.06, 0.2, 0.23, 0.08], [1.52, -0.1, 0.14, 0.16, 0.07], [1.66, -0.13, 0.05, 0.06, 0.04], [1.7, -0.14, 0.01, 0.01, 0.01]];
  const headM = new THREE.Mesh(loft(HEAD, 40, 26, 0.8), skinL); head.add(headM);
  const jawP = new THREE.Group(); jawP.position.set(0, -0.08, 0.05); head.add(jawP);
  const JAW = [[-0.12, 0.0, 0.32, 0.04, 0.2], [0.3, -0.03, 0.3, 0.05, 0.22], [0.8, -0.03, 0.22, 0.05, 0.16], [1.25, -0.01, 0.15, 0.04, 0.11], [1.5, 0.0, 0.08, 0.03, 0.06], [1.56, 0.0, 0.01, 0.01, 0.01]];
  jawP.add(new THREE.Mesh(loft(JAW, 30, 22, 0.8), skinL));
  // l'intérieur de la bouche (sombre) et la langue
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), gum); mouth.scale.set(0.24, 0.07, 0.7); mouth.position.set(0, -0.04, 0.7); head.add(mouth);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshStandardMaterial({ color: '#7a3b36', roughness: 0.6 })); tongue.scale.set(0.15, 0.05, 0.55); tongue.position.set(0, 0.05, 0.6); jawP.add(tongue);
  // les dents : coniques, un peu recourbées, le long du bord des mâchoires
  const toothG = new THREE.ConeGeometry(0.024, 0.1, 6); toothG.translate(0, -0.05, 0);
  const teeth = [];
  for (const side of [-1, 1]) for (let i = 0; i < 11; i++) {
    const u = 0.25 + i / 11 * 0.68, [z, y, rx, , rb] = cat(HEAD, u);
    const tt = new THREE.Mesh(toothG, tooth); tt.position.set(side * rx * 0.86, y - rb * 0.85, z); tt.scale.setScalar(0.8 + 0.5 * Math.sin(i * 1.7 + 1) ** 2); tt.rotation.x = 0.15; head.add(tt); teeth.push(tt);
    const v = 0.22 + i / 11 * 0.7, [zj, yj, rxj, rtj] = cat(JAW, v);
    const tl = new THREE.Mesh(toothG, tooth); tl.position.set(side * rxj * 0.82, yj + rtj * 0.7, zj); tl.rotation.x = Math.PI - 0.12; tl.scale.setScalar(0.7 + 0.4 * Math.cos(i * 2.1) ** 2); jawP.add(tl);
  }
  // les yeux (petits, orange, profonds) sous un bourrelet ; les narines
  const eyeM = new THREE.MeshStandardMaterial({ color: '#c78a1e', roughness: 0.15, emissive: new THREE.Color('#3a2200'), emissiveIntensity: 0.5 });
  const pupM = new THREE.MeshBasicMaterial({ color: '#050403' });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), eyeM); e.position.set(s * 0.315, 0.2, 0.48); head.add(e); eyes.push(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), pupM); p.scale.set(0.35, 1, 1); p.position.set(s * 0.355, 0.2, 0.5); head.add(p);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), skinL); brow.scale.set(0.09, 0.06, 0.16); brow.position.set(s * 0.29, 0.29, 0.44); head.add(brow);
    const horn = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skinL); horn.scale.set(0.07, 0.07, 0.11); horn.position.set(s * 0.24, 0.39, 0.3); head.add(horn);   // la corne au-dessus de l'œil (os lacrymal)
    const nos = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), pupM); nos.scale.set(0.6, 1, 1.4); nos.position.set(s * 0.085, 0.04, 1.42); head.add(nos);
  }
  // ---------------- les petits bras (2 doigts)
  const arms = [];
  for (const s of [-1, 1]) {
    const a0 = new THREE.Group(); a0.position.set(s * 0.62, 3.0, 2.5); body.add(a0);
    const up = new THREE.Mesh(limb([[0, 0.11], [0.5, 0.09], [1, 0.06]], 10), legM); up.scale.y = 0.42; a0.add(up);
    const a1 = new THREE.Group(); a1.position.y = 0.42; a0.add(a1);
    const lo = new THREE.Mesh(limb([[0, 0.065], [1, 0.05]], 10), legM); lo.scale.y = 0.36; a1.add(lo);
    for (const d of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.13, 6), claw); c.position.set(d * 0.025, 0.42, 0.02); c.rotation.x = 0.4; a1.add(c); }
    a0.rotation.set(2.3, 0, s * 0.35); a1.rotation.x = -1.5; arms.push(a0);
  }
  // ---------------- les pattes
  const L1 = 1.42, L2 = 1.38, L3 = 0.95;
  const thighG = limb([[0, 0.2], [0.12, 0.58], [0.38, 0.66], [0.75, 0.42], [1, 0.24]], 20), shinG = limb([[0, 0.27], [0.3, 0.3], [1, 0.15]], 16), metaG = limb([[0, 0.17], [1, 0.12]], 12);
  const toeG = limb([[0, 0.09], [1, 0.05]], 8), clawG = new THREE.ConeGeometry(0.05, 0.16, 7);
  const legs = [];
  for (const s of [-1, 1]) {
    const L = { s, thigh: new THREE.Mesh(thighG, legM), shin: new THREE.Mesh(shinG, legM), meta: new THREE.Mesh(metaG, legM), toes: [] };
    body.add(L.thigh); root.add(L.shin, L.meta);   // la cuisse suit le corps ; le reste est placé dans le repère de l'animal
    L.shin.parent.remove(L.shin); L.meta.parent.remove(L.meta); body.add(L.shin, L.meta);
    for (const a of [-0.38, 0, 0.38]) { const tg = new THREE.Group(); const tm = new THREE.Mesh(toeG, legM); tm.scale.y = a === 0 ? 0.5 : 0.4; tg.add(tm);
      const cl = new THREE.Mesh(clawG, claw); cl.position.y = a === 0 ? 0.55 : 0.45; tg.add(cl); tg.userData.a = a; body.add(tg); L.toes.push(tg); }
    legs.push(L);
  }
  [bodyM, headM].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const UP = V(0, 1, 0), tmp = V(0, 0, 0), q = new THREE.Quaternion();
  const place = (m, a, b, len) => { const d = tmp.copy(b).sub(a); const l = d.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.y = len ?? l; };
  const HIP_Y = 3.55;
  /** une patte : hanche H (repère du corps), boule du pied F (au sol, repère du corps) */
  function leg(L, H, F, lift) {
    const A = V(F.x, F.y + 0.82, F.z - 0.45);   // la cheville (le talon est en l'air : T. rex marche sur ses doigts)
    const d = A.clone().sub(H); let dist = d.length(); const maxd = L1 + L2 - 0.02; if (dist > maxd) { d.setLength(maxd); A.copy(H).add(d); dist = maxd; }
    // le genou : loi des cosinus, plié vers l'avant (+z)
    const cosA = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), ang = Math.acos(Math.min(1, Math.max(-1, cosA)));
    const dir = d.clone().normalize(), side = V(1, 0, 0), fwd = side.clone().cross(dir).negate().normalize();   // perpendiculaire dans le plan YZ, vers l'avant
    const K = H.clone().addScaledVector(dir, Math.cos(ang) * L1).addScaledVector(fwd, Math.sin(ang) * L1);
    place(L.thigh, H.clone().addScaledVector(dir, -0.55), K); place(L.shin, K, A); place(L.meta, A, F);
    for (const tg of L.toes) { tg.position.copy(F); tg.rotation.set(Math.PI / 2 - 0.08 + lift * 0.6, tg.userData.a * L.s * 0, 0); tg.rotation.order = 'YXZ'; tg.rotation.y = tg.userData.a; }
    return { K, A };
  }
  const st = { feet: [V(), V()] };
  function pose({ phase = 0, stride = 4.2, yaw = 0, pitch = 0, jaw = 0, sway = 1, breathe = 0, t = 0, lean = 0, roll = 0 } = {}) {
    const Ls = 0.62 * stride, duty = 0.62;
    let bob = 0;
    for (let i = 0; i < 2; i++) {
      const u = ((phase + i * 0.5) % 1 + 1) % 1; let z, lift = 0;
      if (u < duty) z = Ls / 2 - (u / duty) * Ls;
      else { const k = (u - duty) / (1 - duty), kk = k * k * (3 - 2 * k); z = -Ls / 2 + kk * Ls; lift = Math.sin(Math.PI * k); }
      const moving = Math.min(1, Math.abs(stride) > 0.01 ? 1 : 0);
      st.feet[i].set(legs[i].s * 0.62, 0.1 + 0.55 * lift * moving, z * moving + 0.25);
      bob += Math.cos(u * Math.PI * 2) * 0.5;
    }
    body.position.y = 0.06 * Math.cos(phase * Math.PI * 4) + breathe * 0.02;
    body.rotation.x = lean; body.rotation.z = roll + 0.025 * Math.sin(phase * Math.PI * 2);
    // les pattes : on remet les pieds dans le repère du corps (qui se penche)
    body.updateMatrix(); const inv = body.matrix.clone().invert();
    for (let i = 0; i < 2; i++) {
      const H = V(legs[i].s * 0.6, HIP_Y, 0.15);
      const F = st.feet[i].clone().applyMatrix4(inv);
      leg(legs[i], H, F, st.feet[i].y > 0.15 ? (st.feet[i].y - 0.1) : 0);
    }
    // la queue (et le cou) ondulent un peu, en opposition avec les pas
    const p = bodyG.attributes.position, b = bodyG.userData.base, R = bodyG.userData.R, rings = bodyG.userData.rings;
    for (let i = 0; i < rings.length; i++) {
      const z = rings[i]; const k = z < -0.8 ? Math.pow((-0.8 - z) / 6.2, 1.4) : 0;
      const dx = sway * (0.55 * k * Math.sin(phase * Math.PI * 2 - z * 0.35) + 0.25 * k * Math.sin(t * 0.7 + z * 0.3));
      const dy = k * (0.12 * Math.sin(t * 0.9 + z * 0.4)) + breathe * 0.03 * (z > -1 && z < 2.6 ? 1 : 0);
      for (let j = 0; j < R; j++) { const o = (i * R + j) * 3; p.array[o] = b[o] + dx; p.array[o + 1] = b[o + 1] + dy; }
    }
    p.needsUpdate = true; bodyG.computeVertexNormals();
    // la tête
    neck.rotation.set(pitch, yaw, 0, 'YXZ');
    jawP.rotation.x = 0.55 * jaw;
    for (const a of arms) a.rotation.x = 2.3 + 0.1 * Math.sin(t * 1.3 + a.position.x);
  }
  pose();
  const P = { head: V(0, 0.25, 0.6), eye: V(0.31, 0.2, 0.48), nose: V(0, 0.05, 1.55), jaw: V(0, -0.25, 1.0) };
  function point(n) {
    root.updateMatrixWorld(true);
    if (P[n]) return head.localToWorld(P[n].clone());
    if (n === 'chest') return body.localToWorld(V(0, 2.9, 2.2));
    if (n === 'belly') return body.localToWorld(V(0, 2.9, 0.8));
    if (n === 'foot') return legs[0].meta.localToWorld(V(0, 1, 0));
    if (n === 'tail') return body.localToWorld(V(0, 3.0, -5));
    return root.getWorldPosition(V());
  }
  return { root, body, head, neck, jaw: jawP, pose, point, materials: [skin, skinL] };
}

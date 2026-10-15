// =====================================================================
//  UNE RUE PAVILLONNAIRE (banlieue française), de nuit ou de jour — pour le style « reconstitution » (avec lib-ps2.js)
//  Des maisons en crépi, des toits en tuiles, des murets avec portail, des haies, des réverbères au sodium (orange),
//  une voiture garée dans l'allée (un SUV « sans clé »), et les objets du vol (la clé, les deux boîtiers relais).
//
//  const RUE = buildStreet(scene, { night: true });
//  RUE.car (makeSUV), RUE.door (position de la porte d'entrée), RUE.key (la clé dans l'entrée), RUE.lamps…
// =====================================================================
import { THREE, M, add, box, cyl, prism, bake, rng } from './engine.js';
import { pixTex } from './lib-ps2.js';

// --- les textures « peintes à la main », petites et sans lissage
const crepi = (base) => pixTex(32, 32, (g, w, h) => { const r = rng(7); g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const v = r() * 34 - 17; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 200})`; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } }, 4);
const tuiles = pixTex(32, 32, (g, w, h) => { g.fillStyle = '#5a3a30'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, w, 1); for (let x = (y / 4) % 2 ? 2 : 0; x < w; x += 4) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, y, 1, 4); } } }, 3);
const bitume = pixTex(64, 64, (g, w, h) => { const r = rng(3); g.fillStyle = '#3b3c40'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = (r() * 60) | 0; g.fillStyle = `rgb(${50 + v},${51 + v},${55 + v})`; g.globalAlpha = 0.25; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } g.globalAlpha = 1; }, 10);
const trottoir = pixTex(32, 32, (g, w, h) => { g.fillStyle = '#8c877e'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h); for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1); }, 4);
const pelouse = pixTex(32, 32, (g, w, h) => { const r = rng(5); g.fillStyle = '#3f5a2c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? '#4c6a33' : '#33491f'; g.fillRect(r() * w | 0, r() * h | 0, 1, 2); } }, 6);
const haie = pixTex(32, 32, (g, w, h) => { const r = rng(9); g.fillStyle = '#2c4420'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = ['#3a5a28', '#22361a', '#476b30'][(r() * 3) | 0]; g.fillRect(r() * w | 0, r() * h | 0, 2, 2); } }, 2);
const pave = pixTex(32, 32, (g, w, h) => { g.fillStyle = '#7d7468'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.3)'; for (let y = 0; y < h; y += 4) { g.fillRect(0, y, w, 1); for (let x = (y / 4) % 2 ? 4 : 0; x < w; x += 8) g.fillRect(x, y, 1, 4); } }, 4);

/** plaque d'immatriculation (format d'exemple officiel : AB-123-CD) */
export function plateTex(txt = 'AB-123-CD') {
  return pixTex(128, 28, (g, w, h) => {
    g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f3fa0'; g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h);
    g.fillStyle = '#ffd400'; g.fillRect(4, 5, 4, 4); g.fillStyle = '#fff'; g.font = 'bold 8px sans-serif'; g.fillText('F', 3, 22);
    g.fillStyle = '#111'; g.font = 'bold 21px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 1);
    g.strokeStyle = '#222'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
  });
}

// =====================================================================
//  LE SUV (≈ 4,45 m × 1,84 m) : une silhouette découpée (profil extrudé), vitres sombres, jantes, phares,
//  clignotants qui flashent à l'ouverture, plafonnier, tableau de bord qui s'allume au démarrage.
//  car.lights({ blink, inside, dash, head, brake }) chaque image (valeurs de 0 à 1)
// =====================================================================
export function makeSUV(color = '#5b6066') {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const black = M('#141518', { r: 0.6, nc: true }), trim = M('#2a2c30', { r: 0.5, nc: true });
  const glass = new THREE.MeshStandardMaterial({ color: '#0d1218', roughness: 0.08, metalness: 0.7, transparent: true, opacity: 0.62 });
  const extr = (pts, depth, mat, bevel = 0.05, z = 0) => {
    const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) { if (p.arc) s.absarc(...p.arc, Math.PI, 0, true); else s.lineTo(...p); }
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
    geo.translate(0, 0, -depth / 2 + z); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m); return m;
  };
  // la carrosserie : deux flancs (le profil découpé, avec les passages de roues) ; l'intérieur reste creux pour les sièges
  const PROFILE = [[-2.18, 0.36], [-1.8, 0.36], { arc: [-1.36, 0.36, 0.44] }, [0.92, 0.36], { arc: [1.36, 0.36, 0.44] }, [2.18, 0.36], [2.22, 0.72], [2.12, 0.95], [0.92, 1.08], [-2.05, 1.12], [-2.2, 0.78]];
  for (const sz of [-1, 1]) extr(PROFILE, 0.14, paint, 0.05, sz * 0.79);
  box(4.3, 0.26, 1.46, paint, g, -0.02, 0.49, 0);                                     // le plancher
  box(1.32, 0.42, 1.48, paint, g, 1.55, 0.79, 0); box(1.3, 0.05, 1.5, paint, g, 1.55, 1.0, 0).rotation.z = -0.105;   // le capot
  box(0.32, 0.5, 1.48, paint, g, -2.02, 0.85, 0);                                     // le coffre
  // le bas de caisse noir (les SUV ont des protections en plastique)
  extr([[-2.24, 0.3], [-1.8, 0.3], { arc: [-1.36, 0.36, 0.47] }, [0.92, 0.3], { arc: [1.36, 0.36, 0.47] }, [2.24, 0.3], [2.25, 0.48], [-2.25, 0.48]], 1.78, trim, 0.02);
  // l'habitacle vitré, un peu plus étroit, et le toit
  const gh = extr([[0.92, 1.08], [0.12, 1.6], [-1.74, 1.62], [-2.08, 1.13]], 1.56, glass, 0.03);
  box(1.95, 0.06, 1.6, paint, g, -0.82, 1.65, 0); box(1.7, 0.04, 0.05, black, g, -0.85, 1.71, 0.62); box(1.7, 0.04, 0.05, black, g, -0.85, 1.71, -0.62);   // barres de toit
  for (const z of [-0.79, 0.79]) { box(0.09, 0.52, 0.03, black, g, -0.55, 1.36, z); box(0.07, 0.5, 0.03, black, g, -1.95, 1.36, z); }   // montants
  // les roues
  const tyre = M('#121212', { r: 0.9, nc: true }), rim = new THREE.MeshStandardMaterial({ color: '#b9bcc0', roughness: 0.3, metalness: 0.8 });
  for (const x of [-1.36, 1.36]) for (const z of [-0.84, 0.84]) {
    add(new THREE.CylinderGeometry(0.37, 0.37, 0.25, 14), tyre, g, x, 0.37, z, Math.PI / 2, 0, 0);
    add(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 10), rim, g, x, 0.37, z + Math.sign(z) * 0.13, Math.PI / 2, 0, 0);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; box(0.04, 0.2, 0.02, rim, g, x + Math.sin(a) * 0.12, 0.37 + Math.cos(a) * 0.12, z + Math.sign(z) * 0.14).rotation.z = -a; }
  }
  // les traits des portières, poignées, rétroviseurs
  for (const z of [-0.9, 0.9]) {
    for (const x of [0.62, -0.58, -1.95]) box(0.012, 0.62, 0.012, black, g, x, 0.75, z);
    for (const x of [0.15, -1.05]) box(0.16, 0.035, 0.03, trim, g, x, 0.98, z * 1.005);
    const mir = box(0.2, 0.12, 0.14, paint, g, 0.62, 1.12, z * 1.07);
  }
  // les feux
  const em = (c) => new THREE.MeshStandardMaterial({ color: '#222', emissive: c, emissiveIntensity: 0, roughness: 0.4 });
  const head = em('#fff3dc'), tail = em('#ff1a10'), blink = em('#ffa316'), dash = em('#7fc8ff'), dome = em('#ffe2b0');
  for (const z of [-0.62, 0.62]) { box(0.06, 0.1, 0.36, head, g, 2.2, 0.86, z); box(0.06, 0.12, 0.3, tail, g, -2.21, 0.92, z); box(0.06, 0.05, 0.16, blink, g, 2.21, 0.78, z * 1.12); box(0.06, 0.05, 0.14, blink, g, -2.22, 0.8, z * 1.15); }
  for (const z of [-1, 1]) box(0.09, 0.03, 0.05, blink, g, 0.62, 1.1, z * 0.995);   // répétiteurs sur les rétros
  // les plaques
  const pm = new THREE.MeshBasicMaterial({ map: plateTex() });
  add(new THREE.PlaneGeometry(0.52, 0.11), pm, g, 2.255, 0.6, 0, 0, Math.PI / 2, 0); add(new THREE.PlaneGeometry(0.52, 0.11), pm, g, -2.255, 0.62, 0, 0, -Math.PI / 2, 0);
  // l'intérieur (visible par les vitres et pour le plan de l'habitacle)
  const seat = M('#1c1d21', { r: 0.9, nc: true });
  for (const z of [-0.4, 0.4]) { box(0.55, 0.16, 0.5, seat, g, -0.35, 0.72, z); box(0.14, 0.62, 0.5, seat, g, -0.66, 1.08, z).rotation.z = 0.15; box(0.12, 0.16, 0.3, seat, g, -0.74, 1.46, z); }
  box(0.9, 0.2, 1.4, seat, g, -1.4, 0.72, 0); box(0.14, 0.55, 1.4, seat, g, -1.82, 1.0, 0);
  box(0.55, 0.3, 1.55, trim, g, 0.62, 0.88, 0);   // le tableau de bord
  const sw = add(new THREE.TorusGeometry(0.18, 0.025, 6, 14), black, g, 0.25, 1.0, -0.4, 0, Math.PI / 2, 0); sw.rotation.z = -0.35;   // le volant (conduite à gauche : côté -z quand la voiture regarde vers +x)
  add(new THREE.PlaneGeometry(0.3, 0.14), dash, g, 0.42, 1.08, -0.38, 0, -Math.PI / 2, 0);
  add(new THREE.PlaneGeometry(0.26, 0.15), dash, g, 0.5, 1.06, 0.0, 0, -Math.PI / 2, 0);
  const domeM = box(0.18, 0.02, 0.1, dome, g, -0.4, 1.6, 0);
  const domeL = new THREE.PointLight('#ffd9a0', 0, 2.5, 2); domeL.position.set(-0.4, 1.4, 0); g.add(domeL);
  const blinkL = new THREE.PointLight('#ffa316', 0, 4, 1.5); blinkL.position.set(0.9, 1.0, -1.2); g.add(blinkL);   // le flash orange des clignotants à l'ouverture
  const dashL = new THREE.PointLight('#7fc8ff', 0, 2.2, 1.2); dashL.position.set(0.45, 1.12, -0.38); g.add(dashL);   // le tableau de bord éclaire le visage du conducteur
  const headL = new THREE.SpotLight('#fff3dc', 0, 30, 0.5, 0.6, 1.5); headL.position.set(2.3, 0.85, 0); headL.target.position.set(10, 0, 0); g.add(headL, headL.target);
  return {
    root: g, paint, glass,
    lights({ blink: b = 0, inside = 0, dash: d = 0, head: hd = 0, brake = 0 } = {}) {
      blink.emissiveIntensity = 7 * b; blinkL.intensity = 6 * b; dome.emissiveIntensity = 1.6 * inside; domeL.intensity = 2.2 * inside;
      dash.emissiveIntensity = 1.5 * d; dashL.intensity = 9 * d; head.emissiveIntensity = 2.5 * hd; headL.intensity = 40 * hd; tail.emissiveIntensity = 0.9 * hd + 2.2 * brake;
    },
    door: (side = -1) => new THREE.Vector3(0.15, 1.0, 0.92 * side),   // la poignée de la portière du conducteur (côté -z ; repère de la voiture)
  };
}

// --- la clé (sans clé : un boîtier à boutons) et les deux boîtiers relais des voleurs
export function keyFob() {
  const g = new THREE.Group();
  box(0.034, 0.012, 0.062, M('#16171a', { r: 0.4, nc: true }), g, 0, 0, 0);
  for (const z of [-0.016, 0, 0.016]) box(0.016, 0.004, 0.009, M('#5a5d63', { r: 0.4, nc: true }), g, 0, 0.007, z);
  add(new THREE.TorusGeometry(0.012, 0.0025, 5, 10), M('#b8b8b8', { r: 0.3, m: 0.8, nc: true }), g, 0, 0, -0.042, Math.PI / 2, 0, 0);
  return g;
}
export function relayBox(big = false) {
  const g = new THREE.Group(), w = big ? 0.2 : 0.15, h = big ? 0.12 : 0.085, d = big ? 0.045 : 0.035;
  box(w, h, d, M('#1a1b1e', { r: 0.5, nc: true }), g, 0, 0, 0);

  const ant = cyl(0.006, 0.006, big ? 0.22 : 0.16, 6, M('#0e0e10', { nc: true }), g, w * 0.36, h / 2 + (big ? 0.11 : 0.08), 0);
  const led = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#3dff6e', emissiveIntensity: 0 });
  box(0.012, 0.012, 0.006, led, g, w * 0.33, -h * 0.25, -d / 2 - 0.002);   // (l'écran et la diode côté voleur : face -z ; et des diodes sur les côtés)
  const bars = pixTex(16, 8, (g2) => { g2.fillStyle = '#000'; g2.fillRect(0, 0, 16, 8); g2.fillStyle = '#fff'; for (let i = 0; i < 4; i++) g2.fillRect(2 + i * 3, 6 - i * 1.3, 2, 1.3 + i * 1.3); g2.fillRect(14, 1, 1, 1); });
  const scr = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#4dffb0', emissiveIntensity: 0, emissiveMap: bars });
  box(w * 0.5, h * 0.32, 0.003, scr, g, -w * 0.12, h * 0.12, -d / 2 - 0.003);
  for (const sx of [-1, 1]) { box(0.004, 0.012, 0.012, led, g, sx * (w / 2 + 0.002), h * 0.22, 0); box(0.004, h * 0.3, d * 0.6, scr, g, sx * (w / 2 + 0.002), -h * 0.12, 0); }
  return { root: g, ant, set(on, blink) { led.emissiveIntensity = on ? (blink ? 3 : 0.4) : 0; scr.emissiveIntensity = on ? 0.45 : 0.04; } };
}

// =====================================================================
//  LA RUE
// =====================================================================
export function buildStreet(scene, { night = true, seed = 4 } = {}) {
  const R = rng(seed), world = new THREE.Group();
  const mat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: o.r ?? 0.95, color: o.c ?? '#ffffff' });
  // le sol : la route (le long de x), les trottoirs, les jardins
  const plane = (w, d, m, x, y, z) => { const p = add(new THREE.PlaneGeometry(w, d), m, world, x, y, z, -Math.PI / 2, 0, 0); return p; };
  const fix = (t, w, d) => { const n = t.clone(); n.needsUpdate = true; n.repeat.set(w / 2, d / 2); return n; };
  plane(200, 7, mat(fix(bitume, 200, 7)), 0, 0, 0);
  for (const s of [-1, 1]) { box(200, 0.14, 2.2, mat(fix(trottoir, 200, 2.2)), world, 0, 0.07, s * 4.6); box(200, 0.16, 0.18, M('#9a958c'), world, 0, 0.08, s * 3.55); }
  for (let x = -96; x < 96; x += 6) box(3, 0.005, 0.12, M('#d9d6cc', { r: 0.6 }), world, x, 0.006, 0);   // ligne blanche discontinue
  plane(200, 40, mat(fix(pelouse, 200, 40)), 0, 0.01, -25.7); plane(200, 40, mat(fix(pelouse, 200, 40)), 0, 0.01, 25.7);
  // les maisons (côté nord : la nôtre au centre ; côté sud : les voisins d'en face)
  const COLS = ['#d8cdb8', '#e6ddcb', '#cfc3ad', '#e2d6bf', '#d4c9b9'];
  const houses = [];
  function house(x, z, side, o = {}) {
    const gH = new THREE.Group(); gH.position.set(x, 0, z); if (side > 0) gH.rotation.y = Math.PI; world.add(gH);
    const w = o.w ?? 9 + R() * 2, d = o.d ?? 8, h = o.h ?? 5.6, wall = mat(crepi(o.col ?? COLS[(R() * COLS.length) | 0]));
    box(w, h, d, wall, gH, 0, h / 2, 0);
    const roof = new THREE.MeshStandardMaterial({ map: tuiles, roughness: 0.9 });
    const r = prism(d + 0.9, 2.6, w + 0.8, roof, gH, 0, h, 0); r.rotation.y = 0;   // faîtage le long de x
    box(w + 0.4, 0.25, d + 0.4, M('#e8e2d6'), gH, 0, h - 0.05, 0);
    // façade (vers la rue : +z dans le repère de la maison) : porte, fenêtres à volets, garage
    const fz = d / 2 + 0.02, lit = o.lit ?? [];
    const winGlass = (on) => new THREE.MeshStandardMaterial({ color: '#0f1418', emissive: '#ffb45e', emissiveIntensity: on ? 0.9 : 0, roughness: 0.2, metalness: 0.4 });
    const shutter = M('#6d7b85', { r: 0.8 });
    const WIN = [[-2.6, 1.6], [2.4, 1.6], [-2.6, 4.2], [0, 4.2], [2.4, 4.2]];
    WIN.forEach(([wx, wy], i) => { box(1.1, 1.25, 0.06, winGlass(lit.includes(i)), gH, wx, wy, fz); box(1.3, 0.1, 0.18, M('#ece7dc'), gH, wx, wy - 0.68, fz + 0.06);
      for (const sx of [-1, 1]) box(0.55, 1.3, 0.05, shutter, gH, wx + sx * 0.88, wy, fz + 0.03); });
    if (!o.noDoor) { box(1.0, 2.15, 0.08, M('#3d2b22', { r: 0.7 }), gH, -0.4, 1.08, fz); box(1.25, 0.12, 0.6, M('#bdb6aa'), gH, -0.4, 0.06, fz + 0.3); }
    houses.push(gH); return gH;
  }
  const MAIN = house(0, -15.0, -1, { w: 10, col: '#ddd2bd', lit: [], noDoor: false });
  for (const x of [-21, 21, -42, 42]) house(x + (R() - 0.5) * 2, -15.5, -1, { lit: R() < 0.3 ? [3] : [] });
  for (const x of [-30, -10, 10, 30, -50, 50]) house(x + (R() - 0.5) * 3, 14.5, 1, { lit: x === 10 ? [2] : [] });
  // muret + portail + haie devant chaque terrain (côté nord), avec l'allée de notre maison
  const wallM = mat(crepi('#e4dccb')), capM = M('#c8c0b0'), gateM = M('#2b3036', { r: 0.6, m: 0.3 });
  const segs = (gaps) => { const out = []; let x = -60; for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) { out.push([x, a]); x = b; } out.push([x, 60]); return out; };
  for (const s of [-1, 1]) {
    const zW = s * 5.9, gaps = s < 0 ? [[1.4, 5.1], [-1.25, -0.05], [19, 22.6], [-23.4, -19.8], [40, 43.6], [-44, -40.4]] : [[8.6, 11.4], [-11.4, -8.6], [28, 31.4], [-31.6, -28.2]];
    for (const [a, b] of segs(gaps)) {
      box(b - a, 1.0, 0.22, wallM, world, (a + b) / 2, 0.5, zW); box(b - a, 0.06, 0.3, capM, world, (a + b) / 2, 1.03, zW);
      box(b - a, 0.7, 0.6, mat(fix(haie, b - a, 1)), world, (a + b) / 2, 1.35, zW + s * 0.55);
    }
  }
  // le portail coulissant (ouvert) et le portillon
  for (let i = 0; i < 9; i++) box(0.04, 1.3, 0.04, gateM, world, 5.3 + i * 0.4, 0.65, -6.15);
  box(3.6, 0.06, 0.05, gateM, world, 6.9, 1.25, -6.15); box(3.6, 0.06, 0.05, gateM, world, 6.9, 0.2, -6.15);
  // l'allée pavée et le chemin vers la porte
  plane(3.7, 5.1, mat(fix(pave, 3.7, 5.1)), 3.25, 0.02, -8.45); plane(1.2, 5.1, mat(fix(pave, 1.2, 5.1)), -0.6, 0.02, -8.45);
  // un arbre dans le jardin, des arbustes
  const leafM = M('#2f4a24', { nc: true }), trunkM = M('#4a3a2c', { nc: true });
  const tree = (x, z, s = 1) => { cyl(0.12 * s, 0.18 * s, 3 * s, 6, trunkM, world, x, 1.5 * s, z); for (const [bx, by, bz, r] of [[0, 3.6, 0, 1.6], [0.9, 3.1, 0.3, 1.1], [-0.8, 3.3, -0.4, 1.2], [0.2, 4.5, 0.2, 1.1]]) add(new THREE.IcosahedronGeometry(r * s, 0), leafM, world, x + bx * s, by * s, z + bz * s); };
  tree(-6.5, -8.5, 1.1); tree(14, -9, 0.9); tree(-26, 9, 1.2); tree(24, 9, 1.0);
  // les réverbères (sodium : orange)
  const lamps = [];
  for (const [x, z] of [[9, -4.0], [-16, -4.0], [-3, 4.0], [22, 4.0], [34, -4.0], [-40, 4.0]]) {
    const s = Math.sign(z);
    cyl(0.06, 0.09, 6.5, 6, M('#3a3d42', { r: 0.5, m: 0.4 }), world, x, 3.25, z);
    box(0.08, 0.08, 1.4, M('#3a3d42'), world, x, 6.45, z - s * 0.65);
    box(0.36, 0.14, 0.6, new THREE.MeshStandardMaterial({ color: '#333', emissive: '#ffb066', emissiveIntensity: night ? 3 : 0 }), world, x, 6.36, z - s * 1.3);
    lamps.push(new THREE.Vector3(x, 6.25, z - s * 1.3));
  }
  scene.add(bake(world));
  // la lumière des réverbères (des projecteurs vers le bas ; les deux plus proches de la maison font des ombres)
  if (night) lamps.forEach((p, i) => {
    const L = new THREE.SpotLight('#ffa95c', i < 2 ? 260 : 160, 34, 1.05, 0.55, 1.6); L.position.copy(p); L.target.position.set(p.x, 0, p.z);
    if (i < 2) { L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.0008; L.shadow.normalBias = 0.03; }
    scene.add(L, L.target);
  });
  return { world, lamps, MAIN, door: new THREE.Vector3(-0.4, 1.1, -10.95), key: new THREE.Vector3(-1.0, 0.93, -11.7), drive: new THREE.Vector3(3.25, 0, -8.6) };
}

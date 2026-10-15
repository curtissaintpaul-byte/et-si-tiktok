// =====================================================================
//  LA VILLA FACE À LA MER (style « reconstitution », avec lib-ps2.js) — pour « Et si tu gagnais à l'EuroMillions ? » (v2)
//  Une villa moderne et blanche en haut d'une falaise : la terrasse en pierre, la piscine (l'eau bouge), deux transats,
//  des pins parasols, la rambarde en verre, et en bas la mer jusqu'à l'horizon. Le ciel change : coucher de soleil, nuit, jour.
//  Et deux « jouets » : une voiture de sport (générique, aucune vraie marque) et un petit jet privé.
//
//  const V = buildVilla(scene, { at });  → V.set('couchant' | 'nuit' | 'jour'), V.update(t), V.lights, V.edge (bord de la terrasse),
//                                           V.lounger (un transat), V.drive (l'allée de la voiture)
//  const car = makeSportsCar('#b3121b');  → un Group (l'avant vers +x)
//  const jet = makeJet();                 → un Group (le nez vers +x), jet.userData.lights
//  const sky = makeSkyDome(scene, R)      → sky.set(mode) (utilisé par buildVilla, et pour le plan du jet)
// =====================================================================
import { THREE, rng } from './engine.js';
import { pixTex } from './lib-ps2.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
const bx = (w, h, d, mat, p, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; p.add(m); return m; };

// --- le ciel : une grande sphère peinte (dégradé + soleil ou étoiles), qui ne prend ni la lumière ni le brouillard
function skyTex(mode) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (mode === 'couchant') { gr.addColorStop(0, '#1f2a55'); gr.addColorStop(0.32, '#5b4c86'); gr.addColorStop(0.45, '#e2766a'); gr.addColorStop(0.5, '#ffb46a'); gr.addColorStop(0.53, '#ffd9a0'); gr.addColorStop(0.56, '#3a4f7a'); gr.addColorStop(1, '#0d1a33'); }
  else if (mode === 'nuit') { gr.addColorStop(0, '#03050c'); gr.addColorStop(0.42, '#0b1430'); gr.addColorStop(0.5, '#253564'); gr.addColorStop(0.52, '#0a1226'); gr.addColorStop(1, '#03060d'); }
  else { gr.addColorStop(0, '#2f6fc4'); gr.addColorStop(0.42, '#7fb2ea'); gr.addColorStop(0.5, '#d8ecff'); gr.addColorStop(0.52, '#8fb6d8'); gr.addColorStop(1, '#2d5d86'); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  if (mode === 'nuit') { const r = rng(5); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; g.fillRect(r() * 64, r() * 118, 1, 1); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}
export function makeSkyDome(scene, radius = 1500) {
  const tex = { couchant: skyTex('couchant'), nuit: skyTex('nuit'), jour: skyTex('jour') };
  const m = new THREE.MeshBasicMaterial({ map: tex.couchant, side: THREE.BackSide, fog: false, depthWrite: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), m); dome.renderOrder = -10; scene.add(dome);
  // le soleil (couchant) / la lune (nuit) : un disque qui brille, posé loin dans le ciel
  const sunM = new THREE.MeshBasicMaterial({ color: '#ffe2a8', fog: false, transparent: true });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.026, 24), sunM); scene.add(sun);
  return { dome, sun, set(mode) { m.map = tex[mode]; m.needsUpdate = true; sun.visible = mode !== 'jour'; sunM.color.set(mode === 'nuit' ? '#dfe6ff' : '#ffd9a0'); sun.scale.setScalar(mode === 'nuit' ? 0.5 : 1); } };
}

// --- l'eau de la piscine : une texture de reflets qui glisse
function poolTex() {
  return pixTex(64, 64, (g, w, h) => { g.fillStyle = '#1fb2c8'; g.fillRect(0, 0, w, h); const r = rng(9); g.strokeStyle = 'rgba(220,255,255,0.55)'; g.lineWidth = 1;
    for (let i = 0; i < 26; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 14; y += (r() - 0.5) * 14; g.lineTo(x, y); } g.stroke(); } }, [3, 2]);
}
function seaTex() {
  return pixTex(128, 128, (g, w, h) => { g.fillStyle = '#1d3f66'; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,30,0.18)'; g.fillRect(r() * w | 0, r() * h | 0, 3 + r() * 6 | 0, 1); } }, [60, 60]);
}

export function makePine(seed = 1, h = 9) {
  const r = rng(seed), G = new THREE.Group();
  const bark = std({ color: '#5a4636' }), leaf = std({ color: '#3e5a35', roughness: 0.95 });
  const lean = (r() - 0.5) * 0.25, trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, h, 6), bark); trunk.position.set(lean * h / 2, h / 2, 0); trunk.rotation.z = -lean; trunk.castShadow = true; G.add(trunk);
  for (let i = 0; i < 5; i++) { const s = 2.2 + r() * 1.6; const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), leaf); c.scale.set(s, 0.55 + r() * 0.3, s * (0.8 + r() * 0.3)); c.position.set(lean * h + (r() - 0.5) * 3, h + (r() - 0.3) * 0.9, (r() - 0.5) * 3); c.castShadow = true; G.add(c); }
  return G;
}

export function buildVilla(scene, { at = V3(600, 0, 0) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const stone = std({ map: pixTex(32, 32, (g, w, h) => { g.fillStyle = '#d9cbb2'; g.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.08)'; g.fillRect(r() * w | 0, r() * h | 0, 2, 2); } g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1); for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h); }, [10, 8]) });
  const white = std({ color: '#f1ede4', roughness: 0.8 }), dark = std({ color: '#2a2c30', roughness: 0.5, metalness: 0.3 }), wood = std({ color: '#8a5f3e' });
  // la terrasse (y = 0), qui s'arrête au bord de la falaise (z = 8)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(44, 0.4, 26), stone); deck.position.set(0, -0.2, -5); deck.receiveShadow = true; G.add(deck);
  // la falaise : des gros blocs de roche qui tombent vers la mer (y = -38)
  const rock = std({ color: '#9b8a74', roughness: 1, flatShading: true }), r = rng(21);
  for (let i = 0; i < 26; i++) { const s = 6 + r() * 9; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rock); m.position.set(-30 + i * 2.6 + (r() - 0.5) * 3, -8 - r() * 26, 10 + r() * 6); m.rotation.set(r() * 3, r() * 3, r() * 3); m.receiveShadow = true; G.add(m); }
  const SEA_Y = -38;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ map: seaTex(), roughness: 0.42, metalness: 0.25, color: '#9fb6d6' })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, SEA_Y, 0); G.add(sea);
  // la villa : deux blocs blancs, de grandes baies vitrées (elles s'allument la nuit), un toit plat qui déborde
  const glassDay = new THREE.MeshStandardMaterial({ color: '#2b3a4a', roughness: 0.08, metalness: 0.6 });
  const glassM = new THREE.MeshStandardMaterial({ color: '#2b3a4a', roughness: 0.08, metalness: 0.6, emissive: '#ffcf8a', emissiveIntensity: 0 });
  bx(16, 3.4, 8, white, G, -2, 1.7, -13); bx(10, 3.0, 7, white, G, -5, 4.9, -13.5);
  bx(17, 0.25, 9.4, white, G, -2, 3.5, -12.4); bx(11, 0.25, 8.4, white, G, -5, 6.5, -12.8);
  const win1 = bx(13, 2.6, 0.08, glassM, G, -1, 1.45, -8.98), win2 = bx(8, 2.2, 0.08, glassM, G, -5, 4.85, -9.98);
  for (const x of [-7.5, -4, -0.5, 3, 5.5]) bx(0.12, 2.6, 0.14, dark, G, x, 1.45, -8.92);
  // la piscine : un bassin creusé (le bord en pierre, l'eau turquoise qui bouge), éclairée de l'intérieur la nuit
  const PW = 10, PD = 4.4, PX = 2.5, PZ = -1.5;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), new THREE.MeshStandardMaterial({ map: poolTex(), roughness: 0.15, metalness: 0.1, emissive: '#0d6f80', emissiveIntensity: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.set(PX, 0.02, PZ); G.add(water);
  const cope = std({ color: '#efe6d6' });
  bx(PW + 0.8, 0.08, 0.4, cope, G, PX, 0.04, PZ - PD / 2 - 0.2); bx(PW + 0.8, 0.08, 0.4, cope, G, PX, 0.04, PZ + PD / 2 + 0.2); bx(0.4, 0.08, PD, cope, G, PX - PW / 2 - 0.2, 0.04, PZ); bx(0.4, 0.08, PD, cope, G, PX + PW / 2 + 0.2, 0.04, PZ);
  const poolL = new THREE.PointLight('#5fe3ff', 0, 9, 1.4); poolL.position.set(PX, 0.4, PZ); G.add(poolL);
  // deux transats (bois + coussins blancs) et une petite table avec un verre
  const cushion = std({ color: '#f6f3ec' });
  const lounger = (x, z, ry) => { const L = new THREE.Group(); L.position.set(x, 0, z); L.rotation.y = ry; G.add(L); bx(0.75, 0.32, 1.9, wood, L, 0, 0.16, 0); bx(0.7, 0.08, 1.3, cushion, L, 0, 0.36, 0.28); const back = bx(0.7, 0.08, 0.75, cushion, L, 0, 0.62, -0.62); back.rotation.x = -0.75; return L; };
  const L1 = lounger(4.0, 2.8, Math.PI), L2 = lounger(5.3, 2.8, Math.PI);
  bx(0.45, 0.45, 0.45, wood, G, 4.65, 0.225, 2.2); const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.14, 8), new THREE.MeshStandardMaterial({ color: '#ffb35a', transparent: true, opacity: 0.8, roughness: 0.1 })); glass.position.set(4.65, 0.52, 2.2); G.add(glass);
  // la rambarde en verre au bord (z = 7.8), des pins parasols, des pots
  const rail = new THREE.Mesh(new THREE.BoxGeometry(40, 1.05, 0.04), new THREE.MeshStandardMaterial({ color: '#cfe2ee', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.4 })); rail.position.set(0, 0.52, 7.8); G.add(rail);
  bx(40, 0.06, 0.08, std({ color: '#c8c8c8', metalness: 0.7, roughness: 0.3 }), G, 0, 1.06, 7.8);
  for (const [x, z, s, h] of [[-25, 6, 3, 10], [12, -4, 7, 8.5], [16, 4, 11, 9.5], [-24, -9, 15, 8]]) { const p = makePine(s, h); p.position.set(x, 0, z); G.add(p); }
  for (const x of [-9, -6.5]) { bx(0.7, 0.7, 0.7, std({ color: '#b26b46' }), G, x, 0.35, -7.8); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), std({ color: '#4c6e3e' })); b.position.set(x, 1.1, -7.8); G.add(b); }
  // l'allée (côté -x) où se gare la voiture
  const gravel = new THREE.Mesh(new THREE.PlaneGeometry(12, 22), std({ map: pixTex(16, 16, (g, w, h) => { g.fillStyle = '#c8bda8'; g.fillRect(0, 0, w, h); const r2 = rng(2); for (let i = 0; i < 60; i++) { g.fillStyle = r2() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.15)'; g.fillRect(r2() * w | 0, r2() * h | 0, 1, 1); } }, [6, 10]) }));
  gravel.rotation.x = -Math.PI / 2; gravel.position.set(-17, 0.012, -3); gravel.receiveShadow = true; G.add(gravel);
  // les lumières : le soleil (bas, en face, vers +z), le ciel, la piscine, les baies vitrées la nuit
  const sky = makeSkyDome(scene, 1500); sky.dome.position.copy(at); sky.sun.position.copy(at).add(V3(260, 70, 1450)); sky.sun.lookAt(at);
  const sunL = new THREE.DirectionalLight('#ffb06a', 0); sunL.position.copy(at).add(V3(18, 9, 40)); sunL.target.position.copy(at).add(V3(0, 0, -4)); sunL.castShadow = true;
  sunL.shadow.mapSize.set(2048, 2048); Object.assign(sunL.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 1, far: 120 }); sunL.shadow.bias = -0.0006; scene.add(sunL, sunL.target);
  const amb = new THREE.HemisphereLight('#8f8ec4', '#5a4636', 0); G.add(amb);
  const winL = new THREE.PointLight('#ffcf8a', 0, 14, 1.4); winL.position.set(-1, 2, -6.5); G.add(winL);
  const gardenL = new THREE.PointLight('#ffb871', 0, 12, 1.5); gardenL.position.set(-10, 2.4, 0); G.add(gardenL);
  const MODES = {
    couchant: { sun: 2.2, sunC: '#ffaa66', amb: 0.55, win: 0, pool: 0, glow: 0.0, garden: 0, fog: ['#c98d79', 120, 1400] },
    nuit: { sun: 0.25, sunC: '#7f93d8', amb: 0.14, win: 5, pool: 9, glow: 0.45, garden: 4, fog: ['#0a1124', 80, 1300] },
    jour: { sun: 3.0, sunC: '#fff2df', amb: 0.9, win: 0, pool: 0, glow: 0.0, garden: 0, fog: ['#a9c8e6', 200, 1800] },
  };
  let mode = 'couchant';
  return {
    root: G, at, sky, sunL, amb, winL, poolL, gardenL, lights: [sunL, winL, poolL, gardenL], edge: at.clone().add(V3(0, 0, 7.4)), lounger: L1, lounger2: L2,
    drive: at.clone().add(V3(-17, 0, -3)), pool: at.clone().add(V3(PX, 0, PZ)), seaY: at.y + SEA_Y, glass,
    set(m, k = 1) {
      mode = m; const M = MODES[m]; sky.set(m); sunL.color.set(M.sunC); sunL.intensity = M.sun * k; amb.intensity = M.amb * k; winL.intensity = M.win * k; poolL.intensity = M.pool * k; gardenL.intensity = M.garden * k;
      glassM.emissiveIntensity = M.glow; return M.fog;
    },
    off() { sunL.intensity = amb.intensity = winL.intensity = poolL.intensity = gardenL.intensity = 0; },
    update(t) { water.material.map.offset.set(t * 0.03, t * 0.017); sea.material.map.offset.set(t * 0.002, t * 0.004); },
  };
}

// --- la voiture de sport (générique) : un profil extrudé, une bulle vitrée, quatre roues ; l'avant vers +x
export function makeSportsCar(color = '#b3121b') {
  const G = new THREE.Group();
  const s = new THREE.Shape(); const P = [[-2.25, 0.32], [-2.28, 0.78], [-1.9, 0.86], [-1.2, 0.98], [-0.75, 1.17], [0.15, 1.2], [0.75, 0.96], [1.6, 0.8], [2.2, 0.66], [2.32, 0.42], [2.25, 0.3]];
  s.moveTo(...P[0]); for (const p of P.slice(1)) s.lineTo(...p); s.closePath();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.55 });
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.08, bevelSegments: 1 }), paint);
  body.position.z = -0.95; body.castShadow = body.receiveShadow = true; G.add(body);
  // la bulle vitrée (un peu plus étroite que la caisse)
  const w = new THREE.Shape(); const W = [[-1.15, 0.97], [-0.72, 1.14], [0.12, 1.17], [0.7, 0.95], [-1.15, 0.95]]; w.moveTo(...W[0]); for (const p of W.slice(1)) w.lineTo(...p); w.closePath();
  const glassM = new THREE.MeshStandardMaterial({ color: '#0e1318', roughness: 0.05, metalness: 0.8 });
  const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(w, { depth: 1.62, bevelEnabled: false }), glassM); glass.position.set(0, 0.03, -0.81); G.add(glass);
  // les roues (pneus noirs, jantes argent)
  const tire = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: '#c9c9c9', roughness: 0.25, metalness: 0.9 });
  for (const [x, z] of [[-1.45, 0.92], [-1.45, -0.92], [1.42, 0.92], [1.42, -0.92]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 16), tire); t.rotation.x = Math.PI / 2; t.position.set(x, 0.36, z); t.castShadow = true; G.add(t);
    const rr = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.31, 10), rim); rr.rotation.x = Math.PI / 2; rr.position.copy(t.position); G.add(rr);
  }
  // les phares (devant) et les feux (derrière)
  const head = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4dd', emissiveIntensity: 0.6 }), tail = new THREE.MeshStandardMaterial({ color: '#600', emissive: '#ff1a1a', emissiveIntensity: 0.8 });
  for (const z of [0.62, -0.62]) { bx(0.08, 0.07, 0.36, head, G, 2.31, 0.55, z); bx(0.06, 0.06, 0.42, tail, G, -2.33, 0.7, z); }
  bx(0.05, 0.12, 1.3, std({ color: '#151515' }), G, 2.33, 0.36, 0);   // la calandre
  return G;
}

// --- le jet privé : fuselage, nez, ailes en flèche, empennage en T, deux réacteurs à l'arrière ; le nez vers +x
export function makeJet() {
  const G = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: '#f4f5f7', roughness: 0.3, metalness: 0.3 }), stripe = new THREE.MeshStandardMaterial({ color: '#b08a3e', roughness: 0.4, metalness: 0.6 });
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 11, 16), paint); fus.rotation.z = Math.PI / 2; G.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), paint); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 2.4, 1); nose.position.x = 5.5; G.add(nose);
  const tailc = new THREE.Mesh(new THREE.ConeGeometry(0.95, 4.2, 16), paint); tailc.rotation.z = Math.PI / 2; tailc.position.set(-7.6, 0.25, 0); tailc.scale.set(1, 1, 0.85); G.add(tailc);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.965, 0.965, 9.5, 16, 1, true, Math.PI * 0.42, Math.PI * 0.16), stripe); band.rotation.z = Math.PI / 2; G.add(band);
  // les hublots
  const winM = new THREE.MeshStandardMaterial({ color: '#10161d', roughness: 0.1, metalness: 0.6 });
  for (let i = 0; i < 7; i++) for (const z of [0.93, -0.93]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.17, 10), winM); w.position.set(2.6 - i * 1.0, 0.25, z); w.rotation.y = z > 0 ? 0 : Math.PI; G.add(w); }
  const cock = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 1.5), winM); cock.position.set(6.1, 0.55, 0); cock.rotation.z = -0.45; G.add(cock);
  // les ailes : un trapèze extrudé, en flèche
  const ws = new THREE.Shape(); ws.moveTo(0.9, 0); ws.lineTo(-1.6, 0); ws.lineTo(-3.4, 7.2); ws.lineTo(-2.4, 7.2); ws.closePath();
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.18, bevelEnabled: false });
  for (const sgn of [1, -1]) { const w = new THREE.Mesh(wg, paint); w.rotation.x = sgn * Math.PI / 2; w.position.set(0, -0.45, 0); w.scale.z = sgn; G.add(w);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.08), paint); tip.position.set(-3.0, 0.05, sgn * 7.2); tip.rotation.z = 0.35; G.add(tip); }
  // l'empennage en T et les réacteurs
  const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(-2.4, 0); fs.lineTo(-3.4, 2.6); fs.lineTo(-2.4, 2.6); fs.closePath();
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.14, bevelEnabled: false }), paint); fin.position.set(-5.6, 0.7, -0.07); G.add(fin);
  const hs = new THREE.Shape(); hs.moveTo(0, 0); hs.lineTo(-1.2, 0); hs.lineTo(-1.9, 3.0); hs.lineTo(-1.2, 3.0); hs.closePath();
  const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.1, bevelEnabled: false });
  for (const sgn of [1, -1]) { const h = new THREE.Mesh(hg, paint); h.rotation.x = sgn * Math.PI / 2; h.scale.z = sgn; h.position.set(-8.0, 3.3, 0); G.add(h); }
  const engM = new THREE.MeshStandardMaterial({ color: '#d9dadd', roughness: 0.35, metalness: 0.5 });
  for (const z of [1.45, -1.45]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 2.6, 14), engM); e.rotation.z = Math.PI / 2; e.position.set(-4.4, 0.55, z); G.add(e);
    const py = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.6), paint); py.position.set(-4.3, 0.55, z * 0.72); G.add(py); }
  // les feux de position (rouge à gauche, vert à droite) et le flash blanc de la queue
  const red = new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false }), green = new THREE.MeshBasicMaterial({ color: '#2aff6a', toneMapped: false }), flash = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const l1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), red); l1.position.set(-3.0, -0.3, -7.25); G.add(l1);
  const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), green); l2.position.set(-3.0, -0.3, 7.25); G.add(l2);
  const l3 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), flash); l3.position.set(-9.7, 0.4, 0); G.add(l3);
  G.userData.flash = l3; G.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return G;
}

// --- des nuages : des boules blanches regroupées (sous le jet)
export function makeClouds(scene, { at = V3(0, 0, 0), n = 60, spread = 1600, seed = 8 } = {}) {
  const r = rng(seed), G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
  for (let i = 0; i < n; i++) { const c = new THREE.Group(); c.position.set((r() - 0.5) * spread, (r() - 0.5) * 30, (r() - 0.5) * spread);
    for (let k = 0; k < 5; k++) { const s = 18 + r() * 30; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), m); b.scale.set(s * 1.4, s * 0.6, s); b.position.set((r() - 0.5) * 70, (r() - 0.3) * 12, (r() - 0.5) * 50); c.add(b); }
    G.add(c); }
  return G;
}

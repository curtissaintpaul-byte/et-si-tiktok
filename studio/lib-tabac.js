// =====================================================================
//  LE BUREAU DE TABAC DE VILLAGE (style « reconstitution », avec lib-ps2.js) — pour « Et si tu gagnais à l'EuroMillions ? »
//  Un comptoir en bois avec sa vitrine, le terminal de jeux, le présentoir des jeux à gratter (couleurs génériques, aucune
//  vraie marque), des étagères, la porte vitrée qui donne sur la rue du village le soir (avec la « carotte » rouge du tabac).
//  Et LE TICKET : une grille générique (5 numéros + 2 étoiles), dessinée sur une texture qui peut cocher les bons numéros.
//
//  const TB = buildTabac(scene, { at });   → TB.counter (où se placer), TB.clerk (place du buraliste), TB.lights
//  const TK = makeTicket({ nums, stars }); → TK.mesh ; TK.mark(k) : k numéros cochés (0 → 7) ; TK.pt(i) : position d'un numéro
//  const TV = makeTV({ nums, stars });     → TV.root ; TV.draw(k) : k boules tirées à l'écran
// =====================================================================
import { THREE, rng, clamp } from './engine.js';
import { pixTex } from './lib-ps2.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
const bx = (w, h, d, mat, p, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; p.add(m); return m; };

export function buildTabac(scene, { at = V3(0, 0, -300) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const W = 6, D = 5, H = 2.8;
  const tile = pixTex(32, 32, (g, w, h) => { g.fillStyle = '#b9ab95'; g.fillRect(0, 0, w, h); g.fillStyle = '#8f8270'; for (let i = 0; i < w; i += 8) { g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } }, 8);
  const wallT = pixTex(32, 32, (g, w, h) => { const r = rng(91); g.fillStyle = '#d9c8a4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 200; i++) { g.fillStyle = 'rgba(120,90,50,.08)'; g.fillRect(r() * w | 0, r() * h | 0, 2, 1); } }, 3);
  const wall = std({ map: wallT }), wood = std({ color: '#6b4126', roughness: 0.6 }), dark = std({ color: '#2a2622' });
  bx(W, 0.05, D, std({ map: tile }), G, 0, -0.025, 0); bx(W, 0.05, D, std({ color: '#efe9de' }), G, 0, H + 0.025, 0);
  bx(0.1, H, D, wall, G, -W / 2, H / 2, 0); bx(W, H, 0.1, wall, G, 0, H / 2, -D / 2);
  // le mur de devant (côté +z) avec la porte vitrée et la vitrine : on voit la rue du soir
  bx(1.2, H, 0.1, wall, G, -W / 2 + 0.6, H / 2, D / 2); bx(1.4, H, 0.1, wall, G, W / 2 - 0.7, H / 2, D / 2); bx(W, 0.5, 0.1, wall, G, 0, H - 0.25, D / 2); bx(3.4, 0.6, 0.1, wall, G, 0.0, 0.3, D / 2);
  const street = pixTex(128, 64, (g, w, h) => { const r = rng(93); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d2340'); gr.addColorStop(0.6, '#c8714a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) { const hh = 22 + r() * 14; g.fillStyle = '#3a2f2c'; g.fillRect(x, h - hh, 17, hh); g.fillStyle = '#4a3a33'; g.beginPath(); g.moveTo(x - 1, h - hh); g.lineTo(x + 8, h - hh - 7); g.lineTo(x + 18, h - hh); g.fill();
      for (let k = 0; k < 3; k++) if (r() < 0.6) { g.fillStyle = '#ffcb73'; g.fillRect(x + 3 + k * 5, h - hh + 6, 2, 3); } }
    g.fillStyle = '#2b2a2c'; g.fillRect(0, h - 8, w, 8); });
  const view = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: street, fog: false })); view.position.set(0, 2.5, D / 2 + 5); view.rotation.y = Math.PI; G.add(view);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshStandardMaterial({ color: '#a8c0d8', transparent: true, opacity: 0.12, roughness: 0.05 })); glass.position.set(0, 1.45, D / 2); glass.rotation.y = Math.PI; G.add(glass);
  // la « carotte » rouge du tabac, dehors, au-dessus de la porte
  const carot = pixTex(32, 64, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.fillStyle = '#d1261d'; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w, h / 2); g.lineTo(w / 2, h); g.lineTo(0, h / 2); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText('TABAC', w / 2, h / 2 + 3); });
  const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.0), new THREE.MeshBasicMaterial({ map: carot, transparent: true, toneMapped: false })); cm.position.set(-2.1, 2.3, D / 2 + 0.4); cm.rotation.y = Math.PI; G.add(cm);
  // le comptoir (le long de x, devant le mur du fond), sa vitrine, le terminal de jeux, le lecteur de carte
  const CZ = -1.0;
  bx(3.6, 1.05, 0.7, wood, G, 0, 0.525, CZ); bx(3.7, 0.05, 0.8, std({ color: '#3d2416', roughness: 0.4 }), G, 0, 1.075, CZ);
  const vit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.5), new THREE.MeshStandardMaterial({ color: '#c8dde8', transparent: true, opacity: 0.25, roughness: 0.05 })); vit.position.set(-0.9, 1.28, CZ); G.add(vit);
  const scrT = pixTex(48, 32, (g, w, h) => { g.fillStyle = '#0e3b7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd34d'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('JEUX', w / 2, 14); g.fillStyle = '#fff'; g.font = '7px sans-serif'; g.fillText('VALIDER', w / 2, 26); });
  bx(0.32, 0.26, 0.06, dark, G, 0.75, 1.3, CZ - 0.12); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false })); scr.position.set(0.75, 1.3, CZ - 0.088); G.add(scr);
  bx(0.25, 0.1, 0.3, std({ color: '#d8d8d4' }), G, 0.35, 1.15, CZ - 0.1);   // l'imprimante à tickets
  bx(0.09, 0.03, 0.15, dark, G, 1.2, 1.115, CZ + 0.15);                    // le lecteur de carte
  // le présentoir des jeux à gratter (couleurs génériques) et les étagères du fond
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const col = ['#e84c3d', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'][(r * 3 + c * 5) % 6]; bx(0.16, 0.24, 0.02, std({ color: col, roughness: 0.5 }), G, -1.4 + c * 0.2, 1.55 + r * 0.28, -D / 2 + 0.08); }
  for (let r = 0; r < 4; r++) { bx(1.8, 0.03, 0.3, wood, G, 1.6, 1.3 + r * 0.38, -D / 2 + 0.18); for (let c = 0; c < 9; c++) bx(0.14, 0.26, 0.2, std({ color: ['#c9c2b0', '#8a8f96', '#d8d3c4', '#a59a85'][(r + c) % 4] }), G, 0.85 + c * 0.19, 1.45 + r * 0.38, -D / 2 + 0.2); }
  const signT = pixTex(96, 24, (g, w, h) => { g.fillStyle = '#7a1f1a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe9b0'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('JEUX · PRESSE', w / 2, 17); });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: signT, emissive: '#ffffff', emissiveMap: signT, emissiveIntensity: 0.3 })); sg.position.set(-0.8, 2.55, -D / 2 + 0.06); G.add(sg);
  // les présentoirs à journaux (devant, à gauche)
  bx(0.8, 1.2, 0.4, wood, G, -2.4, 0.6, 0.8); for (let k = 0; k < 4; k++) bx(0.32, 0.42, 0.02, std({ color: '#ece6da' }), G, -2.4 + (k % 2 - 0.5) * 0.36, 0.9 + Math.floor(k / 2) * 0.3, 1.02);
  // les lumières : des plafonniers chauds
  const L1 = new THREE.PointLight('#ffe2b8', 0, 7, 1.4); L1.position.set(-0.8, 2.6, -0.2); G.add(L1);
  const L2 = new THREE.PointLight('#ffe2b8', 0, 7, 1.4); L2.position.set(1.2, 2.6, 0.8); G.add(L2);
  const amb = new THREE.HemisphereLight('#fff1dc', '#3a2c20', 0); G.add(amb);
  for (const p of [L1.position, L2.position]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 12), new THREE.MeshBasicMaterial({ color: '#fff3d6' })); m.position.copy(p).add(V3(0, 0.17, 0)); G.add(m); }
  return { root: G, at, W, D, H, counterFront: V3(0.4, 0, CZ + 0.75).add(at), clerk: V3(0.4, 0, CZ - 0.65).add(at), counterTop: V3(0.4, 1.1, CZ + 0.2).add(at), lights: [L1, L2], amb, on(k = 1) { L1.intensity = L2.intensity = 14 * k; amb.intensity = 0.5 * k; } };
}

// =====================================================================
//  LE TICKET : une grille générique. 5 numéros + 2 étoiles, imprimés ; mark(k) entoure les k premiers en rouge.
// =====================================================================
export function makeTicket({ nums = [7, 12, 23, 34, 45], stars = [3, 9], price = '2,50 €' } = {}) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 224; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const spots = [];   // (u, v) de chaque numéro, pour accrocher les étiquettes
  let shown = -1;
  function mark(k) {
    k = Math.round(k); if (k === shown) return; shown = k;
    g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, 128, 224); g.fillStyle = '#1b1b1b'; g.textAlign = 'center';
    g.font = 'bold 13px monospace'; g.fillText('GRILLE', 64, 22); g.font = '9px monospace'; g.fillText('MARDI · TIRAGE 21H05', 64, 36);
    g.fillRect(10, 44, 108, 1);
    g.font = '9px monospace'; g.fillText('NUMEROS', 64, 60); g.font = 'bold 14px monospace'; spots.length = 0;
    nums.forEach((n, i) => { const x = 18 + i * 23, y = 82; g.fillText(String(n).padStart(2, '0'), x, y); spots.push([x / 128, y / 224]); if (i < k) { g.strokeStyle = '#d0201a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 5, 10, 0, 7); g.stroke(); } });
    g.font = '9px monospace'; g.fillText('ETOILES', 64, 110); g.font = 'bold 14px monospace';
    stars.forEach((n, i) => { const x = 46 + i * 36, y = 132; g.fillText('*' + String(n).padStart(2, '0'), x, y); spots.push([x / 128, y / 224]); if (5 + i < k) { g.strokeStyle = '#d0201a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 5, 13, 0, 7); g.stroke(); } });
    g.fillRect(10, 146, 108, 1); g.font = 'bold 13px monospace'; g.fillText('MISE ' + price, 64, 168);
    g.font = '8px monospace'; for (let i = 0; i < 4; i++) g.fillText('|| ||| | || |||| | ||'.slice(0, 18 + i), 64, 186 + i * 8);
    tex.needsUpdate = true;
  }
  mark(0);
  const TW = 0.08, TH = 0.14;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TW, TH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  /** position 3D (monde) du numéro i (0-4) ou de l'étoile (5-6) */
  const pt = (i) => { const [u, v] = spots[i]; mesh.updateMatrixWorld(true); return mesh.localToWorld(V3((u - 0.5) * TW, (0.5 - v) * TH, 0.002)); };
  return { mesh, mark, pt, size: [TW, TH] };
}

// =====================================================================
//  LA TÉLÉ : l'écran montre le tirage (les boules sortent une par une)
// =====================================================================
export function makeTV({ nums = [7, 12, 23, 34, 45], stars = [3, 9] } = {}) {
  const G = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 160; c.height = 90; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.06), std({ color: '#111', roughness: 0.4 })); body.position.y = 0.3; G.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.53), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.set(0, 0.3, 0.031); G.add(scr);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.18), std({ color: '#111' })); G.add(foot);
  const light = new THREE.PointLight('#9fc0ff', 0, 4, 1.5); light.position.set(0, 0.3, 0.5); G.add(light);
  let shown = -1;
  function draw(k, t = 0) {
    const kk = Math.round(k * 4) / 4; if (kk === shown) return; shown = kk;
    const gr = g.createLinearGradient(0, 0, 0, 90); gr.addColorStop(0, '#0b1d4a'); gr.addColorStop(1, '#1f4fa0'); g.fillStyle = gr; g.fillRect(0, 0, 160, 90);
    g.fillStyle = '#ffd34d'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('TIRAGE DU MARDI', 80, 13);
    const all = [...nums.map((n) => [n, false]), ...stars.map((n) => [n, true])];
    all.forEach(([n, st], i) => { if (i >= k) return; const x = 16 + i * 21.5, y = 52; g.fillStyle = st ? '#ffd34d' : '#f4f4f4'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = st ? '#7a4a00' : '#0b1d4a'; g.font = 'bold 9px sans-serif'; g.fillText(String(n), x, y + 3); });
    g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '7px sans-serif'; g.fillText('5 NUMÉROS · 2 ÉTOILES', 80, 80);
    tex.needsUpdate = true;
  }
  draw(0);
  return { root: G, draw, light };
}

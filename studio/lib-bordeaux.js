// =====================================================================
//  BORDEAUX (style « reconstitution », avec lib-ps2.js) — pour « Et si tu lâchais ton téléphone pendant 30 jours ? »
//  (parties 1 et 2 : telephone-1, telephone-2). Trois décors, construits loin les uns des autres comme des décors de théâtre :
//
//  const CH = buildChambre(scene, { at });  → la chambre d'étudiante de Sarah : lit, table de nuit AVEC UN TIROIR qui s'ouvre
//       (CH.drawer(k), k de 0 à 1), le réveil (CH.clock('03:04')), la porte (CH.door(k)), la fenêtre sur les toits de
//       Bordeaux et la flèche Saint-Michel (CH.view('nuit' | 'jour' | 'soir')), le bureau ; CH.light(mode) règle les lampes.
//  const QU = buildQuais(scene, { at, bench, benchYaw });  → les quais de la Garonne : la promenade, le miroir d'eau (avec
//       le reflet des façades), les façades en pierre blonde de la place de la Bourse, le fleuve couleur café au lait, le pont
//       de pierre au loin, des lampadaires, un banc (face au fleuve ; QU.seat(dx) = où poser quelqu'un d'assis, QU.benchYaw =
//       sa direction), des platanes (pas devant la Bourse). QU.on(k) allume le soleil.
//  const BI = buildBiblio(scene, { at });   → une grande salle de lecture : longues tables, lampes vertes, rayonnages, baies vitrées.
//  makePhone() → le téléphone (écran allumé ou éteint : ph.screen(on)), makeBook(couleur) → un livre.
// =====================================================================
import { THREE, rng } from './engine.js';
import { pixTex } from './lib-ps2.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.88, ...o });
const mesh = (geo, mat, p, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; p.add(m); return m; };
const bx = (w, h, d, mat, p, x, y, z, ry) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, x, y, z, ry);
/** une boîte posée par ses bornes (x0..x1, y0..y1, z0..z1) */
const bb = (x0, x1, y0, y1, z0, z1, mat, p) => bx(x1 - x0, y1 - y0, z1 - z0, mat, p, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

// =====================================================================
//  LE TÉLÉPHONE et LE LIVRE
// =====================================================================
export function makePhone() {
  const G = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), std({ color: '#141416', roughness: 0.35 })); G.add(body);
  const feed = pixTex(48, 96, (g, w, h) => {   // un fil de réseau social : des photos, des pastilles, des lignes de texte
    g.fillStyle = '#f4f4f6'; g.fillRect(0, 0, w, h); const r = rng(12);
    for (let y = 4; y < h; y += 30) { g.fillStyle = '#d64f6b'; g.beginPath(); g.arc(7, y + 3, 3, 0, 7); g.fill(); g.fillStyle = '#bbb'; g.fillRect(13, y + 2, 18, 2);
      g.fillStyle = ['#7aa6d8', '#e8a65a', '#6fbf8e', '#c47ad8'][(r() * 4) | 0]; g.fillRect(3, y + 9, w - 6, 16); }
  });
  const scrM = new THREE.MeshBasicMaterial({ map: feed, toneMapped: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.145), scrM); scr.position.z = 0.0047; G.add(scr);
  const offM = new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.15 });
  G.userData.screen = (on) => { scr.material = on ? scrM : offM; };
  G.screen = G.userData.screen;
  return G;
}
export function makeBook(color = '#8a2f2a') {
  const G = new THREE.Group();
  bx(0.15, 0.22, 0.028, std({ color }), G, 0, 0, 0);
  bx(0.142, 0.212, 0.03, std({ color: '#efe8d6' }), G, 0.006, 0, 0);
  return G;
}

// =====================================================================
//  LA VUE DEPUIS LA FENÊTRE : les toits de Bordeaux (zinc et tuiles), les cheminées, la flèche Saint-Michel
// =====================================================================
// La toile est posée à 3 m derrière la fenêtre et cadrée pour la caméra fixe de la chambre : par la fenêtre, on voit le
// haut des toits (bas de la toile), la flèche Saint-Michel et le ciel (haut de la toile). 160 × 140 pixels pour 3,2 m × 2,8 m.
function bordeauxTex(mode) {
  const night = mode === 'nuit', soir = mode === 'soir';
  return pixTex(160, 140, (g, W, H) => {
    const r = rng(night ? 31 : soir ? 33 : 32);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.62);
    if (night) { sky.addColorStop(0, '#05070f'); sky.addColorStop(1, '#1d1c30'); }
    else if (soir) { sky.addColorStop(0, '#1c2448'); sky.addColorStop(0.7, '#5a4a6e'); sky.addColorStop(1, '#c4806a'); }
    else { sky.addColorStop(0, '#7fa9de'); sky.addColorStop(1, '#d9e4ec'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (night) for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(r() * W | 0, r() * H * 0.45 | 0, 1, 1); }
    if (!night && !soir) for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(255,255,255,.55)'; const cx = r() * W, cy = 12 + r() * 30; g.fillRect(cx | 0, cy | 0, 14 + r() * 16 | 0, 3); g.fillRect(cx + 4 | 0, cy - 2 | 0, 8, 2); }
    // la flèche Saint-Michel, au loin : une tour carrée, puis une longue pointe
    const fx = W * 0.56, fy = H * 0.66;
    g.fillStyle = night ? '#2c2b36' : soir ? '#3d3446' : '#b7a98e';
    g.fillRect(fx - 4, fy - 22, 8, 22);
    g.beginPath(); g.moveTo(fx - 4, fy - 22); g.lineTo(fx, fy - 60); g.lineTo(fx + 4, fy - 22); g.fill();
    for (const dx of [-5, 4]) { g.fillRect(fx + dx, fy - 28, 1, 7); }
    if (night) { g.fillStyle = 'rgba(255,214,150,.6)'; g.fillRect(fx - 1, fy - 48, 2, 26); }
    // deux rangées de toits (tuiles orange et zinc gris), avec des cheminées et des fenêtres ; la plus proche en bas
    for (let row = 0; row < 2; row++) {
      const y0 = H * (0.66 + row * 0.17), sc = 1 + row * 0.8;
      for (let x = -8 - row * 9; x < W; ) {
        const w = (16 + (r() * 14 | 0)) * sc, h = (6 + (r() * 5 | 0)) * sc, tile = r() < 0.6;
        g.fillStyle = night ? (tile ? '#1b1517' : '#15171d') : soir ? (tile ? '#6b4038' : '#4b4c5c') : (tile ? '#b5694a' : '#7f8792');
        g.beginPath(); g.moveTo(x, y0 + 3); g.lineTo(x + w * 0.22, y0 - h); g.lineTo(x + w * 0.78, y0 - h); g.lineTo(x + w, y0 + 3); g.fill();
        g.fillStyle = night ? '#101116' : soir ? '#4a3a3a' : '#d6c9ae'; g.fillRect(x + w * 0.35 | 0, y0 - h - 4 * sc | 0, 2 * sc, 5 * sc);   // une cheminée
        g.fillStyle = night ? '#121319' : soir ? '#7a6250' : '#e2d4b8'; g.fillRect(x, y0 + 3, w, H);                                       // la façade en pierre
        for (let wx = x + 3 * sc; wx < x + w - 3 * sc; wx += 6 * sc) {
          const lit = night ? r() < 0.28 : soir ? r() < 0.45 : false;
          g.fillStyle = lit ? ['#ffcf7a', '#ffe0a0', '#ffd08a'][(r() * 3) | 0] : night ? '#0a0b0f' : 'rgba(50,56,66,.75)';
          g.fillRect(wx | 0, y0 + 6 * sc | 0, 2 * sc, 4 * sc);
        }
        x += w + (r() * 3 | 0);
      }
    }
  });
}
// =====================================================================
//  LA CHAMBRE D'ÉTUDIANTE (4 m × 4,2 m × 2,6 m), vue par une petite caméra fixe dans le coin (côté couloir, à droite)
//   - le lit le long du mur de gauche (la tête contre le mur du fond), sous la fenêtre (vue sur les toits de Bordeaux),
//   - la table de nuit et son tiroir (face à la caméra), la porte d'entrée au milieu du mur du fond, le bureau à droite.
// =====================================================================
export function buildChambre(scene, { at = V3(0, 0, 0) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const W = 4, D = 4.2, H = 2.6, zF = -D / 2, xL = -W / 2;
  const wallTex = pixTex(32, 32, (g, w, h) => { const r = rng(71); g.fillStyle = '#d8d0c2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } }, 3);
  const floorTex = pixTex(32, 32, (g, w, h) => { g.fillStyle = '#9a7650'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, y, w, 1); g.fillRect((y * 7) % w, y, 1, 4); } }, 7);
  const wall = std({ map: wallTex }), floor = std({ map: floorTex, roughness: 0.7 });
  bx(W, 0.05, D, floor, G, 0, -0.025, 0); bx(W, 0.05, D, std({ color: '#e4ded2' }), G, 0, H + 0.025, 0);
  bx(0.1, H, D, wall, G, W / 2, H / 2, 0); bx(W, H, 0.1, wall, G, 0, H / 2, D / 2);
  // le mur de gauche (x = -2) : la fenêtre au-dessus du lit (z de -1.85 à -0.75, y de 1.0 à 2.2)
  const wz0 = -1.85, wz1 = -0.75, wy0 = 1.0, wy1 = 2.2;
  bb(xL - 0.05, xL + 0.05, 0, H, zF, wz0, wall, G); bb(xL - 0.05, xL + 0.05, 0, H, wz1, D / 2, wall, G);
  bb(xL - 0.05, xL + 0.05, 0, wy0, wz0, wz1, wall, G); bb(xL - 0.05, xL + 0.05, wy1, H, wz0, wz1, wall, G);
  const frameM = std({ color: '#f2efe8' });
  for (const z of [wz0, (wz0 + wz1) / 2, wz1]) bx(0.08, wy1 - wy0, 0.05, frameM, G, xL, (wy0 + wy1) / 2, z);
  for (const y of [wy0, wy1]) bx(0.08, 0.05, wz1 - wz0, frameM, G, xL, y, (wz0 + wz1) / 2);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(wz1 - wz0, wy1 - wy0), new THREE.MeshStandardMaterial({ color: '#9fb6d0', transparent: true, opacity: 0.1, roughness: 0.05 }));
  glass.position.set(xL, (wy0 + wy1) / 2, (wz0 + wz1) / 2); glass.rotation.y = Math.PI / 2; G.add(glass);
  // la vue : une toile peinte, 3 m derrière la fenêtre (cadrée pour la caméra fixe)
  const views = { nuit: bordeauxTex('nuit'), jour: bordeauxTex('jour'), soir: bordeauxTex('soir') };
  const viewM = new THREE.MeshBasicMaterial({ map: views.nuit, fog: false });
  const view = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.8), viewM); view.position.set(xL - 3, 1.1, -3.9); view.rotation.y = Math.PI / 2; G.add(view);
  bx(0.05, 1.6, 0.3, std({ color: '#c9a35a' }), G, xL + 0.1, 1.55, wz1 + 0.18);   // le rideau
  // le mur du fond (z = -2.1) : la porte au milieu (x de -0.3 à 0.5)
  const dx0 = -0.3, dx1 = 0.5, dH = 2.05;
  bb(xL, dx0, 0, H, zF - 0.05, zF + 0.05, wall, G); bb(dx0, dx1, dH, H, zF - 0.05, zF + 0.05, wall, G); bb(dx1, W / 2, 0, H, zF - 0.05, zF + 0.05, wall, G);
  for (const x of [dx0 - 0.03, dx1 + 0.03]) bx(0.06, dH + 0.05, 0.12, frameM, G, x, dH / 2, zF + 0.02);
  bx(dx1 - dx0 + 0.12, 0.06, 0.12, frameM, G, (dx0 + dx1) / 2, dH + 0.02, zF + 0.02);
  const hinge = new THREE.Group(); hinge.position.set(dx1, 0, zF + 0.04); G.add(hinge);
  const doorM = std({ color: '#b7a58a' });
  bx(dx1 - dx0, dH, 0.045, doorM, hinge, -(dx1 - dx0) / 2, dH / 2, 0);
  for (const sz of [-1, 1]) bx(0.03, 0.03, 0.06, std({ color: '#c7c7c7', metalness: 0.6, roughness: 0.3 }), hinge, -(dx1 - dx0) + 0.08, 1.0, sz * 0.04);
  bx(0.5, 0.65, 0.01, std({ color: '#3c3a44' }), hinge, -(dx1 - dx0) / 2, 1.55, 0.03);   // une affiche sur la porte
  // le couloir, derrière : sol, murs, et sa lampe (la lumière qui passe sous la porte quand quelqu'un arrive)
  bb(dx0 - 0.6, dx1 + 0.6, -0.02, 0, zF - 2.2, zF, std({ color: '#5a4a3a' }), G); bb(dx0 - 0.6, dx1 + 0.6, 0, H, zF - 2.3, zF - 2.2, std({ color: '#a39a8a' }), G);
  bb(dx0 - 0.7, dx0 - 0.6, 0, H, zF - 2.2, zF, std({ color: '#a39a8a' }), G); bb(dx1 + 0.6, dx1 + 0.7, 0, H, zF - 2.2, zF, std({ color: '#a39a8a' }), G);
  const hallL = new THREE.PointLight('#ffd9a0', 0, 4, 1.4); hallL.position.set((dx0 + dx1) / 2, 2.2, zF - 1.0); G.add(hallL);
  const gap = new THREE.Mesh(new THREE.PlaneGeometry(dx1 - dx0 - 0.04, 0.04), new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0, toneMapped: false })); gap.position.set((dx0 + dx1) / 2, 0.02, zF + 0.075); G.add(gap);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(dx1 - dx0, 0.5), new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0, depthWrite: false })); spill.rotation.x = -Math.PI / 2; spill.position.set((dx0 + dx1) / 2, 0.004, zF + 0.3); G.add(spill);
  // le lit (une place) : x de -1.95 à -1.05, la tête contre le mur du fond
  const wood = std({ color: '#6e5038' }), whiteM = std({ color: '#efece6' });
  bb(-1.95, -1.05, 0, 0.32, zF + 0.05, zF + 2.05, wood, G);
  bb(-1.97, -1.03, 0, 0.95, zF + 0.06, zF + 0.12, wood, G);
  bb(-1.93, -1.07, 0.32, 0.5, zF + 0.1, zF + 2.02, std({ color: '#e6e2da' }), G);
  const duvet = bb(-1.95, -1.03, 0.5, 0.6, zF + 0.75, zF + 2.04, std({ color: '#3f7f7a' }), G); duvet.rotation.z = -0.02;
  bb(-1.85, -1.15, 0.5, 0.63, zF + 0.15, zF + 0.55, whiteM, G);
  // la table de nuit (x de -0.95 à -0.5, z de zF à zF + 0.45) et SON TIROIR (il glisse vers la caméra, +z)
  const nsM = std({ color: '#e9e4da' });
  const nx0 = -0.95, nx1 = -0.5, nz1 = zF + 0.45;
  bb(nx0, nx1, 0.0, 0.05, zF + 0.05, nz1, nsM, G); bb(nx0, nx1, 0.53, 0.56, zF + 0.05, nz1, nsM, G);
  bb(nx0, nx0 + 0.02, 0.05, 0.53, zF + 0.05, nz1, nsM, G); bb(nx1 - 0.02, nx1, 0.05, 0.53, zF + 0.05, nz1, nsM, G); bb(nx0, nx1, 0.05, 0.53, zF + 0.05, zF + 0.07, nsM, G);
  bb(nx0 + 0.02, nx1 - 0.02, 0.05, 0.3, nz1 - 0.02, nz1, nsM, G);
  bb(nx0 + 0.02, nx1 - 0.02, 0.3, 0.32, zF + 0.07, nz1, nsM, G);
  const drw = new THREE.Group(); drw.position.set((nx0 + nx1) / 2, 0.33, nz1); G.add(drw);
  const dM = std({ color: '#ddd6c8' });
  bx(0.4, 0.18, 0.02, dM, drw, 0, 0.09, -0.01);
  bx(0.08, 0.025, 0.03, std({ color: '#6f6f6f', metalness: 0.5, roughness: 0.4 }), drw, 0, 0.1, 0.014);
  bx(0.38, 0.012, 0.36, std({ color: '#cfc7b6' }), drw, 0, 0.006, -0.2);
  bx(0.012, 0.13, 0.36, dM, drw, -0.185, 0.07, -0.2); bx(0.012, 0.13, 0.36, dM, drw, 0.185, 0.07, -0.2); bx(0.38, 0.13, 0.012, dM, drw, 0, 0.07, -0.37);
  const drawerIn = new THREE.Group(); drawerIn.position.set(0, 0.018, -0.2); drw.add(drawerIn);
  // le réveil, la lampe de chevet
  const cc = document.createElement('canvas'); cc.width = 64; cc.height = 24; const cg = cc.getContext('2d');
  const ctex = new THREE.CanvasTexture(cc); ctex.magFilter = THREE.NearestFilter; ctex.minFilter = THREE.NearestFilter; ctex.generateMipmaps = false;
  const clockAt = V3(-0.62, 0.6, zF + 0.3);
  bx(0.17, 0.08, 0.07, std({ color: '#111' }), G, clockAt.x, clockAt.y, clockAt.z, -0.35);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.06), new THREE.MeshBasicMaterial({ map: ctex, toneMapped: false })); face.position.copy(clockAt).add(V3(0.0126, 0, 0.0343)); face.rotation.y = -0.35; G.add(face);
  let shown = '';
  const clock = (txt) => { if (txt === shown) return; shown = txt; cg.fillStyle = '#050000'; cg.fillRect(0, 0, 64, 24); cg.fillStyle = '#ff2a1a'; cg.font = 'bold 20px monospace'; cg.textAlign = 'center'; cg.fillText(txt, 32, 19); ctex.needsUpdate = true; };
  clock('21:04');
  const clockL = new THREE.PointLight('#ff3020', 0, 1.2, 2); clockL.position.copy(clockAt).add(V3(0.05, 0.05, 0.15)); G.add(clockL);
  bx(0.14, 0.02, 0.14, std({ color: '#333' }), G, -0.84, 0.57, zF + 0.17);
  bx(0.02, 0.3, 0.02, std({ color: '#333' }), G, -0.84, 0.72, zF + 0.17);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.15, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#f3e3c0', side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0 }));
  shade.position.set(-0.84, 0.9, zF + 0.17); G.add(shade);
  const lampL = new THREE.PointLight('#ffc27a', 0, 5, 1.3); lampL.position.set(-0.84, 0.95, zF + 0.32); lampL.castShadow = true; lampL.shadow.mapSize.set(512, 512); lampL.shadow.bias = -0.002; G.add(lampL);
  // une étagère au-dessus de la tête du lit, une affiche au-dessus de la table de nuit
  bb(-1.95, -1.1, 1.45, 1.48, zF + 0.05, zF + 0.27, wood, G);
  for (let i = 0; i < 7; i++) bx(0.04, 0.2 + (i % 3) * 0.03, 0.16, std({ color: ['#a33b2b', '#2f5d8a', '#e2c36b', '#5c7d5a', '#7a4f8a'][i % 5] }), G, -1.88 + i * 0.07, 1.59 + (i % 3) * 0.015, zF + 0.16);
  const poster = (cols) => pixTex(24, 34, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = cols[2]; g.beginPath(); g.arc(w / 2, h * 0.45, 6, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(2, h - 7, w - 4, 4); });
  const pm1 = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.6), std({ map: poster(['#1d3557', '#e76f51', '#f4d35e']) })); pm1.position.set(-0.72, 1.55, zF + 0.06); G.add(pm1);
  // le bureau (mur du fond, à droite de la porte : x de 0.75 à 1.9), l'ordinateur fermé, les livres, la chaise
  bb(0.75, 1.9, 0.72, 0.76, zF + 0.05, zF + 0.65, wood, G);
  for (const [x, z] of [[0.78, zF + 0.08], [1.87, zF + 0.08], [0.78, zF + 0.62], [1.87, zF + 0.62]]) bx(0.04, 0.72, 0.04, wood, G, x, 0.36, z);
  bx(0.33, 0.02, 0.23, std({ color: '#9aa0a6', metalness: 0.5, roughness: 0.4 }), G, 1.4, 0.77, zF + 0.35);
  for (let i = 0; i < 4; i++) bx(0.05, 0.24, 0.17, std({ color: ['#2f5d8a', '#a33b2b', '#d9b44a', '#3c6e47'][i] }), G, 0.85 + i * 0.055, 0.88, zF + 0.17);
  const chair = new THREE.Group(); chair.position.set(1.3, 0, zF + 0.95); G.add(chair);
  bx(0.42, 0.04, 0.42, std({ color: '#3c3f45' }), chair, 0, 0.46, 0); bx(0.42, 0.45, 0.04, std({ color: '#3c3f45' }), chair, 0, 0.7, 0.2);
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) bx(0.03, 0.46, 0.03, std({ color: '#222' }), chair, x, 0.23, z);
  // l'armoire (mur de droite), le tapis, un sac sur le lit
  bb(-0.7, 0.9, 0.0, 0.012, -0.9, 0.5, std({ color: '#6a7d9a' }), G);
  bb(-1.75, -1.35, 0.6, 0.66, zF + 1.5, zF + 1.8, std({ color: '#2b2b2f' }), G);
  // les lumières : la fenêtre (lune la nuit, soleil le jour), la lampe de chevet, le plafonnier, l'ambiance
  const winL = new THREE.SpotLight('#8a9ad0', 0, 16, 0.75, 0.7, 1.1); winL.position.set(xL - 2.2, 2.9, -1.4); winL.target.position.set(-0.85, 0.7, -1.15); G.add(winL, winL.target);
  winL.castShadow = true; winL.shadow.mapSize.set(1024, 1024); winL.shadow.bias = -0.001;
  const ceilL = new THREE.PointLight('#fff0dc', 0, 7, 1.2); ceilL.position.set(0, 2.45, -0.2); G.add(ceilL);
  const ceilFix = bx(0.3, 0.05, 0.3, new THREE.MeshStandardMaterial({ color: '#d8d2c4', emissive: '#fff4e0', emissiveIntensity: 0 }), G, 0, 2.57, -0.2);
  const amb = new THREE.HemisphereLight('#b8c0d8', '#4a3c30', 0); G.add(amb);
  const MODES = {   // l'éclairage selon l'heure
    nuit: { win: 34, winC: '#7488cc', lamp: 0, ceil: 0, amb: 0.3, clock: 0.45, view: 'nuit' },
    soir: { win: 4, winC: '#8a8fd0', lamp: 1.6, ceil: 1.4, amb: 0.4, clock: 0.06, view: 'nuit' },
    jour: { win: 30, winC: '#fff1dc', lamp: 0, ceil: 0, amb: 0.8, clock: 0.0, view: 'jour' },
    fin: { win: 30, winC: '#6f82c8', lamp: 0, ceil: 0, amb: 0.28, clock: 0.45, view: 'nuit' },
    off: { win: 0, winC: '#000000', lamp: 0, ceil: 0, amb: 0, clock: 0, view: 'nuit' },
  };
  const light = (mode, k = 1) => {
    const m = MODES[mode]; winL.intensity = m.win * k; winL.color.set(m.winC); lampL.intensity = m.lamp * k; ceilL.intensity = m.ceil * k; amb.intensity = m.amb * k; clockL.intensity = m.clock * k;
    shade.material.emissiveIntensity = m.lamp > 0 ? 0.9 * k : 0; ceilFix.material.emissiveIntensity = m.ceil > 0 ? 0.8 * k : 0; viewM.map = views[m.view]; G.visible = mode !== 'off';
  };
  const L = (x, y, z) => V3(x, y, z).add(at);
  return {
    root: G, at, W, D, H, clock, light, winL, lampL, ceilL, amb, clockL, hallL, drawerIn, drawerObj: drw,
    lights: [winL, lampL, ceilL, clockL, hallL],
    drawer: (k) => { drw.position.z = nz1 + 0.24 * k; },
    door: (k) => { hinge.rotation.y = 1.5 * k; },
    hall: (k) => { hallL.intensity = 2.4 * k; gap.material.opacity = 0.95 * k; spill.material.opacity = 0.18 * k; },
    doorPos: L((dx0 + dx1) / 2, 1.2, zF),
    // des points utiles (dans le repère du monde)
    seat: L(-1.02, 0, -1.25),                 // assise au bord du lit, près de la table de nuit (face à +x)
    drawerFront: () => drw.localToWorld(V3(0, 0.1, 0.02)),
    doorIn: L((dx0 + dx1) / 2, 0, zF + 0.6), doorOut: L((dx0 + dx1) / 2, 0, zF - 1.0),
    mid: L(0.15, 0, -0.45),
  };
}

// =====================================================================
//  LES QUAIS DE LA GARONNE (place de la Bourse) : on regarde le long du quai (vers -x).
//   à gauche : le tram, puis les façades en pierre blonde ; au milieu : le miroir d'eau ; à droite : la Garonne ;
//   au fond : le pont de pierre. Le quai est à y = 0, le fleuve 2,5 m plus bas.
// =====================================================================
function facadeTex(seed, bourse = false) {
  // une travée de façade bordelaise du XVIIIe : rez-de-chaussée en arcades, 2 étages de grandes fenêtres avec balcons
  // en fer forgé, un étage attique, la corniche (le toit en ardoise est fait à part, en volume)
  return pixTex(64, 64, (g, w, h) => {
    const r = rng(seed); g.fillStyle = '#dccba6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(80,60,30,.07)'; g.fillRect(r() * w | 0, r() * h | 0, 2, 1); }
    g.fillStyle = 'rgba(90,70,40,.18)'; for (let y = 46; y < h; y += 3) g.fillRect(0, y, w, 1);           // les refends du rez-de-chaussée
    g.fillStyle = '#cdbb94'; g.fillRect(0, 44, w, 2); g.fillRect(0, 13, w, 2); g.fillRect(0, 0, w, 3);    // bandeaux et corniche
    for (let c = 0; c < 4; c++) {
      const x = 4 + c * 16;
      g.fillStyle = '#3a3428'; g.fillRect(x, 50, 8, 14); g.beginPath(); g.arc(x + 4, 50, 4, Math.PI, 0); g.fill();   // l'arcade
      for (const [y, hh] of [[18, 11], [31, 10]]) { g.fillStyle = '#2d3138'; g.fillRect(x, y, 8, hh); g.fillStyle = '#4a5260'; g.fillRect(x + 1, y + 1, 3, hh - 2);
        g.fillStyle = '#c6b48d'; g.fillRect(x - 1, y - 2, 10, 2); g.fillStyle = '#1b1b1b'; g.fillRect(x - 1, y + hh - 3, 10, 1); g.fillRect(x - 1, y + hh - 1, 10, 1); }   // balcon
      g.fillStyle = '#2d3138'; g.fillRect(x + 1, 5, 6, 6);                                                  // l'attique
      g.fillStyle = '#c9b892'; g.fillRect(x + 2, 44, 4, 3);                                                  // un mascaron (le visage sculpté)
    }
    if (bourse) { g.fillStyle = '#cdbb94'; for (let c = 0; c < 4; c++) g.fillRect(2 + c * 16, 16, 2, 28); }   // des pilastres
  }, [1, 1]);
}
export function buildQuais(scene, { at = V3(0, 0, 0), bench: benchAt = V3(-4.2, 0, 4.6), benchYaw = 0.5 } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const R = rng(1755);
  // --- le sol du quai (avec un trou pour le miroir d'eau), la chaussée et le tram, le bord du quai
  const pave = std({ map: pixTex(32, 32, (g, w, h) => { g.fillStyle = '#c2bbae'; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 140; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)'; g.fillRect(r() * w | 0, r() * h | 0, 2, 2); } g.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1); for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h); }, [140, 4]), roughness: 0.9 });
  const MX0 = -75, MX1 = -12, MZ0 = -6.5, MZ1 = 1.5;   // le miroir d'eau
  const X0 = -500, X1 = 60;
  bb(X0, X1, -0.2, 0, 1.5, 9, pave, G); bb(X0, X1, -0.2, 0, -10, MZ0, pave, G); bb(X0, MX0, -0.2, 0, MZ0, MZ1, pave, G); bb(MX1, X1, -0.2, 0, MZ0, MZ1, pave, G);
  // le miroir d'eau : une dalle sombre et brillante, à moitié transparente, sous laquelle on pose une copie à l'envers des façades (le reflet)
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(MX1 - MX0, MZ1 - MZ0), new THREE.MeshStandardMaterial({ color: '#8a9fb3', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.8 }));
  mir.rotation.x = -Math.PI / 2; mir.position.set((MX0 + MX1) / 2, -0.01, (MZ0 + MZ1) / 2); G.add(mir);
  const asph = std({ color: '#4d4e52', roughness: 0.95 });
  bb(X0, X1, -0.21, -0.01, -26, -10, asph, G);
  for (const z of [-14.2, -15.6, -18.6, -20.0]) bb(X0, X1, -0.01, 0.005, z - 0.04, z + 0.04, std({ color: '#9aa0a6', metalness: 0.6, roughness: 0.4 }), G);   // les rails du tram
  bb(X0, X1, 0, 0.12, -10.15, -9.9, std({ color: '#a39d92' }), G);   // la bordure
  // le bord du quai : un muret bas en pierre (le fleuve est 2,5 m plus bas)
  const stoneM = std({ color: '#c9bfa8' });
  bb(X0, X1, -3, 0.45, 9, 9.6, stoneM, G);
  const qwall = std({ map: pixTex(32, 16, (g, w, h) => { g.fillStyle = '#a99f88'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1); for (let x = 0; x < w; x += 8) g.fillRect(x + ((x / 8) % 2) * 4, 0, 1, h); g.fillStyle = 'rgba(40,50,30,.35)'; g.fillRect(0, h - 4, w, 4); }, [80, 1]) });
  bb(X0, X1, -4, -0.2, 9.6, 9.7, qwall, G);
  // --- la Garonne, couleur café au lait, et l'autre rive (la Bastide), basse et verte
  const river = std({ map: pixTex(64, 64, (g, w, h) => { g.fillStyle = '#7b6a4c'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,240,210,.10)' : 'rgba(40,30,15,.14)'; g.fillRect(r() * w | 0, r() * h | 0, 4 + (r() * 8 | 0), 1); } }, [40, 30]), roughness: 0.35, metalness: 0.05 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 480), river); water.rotation.x = -Math.PI / 2; water.position.set(-200, -2.5, 250); water.receiveShadow = true; G.add(water);
  const bankM = std({ color: '#6d7d55' });
  bb(-900, 500, -2.5, 1.0, 470, 520, bankM, G);
  for (let i = 0; i < 70; i++) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), std({ color: ['#566b45', '#4b5f3c', '#62774c'][i % 3] })); t.scale.set(6 + R() * 6, 4 + R() * 4, 5); t.position.set(-850 + i * 19 + R() * 8, 4 + R() * 2, 478 + R() * 20); G.add(t); }
  for (let i = 0; i < 18; i++) { const h = 6 + R() * 10; bb(-700 + i * 60 + R() * 20, -700 + i * 60 + 14 + R() * 20, 0, h, 485, 500, std({ color: ['#d6cdb8', '#c4bba6', '#e0d8c4'][i % 3] }), G); }
  // --- le pont de pierre, au loin (17 arches en brique et pierre, des lampadaires) : il traverse le fleuve en x = -430
  const bridgeTex = pixTex(128, 16, (g, w, h) => { g.fillStyle = '#c8b9a0'; g.fillRect(0, 0, w, h); g.fillStyle = '#9c5b45'; g.fillRect(0, 3, w, 5);
    for (let i = 0; i < 17; i++) { const cx = (i + 0.5) * w / 17; g.fillStyle = '#2a2520'; g.beginPath(); g.ellipse(cx, h, 2.6, 8, 0, Math.PI, 0); g.fill(); g.fillStyle = '#e4dccb'; g.fillRect(cx - 0.5, 2, 1, 1); } }, [1, 1]);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 490), [std({ map: bridgeTex }), std({ map: bridgeTex }), std({ color: '#7a7368' }), std({ color: '#7a7368' }), std({ color: '#c8b9a0' }), std({ color: '#c8b9a0' })]);
  bridge.position.set(-430, 2.0, 250); G.add(bridge);
  for (let z = 15; z < 480; z += 30) { bx(0.2, 4, 0.2, std({ color: '#2e3133' }), G, -436, 8.5, z); bx(0.6, 0.4, 0.6, new THREE.MeshBasicMaterial({ color: '#fff0c8' }), G, -436, 10.6, z); }
  // --- les façades en pierre blonde (z = -27, sur 480 m de long), le toit en ardoise avec des lucarnes ; la Bourse au milieu
  const fac = [facadeTex(11), facadeTex(12), facadeTex(13, true)];
  const slate = std({ color: '#5f6874', roughness: 0.7 }), dormM = std({ color: '#d6c6a0' });
  const ZF = -27, FH = 16;
  const facades = new THREE.Group(); G.add(facades);
  for (let x = X0 + 20; x < X1; x += 16) {
    const bourse = x > -60 && x < -20, h = bourse ? FH + 2 : FH;
    const f = new THREE.Mesh(new THREE.BoxGeometry(16, h, 14), std({ map: fac[bourse ? 2 : (Math.abs(Math.round(x / 16)) % 2)] }));
    f.position.set(x + 8, h / 2, ZF - 7); f.castShadow = f.receiveShadow = true; facades.add(f);
    f.material.map.repeat.set(1, 1);
    // le toit (mansarde en ardoise) et 3 lucarnes
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1, 1, 4, 1), slate); roof.scale.set(11.3, 5, 9.9); roof.rotation.y = Math.PI / 4; roof.position.set(x + 8, h + 2.5, ZF - 7); facades.add(roof);
    for (const dx of [3, 8, 13]) { bx(1.4, 1.8, 0.8, dormM, facades, x + dx, h + 1.4, ZF - 2.3); }
    for (const dx of [2, 14]) bx(0.8, 2.2, 0.8, std({ color: '#c8b48a' }), facades, x + dx, h + 4.6, ZF - 8);
  }
  // le fronton de la Bourse
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1, 1, 3, 1), std({ color: '#d8c7a0' })); ped.scale.set(14, 4, 1.6); ped.rotation.set(Math.PI / 2, 0, 0); ped.rotation.z = 0; ped.position.set(-40, FH + 3.6, ZF + 0.2); facades.add(ped);
  // le reflet dans le miroir d'eau : la même rangée de façades, à l'envers sous le sol
  const refl = facades.clone(); refl.scale.y = -1; refl.position.y = -0.02; G.add(refl);
  refl.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  // --- le mobilier : lampadaires, bancs, platanes, une fontaine (les Trois Grâces) au loin
  const poleM = std({ color: '#2c2f33', metalness: 0.4, roughness: 0.5 });
  for (let x = X1 - 10; x > X0; x -= 22) { bx(0.14, 6, 0.14, poleM, G, x, 3, 7.8); bx(0.9, 0.12, 0.3, poleM, G, x - 0.35, 6, 7.8); }
  // le banc (sur le quai, le dossier côté ville : on s'y assoit pour regarder la Garonne)
  const bench = new THREE.Group(); bench.position.copy(benchAt); G.add(bench);
  const bw = std({ color: '#7a5a3c' });
  bx(1.8, 0.06, 0.45, bw, bench, 0, 0.45, 0); bx(1.8, 0.4, 0.05, bw, bench, 0, 0.75, -0.24); for (const x of [-0.8, 0.8]) bx(0.08, 0.45, 0.45, poleM, bench, x, 0.22, 0);
  bench.rotation.y = benchYaw;   // assis, on regarde dans la direction benchYaw (le dossier est derrière)
  const treeM = std({ color: '#5f7b45' }), barkM = std({ color: '#8a8070' });
  for (let x = X1 - 6; x > X0; x -= 13) {
    if (x > -82 && x < 2) continue;   // pas d'arbres devant la place de la Bourse (on la voit en entier)
    bx(0.35, 4, 0.35, barkM, G, x, 2, -8.6);
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), treeM); c.scale.set(2.6 + R(), 2 + R(), 2.6 + R()); c.position.set(x + (R() - 0.5) * 1.8, 5.2 + R() * 1.2, -8.6 + (R() - 0.5) * 1.6); c.castShadow = true; G.add(c); }
  }
  const fontaine = new THREE.Group(); fontaine.position.set(-40, 0, -22); G.add(fontaine);
  mesh(new THREE.CylinderGeometry(3, 3.2, 0.6, 16), std({ color: '#b9b0a0' }), fontaine, 0, 0.3, 0); mesh(new THREE.CylinderGeometry(0.4, 0.6, 3, 8), std({ color: '#3b4a48' }), fontaine, 0, 2, 0);
  // --- les lumières : le soleil (bas, en fin d'après-midi) et le ciel
  const sun = new THREE.DirectionalLight('#ffe7c4', 0); sun.position.set(30, 45, 40); sun.target.position.set(-8, 0, 2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 }); sun.shadow.bias = -0.0006; G.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c9dcf2', '#7a6e5c', 0); G.add(hemi);
  const L = (x, y, z) => V3(x, y, z).add(at);
  // seat(dx) : où poser un personnage assis sur le banc (dx le long du banc, vers sa droite) ; il regarde vers benchYaw
  const lx = V3(Math.cos(benchYaw), 0, -Math.sin(benchYaw)), lz = V3(Math.sin(benchYaw), 0, Math.cos(benchYaw));
  const seat = (dx = 0) => benchAt.clone().add(at).addScaledVector(lx, dx).addScaledVector(lz, 0.12);
  return { root: G, at, sun, hemi, lights: [sun], bench: benchAt.clone().add(at), benchYaw, seat, on(k = 1) { G.visible = k > 0; sun.intensity = 2.6 * k; hemi.intensity = 1.1 * k; }, P: L };
}

// =====================================================================
//  LA BIBLIOTHÈQUE : une grande salle de lecture (16 m × 12 m × 4,5 m), deux rangées de longues tables avec des lampes
//  vertes, des rayonnages tout autour, une grande baie vitrée à gauche (lumière du jour)
// =====================================================================
export function buildBiblio(scene, { at = V3(0, 0, 0) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const W = 16, D = 12, H = 4.5, R = rng(1902);
  const floorM = std({ map: pixTex(32, 32, (g, w, h) => { g.fillStyle = '#8a8478'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1); for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h); }, [10, 8]), roughness: 0.6 });
  bx(W, 0.05, D, floorM, G, 0, -0.025, 0); bx(W, 0.05, D, std({ color: '#e8e6e0' }), G, 0, H, 0);
  const wallM = std({ color: '#e4e0d6' });
  bx(W, H, 0.1, wallM, G, 0, H / 2, -D / 2); bx(0.1, H, D, wallM, G, W / 2, H / 2, 0); bx(W, H, 0.1, wallM, G, 0, H / 2, D / 2);
  // la baie vitrée (mur de gauche, x = -W/2) : des montants, et derrière un ciel clair et des arbres
  for (let z = -D / 2; z <= D / 2; z += 1.5) bx(0.12, H, 0.12, std({ color: '#3a3d42' }), G, -W / 2, H / 2, z);
  bx(0.12, 0.12, D, std({ color: '#3a3d42' }), G, -W / 2, 0.6, 0); bx(0.12, 0.12, D, std({ color: '#3a3d42' }), G, -W / 2, H - 0.05, 0);
  const outT = pixTex(128, 48, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9cc2ea'); gr.addColorStop(1, '#e3ebef'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rng(4);
    for (let i = 0; i < 30; i++) { g.fillStyle = ['#6f8f5a', '#5f7f4c', '#7d9a66'][i % 3]; g.beginPath(); g.arc(r() * w, h * 0.75 + r() * 8, 5 + r() * 7, 0, 7); g.fill(); } for (let i = 0; i < 8; i++) { g.fillStyle = '#c9c4b8'; g.fillRect(i * 17 + r() * 6, h * 0.45, 10, h * 0.3); } });
  const outM = new THREE.Mesh(new THREE.PlaneGeometry(60, 22), new THREE.MeshBasicMaterial({ map: outT, fog: false })); outM.position.set(-W / 2 - 14, 6, 0); outM.rotation.y = Math.PI / 2; G.add(outM);
  // les rayonnages (mur du fond et mur de droite) : des étagères pleines de livres de toutes les couleurs
  const booksT = pixTex(64, 64, (g, w, h) => { g.fillStyle = '#5a4634'; g.fillRect(0, 0, w, h); const r = rng(77);
    for (let y = 0; y < h; y += 16) { g.fillStyle = '#3e3024'; g.fillRect(0, y, w, 2); for (let x = 0; x < w;) { const bw = 2 + (r() * 3 | 0); g.fillStyle = ['#8a2f2a', '#2f5d8a', '#d9b44a', '#3c6e47', '#e8e2d0', '#6b3f7a', '#c46a2f', '#22303c'][(r() * 8) | 0]; g.fillRect(x, y + 2 + (r() * 3 | 0), bw, 14); x += bw + (r() < 0.1 ? 2 : 0); } } }, [6, 1]);
  const shelfM = std({ map: booksT });
  const s1 = bx(W - 1, 3.2, 0.4, shelfM, G, 0.5, 1.6, -D / 2 + 0.25); s1.material.map.repeat.set(10, 2);
  const s2 = bx(0.4, 3.2, D - 1, std({ map: booksT.clone() }), G, W / 2 - 0.25, 1.6, 0); s2.material.map.repeat.set(8, 2); s2.material.map.needsUpdate = true;
  // les tables (2 rangées de 3) avec leurs lampes, et les chaises
  const tabM = std({ color: '#7a5a3c', roughness: 0.6 }), legM = std({ color: '#3a2c20' }), lampM = std({ color: '#1f6b46', roughness: 0.4, emissive: '#2a8a5a', emissiveIntensity: 0.25 });
  const tables = [];
  for (const tz of [-2.6, 1.6]) for (const tx of [-4.5, 0, 4.5]) {
    const T0 = V3(tx, 0, tz); tables.push(T0);
    bb(tx - 1.6, tx + 1.6, 0.72, 0.77, tz - 0.55, tz + 0.55, tabM, G);
    for (const [x, z] of [[-1.5, -0.45], [1.5, -0.45], [-1.5, 0.45], [1.5, 0.45]]) bx(0.07, 0.72, 0.07, legM, G, tx + x, 0.36, tz + z);
    for (const x of [-0.8, 0.8]) { bx(0.04, 0.32, 0.04, std({ color: '#b08d3a', metalness: 0.6 }), G, tx + x, 0.93, tz); mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.1, 10, 1, true), lampM, G, tx + x, 1.1, tz); }
    for (const x of [-1.1, 0, 1.1]) for (const s of [-1, 1]) { const c = new THREE.Group(); c.position.set(tx + x, 0, tz + s * 0.85); c.rotation.y = s > 0 ? 0 : Math.PI; G.add(c);
      bx(0.42, 0.04, 0.42, std({ color: '#3f4448' }), c, 0, 0.46, 0); bx(0.42, 0.42, 0.04, std({ color: '#3f4448' }), c, 0, 0.68, 0.2); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) bx(0.03, 0.46, 0.03, legM, c, a, 0.23, b); }
    for (let i = 0; i < 3; i++) if (R() < 0.7) bx(0.16 + R() * 0.1, 0.03 + R() * 0.08, 0.22, std({ color: ['#8a2f2a', '#2f5d8a', '#e8e2d0', '#3c6e47'][(R() * 4) | 0] }), G, tx - 1.2 + R() * 2.4, 0.8, tz + (R() - 0.5) * 0.6);
  }
  // les lumières : le jour par la baie, les plafonniers, l'ambiance
  const sun = new THREE.DirectionalLight('#fff3e0', 0); sun.position.set(-30, 18, 6); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 70 }); sun.shadow.bias = -0.0008; G.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#e6ecf5', '#6e6252', 0); G.add(hemi);
  for (let x = -5; x <= 5; x += 5) bx(1.2, 0.06, 0.3, new THREE.MeshBasicMaterial({ color: '#f6f3ea' }), G, x, H - 0.05, -0.5);
  const L = (x, y, z) => V3(x, y, z).add(at);
  return { root: G, at, sun, hemi, lights: [sun], tables: tables.map((t) => t.clone().add(at)), on(k = 1) { G.visible = k > 0; sun.intensity = 3.0 * k; hemi.intensity = 1.8 * k; }, P: L };
}

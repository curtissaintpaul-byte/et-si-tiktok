// =====================================================================
//  LA CHAMBRE ET L'AUTOROUTE (style « reconstitution », avec lib-ps2.js) — pour « Et si tu ne dormais plus du tout ? »
//
//  const CH = buildBedroom(scene, { at: v3(0, 0, 400) });   → CH.bed, CH.window, CH.clock(texte), CH.view('nuit'|'jour'), CH.lights…
//  const AU = buildHighway(scene);                          → une autoroute à 3 voies le long de x (on roule vers +x), glissière,
//                                                              bande sonore sur le bord, plots réfléchissants, lampadaires au sodium
//  Comme un décor de théâtre : la chambre et l'autoroute sont construites loin l'une de l'autre, et chaque plan ne filme que la sienne.
// =====================================================================
import { THREE, rng, lerp, clamp } from './engine.js';
import { pixTex } from './lib-ps2.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mesh = (geo, mat, p, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; p.add(m); return m; };
const bx = (w, h, d, mat, p, x, y, z, ry) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, x, y, z, ry);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });

/** la vue sur Lyon depuis la fenêtre : la colline de Fourvière, sa basilique, la tour métallique, la Saône ; de nuit ou de jour */
function lyonTex(night) {
  return pixTex(256, 128, (g, W, H) => {
    const r = rng(night ? 61 : 62);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
    if (night) { sky.addColorStop(0, '#05070f'); sky.addColorStop(1, '#1c1726'); } else { sky.addColorStop(0, '#8fb0d4'); sky.addColorStop(1, '#d9d6cc'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (night) for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(r() * W | 0, r() * H * 0.35 | 0, 1, 1); }
    // la colline
    g.fillStyle = night ? '#0b0d10' : '#5d6b4a'; g.beginPath(); g.moveTo(0, H * 0.62); for (let x = 0; x <= W; x += 4) g.lineTo(x, H * 0.5 - Math.sin(x / W * Math.PI) * H * 0.16 + Math.sin(x * 0.09) * 2); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    // la basilique (silhouette : nef et 4 tours) et la tour métallique
    const bxx = W * 0.42, by = H * 0.36; g.fillStyle = night ? '#d8c8a0' : '#e8e2d2';
    g.fillRect(bxx, by, 30, 10); for (const dx of [0, 26]) { g.fillRect(bxx + dx - 1, by - 6, 6, 16); g.fillRect(bxx + dx, by - 9, 4, 3); }
    g.fillRect(bxx + 12, by - 4, 6, 4);
    g.fillStyle = night ? '#6a6a70' : '#8a8a90'; g.fillRect(W * 0.62, H * 0.2, 2, H * 0.2); g.fillRect(W * 0.62 - 2, H * 0.32, 6, 2);
    if (night) { g.fillStyle = '#ff3020'; g.fillRect(W * 0.62, H * 0.19, 2, 2); }
    // les immeubles des quais, la Saône
    for (let x = 0; x < W; x += 6 + (r() * 6 | 0)) { const h = 10 + r() * 22; g.fillStyle = night ? '#121318' : ['#c9b79a', '#d8c6a6', '#b8a68a', '#e0cfb0'][(r() * 4) | 0]; g.fillRect(x, H * 0.78 - h, 7 + (r() * 5 | 0), h);
      for (let wy = H * 0.78 - h + 2; wy < H * 0.78 - 2; wy += 4) for (let wx = x + 1; wx < x + 6; wx += 2) if (night ? r() < 0.35 : r() < 0.6) { g.fillStyle = night ? ['#ffcf7a', '#ffe2a8', '#9fc4ff'][(r() * 3) | 0] : 'rgba(40,50,60,.6)'; g.fillRect(wx, wy, 1, 2); } }
    g.fillStyle = night ? '#07090d' : '#6f8fa0'; g.fillRect(0, H * 0.78, W, H * 0.22);
    if (night) for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(255,${190 + (r() * 50 | 0)},120,${0.15 + r() * 0.35})`; g.fillRect(r() * W | 0, H * 0.8 + r() * H * 0.18 | 0, 2 + (r() * 3 | 0), 1); }
  });
}

// =====================================================================
//  LA CHAMBRE (4 m × 4,5 m) : lit, table de chevet avec réveil, bureau, fenêtre sur Lyon, porte, poster, tapis
// =====================================================================
export function buildBedroom(scene, { at = V3(0, 0, 400) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const W = 4, D = 4.5, H = 2.6;
  const wallTex = pixTex(32, 32, (g, w, h) => { const r = rng(71); g.fillStyle = '#8f8a83'; g.fillRect(0, 0, w, h); for (let i = 0; i < 200; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } }, 3);
  const floorTex = pixTex(32, 32, (g, w, h) => { g.fillStyle = '#6b4f37'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, y, w, 1); g.fillRect((y * 7) % w, y, 1, 4); } }, 6);
  const wall = std({ map: wallTex }), floor = std({ map: floorTex });
  bx(W, 0.05, D, floor, G, 0, -0.025, 0); bx(W, 0.05, D, std({ color: '#9a958e' }), G, 0, H + 0.025, 0);
  // murs (le mur nord, côté -z, a la fenêtre : 1,7 m × 1,3 m, de y = 0,9 à 2,2)
  bx(0.1, H, D, wall, G, -W / 2, H / 2, 0); bx(0.1, H, D, wall, G, W / 2, H / 2, 0); bx(W, H, 0.1, wall, G, 0, H / 2, D / 2);
  const wx0 = -0.85, wx1 = 0.85, wy0 = 0.9, wy1 = 2.2;
  bx((wx0 + W / 2), H, 0.1, wall, G, (-W / 2 + wx0) / 2, H / 2, -D / 2); bx(W / 2 - wx1, H, 0.1, wall, G, (W / 2 + wx1) / 2, H / 2, -D / 2);
  bx(wx1 - wx0, wy0, 0.1, wall, G, 0, wy0 / 2, -D / 2); bx(wx1 - wx0, H - wy1, 0.1, wall, G, 0, (H + wy1) / 2, -D / 2);
  const frameM = std({ color: '#e8e4dc' });
  for (const x of [wx0, 0, wx1]) bx(0.05, wy1 - wy0, 0.08, frameM, G, x, (wy0 + wy1) / 2, -D / 2); for (const y of [wy0, wy1]) bx(wx1 - wx0, 0.05, 0.08, frameM, G, 0, y, -D / 2);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, wy1 - wy0), new THREE.MeshStandardMaterial({ color: '#9fb6d0', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2 }));
  glass.position.set(0, (wy0 + wy1) / 2, -D / 2); G.add(glass);
  // la vue : une grande toile peinte, loin derrière la fenêtre (elle ne prend pas la lumière de la chambre)
  const views = { nuit: lyonTex(true), jour: lyonTex(false) };
  const viewM = new THREE.MeshBasicMaterial({ map: views.nuit, fog: false });
  const view = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), viewM); view.position.set(0, 6, -D / 2 - 40); G.add(view);
  // le lit (contre le mur est), la couette froissée, l'oreiller
  const wood = std({ color: '#3b2a20' });
  bx(1.5, 0.3, 2.05, wood, G, 1.2, 0.15, 0.6); bx(1.5, 0.9, 0.08, wood, G, 1.2, 0.45, -0.45);
  bx(1.42, 0.2, 1.95, std({ color: '#d6d3cc' }), G, 1.2, 0.4, 0.62);
  const duvet = bx(1.46, 0.12, 1.3, std({ color: '#3f5f86' }), G, 1.2, 0.56, 0.95); duvet.rotation.z = 0.03;
  bx(0.6, 0.12, 0.38, std({ color: '#efece6' }), G, 0.92, 0.57, -0.2); bx(0.6, 0.12, 0.38, std({ color: '#efece6' }), G, 1.52, 0.57, -0.2);
  // la table de chevet et le réveil (les chiffres rouges se redessinent)
  bx(0.45, 0.5, 0.4, wood, G, 0.2, 0.25, -0.2);
  const cc = document.createElement('canvas'); cc.width = 64; cc.height = 24; const cg = cc.getContext('2d');
  const ctex = new THREE.CanvasTexture(cc); ctex.magFilter = THREE.NearestFilter; ctex.minFilter = THREE.NearestFilter; ctex.generateMipmaps = false;
  bx(0.2, 0.09, 0.08, std({ color: '#111' }), G, 0.2, 0.545, -0.2);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.07), new THREE.MeshBasicMaterial({ map: ctex, toneMapped: false })); face.position.set(0.2, 0.545, -0.159); G.add(face);
  let shown = '';
  const clock = (txt) => { if (txt === shown) return; shown = txt; cg.fillStyle = '#050000'; cg.fillRect(0, 0, 64, 24); cg.fillStyle = '#ff2a1a'; cg.font = 'bold 20px monospace'; cg.textAlign = 'center'; cg.fillText(txt, 32, 19); ctex.needsUpdate = true; };
  clock('23:04');
  // le bureau, la lampe, la chaise ; le poster ; la porte ; le tapis
  bx(1.3, 0.05, 0.6, wood, G, -1.6, 0.75, 0.4, Math.PI / 2); for (const [x, z] of [[-1.85, -0.2], [-1.35, -0.2], [-1.85, 1.0], [-1.35, 1.0]]) bx(0.05, 0.75, 0.05, wood, G, x, 0.375, z);
  bx(0.5, 0.32, 0.03, std({ color: '#151518' }), G, -1.75, 0.95, 0.4, Math.PI / 2);   // un écran éteint
  bx(0.12, 0.4, 0.12, std({ color: '#c9a86a' }), G, -1.75, 0.98, -0.05);
  const poster = pixTex(32, 48, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#203a6a'); gr.addColorStop(1, '#c2452f'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#f4d35e'; g.beginPath(); g.arc(16, 20, 8, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(0, 36, w, 12); });
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshStandardMaterial({ map: poster, roughness: 0.8 })); pm.position.set(-W / 2 + 0.06, 1.6, 0.6); pm.rotation.y = Math.PI / 2; G.add(pm);
  bx(0.9, 2.05, 0.05, std({ color: '#cfc9bd' }), G, 1.2, 1.025, D / 2 - 0.06);
  bx(1.6, 0.01, 1.1, std({ color: '#7a2f2a' }), G, 0, 0.005, 0.9);
  // les lumières : la lueur de la ville par la fenêtre (nuit) ou le jour ; la lampe de chevet
  const winL = new THREE.SpotLight('#7d8cc4', 0, 14, 0.9, 0.8, 1.2); winL.position.set(0, 2.0, -D / 2 - 2.5); winL.target.position.set(0.6, 0.3, 0.8); G.add(winL, winL.target);
  winL.castShadow = true; winL.shadow.mapSize.set(512, 512); winL.shadow.bias = -0.001;
  const amb = new THREE.HemisphereLight('#4a5070', '#1a1612', 0.15); G.add(amb);
  return { root: G, at, W, D, H, bed: V3(1.2, 0.5, 0.6).add(at), sitBed: V3(0.75, 0, -0.1).add(at), clock, view: (k) => { viewM.map = views[k]; viewM.needsUpdate = true; }, winL, amb };
}

// =====================================================================
//  L'AUTOROUTE (on roule vers +x) : 3 voies de 3,5 m + bande d'arrêt d'urgence, terre-plein central en béton,
//  glissière à droite, plots réfléchissants, lampadaires au sodium tous les 50 m (ceux près de la voiture éclairent vraiment)
// =====================================================================
export function buildHighway(scene, { x0 = -200, x1 = 2400, lampEvery = 50 } = {}) {
  const G = new THREE.Group(); scene.add(G); const L = x1 - x0, cx = (x0 + x1) / 2;
  // la chaussée (largeur 3 × 3,5 + 3 = 13,5 m, de z = -7.25 à +6.25) : une texture de 13 m qui se répète (trait 3 m, vide 10 m)
  const road = pixTex(64, 128, (g, w, h) => {
    const r = rng(81); g.fillStyle = '#2e2f33'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = (r() * 40) | 0; g.fillStyle = `rgb(${40 + v},${41 + v},${45 + v})`; g.globalAlpha = 0.3; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } g.globalAlpha = 1;
    const px = (z) => Math.round((6.25 - z) / 13.5 * w);   // (la texture est posée « à l’envers » sur la route : u va vers -z)
    g.fillStyle = '#d8d6cc'; g.fillRect(px(-7.0), 0, 1, h); g.fillRect(px(3.25), 0, 1, h);                // lignes de bord (continues)
    for (const z of [-3.75, -0.25]) g.fillRect(px(z), 0, 1, Math.round(h * 3 / 13));                   // lignes entre les voies : 3 m sur 13
    for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px(3.4), y, 2, 1); }   // la bande sonore, sur la bande d'arrêt d'urgence
  });
  road.wrapS = road.wrapT = THREE.RepeatWrapping; road.repeat.set(1, L / 13);
  const rg = new THREE.PlaneGeometry(13.5, L); rg.rotateX(-Math.PI / 2); rg.rotateY(Math.PI / 2);
  const rm = new THREE.Mesh(rg, std({ map: road, roughness: 0.75 })); rm.position.set(cx, 0.01, -0.5); rm.receiveShadow = true; G.add(rm);
  // les bas-côtés (herbe sombre)
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(L, 200), std({ color: '#1d2416' })); grass.rotation.x = -Math.PI / 2; grass.position.set(cx, 0, 0); grass.receiveShadow = true; G.add(grass);
  // le terre-plein central (béton) à gauche, la glissière à droite
  const conc = std({ color: '#8d8b85' }), steel = std({ color: '#9aa0a6', metalness: 0.6, roughness: 0.4 });
  const gba = new THREE.Shape(); gba.moveTo(-0.3, 0); gba.lineTo(0.3, 0); gba.lineTo(0.12, 0.3); gba.lineTo(0.08, 0.8); gba.lineTo(-0.08, 0.8); gba.lineTo(-0.12, 0.3); gba.closePath();
  const gg = new THREE.ExtrudeGeometry(gba, { depth: L, bevelEnabled: false }); gg.rotateY(Math.PI / 2); const gm = new THREE.Mesh(gg, conc); gm.position.set(x0, 0, -7.6); gm.castShadow = gm.receiveShadow = true; G.add(gm);
  bx(L, 0.3, 0.08, steel, G, cx, 0.6, 6.6);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), steel, Math.ceil(L / 4)); for (let i = 0; i < posts.count; i++) { const m = new THREE.Matrix4().makeTranslation(x0 + i * 4, 0.3, 6.65); posts.setMatrixAt(i, m); } G.add(posts);
  const refl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.1, 0.12), new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false }), Math.ceil(L / 25)); for (let i = 0; i < refl.count; i++) refl.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x0 + i * 25, 0.85, 6.55)); G.add(refl);
  // les lampadaires (sodium, orange) côté droit
  const lamps = [], poleM = std({ color: '#55585c' }), headM = new THREE.MeshBasicMaterial({ color: '#ffb35a', toneMapped: false });
  for (let x = x0; x < x1; x += lampEvery) { bx(0.15, 10, 0.15, poleM, G, x, 5, 7.6); bx(0.12, 0.12, 3.2, poleM, G, x, 10, 6.1); const h = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), headM); h.position.set(x, 9.9, 4.6); G.add(h); lamps.push(x); }
  const pl = [new THREE.PointLight('#ff9d3c', 0, 32, 1.4), new THREE.PointLight('#ff9d3c', 0, 32, 1.4), new THREE.PointLight('#ff9d3c', 0, 32, 1.4)];
  pl.forEach((p) => G.add(p));
  /** allume les 3 lampadaires les plus proches du point x (les autres restent des points orange) */
  const lightAround = (x, k = 1) => { const i0 = Math.round((x - x0) / lampEvery); pl.forEach((p, j) => { const lx = x0 + (i0 - 1 + j) * lampEvery; p.position.set(lx, 9.6, 4.6); p.intensity = 170 * k; }); };
  return { root: G, lightAround, lights: pl, lane: (n) => -5.5 + n * 3.5, shoulder: 4.75 };
}

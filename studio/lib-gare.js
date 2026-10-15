// =====================================================================
//  LE HALL DE GARE (façon Lyon Part-Dieu) — pour « Et si Internet s'arrêtait partout pendant 24 h ? »
//  Un grand hall vitré : le tableau des départs (qui peut afficher « informations indisponibles »), un café avec son terminal
//  de paiement (qui affiche « REFUSÉ »), un distributeur de billets (« HORS SERVICE »), des bancs, des piliers.
//  Et deux petits accessoires : l'écran du téléphone (« aucune connexion », ou une carte vide avec ton point bleu),
//  et le kit d'urgence posé sur une table (billets, radio à piles, bouteilles d'eau, lampe).
//
//  const GA = buildHall(scene, { at });   → GA.board('ok'|'panne'), GA.tpe('ok'|'refuse'), GA.dab, GA.cafe (où se tenir)…
//  const PH = makePhoneScreen();          → PH.mesh (un téléphone), PH.show('noco' | 'map' | 'home', t)
//  makeKit(scene, at)                     → le kit d'urgence
// =====================================================================
import { THREE, rng, clamp } from './engine.js';
import { pixTex } from './lib-ps2.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
const bx = (w, h, d, mat, p, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; p.add(m); return m; };
const canvasTex = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return { c, g: c.getContext('2d'), t }; };

export function buildHall(scene, { at = V3(0, 0, -600) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const W = 32, D = 20, H = 9;
  const floorT = pixTex(32, 32, (g, w, h) => { const r = rng(101); g.fillStyle = '#b8b3a8'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < w; i += 16) { g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } }, 16);
  bx(W, 0.1, D, std({ map: floorT, roughness: 0.5 }), G, 0, -0.05, 0);
  bx(W, 0.3, D, std({ color: '#d8d6d0' }), G, 0, H, 0);
  // le mur du fond (côté -z) : béton clair ; les murs latéraux ; la façade vitrée (côté +z) avec ses montants
  const conc = std({ color: '#c9c5bc' });
  bx(W, H, 0.3, conc, G, 0, H / 2, -D / 2); bx(0.3, H, D, conc, G, -W / 2, H / 2, 0); bx(0.3, H, D, conc, G, W / 2, H / 2, 0);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: '#b9cfdc', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.3 })); glass.position.set(0, H / 2, D / 2); glass.rotation.y = Math.PI; G.add(glass);
  const steel = std({ color: '#5f6368', metalness: 0.5, roughness: 0.5 });
  for (let x = -W / 2; x <= W / 2; x += 4) bx(0.12, H, 0.12, steel, G, x, H / 2, D / 2 - 0.06); bx(W, 0.12, 0.12, steel, G, 0, 3.0, D / 2 - 0.06);
  // dehors : le parvis et les tours (une toile peinte)
  const outT = pixTex(128, 64, (g, w, h) => { const r = rng(103); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fbbd6'); gr.addColorStop(1, '#e3e1d8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 14) { const hh = 18 + r() * 34; g.fillStyle = ['#8d939a', '#a6aab0', '#6f7780'][(r() * 3) | 0]; g.fillRect(x, h - 10 - hh, 12, hh); for (let y = h - 8 - hh; y < h - 12; y += 3) for (let k = 0; k < 12; k += 3) { g.fillStyle = 'rgba(30,40,55,.5)'; g.fillRect(x + k + 1, y, 1, 1); } }
    g.fillStyle = '#9a958c'; g.fillRect(0, h - 10, w, 10); });
  const out = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), new THREE.MeshBasicMaterial({ map: outT, fog: false })); out.position.set(0, 16, D / 2 + 25); out.rotation.y = Math.PI; G.add(out);
  // les piliers
  for (const x of [-9, 0, 9]) bx(0.8, H, 0.8, conc, G, x, H / 2, -3);
  // les bancs
  const bench = std({ color: '#3b3f45', metalness: 0.4 });
  for (const [x, z] of [[-12, 6], [-6, 6], [6, 6], [12, 6]]) { bx(2.4, 0.08, 0.5, bench, G, x, 0.45, z); bx(2.4, 0.5, 0.06, bench, G, x, 0.7, z - 0.25); for (const dx of [-1, 1]) bx(0.06, 0.45, 0.4, bench, G, x + dx, 0.22, z); }
  // le tableau des départs (sur le mur du fond)
  const B = canvasTex(256, 96);
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ map: B.t, toneMapped: false })); boardMesh.position.set(-2, 5.4, -D / 2 + 0.2); G.add(boardMesh);
  bx(8.3, 3.3, 0.2, std({ color: '#111' }), G, -2, 5.4, -D / 2 + 0.06);
  let boardShown = '';
  function board(mode, t = 0) {
    const key = mode + (mode === 'panne' ? Math.floor(t * 2) % 2 : ''); if (key === boardShown) return; boardShown = key; const g = B.g;
    g.fillStyle = '#05122e'; g.fillRect(0, 0, 256, 96); g.font = 'bold 9px monospace'; g.textAlign = 'left';
    g.fillStyle = '#ffd34d'; g.fillText('DÉPARTS', 6, 11); g.fillStyle = '#fff'; g.fillText('HEURE   DESTINATION         VOIE', 60, 11);
    const rows = [['07:42', 'PARIS GARE DE LYON', 'G'], ['07:51', 'MARSEILLE ST-CHARLES', 'K'], ['07:58', 'GRENOBLE', 'B'], ['08:04', 'ANNECY', 'D'], ['08:12', 'DIJON', 'H'], ['08:20', 'MONTPELLIER', 'L']];
    if (mode === 'ok') rows.forEach(([h, d, v], i) => { const y = 25 + i * 12; g.fillStyle = '#fff'; g.fillText(h, 6, y); g.fillText(d, 50, y); g.fillStyle = '#ffd34d'; g.fillText(v, 230, y); });
    else { g.fillStyle = '#ff5a4f'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; if (key.endsWith('0')) g.fillText('INFORMATIONS', 128, 46); g.fillText(key.endsWith('0') ? 'INDISPONIBLES' : '— — —', 128, 62); }
    B.t.needsUpdate = true;
  }
  board('ok');
  // le café : un comptoir, une machine à café, le terminal de paiement (son écran peut afficher REFUSÉ)
  const CA = V3(9, 0, -7.0), wood = std({ color: '#6b4126', roughness: 0.6 });
  bx(4, 1.05, 0.7, wood, G, CA.x, 0.525, CA.z); bx(4.1, 0.05, 0.8, std({ color: '#2b2b2b', roughness: 0.3 }), G, CA.x, 1.075, CA.z);
  bx(0.6, 0.5, 0.4, std({ color: '#a8acb0', metalness: 0.6, roughness: 0.3 }), G, CA.x - 1.2, 1.35, CA.z - 0.1);
  bx(4, 2.4, 0.1, std({ color: '#3a2a20' }), G, CA.x, 2.3, CA.z - 1.6);
  const menuT = pixTex(64, 32, (g, w, h) => { g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2e6c8'; g.font = 'bold 7px sans-serif'; g.fillText('CAFÉ ........ 1,90', 4, 9); g.fillText('CROISSANT ... 1,30', 4, 18); g.fillText('JUS .......... 3,50', 4, 27); });
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: menuT })); menu.position.set(CA.x, 2.6, CA.z - 1.54); G.add(menu);
  const T = canvasTex(48, 64);
  const tpe = new THREE.Group(); tpe.position.set(CA.x + 0.6, 1.1, CA.z + 0.25); tpe.rotation.y = Math.PI; tpe.rotation.x = -0.5; G.add(tpe);   // (l'écran est tourné vers le client)
  bx(0.09, 0.03, 0.18, std({ color: '#222' }), tpe, 0, 0.015, 0);
  const tpeScr = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ map: T.t, toneMapped: false })); tpeScr.rotation.set(-Math.PI / 2, 0, Math.PI); tpeScr.position.set(0, 0.031, -0.04); tpe.add(tpeScr);
  for (let i = 0; i < 9; i++) bx(0.016, 0.006, 0.014, std({ color: '#888' }), tpe, (i % 3 - 1) * 0.022, 0.033, 0.03 + Math.floor(i / 3) * 0.02);
  let tpeShown = '';
  function tpeShow(mode) { if (mode === tpeShown) return; tpeShown = mode; const g = T.g; g.fillStyle = mode === 'refuse' ? '#3a0a08' : '#0d2a14'; g.fillRect(0, 0, 48, 64); g.textAlign = 'center'; g.font = 'bold 8px sans-serif';
    if (mode === 'refuse') { g.fillStyle = '#ff5a4f'; g.fillText('PAIEMENT', 24, 22); g.fillText('REFUSÉ', 24, 34); g.fillStyle = '#ffd1c8'; g.font = '6px sans-serif'; g.fillText('PAS DE RÉSEAU', 24, 48); }
    else { g.fillStyle = '#9ff0b0'; g.fillText('1,90 €', 24, 24); g.font = '6px sans-serif'; g.fillText('PRÉSENTEZ', 24, 38); g.fillText('VOTRE CARTE', 24, 46); }
    T.t.needsUpdate = true; }
  tpeShow('ok');
  // le distributeur de billets, dans le mur de gauche
  const DA = V3(-W / 2 + 0.2, 0, 2);
  bx(0.4, 2.2, 1.2, std({ color: '#6d7278', metalness: 0.4 }), G, DA.x + 0.2, 1.1, DA.z);
  const D2 = canvasTex(64, 48); const g2 = D2.g; g2.fillStyle = '#0a1a3a'; g2.fillRect(0, 0, 64, 48); g2.fillStyle = '#ff5a4f'; g2.font = 'bold 9px sans-serif'; g2.textAlign = 'center'; g2.fillText('HORS', 32, 20); g2.fillText('SERVICE', 32, 32); D2.t.needsUpdate = true;
  const dabScr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshBasicMaterial({ map: D2.t, toneMapped: false })); dabScr.position.set(DA.x + 0.42, 1.45, DA.z); dabScr.rotation.y = Math.PI / 2; G.add(dabScr);
  const signT = pixTex(64, 16, (g, w, h) => { g.fillStyle = '#1f4fa0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('RETRAIT', w / 2, 12); });
  const ds = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshBasicMaterial({ map: signT })); ds.position.set(DA.x + 0.42, 2.4, DA.z); ds.rotation.y = Math.PI / 2; G.add(ds);
  // la lumière : le jour par la façade, des plafonniers
  const sun = new THREE.DirectionalLight('#fff4e2', 0); sun.position.set(at.x + 6, at.y + 14, at.z + 22); sun.target.position.copy(at); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 14, bottom: -14, near: 5, far: 60 }); scene.add(sun, sun.target);
  const amb = new THREE.HemisphereLight('#e9eef5', '#6b645a', 0); G.add(amb);
  return { root: G, at, W, D, H, board, tpe: tpeShow, tpePos: () => { G.updateMatrixWorld(true); return tpe.localToWorld(V3(0, 0.03, 0)); }, tpeObj: tpe, dabPos: DA.clone().add(at).add(V3(0.42, 1.45, 0)), cafe: CA.clone().add(at),
    boardPos: V3(-2, 5.4, -D / 2 + 0.2).add(at), sun, amb, on(k = 1) { sun.intensity = 2.8 * k; amb.intensity = 1.8 * k; } };
}

// =====================================================================
//  LE TÉLÉPHONE : un boîtier + un écran dessiné (« aucune connexion », ou la carte vide avec le point bleu)
// =====================================================================
export function makePhoneScreen() {
  const S = canvasTex(72, 144);
  const G = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), std({ color: '#121212', roughness: 0.4 })); G.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.145), new THREE.MeshBasicMaterial({ map: S.t, toneMapped: false })); scr.position.z = 0.0051; G.add(scr);
  let shown = '';
  function show(mode, t = 0) {
    const key = mode + Math.floor(t * 4) % 8; if (key === shown) return; shown = key; const g = S.g;
    g.fillStyle = mode === 'map' ? '#d9d6cf' : '#0f1115'; g.fillRect(0, 0, 72, 144);
    g.fillStyle = mode === 'map' ? '#333' : '#fff'; g.font = 'bold 7px sans-serif'; g.textAlign = 'left'; g.fillText('07:31', 4, 9); g.textAlign = 'right'; g.fillText('✕', 68, 9);
    g.textAlign = 'center';
    if (mode === 'noco') {
      // la roue qui tourne dans le vide, puis le message
      const a = (Math.floor(t * 4) % 8) / 8 * Math.PI * 2; for (let i = 0; i < 8; i++) { const b = a + i / 8 * Math.PI * 2; g.fillStyle = `rgba(255,255,255,${0.15 + 0.85 * i / 8})`; g.fillRect(36 + Math.cos(b) * 9 - 1, 52 + Math.sin(b) * 9 - 1, 3, 3); }
      g.fillStyle = '#fff'; g.font = 'bold 8px sans-serif'; g.fillText('Aucune connexion', 36, 82); g.fillText('Internet', 36, 92);
      g.fillStyle = '#9aa3ad'; g.font = '6px sans-serif'; g.fillText('Vérifie ton réseau', 36, 106);
    } else if (mode === 'map') {
      // la carte n'a pas chargé : des carreaux gris ; seul ton point bleu (le GPS) est là
      for (let y = 14; y < 144; y += 18) for (let x = 0; x < 72; x += 18) { g.fillStyle = ((x + y) / 18) % 2 ? '#cfccc4' : '#c4c1b9'; g.fillRect(x, y, 18, 18); }
      g.fillStyle = 'rgba(40,120,255,.25)'; g.beginPath(); g.arc(36, 80, 12, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(36, 80, 5, 0, 7); g.fill(); g.fillStyle = '#2878ff'; g.beginPath(); g.arc(36, 80, 3.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(15,17,21,.85)'; g.fillRect(4, 118, 64, 20); g.fillStyle = '#fff'; g.font = 'bold 6px sans-serif'; g.fillText('Carte indisponible', 36, 127); g.fillStyle = '#9aa3ad'; g.fillText('hors connexion', 36, 134);
    }
    S.t.needsUpdate = true;
  }
  show('noco');
  return { mesh: G, show };
}

// =====================================================================
//  LE KIT D'URGENCE (posé sur une table) : des billets, une radio à piles, des bouteilles d'eau, une lampe torche
// =====================================================================
export function makeKit(scene, at) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const note = pixTex(32, 16, (g, w, h) => { g.fillStyle = '#7fb39a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(3, 3, 8, 10); g.fillStyle = '#2f5e48'; g.font = 'bold 7px sans-serif'; g.fillText('20', 18, 11); });
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.002, 0.07), std({ map: note })); m.position.set(-0.22 + i * 0.012, 0.002 + i * 0.002, 0.1 + i * 0.01); m.rotation.y = 0.2 + i * 0.12; G.add(m); }
  const radio = new THREE.Group(); radio.position.set(0.05, 0, -0.02); G.add(radio);
  bx(0.24, 0.14, 0.08, std({ color: '#3a3d42' }), radio, 0, 0.07, 0); const grill = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), std({ color: '#1a1a1a' })); grill.position.set(-0.05, 0.07, 0.041); radio.add(grill);
  bx(0.06, 0.025, 0.005, std({ color: '#c8b26a', emissive: '#c8b26a', emissiveIntensity: 0.3 }), radio, 0.06, 0.1, 0.041); const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 4), std({ color: '#bbb', metalness: 0.7 })); ant.position.set(0.1, 0.27, 0); ant.rotation.z = -0.3; radio.add(ant);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 10), new THREE.MeshStandardMaterial({ color: '#9fd0f0', transparent: true, opacity: 0.55, roughness: 0.1 })); b.position.set(0.32 + i * 0.09, 0.15, -0.08); G.add(b);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.03, 8), std({ color: '#2a6fc2' })); cap.position.set(0.32 + i * 0.09, 0.315, -0.08); G.add(cap); }
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.18, 10), std({ color: '#d4a20c' })); torch.rotation.z = Math.PI / 2; torch.position.set(0.12, 0.026, 0.14); G.add(torch);
  return G;
}

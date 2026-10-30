// =====================================================================
//  L'HÔPITAL (et ses alentours) — décors au rendu « propre » (pas de PS2), pour « Et si toutes les infirmières de France
//  s'arrêtaient une semaine ? » (30/10/2026). Réutilisable pour toute vidéo qui se passe à l'hôpital, en EHPAD ou chez
//  une personne âgée. Comme des décors de théâtre : chaque lieu est construit loin des autres et on n'en montre qu'un à
//  la fois (X.show(true|false)). Chaque lieu a ses lampes (X.lights), ses caméras fixes (X.cams.nom = { p, l, fov }) et
//  ses réglages d'ambiance (X.mood('matin' | 'nuit' | …)).
//
//  const PO = buildPoste(scene, { at })     → le poste de soins : bureau, écrans, tableau des transmissions, classeurs,
//       horloge numérique (PO.clock('06:59:52')), fenêtre à l'aube, chariot de soins, évier, porte vers le couloir.
//  const CO = buildCouloir(scene, { at, style: 'hopital' | 'ehpad' }) → un long couloir : portes numérotées, VOYANTS D'APPEL
//       au-dessus des portes (CO.calls[i].set(k), k de 0 à 1 ; CO.calls est trié du plus proche au plus loin de la caméra),
//       mains courantes, horloge suspendue (CO.clock('07:14')), signalétique, fauteuil roulant, chariots.
//  const CH = buildChambre(scene, { at })   → une chambre : lit médicalisé à barrières (CH.lie = où poser le patient),
//       pied à perfusion avec sa poche, moniteur (CH.tick(t) fait défiler l'électrocardiogramme), rampe murale, fauteuil
//       (CH.seat), fenêtre, tableau « Aujourd'hui, votre infirmière : … » resté vide.
//  const UR = buildUrgences(scene, { at })  → la salle d'attente des urgences : rangées de sièges (UR.seats[i] = { p, ry }),
//       banque d'accueil vide, brancard dans le couloir, signalétique.
//  const DO = buildDomicile(scene, { at })  → le salon d'une personne âgée : fauteuil (DO.seat), guéridon et pilulier,
//       horloge murale à balancier (DO.clock(h, m, s)), fenêtre à voilages, buffet et photos, porte d'entrée.
//  const MI = buildMinistere(scene, { at }) → une salle de réunion, la nuit : grande table, chaises, dossiers, drapeaux,
//       hautes fenêtres sur les toits de Paris.
//  Accessoires seuls : makeBed(), makeIVPole(), makeMonitor(), makeCart(), makeWheelchair(), makeCallLight(),
//       makeDigitalClock(), makeWallClock(), makeStretcher(), makeChairRow(), makeArmchair()…
// =====================================================================
import { THREE, rng, canvasTex, bake } from './engine.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, ...o });
function mesh(geo, mat, p, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; if (p) p.add(m); return m;
}
const bx = (w, h, d, mat, p, x, y, z, ry = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, x, y, z, 0, ry, 0);
/** une boîte posée par ses bornes */
const bb = (x0, x1, y0, y1, z0, z1, mat, p) => bx(x1 - x0, y1 - y0, z1 - z0, mat, p, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const rb = (w, h, d, r, mat, p, x, y, z, ry = 0) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, p, x, y, z, 0, ry, 0);
const cyl = (r, h, mat, p, x, y, z, seg = 16, rx = 0, rz = 0) => mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, p, x, y, z, rx, 0, rz);
/** un tube droit entre deux points */
function rod(a, b, r, mat, p, seg = 8) {
  const d = b.clone().sub(a), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat, p);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); return m;
}
const plane = (w, h, mat, p, x, y, z, rx = 0, ry = 0) => { const m = mesh(new THREE.PlaneGeometry(w, h), mat, p, x, y, z, rx, ry, 0); m.castShadow = false; return m; };
const rep = (t, rx, ry = rx) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
const glow = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });

// =====================================================================
//  LES MATIÈRES (textures dessinées une fois, nettes et lissées)
// =====================================================================
/** sol vinyle d'hôpital : moucheté, un léger joint tous les 2 m (la texture couvre 2 m × 2 m) */
export function vinylTex(base = '#cfcac0', seed = 5, seams = true) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < 14000; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.05 + r() * 0.08})` : `rgba(0,0,0,${0.04 + r() * 0.07})`; g.fillRect(r() * w, r() * h, 1 + r() * 2.2, 1 + r() * 2.2); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,0.025)'; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }
    if (seams) { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }
  });
}
/** peinture murale (un grain très léger) */
export function paintTex(base = '#dfe6e3', seed = 9) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  });
}
/** faux plafond en dalles de 60 cm (la texture couvre 1,2 m) */
export function ceilTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f1f1ee'; g.fillRect(0, 0, w, h); const r = rng(3);
    for (let i = 0; i < 2500; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(r() * w, r() * h, 1, 1); }
    g.fillStyle = '#c9cac6'; for (const k of [0, 128]) { g.fillRect(k, 0, 3, h); g.fillRect(0, k, w, 3); }
  });
}
/** bois clair (portes, mobilier), veinage vertical */
export function woodTex(base = '#c49a6c', seed = 11, w = 256, h = 512) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < 90; i++) { const x = r() * w; g.strokeStyle = `rgba(${r() < 0.5 ? '90,55,25' : '255,235,200'},${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 3;
      g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * 0.01 + i) * (3 + r() * 4), y); g.stroke(); }
  });
}
/** parquet (lames de 12 cm), la texture couvre 1,2 m */
export function parquetTex(base = '#9b6b43') {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(21);
    for (let row = 0; row < 10; row++) {
      let x = -r() * 200;
      while (x < w) { const L = 160 + r() * 200, c = 0.85 + r() * 0.3; const col = new THREE.Color(base).multiplyScalar(c);
        g.fillStyle = `#${col.getHexString()}`; g.fillRect(x, row * 51.2, L, 51.2);
        for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(60,35,15,0.08)'; g.fillRect(x, row * 51.2 + r() * 50, L, 1); }
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, row * 51.2, 2, 51.2); x += L; }
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, row * 51.2, w, 2);
    }
  });
}
/** papier peint à petites fleurs (salon de Jeanne) */
export function wallpaperTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(160,120,80,0.10)'; g.fillRect(x, 0, 12, h); }
    const r = rng(4);
    for (let y = 16; y < h; y += 32) for (let x = (y / 32 % 2) * 16 + 8; x < w; x += 32) {
      g.fillStyle = 'rgba(176,96,96,0.45)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 3.5, y + Math.sin(k * 1.26) * 3.5, 2.6, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(110,130,80,0.5)'; g.beginPath(); g.ellipse(x + 5, y + 6, 4, 1.6, 0.6 + r() * 0.3, 0, 7); g.fill();
    }
  });
}
/** une pancarte : texte blanc sur fond de couleur (ou l'inverse), avec flèche ou pictogramme optionnels */
export function signTex(lines, { bg = '#1f4e6b', fg = '#ffffff', w = 1024, h = 256, font = 'Inter', weight = 600, size = 92, align = 'center', pad = 50, arrow = '', sub } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textBaseline = 'middle';
    const L = [].concat(lines); const lh = h / (L.length + (sub ? 0.6 : 0));
    L.forEach((t, i) => { g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.fillText(t, align === 'left' ? pad + (arrow === '←' ? 120 : 0) : w / 2, lh * (i + 0.55)); });
    if (sub) { g.font = `500 ${size * 0.5}px ${font}`; g.globalAlpha = 0.85; g.textAlign = align; g.fillText(sub, align === 'left' ? pad : w / 2, h - lh * 0.45); g.globalAlpha = 1; }
    if (arrow) { g.font = `700 ${size * 1.1}px ${font}`; g.textAlign = arrow === '←' ? 'left' : 'right'; g.fillText(arrow, arrow === '←' ? pad - 10 : w - pad + 10, h / 2); }
  });
}
/** la vue par une fenêtre : ciel (aube, jour, soir, nuit) + bâtiments au loin (hôpital, ville ou village) */
export function viewTex(mode = 'aube', kind = 'ville', seed = 7) {
  return canvasTex(1024, 640, (g, W, H) => {
    const r = rng(seed), sky = g.createLinearGradient(0, 0, 0, H * 0.75);
    const C = { aube: ['#41557e', '#c98b7c', '#f4c48a'], jour: ['#6f9fd6', '#bcd3e8', '#e3ecf2'], matin: ['#7ea6d4', '#c9dae9', '#f1ead8'], soir: ['#1f2a4c', '#6a527a', '#d8906a'], nuit: ['#04060d', '#0b1124', '#1a1f33'] }[mode];
    sky.addColorStop(0, C[0]); sky.addColorStop(0.6, C[1]); sky.addColorStop(1, C[2]); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (mode === 'aube') { const sg = g.createRadialGradient(W * 0.62, H * 0.52, 5, W * 0.62, H * 0.52, 300); sg.addColorStop(0, 'rgba(255,236,190,1)'); sg.addColorStop(0.15, 'rgba(255,214,150,0.7)'); sg.addColorStop(1, 'rgba(255,190,140,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, H); }
    if (mode === 'nuit') for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; g.fillRect(r() * W, r() * H * 0.5, 1.5, 1.5); }
    if (mode !== 'nuit') for (let i = 0; i < 7; i++) { g.fillStyle = mode === 'aube' ? 'rgba(255,200,170,0.35)' : 'rgba(255,255,255,0.5)'; const cx = r() * W, cy = 40 + r() * 160; g.beginPath(); g.ellipse(cx, cy, 60 + r() * 90, 8 + r() * 10, 0, 0, 7); g.fill(); }
    const night = mode === 'nuit' || mode === 'soir';
    const rows = kind === 'village' ? 2 : 3;
    for (let row = 0; row < rows; row++) {
      const base = H * (0.6 + row * 0.12), sc = 1 + row * 0.6;
      for (let x = -20; x < W;) {
        const bw = (kind === 'village' ? 60 + r() * 70 : 50 + r() * 90) * sc, bh = (kind === 'village' ? 30 + r() * 25 : 50 + r() * 140 / (row + 1)) * sc;
        const shade = night ? 12 + row * 6 : (mode === 'aube' ? 90 + row * 18 : 150 + row * 18);
        const tone = kind === 'village' ? [shade + 40, shade + 25, shade + 5] : [shade, shade + 4, shade + 12];
        g.fillStyle = `rgb(${tone.map((v) => Math.min(255, v | 0)).join(',')})`; g.fillRect(x, base - bh, bw, H);
        if (kind === 'village') { g.fillStyle = night ? '#1a1414' : (mode === 'aube' ? '#7a4a40' : '#a85a42'); g.beginPath(); g.moveTo(x - 4, base - bh); g.lineTo(x + bw / 2, base - bh - 22 * sc); g.lineTo(x + bw + 4, base - bh); g.fill(); }
        for (let wy = base - bh + 8 * sc; wy < base - 6; wy += 16 * sc) for (let wx = x + 6 * sc; wx < x + bw - 8 * sc; wx += 14 * sc) {
          const lit = night ? r() < 0.35 : false;
          g.fillStyle = lit ? `rgba(255,${200 + (r() * 40 | 0)},140,0.9)` : (night ? 'rgba(0,0,0,0.4)' : `rgba(40,50,70,${0.25 + r() * 0.2})`);
          g.fillRect(wx, wy, 6 * sc, 8 * sc);
        }
        x += bw + (kind === 'village' ? 6 + r() * 20 : 2 + r() * 10);
      }
    }
    if (kind === 'village' || kind === 'parc') for (let i = 0; i < 26; i++) { g.fillStyle = night ? '#0b100c' : (mode === 'aube' ? '#3f5040' : '#56724c'); const tx = r() * W, ty = H * (0.8 + r() * 0.15), tr = 20 + r() * 34; g.beginPath(); g.arc(tx, ty, tr, 0, 7); g.fill(); }
  });
}
/** la vue sur les toits de Paris, la nuit, avec la tour Eiffel illuminée au loin */
export function parisNightTex() {
  return canvasTex(1024, 768, (g, W, H) => {
    const r = rng(1889), sky = g.createLinearGradient(0, 0, 0, H * 0.8);
    sky.addColorStop(0, '#050913'); sky.addColorStop(0.7, '#141c33'); sky.addColorStop(1, '#2c2a3a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // la tour Eiffel, dorée
    const tx = W * 0.68, ty = H * 0.66;
    g.fillStyle = 'rgba(255,190,90,0.18)'; g.beginPath(); g.arc(tx, ty - 120, 160, 0, 7); g.fill();
    g.strokeStyle = '#f4b75a'; g.fillStyle = '#e8a447'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(tx - 46, ty); g.quadraticCurveTo(tx - 12, ty - 90, tx - 4, ty - 250); g.lineTo(tx + 4, ty - 250); g.quadraticCurveTo(tx + 12, ty - 90, tx + 46, ty); g.lineTo(tx + 28, ty); g.quadraticCurveTo(tx, ty - 40, tx - 28, ty); g.closePath(); g.fill();
    g.fillRect(tx - 1.5, ty - 285, 3, 40);
    for (const yy of [ty - 60, ty - 130]) g.fillRect(tx - (yy === ty - 60 ? 26 : 12), yy, (yy === ty - 60 ? 52 : 24), 5);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,240,200,0.9)'; g.fillRect(tx - 30 + r() * 60 * (1 - i / 60), ty - r() * 240, 1.5, 1.5); }
    // les toits en zinc, cheminées, fenêtres allumées
    for (let row = 0; row < 3; row++) {
      const base = H * (0.7 + row * 0.11), sc = 1 + row * 0.8;
      for (let x = -30; x < W;) {
        const bw = (70 + r() * 90) * sc, bh = (30 + r() * 30) * sc;
        g.fillStyle = `rgb(${18 + row * 6},${20 + row * 6},${30 + row * 8})`; g.fillRect(x, base - bh, bw, H);
        g.fillStyle = `rgb(${34 + row * 8},${38 + row * 8},${52 + row * 8})`; g.beginPath(); g.moveTo(x, base - bh); g.lineTo(x + 10 * sc, base - bh - 16 * sc); g.lineTo(x + bw - 10 * sc, base - bh - 16 * sc); g.lineTo(x + bw, base - bh); g.fill();
        for (let k = 0; k < 3; k++) { g.fillStyle = '#141620'; g.fillRect(x + r() * bw, base - bh - 26 * sc, 5 * sc, 12 * sc); }
        for (let wx = x + 8 * sc; wx < x + bw - 10 * sc; wx += 16 * sc) for (let wy = base - bh + 10 * sc; wy < base; wy += 20 * sc) {
          g.fillStyle = r() < 0.3 ? `rgba(255,${190 + (r() * 50 | 0)},120,0.85)` : 'rgba(8,10,16,0.6)'; g.fillRect(wx, wy, 7 * sc, 10 * sc); }
        x += bw + r() * 6;
      }
    }
  });
}

// =====================================================================
//  LES ACCESSOIRES
// =====================================================================
const M = {};   // matières partagées (créées à la première demande)
function mats() {
  if (M.ok) return M;
  Object.assign(M, {
    ok: true,
    steel: std({ color: '#c9ced5', metalness: 0.85, roughness: 0.28 }), chrome: std({ color: '#e4e7ec', metalness: 0.95, roughness: 0.15 }),
    dark: std({ color: '#2a2d33', roughness: 0.55 }), black: std({ color: '#111216', roughness: 0.4 }), rubber: std({ color: '#1b1b1d', roughness: 0.9 }),
    white: std({ color: '#f1f2f0', roughness: 0.45 }), plastic: std({ color: '#e7e9ea', roughness: 0.35 }), grey: std({ color: '#9aa1a8', roughness: 0.5 }),
    mattress: std({ color: '#cfd8df', roughness: 0.8 }), sheet: std({ color: '#f4f5f3', roughness: 0.9 }), blanket: std({ color: '#9ec3dc', roughness: 0.95 }),
    pillow: std({ color: '#fbfbf9', roughness: 0.95 }), blueSeat: std({ color: '#2f6fa3', roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: '#bfd4e0', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    bag: new THREE.MeshStandardMaterial({ color: '#eef6fb', transparent: true, opacity: 0.55, roughness: 0.15, depthWrite: false }),
    liquid: new THREE.MeshStandardMaterial({ color: '#e9f3f7', transparent: true, opacity: 0.75, roughness: 0.1 }),
    tube: new THREE.MeshStandardMaterial({ color: '#f2f6f8', transparent: true, opacity: 0.6, roughness: 0.2 }),
  });
  return M;
}
/** des roulettes (pour lits, chariots, pieds à perfusion) */
function caster(p, x, y, z, s = 1) {
  const m = mats();
  cyl(0.012 * s, 0.05 * s, m.steel, p, x, y + 0.075 * s, z, 8);
  mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.025 * s, 14), m.rubber, p, x, y + 0.035 * s, z, 0, 0, Math.PI / 2);
}

/** LE VOYANT D'APPEL au-dessus d'une porte (la « sonnette » du patient) : un boîtier qui dépasse du mur, avec un hublot rouge
 *  de chaque côté (visible de tout le couloir). set(k) : 0 éteint → 1 allumé (le rouge s'éclaire, un halo baigne le mur). */
export function makeCallLight({ side = 1 } = {}) {
  const m = mats(), G = new THREE.Group();
  rb(0.32, 0.13, 0.1, 0.015, m.plastic, G, 0.16 * side, 0, 0);
  const lensMat = std({ color: '#6a2a24', roughness: 0.25, emissive: '#ff2a12', emissiveIntensity: 0 });
  for (const sz of [-1, 1]) rb(0.2, 0.085, 0.012, 0.01, lensMat, G, 0.19 * side, 0, sz * 0.051);       // un hublot sur chaque face (visible de tout le couloir)
  mesh(new THREE.BoxGeometry(0.2, 0.012, 0.07), lensMat, G, 0.19 * side, -0.066, 0);                    // et dessous
  mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12), std({ color: '#2f5a33', roughness: 0.3 }), G, 0.06 * side, 0, 0.052, Math.PI / 2);
  // le halo (taches de lumière additives sur le mur et autour du hublot)
  const haloTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const haloM = new THREE.MeshBasicMaterial({ map: haloTex, color: '#ff3a1c', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const wall = plane(1.3, 1.0, haloM, G, 0.004 * side, -0.08, 0, 0, side * Math.PI / 2);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: '#ff4a2a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  spr.scale.setScalar(0.7); spr.position.set(0.19 * side, 0, 0); G.add(spr);
  let cur = -1;
  G.set = (k) => { if (Math.abs(k - cur) < 1e-3) return; cur = k; lensMat.emissiveIntensity = 9 * k; lensMat.color.set(k > 0.05 ? '#ff6a50' : '#6a2a24'); haloM.opacity = 0.55 * k; spr.material.opacity = 0.9 * k; spr.visible = wall.visible = k > 0.01; };
  G.set(0);
  return G;
}

/** une horloge numérique murale (chiffres rouges à 7 segments) ; set('06:59:52') ou set('07:14') */
export function makeDigitalClock({ w = 0.62, h = 0.2, digits = 8, color = '#ff2d1a' } = {}) {
  const m = mats(), G = new THREE.Group();
  rb(w + 0.04, h + 0.04, 0.05, 0.012, m.black, G, 0, 0, 0);
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 200; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const face = plane(w, h, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), G, 0, 0, 0.0255);
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const lit = new THREE.Color(color), dim = lit.clone().multiplyScalar(0.12);
  function digit(x, y, dw, dh, d) {
    const t = dw * 0.17, on = SEG[d] || '';
    const segs = { a: [x + t, y, dw - 2 * t, t], d: [x + t, y + dh - t, dw - 2 * t, t], g: [x + t, y + dh / 2 - t / 2, dw - 2 * t, t],
      f: [x, y + t, t, dh / 2 - t * 1.2], b: [x + dw - t, y + t, t, dh / 2 - t * 1.2], e: [x, y + dh / 2 + t * 0.2, t, dh / 2 - t * 1.2], c: [x + dw - t, y + dh / 2 + t * 0.2, t, dh / 2 - t * 1.2] };
    for (const k in segs) { const [sx, sy, sw, sh] = segs[k]; g.fillStyle = on.includes(k) ? `#${lit.getHexString()}` : `#${dim.getHexString()}`;
      g.beginPath(); if (sw > sh) { g.moveTo(sx, sy + sh / 2); g.lineTo(sx + sh / 2, sy); g.lineTo(sx + sw - sh / 2, sy); g.lineTo(sx + sw, sy + sh / 2); g.lineTo(sx + sw - sh / 2, sy + sh); g.lineTo(sx + sh / 2, sy + sh); }
      else { g.moveTo(sx + sw / 2, sy); g.lineTo(sx + sw, sy + sw / 2); g.lineTo(sx + sw, sy + sh - sw / 2); g.lineTo(sx + sw / 2, sy + sh); g.lineTo(sx, sy + sh - sw / 2); g.lineTo(sx, sy + sw / 2); }
      g.closePath(); g.fill(); }
  }
  let last = '';
  G.set = (str) => {
    if (str === last) return; last = str;
    g.fillStyle = '#050505'; g.fillRect(0, 0, 640, 200);
    const chars = str.split(''), n = chars.length, dw = digits === 8 ? 62 : 92, dh = digits === 8 ? 128 : 140, colon = digits === 8 ? 26 : 36;
    const total = chars.reduce((s, c) => s + (c === ':' ? colon : dw + 14), 0); let x = (640 - total) / 2; const y = (200 - dh) / 2;
    for (const c of chars) {
      if (c === ':') { g.fillStyle = `#${lit.getHexString()}`; for (const yy of [y + dh * 0.3, y + dh * 0.68]) { g.beginPath(); g.arc(x + colon / 2 - 2, yy, 6, 0, 7); g.fill(); } x += colon; }
      else { digit(x, y, dw, dh, c); x += dw + 14; }
    }
    tex.needsUpdate = true;
  };
  G.set(digits === 8 ? '00:00:00' : '00:00');
  return G;
}

/** une horloge murale à aiguilles (avec balancier) ; set(h, m, s, t) */
export function makeWallClock({ r = 0.17, pendulum = true, wood = '#6b4226' } = {}) {
  const m = mats(), G = new THREE.Group();
  const woodM = std({ map: woodTex(wood, 31, 128, 256), roughness: 0.55 });
  if (pendulum) { rb(r * 2.3, r * 4.4, 0.1, 0.02, woodM, G, 0, -r * 1.2, -0.02); }
  cyl(r * 1.12, 0.06, woodM, G, 0, 0, 0.03, 32, Math.PI / 2);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  mesh(new THREE.CircleGeometry(r, 40), std({ map: tex, roughness: 0.5 }), G, 0, 0, 0.0605);
  mesh(new THREE.CircleGeometry(r, 40), m.glass, G, 0, 0, 0.068);
  let bob = null;
  if (pendulum) {
    const piv = new THREE.Group(); piv.position.set(0, -r * 1.25, 0.03); G.add(piv);
    rod(V3(0, 0, 0), V3(0, -r * 2.1, 0), 0.004, std({ color: '#b8923a', metalness: 0.8, roughness: 0.3 }), piv);
    cyl(r * 0.32, 0.012, std({ color: '#c9a043', metalness: 0.85, roughness: 0.25 }), piv, 0, -r * 2.2, 0, 24, Math.PI / 2);
    plane(r * 1.9, r * 2.7, m.glass, G, 0, -r * 2.2, 0.035);
    bob = piv;
  }
  let lastKey = '';
  G.set = (h, mi, s = 0, t = 0) => {
    if (bob) bob.rotation.z = 0.12 * Math.sin(t * Math.PI);   // un balancier qui bat la seconde
    const key = `${h}:${mi}`; if (key === lastKey) return; lastKey = key;
    g.fillStyle = '#f4efe2'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#2a2420'; g.lineWidth = 4; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.stroke();
    g.fillStyle = '#2a2420'; g.font = '500 30px Garamond'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const RN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.save(); g.translate(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.font = '500 24px Garamond'; g.fillText(RN[i], 0, 0); g.restore(); }
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 112 : 106; g.lineWidth = i % 5 ? 1.5 : 3; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * 117, 128 - Math.cos(a) * 117); g.stroke(); }
    const hand = (a, len, w) => { g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(128 - Math.sin(a) * 12, 128 + Math.cos(a) * 12); g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); g.stroke(); };
    hand(((h % 12) + mi / 60) / 12 * Math.PI * 2, 60, 7); hand(mi / 60 * Math.PI * 2, 92, 4.5);
    g.fillStyle = '#2a2420'; g.beginPath(); g.arc(128, 128, 7, 0, 7); g.fill();
    tex.needsUpdate = true;
  };
  G.set(8, 15);
  return G;
}

/** le moniteur (scope) : électrocardiogramme vert qui défile, saturation, tension ; tick(t) */
export function makeMonitor({ w = 0.42, h = 0.3, hr = 78 } = {}) {
  const m = mats(), G = new THREE.Group();
  rb(w + 0.05, h + 0.06, 0.1, 0.02, std({ color: '#d9dcdf', roughness: 0.4 }), G, 0, 0, -0.03);
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 228; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  plane(w, h, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }), G, 0, 0.005, 0.021);
  const ecg = (ph) => { ph = ph % 1; if (ph < 0.08) return Math.sin(ph / 0.08 * Math.PI) * 0.12; if (ph > 0.16 && ph < 0.19) return -0.15; if (ph >= 0.19 && ph < 0.22) return 1.0 - (ph - 0.19) * 30; if (ph >= 0.22 && ph < 0.25) return -0.25; if (ph > 0.38 && ph < 0.52) return Math.sin((ph - 0.38) / 0.14 * Math.PI) * 0.22; return 0; };
  let lastF = -1;
  G.tick = (t) => {
    const f = Math.floor(t * 15); if (f === lastF) return; lastF = f;
    g.fillStyle = '#04080a'; g.fillRect(0, 0, 320, 228);
    const per = 60 / hr, x0 = (t / 4) % 1;
    g.strokeStyle = '#3cff7a'; g.lineWidth = 2.4; g.beginPath();
    for (let x = 0; x < 220; x++) { const tt = (x / 220) * 4 + Math.floor(t / 4) * 4 - (x / 220 > x0 ? 4 : 0); const y = 62 - ecg(tt / per) * 46; if (Math.abs(x / 220 - x0) < 0.02) { g.stroke(); g.beginPath(); continue; } x ? g.lineTo(x + 8, y) : g.moveTo(x + 8, y); }
    g.stroke();
    g.strokeStyle = '#46d4ff'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x < 220; x++) { const y = 140 - Math.max(0, Math.sin(((x / 220) * 4 + t) / per * Math.PI * 2)) * 18; x ? g.lineTo(x + 8, y) : g.moveTo(x + 8, y); } g.stroke();
    g.font = '700 46px Inter'; g.textAlign = 'right'; g.fillStyle = '#3cff7a'; g.fillText(String(hr + Math.round(Math.sin(t * 0.3) * 2)), 312, 70);
    g.fillStyle = '#46d4ff'; g.fillText('96', 312, 150); g.font = '600 15px Inter'; g.fillStyle = '#3cff7a'; g.fillText('FC', 312, 22); g.fillStyle = '#46d4ff'; g.fillText('SpO2', 312, 100);
    g.fillStyle = '#ffffff'; g.font = '600 22px Inter'; g.textAlign = 'left'; g.fillText('PNI 128/74', 10, 210);
    tex.needsUpdate = true;
  };
  G.tick(0);
  return G;
}

/** le lit médicalisé (repère : pieds du lit au sol, la tête vers -z, le pied vers +z, 0,95 m × 2,1 m) */
export function makeBed({ blanket = '#9ec3dc', rails = true, raise = 0.0 } = {}) {
  const m = mats(), G = new THREE.Group(), L = 2.1, W = 0.95, top = 0.6;
  const frameM = std({ color: '#d7dadd', roughness: 0.4, metalness: 0.2 }), panelM = std({ color: '#b88c62', map: woodTex('#b88c62', 41, 128, 128), roughness: 0.5 });
  bb(-W / 2 + 0.05, W / 2 - 0.05, 0.22, 0.3, -L / 2 + 0.1, L / 2 - 0.1, m.grey, G);                       // le châssis (vérin)
  bb(-W / 2, W / 2, 0.42, 0.48, -L / 2, L / 2, frameM, G);                                                // le sommier
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { cyl(0.025, 0.36, m.steel, G, sx * (W / 2 - 0.08), 0.24, sz * (L / 2 - 0.12)); caster(G, sx * (W / 2 - 0.08), 0, sz * (L / 2 - 0.12), 1.1); }
  // tête et pied de lit (panneaux bois clair, cadres gris)
  rb(W + 0.04, 0.55, 0.05, 0.02, panelM, G, 0, 0.78, -L / 2 - 0.02); rb(W + 0.04, 0.42, 0.05, 0.02, panelM, G, 0, 0.7, L / 2 + 0.02);
  // le matelas, le dossier relevé, l'oreiller, le drap et la couverture
  const head = new THREE.Group(); head.position.set(0, 0.48, -L / 2 + 0.72); G.add(head); head.rotation.x = raise;
  rb(W - 0.06, 0.14, 0.72, 0.05, m.mattress, head, 0, 0.07, -0.36);
  rb(0.62, 0.13, 0.36, 0.06, m.pillow, head, 0, 0.18, -0.52);
  rb(W - 0.06, 0.14, L - 0.74, 0.05, m.mattress, G, 0, 0.55, 0.36);
  rb(W - 0.02, 0.05, L - 0.85, 0.02, m.sheet, G, 0, 0.64, 0.42);
  const blk = rb(W + 0.02, 0.06, L - 1.0, 0.03, std({ color: blanket, roughness: 0.95 }), G, 0, 0.665, 0.5);
  bb(-W / 2 - 0.01, -W / 2 + 0.01, 0.5, 0.64, -0.1, L / 2 - 0.08, std({ color: blanket, roughness: 0.95 }), G);   // la couverture qui retombe
  bb(W / 2 - 0.01, W / 2 + 0.01, 0.5, 0.64, -0.1, L / 2 - 0.08, std({ color: blanket, roughness: 0.95 }), G);
  if (rails) for (const sx of [-1, 1]) {   // les barrières (deux longs tubes et des montants)
    const x = sx * (W / 2 + 0.03);
    for (const y of [0.78, 0.9]) rod(V3(x, y, -L / 2 + 0.25), V3(x, y, 0.35), 0.014, m.chrome, G);
    for (const z of [-L / 2 + 0.25, -0.35, 0.35]) rod(V3(x, 0.48, z), V3(x, 0.9, z), 0.012, m.chrome, G);
  }
  G.top = top; G.L = L; G.W = W;
  return G;
}

/** le pied à perfusion : étoile à 5 roulettes, mât, poche (qui peut se vider : setLevel(0..1)), pompe, tubulure jusqu'à `to` */
export function makeIVPole({ to = null, pump = true } = {}) {
  const m = mats(), G = new THREE.Group();
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; rod(V3(0, 0.08, 0), V3(Math.cos(a) * 0.3, 0.07, Math.sin(a) * 0.3), 0.012, m.chrome, G); caster(G, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 0.8); }
  rod(V3(0, 0.07, 0), V3(0, 1.95, 0), 0.013, m.chrome, G);
  for (const a of [0, Math.PI]) rod(V3(0, 1.93, 0), V3(Math.cos(a) * 0.12, 1.98, Math.sin(a) * 0.12), 0.006, m.chrome, G);
  // la poche (500 mL) et son liquide
  const bag = new THREE.Group(); bag.position.set(0.11, 1.78, 0); G.add(bag);
  const shell = rb(0.13, 0.22, 0.035, 0.03, m.bag, bag, 0, 0, 0); shell.castShadow = false;
  const liq = rb(0.115, 0.2, 0.025, 0.025, m.liquid, bag, 0, 0, 0); liq.castShadow = false;
  const lab = canvasTex(64, 64, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#2b5fa8'; g.fillRect(0, 0, 64, 14); g.fillStyle = '#333'; for (let y = 22; y < 60; y += 9) g.fillRect(6, y, 40 + (y % 3) * 6, 3); });
  plane(0.07, 0.07, std({ map: lab }), bag, 0, 0.02, 0.019);
  cyl(0.008, 0.06, m.tube, bag, 0, -0.14, 0, 8);                       // la chambre compte-gouttes
  let pumpBox = null;
  if (pump) { pumpBox = rb(0.16, 0.14, 0.1, 0.015, std({ color: '#e8eaec', roughness: 0.35 }), G, 0.06, 1.25, 0); plane(0.09, 0.04, glow('#7fd8ff', 0.9), G, 0.06, 1.27, 0.051); }
  G.setLevel = (k) => { liq.scale.y = Math.max(0.02, k); liq.position.y = -0.1 * (1 - k); };
  G.line = (dst) => {   // la tubulure : de la poche (en passant par la pompe) jusqu'au bras du patient (point dans le repère du pied)
    const pts = [V3(0.11, 1.62, 0), V3(0.07, 1.4, 0.02), V3(0.06, 1.25, 0.06), V3(0.1, 1.0, 0.1), dst.clone().lerp(V3(0.1, 1.0, 0.1), 0.4).add(V3(0, -0.15, 0)), dst];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.004, 5, false), m.tube, G).castShadow = false;
  };
  if (to) G.line(to);
  return G;
}

/** le chariot de soins (tiroirs de couleur, plateau, collecteur jaune, ordinateur portable) */
export function makeCart({ color = '#2d6fb0', laptop = true } = {}) {
  const m = mats(), G = new THREE.Group(), W = 0.65, D = 0.5, H = 0.95;
  rb(W, H - 0.12, D, 0.02, m.white, G, 0, 0.12 + (H - 0.12) / 2, 0);
  const cols = [color, '#e9ecef', color, '#e9ecef', color];
  for (let i = 0; i < 5; i++) { const y = 0.2 + i * 0.15; rb(W - 0.06, 0.13, 0.02, 0.01, std({ color: cols[i], roughness: 0.4 }), G, 0, y + 0.06, D / 2 + 0.005); bx(0.18, 0.015, 0.025, m.steel, G, 0, y + 0.1, D / 2 + 0.02); }
  bb(-W / 2 - 0.01, W / 2 + 0.01, H, H + 0.02, -D / 2 - 0.01, D / 2 + 0.01, m.grey, G);
  rod(V3(-W / 2 - 0.04, 0.9, -D / 2 + 0.05), V3(-W / 2 - 0.04, 0.9, D / 2 - 0.05), 0.012, m.chrome, G);   // la poignée
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(G, sx * (W / 2 - 0.06), 0, sz * (D / 2 - 0.06), 0.9);
  rb(0.16, 0.2, 0.12, 0.01, std({ color: '#f5c518', roughness: 0.4 }), G, W / 2 + 0.08, H - 0.12, 0.08);   // collecteur à aiguilles
  rb(0.07, 0.18, 0.07, 0.01, std({ color: '#ffffff', roughness: 0.3 }), G, -0.2, H + 0.11, -0.14);       // solution hydroalcoolique
  // quelques boîtes et compresses sur le plateau
  for (const [x, z, c] of [[0.05, -0.1, '#ffffff'], [0.18, 0.05, '#cfe6f5'], [-0.02, 0.12, '#f7e2e2']]) rb(0.12, 0.05, 0.08, 0.01, std({ color: c, roughness: 0.6 }), G, x, H + 0.045, z);
  if (laptop) {
    rb(0.32, 0.015, 0.22, 0.005, m.dark, G, 0.05, H + 0.03, 0.0);
    const lid = new THREE.Group(); lid.position.set(0.05, H + 0.035, -0.11); lid.rotation.x = -0.35; G.add(lid);
    rb(0.32, 0.21, 0.012, 0.005, m.dark, lid, 0, 0.105, 0);
    const scr = canvasTex(128, 84, (g) => { g.fillStyle = '#eaf2fa'; g.fillRect(0, 0, 128, 84); g.fillStyle = '#2b6cb0'; g.fillRect(0, 0, 128, 12); g.fillStyle = '#9fb3c8'; for (let y = 18; y < 80; y += 8) g.fillRect(6, y, 70 + (y % 5) * 6, 3); });
    plane(0.29, 0.18, new THREE.MeshBasicMaterial({ map: scr, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) }), lid, 0, 0.105, 0.007);
  }
  return G;
}

/** le fauteuil roulant (repère : sol, il regarde vers +z ; seat = où poser quelqu'un d'assis) */
export function makeWheelchair() {
  const m = mats(), G = new THREE.Group(), seatM = std({ color: '#26303b', roughness: 0.8 });
  for (const sx of [-1, 1]) {
    const x = sx * 0.3;
    const wheel = mesh(new THREE.TorusGeometry(0.28, 0.018, 8, 36), m.rubber, G, x, 0.3, -0.05, 0, Math.PI / 2, 0);
    mesh(new THREE.TorusGeometry(0.25, 0.008, 6, 36), m.chrome, G, x + sx * 0.03, 0.3, -0.05, 0, Math.PI / 2, 0);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI; rod(V3(x, 0.3 + Math.cos(a) * 0.26, -0.05 + Math.sin(a) * 0.26), V3(x, 0.3 - Math.cos(a) * 0.26, -0.05 - Math.sin(a) * 0.26), 0.003, m.steel, G, 4); }
    cyl(0.03, 0.04, m.steel, G, x, 0.3, -0.05, 12, 0, Math.PI / 2);
    rod(V3(x * 0.85, 0.5, -0.2), V3(x * 0.85, 0.5, 0.22), 0.012, m.chrome, G); rod(V3(x * 0.85, 0.5, -0.2), V3(x * 0.85, 0.98, -0.26), 0.012, m.chrome, G);
    rod(V3(x * 0.85, 0.5, 0.22), V3(x * 0.6, 0.12, 0.38), 0.011, m.chrome, G); caster(G, x * 0.8, 0, 0.3, 0.8);
    rod(V3(x * 0.85, 0.98, -0.26), V3(x * 0.85, 1.0, -0.38), 0.013, m.rubber, G);   // les poignées
    bb(x * 0.85 - 0.02, x * 0.85 + 0.02, 0.66, 0.69, -0.18, 0.12, seatM, G);           // les accoudoirs
  }
  bb(-0.25, 0.25, 0.48, 0.52, -0.2, 0.22, seatM, G);
  const back = bb(-0.25, 0.25, 0.55, 0.95, -0.25, -0.22, seatM, G); back.rotation.x = -0.08;
  for (const sx of [-1, 1]) bb(sx * 0.12 - 0.08, sx * 0.12 + 0.08, 0.1, 0.12, 0.34, 0.46, m.dark, G);
  G.seat = V3(0, 0.0, 0.02);
  return G;
}

/** le brancard (repère : sol, tête vers -z) */
export function makeStretcher({ sheet = '#e9eef2' } = {}) {
  const m = mats(), G = new THREE.Group(), L = 2.0, W = 0.7;
  bb(-W / 2, W / 2, 0.6, 0.66, -L / 2, L / 2, std({ color: '#d4d8db', roughness: 0.4, metalness: 0.2 }), G);
  rb(W - 0.06, 0.1, L - 0.08, 0.04, std({ color: '#3f6f8f', roughness: 0.7 }), G, 0, 0.71, 0);
  rb(W - 0.04, 0.03, L - 0.5, 0.01, std({ color: sheet, roughness: 0.9 }), G, 0, 0.77, 0.2);
  for (const sx of [-1, 1]) { rod(V3(sx * (W / 2 + 0.02), 0.85, -0.6), V3(sx * (W / 2 + 0.02), 0.85, 0.6), 0.012, m.chrome, G); for (const z of [-0.6, 0.6]) rod(V3(sx * (W / 2 + 0.02), 0.66, z), V3(sx * (W / 2 + 0.02), 0.85, z), 0.01, m.chrome, G); }
  bb(-0.12, 0.12, 0.2, 0.6, -0.5, 0.5, m.grey, G);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(G, sx * (W / 2 - 0.08), 0, sz * (L / 2 - 0.12), 1.0);
  rb(0.5, 0.1, 0.32, 0.04, mats().pillow, G, 0, 0.8, -L / 2 + 0.25);
  G.top = 0.76;
  return G;
}

/** une rangée de sièges d'attente sur poutre (repère : sol, ils regardent vers +z) ; seats = positions d'assise */
export function makeChairRow(n = 4, { color = '#2f6fa3' } = {}) {
  const m = mats(), G = new THREE.Group(), sp = 0.56, seatM = std({ color, roughness: 0.45 }), seats = [];
  const x0 = -(n - 1) * sp / 2;
  bb(x0 - 0.3, -x0 + 0.3, 0.3, 0.36, -0.06, 0.06, m.dark, G);
  for (const x of [x0 - 0.2, -x0 + 0.2]) { rod(V3(x, 0.0, 0.18), V3(x, 0.33, 0), 0.02, m.dark, G); rod(V3(x, 0.0, -0.18), V3(x, 0.33, 0), 0.02, m.dark, G); }
  for (let i = 0; i < n; i++) {
    const x = x0 + i * sp;
    rb(0.48, 0.05, 0.44, 0.02, seatM, G, x, 0.44, 0.05);
    const back = rb(0.48, 0.42, 0.04, 0.02, seatM, G, x, 0.7, -0.17); back.rotation.x = -0.12;
    bx(0.05, 0.08, 0.3, m.dark, G, x, 0.39, 0.0);
    seats.push(V3(x, 0, 0.12));
  }
  G.seats = seats;
  return G;
}

/** un fauteuil (velours) — repère : sol, il regarde vers +z ; seat = où poser quelqu'un d'assis */
export function makeArmchair({ color = '#7d8c4a', wood = '#5d3a22' } = {}) {
  const G = new THREE.Group(), velvet = std({ color, roughness: 0.95 }), w = std({ color: wood, roughness: 0.55 });
  rb(0.8, 0.22, 0.75, 0.06, velvet, G, 0, 0.32, 0);
  rb(0.62, 0.12, 0.6, 0.05, velvet, G, 0, 0.47, 0.05);
  const back = rb(0.78, 0.7, 0.18, 0.07, velvet, G, 0, 0.78, -0.3); back.rotation.x = -0.12;
  for (const sx of [-1, 1]) rb(0.14, 0.32, 0.72, 0.06, velvet, G, sx * 0.36, 0.56, 0.0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.025, 0.2, w, G, sx * 0.32, 0.1, sz * 0.28, 10);
  G.seat = V3(0, 0, 0.12);
  return G;
}
/** une chaise de bureau à roulettes */
export function makeOfficeChair() {
  const m = mats(), G = new THREE.Group(), fab = std({ color: '#2e3540', roughness: 0.85 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; rod(V3(0, 0.08, 0), V3(Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3), 0.015, m.dark, G); caster(G, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 0.7); }
  cyl(0.025, 0.36, m.chrome, G, 0, 0.26, 0);
  rb(0.48, 0.07, 0.46, 0.03, fab, G, 0, 0.47, 0); const b = rb(0.44, 0.5, 0.06, 0.03, fab, G, 0, 0.8, -0.22); b.rotation.x = -0.1;
  return G;
}
/** un écran d'ordinateur (dossier de soins informatisé, générique) */
export function makeScreen({ w = 0.5, h = 0.31, ui = 'soins' } = {}) {
  const m = mats(), G = new THREE.Group();
  rb(w + 0.03, h + 0.03, 0.03, 0.008, m.black, G, 0, 0.12 + h / 2, 0);
  cyl(0.015, 0.12, m.dark, G, 0, 0.06, -0.03); rb(0.2, 0.012, 0.14, 0.004, m.dark, G, 0, 0.006, -0.02);
  const scr = canvasTex(256, 160, (g) => {
    g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 160); g.fillStyle = ui === 'soins' ? '#1c5e9e' : '#2a7d5a'; g.fillRect(0, 0, 256, 18);
    g.fillStyle = '#fff'; g.font = '700 10px Inter'; g.fillText(ui === 'soins' ? 'DOSSIER DE SOINS' : 'URGENCES · FILE ACTIVE', 8, 12);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#e3ebf3' : '#f8fbfe'; g.fillRect(6, 24 + i * 14, 244, 14); g.fillStyle = '#6b7c8f'; g.fillRect(10, 29 + i * 14, 18, 4); g.fillRect(36, 29 + i * 14, 60 + (i * 23) % 70, 4);
      g.fillStyle = ['#e0a33a', '#4caf7a', '#d9534f', '#4caf7a'][i % 4]; g.fillRect(226, 27 + i * 14, 18, 8); }
  });
  plane(w, h, new THREE.MeshBasicMaterial({ map: scr, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }), G, 0, 0.12 + h / 2, 0.016);
  return G;
}
/** un distributeur de solution hydroalcoolique (mural) */
function sanitizer(p, x, y, z, ry) { const m = mats(), G = new THREE.Group(); G.position.set(x, y, z); G.rotation.y = ry; p.add(G); rb(0.11, 0.24, 0.1, 0.015, m.white, G, 0, 0, 0.05); bx(0.07, 0.03, 0.04, m.grey, G, 0, -0.13, 0.08); return G; }
/** un extincteur */
function extinguisher(p, x, z, ry) { const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = ry; p.add(G); cyl(0.08, 0.5, std({ color: '#c8231c', roughness: 0.35 }), G, 0, 0.75, 0.1, 18); cyl(0.03, 0.08, mats().black, G, 0, 1.04, 0.1, 10); return G; }

/** un pot avec une plante verte */
function plant(p, x, z, s = 1) {
  const G = new THREE.Group(); G.position.set(x, 0, z); p.add(G); const r = rng(Math.round(x * 100 + z * 10));
  mesh(new THREE.CylinderGeometry(0.17 * s, 0.13 * s, 0.32 * s, 18), std({ color: '#e7e1d6', roughness: 0.6 }), G, 0, 0.16 * s, 0);
  const leaf = std({ color: '#3f6b3a', roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, l = (0.35 + r() * 0.35) * s; const m = mesh(new THREE.SphereGeometry(0.09 * s, 8, 6), leaf, G, Math.cos(a) * 0.12 * s, 0.32 * s + l * 0.7, Math.sin(a) * 0.12 * s); m.scale.set(0.6, 1.6, 0.25); m.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6); }
  return G;
}

// =====================================================================
//  UN LIEU = un groupe, ses lampes, ses caméras, ses ambiances
// =====================================================================
function place(scene, at) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const S = new THREE.Group(); G.add(S);   // le décor fixe (fusionné à la fin par matière : beaucoup plus rapide à filmer)
  const X = { G, S, lights: [], cams: {}, P: (x, y, z) => V3(x, y, z).add(at), at };
  X.show = (on) => { G.visible = on; };
  X.cam = (name, p, l, fov = 66) => { X.cams[name] = { p: X.P(...p), l: X.P(...l), fov }; };
  X.light = (l) => { G.add(l); X.lights.push(l); if (l.target) G.add(l.target); return l; };
  X.finish = () => {   // (on fusionne dans le repère du lieu : le groupe est ramené à l'origine le temps du calcul)
    const keep = G.position.clone(); G.position.set(0, 0, 0); G.updateMatrixWorld(true);
    const baked = bake(S); G.remove(S); G.add(baked); X.S = baked; G.position.copy(keep); G.updateMatrixWorld(true); return X;
  };
  return X;
}
/** une lumière directionnelle avec ombres, cadrée sur une boîte (repère du lieu) */
function sunLight(X, color, intensity, from, to, half = 6, mapSize = 1024) {
  const l = new THREE.DirectionalLight(color, intensity); l.position.set(...from); l.target.position.set(...to);
  l.castShadow = true; l.shadow.mapSize.set(mapSize, mapSize); const c = l.shadow.camera; c.left = c.bottom = -half; c.right = c.top = half; c.near = 0.5; c.far = 40;
  l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; l.shadow.radius = 3;
  return X.light(l);
}
/** une dalle lumineuse au plafond (rectangle qui brille ; la vraie lumière vient des lampes du lieu) */
const panelMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.55), toneMapped: false });
function ceilPanel(p, m, x, y, z, w = 0.6, d = 0.6) {
  const fr = bx(w + 0.04, 0.02, d + 0.04, mats().white, p, x, y - 0.005, z); fr.castShadow = false;
  const pl = plane(w, d, m, p, x, y - 0.017, z, Math.PI / 2, 0); pl.receiveShadow = false;
  return pl;
}

// =====================================================================
//  LE POSTE DE SOINS (5,2 m × 4,6 m). Caméra fixe dans le coin, côté porte : on voit le bureau, le tableau des
//  transmissions, l'horloge numérique au-dessus, la fenêtre (l'aube) à droite, la porte du couloir à gauche.
// =====================================================================
export function buildPoste(scene, { at = V3(0, 0, 0) } = {}) {
  const X = place(scene, at), S = X.S, G = X.G, m = mats();
  const x0 = -2.6, x1 = 2.6, z0 = -2.2, z1 = 2.4, H = 2.7;
  const wall = std({ map: paintTex('#e2e8e4', 13), roughness: 0.9 }), floor = std({ map: rep(vinylTex('#c9c4b8', 6), 2.6, 2.3), roughness: 0.32 });
  const ceil = std({ map: rep(ceilTex(), 5.2 / 1.2, 4.6 / 1.2), roughness: 0.95 }), plinth = std({ color: '#8c9a97', roughness: 0.6 });
  bb(x0, x1, -0.05, 0, z0, z1, floor, S); bb(x0, x1, H, H + 0.05, z0, z1, ceil, S);
  bb(x0, x1, 0, H, z0 - 0.1, z0, wall, S); bb(x0, x1, 0, H, z1, z1 + 0.1, wall, S);
  // mur de droite, avec la fenêtre (z de -1.7 à 0.7, y de 0.95 à 2.25)
  const wz0 = -1.7, wz1 = 0.7, wy0 = 0.95, wy1 = 2.25;
  bb(x1, x1 + 0.12, 0, H, z0, wz0, wall, S); bb(x1, x1 + 0.12, 0, H, wz1, z1, wall, S); bb(x1, x1 + 0.12, 0, wy0, wz0, wz1, wall, S); bb(x1, x1 + 0.12, wy1, H, wz0, wz1, wall, S);
  const frameM = std({ color: '#eef0f0', roughness: 0.4 });
  for (const z of [wz0, (wz0 + wz1) / 2, wz1]) bb(x1 - 0.02, x1 + 0.1, wy0, wy1, z - 0.03, z + 0.03, frameM, S);
  for (const y of [wy0, wy1]) bb(x1 - 0.02, x1 + 0.1, y - 0.03, y + 0.03, wz0, wz1, frameM, S);
  bb(x1 - 0.2, x1, wy0 - 0.04, wy0, wz0 - 0.1, wz1 + 0.1, frameM, S);                                  // l'appui de fenêtre
  const gl = plane(wz1 - wz0, wy1 - wy0, m.glass, G, x1 + 0.04, (wy0 + wy1) / 2, (wz0 + wz1) / 2, 0, -Math.PI / 2);
  const views = { aube: viewTex('aube', 'ville', 7), jour: viewTex('jour', 'ville', 7), nuit: viewTex('nuit', 'ville', 7) };   // (la caméra voit le haut de la toile : le ciel et l'horizon)
  const viewM = new THREE.MeshBasicMaterial({ map: views.aube, fog: false, toneMapped: false });
  plane(7.0, 4.4, viewM, G, x1 + 3.2, 1.0, (wz0 + wz1) / 2, 0, -Math.PI / 2);
  // le store vénitien, à moitié descendu
  const slat = std({ color: '#e9ebe9', roughness: 0.5, side: THREE.DoubleSide });
  for (let y = wy1 - 0.04; y > 1.72; y -= 0.045) { const s = bb(x1 - 0.06, x1 - 0.04, y - 0.004, y + 0.004, wz0 + 0.02, wz1 - 0.02, slat, S); s.rotation.z = 0.5; }
  bb(x1 - 0.09, x1 - 0.03, 1.68, 1.71, wz0 + 0.02, wz1 - 0.02, slat, S);
  // le radiateur sous la fenêtre
  for (let z = wz0 + 0.2; z < wz1 - 0.2; z += 0.07) bb(x1 - 0.12, x1 - 0.05, 0.22, 0.8, z - 0.02, z + 0.02, m.white, S);
  // mur de gauche, avec la porte du couloir (z de 0.0 à 1.3)
  const dz0 = 0.0, dz1 = 1.3, dH = 2.15;
  bb(x0 - 0.12, x0, 0, H, z0, dz0, wall, S); bb(x0 - 0.12, x0, 0, H, dz1, z1, wall, S); bb(x0 - 0.12, x0, dH, H, dz0, dz1, wall, S);
  for (const z of [dz0 - 0.03, dz1 + 0.03]) bb(x0 - 0.14, x0 + 0.02, 0, dH + 0.05, z - 0.03, z + 0.03, std({ color: '#9aa4a8', roughness: 0.4 }), S);
  bb(x0 - 0.14, x0 + 0.02, dH, dH + 0.06, dz0 - 0.06, dz1 + 0.06, std({ color: '#9aa4a8', roughness: 0.4 }), S);
  const doorM = std({ map: woodTex('#c49a6c', 17), roughness: 0.55 });
  const leaf = bb(x0 - 1.22, x0 - 0.18, 0, dH - 0.02, dz0 - 0.02, dz0 + 0.03, doorM, S);                // la porte, ouverte (rabattue dans le couloir)
  // le couloir derrière la porte : sol, mur d'en face, main courante, lumière
  bb(x0 - 3.0, x0, -0.05, 0, -3, 4, floor, S); bb(x0 - 3.1, x0 - 3.0, 0, H, -3, 4, std({ map: paintTex('#dde5e3', 14) }), S); bb(x0 - 3.0, x0, H, H + 0.05, -3, 4, ceil, S);
  bb(x0 - 3.0, x0 - 2.94, 0.88, 0.95, -3, 4, std({ color: '#c8a27a', roughness: 0.5 }), S);
  // plinthes
  bb(x0, x1, 0, 0.1, z0, z0 + 0.015, plinth, S); bb(x1 - 0.015, x1, 0, 0.1, z0, z1, plinth, S);
  // --- le bureau le long du mur du fond
  const top = std({ color: '#eceae4', roughness: 0.45 }), cab = std({ color: '#d6d9db', roughness: 0.5 }), edge = std({ color: '#7a8c96', roughness: 0.4 });
  bb(-1.3, 2.45, 0.73, 0.77, z0, z0 + 0.72, top, S); bb(-1.3, 2.45, 0.735, 0.765, z0 + 0.72, z0 + 0.74, edge, S);
  for (const [a, b] of [[-1.3, -0.7], [1.95, 2.45]]) { bb(a, b, 0, 0.73, z0 + 0.02, z0 + 0.7, cab, S); for (let y = 0.12; y < 0.7; y += 0.2) bx(0.18, 0.015, 0.02, m.steel, S, (a + b) / 2, y + 0.08, z0 + 0.71); }
  const s1 = makeScreen({ ui: 'soins' }); s1.position.set(0.25, 0.77, z0 + 0.28); s1.rotation.y = 0.12; S.add(s1);
  const s2 = makeScreen({ ui: 'soins' }); s2.position.set(1.15, 0.77, z0 + 0.26); s2.rotation.y = -0.08; S.add(s2);
  for (const x of [0.25, 1.15]) { rb(0.44, 0.02, 0.14, 0.006, m.dark, S, x, 0.78, z0 + 0.55); rb(0.06, 0.02, 0.1, 0.01, m.dark, S, x + 0.32, 0.78, z0 + 0.55); }
  rb(0.2, 0.06, 0.18, 0.02, m.dark, S, 1.8, 0.8, z0 + 0.35);                                              // le téléphone
  for (let i = 0; i < 4; i++) rb(0.24, 0.04, 0.32, 0.005, std({ color: ['#d94f4f', '#3d7cc9', '#f0b429', '#4caf7a'][i], roughness: 0.6 }), S, -0.55, 0.79 + i * 0.042, z0 + 0.35);   // des dossiers
  const mug = cyl(0.04, 0.09, std({ color: '#f4f4f2', roughness: 0.3 }), S, 1.62, 0.815, z0 + 0.6, 16);
  rb(0.32, 0.01, 0.23, 0.003, std({ color: '#fbfbf7', roughness: 0.9 }), S, 0.7, 0.775, z0 + 0.6);        // une feuille posée (les transmissions)
  // --- le tableau blanc des transmissions, et l'horloge numérique au-dessus
  const wb = canvasTex(1024, 380, (g, w, h) => {
    g.fillStyle = '#fbfcfc'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d4f7a'; g.font = '700 34px Inter'; g.fillText('TRANSMISSIONS · MÉDECINE B', 24, 46);
    g.strokeStyle = '#9db3c6'; g.lineWidth = 2; const r = rng(77);
    for (let i = 0; i <= 7; i++) { g.beginPath(); g.moveTo(24, 70 + i * 42); g.lineTo(w - 24, 70 + i * 42); g.stroke(); }
    for (const x of [24, 150, 520, 820, w - 24]) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 70 + 7 * 42); g.stroke(); }
    g.font = '600 24px Inter'; g.fillStyle = '#334';
    for (let i = 0; i < 7; i++) { g.fillText(`CH. ${i * 2 + 1}`, 40, 100 + i * 42); g.strokeStyle = ['#2a62b8', '#c0392b', '#1e8449'][i % 3]; g.lineWidth = 3; g.beginPath(); let x = 170; g.moveTo(x, 96 + i * 42); while (x < 500) { x += 8 + r() * 10; g.lineTo(x, 92 + i * 42 + r() * 8); } g.stroke();
      g.fillStyle = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db'][(i * 7) % 4]; g.beginPath(); g.arc(860 + (i % 3) * 40, 91 + i * 42, 11, 0, 7); g.fill(); g.fillStyle = '#334'; }
  });
  rb(2.06, 0.79, 0.03, 0.01, std({ color: '#b9c1c8', metalness: 0.6, roughness: 0.3 }), S, 0.75, 1.58, z0 + 0.012);
  plane(2.0, 0.74, std({ map: wb, roughness: 0.25 }), S, 0.75, 1.58, z0 + 0.03);
  const clock = makeDigitalClock({ w: 0.62, h: 0.2 }); clock.position.set(0.75, 2.3, z0 + 0.03); G.add(clock);
  X.clock = (s) => clock.set(s); X.clockObj = clock;
  // --- les étagères à classeurs (à gauche)
  const shelfM = std({ color: '#d9dcdc', roughness: 0.5 });
  for (const y of [1.3, 1.75, 2.2]) {
    bb(-2.5, -0.55, y - 0.02, y, z0, z0 + 0.32, shelfM, S);
    let x = -2.46; const r = rng(Math.round(y * 100));
    while (x < -0.62) { const bw = 0.06 + r() * 0.02, bh = 0.3 + r() * 0.04; bb(x, x + bw, y, y + bh, z0 + 0.03, z0 + 0.3, std({ color: ['#2f5f9e', '#c43c3c', '#e3a92b', '#3f8f5a', '#6b4b8f', '#e9ecef'][(r() * 6) | 0], roughness: 0.6 }), S); x += bw + 0.005 + (r() < 0.1 ? 0.08 : 0); }
  }
  // --- l'évier et les distributeurs (à gauche, sous les étagères)
  bb(-2.55, -1.45, 0, 0.9, z0 + 0.0, z0 + 0.6, cab, S); bb(-2.57, -1.43, 0.9, 0.93, z0, z0 + 0.62, std({ color: '#cfd3d6', metalness: 0.7, roughness: 0.25 }), S);
  rb(0.45, 0.04, 0.35, 0.02, std({ color: '#9ea6ad', metalness: 0.8, roughness: 0.2 }), S, -2.0, 0.92, z0 + 0.3);
  rod(V3(-2.0, 0.93, z0 + 0.06), V3(-2.0, 1.15, z0 + 0.06), 0.012, m.chrome, S); rod(V3(-2.0, 1.15, z0 + 0.06), V3(-2.0, 1.12, z0 + 0.2), 0.012, m.chrome, S);
  sanitizer(S, -1.65, 1.08, z0 + 0.0, 0); rb(0.3, 0.32, 0.12, 0.02, m.white, S, -2.35, 1.12, z0 + 0.06);       // distributeur d'essuie-mains
  // --- le chariot de soins, la chaise de bureau, une plante
  const cart = makeCart(); cart.position.set(-1.25, 0, 0.35); cart.rotation.y = 0.5; S.add(cart);
  const chair = makeOfficeChair(); chair.position.set(0.7, 0, z0 + 1.15); chair.rotation.y = Math.PI + 0.4; S.add(chair);
  plant(S, 2.25, 1.9, 1.1);
  // une affiche « hygiène des mains » et un panneau d'affichage
  const poster = canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e7fc2'; g.fillRect(0, 0, w, 70); g.fillStyle = '#fff'; g.font = '700 26px Inter'; g.textAlign = 'center'; g.fillText('HYGIÈNE', w / 2, 32); g.fillText('DES MAINS', w / 2, 60);
    for (let i = 0; i < 6; i++) { g.fillStyle = '#d7e9f5'; g.fillRect(20 + (i % 2) * 112, 90 + Math.floor(i / 2) * 88, 100, 76); g.fillStyle = '#e8b892'; g.beginPath(); g.ellipse(70 + (i % 2) * 112, 128 + Math.floor(i / 2) * 88, 26, 18, i, 0, 7); g.fill(); } });
  plane(0.42, 0.59, std({ map: poster, roughness: 0.4 }), S, x0 + 0.01, 1.55, -1.1, 0, Math.PI / 2);
  // --- le plafond : 4 dalles lumineuses
  const pm = panelMat(); for (const [x, z] of [[-1.2, -0.9], [1.2, -0.9], [-1.2, 1.2], [1.2, 1.2]]) ceilPanel(S, pm, x, H, z);
  // --- les lumières : ciel (ambiance), deux plafonniers, le soleil levant par la fenêtre (avec ombres)
  const hemi = X.light(new THREE.HemisphereLight('#e6edf5', '#6e6253', 0.3));
  const lampA = X.light(new THREE.PointLight('#fff1de', 2.4, 9, 1.4)); lampA.position.set(-0.6, 2.5, -0.6);
  const lampB = X.light(new THREE.PointLight('#fff1de', 2.4, 9, 1.4)); lampB.position.set(1.3, 2.5, 0.6);
  const sun = sunLight(X, '#ffa860', 2.4, [x1 + 6, 3.3, 4.6], [0, 0.8, -1.5], 5);
  X.mood = (k) => {
    const MD = { aube: { sky: 'aube', sun: 2.2, lamp: 2.0, hemi: 0.28, panel: 0.9 }, jour: { sky: 'jour', sun: 1.0, lamp: 2.6, hemi: 0.38, panel: 1.2 }, nuit: { sky: 'nuit', sun: 0, lamp: 1.4, hemi: 0.15, panel: 0.5 } }[k];
    viewM.map = views[MD.sky]; sun.intensity = MD.sun; lampA.intensity = lampB.intensity = MD.lamp; hemi.intensity = MD.hemi; pm.color.setScalar(MD.panel);
  };
  X.mood('aube');
  X.door = V3(x0 - 0.2, 0, (dz0 + dz1) / 2); X.doorOut = V3(x0 - 1.6, 0, (dz0 + dz1) / 2 + 0.4);
  X.desk = V3(1.75, 0, z0 + 1.05);   // là où se tient l'infirmière de nuit (devant le bout du bureau)
  X.cam('main', [-2.25, 2.42, 2.15], [0.85, 1.42, -1.7], 64);
  return X.finish();
}

// =====================================================================
//  LE COULOIR (2,5 m de large, 26 m de long) — style 'hopital' (vert d'eau, portes en bois clair) ou 'ehpad' (crème, bois,
//  portes de couleur avec le nom des résidents). La caméra fixe est au plafond, au début du couloir ; le voyant d'appel de
//  la première porte est tout près d'elle, en haut à gauche de l'image (l'objet témoin). calls[] : du plus proche au plus loin.
// =====================================================================
export function buildCouloir(scene, { at = V3(0, 0, 0), style = 'hopital' } = {}) {
  const X = place(scene, at), S = X.S, G = X.G, m = mats(), E = style === 'ehpad';
  const xl = -1.25, xr = 1.25, zA = 2.4, zB = -24, H = 2.7;
  const wallC = E ? '#efe5d2' : '#dfe7e4', bandC = E ? '#d8c3a0' : '#bfd3cf';
  const wall = std({ map: rep(paintTex(wallC, 15), 6, 1), roughness: 0.9 }), band = std({ color: bandC, roughness: 0.55 });
  const floor = E ? std({ map: rep(parquetTex('#a87a52'), 2.5 / 1.2, 26.4 / 1.2), roughness: 0.4 }) : std({ map: rep(vinylTex('#cbc7bc', 8), 1.25, 13.2), roughness: 0.3 });
  const ceil = std({ map: rep(ceilTex(), 2.5 / 1.2, 26.4 / 1.2), roughness: 0.95 });
  bb(xl, xr, -0.05, 0, zB, zA, floor, S); bb(xl, xr, H, H + 0.05, zB, zA, ceil, S);
  bb(xl - 0.12, xl, 0, H, zB, zA, wall, S); bb(xr, xr + 0.12, 0, H, zB, zA, wall, S);
  bb(xl, xr, 0, H, zA, zA + 0.1, wall, S);
  // les protections murales et les mains courantes
  for (const [x, s] of [[xl, 1], [xr, -1]]) {
    bb(Math.min(x, x + s * 0.012), Math.max(x, x + s * 0.012), 0.1, 0.95, zB, zA, band, S);
    bb(Math.min(x, x + s * 0.015), Math.max(x, x + s * 0.015), 0, 0.1, zB, zA, std({ color: E ? '#7a5a3c' : '#7f8f8c', roughness: 0.6 }), S);
    const rail = mesh(new THREE.CylinderGeometry(0.03, 0.03, zA - zB, 12), std({ color: E ? '#a8794c' : '#c8a27a', roughness: 0.45 }), S, x + s * 0.07, 0.92, (zA + zB) / 2, Math.PI / 2);
    for (let z = zA - 0.6; z > zB; z -= 1.5) bx(0.06, 0.03, 0.03, m.steel, S, x + s * 0.035, 0.92, z);
  }
  // le fond du couloir : double porte à hublots, panneau SORTIE
  bb(xl, xr, 0, H, zB - 0.1, zB, wall, S);
  const dd = std({ map: woodTex(E ? '#b98b5e' : '#c49a6c', 19), roughness: 0.55 });
  for (const sx of [-1, 1]) { bb(sx > 0 ? 0.01 : -0.88, sx > 0 ? 0.88 : -0.01, 0, 2.1, zB, zB + 0.05, dd, S); mesh(new THREE.CircleGeometry(0.16, 24), m.glass, S, sx * 0.44, 1.5, zB + 0.06); }
  const exitTex = signTex(['SORTIE'], { bg: '#1f9d55', fg: '#fff', w: 512, h: 160, size: 84, arrow: '→' });
  rb(0.62, 0.2, 0.06, 0.01, m.white, S, 0, 2.38, zB + 0.04); plane(0.58, 0.18, new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }), S, 0, 2.38, zB + 0.075);
  // les portes des chambres (fermées), leur numéro, et le VOYANT D'APPEL au-dessus
  const doors = [];
  const L = [-1.0, -5.0, -9.0, -13.0, -17.0, -21.0], R = [-3.0, -7.0, -11.0, -15.0, -19.0];
  const names = ['Mme ROBERT', 'M. PETIT', 'Mme LEROY', 'M. MOREAU', 'Mme FAURE', 'M. GIRARD', 'Mme BLANC', 'M. ROUX', 'Mme DAVID', 'M. LAMBERT', 'Mme MERCIER'];
  const pastel = ['#9cc5c0', '#e3b7a0', '#b8c6e0', '#d9c27e', '#c2a8c9'];
  let k = 0;
  for (const [x, s, list] of [[xl, 1, L], [xr, -1, R]]) for (const z of list) {
    const num = 2 * (k % 6) + (s > 0 ? 1 : 2), col = E ? pastel[k % pastel.length] : null;
    const dm = E ? std({ color: col, roughness: 0.5 }) : dd;
    const fx = x + s * 0.02;
    const fm = std({ color: E ? '#efe9dd' : '#a7b1b5', roughness: 0.45 }), f0 = Math.min(fx, fx + s * 0.07), f1 = Math.max(fx, fx + s * 0.07);
    bb(f0, f1, 0, 2.2, z - 0.7, z - 0.6, fm, S); bb(f0, f1, 0, 2.2, z + 0.6, z + 0.7, fm, S); bb(f0, f1, 2.1, 2.2, z - 0.7, z + 0.7, fm, S);   // l'huisserie
    bb(Math.min(fx, fx + s * 0.05), Math.max(fx, fx + s * 0.05), 0.0, 2.1, z - 0.6, z + 0.6, dm, S);                                     // le battant
    bb(Math.min(fx, fx + s * 0.055), Math.max(fx, fx + s * 0.055), 0.02, 0.3, z - 0.58, z + 0.58, m.steel, S);                           // la plaque de propreté
    const wx = x + s * 0.075; mesh(new THREE.PlaneGeometry(0.12, 0.7), m.glass, S, wx, 1.45, z + 0.32, 0, s * Math.PI / 2, 0);        // le hublot vertical
    rod(V3(x + s * 0.1, 1.05, z - 0.45), V3(x + s * 0.1, 1.05, z - 0.25), 0.012, m.chrome, S);                                          // la poignée
    // la plaque : numéro (hôpital) ou nom du résident (EHPAD)
    const plate = signTex(E ? [names[k % names.length]] : [`${100 + num}`], { bg: E ? '#fbf6ea' : '#ffffff', fg: E ? '#5a4632' : '#1f4e6b', w: 384, h: 128, size: E ? 50 : 78, font: E ? 'Garamond' : 'Inter', weight: E ? 500 : 700 });
    const pz = z + s * -0.0 + 0.82 * (s > 0 ? 1 : -1) * -1;
    plane(0.3, 0.1, std({ map: plate, roughness: 0.4 }), S, x + s * 0.016, 1.55, z + (s > 0 ? 0.88 : -0.88), 0, s * Math.PI / 2);
    sanitizer(S, x + s * 0.0, 1.25, z + (s > 0 ? -0.9 : 0.9), s * Math.PI / 2);
    const cl = makeCallLight({ side: s }); cl.position.set(x, 2.33, z); G.add(cl);
    doors.push({ z, x, side: s, call: cl, num }); k++;
  }
  doors.sort((a, b) => b.z - a.z);                         // du plus proche (z grand) au plus loin
  X.calls = doors.map((d) => d.call); X.doors = doors;
  // l'horloge numérique suspendue (sous un panneau du service), face à la caméra
  const hz = -6.4;
  rod(V3(-0.3, H, hz), V3(-0.3, 2.55, hz), 0.008, m.steel, S); rod(V3(0.3, H, hz), V3(0.3, 2.55, hz), 0.008, m.steel, S);
  const st = signTex(E ? ['EHPAD LES TILLEULS'] : ['MÉDECINE B'], { bg: E ? '#6b4f36' : '#1f4e6b', fg: '#ffffff', w: 768, h: 160, size: 74, sub: E ? 'UNITÉ DU JARDIN' : 'CHAMBRES 101 → 112' });
  rb(0.9, 0.22, 0.04, 0.01, m.white, S, 0, 2.46, hz); plane(0.86, 0.19, std({ map: st, roughness: 0.4 }), S, 0, 2.46, hz + 0.021);
  const clock = makeDigitalClock({ w: 0.6, h: 0.19 }); clock.position.set(0, 2.2, hz); G.add(clock);
  X.clock = (s) => clock.set(s); X.clockPos = X.P(0, 2.2, hz);
  // le plafond : une dalle lumineuse tous les 2,4 m
  const pm = panelMat(); X.panels = [];
  for (let z = zA - 1.6; z > zB + 0.5; z -= 2.4) X.panels.push(ceilPanel(S, pm, 0, H, z, 0.6, 1.2));
  // les accessoires : fauteuil roulant, chariot de linge, chariot de soins, extincteur, panneau d'affichage, plante
  const wc = makeWheelchair(); wc.position.set(0.82, 0, -4.4); wc.rotation.y = -Math.PI / 2 + 0.25; S.add(wc);
  const cart = makeCart({ color: E ? '#a0522d' : '#2d6fb0' }); cart.position.set(0.88, 0, -8.6); cart.rotation.y = -Math.PI / 2; S.add(cart);
  const linen = new THREE.Group(); linen.position.set(-0.85, 0, -11.2); S.add(linen);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { caster(linen, sx * 0.3, 0, sz * 0.22); rod(V3(sx * 0.32, 0.1, sz * 0.24), V3(sx * 0.32, 1.0, sz * 0.24), 0.012, m.chrome, linen); }
  rb(0.62, 0.7, 0.46, 0.04, std({ color: E ? '#cdb8e0' : '#4f8fbf', roughness: 0.9 }), linen, 0, 0.6, 0);
  extinguisher(S, xr - 0.0, -12.1, -Math.PI / 2);
  const nb = canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#c69c6d'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 9; i++) { g.fillStyle = ['#fff', '#fff7c2', '#e2f0ff', '#ffe1e1'][i % 4]; const x = 20 + r() * 380, y = 20 + r() * 200; g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.1); g.fillRect(0, 0, 90 + r() * 40, 70 + r() * 40); g.fillStyle = '#9aa'; for (let yy = 14; yy < 60; yy += 9) g.fillRect(8, yy, 60, 3); g.restore(); } });
  plane(1.0, 0.62, std({ map: nb, roughness: 0.8 }), S, xr - 0.01, 1.55, 0.6, 0, -Math.PI / 2);
  if (E) { plant(S, -0.95, -2.9, 1.0); plant(S, 0.95, -16.0, 0.9); }
  // le brancard (la nuit, un patient attend dans le couloir) — montré seulement quand on le demande
  const str = makeStretcher(); str.position.set(-0.6, 0, -3.2); str.rotation.y = 0.04; G.add(str); str.visible = false; X.stretcher = str;
  // --- les lumières
  const hemi = X.light(new THREE.HemisphereLight(E ? '#f3eadb' : '#e6eef2', '#6b6255', 0.3));
  const pts = [-0.6, -7.5, -15].map((z) => { const l = X.light(new THREE.PointLight(E ? '#ffe9cc' : '#f4f7ff', 3, 12, 1.3)); l.position.set(0, 2.5, z); return l; });
  const key = sunLight(X, E ? '#ffe2bf' : '#eef3ff', 0.8, [2.0, 9, 3.5], [-0.3, 0, -6], 13, 1024);
  X.mood = (k) => {
    const MD = { jour: { hemi: 0.3, pt: 3, key: 0.8, panel: 1.2, col: E ? '#ffe9cc' : '#f4f7ff' }, nuit: { hemi: E ? 0.14 : 0.07, pt: E ? 1.8 : 0.7, key: 0.0, panel: E ? 0.35 : 0.2, col: E ? '#ffb877' : '#9fb4ff' },
      alerte: { hemi: 0.06, pt: 0.5, key: 0.0, panel: 0.1, col: '#ff8a7a' }, aube: { hemi: 0.18, pt: 1.5, key: 0.35, panel: 0.5, col: '#ffe2c4' } }[k];
    hemi.intensity = MD.hemi; key.intensity = MD.key; pm.color.setScalar(MD.panel); for (const l of pts) { l.intensity = MD.pt; l.color.set(MD.col); }
  };
  X.setLevel = (lev) => {   // de 0 (nuit) à 1 (plein jour) : pour allumer le couloir progressivement
    hemi.intensity = 0.07 + 0.23 * lev; key.intensity = 0.8 * lev; pm.color.setScalar(0.2 + 1.0 * lev); for (const l of pts) { l.intensity = 0.7 + 2.3 * lev; l.color.set('#9fb4ff').lerp(new THREE.Color('#f4f7ff'), lev); }
  };
  X.mood('jour');
  X.cam('main', [0.6, 2.42, 1.95], [-0.2, 0.0, -8.5], 66);
  return X.finish();
}

// =====================================================================
//  LA CHAMBRE (3,6 m × 4,8 m) : le lit contre le mur du fond (mur de couleur), la rampe murale, le moniteur, le pied à
//  perfusion à gauche du lit, le fauteuil des visiteurs à droite, la fenêtre à droite. Caméra dans le coin, côté porte.
// =====================================================================
export function buildChambre(scene, { at = V3(0, 0, 0) } = {}) {
  const X = place(scene, at), S = X.S, G = X.G, m = mats();
  const x0 = -1.8, x1 = 1.8, z0 = -2.4, z1 = 2.4, H = 2.7;
  const wall = std({ map: paintTex('#e8ece8', 23), roughness: 0.9 }), accent = std({ map: paintTex('#a9c7c2', 24), roughness: 0.9 });
  const floor = std({ map: rep(vinylTex('#cdc6b8', 9), 1.8, 2.4), roughness: 0.32 }), ceil = std({ map: rep(ceilTex(), 3, 4), roughness: 0.95 });
  bb(x0, x1, -0.05, 0, z0, z1, floor, S); bb(x0, x1, H, H + 0.05, z0, z1, ceil, S);
  bb(x0, x1, 0, H, z0 - 0.1, z0, accent, S); bb(x0 - 0.1, x0, 0, H, z0, z1, wall, S); bb(x0, x1, 0, H, z1, z1 + 0.1, wall, S);
  const wz0 = -2.05, wz1 = -0.1, wy0 = 0.9, wy1 = 2.25;
  bb(x1, x1 + 0.12, 0, H, z0, wz0, wall, S); bb(x1, x1 + 0.12, 0, H, wz1, z1, wall, S); bb(x1, x1 + 0.12, 0, wy0, wz0, wz1, wall, S); bb(x1, x1 + 0.12, wy1, H, wz0, wz1, wall, S);
  const frameM = std({ color: '#eef0f0', roughness: 0.4 });
  for (const z of [wz0, wz1]) bb(x1 - 0.02, x1 + 0.1, wy0, wy1, z - 0.03, z + 0.03, frameM, S);
  for (const y of [wy0, wy1]) bb(x1 - 0.02, x1 + 0.1, y - 0.03, y + 0.03, wz0, wz1, frameM, S);
  bb(x1 - 0.2, x1, wy0 - 0.04, wy0, wz0 - 0.1, wz1 + 0.1, frameM, S);
  plane(wz1 - wz0, wy1 - wy0, m.glass, G, x1 + 0.04, (wy0 + wy1) / 2, (wz0 + wz1) / 2, 0, -Math.PI / 2);
  const views = { matin: viewTex('matin', 'parc', 12), jour: viewTex('jour', 'parc', 12), nuit: viewTex('nuit', 'parc', 12) };
  const viewM = new THREE.MeshBasicMaterial({ map: views.matin, fog: false, toneMapped: false });
  plane(6.0, 4.0, viewM, G, x1 + 3.0, 1.2, (wz0 + wz1) / 2, 0, -Math.PI / 2);
  const curtain = std({ color: '#d9c9a8', roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) { const c = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 10, 1, true, 0, Math.PI), curtain, S, x1 - 0.12, 1.3, wz1 + 0.1 + i * 0.1, 0, Math.PI / 2, 0); c.scale.set(1, 1, 0.5); }
  bb(x0, x1, 0, 0.1, z0, z0 + 0.015, std({ color: '#7f8f8c' }), S);
  // le lit, la rampe murale (gaz médicaux, lampe), le moniteur sur son bras
  const bed = makeBed({ blanket: '#9ec3dc' }); bed.position.set(-0.25, 0, -1.25); S.add(bed);
  X.lie = X.P(-0.25, 0.6, -1.25); X.bed = bed;
  const rail = std({ color: '#c9ced3', metalness: 0.7, roughness: 0.3 });
  rb(2.3, 0.22, 0.08, 0.02, rail, S, -0.25, 1.55, z0 + 0.04);
  for (const [x, c] of [[-1.05, '#2e9b52'], [-0.9, '#f2f2f2'], [-0.75, '#e6c229'], [0.45, '#2e9b52'], [0.6, '#f2f2f2']]) { cyl(0.03, 0.03, std({ color: c, roughness: 0.35 }), S, x, 1.55, z0 + 0.09, 16, Math.PI / 2); }
  rb(0.5, 0.06, 0.07, 0.02, std({ color: '#fbfbfb', roughness: 0.3 }), S, -0.25, 1.71, z0 + 0.06);
  plane(0.46, 0.03, glow('#fff3dc', 1.2), S, -0.25, 1.68, z0 + 0.1, Math.PI / 2 - 0.3, 0);
  rod(V3(-1.25, 1.95, z0 + 0.02), V3(-1.25, 1.95, z0 + 0.35), 0.02, m.grey, S);
  const mon = makeMonitor(); mon.position.set(-1.25, 1.95, z0 + 0.42); mon.rotation.y = 0.55; mon.rotation.x = -0.12; G.add(mon);
  X.tick = (t) => mon.tick(t);
  // le pied à perfusion (la tubulure va jusqu'au bras droit du patient, à gauche du lit)
  const iv = makeIVPole(); iv.position.set(-1.05, 0, -1.35); iv.rotation.y = 0.3; G.add(iv); X.iv = iv;
  const armW = X.P(-0.58, 0.74, -1.05); iv.updateMatrixWorld(true); G.updateMatrixWorld(true);
  iv.line(iv.worldToLocal(armW.clone()));
  // la table de lit (à droite), le fauteuil des visiteurs, le tableau « votre infirmière »
  const tbl = new THREE.Group(); tbl.position.set(0.55, 0, -0.95); S.add(tbl);
  rb(0.7, 0.03, 0.4, 0.01, std({ color: '#d8c3a5', roughness: 0.5 }), tbl, -0.2, 0.92, 0); cyl(0.02, 0.9, m.steel, tbl, 0.12, 0.46, 0); rb(0.5, 0.04, 0.45, 0.01, m.grey, tbl, 0.12, 0.04, 0);
  mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 16), std({ color: '#d9eef7', transparent: true, opacity: 0.65, roughness: 0.1 }), tbl, -0.3, 1.03, 0.05);
  cyl(0.035, 0.09, std({ color: '#f5f5f5', roughness: 0.3 }), tbl, -0.12, 0.98, -0.05, 14); rb(0.18, 0.09, 0.1, 0.01, std({ color: '#7fb3d5', roughness: 0.6 }), tbl, 0.0, 0.98, 0.08);
  const ch = makeArmchair({ color: '#4f7f8f', wood: '#8a8f94' }); ch.position.set(1.15, 0, -1.05); ch.rotation.y = -Math.PI / 2 + 0.25; S.add(ch);
  X.seat = { p: X.P(1.15, 0, -1.05).add(V3(-0.12, 0, 0.03)), ry: -Math.PI / 2 + 0.25 };
  const nb = canvasTex(640, 400, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f6f8b'; g.fillRect(0, 0, w, 70); g.fillStyle = '#fff'; g.font = '700 34px Inter'; g.fillText('AUJOURD’HUI', 28, 46);
    g.fillStyle = '#333'; g.font = '600 30px Inter'; g.fillText('Votre infirmière :', 28, 140); g.fillText('Votre médecin :', 28, 270);
    g.strokeStyle = '#b8c2c8'; g.lineWidth = 3; for (const y of [200, 330]) { g.beginPath(); g.moveTo(28, y); g.lineTo(w - 28, y); g.stroke(); }
    g.fillStyle = '#2a4f9e'; g.font = 'italic 40px Garamond'; g.fillText('Dr Martin', 60, 320);
  });
  rb(0.86, 0.56, 0.02, 0.01, std({ color: '#c3cbd1', metalness: 0.5, roughness: 0.3 }), S, 1.05, 1.6, z0 + 0.012);
  plane(0.82, 0.52, std({ map: nb, roughness: 0.3 }), S, 1.05, 1.6, z0 + 0.025);
  // la télévision sur son bras, un placard, la poubelle à pédale, une boîte de gants
  rod(V3(x1 - 0.05, 2.3, 1.2), V3(x1 - 0.5, 2.3, 1.2), 0.02, m.grey, S); rb(0.62, 0.38, 0.05, 0.01, m.black, S, x1 - 0.55, 2.12, 1.2, -Math.PI / 2 + 0.5);
  cyl(0.15, 0.4, std({ color: '#c8ccd0', metalness: 0.6, roughness: 0.3 }), S, -1.55, 0.2, -2.1, 18);
  rb(0.24, 0.12, 0.13, 0.01, std({ color: '#5a8fd1', roughness: 0.5 }), S, -1.25, 1.2, z0 + 0.08);
  sanitizer(S, x0, 1.3, 0.4, Math.PI / 2);
  const pm = panelMat(); ceilPanel(S, pm, -0.2, H, -0.8, 0.6, 1.2); ceilPanel(S, pm, 0.6, H, 1.2, 0.6, 0.6);
  // les lumières : le jour par la fenêtre (avec ombres), le plafonnier, la lampe de la rampe
  const hemi = X.light(new THREE.HemisphereLight('#e3ecf5', '#6d6458', 0.3));
  const sun = sunLight(X, '#fff2e2', 1.8, [x1 + 5, 3.4, 2.5], [-0.3, 0.5, -1.5], 4.5);
  const lamp = X.light(new THREE.PointLight('#fff1dc', 2.2, 8, 1.4)); lamp.position.set(0.0, 2.5, 0.2);
  const read = X.light(new THREE.PointLight('#ffe7c4', 1.2, 3, 1.6)); read.position.set(-0.25, 1.6, -2.0);
  X.mood = (k) => {
    const MD = { matin: { sky: 'matin', sun: 1.8, lamp: 2.2, hemi: 0.3, panel: 1.0 }, nuit: { sky: 'nuit', sun: 0, lamp: 0.6, hemi: 0.08, panel: 0.2 } }[k];
    viewM.map = views[MD.sky]; sun.intensity = MD.sun; lamp.intensity = MD.lamp; hemi.intensity = MD.hemi; pm.color.setScalar(MD.panel);
  };
  X.mood('matin');
  X.cam('main', [-1.5, 2.45, 2.2], [0.2, 0.72, -1.35], 64);
  return X.finish();
}

// =====================================================================
//  LA SALLE D'ATTENTE DES URGENCES (7,2 m × 7 m) : la banque d'accueil au fond (personne derrière), les portes des
//  soins à droite, un brancard dans le couloir à gauche, des rangées de sièges. UR.seats[i] = { p, ry } (personnes assises).
// =====================================================================
export function buildUrgences(scene, { at = V3(0, 0, 0) } = {}) {
  const X = place(scene, at), S = X.S, G = X.G, m = mats();
  const x0 = -3.6, x1 = 3.6, z0 = -4.0, z1 = 3.0, H = 2.8;
  const wall = std({ map: paintTex('#e9ecee', 33), roughness: 0.9 }), band = std({ color: '#2f6fa3', roughness: 0.5 });
  const floor = std({ map: rep(vinylTex('#b7c0c6', 10), 3.6, 3.5), roughness: 0.3 }), ceil = std({ map: rep(ceilTex(), 6, 5.8), roughness: 0.95 });
  bb(x0, x1, -0.05, 0, z0 - 3, z1, floor, S); bb(x0, x1, H, H + 0.05, z0 - 3, z1, ceil, S);
  // le mur du fond, avec l'ouverture du couloir (à gauche, x de -3.6 à -2.2) et les portes des soins (à droite)
  bb(-2.2, x1, 0, H, z0 - 0.12, z0, wall, S); bb(x0, -2.2, 2.3, H, z0 - 0.12, z0, wall, S);
  bb(x0 - 0.12, x0, 0, H, z0 - 3, z1, wall, S); bb(x1, x1 + 0.12, 0, H, z0, z1, wall, S); bb(x0, x1, 0, H, z1, z1 + 0.1, wall, S);
  bb(x0 + 1.4, x0 + 1.52, 0, H, z0 - 3, z0, wall, S); bb(x0, x0 + 1.4, 0, H, z0 - 3.1, z0 - 3.0, wall, S);   // le couloir
  for (const [a, b2, c, d] of [[-2.2, x1, z0, z0 + 0.012], [x0, x0 + 0.012, z0, z1]]) bb(a, b2, 1.05, 1.18, c, d, band, S);
  bb(x1 - 0.012, x1, 1.05, 1.18, z0, z1, band, S);
  // les portes battantes des soins (accès réservé), avec hublots et panneau
  const doorM = std({ color: '#d5dde3', roughness: 0.4 });
  for (const sx of [0, 1]) { bb(2.0 + sx * 0.72, 2.7 + sx * 0.72, 0, 2.15, z0, z0 + 0.05, doorM, S); mesh(new THREE.CircleGeometry(0.14, 24), m.glass, S, 2.35 + sx * 0.72, 1.5, z0 + 0.06); bb(2.02 + sx * 0.72, 2.68 + sx * 0.72, 0.02, 0.35, z0 + 0.05, z0 + 0.06, m.steel, S); }
  const soins = signTex(['SOINS'], { bg: '#ffffff', fg: '#1f4e6b', w: 512, h: 160, size: 80, sub: 'ACCÈS RÉSERVÉ' });
  plane(0.9, 0.28, std({ map: soins, roughness: 0.4 }), S, 2.72, 2.45, z0 + 0.02);
  // la banque d'accueil (vide) et son panneau suspendu
  const deskM = std({ color: '#f1f1ee', roughness: 0.4 }), wood = std({ map: woodTex('#b98a5c', 61), roughness: 0.5 });
  bb(-1.4, 1.6, 0, 1.08, z0 + 1.0, z0 + 1.25, wood, S); bb(-1.45, 1.65, 1.08, 1.12, z0 + 0.95, z0 + 1.32, deskM, S);
  bb(-1.4, 1.6, 0.72, 0.76, z0 + 0.3, z0 + 1.0, deskM, S);
  const screenG = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.6, 0.01), m.glass); screenG.position.set(0.1, 1.42, z0 + 1.12); G.add(screenG);
  const sc1 = makeScreen({ ui: 'urg' }); sc1.position.set(-0.5, 0.76, z0 + 0.45); sc1.rotation.y = 0.1; S.add(sc1);
  const sc2 = makeScreen({ ui: 'urg' }); sc2.position.set(0.7, 0.76, z0 + 0.45); sc2.rotation.y = -0.1; S.add(sc2);
  const oc = makeOfficeChair(); oc.position.set(0.1, 0, z0 + 0.65); oc.rotation.y = 0.3; S.add(oc);
  rb(0.4, 0.25, 0.35, 0.02, m.grey, S, 1.3, 0.88, z0 + 0.35);   // l'imprimante
  for (const x of [-1.0, 1.2]) rod(V3(x, H, z0 + 1.4), V3(x, 2.55, z0 + 1.4), 0.008, m.steel, S);
  const acc = signTex(['ACCUEIL'], { bg: '#c0392b', fg: '#ffffff', w: 1024, h: 220, size: 110, sub: 'URGENCES' });
  rb(2.6, 0.5, 0.05, 0.01, m.white, S, 0.1, 2.32, z0 + 1.4); plane(2.54, 0.44, new THREE.MeshBasicMaterial({ map: acc, toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) }), S, 0.1, 2.32, z0 + 1.426);
  // le couloir (à gauche) : un brancard, un patient y attend
  const str = makeStretcher(); str.position.set(x0 + 0.7, 0, z0 - 1.4); str.rotation.y = 0.05; S.add(str); X.stretcher = X.P(x0 + 0.7, str.top, z0 - 1.4);
  // les sièges : deux rangées face à l'accueil, une rangée contre le mur de droite
  X.seats = [];
  for (const [cx, cz, n, ry] of [[0.4, -0.35, 5, Math.PI], [0.4, 0.95, 5, Math.PI], [x0 + 0.35, 0.4, 4, Math.PI / 2]]) {
    const row = makeChairRow(n); row.position.set(cx, 0, cz); row.rotation.y = ry; S.add(row);
    for (const s of row.seats) X.seats.push({ p: s.clone().applyAxisAngle(V3(0, 1, 0), ry).add(row.position).add(at), ry });
  }
  // l'écran d'information, le distributeur de boissons, des affiches, une plante
  const tv = canvasTex(512, 300, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16426b'); gr.addColorStop(1, '#0d2a45'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = '700 46px Inter'; g.textAlign = 'center'; g.fillText('URGENCES', w / 2, 90); g.font = '500 28px Inter'; g.fillText('Merci de votre patience', w / 2, 150); g.fillStyle = '#e74c3c'; g.fillRect(w / 2 - 30, 190, 60, 60); g.fillStyle = '#fff'; g.fillRect(w / 2 - 8, 198, 16, 44); g.fillRect(w / 2 - 22, 212, 44, 16); });
  rb(1.0, 0.6, 0.05, 0.01, m.black, S, x0 + 0.03, 2.05, -1.2, Math.PI / 2); plane(0.94, 0.55, new THREE.MeshBasicMaterial({ map: tv, toneMapped: false }), S, x0 + 0.06, 2.05, -1.2, 0, Math.PI / 2);
  const vm = new THREE.Group(); vm.position.set(x0 + 0.45, 0, 1.9); vm.rotation.y = Math.PI / 2; S.add(vm);
  rb(0.8, 1.8, 0.75, 0.03, std({ color: '#2a2d34', roughness: 0.4 }), vm, 0, 0.9, 0); plane(0.55, 1.1, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1.0), toneMapped: false }), vm, -0.08, 1.15, 0.38);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) rb(0.1, 0.18, 0.02, 0.01, std({ color: ['#c0392b', '#2980b9', '#27ae60', '#f39c12'][(i + j) % 4], roughness: 0.4 }), vm, -0.28 + j * 0.13, 0.75 + i * 0.25, 0.39);
  plant(S, x1 - 0.4, z1 - 0.4, 1.2);
  const posters = [['VOUS AVEZ', 'MAL ?', '#e67e22'], ['LAVEZ-VOUS', 'LES MAINS', '#2980b9']];
  posters.forEach(([a, b2, c], i) => { const t = canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = c; g.fillRect(0, 0, w, 120); g.fillStyle = '#fff'; g.font = '800 34px Inter'; g.textAlign = 'center'; g.fillText(a, w / 2, 52); g.fillText(b2, w / 2, 96); g.fillStyle = '#ccd'; for (let y = 150; y < 330; y += 22) g.fillRect(30, y, 196, 8); });
    plane(0.5, 0.7, std({ map: t, roughness: 0.4 }), S, x1 - 0.012, 1.7, -1.6 - i * 0.9, 0, -Math.PI / 2); });
  const pm = panelMat(); for (const [x, z] of [[-2, -1.8], [0.2, -1.8], [2.2, -1.8], [-2, 1.2], [0.2, 1.2], [2.2, 1.2], [x0 + 0.7, z0 - 1.5]]) ceilPanel(S, pm, x, H, z, 0.6, 1.2);
  const hemi = X.light(new THREE.HemisphereLight('#e8eef3', '#62605a', 0.32));
  const pts = [[-1.5, -1.5], [1.8, 0.8]].map(([x, z]) => { const l = X.light(new THREE.PointLight('#f2f6ff', 3, 11, 1.3)); l.position.set(x, 2.6, z); return l; });
  const key = sunLight(X, '#f4f7ff', 0.9, [2.5, 9, 4], [-0.5, 0, -1], 7);
  X.mood = (k) => { const n = k === 'nuit'; hemi.intensity = n ? 0.1 : 0.32; key.intensity = n ? 0.25 : 0.9; for (const l of pts) l.intensity = n ? 1.2 : 3; pm.color.setScalar(n ? 0.5 : 1.25); };
  X.mood('jour');
  X.cam('main', [3.3, 2.65, 2.8], [-0.25, 0.55, -2.3], 64);
  return X.finish();
}

// =====================================================================
//  LE SALON D'UNE PERSONNE ÂGÉE (4,4 m × 4,4 m) : fauteuil près de la fenêtre (voilages), guéridon avec le pilulier de la
//  semaine, horloge à balancier, buffet et photos de famille, porte d'entrée à droite. DO.seat = { p, ry }.
// =====================================================================
export function buildDomicile(scene, { at = V3(0, 0, 0) } = {}) {
  const X = place(scene, at), S = X.S, G = X.G, m = mats();
  const x0 = -2.2, x1 = 2.2, z0 = -2.2, z1 = 2.2, H = 2.5;
  const wall = std({ map: rep(wallpaperTex(), 4, 2.2), roughness: 0.95 }), floor = std({ map: rep(parquetTex('#8e5f3b'), 4.4 / 1.2, 4.4 / 1.2), roughness: 0.45 });
  bb(x0, x1, -0.05, 0, z0, z1, floor, S); bb(x0, x1, H, H + 0.05, z0, z1, std({ color: '#f3efe6', roughness: 0.95 }), S);
  const wx0 = -1.35, wx1 = 0.35, wy0 = 0.85, wy1 = 2.05;
  bb(x0, wx0, 0, H, z0 - 0.12, z0, wall, S); bb(wx1, x1, 0, H, z0 - 0.12, z0, wall, S); bb(wx0, wx1, 0, wy0, z0 - 0.12, z0, wall, S); bb(wx0, wx1, wy1, H, z0 - 0.12, z0, wall, S);
  bb(x0 - 0.1, x0, 0, H, z0, z1, wall, S); bb(x1, x1 + 0.1, 0, H, z0, z1, wall, S); bb(x0, x1, 0, H, z1, z1 + 0.1, wall, S);
  const plinth = std({ color: '#f1ebe0', roughness: 0.5 }); bb(x0, x1, 0, 0.12, z0, z0 + 0.015, plinth, S); bb(x0, x0 + 0.015, 0, 0.12, z0, z1, plinth, S); bb(x1 - 0.015, x1, 0, 0.12, z0, z1, plinth, S);
  bb(x0, x1, H - 0.08, H, z0, z0 + 0.06, plinth, S); bb(x0, x0 + 0.06, H - 0.08, H, z0, z1, plinth, S);   // la corniche
  const frameM = std({ color: '#f6f2ea', roughness: 0.4 });
  for (const x of [wx0, (wx0 + wx1) / 2, wx1]) bb(x - 0.03, x + 0.03, wy0, wy1, z0 - 0.1, z0 + 0.02, frameM, S);
  for (const y of [wy0, wy1, (wy0 + wy1) * 0.62]) bb(wx0, wx1, y - 0.025, y + 0.025, z0 - 0.1, z0 + 0.02, frameM, S);
  bb(wx0 - 0.1, wx1 + 0.1, wy0 - 0.04, wy0, z0, z0 + 0.18, frameM, S);
  plane(wx1 - wx0, wy1 - wy0, m.glass, G, (wx0 + wx1) / 2, (wy0 + wy1) / 2, z0 - 0.05);
  const viewM = new THREE.MeshBasicMaterial({ map: viewTex('matin', 'village', 31), fog: false, toneMapped: false });
  plane(6.0, 3.8, viewM, G, (wx0 + wx1) / 2, 1.0, z0 - 3.0);
  // les voilages (dentelle) et les doubles rideaux
  const lace = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke(); } });
  const laceM = new THREE.MeshStandardMaterial({ map: rep(lace, 3, 2), transparent: true, opacity: 0.75, roughness: 1, side: THREE.DoubleSide, depthWrite: false });
  const lc = plane(wx1 - wx0 - 0.1, wy1 - wy0 - 0.1, laceM, G, (wx0 + wx1) / 2, (wy0 + wy1) / 2 + 0.02, z0 + 0.05); lc.position.y = 1.65; lc.scale.y = 0.5;
  const drape = std({ color: '#7a2f35', roughness: 1, side: THREE.DoubleSide });
  for (const [xa, n] of [[wx0 - 0.25, 4], [wx1 + 0.05, 4]]) for (let i = 0; i < n; i++) { const c = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 10, 1, true, 0, Math.PI), drape, S, xa + i * 0.07, 1.2, z0 + 0.12, 0, 0, 0); c.scale.set(1, 1, 0.6); }
  rod(V3(wx0 - 0.35, 2.28, z0 + 0.12), V3(wx1 + 0.35, 2.28, z0 + 0.12), 0.015, std({ color: '#b08a3c', metalness: 0.8, roughness: 0.3 }), S);
  // le tapis
  const rug = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#7b2d2d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8b26e'; g.lineWidth = 10; g.strokeRect(20, 20, w - 40, h - 40); g.lineWidth = 4; g.strokeRect(44, 44, w - 88, h - 88);
    g.fillStyle = '#1f3557'; g.beginPath(); g.ellipse(w / 2, h / 2, 120, 80, 0, 0, 7); g.fill(); g.strokeStyle = '#d8b26e'; g.beginPath(); g.ellipse(w / 2, h / 2, 90, 56, 0, 0, 7); g.stroke(); });
  const rg = plane(2.4, 1.8, std({ map: rug, roughness: 1 }), S, 0.1, 0.006, 0.2, -Math.PI / 2, 0); rg.receiveShadow = true;
  // le fauteuil (tourné vers la pièce), le guéridon, le pilulier de la semaine, le verre d'eau, le téléphone
  const ch = makeArmchair({ color: '#8a7a3c', wood: '#5d3a22' }); ch.position.set(0.5, 0, -0.95); ch.rotation.y = -0.5; S.add(ch);
  X.seat = { p: X.P(0.5, 0, -0.95).add(V3(Math.sin(-0.5) * 0.12, 0, Math.cos(-0.5) * 0.12)), ry: -0.5 };
  const wood = std({ map: woodTex('#6b4226', 71, 128, 256), roughness: 0.5 });
  const tb = new THREE.Group(); tb.position.set(1.32, 0, -0.85); S.add(tb);
  cyl(0.3, 0.03, wood, tb, 0, 0.62, 0, 28); cyl(0.03, 0.6, wood, tb, 0, 0.31, 0); for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; rod(V3(0, 0.08, 0), V3(Math.cos(a) * 0.22, 0.0, Math.sin(a) * 0.22), 0.018, wood, tb); }
  const pil = new THREE.Group(); pil.position.set(-0.08, 0.64, 0.06); pil.rotation.y = -0.4; tb.add(pil);
  rb(0.3, 0.03, 0.08, 0.008, std({ color: '#f4f4f4', roughness: 0.4 }), pil, 0, 0.015, 0);
  const days = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#ec7fb2'];
  days.forEach((c, i) => rb(0.038, 0.012, 0.07, 0.004, std({ color: c, roughness: 0.3, transparent: true, opacity: 0.85 }), pil, -0.13 + i * 0.043, 0.036, 0));
  mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.1, 16), std({ color: '#e3f2f8', transparent: true, opacity: 0.6, roughness: 0.05 }), tb, 0.13, 0.69, -0.05);
  rb(0.17, 0.06, 0.2, 0.02, std({ color: '#ece6da', roughness: 0.4 }), tb, 0.05, 0.665, -0.18);   // le téléphone fixe
  rb(0.12, 0.03, 0.05, 0.01, std({ color: '#3a2a20', roughness: 0.4 }), tb, -0.15, 0.65, -0.15); // l'étui à lunettes
  const lampG = new THREE.Group(); lampG.position.set(1.85, 0, -1.85); S.add(lampG);
  cyl(0.15, 0.7, wood, lampG, 0, 0.35, 0, 20); mesh(new THREE.CylinderGeometry(0.16, 0.25, 0.3, 24, 1, true), std({ color: '#f3e3c3', roughness: 1, side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0.6 }), lampG, 0, 0.98, 0);
  // l'horloge à balancier (au mur du fond, à droite de la fenêtre)
  const clk = makeWallClock({ r: 0.17 }); clk.position.set(1.25, 1.85, z0 + 0.02); G.add(clk);
  X.clock = (h, mi, s, t) => clk.set(h, mi, s, t);
  // le buffet et les photos de famille (mur de gauche)
  const buf = new THREE.Group(); buf.position.set(x0 + 0.26, 0, -0.9); buf.rotation.y = Math.PI / 2; S.add(buf);
  rb(1.6, 0.85, 0.5, 0.02, wood, buf, 0, 0.45, 0); bb(-0.82, 0.82, 0.86, 0.9, -0.27, 0.27, std({ color: '#4d2f1b', roughness: 0.4 }), buf);
  for (const x of [-0.4, 0.4]) { bb(x - 0.36, x + 0.36, 0.12, 0.78, 0.25, 0.26, std({ color: '#7a5034', roughness: 0.45 }), buf); cyl(0.015, 0.04, std({ color: '#c9a043', metalness: 0.8, roughness: 0.3 }), buf, x + (x < 0 ? 0.3 : -0.3), 0.5, 0.28, 10, Math.PI / 2); }
  const r = rng(8);
  for (let i = 0; i < 5; i++) {
    const fw = 0.14 + r() * 0.08, fh = 0.18 + r() * 0.06, fx = -0.6 + i * 0.3;
    const photo = canvasTex(96, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, ['#8fb4d6', '#c9a27a', '#9ec59a', '#d7b98f', '#a7a3c9'][i]); gr.addColorStop(1, '#f1e4c8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 1 + (i % 3); k++) { g.fillStyle = 'rgba(80,60,50,0.75)'; g.beginPath(); g.arc(30 + k * 22, 62, 10, 0, 7); g.fill(); g.fillRect(20 + k * 22, 74, 20, 40); } });
    const fr = new THREE.Group(); fr.position.set(fx, 0.9 + fh / 2, -0.05 + (i % 2) * 0.1); fr.rotation.x = -0.12; fr.rotation.y = (r() - 0.5) * 0.4; buf.add(fr);
    rb(fw, fh, 0.02, 0.004, std({ color: i % 2 ? '#c9a043' : '#3a2a20', metalness: i % 2 ? 0.7 : 0, roughness: 0.4 }), fr, 0, 0, 0);
    plane(fw - 0.03, fh - 0.03, std({ map: photo, roughness: 0.5 }), fr, 0, 0, 0.011);
  }
  const vase = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 16), std({ color: '#3f6f8f', roughness: 0.2 }), buf, 0.7, 1.0, 0.05);
  for (let i = 0; i < 7; i++) mesh(new THREE.SphereGeometry(0.035, 8, 6), std({ color: ['#f2c3d3', '#ffffff', '#f7e08a'][i % 3], roughness: 0.8 }), buf, 0.7 + Math.cos(i) * 0.07, 1.18 + (i % 3) * 0.04, 0.05 + Math.sin(i) * 0.07);
  // un grand tableau au-dessus du buffet, la porte d'entrée (fermée) et le portemanteau
  const paint = canvasTex(320, 220, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fc2d8'); gr.addColorStop(0.55, '#e9d9b0'); gr.addColorStop(1, '#6f8f4f'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#8a5a3a'; g.fillRect(200, 90, 50, 60); g.fillStyle = '#a33'; g.beginPath(); g.moveTo(190, 90); g.lineTo(225, 60); g.lineTo(260, 90); g.fill(); });
  const pf = new THREE.Group(); pf.position.set(x0 + 0.03, 1.65, -0.9); pf.rotation.y = Math.PI / 2; S.add(pf);
  rb(0.86, 0.62, 0.04, 0.01, std({ color: '#b48a3a', metalness: 0.6, roughness: 0.35 }), pf, 0, 0, 0); plane(0.76, 0.52, std({ map: paint, roughness: 0.6 }), pf, 0, 0, 0.021);
  const door = std({ map: woodTex('#8a5a36', 81), roughness: 0.5 });
  bb(x1 - 0.05, x1, 0, 2.1, 0.35, 1.3, door, S); bb(x1 - 0.07, x1, 2.05, 2.15, 0.3, 1.35, frameM, S);
  rod(V3(x1 - 0.08, 1.0, 0.45), V3(x1 - 0.08, 1.0, 0.6), 0.012, std({ color: '#c9a043', metalness: 0.85, roughness: 0.25 }), S);
  rb(0.6, 0.02, 0.4, 0.01, std({ color: '#5a4a3a', roughness: 1 }), S, x1 - 0.4, 0.01, 0.82);
  rod(V3(x1 - 0.2, 0, 1.75), V3(x1 - 0.2, 1.75, 1.75), 0.02, wood, S); rb(0.35, 0.6, 0.12, 0.05, std({ color: '#4a5a6a', roughness: 1 }), S, x1 - 0.25, 1.35, 1.75);
  plant(S, -1.75, -1.85, 1.0);
  // le plafonnier (lustre éteint)
  cyl(0.18, 0.04, frameM, S, 0, H - 0.02, 0.0, 24); mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, 6.3, 0, 1.6), std({ color: '#f5e9cf', roughness: 0.8, side: THREE.DoubleSide }), S, 0, H - 0.45, 0.0, Math.PI, 0, 0);
  rod(V3(0, H, 0), V3(0, H - 0.45, 0), 0.006, m.steel, S);
  // les lumières : le soleil du matin par la fenêtre (avec ombres), le jour diffus, la lampe
  const hemi = X.light(new THREE.HemisphereLight('#f4ead8', '#5b4636', 0.35));
  const sun = sunLight(X, '#ffd59a', 2.4, [-2.5, 4.6, -7.5], [0.4, 0, 0.4], 4);
  const lamp = X.light(new THREE.PointLight('#ffcf8a', 1.0, 3.5, 1.6)); lamp.position.set(1.85, 1.0, -1.85);
  X.mood = () => {};
  X.cam('main', [-1.8, 2.2, 1.95], [0.55, 0.72, -0.95], 62);
  return X.finish();
}

// =====================================================================
//  UNE SALLE DE RÉUNION D'UN MINISTÈRE, LA NUIT (6 m × 6,2 m, 3,4 m sous plafond) : boiseries, grande table, chaises,
//  dossiers et ordinateurs, drapeaux, hautes fenêtres sur les toits de Paris. MI.spots[i] = { p, ry } (places autour de la table).
// =====================================================================
export function buildMinistere(scene, { at = V3(0, 0, 0) } = {}) {
  const X = place(scene, at), S = X.S, G = X.G, m = mats();
  const x0 = -3, x1 = 3, z0 = -3.2, z1 = 3, H = 3.4;
  const panel = std({ map: paintTex('#e6dfcf', 41), roughness: 0.8 }), mold = std({ color: '#efe9db', roughness: 0.6 });
  const floor = std({ map: rep(parquetTex('#6f4a2c'), 5, 5.2), roughness: 0.35 });
  bb(x0, x1, -0.05, 0, z0, z1, floor, S); bb(x0, x1, H, H + 0.05, z0, z1, std({ color: '#f2eee4', roughness: 0.9 }), S);
  // les hautes fenêtres du mur du fond (x de -2.3 à -0.8 et de 0.8 à 2.3)
  const W = [[-2.3, -0.8], [0.8, 2.3]], wy0 = 0.35, wy1 = 2.95;
  bb(x0, W[0][0], 0, H, z0 - 0.15, z0, panel, S); bb(W[0][1], W[1][0], 0, H, z0 - 0.15, z0, panel, S); bb(W[1][1], x1, 0, H, z0 - 0.15, z0, panel, S);
  for (const [a, b] of W) { bb(a, b, 0, wy0, z0 - 0.15, z0, panel, S); bb(a, b, wy1, H, z0 - 0.15, z0, panel, S);
    for (const x of [a, (a + b) / 2, b]) bb(x - 0.035, x + 0.035, wy0, wy1, z0 - 0.12, z0 + 0.02, mold, S);
    for (let y = wy0; y <= wy1 + 0.01; y += (wy1 - wy0) / 4) bb(a, b, y - 0.02, y + 0.02, z0 - 0.12, z0 + 0.02, mold, S);
    plane(b - a, wy1 - wy0, m.glass, G, (a + b) / 2, (wy0 + wy1) / 2, z0 - 0.06);
    const dr = std({ color: '#5b1f2a', roughness: 1, side: THREE.DoubleSide });
    for (const xa of [a - 0.3, b + 0.05]) for (let i = 0; i < 4; i++) { const c = mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 10, 1, true, 0, Math.PI), dr, S, xa + i * 0.07, 1.6, z0 + 0.15); c.scale.set(1, 1, 0.6); }
  }
  plane(9, 5.4, new THREE.MeshBasicMaterial({ map: parisNightTex(), fog: false, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }), G, 0, 1.6, z0 - 3.5);
  bb(x0 - 0.12, x0, 0, H, z0, z1, panel, S); bb(x1, x1 + 0.12, 0, H, z0, z1, panel, S); bb(x0, x1, 0, H, z1, z1 + 0.1, panel, S);
  // les boiseries : cadres moulurés sur les murs, cimaise, plinthe, corniche
  for (const [ax, sgn] of [[x0, 1], [x1, -1]]) {
    bb(Math.min(ax, ax + sgn * 0.04), Math.max(ax, ax + sgn * 0.04), 0, 0.18, z0, z1, mold, S); bb(Math.min(ax, ax + sgn * 0.04), Math.max(ax, ax + sgn * 0.04), 0.95, 1.0, z0, z1, mold, S);
    bb(Math.min(ax, ax + sgn * 0.08), Math.max(ax, ax + sgn * 0.08), H - 0.15, H, z0, z1, mold, S);
    for (let z = z0 + 0.5; z < z1 - 0.8; z += 1.3) { for (const [y0, y1] of [[1.2, 2.9], [0.3, 0.82]]) { const fx = ax + sgn * 0.015;
      bb(Math.min(ax, fx), Math.max(ax, fx), y0, y0 + 0.04, z, z + 1.0, mold, S); bb(Math.min(ax, fx), Math.max(ax, fx), y1 - 0.04, y1, z, z + 1.0, mold, S);
      bb(Math.min(ax, fx), Math.max(ax, fx), y0, y1, z, z + 0.04, mold, S); bb(Math.min(ax, fx), Math.max(ax, fx), y0, y1, z + 0.96, z + 1.0, mold, S); } }
  }
  bb(x0, x1, H - 0.15, H, z0, z0 + 0.08, mold, S);
  // la grande table et les chaises
  const wood = std({ map: woodTex('#5a3520', 91, 256, 512), roughness: 0.35 });
  bb(-0.75, 0.75, 0.72, 0.78, -1.9, 1.7, wood, S);
  for (const [x, z] of [[-0.6, -1.7], [0.6, -1.7], [-0.6, 1.5], [0.6, 1.5]]) bb(x - 0.05, x + 0.05, 0, 0.72, z - 0.05, z + 0.05, wood, S);
  const leather = std({ color: '#3b2a22', roughness: 0.55 });
  X.spots = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
    const z = -1.5 + i * 0.75, c = new THREE.Group(); c.position.set(sx * 1.08, 0, z); c.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; S.add(c);
    rb(0.5, 0.08, 0.5, 0.03, leather, c, 0, 0.47, 0); const bk = rb(0.5, 0.6, 0.08, 0.03, leather, c, 0, 0.82, -0.23); bk.rotation.x = -0.08;
    for (const ax of [-0.2, 0.2]) for (const az of [-0.2, 0.2]) cyl(0.02, 0.44, wood, c, ax, 0.22, az, 8);
    X.spots.push({ p: X.P(sx * 1.08, 0, z), ry: sx > 0 ? -Math.PI / 2 : Math.PI / 2 });
  }
  // sur la table : dossiers, ordinateurs, bouteilles d'eau, verres, tasses
  const r = rng(17);
  for (let i = 0; i < 9; i++) { const z = -1.6 + i * 0.38, sx = i % 2 ? -1 : 1;
    rb(0.24, 0.015 + r() * 0.03, 0.32, 0.004, std({ color: ['#f4f1e8', '#d8e4ee', '#f1d9a8'][i % 3], roughness: 0.8 }), S, sx * (0.3 + r() * 0.15), 0.79, z, (r() - 0.5) * 0.5);
    if (i % 3 === 0) { mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), std({ color: '#d7ecf5', transparent: true, opacity: 0.55, roughness: 0.05 }), S, 0, 0.89, z + 0.1); cyl(0.012, 0.02, std({ color: '#2b6cb0' }), S, 0, 1.01, z + 0.1, 8); }
    if (i % 2 === 0) cyl(0.035, 0.08, std({ color: '#ffffff', roughness: 0.3 }), S, sx * 0.55, 0.82, z + 0.15, 14);
  }
  for (const [x, z, ry] of [[-0.42, -0.6, Math.PI / 2], [0.42, 0.6, -Math.PI / 2], [0.4, -1.2, -Math.PI / 2]]) {
    const lp = new THREE.Group(); lp.position.set(x, 0.78, z); lp.rotation.y = ry; S.add(lp);
    rb(0.34, 0.015, 0.24, 0.005, m.dark, lp, 0, 0.008, 0); const lid = new THREE.Group(); lid.position.set(0, 0.015, -0.12); lid.rotation.x = -0.3; lp.add(lid);
    rb(0.34, 0.23, 0.012, 0.005, m.dark, lid, 0, 0.115, 0); plane(0.3, 0.19, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.85, 1.0), toneMapped: false }), lid, 0, 0.115, 0.007);
  }
  // les drapeaux (France, Europe) dans le coin, sur leurs hampes dorées
  const flag = (tex, x, z) => { const fg = new THREE.Group(); fg.position.set(x, 0, z); S.add(fg); cyl(0.12, 0.05, std({ color: '#2a2a2a' }), fg, 0, 0.025, 0, 16);
    rod(V3(0, 0, 0), V3(0, 2.6, 0), 0.018, std({ color: '#c9a043', metalness: 0.85, roughness: 0.3 }), fg); mesh(new THREE.ConeGeometry(0.04, 0.12, 12), std({ color: '#c9a043', metalness: 0.85, roughness: 0.3 }), fg, 0, 2.66, 0);
    const cloth = new THREE.PlaneGeometry(0.5, 1.5, 6, 12); const p = cloth.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 4 + p.getX(i) * 3) * 0.04); cloth.computeVertexNormals();
    mesh(cloth, std({ map: tex, roughness: 0.9, side: THREE.DoubleSide }), fg, 0.03, 1.75, 0.02, 0, 0.6, 0); };
  flag(canvasTex(128, 384, (g, w, h) => { g.fillStyle = '#0055a4'; g.fillRect(0, 0, w, h / 3); g.fillStyle = '#ffffff'; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = '#ef4135'; g.fillRect(0, 2 * h / 3, w, h / 3); }), x0 + 0.45, z0 + 0.5);
  flag(canvasTex(128, 384, (g, w, h) => { g.fillStyle = '#003399'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcc00'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; g.beginPath(); g.arc(w / 2 + Math.cos(a) * 40, h / 2 + Math.sin(a) * 40, 6, 0, 7); g.fill(); } }), x0 + 0.85, z0 + 0.4);
  // l'écran mural : une carte de France (générique) avec des points
  const mapTex = canvasTex(640, 400, (g, w, h) => { g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8eef4'; g.font = '700 26px Inter'; g.fillText('SITUATION DES HÔPITAUX', 24, 40);
    const F = [[0.47, 0.08], [0.58, 0.12], [0.7, 0.2], [0.78, 0.34], [0.74, 0.5], [0.8, 0.66], [0.72, 0.8], [0.6, 0.82], [0.5, 0.92], [0.36, 0.86], [0.3, 0.7], [0.33, 0.5], [0.2, 0.36], [0.12, 0.3], [0.28, 0.24], [0.4, 0.18]];
    g.fillStyle = '#23405e'; g.strokeStyle = '#6f9ccc'; g.lineWidth = 2; g.beginPath(); F.forEach(([x, y], i) => { const px = 120 + x * 380, py = 60 + y * 320; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill(); g.stroke();
    const rr = rng(3); for (let i = 0; i < 46; i++) { const x = 120 + (0.25 + rr() * 0.5) * 380, y = 60 + (0.15 + rr() * 0.7) * 320; g.fillStyle = rr() < 0.75 ? '#ff4d3d' : '#ffb03b'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } });
  rb(1.7, 1.0, 0.06, 0.01, m.black, S, x1 - 0.04, 1.75, -0.4, -Math.PI / 2); plane(1.62, 0.92, new THREE.MeshBasicMaterial({ map: mapTex, toneMapped: false }), S, x1 - 0.075, 1.75, -0.4, 0, -Math.PI / 2);
  // le lustre (cristal stylisé)
  const ch = new THREE.Group(); ch.position.set(0, H - 0.75, -0.1); S.add(ch);
  rod(V3(0, 0.75, 0), V3(0, 0.15, 0), 0.01, std({ color: '#c9a043', metalness: 0.8, roughness: 0.3 }), ch);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 2.0), toneMapped: false }), ch, Math.cos(a) * 0.4, 0.05, Math.sin(a) * 0.4); rod(V3(0, 0.12, 0), V3(Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.4), 0.008, std({ color: '#c9a043', metalness: 0.8, roughness: 0.3 }), ch); }
  const hemi = X.light(new THREE.HemisphereLight('#3a4f7a', '#2a1e16', 0.25));
  const chand = X.light(new THREE.PointLight('#ffd59c', 5, 9, 1.3)); chand.position.set(0, H - 0.75, -0.1);
  const spot2 = X.light(new THREE.PointLight('#ffdcae', 1.8, 6, 1.5)); spot2.position.set(0, 2.2, 1.6);
  const moon = sunLight(X, '#9fb6ff', 0.5, [-1.5, 6, -9], [0, 0, 0.5], 5);
  X.mood = () => {};
  X.cam('main', [2.55, 2.85, 2.6], [-0.45, 0.85, -1.15], 64);
  return X.finish();
}

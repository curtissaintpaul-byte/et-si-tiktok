// Vignettes de l'épisode « trou à travers la Terre » : la sortie dans le Pacifique Sud ; le forage de Kola
import { grad, stars, water } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 50, Y = 700, W = 660, H = 400;
const lerp = (a, b, k) => a + (b - a) * k;

// l'état du saut, rempli par scene.js à chaque image : s (km parcourus dans le tunnel depuis Paris), dKm (profondeur),
// vK (km/h), phase (défilement des anneaux), tempAt(d), layerAt(d)
export const S = {};
// couleur d'une roche chauffée (rayonnement de corps noir, approché) : rien sous ~500 °C, puis rouge sombre, orange, jaune, presque blanc
const GLOW = [[500, [70, 10, 0]], [700, [150, 24, 4]], [1000, [215, 60, 12]], [1500, [255, 112, 28]], [2500, [255, 168, 72]], [4000, [255, 214, 150]], [6000, [255, 240, 214]]];
function glowAt(T) {
  if (T <= GLOW[0][0]) return [GLOW[0][1], 0];
  for (let i = 1; i < GLOW.length; i++) if (T <= GLOW[i][0]) { const [a, ca] = GLOW[i - 1], [b, cb] = GLOW[i], k = (T - a) / (b - a); return [ca.map((v, j) => lerp(v, cb[j], k)), sm(500, 950, T)]; }
  return [GLOW[GLOW.length - 1][1], 1];
}
const RT = 6371, D0 = 0.5;   // distance devant soi (km) d'un anneau dessiné à la profondeur z : D0·z³ (près : la paroi autour de lui ; au fond : les profondeurs, comme une lumière au bout du tunnel)
const LAYER_FR = { 'CROÛTE': 'la croûte', 'MANTEAU': 'le manteau', 'NOYAU EXTERNE · FER LIQUIDE': 'le noyau : du fer liquide', 'GRAINE · FER SOLIDE': 'la graine : du fer solide' };

// la caméra embarquée : on tombe avec lui, on regarde le tunnel filer vers le bas
function tunnel(g, x, y, w, h, u, t) {
  const cx = x + w / 2, cy = y + h / 2 + 6, F = w * 0.34;
  const s0 = S.s || 0, rem = 2 * RT - s0;   // ce qui reste jusqu'à la sortie (Pacifique)
  const zExit = Math.cbrt(rem / D0);
  const colorAt = (z) => {   // la paroi à la distance z devant : roche éclairée par la lampe, ou roche qui rougeoie
    const sz = Math.min(2 * RT, s0 + D0 * z * z * z), d = RT - Math.abs(RT - sz), T = S.tempAt ? S.tempAt(d) : 15;
    const lamp = 1 / (1 + 0.22 * z * z), [gc, e] = glowAt(T), fade = 0.72 + 0.28 / (1 + 0.04 * z);
    return [0, 1, 2].map((j) => Math.round([118, 110, 100][j] * lamp * (1 - e) + gc[j] * e * fade));
  };
  { const c = colorAt(0.3); g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(x, y, w, h); }   // la paroi toute proche remplit les bords
  const N = 16, fr = (S.phase || 0) % 1;
  // du plus proche (grand disque) au plus lointain (petit disque) : chaque disque ne laisse voir que son anneau
  let zEnd = N;
  for (let i = 0; i <= N; i++) {
    const z = 0.5 + i - fr; if (z <= 0.05) continue;
    if (z > zExit) { zEnd = z; break; }
    const c = colorAt(z + 0.5); g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    g.beginPath(); g.arc(cx, cy, F / z, 0, 7); g.fill();
    g.strokeStyle = `rgba(0,0,0,${0.35 / (1 + 0.08 * z)})`; g.lineWidth = Math.max(0.6, 5 / z); g.beginPath(); g.arc(cx, cy, F / z, 0, 7); g.stroke();
  }
  // au bout : soit la suite du tunnel (de plus en plus lointaine), soit la sortie, un rond de ciel de nuit étoilé
  if (zExit < N) {
    const r = F / Math.max(zExit, 0.3); g.fillStyle = '#0a1430'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip(); stars(g, cx - r, cy - r, 2 * r, 2 * r, Math.min(220, 8 + r * 1.2), 77, 0.9); g.restore();
  } else { const c = colorAt(N); g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.beginPath(); g.arc(cx, cy, F / N, 0, 7); g.fill(); }
  // un léger dégradé : plus sombre sur les bords, pour sentir la profondeur
  { const rg = g.createRadialGradient(cx, cy, 20, cx, cy, w * 0.6); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(25,8,0,0.35)'); g.fillStyle = rg; g.fillRect(x, y, w, h); }
  // quelques lignes droites le long du tunnel : il est parfaitement droit
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1.2;
  for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2 + 0.2; g.beginPath(); g.moveTo(cx + Math.cos(an) * F / Math.min(zEnd, N), cy + Math.sin(an) * F / Math.min(zEnd, N)); g.lineTo(cx + Math.cos(an) * 520, cy + Math.sin(an) * 520); g.stroke(); }
  // le sauteur, vu d'au-dessus : il flotte (apesanteur), bras écartés, jambes vers le fond du tunnel
  const [gc, e] = glowAt(S.tempAt ? S.tempAt(S.dKm || 0) : 15);
  const suit = [0, 1, 2].map((j) => Math.round(lerp([232, 232, 226][j], gc[j], 0.45 * e)));
  const sc = `rgb(${suit[0]},${suit[1]},${suit[2]})`, sh = `rgb(${Math.round(suit[0] * 0.62)},${Math.round(suit[1] * 0.62)},${Math.round(suit[2] * 0.62)})`;
  g.save(); g.translate(cx + 7 * Math.sin(t * 0.8), cy + 34 + 5 * Math.sin(t * 1.1)); g.rotate(0.18 * Math.sin(t * 0.5));
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(20,10,5,0.55)'; g.lineWidth = 19; g.beginPath(); g.moveTo(-9, 18); g.lineTo(-6, 40); g.moveTo(9, 18); g.lineTo(5, 38); g.moveTo(-16, -8); g.quadraticCurveTo(-42, -14, -56, -36); g.moveTo(16, -8); g.quadraticCurveTo(42, -14, 56, -36); g.stroke();
  g.fillStyle = 'rgba(20,10,5,0.55)'; g.beginPath(); g.ellipse(0, 4, 24, 29, 0, 0, 7); g.fill(); g.beginPath(); g.arc(0, -20, 18, 0, 7); g.fill();
  g.strokeStyle = sh; g.lineWidth = 15; g.beginPath(); g.moveTo(-9, 18); g.lineTo(-6, 40); g.moveTo(9, 18); g.lineTo(5, 38); g.stroke();   // jambes (vers le fond)
  g.strokeStyle = sc; g.lineWidth = 13; g.beginPath(); g.moveTo(-16, -8); g.quadraticCurveTo(-42, -14, -56, -36); g.moveTo(16, -8); g.quadraticCurveTo(42, -14, 56, -36); g.stroke();   // bras
  g.fillStyle = sc; g.beginPath(); g.ellipse(0, 4, 21, 26, 0, 0, 7); g.fill();   // le corps
  g.fillStyle = sh; g.beginPath(); g.ellipse(0, 10, 15, 14, 0, 0, 7); g.fill();
  g.fillStyle = '#f2f2ee'; g.beginPath(); g.arc(0, -20, 15, 0, 7); g.fill();   // le casque
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(0, -16, 9, 0, Math.PI); g.fill();
  g.restore();
  // le bandeau du bas : dans quelle couche on est
  g.fillStyle = grad(g, 0, y + h - 90, 0, y + h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.6)']]); g.fillRect(x, y + h - 90, w, 90);
  const lay = rem < 30 ? 'la sortie !' : (LAYER_FR[S.layerAt ? S.layerAt(S.dKm || 0) : ''] || '');
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText(lay, x + w - 18, y + h - 18); g.textAlign = 'left';
}

function pacifique(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#04060f'], [1, '#0d1630']]); g.fillRect(x, y, w, h); stars(g, x, y, w, h * 0.55, 160, 41, 0.8);
  const hy = y + h * 0.56; water(g, x, y, w, h, hy, t, 'rgba(18,40,64,0.98)', 'rgba(6,14,26,1)');
  // la plate-forme et son trou
  const cx = x + w * 0.5, cy = hy + 58;
  g.fillStyle = '#5a5f66'; g.beginPath(); g.ellipse(cx, cy, 150, 36, 0, 0, 7); g.fill();
  g.fillStyle = '#05070a'; g.beginPath(); g.ellipse(cx, cy, 60, 14, 0, 0, 7); g.fill();
  g.fillStyle = '#ffd36b'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * 130, cy + Math.sin(a) * 30, 3, 0, 7); g.fill(); }
  // le sauteur : il remonte, s'arrête pile au bord (vitesse nulle)… et retombe
  const up = sm(0.2, 1.6, u) * (1 - sm(2.4, 3.6, u)), hgt = up * 70;
  g.save(); g.beginPath(); g.rect(x, y, w, cy - y); g.ellipse(cx, cy, 60, 14, 0, 0, Math.PI); g.clip();
  g.fillStyle = '#e8e8e4'; g.fillRect(cx - 9, cy - hgt, 18, 46); g.beginPath(); g.arc(cx, cy - hgt - 8, 10, 0, 7); g.fill();
  g.fillRect(cx - 18, cy - hgt - 4 - 24, 5, 26); g.fillRect(cx + 13, cy - hgt - 4 - 24, 5, 26);
  g.restore();
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText(u < 2.4 ? 'vitesse : 0 km/h' : 'et il retombe…', x + w - 18, y + h - 18); g.textAlign = 'left';
}
function kola(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#9fb3c2'], [1, '#d9dfe2']]); g.fillRect(x, y, w, h);
  const G = y + h * 0.62; g.fillStyle = '#8f8a80'; g.fillRect(x, G, w, h);
  // la dalle de béton et le couvercle rouillé, boulonné
  g.fillStyle = '#a9a49a'; g.beginPath(); g.ellipse(x + w * 0.3, G + 40, 150, 34, 0, 0, 7); g.fill();
  g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(x + w * 0.3, G + 34, 44, 11, 0, 0, 7); g.fill(); g.fillStyle = '#5a3420'; g.fillRect(x + w * 0.3 - 44, G + 34, 88, 9);
  g.fillStyle = '#3a2a20'; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.beginPath(); g.arc(x + w * 0.3 + Math.cos(a) * 36, G + 34 + Math.sin(a) * 8, 2.5, 0, 7); g.fill(); }
  // la barre : 12 km sur 6 371 km
  const bx = x + w * 0.62, by = y + 70, bh = h - 120;
  g.fillStyle = 'rgba(30,40,50,0.8)'; g.fillRect(bx, by, 60, bh); g.fillStyle = '#ff6b5e'; g.fillRect(bx, by, 60, Math.max(2, bh * 12.262 / 6371 * sm(0.3, 1.2, u) * 1.0));
  g.font = "600 15px Inter"; g.fillStyle = '#1e2830'; g.fillText('SURFACE', bx + 70, by + 6); g.fillText('CENTRE DE LA TERRE', bx + 70, by + bh); g.fillStyle = '#c0392b'; g.fillText('← 12,26 KM', bx + 70, by + 24);
  g.font = "500 30px Garamond"; g.fillStyle = '#1e2830'; g.fillText('0,2 % du chemin', x + 20, y + h - 20);
}
export const INSETS = [
  { t0: 12.0, t1: 36.8, x: X, y: Y, w: W, h: H, label: 'CAM 03 · EMBARQUÉE AVEC LE SAUTEUR', tag: 'cam', draw: tunnel },
  { t0: 37.2, t1: 44.8, x: X, y: Y, w: W, h: H, label: 'CAM 02 · PACIFIQUE SUD · NUIT', tag: 'cam', draw: pacifique },
  { t0: 61.2, t1: 65.8, x: X, y: Y, w: W, h: H, label: 'FORAGE SG-3 · KOLA · RUSSIE', tag: 'archive', draw: kola },
];

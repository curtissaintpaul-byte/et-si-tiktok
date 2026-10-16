// Vignettes de l'épisode « Terre deux fois plus grosse » (temps de SCÈNE → realT les décale après les arrêts sur image)
//  1) la fusée qui ne peut plus atteindre l'orbite (il faudrait 15,8 km/s au lieu de 7,9)
//  2) Kepler-452b à côté de la Terre (NASA, 2015 : environ 60 % plus large, gravité environ deux fois la nôtre)
//  3) la centrifugeuse de la NASA (Ames) : 22 h à bord, jusqu'à 1,5 g (Cowings et al., 2003)
import { grad, rngFn, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 490, W = 740, H = 320;   // en haut, sur les montagnes (en bas, ça cacherait Camille)   // sous les sous-titres

function rocket(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#2f5d8f'], [1, '#9fbcd6']]); g.fillRect(x, y, w, h);
  g.fillStyle = '#3a4a3a'; g.fillRect(x, y + h - 46, w, 46);
  const px = x + w * 0.3, gy = y + h - 46;
  g.fillStyle = '#5d5d5d'; g.fillRect(px - 60, gy - 14, 120, 14); g.fillStyle = '#7a3b2a'; g.fillRect(px - 62, gy - 230, 12, 216);
  for (let i = 0; i < 9; i++) g.fillRect(px - 62, gy - 30 - i * 24, 28, 3);
  // la fusée : moteurs allumés à fond… elle tremble mais ne monte pas
  const j = Math.sin(t * 70) * 1.5, ry = gy - 14 - 6 * sm(0.3, 0.8, u) * (1 - sm(0.8, 1.6, u));
  g.save(); g.translate(px + j, ry);
  const fl = 50 + 14 * Math.sin(t * 37); g.fillStyle = '#ffd27a'; g.beginPath(); g.moveTo(-18, 0); g.lineTo(0, fl); g.lineTo(18, 0); g.fill();
  g.fillStyle = 'rgba(235,235,235,0.75)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc((i - 3) * 22, 18 + Math.sin(t * 3 + i) * 4, 22 + (i % 3) * 6, 0, 7); g.fill(); }
  g.fillStyle = '#eef1f5'; g.fillRect(-16, -190, 32, 190); g.beginPath(); g.moveTo(-16, -190); g.lineTo(0, -222); g.lineTo(16, -190); g.fill();
  g.fillStyle = '#20252b'; g.fillRect(-16, -120, 32, 6); g.restore();
  const bx = x + w * 0.55;
  g.font = '800 24px Inter'; g.fillStyle = '#ffffff'; g.fillText('POUSSÉE  <  POIDS', bx, y + 100);
  g.font = '600 20px Inter'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('à 2 g, elle pèse deux fois', bx, y + 142); g.fillText('plus lourd sur son pas de tir', bx, y + 170);
  g.fillStyle = 'rgba(200,240,255,0.98)'; g.fillText('et l’orbite demanderait', bx, y + 220); g.fillText('15,8 km/s (au lieu de 7,9)', bx, y + 248);
}

function kepler(g, x, y, w, h, u, t) {
  g.fillStyle = '#05070d'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 140, 9, 0.8);
  const cy = y + h * 0.5, r1 = h * 0.15, r2 = r1 * 1.6, a = sm(0.2, 1.0, u);
  const ball = (cx, r, c0, c1) => { g.fillStyle = grad(g, cx - r, cy - r, cx + r, cy + r, [[0, c0], [1, c1]]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); };
  ball(x + w * 0.27, r1, '#6fa8dc', '#1d3a66');
  g.globalAlpha = a; ball(x + w * 0.66, r2, '#d7b98a', '#5b4128'); g.globalAlpha = 1;
  g.font = '600 19px Inter'; g.fillStyle = '#fff'; g.textAlign = 'center';
  g.fillText('LA TERRE', x + w * 0.27, y + 74); g.globalAlpha = a; g.fillText('KEPLER-452b · ~1,6 × PLUS LARGE', x + w * 0.66, y + 74); g.globalAlpha = 1; g.textAlign = 'left';
}

function centrifuge(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#cbb894'], [1, '#e2d3b2']]); g.fillRect(x, y, w, h);
  const cx = x + w * 0.5, cy = y + h * 0.5, L = h * 0.38, a = u * 1.6;
  g.fillStyle = '#6a5d48'; g.beginPath(); g.ellipse(cx, cy + 6, L * 1.45, L * 0.5, 0, 0, 7); g.fill();
  for (const s of [0, Math.PI]) { const px = cx + Math.cos(a + s) * L * 1.3, py = cy + Math.sin(a + s) * L * 0.42;
    g.strokeStyle = '#3a3226'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke();
    g.fillStyle = '#efe7d4'; g.fillRect(px - 26, py - 22, 52, 40); g.fillStyle = '#3a3226'; g.fillRect(px - 10, py - 12, 20, 14); }
  g.fillStyle = '#3a3226'; g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
  const r = rngFn(Math.floor(t * 24)); g.fillStyle = 'rgba(60,40,20,0.25)'; for (let i = 0; i < 160; i++) g.fillRect(x + r() * w, y + r() * h, 1.5, 1.5);
}

export function insetList(realT) {
  return [
    { t0: realT(38.8), t1: realT(42.2), x: X, y: Y, w: W, h: H, label: 'CALCUL · LE DÉCOLLAGE À 2 g', tag: 'schema', draw: rocket },
    { t0: realT(54.6), t1: realT(61.6), x: X, y: Y, w: W, h: H, label: 'NASA · TÉLESCOPE KEPLER · 2015', tag: 'archive', caption: 'à 1 400 années-lumière', draw: kepler },
    { t0: realT(61.8), t1: realT(65.2), x: X, y: Y, w: W, h: H, label: 'NASA AMES · CENTRIFUGEUSE', tag: 'archive', caption: '22 h à bord, jusqu’à 1,5 g', captionColor: '#3a2a1a', draw: centrifuge },
  ];
}

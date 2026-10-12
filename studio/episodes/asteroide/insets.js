// Vignettes de l'épisode astéroïde : il y a 66 millions d'années ; la mission DART (2022)
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 1330, W = 740, H = 400;

function cretace(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#e8a868'], [0.7, '#f4d3a0'], [1, '#c9a070']]); g.fillRect(x, y, w, h);
  // le bolide qui arrive
  const k = sm(0.2, 4.2, u), bx = x + w * (0.85 - 0.35 * k), by = y + h * (0.12 + 0.3 * k);
  g.strokeStyle = 'rgba(255,255,230,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx + 120, by - 70); g.lineTo(bx, by); g.stroke();
  g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(bx, by, 6, 0, 7); g.fill();
  const G = y + h * 0.8; g.fillStyle = '#4a5a32'; g.fillRect(x, G, w, h);
  // fougères, palmiers (cycas)
  g.fillStyle = '#2e3e22'; for (let i = 0; i < 6; i++) { const px = x + 40 + i * 130; g.fillRect(px, G - 60, 6, 60); for (let f = 0; f < 6; f++) { g.beginPath(); g.ellipse(px + 3, G - 62, 34, 7, -1.2 + f * 0.48, 0, 7); g.fill(); } }
  // silhouettes de dinosaures (génériques) : un grand herbivore à long cou, un bipède
  g.fillStyle = '#1e2414';
  g.beginPath(); g.ellipse(x + w * 0.42, G - 34, 60, 26, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x + w * 0.42 + 40, G - 46); g.quadraticCurveTo(x + w * 0.42 + 90, G - 120, x + w * 0.42 + 112, G - 118); g.lineTo(x + w * 0.42 + 116, G - 108); g.quadraticCurveTo(x + w * 0.42 + 92, G - 104, x + w * 0.42 + 54, G - 30); g.fill();
  g.beginPath(); g.moveTo(x + w * 0.42 - 50, G - 30); g.quadraticCurveTo(x + w * 0.42 - 110, G - 20, x + w * 0.42 - 140, G - 6); g.lineTo(x + w * 0.42 - 50, G - 20); g.fill();
  for (const dx of [-40, -14, 18, 42]) g.fillRect(x + w * 0.42 + dx, G - 14, 12, 16);
  g.beginPath(); g.ellipse(x + w * 0.78, G - 40, 26, 14, -0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + w * 0.78 + 26, G - 58, 14, 9, -0.2, 0, 7); g.fill();
  g.fillRect(x + w * 0.78 - 6, G - 30, 7, 30); g.fillRect(x + w * 0.78 + 6, G - 30, 7, 30); g.beginPath(); g.moveTo(x + w * 0.78 - 20, G - 44); g.lineTo(x + w * 0.78 - 70, G - 30); g.lineTo(x + w * 0.78 - 18, G - 36); g.fill();
  g.font = "500 32px Garamond"; g.fillStyle = '#3a2a14'; g.textAlign = 'right'; g.fillText('il y a 66 millions d’années', x + w - 18, y + 70); g.textAlign = 'left';
}
function dart(g, x, y, w, h, u, t) {
  g.fillStyle = '#04060b'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 140, 22, 0.6);
  const cx = x + w * 0.42, cy = y + h * 0.55;
  // Didymos (780 m) et sa petite lune Dimorphos (160 m) qui tourne autour
  g.fillStyle = '#8a8478'; g.beginPath(); g.ellipse(cx, cy, 62, 54, 0.3, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(cx + 18, cy + 10, 50, 44, 0.3, 0, 7); g.fill();
  const hit = 1.6, before = u < hit;
  const per = before ? 1.0 : 0.955;   // l'orbite raccourcie (11 h 55 → 11 h 23 : −32 min)
  const ang = -1.3 + u * 0.9 * (before ? 1 : 1 / per), rx = 190, ry = 54;
  g.strokeStyle = 'rgba(200,210,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke();
  if (!before) { g.strokeStyle = 'rgba(255,210,120,0.6)'; g.beginPath(); g.ellipse(cx, cy, rx * 0.97, ry * 0.97, 0, 0, 7); g.stroke(); }
  const dx = cx + rx * Math.cos(ang), dy = cy + ry * Math.sin(ang);
  g.fillStyle = '#9a948a'; g.beginPath(); g.arc(dx, dy, 13, 0, 7); g.fill();
  // la sonde DART qui fonce dessus, l'éclair, le panache de débris
  if (before) { const k = u / hit; const sx = dx + (1 - k) * 340, sy = dy - (1 - k) * 120; g.fillStyle = '#e8eef8'; g.fillRect(sx - 4, sy - 3, 8, 6); g.fillRect(sx - 14, sy - 1, 28, 2);
    g.strokeStyle = 'rgba(160,200,255,0.4)'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 60, sy - 21); g.stroke(); }
  else { const e = u - hit; const f = Math.exp(-e * 3); g.fillStyle = `rgba(255,250,230,${f})`; g.beginPath(); g.arc(dx, dy, 14 + 40 * (1 - f), 0, 7); g.fill();
    for (let i = 0; i < 40; i++) { const a = -0.6 + (i / 40) * 1.4, r = 16 + e * (40 + (i * 37) % 60); g.fillStyle = `rgba(220,210,190,${Math.max(0, 0.7 - e * 0.25)})`; g.fillRect(dx + Math.cos(a) * r, dy + Math.sin(a) * r * 0.6 - e * 8, 2, 2); } }
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText(before ? 'Dimorphos, 160 m' : 'orbite raccourcie de 32 min', x + w - 18, y + h - 18); g.textAlign = 'left';
}
export const INSETS = [
  { t0: 3.6, t1: 8.0, x: X, y: Y, w: W, h: H, label: 'IL Y A 66 MILLIONS D’ANNÉES', tag: 'archive', draw: cretace },
  { t0: 61.6, t1: 66.0, x: X, y: Y, w: W, h: H, label: 'MISSION DART · NASA · 2022', tag: 'archive', draw: dart },
];

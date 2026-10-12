// Vignettes de l'épisode Lune : un port noyé deux fois par jour ; 0,01 % de la Lune contre l'astéroïde des dinosaures
import { grad, stars, water } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 1440, W = 740, H = 360;

function port(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#0a1020'], [1, '#18223a']]); g.fillRect(x, y, w, h); stars(g, x, y, w, h * 0.4, 80, 76, 0.6);
  const Q = y + h * 0.62;   // le quai
  // les maisons du port (façades étroites, fenêtres allumées)
  const cols = ['#3a4252', '#4a4a56', '#3a3a48', '#505868', '#44404e'];
  for (let i = 0; i < 9; i++) { const bx = x + 20 + i * 78, bh = 90 + (i * 23) % 50; g.fillStyle = cols[i % 5]; g.fillRect(bx, Q - bh, 70, bh);
    g.beginPath(); g.moveTo(bx - 2, Q - bh); g.lineTo(bx + 35, Q - bh - 26); g.lineTo(bx + 72, Q - bh); g.fill();
    g.fillStyle = '#ffd890'; for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) if ((i + r + c) % 3) g.fillRect(bx + 12 + c * 30, Q - bh + 14 + r * 26, 12, 14); }
  g.fillStyle = '#6a6a70'; g.fillRect(x, Q, w, 10);
  // la marée géante : l'eau monte au-dessus du quai puis redescend (deux fois par jour, en accéléré)
  const tide = 0.5 - 0.5 * Math.cos(Math.min(u, 4.4) / 4.4 * Math.PI * 2);   // basse → haute → basse
  const wy = y + h * 0.95 - tide * h * 0.62;
  water(g, x, y, w, h, wy, t, 'rgba(30,70,100,0.92)', 'rgba(10,28,44,0.98)');
  // un bateau qui monte et descend avec l'eau
  g.fillStyle = '#e8e8e2'; g.beginPath(); g.moveTo(x + w * 0.62, wy - 4); g.lineTo(x + w * 0.62 + 90, wy - 4); g.lineTo(x + w * 0.62 + 76, wy + 12); g.lineTo(x + w * 0.62 + 12, wy + 12); g.fill(); g.fillRect(x + w * 0.62 + 40, wy - 60, 3, 56);
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText(tide > 0.5 ? 'marée haute : le port est noyé' : 'marée basse', x + w - 18, y + 60); g.textAlign = 'left';
}
function masse(g, x, y, w, h, u, t) {
  g.fillStyle = '#04060b'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 120, 9, 0.5);
  // à gauche : la Lune (et un minuscule éclat : 0,01 %) ; à droite : la balance
  const mx = x + 150, my = y + h * 0.5; g.fillStyle = '#c9c4b8'; g.beginPath(); g.arc(mx, my, 95, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(mx - 25, my - 20, 22, 0, 7); g.arc(mx + 30, my + 25, 16, 0, 7); g.fill();
  const k = sm(0.3, 1.6, u); g.fillStyle = '#e8e2d4'; g.beginPath(); g.arc(mx + 95 + 60 * k, my - 30 * k, 5, 0, 7); g.fill();
  g.font = "600 15px Inter"; g.fillStyle = '#dfe6ff'; g.fillText('0,01 % DE LA LUNE', mx + 70, my - 50);
  // les deux plateaux : l'éclat de Lune (lourd) contre l'astéroïde de 10 km (léger)
  const px = x + w * 0.66, py = y + h * 0.55, tilt = 0.32 * sm(1.4, 3.0, u);
  g.strokeStyle = '#c9cdd2'; g.lineWidth = 4; g.beginPath(); g.moveTo(px, py + 80); g.lineTo(px, py - 30); g.stroke();
  g.save(); g.translate(px, py - 30); g.rotate(-tilt);
  g.beginPath(); g.moveTo(-150, 0); g.lineTo(150, 0); g.stroke();
  g.fillStyle = '#e8e2d4'; g.beginPath(); g.arc(-150, 22, 22, 0, 7); g.fill(); g.fillStyle = '#8a7a6a'; g.beginPath(); g.arc(150, 26, 7, 0, 7); g.fill();
  g.restore();
  g.font = "600 14px Inter"; g.fillStyle = '#dfe6ff'; g.fillText('ÉCLAT DE LUNE', px - 210, py + 60); g.fillText('ASTÉROÏDE DES DINOSAURES', px + 40, py - 90);
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText('des milliers de fois plus lourd', x + w - 18, y + h - 18); g.textAlign = 'left';
}
export const INSETS = [
  { t0: 28.6, t1: 33.0, x: X, y: Y, w: W, h: H, label: 'UN PORT DE LA MANCHE', tag: 'cam', draw: port },
  { t0: 58.6, t1: 63.0, x: X, y: Y, w: W, h: H, label: 'LA BALANCE', tag: 'archive', draw: masse },
];

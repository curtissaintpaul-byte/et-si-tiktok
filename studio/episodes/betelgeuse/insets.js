// Vignettes de l'épisode Bételgeuse : sa taille à la place du Soleil ; la lumière partie au Moyen Âge
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 1330, W = 740, H = 400;

function size(g, x, y, w, h, u, t) {
  g.fillStyle = '#05070d'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 120, 3, 0.6);
  const cx = x + 60, cy = y + h * 0.62, AU = 112;   // 1 unité astronomique = 112 px
  const orb = [['Mercure', 0.39], ['Vénus', 0.72], ['Terre', 1.0], ['Mars', 1.52], ['Jupiter', 5.2]];
  g.lineWidth = 1.5; g.font = "600 15px Inter";
  orb.forEach(([n, a], i) => { g.strokeStyle = 'rgba(200,215,255,0.5)'; g.beginPath(); g.arc(cx, cy, a * AU, -1.0, 1.0); g.stroke();
    const px = cx + a * AU * Math.cos(-0.55 + i * 0.12), py = cy + a * AU * Math.sin(-0.55 + i * 0.12); g.fillStyle = ['#bbb', '#e8c98a', '#5fa0e8', '#d0643a', '#d8b48a'][i]; g.beginPath(); g.arc(px, py, i === 4 ? 6 : 3.5, 0, 7); g.fill();
    if (i >= 2) { g.fillStyle = '#dfe6ff'; g.fillText(n.toUpperCase(), px + 8, py - 6); } });
  // le Soleil, puis Bételgeuse qui grandit jusqu'à ~3,5 UA (≈ 760 fois le rayon du Soleil)
  const k = sm(0.4, 3.2, u), r = 6 + (3.5 * AU - 6) * k;
  const gr = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r); gr.addColorStop(0, 'rgba(255,190,110,0.95)'); gr.addColorStop(0.85, 'rgba(230,90,40,0.85)'); gr.addColorStop(1, 'rgba(200,60,30,0.0)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill();
  g.font = "500 32px Garamond"; g.fillStyle = '#ffd3a0'; g.textAlign = 'right'; g.fillText(k > 0.95 ? 'Mars engloutie' : `${Math.round(1 + 759 * k)} × le Soleil`, x + w - 18, y + h - 18); g.textAlign = 'left';
}
function medieval(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#0a0d1c'], [1, '#1d2238']]); g.fillRect(x, y, w, h); stars(g, x, y, w, h * 0.7, 140, 9, 0.7);
  // l'étoile (Orion, en haut) et la lumière qui part
  const sx = x + w * 0.72, sy = y + h * 0.22; g.fillStyle = '#ffb06a'; g.beginPath(); g.arc(sx, sy, 5, 0, 7); g.fill();
  const k = sm(0.3, 3.5, u); g.strokeStyle = 'rgba(255,190,120,0.35)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(sx, sy, 20 + i * 26 + k * 60, 0, 7); g.stroke(); }
  // un château médiéval en silhouette
  const G = y + h * 0.86; g.fillStyle = '#05060a'; g.fillRect(x, G, w, h);
  g.fillRect(x + w * 0.12, G - 80, w * 0.42, 80);
  for (const [fx, tw, th] of [[0.1, 0.07, 130], [0.26, 0.06, 110], [0.42, 0.06, 115], [0.52, 0.07, 140]]) { g.fillRect(x + w * fx, G - th, w * tw, th); g.beginPath(); g.moveTo(x + w * fx - 4, G - th); g.lineTo(x + w * (fx + tw / 2), G - th - 40); g.lineTo(x + w * (fx + tw) + 4, G - th); g.fill(); }
  for (let i = 0; i < 18; i++) g.fillRect(x + w * 0.12 + i * (w * 0.42 / 18), G - 92, w * 0.42 / 36, 12);
  g.fillStyle = '#ffcf7a'; g.fillRect(x + w * 0.29, G - 70, 6, 10); g.fillRect(x + w * 0.45, G - 60, 6, 10);
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText('il y a 550 à 700 ans', x + w - 18, y + h - 18); g.textAlign = 'left';
}
export const INSETS = [
  { t0: 8.6, t1: 13.0, x: X, y: Y, w: W, h: H, label: 'À LA PLACE DU SOLEIL', tag: 'archive', draw: size },
  { t0: 48.6, t1: 53.0, x: X, y: Y, w: W, h: H, label: 'QUAND SA LUMIÈRE EST PARTIE', tag: 'archive', draw: medieval },
];

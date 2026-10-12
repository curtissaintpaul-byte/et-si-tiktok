// Vignettes de l'épisode voyage dans le temps : les horloges des GPS ; le voyage à 99 % de c
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 60, Y = 1420, W = 640, H = 380;
function gps(g, x, y, w, h, u, t) {
  g.fillStyle = '#04060b'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 120, 38, 0.6);
  const cx = x + w * 0.38, cy = y + h * 0.56, R = 70;
  g.fillStyle = '#2f6fa8'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.strokeStyle = 'rgba(200,215,255,0.4)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, 200, 120, -0.2, 0, 7); g.stroke();
  const a = t * 0.6, sx = cx + 200 * Math.cos(a) * Math.cos(-0.2) - 120 * Math.sin(a) * Math.sin(-0.2), sy = cy + 200 * Math.cos(a) * Math.sin(-0.2) + 120 * Math.sin(a) * Math.cos(-0.2);
  g.fillStyle = '#d8dde4'; g.fillRect(sx - 6, sy - 6, 12, 12); g.fillStyle = '#3a5a9a'; g.fillRect(sx - 26, sy - 3, 18, 6); g.fillRect(sx + 8, sy - 3, 18, 6);
  // deux horloges : au sol / en orbite (l'écart grandit : +38 µs par jour)
  const days = 1 + Math.floor(sm(0.2, 4.0, u) * 9), d = days * 38;
  g.font = "600 16px Inter"; g.fillStyle = '#dfe6ff'; g.fillText(`JOUR ${days}`, x + w - 200, y + 80);
  g.fillText('SATELLITE', x + w - 200, y + 120); g.fillText('SOL', x + w - 200, y + 180);
  g.font = "500 28px Garamond"; g.fillStyle = '#ffd36b'; g.fillText(`+${d} µs`, x + w - 200, y + 150); g.fillStyle = '#fff'; g.fillText('0 µs', x + w - 200, y + 210);
  g.font = "500 28px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText(`sans correction : ${Math.round(d * 0.2998)} km d’erreur`, x + w - 16, y + h - 16); g.textAlign = 'left';
}
function twins(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#0a0d1c'], [1, '#1d2238']]); g.fillRect(x, y, w, h); stars(g, x, y, w, h, 120, 7, 0.6);
  const k = sm(0.2, 3.6, u);
  // deux calendriers : toi (vaisseau) et la Terre
  g.font = "600 17px Inter"; g.fillStyle = '#dfe6ff'; g.fillText('TOI, DANS LE VAISSEAU', x + 30, y + 90); g.fillText('SUR TERRE', x + w / 2 + 20, y + 90);
  g.font = "500 64px Garamond"; g.fillStyle = '#c9a6ff'; g.fillText(`${(k * 1).toFixed(1).replace('.', ',')} an`, x + 30, y + 170); g.fillStyle = '#ffd36b'; g.fillText(`${(k * 7.09).toFixed(1).replace('.', ',')} ans`, x + w / 2 + 20, y + 170);
  // le vaisseau qui file
  const px = x + 40 + (w - 120) * k, py = y + h - 90; g.strokeStyle = 'rgba(160,200,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 30, py); g.lineTo(px, py); g.stroke();
  g.fillStyle = '#e8eef8'; g.beginPath(); g.moveTo(px + 30, py); g.lineTo(px - 10, py - 10); g.lineTo(px - 10, py + 10); g.fill();
  g.font = "500 28px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText('à 99 % de la vitesse de la lumière', x + w - 16, y + h - 16); g.textAlign = 'left';
}
export const INSETS = [
  { t0: 21.8, t1: 26.0, x: X, y: Y, w: W, h: H, label: 'SATELLITES GPS', tag: 'archive', draw: gps },
  { t0: 26.4, t1: 31.0, x: X, y: Y, w: W, h: H, label: 'LE VOYAGE VERS LE FUTUR', tag: 'archive', draw: twins },
];

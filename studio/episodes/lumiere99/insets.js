// Vignette de l'épisode 99 % de c : la sonde Parker, l'engin humain le plus rapide
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 1330, W = 740, H = 400;
function parker(g, x, y, w, h, u, t) {
  g.fillStyle = '#04060b'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 120, 192, 0.5);
  // le Soleil, à gauche
  const sx = x - 120, sy = y + h * 0.55; const gr = g.createRadialGradient(sx, sy, 60, sx, sy, 300); gr.addColorStop(0, '#fff6d8'); gr.addColorStop(0.45, '#ffb84a'); gr.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, 300, 0, 7); g.fill();
  // la trajectoire et la sonde (bouclier thermique face au Soleil)
  const ex = x + 400, ER = 310, Er = 130;
  g.strokeStyle = 'rgba(200,215,255,0.4)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(ex, sy, ER, Er, 0, 0, 7); g.stroke();
  const a = Math.PI * (1.3 - 0.6 * sm(0, 4.6, u)), px = ex + ER * Math.cos(a), py = sy + Er * Math.sin(a);
  g.save(); g.translate(px, py); g.rotate(Math.atan2(sy - py, sx - px));
  g.fillStyle = '#e8e2d4'; g.fillRect(-4, -26, 8, 52); g.fillStyle = '#9aa4b0'; g.fillRect(-26, -10, 22, 20); g.fillStyle = '#3a5a9a'; g.fillRect(-34, -22, 8, 12); g.fillRect(-34, 10, 8, 12);
  g.restore();
  g.font = "500 34px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText('692 000 km/h · 0,064 % de c', x + w - 18, y + h - 18); g.textAlign = 'left';
}
export const INSETS = [{ t0: 54.2, t1: 58.8, x: X, y: Y, w: W, h: H, label: 'SONDE PARKER · NASA · 2024', tag: 'archive', draw: parker }];

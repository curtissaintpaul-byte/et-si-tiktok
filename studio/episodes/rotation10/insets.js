// Vignettes de l'épisode « Terre 10× plus vite » : les océans qui filent à l'équateur ; à 17×, l'apesanteur à l'équateur
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 640, W = 740, H = 400;

function globe(g, x, y, w, h, u, t, mode) {
  g.fillStyle = '#05070d'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 140, 5, 0.6);
  const cx = x + w * 0.4, cy = y + h * 0.54, R = 140;
  // la Terre (terres brunes), puis l'eau qui quitte les pôles pour s'entasser en bourrelet à l'équateur
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
  g.fillStyle = '#8a7a5a'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  const k = mode === 'eau' ? sm(0.3, 3.0, u) : 1;
  const band = R * (0.95 - 0.62 * k);   // demi-hauteur de la zone encore en eau
  g.fillStyle = '#2e6aa0'; g.fillRect(cx - R, cy - band, 2 * R, 2 * band);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(cx - 40, cy - 50, 60, 40, -0.5, 0, 7); g.fill();
  g.restore();
  // le bourrelet d'eau (exagéré) autour de l'équateur
  if (mode === 'eau') { g.fillStyle = 'rgba(46,106,170,0.95)'; g.beginPath(); g.ellipse(cx, cy, R + 22 * k, 6 + 34 * k, 0, 0, 7); g.fill(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(cx - R - 30, cy); g.lineTo(cx + R + 30, cy); g.stroke(); g.setLineDash([]);
  g.font = "600 15px Inter"; g.fillStyle = '#dfe6ff'; g.fillText('ÉQUATEUR', cx + R + 36, cy + 5);
  g.fillText('PÔLE NORD', cx - 40, cy - R - 12);
  if (mode === 'vol') {   // à 17× : un bonhomme à l'équateur ne pèse plus rien, il décolle
    const fy = cy - 0, fx = cx + R + 4 + 30 * sm(0.4, 3.5, u), lift = 30 * sm(0.4, 3.5, u);
    g.fillStyle = '#ffd36b'; g.fillRect(fx, fy - 26 - lift, 6, 20); g.beginPath(); g.arc(fx + 3, fy - 32 - lift, 5, 0, 7); g.fill();
    g.strokeStyle = '#ffd36b'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx + 14, fy - 20 - lift); g.lineTo(fx + 44, fy - 20 - lift); g.lineTo(fx + 36, fy - 26 - lift); g.moveTo(fx + 44, fy - 20 - lift); g.lineTo(fx + 36, fy - 14 - lift); g.stroke();
    // flèche de rotation
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(cx, cy - R - 2, 46, 12, 0, 0.2, Math.PI * 1.6); g.stroke();
  }
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right';
  g.fillText(mode === 'eau' ? 'les océans filent vers l’équateur' : 'à 17× : poids nul à l’équateur', x + w - 18, y + h - 18); g.textAlign = 'left';
}
export const INSETS = [
  { t0: 36.2, t1: 41.8, x: X, y: Y, w: W, h: H, label: 'LA TERRE VUE DE LOIN', tag: 'archive', draw: (g, x, y, w, h, u, t) => globe(g, x, y, w, h, u, t, 'eau') },
  { t0: 56.4, t1: 60.8, x: X, y: Y, w: W, h: H, label: 'À 17 FOIS PLUS VITE', tag: 'archive', draw: (g, x, y, w, h, u, t) => globe(g, x, y, w, h, u, t, 'vol') },
];

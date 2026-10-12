// Vignette de l'épisode anneaux : l'anneau de l'Ordovicien (hypothèse Tomkins et al., 2024)
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 1330, W = 740, H = 400;
function ordovicien(g, x, y, w, h, u, t) {
  g.fillStyle = '#04060b'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 150, 466, 0.6);
  const cx = x + w * 0.45, cy = y + h * 0.55, R = 120, tilt = -0.18;
  // arrière de l'anneau
  g.save(); g.translate(cx, cy); g.rotate(tilt);
  g.strokeStyle = 'rgba(230,215,185,0.55)'; g.lineWidth = 14; g.beginPath(); g.ellipse(0, 0, R * 2.0, R * 0.32, 0, Math.PI, 2 * Math.PI); g.stroke();
  // la Terre de l'Ordovicien : surtout de l'océan, un supercontinent au sud
  g.fillStyle = '#2e5f96'; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, 7); g.clip();
  g.fillStyle = '#9a8a62'; g.beginPath(); g.ellipse(-20, 70, 90, 50, 0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(50, -10, 28, 18, 0.2, 0, 7); g.fill(); g.beginPath(); g.ellipse(-60, -5, 22, 30, 0, 0, 7); g.fill();
  // les 21 cratères, tous dans une bande près de l'équateur (points rouges qui apparaissent)
  for (let i = 0; i < 21; i++) { const a = (i * 2.399) % (2 * Math.PI), xx = Math.cos(a) * R * 0.85, yy = Math.sin(i * 1.7) * R * 0.22; if (sm(0.3 + i * 0.1, 0.5 + i * 0.1, u) <= 0) continue; g.fillStyle = '#ff5a3a'; g.beginPath(); g.arc(xx, yy, 4, 0, 7); g.fill(); }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0); g.stroke(); g.setLineDash([]);
  // avant de l'anneau
  g.strokeStyle = 'rgba(240,225,195,0.85)'; g.lineWidth = 14; g.beginPath(); g.ellipse(0, 0, R * 2.0, R * 0.32, 0, 0, Math.PI); g.stroke();
  g.restore();
  g.font = "500 30px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText('21 cratères près de l’ancien équateur', x + w - 18, y + h - 18); g.textAlign = 'left';
}
export const INSETS = [{ t0: 48.4, t1: 63.8, x: X, y: Y, w: W, h: H, label: 'IL Y A 466 MILLIONS D’ANNÉES', tag: 'archive', draw: ordovicien }];

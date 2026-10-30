// Vignettes de l'épisode « Et si la Terre avait deux soleils ? » (temps de SCÈNE → realT les décale après les arrêts)
//  1) l'échelle de l'indice UV (1 à 11+, ministère de la Santé) : l'été dans le sud ~8/9, avec deux soleils ~16 (calcul : double)
//  2) Kepler-16b : une planète qui tourne autour de deux étoiles qui tournent l'une autour de l'autre (NASA, 2011)
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 720, W = 740, H = 330;

function uvScale(g, x, y, w, h, u) {
  const A0 = g.globalAlpha, ga = (v) => { g.globalAlpha = A0 * v; };
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#14161d'], [1, '#1d2029']]); g.fillRect(x, y, w, h);
  g.font = '800 26px Inter'; g.fillStyle = '#fff'; g.fillText('INDICE UV', x + 30, y + 52);
  const bx = x + 30, by = y + 110, bw = w - 60, bh = 46, n = 17;   // de 0 à 16
  const col = (i) => (i <= 2 ? '#4cd964' : i <= 5 ? '#ffd60a' : i <= 7 ? '#ff9f0a' : i <= 10 ? '#ff3b30' : '#b44dff');
  for (let i = 1; i < n; i++) {
    const cx = bx + (i - 1) * bw / (n - 1);
    ga(i <= 11 ? 1 : 0.35 + 0.65 * sm(1.2, 1.8, u)); g.fillStyle = i <= 11 ? col(i) : '#5c2a6e'; g.fillRect(cx + 1, by, bw / (n - 1) - 2, bh); ga(1);
    g.font = '700 18px Inter'; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText(i === 11 ? '11+' : String(i), cx + 8, by + bh + 26);
  }
  g.font = '600 17px Inter'; g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillText('fin de l’échelle officielle', bx + 10.4 * bw / (n - 1) - 60, by - 14);
  // les deux curseurs : l'été ici (8/9), puis deux soleils (16)
  const mark = (v, label, c, a) => { ga(a); const cx = bx + (v - 0.5) * bw / (n - 1); g.fillStyle = c; g.beginPath(); g.moveTo(cx, by + bh + 40); g.lineTo(cx - 14, by + bh + 64); g.lineTo(cx + 14, by + bh + 64); g.fill();
    g.font = '800 22px Inter'; g.fillText(label, Math.min(cx - 60, x + w - 230), by + bh + 94); ga(1); };
  mark(8.5, 'L’ÉTÉ ICI : 8 À 9', '#ff9f0a', sm(0.3, 0.7, u));
  mark(16, 'DEUX SOLEILS : ~16', '#ff3b30', sm(1.4, 1.9, u));
  g.font = '500 16px Inter'; g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillText('échelle de 1 à 11+ : ministère de la Santé (sante.fr) · deux soleils : calcul', x + 30, y + h - 16);
}

function kepler16(g, x, y, w, h, u) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#05070e'], [1, '#0d1222']]); g.fillRect(x, y, w, h);
  stars(g, x, y, w, h, 150, 16, 0.6);
  const cx = x + w / 2 - 40, cy = y + h / 2 + 10, th = u * 2.4;
  // l'orbite de la planète, autour des deux étoiles
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.setLineDash([8, 8]); g.beginPath(); g.ellipse(cx, cy, 230, 110, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  const ax = Math.cos(th) * 40, ay = Math.sin(th) * 18;
  const glow = (px, py, r, c) => { const gr = g.createRadialGradient(px, py, 0, px, py, r * 2.6); gr.addColorStop(0, c); gr.addColorStop(0.35, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px, py, r * 2.6, 0, 7); g.fill(); };
  glow(cx + ax, cy + ay, 22, 'rgba(255,190,110,1)');          // l'étoile A (orange, plus petite que le Soleil)
  glow(cx - ax * 3.4, cy - ay * 3.4, 10, 'rgba(255,110,80,1)'); // l'étoile B (une naine rouge)
  const pa = th * 0.35 + 1.0, px = cx + Math.cos(pa) * 230, py = cy + Math.sin(pa) * 110;
  g.fillStyle = '#c9b48f'; g.beginPath(); g.arc(px, py, 9, 0, 7); g.fill();
  g.font = '700 19px Inter'; g.fillStyle = '#fff'; g.fillText('KEPLER-16b', px + 14, py - 10);
  g.font = '800 26px Inter'; g.fillStyle = '#ffb340'; g.fillText('2 étoiles, 1 planète', x + 30, y + 46);
  g.font = '500 16px Inter'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText('annoncée en 2011 · mission Kepler (NASA) · à environ 245 années-lumière', x + 30, y + h - 16);
}

export function insetList(realT) {
  return [
    { t0: realT(23.1), t1: realT(26.5), x: X, y: Y, w: W, h: H, label: 'L’ÉCHELLE DES UV', tag: 'schema', draw: uvScale },
    { t0: realT(59.7), t1: realT(63.2), x: X, y: Y, w: W, h: H, label: 'EN VRAI · KEPLER-16', tag: 'schema', draw: kepler16 },
  ];
}

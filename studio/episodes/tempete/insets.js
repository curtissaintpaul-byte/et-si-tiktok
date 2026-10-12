// Vignettes de l'épisode tempête solaire : aurores à La Havane et à Hawaï (1859), télégraphe, Montréal (1989), la tempête ratée de 2012
import { grad, stars, aurora, rngFn } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const Y = 1340, H = 340;

function palm(g, x, G, s = 1) { g.fillStyle = '#05060a'; g.beginPath(); g.moveTo(x, G); g.quadraticCurveTo(x + 8 * s, G - 60 * s, x + 4 * s, G - 110 * s); g.lineTo(x + 9 * s, G - 110 * s); g.quadraticCurveTo(x + 14 * s, G - 60 * s, x + 6 * s, G); g.fill();
  for (let f = 0; f < 7; f++) { g.beginPath(); g.ellipse(x + 6 * s, G - 112 * s, 34 * s, 6 * s, -2.6 + f * 0.75, 0, 7); g.fill(); } }
function havane(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#120610'], [1, '#2a0a1a']]); g.fillRect(x, y, w, h); stars(g, x, y, w, h, 80, 11, 0.6); aurora(g, x, y, w, h, t, 0.1, 0.75, false);
  const G = y + h * 0.82; g.fillStyle = '#05060a'; g.fillRect(x, G, w, h);
  g.fillRect(x + w * 0.45, G - 70, w * 0.4, 70); for (let i = 0; i < 6; i++) { g.fillStyle = '#ffcf7a'; g.fillRect(x + w * 0.48 + i * w * 0.06, G - 50, 8, 16); } g.fillStyle = '#05060a';
  g.beginPath(); g.arc(x + w * 0.65, G - 70, 26, Math.PI, 0); g.fill();
  palm(g, x + w * 0.12, G, 1); palm(g, x + w * 0.3, G, 0.8);
}
function hawaii(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#100612'], [1, '#26081c']]); g.fillRect(x, y, w, h); stars(g, x, y, w, h, 80, 12, 0.6); aurora(g, x, y, w, h, t + 2, 0.15, 0.7, false);
  const G = y + h * 0.82; g.fillStyle = '#05060a'; g.beginPath(); g.moveTo(x, G); g.quadraticCurveTo(x + w * 0.5, G - 130, x + w, G - 20); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.fill();
  palm(g, x + w * 0.78, G + 10, 0.9);
  g.fillStyle = 'rgba(40,10,30,0.6)'; g.fillRect(x, G + 20, w, h);
}
function telegraphe(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#3a2a1a'], [1, '#1e140c']]); g.fillRect(x, y, w, h);
  const D = y + h * 0.66; g.fillStyle = '#6a4a2a'; g.fillRect(x, D, w, h);
  // le manipulateur en laiton, le ruban de papier, le fil
  g.fillStyle = '#b8902e'; g.fillRect(x + w * 0.3, D - 16, 160, 12); g.fillRect(x + w * 0.3 + 140, D - 40, 12, 30); g.beginPath(); g.arc(x + w * 0.3 + 146, D - 44, 12, 0, 7); g.fill();
  g.fillStyle = '#efe6cc'; g.fillRect(x + w * 0.62, D - 6, w * 0.36, 14); g.fillStyle = '#2a2018'; for (let i = 0; i < 14; i++) g.fillRect(x + w * 0.64 + i * 16, D - 2, (i % 3) ? 4 : 10, 4);
  g.strokeStyle = '#7a5a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w * 0.3, D - 10); g.quadraticCurveTo(x + w * 0.15, D - 120, x, y + 40); g.stroke();
  // les étincelles
  const r = rngFn(Math.floor(t * 18)); if (r() < 0.75) { g.strokeStyle = 'rgba(200,230,255,0.95)'; g.lineWidth = 2; let px = x + w * 0.3 + 146, py = D - 56; g.beginPath(); g.moveTo(px, py); for (let i = 0; i < 6; i++) { px += (r() - 0.3) * 30; py -= 10 + r() * 12; g.lineTo(px, py); } g.stroke();
    g.fillStyle = 'rgba(180,220,255,0.35)'; g.beginPath(); g.arc(x + w * 0.3 + 146, D - 56, 30, 0, 7); g.fill(); }
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(255,220,150,${r()})`; g.fillRect(x + w * 0.3 + 120 + (r() - 0.5) * 90, D - 50 - r() * 60, 2, 2); }
}
function montreal(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#060812'], [1, '#141a2c']]); g.fillRect(x, y, w, h); stars(g, x, y, w, h * 0.5, 100, 13, 0.6);
  const off = u > 1.2 + 0.5;   // tout s'éteint en une fraction de seconde
  const G = y + h * 0.9, r = rngFn(1989);
  for (let i = 0; i < 16; i++) { const bw = 30 + r() * 30, bh = 60 + r() * 170, bx = x + 10 + i * (w - 20) / 16; g.fillStyle = '#0a0c14'; g.fillRect(bx, G - bh, bw, bh);
    for (let fy = G - bh + 8; fy < G - 8; fy += 12) for (let fx = bx + 4; fx < bx + bw - 6; fx += 9) { const lit = r() < 0.55 && !(u > 1.2 + r() * 0.5); if (lit) { g.fillStyle = '#ffd890'; g.fillRect(fx, fy, 4, 5); } } }
  g.fillStyle = '#05060a'; g.fillRect(x, G, w, h);
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText(off ? 'plus de 9 h de panne' : '6 millions d’habitants', x + w - 18, y + h - 18); g.textAlign = 'left';
}
function rate2012(g, x, y, w, h, u, t) {
  g.fillStyle = '#04060b'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 120, 2012, 0.5);
  const sx = x + 60, sy = y + h * 0.55, R = 420;   // le Soleil à gauche, l'orbite de la Terre en arc
  const gr = g.createRadialGradient(sx, sy, 8, sx, sy, 60); gr.addColorStop(0, '#fff6d8'); gr.addColorStop(1, 'rgba(255,160,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, 60, 0, 7); g.fill();
  g.strokeStyle = 'rgba(200,215,255,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.arc(sx, sy, R, -0.45, 0.45); g.stroke();
  // la Terre avance sur son orbite ; l'éjection part vers l'endroit où elle était une semaine avant
  const ea = 0.05 + 0.12 * sm(0, 4.4, u), ca = -0.07;   // (1 semaine ≈ 7° d'orbite ; dessin exagéré ×2)
  const k = sm(0.3, 3.0, u); g.fillStyle = 'rgba(255,120,60,0.35)'; g.beginPath(); g.moveTo(sx, sy); g.arc(sx, sy, R * 1.12 * k + 20, ca - 0.09, ca + 0.09); g.closePath(); g.fill();
  g.fillStyle = '#5fa0e8'; g.beginPath(); g.arc(sx + R * Math.cos(ea), sy + R * Math.sin(ea), 9, 0, 7); g.fill();
  g.font = "600 15px Inter"; g.fillStyle = '#dfe6ff'; g.fillText('TERRE', sx + R * Math.cos(ea) + 14, sy + R * Math.sin(ea) + 5); g.fillText('ÉJECTION DU 23 JUILLET 2012', sx + 80, sy + R * Math.sin(ca) * 0.6 - 30);
  g.font = "500 32px Garamond"; g.fillStyle = '#ffe0a8'; g.textAlign = 'right'; g.fillText('ratée d’une semaine', x + w - 18, y + h - 18); g.textAlign = 'left';
}
export const INSETS = [
  { t0: 13.4, t1: 17.8, x: 50, y: Y, w: 480, h: H, label: 'LA HAVANE · 1859', tag: 'archive', draw: havane },
  { t0: 13.6, t1: 17.8, x: 550, y: Y, w: 480, h: H, label: 'HAWAÏ · 1859', tag: 'archive', draw: hawaii },
  { t0: 18.4, t1: 22.8, x: 170, y: Y, w: 740, h: H, label: 'TÉLÉGRAPHE · 1859', tag: 'archive', draw: telegraphe },
  { t0: 38.4, t1: 42.8, x: 170, y: Y, w: 740, h: H, label: 'MONTRÉAL · 13 MARS 1989', tag: 'archive', draw: montreal },
  { t0: 58.4, t1: 62.8, x: 170, y: Y, w: 740, h: H, label: 'VU DE L’ESPACE', tag: 'archive', draw: rate2012 },
];

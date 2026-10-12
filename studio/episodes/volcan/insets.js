// Vignettes « archives » de l'épisode volcan : Parícutin (1943), l'aéroport (2010), les moutons du Laki (1783)
import { grad, rngFn } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 1330, W = 740, H = 400;

function paricutin(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#c9b38a'], [1, '#e6d4ae']]); g.fillRect(x, y, w, h);   // ciel sépia
  const G = y + h * 0.78;
  // le champ de maïs (rangs)
  g.fillStyle = '#8a7a52'; g.fillRect(x, G, w, h);
  for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(70,60,35,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + w / 2 + (i - 15) * 6, G); g.lineTo(x + w / 2 + (i - 15) * 60, y + h); g.stroke(); }
  // le cône qui pousse : 0 → 50 m en une journée (échelle : 50 m ≈ 40 % de la hauteur)
  const k = sm(0.3, 4.0, u), ch = h * 0.42 * k, cw = ch * 2.6 + 6;
  g.fillStyle = '#4a3a2a'; g.beginPath(); g.moveTo(x + w * 0.55 - cw / 2, G); g.lineTo(x + w * 0.55 - 8, G - ch); g.lineTo(x + w * 0.55 + 8, G - ch); g.lineTo(x + w * 0.55 + cw / 2, G); g.fill();
  // panache de fumée
  for (let i = 0; i < 9; i++) { const r = 10 + i * 9 * (0.5 + k), yy = G - ch - i * 22 * (0.4 + k) - 10; g.fillStyle = `rgba(80,70,60,${0.5 - i * 0.045})`; g.beginPath(); g.arc(x + w * 0.55 + Math.sin(i + t) * 6 + i * 6, yy, r, 0, 7); g.fill(); }
  // un paysan qui regarde (silhouette)
  g.fillStyle = '#2a2018'; g.fillRect(x + w * 0.16, G - 34, 9, 30); g.beginPath(); g.arc(x + w * 0.16 + 4.5, G - 40, 6, 0, 7); g.fill(); g.fillRect(x + w * 0.16 - 8, G - 47, 25, 4);
  // grain d'archive
  const r = rngFn(Math.floor(t * 24)); g.fillStyle = 'rgba(60,40,20,0.25)'; for (let i = 0; i < 160; i++) g.fillRect(x + r() * w, y + r() * h, 1.5, 1.5);
  g.font = "500 34px Garamond"; g.fillStyle = '#2a2018'; g.fillText(`+${Math.round(50 * k)} m`, x + w * 0.62, G - ch - 8);
}
function airport(g, x, y, w, h, u, t) {
  g.fillStyle = '#0f1216'; g.fillRect(x, y, w, h);
  g.font = "600 22px Inter"; g.fillStyle = '#ffd36b'; g.fillText('DÉPARTS', x + 24, y + 70);
  const dest = ['LONDRES', 'NEW YORK', 'MADRID', 'ROME', 'BERLIN', 'TOKYO', 'MONTRÉAL', 'DUBLIN'];
  dest.forEach((d, i) => { const yy = y + 108 + i * 34; g.fillStyle = '#e8e2d4'; g.font = "500 22px Inter"; g.fillText(`${String(10 + i).padStart(2, '0')}:${i % 2 ? '35' : '05'}   ${d}`, x + 24, yy);
    const on = u > 0.3 + i * 0.25; g.fillStyle = on ? ((Math.floor(t * 2) + i) % 2 ? '#ff4d3d' : '#ff6b5e') : '#7fd87f'; g.fillText(on ? 'ANNULÉ' : 'À L’HEURE', x + w - 190, yy); });
  const n = Math.round(100000 * sm(0.3, 4.0, u)); g.font = "500 40px Garamond"; g.fillStyle = '#ff6b5e'; g.textAlign = 'right'; g.fillText(`${n.toLocaleString('fr-FR').replace(/ /g, ' ')} vols annulés`, x + w - 20, y + h - 18); g.textAlign = 'left';
}
function laki(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#a8a07a'], [1, '#cfc49a']]); g.fillRect(x, y, w, h);   // brume sèche jaunâtre (fluor, soufre)
  const G = y + h * 0.7; g.fillStyle = '#6f6a52'; g.fillRect(x, G, w, h);
  g.fillStyle = 'rgba(255,120,40,0.7)'; g.fillRect(x + w * 0.1, G - 6, w * 0.5, 4);   // la fissure du Laki au loin
  for (let i = 0; i < 10; i++) {
    const sx = x + 50 + i * (w - 100) / 9, sy = G + 40 + (i % 3) * 22, dead = i < 8, k = dead ? sm(0.4 + i * 0.3, 1.0 + i * 0.3, u) : 0;
    g.save(); g.translate(sx, sy); g.rotate(k * Math.PI / 2 * (i % 2 ? 1 : -1) * 0.95); g.globalAlpha *= 1 - 0.45 * k;
    g.fillStyle = '#efe9dc'; g.beginPath(); g.ellipse(0, -14, 22, 13, 0, 0, 7); g.fill(); g.fillStyle = '#2a2622'; g.beginPath(); g.ellipse(22, -18, 8, 6, 0, 0, 7); g.fill();
    g.fillRect(-14, -4, 3, 12); g.fillRect(10, -4, 3, 12); g.restore();
  }
  const r = rngFn(Math.floor(t * 24)); g.fillStyle = 'rgba(60,50,20,0.22)'; for (let i = 0; i < 160; i++) g.fillRect(x + r() * w, y + r() * h, 1.5, 1.5);
  g.font = "500 36px Garamond"; g.fillStyle = '#2a2018'; g.textAlign = 'right'; g.fillText(`${Math.round(80 * sm(0.4, 3.4, u))} % des moutons`, x + w - 20, y + 60); g.textAlign = 'left';
}
export const INSETS = [
  { t0: 28.4, t1: 32.8, x: X, y: Y, w: W, h: H, label: 'PARÍCUTIN · MEXIQUE · 1943', tag: 'archive', draw: paricutin },
  { t0: 43.4, t1: 47.8, x: X, y: Y, w: W, h: H, label: 'AÉROPORT · AVRIL 2010', tag: 'cam', draw: airport },
  { t0: 53.4, t1: 57.8, x: X, y: Y, w: W, h: H, label: 'ISLANDE · LAKI · 1783', tag: 'archive', draw: laki },
];

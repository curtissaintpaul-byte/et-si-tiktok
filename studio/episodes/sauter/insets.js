// Vignettes de l'épisode « Et si tout le monde sautait en même temps ? » (temps de SCÈNE → realT les décale après les arrêts)
//  1) le tableau des départs de Roissy : 8,2 milliards ÷ 107 millions de passagers par an (Groupe ADP, 2025) = 77 ans
//  2) la Seine à Paris : 328 m³/s (Banque Hydro) = 28,3 milliards de litres par jour ; il en faudrait 16,4 milliards (58 %)
//  3) le sismogramme de Seattle, juillet 2023 : magnitude 2,3 (J. Caplan-Auerbach, Western Washington University)
import { grad, rngFn } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 470, W = 740, H = 330;   // en haut, sur le ciel (en bas, ça cacherait Manon et les sous-titres)

function board(g, x, y, w, h, u, t) {
  g.fillStyle = '#10141c'; g.fillRect(x, y, w, h);
  g.font = '800 22px Inter'; g.fillStyle = '#ffd34d'; g.fillText('DÉPARTS · DEPARTURES', x + 26, y + 78);
  const rows = [['14:05', 'NEW YORK', 'COMPLET'], ['14:10', 'TOKYO', 'COMPLET'], ['14:20', 'LAGOS', 'COMPLET'], ['14:25', 'SÃO PAULO', 'COMPLET']];
  g.font = '600 22px Inter';
  rows.forEach(([hh, city, st], i) => { const yy = y + 118 + i * 34, on = sm(0.2 + i * 0.25, 0.4 + i * 0.25, u);
    g.globalAlpha = on; g.fillStyle = '#e8e8e8'; g.fillText(hh, x + 26, yy); g.fillText(city, x + 120, yy); g.fillStyle = '#ff5a4f'; g.fillText(st, x + 300, yy); g.globalAlpha = 1; });
  const bx = x + 450;
  g.font = '600 19px Inter'; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText('8,2 milliards de passagers', bx, y + 120); g.fillText('÷ 107 millions par an', bx, y + 150);
  g.font = '800 54px Inter'; g.fillStyle = '#ffd34d'; g.globalAlpha = sm(1.2, 1.6, u); g.fillText('= 77 ans', bx, y + 220); g.globalAlpha = 1;
  g.font = '500 17px Inter'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText('Roissy + Orly, trafic 2025', bx, y + 262);
}

function seine(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#8fb3cc'], [0.45, '#d9cdb4'], [0.46, '#b7a98f'], [1, '#a29479']]); g.fillRect(x, y, w, h);
  // les quais et l'eau qui coule
  const wy = y + h * 0.55; g.fillStyle = '#3f6a80'; g.fillRect(x, wy, w, h * 0.3);
  g.strokeStyle = 'rgba(220,240,255,0.35)'; g.lineWidth = 2;
  for (let i = 0; i < 18; i++) { const xx = x + ((i * 61 + t * 70) % (w + 80)) - 40, yy = wy + 10 + (i * 13) % (h * 0.26); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 30, yy); g.stroke(); }
  g.fillStyle = '#cfc2a6'; g.fillRect(x, wy - 8, w, 8); g.fillRect(x, wy + h * 0.3, w, 10);
  // la jauge : ce qu'il faudrait boire, comparé à toute la Seine
  const gx = x + 30, gy = y + 66, gw = w - 60, k = sm(0.3, 1.5, u);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(gx, gy, gw, 34); g.fillStyle = '#64d2ff'; g.fillRect(gx, gy, gw * 0.58 * k, 34);
  g.font = '800 22px Inter'; g.fillStyle = '#fff'; g.fillText(`${Math.round(58 * k)} %`, gx + 12, gy + 25);
  g.font = '600 19px Inter'; g.fillStyle = '#10202c'; g.fillText('16,4 milliards de litres à boire par jour', gx, gy + 70); g.fillText('la Seine : 28 milliards de litres par jour', gx, gy + 98);
}

function seismo(g, x, y, w, h, u, t) {
  g.fillStyle = '#f2efe6'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(80,100,140,0.18)'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(x, y + 40 + i * 32); g.lineTo(x + w, y + 40 + i * 32); g.stroke(); }
  const r = rngFn(7), n = 300, cy = y + h * 0.56, shown = Math.floor(n * sm(0, 2.6, u));
  g.strokeStyle = '#1d2a44'; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < shown; i++) { const p = i / n, burst = Math.exp(-Math.pow((p - 0.55) / 0.16, 2)); const a = (4 + 95 * burst) * (r() - 0.5) * 2;
    const xx = x + 20 + p * (w - 40); i ? g.lineTo(xx, cy + a) : g.moveTo(xx, cy + a); }
  g.stroke();
  g.font = '800 26px Inter'; g.fillStyle = '#b3261e'; g.globalAlpha = sm(1.6, 2.0, u); g.fillText('≈ MAGNITUDE 2,3', x + w - 280, y + 82); g.globalAlpha = 1;
}

export function insetList(realT) {
  return [
    { t0: realT(39.2), t1: realT(43.0), x: X, y: Y, w: W, h: H, label: 'CALCUL · ROISSY ET ORLY', tag: 'schema', draw: board },
    { t0: realT(43.2), t1: realT(47.0), x: X, y: Y, w: W, h: H, label: 'LA SEINE À PARIS · 328 m³/s', tag: 'schema', draw: seine },
    { t0: realT(66.6), t1: realT(74.2), x: X, y: Y, w: W, h: H, label: 'SEATTLE · LUMEN FIELD · JUILLET 2023', tag: 'archive', caption: 'concerts de Taylor Swift', captionColor: '#3a2a1a', draw: seismo },
  ];
}

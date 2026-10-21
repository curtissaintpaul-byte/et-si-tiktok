// Vignettes de l'épisode « Et si on éteignait toutes les lumières de France ? » (temps de SCÈNE → realT les décale après les arrêts)
//  1) un panneau d'entrée de commune générique : « extinction de l'éclairage public de 1 h à 5 h » (12 000 communes, ANPCEN 2019)
//  2) 10 silhouettes d'Européens : 6 sur 10 ne voient plus la Voie lactée (Falchi et al., Science Advances 2016)
import { grad, rngFn, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 470, W = 740, H = 330;   // en haut, sur le ciel

function sign(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#0b1020'], [1, '#1b2030']]); g.fillRect(x, y, w, h);
  stars(g, x, y, w, h * 0.6, 160, 4, 0.8);
  g.fillStyle = '#1a1d22'; g.fillRect(x + w / 2 - 6, y + 200, 12, h - 200);   // le poteau
  const sx = x + 150, sy = y + 70, sw = w - 300, sh = 140;
  g.fillStyle = '#f4f1e8'; g.beginPath(); g.roundRect(sx, sy, sw, sh, 10); g.fill();
  g.strokeStyle = '#c62828'; g.lineWidth = 10; g.beginPath(); g.roundRect(sx + 9, sy + 9, sw - 18, sh - 18, 6); g.stroke();
  g.fillStyle = '#1b1b1b'; g.textAlign = 'center';
  g.font = '800 30px Inter'; g.fillText('VOTRE COMMUNE', sx + sw / 2, sy + 52);
  g.font = '600 22px Inter'; g.fillText('éteint l’éclairage public', sx + sw / 2, sy + 86); g.fillText('de 1 h à 5 h', sx + sw / 2, sy + 114);
  g.textAlign = 'left';
  g.font = '800 44px Inter'; g.fillStyle = '#ffd34d'; g.globalAlpha = sm(0.6, 1.0, u); g.fillText('12 000 communes', x + 30, y + h - 26); g.globalAlpha = 1;
}

function europe(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#0d1222'], [1, '#191e2c']]); g.fillRect(x, y, w, h);
  const n = 10, gap = (w - 80) / n;
  for (let i = 0; i < n; i++) {
    const cx = x + 40 + gap * (i + 0.5), by = y + 220, on = sm(0.15 + i * 0.09, 0.3 + i * 0.09, u), red = i < 6;
    g.globalAlpha = 0.35 + 0.65 * on; g.fillStyle = red ? '#ff6b5a' : '#9fd3ff';
    g.beginPath(); g.arc(cx, by - 92, 17, 0, 7); g.fill();
    g.beginPath(); g.roundRect(cx - 22, by - 70, 44, 70, 14); g.fill();
    g.globalAlpha = 1;
  }
  g.font = '600 20px Inter'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillText('6 Européens sur 10 ne voient plus la Voie lactée', x + 30, y + 270);
  g.font = '500 17px Inter'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText('Falchi et al., Science Advances, 2016', x + 30, y + 300);
}

export function insetList(realT) {
  return [
    { t0: realT(58.4), t1: realT(61.8), x: X, y: Y, w: W, h: H, label: 'EN VRAI · ANPCEN 2019', tag: 'archive', draw: sign },
    { t0: realT(62.0), t1: realT(65.6), x: X, y: Y, w: W, h: H, label: 'ATLAS MONDIAL DE LA POLLUTION LUMINEUSE', tag: 'schema', draw: europe },
  ];
}

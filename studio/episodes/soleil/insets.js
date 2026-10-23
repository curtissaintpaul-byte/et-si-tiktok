// Vignettes de l'épisode « Et si le Soleil s'éteignait ? » (temps de SCÈNE → realT les décale après les arrêts)
//  1) le trajet de la lumière : Soleil → Jupiter (43 min) → Terre (35 à 52 min) : au moins 78 min (calcul, distances en UA)
//  2) l'océan en coupe : de la glace en surface, de l'eau liquide dessous (Caltech : le fond ne gèle qu'après ~1 000 ans)
//  3) archive 1816 : les écarts de température de l'été à Genève (juin −3,2 °C, juillet −5,4 °C, août −4,7 °C, MétéoSuisse)
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 720, W = 740, H = 330;

function lightPath(g, x, y, w, h, u) {
  const A0 = g.globalAlpha, ga = (v) => { g.globalAlpha = A0 * v; };
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#070a14'], [1, '#121626']]); g.fillRect(x, y, w, h);
  stars(g, x, y, w, h, 140, 9, 0.7);
  const S = [x + 70, y + 170], J = [x + w - 110, y + 110], E = [x + 300, y + 250];
  // le Soleil éteint (gris), Jupiter, la Terre
  g.fillStyle = '#3a3a40'; g.beginPath(); g.arc(S[0], S[1], 34, 0, 7); g.fill();
  g.fillStyle = '#d9b98c'; g.beginPath(); g.arc(J[0], J[1], 20, 0, 7); g.fill();
  g.fillStyle = '#5fa0e0'; g.beginPath(); g.arc(E[0], E[1], 11, 0, 7); g.fill();
  // la dernière lumière : un trait qui avance de S à J, puis de J à E
  const k1 = sm(0.2, 1.4, u), k2 = sm(1.4, 2.6, u);
  g.strokeStyle = '#ffd34d'; g.lineWidth = 4; g.setLineDash([12, 9]);
  g.beginPath(); g.moveTo(S[0], S[1]); g.lineTo(S[0] + (J[0] - S[0]) * k1, S[1] + (J[1] - S[1]) * k1); g.stroke();
  if (k2 > 0) { g.beginPath(); g.moveTo(J[0], J[1]); g.lineTo(J[0] + (E[0] - J[0]) * k2, J[1] + (E[1] - J[1]) * k2); g.stroke(); }
  g.setLineDash([]);
  g.font = '600 20px Inter'; g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText('SOLEIL', S[0] - 34, S[1] + 62); g.fillText('JUPITER', J[0] - 40, J[1] + 48); g.fillText('TERRE', E[0] - 30, E[1] + 38);
  g.font = '800 26px Inter'; g.fillStyle = '#ffd34d';
  ga(sm(0.6, 1.0, u)); g.fillText('43 min', (S[0] + J[0]) / 2 - 40, (S[1] + J[1]) / 2 - 16);
  ga(sm(1.8, 2.2, u)); g.fillText('+ 35 à 52 min', (J[0] + E[0]) / 2 - 10, (J[1] + E[1]) / 2 + 44); ga(1);
}

function ocean(g, x, y, w, h, u) {
  const A0 = g.globalAlpha, ga = (v) => { g.globalAlpha = A0 * v; };
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#05070c'], [0.25, '#0b1220'], [1, '#081a2a']]); g.fillRect(x, y, w, h);
  const sy = y + 90, ice = 26 * sm(0.1, 1.2, u);
  g.fillStyle = grad(g, 0, sy, 0, y + h, [[0, '#1f5b7a'], [1, '#0a2436']]); g.fillRect(x, sy, w, h - 90);
  g.fillStyle = '#dfeaf2'; g.fillRect(x, sy - 4, w, ice + 4);
  for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(160,190,210,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 30 + i * 52, sy); g.lineTo(x + 44 + i * 52, sy + ice); g.stroke(); }
  g.font = '800 24px Inter'; g.fillStyle = '#0d2233'; ga(sm(0.6, 1.0, u)); g.fillText('GLACE', x + 30, sy + 21); ga(1);
  g.font = '800 28px Inter'; g.fillStyle = '#9fd3ff'; ga(sm(1.0, 1.5, u)); g.fillText('EAU LIQUIDE', x + 30, sy + 120);
  g.font = '500 20px Inter'; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText('le fond ne gèlerait qu’après environ 1 000 ans', x + 30, sy + 156);
  g.font = '500 17px Inter'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText('D. Stevenson, Caltech', x + 30, y + h - 18); ga(1);
}

function summer1816(g, x, y, w, h, u) {
  const A0 = g.globalAlpha, ga = (v) => { g.globalAlpha = A0 * v; };
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#2b2418'], [1, '#1b170f']]); g.fillRect(x, y, w, h);
  g.font = 'italic 40px Garamond'; g.fillStyle = '#f1e2c0'; g.fillText('1816, l’année sans été', x + 30, y + 78);
  const bars = [['JUIN', -3.2], ['JUILLET', -5.4], ['AOÛT', -4.7]], y0 = y + 120;
  bars.forEach(([m, v], i) => {
    const k = sm(0.3 + i * 0.3, 0.8 + i * 0.3, u), bw = (-v / 5.4) * 420 * k, by = y0 + i * 52;
    g.font = '700 20px Inter'; g.fillStyle = 'rgba(241,226,192,0.85)'; g.fillText(m, x + 30, by + 26);
    g.fillStyle = '#64d2ff'; g.fillRect(x + 150, by + 6, bw, 28);
    ga(k); g.font = '800 24px Inter'; g.fillStyle = '#fff'; g.fillText(`${String(v).replace('.', ',').replace('-', '−')} °C`, x + 162 + bw, by + 29); ga(1);
  });
  g.font = '500 17px Inter'; g.fillStyle = 'rgba(241,226,192,0.65)'; g.fillText('Genève, écart à la normale · après l’éruption du Tambora (avril 1815) · MétéoSuisse', x + 30, y + h - 18);
}

export function insetList(realT) {
  return [
    { t0: realT(30.8), t1: realT(34.2), x: X, y: Y, w: W, h: H, label: 'LE TRAJET DE LA LUMIÈRE', tag: 'schema', draw: lightPath },
    { t0: realT(53.9), t1: realT(57.6), x: X, y: Y, w: W, h: H, label: 'L’OCÉAN, EN COUPE', tag: 'schema', draw: ocean },
    { t0: realT(67.1), t1: realT(70.8), x: X, y: Y, w: W, h: H, label: 'EN VRAI · ARCHIVES MÉTÉO', tag: 'archive', draw: summer1816 },
  ];
}

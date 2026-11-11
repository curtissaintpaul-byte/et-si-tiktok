// Vignettes de l'épisode « Et si la Lune disparaissait ? » (temps de SCÈNE → realT les décale après les arrêts)
//  1) les animaux de nuit : avec la Lune, la souris se cache et la chouette la repère ; sans elle, chacun est perdu
//     (Prugh & Golden, Journal of Animal Ecology, 2014 : près de 60 études sur la Lune et le comportement animal)
//  2) l'axe de la Terre : 23,4° aujourd'hui ; sans la Lune, il pourrait varier fortement (Matt Siegler, NASA JPL)
import { grad, stars } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 1450, W = 740, H = 340;

function owl(g, x, y, s, a = 1) {
  g.globalAlpha = a; g.fillStyle = '#6b5236';
  g.beginPath(); g.ellipse(x, y, 22 * s, 32 * s, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(x, y - 34 * s, 19 * s, 16 * s, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(x - 16 * s, y - 44 * s); g.lineTo(x - 10 * s, y - 58 * s); g.lineTo(x - 4 * s, y - 46 * s); g.fill();
  g.beginPath(); g.moveTo(x + 16 * s, y - 44 * s); g.lineTo(x + 10 * s, y - 58 * s); g.lineTo(x + 4 * s, y - 46 * s); g.fill();
  g.fillStyle = '#ffd34d'; for (const d of [-8, 8]) { g.beginPath(); g.arc(x + d * s, y - 36 * s, 5 * s, 0, 7); g.fill(); }
  g.fillStyle = '#111'; for (const d of [-8, 8]) { g.beginPath(); g.arc(x + d * s, y - 36 * s, 2.2 * s, 0, 7); g.fill(); }
  g.globalAlpha = 1;
}
function mouse(g, x, y, s, a = 1) {
  g.globalAlpha = a; g.fillStyle = '#9a8f84';
  g.beginPath(); g.ellipse(x, y, 13 * s, 8 * s, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + 12 * s, y - 3 * s, 6 * s, 0, 7); g.fill();
  g.strokeStyle = '#9a8f84'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 12 * s, y); g.quadraticCurveTo(x - 26 * s, y - 8 * s, x - 32 * s, y + 2 * s); g.stroke();
  g.globalAlpha = 1;
}
function animals(g, x, y, w, h, u, t) {
  const hw = w / 2;
  // à gauche : avec la Lune
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#1b2648'], [1, '#2e3a5a']]); g.fillRect(x, y, hw, h); stars(g, x, y, hw, h * 0.5, 40, 3, 0.5);
  g.fillStyle = '#e9e6dc'; g.beginPath(); g.arc(x + hw - 60, y + 70, 26, 0, 7); g.fill();
  g.fillStyle = '#3a4a3a'; g.fillRect(x, y + h - 60, hw, 60);
  g.fillStyle = '#2a3a2c'; g.beginPath(); g.ellipse(x + 230, y + h - 62, 70, 40, 0, Math.PI, 0); g.fill();   // le buisson
  owl(g, x + 90, y + 170, 1.1); mouse(g, x + 210, y + h - 66, 1, 0.9);
  // à droite : sans la Lune
  g.fillStyle = '#05060a'; g.fillRect(x + hw, y, hw, h); stars(g, x + hw, y, hw, h * 0.6, 120, 8, 0.7);
  g.fillStyle = '#111712'; g.fillRect(x + hw, y + h - 60, hw, 60);
  owl(g, x + hw + 90, y + 170, 1.1, 0.35); mouse(g, x + hw + 230 + 30 * Math.sin(t * 2), y + h - 66, 1, 0.35);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + hw, y); g.lineTo(x + hw, y + h); g.stroke();
  g.font = '700 22px Inter'; g.fillStyle = '#fff'; g.fillText('AVEC LA LUNE', x + 20, y + h - 22); g.fillText('SANS LA LUNE', x + hw + 20, y + h - 22);
  g.font = '500 28px Garamond'; g.fillStyle = '#ffe0a8'; g.textAlign = 'right';
  g.globalAlpha = sm(0.5, 1.0, u); g.fillText('la chasse et les cachettes changent', x + w - 16, y + 44); g.textAlign = 'left'; g.globalAlpha = 1;
}
function axis(g, x, y, w, h, u, t) {
  g.fillStyle = '#04060b'; g.fillRect(x, y, w, h); stars(g, x, y, w, h, 140, 12, 0.5);
  const draw = (cx, cy, deg, label, col) => {
    const a = deg * Math.PI / 180;
    g.fillStyle = grad(g, cx - 60, cy - 60, cx + 60, cy + 60, [[0, '#3f7bd6'], [1, '#173e7a']]); g.beginPath(); g.arc(cx, cy, 70, 0, 7); g.fill();
    g.fillStyle = 'rgba(80,160,90,0.8)'; g.beginPath(); g.ellipse(cx - 15, cy - 10, 26, 18, 0.4, 0, 7); g.ellipse(cx + 25, cy + 20, 18, 12, -0.3, 0, 7); g.fill();
    g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - Math.sin(a) * 105, cy + Math.cos(a) * 105); g.lineTo(cx + Math.sin(a) * 105, cy - Math.cos(a) * 105); g.stroke();
    g.setLineDash([6, 6]); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy + 110); g.lineTo(cx, cy - 110); g.stroke(); g.setLineDash([]);
    g.font = '700 20px Inter'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(label, cx, y + h - 18); g.textAlign = 'left';
  };
  draw(x + 190, y + h / 2 - 10, 23.4, 'AUJOURD’HUI : 23,4°', '#ffd34d');
  const wob = 23.4 + 40 * Math.sin(u * 1.4) * sm(0.3, 1.2, u);
  draw(x + w - 190, y + h / 2 - 10, wob, 'SANS LA LUNE : ?', '#ff3b30');
  g.font = '500 28px Garamond'; g.fillStyle = '#ffe0a8'; g.textAlign = 'center'; g.fillText('des saisons extrêmes… ou presque plus', x + w / 2, y + 40); g.textAlign = 'left';
}
export function insetList(realT) {
  return [
    { t0: realT(51.6), t1: realT(55.2), x: X, y: Y, w: W, h: H, label: 'LES ANIMAUX DE NUIT', tag: 'schema', draw: animals },
    { t0: realT(55.6), t1: realT(59.4), x: X, y: Y, w: W, h: H, label: 'L’AXE DE LA TERRE', tag: 'schema', draw: axis },
  ];
}

// Vignette « archive » de l'épisode atmosphère : la chambre à vide de la NASA, 14 décembre 1966 (Jim LeBlanc)
import { grad, rngFn } from '../../lib-insets.js';
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const X = 170, Y = 1400, W = 740, H = 330;

function chamber(g, x, y, w, h, u, t) {
  g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#cbb894'], [1, '#e2d3b2']]); g.fillRect(x, y, w, h);   // fond sépia
  const cx = x + w * 0.5, cy = y + h * 0.52, R = h * 0.36;
  // la chambre à vide : un grand cylindre avec un hublot
  g.fillStyle = '#7d705c'; g.fillRect(cx - R * 1.9, cy - R, R * 3.8, R * 2); g.beginPath(); g.ellipse(cx + R * 1.9, cy, R * 0.35, R, 0, 0, 7); g.fill();
  g.fillStyle = '#5d523f'; g.beginPath(); g.ellipse(cx - R * 1.9, cy, R * 0.35, R, 0, 0, 7); g.fill();
  for (let i = -3; i <= 3; i++) { g.fillStyle = 'rgba(40,30,20,0.35)'; g.fillRect(cx + i * R * 0.55 - 2, cy - R, 4, R * 2); }
  // le hublot, et dedans la combinaison
  g.fillStyle = '#2a241c'; g.beginPath(); g.arc(cx, cy, R * 0.62, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, R * 0.56, 0, 7); g.clip();
  g.fillStyle = '#3a3226'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  const fall = sm(1.2, 2.4, u), ang = fall * 1.2;
  g.translate(cx, cy + R * 0.5); g.rotate(ang);
  g.fillStyle = '#e8e0cc'; g.fillRect(-R * 0.13, -R * 0.75, R * 0.26, R * 0.5); g.beginPath(); g.arc(0, -R * 0.88, R * 0.16, 0, 7); g.fill();   // casque et buste
  g.fillRect(-R * 0.12, -R * 0.28, R * 0.1, R * 0.32); g.fillRect(R * 0.02, -R * 0.28, R * 0.1, R * 0.32);                                  // jambes
  g.restore();
  g.strokeStyle = '#bfb39a'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R * 0.6, 0, 7); g.stroke();
  // le manomètre : l'aiguille tombe vers le vide
  const mx = x + w * 0.86, my = y + h * 0.3, mr = h * 0.12;
  g.fillStyle = '#efe7d4'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill(); g.strokeStyle = '#3a3226'; g.lineWidth = 3; g.stroke();
  const a = -2.4 + 4.0 * (1 - sm(0.2, 1.2, u)); g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + Math.cos(a - 1.57) * mr * 0.85, my + Math.sin(a - 1.57) * mr * 0.85); g.strokeStyle = '#a02818'; g.stroke();
  // grain d'archive
  const r = rngFn(Math.floor(t * 24)); g.fillStyle = 'rgba(60,40,20,0.25)'; for (let i = 0; i < 160; i++) g.fillRect(x + r() * w, y + r() * h, 1.5, 1.5);
}

export const INSETS = [
  // (temps vidéo : la vignette suit les sous-titres sur LeBlanc ; les arrêts sur image durent 10,4 s au total)
  { t0: 52.0 + 10.4, t1: 59.4 + 10.4, x: X, y: Y, w: W, h: H, label: 'NASA · CHAMBRE À VIDE · 1966', tag: 'archive', caption: 'il s’en sort avec mal aux oreilles', captionColor: '#3a2a1a', draw: chamber },
];

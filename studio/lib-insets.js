// =====================================================================
//  VIGNETTES (réutilisable) : de petites « caméras » ou « archives » dessinées en 2D par-dessus l'image,
//  pour montrer ce dont parle le sous-titre (une autre ville, une date, un schéma).
//  const ins = makeInsets();  puis à chaque image : ins.draw(t, [ { t0, t1, x, y, w, h, label, tag, draw(g, x, y, w, h, u, t) } ])
//  u = secondes depuis l'apparition de la vignette. Rien n'est dessiné en dehors de [t0, t1].
// =====================================================================
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

export function makeInsets() {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  c.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(c);
  const g = c.getContext('2d');
  return {
    g,
    draw(t, list) {
      g.clearRect(0, 0, 1080, 1920);
      for (const it of list) {
        if (t < it.t0 - 0.25 || t > it.t1 + 0.3) continue;
        const a = sm(it.t0 - 0.25, it.t0 + 0.15, t) * (1 - sm(it.t1 - 0.1, it.t1 + 0.3, t));
        const pop = 0.92 + 0.08 * sm(it.t0 - 0.25, it.t0 + 0.2, t);
        const { x, y, w, h } = it;
        g.save(); g.globalAlpha = a; g.translate(x + w / 2, y + h / 2); g.scale(pop, pop); g.translate(-(x + w / 2), -(y + h / 2));
        g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24; g.fillStyle = '#000'; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); g.shadowBlur = 0;
        g.save(); g.beginPath(); g.roundRect(x, y, w, h, 14); g.clip();
        it.draw(g, x, y, w, h, t - it.t0, t);
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.beginPath(); g.roundRect(x, y, w, h, 14); g.stroke();
        if (it.label) {
          g.font = "600 19px Inter"; const tw = g.measureText(it.label).width;
          g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 10, y + 10, tw + 44, 30);
          g.fillStyle = it.tag === 'archive' ? '#ffd36b' : '#ff3b30'; g.beginPath(); g.arc(x + 26, y + 25, 6, 0, 7); g.fill();
          g.fillStyle = '#fff'; g.fillText(it.label, x + 40, y + 32);
        }
        if (it.caption) { g.font = "500 34px Garamond"; g.fillStyle = it.captionColor || '#ffe0a8'; g.textAlign = 'right'; g.fillText(it.caption, x + w - 16, y + h - 16); g.textAlign = 'left'; }
        g.restore();
      }
    },
  };
}

// petits outils de dessin
export const grad = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
export function rngFn(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** des étoiles fixes dans un rectangle */
export function stars(g, x, y, w, h, n, seed = 1, alpha = 0.9) { const r = rngFn(seed); g.fillStyle = `rgba(255,255,255,${alpha})`; for (let i = 0; i < n; i++) { const s = r() < 0.1 ? 2 : 1; g.fillRect(x + r() * w, y + r() * h, s, s); } }
/** rideaux d'aurore (rouge en haut, vert en bas) */
export function aurora(g, x, y, w, h, t, top = 0.15, bot = 0.6, green = true) {   // green = false : aurore rouge (basses latitudes)
  for (let i = 0; i < 40; i++) { const xx = x + (i / 40) * w + 6 * Math.sin(i * 0.7 + t); const hh = h * (bot - top) * (0.6 + 0.4 * Math.sin(i * 1.3 + t * 0.8));
    const gr = g.createLinearGradient(0, y + h * bot - hh, 0, y + h * bot); gr.addColorStop(0, 'rgba(255,40,80,0)'); gr.addColorStop(0.4, 'rgba(255,50,90,0.35)'); gr.addColorStop(0.85, green ? 'rgba(60,255,140,0.55)' : 'rgba(255,70,90,0.5)'); gr.addColorStop(1, green ? 'rgba(60,255,140,0)' : 'rgba(255,70,90,0)');
    g.fillStyle = gr; g.fillRect(xx, y + h * bot - hh, w / 40 + 2, hh); }
}
/** l'eau (vagues) à partir de la hauteur wy */
export function water(g, x, y, w, h, wy, t, c0 = 'rgba(46,106,134,0.95)', c1 = 'rgba(22,58,80,0.98)') {
  g.fillStyle = grad(g, 0, wy, 0, y + h, [[0, c0], [1, c1]]);
  g.beginPath(); g.moveTo(x, y + h); for (let xx = 0; xx <= w; xx += 6) g.lineTo(x + xx, wy + 2.2 * Math.sin(xx * 0.06 + t * 4) + 1.4 * Math.sin(xx * 0.17 - t * 3)); g.lineTo(x + w, y + h); g.fill();
}

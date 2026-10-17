// =====================================================================
//  LA CARTE DES MOBILISATIONS D'AILLEURS (calque 2D, vidéo « Merci ») : le monde en bleu nuit, la caméra zoome doucement
//  sur l'endroit, le pays s'allume, la foule apparaît en petits points lumineux autour d'une épingle qui pulse.
//  Pays : Natural Earth 1:110m (data/world.json, déjà projeté : W = 1000, latitudes 84 → -58).
//
//  const MAP = await makeMapLayer('data/world.json');
//  MAP.draw(ctx, { lon, lat, country, zoom, place, dots }, k, t)   → sur un canvas 1080 × 1920 (k : 0 → 1 dans le plan)
// =====================================================================
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rand = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

export async function makeMapLayer(url = 'data/world.json') {
  const data = await (await fetch(url)).json();
  const { W, H } = data, LAT0 = 84, LAT1 = -58;
  const P = (lon, lat) => [(lon + 180) / 360 * W, (LAT0 - lat) / (LAT0 - LAT1) * H];
  const paths = data.countries.map((c) => { const p = new Path2D();
    for (const r of c.rings) for (let i = 0; i < r.length; i += 2) { const jump = i > 0 && Math.abs(r[i] - r[i - 2]) > 300; if (i === 0 || jump) p.moveTo(r[i], r[i + 1]); else p.lineTo(r[i], r[i + 1]); }
    return { name: c.name, p }; });
  const dotsCache = {};
  function draw(g, m, k, t) {
    const [cx, cy] = P(m.lon, m.lat), z = m.zoom * (0.82 + 0.18 * sm(0, 1, k)), s = 1.08 * z, X = 540, Y = 820;
    const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, '#060a12'); bg.addColorStop(1, '#0c1626'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
    g.save(); g.translate(X, Y); g.scale(s, s); g.translate(-cx, -cy);
    g.lineJoin = 'round'; g.lineWidth = 1.1 / s;
    for (const c of paths) { const hot = c.name === m.country; g.fillStyle = hot ? `rgba(255,207,107,${0.18 + 0.2 * sm(0.05, 0.35, k)})` : '#18263a'; g.fill(c.p); g.strokeStyle = hot ? 'rgba(255,207,107,0.9)' : '#2d4260'; g.stroke(c.p); }
    g.restore();
    // la foule : des points chauds qui apparaissent autour de l'épingle (plus serrés au centre)
    const key = m.place, N = m.dots || 700;
    if (!dotsCache[key]) { const r = rand(97 + key.length * 13), a = []; for (let i = 0; i < N; i++) { const u = Math.max(1e-6, r()), rad = Math.sqrt(-2 * Math.log(u)) * (m.spread || 34), th = r() * Math.PI * 2; a.push([Math.cos(th) * rad, Math.sin(th) * rad * 0.8, r(), 1.6 + r() * 2.2]); } dotsCache[key] = a; }
    const show = sm(0.08, 0.6, k) * N;
    g.globalCompositeOperation = 'lighter';
    dotsCache[key].forEach(([dx, dy, ph, sz], i) => { if (i > show) return; const a = 0.5 + 0.5 * Math.sin(t * 3 + ph * 20); g.fillStyle = `rgba(255,${200 + 40 * ph | 0},${120 + 60 * ph | 0},${0.35 + 0.45 * a})`; g.beginPath(); g.arc(X + dx, Y + dy, sz, 0, 7); g.fill(); });
    g.globalCompositeOperation = 'source-over';
    // l'épingle et ses ondes
    for (let i = 0; i < 3; i++) { const ph = ((t * 0.8 + i / 3) % 1); g.strokeStyle = `rgba(255,207,107,${0.7 * (1 - ph)})`; g.lineWidth = 4; g.beginPath(); g.arc(X, Y, 20 + ph * 150, 0, 7); g.stroke(); }
    g.fillStyle = '#ffcf6b'; g.beginPath(); g.arc(X, Y, 13, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(X, Y, 5, 0, 7); g.fill();
    // le nom de l'endroit
    const a = sm(0.05, 0.25, k); g.globalAlpha = a; g.textAlign = 'center';
    g.font = '800 64px Inter'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 18; g.fillText(m.place, X, Y - 175);
    g.font = '600 26px Inter'; g.fillStyle = 'rgba(255,207,107,0.95)'; g.fillText(m.sub || '', X, Y - 132);
    g.shadowBlur = 0; g.globalAlpha = 1; g.textAlign = 'left';
  }
  return { draw };
}

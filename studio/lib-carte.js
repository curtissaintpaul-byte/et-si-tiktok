// =====================================================================
//  LA CARTE DU MONDE (calque 2D) — pour « Et si Internet s'arrêtait partout sur Terre ? » (v2)
//  Les pays (contours simplifiés, Natural Earth 1:110m via world-atlas, domaine public / ISC), les grandes villes et
//  les « autoroutes » d'Internet entre elles (des arcs lumineux). Le calque sait faire plusieurs scènes :
//   - 'extinction' : les liaisons s'éteignent une à une, les villes aussi (le compteur des gens en ligne tombe) ;
//   - 'accuse'     : des flèches rouges entre les grandes puissances (« c'est eux ! »), les armées en alerte ;
//   - 'intranet'   : seules la Russie et la Chine rallument un réseau, à l'intérieur de leurs frontières ;
//   - 'coree'      : zoom sur les deux Corées (au nord, presque rien ne change ; au sud, tout s'arrête) ;
//   - 'tonga'      : zoom sur le Pacifique, le câble Tonga–Fidji coupé en 2022.
//
//  const MAP = await makeWorldMap('data/world.json');
//  MAP.draw(ctx, mode, k, t)   → dessine sur un canvas 1080 × 1920 (k : 0 → 1 dans le plan, t : le temps)
// =====================================================================
const CITIES = {
  paris: [2.35, 48.86], londres: [-0.13, 51.5], francfort: [8.68, 50.11], madrid: [-3.7, 40.42], moscou: [37.62, 55.75], spb: [30.3, 59.94], ekat: [60.6, 56.84], novo: [82.9, 55.0],
  newyork: [-74.0, 40.71], chicago: [-87.6, 41.88], la: [-118.24, 34.05], miami: [-80.19, 25.76], mexico: [-99.13, 19.43], saopaulo: [-46.63, -23.55], buenos: [-58.38, -34.6],
  lagos: [3.38, 6.52], caire: [31.24, 30.04], johannesburg: [28.05, -26.2], nairobi: [36.82, -1.29], dubai: [55.27, 25.2], mumbai: [72.88, 19.08], delhi: [77.2, 28.6],
  singapour: [103.82, 1.35], hongkong: [114.17, 22.32], pekin: [116.4, 39.9], shanghai: [121.47, 31.23], shenzhen: [114.06, 22.54], chengdu: [104.07, 30.67], wuhan: [114.3, 30.6],
  tokyo: [139.69, 35.69], seoul: [126.98, 37.57], pyongyang: [125.76, 39.03], sydney: [151.21, -33.87], istanbul: [28.98, 41.01], tonga: [-175.2, -21.14], fidji: [178.44, -18.14],
};
const LINKS = [['paris', 'londres'], ['paris', 'francfort'], ['londres', 'newyork'], ['paris', 'newyork'], ['madrid', 'saopaulo'], ['londres', 'francfort'], ['francfort', 'moscou'], ['paris', 'madrid'],
  ['newyork', 'chicago'], ['chicago', 'la'], ['newyork', 'miami'], ['miami', 'saopaulo'], ['la', 'tokyo'], ['la', 'sydney'], ['la', 'hongkong'], ['mexico', 'la'], ['saopaulo', 'buenos'],
  ['saopaulo', 'lagos'], ['lagos', 'londres'], ['caire', 'paris'], ['caire', 'dubai'], ['johannesburg', 'nairobi'], ['nairobi', 'dubai'], ['johannesburg', 'londres'], ['dubai', 'mumbai'],
  ['mumbai', 'singapour'], ['delhi', 'mumbai'], ['singapour', 'hongkong'], ['hongkong', 'tokyo'], ['shanghai', 'tokyo'], ['pekin', 'seoul'], ['seoul', 'tokyo'], ['singapour', 'sydney'],
  ['istanbul', 'francfort'], ['istanbul', 'dubai'], ['moscou', 'istanbul'], ['pekin', 'moscou'], ['hongkong', 'shanghai'], ['shanghai', 'la'], ['tokyo', 'sydney'], ['francfort', 'dubai'], ['mumbai', 'londres']];
const RU = [['moscou', 'spb'], ['moscou', 'ekat'], ['ekat', 'novo'], ['spb', 'ekat']], CN = [['pekin', 'shanghai'], ['shanghai', 'shenzhen'], ['pekin', 'chengdu'], ['chengdu', 'wuhan'], ['wuhan', 'shanghai'], ['wuhan', 'shenzhen'], ['pekin', 'wuhan']];
const HASH = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000; };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function makeWorldMap(url = 'data/world.json') {
  const data = await (await fetch(url)).json();
  const { W, H } = data, LAT0 = 84, LAT1 = -58;
  const P = (lon, lat) => [(lon + 180) / 360 * W, (LAT0 - lat) / (LAT0 - LAT1) * H];
  // les contours (en coupant les traits qui traversent la ligne de changement de date)
  const paths = data.countries.map((c) => { const p = new Path2D(); for (const r of c.rings) { for (let i = 0; i < r.length; i += 2) { const jump = i > 0 && Math.abs(r[i] - r[i - 2]) > 300; if (i === 0 || jump) p.moveTo(r[i], r[i + 1]); else p.lineTo(r[i], r[i + 1]); } p.closePath(); } return { id: c.id, name: c.name, p }; });
  const byName = (n) => paths.find((c) => c.name === n);
  const C = Object.fromEntries(Object.entries(CITIES).map(([k, [lon, lat]]) => [k, P(lon, lat)]));
  const VIEWS = { monde: [P(12, 22)[0], P(12, 22)[1], 1.5], accuse: [W * 0.55, H * 0.4, 1.25], intranet: [W * 0.72, H * 0.33, 2.0], coree: [P(127.5, 38)[0], P(127.5, 38)[1], 9.0], tonga: [P(-178, -24)[0], P(-178, -24)[1], 4.5] };
  const arc = (g, a, b, bend = 0.18) => { const [x1, y1] = a, [x2, y2] = b; let dx = x2 - x1; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.abs(dx) * bend; g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, x2, y2); };
  const arrow = (g, a, b, k, col) => {   // une flèche courbe qui se dessine (k : 0 → 1)
    const [x1, y1] = a, [x2, y2] = b, mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.35; const n = 30, m = Math.max(1, Math.floor(n * k));
    const Bz = (s) => [(1 - s) * (1 - s) * x1 + 2 * (1 - s) * s * mx + s * s * x2, (1 - s) * (1 - s) * y1 + 2 * (1 - s) * s * my + s * s * y2];
    g.strokeStyle = col; g.lineWidth = 3.2; g.beginPath(); for (let i = 0; i <= m; i++) { const [x, y] = Bz(i / n); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    if (k > 0.95) { const [xa, ya] = Bz(0.94), [xb, yb] = Bz(1), ang = Math.atan2(yb - ya, xb - xa); g.fillStyle = col; g.beginPath(); g.moveTo(xb, yb); g.lineTo(xb - 12 * Math.cos(ang - 0.45), yb - 12 * Math.sin(ang - 0.45)); g.lineTo(xb - 12 * Math.cos(ang + 0.45), yb - 12 * Math.sin(ang + 0.45)); g.closePath(); g.fill(); }
  };
  function draw(g, mode, k, t) {
    g.save(); g.fillStyle = '#04070d'; g.fillRect(0, 0, 1080, 1920);
    // la vue (centre, zoom) ; la carte occupe une bande au milieu de l'écran
    const v = VIEWS[mode === 'extinction' ? 'monde' : mode] || VIEWS.monde, vz = mode === 'coree' || mode === 'tonga' ? v[2] * (0.85 + 0.15 * sm(0, 1, k)) : v[2], sc = 1080 / W * vz;
    g.translate(540, 820); g.scale(sc, sc); g.translate(-v[0], -v[1]);
    const lw = 1 / sc;
    // la mer (une grille discrète), les pays
    g.strokeStyle = 'rgba(80,120,170,0.08)'; g.lineWidth = lw; for (let x = 0; x <= W; x += W / 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y <= H; y += H / 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (const off of mode === 'tonga' ? [0, -W] : [0]) for (const c of paths) {
      if (off) { g.save(); g.translate(off, 0); }
      let fill = '#172131';
      if (mode === 'intranet' && (c.name === 'Russia' || c.name === 'China')) fill = `rgba(40,90,140,${0.6 + 0.3 * sm(0, 0.4, k)})`;
      if (mode === 'coree' && c.name === 'North Korea') fill = '#2c5a3c';
      if (mode === 'coree' && c.name === 'South Korea') fill = '#3a1e22';
      if (mode === 'accuse' && ['United States of America', 'China', 'Russia'].includes(c.name)) fill = `rgba(${90 + 60 * (0.5 + 0.5 * Math.sin(t * 6))},30,34,0.95)`;
      g.fillStyle = fill; g.fill(c.p); g.strokeStyle = '#2b3b52'; g.lineWidth = 0.6 * lw; g.stroke(c.p);
      if (off) g.restore();
    }
    // les liaisons et les villes
    const on = (name) => (mode === 'extinction' ? 1 - sm(0.12 + 0.55 * HASH(name), 0.18 + 0.55 * HASH(name), k) : 0);
    g.lineCap = 'round';
    for (const [a, b] of LINKS) { const s = on(a + b); if (s <= 0.01) continue; g.strokeStyle = `rgba(110,210,255,${0.75 * s})`; g.lineWidth = 2.4 * lw * (1 + (1 - s) * 2); g.beginPath(); arc(g, C[a], C[b]); g.stroke(); }
    const local = mode === 'intranet' ? sm(0.15, 0.5, k) : 0;
    if (local > 0) for (const [a, b] of [...RU, ...CN]) { g.strokeStyle = `rgba(120,220,255,${0.9 * local})`; g.lineWidth = 2.6 * lw; g.beginPath(); arc(g, C[a], C[b], 0.1); g.stroke(); }
    for (const [name, [x, y]] of Object.entries(C)) {
      let s = mode === 'extinction' ? on(name) : 0;
      if (mode === 'intranet' && ['moscou', 'spb', 'ekat', 'novo', 'pekin', 'shanghai', 'shenzhen', 'chengdu', 'wuhan'].includes(name)) s = local;
      if (mode === 'coree' && name === 'pyongyang') s = 0.25;
      const r = 3.2 * lw;
      g.fillStyle = s > 0.02 ? `rgba(180,235,255,${0.3 + 0.7 * s})` : 'rgba(120,130,150,0.35)'; g.beginPath(); g.arc(x, y, r * (s > 0.02 ? 1.3 : 0.9), 0, 7); g.fill();
    }
    // les flèches des accusations
    if (mode === 'accuse') {
      const A = [['newyork', 'pekin', 0.05], ['pekin', 'chicago', 0.25], ['moscou', 'newyork', 0.42], ['paris', 'moscou', 0.58]];
      for (const [a, b, d] of A) arrow(g, C[a], C[b], sm(d, d + 0.25, k), 'rgba(255,90,79,0.95)');
    }
    // le câble Tonga–Fidji (coupé)
    if (mode === 'tonga') {
      const [tx, ty] = C.tonga, fx = C.fidji[0] - W, fy = C.fidji[1];   // (les Fidji sont de l'autre côté de la ligne de changement de date)
      g.strokeStyle = 'rgba(110,210,255,0.8)'; g.lineWidth = 2 * lw; g.setLineDash([6 * lw, 4 * lw]); g.beginPath(); g.moveTo(tx, ty); g.lineTo(fx, fy); g.stroke(); g.setLineDash([]);
      const mx = (tx + fx) / 2, my = (ty + fy) / 2, s2 = 6 * lw * sm(0.25, 0.4, k);
      g.strokeStyle = '#ff5a4f'; g.lineWidth = 3 * lw; g.beginPath(); g.moveTo(mx - s2, my - s2); g.lineTo(mx + s2, my + s2); g.moveTo(mx + s2, my - s2); g.lineTo(mx - s2, my + s2); g.stroke();
      g.fillStyle = '#ffcf7a'; g.beginPath(); g.arc(tx, ty, 4 * lw, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(fx, fy, 3 * lw, 0, 7); g.fill();
      const vx = tx + 1.2, vy = ty - 0.5, pr = (0.5 + 0.5 * Math.sin(t * 5)) * 8 * lw;   // le volcan (Hunga Tonga), qui pulse
      g.strokeStyle = `rgba(255,120,60,${0.8})`; g.lineWidth = 2 * lw; g.beginPath(); g.arc(vx - 2.4, vy + 0.1, 3 * lw + pr, 0, 7); g.stroke();
    }
    g.restore();
    // les étiquettes (à l'échelle de l'écran)
    const scr = (lon, lat) => { const [x, y] = P(lon, lat); return [540 + (x - v[0]) * sc, 820 + (y - v[1]) * sc]; };
    const label = (txt, x, y, col = '#fff', size = 30, a = 1) => { if (a <= 0) return; g.globalAlpha = a; g.font = `800 ${size}px Inter`; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(txt, x, y); g.fillStyle = col; g.fillText(txt, x, y); g.globalAlpha = 1; g.textAlign = 'left'; };
    if (mode === 'accuse') { const a = sm(0.7, 0.9, k); label('« C’EST EUX ! »', 540, 560, '#ff5a4f', 44, a); label('ARMÉES EN ALERTE', 540, 1180, '#ffcf7a', 34, sm(0.8, 0.95, k) * (0.6 + 0.4 * Math.sin(t * 6))); }
    if (mode === 'intranet') { const [rx, ry] = scr(70, 63), [cx, cy] = scr(103, 33); label('RUSSIE', rx, ry, '#9fd8ff', 30, local); label('RÉSEAU NATIONAL', rx, ry + 36, '#9fd8ff', 22, local); label('CHINE', cx, cy, '#9fd8ff', 30, local); label('RÉSEAU NATIONAL', cx, cy + 36, '#9fd8ff', 22, local); label('LE RESTE DU MONDE : RIEN', 540, 1260, '#ff8a7a', 30, sm(0.5, 0.7, k)); }
    if (mode === 'coree') { const [nx, ny] = scr(127, 40.4), [sx, sy] = scr(128, 36.2); label('CORÉE DU NORD', nx, ny, '#9fe0b0', 30, sm(0.1, 0.3, k)); label('presque rien ne change', nx, ny + 34, '#9fe0b0', 22, sm(0.1, 0.3, k)); label('CORÉE DU SUD', sx, sy + 20, '#ff8a7a', 30, sm(0.45, 0.6, k)); label('tout s’arrête', sx, sy + 54, '#ff8a7a', 22, sm(0.45, 0.6, k)); }
    if (mode === 'tonga') { const [tx, ty] = scr(-175.2, -21.14); label('TONGA', tx, ty + 50, '#ffcf7a', 34, sm(0.05, 0.2, k)); label('JANVIER 2022 : 5 SEMAINES', tx, ty + 88, '#fff', 24, sm(0.3, 0.45, k)); label('SANS INTERNET', tx, ty + 120, '#fff', 24, sm(0.3, 0.45, k)); label('LE CÂBLE VERS LES FIDJI, COUPÉ', 540, 520, '#9fd8ff', 26, sm(0.4, 0.55, k)); }
  }
  return { draw, P, C };
}

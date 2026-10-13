// =====================================================================
//  ARRÊT SUR IMAGE (réutilisable) : l'image se fige et se désature, puis des étiquettes s'accrochent au corps du
//  personnage, une par une (couleur = niveau de risque, comme les fiches de crash-test). Puis l'action repart.
//
//  Deux horloges :
//    - le temps de la SCÈNE (ts) : celui où tu écris l'action (décor, personnages, compteurs, partition T) ;
//    - le temps de la VIDÉO (t) : ts + la durée des arrêts déjà passés. Les sous-titres et l'écran de fin vivent dans t.
//
//  const FZ = makeFreeze([
//    { at: 31.0, dur: 4.6, title: 'ARRÊT SUR IMAGE · TON CORPS',
//      tags: [ { at: () => J.head.getWorldPosition(new THREE.Vector3()), title: 'COU', lines: ['ta tête pèse', '32 kg'], risk: 'grave', side: 'right' }, … ] },
//  ]);
//  T.duration = <durée de la scène> + FZ.total ;                 // la vidéo est plus longue que la scène
//  SUBS écrits en temps de scène → FZ.subs(SUBS) les décale ;       HUD.end(t, FZ.realT(T.endCard), …)
//  Dans update(t) :  const ts = FZ.sceneT(t);  … tout le décor et les compteurs avec ts …  HUD.subs(t, SUBS_V);  FZ.draw(t, camera);
//  Pour la bande-son : events() renvoie FZ.events() → [{ t, dur }] (temps vidéo), à passer à freeze_sfx() de snd.py.
//  Le zoom de la caméra fixe pendant l'arrêt : zoomView(camera, cx, cy, z, k) (cx, cy : le point visé en pixels 720×1280).
// =====================================================================
export const RISK = { ok: '#4cd964', bof: '#ffd60a', mal: '#ff9f0a', grave: '#ff3b30', info: '#64d2ff' };   // info : un fait neutre (pas un risque)
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const SUB_BAND = [1140, 1300];   // la bande des sous-titres : on n'y pose jamais d'étiquette

/** zoom numérique de la caméra fixe : on resserre le cadre autour de (cx, cy) ; k = 0 → image entière, k = 1 → zoom ×z.
 *  Le centre du cadre glisse du milieu de l'image vers le point visé (et pas depuis le coin en haut à gauche). */
export function zoomView(camera, cx, cy, z, k, W = 720, H = 1280) {
  const zz = 1 + (z - 1) * k, w = W / zz, h = H / zz;
  const mx = W / 2 + (cx - W / 2) * k, my = H / 2 + (cy + 0.05 * h - H / 2) * k;
  camera.setViewOffset(W, H, Math.min(W - w, Math.max(0, mx - w / 2)), Math.min(H - h, Math.max(0, my - h / 2)), w, h);
}

export function makeFreeze(FREEZES) {
  const list = [...FREEZES].sort((a, b) => a.at - b.at);
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  c.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(c);
  const g = c.getContext('2d'), gl = document.getElementById('c');
  const total = list.reduce((s, f) => s + f.dur, 0);

  /** temps de scène → temps de vidéo */
  const realT = (ts) => { let off = 0; for (const f of list) { if (ts > f.at) off += f.dur; else break; } return ts + off; };
  /** temps de vidéo → temps de scène (figé pendant un arrêt) */
  const sceneT = (t) => { let off = 0; for (const f of list) { const s = f.at + off; if (t < s) break; if (t < s + f.dur) return f.at; off += f.dur; } return t - off; };
  /** l'arrêt en cours à l'instant vidéo t (et depuis combien de temps) */
  const active = (t) => { let off = 0; for (const f of list) { const s = f.at + off; if (t >= s && t < s + f.dur) return { f, u: t - s }; off += f.dur; } return null; };

  function tag(px, py, T, a) {
    const col = RISK[T.risk] || RISK.mal;
    g.font = 'italic 34px Garamond';
    const w = Math.max(...T.lines.map((l) => g.measureText(l).width), 180) + 36, h = 50 + T.lines.length * 38;
    let bx = T.side === 'left' ? px - 120 - w : px + 120;
    bx = Math.min(1080 - 24 - w, Math.max(24, bx));
    let by = py - 50 + (T.dy || 0);
    if (by < SUB_BAND[1] && by + h > SUB_BAND[0]) by = py < (SUB_BAND[0] + SUB_BAND[1]) / 2 ? SUB_BAND[0] - h - 10 : SUB_BAND[1] + 10;
    by = Math.min(1920 - 40 - h, Math.max(120, by));
    g.globalAlpha = a;
    const ex = bx > px ? bx : bx + w;
    g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(px, py); g.lineTo(ex, by + 40); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(px, py, 8, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(8,10,16,0.84)'; g.beginPath(); g.roundRect(bx, by, w, h, 10); g.fill();
    g.fillStyle = col; g.fillRect(bx > px ? bx : bx + w - 6, by, 6, h);
    g.font = '800 19px Inter'; g.fillStyle = col; g.fillText(T.title, bx + 18, by + 32);
    g.font = 'italic 34px Garamond'; g.fillStyle = '#f1ede4'; T.lines.forEach((l, i) => g.fillText(l, bx + 18, by + 72 + i * 38));
    g.globalAlpha = 1;
  }

  function draw(t, camera, base = '') {   // base : un filtre permanent de l'image (ex. « archives » sépia), gardé pendant l'arrêt
    g.clearRect(0, 0, 1080, 1920);
    const A = active(t);
    // (on cache aussi le calque : sinon Chrome peut garder à l'écran la dernière image dessinée, même après clearRect)
    if (!A) { gl.style.filter = base || 'none'; c.style.visibility = 'hidden'; return; }
    c.style.visibility = 'visible';
    const { f, u } = A, k = sm(0, 0.15, u) * (1 - sm(f.dur - 0.25, f.dur, u));
    gl.style.filter = `${base} saturate(${1 - 0.45 * k}) brightness(${1 - 0.05 * k})`;
    if (u < 0.14) { g.fillStyle = `rgba(255,255,255,${0.8 * (1 - u / 0.14)})`; g.fillRect(0, 0, 1080, 1920); }   // le « clac »
    // où sont les points du corps à l'écran
    const pts = f.tags.map((T) => { const p = T.at().clone().project(camera); return [(p.x * 0.5 + 0.5) * 1080, (-p.y * 0.5 + 0.5) * 1920, p.z < 1]; });
    const vis = pts.filter((p) => p[2]);
    if (vis.length) {   // le viseur autour du personnage
      const m = 70, x0 = Math.min(...vis.map((p) => p[0])) - m, x1 = Math.max(...vis.map((p) => p[0])) + m, y0 = Math.min(...vis.map((p) => p[1])) - m, y1 = Math.max(...vis.map((p) => p[1])) + m * 2;
      g.globalAlpha = k; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4; const L = 34;
      [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); });
      // le bandeau
      const title = f.title || 'ARRÊT SUR IMAGE · TON CORPS';
      g.font = '800 24px Inter'; const tw = g.measureText(title).width + 76;
      let bx = Math.min(1080 - 24 - tw, Math.max(24, (x0 + x1) / 2 - tw / 2)), by = y0 - 76;
      if (by < SUB_BAND[1] && by + 52 > SUB_BAND[0]) by = SUB_BAND[1] + 6;
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.roundRect(bx, by, tw, 52, 10); g.fill();
      g.fillStyle = '#fff'; g.fillRect(bx + 24, by + 14, 8, 24); g.fillRect(bx + 38, by + 14, 8, 24); g.fillText(title, bx + 60, by + 36);
      g.globalAlpha = 1;
    }
    // les étiquettes, une par une
    f.tags.forEach((T, i) => { const p = pts[i]; if (!p[2]) return; const t0 = (T.delay ?? 0.5 + i * 0.8); const a = sm(t0, t0 + 0.25, u) * (1 - sm(f.dur - 0.25, f.dur, u)); if (a > 0) tag(p[0], p[1], T, a); });
  }

  return {
    total, realT, sceneT, active, draw,
    subs: (SUBS) => SUBS.map(([a, b, s]) => [realT(a), realT(b), s]),
    events: () => { let off = 0; return list.map((f) => { const e = { t: f.at + off, dur: f.dur }; off += f.dur; return e; }); },
  };
}

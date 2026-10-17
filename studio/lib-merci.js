// =====================================================================
//  « MERCI » (17 octobre 2026, vidéo de soutien voulue par Curtis) : la même caméra de la Bastille que lib-histoire.js
//  feuillette les grandes mobilisations. Les époques françaises sont des RECONSTITUTIONS sur la place (sépia en 1936,
//  délavée en 1968, vidéo en 2006…) ; celles d'ailleurs (Washington, l'Islande, Leipzig) sont une CARTE qui zoome sur l'endroit,
//  avec des points lumineux pour la foule. Puis retour en 2026, la place pleine.
//  Différences avec lib-histoire.js : pas d'arrêt sur image obligatoire (V.freeze peut valoir null), des époques « carte »
//  (era.map = { lon, lat, country, zoom, place, dots }), une couleur de tampon par époque (era.stamp.color), pas de viseur « TOI »
//  si V.noYou.
// =====================================================================
import { THREE, createStage, makeSky, HUD, sm, lerp, clamp, rng, dirAzEl, pad, fr } from './engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople, loadPolice } from './lib-people.js';
import { makeCrowd, makeEquation, makePile, makeBundle } from './lib-multiply.js';
import { makeBastille } from './lib-manif.js';
import { makeFreeze, zoomView } from './lib-freeze.js';
import { makeMapLayer } from './lib-merci-map.js';

// le « grain » de chaque époque : un filtre sur l'image + du grain de pellicule
const LOOKS = {
  1936: { f: 'sepia(0.92) contrast(1.2) brightness(0.88)', grain: 0.2, scratch: 3, vig: 0.55, flicker: 0.05 },
  1968: { f: 'sepia(0.42) saturate(0.5) contrast(1.12) brightness(0.96)', grain: 0.14, scratch: 1, vig: 0.4, flicker: 0.025 },
  2006: { f: 'saturate(0.72) contrast(1.08) brightness(1.04)', grain: 0.07, lines: 0.06, vig: 0.25 },
  2010: { f: 'saturate(0.62) contrast(1.12) brightness(1.04) hue-rotate(-6deg)', grain: 0.07, lines: 0.09, vig: 0.3 },
  2016: { f: 'saturate(0.72) contrast(1.08) brightness(1.02)', grain: 0.05, lines: 0.05, vig: 0.26 },
  2018: { f: 'saturate(0.82) contrast(1.06)', grain: 0.045, vig: 0.24 },
  2023: { f: 'saturate(0.8) contrast(1.06) brightness(1.02)', grain: 0.04, vig: 0.24 },
  2026: { f: '', grain: 0, vig: 0 },
};
// les tenues « gilet jaune » (en plus des 8) : [pantalon, peau, haut]
const YEL = [0.98, 0.84, 0.1];
const EXTRA = [[[0.22, 0.32, 0.55], [0.93, 0.76, 0.64], YEL], [[0.15, 0.15, 0.17], [0.8, 0.6, 0.45], YEL], [[0.38, 0.4, 0.3], [0.66, 0.46, 0.32], YEL]];

export async function buildMerci(V) {
  const Q = new URLSearchParams(location.search);
  const T = V.T;
  const stage = createStage({ fov: 66, far: 3000, bloom: [0.16, 0.4, 0.93], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 0.95;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const SUN_DIR = dirAzEl(215, 27);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.05, 0.12, 0.30], dayHor: [0.48, 0.55, 0.63], stars: 0, sunGlow: 0.35 });
  const FOGC = new THREE.Color('#aab5c0'); scene.fog = new THREE.Fog(FOGC, 120, 1400);
  const sun = new THREE.DirectionalLight('#ffeedd', 2.6); sun.position.copy(SUN_DIR).multiplyScalar(160).add(new THREE.Vector3(6, 0, 70)); sun.target.position.set(6, 0, 70);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 20, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#c6d6ea', '#7d7466', 0.95));
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22;

  const PEOPLE = await loadPeople(renderer, undefined, { extra: EXTRA }), COPS = await loadPolice();
  makeBastille(scene, renderer, { PEOPLE });

  // --- toi (au premier rang) et tes voisins : de vrais personnages 3D
  const CAMP = new THREE.Vector3(10, 5, 95), LOOK = new THREE.Vector3(2.5, -1.6, 0);
  const YOU = new THREE.Vector3(6, 0, 70.6);
  const you = PEOPLE.make({ outfit: 3, shadows: true }); you.root.position.copy(YOU); you.root.rotation.y = 0.12; scene.add(you.root);
  const R = rng(V.seed || 17), near = [];
  for (let i = 0; i < 16; i++) {
    const front = i < 6, p0 = front ? new THREE.Vector3(YOU.x + (i % 2 ? 1 : -1) * (0.55 + Math.floor(i / 2) * 0.6 + R() * 0.15), 0, YOU.z - R() * 0.3)
      : new THREE.Vector3(YOU.x + (R() - 0.5) * 4.5, 0, YOU.z - 0.55 - R() * 2.6);
    const o = Math.floor(R() * 8), P = PEOPLE.make({ outfit: o, shadows: i < 6 }); P.root.position.copy(p0); P.root.rotation.y = 0.1 + (R() - 0.5) * 0.8; scene.add(P.root);
    near.push({ P, o, ph: R() * 6, fist: i % 3 === 0 });
  }
  const setOutfit = (P, k) => { const m = PEOPLE.MAPS[k % PEOPLE.MAPS.length]; for (const mt of P.mats) if (mt.map !== m) { mt.map = m; mt.needsUpdate = true; } };
  // --- la foule de la place : des « photos découpées » qui apparaissent du premier rang vers la colonne
  const OPERA = new THREE.Vector2(78, -38), NC = 14000;
  const ATL = PEOPLE.atlas(30, 192, 384), ATL_Y = PEOPLE.atlas(30, 192, 384, [8, 9, 10, 8, 2, 9, 10, 5]);
  const crowd = makeCrowd(scene, PEOPLE, { count: NC, spacing: 0.7, cx: YOU.x, cz: YOU.z - 2, near: 0, reach: 2.0, atlas: ATL, fog: { color: FOGC, near: 120, far: 1400 },
    appearAt: (i) => 10 * i / NC,
    exclude: (x, z) => Math.hypot(x, z) < 19 || Math.hypot(x, z) > 80 || z > 70.4 || Math.hypot(x - OPERA.x, z - OPERA.y) < 45 || (Math.abs(x - YOU.x) < 3.2 && z > YOU.z - 3.4) });
  // --- la ligne de police (devant la caméra, dos à nous) : à partir de 2006
  const cops = [];
  for (let i = 0; i < 12; i++) { const c = COPS.make({ shadows: false, phase: i * 0.37 }); c.root.position.set(-8 + i * 1.75 + (i % 2) * 0.2, 0, 82.5 + (i % 2) * 0.5); c.root.rotation.y = Math.PI + (R() - 0.5) * 0.15; scene.add(c.root); cops.push(c); }

  // --- l'effet multiplication (vidéo « tout ») : des cubes d'un million d'euros en billets de 100 €
  let pile = null, eq = null; const EF = V.effect;
  if (EF) {
    const B = makeBundle(), S = 0.2304;   // 10 000 billets de 100 € (14,7 × 7,7 cm, 0,108 mm) = 0,0122 m³ → un cube de 23 cm
    const top = B.mats[2].clone(); top.map = B.mats[2].map.clone(); top.map.wrapS = top.map.wrapT = THREE.RepeatWrapping; top.map.repeat.set(1.55, 2.95); top.map.needsUpdate = true;
    const sideTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d'); const r = rng(4);
      for (let k = 0; k < 21; k++) { const y0 = k * 512 / 21, h = 512 / 21; for (let y = 0; y < h; y++) { const v = 170 + r() * 40; g.fillStyle = `rgb(${v * 0.72},${v},${v * 0.8})`; g.fillRect(0, y0 + y, 256, 1); }
        g.fillStyle = 'rgba(30,60,42,0.7)'; g.fillRect(0, y0 + h - 2, 256, 2); g.fillStyle = '#efe7d2'; g.fillRect(96 + (k % 2) * 8, y0 + 2, 52, h - 4); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const side = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.85 });
    pile = makePile(scene, { geo: new THREE.BoxGeometry(S, S, S), mats: [side, side, top, top, side, side], count: EF.count, nx: 21, nz: 21, gap: 0.002, t0: EF.t0, t1: EF.t1, x: EF.x, z: EF.z, drop: 0.7, seed: 8 });
    eq = makeEquation([{ label: '1 CUBE', value: '1 M€' }, '×', { label: 'CUBES', value: '0' }, '=', { label: 'TOTAL', value: '0 €', color: '#ffcf6b' }]);
  }

  // --- l'arrêt sur image (toi, en 2026)
  const pt = (n) => () => you.point(n);
  const FZ = makeFreeze(V.freeze ? [{ at: V.freeze.at, dur: V.freeze.dur, title: 'ARRÊT SUR IMAGE · ZOOM ×8 · TOI, EN 2026', zoom: 8, tags: V.freeze.tags.map((g) => ({ ...g, at: pt(g.pt) })) }] : []);
  const MAP = await makeMapLayer('data/world.json');
  T.duration = V.sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(V.SUBS);

  // --- le calque 2D : grain de pellicule, rayures, rembobinage, tampons
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  const hud = document.getElementById('hud'); hud.insertBefore(ov, hud.firstChild); const og = ov.getContext('2d');
  const grains = [0, 1, 2].map((s) => { const c = document.createElement('canvas'); c.width = 270; c.height = 480; const g = c.getContext('2d'); const d = g.createImageData(270, 480); const r = rng(50 + s);
    for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 * Math.abs(r() - 0.5) * 2; } g.putImageData(d, 0, 0); return c; });
  const vign = (() => { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const g = c.getContext('2d'); const gr = g.createRadialGradient(540, 960, 520, 540, 960, 1150);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,6,2,1)'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920); return c; })();
  // les transitions : [début, fin, sens, année de départ, année d'arrivée, instant du changement d'époque]
  const E = V.eras, TR = [[V.rewindAt, E[0].t0 + 0.25, -1, 2026, E[0].year, E[0].t0]];
  for (let i = 1; i < E.length; i++) TR.push([E[i].t0 - (V.trIn ?? 0.55), E[i].t0 + (V.trOut ?? 0.25), 1, E[i - 1].year, E[i].year, E[i].t0]);
  TR.push([V.back - 0.6, V.back + 0.25, 1, E[E.length - 1].year, 2026, V.back]);
  const eraAt = (ts) => E.find((e) => ts >= e.t0 && ts < e.t1) || null;
  const trAt = (ts) => TR.find((r) => ts >= r[0] && ts < r[1]) || null;

  function drawOverlay(t, ts, era, look) {
    og.clearRect(0, 0, 1080, 1920);
    if (era && era.map) MAP.draw(og, era.map, clamp((ts - era.t0) / (era.t1 - era.t0)), ts);
    const busy = (era && era.map) || look.vig || look.grain || trAt(ts) || (era && era.stamp && ts > era.stamp.at && ts < Math.min(era.t1, era.stampOut ?? era.t1));
    ov.style.visibility = busy ? 'visible' : 'hidden';   // (sinon Chrome peut garder la dernière image dessinée)
    if (!busy) return;
    const fi = Math.floor(t * 30), r = rng(fi * 7 + 11);
    if (look.vig) { og.globalAlpha = look.vig; og.drawImage(vign, 0, 0); }
    if (look.grain) { og.globalAlpha = look.grain; og.globalCompositeOperation = 'overlay'; og.drawImage(grains[fi % 3], -r() * 40, -r() * 40, 1120, 1990); og.globalCompositeOperation = 'source-over'; }
    if (look.scratch) for (let k = 0; k < look.scratch; k++) if (r() < 0.7) { og.globalAlpha = 0.25 + r() * 0.3; og.fillStyle = r() < 0.5 ? '#f4ead8' : '#1a120a'; og.fillRect(r() * 1080, 0, 1.5 + r() * 2, 1920); }
    if (look.lines) { og.globalAlpha = look.lines; og.fillStyle = '#000'; for (let y = (fi * 3) % 6; y < 1920; y += 6) og.fillRect(0, y, 1080, 2); }
    og.globalAlpha = 1;
    // le rembobinage / l'avance rapide : bandes de bruit et l'année qui défile
    const tr = trAt(ts);
    if (tr) {
      const k = (ts - tr[0]) / (tr[1] - tr[0]), a = Math.sin(Math.PI * k);
      for (let i = 0; i < 12; i++) { const y = r() * 1920, h = 6 + r() * 46; og.fillStyle = `rgba(255,255,255,${0.06 + r() * 0.22 * a})`; og.fillRect(0, y, 1080, h); }
      const ky = clamp((ts - tr[0]) / (tr[5] - tr[0])), year = Math.round(lerp(tr[3], tr[4], ky * ky * (3 - 2 * ky)));
      og.globalAlpha = Math.min(1, a * 1.8); og.fillStyle = '#fff'; og.textAlign = 'center';
      og.font = '800 54px Inter'; og.fillText(tr[2] < 0 ? '◀◀ ON REMBOBINE' : (tr[4] === 2026 ? '▶▶ RETOUR EN 2026' : '▶▶ AVANCE RAPIDE'), 540, 700);
      og.font = '800 190px Inter'; og.fillText(String(year), 540, 900); og.textAlign = 'left'; og.globalAlpha = 1;
      if (Math.abs(ts - tr[5]) < 0.07) { og.fillStyle = 'rgba(255,255,255,0.5)'; og.fillRect(0, 0, 1080, 1920); }
    }
    // le tampon du résultat
    if (era && era.stamp && !tr) {
      const u = ts - era.stamp.at, end = Math.min(era.t1, era.stampOut ?? era.t1);
      if (u > 0 && ts < end) {
        const s = u < 0.16 ? lerp(1.9, 1, u / 0.16) : 1, a = sm(0, 0.06, u) * (1 - sm(end - 0.25, end, ts)), col = era.stamp.color || V.stampColor || '#ffcf6b';   // (même couleur pour tous les résultats : on reste neutre)
        og.save(); og.translate(540, 985); og.rotate(-0.07); og.scale(s, s); og.globalAlpha = a;
        og.font = '800 84px Inter'; const tw = og.measureText(era.stamp.text).width, w = tw + 110, h = 150;
        og.fillStyle = 'rgba(8,10,16,0.55)'; og.beginPath(); og.roundRect(-w / 2, -h / 2, w, h, 16); og.fill();
        og.strokeStyle = col; og.lineWidth = 9; og.beginPath(); og.roundRect(-w / 2, -h / 2, w, h, 16); og.stroke();
        og.lineWidth = 3; og.beginPath(); og.roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 9); og.stroke();
        og.fillStyle = col; og.textAlign = 'center'; og.fillText(era.stamp.text, 0, 30); og.textAlign = 'left'; og.restore();
      }
    }
  }

  // --- la caméra : fixe, sauf pendant l'effet multiplication
  const W = 720, H = 1280, tmp = new THREE.Vector3();
  const EC1 = [new THREE.Vector3(22, 13.5, 108), new THREE.Vector3(2, 2.2, 72)], EC2 = [new THREE.Vector3(17.5, 15.5, 112.5), new THREE.Vector3(2, 2.6, 72)];
  function camAt(ts) {
    if (!EF || ts < EF.c0 || ts > EF.c3) return [CAMP, LOOK];
    const lp = (a, b, k) => a.clone().lerp(b, k);
    if (ts < EF.c1) { const k = sm(EF.c0, EF.c1, ts); return [lp(CAMP, EC1[0], k), lp(LOOK, EC1[1], k)]; }
    if (ts < EF.c2) { const k = (ts - EF.c1) / (EF.c2 - EF.c1); return [lp(EC1[0], EC2[0], k), lp(EC1[1], EC2[1], k)]; }
    const k = sm(EF.c2, EF.c3, ts); return [lp(EC2[0], CAMP, k), lp(EC2[1], LOOK, k)];
  }

  function update(t) {
    const ts = FZ.sceneT(t), A = FZ.active(t), era = eraAt(ts), Y = era ? era.year : 2026, look = LOOKS[Y] || LOOKS[2026];
    // (quand la carte ou le carton de fin couvrent tout l'écran, inutile de dessiner la 3D : on la cache, l'image reste la même)
    const hidden3d = (era && era.map && !trAt(ts)) || t > FZ.realT(T.endCard) + 0.5;
    for (const c of scene.children) if (c !== camera) c.visible = !hidden3d;
    const iE = era ? E.indexOf(era) : -1, yellow = Y === 2018;
    // la foule : elle se remplit au début de chaque époque
    const fill = era ? era.fill * (0.3 + 0.7 * sm(era.t0, era.t0 + 1.8, ts)) : (ts >= V.back ? V.now.fill * (0.4 + 0.6 * sm(V.back, V.back + 1.5, ts)) : V.now.fill);
    crowd.flat.material.uniforms.uAtlas.value = yellow ? ATL_Y : ATL;
    crowd.update(10 * fill, { light: 1, fogNear: 120, fogFar: 1400 });
    for (const c of cops) { c.root.visible = Y >= 2006; c.update(ts); }
    // toi et tes voisins (en 1936 ou en 1968, ils lèvent le poing ; en 2018, gilets jaunes)
    setOutfit(you, era ? (yellow ? 8 : (iE * 3 + 1) % 8) : 3);
    you.stand(0.02 * Math.sin(ts * 1.3));
    near.forEach((n, i) => {
      setOutfit(n.P, era ? (yellow && i % 4 !== 3 ? 8 + (i % 3) : (n.o + iE * 3 + 2) % 8) : n.o);
      if (era && n.fist) n.P.armsUp(0.75 + 0.25 * Math.sin(ts * 3 + n.ph), ts * 6 + n.ph); else n.P.stand(0.04 * Math.sin(ts * 1.1 + n.ph));
    });
    if (pile) { pile.mesh.visible = !!(era && era.year === EF.era); pile.update(ts); }   // (visible doit valoir false, pas null)
    // la caméra, et le zoom pendant l'arrêt
    const [cp, ct] = camAt(ts); camera.position.copy(cp); camera.lookAt(ct); camera.clearViewOffset();
    if (A) {
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      camera.updateMatrixWorld(); tmp.copy(you.point('chest')).add(new THREE.Vector3(0, -0.12, 0)).project(camera);
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, A.f.zoom, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);

    // --- textes
    HUD.hook(t, V.hook, T.hookOut);
    const inEffect = EF && ts > EF.c0 + 0.4 && ts < EF.c3 - 0.4 && era && era.year === EF.era;
    if (!era) { const clock = (V.clock0 ?? 15 * 3600 + 31 * 60) + ts; HUD.live(t, V.camLabel || 'PARIS · PLACE DE LA BASTILLE · CAM 03', `17/10/2026 · ${pad(Math.floor(clock / 3600))}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}`, 'SIMULATION'); }
    else if (inEffect) HUD.live(t, 'EFFET MULTIPLICATION', '1 CUBE = 1 MILLION D’EUROS', 'SIMULATION');
    else HUD.live(t, era.map ? 'ARCHIVES · ' + era.map.place : 'ARCHIVES · PARIS', era.date, era.map ? 'CARTE' : 'RECONSTITUTION');
    const tr = trAt(ts);
    if (inEffect) {
      const N = pile.countAt(ts), tot = N >= 1000 ? `${fr(N / 1000, N % 1000 ? 1 : 0)} Md€` : `${fr(N)} M€`;
      HUD.block(1, { label: EF.label, value: tot, sub: 'EN BILLETS DE 100 €', color: '#ffcf6b' }); HUD.show2(false);
      eq.set(1, fr(N)); eq.set(2, N >= 1000 ? `${fr(N / 1000, N % 1000 ? 1 : 0)} milliards €` : `${fr(N)} millions €`);
    } else if (era) {
      HUD.block(1, era.b1); HUD.block(2, era.later && ts > era.later.at ? era.later.b2 : era.b2); HUD.show2(ts > era.stamp.at);   // (later : le résultat change ensuite, ex. loi suspendue)
    } else { const nb = V.now; HUD.block(1, nb.b1); HUD.block(2, nb.b2); HUD.show2(true); }
    if (eq) eq.opacity(inEffect ? sm(EF.t0 - 0.2, EF.t0 + 0.4, ts) * (1 - sm(EF.c2, EF.c2 + 0.5, ts)) * (A ? 0 : 1) : 0);
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (tr ? 0 : 1) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    camera.updateMatrixWorld();
    const youOn = !V.noYou && !era && !tr && ts > 3.6 ? 1 : 0;
    HUD.reticle('you', you.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'TOI', A ? 0 : youOn * (ts < V.rewindAt ? sm(3.6, 4.0, ts) : sm(V.back + 0.3, V.back + 0.8, ts)) * (1 - sm(FZ.realT(T.endCard) - 1, FZ.realT(T.endCard), t)), 90);
    HUD.subs(t, SUBS_V);
    drawOverlay(t, ts, era, look);
    HUD.end(t, FZ.realT(T.endCard), V.end);
    const fl = look.flicker ? 1 + look.flicker * (rng(Math.floor(t * 30) + 5)() - 0.5) * 2 : 1;
    FZ.draw(t, camera, look.f ? `${look.f} brightness(${fl.toFixed(3)})` : '');
    if (Q.get('dbg') === 'pile' && pile) { camera.clearViewOffset(); camera.position.set(14, 6, 88); camera.lookAt(EF.x, 2, EF.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(),
    eras: E.map((e) => ({ year: e.year, t0: FZ.realT(e.t0), t1: FZ.realT(e.t1), stamp: FZ.realT(e.stamp.at), ok: e.stamp.ok })),
    trans: TR.map((r) => ({ t0: FZ.realT(r[0]), t1: FZ.realT(r[1]), dir: r[2], cut: FZ.realT(r[5]) })),
    effect: EF ? { c0: FZ.realT(EF.c0), t0: FZ.realT(EF.t0), t1: FZ.realT(EF.t1), c3: FZ.realT(EF.c3) } : null,
    back: FZ.realT(V.back), end: FZ.realT(T.endCard) }) };
}

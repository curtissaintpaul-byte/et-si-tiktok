// =====================================================================
//  « Et si tu lâchais ton téléphone pendant 30 jours ? » — PARTIE 2 (jours 7 à 30). Format RECONSTITUTION en 2 parties
//  (scénario validé par Curtis le 27/10/2026). Rappel de 3 s de la partie 1, puis : c'était Maëlle à la porte (inquiète),
//  la bibliothèque (jour 14 : ce qu'a mesuré l'étude de 2025, arrêt sur image), les quais sans GPS (jour 20), et jour 30,
//  minuit : la main de Sarah au-dessus du tiroir. Fin ouverte : « Et toi, tu le rallumes ? ».
//  Trois caméras fixes : la chambre (CAM 01), les quais devant la place de la Bourse (CAM 02), la bibliothèque (CAM 03).
//  Elles ne bougent jamais ; elles zooment parfois (zoom numérique de caméra de surveillance).
//
//  Faits (vérifiés le 29/10/2026 sur l'article lui-même, source dans la légende) :
//   Castelo, Kushlev, Ward, Esterman & Reiner, « Blocking mobile internet on smartphones improves sustained attention,
//   mental health, and subjective well-being », PNAS Nexus 4(2), pgaf017, février 2025 (467 participants, 2 semaines) :
//   - « 90,7 % des participants » allaient mieux sur au moins un des 3 points mesurés (bien-être, santé mentale, attention) ;
//   - l'attention a progressé d'environ autant qu'elle baisse en 10 ans avec l'âge ;
//   - temps d'écran du téléphone (1er groupe, celui qui a bloqué en premier) : 314 min (5 h 14) → 161 min (2 h 41) pendant
//     le blocage, puis 265 min (4 h 25) deux semaines après la fin ;
//   - seuls 119 participants sur 467 (25,5 %, environ 1 sur 4) ont gardé le blocage au moins 10 jours sur 14 (le scénario
//     disait « 1 sur 4 a tenu jusqu'au bout » : l'article dit « au moins 10 jours sur 14 », c'est ce qu'on affiche).
//  Sarah, Maëlle, le plan en papier et la fin sont une HISTOIRE plausible.
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad } from '../../engine.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2, pixTex } from '../../lib-ps2.js';
import { makeSkyDome } from '../../lib-villa.js';
import { buildChambre, buildQuais, buildBiblio, makePhone, makeBook } from '../../lib-bordeaux.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// --- la partition (temps de SCÈNE)
const SH = { hook: 0, r1: 3.0, r2: 4.0, r3: 5.0, j7: 6.0, bib: 13.2, qu: 30.0, qu2: 33.6, j30: 41.0, end: 60.0 };
const sceneEnd = 64.0, FREEZE_AT = 24.1, JUMP = 48.2;
const DOOR = { open: 6.3, enter: 7.0, stand: 7.2 };
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 4.5, 'Dans la partie 1 : 30 jours sans téléphone.'],
  [4.6, 5.9, 'Jour 7, 23 h : on frappe.'],
  [6.2, 9.6, 'C’est Maëlle, sa meilleure amie. 7 jours sans nouvelles : elle a eu peur.'],
  [9.8, 13.0, 'Sarah lui explique son défi. Maëlle n’y croit pas : « Tu tiendras jamais. »'],
  [13.3, 16.8, 'Jour 14, à la bibliothèque. Sarah révise 3 heures d’affilée.'],
  [17.0, 20.4, 'Dans l’étude de 2025, 91 % des participants allaient mieux sur au moins un point.'],
  [20.6, 23.9, 'Leur moral, leur santé mentale ou leur attention. En 2 semaines.'],
  [24.1, 26.0, 'Ce que l’étude a mesuré, au bout de 2 semaines :'],
  [26.2, 29.7, 'Mais seulement 1 participant sur 4 a vraiment tenu : au moins 10 jours sur 14.'],
  [30.1, 33.4, 'Jour 20. Sans GPS, Sarah se perd. Elle demande son chemin.'],
  [33.7, 37.1, 'Sur les quais, elle retrouve Maëlle. 2 heures à parler, sans être coupées.'],
  [37.3, 40.7, 'Enfin presque : Maëlle, elle, regarde son téléphone toutes les 5 minutes.'],
  [41.1, 44.5, 'Jour 30, 23 h 58. Le défi est presque fini.'],
  [44.7, 48.0, 'Dans le tiroir : 30 jours de messages, de photos, de nouvelles.'],
  [48.3, 51.5, 'Minuit. Sa main au-dessus du tiroir.'],
  [51.7, 55.6, 'En vrai, après le test, le 1er groupe de l’étude est vite remonté : 4 h 25 d’écran par jour.'],
  [55.8, 59.6, 'Sarah, elle, hésite encore.'],
];
const CLOCK0 = { hook: [7, '22:59:02'], r1: [0, '21:04:26'], r2: [3, '03:06:54'], r3: [7, '23:00:00'], j7: [7, '23:00:04'], bib: [14, '15:12:40'], qu: [20, '19:02:15'], qu2: [20, '19:31:50'], j30: [30, '23:58:00'] };
const ROOM = { hook: 'soir', r1: 'soir', r2: 'nuit', r3: 'soir', j7: 'soir', j30: 'fin' };
const TEXT0 = 3.1;

export default async function () {
  const stage = createStage({ fov: 62, far: 3000, bloom: [0.3, 0.5, 0.88], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.15;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#7fd1ff');
  scene.background = new THREE.Color('#0b0c10');
  scene.fog = new THREE.Fog('#cfd8e0', 90, 900);
  const shadeEl = document.getElementById('shade');

  // --- les décors : la chambre (à l'origine), les quais (z = 3000), la bibliothèque (x = 3000)
  const CH = buildChambre(scene, { at: v3(0, 0, 0) });
  const QU = buildQuais(scene, { at: v3(0, 0, 3000) });
  const BI = buildBiblio(scene, { at: v3(3000, 0, 0) });
  const sky = makeSkyDome(scene, 1400); sky.set('couchant');
  const R = (x, y, z) => v3(x, y, z), U = (x, y, z) => QU.P(x, y, z), B = (x, y, z) => BI.P(x, y, z);

  // --- les personnages : Sarah (Kate), Maëlle (Jody), un passant, des étudiants à la bibliothèque
  const CAST = await loadMixamo({ chars: ['Kate', 'Jody', 'Brian', 'Josh', 'Joe', 'Adam'], anims: ['idle', 'sit', 'texting', 'lookaround', 'nervous', 'walkfemale', 'walk', 'liedown'] });
  const A = CAST.make('Kate', { height: 1.66 }), M = CAST.make('Jody', { height: 1.63 }); scene.add(A.root, M.root);
  const PHL = makePhone(); A.hold(PHL, 'LeftHand', { off: [-0.02, 0.1, 0.0], rot: [0, 0, 0] }); PHL.screen(false);
  const PHD = makePhone(); PHD.screen(false); CH.drawerIn.add(PHD); PHD.rotation.set(-Math.PI / 2, 0, 0.3); PHD.position.set(0.02, 0.006, 0.02);
  const BOOK = makeBook('#2f5d8a'); A.hold(BOOK, 'RightHand', { off: [0.05, 0.1, 0.03], rot: [0.3, 0, 0] });
  const PHM = makePhone(); M.hold(PHM, 'RightHand', { off: [0.02, 0.1, 0.0], rot: [0, 0, 0] });
  // le plan de Bordeaux en papier (déplié, tenu à deux mains)
  const mapT = pixTex(64, 48, (g, w, h) => { g.fillStyle = '#efe9d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#8fb3cf'; g.beginPath(); g.moveTo(38, 0); g.bezierCurveTo(30, 16, 46, 30, 40, 48); g.lineTo(48, 48); g.bezierCurveTo(54, 30, 38, 16, 46, 0); g.fill();
    g.strokeStyle = '#c9b48a'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 5 * i + 2); g.lineTo(34, 5 * i + 6); g.stroke(); g.beginPath(); g.moveTo(4 * i, 0); g.lineTo(4 * i + 3, h); g.stroke(); } g.fillStyle = '#d0453a'; g.fillRect(20, 20, 3, 3); g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(32, 0); g.lineTo(32, h); g.moveTo(0, 24); g.lineTo(w, 24); g.stroke(); });
  const MAP = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ map: mapT, side: THREE.DoubleSide, roughness: 0.9 }));
  A.hold(MAP, 'RightHand', { off: [-0.12, 0.08, 0.06], rot: [-0.9, 0, 0] });
  const EXTRA = ['Brian', 'Josh', 'Joe', 'Adam'].map((n, i) => { const P = CAST.make(n, { height: 1.74 + (i % 2) * 0.05, shadows: true }); scene.add(P.root); const ph = makePhone(); P.hold(ph, 'RightHand', { off: [0.02, 0.1, 0.0], rot: [0, 0, 0] }); return { P, ph }; });

  // la vue de la caméra fixe de chaque lieu (les mêmes que dans la partie 1 pour la chambre et les quais)
  const CAMS = {
    ch: { p: R(1.85, 2.3, 2.02), l: R(-0.7, 0.55, -1.3), fov: 62 },
    qu: { p: U(-0.4, 2.6, 7.9), l: U(-15.5, -3.71, -5.22), fov: 62 },
    bi: { p: B(6.0, 2.5, 4.2), l: B(3.0, 0.75, 0.6), fov: 58 },
  };

  // --- les poses
  const SEAT = CH.seat.clone(), SEAT_RY = Math.PI / 2;
  const sitA = (upper, tt, spec) => A.pose([['sit', 2.0, 1, LOWER], [upper, tt, 1, UPPER]], spec);
  const reachSpec = (r, h = r) => ({ Spine: [['y', 0.25 + 0.2 * r], ['x', 0.08 + 0.22 * r]], Spine1: [['y', 0.1 + 0.1 * r]], Neck: [['y', 0.35], ['x', 0.3]], LeftArm: [['x', -1.2 * h], ['z', 0.2 * h]], LeftForeArm: [['x', -0.3 * h]] });
  const SARAH_BIB = B(4.5 - 1.1, 0, 1.6 - 0.85 + 0.05);    // à la table de droite, face à la caméra
  function pose(ts, S) {
    PHL.visible = false; BOOK.visible = false; MAP.visible = false; PHM.visible = false; A.root.visible = true; M.root.visible = false; PHD.visible = S === 'r1';
    A.root.rotation.set(0, 0, 0); M.root.rotation.set(0, 0, 0); CH.drawer(0); CH.door(0);
    EXTRA.forEach((e) => { e.P.root.visible = false; e.ph.visible = false; });
    if (S === 'r1') { A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY; CH.drawer(1); PHL.visible = true;
      sitA('texting', TEXT0, { Spine: [['y', 0.45], ['x', 0.3]], Spine1: [['y', 0.2]], Neck: [['x', 0.25]], LeftArm: [['x', -0.75], ['z', 0.2]], LeftForeArm: [['x', -0.15]] }); return; }
    if (S === 'r2') { A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY; sitA('idle', ts, reachSpec(0.3)); return; }
    if (S === 'hook' || S === 'r3' || S === 'j7') {
      const standK = S === 'j7' ? sm(DOOR.stand, DOOR.stand + 0.9, ts) : 0;
      if (S === 'j7') {
        CH.door(sm(DOOR.open, DOOR.open + 0.6, ts));
        // Maëlle entre et s'arrête à 1 m de la porte ; elle regarde Sarah
        M.root.visible = true; const k = sm(DOOR.enter, DOOR.enter + 1.4, ts);
        const p0 = CH.doorOut.clone().add(v3(0, 0, 0.4)), p1 = CH.doorIn.clone().add(v3(-0.1, 0, 0.35)); M.root.position.copy(p0).lerp(p1, k);
        const toS = Math.atan2(SEAT.x + 0.6 - p1.x, SEAT.z - p1.z);
        M.root.rotation.y = lerp(0, toS, sm(DOOR.enter + 1.0, DOOR.enter + 1.6, ts));
        if (k > 0 && k < 1) M.pose('walkfemale', (ts - DOOR.enter) * 1.0); else M.pose([['nervous', 1.0 + (ts - DOOR.enter) * 0.8, 0.6], ['idle', ts, 0.4]]);
      }
      if (standK < 0.5) { A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY; BOOK.visible = S !== 'j7' || ts < DOOR.stand + 0.3;
        const look = S === 'hook' ? 0 : S === 'r3' ? 1 : sm(DOOR.open - 0.2, DOOR.open + 0.4, ts);
        sitA('texting', TEXT0 + 0.05 * Math.sin(ts), { Neck: [['y', 0.25 * look], ['x', -0.3 * look]], Head: [['y', 0.15 * look], ['x', -0.1 * look]], RightArm: [['x', 0.25 * look]], LeftArm: [['x', 0.25 * look]] }); }
      else { // debout, face à Maëlle ; elle explique (des gestes)
        A.root.position.copy(SEAT).add(v3(0.42, 0, 0.1)); A.root.rotation.y = Math.atan2(CH.doorIn.x - SEAT.x - 0.42, CH.doorIn.z + 0.35 - SEAT.z - 0.1);
        const g = Math.max(0, Math.sin((ts - 9.8) * 2.4)) * sm(9.8, 10.3, ts) * (1 - sm(12.6, 13.0, ts));
        A.pose([['idle', ts, 0.7], ['lookaround', 1.5, 0.3]], { RightArm: [['x', -0.6 * g], ['z', 0.2 * g]], RightForeArm: [['x', -0.6 * g]] });
      }
      return;
    }
    if (S === 'bib') {   // la bibliothèque : Sarah révise (un livre) ; autour, des étudiants, dont deux sur leur téléphone
      A.root.position.copy(SARAH_BIB); A.root.rotation.y = 0; BOOK.visible = true;
      sitA('texting', TEXT0 + 0.05 * Math.sin(ts * 0.7), { Neck: [['x', 0.1]] });
      const spots = [[B(4.5 + 1.1, 0, 1.6 - 0.8), 0, 'texting'], [B(4.5 - 1.1, 0, -2.6 - 0.8), 0, 'idle'], [B(0 - 1.1, 0, 1.6 - 0.8), 0, 'texting'], [B(0 + 1.1, 0, -2.6 + 0.8), Math.PI, 'idle']];
      EXTRA.forEach((e, i) => { const [p, ry, up] = spots[i]; e.P.root.visible = true; e.P.root.position.copy(p); e.P.root.rotation.y = ry; e.ph.visible = up === 'texting';
        e.P.pose([['sit', 2.0, 1, LOWER], [up, up === 'texting' ? TEXT0 + 0.1 * Math.sin(ts + i) : ts + i * 2, 1, UPPER]], up === 'idle' ? { Spine: [['x', 0.25]], Neck: [['x', 0.3]], RightArm: [['x', -0.6]], LeftArm: [['x', -0.6]], RightForeArm: [['x', -0.8]], LeftForeArm: [['x', -0.8]] } : {}); });
      return;
    }
    if (S === 'qu') {   // le plan en papier ; un passant (Brian) arrive, s'arrête et lui montre la direction
      const u = ts - SH.qu, me = U(-3.24, 0, 4.77), e = EXTRA[0], k = sm(0.0, 1.8, u);   // (devant le banc, face au passant)
      const b0 = U(-6.47, 0, 7.26), b1 = U(-3.9, 0, 5.52);
      A.root.position.copy(me); A.root.rotation.y = lerp(0.35, Math.atan2(b1.x - me.x, b1.z - me.z), sm(1.4, 2.1, u));
      MAP.visible = u < 2.6; A.pose([['texting', TEXT0 + 0.05 * Math.sin(ts), 1, UPPER], ['idle', ts, 1, LOWER]]);
      e.P.root.visible = true; e.P.root.position.copy(b0.clone().lerp(b1, k));
      e.P.root.rotation.y = k < 1 ? Math.atan2(b1.x - b0.x, b1.z - b0.z) : Math.atan2(me.x - b1.x, me.z - b1.z);
      const point = sm(1.9, 2.4, u) * (1 - sm(3.1, 3.5, u));
      if (k < 1) e.P.pose('walk', u * 1.1); else e.P.pose('idle', ts, { RightArm: [['z', -1.2 * point], ['x', -0.5 * point]], RightForeArm: [['x', -0.1 * point]] });
      return;
    }
    if (S === 'qu2') {   // assises sur le banc, toutes les deux, face à la Garonne ; Maëlle regarde son téléphone
      A.root.position.copy(QU.seat(0.42)); A.root.rotation.y = QU.benchYaw; sitA('idle', ts, { Neck: [['y', -0.3 + 0.1 * Math.sin(ts * 0.8)]] });
      M.root.visible = true; M.root.position.copy(QU.seat(-0.42)); M.root.rotation.y = QU.benchYaw;
      const ph = ts > 37.3 && Math.sin((ts - 37.3) * 1.6) > -0.2; PHM.visible = ph;
      M.pose([['sit', 2.0, 1, LOWER], [ph ? 'texting' : 'idle', ph ? TEXT0 : ts, 1, UPPER]], { Neck: [['y', ph ? 0 : 0.3]] });
      return;
    }
    if (S === 'j30') {   // minuit : assise au bord du lit ; elle fixe le tiroir ; sa main au-dessus (sans l'ouvrir)
      A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY;
      const r = sm(46.0, 48.0, ts), h = r * (0.9 + 0.05 * Math.sin(ts * 2.1));
      sitA('idle', ts, reachSpec(r, h));
      return;
    }
    A.root.visible = false;
  }

  // --- le calque 2D : le rappel (« ◀◀ PARTIE 1 »), les TOC, le saut d'image, le zoom
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  const hud = document.getElementById('hud'); hud.insertBefore(ov, document.getElementById('subt')); const og = ov.getContext('2d');
  function noiseBands(t, n, a) { let sd = Math.floor(t * 30) * 7919 + 13; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) { og.fillStyle = `rgba(${200 + rnd() * 55},${200 + rnd() * 55},${200 + rnd() * 55},${(0.1 + rnd() * 0.3) * a})`; og.fillRect(0, rnd() * 1920, 1080, 3 + rnd() * 30); } }
  function zoomLabel(z, a) {
    if (a <= 0.02) return;
    og.globalAlpha = a; og.font = '600 19px Inter'; og.textAlign = 'right'; og.fillStyle = 'rgba(0,0,0,.45)'; og.fillText(`ZOOM ×${z.toFixed(1).replace('.', ',')}`, 1020, 342);
    og.fillStyle = '#fff'; og.fillText(`ZOOM ×${z.toFixed(1).replace('.', ',')}`, 1018, 340); og.globalAlpha = 1;
  }

  // --- l'arrêt sur image : jour 14, à la bibliothèque, ce qu'a mesuré l'étude
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 5.0, title: 'ARRÊT SUR IMAGE · JOUR 14 · CE QU’A MESURÉ L’ÉTUDE', tags: [
      { at: () => A.point('Head').add(v3(0, 0.1, 0)), title: 'ATTENTION', lines: ['autant gagné que ce', 'qu’on perd en 10 ans', 'avec l’âge'], risk: 'ok', side: 'right', dy: -40 },
      { at: () => A.point('Spine2'), title: 'MORAL, SANTÉ, ATTENTION', lines: ['91 % vont mieux', 'sur au moins 1 point'], risk: 'ok', side: 'right', dy: 40 },
      { at: () => A.point('RightHand'), title: 'TEMPS D’ÉCRAN', lines: ['5 h 14 → 2 h 41', 'par jour (1er groupe)'], risk: 'info', side: 'left', dy: 90 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // =====================================================================
  //  LES PLANS
  // =====================================================================
  const ORDER = ['hook', 'r1', 'r2', 'r3', 'j7', 'bib', 'qu', 'qu2', 'j30', 'end'];
  const shotAt = (ts) => { let s = ORDER[0]; for (const k of ORDER) if (ts >= SH[k]) s = k; return s; };
  const LIGHTS = [...CH.lights, CH.amb, ...QU.lights, QU.hemi, ...BI.lights, BI.hemi];
  const hms = (s) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;
  const tmp = v3(0, 0, 0);
  const toPx = (p) => { tmp.copy(p).project(camera); return [(tmp.x * 0.5 + 0.5) * 720, (-tmp.y * 0.5 + 0.5) * 1280]; };

  function update(t) {
    const ts = FZ.sceneT(t), fz = FZ.active(t);
    const S = Q.get('shot') || shotAt(ts);
    const room = !!ROOM[S] || S === 'end', quais = S === 'qu' || S === 'qu2', bib = S === 'bib', recap = S === 'r1' || S === 'r2' || S === 'r3';
    pose(ts, S);
    CH.light(room ? (ROOM[S] || 'soir') : 'off');
    CH.hall(S === 'r3' || (S === 'j7' && ts < DOOR.open + 1.2) ? 1 : 0);
    QU.on(quais ? 1 : 0); BI.on(bib ? 1 : 0);
    if (quais) { QU.sun.color.set('#ffc890'); QU.sun.position.set(40, 14, 30); QU.sun.intensity = 2.3; QU.hemi.intensity = 0.8; }
    sky.dome.visible = quais; sky.sun.visible = false;
    if (quais) { scene.fog.near = 120; scene.fog.far = 1500; scene.fog.color.set('#e0b9a0'); scene.background.set('#e0b9a0'); } else { scene.fog.near = 500; scene.fog.far = 2000; scene.background.set('#0b0c10'); }
    shadeEl.style.background = quais || bib ? 'linear-gradient(to bottom, rgba(0,0,0,.6) 0px, rgba(0,0,0,.34) 440px, rgba(0,0,0,0) 720px), radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(0,0,0,.28) 100%)' : '';
    const jumpOff = S === 'j30' && ts >= JUMP ? 120 - (JUMP - SH.j30) : 0;   // (le saut d'image : minuit pile)
    if (room) { const c = CLOCK0[S]; if (c) { const [h, m, s] = c[1].split(':').map(Number); CH.clock(hms(h * 3600 + m * 60 + s + (ts - SH[S]) + jumpOff).slice(0, 5)); } }
    // la caméra fixe, et son zoom numérique (le tiroir et la nuit du rappel ; la main de Sarah au jour 30)
    const C = quais ? CAMS.qu : bib ? CAMS.bi : CAMS.ch;
    camera.fov = C.fov; camera.near = 0.05; camera.far = 3000; camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    if (Q.get('cp')) { camera.position.set(...Q.get('cp').split(',').map(Number)); camera.lookAt(...Q.get('cl').split(',').map(Number)); }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    let zk = 0, zz = 1;
    if (S === 'r1') { zk = 1; zz = 2.0; const [px, py] = toPx(CH.drawerFront().add(v3(0, 0.12, 0))); zoomView(camera, px, py, zz, zk); }
    if (S === 'r2') { zk = 1; zz = 1.8; const [px, py] = toPx(A.point('Spine2').lerp(CH.drawerFront(), 0.35).add(v3(0, 0.1, 0))); zoomView(camera, px, py, zz, zk); }
    if (S === 'j30') { zk = sm(44.6, 46.2, ts); zz = 1.8; const [px, py] = toPx(A.point('Spine2').lerp(CH.drawerFront(), 0.35).add(v3(0, 0.1, 0))); zoomView(camera, px, py, zz, zk); }
    if (fz) { const [px, py] = toPx(A.point('Spine2')); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, px, py, 1.6, k); }
    camera.updateProjectionMatrix();
    sky.dome.position.copy(camera.position);
    PS.dof(0); PS.look('normal', { sat: quais ? 0.95 : 0.86 });
    for (const l of LIGHTS) l.visible = l.intensity > 0;

    // --- le calque
    og.clearRect(0, 0, 1080, 1920);
    const glitch = S === 'j30' && ts >= JUMP && ts < JUMP + 0.2, knock = S === 'r3';
    if (recap) {   // le rappel : image « magnétoscope », sépia, avec le titre « ◀◀ PARTIE 1 »
      noiseBands(t, 7, 1); const a = sm(SH.r1, SH.r1 + 0.15, ts);
      og.globalAlpha = a; og.fillStyle = 'rgba(0,0,0,0.55)'; og.fillRect(48, 390, 470, 92); og.fillStyle = '#fff'; og.font = '800 54px Inter'; og.textAlign = 'left'; og.fillText('◀◀ PARTIE 1', 70, 455); og.globalAlpha = 1;
      if (knock) { camera.updateMatrixWorld(); const dp = CH.doorPos.clone().project(camera), px = (dp.x * 0.5 + 0.5) * 1080, py = (-dp.y * 0.5 + 0.5) * 1920;
        og.font = '800 46px Inter'; og.textAlign = 'center'; for (let i = 0; i < 3; i++) { og.fillStyle = '#fff3d6'; og.fillText('TOC', px + (i - 1) * 40, py - 120 + i * 90); } }
    }
    if (glitch) noiseBands(t, 14, 1.4);
    if (!fz && !recap) zoomLabel(1 + (zz - 1) * zk, zk);

    // --- textes
    HUD.hook(t, 'Et si tu lâchais ton <em>téléphone</em><br>pendant 30 jours ?', T.hookOut);
    const c0 = CLOCK0[S]; let clk = '';
    if (c0) { const [hh, mm, ss] = c0[1].split(':').map(Number); clk = `JOUR ${c0[0]} · ${hms(hh * 3600 + mm * 60 + ss + (ts - SH[S]) + jumpOff)}`; }
    const lab = recap ? 'RAPPEL · PARTIE 1' : { hook: 'CHAMBRE DE SARAH · CAM 01', j7: 'CHAMBRE DE SARAH · CAM 01', bib: 'BIBLIOTHÈQUE · BORDEAUX · CAM 03', qu: 'QUAIS DE LA GARONNE · CAM 02', qu2: 'QUAIS DE LA GARONNE · CAM 02', j30: 'CHAMBRE DE SARAH · CAM 01', end: '' }[S];
    HUD.live(t, lab, clk, 'SIMULATION');
    let tl = true;
    if (S === 'hook' || recap) { HUD.block(1, { label: 'PARTIE 2', value: 'Jours 7 à 30', sub: 'SANS TÉLÉPHONE', color: '#7fd1ff' }); HUD.show2(false); }
    else if (S !== 'end') {
      const day = CLOCK0[S][0];
      HUD.block(1, { label: 'SANS TÉLÉPHONE', value: `JOUR ${day}`, sub: 'SUR 30', color: day >= 30 ? '#9fe0b0' : '#7fd1ff' });
      if (bib && ts > 17.0 && ts < 26.2) { HUD.block(2, { label: 'L’ÉTUDE (2025)', value: '91 %', sub: 'VONT MIEUX SUR AU MOINS 1 POINT', color: '#9fe0b0' }); HUD.show2(true); }
      else if (bib && ts >= 26.2) { HUD.block(2, { label: 'L’ÉTUDE (2025)', value: '1 sur 4', sub: 'A VRAIMENT TENU (10 JOURS SUR 14)', color: '#ff9f0a' }); HUD.show2(true); }
      else if (S === 'j30' && ts > 51.6) { HUD.block(2, { label: '2 SEMAINES APRÈS LE TEST', value: '4 h 25 / jour', sub: 'CONTRE 2 H 41 PENDANT (1ER GROUPE)', color: '#ff9f0a' }); HUD.show2(true); }
      else HUD.show2(false);
    } else tl = false;
    document.getElementById('tl').style.opacity = tl && !fz ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    camera.updateMatrixWorld();
    HUD.reticle('maelle', M.point('Spine2').add(v3(0, 0.15, 0)), camera, 'MAËLLE', S === 'j7' ? sm(7.6, 8.1, ts) * (1 - sm(9.4, 9.8, ts)) : 0, 150);
    HUD.subs(t, SUBS_V);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCE : CASTELO ET AL., PNAS NEXUS (2025)', q: 'Et toi,<br>tu le rallumes ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, recap ? 'sepia(1) contrast(1.2) brightness(0.92)' : '');
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: ORDER.map((k) => FZ.realT(SH[k])),
    door: FZ.realT(DOOR.open), enter: FZ.realT(DOOR.enter), jump: FZ.realT(JUMP), reach: [FZ.realT(46.0), FZ.realT(48.0)], phoneM: FZ.realT(37.3) }) };
}

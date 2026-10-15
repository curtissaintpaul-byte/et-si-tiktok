// =====================================================================
//  « Et si Internet s'arrêtait partout pendant 24 h ? » — format RECONSTITUTION (plans courts + rendu PS2)
//  Gare de Lyon Part-Dieu, 7 h 30 : plus rien ne charge. Le café : carte refusée (arrêt sur image sur le terminal).
//  Le distributeur : hors service. Le tableau des départs : informations indisponibles. En voiture : le GPS te place
//  toujours (les satellites), mais la carte ne charge plus. Le tableau : le précédent du 19 juillet 2024. Le bon réflexe : le kit.
//
//  Faits (vérifiés le 15/10/2026, sources dans la légende) :
//   - un terminal de paiement sans réseau refuse les paiements qui demandent l'accord de la banque en direct ; certaines cartes
//     passent hors ligne, jusqu'à un plafond (Connectbanque, guide « TPE sans internet ») ;
//   - le GPS marche sans Internet (signaux des satellites) ; les cartes non téléchargées ne s'affichent plus (GIS Geography) ;
//   - 19 juillet 2024 : une mise à jour ratée de CrowdStrike (en ligne environ 78 minutes) a planté environ 8,5 millions d'ordinateurs
//     Windows, moins de 1 % du parc (Microsoft) ; environ 4 % des vols annulés dans le monde ; hôpitaux, TF1 et Canal+ touchés
//     (AFP, 21/07/2024 ; Blog du Modérateur, 22/07/2024) ; ce n'était pas une cyberattaque ni une panne d'Internet ;
//   - le gouvernement conseille un kit d'urgence avec de l'argent liquide (« les distributeurs pouvant ne pas fonctionner »)
//     et une radio à piles (info.gouv.fr, « Se préparer à une situation d'urgence », mis à jour le 06/08/2026).
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, rng } from '../../engine.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2 } from '../../lib-ps2.js';
import { makeSUV } from '../../lib-rue.js';
import { buildBedroom } from '../../lib-nuit.js';
import { buildHall, makePhoneScreen, makeKit } from '../../lib-gare.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SH = { hall: 0, phone: 3.0, cafe: 5.8, dab: 9.0, gare: 11.6, gps: 14.4, tableau: 17.2, kit: 22.0, end: 25.0 };
const sceneEnd = 28.0;
const FREEZE_AT = 7.4, REFUSE = 6.7;
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 5.6, '7 h 30. Plus rien ne charge : Internet est coupé partout.'],
  [5.9, 8.8, 'Ton café ? Carte refusée : le terminal n’arrive plus à joindre ta banque.'],
  [9.1, 11.4, 'Le distributeur non plus. Sans liquide, tu ne paies presque plus rien.'],
  [11.7, 14.2, 'À la gare, réservations et infos voyageurs passent aussi par le réseau.'],
  [14.5, 17.0, 'Ton GPS capte toujours les satellites. Mais sans carte téléchargée, ton appli est perdue.'],
  [17.3, 19.6, 'En juillet 2024, une mise à jour ratée a planté 8,5 millions d’ordinateurs.'],
  [19.7, 21.8, 'Vols annulés, hôpitaux et télés touchés. Et ce n’était même pas une panne d’Internet.'],
  [22.1, 24.8, 'Le gouvernement conseille de garder chez toi du liquide et une radio à piles.'],
];
const SINCE = { hall: '0 h 01', phone: '0 h 01', cafe: '0 h 12', dab: '0 h 20', gare: '0 h 45', gps: '2 h 10' };
const CLOCK0 = { hall: '07:30:40', phone: '07:31:02', cafe: '07:42:15', dab: '07:50:31', gare: '08:15:07', gps: '09:40:22', kit: '' };
const TEXT0 = 3.1, HOLD = { off: [0.0, 0.1, 0.045], rot: [0, 0, 0] };

export default async function () {
  const stage = createStage({ fov: 50, far: 2400, bloom: [0.3, 0.5, 0.88], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.15;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#7fd1ff');
  scene.background = new THREE.Color('#a9bccc');
  const fill = new THREE.PointLight('#fff1dc', 0, 5, 1.5); scene.add(fill);

  // --- les décors : le hall de la gare (z = -600), le parvis avec la voiture, la chambre (z = 400) pour le kit
  const GA = buildHall(scene, { at: v3(0, 0, -600) });
  const H = (x, y, z) => GA.at.clone().add(v3(x, y, z));
  const parvis = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.9 })); parvis.rotation.x = -Math.PI / 2; parvis.position.copy(H(0, 0, 30)); parvis.receiveShadow = true; scene.add(parvis);
  const car = makeSUV('#2f4a6b'); car.root.position.copy(H(-4, 0, 17)); car.root.rotation.y = 0; scene.add(car.root);
  const DRIVER = v3(-0.42, 0.25, -0.4);
  const CH = buildBedroom(scene, { at: v3(0, 0, 400) });
  const kitAt = CH.at.clone().add(v3(-1.6, 0.78, 0.4));
  makeKit(scene, kitAt).rotation.y = Math.PI / 2;
  const kitL = new THREE.PointLight('#fff0d8', 0, 4, 1.4); kitL.position.copy(kitAt).add(v3(0.8, 1.0, 0.6)); scene.add(kitL);

  // --- les personnages : toi (Remy), la serveuse du café (Kate), et la foule du hall (tout le monde regarde son téléphone)
  const CROWD_N = ['Brian', 'Jody', 'Joe', 'Josh', 'Adam', 'Leonard', 'James', 'Chad'];
  const CAST = await loadMixamo({ chars: ['Remy', 'Kate', ...CROWD_N], anims: ['idle', 'texting', 'lookaround', 'walk', 'driving'] });
  const A = CAST.make('Remy', { height: 1.78 }), K = CAST.make('Kate', { height: 1.66 }); scene.add(A.root, K.root);
  const PH = makePhoneScreen(); A.hold(PH.mesh, 'RightHand', HOLD);
  const r = rng(77);
  const crowd = CROWD_N.map((n, i) => {
    const P = CAST.make(n, { height: 1.65 + r() * 0.2, shadows: false }); scene.add(P.root);
    const spot = [[-1.5, 1.5], [4.2, 2.0], [0.5, -1.5], [5.5, 5.0], [-3.2, 3.8], [3, -3.5], [7, 1], [-4, -1]][i];
    P.root.position.copy(H(spot[0], 0, spot[1])); P.root.rotation.y = r() * 6.28;
    const ph = makePhoneScreen(); P.hold(ph.mesh, 'RightHand', HOLD);
    return { P, ph, kind: i % 3, off: r() * 10 };
  });
  function poseAll(ts, S) {
    const inHall = ['hall', 'phone', 'cafe', 'dab', 'gare', 'end'].includes(S);
    for (const c of crowd) {
      c.P.root.visible = inHall;
      if (!inHall) continue;
      if (c.kind === 2 && S === 'gare') c.P.pose('lookaround', ts + c.off, { Neck: [['x', -0.3]] });   // certains lèvent les yeux vers le tableau
      else c.P.pose('texting', TEXT0 + 0.1 * Math.sin(ts * 1.1 + c.off));
      c.ph.show('noco', ts + c.off);
    }
    K.root.visible = inHall; K.root.position.copy(GA.cafe).add(v3(0.4, 0, -0.75)); K.root.rotation.y = 0; K.pose('idle', ts + 3);
    PH.mesh.visible = false; A.root.visible = true;
    if (S === 'hall' || S === 'phone' || S === 'end') { A.root.position.copy(H(2, 0, 3.2)); A.root.rotation.y = 2.6; A.pose('texting', TEXT0 + 0.1 * Math.sin(ts * 1.3)); PH.mesh.visible = true; PH.show('noco', ts); return; }
    if (S === 'cafe') { A.root.position.copy(GA.cafe).add(v3(0.0, 0, 0.85)); A.root.rotation.y = Math.PI; A.pose('idle', ts, { RightArm: [['x', -0.5]], RightForeArm: [['x', -0.6]] }); return; }
    if (S === 'dab') { A.root.position.copy(GA.dabPos).add(v3(0.9, -1.45, 0.1)); A.root.rotation.y = -Math.PI / 2; A.pose('idle', ts, { Neck: [['x', 0.1]] }); return; }
    if (S === 'gare') { A.root.position.copy(H(0.5, 0, 1.5)); A.root.rotation.y = Math.PI; A.pose('lookaround', 2 + ts * 0.8, { Neck: [['x', -0.35]] }); return; }
    if (S === 'gps') { A.root.position.copy(car.root.localToWorld(DRIVER.clone())); A.root.rotation.y = car.root.rotation.y + Math.PI / 2; A.pose('driving', 1.0); return; }
    A.root.visible = false;
  }
  // l'insert : ton téléphone, filmé en gros plan sur une table grise (loin du reste)
  const INS = v3(0, 0, -1200), PHI = makePhoneScreen(); PHI.mesh.position.copy(INS).add(v3(0, 0.005, 0)); PHI.mesh.rotation.x = -Math.PI / 2; PHI.mesh.rotation.z = 0.12; scene.add(PHI.mesh);
  const tbl = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ color: '#4a4c50', roughness: 0.9 })); tbl.rotation.x = -Math.PI / 2; tbl.position.copy(INS); scene.add(tbl);
  const insL = new THREE.SpotLight('#fff1dd', 0, 4, 0.7, 0.8, 1.2); insL.position.copy(INS).add(v3(-0.4, 1.0, 0.4)); insL.target.position.copy(INS); scene.add(insL, insL.target);
  // le téléphone sur son support, dans la voiture (la carte n'a pas chargé, seul ton point bleu est là)
  const PH2 = makePhoneScreen(); car.root.add(PH2.mesh); PH2.mesh.position.set(0.55, 1.13, -0.22); PH2.mesh.rotation.set(0, -Math.PI / 2, 0); PH2.mesh.rotateX(-0.25);

  // --- le tableau d'enquête : le précédent du 19 juillet 2024
  const BRD = v3(0, 60, -900);
  const snap = (pos, look, fov = 35, w = 96, h = 56, prep) => {
    const cam = new THREE.PerspectiveCamera(fov, w / h, 0.05, 2000); cam.position.copy(pos); cam.lookAt(look); prep && prep(); scene.updateMatrixWorld(true);
    const rt = new THREE.WebGLRenderTarget(w, h); renderer.setRenderTarget(rt); renderer.render(scene, cam);
    const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null); rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), id = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 4; x++) { const v = px[(h - 1 - y) * w * 4 + x] / 255; id.data[y * w * 4 + x] = x % 4 === 3 ? 255 : Math.min(255, Math.pow(v * 1.2, 1 / 2.2) * 255); }
    g.putImageData(id, 0, 0); return c;
  };
  function makeBoard() {
    GA.on(1); poseAll(SH.gare, 'gare'); GA.board('panne', 0); GA.tpe('refuse');
    const photos = [
      snap(H(-2, 3.0, 3.5), GA.boardPos, 40),
      snap(GA.tpePos().add(v3(0.25, 0.25, 0.3)), GA.tpePos(), 34),
      snap(H(-1, 1.7, 9), H(-2, 1.2, 2), 50),
    ];
    GA.on(0); GA.board('ok'); GA.tpe('ok');
    const W = 270, Hh = 480, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.8), new THREE.MeshBasicMaterial({ map: tex, fog: false })); mesh.position.copy(BRD); scene.add(mesh);
    const CARDS = [[16, 64, '8,5 MILLIONS', 'd’ordinateurs plantés (moins de 1 % des PC Windows)'], [16, 140, '1 MISE À JOUR RATÉE', 'en ligne environ 78 minutes'], [16, 216, 'ENVIRON 4 %', 'des vols annulés dans le monde']];
    const CW = 238, CH2 = 66;
    function draw(k) {
      const gr = g.createRadialGradient(W / 2, Hh * 0.4, 20, W / 2, Hh * 0.4, Hh * 0.7); gr.addColorStop(0, '#0d3550'); gr.addColorStop(1, '#020a10');
      g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1; for (let y = 0; y < Hh; y += 12) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      g.textAlign = 'left'; g.font = '800 17px Inter'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('LE PRÉCÉDENT', 16, 30); g.fillText('19 JUILLET 2024', 16, 50);
      CARDS.forEach(([x, y, t1, t2], i) => {
        const a = clamp(k * 3.6 - i * 1.0); if (a <= 0) return;
        if (i > 0) { const kk = Math.min(1, a * 1.6); g.strokeStyle = '#7fd1ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 20, y - 10); g.lineTo(x + 20, lerp(y - 10, y, kk)); g.stroke(); }
        g.globalAlpha = a;
        g.fillStyle = 'rgba(2,10,16,0.9)'; g.fillRect(x, y, CW, CH2); g.strokeStyle = '#7fd1ff'; g.lineWidth = 2; g.strokeRect(x + 0.5, y + 0.5, CW - 1, CH2 - 1);
        g.drawImage(photos[i], x + 5, y + 5, 96, 56);
        g.fillStyle = '#fff'; g.font = '800 12px Inter'; g.fillText(t1, x + 108, y + 24); g.fillStyle = '#7fd1ff'; g.font = '700 9px Inter';
        const words = t2.split(' '); let line = '', yy = y + 40; for (const w of words) { if (g.measureText(line + w).width > 122) { g.fillText(line, x + 108, yy); line = ''; yy += 11; } line += w + ' '; } g.fillText(line, x + 108, yy);
        g.globalAlpha = 1;
      });
      const b = clamp(k * 3 - 2.0);
      g.globalAlpha = b; g.font = '800 13px Inter'; g.fillStyle = '#fff'; g.fillText('CE N’ÉTAIT PAS INTERNET :', 16, 380); g.fillStyle = '#7fd1ff'; g.fillText('JUSTE UN LOGICIEL', 16, 398);
      g.font = '600 9px Inter'; g.fillStyle = 'rgba(210,235,255,0.8)'; g.fillText('SOURCES : MICROSOFT · AFP', 16, 416); g.globalAlpha = 1;
      tex.needsUpdate = true;
    }
    draw(0);
    return { mesh, draw };
  }
  const board = makeBoard();

  // --- l'arrêt sur image : le terminal de paiement
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 4.4, title: 'ARRÊT SUR IMAGE · LE TERMINAL', tags: [
      { at: () => GA.tpePos(), title: 'SANS RÉSEAU', lines: ['paiement', 'refusé'], risk: 'grave', side: 'right', dy: -200 },
      { at: () => GA.tpePos().add(v3(0, 0, 0.05)), title: 'LE TERMINAL', lines: ['il doit demander', 'l’accord de ta banque'], risk: 'mal', side: 'left', dy: -40 },
      { at: () => GA.tpePos().add(v3(0, 0, 0.09)), title: 'CERTAINES CARTES', lines: ['passent hors ligne,', 'jusqu’à un plafond'], risk: 'info', side: 'right', dy: 140 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // =====================================================================
  //  LES PLANS
  // =====================================================================
  const R = (x, y, z) => CH.at.clone().add(v3(x, y, z));
  const SHOTS = [
    { id: 'hall', t0: SH.hall, cam: (u) => ({ p: H(lerp(4.6, 4.1, u), 1.7, lerp(9.6, 9.0, u)), l: H(0.2, 2.0, 0.2), fov: 54 }) },
    { id: 'phone', t0: SH.phone, near: 0.02, cam: (u) => ({ p: INS.clone().add(v3(lerp(0.05, 0.03, u), lerp(0.26, 0.21, u), lerp(0.12, 0.09, u))), l: INS.clone().add(v3(0, 0, 0.0)), fov: 40 }), dof: ['ins', 0.03] },
    { id: 'cafe', t0: SH.cafe, near: 0.02, cam: (u) => { const c = GA.tpePos(); return { p: c.clone().add(v3(lerp(0.05, 0.03, u), lerp(0.3, 0.25, u), lerp(0.2, 0.16, u))), l: c.clone().add(v3(0, -0.01, 0.03)), fov: 38 }; }, dof: ['tpe', 0.02] },
    { id: 'dab', t0: SH.dab, cam: (u) => ({ p: GA.dabPos.clone().add(v3(lerp(3.2, 2.8, u), 0.1, lerp(2.4, 2.0, u))), l: GA.dabPos.clone().add(v3(0.4, 0.2, 0)), fov: 46 }) },
    { id: 'gare', t0: SH.gare, cam: (u) => ({ p: H(lerp(-2.6, -2.3, u), 1.35, lerp(6.8, 6.1, u)), l: H(-2.0, 4.2, -9), fov: 56 }) },
    { id: 'gps', t0: SH.gps, near: 0.02, cam: (u) => ({ p: car.root.localToWorld(v3(lerp(-0.12, -0.05, u), 1.3, -0.12)), l: PH2.mesh.getWorldPosition(v3(0, 0, 0)), fov: lerp(46, 40, u) }), dof: ['phone2', 0.02], fill: 0.3 },
    { id: 'tableau', t0: SH.tableau, cam: (u) => ({ p: BRD.clone().add(v3(lerp(-0.5, 0.25, u), lerp(0.25, -0.1, u), lerp(6.6, 5.8, sm(0, 1, u)))), l: BRD.clone().add(v3(lerp(-0.1, 0.05, u), lerp(0.1, -0.15, u), 0)), fov: 46, up: v3(Math.sin(lerp(-0.04, 0.03, u)), 1, 0).normalize() }) },
    { id: 'kit', t0: SH.kit, near: 0.03, cam: (u) => ({ p: kitAt.clone().add(v3(lerp(0.95, 0.8, u), lerp(0.75, 0.62, u), lerp(0.35, 0.3, u))), l: kitAt.clone().add(v3(0, 0.1, 0.05)), fov: 44 }), dof: ['kit', 0.02] },
    { id: 'end', t0: SH.end, cam: () => ({ p: H(4.6, 1.7, 9.6), l: H(0.2, 2.0, 0.2), fov: 54 }) },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };
  const cafeL = new THREE.PointLight('#ffe6c4', 0, 9, 1.3); cafeL.position.copy(GA.cafe).add(v3(0.3, 2.4, 1.0)); scene.add(cafeL);
  const LIGHTS = [GA.sun, fill, kitL, CH.winL, cafeL, insL];

  function update(t) {
    const ts = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts - S.t0) / (nextT(S) - S.t0));
    poseAll(ts, S.id);
    const outside = S.id !== 'kit' && S.id !== 'tableau';
    insL.intensity = S.id === 'phone' ? 6 : 0; PHI.show('noco', ts);
    GA.on(outside && S.id !== 'phone' ? 1 : 0); cafeL.intensity = ['cafe', 'hall', 'end', 'gare'].includes(S.id) ? 22 : 0; kitL.intensity = S.id === 'kit' ? 3.5 : 0; CH.amb.intensity = S.id === 'kit' ? 0.6 : 0; CH.winL.intensity = S.id === 'kit' ? 25 : 0; CH.view('jour');
    GA.board(ts > SH.gare - 0.5 ? 'panne' : 'ok', ts); GA.tpe(ts > REFUSE ? 'refuse' : 'ok'); PH2.show('map', ts);
    scene.background.set(S.id === 'kit' ? '#101114' : '#a9bccc');
    // la caméra
    const C = S.cam(u);
    camera.near = S.near ?? 0.1; camera.fov = C.fov; camera.up.copy(C.up ?? v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    const fz = FZ.active(t);
    if (fz) { camera.updateMatrixWorld(); const tp = GA.tpePos().project(camera); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.1, k); }
    camera.updateProjectionMatrix();
    const d = S.dof || [0]; let focus = d[0];
    const target = { ins: () => INS, phone: () => PH.mesh.getWorldPosition(v3(0, 0, 0)), tpe: () => GA.tpePos(), phone2: () => PH2.mesh.getWorldPosition(v3(0, 0, 0)), kit: () => kitAt.clone().add(v3(0, 0.1, 0)) }[focus]; if (target) focus = camera.position.distanceTo(target());
    PS.dof(frozen ? 0 : focus, d[1] ?? 0.02); PS.look('normal', { sat: 0.8 });
    fill.intensity = S.fill ?? 0; fill.position.copy(camera.position).add(v3(0, 0.3, 0));
    for (const l of LIGHTS) l.visible = l.intensity > 0;
    board.draw(clamp((ts - SH.tableau - 0.2) / 2.8));

    // --- textes
    HUD.hook(t, 'Et si <em>Internet</em> s’arrêtait<br>partout pendant 24 h ?', T.hookOut);
    const c0 = CLOCK0[S.id]; let clk = '';
    if (c0) { const [hh, mm, ss] = c0.split(':').map(Number), s = hh * 3600 + mm * 60 + ss + Math.floor(ts - S.t0); clk = `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }
    const lab = { hall: 'LYON PART-DIEU · CAM 01', phone: 'LYON PART-DIEU · CAM 02', cafe: 'LYON PART-DIEU · CAM 03', dab: 'LYON PART-DIEU · CAM 04', gare: 'LYON PART-DIEU · CAM 01', gps: 'PARVIS · CAM 05', tableau: 'LE PRÉCÉDENT', kit: 'LE BON RÉFLEXE', end: '' }[S.id];
    HUD.live(t, lab, clk, 'SIMULATION');
    const since = SINCE[S.id];
    if (since) HUD.block(1, { label: 'SANS INTERNET DEPUIS', value: since, sub: '', color: '#ff5a4f' });
    else if (S.id === 'kit') HUD.block(1, { label: 'KIT D’URGENCE', value: '72 h', sub: 'LIQUIDE · RADIO · EAU', color: '#7fd1ff' });
    HUD.show2(false);
    document.getElementById('tl').style.opacity = (since || S.id === 'kit') && !frozen ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    HUD.subs(t, SUBS_V);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : MICROSOFT · AFP · INFO.GOUV.FR · CONNECTBANQUE', q: 'Et toi, tu tiendrais<br>24 h ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)), refuse: FZ.realT(REFUSE) }) };
}

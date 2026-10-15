// =====================================================================
//  « Et si tu gagnais à l'EuroMillions ? » — format RECONSTITUTION (plans courts + rendu PS2) avec l'EFFET MULTIPLICATION
//  Le tabac du village, mardi soir : tu joues une grille (2,50 €). L'effet multiplication : toutes les grilles possibles,
//  ça fait une montagne de billets (350 M€), plus haute que le plus gros jackpot possible (250 M€). 21 h 05 : le tirage à la télé,
//  tout est bon (arrêt sur image sur le ticket). Tu appelles la FDJ. Le tableau : tes vraies chances.
//
//  Faits (vérifiés le 15/10/2026, sources dans la légende) :
//   - la grille simple coûte 2,50 € (avec un code My Million) ; tirages le mardi et le vendredi, vers 21 h 05 ; jackpot minimum
//     17 M€ (FDJ, « Comment jouer ») ; plafond 250 M€ (FDJ, dossier de presse des 20 ans, nov. 2024) ;
//   - 5 numéros sur 50 et 2 étoiles sur 12 : C(50,5) × C(12,2) = 2 118 760 × 66 = 139 838 160 grilles (calcul) ;
//     tout jouer : 139 838 160 × 2,50 € = 349 595 400 € ; à 2 tirages par semaine (104 par an), il faut en moyenne
//     139 838 160 tirages, soit environ 1,34 million d'années (calcul) ;
//   - gain de 500 000 € ou plus : appeler le service client FDJ, mise en relation avec l'équipe « Accompagnement et Expérience
//     Gagnants » ; 60 jours pour réclamer un gain (FDJ, « Comment percevoir mes gains ? », 22/07/2025) ;
//   - My Million : 1 gagnant d'1 million d'euros garanti en France à chaque tirage (FDJ).
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, fr } from '../../engine.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2, pixTex } from '../../lib-ps2.js';
import { buildBedroom } from '../../lib-nuit.js';
import { buildTabac, makeTicket, makeTV } from '../../lib-tabac.js';
import { makeBundle, makePile, makeEquation } from '../../lib-multiply.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SH = { tabac: 0, ticket: 3.0, multi: 5.8, tirage: 15.0, check: 17.6, appel: 20.6, tableau: 23.6, end: 27.8 };
const sceneEnd = 30.8;
const FREEZE_AT = 19.0;
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 5.6, 'Mardi, 19 h. Tu joues une grille : 2,50 €.'],
  [5.9, 8.6, 'Pour gagner, il faut 5 bons numéros sur 50 et 2 étoiles sur 12.'],
  [8.8, 11.6, 'Ça fait 139 838 160 grilles possibles. Toutes les jouer coûterait 350 millions d’euros.'],
  [11.8, 14.8, 'C’est plus que le plus gros jackpot possible : 250 millions. Tu perdrais 100 millions.'],
  [15.1, 17.4, '21 h 05, le tirage.'],
  [17.7, 20.4, 'Et là, miracle : tout est bon.'],
  [20.7, 23.4, 'Au-dessus de 500 000 €, tu appelles la FDJ : une équipe s’occupe des grands gagnants.'],
  [23.7, 25.6, 'Mais ta vraie chance, c’est 1 sur 139 838 160.'],
  [25.7, 27.6, 'En jouant 2 fois par semaine, il faudrait en moyenne 1,3 million d’années.'],
];
const NUMS = [7, 12, 23, 34, 45], STARS = [3, 9];
const GRILLES = 139838160, ALL = GRILLES * 2.5, MAXJ = 250e6, BUNDLE = 10000;
const CLOCK0 = { tabac: '19:02:11', ticket: '19:02:40', tirage: '21:05:02', check: '21:06:30', appel: '21:09:12', end: '' };
const TEXT0 = 3.1, HOLD = { off: [0.0, 0.1, 0.045], rot: [0, 0, 0] };

export default async function () {
  const stage = createStage({ fov: 50, far: 2400, bloom: [0.35, 0.5, 0.85], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.25;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  scene.background = new THREE.Color('#07080c');
  const hemi = new THREE.HemisphereLight('#3a4466', '#0e0d0b', 0.3); scene.add(hemi);
  const fill = new THREE.PointLight('#fff1dc', 0, 5, 1.5); scene.add(fill);

  // --- les décors : le tabac (z = -300), la chambre-salon (z = 400), le « studio » de l'effet multiplication (x = 300)
  const TB = buildTabac(scene, { at: v3(0, 0, -300) });
  const CH = buildBedroom(scene, { at: v3(0, 0, 400) });
  const bedLamp = new THREE.PointLight('#ffb867', 0, 4.5, 1.5); bedLamp.position.copy(CH.at).add(v3(0.2, 0.9, -0.2)); scene.add(bedLamp);
  const TV = makeTV({ nums: NUMS, stars: STARS }); TV.root.position.copy(CH.at).add(v3(-1.62, 0.775, 0.45)); TV.root.rotation.y = Math.PI / 2; scene.add(TV.root);
  const ST = v3(300, 0, 0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#15161a', roughness: 0.55, metalness: 0.2 })); floor.rotation.x = -Math.PI / 2; floor.position.copy(ST); floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.SpotLight('#fff0d6', 0, 60, 0.55, 0.65, 1.6); key.position.copy(ST).add(v3(3.5, 9, 6)); key.target.position.copy(ST).add(v3(0, 0.5, 0)); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#8fb2ff', 0); rim.position.copy(ST).add(v3(-6, 5, -8)); rim.target.position.copy(ST); scene.add(rim, rim.target);

  // --- l'effet multiplication : le ticket seul, puis les billets de toutes les grilles (350 M€), puis le plus gros jackpot (250 M€)
  const B = makeBundle();
  const NA = Math.round(ALL / BUNDLE), NB = Math.round(MAXJ / BUNDLE);
  const PA = ST.clone().add(v3(-1.0, 0, 0)), PB = ST.clone().add(v3(1.25, 0, 0));
  const T_A0 = SH.multi + 1.4, T_A1 = SH.multi + 5.0, T_B0 = SH.multi + 6.2, T_B1 = SH.multi + 7.6;
  const pileA = makePile(scene, { geo: B.geo, mats: B.mats, count: NA, nx: 10, nz: 20, t0: T_A0, t1: T_A1, x: PA.x, z: PA.z, seed: 3 });
  const pileB = makePile(scene, { geo: B.geo, mats: B.mats, count: NB, nx: 10, nz: 20, t0: T_B0, t1: T_B1, x: PB.x, z: PB.z, seed: 4 });
  const hero = makeTicket({ nums: NUMS, stars: STARS }); hero.mesh.scale.setScalar(3.2); hero.mesh.position.copy(ST).add(v3(0, 0.26, 0.6)); scene.add(hero.mesh);
  const eq1 = makeEquation([{ label: 'GRILLES', value: fr(GRILLES) }, '×', { label: 'LA GRILLE', value: '2,50 €' }, '=', { label: 'TOUT JOUER', value: '350 M€', color: '#ffcf6b' }]);
  const eq2 = makeEquation([{ label: 'TOUT JOUER', value: '350 M€' }, '−', { label: 'JACKPOT MAX', value: '250 M€' }, '=', { label: 'TU PERDS', value: '100 M€', color: '#ff5a4f' }]);

  // --- les personnages : toi (Remy) et la buraliste (Kate)
  const CAST = await loadMixamo({ chars: ['Remy', 'Kate'], anims: ['idle', 'sit', 'texting', 'phone', 'lookaround'] });
  const A = CAST.make('Remy', { height: 1.78 }), K = CAST.make('Kate', { height: 1.66 });
  scene.add(A.root, K.root);
  const TK = makeTicket({ nums: NUMS, stars: STARS }); A.hold(TK.mesh, 'RightHand', HOLD);
  const TKc = makeTicket({ nums: NUMS, stars: STARS }); TKc.mesh.rotation.x = -Math.PI / 2; TKc.mesh.rotation.z = 0.25; TKc.mesh.position.copy(TB.counterTop).add(v3(0.05, 0.003, 0.05)); scene.add(TKc.mesh);
  const SEAT = CH.at.clone().add(v3(0.55, 0, 0.45)), SEAT_RY = -Math.PI / 2;   // assis au bord du lit, face à la télé (vers -x)
  function poseAll(ts, S) {
    TK.mesh.visible = false; K.root.visible = S === 'tabac' || S === 'ticket' || S === 'end';
    K.root.position.copy(TB.clerk); K.root.rotation.y = 0; K.pose('idle', ts + 2);
    if (S === 'tabac' || S === 'ticket' || S === 'end') { A.root.position.copy(TB.counterFront); A.root.rotation.y = Math.PI; A.pose('idle', ts); return; }
    if (S === 'multi') { A.root.position.copy(ST).add(v3(0.15, 0, 1.5)); A.root.rotation.y = -0.2; A.pose([['lookaround', 1.5 + (ts - SH.multi) * 0.6, 0.6], ['idle', ts, 0.4]], { Neck: [['x', -0.25 * sm(T_A0, T_A1, ts)]] }); return; }
    if (S === 'tirage' || S === 'check') {   // assis devant la télé, le ticket à la main ; au moment où tout est bon, tu te redresses
      A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY; TK.mesh.visible = true;
      const up = sm(FREEZE_AT - 0.4, FREEZE_AT, ts);
      A.pose([['sit', 2.0, 1, LOWER], ['texting', TEXT0 + 0.08 * Math.sin(ts * 1.4), 1, UPPER]], { Neck: [['x', 0.1 - 0.15 * up]], Spine: [['x', -0.12 * up]] }); return;
    }
    if (S === 'appel' || S === 'tableau') { A.root.position.copy(CH.at).add(v3(-0.1 + 0.25 * Math.sin((ts - SH.appel) * 0.9), 0, 0.3)); A.root.rotation.y = 0.6 + 0.5 * Math.sin((ts - SH.appel) * 0.9); A.pose('phone', 3 + (ts - SH.appel)); return; }
  }

  // --- le tableau d'enquête : tes vraies chances
  const BRD = v3(0, 60, -900);
  const snap = (pos, look, fov = 35, w = 96, h = 56, prep) => {
    const cam = new THREE.PerspectiveCamera(fov, w / h, 0.05, 2000); cam.position.copy(pos); cam.lookAt(look); prep && prep(); scene.updateMatrixWorld(true);
    const rt = new THREE.WebGLRenderTarget(w, h); renderer.setRenderTarget(rt); renderer.render(scene, cam);
    const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null); rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), id = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 4; x++) { const v = px[(h - 1 - y) * w * 4 + x] / 255; id.data[y * w * 4 + x] = x % 4 === 3 ? 255 : Math.min(255, Math.pow(v * 1.5, 1 / 2.2) * 255); }
    g.putImageData(id, 0, 0); return c;
  };
  function makeBoard() {
    TB.on(1); key.intensity = 190; rim.intensity = 1.1; pileA.update(T_A1 + 1); pileB.update(T_B1 + 1); bedLamp.intensity = 3; TV.draw(7); TV.light.intensity = 2;
    poseAll(SH.tabac, 'tabac');
    const photos = [
      snap(TKc.mesh.position.clone().add(v3(0.0, 0.2, 0.12)), TKc.mesh.position, 34),
      snap(ST.clone().add(v3(0.1, 2.0, 6.5)), ST.clone().add(v3(0.1, 0.9, 0)), 30),
      snap(CH.at.clone().add(v3(0.4, 1.2, 0.9)), CH.at.clone().add(v3(-1.62, 1.05, 0.45)), 36),
    ];
    TB.on(0); key.intensity = 0; rim.intensity = 0; pileA.update(0); pileB.update(0); bedLamp.intensity = 0; TV.draw(0); TV.light.intensity = 0;
    const W = 270, H = 480, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.8), new THREE.MeshBasicMaterial({ map: tex, fog: false })); mesh.position.copy(BRD); scene.add(mesh);
    const CARDS = [[16, 64, '1 CHANCE SUR', '139 838 160'], [16, 140, 'TOUT JOUER : 350 M€', 'plus que le jackpot max (250 M€)'], [16, 216, '2 FOIS PAR SEMAINE', 'en moyenne 1,3 million d’années']];
    const CW = 238, CH2 = 66;
    function draw(k) {
      const gr = g.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, H * 0.7); gr.addColorStop(0, '#0c4a2a'); gr.addColorStop(1, '#020c06');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1; for (let y = 0; y < H; y += 12) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      g.textAlign = 'left'; g.font = '800 17px Inter'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('TES VRAIES', 16, 30); g.fillText('CHANCES', 16, 50);
      CARDS.forEach(([x, y, t1, t2], i) => {
        const a = clamp(k * 3.6 - i * 1.0); if (a <= 0) return;
        if (i > 0) { const kk = Math.min(1, a * 1.6); g.strokeStyle = '#ffcf6b'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 20, y - 10); g.lineTo(x + 20, lerp(y - 10, y, kk)); g.stroke(); }
        g.globalAlpha = a;
        g.fillStyle = 'rgba(2,12,6,0.9)'; g.fillRect(x, y, CW, CH2); g.strokeStyle = '#ffcf6b'; g.lineWidth = 2; g.strokeRect(x + 0.5, y + 0.5, CW - 1, CH2 - 1);
        g.drawImage(photos[i], x + 5, y + 5, 96, 56);
        g.fillStyle = '#fff'; g.font = '800 11px Inter'; g.fillText(t1, x + 108, y + 26); g.fillStyle = '#ffcf6b'; g.font = i === 0 ? '800 15px Inter' : '700 9px Inter';
        const words = t2.split(' '); let line = '', yy = y + (i === 0 ? 47 : 42); for (const w of words) { if (g.measureText(line + w).width > 122) { g.fillText(line, x + 108, yy); line = ''; yy += 12; } line += w + ' '; } g.fillText(line, x + 108, yy);
        g.globalAlpha = 1;
      });
      const b = clamp(k * 3 - 2.0);
      g.globalAlpha = b; g.font = '800 13px Inter'; g.fillStyle = '#fff'; g.fillText('MY MILLION : 1 MILLIONNAIRE', 16, 380); g.fillStyle = '#ffcf6b'; g.fillText('EN FRANCE À CHAQUE TIRAGE', 16, 398);
      g.font = '600 9px Inter'; g.fillStyle = 'rgba(220,255,230,0.8)'; g.fillText('SOURCES : FDJ · CALCUL DES PROBABILITÉS', 16, 416); g.globalAlpha = 1;
      tex.needsUpdate = true;
    }
    draw(0);
    return { mesh, draw };
  }
  const board = makeBoard();

  // --- l'arrêt sur image : le ticket gagnant
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 4.4, title: 'ARRÊT SUR IMAGE · TON TICKET', tags: [
      { at: () => TK.pt(2), title: '5 NUMÉROS', lines: ['tous bons,', 'parmi 50'], risk: 'ok', side: 'right', dy: -220 },
      { at: () => TK.pt(5), title: '2 ÉTOILES', lines: ['les 2 bonnes,', 'parmi 12'], risk: 'ok', side: 'left', dy: -60 },
      { at: () => TK.mesh.localToWorld(v3(0, -0.045, 0.002)), title: 'DÉLAI', lines: ['60 jours pour', 'réclamer ton gain'], risk: 'info', side: 'right', dy: 150 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // =====================================================================
  //  LES PLANS
  // =====================================================================
  const R = (x, y, z) => CH.at.clone().add(v3(x, y, z));
  const P = (x, y, z) => TB.at.clone().add(v3(x, y, z));
  const S0 = (x, y, z) => ST.clone().add(v3(x, y, z));
  const SHOTS = [
    { id: 'tabac', t0: SH.tabac, cam: (u) => ({ p: P(lerp(-1.9, -1.6, u), 1.6, lerp(2.0, 1.8, u)), l: P(0.3, 1.25, -0.9), fov: 54 }) },
    { id: 'ticket', t0: SH.ticket, near: 0.02, cam: (u) => ({ p: TKc.mesh.position.clone().add(v3(lerp(0.0, 0.02, u), lerp(0.24, 0.2, u), lerp(0.2, 0.16, u))), l: TKc.mesh.position.clone(), fov: 40 }), dof: ['ticketc', 0.03], fill: 0.6 },
    { id: 'multi', t0: SH.multi, near: 0.03, cam: (u) => { const k = sm(0.08, 0.6, u); return { p: S0(lerp(0.05, 0.2, k), lerp(0.42, 2.3, k), lerp(1.35, 7.2, k)), l: S0(lerp(0.0, 0.1, k), lerp(0.28, 0.95, k), lerp(0.6, 0, k)), fov: lerp(38, 46, k) }; } },
    { id: 'tirage', t0: SH.tirage, cam: (u) => ({ p: R(lerp(1.55, 1.4, u), 1.25, lerp(0.95, 0.85, u)), l: R(-1.62, 1.05, 0.45), fov: 50 }), dof: ['tv', 0.012] },
    { id: 'check', t0: SH.check, near: 0.02, cam: (u) => { const c = TK.mesh.getWorldPosition(v3(0, 0, 0)); const n = v3(0, 0, 1).applyQuaternion(TK.mesh.getWorldQuaternion(new THREE.Quaternion())); return { p: c.clone().addScaledVector(n, lerp(0.34, 0.28, u)).add(v3(0, 0.03, 0)), l: c, fov: 40 }; }, fill: 0.7, dof: ['ticket', 0.03] },
    { id: 'appel', t0: SH.appel, cam: (u) => ({ p: R(lerp(1.4, 1.2, u), 1.55, lerp(1.9, 1.7, u)), l: R(-0.2, 1.35, 0.0), fov: 50 }), fill: 0.5 },
    { id: 'tableau', t0: SH.tableau, cam: (u) => ({ p: BRD.clone().add(v3(lerp(-0.5, 0.25, u), lerp(0.25, -0.1, u), lerp(6.6, 5.8, sm(0, 1, u)))), l: BRD.clone().add(v3(lerp(-0.1, 0.05, u), lerp(0.1, -0.15, u), 0)), fov: 46, up: v3(Math.sin(lerp(-0.04, 0.03, u)), 1, 0).normalize() }) },
    { id: 'end', t0: SH.end, cam: () => ({ p: P(-1.9, 1.6, 2.0), l: P(0.3, 1.25, -0.9), fov: 54 }) },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };
  const LIGHTS = [...TB.lights, bedLamp, TV.light, key, rim, fill, CH.winL];

  function update(t) {
    const ts = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts - S.t0) / (nextT(S) - S.t0));
    const shop = ['tabac', 'ticket', 'end'].includes(S.id), room = ['tirage', 'check', 'appel'].includes(S.id), multi = S.id === 'multi';
    poseAll(ts, S.id);
    // les lumières de chaque décor (on retire celles des autres décors)
    TB.on(shop ? 1 : 0); bedLamp.intensity = room ? 2.6 : 0; CH.winL.intensity = room ? 6 : 0; CH.amb.intensity = room ? 0.2 : 0; key.intensity = multi ? 190 : 0; rim.intensity = multi ? 1.1 : 0;
    hemi.intensity = multi ? 0.4 : 0.3;
    // la télé : les boules sortent une par une pendant le tirage ; le ticket se coche pendant la vérification
    const balls = S.id === 'tirage' ? 1 + 6 * clamp((ts - SH.tirage - 0.3) / 2.0) : room ? 7 : 0; TV.draw(balls); TV.light.intensity = room ? 1.8 : 0;
    TK.mark(S.id === 'check' ? 7 * clamp((ts - SH.check - 0.1) / 1.1) : S.id === 'tirage' ? 0 : 7);
    // l'effet multiplication
    const nA = pileA.update(multi ? ts : 0), nB = pileB.update(multi ? ts : 0);
    hero.mesh.visible = multi && ts < T_A0 + 0.6; hero.mesh.rotation.y = (ts - SH.multi) * 0.6; hero.mark(0);
    eq1.opacity(multi ? sm(SH.multi + 3.0, SH.multi + 3.4, ts) * (1 - sm(T_B0 - 0.2, T_B0, ts)) : 0); eq2.opacity(multi ? sm(T_B0 + 0.4, T_B0 + 0.8, ts) : 0);
    eq1.set(0, fr(Math.round(GRILLES * nA / NA)));
    // la caméra
    const C = S.cam(u);
    camera.near = S.near ?? 0.1; camera.fov = C.fov; camera.up.copy(C.up ?? v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    const fz = FZ.active(t);
    if (fz) { camera.updateMatrixWorld(); const tp = TK.mesh.getWorldPosition(v3(0, 0, 0)).project(camera); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.1, k); }
    camera.updateProjectionMatrix();
    const d = S.dof || [0]; let focus = d[0];
    const target = { ticketc: () => TKc.mesh.position, ticket: () => TK.mesh.getWorldPosition(v3(0, 0, 0)), tv: () => TV.root.position.clone().add(v3(0, 0.3, 0)) }[focus]; if (target) focus = camera.position.distanceTo(target());
    PS.dof(frozen ? 0 : focus, d[1] ?? 0.02); PS.look('normal', { sat: 0.85 });
    fill.intensity = S.fill ?? 0; fill.position.copy(camera.position).add(v3(0, 0.3, 0));
    for (const l of LIGHTS) l.visible = l.intensity > 0;
    board.draw(clamp((ts - SH.tableau - 0.2) / 2.8));

    // --- textes
    HUD.hook(t, 'Et si tu gagnais<br>à l’<em>EuroMillions</em> ?', T.hookOut);
    const c0 = CLOCK0[S.id]; let clk = '';
    if (c0) { const [hh, mm, ss] = c0.split(':').map(Number), s = hh * 3600 + mm * 60 + ss + Math.floor(ts - S.t0); clk = `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }
    const lab = { tabac: 'TABAC DU VILLAGE · CAM 01', ticket: 'TABAC DU VILLAGE · CAM 02', multi: 'TOUTES LES GRILLES', tirage: 'CHEZ TOI · CAM 03', check: 'CHEZ TOI · CAM 04', appel: 'CHEZ TOI · CAM 03', tableau: 'LES CHIFFRES', end: '' }[S.id];
    HUD.live(t, lab, clk, 'SIMULATION');
    if (multi) {
      const k = nA / NA; HUD.block(1, { label: 'GRILLES POSSIBLES', value: fr(Math.round(GRILLES * k)), sub: '', color: '#fff' });
      HUD.block(2, { label: 'POUR TOUT JOUER', value: `${fr(Math.round(ALL * k))} €`, sub: nB > 0 ? `JACKPOT MAX : ${fr(Math.round(MAXJ * nB / NB))} €` : '', color: '#ffcf6b', subColor: '#ff8a7a' }); HUD.show2(ts > T_A0);
    } else if (S.id === 'ticket') { HUD.block(1, { label: 'TA MISE', value: '2,50 €', sub: '1 GRILLE' }); HUD.show2(false); }
    else if (S.id === 'appel') { HUD.block(1, { label: 'GAIN DE 500 000 € OU PLUS', value: 'FDJ', sub: 'ÉQUIPE DES GRANDS GAGNANTS', color: '#ffcf6b' }); HUD.show2(false); }
    else HUD.show2(false);
    document.getElementById('tl').style.opacity = (multi && ts > T_A0 - 0.2) || S.id === 'ticket' || S.id === 'appel' ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    HUD.subs(t, SUBS_V);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : FDJ · CALCUL DES PROBABILITÉS', q: 'Et toi, tu ferais quoi<br>en premier ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)),
    pileA: [FZ.realT(T_A0), FZ.realT(T_A1)], pileB: [FZ.realT(T_B0), FZ.realT(T_B1)], balls: [FZ.realT(SH.tirage + 0.3), FZ.realT(SH.tirage + 2.3)], marks: [FZ.realT(SH.check + 0.1), FZ.realT(SH.check + 1.2)] }) };
}

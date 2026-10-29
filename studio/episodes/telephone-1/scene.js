// =====================================================================
//  « Et si tu lâchais ton téléphone pendant 30 jours ? » — PARTIE 1 (jours 0 à 7). Format RECONSTITUTION en 2 parties
//  (scénario validé par Curtis le 27/10/2026). Sarah, 22 ans, étudiante à Bordeaux, éteint son téléphone et le range dans
//  le tiroir de sa table de nuit. Deux caméras fixes de surveillance : sa chambre (CAM 01), les quais de la Garonne devant
//  la place de la Bourse (CAM 02). La caméra ne bouge jamais ; elle zoome parfois (zoom numérique, comme une vraie caméra
//  de surveillance) : sur le tiroir au jour 0, sur Sarah au jour 3.
//  Jour 3, 3 h du matin : elle ne dort pas, elle fixe le tiroir ; elle a cru sentir son téléphone vibrer… alors qu'il est
//  éteint (arrêt sur image). Jour 7, 23 h : on frappe à sa porte. « Partie 2 demain à 18 h ».
//
//  Faits (vérifiés le 29/10/2026 sur les articles eux-mêmes, sources dans la légende) :
//   - Castelo, Kushlev, Ward, Esterman & Reiner, « Blocking mobile internet on smartphones improves sustained attention,
//     mental health, and subjective well-being », PNAS Nexus 4(2), pgaf017, février 2025 : 467 participants, 2 semaines
//     avec tout l'internet du téléphone bloqué (appels et SMS toujours possibles) ; avant : 314 min (5 h 14) d'écran par
//     jour en moyenne dans le 1er groupe ; sans internet mobile, ils ont passé plus de temps à voir des gens en vrai, à faire
//     du sport et dans la nature (résumé de l'article).
//   - Drouin, Kaiser & Miller, « Phantom vibrations among undergraduates: Prevalence and associated psychological
//     characteristics », Computers in Human Behavior 28(4), 1490-1496, 2012 : 89 % des 290 étudiants interrogés avaient
//     déjà ressenti une vibration fantôme (en moyenne une fois toutes les 2 semaines).
//   - Clayton, Leshner & Almond, « The Extended iSelf », Journal of Computer-Mediated Communication 20(2), 2015 : quand leur
//     iPhone sonnait sans qu'ils puissent répondre, le rythme cardiaque et la tension des participants montaient.
//  Sarah, ses 5 heures par jour, Maëlle et ses messages sont une HISTOIRE plausible.
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad } from '../../engine.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2 } from '../../lib-ps2.js';
import { makeSkyDome } from '../../lib-villa.js';
import { buildChambre, buildQuais, makePhone, makeBook } from '../../lib-bordeaux.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// --- la partition (temps de SCÈNE) : un plan = un moment de l'histoire, filmé par l'une des deux caméras fixes
const SH = { j0: 0, j1: 17.2, j2: 20.9, j3: 24.5, j4: 35.5, j5: 39.8, j5b: 47.5, msg: 51.0, j7: 57.9, end: 67.0 };
const sceneEnd = 71.0, FREEZE_AT = 29.9, KNOCK = 61.6;
const DRAWER = { reach: 13.7, open: 14.3, put: 14.9, close: 15.7, back: 16.4 };   // le téléphone part dans le tiroir
// jour 3 : allongée, les yeux ouverts ; elle se redresse ; (saut d'image) assise au bord du lit, elle fixe le tiroir ;
// la vibration (qu'elle croit sentir) ; sa main part vers le tiroir ; (arrêt sur image) ; elle la retire ; (saut d'image) recouchée
const N3 = { up: 25.4, jump: 26.3, buzz: 27.2, a: 28.3, b: 29.7, back: 33.6 };
const BED = v3(-1.47, 0.0, -0.92);                                                   // allongée dans le lit (la tête vers l'oreiller)
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 6.3, 'Dimanche soir, à Bordeaux. Sarah, 22 ans, étudiante.'],
  [6.5, 9.7, 'Plus de 5 heures par jour sur son téléphone.'],
  [9.9, 13.3, 'En 2025, une étude a proposé à 467 volontaires de couper l’internet de leur téléphone.'],
  [13.5, 17.0, 'Sarah, elle, va plus loin : elle éteint tout. Le téléphone part au fond d’un tiroir, pour 30 jours.'],
  [17.3, 20.7, 'Jour 1. Sa main cherche son téléphone dans sa poche. Toute la journée.'],
  [21.0, 24.3, 'Jour 2. Elle a peur de tout rater : les messages, les soirées, les nouvelles.'],
  [24.6, 26.3, 'Jour 3, 3 h du matin. Sarah ne dort pas.'],
  [26.5, 29.8, 'Elle fixe le tiroir. Elle a cru sentir son téléphone vibrer.'],
  [29.9, 31.9, 'Il est éteint. Ça a un nom : la vibration fantôme.'],
  [32.1, 35.3, 'Elle n’ouvre pas le tiroir. Elle se recouche.'],
  [35.6, 39.3, 'Jour 4. Elle s’ennuie. Vraiment. Alors elle sort.'],
  [39.9, 43.3, 'Jour 5, sur les quais de la Garonne. Pas d’écouteurs, pas de photo.'],
  [43.5, 47.3, 'Selon l’étude, sans internet mobile, les gens voyaient plus de monde en vrai.'],
  [47.6, 50.8, 'Sarah reste une heure sur ce banc. Juste à regarder la Garonne.'],
  [51.1, 54.5, 'Pendant ce temps, ses amis lui écrivent. Elle ne voit rien.'],
  [54.7, 57.7, 'Maëlle, sa meilleure amie, n’a plus de nouvelles depuis 7 jours.'],
  [58.0, 61.3, 'Jour 7, 23 h. Sarah lit un livre. Le premier depuis des mois.'],
  [61.6, 64.0, 'On frappe à sa porte.'],
  [64.2, 66.7, 'Personne n’a pu la prévenir : elle n’a plus de téléphone.'],
];
// l'heure affichée au début de chaque plan, et le jour
const CLOCK0 = { j0: [0, '21:04:12'], j1: [1, '10:12:40'], j2: [2, '18:40:05'], j3: [3, '03:04:11'], j4: [4, '15:20:31'], j5: [5, '16:41:02'], j5b: [5, '17:46:20'], msg: [7, '22:41:00'], j7: [7, '22:59:56'] };
const ROOM = { j0: 'soir', j1: 'jour', j2: 'jour', j3: 'nuit', j4: 'jour', j7: 'soir' };
const TEXT0 = 3.1;
// les messages de Maëlle (son téléphone, calque 2D)
const MSGS = [['LUN. 18:02', 'Ciné ce soir ?'], ['MAR. 12:40', 'Sarah ??'], ['MER. 09:15', 'Tu réponds plus à personne'], ['JEU. 21:30', 'J’ai appelé 3 fois, ça tombe direct sur ta messagerie'],
  ['SAM. 23:48', 'Sérieux, je commence à m’inquiéter'], ['DIM. 22:41', 'T’es où ???']];

export default async function () {
  const stage = createStage({ fov: 62, far: 3000, bloom: [0.3, 0.5, 0.88], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.15;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#7fd1ff');
  scene.background = new THREE.Color('#0b0c10');
  scene.fog = new THREE.Fog('#cfd8e0', 90, 900);
  const shadeEl = document.getElementById('shade');

  // --- les décors : la chambre (à l'origine), les quais (z = 3000)
  const CH = buildChambre(scene, { at: v3(0, 0, 0) });
  const QU = buildQuais(scene, { at: v3(0, 0, 3000) });
  const sky = makeSkyDome(scene, 1400); sky.set('jour');
  const R = (x, y, z) => v3(x, y, z);          // repère de la chambre (= le monde)
  const U = (x, y, z) => QU.P(x, y, z);       // repère des quais

  // --- les personnages : Sarah (Kate), des passants sur les quais
  const CAST = await loadMixamo({ chars: ['Kate', 'Brian', 'Josh', 'Joe'], anims: ['idle', 'sit', 'texting', 'lookaround', 'nervous', 'yawn', 'walkfemale', 'walk', 'run', 'liedown'] });
  const A = CAST.make('Kate', { height: 1.66 }); scene.add(A.root);
  const PH = makePhone(); A.hold(PH, 'RightHand', { off: [0.02, 0.1, 0.0], rot: [0, 0, 0] });
  const PHL = makePhone(); A.hold(PHL, 'LeftHand', { off: [-0.02, 0.1, 0.0], rot: [0, 0, 0] }); PHL.screen(false);
  const PHD = makePhone(); PHD.screen(false); CH.drawerIn.add(PHD); PHD.rotation.set(-Math.PI / 2, 0, 0.3); PHD.position.set(0.02, 0.006, 0.02);   // le téléphone au fond du tiroir
  const BOOK = makeBook('#2f5d8a'); A.hold(BOOK, 'RightHand', { off: [0.05, 0.1, 0.03], rot: [0.3, 0, 0] });
  const PASS = [['Brian', 'walk', 'texting', -1, 2.4], ['Josh', 'walk', 'texting', 1, 0.6], ['Joe', 'run', null, -1, 3.3]].map(([n, gait, up, dir, z], i) => {
    const P = CAST.make(n, { height: 1.74 + i * 0.04, shadows: true }); scene.add(P.root);
    let ph = null; if (up) { ph = makePhone(); P.hold(ph, 'RightHand', { off: [0.02, 0.1, 0.0], rot: [0, 0, 0] }); }
    return { P, gait, up, dir, z, off: i * 1.7 };
  });

  // la vue de la caméra fixe de chaque lieu : la chambre (dans le coin, côté couloir) ; les quais (sur un lampadaire, au
  // bord du fleuve, tournée vers la place de la Bourse et son miroir d'eau ; le banc, face au fleuve, est face à elle)
  const CAMS = {
    ch: { p: R(1.85, 2.3, 2.02), l: R(-0.7, 0.55, -1.3), fov: 62 },
    qu: { p: U(-0.4, 2.6, 7.9), l: U(-15.5, -3.71, -5.22), fov: 62 },
  };

  // --- Sarah, plan par plan
  const SEAT = CH.seat.clone(), SEAT_RY = Math.PI / 2;
  const camYaw = Math.atan2(CAMS.ch.p.x - CH.mid.x, CAMS.ch.p.z - CH.mid.z);   // pour qu'elle regarde vers la caméra
  const sitPose = (upper, tt, spec) => A.pose([['sit', 2.0, 1, LOWER], [upper, tt, 1, UPPER]], spec);
  // assise au bord du lit, tournée vers la table de nuit (à sa gauche) : r = la main gauche qui part vers le tiroir
  const stare = (ts, r, look) => sitPose('idle', ts, { Spine: [['y', 0.25 * look + 0.2 * r], ['x', 0.08 * look + 0.22 * r]], Spine1: [['y', 0.1 * look + 0.1 * r]],
    Neck: [['y', 0.35 * look], ['x', 0.3 * look + 0.02 * Math.sin(ts * 1.7)]], LeftArm: [['x', -1.2 * r], ['z', 0.2 * r]], LeftForeArm: [['x', -0.3 * r]] });
  function poseSarah(ts, S) {
    PH.visible = false; PHL.visible = false; BOOK.visible = false; A.root.visible = true; A.root.rotation.set(0, 0, 0); PHD.visible = ts > DRAWER.put;
    let drawerK = 0;
    if (S === 'j0') {   // assise au bord du lit, sur son téléphone ; puis elle l'éteint, se penche et le range dans le tiroir
      A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY;
      const reach = sm(DRAWER.reach, DRAWER.open, ts) * (1 - sm(DRAWER.close, DRAWER.back, ts));
      const hand = sm(DRAWER.open, DRAWER.put, ts) * (1 - sm(DRAWER.put + 0.25, DRAWER.close, ts));
      sitPose('texting', TEXT0 + 0.08 * Math.sin(ts * 1.3), {
        Spine: [['y', 0.45 * reach], ['x', 0.3 * reach]], Spine1: [['y', 0.2 * reach]], Neck: [['x', 0.25 * reach]],
        LeftArm: [['x', -0.75 * hand], ['z', 0.2 * hand]], LeftForeArm: [['x', -0.15 * hand]] });
      if (ts < DRAWER.reach - 0.5) { PH.visible = true; PH.screen(true); } else if (ts < DRAWER.reach + 0.3) { PH.visible = true; PH.screen(false); } else if (ts < DRAWER.put) PHL.visible = true;
      drawerK = sm(DRAWER.open - 0.2, DRAWER.open + 0.3, ts) * (1 - sm(DRAWER.close - 0.2, DRAWER.close + 0.2, ts));
      CH.drawer(drawerK); return;
    }
    CH.drawer(0); CH.door(0);
    if (S === 'j1') {   // debout au milieu de la chambre ; sa main va sans arrêt vers sa poche (et revient vide)
      A.root.position.copy(CH.mid); A.root.rotation.y = camYaw - 0.4;
      const pat = Math.max(0, Math.sin((ts - SH.j1) * 2.2)) ** 2;
      A.pose([['lookaround', 1.0 + (ts - SH.j1) * 0.5, 0.6], ['idle', ts, 0.4]], { RightArm: [['x', -0.15 * pat], ['z', 0.15 * pat]], RightForeArm: [['x', -0.6 * pat]], Neck: [['x', 0.35 * pat]] }); return;
    }
    if (S === 'j2') { A.root.position.copy(CH.mid).add(v3(-0.1, 0, 0.2)); A.root.rotation.y = camYaw; A.pose('nervous', 0.5 + (ts - SH.j2)); return; }
    if (S === 'j3' && (ts < N3.jump || ts >= N3.back)) {   // 3 h du matin : allongée, la tête tournée vers la table de nuit ; elle se redresse
      A.root.position.copy(BED); A.root.rotation.y = 0;
      const k = ts < N3.back ? sm(N3.up, N3.up + 0.6, ts) : 0;
      A.pose('liedown', lerp(5.6, 2.3, k) + (k >= 1 ? 0.15 * Math.sin((ts - N3.up) * 1.5) : 0), { Neck: [['y', 0.5]] });
      return;
    }
    if (S === 'j3') {   // (quelques minutes plus tard) assise au bord du lit ; elle fixe le tiroir ; sa main y va… et revient
      A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY;
      const r = sm(N3.a, N3.b, ts) * (1 - sm(FREEZE_AT + 0.6, FREEZE_AT + 1.8, ts));
      stare(ts, r, 1); return;
    }
    if (S === 'j4') {   // elle bâille, puis va vers la porte (elle l'ouvre) et sort
      CH.door(sm(SH.j4 + 2.4, SH.j4 + 3.0, ts) * (1 - sm(SH.j4 + 4.3, SH.j4 + 4.9, ts)));
      const u = ts - SH.j4;
      const from = CH.mid, mid = CH.doorIn, out = CH.doorOut;
      if (u < 1.4) { A.root.position.copy(from); A.root.rotation.y = camYaw; A.pose('yawn', 2.2 + u * 1.2); }
      else {
        const k1 = clamp((u - 1.4) / 1.6), k2 = clamp((u - 3.0) / 1.1);
        const p = k2 > 0 ? mid.clone().lerp(out, k2) : from.clone().lerp(mid, k1);
        const d = (k2 > 0 ? out : mid).clone().sub(k2 > 0 ? mid : from);
        A.root.position.copy(p); A.root.rotation.y = Math.atan2(d.x, d.z); A.pose('walkfemale', u * 1.0);
        A.root.visible = k2 < 0.98;
      }
      return;
    }
    if (S === 'j5') {   // elle arrive le long du quai (de la gauche), s'arrête à côté du banc et regarde la Garonne
      const u = ts - SH.j5, k = clamp(u / 5.6), a0 = U(-10.5, 0, 7.3), a1 = U(-5.5, 0, 5.6), dir = Math.atan2(a1.x - a0.x, a1.z - a0.z), look = 0.25;
      A.root.position.copy(a0.clone().lerp(a1, k));
      if (k < 1) { A.root.rotation.y = dir; A.pose('walkfemale', u * 1.0); }
      else { const kk = sm(5.6, 6.4, u); A.root.rotation.y = dir + (((look - dir + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * kk; A.pose([['lookaround', 1.0 + (u - 5.6) * 0.4, 0.5], ['idle', ts, 0.5]]); }
      return;
    }
    if (S === 'j5b' || S === 'msg') {   // assise sur le banc, elle regarde la Garonne (vers la caméra)
      A.root.position.copy(QU.seat(0.1)); A.root.rotation.y = QU.benchYaw; sitPose('idle', ts, { Neck: [['y', 0.3 * Math.sin(ts * 0.3)]] }); return;
    }
    if (S === 'j7') {   // elle lit, assise au bord du lit ; on frappe : elle baisse le livre et tourne la tête vers la porte
      A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY; BOOK.visible = true;
      const look = sm(KNOCK + 0.3, KNOCK + 0.9, ts);
      sitPose('texting', TEXT0 + 0.05 * Math.sin(ts), { Neck: [['y', 0.25 * look], ['x', -0.3 * look]], Head: [['y', 0.15 * look], ['x', -0.1 * look]], RightArm: [['x', 0.25 * look]], LeftArm: [['x', 0.25 * look]] });
      return;
    }
    A.root.visible = false;
  }
  function posePassers(ts, S) {
    const onQ = S === 'j5' || S === 'j5b' || S === 'msg';
    PASS.forEach((c) => {
      c.P.root.visible = onQ; if (!onQ) return;
      const speed = c.gait === 'run' ? 3.0 : 1.25, span = 70;
      const x = -40 + (((ts * speed * c.dir + c.off * 9 + (c.dir < 0 ? span : 0)) % span) + span) % span;
      c.P.root.position.copy(U(x - 20, 0, c.z)); c.P.root.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (c.up) c.P.pose([[c.gait, ts * 1.0 + c.off, 1, LOWER], [c.up, TEXT0, 1, UPPER]]); else c.P.pose(c.gait, ts * 1.4 + c.off);
    });
  }

  // --- le calque 2D (sous les sous-titres) : le téléphone de Maëlle et ses messages restés sans réponse
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  const hud = document.getElementById('hud'); hud.insertBefore(ov, document.getElementById('subt')); const og = ov.getContext('2d');
  const rr = (x, y, w, h, r) => { og.beginPath(); og.moveTo(x + r, y); og.arcTo(x + w, y, x + w, y + h, r); og.arcTo(x + w, y + h, x, y + h, r); og.arcTo(x, y + h, x, y, r); og.arcTo(x, y, x + w, y, r); og.closePath(); };
  const wrapTxt = (txt, maxW) => { const out = []; let cur = ''; for (const w of txt.split(' ')) { const t2 = cur ? cur + ' ' + w : w; if (og.measureText(t2).width > maxW && cur) { out.push(cur); cur = w; } else cur = t2; } if (cur) out.push(cur); return out; };
  function drawMsgs(ts, slideK) {
    og.fillStyle = `rgba(0,0,0,${0.55 * slideK})`; og.fillRect(0, 360, 1080, 1560);
    og.save(); og.translate(540, 300); og.scale(1.1, 1.1); og.translate(-540, -250);
    const X = 290, Y = 262 + (1 - slideK) * 900, PW = 500, PHh = 740;
    og.save(); og.shadowColor = 'rgba(0,0,0,0.6)'; og.shadowBlur = 40; og.fillStyle = '#0b0b0d'; rr(X, Y, PW, PHh, 56); og.fill(); og.restore();
    og.fillStyle = '#f3f4f7'; rr(X + 14, Y + 14, PW - 28, PHh - 28, 44); og.fill();
    og.save(); rr(X + 14, Y + 14, PW - 28, PHh - 28, 44); og.clip();
    // l'en-tête de la conversation
    og.fillStyle = '#e6e8ee'; og.fillRect(X, Y, PW, 150);
    og.fillStyle = '#111'; og.font = '700 22px Inter'; og.textAlign = 'left'; og.fillText('22:41', X + 44, Y + 62); og.textAlign = 'right'; og.fillText('▮▮▮', X + PW - 44, Y + 62); og.textAlign = 'center';
    og.fillStyle = '#c47ad8'; og.beginPath(); og.arc(540, Y + 98, 20, 0, 7); og.fill(); og.fillStyle = '#fff'; og.font = '800 20px Inter'; og.fillText('S', 540, Y + 105);
    og.fillStyle = '#111'; og.font = '700 20px Inter'; og.fillText('Sarah', 540, Y + 140);
    // les bulles (envoyées par Maëlle, à droite), une par une ; jamais « Lu »
    const n = Math.min(MSGS.length, Math.floor((ts - SH.msg - 0.4) / 0.8) + 1);
    let y = Y + 165; og.textAlign = 'left';
    const shown = MSGS.slice(0, Math.max(0, n)), lines = shown.map(([, m]) => { og.font = '600 21px Inter'; return wrapTxt(m, 300); });
    const totalH = lines.reduce((s, l) => s + 74 + l.length * 28, 0), overflow = Math.max(0, totalH - (PHh - 190));   // (le fil défile vers le haut)
    y -= overflow;
    og.save(); og.beginPath(); og.rect(X, Y + 150, PW, PHh - 150); og.clip();   // les bulles ne passent pas sur l'en-tête
    shown.forEach(([d, m], i) => {
      const L = lines[i], bh = 22 + L.length * 28, bw = Math.max(...L.map((l) => og.measureText(l).width)) + 36;
      og.fillStyle = '#8b8f99'; og.font = '700 15px Inter'; og.textAlign = 'center'; og.fillText(d, 540, y + 18); y += 30;
      og.fillStyle = '#2f7cf6'; rr(X + PW - 44 - bw, y, bw, bh, 18); og.fill();
      og.fillStyle = '#fff'; og.font = '600 21px Inter'; og.textAlign = 'left'; L.forEach((l, k) => og.fillText(l, X + PW - 44 - bw + 18, y + 30 + k * 28));
      y += bh + 6;
      if (i === shown.length - 1) { og.fillStyle = '#8b8f99'; og.font = '600 14px Inter'; og.textAlign = 'right'; og.fillText('Distribué', X + PW - 48, y + 10); }
      y += 16;
    });
    og.restore(); og.restore(); og.restore();
  }
  // le petit texte du zoom numérique de la caméra (sous l'étiquette en haut à droite)
  function zoomLabel(z, a) {
    if (a <= 0.02) return;
    og.globalAlpha = a; og.font = '600 19px Inter'; og.textAlign = 'right'; og.fillStyle = 'rgba(0,0,0,.45)'; og.fillText(`ZOOM ×${z.toFixed(1).replace('.', ',')}`, 1020, 342);
    og.fillStyle = '#fff'; og.fillText(`ZOOM ×${z.toFixed(1).replace('.', ',')}`, 1018, 340); og.globalAlpha = 1;
  }

  // --- l'arrêt sur image : jour 3, 3 h du matin, la main au-dessus du tiroir
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 4.8, title: 'ARRÊT SUR IMAGE · JOUR 3 · 3 H DU MATIN', tags: [
      { at: () => A.point('Head').add(v3(0, 0.08, 0)), title: 'VIBRATION FANTÔME', lines: ['89 % des étudiants', 'l’ont déjà ressentie', '(étude de 2012)'], risk: 'info', side: 'right', dy: -30 },
      { at: () => A.point('Spine2'), title: 'CŒUR', lines: ['téléphone qui sonne,', 'impossible de répondre :', 'le cœur et la tension', 'montent (étude de 2015)'], risk: 'bof', side: 'left', dy: -60 },
      { at: () => A.point('LeftHand'), title: 'SA MAIN', lines: ['elle va chercher', 'un téléphone éteint'], risk: 'bof', side: 'right', dy: 40 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // =====================================================================
  //  LES PLANS
  // =====================================================================
  const ORDER = ['j0', 'j1', 'j2', 'j3', 'j4', 'j5', 'j5b', 'msg', 'j7', 'end'];
  const shotAt = (ts) => { let s = ORDER[0]; for (const k of ORDER) if (ts >= SH[k]) s = k; return s; };
  const LIGHTS = [...CH.lights, CH.amb, ...QU.lights, QU.hemi];
  const hms = (s) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;
  const tmp = v3(0, 0, 0);
  const toPx = (p) => { tmp.copy(p).project(camera); return [(tmp.x * 0.5 + 0.5) * 720, (-tmp.y * 0.5 + 0.5) * 1280]; };

  function update(t) {
    const ts = FZ.sceneT(t), fz = FZ.active(t);
    const S = Q.get('shot') || shotAt(ts);
    const room = !!ROOM[S] || S === 'end', quais = ['j5', 'j5b', 'msg'].includes(S);
    poseSarah(ts, S); posePassers(ts, S);
    // les lumières et les décors
    CH.light(room ? (ROOM[S] || 'soir') : 'off');
    CH.hall(S === 'j7' ? sm(KNOCK - 0.9, KNOCK - 0.3, ts) : 0);
    QU.on(quais ? 1 : 0); sky.dome.visible = quais; sky.sun.visible = false;
    if (quais) { scene.fog.near = 120; scene.fog.far = 1500; scene.background.set('#cfd8e0'); } else { scene.fog.near = 500; scene.fog.far = 2000; scene.background.set('#0b0c10'); }
    shadeEl.style.background = quais ? 'linear-gradient(to bottom, rgba(0,0,0,.6) 0px, rgba(0,0,0,.34) 440px, rgba(0,0,0,0) 720px), radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(0,0,0,.28) 100%)' : '';
    // (les sauts d'image de la caméra : la nuit avance de quelques minutes)
    const jumpOff = S === 'j3' ? (ts >= N3.back ? 410 : ts >= N3.jump ? 160 : 0) : 0;
    if (room) { const c = CLOCK0[S]; if (c) { const [h, m, s] = c[1].split(':').map(Number); CH.clock(hms(h * 3600 + m * 60 + s + (ts - SH[S]) + jumpOff).slice(0, 5)); } }
    // la caméra fixe, et son zoom numérique (le tiroir au jour 0 ; Sarah au jour 3, jusqu'à la fin de l'arrêt sur image)
    const C = quais ? CAMS.qu : CAMS.ch;
    camera.fov = C.fov; camera.near = 0.05; camera.far = 3000; camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    if (Q.get('cp')) { camera.position.set(...Q.get('cp').split(',').map(Number)); camera.lookAt(...Q.get('cl').split(',').map(Number)); }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    let zk = 0, zz = 1;
    if (S === 'j0') { zk = sm(DRAWER.reach - 0.9, DRAWER.reach, ts) * (1 - sm(DRAWER.back + 0.1, DRAWER.back + 0.7, ts)); zz = 2.0;
      const [px, py] = toPx(CH.drawerFront().add(v3(0, 0.12, 0))); zoomView(camera, px, py, zz, zk); }
    if (S === 'j3' && ts >= N3.jump && ts < N3.back) { zk = sm(N3.jump + 0.3, N3.jump + 1.3, ts); zz = 1.8;
      const [px, py] = toPx(A.point('Spine2').lerp(CH.drawerFront(), 0.35).add(v3(0, 0.1, 0))); zoomView(camera, px, py, zz, zk); }
    camera.updateProjectionMatrix();
    sky.dome.position.copy(camera.position);
    PS.dof(0); PS.look('normal', { sat: quais ? 0.95 : 0.86 });
    for (const l of LIGHTS) l.visible = l.intensity > 0;

    // --- le calque : les messages de Maëlle, le zoom, les coups à la porte, les sauts d'image
    og.clearRect(0, 0, 1080, 1920);
    const msg = S === 'msg', glitch = S === 'j3' && ((ts >= N3.jump && ts < N3.jump + 0.2) || (ts >= N3.back && ts < N3.back + 0.2)), knock = S === 'j7' && ts > KNOCK - 0.1 && ts < KNOCK + 2.4;
    if (knock) {   // « TOC TOC TOC » à côté de la porte (pour ceux qui regardent sans le son)
      camera.updateMatrixWorld(); const dp = CH.doorPos.clone().project(camera), px = (dp.x * 0.5 + 0.5) * 1080, py = (-dp.y * 0.5 + 0.5) * 1920;
      og.font = '800 46px Inter'; og.textAlign = 'center';
      for (let i = 0; i < 3; i++) { const t0 = KNOCK + i * 0.35, a = sm(t0, t0 + 0.08, ts) * (1 - sm(KNOCK + 1.9, KNOCK + 2.4, ts)); if (a <= 0) continue;
        og.globalAlpha = a; og.fillStyle = 'rgba(0,0,0,0.55)'; og.fillText('TOC', px + 3 + (i - 1) * 40, py - 120 + i * 90 + 3); og.fillStyle = '#fff3d6'; og.fillText('TOC', px + (i - 1) * 40, py - 120 + i * 90); }
      og.globalAlpha = 1;
    }
    if (msg) drawMsgs(ts, sm(SH.msg, SH.msg + 0.45, ts));
    if (glitch) {   // le saut d'image de la caméra de surveillance : quelques bandes de bruit
      let sd = Math.floor(t * 30) * 7919; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 14; i++) { og.fillStyle = `rgba(${200 + rnd() * 55},${200 + rnd() * 55},${200 + rnd() * 55},${0.15 + rnd() * 0.35})`; og.fillRect(0, rnd() * 1920, 1080, 4 + rnd() * 40); }
    }
    if (!fz) zoomLabel(1 + (zz - 1) * zk, zk);

    // --- textes
    HUD.hook(t, 'Et si tu lâchais ton <em>téléphone</em><br>pendant 30 jours ?', T.hookOut);
    const c0 = CLOCK0[S]; let clk = '';
    if (c0) { const [hh, mm, ss] = c0[1].split(':').map(Number); clk = `JOUR ${c0[0]} · ${hms(hh * 3600 + mm * 60 + ss + (ts - SH[S]) + jumpOff)}`; }
    const lab = { j0: 'CHAMBRE DE SARAH · CAM 01', j1: 'CHAMBRE DE SARAH · CAM 01', j2: 'CHAMBRE DE SARAH · CAM 01', j3: 'CHAMBRE DE SARAH · CAM 01', j4: 'CHAMBRE DE SARAH · CAM 01',
      j5: 'QUAIS DE LA GARONNE · CAM 02', j5b: 'QUAIS DE LA GARONNE · CAM 02', msg: 'LE TÉLÉPHONE DE MAËLLE', j7: 'CHAMBRE DE SARAH · CAM 01', end: '' }[S];
    HUD.live(t, lab, clk, 'SIMULATION');
    let tl = true;
    if (S === 'j0' && ts < 9.9) { HUD.block(1, { label: 'SARAH', value: '22 ans', sub: 'ÉTUDIANTE · BORDEAUX' }); HUD.block(2, { label: 'SUR SON TÉLÉPHONE', value: '+ de 5 h / jour', sub: '', color: ts > 6.5 ? '#ffcf6b' : '#fff' }); HUD.show2(ts > 6.4); }
    else if (S === 'j0' && ts < DRAWER.close) { HUD.block(1, { label: 'UNE VRAIE ÉTUDE (2025)', value: '467 personnes', sub: '2 SEMAINES SANS INTERNET MOBILE', color: '#7fd1ff' }); HUD.show2(false); }
    else if (S === 'msg') { HUD.block(1, { label: 'MESSAGES DE MAËLLE', value: 'SANS RÉPONSE', sub: 'DEPUIS 7 JOURS', color: '#ff5a4f' }); HUD.show2(false); }
    else if (S !== 'end') {
      const day = S === 'j0' ? 0 : CLOCK0[S][0];
      HUD.block(1, { label: 'SANS TÉLÉPHONE', value: `JOUR ${day}`, sub: 'SUR 30', color: S === 'j3' ? '#ff5a4f' : '#7fd1ff' });
      if (S === 'j5' && ts > 43.4) { HUD.block(2, { label: 'L’ÉTUDE (2025)', value: '+ de vie réelle', sub: 'AMIS, SPORT, NATURE', color: '#9fe0b0' }); HUD.show2(true); } else HUD.show2(false);
    } else tl = false;
    document.getElementById('tl').style.opacity = tl && !fz ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    camera.updateMatrixWorld();
    HUD.reticle('sarah', A.point('Spine2').add(v3(0, 0.15, 0)), camera, 'SARAH, 22 ANS', fz ? 0 : sm(3.3, 3.8, ts) * (1 - sm(6.0, 6.4, ts)), 150);
    HUD.subs(t, SUBS_V);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : PNAS NEXUS (2025) · COMPUTERS IN HUMAN BEHAVIOR (2012) · J. OF COMPUTER-MEDIATED COMMUNICATION (2015)', q: 'Partie 2<br>demain à 18 h', cta: 'À TON AVIS, QUI FRAPPE ? RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: ORDER.map((k) => FZ.realT(SH[k])),
    drawer: Object.fromEntries(Object.entries(DRAWER).map(([k, x]) => [k, FZ.realT(x)])), knock: FZ.realT(KNOCK), up: FZ.realT(N3.up), jump: FZ.realT(N3.jump),
    buzz: FZ.realT(N3.buzz), reach3: FZ.realT(N3.a), back: FZ.realT(N3.back),
    msgs: MSGS.map((m, i) => FZ.realT(SH.msg + 0.4 + i * 0.8)), steps: [FZ.realT(SH.j4 + 1.4), FZ.realT(SH.j4 + 4.1), FZ.realT(SH.j5), FZ.realT(SH.j5 + 5.6)] }) };
}

// =====================================================================
//  « Et si tu gagnais le jackpot de l'EuroMillions ? » — version 2 (format RECONSTITUTION, règle du 15/10 : on raconte une
//  réalité qui PEUT arriver, avec un personnage qui a un prénom). Rémy, 31 ans, Nantes, gagne les 250 millions : ce qu'il
//  peut en faire, ce qu'il s'achète, la vie qu'il mène, et pourquoi il ne pourra plus jamais être pauvre.
//
//  Faits (vérifiés le 15/10/2026, sources dans la légende) :
//   - grille simple 2,50 € ; 5 numéros sur 50 + 2 étoiles sur 12 : 139 838 160 combinaisons (calcul) ; plafond du jackpot
//     250 M€ (FDJ) ; un gain de jeu de hasard n'est pas un revenu imposable en France (FDJ, cité par MoneyVox) ;
//   - 250 M€ = 25 000 liasses de 10 000 € ; SMIC net 1 477,93 €/mois au 1er juin 2026 (Legisocial) → 17 735 € par an
//     → 14 096 personnes payées un an (calcul, démo validée) ;
//   - un don d'argent à un ami (sans lien de parenté) est taxé à 60 % (droits de donation, Service-Public ; MoneyVox) ;
//     entre un enfant et ses parents, 100 000 € par parent sont exonérés (le crédit des parents passe sans taxe) ;
//   - jet privé léger en Europe : environ 3 500 à 5 000 € l'heure de vol (Blade) ;
//   - 227 271 236 € placés à 3 % par an : 6,8 M€ par an, soit 18 680 € par jour avant impôts (calcul) ; même après la
//     « flat tax » d'environ 31 %, il reste plus de 12 800 € par jour : en dépensant 10 000 € par jour, le compte grossit ;
//   - Lindqvist, Östling & Cesarini (Review of Economic Studies, 2020) : en Suède, les gros gagnants sont plus satisfaits
//     de leur vie, et ça dure plus de 10 ans ; surtout grâce à leur situation financière (pas forcément plus joyeux au quotidien).
//   Rémy, ses achats et ses prix sont une HISTOIRE plausible (villa à 6 M€, voiture à 250 000 €, 60 h de jet…).
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, fr } from '../../engine.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2 } from '../../lib-ps2.js';
import { buildBedroom } from '../../lib-nuit.js';
import { buildTabac, makeTicket, makeTV } from '../../lib-tabac.js';
import { makeBundle, makePile, makeCrowd, makeEquation } from '../../lib-multiply.js';
import { loadPeople } from '../../lib-people.js';
import { buildVilla, makeSportsCar, makeJet, makeClouds } from '../../lib-villa.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SH = { tabac: 0, ticket: 3.0, tirage: 6.3, check: 8.0, joie: 9.5, banque: 12.4, multi: 15.4, amis: 22.6, villa: 28.6, voiture: 31.8, jet: 34.2,
  solde: 37.6, interets: 40.6, jamais: 45.0, dix: 49.0, end: 57.0 };
const sceneEnd = 60.0, FREEZE_AT = 42.4;
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const NUMS = [7, 12, 23, 34, 45], STARS = [3, 9];
const GAIN = 250_000_000, LIASSE = 10_000, NL = GAIN / LIASSE, SMIC_AN = 1477.93 * 12, NP = Math.floor(GAIN / SMIC_AN);
const SUBS = [
  [3.1, 6.1, 'Rémy, 31 ans, Nantes. Mardi soir, il joue une grille à 2,50 €. Une chance sur 140 millions.'],
  [6.4, 9.3, '21 h 05, le tirage. 5 numéros, 2 étoiles… tout est bon.'],
  [9.5, 12.3, 'Le jackpot est au maximum : 250 millions d’euros. Et en France, un gain au loto n’est pas imposé.'],
  [12.5, 15.2, 'Quelques jours plus tard, le virement arrive sur son compte.'],
  [15.5, 18.4, '250 millions, c’est 25 000 liasses de 10 000 €.'],
  [18.6, 22.4, `De quoi payer ${fr(NP)} personnes au SMIC pendant un an.`],
  [22.7, 25.5, 'Rémy commence par ses parents : il rembourse le crédit de leur maison.'],
  [25.7, 28.4, 'Il donne 1 million à chacun de ses 10 meilleurs amis. Plus la taxe sur les dons entre amis : 60 %.'],
  [28.7, 31.6, 'Il s’offre une villa face à la mer, avec piscine : 6 millions.'],
  [31.9, 34.0, 'Une voiture de sport : 250 000 €. Il pourrait en acheter 1 000.'],
  [34.3, 37.4, 'Le tour du monde en jet privé, à 5 000 € l’heure de vol.'],
  [37.7, 40.4, 'Après tout ça, il lui reste encore… 227 millions.'],
  [40.7, 44.9, 'Placés à 3 %, ils lui rapportent plus de 18 000 € par jour. Plus qu’un an de SMIC, chaque jour.'],
  [45.1, 48.8, 'Même s’il dépense 10 000 € par jour, toute sa vie, son compte continue de grossir.'],
  [49.1, 51.9, '10 ans plus tard ? On raconte que les gagnants finissent tous ruinés.'],
  [52.1, 55.0, 'Une étude suédoise dit l’inverse : 10 ans après, les gros gagnants sont plus satisfaits de leur vie.'],
  [55.2, 56.8, 'Surtout, ils se font beaucoup moins de soucis d’argent.'],
];
const CLOCK0 = { tabac: '19:02:11', ticket: '19:02:40', tirage: '21:05:02', check: '21:06:30', joie: '21:06:52', banque: '09:12:05', amis: '10:40:18', villa: '20:31:02', voiture: '20:44:40',
  jet: '16:20:11', solde: '21:02:33', interets: '21:10:02', jamais: '15:05:40', dix: '22:48:10', end: '' };
const TEXT0 = 3.1, HOLD = { off: [0.0, 0.1, 0.045], rot: [0, 0, 0] };
// le relevé de compte : chaque opération apparaît dans un plan, à un instant donné
const BASE = 1236.45;
const OPS = [
  { at: -9, l: 'Loyer', s: '1er du mois', a: -640 }, { at: -8, l: 'Supermarché', s: 'Lundi', a: -42.3 },
  { at: SH.banque + 1.2, l: 'Virement FDJ', s: 'Gain EuroMillions', a: GAIN },
  { at: SH.amis + 0.9, l: 'Crédit des parents', s: 'Remboursé en une fois', a: -180_000 },
  { at: SH.amis + 3.4, l: '10 amis × 1 M€', s: '+ taxe sur les dons : 60 %', a: -16_000_000 },
  { at: SH.solde + 0.3, l: 'Villa face à la mer', s: 'Avec piscine', a: -6_000_000 },
  { at: SH.solde + 0.7, l: 'Voiture de sport', s: 'Neuve', a: -250_000 },
  { at: SH.solde + 1.1, l: 'Jet privé', s: '60 h de vol · tour du monde', a: -300_000 },
];
const money = (v, dec = true) => { const s = v < 0 ? '−' : ''; v = Math.abs(v); const i = Math.floor(v + 1e-6), c = Math.round((v - i) * 100);
  return `${s}${String(i).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${dec ? ',' + String(c).padStart(2, '0') : ''} €`; };

export default async function () {
  const stage = createStage({ fov: 50, far: 4000, bloom: [0.35, 0.5, 0.85], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.25;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  scene.background = new THREE.Color('#07080c'); scene.fog = new THREE.Fog('#07080c', 60, 400);
  const hemi = new THREE.HemisphereLight('#3a4466', '#0e0d0b', 0.3); scene.add(hemi);
  const fill = new THREE.PointLight('#fff1dc', 0, 5, 1.5); scene.add(fill);

  // --- les décors : le tabac (z = -300), la chambre (z = 400), le studio de l'effet multiplication (x = 300), la villa (x = 5000)
  const TB = buildTabac(scene, { at: v3(0, 0, -300) });
  const CH = buildBedroom(scene, { at: v3(0, 0, 400) });
  const R = (x, y, z) => CH.at.clone().add(v3(x, y, z));
  const P = (x, y, z) => TB.at.clone().add(v3(x, y, z));
  const bedLamp = new THREE.PointLight('#ffb867', 0, 4.5, 1.5); bedLamp.position.copy(R(0.2, 0.9, -0.2)); scene.add(bedLamp);
  const dayL = new THREE.DirectionalLight('#fff1dc', 0); dayL.position.copy(R(0.3, 4, -8)); dayL.target.position.copy(R(0.8, 0, 0.5)); scene.add(dayL, dayL.target);
  const TV = makeTV({ nums: NUMS, stars: STARS }); TV.root.position.copy(R(-1.62, 0.775, 0.45)); TV.root.rotation.y = Math.PI / 2; scene.add(TV.root);

  const ST = v3(300, 0, 0), S0 = (x, y, z) => ST.clone().add(v3(x, y, z));
  const FOGM = new THREE.Color('#0b0d12');
  const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256); gr.addColorStop(0, '#2c303a'); gr.addColorStop(0.3, '#171a21'); gr.addColorStop(1, '#0c0e12');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75, metalness: 0.1 })); floor.rotation.x = -Math.PI / 2; floor.position.copy(ST); floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.SpotLight('#fff0d6', 0, 60, 0.5, 0.65, 1.6); key.position.copy(S0(3.5, 9, 6)); key.target.position.copy(S0(0, 0.5, 0)); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.camera.near = 2; key.shadow.camera.far = 30; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#8fb2ff', 0); rim.position.copy(S0(-6, 5, -8)); rim.target.position.copy(ST); scene.add(rim, rim.target);
  const wide = new THREE.DirectionalLight('#ffe6c4', 0); wide.position.copy(S0(20, 40, 25)); wide.target.position.copy(ST); scene.add(wide, wide.target);

  const V = buildVilla(scene, { at: v3(5000, 0, 0) });
  const W = (x, y, z) => V.at.clone().add(v3(x, y, z));
  const car = makeSportsCar('#b3121b'); car.position.copy(V.drive).add(v3(0.5, 0, -1.0)); car.rotation.y = -Math.PI / 2 + 0.25; scene.add(car);
  const jet = makeJet(); scene.add(jet); const JET0 = W(-160, 420, 300);
  const clouds = makeClouds(scene, { at: W(0, 340, 300), n: 70, spread: 1700 });

  // --- l'effet multiplication : la liasse, le tas de 25 000 liasses, puis la foule de 14 096 personnes
  const M = { one: SH.multi, drop: SH.multi + 0.7, land: SH.multi + 1.15, full: SH.multi + 3.1, crowd: SH.multi + 3.3, crowdFull: SH.multi + 6.2 };
  const B = makeBundle();
  const hero = new THREE.Mesh(B.geo, B.mats); hero.castShadow = true; scene.add(hero);
  const pile = makePile(scene, { geo: B.geo, mats: B.mats, count: NL, nx: 10, nz: 20, t0: M.land, t1: M.full, x: ST.x, z: ST.z });
  const PEOPLE = await loadPeople(renderer);
  const crowd = makeCrowd(scene, PEOPLE, { count: NP, t0: M.crowd, t1: M.crowdFull, cx: ST.x, cz: ST.z, face: [ST.x + 5, ST.z + 7], fog: { color: FOGM, near: 40, far: 150 },
    exclude: (x, z) => (Math.abs(x - ST.x) < 1.05 && Math.abs(z - ST.z) < 1.1) || Math.hypot(x - ST.x - 1.2, z - ST.z - 0.35) < 0.55 });
  const eq = makeEquation([{ label: 'SON GAIN', value: '250 M€' }, '÷', { label: '1 AN DE SMIC NET', value: `${fr(Math.round(SMIC_AN))} €` }, '=', { label: 'PERSONNES', value: '0', color: '#ffcf6b' }]);
  const MCAM = [
    [M.one, [0.26, 1.22, 0.34], [0, 1.13, 0]], [M.drop - 0.1, [0.33, 1.19, 0.28], [0, 1.0, 0]], [M.land + 0.1, [0.75, 1.0, 1.15], [0, 0.15, 0]],
    [M.land + 1.0, [1.6, 1.75, 2.6], [0.1, -0.3, 0]], [M.full, [3.1, 2.5, 4.6], [0.35, 0.5, 0]], [M.crowd + 0.8, [5.5, 8.5, 10.5], [0.2, 0.2, 0]],
    [M.crowdFull, [14, 30, 34], [0, 0, -2]], [SH.amis, [16, 35, 39], [0, 0, -3]],
  ];
  const mcam = (t) => { let i = 0; while (i < MCAM.length - 2 && t > MCAM[i + 1][0]) i++; const [a, pa, ta] = MCAM[i], [b, pb, tb] = MCAM[i + 1]; const k = sm(a, b, t);
    return { p: S0(...pa.map((x, j) => lerp(x, pb[j], k))), l: S0(...ta.map((x, j) => lerp(x, tb[j], k))), fov: 40 }; };

  // --- les personnages : Rémy et la buraliste (Kate)
  const CAST = await loadMixamo({ chars: ['Remy', 'Kate'], anims: ['idle', 'sit', 'texting', 'phone', 'lookaround', 'kneel', 'walk'] });
  const A = CAST.make('Remy', { height: 1.78 }), K = CAST.make('Kate', { height: 1.66 });
  scene.add(A.root, K.root);
  const TK = makeTicket({ nums: NUMS, stars: STARS }); A.hold(TK.mesh, 'RightHand', HOLD);
  const PH = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.4 })); A.hold(PH, 'RightHand', { off: [0.02, 0.1, 0.0], rot: [0, 0, 0] }); PH.scale.multiplyScalar(1.15);
  const TKc = makeTicket({ nums: NUMS, stars: STARS }); TKc.mesh.rotation.x = -Math.PI / 2; TKc.mesh.rotation.z = 0.25; TKc.mesh.position.copy(TB.counterTop).add(v3(0.05, 0.003, 0.05)); scene.add(TKc.mesh);
  const SEAT = R(0.55, 0, 0.45), SEAT_RY = -Math.PI / 2;
  const KNEEL_D = CAST.A.kneel ? CAST.A.kneel.clip.duration : 2;
  const LG = V.lounger.position.clone().add(V.at);
  function poseAll(ts, S) {
    TK.mesh.visible = false; PH.visible = false; A.root.visible = true; K.root.visible = ['tabac', 'ticket', 'end'].includes(S);
    A.root.rotation.set(0, 0, 0);
    K.root.position.copy(TB.clerk); K.root.rotation.y = 0; K.pose('idle', ts + 2);
    if (['tabac', 'ticket', 'end'].includes(S)) { A.root.position.copy(TB.counterFront); A.root.rotation.y = Math.PI; A.pose('idle', ts); return; }
    if (S === 'tirage' || S === 'check') {   // assis devant la télé, le ticket à la main
      A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY; TK.mesh.visible = true;
      A.pose([['sit', 2.0, 1, LOWER], ['texting', TEXT0 + 0.08 * Math.sin(ts * 1.4), 1, UPPER]], { Neck: [['x', 0.1]] }); return;
    }
    if (S === 'joie') { A.root.position.copy(R(0.15, 0, 0.55)); A.root.rotation.y = SEAT_RY; TK.mesh.visible = true; A.pose('kneel', Math.min(KNEEL_D - 0.01, 0.2 + (ts - SH.joie) * 0.9)); return; }
    if (S === 'banque' || S === 'amis') {   // le téléphone à la main (assis au bord du lit, puis debout à la fenêtre)
      PH.visible = true;
      if (S === 'banque') { A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY; A.pose([['sit', 2.0, 1, LOWER], ['texting', TEXT0, 1, UPPER]]); }
      else { A.root.position.copy(R(-0.2, 0, -1.3)); A.root.rotation.y = Math.PI - 0.3; A.pose('texting', TEXT0 + 0.1 * Math.sin(ts)); }
      return;
    }
    if (S === 'multi') { A.root.position.copy(S0(1.2, 0, 0.35)); A.root.rotation.y = -0.35; A.pose([['lookaround', 1.5 + (ts - SH.multi) * 0.6, 0.6], ['idle', ts, 0.4]], { Neck: [['x', -0.25 * sm(M.land, M.full, ts)]] }); return; }
    if (S === 'villa') { A.root.position.copy(W(0.2, 0, 1.6)); A.root.rotation.y = 0.35; A.pose('idle', ts); return; }
    if (S === 'voiture') { const u = ts - SH.voiture; A.root.position.copy(W(-11.6 - 1.05 * u, 0, -6.0 + 0.45 * u)); A.root.rotation.y = -1.17; A.pose('walk', u * 0.95); return; }
    if (S === 'jet') { A.root.visible = false; return; }
    if (S === 'solde' || S === 'jamais') {   // assis au bord du transat (face à la mer, en tournant la tête) ; le téléphone pour le relevé
      A.root.position.copy(LG).add(v3(0.42, 0, 0.1)); A.root.rotation.y = Math.PI / 2;
      if (S === 'solde') { PH.visible = true; A.pose([['sit', 2.0, 1, LOWER], ['texting', TEXT0, 1, UPPER]]); }
      else A.pose([['sit', 2.0, 1, LOWER], ['idle', ts, 1, UPPER]], { Neck: [['y', -0.6]], Spine1: [['y', -0.2]] });
      return;
    }
    if (S === 'interets') { A.root.position.copy(W(1.6, 0, 6.9)); A.root.rotation.y = 0.12; PH.visible = true; A.pose('idle', ts); return; }
    if (S === 'dix') { A.root.position.copy(W(4.5, 0, 1.2)); A.root.rotation.y = 0.5; A.pose([['lookaround', 1.0 + (ts - SH.dix) * 0.3, 0.4], ['idle', ts, 0.6]]); return; }
  }

  // --- le calque 2D (sous les sous-titres) : l'appli de la banque sur son téléphone
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  const hud = document.getElementById('hud'); hud.insertBefore(ov, document.getElementById('subt')); const og = ov.getContext('2d');
  const rr = (x, y, w, h, r) => { og.beginPath(); og.moveTo(x + r, y); og.arcTo(x + w, y, x + w, y + h, r); og.arcTo(x + w, y + h, x, y + h, r); og.arcTo(x, y + h, x, y, r); og.arcTo(x, y, x + w, y, r); og.closePath(); };
  function drawBank(ts, slideK, clock) {
    og.fillStyle = `rgba(0,0,0,${0.5 * slideK})`; og.fillRect(0, 0, 1080, 1920);
    og.save(); og.translate(540, 180); og.scale(1.25, 1.25); og.translate(-540, -250);
    const X = 290, Y = 250 + (1 - slideK) * 900, PW = 500, PHh = 760;
    og.save(); og.shadowColor = 'rgba(0,0,0,0.6)'; og.shadowBlur = 40; og.fillStyle = '#0b0b0d'; rr(X, Y, PW, PHh, 56); og.fill(); og.restore();
    og.fillStyle = '#f3f5f9'; rr(X + 14, Y + 14, PW - 28, PHh - 28, 44); og.fill();
    og.save(); rr(X + 14, Y + 14, PW - 28, PHh - 28, 44); og.clip();
    const x0 = X + 44, xr = X + PW - 44;
    og.fillStyle = '#111'; og.font = '700 22px Inter'; og.textAlign = 'left'; og.fillText(clock, x0, Y + 62); og.textAlign = 'right'; og.fillText('▮▮▮  ▭', xr, Y + 62); og.textAlign = 'left';
    og.fillStyle = '#6b7280'; og.font = '600 22px Inter'; og.fillText('Bonjour Rémy', x0, Y + 118);
    const gr = og.createLinearGradient(0, Y + 140, 0, Y + 330); gr.addColorStop(0, '#1d3b8a'); gr.addColorStop(1, '#0f2459'); og.fillStyle = gr; rr(x0 - 10, Y + 140, PW - 68, 190, 26); og.fill();
    og.fillStyle = 'rgba(255,255,255,0.75)'; og.font = '600 20px Inter'; og.fillText('COMPTE COURANT', x0 + 14, Y + 186);
    let bal = BASE, last = null; const shown = [];
    for (const o of OPS) { if (ts < o.at) continue; const k = clamp((ts - o.at) / 0.9); bal += o.a * (1 - Math.pow(1 - k, 3)); shown.unshift({ ...o, k }); last = o; }
    og.fillStyle = '#fff'; let fs = 46; og.font = `800 ${fs}px Inter`; const txt = money(bal); while (og.measureText(txt).width > PW - 110 && fs > 26) { fs -= 2; og.font = `800 ${fs}px Inter`; }
    og.fillText(txt, x0 + 14, Y + 262);
    og.fillStyle = 'rgba(255,255,255,0.6)'; og.font = '600 18px Inter'; og.fillText('Solde disponible', x0 + 14, Y + 302);
    og.fillStyle = '#111'; og.font = '800 24px Inter'; og.fillText('Opérations', x0, Y + 390);
    shown.slice(0, 4).forEach((o, i) => {
      const y = Y + 420 + i * 82 + (1 - o.k) * -30, a = Math.min(1, o.k * 2.5); og.globalAlpha = a;
      og.fillStyle = '#fff'; rr(x0 - 10, y, PW - 68, 70, 16); og.fill();
      og.fillStyle = o.a > 0 ? '#d7f5e3' : '#eef0f4'; og.beginPath(); og.arc(x0 + 26, y + 35, 22, 0, 7); og.fill();
      og.fillStyle = o.a > 0 ? '#14965a' : '#6b7280'; og.font = '800 22px Inter'; og.textAlign = 'center'; og.fillText(o.a > 0 ? '+' : '−', x0 + 26, y + 43); og.textAlign = 'left';
      og.fillStyle = '#111'; og.font = '700 20px Inter'; og.fillText(o.l, x0 + 60, y + 31); og.fillStyle = '#6b7280'; og.font = '500 16px Inter'; og.fillText(o.s, x0 + 60, y + 54);
      og.textAlign = 'right'; og.font = '800 20px Inter'; og.fillStyle = o.a > 0 ? '#14965a' : '#111'; og.fillText((o.a > 0 ? '+' : '') + money(o.a, Math.abs(o.a) < 1000), xr - 4, y + 43); og.textAlign = 'left';
      og.globalAlpha = 1;
    });
    og.restore(); og.restore();
  }

  // --- l'arrêt sur image : Rémy, millionnaire, face à la mer
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 4.4, title: 'ARRÊT SUR IMAGE · RÉMY, MULTIMILLIONNAIRE', tags: [
      { at: () => A.point('Head').add(v3(0, 0.1, 0)), title: 'TÊTE', lines: ['plus jamais peur', 'd’une facture'], risk: 'ok', side: 'left', dy: 40 },
      { at: () => A.point('RightHand'), title: 'TÉLÉPHONE', lines: ['des « amis » perdus', 'de vue le rappellent'], risk: 'mal', side: 'right', dy: -300 },
      { at: () => A.point('Spine'), title: 'SON ARGENT', lines: ['+18 680 € par jour,', 'sans travailler'], risk: 'ok', side: 'left', dy: 190 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // =====================================================================
  //  LES PLANS
  // =====================================================================
  const SHOTS = [
    { id: 'tabac', t0: SH.tabac, cam: (u) => ({ p: P(lerp(-1.9, -1.6, u), 1.6, lerp(2.0, 1.8, u)), l: P(0.3, 1.25, -0.9), fov: 54 }) },
    { id: 'ticket', t0: SH.ticket, near: 0.02, cam: (u) => ({ p: TKc.mesh.position.clone().add(v3(lerp(0.0, 0.02, u), lerp(0.24, 0.2, u), lerp(0.2, 0.16, u))), l: TKc.mesh.position.clone(), fov: 40 }), dof: ['ticketc', 0.03] },
    { id: 'tirage', t0: SH.tirage, cam: (u) => ({ p: R(lerp(1.55, 1.4, u), 1.25, lerp(0.95, 0.85, u)), l: R(-1.62, 1.05, 0.45), fov: 50 }), dof: ['tv', 0.012] },
    { id: 'check', t0: SH.check, near: 0.02, cam: (u) => { const c = TK.mesh.getWorldPosition(v3(0, 0, 0)); const n = v3(0, 0, 1).applyQuaternion(TK.mesh.getWorldQuaternion(new THREE.Quaternion())); return { p: c.clone().addScaledVector(n, lerp(0.34, 0.28, u)).add(v3(0, 0.03, 0)), l: c, fov: 40 }; }, fill: 0.7, dof: ['ticket', 0.03] },
    { id: 'joie', t0: SH.joie, cam: (u) => ({ p: R(lerp(-1.05, -0.95, u), lerp(1.0, 0.95, u), lerp(1.7, 1.55, u)), l: R(0.05, 0.75, 0.5), fov: 56 }), fill: 0.5 },
    { id: 'banque', t0: SH.banque, cam: () => ({ p: R(1.5, 1.4, 1.6), l: R(0.5, 1.0, 0.3), fov: 50 }), dof: [0.4, 0.06] },
    { id: 'multi', t0: SH.multi, near: 0.03, cam: (u, ts) => mcam(ts) },
    { id: 'amis', t0: SH.amis, cam: () => ({ p: R(1.2, 1.5, 1.4), l: R(-0.2, 1.3, -1.2), fov: 50 }), dof: [0.4, 0.06] },
    { id: 'villa', t0: SH.villa, cam: (u) => ({ p: W(lerp(11.5, 10.0, u), lerp(2.0, 1.7, u), lerp(6.8, 6.2, u)), l: W(lerp(-1.5, -2.5, u), 2.0, -6.5), fov: 56 }), villa: 'couchant' },
    { id: 'voiture', t0: SH.voiture, cam: (u) => ({ p: W(lerp(-10.6, -11.2, u), 0.75, lerp(3.4, 3.0, u)), l: W(-14.6, 0.9, -4.4), fov: 52 }), villa: 'couchant' },
    { id: 'jet', t0: SH.jet, cam: (u, ts) => { const j = jet.position; return { p: j.clone().add(v3(lerp(12, 7, u), lerp(3.5, 2.5, u), lerp(-17, -15, u))), l: j.clone().add(v3(-1, 0.3, 0)), fov: 46 }; }, villa: 'couchant', jet: true },
    { id: 'solde', t0: SH.solde, cam: () => ({ p: W(7.5, 1.4, 4.6), l: W(4.0, 0.8, 2.8), fov: 50 }), villa: 'couchant', dof: [0.4, 0.06] },
    { id: 'interets', t0: SH.interets, cam: (u) => ({ p: W(lerp(0.4, 0.7, u), 1.75, lerp(3.4, 3.8, u)), l: W(2.2, 1.25, 12), fov: 50 }), villa: 'couchant' },
    { id: 'jamais', t0: SH.jamais, cam: (u) => ({ p: W(lerp(9.8, 9.4, u), 1.45, lerp(6.4, 6.0, u)), l: W(4.4, 0.8, 2.8), fov: 42 }), villa: 'jour' },
    { id: 'dix', t0: SH.dix, cam: (u) => ({ p: W(lerp(11, 9.5, u), lerp(1.9, 1.7, u), lerp(5.5, 5.0, u)), l: W(lerp(1.5, 2.5, u), 1.3, -3.0), fov: 54 }), villa: 'nuit' },
    { id: 'end', t0: SH.end, cam: () => ({ p: P(-1.9, 1.6, 2.0), l: P(0.3, 1.25, -0.9), fov: 54 }) },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };
  const LIGHTS = [...TB.lights, bedLamp, dayL, TV.light, key, rim, wide, fill, CH.winL, ...V.lights];
  const hms = (s) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;

  function update(t) {
    const ts0 = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts0); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts0 - S.t0) / (nextT(S) - S.t0));
    const ts = Q.get('shot') ? S.t0 + u * (nextT(S) - S.t0) : ts0;
    const shop = ['tabac', 'ticket', 'end'].includes(S.id), room = ['tirage', 'check', 'joie', 'banque', 'amis'].includes(S.id), day = S.id === 'amis' || S.id === 'banque', multi = S.id === 'multi';
    poseAll(ts, S.id);
    // les lumières de chaque décor (on éteint celles des autres décors)
    TB.on(shop ? (S.id === 'ticket' ? 0.3 : 1) : 0);
    CH.view(day ? 'jour' : 'nuit'); bedLamp.intensity = room && !day ? 2.6 : 0; dayL.intensity = room && day ? 2.4 : 0; CH.winL.intensity = room ? (day ? 24 : 6) : 0; CH.amb.intensity = room ? (day ? 0.8 : 0.2) : 0;
    const wideK = multi ? sm(M.crowd - 0.4, M.crowd + 2.2, ts) : 0;
    key.intensity = multi ? 190 : 0; rim.intensity = multi ? 1.1 : 0; wide.intensity = multi ? 1.6 * wideK : 0;
    hemi.intensity = multi ? 0.4 + 0.5 * wideK : room || shop ? 0.3 : 0;
    // la villa : coucher de soleil, plein jour, nuit
    const vm = S.villa; V.root.visible = V.sky.dome.visible = V.sky.sun.visible = !!vm; car.visible = !!vm && !S.jet; jet.visible = clouds.visible = !!S.jet;
    if (vm) { const f = V.set(vm); scene.fog.color.set(f[0]); scene.fog.near = f[1]; scene.fog.far = f[2]; scene.background.set(f[0]); V.update(ts); if (S.jet) V.winL.intensity = V.poolL.intensity = V.gardenL.intensity = 0; }
    else { V.off(); if (multi) { scene.fog.color.copy(FOGM); scene.fog.near = lerp(40, 60, wideK); scene.fog.far = lerp(150, 190, wideK); scene.background.copy(FOGM); } else { scene.fog.color.set('#07080c'); scene.fog.near = 60; scene.fog.far = 400; scene.background.set('#07080c'); } }
    V.glass.visible = S.id !== 'solde';
    // le jet : il file au-dessus des nuages, avec un léger roulis ; le flash de la queue clignote
    jet.position.copy(JET0).add(v3((ts - SH.jet) * 110, Math.sin(ts * 0.8) * 1.5, 0)); jet.rotation.set(0.08 * Math.sin(ts * 0.6), 0, 0.02); jet.userData.flash.visible = Math.floor(ts * 1.2) % 2 === 0;
    // la télé, le ticket
    const balls = S.id === 'tirage' ? 1 + 6 * clamp((ts - SH.tirage - 0.2) / 1.4) : room && !day ? 7 : 0; TV.draw(balls); TV.light.intensity = room && !day ? 1.8 : 0;
    if (room) { const [h1, m1, s1] = CLOCK0[S.id].split(':').map(Number); CH.clock(hms(h1 * 3600 + m1 * 60 + s1 + ts - S.t0).slice(0, 5)); }
    TK.mark(S.id === 'check' ? 7 * clamp((ts - SH.check - 0.1) / 1.1) : S.id === 'tirage' ? 0 : 7);
    // l'effet multiplication
    const LY = B.size[1];
    hero.visible = multi && ts < M.land;
    if (hero.visible) { const fall = sm(M.drop, M.land, ts), spin = ts * 0.6 * (1 - fall); hero.position.copy(S0(0, lerp(1.08 + Math.sin(ts * 1.3) * 0.012, LY / 2, fall * fall), 0)); hero.rotation.set(lerp(0.35 * Math.sin(ts * 0.7), 0, fall), spin + 0.4 * (1 - fall), 0); }
    const NB = pile.update(multi ? ts : 0); pile.mesh.visible = multi;
    const NPc = crowd.update(multi ? ts : 0, { light: 0.75 + 0.35 * wideK, fogNear: scene.fog.near, fogFar: scene.fog.far }); crowd.flat.visible = multi; crowd.real.forEach((p) => { p.root.visible = multi && ts >= p.ta; });
    eq.opacity(multi ? sm(M.crowd + 0.1, M.crowd + 0.6, ts) : 0); eq.set(2, fr(NPc));
    // la caméra
    const C = S.cam(u, ts);
    if (Q.get('cp')) { const base = S.villa ? V.at : v3(0, 0, 0); C.p = base.clone().add(v3(...Q.get('cp').split(',').map(Number))); C.l = base.clone().add(v3(...Q.get('cl').split(',').map(Number))); if (Q.get('cf')) C.fov = Number(Q.get('cf')); }
    camera.near = S.near ?? 0.1; camera.far = S.jet ? 4000 : 2400; camera.fov = C.fov; camera.up.copy(C.up ?? v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    const fz = FZ.active(t);
    if (fz) { camera.updateMatrixWorld(); const tp = A.point('Spine2').project(camera); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.15, k); }
    camera.updateProjectionMatrix();
    const d = S.dof || [0]; let focus = d[0];
    const target = { ticketc: () => TKc.mesh.position, ticket: () => TK.mesh.getWorldPosition(v3(0, 0, 0)), tv: () => TV.root.position.clone().add(v3(0, 0.3, 0)) }[focus]; if (target) focus = camera.position.distanceTo(target());
    PS.dof(frozen ? 0 : focus, d[1] ?? 0.02); PS.look('normal', { sat: vm ? 0.95 : 0.85 });
    fill.intensity = S.fill ?? 0; fill.position.copy(camera.position).add(v3(0, 0.3, 0));
    for (const l of LIGHTS) l.visible = l.intensity > 0;

    // --- le relevé de compte (banque, amis, solde)
    const bank = ['banque', 'amis', 'solde'].includes(S.id);
    og.clearRect(0, 0, 1080, 1920); ov.style.visibility = bank ? 'visible' : 'hidden';
    const c0 = CLOCK0[S.id]; let sec = 0; if (c0) { const [hh, mm, ss] = c0.split(':').map(Number); sec = hh * 3600 + mm * 60 + ss + (ts - S.t0); }
    if (bank) drawBank(ts, sm(S.t0, S.t0 + 0.45, ts), hms(sec).slice(0, 5));

    // --- textes
    HUD.hook(t, 'Et si tu gagnais le jackpot<br>de l’<em>EuroMillions</em> ?', T.hookOut);
    const lab = { tabac: 'TABAC · NANTES · CAM 01', ticket: 'TABAC · NANTES · CAM 02', tirage: 'CHEZ RÉMY · CAM 03', check: 'CHEZ RÉMY · CAM 04', joie: 'CHEZ RÉMY · CAM 03', banque: 'SON APPLI BANCAIRE',
      multi: 'SON GAIN, EN VRAI', amis: 'SON APPLI BANCAIRE', villa: 'SA VILLA · CAM 01', voiture: 'SA VILLA · CAM 02', jet: 'AU-DESSUS DE L’ATLANTIQUE', solde: 'SON APPLI BANCAIRE', interets: 'SA VILLA · CAM 03',
      jamais: 'SA VILLA · LE LENDEMAIN', dix: 'SA VILLA · 10 ANS PLUS TARD', end: '' }[S.id];
    HUD.live(t, lab, c0 ? hms(sec) : '', 'SIMULATION');
    let tl = false;
    if (S.id === 'ticket') { HUD.block(1, { label: 'SA MISE', value: '2,50 €', sub: '1 GRILLE · 1 CHANCE SUR 139 838 160' }); HUD.show2(false); tl = true; }
    else if (S.id === 'joie') { HUD.block(1, { label: 'JACKPOT', value: '250 000 000 €', sub: 'LE MAXIMUM POSSIBLE · SANS IMPÔT', color: '#ffcf6b' }); HUD.show2(false); tl = true; }
    else if (multi && ts > M.one + 0.3) {
      if (ts < M.crowd - 0.2) { const n = Math.max(1, NB); HUD.block(1, { label: 'LIASSES', value: fr(n), sub: '100 BILLETS DE 100 €' }); HUD.block(2, { label: 'SON GAIN', value: `${fr(n * LIASSE)} €`, sub: n >= NL ? 'LE JACKPOT MAXIMUM' : '', color: n >= NL ? '#ffcf6b' : '#fff' }); HUD.show2(true); }
      else { HUD.block(1, { label: 'PERSONNES PAYÉES', value: fr(NPc), sub: 'AU SMIC PENDANT UN AN', color: '#ffcf6b' }); HUD.show2(false); }
      tl = true;
    }
    else if (S.id === 'villa') { HUD.block(1, { label: 'PRIX', value: '6 000 000 €', sub: 'VILLA FACE À LA MER, AVEC PISCINE' }); HUD.show2(false); tl = true; }
    else if (S.id === 'voiture') { HUD.block(1, { label: 'PRIX', value: '250 000 €', sub: 'VOITURE DE SPORT' }); HUD.show2(false); tl = true; }
    else if (S.id === 'jet') { HUD.block(1, { label: 'JET PRIVÉ', value: '5 000 € / h', sub: '60 H DE VOL : 300 000 €' }); HUD.show2(false); tl = true; }
    else if (S.id === 'interets') { HUD.block(1, { label: 'IL LUI RESTE', value: '227 271 236 €', sub: 'PLACÉS À 3 % PAR AN', color: '#ffcf6b' }); HUD.block(2, { label: 'CE QUE ÇA RAPPORTE', value: '+18 680 € / jour', sub: 'AVANT IMPÔTS', color: '#9fe0b0' }); HUD.show2(ts > SH.interets + 1.2); tl = true; }
    else if (S.id === 'jamais') { HUD.block(1, { label: 'IL DÉPENSE', value: '−10 000 € / jour', sub: '' }); HUD.block(2, { label: 'SES INTÉRÊTS', value: '+18 680 € / jour', sub: 'SON COMPTE GRANDIT QUAND MÊME', color: '#9fe0b0' }); HUD.show2(ts > SH.jamais + 0.8); tl = true; }
    else if (S.id === 'dix') { HUD.block(1, { label: 'RÉMY', value: '10 ANS PLUS TARD', sub: 'HYPOTHÈSE', color: '#ffcf6b' }); HUD.show2(false); tl = true; }
    else HUD.show2(false);
    document.getElementById('tl').style.opacity = tl && !frozen ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    HUD.subs(t, SUBS_V);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : FDJ · LEGISOCIAL · SERVICE-PUBLIC · BLADE · LINDQVIST, ÖSTLING & CESARINI (2020)', q: 'Et toi, tu achèterais<br>quoi en premier ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)),
    M: Object.fromEntries(Object.entries(M).map(([k, x]) => [k, FZ.realT(x)])), ops: OPS.filter((o) => o.at > 0).map((o) => FZ.realT(o.at)),
    balls: [FZ.realT(SH.tirage + 0.2), FZ.realT(SH.tirage + 1.6)], marks: [FZ.realT(SH.check + 0.1), FZ.realT(SH.check + 1.2)] }) };
}

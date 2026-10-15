// =====================================================================
//  « Et si tu ne dormais plus du tout ? » — version 2 (format RECONSTITUTION, règle du 15/10 : on raconte une réalité
//  qui PEUT arriver, de plus en plus loin, avec un personnage qui a un prénom).
//  Josh, 27 ans, Lyon, décide de ne plus jamais dormir. Le compteur avance : 24 h, 48 h, 72 h, 5e jour, 11e jour (le vrai
//  record), puis on imagine la suite : 14e jour, la ruse de son cerveau, le 21e jour où il s'effondre… et se réveille.
//
//  Faits (vérifiés le 15/10/2026, sources dans la légende) :
//   - 24 h éveillé ≈ 0,10 % d'alcool dans le sang (1 g/L) (CDC / NIOSH) ; le manque de sommeil ouvre l'appétit ;
//   - pendant la privation, des zones du cerveau « s'endorment » localement pendant qu'on est éveillé (Nir et al., Nature
//     Medicine, 2017 ; université de Tel-Aviv) ;
//   - 24-48 h : perceptions déformées, désorientation dans le temps ; 48-90 h : hallucinations complexes ; après 72 h : idées
//     délirantes ; vers le 5e jour : un état proche d'une psychose (Waters et al., Frontiers in Psychiatry, 2018) ;
//   - Randy Gardner, 1964 : 264 heures (11 jours) ; au 11e jour, il s'est arrêté à 65 en enlevant 7 à partir de 100, « il avait
//     oublié ce qu'il faisait » ; il a ensuite dormi 14 h 46 et s'en est remis (récit de William Dement) ;
//   - rats privés de sommeil : ils mangent plus mais maigrissent, leur température baisse, des lésions de peau apparaissent ;
//     ils meurent en 2 à 3 semaines (expériences de Rechtschaffen, 1983-1989 ; université de Tokyo) ;
//   - les dauphins dorment avec une moitié du cerveau à la fois.
//   Au-delà du 11e jour, c'est une HYPOTHÈSE (annoncée à l'écran) : ce qui pourrait arriver à Josh.
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, rng } from '../../engine.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2, pixTex } from '../../lib-ps2.js';
import { buildStreet } from '../../lib-rue.js';
import { buildBedroom } from '../../lib-nuit.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SH = { nuit: 0, h24: 6.0, h48: 10.0, h72: 14.0, j5: 18.0, j11: 22.0, hypo: 26.0, j14: 28.5, ruse: 36.5, j21: 42.5, dodo: 44.2, reveil: 46.5, end: 51.0 };
const sceneEnd = 54.0;
const FZ1 = 19.6, FZ2 = 30.8;
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 5.9, 'Josh, 27 ans, Lyon. Ce soir, il décide de ne plus jamais dormir.'],
  [6.2, 9.8, '24 h : il a les réflexes de quelqu’un à 1 g d’alcool. Et une faim de loup.'],
  [10.1, 12.4, '48 h : des morceaux de son cerveau s’endorment tout seuls, pendant qu’il marche.'],
  [12.5, 13.9, 'Il oublie ce qu’il vient de faire.'],
  [14.2, 17.8, '72 h : il voit des choses qui n’existent pas. Il ne sait plus quel jour on est.'],
  [18.1, 21.8, '5e jour : son esprit décroche. Les médecins comparent ça à une psychose.'],
  [22.1, 25.8, '11e jour : le record connu. En 1964, Randy Gardner n’arrivait plus à faire un calcul tout simple.'],
  [26.1, 28.3, 'Personne n’est jamais allé plus loin. Imaginons que Josh, lui, continue.'],
  [28.6, 32.4, '14e jour : il mange deux fois plus… et maigrit quand même. Il grelotte en plein été.'],
  [32.6, 36.3, 'C’est ce qu’on a vu chez les rats privés de sommeil. Eux meurent en 2 à 3 semaines.'],
  [36.6, 40.3, 'Mais le cerveau de Josh trouve une ruse : il dort par petits bouts, une zone après l’autre.'],
  [40.4, 42.3, 'Un peu comme les dauphins, qui dorment une moitié du cerveau à la fois.'],
  [42.6, 46.3, '21e jour : son corps tire le frein à main. Josh s’effondre et dort 14 heures d’affilée.'],
  [46.6, 50.7, 'Au réveil, il va bien. Comme Randy Gardner, qui s’en était remis en une seule longue nuit.'],
];
// le compteur : depuis combien de temps Josh ne dort pas, plan par plan
const AWAKE = { nuit: ['0 h', 'JOUR 1'], h24: ['24 h', 'JOUR 2'], h48: ['48 h', 'JOUR 3'], h72: ['72 h', 'JOUR 4'], j5: ['5 JOURS', ''], j11: ['11 JOURS', 'LE RECORD CONNU'], hypo: ['11 JOURS', 'AU-DELÀ : HYPOTHÈSE'], j14: ['14 JOURS', 'HYPOTHÈSE'], ruse: ['19 JOURS', 'HYPOTHÈSE'], j21: ['21 JOURS', 'HYPOTHÈSE'], dodo: ['0 h', 'HYPOTHÈSE'], reveil: ['14 h', 'IL SE RÉVEILLE'] };
const CLOCK0 = { nuit: '23:04:10', h24: '23:10:02', h48: '23:41:30', h72: '23:15:44', j5: '04:12:09', j11: '15:30:00', hypo: '02:18:40', j14: '13:02:51', ruse: '03:33:12', j21: '19:47:05', dodo: '19:48:40', reveil: '10:01:30' };
const TEXT0 = 3.1, HOLD = { off: [0.0, 0.1, 0.045], rot: [0, 0, 0] };

export default async function () {
  const stage = createStage({ fov: 50, far: 2400, bloom: [0.4, 0.5, 0.84], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.3;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#9fc4ff');
  scene.background = new THREE.Color('#05060b');
  scene.fog = new THREE.Fog('#06070c', 40, 300);
  const hemi = new THREE.HemisphereLight('#3a4466', '#0e0d0b', 0.3); scene.add(hemi);
  const fill = new THREE.PointLight('#dfe6ff', 0, 5, 1.5); scene.add(fill);

  // --- les décors : la chambre de Josh (z = 400, vue sur Lyon) et la rue de nuit (à l'origine)
  const CH = buildBedroom(scene, { at: v3(0, 0, 400) });
  const R = (x, y, z) => CH.at.clone().add(v3(x, y, z));
  const RUE = buildStreet(scene, { night: true });
  const dayL = new THREE.DirectionalLight('#fff1dc', 0); dayL.position.copy(R(0.3, 4, -8)); dayL.target.position.copy(R(0.8, 0, 0.5)); dayL.castShadow = true; dayL.shadow.mapSize.set(1024, 1024);
  Object.assign(dayL.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); scene.add(dayL, dayL.target);
  const bedLamp = new THREE.PointLight('#ffb867', 0, 4, 1.6); bedLamp.position.copy(R(0.2, 0.9, -0.2)); scene.add(bedLamp);
  const deskLamp = new THREE.PointLight('#ffd9a0', 0, 3.5, 1.6); deskLamp.position.copy(R(-1.7, 1.35, -0.05)); scene.add(deskLamp);
  // les boîtes de pizza : une pile sur le bureau, puis des piles par terre, derrière lui (il mange de plus en plus)
  const pizzaT = pixTex(16, 16, (g, w, h) => { g.fillStyle = '#c9a77a'; g.fillRect(0, 0, w, h); g.fillStyle = '#b5382c'; g.fillRect(3, 3, 10, 10); g.fillStyle = '#f3e6c4'; g.fillRect(5, 6, 6, 4); });
  const boxM = new THREE.MeshStandardMaterial({ color: '#c9a77a' }), boxTop = new THREE.MeshStandardMaterial({ map: pizzaT });
  const SPOTS = [[-1.62, 0.778, 0.85, 6], [0.15, 0, 1.25, 7], [-0.35, 0, 1.75, 7], [0.55, 0, 1.75, 5]];
  const boxes = [];
  SPOTS.forEach(([x, y, z, n], j) => { for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.045, 0.36), [boxM, boxM, boxTop, boxM, boxM, boxM]);
    b.position.copy(R(x + Math.sin(i * 2.1 + j) * 0.02, y + 0.0225 + i * 0.046, z + Math.cos(i * 1.7 + j) * 0.02)); b.rotation.y = Math.sin(i * 1.3 + j * 2) * 0.25; b.castShadow = b.receiveShadow = true; scene.add(b); boxes.push(b); } });
  // la feuille du calcul (11e jour) : 100 − 7 = 93, 86, 79, 72, 65… puis plus rien
  const pc = document.createElement('canvas'); pc.width = 96; pc.height = 128; const pg = pc.getContext('2d'); const ptex = new THREE.CanvasTexture(pc); ptex.magFilter = THREE.NearestFilter; ptex.minFilter = THREE.NearestFilter; ptex.generateMipmaps = false; ptex.colorSpace = THREE.SRGBColorSpace;
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.9 })); paper.rotation.set(-Math.PI / 2, 0, 0.06); paper.position.copy(R(-1.5, 0.779, 0.2)); paper.receiveShadow = true; scene.add(paper);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), new THREE.MeshStandardMaterial({ color: '#1d2a6b' })); pen.rotation.set(Math.PI / 2, 0, 0.9); pen.position.copy(R(-1.4, 0.785, 0.27)); scene.add(pen);
  let paperShown = -1;
  const drawPaper = (k) => { k = Math.floor(k); if (k === paperShown) return; paperShown = k; pg.fillStyle = '#f2efe6'; pg.fillRect(0, 0, 96, 128); pg.strokeStyle = 'rgba(80,110,180,.35)'; for (let y = 16; y < 128; y += 12) { pg.beginPath(); pg.moveTo(0, y + 0.5); pg.lineTo(96, y + 0.5); pg.stroke(); }
    pg.fillStyle = '#1d2a6b'; pg.font = 'bold 12px monospace'; const L = ['100-7 = 93', ' 93-7 = 86', ' 86-7 = 79', ' 79-7 = 72', ' 72-7 = 65', ' 65-7 = ?'];
    for (let i = 0; i < Math.min(k, L.length); i++) pg.fillText(L[i], 8, 27 + i * 12);
    if (k >= 7) { pg.strokeStyle = '#1d2a6b'; pg.lineWidth = 1.5; pg.beginPath(); for (let x = 0; x < 50; x++) pg.lineTo(14 + x, 100 + Math.sin(x * 0.6) * 3 + x * 0.25); pg.stroke(); }
    ptex.needsUpdate = true; };
  drawPaper(0);

  // --- Josh (le modèle « Josh » de Mixamo : veste, jean) ; « l'ombre » des hallucinations (James, tout en noir)
  const CAST = await loadMixamo({ chars: ['Josh', 'James'], anims: ['idle', 'sit', 'texting', 'yawn', 'walk', 'lookaround', 'fallback'] });
  const A = CAST.make('Josh', { height: 1.8 }), SHADOW = CAST.make('James', { height: 1.95 });
  scene.add(A.root, SHADOW.root);
  SHADOW.mats.forEach((m) => { m.color = new THREE.Color('#000'); m.map = null; m.roughness = 1; m.needsUpdate = true; });
  const phone = new THREE.Group(); phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshBasicMaterial({ color: '#cfe2ff', toneMapped: false })); scr.position.z = 0.0051; phone.add(scr);
  A.hold(phone, 'RightHand', HOLD);
  // une part de pizza dans la main gauche (2e et 14e jour)
  const slice = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.065, 0.15); sh.lineTo(-0.065, 0.15); sh.closePath();
  const wedge = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#f1b544', roughness: 0.7 })); wedge.position.z = -0.006; slice.add(wedge);
  const crust = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.02), new THREE.MeshStandardMaterial({ color: '#b5763a' })); crust.position.y = 0.15; slice.add(crust);
  for (const [x, y] of [[0, 0.06], [-0.022, 0.11], [0.025, 0.115]]) { const pe = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), new THREE.MeshStandardMaterial({ color: '#b1352a' })); pe.position.set(x, y, 0.0065); slice.add(pe); }
  A.hold(slice, 'LeftHand', { off: (Q.get('so') || '0,0.1,0.04').split(',').map(Number), rot: (Q.get('sr') || '-1.57,0,3.14').split(',').map(Number) });
  const phoneL = new THREE.PointLight('#bcd4ff', 0, 1.6, 1.6); scene.add(phoneL);
  const duvet2 = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.12, 1.45), new THREE.MeshStandardMaterial({ color: '#3f5f86', roughness: 0.95 })); duvet2.position.copy(R(1.2, 0.84, 0.92)); duvet2.rotation.set(0.04, 0.03, -0.03); duvet2.castShadow = duvet2.receiveShadow = true; scene.add(duvet2);
  const BED = R(0.55, 0, 0.25), BED_RY = -1.15, DESK = R(-0.95, 0, 0.35), DESK_RY = -Math.PI / 2;
  const jitter = (ts, k) => (Math.sin(ts * 47) * 0.035 + Math.sin(ts * 31 + 1) * 0.025) * k;   // le grelottement
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), X = v3(1, 0, 0), Y = v3(0, 1, 0);
  function poseJosh(ts, S) {
    A.root.rotation.set(0, 0, 0); A.root.scale.set(1, 1, 1); phone.visible = false; slice.visible = false; phoneL.intensity = 0; A.root.visible = true;
    const thin = ['j14', 'ruse', 'j21', 'dodo'].includes(S) ? 0.86 : 1; A.root.scale.set(thin, 1, thin);   // il a maigri
    if (S === 'nuit' || S === 'end') {   // assis au bord du lit, le téléphone à la main
      A.root.position.copy(BED); A.root.rotation.y = BED_RY; A.pose([['sit', 2.0, 1, LOWER], ['texting', TEXT0 + 0.1 * Math.sin(ts * 1.2), 1, UPPER]], { Neck: [['x', 0.15]] });
      phone.visible = true; phoneL.intensity = 0.6; phoneL.position.copy(A.point('RightHand')).add(v3(0, 0.15, 0)); return;
    }
    if (S === 'h24' || S === 'j14') {   // au bureau, une part de pizza à la main ; au 14e jour, il grelotte
      A.root.position.copy(DESK); A.root.rotation.y = DESK_RY; const k = S === 'j14' ? 1 : 0;
      A.pose([['sit', 2.0, 1, LOWER], ['texting', TEXT0 + 0.15 * Math.sin(ts * 0.9), 1, UPPER]], { Spine1: [['x', 0.02 + jitter(ts, k)], ['z', jitter(ts + 2, k)]], Neck: [['x', -0.3 + jitter(ts + 1, k)]], Head: [['x', -0.15]], LeftArm: [['z', jitter(ts + 3, k)]] });
      slice.visible = true; return;
    }
    if (S === 'h48') {   // il marche dans la rue… et s'arrête net plus d'une seconde (des zones de son cerveau dorment)
      const u = ts - SH.h48, stop = u > 1.5 && u < 2.9, wt = Math.min(u, 1.5) + Math.max(0, u - 2.9);
      A.root.position.set(4.6 + 1.15 * wt, 0, -4.6); A.root.rotation.y = Math.PI / 2;
      if (stop) A.pose('walk', 1.5 * 0.95, { Neck: [['x', 0.45]], Head: [['x', 0.2]], Spine1: [['x', 0.1]] }); else A.pose('walk', wt * 0.95); return;
    }
    if (S === 'h72' || S === 'hypo') { A.root.position.copy(R(1.05, 0, 1.0)); A.root.rotation.y = -2.38; A.pose('idle', ts, { Neck: [['x', 0.05]], Spine: [['x', -0.06]] }); return; }
    if (S === 'j5') { A.root.position.copy(R(-0.1, 0, -0.4)); A.root.rotation.y = 0.55; A.pose([['lookaround', ts * 0.5, 0.5], ['idle', ts, 0.5]], { Spine: [['x', 0.18]], Neck: [['x', 0.2]], Head: [['z', 0.12]] }); return; }
    if (S === 'j11') { A.root.position.copy(DESK); A.root.rotation.y = DESK_RY; A.pose([['sit', 2.0, 1, LOWER], ['idle', ts, 1, UPPER]], { Spine1: [['x', 0.3]], Neck: [['x', 0.35]], RightArm: [['x', -0.65]], RightForeArm: [['x', -0.6]] }); return; }
    if (S === 'ruse') { A.root.visible = false; return; }
    if (S === 'j21') {   // assis au bord du lit, il bascule en arrière, d'un coup
      const k = sm(0.35, 1.45, ts - SH.j21), th = 1.1 * k * k;
      A.root.position.copy(BED); A.root.rotation.y = BED_RY;
      A.pose([['sit', 2.0, 1, LOWER], ['idle', ts, 1, UPPER]], { Neck: [['x', 0.35 * (1 - k)]], Spine1: [['x', 0.25 * (1 - k)]], LeftArm: [['z', 0.5 * k]], RightArm: [['z', -0.5 * k]] });
      const H0 = A.point('Hips'), qy = qa.setFromAxisAngle(Y, BED_RY), local = H0.clone().sub(BED).applyQuaternion(qy.clone().invert());
      const q = qy.clone().multiply(qb.setFromAxisAngle(X, -th)); A.root.quaternion.copy(q); A.root.position.copy(H0).sub(local.applyQuaternion(q)); return;
    }
    if (S === 'dodo') { A.root.position.copy(R(1.2, 0.74, 1.62)); A.root.rotation.set(-Math.PI / 2, 0, 0); A.pose('idle', 0.5, { LeftArm: [['z', 0.25]], RightArm: [['z', -0.25]], Head: [['z', 0.35]] }); return; }
    if (S === 'reveil') { A.root.position.copy(R(-0.2, 0, -1.2)); A.root.rotation.y = 0.5; A.pose('yawn', 1.0 + (ts - SH.reveil) * 1.1); return; }
  }
  function poseShadow(ts, S) {
    SHADOW.root.visible = S === 'h72' && Math.floor(ts * 3.1) % 7 !== 3;
    SHADOW.root.position.copy(R(-1.35, 0, -1.6)); SHADOW.root.rotation.y = 0.75; SHADOW.pose('idle', ts * 0.5, { Neck: [['x', 0.25]] });
  }

  // --- le calque 2D (sous les sous-titres) : le cerveau de Josh, des zones qui s'endorment chacune leur tour ; le dauphin ; le tampon « HYPOTHÈSE »
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  const hud = document.getElementById('hud'); hud.insertBefore(ov, document.getElementById('subt')); const og = ov.getContext('2d');
  const r0 = rng(12), ZONES = [];
  for (let i = 0; i < 16; i++) { let x, y; do { x = r0() * 1.7 - 0.85; y = r0() * 0.95 - 0.6; } while ((x * x) / 0.8 + ((y + 0.12) * (y + 0.12)) / 0.25 > 1); ZONES.push([x, y, i / 16 + r0() * 0.04]); }
  const GYRI = []; for (let i = 0; i < 14; i++) { const pts = [], x0 = r0() * 1.6 - 0.9, y0 = r0() * 0.9 - 0.6, a = r0() * Math.PI; for (let k = 0; k < 9; k++) { const s = k * 0.07; pts.push([x0 + Math.cos(a) * s + Math.sin(k * 1.9) * 0.025, y0 + Math.sin(a) * s + Math.cos(k * 1.7) * 0.025]); } GYRI.push(pts); }
  function brainPath(s) {
    const P = (x, y) => [x * s, y * s]; og.beginPath(); og.moveTo(...P(-0.92, 0.18));
    og.bezierCurveTo(...P(-1.06, -0.12), ...P(-0.85, -0.5), ...P(-0.5, -0.62)); og.bezierCurveTo(...P(-0.15, -0.74), ...P(0.4, -0.72), ...P(0.72, -0.45));
    og.bezierCurveTo(...P(1.0, -0.2), ...P(1.02, 0.12), ...P(0.8, 0.3)); og.bezierCurveTo(...P(0.6, 0.42), ...P(0.3, 0.32), ...P(0.12, 0.3));
    og.bezierCurveTo(...P(-0.1, 0.5), ...P(-0.5, 0.5), ...P(-0.68, 0.38)); og.bezierCurveTo(...P(-0.8, 0.32), ...P(-0.9, 0.28), ...P(-0.92, 0.18)); og.closePath();
  }
  function brain(cx, cy, s, sleep) {   // sleep(i) → 0 (éveillé) à 1 (endormi)
    og.save(); og.translate(cx, cy);
    og.fillStyle = '#3a2a2c'; og.beginPath(); og.ellipse(0.55 * s, 0.38 * s, 0.3 * s, 0.17 * s, -0.15, 0, 7); og.fill();   // le cervelet
    og.fillStyle = '#4a3436'; og.beginPath(); og.moveTo(0.18 * s, 0.3 * s); og.lineTo(0.36 * s, 0.32 * s); og.lineTo(0.3 * s, 0.75 * s); og.lineTo(0.16 * s, 0.73 * s); og.closePath(); og.fill();   // le tronc
    brainPath(s); og.save(); og.clip();
    const gr = og.createLinearGradient(0, -0.7 * s, 0, 0.5 * s); gr.addColorStop(0, '#ffc27a'); gr.addColorStop(1, '#f08a4b'); og.fillStyle = gr; og.fillRect(-1.1 * s, -0.8 * s, 2.2 * s, 1.4 * s);
    ZONES.forEach(([x, y], i) => { const a = sleep(i); if (a <= 0.01) return; const rg = og.createRadialGradient(x * s, y * s, 0, x * s, y * s, 0.3 * s);
      rg.addColorStop(0, `rgba(48,84,220,${0.95 * a})`); rg.addColorStop(0.6, `rgba(48,84,220,${0.75 * a})`); rg.addColorStop(1, 'rgba(48,84,220,0)'); og.fillStyle = rg; og.fillRect(-1.1 * s, -0.8 * s, 2.2 * s, 1.4 * s); });
    og.strokeStyle = 'rgba(70,20,20,0.35)'; og.lineWidth = s * 0.014; og.lineCap = 'round';
    for (const g of GYRI) { og.beginPath(); g.forEach(([x, y], k) => (k ? og.lineTo(x * s, y * s) : og.moveTo(x * s, y * s))); og.stroke(); }
    og.restore(); brainPath(s); og.strokeStyle = 'rgba(255,240,230,0.85)'; og.lineWidth = s * 0.012; og.stroke();
    og.fillStyle = '#fff'; og.font = `800 ${Math.round(s * 0.09)}px Inter`; og.textAlign = 'center';
    ZONES.forEach(([x, y], i) => { const a = sleep(i); if (a > 0.6) { og.globalAlpha = (a - 0.6) / 0.4; og.fillText('z', x * s, y * s + s * 0.03); } }); og.globalAlpha = 1;
    og.restore(); og.textAlign = 'left';
  }
  function dolphin(cx, cy, s, ts) {
    og.save(); og.translate(cx, cy + Math.sin(ts * 2) * 6); og.rotate(Math.sin(ts * 2 + 1) * 0.03);
    const P = (x, y) => [x * s, y * s];
    const gr = og.createLinearGradient(0, -0.3 * s, 0, 0.2 * s); gr.addColorStop(0, '#46698f'); gr.addColorStop(1, '#a9c1d6'); og.fillStyle = gr;
    og.beginPath(); og.moveTo(...P(-1.0, 0.02)); og.quadraticCurveTo(...P(-0.86, -0.05), ...P(-0.72, -0.07));
    og.bezierCurveTo(...P(-0.64, -0.24), ...P(-0.4, -0.27), ...P(-0.05, -0.24));
    og.bezierCurveTo(...P(0.04, -0.34), ...P(0.12, -0.48), ...P(0.24, -0.52)); og.quadraticCurveTo(...P(0.16, -0.36), ...P(0.22, -0.2));
    og.bezierCurveTo(...P(0.45, -0.14), ...P(0.68, -0.06), ...P(0.8, -0.03));
    og.quadraticCurveTo(...P(0.9, -0.12), ...P(1.0, -0.2)); og.quadraticCurveTo(...P(0.94, -0.04), ...P(0.9, 0)); og.quadraticCurveTo(...P(0.94, 0.04), ...P(1.0, 0.2)); og.quadraticCurveTo(...P(0.9, 0.12), ...P(0.8, 0.03));
    og.bezierCurveTo(...P(0.55, 0.12), ...P(0.15, 0.2), ...P(-0.2, 0.18)); og.bezierCurveTo(...P(-0.5, 0.16), ...P(-0.68, 0.1), ...P(-0.76, 0.05)); og.quadraticCurveTo(...P(-0.88, 0.05), ...P(-1.0, 0.02)); og.fill();
    og.beginPath(); og.moveTo(...P(-0.42, 0.12)); og.quadraticCurveTo(...P(-0.4, 0.3), ...P(-0.24, 0.36)); og.quadraticCurveTo(...P(-0.3, 0.2), ...P(-0.26, 0.14)); og.fillStyle = '#5a7ea3'; og.fill();
    og.fillStyle = '#111'; og.beginPath(); og.arc(...P(-0.66, -0.06), s * 0.018, 0, 7); og.fill();
    // son cerveau, vu de dessus : une moitié dort, l'autre veille (elles échangent de temps en temps)
    const sw = Math.floor(ts / 1.6) % 2, bx = -0.42 * s, by = -0.12 * s, br = 0.1 * s;
    og.fillStyle = sw ? '#3054dc' : '#f5a35a'; og.beginPath(); og.arc(bx, by, br, Math.PI / 2, Math.PI * 1.5); og.fill();
    og.fillStyle = sw ? '#f5a35a' : '#3054dc'; og.beginPath(); og.arc(bx, by, br, -Math.PI / 2, Math.PI / 2); og.fill();
    og.strokeStyle = '#fff'; og.lineWidth = 3; og.beginPath(); og.arc(bx, by, br, 0, 7); og.stroke();
    og.restore();
  }
  function drawOverlay(S, t, ts) {
    og.clearRect(0, 0, 1080, 1920); let vis = false;
    if (S === 'h48' && ts > SH.h48 + 1.35 && ts < SH.h48 + 3.1) {   // l'insert : son cerveau pendant qu'il « bloque » dans la rue
      vis = true; const a = sm(SH.h48 + 1.35, SH.h48 + 1.55, ts) * (1 - sm(SH.h48 + 2.9, SH.h48 + 3.1, ts)); og.globalAlpha = a;
      og.fillStyle = 'rgba(4,8,18,0.82)'; og.fillRect(540, 360, 480, 430); og.strokeStyle = 'rgba(159,196,255,0.6)'; og.lineWidth = 2; og.strokeRect(540, 360, 480, 430);
      og.font = '800 24px Inter'; og.fillStyle = '#fff'; og.fillText('SON CERVEAU, EN CE MOMENT', 566, 400);
      brain(780, 590, 200, (i) => ([2, 5, 9, 13].includes(i) ? sm(SH.h48 + 1.5, SH.h48 + 1.9, ts) : 0));
      og.font = '700 20px Inter'; og.fillStyle = '#7f9cff'; og.fillText('●  DES ZONES DORMENT', 566, 765); og.globalAlpha = 1;
    }
    if (S === 'ruse') {   // plein écran : le cerveau de Josh, zone par zone ; puis la comparaison avec le dauphin
      vis = true; og.fillStyle = '#03060e'; og.fillRect(0, 0, 1080, 1920);
      const u = ts - SH.ruse, dol = sm(3.75, 4.25, u), cy = 700 - 90 * dol, s = 400 - 90 * dol;
      og.font = '800 36px Inter'; og.fillStyle = '#fff'; og.textAlign = 'center'; og.fillText('LE CERVEAU DE JOSH · 19E JOUR', 540, 300 - 20 * dol);
      og.font = '600 24px Inter'; og.fillStyle = '#9fc4ff'; og.fillText('SIMULATION · HYPOTHÈSE', 540, 340 - 20 * dol); og.textAlign = 'left';
      brain(540, cy, s, (i) => { const f = (((ts * 0.42 + ZONES[i][2]) % 1) + 1) % 1; return sm(0, 0.08, f) * (1 - sm(0.3, 0.38, f)); });
      og.font = '700 28px Inter'; og.fillStyle = '#ffb067'; og.fillText('●  ÉVEILLÉ', 300, cy + s * 0.62 + 50); og.fillStyle = '#7f9cff'; og.fillText('●  ENDORMI', 620, cy + s * 0.62 + 50);
      if (dol > 0) { og.globalAlpha = dol; dolphin(540, 1500, 280, ts); og.font = '700 28px Inter'; og.fillStyle = '#fff'; og.textAlign = 'center'; og.fillText('LE DAUPHIN : UNE MOITIÉ DORT, L’AUTRE VEILLE', 540, 1660); og.textAlign = 'left'; og.globalAlpha = 1; }
    }
    if (S === 'hypo') {   // le tampon : on quitte le réel, on imagine
      vis = true; const a = sm(SH.hypo, SH.hypo + 0.25, ts), k = 1 + 0.4 * (1 - sm(SH.hypo, SH.hypo + 0.25, ts)); og.globalAlpha = a; og.save(); og.translate(540, 760); og.rotate(-0.12); og.scale(k, k);
      og.fillStyle = 'rgba(10,0,0,0.35)'; og.fillRect(-330, -80, 660, 160); og.strokeStyle = '#ff5a4f'; og.lineWidth = 8; og.strokeRect(-330, -80, 660, 160); og.font = '800 64px Inter'; og.fillStyle = '#ff5a4f'; og.textAlign = 'center'; og.fillText('HYPOTHÈSE', 0, 10); og.font = '700 26px Inter'; og.fillText('AU-DELÀ DU RECORD', 0, 56);
      og.restore(); og.globalAlpha = 1; og.textAlign = 'left';
    }
    ov.style.visibility = vis ? 'visible' : 'hidden';
  }

  // --- les arrêts sur image : son esprit (5e jour), puis son corps (14e jour)
  const FZ = makeFreeze([
    { at: FZ1, dur: 4.4, title: 'ARRÊT SUR IMAGE · 5E JOUR', tags: [
      { at: () => A.point('Head').add(v3(0, 0.1, 0)), title: 'CERVEAU', lines: ['idées délirantes,', 'comme une psychose'], risk: 'grave', side: 'right', dy: 10 },
      { at: () => A.point('Head').add(v3(0, -0.02, 0)), title: 'YEUX', lines: ['il voit des choses', 'qui n’existent pas'], risk: 'mal', side: 'left', dy: 90 },
      { at: () => A.point('Spine1'), title: 'MÉMOIRE', lines: ['il oublie ce qu’il', 'vient de faire'], risk: 'mal', side: 'right', dy: 160 } ] },
    { at: FZ2, dur: 4.4, title: 'ARRÊT SUR IMAGE · 14E JOUR (HYPOTHÈSE)', tags: [
      { at: () => A.point('Spine1'), title: 'ESTOMAC', lines: ['il mange 2 fois plus…', 'et maigrit quand même'], risk: 'mal', side: 'right', dy: -40 },
      { at: () => A.point('Neck'), title: 'TEMPÉRATURE', lines: ['elle baisse :', 'il grelotte'], risk: 'mal', side: 'left', dy: 20 },
      { at: () => A.point('RightForeArm'), title: 'PEAU', lines: ['les petites plaies', 'ne guérissent plus'], risk: 'grave', side: 'right', dy: 120 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // =====================================================================
  //  LES PLANS
  // =====================================================================
  const WEBCAM = (u) => ({ p: R(-1.68, 1.2, lerp(0.42, 0.38, u)), l: R(-0.9, lerp(0.98, 0.96, u), 0.5), fov: 74 });   // la webcam de son ordinateur
  const SHOTS = [
    { id: 'nuit', t0: SH.nuit, cam: (u) => ({ p: R(lerp(-1.55, -1.25, u), 1.5, lerp(1.95, 1.6, u)), l: R(0.35, 0.95, -0.25), fov: 56 }), fill: 0.25 },
    { id: 'h24', t0: SH.h24, near: 0.03, cam: WEBCAM, fill: 0.35 },
    { id: 'h48', t0: SH.h48, cam: (u) => ({ p: v3(lerp(14.2, 13.8, u), 1.3, -5.15), l: A.root.position.clone().add(v3(0, 1.05, 0)), fov: 40 }) },
    { id: 'h72', t0: SH.h72, cam: (u) => ({ p: R(lerp(1.55, 1.45, u), 1.62, lerp(2.05, 1.95, u)), l: R(-0.2, 1.15, -0.8), fov: 56 }), look: 'red' },
    { id: 'j5', t0: SH.j5, cam: (u) => ({ p: R(lerp(0.9, 0.75, u), 1.55, lerp(1.0, 0.85, u)), l: R(-0.15, 1.35, -0.4), fov: 48 }), fill: 0.5 },
    { id: 'j11', t0: SH.j11, near: 0.02, cam: (u) => ({ p: R(-1.5, lerp(1.3, 1.24, u), lerp(0.27, 0.25, u)), l: R(-1.5, 0.779, 0.2), up: v3(0, 0, -1), fov: 50 }), fill: 0.15, dof: ['paper', 0.015] },
    { id: 'hypo', t0: SH.hypo, cam: (u) => ({ p: R(lerp(1.55, 1.5, u), 1.62, lerp(2.05, 2.0, u)), l: R(-0.2, 1.15, -0.8), fov: 56 }) },
    { id: 'j14', t0: SH.j14, near: 0.03, cam: WEBCAM, fill: 0.2 },
    { id: 'ruse', t0: SH.ruse, cam: () => ({ p: R(1.4, 1.6, 1.9), l: R(-0.1, 1.2, -0.9), fov: 54 }) },
    { id: 'j21', t0: SH.j21, cam: (u) => ({ p: R(lerp(-1.3, -1.15, u), 1.35, lerp(1.6, 1.5, u)), l: R(0.9, 0.75, 0.15), fov: 54 }), fill: 0.3 },
    { id: 'dodo', t0: SH.dodo, cam: (u) => ({ p: R(lerp(0.0, 0.12, u), lerp(1.5, 1.42, u), lerp(1.4, 1.3, u)), l: R(1.2, 0.6, 0.4), fov: 55 }), fill: 0.7 },
    { id: 'reveil', t0: SH.reveil, cam: (u) => ({ p: R(lerp(1.3, 1.15, u), 1.5, lerp(1.0, 0.8, u)), l: R(-0.3, 1.45, -1.4), fov: 50 }), fill: 3.2 },
    { id: 'end', t0: SH.end, cam: () => ({ p: R(-1.5, 1.6, 1.9), l: R(0.3, 1.0, -0.9), fov: 56 }) },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };
  const LIGHTS = [dayL, bedLamp, deskLamp, phoneL, fill, CH.winL, ...RUE.lights];
  const hms = (s) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;

  function update(t) {
    const ts = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts - S.t0) / (nextT(S) - S.t0));
    poseJosh(Q.get('shot') ? S.t0 + u * (nextT(S) - S.t0) : ts, S.id); poseShadow(ts, S.id);
    // l'heure : l'horloge tourne normalement, sauf pendant son sommeil (accéléré : 14 heures en 2,3 secondes)
    const c0 = CLOCK0[S.id]; let sec = 0;
    if (c0) { const [hh, mm, ss] = c0.split(':').map(Number); sec = hh * 3600 + mm * 60 + ss + (S.id === 'dodo' ? sm(0.05, 0.95, u) * 14.2 * 3600 : ts - S.t0); }
    const street = S.id === 'h48', red = S.id === 'h72';
    const dayK = ['j11', 'j14', 'reveil'].includes(S.id) ? 1 : S.id === 'dodo' ? sm(0.62, 0.9, u) : 0;
    // la chambre : nuit, jour, hallucination ; la rue de nuit
    CH.view(dayK > 0.5 ? 'jour' : 'nuit'); dayL.intensity = street ? 0 : 3.0 * dayK; CH.winL.intensity = street ? 0 : lerp(9, 28, dayK); CH.amb.intensity = street ? 0 : lerp(0.18, 0.85, dayK);
    bedLamp.intensity = red ? 3 : S.id === 'j21' ? 1.2 : S.id === 'dodo' ? 1.2 - 0.8 * sm(0.25, 0.4, u) : 0;
    deskLamp.intensity = { h24: 2.0, j11: 0.5, j14: 0.8 }[S.id] ?? 0;
    for (const L of RUE.lights) L.intensity = street ? L.userData.on : 0;
    duvet2.visible = false;
    CH.clock(c0 ? hms(sec).slice(0, 5) : '23:04');
    hemi.intensity = street ? 0.25 : 0.3;
    // les boîtes de pizza : 3 le 2e jour, 6 le 11e, toutes au 14e ; la feuille du calcul
    const nb = { h24: 3, j11: 6, j14: 25, j21: 25, dodo: 25, reveil: 25 }[S.id] ?? 0; boxes.forEach((b, i) => { b.visible = i < nb; });
    drawPaper(S.id === 'j11' ? 1 + 6 * clamp((ts - SH.j11 - 0.3) / 3.0) : 0); paper.visible = pen.visible = ['j11', 'j14', 'h24'].includes(S.id);
    // la caméra
    const C = S.cam(u);
    if (Q.get('cp')) { C.p = R(...Q.get('cp').split(',').map(Number)); C.l = R(...Q.get('cl').split(',').map(Number)); if (Q.get('cf')) C.fov = Number(Q.get('cf')); }
    camera.near = S.near ?? 0.1; camera.fov = C.fov; camera.up.copy(C.up ?? v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    const fz = FZ.active(t);
    if (fz) { camera.updateMatrixWorld(); const tp = A.point('Spine2').project(camera); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.2, k); }
    camera.updateProjectionMatrix();
    const d = S.dof || [0]; let focus = d[0];
    const target = { paper: () => paper.position }[focus]; if (target) focus = camera.position.distanceTo(target());
    PS.dof(frozen ? 0 : focus, d[1] ?? 0.02); PS.look(red ? 'red' : 'normal', { gain: red ? 1.6 : 1, sat: 0.78 });
    fill.intensity = S.fill ?? 0; fill.position.copy(camera.position).add(v3(0, 0.3, 0));
    for (const l of LIGHTS) l.visible = l.intensity > 0;

    // --- textes
    HUD.hook(t, 'Et si tu ne <em>dormais</em><br>plus du tout ?', T.hookOut);
    HUD.live(t, S.id === 'end' ? '' : street ? 'LYON · RUE · CAM 02' : S.id === 'ruse' ? 'IRM · SIMULATION' : S.id === 'h24' || S.id === 'j14' ? 'LYON 5E · WEBCAM DE JOSH' : 'LYON 5E · CHEZ JOSH · CAM 01', c0 ? hms(sec) : '', 'SIMULATION');
    const aw = AWAKE[S.id];
    if (aw) {
      if (S.id === 'dodo' || S.id === 'reveil') HUD.block(1, { label: 'JOSH DORT DEPUIS', value: S.id === 'dodo' ? `${Math.floor(sm(0.05, 0.95, u) * 14)} h` : '14 h', sub: aw[1], color: '#9fe0b0' });
      else HUD.block(1, { label: 'JOSH NE DORT PLUS DEPUIS', value: aw[0], sub: aw[1], color: ['nuit', 'h24'].includes(S.id) ? '#fff' : ['h48', 'h72', 'j5'].includes(S.id) ? '#ffcf7a' : '#ff5a4f' });
    }
    HUD.show2(false);
    document.getElementById('tl').style.opacity = aw && !frozen && S.id !== 'ruse' ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    HUD.subs(t, SUBS_V);
    drawOverlay(S.id, t, ts);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : CDC · NATURE MEDICINE (2017) · FRONTIERS IN PSYCHIATRY (2018) · W. DEMENT · RECHTSCHAFFEN', q: 'Et toi, tu tiendrais<br>combien de jours ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)) }) };
}

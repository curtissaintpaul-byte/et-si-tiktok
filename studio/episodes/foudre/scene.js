// =====================================================================
//  « Et si tu prenais la foudre ? » — format RECONSTITUTION (plans courts façon reportage + rendu PS2)
//  Toi, seul sur le plateau de l'Aubrac. L'orage arrive, la pluie tombe, tu cours sous le seul arbre du coin.
//  La foudre frappe l'arbre, le courant saute sur toi (arrêt sur image : ce qu'il fait à ton corps).
//  Une randonneuse arrive et te masse. Tableau d'enquête : comment la foudre touche vraiment les gens. Le bon abri : une voiture.
//
//  Faits (vérifiés le 15/10/2026, sources dans la légende) :
//   - la foudre peut tomber jusqu'à 10 miles (16 km) de la pluie (National Weather Service, brochure « Lightning ») ;
//   - environ 10 % des personnes foudroyées meurent → 9 sur 10 survivent, souvent avec des séquelles (NWS ; M. A. Cooper) ;
//   - les victimes ne gardent pas de charge électrique : on peut les toucher et commencer le massage tout de suite (NWS) ;
//   - comment on est touché (M. A. Cooper, univ. de l'Illinois, « How lightning kills and injures ») : de plein fouet 3 à 5 %,
//     éclair latéral (depuis un arbre…) environ un tiers, courant dans le sol jusqu'à la moitié ;
//   - l'arrêt cardio-respiratoire est la 1re cause de décès ; tympans perforés chez 50 à 80 % des victimes ;
//     figures de Lichtenberg (dessins en fougère) qui disparaissent en moins de 24 h ; paralysie passagère, surtout des jambes,
//     qui passe en quelques heures (synthèse emDocs / Tintinalli) ;
//   - un arbre isolé est un mauvais abri ; une voiture fermée (toit en métal) est un bon abri ; en France, un accident sur trois
//     a lieu dans une cabane, un abri ou sous un arbre (Météorage, 2025).
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, keys } from '../../engine.js';
import { loadMixamo } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2, pixTex } from '../../lib-ps2.js';
import { makeSUV } from '../../lib-rue.js';
import { buildPlateau, stormSky, makeRain, makeBolt, strike } from '../../lib-orage.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// --- le découpage (temps de la scène, en secondes)
const SH = { plateau: 0, air1: 3.0, marche: 5.4, loin: 8.2, course: 10.8, arbre: 13.6, impact: 16.0, air2: 19.2, secours: 21.6, tableau: 24.6, abri: 28.4, end: 31.6 };
const sceneEnd = 34.6;
const HIT = 16.45, FREEZE_AT = 16.62, FALL = 16.66;   // le coup sur l'arbre, l'arrêt sur image, puis tu tombes
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 5.3, 'Aubrac, 16 h 40. Tu marches seul sur le plateau.'],
  [5.5, 8.1, 'L’orage gronde au loin. Tu te dis que tu as le temps.'],
  [8.3, 10.7, 'Erreur : la foudre peut tomber jusqu’à 16 km de la pluie.'],
  [10.9, 13.5, 'Il se met à pleuvoir. Tu cours sous le seul arbre du coin.'],
  [13.7, 15.9, 'Le pire abri : un arbre isolé, c’est souvent là qu’elle tombe.'],
  [16.1, 19.1, 'Elle frappe l’arbre. Le courant saute sur toi.'],
  [19.3, 21.5, 'Bonne nouvelle : 9 personnes foudroyées sur 10 survivent.'],
  [21.7, 24.5, 'Ton corps ne garde pas d’électricité. On peut te masser tout de suite.'],
  [24.7, 26.4, 'Presque personne n’est touché de plein fouet.'],
  [26.5, 28.3, 'Le plus souvent, ça passe par le sol ou par un arbre.'],
  [28.5, 31.5, 'Le bon abri : une voiture fermée. Pas un arbre, pas une cabane.'],
];
// --- les éclairs lointains (temps de scène, départ dans le ciel, arrivée au sol)
const FAR_BOLTS = [
  [1.7, [-150, 300, -560], [-130, -5, -520], 2.2],
  [6.9, [120, 260, -430], [100, -5, -400], 1.8],
  [9.3, [-50, 220, -250], [-36, -2, -230], 1.2],
  [12.2, [70, 190, -150], [58, 0, -138], 0.9],
  [23.1, [-120, 220, -190], [-100, 0, -175], 1.2],
  [29.7, [-195, 250, 40], [-181, 0, 58], 1.6],
  [33.0, [-60, 240, -260], [-50, 0, -240], 1.4],
];
// --- l'heure affichée au début de chaque plan (le montage saute des minutes)
const CLOCK0 = { plateau: '16:40:05', air1: '16:41:10', marche: '16:43:30', loin: '16:46:02', course: '16:47:40', arbre: '16:47:44', impact: '16:48:31', air2: '16:48:40', secours: '16:49:05', tableau: '', abri: '', end: '' };
const STORM_KM = { plateau: '12 km', air1: '12 km', marche: '8 km', loin: '5 km', course: '2 km', arbre: 'SUR TOI' };

export default async function () {
  const stage = createStage({ fov: 50, far: 2400, bloom: [0.5, 0.5, 0.82], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.25;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#9fb8ff');

  // --- le temps gris d'orage : lumière diffuse, brume ; le flash de la foudre
  const SKY = stormSky(scene);
  scene.fog = new THREE.Fog('#3a3f47', 60, 520);
  const hemi = new THREE.HemisphereLight('#9aa6b8', '#2c3322', 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#c9d1dc', 0.7); sun.position.set(30, 60, 40); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 160 }); sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  const flashL = new THREE.DirectionalLight('#dfe7ff', 0); scene.add(flashL, flashL.target);
  const boltL = new THREE.PointLight('#d6dfff', 0, 45, 1.3); boltL.position.set(0, 7, 0); scene.add(boltL);
  const fill = new THREE.PointLight('#dfe6ff', 0, 5, 1.5); scene.add(fill);

  const PL = buildPlateau(scene);
  const RAIN = makeRain(scene);

  // --- toi : Remy (t-shirt, short), avec un sac à dos ; la randonneuse : Kate
  const CAST = await loadMixamo({ chars: ['Remy', 'Kate'], anims: ['idle', 'walk', 'run', 'lookaround', 'fallback', 'cprrecv', 'cpr', 'driving'] });
  const A = CAST.make('Remy', { height: 1.78 }), K = CAST.make('Kate', { height: 1.68 });
  scene.add(A.root, K.root);
  const bag = new THREE.Group(), bagM = new THREE.MeshStandardMaterial({ color: '#7b2b22', roughness: 0.9 }), strapM = new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.9 });
  bag.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.17), bagM)); const flap = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.12, 0.19), strapM); flap.position.y = 0.2; bag.add(flap);
  bag.children.forEach((m) => { m.castShadow = true; });
  scene.add(bag);
  // le sac suit le haut du dos (os « Spine2 ») : on note son orientation debout, puis on la suit à chaque image
  const bq0 = A.bones.Spine2.getWorldQuaternion(new THREE.Quaternion()).invert(), bq = new THREE.Quaternion(), BAG_OFF = v3(0, -0.05, -0.135);
  const placeBag = () => { A.bones.Spine2.getWorldQuaternion(bq).multiply(bq0); bag.quaternion.copy(bq); bag.position.copy(A.point('Spine2')).add(BAG_OFF.clone().applyQuaternion(bq)); bag.visible = A.root.visible; };

  // les déplacements (x, z) : la marche sur le chemin, l'arrêt face à l'orage, la course jusqu'à l'arbre
  const UNDER = v3(0.55, 0, 1.25), FACE = -Math.PI / 4;   // ta place sous l'arbre (tu regardes vers le sud-ouest : en tombant en arrière, tu t'éloignes du tronc)
  const W0 = v3(-21, 0, 13.5), W1 = v3(-9.6, 0, 10.5), RUN0 = 10.9, RUN1 = 13.95, WALK1 = 8.0;
  function poseYou(ts) {
    if (ts < WALK1) {                                                          // la marche
      const k = ts / WALK1; A.root.position.lerpVectors(W0, W1, k);
      A.pose('walk', ts * 1.02); A.root.rotation.y = Math.atan2(W1.x - W0.x, W1.z - W0.z); return;
    }
    if (ts < RUN0) {                                                           // tu t'arrêtes, tu regardes l'orage (au nord)
      const k = sm(WALK1, WALK1 + 0.6, ts); A.root.position.copy(W1);
      A.pose([['walk', WALK1 * 1.02, 1 - k], ['idle', ts, k]], { Neck: [['x', -0.12 * k]] });
      A.root.rotation.y = lerp(Math.atan2(W1.x - W0.x, W1.z - W0.z), Math.PI, sm(WALK1, WALK1 + 0.8, ts)); return;
    }
    if (ts < RUN1 + 0.35) {                                                    // la course jusqu'à l'arbre
      const k = clamp((ts - RUN0) / (RUN1 - RUN0)), e = 1 - Math.pow(1 - k, 1.6);
      A.root.position.lerpVectors(W1, UNDER, e);
      const st = sm(RUN1 - 0.1, RUN1 + 0.35, ts);
      A.pose([['run', (ts - RUN0) * 1.05, 1 - st], ['idle', ts, st]]);
      const head = Math.atan2(UNDER.x - W1.x, UNDER.z - W1.z);
      A.root.rotation.y = lerp(lerp(Math.PI, head, sm(RUN0, RUN0 + 0.3, ts)), FACE, st); return;
    }
    A.root.position.copy(UNDER); A.root.rotation.y = FACE;
    if (ts < HIT) { A.pose([['lookaround', ts - RUN1, 0.7], ['idle', ts, 0.3]], { Neck: [['x', -0.25]] }); return; }   // tu regardes le ciel
    if (ts < FALL) {                                                           // le choc : tout ton corps se raidit
      const j = sm(HIT, HIT + 0.08, ts); A.pose('idle', HIT, { LeftArm: [['z', 0.55 * j]], RightArm: [['z', -0.55 * j]], Spine: [['x', -0.12 * j]], Neck: [['x', -0.3]], LeftForeArm: [['z', 0.3 * j]], RightForeArm: [['z', -0.3 * j]] }); return;
    }
    if (ts < SH.secours) { A.pose('fallback', Math.min(ts - FALL, CAST.A.fallback.clip.duration - 0.01)); return; }   // tu tombes en arrière
    A.root.position.copy(CPR.you); A.root.rotation.y = CPR.ry; A.pose('cprrecv', ts - SH.secours);   // on te masse
  }
  // la randonneuse : elle arrive en courant (vue aérienne), puis elle te masse
  const KATE0 = v3(-14, 0, 9.4);
  const CPR = { you: v3(1.34, 0, -0.28), ry: -Math.PI / 2, kate: v3(1.34, 0, -0.28) };   // (calé sur l'endroit où tu es tombé)
  function poseKate(ts) {
    K.root.visible = ts >= SH.air2 && ts < SH.tableau;
    if (!K.root.visible) return;
    if (ts < SH.secours) { const k = clamp((ts - SH.air2) / (SH.secours - SH.air2 - 0.1)); const goal = v3(1.9, 0, 2.4); K.root.position.lerpVectors(KATE0, goal, k); K.root.rotation.y = Math.atan2(goal.x - KATE0.x, goal.z - KATE0.z); K.pose('run', ts * 1.05); return; }
    K.root.position.copy(CPR.kate); K.root.rotation.y = CPR.ry; K.pose('cpr', ts - SH.secours);
  }

  // --- la voiture du « bon réflexe » : garée plus loin sur le chemin, toi à l'abri dedans
  const car = makeSUV('#b8bcc2'); car.root.position.set(34, 0, 9.4); car.root.rotation.y = 0.05; scene.add(car.root);
  const DRIVER = v3(-0.42, 0.25, -0.4);
  const B2 = CAST.make('Remy', { height: 1.78 }); scene.add(B2.root);   // (le même « toi », assis au volant)

  // --- les éclairs : les lointains, celui qui frappe l'arbre, l'arc qui saute sur toi, le courant dans l'herbe
  const far = FAR_BOLTS.map(([t0, a, b, w], i) => { const B = makeBolt(100 + i, v3(...a), v3(...b), { width: w, rough: 0.2, depth: 7, branches: 4 }); scene.add(B); return { t0, B, dir: v3(...b).normalize() }; });
  const main = makeBolt(7, v3(9, 240, -40), v3(0, PL.tree.top.y, 0), { width: 0.16, rough: 0.18, depth: 7, branches: 5, glow: 3 }); scene.add(main);
  poseYou(HIT); scene.updateMatrixWorld(true);
  const side = makeBolt(11, v3(0.28, 2.6, 0.4), A.point('LeftShoulder').add(v3(0, 0.05, 0)), { width: 0.02, rough: 0.28, depth: 4, branches: 1, glow: 2, power: 2.2 }); scene.add(side);
  const ground = new THREE.Group(); scene.add(ground);
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + 0.3, L = 4 + (k % 3) * 1.6; ground.add(makeBolt(30 + k, v3(0, 0.06, 0), v3(Math.sin(a) * L, 0.06, Math.cos(a) * L), { width: 0.018, rough: 0.3, depth: 5, branches: 2, flat: true, glow: 1.6, power: 1.5 })); }
  ground.add(makeBolt(50, v3(0.3, 0.06, 0.4), v3(UNDER.x, 0.06, UNDER.z + 0.05), { width: 0.02, rough: 0.25, depth: 3, branches: 0, flat: true, glow: 1.6, power: 1.6 }));
  ground.children.forEach((b) => { b.visible = true; }); ground.visible = false;

  // --- le tableau d'enquête : 3 fiches avec des « photos » prises dans la scène
  const BRD = v3(0, 60, -700);
  const snap = (pos, look, fov = 35, w = 96, h = 56, prep, undo) => {
    const cam = new THREE.PerspectiveCamera(fov, w / h, 0.05, 2000); cam.position.copy(pos); cam.lookAt(look); prep && prep(); scene.updateMatrixWorld(true);
    const rt = new THREE.WebGLRenderTarget(w, h); renderer.setRenderTarget(rt); renderer.render(scene, cam);
    const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null); rt.dispose(); undo && undo();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), id = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 4; x++) { const v = px[(h - 1 - y) * w * 4 + x] / 255; id.data[y * w * 4 + x] = x % 4 === 3 ? 255 : Math.min(255, Math.pow(v * 1.4, 1 / 2.2) * 255); }
    g.putImageData(id, 0, 0); return c;
  };
  function makeBoard() {
    poseYou(HIT); placeBag(); scene.updateMatrixWorld(true);
    const show = (...o) => () => { o.forEach((x) => { x.visible = true; }); flashL.intensity = 3; }, hide = (...o) => () => { o.forEach((x) => { x.visible = false; }); flashL.intensity = 0; };
    const photos = [
      snap(v3(-30, 6, -120), v3(-40, 60, -235), 50, 96, 56, show(far[2].B), hide(far[2].B)),
      snap(v3(4.5, 2.2, 7.5), v3(0.2, 2.6, 0.5), 44, 96, 56, show(main, side), hide(main, side)),
      snap(v3(2.6, 3.6, 4.6), v3(0.3, 0, 0.6), 50, 96, 56, show(ground), hide(ground)),
    ];
    const W = 270, H = 480, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.8), new THREE.MeshBasicMaterial({ map: tex, fog: false })); mesh.position.copy(BRD); scene.add(mesh);
    const CARDS = [[16, 64, 'DE PLEIN FOUET', '3 à 5 % des cas'], [16, 140, 'PAR UN ARBRE', 'environ 1 cas sur 3'], [16, 216, 'PAR LE SOL', 'jusqu’à 1 cas sur 2']];
    const CW = 238, CH = 66;
    function draw(k) {
      const gr = g.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, H * 0.7); gr.addColorStop(0, '#13285e'); gr.addColorStop(1, '#03060f');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1; for (let y = 0; y < H; y += 12) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      g.textAlign = 'left'; g.font = '800 17px Inter'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('COMMENT LA FOUDRE', 16, 30); g.fillText('TE TOUCHE', 16, 50);
      CARDS.forEach(([x, y, t1, t2], i) => {
        const a = clamp(k * 3.6 - i * 1.0); if (a <= 0) return;
        if (i > 0) { const kk = Math.min(1, a * 1.6); g.strokeStyle = '#ffd60a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 20, y - 10); g.lineTo(x + 20, lerp(y - 10, y, kk)); g.stroke(); }
        g.globalAlpha = a;
        g.fillStyle = 'rgba(4,8,20,0.9)'; g.fillRect(x, y, CW, CH); g.strokeStyle = i === 0 ? 'rgba(255,255,255,0.35)' : '#ffd60a'; g.lineWidth = i === 0 ? 1 : 2; g.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
        g.drawImage(photos[i], x + 5, y + 5, 96, 56);
        g.fillStyle = '#fff'; g.font = '800 13px Inter'; g.fillText(t1, x + 110, y + 28); g.fillStyle = i === 0 ? 'rgba(255,255,255,0.7)' : '#ffd60a'; g.font = '700 11px Inter'; g.fillText(t2, x + 110, y + 47);
        g.globalAlpha = 1;
      });
      const b = clamp(k * 3 - 2.0);
      g.globalAlpha = b; g.font = '800 14px Inter'; g.fillStyle = '#fff'; g.fillText('EN CAS D’ACCIDENT :', 16, 380); g.fillStyle = '#ffd60a'; g.fillText('APPELLE LE 15 OU LE 112', 16, 400);
      g.font = '600 9px Inter'; g.fillStyle = 'rgba(200,215,255,0.8)'; g.fillText('SOURCE : M. A. COOPER, UNIVERSITÉ DE L’ILLINOIS', 16, 420); g.globalAlpha = 1;
      tex.needsUpdate = true;
    }
    draw(0);
    return { mesh, draw };
  }
  const board = makeBoard();

  // --- l'arrêt sur image : le courant dans ton corps
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 5.0, title: 'ARRÊT SUR IMAGE · LE COURANT', tags: [
      { at: () => A.point('Spine2'), title: 'CŒUR', lines: ['il peut s’arrêter net', '1re cause de décès'], risk: 'grave', side: 'right', dy: -110 },
      { at: () => A.point('Head'), title: 'OREILLES', lines: ['tympans percés chez', 'plus d’une victime sur 2'], risk: 'mal', side: 'left', dy: 0 },
      { at: () => A.point('LeftForeArm'), title: 'PEAU', lines: ['des dessins en fougère,', 'partis en un jour'], risk: 'bof', side: 'right', dy: 120 },
      { at: () => A.point('LeftLeg'), title: 'JAMBES', lines: ['paralysées', 'quelques heures'], risk: 'bof', side: 'left', dy: 60 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // --- le calque des vues aériennes : points, viseurs, coordonnées
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(ov); const og = ov.getContext('2d');
  const dot = (p, label, col, t) => {
    const s = p.clone().project(camera), x = (s.x * 0.5 + 0.5) * 1080, y = (-s.y * 0.5 + 0.5) * 1920, pulse = 0.6 + 0.4 * Math.sin(t * 9);
    og.fillStyle = col.replace('1)', `${0.25 * pulse})`); og.beginPath(); og.arc(x, y, 44, 0, 7); og.fill();
    og.fillStyle = col; og.beginPath(); og.arc(x, y, 14, 0, 7); og.fill();
    og.strokeStyle = 'rgba(255,255,255,0.85)'; og.lineWidth = 3; og.beginPath(); og.moveTo(x - 78, y); og.lineTo(x - 30, y); og.moveTo(x + 30, y); og.lineTo(x + 78, y); og.moveTo(x, y - 78); og.lineTo(x, y - 30); og.moveTo(x, y + 30); og.lineTo(x, y + 78); og.stroke();
    og.font = '600 24px Inter'; og.fillStyle = '#fff'; og.fillText(label, x + 58, y - 54);
  };
  function drawOverlay(shot, t, ts) {
    og.clearRect(0, 0, 1080, 1920); const on = shot === 'air1' || shot === 'air2'; ov.style.visibility = on ? 'visible' : 'hidden'; if (!on) return;
    camera.updateMatrixWorld();
    if (shot === 'air1') {
      dot(A.point('Hips'), 'TOI', 'rgba(255,42,30,1)', t);
      og.font = '700 26px Inter'; og.fillStyle = 'rgba(255,255,255,0.9)'; og.textAlign = 'center'; og.fillText('▲ L’ORAGE · À 12 KM', 540, 250); og.textAlign = 'left';
    } else {
      dot(A.point('Hips'), 'TOI · À TERRE', 'rgba(255,42,30,1)', t);
      if (K.root.visible) dot(K.point('Hips'), 'UNE RANDONNEUSE', 'rgba(255,214,10,1)', t + 0.3);
    }
    og.font = '600 19px Inter'; og.fillStyle = 'rgba(255,255,255,0.8)'; og.fillText('VUE AÉRIENNE · INFRAROUGE', 62, 1780); og.fillText(`44.6${(41 + ts * 3) | 0}° N · 2.9${(12 + ts * 2) | 0}° E`, 62, 1812);
  }

  // =====================================================================
  //  LES PLANS : caméra (position, cible, focale), flou de profondeur, look
  // =====================================================================
  const you = () => A.root.position;
  const SHOTS = [
    { id: 'plateau', t0: SH.plateau, cam: (u) => { const p = you(); return { p: p.clone().add(v3(lerp(4.5, 3.8, u), 1.7, lerp(15, 13, u))), l: p.clone().add(v3(-1.2, 5.5, -12)), fov: 50 }; } },
    { id: 'air1', t0: SH.air1, cam: (u) => { const p = you(); return { p: v3(p.x, 85, p.z), l: v3(p.x + 0.01, 0, p.z - 0.01), fov: lerp(52, 22, sm(0, 1, u)), up: v3(0, 0, -1) }; }, look: 'aerial' },
    { id: 'marche', t0: SH.marche, cam: (u) => { const p = you(); return { p: p.clone().add(v3(lerp(2.2, 1.4, u), 1.45, 4.4)), l: p.clone().add(v3(-0.6, 1.25, -2)), fov: 42 }; }, dof: ['you', 0.008] },
    { id: 'loin', t0: SH.loin, cam: (u) => { const p = you(); return { p: p.clone().add(v3(0.3, 1.66, lerp(1.6, 1.35, u))), l: p.clone().add(v3(0.05, lerp(2.6, 3.4, u), -40)), fov: 48 }; } },
    { id: 'course', t0: SH.course, cam: (u) => ({ p: v3(lerp(-0.4, -0.7, u), 1.0, -1.5), l: you().clone().add(v3(0, 1.2, 0)), fov: 46 }), dof: ['you', 0.01] },
    { id: 'arbre', t0: SH.arbre, cam: (u) => ({ p: v3(lerp(-1.7, -1.3, u), lerp(0.45, 0.5, u), lerp(3.7, 3.1, u)), l: v3(0.6, 3.1, 1.1), fov: 60 }), fill: 1.1 },
    { id: 'impact', t0: SH.impact, cam: () => ({ p: v3(3.4, 1.55, 9.6), l: v3(0.1, 3.7, 0.5), fov: 56 }) },
    { id: 'air2', t0: SH.air2, cam: (u) => ({ p: v3(lerp(2, 1, u), 34, lerp(30, 27, u)), l: v3(lerp(-3.5, -1.2, u), 0, lerp(4.5, 2.6, u)), fov: lerp(26, 21, u) }), look: 'aerial' },
    { id: 'secours', t0: SH.secours, cam: (u) => { const c = CPR.you.clone().add(v3(0, 0, 0.2)); return { p: c.clone().add(v3(lerp(-2.0, -1.8, u), 1.55, lerp(3.7, 3.4, u))), l: c.clone().add(v3(0.1, 0.3, 0.45)), fov: 46 }; }, fill: 1.2, dof: ['cpr', 0.012] },
    { id: 'tableau', t0: SH.tableau, cam: (u) => ({ p: BRD.clone().add(v3(lerp(-0.5, 0.25, u), lerp(0.25, -0.1, u), lerp(6.6, 5.8, sm(0, 1, u)))), l: BRD.clone().add(v3(lerp(-0.1, 0.05, u), lerp(0.1, -0.15, u), 0)), fov: 46, up: v3(Math.sin(lerp(-0.04, 0.03, u)), 1, 0).normalize() }) },
    { id: 'abri', t0: SH.abri, near: 0.05, fill: 0.4, cam: (u) => { const p = car.root.localToWorld(v3(lerp(7.4, 6.6, u), 1.85, lerp(-1.9, -1.6, u))); const l = car.root.localToWorld(v3(-0.4, 0.95, -0.05)); return { p, l, fov: 36 }; }, dof: ['driver', 0.02] },
    { id: 'end', t0: SH.end, cam: (u) => ({ p: v3(lerp(12, 10, u), 2.4, lerp(27, 25, u)), l: v3(0, 4.2, 0), fov: 50 }) },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };

  function update(t) {
    const ts = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts - S.t0) / (nextT(S) - S.t0));
    const air = S.look === 'aerial';
    // les personnages
    poseYou(ts); poseKate(ts);
    A.root.visible = S.id !== 'abri'; placeBag();
    B2.root.visible = S.id === 'abri'; if (B2.root.visible) { B2.pose('driving', ts - SH.abri); B2.root.position.copy(car.root.localToWorld(DRIVER.clone())); B2.root.rotation.y = car.root.rotation.y + Math.PI / 2; }
    car.lights({ inside: S.id === 'abri' ? 0.6 : 0 });
    // le ciel se ferme, la pluie arrive
    const cover = keys([[0, 0.3], [8, 0.55], [11, 0.85], [16, 1]], ts); SKY.u.uCover.value = cover; SKY.u.uTime.value = ts;
    const rain = S.id === 'tableau' || air ? 0 : sm(SH.course, SH.course + 1.2, ts) * (S.id === 'end' ? 0.7 : 1);
    scene.fog.far = air ? 520 : lerp(520, 170, sm(SH.course, SH.course + 2, ts)); scene.fog.near = air ? 60 : lerp(60, 18, sm(SH.course, SH.course + 2, ts));
    // les éclairs
    let fl = 0; const fdir = v3(0, 1, 0);
    for (const b of far) { const s = strike(ts, b.t0); b.B.visible = s.on && !air; if (s.flash > fl * 0.5) { fl = Math.max(fl, s.flash * 0.45); fdir.copy(b.dir); } }
    const hs = strike(ts, HIT); main.visible = hs.on || (frozen && true); side.visible = main.visible; ground.visible = main.visible;
    if (hs.flash > 0) { fl = Math.max(fl, hs.flash); fdir.set(0.1, 1, -0.05); }
    if (frozen) fl *= 0.35;
    SKY.flash(fl, fdir); flashL.intensity = fl * 2.2; flashL.position.copy(fdir).multiplyScalar(80); boltL.intensity = hs.flash * (frozen ? 9 : 45); boltL.position.set(frozen ? 1.4 : 0, frozen ? 2.0 : 7, frozen ? 2.2 : 0);
    HUD.flash(!frozen && hs.on && hs.u < 0.03 ? 0.45 : 0);
    // la lumière (vue aérienne : on « éclaire » comme une caméra infrarouge)
    hemi.intensity = air ? 5 : lerp(1.15, 0.85, sm(8, 12, ts)); sun.intensity = air ? 2.5 : lerp(0.7, 0.35, sm(8, 12, ts));
    const hk = air ? (S.id === 'air2' ? 0.7 : 2.5) : 0; A.hot(hk); K.hot(hk);
    // la caméra du plan
    const C = S.cam(u);
    camera.near = S.near ?? 0.1; camera.fov = C.fov; camera.up.copy(C.up ?? v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    const fz = FZ.active(t);
    if (fz) { camera.updateMatrixWorld(); const tp = A.point('Hips').project(camera); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.75, k); }
    camera.updateProjectionMatrix(); SKY.follow(camera);
    RAIN.update(ts, camera.position, rain);
    // flou de profondeur
    const d = S.dof || [0]; let focus = d[0];
    const target = { you: () => A.point('Spine2'), cpr: () => K.point('Spine2'), driver: () => B2.point('Head') }[focus];
    if (target) focus = camera.position.distanceTo(target());
    PS.dof(frozen ? 0 : focus, d[1] ?? 0.02); PS.look(air ? 'aerial' : 'normal', { gain: air ? 2.2 : 1, sat: 0.7 });
    fill.intensity = S.fill ?? 0; fill.position.copy(camera.position).add(v3(0, 0.3, 0));
    board.draw(clamp((ts - SH.tableau - 0.2) / 2.8));

    // --- textes
    HUD.hook(t, 'Et si tu prenais<br>la <em>foudre</em> ?', T.hookOut);
    const c0 = CLOCK0[S.id]; let clk = '';
    if (c0) { const [hh, mm, ss] = c0.split(':').map(Number), s = hh * 3600 + mm * 60 + ss + Math.floor(ts - S.t0); clk = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }
    const cams = { plateau: 'CAM 01', air1: 'DRONE', marche: 'CAM 02', loin: 'CAM 03', course: 'CAM 04', arbre: 'CAM 04', impact: 'CAM 05', air2: 'DRONE', secours: 'CAM 06' };
    HUD.live(t, cams[S.id] ? `PLATEAU DE L’AUBRAC · ${cams[S.id]}` : ({ tableau: 'LES CHIFFRES', abri: 'LE BON RÉFLEXE', end: '' }[S.id]), clk, 'SIMULATION');
    const km = STORM_KM[S.id];
    if (km) HUD.block(1, { label: 'L’ORAGE', value: km, sub: km === 'SUR TOI' ? '' : 'DE TOI', color: km === 'SUR TOI' || km === '2 km' ? '#ff5a4f' : '#fff' });
    else if (S.id === 'secours') HUD.block(1, { label: 'EN CAS D’ACCIDENT', value: '15 · 112', sub: 'APPELLE, PUIS MASSE', color: '#ffd60a' });
    HUD.show2(false);
    document.getElementById('tl').style.opacity = (km || S.id === 'secours') && !frozen ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    HUD.subs(t, SUBS_V);
    drawOverlay(S.id, t, ts);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : NATIONAL WEATHER SERVICE · M. A. COOPER (UNIV. DE L’ILLINOIS) · MÉTÉORAGE', q: 'Et toi, tu te serais<br>abrité où ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
    if (Q.get('dbg') === 'pose') { for (const n of ['Hips', 'Head', 'LeftFoot']) console.log(`[dbg] ${n} you ${A.point(n).toArray().map((v) => v.toFixed(2))} kate ${K.point(n).toArray().map((v) => v.toFixed(2))}`); }
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)),
    hit: FZ.realT(HIT), far: FAR_BOLTS.map(([t0, , b]) => [FZ.realT(t0), Math.hypot(b[0], b[2])]), walk: [0, 8.0], run: [FZ.realT(RUN0), FZ.realT(RUN1)],
    kate: [FZ.realT(SH.air2), FZ.realT(SH.secours)], cpr: FZ.realT(SH.secours), fall: FZ.realT(FALL + 1.0), rain: FZ.realT(SH.course) }) };
}

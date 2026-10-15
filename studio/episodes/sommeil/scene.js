// =====================================================================
//  « Et si tu ne dormais plus du tout ? » — format RECONSTITUTION (plans courts façon reportage + rendu PS2)
//  Toi, dans ta chambre avec vue sur Lyon : tu ne dors pas. Le lendemain, tu bâilles. Le soir, tu prends l'autoroute :
//  ton cerveau s'endort quelques secondes au volant (arrêt sur image), la voiture dérive (vue aérienne), la bande sonore
//  te réveille. Au 4e jour, les hallucinations (en rouge). Le tableau : le record de Randy Gardner. Le bon réflexe : l'aire de repos.
//
//  Faits (vérifiés le 15/10/2026, sources dans la légende) :
//   - 17 h éveillé ≈ 0,05 % d'alcool dans le sang (0,5 g/L, la limite en France) ; 24 h ≈ 0,10 % (1 g/L) (CDC / NIOSH) ;
//   - micro-sommeils de 1 à 4 secondes (Sécurité routière, dossier « somnolence ») ; à 130 km/h : 36 m par seconde → 4 s = 144 m (calcul) ;
//   - somnolence et fatigue : 18 % des accidents mortels sur autoroute, 2018-2022 (ASFA, via VINCI Autoroutes) → « près d'1 sur 5 » ;
//   - Randy Gardner, 1964, 17 ans : 264 heures (11 jours) ; hallucinations vers le 4e jour ; Guinness ne surveille plus ce
//     record depuis 1997 à cause des dangers (Guinness World Records, 2023) ;
//   - conseils : une pause toutes les 2 heures, et une petite sieste d'un quart d'heure si tu sens la fatigue (Sécurité routière).
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, keys } from '../../engine.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2, pixTex } from '../../lib-ps2.js';
import { makeSUV } from '../../lib-rue.js';
import { buildBedroom, buildHighway } from '../../lib-nuit.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SH = { chambre: 0, nuit4h: 3.0, matin: 5.8, route: 8.8, habitacle: 11.6, air: 14.8, reveil: 17.4, halluc: 20.0, tableau: 23.0, aire: 27.0, end: 30.0 };
const sceneEnd = 33.0;
const NOD = 12.3, FREEZE_AT = 13.4, WAKE = 17.75;   // la tête tombe (micro-sommeil), l'arrêt sur image, la bande sonore te réveille
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 5.6, '4 h du matin. Tu n’as toujours pas dormi.'],
  [5.9, 8.6, 'Après 17 h sans dormir, tu as les réflexes de quelqu’un à 0,5 g d’alcool.'],
  [8.9, 11.4, '24 h : comme avec 1 g d’alcool par litre de sang. Le double de la limite.'],
  [11.7, 14.6, 'Et là, ton cerveau s’endort quelques secondes. Sans prévenir.'],
  [14.9, 17.2, 'À 130 km/h, 4 secondes, c’est 144 m sans personne au volant.'],
  [17.5, 19.8, 'Sur autoroute, la fatigue joue dans près d’1 accident mortel sur 5.'],
  [20.1, 22.8, 'Au 4e jour sans dormir, Randy Gardner avait des hallucinations.'],
  [23.1, 24.9, 'Son record : 264 heures, 11 jours, en 1964.'],
  [25.0, 26.8, 'Guinness ne le suit plus depuis 1997 : trop dangereux.'],
  [27.1, 29.8, 'Fatigué au volant ? Arrête-toi et dors un quart d’heure.'],
];
const AWAKE = { chambre: ['0 h', ''], nuit4h: ['5 h', ''], matin: ['17 h', '≈ 0,5 g/L D’ALCOOL'], route: ['24 h', '≈ 1 g/L D’ALCOOL'], habitacle: ['24 h', '≈ 1 g/L D’ALCOOL'], air: ['24 h', '≈ 1 g/L D’ALCOOL'], reveil: ['24 h', '≈ 1 g/L D’ALCOOL'], halluc: ['96 h', '4E JOUR'] };
const CLOCK0 = { chambre: '23:04:10', nuit4h: '04:12:40', matin: '16:05:02', route: '23:08:51', habitacle: '23:09:20', air: '23:09:27', reveil: '23:09:31', halluc: '23:02:16', aire: '23:31:05' };
const TEXT0 = 3.1, HOLD_PHONE = { off: [0.0, 0.1, 0.045], rot: [0, 0, 0] };
const SPEED = 36.1;                                  // 130 km/h en m/s

export default async function () {
  const stage = createStage({ fov: 50, far: 2400, bloom: [0.45, 0.5, 0.82], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.3;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#ffcf7a');
  scene.background = new THREE.Color('#05060b');
  scene.fog = new THREE.Fog('#06070c', 40, 420);
  const hemi = new THREE.HemisphereLight('#3a4466', '#0e0d0b', 0.35); scene.add(hemi);
  const fill = new THREE.PointLight('#dfe6ff', 0, 5, 1.5); scene.add(fill);

  // --- les décors : la chambre (loin, à z = 400), l'autoroute (le long de x), l'aire de repos
  const CH = buildBedroom(scene, { at: v3(0, 0, 400) });
  const AU = buildHighway(scene);
  const dayL = new THREE.DirectionalLight('#fff1dc', 0); dayL.position.set(0.3, 4, 392); dayL.target.position.set(0.8, 0, 400.5); dayL.castShadow = true; dayL.shadow.mapSize.set(1024, 1024);
  Object.assign(dayL.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); scene.add(dayL, dayL.target);
  const bedLamp = new THREE.PointLight('#ffb867', 0, 4, 1.6); bedLamp.position.copy(CH.at).add(v3(0.2, 0.9, -0.2)); scene.add(bedLamp);
  // l'aire de repos (après la sortie, à droite de l'autoroute) : un parking, un lampadaire, un panneau
  const AIRE = v3(2100, 0, 24);
  const park = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshStandardMaterial({ color: '#2b2c30', roughness: 0.9 })); park.rotation.x = -Math.PI / 2; park.position.copy(AIRE).add(v3(0, 0.02, 0)); park.receiveShadow = true; scene.add(park);
  for (let k = -5; k <= 5; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 5), new THREE.MeshBasicMaterial({ color: '#cfcfc6' })); l.rotation.x = -Math.PI / 2; l.position.copy(AIRE).add(v3(k * 2.8, 0.03, 4)); scene.add(l); }
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 7, 0.15), new THREE.MeshStandardMaterial({ color: '#55585c' })); pole.position.copy(AIRE).add(v3(-6, 3.5, 8)); scene.add(pole);
  const lampHead0 = 0; const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: '#ffb35a', toneMapped: false })); lampHead.position.copy(AIRE).add(v3(-6, 7, 7)); scene.add(lampHead);
  const aireL = new THREE.PointLight('#ff9d3c', 0, 28, 1.3); aireL.position.copy(AIRE).add(v3(-6, 6.8, 7)); scene.add(aireL);
  const signTex = pixTex(96, 48, (g, w, h) => { g.fillStyle = '#1f4fa0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('AIRE', w / 2, 21); g.font = 'bold 10px sans-serif'; g.fillText('DE REPOS', w / 2, 36); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 0.25 })); sign.position.copy(AIRE).add(v3(-10, 2.4, 9.6)); scene.add(sign);
  const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 0.08), new THREE.MeshStandardMaterial({ color: '#888' })); signPost.position.copy(AIRE).add(v3(-10, 1, 9.62)); scene.add(signPost);

  // --- la voiture : sur l'autoroute (voie de droite), elle dérive pendant le micro-sommeil, la bande sonore te réveille
  const car = makeSUV('#8e1f1c'); scene.add(car.root);
  const headL = new THREE.SpotLight('#fff3dc', 0, 70, 0.42, 0.6, 1.2); headL.position.set(2.3, 0.75, 0); headL.target.position.set(30, 0, 0); car.root.add(headL, headL.target);
  const LANE = AU.lane(2), X0 = 300;
  const drift = (ts) => {   // le décalage vers la droite (m) : rien, puis la dérive lente, puis le coup de volant au réveil
    const a = sm(NOD, WAKE, ts) * 2.2, back = sm(WAKE + 0.15, WAKE + 1.4, ts) * 1.8;
    return Math.pow(a / 2.2, 1.5) * 2.2 - back;
  };
  function carAt(ts) {
    if (ts >= SH.aire) { car.root.position.copy(AIRE).add(v3(-3.2, 0, 4.5)); car.root.rotation.y = -Math.PI / 2; return; }   // garée sur l'aire, le nez vers le panneau
    const x = X0 + SPEED * (ts - SH.route), z = LANE + drift(ts), dz = (drift(ts + 0.05) - drift(ts - 0.05)) / 0.1;
    car.root.position.set(x, 0, z); car.root.rotation.y = -Math.atan2(dz, SPEED);
  }
  const DRIVER = v3(-0.42, 0.25, -0.4);

  // --- toi (Remy) ; et « l'ombre » des hallucinations (James, tout en noir)
  const CAST = await loadMixamo({ chars: ['Remy', 'James'], anims: ['idle', 'sit', 'texting', 'yawn', 'driving'] });
  const A = CAST.make('Remy', { height: 1.78 }), SHADOW = CAST.make('James', { height: 1.9 });
  scene.add(A.root, SHADOW.root);
  SHADOW.mats.forEach((m) => { m.color = new THREE.Color('#000'); m.map = null; m.roughness = 1; m.needsUpdate = true; });
  const phone = new THREE.Group(); phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshBasicMaterial({ color: '#cfe2ff', toneMapped: false })); scr.position.z = 0.0051; phone.add(scr);
  A.hold(phone, 'RightHand', HOLD_PHONE);
  const phoneL = new THREE.PointLight('#bcd4ff', 0, 1.6, 1.6); scene.add(phoneL);
  const SEAT = CH.at.clone().add(v3(0.55, 0.0, 0.25)), SEAT_RY = -1.15;   // assis au bord du lit, tourné vers le bureau
  function poseYou(ts, S) {
    A.root.rotation.set(0, 0, 0); phone.visible = false; phoneL.intensity = 0;
    if (S === 'chambre' || S === 'nuit4h' || S === 'tableau') {   // assis au bord du lit, le téléphone à la main
      A.root.position.copy(SEAT); A.root.rotation.y = SEAT_RY;
      A.pose([['sit', 2.0, 1, LOWER], ['texting', TEXT0 + 0.1 * Math.sin(ts * 1.2), 1, UPPER]], { Neck: [['x', 0.15]] });
      phone.visible = true; phoneL.intensity = 0.6; phoneL.position.copy(A.point('RightHand')).add(v3(0, 0.15, 0)); return;
    }
    if (S === 'matin') { A.root.position.copy(CH.at).add(v3(-0.2, 0, -1.2)); A.root.rotation.y = 0.5; A.pose('yawn', 1.0 + (ts - SH.matin) * 1.1); return; }
    if (S === 'halluc') { A.root.position.copy(CH.at).add(v3(0.4, 0, 0.6)); A.root.rotation.y = -2.91; A.pose('idle', ts, { Neck: [['x', 0.1]], Spine: [['x', 0.08]] }); return; }
    // en voiture : la conduite ; pendant le micro-sommeil, la tête tombe en avant ; au réveil, elle se relève d'un coup
    A.root.position.copy(car.root.localToWorld(DRIVER.clone())); A.root.rotation.y = car.root.rotation.y + Math.PI / 2;
    if (S === 'aire') { A.pose('driving', 0.5, { Neck: [['x', -0.35]], Head: [['z', 0.15]], Spine1: [['x', -0.12]] }); return; }   // la sieste, la tête en arrière
    const nod = sm(NOD, NOD + 0.9, ts) * (1 - sm(WAKE, WAKE + 0.12, ts));
    A.pose('driving', ts - SH.route, { Neck: [['x', 0.55 * nod]], Head: [['x', 0.25 * nod], ['z', 0.12 * nod]] });
  }
  function poseShadow(ts, S) {
    SHADOW.root.visible = S === 'halluc' && Math.floor(ts * 3.1) % 4 !== 1;
    SHADOW.root.position.copy(CH.at).add(v3(-0.2, 0, -1.85)); SHADOW.root.rotation.y = 0.2; SHADOW.pose('idle', ts * 0.5);
  }

  // --- le tableau d'enquête : le record
  const BRD = v3(0, 60, -900);
  const snap = (pos, look, fov = 35, w = 96, h = 56, prep, look2) => {
    const cam = new THREE.PerspectiveCamera(fov, w / h, 0.05, 2000); cam.position.copy(pos); cam.lookAt(look); prep && prep(); scene.updateMatrixWorld(true);
    const rt = new THREE.WebGLRenderTarget(w, h); renderer.setRenderTarget(rt); renderer.render(scene, cam);
    const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null); rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), id = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 4; x++) { const v = px[(h - 1 - y) * w * 4 + x] / 255; id.data[y * w * 4 + x] = x % 4 === 3 ? 255 : Math.min(255, Math.pow(v * 1.6, 1 / 2.2) * 255); }
    g.putImageData(id, 0, 0); if (look2) { g.fillStyle = 'rgba(200,20,10,0.45)'; g.fillRect(0, 0, w, h); } return c;
  };
  function makeBoard() {
    CH.clock('264 H'); bedLamp.intensity = 2; poseYou(SH.chambre, 'chambre'); SHADOW.root.visible = true; poseShadow(0, 'halluc'); SHADOW.root.visible = true;
    carAt(SH.route + 1); AU.lightAround(car.root.position.x); headL.intensity = 40;
    const photos = [
      snap(CH.at.clone().add(v3(0.35, 0.68, 0.15)), CH.at.clone().add(v3(0.2, 0.55, -0.2)), 30),
      snap(CH.at.clone().add(v3(0.4, 1.4, 1.2)), CH.at.clone().add(v3(-1.4, 1.2, -1.6)), 40, 96, 56, null, true),
      snap(car.root.position.clone().add(v3(9, 2.5, 5)), car.root.position.clone().add(v3(0, 0.8, 0)), 30),
    ];
    CH.clock('23:04'); bedLamp.intensity = 0; SHADOW.root.visible = false; headL.intensity = 0;
    const W = 270, H = 480, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.8), new THREE.MeshBasicMaterial({ map: tex, fog: false })); mesh.position.copy(BRD); scene.add(mesh);
    const CARDS = [[16, 64, 'RANDY GARDNER, 17 ANS', '1964 : 264 heures sans dormir'], [16, 140, '4E JOUR', 'hallucinations, trous de mémoire'], [16, 216, 'AU VOLANT', 'micro-sommeils de 1 à 4 secondes']];
    const CW = 238, CH2 = 66;
    function draw(k) {
      const gr = g.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, H * 0.7); gr.addColorStop(0, '#5a3a0c'); gr.addColorStop(1, '#0d0802');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1; for (let y = 0; y < H; y += 12) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      g.textAlign = 'left'; g.font = '800 17px Inter'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('LE RECORD', 16, 30); g.fillText('SANS DORMIR', 16, 50);
      CARDS.forEach(([x, y, t1, t2], i) => {
        const a = clamp(k * 3.6 - i * 1.0); if (a <= 0) return;
        if (i > 0) { const kk = Math.min(1, a * 1.6); g.strokeStyle = '#ffcf7a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 20, y - 10); g.lineTo(x + 20, lerp(y - 10, y, kk)); g.stroke(); }
        g.globalAlpha = a;
        g.fillStyle = 'rgba(16,10,2,0.9)'; g.fillRect(x, y, CW, CH2); g.strokeStyle = '#ffcf7a'; g.lineWidth = 2; g.strokeRect(x + 0.5, y + 0.5, CW - 1, CH2 - 1);
        g.drawImage(photos[i], x + 5, y + 5, 96, 56);
        g.fillStyle = '#fff'; g.font = '800 11px Inter'; g.fillText(t1, x + 108, y + 26); g.fillStyle = '#ffcf7a'; g.font = '700 9px Inter';
        const words = t2.split(' '); let line = '', yy = y + 42; for (const w of words) { if (g.measureText(line + w).width > 120) { g.fillText(line, x + 108, yy); line = ''; yy += 12; } line += w + ' '; } g.fillText(line, x + 108, yy);
        g.globalAlpha = 1;
      });
      const b = clamp(k * 3 - 2.0);
      g.globalAlpha = b; g.font = '800 13px Inter'; g.fillStyle = '#fff'; g.fillText('GUINNESS NE SUIT PLUS', 16, 380); g.fillStyle = '#ffcf7a'; g.fillText('CE RECORD DEPUIS 1997', 16, 398);
      g.font = '600 9px Inter'; g.fillStyle = 'rgba(255,230,200,0.8)'; g.fillText('TROP DANGEREUX POUR LA SANTÉ', 16, 416); g.globalAlpha = 1;
      tex.needsUpdate = true;
    }
    draw(0);
    return { mesh, draw };
  }
  const board = makeBoard();

  // --- l'arrêt sur image : ton corps au volant, pendant le micro-sommeil
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 4.6, title: 'ARRÊT SUR IMAGE · MICRO-SOMMEIL', tags: [
      { at: () => A.point('Head').add(v3(0, 0.08, 0)), title: 'CERVEAU', lines: ['il s’éteint', '1 à 4 secondes'], risk: 'grave', side: 'right', dy: -10 },
      { at: () => A.point('Head').add(v3(0, -0.02, 0)), title: 'YEUX', lines: ['les paupières', 'tombent'], risk: 'mal', side: 'left', dy: -40 },
      { at: () => A.point('RightHand'), title: 'RÉFLEXES', lines: ['comme avec', '1 g/L d’alcool'], risk: 'grave', side: 'right', dy: 90 },
      { at: () => A.point('Neck'), title: 'NUQUE', lines: ['la tête tombe', 'en avant'], risk: 'bof', side: 'left', dy: 120 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // --- le calque de la vue aérienne
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(ov); const og = ov.getContext('2d');
  function drawOverlay(shot, t, ts) {
    og.clearRect(0, 0, 1080, 1920); ov.style.visibility = shot === 'air' ? 'visible' : 'hidden'; if (shot !== 'air') return;
    camera.updateMatrixWorld(); const s = car.root.position.clone().add(v3(0, 0.8, 0)).project(camera), x = (s.x * 0.5 + 0.5) * 1080, y = (-s.y * 0.5 + 0.5) * 1920, pulse = 0.6 + 0.4 * Math.sin(t * 9);
    og.fillStyle = `rgba(255,40,30,${0.25 * pulse})`; og.beginPath(); og.arc(x, y, 46, 0, 7); og.fill(); og.fillStyle = '#ff2a1e'; og.beginPath(); og.arc(x, y, 15, 0, 7); og.fill();
    og.strokeStyle = 'rgba(255,255,255,0.85)'; og.lineWidth = 3; og.beginPath(); og.moveTo(x - 80, y); og.lineTo(x - 30, y); og.moveTo(x + 30, y); og.lineTo(x + 80, y); og.moveTo(x, y - 80); og.lineTo(x, y - 30); og.moveTo(x, y + 30); og.lineTo(x, y + 80); og.stroke();
    og.font = '600 24px Inter'; og.fillStyle = '#fff'; og.fillText('TA VOITURE', x + 60, y - 56);
    const m = Math.round(SPEED * Math.min(4, Math.max(0, ts - NOD - 0.5))); og.font = '700 26px Inter'; og.fillStyle = '#ff5a4f'; og.fillText(`SANS CONDUCTEUR : ${m} M`, x + 60, y + 72);
    og.font = '600 19px Inter'; og.fillStyle = 'rgba(255,255,255,0.8)'; og.fillText('VUE AÉRIENNE · INFRAROUGE · A7', 62, 1780); og.fillText(`45.6${(41 + ts * 3) | 0}° N · 4.8${(12 + ts * 2) | 0}° E`, 62, 1812);
  }

  // =====================================================================
  //  LES PLANS
  // =====================================================================
  const R = (x, y, z) => CH.at.clone().add(v3(x, y, z));   // un point de la chambre
  const cp = () => car.root.position;
  const LIGHTS = [dayL, bedLamp, aireL, headL, phoneL, fill, CH.winL, ...AU.lights];
  const SHOTS = [
    { id: 'chambre', t0: SH.chambre, cam: (u) => ({ p: R(lerp(-1.55, -1.35, u), 1.5, lerp(1.95, 1.75, u)), l: R(0.35, 0.95, -0.25), fov: 56 }), fill: 0.25 },
    { id: 'nuit4h', t0: SH.nuit4h, near: 0.03, cam: (u) => { const h = A.point('Head'); const f = v3(Math.sin(SEAT_RY), 0, Math.cos(SEAT_RY)); return { p: h.clone().addScaledVector(f, lerp(0.75, 0.62, u)).add(v3(0.12, -0.05, 0)), l: h.clone().add(v3(0, -0.06, 0)), fov: 40 }; }, dof: ['face', 0.03] },
    { id: 'matin', t0: SH.matin, cam: (u) => ({ p: R(lerp(1.3, 1.15, u), 1.5, lerp(1.0, 0.8, u)), l: R(-0.3, 1.45, -1.4), fov: 50 }), dof: ['you', 0.01], fill: 1.6 },
    { id: 'route', t0: SH.route, cam: (u) => ({ p: cp().clone().add(v3(lerp(8, 6, u), 1.3, 3.9)), l: cp().clone().add(v3(0, 0.9, 0)), fov: 44 }) },
    { id: 'habitacle', t0: SH.habitacle, near: 0.03, cam: (u) => { const p = car.root.localToWorld(v3(0.3, 1.22, lerp(0.16, 0.1, u))); return { p, l: A.point('Head').add(v3(0, -0.05, 0)), fov: lerp(50, 44, u) }; }, fill: 0.25, dof: ['face', 0.03] },
    { id: 'air', t0: SH.air, cam: (u) => ({ p: v3(cp().x + 8, 75, LANE + 1.5), l: v3(cp().x + 8.01, 0, LANE + 1.5), fov: 24, up: v3(1, 0, 0) }), look: 'aerial' },
    { id: 'reveil', t0: SH.reveil, cam: (u) => { const xc = X0 + SPEED * (WAKE - SH.route); return { p: v3(xc + 70, 0.8, 5.8), l: v3(cp().x, 0.8, 2.8), fov: 26 }; } },
    { id: 'halluc', t0: SH.halluc, cam: (u) => ({ p: R(lerp(1.4, 1.2, u), 1.6, lerp(1.9, 1.7, u)), l: R(-0.1, 1.2, -0.9), fov: 54 }), look: 'red' },
    { id: 'tableau', t0: SH.tableau, cam: (u) => ({ p: BRD.clone().add(v3(lerp(-0.5, 0.25, u), lerp(0.25, -0.1, u), lerp(6.6, 5.8, sm(0, 1, u)))), l: BRD.clone().add(v3(lerp(-0.1, 0.05, u), lerp(0.1, -0.15, u), 0)), fov: 46, up: v3(Math.sin(lerp(-0.04, 0.03, u)), 1, 0).normalize() }) },
    { id: 'aire', t0: SH.aire, near: 0.05, cam: (u) => ({ p: car.root.localToWorld(v3(lerp(3.4, 3.0, u), 1.55, lerp(-2.9, -2.6, u))), l: car.root.localToWorld(v3(-0.3, 1.05, -0.35)), fov: 44 }), fill: 0.6 },
    { id: 'end', t0: SH.end, cam: () => ({ p: R(-1.5, 1.6, 1.9), l: R(0.3, 1.0, -0.9), fov: 56 }) },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };

  function update(t) {
    const ts = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts - S.t0) / (nextT(S) - S.t0));
    const room = ['chambre', 'nuit4h', 'matin', 'halluc', 'end'].includes(S.id), road = ['route', 'habitacle', 'air', 'reveil'].includes(S.id), air = S.look === 'aerial';
    carAt(ts); poseYou(ts, S.id === 'end' ? 'chambre' : S.id); poseShadow(ts, S.id);
    // la chambre : nuit (lueur de la ville), jour (soleil par la fenêtre), hallucination (lampe de chevet rouge)
    const day = S.id === 'matin';
    CH.view(day ? 'jour' : 'nuit'); dayL.intensity = day ? 3.2 : 0; CH.winL.intensity = room ? (day ? 30 : 9) : 0; CH.amb.intensity = day ? 0.9 : 0.18;
    bedLamp.intensity = S.id === 'halluc' ? 3 : 0;
    CH.clock({ chambre: '23:04', nuit4h: '04:12', matin: '16:05', halluc: '23:02', end: '23:04' }[S.id] || '23:04');
    // la route : les lampadaires près de la voiture, les phares, le tableau de bord
    AU.lightAround(cp().x, road || S.id === 'aire' ? 1 : 0); headL.intensity = road ? (air ? 5 : 45) : 0;
    car.lights({ head: road ? 1 : 0, dash: road ? 1 : 0, inside: S.id === 'aire' ? 0.25 : 0 }); aireL.intensity = S.id === 'aire' ? 140 : 0;
    hemi.intensity = air ? 4.5 : room && !day ? 0.25 : 0.35; A.hot(air ? 1.5 : 0);
    scene.fog.near = room ? 200 : 40; scene.fog.far = room ? 600 : 420;
    // la caméra
    const C = S.cam(u);
    camera.near = S.near ?? 0.1; camera.fov = C.fov; camera.up.copy(C.up ?? v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    const fz = FZ.active(t);
    if (fz) { camera.updateMatrixWorld(); const tp = A.point('Neck').project(camera); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.15, k); }
    camera.updateProjectionMatrix();
    const d = S.dof || [0]; let focus = d[0];
    const target = { face: () => A.point('Head'), you: () => A.point('Spine2') }[focus]; if (target) focus = camera.position.distanceTo(target());
    PS.dof(frozen ? 0 : focus, d[1] ?? 0.02); PS.look(air ? 'aerial' : S.look === 'red' ? 'red' : 'normal', { gain: air ? 2.0 : S.look === 'red' ? 1.6 : 1, sat: 0.78 });
    fill.intensity = S.fill ?? 0; fill.position.copy(camera.position).add(v3(0, 0.3, 0));
    // (une lampe éteinte coûte quand même du calcul à chaque pixel : on retire du plateau celles qui ne servent pas dans ce plan)
    for (const l of LIGHTS) l.visible = l.intensity > 0;
    board.draw(clamp((ts - SH.tableau - 0.2) / 2.8));

    // --- textes
    HUD.hook(t, 'Et si tu ne <em>dormais</em><br>plus du tout ?', T.hookOut);
    const c0 = CLOCK0[S.id]; let clk = '';
    if (c0) { const [hh, mm, ss] = c0.split(':').map(Number), s = hh * 3600 + mm * 60 + ss + Math.floor(ts - S.t0); clk = `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }
    const where = room ? 'LYON 5E · CHAMBRE' : S.id === 'air' ? 'A7 · DRONE' : S.id === 'aire' ? 'A7 · AIRE DE REPOS' : road ? 'A7 · SUD DE LYON' : '';
    const cam = { chambre: 'CAM 01', nuit4h: 'CAM 02', matin: 'CAM 01', route: 'CAM 03', habitacle: 'CAM 04', air: '', reveil: 'CAM 05', halluc: 'CAM 01', aire: 'CAM 06' }[S.id];
    HUD.live(t, S.id === 'tableau' ? 'LE RECORD' : S.id === 'end' ? '' : `${where}${cam ? ' · ' + cam : ''}`, clk, 'SIMULATION');
    const aw = AWAKE[S.id];
    if (aw) HUD.block(1, { label: 'SANS DORMIR', value: aw[0], sub: aw[1], color: ['24 h', '96 h'].includes(aw[0]) ? '#ff5a4f' : aw[0] === '17 h' ? '#ffcf7a' : '#fff' });
    HUD.show2(false);
    document.getElementById('tl').style.opacity = aw && !frozen ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    HUD.subs(t, SUBS_V);
    drawOverlay(S.id, t, ts);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : CDC (NIOSH) · SÉCURITÉ ROUTIÈRE · ASFA · GUINNESS WORLD RECORDS', q: 'Et toi, ton record<br>sans dormir ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)),
    nod: FZ.realT(NOD), wake: FZ.realT(WAKE) }) };
}

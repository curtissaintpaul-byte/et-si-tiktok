// =====================================================================
//  ÉPISODE TEST (style « reconstitution » façon reportage + rendu PS2) :
//  « Et si on te volait ta voiture devant chez toi ? » — le vol par relais (voitures « mains libres »)
//  Un montage de plans courts (comme à la télé) au lieu d'une caméra fixe : rue de nuit, vue aérienne au point rouge,
//  la porte, gros plan sur le boîtier (arrêt sur image), la voiture, l'habitacle, la fuite, le tableau d'enquête,
//  la parade (la pochette anti-ondes) sur une table grise.
//  Faits (vérifiés le 15/10/2026, sources dans la légende) :
//   - environ 125 000 vols de véhicules en 2025 (124 800 au bilan définitif du 9/07/2026 ; deux-roues motorisés compris), −9 % (SSMSI) ;
//   - le vol par relais : un boîtier capte le signal de la clé (souvent dans la maison), un 2e le relaie jusqu'à la voiture,
//     qui s'ouvre et démarre (ministère de l'Intérieur, réponse au Sénat 06/11/2025 ; ADAC 18/08/2026) ; seulement les
//     voitures à accès et démarrage « mains libres » ; à quelques mètres, à travers porte et murs (pas le métal) ;
//   - durée : « en moins d'une minute » (police des West Midlands, Secured by Design ; Which? : 18 s) ;
//   - parade : pochette anti-ondes à tester (clé dedans, la voiture ne doit pas s'ouvrir) (ADAC), clé loin de la porte,
//     désactiver le mains libres si possible. Le relais n'est PAS présenté comme la méthode n°1 (la copie de clé par la
//     prise OBD est majoritaire selon le ministère).
// =====================================================================
import { THREE, createStage, makeSky, HUD, sm, lerp, clamp, rng, keys, pad, M, box, add } from '../../engine.js';
import { loadMixamo, balaclava } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2, ps2Textures, pixTex } from '../../lib-ps2.js';
import { buildStreet, makeSUV, keyFob, relayBox } from '../../lib-rue.js';

const Q = new URLSearchParams(location.search);
const HOLD_BOX = { off: [0.0, 0.1, 0.045], rot: [0, 0, 0] };   // le boîtier dans la paume (repère de l'os de la main)
const TEXT0 = 3.1;                                            // le moment de l'animation « texting » où le boîtier est tenu droit (on y reste)
const DRIVER = new THREE.Vector3(-0.42, 0.25, -0.4);          // le bassin du conducteur (repère de la voiture)
const V = new THREE.Vector3, v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// --- le découpage (temps de la scène, en secondes) : un plan = un cadre, une caméra, un « look »
const SH = { rue: 0, air1: 3.0, porte: 5.6, boitier: 8.6, voiture: 11.2, habitacle: 14.6, air2: 17.2, tableau: 19.8, parade: 23.4, end: 27.4 };
const FREEZE_AT = 9.9;
const sceneEnd = 30.4;
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 5.5, '3 h du matin. Ta clé dort dans l’entrée.'],
  [5.7, 8.5, 'Un voleur colle un boîtier contre ta porte.'],
  [8.7, 11.1, 'Il capte le signal de ta clé, à travers la porte.'],
  [11.3, 14.5, 'Un 2e boîtier le relaie jusqu’à ta voiture. Elle s’ouvre.'],
  [14.7, 17.1, 'Elle croit que la clé est là. Elle démarre.'],
  [17.3, 19.7, 'Moins d’une minute. Sans casser une vitre.'],
  [19.9, 23.3, 'En 2025, environ 125 000 véhicules volés en France, motos et scooters compris.'],
  [23.5, 25.3, 'La parade la plus simple : une pochette anti-ondes.'],
  [25.4, 27.3, 'Teste-la : clé dedans, ta voiture ne doit plus s’ouvrir.'],
];
// --- l'horloge « réelle » du vol (le montage saute des secondes entre les plans)
const CHRONO = [[SH.porte + 1.2, 0], [SH.boitier, 6], [SH.voiture, 14], [SH.voiture + 2.6, 24], [SH.habitacle, 31], [SH.habitacle + 2.4, 38], [SH.air2, 41], [SH.tableau, 52]];

export default async function () {
  const stage = createStage({ fov: 50, far: 600, bloom: [0.35, 0.5, 0.85], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.3;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#ff5a4f');

  // --- la nuit : ciel bleu nuit avec la lueur orange de la ville à l'horizon, lune froide, réverbères au sodium
  const sky = makeSky(scene, { nightZen: [0.004, 0.006, 0.016], nightHor: [0.035, 0.028, 0.032], stars: 0.25, milky: 0 });
  sky.u.uDay.value = 0;
  scene.fog = new THREE.Fog('#0b0c12', 30, 140);
  const moon = new THREE.DirectionalLight('#8fa8e6', 1.5); moon.position.set(-30, 60, 25); moon.target.position.set(0, 0, -8);
  moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 10, far: 160 }); moon.shadow.bias = -0.0005;
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight('#4a5a8a', '#1c1814', 0.8); scene.add(hemi);
  const fill = new THREE.PointLight('#c8d6ff', 0, 4, 1.5); scene.add(fill);
  const RUE = buildStreet(scene, { night: true });
  // l'applique au-dessus de la porte (restée allumée) : elle éclaire le voleur et son boîtier
  box(0.16, 0.24, 0.1, new THREE.MeshStandardMaterial({ color: '#222', emissive: '#ffcf8a', emissiveIntensity: 2.5 }), scene, -1.35, 2.35, -10.93);
  const porch = new THREE.SpotLight('#ffcf8a', 14, 9, 1.1, 0.7, 1.4); porch.position.set(-1.35, 2.3, -10.7); porch.target.position.set(-0.6, 0, -8.6);
  porch.castShadow = true; porch.shadow.mapSize.set(512, 512); porch.shadow.bias = -0.001; porch.shadow.normalBias = 0.02; scene.add(porch, porch.target);

  // --- la voiture dans l'allée, le nez vers la maison
  const car = makeSUV('#a9adb3'); car.root.position.copy(RUE.drive); car.root.rotation.y = Math.PI / 2; scene.add(car.root);   // gris clair : on la voit bien la nuit
  const carPos = (ts) => {   // la fuite : marche arrière, braquage, puis la rue vers +x
    const u = ts - (SH.air2 + 0.2);
    if (u <= 0) return { p: RUE.drive.clone(), ry: Math.PI / 2 };
    const back = clamp(u / 1.3), p = v3(3.25 + 1.6 * sm(0.3, 1, back), 0, lerp(-8.6, -1.6, sm(0, 1, back))), ry = Math.PI / 2 - (Math.PI / 2) * sm(0.35, 1, back);
    if (u > 1.3) p.x += (u - 1.3) * (u - 1.3) * 3.2 + (u - 1.3) * 2;
    return { p, ry };
  };
  // --- la clé, dans l'entrée (sur un meuble, derrière la porte)
  const KEY = keyFob(); KEY.position.copy(RUE.key); KEY.scale.setScalar(1.6); scene.add(KEY);
  box(0.9, 0.06, 0.35, M('#5a4636'), scene, RUE.key.x, RUE.key.y - 0.05, RUE.key.z);

  // --- les deux voleurs : Josh et Leonard (Mixamo), vêtements sombres, cagoule noire (moulée sur leur tête)
  const CAST = await loadMixamo({ chars: ['Josh', 'Leonard'], anims: ['idle', 'walk', 'texting', 'lookaround', 'driving'] });
  const A = CAST.make('Josh', { height: 1.8 }), B = CAST.make('Leonard', { height: 1.78 });   // A : le boîtier contre la porte ; B : le boîtier à la portière
  scene.add(A.root, B.root); balaclava(A); balaclava(B);
  const boxA = relayBox(false), boxB = relayBox(true);
  A.hold(boxA.root, 'RightHand', HOLD_BOX); B.hold(boxB.root, 'RightHand', HOLD_BOX);   // le boîtier dans la main, comme un téléphone
  const hot = (P, k) => P.hot(k);

  // les voleurs : où ils sont et ce qu'ils font, à chaque instant (temps de scène) ; ils marchent à ~1,5 m/s
  const PATH_A = [[0.5, -7.0, -4.6], [4.2, -1.0, -4.8], [5.9, -0.6, -7.2], [7.8, -0.45, -10.2]];
  const PATH_B = [[0.5, -8.5, -4.4], [4.4, -2.4, -4.5], [7.2, 1.95, -5.2], [9.3, 1.85, -8.5]];
  function along(PTH, ts) {
    if (ts <= PTH[0][0]) return { p: v3(PTH[0][1], 0, PTH[0][2]), walking: false, dir: v3(1, 0, 0) };
    for (let i = 1; i < PTH.length; i++) { const [t1, x1, z1] = PTH[i], [t0, x0, z0] = PTH[i - 1]; if (ts <= t1) { const k = (ts - t0) / (t1 - t0); return { p: v3(lerp(x0, x1, k), 0, lerp(z0, z1, k)), walking: true, dir: v3(x1 - x0, 0, z1 - z0).normalize() }; } }
    const L = PTH[PTH.length - 1], P2 = PTH[PTH.length - 2]; return { p: v3(L[1], 0, L[2]), walking: false, dir: v3(L[1] - P2[1], 0, L[2] - P2[2]).normalize() };
  }
  function poseThieves(ts) {
    // A : il marche jusqu'à la porte, puis regarde l'écran de son boîtier, collé à la porte ; il reste là tout le vol
    const a = along(PATH_A, ts), endA = PATH_A[3][0]; A.root.position.copy(a.p);
    if (a.walking) { A.pose('walk', ts * 1.1); A.root.rotation.y = Math.atan2(a.dir.x, a.dir.z); }
    else if (ts > endA) { const k = sm(endA, endA + 0.5, ts); A.pose([['walk', endA * 1.1, 1 - k], ['texting', TEXT0 + 0.12 * Math.sin(ts * 1.3), k]]); A.root.rotation.y = Math.PI; }   // (on reste au moment où il tient le boîtier droit, avec de petits mouvements)
    else { A.pose('idle', ts); A.root.rotation.y = Math.PI / 2; }
    // B : il va à la portière du conducteur avec son boîtier ; puis il est au volant (plan habitacle), puis il est parti
    const inCar = ts >= SH.habitacle && ts < SH.air2 + 0.2;
    B.root.visible = ts < SH.air2 + 0.2;
    if (inCar) { B.pose('driving', ts - SH.habitacle); B.root.position.copy(car.root.localToWorld(DRIVER.clone())); B.root.rotation.y = car.root.rotation.y + Math.PI / 2; return; }
    const b = along(PATH_B, ts), endB = PATH_B[3][0]; B.root.position.copy(b.p);
    if (b.walking) { B.pose('walk', ts * 1.1 + 0.4); B.root.rotation.y = Math.atan2(b.dir.x, b.dir.z); }
    else if (ts > endB) { const k = sm(endB, endB + 0.5, ts); B.pose([['walk', endB * 1.1 + 0.4, 1 - k], ['texting', TEXT0 + 0.05 + 0.12 * Math.sin(ts * 1.1 + 1), k]]); B.root.rotation.y = Math.PI / 2; }
    else { B.pose('idle', ts); B.root.rotation.y = Math.PI / 2; }
  }

  // --- le décor du gros plan d'objets : une table grise (loin de la rue), la clé et la pochette
  const TBL = v3(0, 0, -400);
  const tableTex = pixTex(64, 64, (g, w, h) => { const r = rng(11); g.fillStyle = '#5c5e61'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { const v = 80 + (r() * 40) | 0; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.globalAlpha = 0.35; g.fillRect(r() * w | 0, r() * h | 0, 1, 1); } }, 3);
  add(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.95 }), scene, TBL.x, TBL.y, TBL.z, -Math.PI / 2, 0, 0);
  const tl = new THREE.SpotLight('#fff1dd', 7, 6, 0.7, 0.8, 1.2); tl.position.copy(TBL).add(v3(-0.8, 1.6, 0.6)); tl.target.position.copy(TBL); tl.castShadow = true; tl.shadow.mapSize.set(512, 512); scene.add(tl, tl.target);
  // la pochette : un vrai « fourreau » ouvert d'un côté (la clé entre dedans et disparaît), avec un rabat qui se referme
  const KEY2 = keyFob(); KEY2.scale.setScalar(1.5); scene.add(KEY2);
  const pouch = new THREE.Group(); scene.add(pouch); pouch.position.copy(TBL).add(v3(0.05, 0, 0));
  const fabric = pixTex(16, 16, (g, w, h) => { g.fillStyle = '#2b2d31'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < w; i += 2) g.fillRect(i, 0, 1, h); }, 4);
  const pm = new THREE.MeshStandardMaterial({ map: fabric, roughness: 1 }), PL = 0.19, PW = 0.11, PH = 0.032;
  box(PL, 0.004, PW, pm, pouch, 0, 0.002, 0); box(PL, 0.004, PW, pm, pouch, 0, PH, 0);                  // dessous, dessus
  for (const sz of [-1, 1]) box(PL, PH, 0.004, pm, pouch, 0, PH / 2, sz * (PW / 2 - 0.002));            // les côtés
  box(0.004, PH, PW, pm, pouch, PL / 2, PH / 2, 0);                                                    // le fond (l'ouverture est côté -x)
  box(0.12, 0.002, 0.03, M('#c9cbd0', { r: 0.3, m: 0.7, nc: true }), pouch, 0.02, PH + 0.003, 0);     // la bande argentée
  const hinge = new THREE.Group(); hinge.position.set(-PL / 2, PH, 0); pouch.add(hinge);
  box(0.055, 0.003, PW, pm, hinge, 0.0275, 0.0015, 0);                                                 // le rabat (posé à plat quand l'angle vaut 0)
  const keyTable = (ts) => {   // la clé glisse dans l'ouverture et disparaît, puis le rabat se rabat devant l'ouverture
    const u = ts - SH.parade, k = sm(0.8, 2.1, u);
    KEY2.position.copy(pouch.position).add(v3(lerp(-0.3, 0.05, k), PH / 2 + 0.002 + 0.03 * (1 - sm(0.55, 0.85, k)) * Math.sin(Math.PI * Math.min(1, k * 1.4)), 0)); KEY2.rotation.set(0, Math.PI / 2 + lerp(0.5, 0, sm(0, 0.7, k)), 0);
    hinge.rotation.z = lerp(Math.PI / 2, Math.PI * 1.5, sm(2.3, 2.9, u));   // ouvert (levé) → refermé (pend devant l'ouverture)
  };

  // --- le tableau d'enquête (rouge) : des fiches reliées par des fils, photos prises dans la scène 3D
  const BRD = v3(0, 40, -300);
  const snap = (pos, look, fov = 35, w = 104, h = 48, prep) => {
    const cam = new THREE.PerspectiveCamera(fov, w / h, 0.05, 200); cam.position.copy(pos); cam.lookAt(look); prep && prep();
    const rt = new THREE.WebGLRenderTarget(w, h); renderer.setRenderTarget(rt); renderer.render(scene, cam);
    const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null); rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), id = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 4; x++) { const v = px[(h - 1 - y) * w * 4 + x] / 255; id.data[y * w * 4 + x] = x % 4 === 3 ? 255 : Math.min(255, Math.pow(v * 1.5, 1 / 2.2) * 255); }
    g.putImageData(id, 0, 0); return c;
  };
  let board = null;
  function makeBoard() {
    // les photos : la clé, le voleur A, le voleur B, la voiture (une « photo d'identité » de chacun)
    poseThieves(SH.boitier); A.pose('idle', 0); B.pose('idle', 0); A.root.rotation.y = 0; B.root.rotation.y = 0; scene.updateMatrixWorld(true);
    const headOf = (P) => P.point('Head').add(v3(0, 0.07, 0));
    const photos = [
      snap(KEY.position.clone().add(v3(0.12, 0.22, 0.12)), KEY.position, 30),
      snap(headOf(A).add(v3(0, -0.04, 0.9)), headOf(A).add(v3(0, -0.06, 0)), 22),
      snap(headOf(B).add(v3(0, -0.04, 0.9)), headOf(B).add(v3(0, -0.06, 0)), 22),
      snap(RUE.drive.clone().add(v3(4.5, 2.0, 3.5)), RUE.drive.clone().add(v3(0, 0.7, 0)), 34),
    ];
    const W = 270, H = 480, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.8), new THREE.MeshBasicMaterial({ map: tex, fog: false })); mesh.position.copy(BRD); scene.add(mesh);
    // la chaîne en « U » : la clé → boîtier 1 (en haut), boîtier 2 → la voiture (en bas) ; rien dans la bande des sous-titres
    const CARDS = [[16, 70, 'TA CLÉ', 'dans l’entrée'], [142, 70, 'BOÎTIER 1', 'contre la porte'], [142, 186, 'BOÎTIER 2', 'à la portière'], [16, 186, 'TA VOITURE', 'ouverte, démarrée']];
    const CW = 112, CH = 92;
    function draw(k) {   // k : 0 → 1, les fiches et les fils apparaissent l'un après l'autre
      const gr = g.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, H * 0.7); gr.addColorStop(0, '#8a1010'); gr.addColorStop(1, '#180303');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1; for (let y = 0; y < H; y += 12) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      g.textAlign = 'left'; g.font = '800 19px Inter'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('LE VOL PAR RELAIS', 16, 40);
      CARDS.forEach(([x, y, t1, t2], i) => {
        const a = clamp(k * 4.4 - i * 1.0);
        if (a <= 0) return;
        if (i > 0) {   // le fil rouge depuis la fiche d'avant (il se dessine)
          const [px0, py0] = CARDS[i - 1], kk = Math.min(1, a * 1.6);
          const [sx, sy, ex, ey] = i === 2 ? [px0 + CW / 2, py0 + CH, x + CW / 2, y] : [px0 + (x > px0 ? CW : 0), py0 + CH / 2, x + (x > px0 ? 0 : CW), y + CH / 2];
          g.strokeStyle = '#ff3b30'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(lerp(sx, ex, kk), lerp(sy, ey, kk)); g.stroke();
        }
        g.globalAlpha = a;
        g.fillStyle = 'rgba(12,6,6,0.9)'; g.fillRect(x, y, CW, CH); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
        g.drawImage(photos[i], x + 4, y + 4, CW - 8, 48);
        g.fillStyle = '#fff'; g.font = '800 13px Inter'; g.fillText(t1, x + 6, y + 68); g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '600 9px Inter'; g.fillText(t2, x + 6, y + 83);
        g.fillStyle = '#ff2a20'; g.fillRect(x + CW - 10, y + CH - 10, 6, 6);
        g.globalAlpha = 1;
      });
      const b = clamp(k * 3 - 1.8);
      g.globalAlpha = b; g.font = '800 15px Inter'; g.fillStyle = '#fff'; g.fillText('VOITURES « MAINS LIBRES »', 16, 380); g.fillText('SEULEMENT, ET PAS TOUTES', 16, 400);
      g.font = '600 10px Inter'; g.fillStyle = 'rgba(255,205,195,0.85)'; g.fillText('LES CLÉS À BOUTON NE RISQUENT PAS CE VOL-LÀ', 16, 420); g.globalAlpha = 1;
      tex.needsUpdate = true;
    }
    draw(0);
    return { mesh, draw };
  }
  board = makeBoard();

  // --- l'arrêt sur image : le boîtier contre la porte, et la clé derrière (vue « à travers le mur »)
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 4.4, title: 'ARRÊT SUR IMAGE · LE BOÎTIER', tags: [
      { at: () => boxA.root.getWorldPosition(new THREE.Vector3()), title: 'BOÎTIER 1', lines: ['il capte ta clé', 'à quelques mètres'], risk: 'grave', side: 'right', dy: -300 },
      { at: () => KEY.getWorldPosition(new THREE.Vector3()), title: 'TA CLÉ', lines: ['derrière la porte,', 'elle répond au boîtier'], risk: 'mal', side: 'left', dy: 260 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // --- le calque des inserts : point rouge de la vue aérienne, viseur, coordonnées
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(ov); const og = ov.getContext('2d');
  function drawOverlay(shot, t, ts) {
    og.clearRect(0, 0, 1080, 1920); ov.style.visibility = shot === 'air1' || shot === 'air2' ? 'visible' : 'hidden';
    if (ov.style.visibility === 'hidden') return;
    camera.updateMatrixWorld(); const p = car.root.position.clone().add(v3(0, 0.8, 0)).project(camera), x = (p.x * 0.5 + 0.5) * 1080, y = (-p.y * 0.5 + 0.5) * 1920;
    const pulse = 0.6 + 0.4 * Math.sin(t * 9);
    og.fillStyle = `rgba(255,40,30,${0.25 * pulse})`; og.beginPath(); og.arc(x, y, 46, 0, 7); og.fill();
    og.fillStyle = '#ff2a1e'; og.beginPath(); og.arc(x, y, 15, 0, 7); og.fill();
    og.strokeStyle = 'rgba(255,255,255,0.85)'; og.lineWidth = 3; og.beginPath(); og.moveTo(x - 80, y); og.lineTo(x - 30, y); og.moveTo(x + 30, y); og.lineTo(x + 80, y); og.moveTo(x, y - 80); og.lineTo(x, y - 30); og.moveTo(x, y + 30); og.lineTo(x, y + 80); og.stroke();
    og.font = '600 22px Inter'; og.fillStyle = '#fff'; og.fillText(shot === 'air1' ? 'TA VOITURE' : 'TA VOITURE · EN FUITE', x + 60, y - 56);
    og.font = '600 19px Inter'; og.fillStyle = 'rgba(255,255,255,0.8)'; og.fillText('VUE AÉRIENNE · INFRAROUGE', 62, 1780); og.fillText(`48.5${(41 + ts * 3) | 0}° N · 2.6${(12 + ts * 2) | 0}° E`, 62, 1812);
  }

  // =====================================================================
  //  LES PLANS : caméra (position, cible, focale), flou de profondeur, look
  // =====================================================================
  const doorP = RUE.door, keyP = RUE.key;
  const SHOTS = [
    { id: 'rue', t0: SH.rue, cam: (u) => ({ p: v3(lerp(5.2, 4.3, u), lerp(1.5, 1.45, u), lerp(3.6, 2.5, u)), l: v3(lerp(2.4, 2.6, u), 1.6, -9.5), fov: 46 }), dof: [0] },
    { id: 'air1', t0: SH.air1, cam: (u) => ({ p: v3(lerp(-6, 0.5, u), 90, lerp(-3.5, -6.0, u)), l: v3(lerp(-6, 0.5, u) + 0.01, 0, lerp(-3.5, -6.0, u) - 0.01), fov: lerp(46, 17, sm(0, 1, u)), up: v3(0, 0, -1) }), look: 'aerial' },
    { id: 'porte', t0: SH.porte, cam: (u) => ({ p: v3(lerp(-1.0, -0.85, u), lerp(0.55, 0.6, u), lerp(-6.3, -6.6, u)), l: v3(-0.45, 1.25, -10.8), fov: 50 }), dof: ['thiefA', 0.006] },
    { id: 'boitier', t0: SH.boitier, near: 0.03, fill: 0.35, cam: (u) => { const b = boxA.root.getWorldPosition(new THREE.Vector3()); return { p: b.clone().add(v3(lerp(0.52, 0.42, u), lerp(0.07, 0.05, u), lerp(0.3, 0.24, u))), l: b.clone().add(v3(-0.08, -0.01, -0.1)), fov: 40 }; }, dof: ['box', 0.03] },
    { id: 'voiture', t0: SH.voiture, fill: 0.5, cam: (u) => ({ p: v3(lerp(0.15, 0.4, u), 1.55, lerp(-10.45, -10.25, u)), l: v3(2.45, 0.95, lerp(-8.2, -8.4, u)), fov: 56 }), dof: ['thiefB', 0.005] },
    { id: 'habitacle', t0: SH.habitacle, near: 0.03, fill: 0.2, cam: (u) => { const p = car.root.localToWorld(v3(0.3, 1.24, lerp(0.14, 0.08, u))); const l = B.point('Head').add(v3(0, -0.03, 0)); return { p, l, fov: lerp(50, 44, u) }; }, dof: ['thiefBface', 0.03] },
    { id: 'air2', t0: SH.air2, cam: (u) => ({ p: v3(lerp(4, 14, u), 90, lerp(-5, -2, u)), l: v3(lerp(4, 14, u) + 0.01, 0, lerp(-5, -2, u) - 0.01), fov: lerp(22, 28, u), up: v3(0, 0, -1) }), look: 'aerial' },
    { id: 'tableau', t0: SH.tableau, cam: (u) => ({ p: BRD.clone().add(v3(lerp(-0.5, 0.25, u), lerp(0.25, -0.1, u), lerp(6.6, 5.8, sm(0, 1, u)))), l: BRD.clone().add(v3(lerp(-0.1, 0.05, u), lerp(0.1, -0.15, u), 0)), fov: 46, up: v3(Math.sin(lerp(-0.04, 0.03, u)), 1, 0).normalize() }), dof: [0] },
    { id: 'parade', t0: SH.parade, near: 0.02, cam: (u) => ({ p: TBL.clone().add(v3(lerp(-0.46, -0.4, u), lerp(0.2, 0.17, u), lerp(0.3, 0.26, u))), l: TBL.clone().add(v3(-0.04, 0.012, 0)), fov: 40 }), dof: ['table', 0.035] },
    { id: 'end', t0: SH.end, cam: () => ({ p: v3(8.6, 1.4, 7.2), l: v3(2.2, 1.5, -8.5), fov: 44 }) },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };

  function update(t) {
    const ts = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts - S.t0) / (nextT(S) - S.t0));
    // le décor qui bouge
    poseThieves(ts);
    const cp = carPos(ts); car.root.position.copy(cp.p); car.root.rotation.y = cp.ry;
    const unlock = SH.voiture + 1.6, start = SH.habitacle + 1.2;
    const blink = ts > unlock && ts < unlock + 0.9 ? (Math.floor((ts - unlock) / 0.22) % 2 === 0 ? 1 : 0) : 0;
    car.lights({ blink, inside: ts > unlock && ts < SH.habitacle ? 0.9 : 0, dash: ts > start ? 1 : 0, head: ts > start ? 1 : 0, brake: ts > SH.air2 && ts < SH.air2 + 1.5 ? 1 : 0 });
    boxA.set(ts > PATH_A[3][0] + 0.4, Math.floor(ts * 6) % 2 === 0); boxB.set(ts > PATH_B[3][0] + 0.4, Math.floor(ts * 6 + 1) % 2 === 0);
    keyTable(ts);
    boxB.root.visible = !(ts >= SH.habitacle);
    if (board) board.draw(clamp((ts - SH.tableau - 0.2) / 2.6));
    const air = S.look === 'aerial';
    hemi.intensity = air ? 5 : 0.8; moon.intensity = air ? 3 : 1.5;   // (vue aérienne : on « éclaire » comme une caméra infrarouge)
    hot(A, air ? 5 : 0); hot(B, air ? 5 : 0);
    // la caméra du plan
    const C = S.cam(u);
    camera.near = S.near ?? 0.1; camera.fov = C.fov; camera.up.copy(C.up ?? v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    const fz = FZ.active(t);
    if (fz) {   // le zoom pendant l'arrêt : on resserre sur le boîtier et la porte
      camera.updateMatrixWorld(); const tp = boxA.root.getWorldPosition(new THREE.Vector3()).project(camera);
      const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.12, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    // flou de profondeur : une distance fixe, ou « la distance de l'objet visé »
    const d = S.dof || [0]; let focus = d[0];
    const target = { thiefA: () => A.point('Spine2'), box: () => boxA.root.getWorldPosition(new THREE.Vector3()), thiefB: () => B.point('Spine2'), thiefBface: () => B.point('Head'), table: () => TBL.clone().add(v3(-0.04, 0.012, 0)) }[focus];
    if (target) focus = camera.position.distanceTo(target());
    PS.dof(frozen ? 0 : focus, d[1] ?? 0.02); PS.look(air ? 'aerial' : 'normal', { gain: air ? 2.3 : 1 });
    // la lumière d'appoint (comme sur un tournage) : une petite lampe près de la caméra pour les gros plans
    fill.intensity = S.fill ?? 0; fill.position.copy(camera.position).add(v3(0, 0.25, 0));
    // la clé « vue à travers le mur » pendant l'arrêt sur image
    KEY.traverse((o) => { if (o.material) { o.material.depthTest = !frozen; o.renderOrder = frozen ? 10 : 0; } });

    // --- textes
    HUD.hook(t, 'Et si on te <em>volait</em> ta voiture devant chez toi ?', T.hookOut);
    const clock = 3 * 3600 + 12 * 60 + 4 + ts;
    HUD.live(t, { rue: 'RUE DES TILLEULS · CAM 02', air1: 'RUE DES TILLEULS · DRONE', porte: 'RUE DES TILLEULS · CAM 03', boitier: 'RUE DES TILLEULS · CAM 03', voiture: 'RUE DES TILLEULS · CAM 04', habitacle: 'RUE DES TILLEULS · CAM 05', air2: 'RUE DES TILLEULS · DRONE', tableau: 'LE MODE OPÉRATOIRE', parade: 'LA PARADE', end: '' }[S.id],
      `${pad(Math.floor(clock / 3600))}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}`, 'SIMULATION');
    const chrono = keys(CHRONO, ts), showC = ts > SH.porte + 1.0 && ts < SH.tableau;
    HUD.block(1, { label: showC ? 'CHRONO DU VOL' : '', value: showC ? `0:${pad(Math.floor(chrono))}` : '', sub: showC ? (ts > SH.air2 ? 'VOITURE PARTIE' : 'SANS EFFRACTION') : '', color: ts > SH.air2 ? '#ff5a4f' : '#fff' }); HUD.show2(false);
    document.getElementById('tl').style.opacity = showC ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    HUD.subs(t, SUBS_V);
    drawOverlay(S.id, t, ts);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : MINISTÈRE DE L’INTÉRIEUR (SSMSI) · ADAC · POLICE DES WEST MIDLANDS', q: 'Et toi, ta clé<br>dort où ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
    if (Q.get('dbg') === 'car') { console.log('[dbg] hips ' + (B.point('Hips').y - B.root.position.y).toFixed(3) + ' head ' + (B.point('Head').y - B.root.position.y).toFixed(3) + ' rootY ' + B.root.position.y.toFixed(3) + ' hipsXZ ' + B.root.worldToLocal(B.point('Hips')).toArray().map((v) => v.toFixed(2)).join(',')); camera.clearViewOffset(); const c = car.root.localToWorld(v3(-0.4, 1.0, 3.2)); camera.position.copy(c); camera.lookAt(car.root.localToWorld(v3(-0.4, 0.9, 0))); camera.fov = 40; camera.near = 0.05; camera.updateProjectionMatrix(); car.ghMesh.visible = false; PS.dof(0); }
    if (Q.get('nob')) B.root.visible = false; if (Q.get('nocar')) car.root.visible = false; if (Q.get('nodof')) PS.dof(0);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)),
    unlock: FZ.realT(SH.voiture + 1.6), start: FZ.realT(SH.habitacle + 1.2), leave: FZ.realT(SH.air2 + 0.2), pouch: FZ.realT(SH.parade + 2.2) }) };
}

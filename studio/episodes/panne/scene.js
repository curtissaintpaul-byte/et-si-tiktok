// =====================================================================
//  ÉPISODE : « Et si toute la France tombait en panne de courant ? » — un appartement à Lyon, vue sur Fourvière
//  Un seul personnage : Chloé, 28 ans. Un mardi de novembre à 18 h 32, le courant saute dans toute la France.
//  On suit ses 24 heures : le noir, le téléphone qui ne capte plus, le frigo, le froid de la nuit, le lendemain sans
//  distributeurs, puis le courant qui revient quartier par quartier. Retour au réel : France 1978, Espagne 2025, exercice 2027.
//  Caméra fixe : une caméra de surveillance d'intérieur, dans un coin du plafond. Elle a sa propre batterie : quand il fait
//  noir, elle passe en vision nocturne (noir et blanc, éclairage infrarouge), comme les vraies.
//  Deux arrêts sur image (juste après la coupure ; à 3 h du matin, dans le froid). Pas d'effet multiplication.
//  Faits (sources dans la légende) :
//   - Antennes relais : en cas de coupure, elles « ne tiendront pas plus de 20 minutes » (Orange, Localtis / Banque des Territoires, 2022).
//   - Frigo : jeter les aliments réfrigérés après 4 heures sans courant (CDC, États-Unis).
//   - Yeux : 20 à 30 min pour s'habituer au noir (adaptation à l'obscurité ; déjà utilisé dans « lumières »).
//   - Froid chez soi : l'OMS (Housing and Health Guidelines, 2018) recommande au moins 18 °C ; en dessous, la tension
//     artérielle monte, plus de problèmes respiratoires ; le froid resserre les vaisseaux (vasoconstriction).
//   - 19 décembre 1978 : panne de presque toute la France, de 8 h 27 à midi environ (Public Sénat).
//   - 28 avril 2025 : Espagne et Portugal, coupure à 12 h 33 ; 99,95 % de la demande rétablie le 29 avril à 7 h (Red Eléctrica)
//     → plus de 18 heures. Distributeurs de billets arrêtés, 35 000 passagers évacués des trains et du métro (AP).
//   - Exercice national de « black-out électrique généralisé » prévu au 2e semestre 2027 (SGDSN / CIRN, juillet 2026).
//  HYPOTHÈSES (affichées comme telles) : la panne dure 24 h ; la température chez Chloé (dehors 6 °C, appartement chauffé à
//  l'électricité, refroidissement exponentiel avec une constante de 50 h : 20 °C → 18 °C à 3 h du matin → 15 °C le lendemain soir).
// =====================================================================
import { THREE, createStage, M, box, cyl, HUD, sm, lerp, clamp, rng, pad, fr, canvasTex } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';

const Q = new URLSearchParams(location.search);
const num = (k, d) => Number(Q.get(k) ?? d);
// ---------------------------------------------------------------------
// la partition (temps de SCÈNE)
// ---------------------------------------------------------------------
const ENTER0 = 2.6, SIT0 = 5.6, SIT1 = 6.6;      // Chloé entre, traverse, s'assoit
const TV_ON = 10.8, BO = 14.0;                   // la télé ; LA COUPURE (18 h 32)
const FZ1 = 17.4, PHONE = 22.2, NET_OFF = 29.8;  // arrêt n° 1 ; la lampe du téléphone ; plus de réseau (18 h 52)
const NIGHT = 41.2, FZ2 = 44.7, DAY = 45.2, DUSK = 49.0;
const REST0 = 52.8, REST1 = 58.4, HOME_ON = 56.8, STANDUP = 50.6;
const RW0 = 60.2, RW1 = 61.6;
const sceneEnd = 77.6;
const T = { hookOut: 3.0, bo: BO, rewind: RW0, real: RW1, endCard: 73.6, duration: sceneEnd };
const SUBS = [
  [3.2, 6.8, 'Lyon, un mardi de novembre. Chloé, 28 ans, rentre du travail.'],
  [7.0, 10.6, 'Dehors, il fait 6\u00a0°C. Chez elle, le chauffage électrique tourne à 20\u00a0°C.'],
  [10.8, 13.8, 'Elle allume la télé. Son téléphone charge à côté d’elle.'],
  [14.2, 17.4, '18 h 32. Tout s’éteint. Chez elle, dans la rue, dans toute la France.'],
  [17.6, 21.8, 'Les métros, les trams et les feux rouges s’arrêtent. Des gens restent coincés dans les ascenseurs.'],
  [22.2, 25.8, 'Chloé allume la lampe de son téléphone. Il capte encore. Plus pour longtemps.'],
  [26.0, 29.6, 'Les antennes relais tiennent sur batterie. Selon Orange, pas plus de 20 minutes.'],
  [29.8, 33.0, '18 h 52. Plus de réseau. Plus d’appels, plus d’internet.'],
  [37.4, 41.0, '22 h. Le frigo ne fait plus de froid. Après 4 heures, ce qu’il contient n’est plus sûr.'],
  [41.2, 44.6, '3 h du matin. Sans chauffage, l’appartement se refroidit. Chloé ne dort pas.'],
  [45.2, 48.8, 'Mercredi matin. Toujours rien. Les distributeurs de billets ne marchent plus.'],
  [49.0, 52.6, 'Le soir tombe. Il fait 15\u00a0°C chez elle. Ça fait bientôt 24 heures.'],
  [52.8, 56.6, 'Et puis, au loin, les lumières reviennent. Quartier par quartier.'],
  [56.8, 60.0, '18 h 40. Chez Chloé aussi. Le frigo se remet à ronronner.'],
  [61.8, 65.4, 'C’est déjà arrivé. Le 19 décembre 1978, presque toute la France a été coupée, de 8 h 27 à midi.'],
  [65.6, 69.4, 'Le 28 avril 2025, l’Espagne et le Portugal. Il a fallu plus de 18 heures pour tout rallumer.'],
  [69.6, 73.4, 'Et en 2027, l’État va simuler un black-out géant, pour s’y préparer.'],
];
// l'heure de l'histoire (minutes depuis mardi 0 h) selon le temps de scène
const CLOCK = [[0, 18 * 60 + 28], [BO, 18 * 60 + 32], [NET_OFF, 18 * 60 + 52], [33.2, 19 * 60], [37.4, 22 * 60], [NIGHT, 27 * 60], [44.9, 28 * 60], [DAY, 33 * 60], [DUSK, 41 * 60 + 30], [REST0, 42 * 60 + 20], [HOME_ON, 42 * 60 + 40], [RW0, 42 * 60 + 41]];
const clockAt = (ts) => { for (let i = 1; i < CLOCK.length; i++) if (ts < CLOCK[i][0]) { const [a, va] = CLOCK[i - 1], [b, vb] = CLOCK[i]; return va + (vb - va) * (ts - a) / (b - a); } return CLOCK[CLOCK.length - 1][1] + (ts - CLOCK[CLOCK.length - 1][0]) / 60; };
const rateAt = (ts) => (clockAt(ts + 0.05) - clockAt(ts - 0.05)) * 10 * 60;   // secondes d'histoire par seconde de vidéo
const T_OUT = 6, TAU = 50;   // hypothèse : 6 °C dehors, constante de refroidissement 50 h
const tempAt = (ts) => { const h = Math.max(0, clockAt(Math.min(ts, HOME_ON)) - (18 * 60 + 32)) / 60; return T_OUT + (20 - T_OUT) * Math.exp(-h / TAU); };

export default async function () {
  const stage = createStage({ fov: 66, far: 400, bloom: [0.3, 0.5, 0.86], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const RN = rng(1832);
  scene.background = new THREE.Color('#000');

  // -------------------------------------------------------------------
  // LE DÉCOR : un salon (4,2 × 4,4 m), baie vitrée sur la colline de Fourvière
  // -------------------------------------------------------------------
  const W = 4.2, D = 4.4, H = 2.6, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;
  const wallM = new THREE.MeshStandardMaterial({ color: '#d9d2c6', roughness: 0.95 });
  const floorTex = canvasTex(512, 512, (g) => { const r = rng(5); for (let i = 0; i < 16; i++) { g.fillStyle = ['#8a6545', '#7d5b3d', '#94704f'][i % 3]; g.fillRect(0, i * 32, 512, 32); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, i * 32, 512, 2); g.fillRect(((i * 173) % 512), i * 32, 2, 32); }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(40,25,10,${r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 6 + r() * 20, 1); } });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(2, 2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M('#e8e4dc')); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);
  const wall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  wall(D, H, X0, H / 2, 0, Math.PI / 2); wall(D, H, X1, H / 2, 0, -Math.PI / 2); wall(W, H, 0, H / 2, Z1, Math.PI);
  // le mur du fond (z = Z0) avec la baie vitrée de x = 0,1 à 1,95, y = 0,25 à 2,35
  const wx0 = -1.45, wx1 = 0.95, wy0 = 0.8, wy1 = 2.4;
  wall(wx0 - X0, H, (X0 + wx0) / 2, H / 2, Z0, 0); wall(X1 - wx1, H, (X1 + wx1) / 2, H / 2, Z0, 0);
  wall(wx1 - wx0, wy0, (wx0 + wx1) / 2, wy0 / 2, Z0, 0); wall(wx1 - wx0, H - wy1, (wx0 + wx1) / 2, (H + wy1) / 2, Z0, 0);
  const frameM = M('#f2efe8');
  for (const x of [wx0, (wx0 + wx1) / 2, wx1]) box(0.06, wy1 - wy0, 0.1, frameM, scene, x, (wy0 + wy1) / 2, Z0);
  for (const y of [wy0, wy1, 1.05]) box(wx1 - wx0, 0.06, 0.1, frameM, scene, (wx0 + wx1) / 2, y, Z0);
  for (let i = 0; i < 22; i++) box(0.02, 0.5, 0.02, M('#2a2a2c'), scene, wx0 + 0.05 + i * (wx1 - wx0 - 0.1) / 21, 1.05, Z0 - 0.45);   // le garde-corps du balcon
  box(wx1 - wx0, 0.04, 0.04, M('#2a2a2c'), scene, (wx0 + wx1) / 2, 1.3, Z0 - 0.45);
  // plinthes
  for (const [w, x, z, ry] of [[D, X0 + 0.01, 0, Math.PI / 2], [D, X1 - 0.01, 0, -Math.PI / 2], [W, 0, Z1 - 0.01, Math.PI]]) { const p = box(w, 0.08, 0.015, M('#f4f1ea'), scene, x, 0.04, z); p.rotation.y = ry; }

  // --- la vue : Lyon, la colline de Fourvière et la basilique. 3 toiles : le jour, la nuit (sans lumières), les lumières (8 quartiers)
  const VW = 2048, VH = 1024, NQ = 12, VIEW_X = num('vx', -0.6);
  const skyline = (g, night, r) => {
    const sky = g.createLinearGradient(0, 0, 0, VH * 0.7);
    if (night) { sky.addColorStop(0, '#04060d'); sky.addColorStop(1, '#141a2a'); } else { sky.addColorStop(0, '#7ea3cc'); sky.addColorStop(1, '#d6d8d4'); }
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    // la colline
    g.fillStyle = night ? '#07090c' : '#4f6243'; g.beginPath(); g.moveTo(0, VH * 0.62);
    for (let x = 0; x <= VW; x += 8) g.lineTo(x, VH * 0.56 - Math.sin(x / VW * Math.PI) * VH * 0.16 + Math.sin(x * 0.013) * 6);
    g.lineTo(VW, VH); g.lineTo(0, VH); g.fill();
    if (!night) for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${30 + r() * 30},${50 + r() * 40},${25 + r() * 20},.6)`; const x = r() * VW; g.beginPath(); g.arc(x, VH * 0.5 - Math.sin(x / VW * Math.PI) * VH * 0.1 + r() * VH * 0.15, 4 + r() * 8, 0, 7); g.fill(); }
    // la basilique de Fourvière : la nef et ses 4 tours, et la tour métallique à droite
    const bx = VW * 0.38, by = VH * 0.34; g.fillStyle = night ? '#16171a' : '#e9e3d4';
    g.fillRect(bx, by, 230, 70); for (const dx of [0, 200]) { g.fillRect(bx + dx - 8, by - 50, 46, 120); g.fillRect(bx + dx, by - 72, 30, 24); }
    g.fillRect(bx + 95, by - 34, 40, 34); g.beginPath(); g.moveTo(bx + 90, by - 34); g.lineTo(bx + 115, by - 60); g.lineTo(bx + 140, by - 34); g.fill();
    g.fillStyle = night ? '#121316' : '#8c8c92'; g.fillRect(VW * 0.64, VH * 0.12, 10, VH * 0.24); g.fillRect(VW * 0.64 - 14, VH * 0.25, 38, 8); g.fillRect(VW * 0.64 - 8, VH * 0.18, 26, 6);
    // les immeubles des quais de Saône
    const B = [];
    for (let x = -10; x < VW; x += 34 + (r() * 30 | 0)) { const h = 80 + r() * 150, w = 40 + (r() * 30 | 0); B.push([x, h, w]);
      g.fillStyle = night ? ['#0d0e12', '#111217', '#0b0c0f'][(r() * 3) | 0] : ['#cdb894', '#dcc8a6', '#bba582', '#e4d3b3', '#c99a72'][(r() * 5) | 0]; g.fillRect(x, VH * 0.86 - h, w, h);
      g.fillStyle = night ? '#08090b' : '#8a5a45'; g.fillRect(x - 2, VH * 0.86 - h - 6, w + 4, 8);
      if (!night) for (let wy = VH * 0.86 - h + 12; wy < VH * 0.86 - 14; wy += 22) for (let wx = x + 6; wx < x + w - 8; wx += 12) { g.fillStyle = 'rgba(50,60,70,.55)'; g.fillRect(wx, wy, 6, 12); } }
    g.fillStyle = night ? '#05070a' : '#6d8d9c'; g.fillRect(0, VH * 0.86, VW, VH * 0.14);   // la Saône
    return B;
  };
  const rB = rng(77), rN = rng(77), rL = rng(77);
  const dayTex = canvasTex(VW, VH, (g) => skyline(g, false, rB));
  let BLD = [];
  const nightTex = canvasTex(VW, VH, (g) => { BLD = skyline(g, true, rN); });
  // les lumières (fenêtres allumées, réverbères des quais, la basilique illuminée, les phares), sur fond noir (mélange additif)
  const lightsTex = canvasTex(VW, VH, (g) => {
    skyline(g, true, rL); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, VW, VH);
    const r = rng(9);
    for (const [x, h, w] of BLD) for (let wy = VH * 0.86 - h + 12; wy < VH * 0.86 - 14; wy += 22) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (r() < 0.45) { g.fillStyle = ['#ffcf7a', '#ffe2a8', '#ffd28f', '#a8c8ff'][(r() * 4) | 0]; g.fillRect(wx, wy, 6, 12); }
    // les lumières sur la colline
    for (let i = 0; i < 500; i++) { const x = r() * VW, y = VH * 0.52 - Math.sin(x / VW * Math.PI) * VH * 0.1 + r() * VH * 0.2; if (y > VH * 0.75) continue; g.fillStyle = `rgba(255,${200 + r() * 40},${120 + r() * 60},${0.4 + r() * 0.5})`; g.fillRect(x, y, 3, 3); }
    // la basilique illuminée (dorée)
    const bx = VW * 0.38, by = VH * 0.34; const gl = g.createRadialGradient(bx + 115, by, 10, bx + 115, by, 240); gl.addColorStop(0, 'rgba(255,210,140,.55)'); gl.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = gl; g.fillRect(bx - 200, by - 220, 640, 420);
    g.fillStyle = '#e7c48a'; g.fillRect(bx, by, 230, 70); for (const dx of [0, 200]) { g.fillRect(bx + dx - 8, by - 50, 46, 120); g.fillRect(bx + dx, by - 72, 30, 24); } g.fillRect(bx + 95, by - 34, 40, 34);
    g.fillStyle = '#ff3020'; g.fillRect(VW * 0.64 + 1, VH * 0.11, 8, 8);
    // les réverbères des quais et leurs reflets dans la Saône
    for (let x = 20; x < VW; x += 70) { g.fillStyle = '#ffb35a'; g.beginPath(); g.arc(x, VH * 0.855, 5, 0, 7); g.fill(); const rf = g.createLinearGradient(0, VH * 0.87, 0, VH); rf.addColorStop(0, 'rgba(255,170,80,.5)'); rf.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = rf; g.fillRect(x - 3, VH * 0.87, 6, VH * 0.13); }
  });
  const VIEW_Z = Z0 - 10, VIEW_W = 18, VIEW_H = 9, VIEW_Y = num('vy', 0.6);
  const mkView = (tex, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(VIEW_W, VIEW_H), new THREE.MeshBasicMaterial({ map: tex, fog: false, ...o })); m.position.set(VIEW_X, VIEW_Y, VIEW_Z); scene.add(m); return m; };
  const vNight = mkView(nightTex); const vDay = mkView(dayTex, { transparent: true, opacity: 0 }); vDay.position.z += 0.05;
  // les lumières : 8 bandes verticales (les quartiers), qui se rallument l'une après l'autre
  const QL = [];
  for (let i = 0; i < NQ; i++) {
    const tx = lightsTex.clone(); tx.repeat.set(1 / NQ, 1); tx.offset.set(i / NQ, 0); tx.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(VIEW_W / NQ, VIEW_H), new THREE.MeshBasicMaterial({ map: tx, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.set(VIEW_X - VIEW_W / 2 + (i + 0.5) * VIEW_W / NQ, VIEW_Y, VIEW_Z + 0.1); scene.add(m); QL.push(m);
  }
  const QORDER = [6, 4, 8, 5, 3, 9, 7, 2, 10, 1, 11, 0];   // l'ordre de rallumage (au hasard, morceau par morceau)

  // --- les meubles
  const fabric = new THREE.MeshStandardMaterial({ color: '#5b6b7d', roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: '#6e4d33', roughness: 0.8 });
  const SOFA_X = -0.25, SOFA_Z = Z0 + 0.62;
  box(1.9, 0.42, 0.85, fabric, scene, SOFA_X, 0.21, SOFA_Z);                    // l'assise
  box(1.9, 0.5, 0.2, fabric, scene, SOFA_X, 0.67, SOFA_Z - 0.36);              // le dossier
  for (const dx of [-0.88, 0.88]) box(0.16, 0.6, 0.85, fabric, scene, SOFA_X + dx, 0.3, SOFA_Z);
  for (const dx of [-0.45, 0.45]) { const c = box(0.8, 0.12, 0.7, new THREE.MeshStandardMaterial({ color: '#647689', roughness: 0.95 }), scene, SOFA_X + dx, 0.47, SOFA_Z + 0.04); }
  const pillow = box(0.42, 0.36, 0.12, M('#d9a441'), scene, SOFA_X - 0.62, 0.68, SOFA_Z - 0.2); pillow.rotation.z = 0.2;
  // la table basse, un mug, un livre
  box(1.0, 0.04, 0.55, wood, scene, SOFA_X + 0.1, 0.38, -0.3); for (const [dx, dz] of [[-0.45, -0.24], [0.45, -0.24], [-0.45, 0.24], [0.45, 0.24]]) box(0.04, 0.36, 0.04, wood, scene, SOFA_X + 0.1 + dx, 0.18, -0.3 + dz);
  cyl(0.045, 0.04, 0.1, 14, M('#e9e4da'), scene, SOFA_X + 0.35, 0.45, -0.25); box(0.22, 0.03, 0.16, M('#a33a2c'), scene, SOFA_X - 0.15, 0.415, -0.35);
  // le tapis
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshStandardMaterial({ color: '#8a3b30', roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(SOFA_X + 0.1, 0.005, -0.2); rug.receiveShadow = true; scene.add(rug);
  // le lampadaire (à gauche du canapé) : pied, abat-jour qui s'allume
  const LX = X0 + 0.32, LZ = Z0 + 0.45; cyl(0.15, 0.17, 0.03, 20, M('#222'), scene, LX, 0.015, LZ); cyl(0.015, 0.015, 1.5, 8, M('#222'), scene, LX, 0.77, LZ);
  const shadeM = new THREE.MeshStandardMaterial({ color: '#f3e6c8', emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 1, roughness: 0.9, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.3, 24, 1, true), shadeM); shade.position.set(LX, 1.6, LZ); scene.add(shade);
  // la télé, au mur d'en face (on la voit de dos, presque), sur un meuble bas
  box(1.6, 0.45, 0.4, wood, scene, -0.9, 0.225, Z1 - 0.25);
  box(1.25, 0.72, 0.05, M('#111'), scene, -0.9, 0.95, Z1 - 0.3);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.67), new THREE.MeshBasicMaterial({ color: '#0a0a0c', toneMapped: false })); tvScreen.position.set(-0.9, 0.95, Z1 - 0.33); tvScreen.rotation.y = Math.PI; scene.add(tvScreen);
  // le frigo (mur de gauche, coin cuisine) avec son petit écran de température
  const FRX = X0 + 0.34, FRZ = 0.55;
  box(0.66, 1.8, 0.66, M('#e6e6e3'), scene, FRX, 0.9, FRZ); box(0.02, 0.5, 0.03, M('#9a9a9a'), scene, FRX + 0.34, 1.2, FRZ - 0.25);
  const frLed = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), new THREE.MeshBasicMaterial({ color: '#5fd7ff', toneMapped: false })); frLed.position.set(FRX + 0.335, 1.5, FRZ); frLed.rotation.y = Math.PI / 2; scene.add(frLed);
  box(0.62, 0.9, 0.62, M('#c8beae'), scene, FRX, 0.45, FRZ + 0.66); box(0.64, 0.04, 0.64, M('#3a3a3c'), scene, FRX, 0.92, FRZ + 0.66);   // le plan de travail
  const box1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), new THREE.MeshBasicMaterial({ color: '#57ff6a', toneMapped: false })); box1.position.set(FRX + 0.31, 0.96, FRZ + 0.66 + 0.15); box1.rotation.y = Math.PI / 2; scene.add(box1);   // la box internet
  // le radiateur électrique sous la fenêtre, avec son voyant
  box(0.08, 0.5, 1.0, M('#efefec'), scene, X1 - 0.06, 0.5, -0.6);
  for (let i = 0; i < 10; i++) box(0.02, 0.44, 0.04, M('#dcdcd8'), scene, X1 - 0.11, 0.5, -1.05 + i * 0.1);
  const radLed = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.03), new THREE.MeshBasicMaterial({ color: '#ff8a2a', toneMapped: false })); radLed.position.set(X1 - 0.105, 0.7, -0.15); radLed.rotation.y = -Math.PI / 2; scene.add(radLed);
  // un plafonnier éteint, un cadre, une plante, la porte
  cyl(0.22, 0.22, 0.05, 24, M('#f4f1ea'), scene, 0, H - 0.03, 0);
  const art = canvasTex(256, 320, (g) => { const gr = g.createLinearGradient(0, 0, 256, 320); gr.addColorStop(0, '#2e4a6b'); gr.addColorStop(1, '#d9774a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 320); g.fillStyle = '#f5d68a'; g.beginPath(); g.arc(150, 120, 50, 0, 7); g.fill(); g.fillStyle = '#1b2533'; g.fillRect(0, 230, 256, 90); });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 })); pic.position.set(X0 + 0.01, 1.55, -0.6); pic.rotation.y = Math.PI / 2; scene.add(pic);
  cyl(0.16, 0.12, 0.32, 14, M('#b5643a'), scene, X1 - 0.35, 0.16, Z0 + 0.4);
  for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), M('#3f6b3a')); lf.scale.set(0.6, 1.4, 0.4); lf.position.set(X1 - 0.35 + Math.sin(i * 2.4) * 0.12, 0.55 + (i % 3) * 0.12, Z0 + 0.4 + Math.cos(i * 2.4) * 0.12); lf.rotation.z = Math.sin(i) * 0.6; scene.add(lf); }
  box(0.05, 2.1, 0.92, M('#cfc6b6'), scene, X0 + 0.03, 1.05, 1.55);
  scene.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) { o.castShadow = o !== floor && o !== ceil; o.receiveShadow = true; } });

  // --- les lumières
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const lamp = new THREE.PointLight('#ffc98a', 0, 9, 1.6); lamp.position.set(LX, 1.55, LZ + 0.02); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
  const fill = new THREE.PointLight('#ffe2bd', 0, 10, 1.4); fill.position.set(1.2, 2.4, 0.8); scene.add(fill);   // le spot du plafond
  const tvL = new THREE.PointLight('#8fb4ff', 0, 6, 1.5); tvL.position.set(-0.9, 1.0, Z1 - 0.6); scene.add(tvL);
  const phoneL = new THREE.SpotLight('#f4f7ff', 0, 7, 0.75, 0.6, 1.3); phoneL.castShadow = true; phoneL.shadow.mapSize.set(512, 512); scene.add(phoneL, phoneL.target);
  const sunL = new THREE.DirectionalLight('#dfe8ff', 0); sunL.position.set(4, 6, -12); sunL.target.position.set(-0.5, 0, 0); sunL.castShadow = true; sunL.shadow.mapSize.set(1024, 1024);
  Object.assign(sunL.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 }); scene.add(sunL, sunL.target);
  const cityL = new THREE.SpotLight('#9fb0d8', 0, 12, 0.9, 0.9, 1.0); cityL.position.set(-0.25, 2.0, Z0 - 2.5); cityL.target.position.set(-0.8, 0.4, 0.3); scene.add(cityL, cityL.target);
  const hemi = new THREE.HemisphereLight('#c7d3ff', '#5a4a3a', 0); scene.add(hemi);
  const ir = new THREE.PointLight('#ffffff', 0, 12, 1.2); scene.add(ir);   // l'éclairage infrarouge de la caméra (vision nocturne)
  const LIGHTS = [lamp, fill, tvL, phoneL, sunL, cityL, ir];

  // -------------------------------------------------------------------
  // CHLOÉ, son téléphone, sa couverture
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer);
  const C = PEOPLE.make({ outfit: 3, shadows: true }); scene.add(C.root);
  const SEAT = new THREE.Vector3(SOFA_X + 0.35, 0, SOFA_Z - 0.02);
  const DOOR = new THREE.Vector3(X0 + 0.55, 0, 1.55);
  const phone = new THREE.Group(); box(0.075, 0.15, 0.009, M('#15161a'), phone, 0, 0, 0);
  const phScr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshBasicMaterial({ color: '#9ec3ff', toneMapped: false })); phScr.position.z = 0.0055; phone.add(phScr);
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.006, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })); flash.position.set(0.02, 0.055, -0.006); flash.rotation.y = Math.PI; phone.add(flash);
  scene.add(phone);
  const blanketM = new THREE.MeshStandardMaterial({ color: '#b8543e', roughness: 1 });
  const blanket = new THREE.Group(); scene.add(blanket);
  {   // autour des épaules et du dos
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.5, 4, 2, 4), blanketM); b2.position.set(0, 0.52, 0.22); blanket.add(b2);                     // sur les genoux
    const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.3, 0.05), blanketM); b3.position.set(0, 0.39, 0.47); blanket.add(b3);                                // qui retombe
    blanket.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0, dx = 0) => () => C.point(n).add(new THREE.Vector3(dx, dy, 0));
  const FZ = makeFreeze([
    { at: FZ1, dur: 4.4, title: 'ARRÊT SUR IMAGE · 18 H 32', tags: [
      { at: pt('eyes'), title: 'YEUX', lines: ['dans le noir, il leur faut', '20 à 30 minutes', 'pour s’habituer'], risk: 'info', side: 'right', dy: -120 },
      { at: pt('heart'), title: 'CŒUR', lines: ['la surprise et le stress', 'le font battre plus vite'], risk: 'bof', side: 'right', dy: 120 } ] },
    { at: FZ2, dur: 5.2, title: 'ARRÊT SUR IMAGE · LA NUIT', tags: [
      { at: pt('heart'), title: 'CŒUR', lines: ['sous 18 °C chez soi,', 'la tension monte'], risk: 'mal', side: 'right', dy: -20 },
      { at: pt('lungs'), title: 'POUMONS', lines: ['un logement froid', 'favorise les problèmes', 'respiratoires'], risk: 'bof', side: 'left', dy: 40 },
      { at: pt('rHand'), title: 'MAINS', lines: ['ses vaisseaux se resserrent', 'pour garder la chaleur'], risk: 'bof', side: 'right', dy: 170 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // --- le rembobinage (calque 2D)
  const rwc = document.createElement('canvas'); rwc.width = 1080; rwc.height = 1920; rwc.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(rwc); const rg = rwc.getContext('2d');
  function drawRewind(k, t) {
    rg.clearRect(0, 0, 1080, 1920); rwc.style.visibility = k > 0 && k < 1 ? 'visible' : 'hidden'; if (k <= 0 || k >= 1) return;
    const a = Math.sin(Math.PI * k), r = rng(Math.floor(t * 30) + 3);
    for (let i = 0; i < 9; i++) { const y = r() * 1920, h = 6 + r() * 40; rg.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.18 * a})`; rg.fillRect(0, y, 1080, h); }
    rg.globalAlpha = Math.min(1, a * 1.6); rg.fillStyle = '#fff'; rg.font = '800 64px Inter'; rg.fillText('◀◀ RETOUR AU RÉEL', 62, 640); rg.globalAlpha = 1;
  }
  // --- la mention « VISION NOCTURNE · BATTERIE » (sous l'étiquette en haut à droite)
  const zc = document.createElement('canvas'); zc.width = 1080; zc.height = 1920; zc.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(zc); const zg = zc.getContext('2d'); let zShown = '';
  function drawMode(txt) {
    if (txt === zShown) return; zShown = txt; zg.clearRect(0, 0, 1080, 1920); if (!txt) return;
    zg.font = '600 19px Inter'; zg.textAlign = 'right'; zg.fillStyle = 'rgba(0,0,0,.45)'; zg.fillText(txt, 1020, 342); zg.fillStyle = '#fff'; zg.fillText(txt, 1018, 340);
  }

  // -------------------------------------------------------------------
  // LA CAMÉRA (fixe, dans le coin du plafond, au-dessus de la télé)
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(num('cx', 1.75), num('cy', 2.4), num('cz', 2.05)), LOOK = new THREE.Vector3(num('lx', -0.35), num('ly', 0.95), num('lz', -1.3));
  const VWp = 720, VHp = 1280, tmp = new THREE.Vector3();
  ir.position.copy(CAM).add(new THREE.Vector3(-0.2, -0.1, -0.2));

  const NIGHTP = Q.get('np') ? JSON.parse(Q.get('np')) : { LeftArm: [['x', -0.65], ['z', -0.3]], RightArm: [['x', -0.65], ['z', 0.3]], LeftForeArm: [['z', -1.85]], RightForeArm: [['z', 1.85]] };
  function pose(ts) {
    // où est Chloé et que fait-elle
    phone.visible = false; blanket.visible = false; C.inner.position.set(0, 0, 0);
    if (ts < ENTER0) { C.root.visible = false; return; }
    C.root.visible = true;
    if (ts < SIT0) {   // elle entre et traverse jusqu'au canapé
      const w = sm(ENTER0, SIT0 - 0.4, ts), A = DOOR, B = new THREE.Vector3(SEAT.x, 0, SEAT.z + 0.55);
      C.root.position.lerpVectors(A, B, w); C.root.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
      if (w < 1) C.walk(ts * 6.2, 0.9); else C.stand();
      return;
    }
    if (ts < SIT1) {   // elle se retourne et s'assoit
      const k = sm(SIT0, SIT1, ts); C.root.position.set(SEAT.x, 0, lerp(SEAT.z + 0.55, SEAT.z, k)); C.root.rotation.y = lerp(Math.PI - 0.6, 0, sm(SIT0, SIT0 + 0.5, ts)); C.sit(k); return;
    }
    C.root.position.copy(SEAT); C.root.rotation.y = 0.15;
    const night = ts >= NIGHT && ts < DAY + 0.2;
    const stand = sm(STANDUP, STANDUP + 1.2, ts) * (ts < RW0 ? 1 : 0);
    if (stand > 0) {   // le soir : elle se lève et va à la fenêtre
      const A = SEAT, B = new THREE.Vector3(0.55, 0, Z0 + 1.28); const w = sm(STANDUP + 0.8, STANDUP + 2.6, ts);
      if (w <= 0) { C.root.position.copy(A); C.sit(1 - stand); return; }
      C.root.position.lerpVectors(A, B, w); C.root.rotation.y = w < 1 ? Math.atan2(B.x - A.x, B.z - A.z) : lerp(Math.atan2(B.x - A.x, B.z - A.z), Math.PI + 0.25, sm(STANDUP + 3.2, STANDUP + 3.8, ts));
      if (w < 1) C.walk(ts * 6, 0.8); else C.do({ Head: [['x', -0.1]], LeftArm: [['z', 0.15]], RightArm: [['z', -0.15]] });
      return;
    }
    const breathe = 0.02 * Math.sin(ts * 1.6);
    if (ts >= PHONE && ts < 37.0) {   // la lampe du téléphone : bras droit levé devant elle
      const k = sm(PHONE - 0.6, PHONE, ts) * (1 - sm(36.4, 37.0, ts));
      C.do({ LeftUpLeg: [['x', -1.5]], RightUpLeg: [['x', -1.5]], LeftLeg: [['x', 1.5]], RightLeg: [['x', 1.5]], LeftForeArm: [['x', -0.6]], Spine: [['x', breathe]],
        RightArm: [['x', -0.9 * k], ['z', -0.15 * k]], RightForeArm: [['x', -0.6 - 0.8 * k]], Head: [['x', 0.12 * k + (ts > NET_OFF ? 0.25 * sm(NET_OFF, NET_OFF + 0.6, ts) : 0)]] });
      C.inner.position.set(0, -0.42, -0.12);
      phone.visible = true; const hp = C.point('rHand'); phone.position.copy(hp).add(new THREE.Vector3(0.0, 0.04, 0.05)); phone.rotation.set(-0.5 - 0.6 * (ts > NET_OFF ? 1 : 0), 0.15, 0);
      return;
    }
    if (night) {   // sous la couverture, recroquevillée
      C.do({ LeftUpLeg: [['x', -1.75]], RightUpLeg: [['x', -1.75]], LeftLeg: [['x', 2.1]], RightLeg: [['x', 2.1]], Spine: [['x', 0.18 + breathe]], Spine1: [['x', 0.1]], Head: [['x', 0.15], ['y', 0.2]],
        ...NIGHTP });
      C.inner.position.set(0, -0.42, -0.12);
      blanket.visible = true; blanket.position.copy(C.root.position); blanket.rotation.y = C.root.rotation.y;
      return;
    }
    const tvLook = ts < BO ? 0 : ts < BO + 1.5 ? sm(BO, BO + 0.8, ts) : 1;
    C.do({ LeftUpLeg: [['x', -1.5]], RightUpLeg: [['x', -1.5]], LeftLeg: [['x', 1.5]], RightLeg: [['x', 1.5]], LeftForeArm: [['x', -0.6]], RightForeArm: [['x', -0.6]], Spine: [['x', breathe - 0.05]],
      Head: [['y', 0.5 * Math.sin(ts * 0.8) * tvLook * (ts < 22 ? 1 : 0.4) + (ts >= DAY && ts < DUSK ? 0.4 : 0)], ['x', -0.05]] });
    C.inner.position.set(0, -0.42, -0.12);
  }

  function update(t) {
    const ts = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts >= RW0 && ts < RW1 ? (ts - RW0) / (RW1 - RW0) : 0;
    const real = ts >= RW0 + 0.7;
    pose(ts);
    // --- le courant : chez Chloé, et les quartiers de Lyon
    const powerHome = real || ts < BO || ts >= HOME_ON;
    const dayK = real ? 0 : sm(DAY - 0.3, DAY + 0.3, ts) * (1 - sm(DUSK, DUSK + 3.0, ts));   // 1 = plein jour (mercredi)
    const duskK = real ? 0 : sm(DUSK, DUSK + 3.0, ts) * (ts < RW0 ? 1 : 0);
    vDay.material.opacity = Math.max(dayK, 0.85 * duskK); vDay.material.color.set(dayK > 0.01 ? '#ffffff' : '#323b5c');
    const flick = ts >= BO && ts < BO + 0.35 ? (Math.sin(ts * 140) > 0 ? 1 : 0.2) : 1;
    for (let i = 0; i < NQ; i++) {
      const q = QORDER.indexOf(i), t0 = REST0 + 0.3 + q * (REST1 - REST0 - 0.6) / NQ;
      let on = real || ts < BO ? 1 : ts >= t0 ? sm(t0, t0 + 0.35, ts) * (0.7 + 0.3 * Math.min(1, Math.max(0, Math.sin((ts - t0) * 25) + 0.6))) : 0;
      if (ts >= BO && ts < BO + 0.35) on = flick * (1 - sm(BO, BO + 0.35, ts));
      QL[i].material.opacity = on * (1 - dayK);
      QL[i].visible = QL[i].material.opacity > 0.01;
    }
    // --- les lumières de la pièce
    const pOn = powerHome ? 1 : 0, fl = ts >= BO && ts < BO + 0.35 ? flick * (1 - sm(BO, BO + 0.35, ts)) : 1;
    const homeOnK = ts >= HOME_ON && ts < HOME_ON + 0.4 ? (Math.sin(ts * 90) > -0.3 ? 1 : 0.3) : 1;
    const lampOn = (ts < BO ? fl : 0) + (ts >= BO && ts < BO + 0.35 ? fl : 0) + (ts >= HOME_ON || real ? homeOnK : 0);
    const lk = Math.min(1, lampOn);
    lamp.intensity = 4.2 * lk; shadeM.emissiveIntensity = 1.4 * lk; fill.intensity = 2.2 * lk;
    const tvOn = (ts >= TV_ON && ts < BO) || (ts >= BO && ts < BO + 0.35 && fl > 0.5) || real;
    tvL.intensity = tvOn ? 1.6 + 0.6 * Math.sin(ts * 7) * Math.sin(ts * 2.3) : 0; tvScreen.material.color.set(tvOn ? '#7fa6e8' : '#0a0a0c');
    frLed.visible = powerHome || (ts >= BO && ts < BO + 0.35 && fl > 0.5); box1.visible = frLed.visible; radLed.visible = (powerHome && ts < BO) || real;
    // le téléphone : lampe allumée de PHONE à 36,4 ; écran
    const phOn = phone.visible && ts >= PHONE;
    phoneL.intensity = phOn ? 7 * sm(PHONE - 0.3, PHONE, ts) : 0;
    if (phOn) { phoneL.position.copy(phone.position).add(new THREE.Vector3(0, 0.05, 0.02)); phoneL.target.position.copy(phone.position).add(new THREE.Vector3(0.3, -0.6, 2.5)); }
    phScr.material.color.set(ts > NET_OFF ? '#ff6b5a' : '#9ec3ff');
    // le jour, le soir
    sunL.intensity = 2.4 * dayK; hemi.intensity = 0.9 * dayK + 0.25 * duskK + (real || powerHome ? 0.12 : 0);
    hemi.color.set(duskK > 0.3 ? '#8a90b8' : '#c7d3ff');
    cityL.intensity = (real || ts < BO ? 0.8 : 0) + 0.8 * duskK * sm(REST0, REST1, ts);
    scene.environmentIntensity = 0.12 + 0.2 * Math.max(dayK, lk * 0.6);
    // la vision nocturne : quand il fait noir et que les lampes sont éteintes
    const dark = !real && ts >= BO + 0.35 && ts < HOME_ON && dayK < 0.5 && duskK < 0.5;
    ir.intensity = dark ? 1.5 : 0;
    for (const l of LIGHTS) l.visible = l.intensity > 0;
    // --- la caméra (fixe) ; zoom numérique pendant les arrêts sur image
    camera.position.copy(CAM); camera.lookAt(LOOK); camera.fov = num('fov', 58);
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (A) {
      tmp.copy(C.point('chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * VWp, (-tmp.y * 0.5 + 0.5) * VHp, num('zf', 2.2), k);
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    HUD.frost(0); HUD.flash(0);
    let filt = dark ? 'grayscale(1) contrast(1.15) brightness(1.05)' : '';
    if (rwk) filt = `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)`;
    // --- textes
    HUD.hook(t, 'Et si toute la France tombait en <em>panne de courant</em> ?', T.hookOut);
    const cl = clockAt(ts), rate = rateAt(ts);
    const days = ['MARDI 17/11', 'MERCREDI 18/11'], d = Math.floor(cl / 1440);
    const hh = `${pad(Math.floor(cl / 60) % 24)}:${pad(Math.floor(cl) % 60)}:${pad(Math.floor(cl * 60) % 60)}`;
    if (real) HUD.live(t, 'RETOUR AU RÉEL', ts < 65.6 ? 'FRANCE · 19/12/1978' : ts < 69.6 ? 'ESPAGNE ET PORTUGAL · 28/04/2025' : 'FRANCE · EXERCICE PRÉVU EN 2027', 'LIVE');
    else HUD.live(t, 'LYON · SALON · CAM 01', `HYPOTHÈSE · ${days[Math.min(1, d)]} · ${hh}${rate > 120 ? ' · ACCÉLÉRÉ' : ''}`, 'SIMULATION');
    const elapsed = Math.max(0, cl - (18 * 60 + 32)), hm = (m) => `${Math.floor(m / 60)} h ${pad(Math.floor(m) % 60)}`;
    const temp = tempAt(ts);
    if (real) {
      HUD.block(1, { label: 'FRANCE · 19 DÉCEMBRE 1978', value: '8 h 27 → midi', sub: 'PRESQUE TOUT LE PAYS COUPÉ', color: '#ffcf6b' });
      HUD.block(2, { label: 'ESPAGNE ET PORTUGAL · 2025', value: 'plus de 18 h', sub: 'POUR TOUT RALLUMER', color: '#fff' }); HUD.show2(ts >= 65.6);
    } else if (ts < BO) {
      HUD.block(1, { label: 'COURANT', value: 'normal', sub: 'TOUTE LA FRANCE', color: '#4cd964' });
      HUD.block(2, { label: 'CHEZ CHLOÉ', value: `${fr(temp, 0)} °C`, sub: 'CHAUFFAGE ÉLECTRIQUE', color: '#fff' }); HUD.show2(ts > 7.0);
    } else {
      const done = ts >= HOME_ON;
      HUD.block(1, { label: done ? 'COURANT RÉTABLI APRÈS' : 'SANS COURANT DEPUIS', value: hm(done ? 24 * 60 + 8 : elapsed), sub: done ? 'CHEZ CHLOÉ' : ts >= NET_OFF ? 'NI COURANT NI RÉSEAU' : 'TOUTE LA FRANCE', color: done ? '#4cd964' : '#ff3b30' });
      const tc = temp < 16 ? '#64d2ff' : temp < 18 ? '#9fd8ff' : '#fff';
      HUD.block(2, { label: 'CHEZ CHLOÉ', value: `${fr(temp, 0)} °C`, sub: 'ESTIMATION · SANS CHAUFFAGE', color: tc }); HUD.show2(true);
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', C.point('head').add(new THREE.Vector3(0, 0.22, 0)), camera, 'CHLOÉ', (A || rwk || !C.root.visible) ? 0 : sm(3.4, 4.0, ts) * (1 - sm(8.5, 9.1, ts)), 100);
    HUD.reticle('phone', phone.position.clone(), camera, 'AUCUN RÉSEAU', (A || !phone.visible) ? 0 : sm(NET_OFF, NET_OFF + 0.4, ts) * (1 - sm(32.6, 33.0, ts)), 70);
    HUD.subs(t, SUBS_V);
    drawRewind(rwk, t);
    drawMode(A || rwk || real ? '' : dark ? 'VISION NOCTURNE · SUR BATTERIE' : '');
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : PUBLIC SÉNAT · RED ELÉCTRICA · ORANGE · CDC · OMS (2018) · SGDSN', q: 'Et toi, tu tiendrais<br>combien de temps sans courant ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'top') { camera.clearViewOffset(); camera.position.set(0, 9, 0.1); camera.lookAt(0, 0, 0); camera.fov = 60; camera.updateProjectionMatrix(); }
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); const p = C.root.position; camera.position.set(p.x + 1.2, 1.2, p.z + 2.0); camera.lookAt(p.x, 0.7, p.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), enter: FZ.realT(ENTER0), tv: FZ.realT(TV_ON), bo: FZ.realT(BO), phone: FZ.realT(PHONE), net: FZ.realT(NET_OFF),
    night: FZ.realT(NIGHT), day: FZ.realT(DAY), dusk: FZ.realT(DUSK), rest: [FZ.realT(REST0), FZ.realT(REST1)], home: FZ.realT(HOME_ON), stand: FZ.realT(STANDUP),
    rewind: [FZ.realT(RW0), FZ.realT(RW1)], end: FZ.realT(T.endCard) }) };
}

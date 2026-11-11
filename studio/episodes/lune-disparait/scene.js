// =====================================================================
//  ÉPISODE : « Et si la Lune disparaissait ? » — la passerelle du Mont-Saint-Michel, un soir de pleine Lune
//  Un seul personnage : Léna, 29 ans, rentre du Mont à pied par la passerelle. D'un coup, la Lune n'est plus là.
//  On suit : la nuit qui devient noire (ses yeux), 30 min plus tard (les étoiles), le lendemain (la grande marée qui
//  ne vient pas), une semaine plus tard (plus de nuits de pleine Lune : son sommeil), un mois plus tard (les animaux
//  de nuit), puis l'axe de la Terre sur des centaines de milliers d'années. Retour au réel : elle est toujours là,
//  et s'éloigne de 3,8 cm par an.
//  Caméra fixe : une caméra de surveillance sur la passerelle, tournée vers le Mont.
//  Deux arrêts sur image (dans le noir ; le sommeil). Pas d'effet multiplication.
//  Faits (sources dans la légende ; calculs refaits en Python) :
//   - distance moyenne Terre-Lune : 384 400 km (NASA).
//   - éclairement : pleine Lune par ciel clair ≈ 0,25 lux ; nuit sans Lune (étoiles + lueur du ciel) ≈ 0,002 lux
//     (ordres de grandeur ; Kyba et al., « How bright is moonlight? », 2017) → 0,25 / 0,002 ≈ 125 : « plus de 100 fois plus sombre ».
//   - la pupille s'ouvre jusqu'à 8 mm environ (Watson & Yellott, Journal of Vision, 2012) ; l'œil met 20 à 30 minutes
//     à s'habituer au noir, les bâtonnets ne voient pas les couleurs (Scientific American).
//   - marées : force de marée du Soleil / celle de la Lune = (M☉/M☾)·(d☾/d☉)³ = 27,1 millions × (384 400 / 149,6 M)³ ≈ 0,46
//     → la Lune fait ≈ 1 / 1,46 = 68 % (« environ deux tiers ») ; sans elle, des marées environ 3 fois plus faibles
//     (Matt Siegler, NASA JPL, dans Popular Science).
//   - Mont-Saint-Michel : jusqu'à 14 m entre marée basse et marée haute ; aux grandes marées, le Mont redevient une île.
//   - sommeil : autour de la pleine Lune, 5 min de plus pour s'endormir, 20 min de sommeil en moins, activité du sommeil
//     profond −30 % (Cajochen et al., Current Biology, 2013 ; une seule étude, en laboratoire, sans voir la Lune).
//   - animaux : selon la Lune, beaucoup d'espèces de nuit chassent ou se cachent plus ou moins (Prugh & Golden,
//     Journal of Animal Ecology, 2014, près de 60 études).
//   - l'axe de la Terre : sans la Lune, il pourrait varier fortement en quelques centaines de milliers d'années
//     (Matt Siegler, NASA JPL, dans Popular Science).
//   - la Lune s'éloigne de 3,8 cm par an, à peu près la vitesse à laquelle poussent les ongles (NASA, mesures laser
//     sur les réflecteurs d'Apollo ; Live Science).
//   - le 24 novembre 2026 est bien une nuit de pleine Lune.
//  HYPOTHÈSES (affichées comme telles) : la disparition, l'histoire de Léna, le Mont qui ne redevient plus une île.
// =====================================================================
import { THREE, createStage, makeSky, makeMoon, makeSun, M, box, cyl, HUD, sm, lerp, clamp, rng, dirAzEl, pad, fr, canvasTex, noise2 } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makeWater } from '../../lib.js';
import { makeInsets } from '../../lib-insets.js';
import { insetList } from './insets.js';

const Q = new URLSearchParams(location.search);
const num = (k, d) => Number(Q.get(k) ?? d);
// ---------------------------------------------------------------------
// la partition (temps de SCÈNE)
// ---------------------------------------------------------------------
const STOP = 10.6, TURN = 11.4, VANISH = 14.9, FZ1 = 19.0, ADAPT = 23.0, MORNING = 27.0, WEEK = 43.0, FZ2 = 47.0, MONTH = 51.2, AXIS = 55.4;
const RW0 = 59.6, RW1 = 61.0;
const sceneEnd = 73.0;
const T = { hookOut: 3.0, vanish: VANISH, rewind: RW0, real: RW1, endCard: 69.0, duration: sceneEnd };
const SUBS = [
  [3.2, 6.8, 'Mont-Saint-Michel, un soir de pleine Lune. Léna, 29 ans, rentre à pied par la passerelle.'],
  [7.0, 10.6, 'La pleine Lune éclaire assez pour marcher sans lampe. Et pour voir ton ombre.'],
  [10.8, 14.6, 'Elle est à 384 400 km. Et puis, d’un coup…'],
  [15.0, 18.8, '…elle n’est plus là. La nuit devient plus de 100 fois plus sombre.'],
  [19.2, 22.8, 'Plus de sable, plus de mer. Juste les petites lumières de la passerelle.'],
  [23.0, 26.8, '30 minutes plus tard, ses yeux se sont habitués. Jamais elle n’a vu autant d’étoiles.'],
  [27.2, 30.8, 'Le lendemain, c’est l’heure de la grande marée. Ici, la mer peut monter de 14 mètres.'],
  [31.0, 34.8, 'Mais la Lune faisait environ deux tiers des marées. Il ne reste que celles du Soleil.'],
  [35.0, 38.8, 'Selon un chercheur de la NASA, la mer monterait environ 3 fois moins.'],
  [39.0, 42.8, 'Alors le Mont ne redeviendrait sans doute plus jamais une île.'],
  [43.2, 46.8, 'Une semaine plus tard, plus de pleine Lune. Ni dans le ciel, ni dans ton sommeil.'],
  [47.2, 51.0, 'Selon une étude suisse, autour de la pleine Lune, on dort environ 20 minutes de moins.'],
  [51.4, 55.2, 'Un mois plus tard, les animaux de nuit sont perdus. Beaucoup vivaient au rythme de la Lune.'],
  [55.4, 59.4, 'Et en quelques centaines de milliers d’années, l’axe de la Terre pourrait basculer.'],
  [61.2, 64.8, 'En vrai, la Lune est toujours là, à 384 400 km en moyenne.'],
  [65.0, 68.8, 'Mais elle s’éloigne de nous de 3,8 cm par an. À peu près la vitesse où poussent tes ongles.'],
];
// l'heure de l'histoire (minutes depuis le mardi 24/11 à 0 h)
const DAY = 1440;
const CLOCK = [[0, 23 * 60 + 12], [ADAPT - 0.01, 23 * 60 + 12 + ADAPT / 60], [ADAPT, 23 * 60 + 42.5], [MORNING - 0.01, 23 * 60 + 42.6],
  [MORNING, DAY + 8 * 60 + 40], [WEEK - 0.01, DAY + 14 * 60 + 10], [WEEK, 8 * DAY + 23 * 60 + 35], [MONTH - 0.01, 8 * DAY + 23 * 60 + 35.2],
  [MONTH, 30 * DAY + 23 * 60 + 50], [RW0, 30 * DAY + 23 * 60 + 50.2]];
const clockAt = (ts) => { for (let i = 1; i < CLOCK.length; i++) if (ts < CLOCK[i][0]) { const [a, va] = CLOCK[i - 1], [b, vb] = CLOCK[i]; return va + (vb - va) * (ts - a) / (b - a); } return CLOCK[CLOCK.length - 1][1]; };
const DATES = ['MAR. 24/11', 'MER. 25/11', 'JEU. 26/11', '', '', '', '', '', 'MER. 02/12'];

export default async function () {
  const insets = makeInsets();
  const stage = createStage({ fov: 58, far: 4000, bloom: [0.3, 0.5, 0.85], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.15;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const RN = rng(1124);
  const N2 = noise2(9);

  // -------------------------------------------------------------------
  // LE CIEL, LA LUNE, LE SOLEIL DU MATIN
  // -------------------------------------------------------------------
  const MOON_DIR = dirAzEl(num('maz', 9), num('mel', 25));
  const SUN_DIR = dirAzEl(-62, 16);   // le matin, le Soleil est à l'est-sud-est (à gauche)
  const sky = makeSky(scene, { sunDir: SUN_DIR, stars: 0.5, milky: 0.9, nightZen: [0.004, 0.006, 0.016], nightHor: [0.016, 0.022, 0.04],
    dayZen: [0.04, 0.14, 0.40], dayHor: [0.52, 0.58, 0.64], milkyAxis: new THREE.Vector3(-0.35, 0.55, 0.75) });
  const moon = makeMoon(scene, MOON_DIR, 46);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(200,215,255,0.5)'); gr.addColorStop(0.3, 'rgba(160,180,230,0.16)'); gr.addColorStop(1, 'rgba(120,140,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }),
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  halo.scale.setScalar(260); scene.add(halo);
  const sunSp = makeSun(scene, SUN_DIR, 80);
  scene.fog = new THREE.Fog('#141a2a', 300, 2600);
  const FOG_NIGHT = new THREE.Color('#141a2a'), FOG_DARK = new THREE.Color('#05070c'), FOG_DAY = new THREE.Color('#b8c2c8');

  // -------------------------------------------------------------------
  // LA BAIE : le sable mouillé (avec ses chenaux), la mer qui monte
  // -------------------------------------------------------------------
  const SAND_Y = -3.0;
  const sandT = canvasTex(1024, 1024, (g) => { const r = rng(5); g.fillStyle = '#8f8778'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,66,58' : '170,162,146'},${0.05 + r() * 0.1})`; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 3, 1 + r() * 2); }
    // les rides de sable laissées par la mer
    g.strokeStyle = 'rgba(60,56,50,0.18)'; g.lineWidth = 2; for (let y = 0; y < 1024; y += 9) { g.beginPath(); for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + 3 * Math.sin(x * 0.05 + y)); g.stroke(); } });
  sandT.wrapS = sandT.wrapT = THREE.RepeatWrapping; sandT.repeat.set(60, 60);
  const sandG = new THREE.PlaneGeometry(3000, 3000, 120, 120); sandG.rotateX(-Math.PI / 2);
  { const p = sandG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i);
      const ch = Math.exp(-Math.pow((x - 90 - 60 * Math.sin(z * 0.004)) / 30, 2)) + 0.8 * Math.exp(-Math.pow((x + 160 + 40 * Math.sin(z * 0.006 + 1)) / 24, 2));
      p.setY(i, SAND_Y + 0.5 * (N2(x * 0.004, z * 0.004) - 0.5) - 0.9 * ch); } sandG.computeVertexNormals(); }
  const sand = new THREE.Mesh(sandG, new THREE.MeshLambertMaterial({ map: sandT, color: '#efe6d4' }));
  sand.position.z = -900; sand.receiveShadow = false; sand.material.envMapIntensity = 0; scene.add(sand);
  const sea = makeWater(scene, { w: 3000, d: 3000, z: -900, seg: 90, color: '#3d5a63', foam: '#d6dcd8', opacity: 0.94 });
  sea.U.uChop.value = 0.08; sea.mat.envMapIntensity = 0; sea.mat.roughness = 0.6;
  // la « grande marée d'avant » : un niveau fantôme (où la mer montait avec la Lune)
  const ghost = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshBasicMaterial({ color: '#7fd4ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  ghost.rotation.x = -Math.PI / 2; ghost.position.set(0, -0.55, -900); scene.add(ghost);
  const ghostEdge = canvasTex(64, 64, (g) => { g.strokeStyle = 'rgba(160,225,255,0.9)'; g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeRect(2, 2, 60, 60); });

  // -------------------------------------------------------------------
  // LE MONT-SAINT-MICHEL : le rocher, les remparts, le village, l'abbaye, la flèche et l'archange doré
  // -------------------------------------------------------------------
  const MONT = new THREE.Group(); MONT.position.set(0, SAND_Y, -460); scene.add(MONT);
  const granite = canvasTex(256, 256, (g) => { const r = rng(11); g.fillStyle = '#8a8274'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 10) for (let x = (y / 10) % 2 * 9; x < 256; x += 18) { g.fillStyle = `rgba(${r() < 0.5 ? '60,56,50' : '160,150,136'},${0.15 + r() * 0.2})`; g.fillRect(x, y, 17, 9); } });
  granite.wrapS = granite.wrapT = THREE.RepeatWrapping; granite.repeat.set(4, 4);
  const stoneM = new THREE.MeshStandardMaterial({ map: granite, color: '#c9c0ae', roughness: 0.9, emissive: new THREE.Color('#ffb066'), emissiveIntensity: 0 });
  const rockM = new THREE.MeshStandardMaterial({ color: '#6c665c', roughness: 1, flatShading: true, emissive: new THREE.Color('#ff9f55'), emissiveIntensity: 0 });
  const roofM = new THREE.MeshStandardMaterial({ color: '#4a4d55', roughness: 0.8, emissive: new THREE.Color('#ffb066'), emissiveIntensity: 0 });
  const winM = new THREE.MeshBasicMaterial({ color: '#ffcf7a' });
  const STONE = [stoneM, rockM, roofM];
  // le rocher : un cône bosselé (≈ 80 m de haut, ≈ 130 m de rayon à la base)
  { const g = new THREE.CylinderGeometry(14, 128, 82, 48, 18, false); g.translate(0, 41, 0);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const k = 1 + 0.16 * (N2(a * 2 + 3, y * 0.05) - 0.5) + 0.08 * Math.sin(a * 5); p.setXYZ(i, x * k, y * (1 + 0.05 * (N2(a * 3, 1) - 0.5)), z * k * 0.82); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, rockM); m.castShadow = m.receiveShadow = true; MONT.add(m); }
  // les remparts (côté passerelle) : un mur courbe avec des tours rondes
  for (let i = 0; i <= 16; i++) { const a = Math.PI / 2 - 1.1 + i * 2.2 / 16, r = 132, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.86;
    const w = box(17, 13, 3, stoneM, MONT, x, 6.5, z); w.rotation.y = -a + Math.PI / 2;
    for (let c = -3; c <= 3; c++) box(1.4, 1.4, 3.2, stoneM, w, c * 2.4, 7.2, 0);
    if (i % 4 === 0) { const tw = cyl(5, 5.5, 18, 14, stoneM, MONT, x * 1.02, 9, z * 1.02); tw.castShadow = true; } }
  // la Porte de l'Avancée (l'entrée), face à la passerelle
  box(9, 11, 6, stoneM, MONT, 0, 5.5, 116);
  // le village : des maisons qui grimpent sur le rocher (toits d'ardoise), avec des fenêtres allumées le soir
  const WINS = [];
  for (let i = 0; i < 70; i++) {
    const a = Math.PI / 2 + (RN() - 0.5) * 2.0, y = 12 + RN() * 34, rr = 128 - y * 1.25 - 4, x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.82;
    const hw = 5 + RN() * 5, hh = 6 + RN() * 6, H0 = new THREE.Group(); H0.position.set(x, y, z); H0.rotation.y = -a + Math.PI / 2; MONT.add(H0);
    box(hw, hh, 7, stoneM, H0, 0, hh / 2, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(hw * 0.75, 4 + RN() * 2, 4), roofM); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.7; roof.position.y = hh + 2; H0.add(roof);
    for (let k = 0; k < 2; k++) if (RN() < 0.7) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), winM); w.position.set((k - 0.5) * hw * 0.5, hh * 0.6, 3.55); H0.add(w); WINS.push(w); }
  }
  // l'abbaye : les grands bâtiments de granit au sommet, l'église, le clocher, la flèche, l'archange
  const AB = new THREE.Group(); AB.position.set(0, 66, -4); MONT.add(AB);
  box(36, 30, 26, stoneM, AB, -20, 15, 14); box(30, 36, 22, stoneM, AB, 22, 18, 10); box(24, 22, 30, stoneM, AB, 4, 11, 30);
  for (let i = 0; i < 9; i++) box(1.6, 26, 2, stoneM, AB, -36 + i * 4.2, 13, 27.5);   // les contreforts
  box(16, 20, 64, stoneM, AB, 0, 40, 0);   // la nef de l'église
  { const g = new THREE.CylinderGeometry(9.5, 9.5, 64, 3); g.rotateX(-Math.PI / 2); const rf = new THREE.Mesh(g, roofM); rf.scale.set(0.95, 0.75, 1); rf.position.set(0, 52.5, 0); AB.add(rf); }
  box(12, 18, 12, stoneM, AB, 0, 59, 2);   // le clocher
  { const sp = new THREE.Mesh(new THREE.ConeGeometry(5.6, 28, 8), roofM); sp.position.set(0, 82, 2); AB.add(sp); }
  const goldM = new THREE.MeshStandardMaterial({ color: '#e8b54a', metalness: 0.9, roughness: 0.3, emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 0.3 });
  const angel = new THREE.Group(); angel.position.set(0, 96.5, 2); AB.add(angel);
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 3.4, 8), goldM); angel.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), goldM); h.position.y = 2.1; angel.add(h);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), goldM); sw.position.set(0.7, 3.3, 0); sw.rotation.z = -0.2; angel.add(sw);
    for (const s of [-1, 1]) { const wg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.15), goldM); wg.position.set(s * 0.8, 1.2, -0.3); wg.rotation.z = s * 0.6; angel.add(wg); } }
  for (let i = 0; i < 26; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), winM); w.position.set(-34 + RN() * 66, 8 + RN() * 22, 27.6 + (RN() < 0.5 ? 0 : 15.6)); AB.add(w); WINS.push(w); }
  MONT.traverse((o) => { if (o.isMesh) { o.castShadow = o.material !== winM; o.receiveShadow = true; } });

  // -------------------------------------------------------------------
  // LA PASSERELLE : un tablier en bois sur pilotis, des garde-corps, de petites lumières le long des rambardes
  // -------------------------------------------------------------------
  const PASS = new THREE.Group(); scene.add(PASS);
  const plankT = canvasTex(256, 1024, (g) => { const r = rng(21); g.fillStyle = '#7a6a56'; g.fillRect(0, 0, 256, 1024);
    for (let y = 0; y < 1024; y += 16) { g.fillStyle = `rgba(${r() < 0.5 ? '50,42,34' : '150,134,112'},${0.15 + r() * 0.2})`; g.fillRect(0, y, 256, 14); g.fillStyle = 'rgba(30,26,22,0.6)'; g.fillRect(0, y + 14, 256, 2); } });
  plankT.wrapS = plankT.wrapT = THREE.RepeatWrapping; plankT.repeat.set(1, 60);
  const L = 345, Z0 = 6, ZM = Z0 - L;   // la passerelle va de la caméra jusqu'au pied du Mont
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, L), new THREE.MeshStandardMaterial({ map: plankT, roughness: 0.85 }));
  deck.position.set(0, -0.15, Z0 - L / 2); deck.receiveShadow = true; PASS.add(deck);
  const steelM = M('#5c6064', { r: 0.5, m: 0.6 });
  { const g = new THREE.CylinderGeometry(0.22, 0.22, 3.0, 8); const n = Math.floor(L / 12) * 2, pil = new THREE.InstancedMesh(g, steelM, n); const mx = new THREE.Matrix4(); let k = 0;
    for (let z = Z0 - 6; z > ZM && k < n; z -= 12) for (const x of [-2.8, 2.8]) { mx.makeTranslation(x, -1.6, z); pil.setMatrixAt(k++, mx); } pil.count = k; PASS.add(pil); }
  // les garde-corps : poteaux fins, une main courante en bois, une bande de lumière douce en bas
  const ledM = new THREE.MeshBasicMaterial({ color: '#ffd9a0' });
  for (const x of [-3.4, 3.4]) {
    const n = Math.floor(L / 2), g = new THREE.BoxGeometry(0.05, 1.05, 0.05), po = new THREE.InstancedMesh(g, steelM, n), mx = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { mx.makeTranslation(x, 0.52, Z0 - i * 2); po.setMatrixAt(i, mx); } PASS.add(po);
    box(0.14, 0.07, L, M('#8a6a48', { r: 0.6 }), PASS, x, 1.06, Z0 - L / 2);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, L), ledM); led.position.set(x * 0.97, 0.12, Z0 - L / 2); PASS.add(led);
  }
  // le banc (une semaine plus tard, Léna s'y assoit)
  const BENCH = new THREE.Group(); BENCH.position.set(-0.2, 0, -7.6); scene.add(BENCH);
  box(1.8, 0.07, 0.45, M('#8a6a48', { r: 0.7 }), BENCH, 0, 0.45, 0); box(1.8, 0.4, 0.06, M('#8a6a48', { r: 0.7 }), BENCH, 0, 0.72, -0.22);
  for (const x of [-0.8, 0.8]) box(0.06, 0.45, 0.42, steelM, BENCH, x, 0.22, 0);
  BENCH.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // un poteau-repère de marée dans le sable (graduations), à droite de la passerelle
  const gaugeT = canvasTex(64, 512, (g) => { g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 64, 512); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#d23a2a' : '#f2f2ee'; g.fillRect(0, i * 32, 64, 32); } });
  const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5, 0.35), new THREE.MeshStandardMaterial({ map: gaugeT, roughness: 0.6 })); gauge.position.set(10.5, SAND_Y + 2.5, -34); gauge.castShadow = true; scene.add(gauge);

  // -------------------------------------------------------------------
  // LÉNA
  // -------------------------------------------------------------------
  const PEOPLE = await loadPeople(renderer);
  const C = PEOPLE.make({ outfit: 3, shadows: true }); scene.add(C.root);

  // --- les lumières
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const moonL = new THREE.DirectionalLight('#b8c8ff', 1.4); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048);
  Object.assign(moonL.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 160 }); moonL.shadow.bias = -0.0008;
  scene.add(moonL, moonL.target); moonL.target.position.set(0, 0, -8); moonL.position.copy(MOON_DIR).multiplyScalar(80).add(moonL.target.position);
  const sunL = new THREE.DirectionalLight('#ffe8c8', 2.6); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
  Object.assign(sunL.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 160 }); sunL.shadow.bias = -0.0008;
  scene.add(sunL, sunL.target); sunL.target.position.set(0, 0, -8); sunL.position.copy(SUN_DIR).multiplyScalar(80).add(sunL.target.position);
  const hemi = new THREE.HemisphereLight('#6d7fb0', '#2a2622', 0.5); scene.add(hemi);
  const railL = []; for (const [x, z] of [[-2.9, -3.5], [2.9, -6.5], [-2.9, -10.5], [2.9, -15]]) { const l = new THREE.PointLight('#ffd6a0', 0, 9, 1.2); l.position.set(x, 0.35, z); scene.add(l); railL.push(l); }
  const LIGHTS = [moonL, sunL, ...railL];

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0, dx = 0) => () => C.point(n).add(new THREE.Vector3(dx, dy, 0));
  const FZ = makeFreeze([
    { at: FZ1, dur: 4.8, title: 'ARRÊT SUR IMAGE · DANS LE NOIR', tags: [
      { at: pt('eyes'), title: 'PUPILLES', lines: ['elles s’ouvrent à fond,', 'jusqu’à 8 mm'], risk: 'info', side: 'right', dy: -60 },
      { at: pt('head', 0.06), title: 'YEUX', lines: ['20 à 30 minutes', 'pour voir dans le noir'], risk: 'bof', side: 'left', dy: 60 },
      { at: pt('rFoot'), title: 'PIEDS', lines: ['tu ne vois plus', 'où tu marches'], risk: 'mal', side: 'right', dy: 80 } ] },
    { at: FZ2, dur: 5.0, title: 'ARRÊT SUR IMAGE · LE SOMMEIL', tags: [
      { at: pt('head', 0.05), title: 'SOMMEIL', lines: ['autour de la pleine Lune,', '20 min de moins par nuit'], risk: 'ok', side: 'right', dy: -10 },
      { at: pt('eyes'), title: 'ENDORMISSEMENT', lines: ['il fallait 5 min de plus', 'pour s’endormir'], risk: 'ok', side: 'left', dy: 40 },
      { at: pt('chest'), title: 'SOMMEIL PROFOND', lines: ['environ 30 % plus faible', 'ces nuits-là'], risk: 'ok', side: 'right', dy: 150 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);
  const INSETS = insetList(FZ.realT);

  // --- le rembobinage (calque 2D)
  const rwc = document.createElement('canvas'); rwc.width = 1080; rwc.height = 1920; rwc.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(rwc); const rg = rwc.getContext('2d');
  function drawRewind(k, t) {
    rg.clearRect(0, 0, 1080, 1920); rwc.style.visibility = k > 0 && k < 1 ? 'visible' : 'hidden'; if (k <= 0 || k >= 1) return;
    const a = Math.sin(Math.PI * k), r = rng(Math.floor(t * 30) + 3);
    for (let i = 0; i < 9; i++) { const y = r() * 1920, h = 6 + r() * 40; rg.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.18 * a})`; rg.fillRect(0, y, 1080, h); }
    rg.globalAlpha = Math.min(1, a * 1.6); rg.fillStyle = '#fff'; rg.font = '800 64px Inter'; rg.fillText('◀◀ RETOUR AU RÉEL', 62, 640); rg.globalAlpha = 1;
  }

  // -------------------------------------------------------------------
  // LA CAMÉRA (fixe, sur un mât de la passerelle, tournée vers le Mont)
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(num('cx', 1.6), num('cy', 3.1), num('cz', 3.2)), LOOKP = new THREE.Vector3(num('lx', -0.6), num('ly', 15), num('lz', -120));
  const VWp = 720, VHp = 1280, tmp = new THREE.Vector3();
  const P_STOP = new THREE.Vector3(0.3, 0, -4.6);
  const walkIn = (ts) => { const z = P_STOP.z - 1.35 * Math.max(0, STOP - ts); return z; };   // elle marche vers la caméra (1,35 m/s), s'arrête à STOP

  function lena(ts, phase) {
    C.inner.position.set(0, 0, 0); C.root.visible = true; C.root.scale.setScalar(1);
    if (phase === 'night1') {
      if (ts < STOP) { C.root.position.set(P_STOP.x + 0.15 * Math.sin(ts * 0.3), 0, walkIn(ts)); C.root.rotation.y = 0; C.walk(ts * 5.4); return; }
      // elle s'arrête, se retourne vers le Mont (trois quarts), lève la tête vers la Lune
      const k = sm(TURN - 0.6, TURN + 0.8, ts), up = sm(TURN + 0.6, TURN + 1.6, ts) * (1 - 0.6 * sm(VANISH + 1.4, VANISH + 3, ts)), look = sm(VANISH + 0.2, VANISH + 1.4, ts);
      C.root.position.copy(P_STOP); C.root.rotation.y = lerp(0, 2.55, k);
      const ad = sm(ADAPT, ADAPT + 1.5, ts);   // 30 minutes plus tard : elle regarde les étoiles, la tête bien levée
      C.do({ Head: [['x', -0.32 * up - 0.12 * look * (1 - ad) - 0.42 * ad], ['y', 0.25 * look * Math.sin(ts * 0.9) * (1 - ad) + 0.15 * ad * Math.sin(ts * 0.3)]], Neck: [['x', -0.15 * up - 0.2 * ad]],
        LeftArm: [['x', -0.15 * look], ['z', 0.18]], RightArm: [['x', -0.2 * look], ['z', -0.18]], LeftForeArm: [['x', -0.5 * look]], RightForeArm: [['x', -0.6 * look]], Spine1: [['x', -0.06 * ad]] });
      return;
    }
    if (phase === 'morning') {   // accoudée à la rambarde de droite, elle regarde la baie
      C.root.position.set(2.75, 0, -9.0); C.root.rotation.y = Math.PI / 2 + 0.25 + 0.1 * Math.sin(ts * 0.2);
      C.do({ Spine: [['x', 0.18]], Spine1: [['x', 0.1]], LeftArm: [['x', -1.1], ['z', 0.35]], RightArm: [['x', -1.1], ['z', -0.35]], LeftForeArm: [['x', -1.2]], RightForeArm: [['x', -1.2]], Head: [['x', 0.1], ['y', -0.3 + 0.25 * Math.sin(ts * 0.25)]] });
      return;
    }
    if (phase === 'week') {   // assise sur le banc, face à la caméra
      C.root.position.set(BENCH.position.x + 0.2, 0, BENCH.position.z + 0.08); C.root.rotation.y = 0.12;
      C.sit(1); return;
    }
    if (phase === 'real') {   // aujourd'hui : elle marche vers la caméra sous la pleine Lune
      const z = -40 + 1.35 * (ts - RW1); C.root.position.set(0.4, 0, z); C.root.rotation.y = 0; C.walk(ts * 5.4); C.root.visible = z < 1.0; return;
    }
    C.root.visible = false;
  }

  function update(t) {
    const ts = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts >= RW0 && ts < RW1 ? (ts - RW0) / (RW1 - RW0) : 0;
    const real = ts >= RW0 + 0.7;
    const phase = real ? 'real' : ts < MORNING ? 'night1' : ts < WEEK ? 'morning' : ts < MONTH ? 'week' : 'month';
    const day = phase === 'morning';
    lena(ts, phase);
    BENCH.visible = phase === 'week' || phase === 'month';

    // --- la Lune : là au début et au retour au réel ; elle s'éteint en scintillant à VANISH
    const flick = ts < VANISH ? 1 : ts < VANISH + 0.7 ? (Math.sin((ts - VANISH) * 70) > 0 ? 1 - (ts - VANISH) / 0.7 : 0.2 * (1 - (ts - VANISH) / 0.7)) : 0;
    const moonK = real ? 1 : phase === 'night1' ? flick : 0;
    moon.visible = halo.visible = moonK > 0.01; moon.material.opacity = moonK; halo.material.opacity = moonK;
    moon.follow(camera, 900); halo.position.copy(MOON_DIR).multiplyScalar(910).add(camera.position);
    sunSp.visible = day; sunSp.follow(camera);
    // --- la nuit (avec ou sans Lune), le jour
    const dark = !day && moonK < 0.5;
    const adapt = phase === 'night1' ? sm(ADAPT, ADAPT + 2.2, ts) : phase === 'week' || phase === 'month' ? 1 : 0;   // les yeux habitués : on voit les étoiles
    sky.u.uDay.value = day ? 1 : 0;
    sky.u.uStars.value = day ? 0 : moonK > 0.5 ? 0.45 : 0.75 + 0.75 * adapt;
    sky.u.uMilky.value = day ? 0 : moonK > 0.5 ? 0.25 : 0.5 + 0.9 * adapt;
    sky.u.uNightZen.value.setRGB(...(moonK > 0.5 ? [0.006, 0.009, 0.024] : [0.0012, 0.0016, 0.004]));
    sky.u.uNightHor.value.setRGB(...(moonK > 0.5 ? [0.02, 0.028, 0.05] : [0.006, 0.008, 0.014]));
    sky.follow(camera);
    moonL.intensity = moonK * 1.5; sunL.intensity = day ? 2.6 : 0;
    hemi.intensity = day ? 1.2 : moonK > 0.5 ? 0.55 : 0.16 + 0.14 * adapt; hemi.color.set(day ? '#cfdcec' : '#6d7fb0');
    scene.environmentIntensity = day ? 0.25 : moonK > 0.5 ? 0.08 : 0.03;
    const railOn = day ? 0 : 1; for (const l of railL) l.intensity = railOn * (dark ? 5.5 : 1.6); ledM.color.set(day ? '#8a7e6e' : '#ffd9a0');
    scene.fog.color.copy(day ? FOG_DAY : dark ? FOG_DARK : FOG_NIGHT); scene.fog.near = day ? 400 : 250; scene.fog.far = day ? 3200 : dark ? 1400 : 2600;
    renderer.toneMappingExposure = day ? 1.0 : 1.15 + 0.35 * adapt;
    // --- le Mont : illuminé la nuit (projecteurs dorés), fenêtres allumées ; de jour, la pierre au soleil
    for (const m of STONE) m.emissiveIntensity = day ? 0 : m === rockM ? 0.03 : 0.09;
    winM.color.set(day ? '#3a3e46' : '#ffcf7a'); goldM.emissiveIntensity = day ? 0.1 : 0.9;
    // --- la mer : la nuit du 24, marée basse (les chenaux brillent) ; le matin, elle monte… mais pas jusqu'au niveau d'avant
    const tideK = day ? sm(MORNING + 1.0, 40.5, ts) : 0;
    sea.U.uLevel.value = lerp(-4.2, -3.25, tideK) + (real ? 0.3 : 0); sea.U.uTime.value = ts;
    sea.mat.color.set(day ? '#4d6c74' : '#2a3a44');
    sand.material.emissive.set('#3c4560'); sand.material.emissiveIntensity = day ? 0 : 0.12 + 0.45 * moonK + 0.1 * adapt;
    const gk = day ? sm(33.0, 34.2, ts) * (1 - sm(42.4, 42.9, ts)) : 0; ghost.material.opacity = 0.16 * gk; ghost.visible = gk > 0.01;
    for (const l of LIGHTS) l.visible = l.intensity > 0;
    if (Q.get('hidek')) for (const i of Q.get('hidek').split(',')) PASS.children[+i].visible = false;
    if (Q.get('hide')) for (const n of Q.get('hide').split(',')) ({ sand, sea: sea.mesh, ghost, mont: MONT, pass: PASS })[n].visible = false;

    // --- la caméra (fixe) ; zoom numérique pendant les arrêts sur image
    camera.position.copy(CAM); camera.lookAt(LOOKP); camera.fov = num('fov', 58);
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (A) {
      tmp.copy(C.point('chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * VWp, (-tmp.y * 0.5 + 0.5) * VHp, A.f.at === FZ1 ? num('zf1', 2.4) : num('zf2', 2.4), k);
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    HUD.frost(0); HUD.flash(phase === 'night1' && ts >= VANISH && ts < VANISH + 0.7 ? 0.12 * flick : 0);
    let filt = '';
    if (rwk) filt = `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)`;
    else if (dark && !day) filt = `saturate(${(0.55 - 0.25 * adapt).toFixed(2)})`;   // dans le noir, les couleurs s'en vont

    // --- textes
    HUD.hook(t, 'Et si la <em>Lune</em> disparaissait ?', T.hookOut);
    const cl = clockAt(ts), dd = Math.floor(cl / DAY);
    const hh = `${pad(Math.floor(cl / 60) % 24)}:${pad(Math.floor(cl) % 60)}:${pad(Math.floor(cl * 60) % 60)}`;
    const dateTxt = phase === 'month' ? 'JEU. 24/12' : (DATES[dd] || 'MAR. 24/11');
    if (real) HUD.live(t, 'MONT-SAINT-MICHEL · PASSERELLE · CAM 01', 'AUJOURD’HUI · LE VRAI MONDE', 'LIVE');
    else HUD.live(t, 'MONT-SAINT-MICHEL · PASSERELLE · CAM 01', `HYPOTHÈSE · ${dateTxt} · ${hh}`, 'SIMULATION');
    if (real) {
      HUD.block(1, { label: 'LA LUNE', value: '384 400 km', sub: 'EN MOYENNE', color: '#c9d8ff' });
      HUD.block(2, { label: 'ELLE S’ÉLOIGNE', value: '3,8 cm/an', sub: 'COMME TES ONGLES POUSSENT', color: '#fff' }); HUD.show2(ts >= 65.0);
    } else if (phase === 'night1' && ts < VANISH) {
      HUD.block(1, { label: 'LA LUNE · DISTANCE', value: '384 400 km', sub: 'PLEINE LUNE', color: '#c9d8ff' });
      HUD.block(2, { label: 'LUMIÈRE DE LA LUNE', value: '0,25 lux', sub: 'ASSEZ POUR VOIR TON OMBRE', color: '#fff' }); HUD.show2(ts >= 7.0);
    } else if (phase === 'night1') {
      HUD.block(1, { label: 'LA LUNE', value: 'disparue', sub: 'HYPOTHÈSE', color: '#ff3b30' });
      if (ts < ADAPT) HUD.block(2, { label: 'LUMIÈRE', value: '0,002 lux', sub: 'PLUS DE 100 FOIS MOINS', color: '#ff9f0a' });
      else HUD.block(2, { label: 'TES YEUX', value: 'habitués', sub: 'APRÈS 20 À 30 MIN', color: '#4cd964' });
      HUD.show2(true);
    } else if (day) {
      HUD.block(1, { label: 'GRANDE MARÉE · ICI', value: 'jusqu’à 14 m', sub: 'AVEC LA LUNE', color: '#7fd4ff' });
      HUD.block(2, { label: 'SANS LA LUNE', value: '≈ 3 × moins', sub: 'IL RESTE LE SOLEIL', color: '#ff9f0a' }); HUD.show2(ts >= 35.0);
    } else if (phase === 'week') {
      HUD.block(1, { label: 'PLEINE LUNE', value: 'plus jamais', sub: 'HYPOTHÈSE', color: '#ff3b30' }); HUD.show2(false);
    } else {
      if (ts < AXIS) HUD.block(1, { label: 'ANIMAUX DE NUIT', value: 'perdus', sub: 'CHASSE ET CACHETTES', color: '#ff9f0a' });
      else HUD.block(1, { label: 'L’AXE DE LA TERRE', value: 'pourrait basculer', sub: 'EN CENTAINES DE MILLIERS D’ANNÉES', color: '#ff3b30' });
      HUD.show2(false);
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', C.point('head').add(new THREE.Vector3(0, 0.25, 0)), camera, 'LÉNA', (A || rwk || !C.root.visible) ? 0 : sm(3.4, 4.0, ts) * (1 - sm(8.5, 9.1, ts)), 90);
    HUD.reticle('moon', moon.position.clone(), camera, 'LA LUNE', (A || !moon.visible || real) ? 0 : sm(10.9, 11.4, ts) * (1 - sm(VANISH - 0.3, VANISH, ts)), 150);
    HUD.reticle('ile', new THREE.Vector3(0, SAND_Y + 60, -460), camera, 'LE MONT RESTE ACCESSIBLE À PIED', (A || !day) ? 0 : sm(39.2, 39.8, ts) * (1 - sm(42.3, 42.8, ts)), 260);
    HUD.reticle('ghost', new THREE.Vector3(5.5, -0.55, -30), camera, 'GRANDE MARÉE D’AVANT', (A || !day) ? 0 : gk, 70);
    HUD.subs(t, SUBS_V);
    insets.draw(t, INSETS);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : NASA · CURRENT BIOLOGY (2013) · JOURNAL OF VISION (2012) · JOURNAL OF ANIMAL ECOLOGY (2014) · KYBA ET AL. (2017)', q: 'Et toi, tu voudrais voir<br>une nuit sans Lune ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'top') { camera.clearViewOffset(); camera.position.set(0, 300, -200); camera.lookAt(0, 0, -260); camera.fov = 60; camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), stop: FZ.realT(STOP), vanish: FZ.realT(VANISH), adapt: FZ.realT(ADAPT), morning: FZ.realT(MORNING),
    week: FZ.realT(WEEK), month: FZ.realT(MONTH), axis: FZ.realT(AXIS), rewind: [FZ.realT(RW0), FZ.realT(RW1)], real: FZ.realT(RW1), end: FZ.realT(T.endCard) }) };
}

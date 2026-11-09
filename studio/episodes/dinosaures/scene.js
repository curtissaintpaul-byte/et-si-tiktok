// =====================================================================
//  ÉPISODE : « Et si les dinosaures vivaient encore aujourd'hui ? » — une route forestière, forêt de Fontainebleau
//  Un seul personnage : Manon, 31 ans, fait son footing un samedi matin de novembre. Dans ce monde-là, l'astéroïde
//  d'il y a 66 millions d'années n'est jamais tombé. Un T. rex sort du bois derrière elle. Elle se fige, puis court se
//  cacher derrière un rocher de grès. Il la renifle, puis repart au pas. Le soir, la forêt est fermée ; un mois plus tard,
//  une clôture géante la coupe en deux et le T. rex devient un voisin. Retour au réel : 66 millions d'années, le fémur
//  de Charente, et les oiseaux, qui SONT des dinosaures (le merle du début).
//  Caméra fixe : une caméra de surveillance sur un poteau, au bord de la route (comme celles de l'ONF ou des communes).
//  Deux arrêts sur image (quand elle le voit ; cachée derrière le rocher). Pas d'effet multiplication.
//  Faits (sources dans la légende) :
//   - « Scotty », le plus gros T. rex connu : environ 13 m, plus de 8 800 kg (Université d'Alberta, 2019).
//   - Vue : jusqu'à 13 fois plus fine que la nôtre selon K. Stevens (Journal of Vertebrate Paleontology, 2006) :
//     le « reste immobile, il ne te verra pas » est un mythe.
//   - Vitesse : un T. rex adulte ne pouvait sans doute pas courir (os trop sollicités), environ 20 km/h au maximum
//     (Sellers et al., PeerJ, 2017 : ~12 mph) ; sa marche « préférée » : 4,6 km/h (van Bijlert et al., Royal Society Open Science, 2021).
//   - Morsure : environ 35 000 newtons (Gignac & Erickson, Scientific Reports, 2017) ≈ le poids de 3 petites voitures.
//   - La peur (réponse au stress, Harvard Health) : l'adrénaline accélère le cœur et la respiration, fait monter la tension,
//     envoie le sang vers les muscles ; les sens deviennent plus vifs. Elle peut aussi faire transpirer et trembler.
//   - Le T. rex vivait il y a 68 à 66 millions d'années ; le stégosaure il y a environ 150 millions d'années :
//     plus de temps entre eux deux qu'entre le T. rex et nous.
//   - Juillet 2019, Angeac-Charente : un fémur de sauropode de 2 m (AFP / Reuters).
//   - Les oiseaux sont des dinosaures (descendants directs des dinosaures à plumes ; Encyclopædia Universalis, « Origine et évolution des oiseaux »).
//  HYPOTHÈSES (affichées comme telles) : l'histoire de Manon, la fermeture de la forêt, la clôture.
// =====================================================================
import { THREE, createStage, M, box, cyl, HUD, sm, lerp, clamp, rng, pad, fr, canvasTex, noise2, signTex } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makeTRex } from '../../lib-dino.js';
import { makeSUV } from '../../lib-rue.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const Q = new URLSearchParams(location.search);
const num = (k, d) => Number(Q.get(k) ?? d);
// ---------------------------------------------------------------------
// la partition (temps de SCÈNE)
// ---------------------------------------------------------------------
const V_JOG = 10 / 3.6;                 // 10 km/h : un footing
const REX0 = 14.4, REX1 = 18.6;         // il sort du bois, il s'arrête au milieu de la route
const FZ1 = 19.0, FZ2 = 37.0;
const LOOK = 22.8, RUN0 = 27.4, HIDE = 29.9, CROUCH = 30.7, REXA = 27.6, REXB = 34.0;
const BITE = 38.0, CRACK = 41.0, LEAVE = 44.4, STANDUP = 46.4;
const EVE = 48.4, MONTH = 52.0, RW0 = 59.6, RW1 = 61.0;
const BIRD1 = 10.6, BIRD2 = 68.6;
const sceneEnd = 76.6;
const T = { hookOut: 3.0, rewind: RW0, real: RW1, endCard: 72.6, duration: sceneEnd };
const SUBS = [
  [3.2, 6.8, 'Forêt de Fontainebleau, un samedi matin. Manon, 31 ans, fait son footing.'],
  [7.0, 10.4, 'Dans ce monde-là, l’astéroïde d’il y a 66 millions d’années n’est jamais tombé.'],
  [10.6, 14.2, 'Un merle traverse la route. Lui, c’est déjà un dinosaure. Pour de vrai.'],
  [14.4, 18.8, 'Et puis, derrière elle, un T. rex sort du bois. 13 mètres de long, près de 9 tonnes.'],
  [19.2, 22.6, 'Son premier réflexe : ne plus bouger. Mauvaise idée.'],
  [22.8, 26.6, 'Selon une étude, le T. rex voyait jusqu’à 13 fois mieux que nous. Rester immobile ne sert à rien.'],
  [26.8, 30.4, 'Il ne pouvait sans doute pas galoper. Mais en marchant vite, il montait à 20 km/h environ.'],
  [30.6, 34.4, 'Un joggeur, c’est 10 km/h. Alors Manon se cache derrière un rocher.'],
  [34.6, 36.9, 'Il s’approche. Il renifle le rocher.'],
  [37.2, 40.8, 'Sa morsure : environ 35 000 newtons. Le poids de trois petites voitures.'],
  [41.0, 44.2, 'Un craquement, plus loin dans le bois. Il relève la tête.'],
  [44.4, 48.2, 'Il repart au pas, à 4,6 km/h. À peu près ta vitesse de marche.'],
  [48.4, 51.8, 'Le soir même, la forêt est fermée. Les gendarmes bloquent les routes.'],
  [52.0, 55.6, 'Un mois plus tard, une clôture géante coupe la forêt en deux. Manon court de ce côté-ci.'],
  [55.8, 59.4, 'Et le T. rex devient un voisin. Comme l’ours dans les Pyrénées.'],
  [61.2, 64.8, 'En vrai, le dernier T. rex est mort il y a 66 millions d’années.'],
  [65.0, 68.4, 'En 2019, en Charente, on a sorti de terre un fémur de dinosaure de 2 mètres.'],
  [68.6, 72.4, 'Mais les dinosaures sont toujours là : les oiseaux en descendent. Le merle du début en est un.'],
];
// l'heure de l'histoire (minutes depuis samedi 0 h)
const CLOCK = [[0, 7 * 60 + 40], [EVE - 0.01, 7 * 60 + 40 + (EVE / 60)], [EVE, 18 * 60 + 25], [MONTH - 0.01, 18 * 60 + 25.06], [MONTH, (30 * 24 + 8) * 60 + 5], [RW0, (30 * 24 + 8) * 60 + 5 + (RW0 - MONTH) / 60]];
const clockAt = (ts) => { for (let i = 1; i < CLOCK.length; i++) if (ts < CLOCK[i][0]) { const [a, va] = CLOCK[i - 1], [b, vb] = CLOCK[i]; return va + (vb - va) * (ts - a) / (b - a); } return CLOCK[CLOCK.length - 1][1]; };

export default async function () {
  const stage = createStage({ fov: 58, far: 260, bloom: [0.22, 0.5, 0.9], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const RN = rng(66);
  const FOG_DAY = new THREE.Color('#c4c3b4'), FOG_EVE = new THREE.Color('#39404c'), FOG_MONTH = new THREE.Color('#b9bfc0');
  scene.fog = new THREE.FogExp2(FOG_DAY.clone(), 0.026); scene.background = scene.fog.color;

  // -------------------------------------------------------------------
  // LE DÉCOR : la route forestière (5 m), le sol couvert de feuilles, les arbres d'automne, les rochers de grès
  // -------------------------------------------------------------------
  const litter = canvasTex(512, 512, (g) => { const r = rng(3); g.fillStyle = '#6b4a2a'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) { g.fillStyle = ['#8a5a2b', '#a8702f', '#5a3d22', '#7a6a3a', '#c08a3c', '#4d3a24'][(r() * 6) | 0]; g.save(); g.translate(r() * 512, r() * 512); g.rotate(r() * 6); g.beginPath(); g.ellipse(0, 0, 3 + r() * 6, 2 + r() * 3, 0, 0, 7); g.fill(); g.restore(); } });
  litter.wrapS = litter.wrapT = THREE.RepeatWrapping; litter.repeat.set(30, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 200), new THREE.MeshStandardMaterial({ map: litter, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = -60; ground.receiveShadow = true; scene.add(ground);
  const asph = canvasTex(256, 1024, (g) => { const r = rng(8); g.fillStyle = '#4b4b4a'; g.fillRect(0, 0, 256, 1024);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,20,20' : '120,118,112'},${0.1 + r() * 0.2})`; g.fillRect(r() * 256, r() * 1024, 2, 2); }
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(25,25,25,.5)'; g.lineWidth = 1; g.beginPath(); let x = r() * 256, y = r() * 1024; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += r() * 30; g.lineTo(x, y); } g.stroke(); }
    // des feuilles mortes sur les bords
    for (let i = 0; i < 1400; i++) { const e = r() < 0.5 ? r() * 40 : 256 - r() * 40; g.fillStyle = ['#8a5a2b', '#a8702f', '#c08a3c'][(r() * 3) | 0]; g.fillRect(e, r() * 1024, 4, 3); } });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(1, 14);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(5, 200), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.012, -60); road.receiveShadow = true; scene.add(road);

  // --- les arbres : troncs (chênes, hêtres, quelques pins), feuillages dorés en boules
  const barkM = new THREE.MeshStandardMaterial({ map: canvasTex(128, 512, (g) => { const r = rng(4); g.fillStyle = '#5a5248'; g.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '30,28,24' : '140,132,120'},${0.2 + r() * 0.3})`; g.fillRect(r() * 128, r() * 512, 2 + r() * 4, 10 + r() * 40); } }), roughness: 1 });
  const TREES = [];
  for (let i = 0; i < 260; i++) {
    const side = RN() < 0.5 ? -1 : 1, x = side * (4.2 + Math.pow(RN(), 0.8) * 45), z = 16 - RN() * 120;
    if (x > 2.5 && x < 8 && z > -2 && z < 12) continue;   // rien devant la caméra
    if (x > 2.6 && x < 6.5 && z > -7.5 && z < -1) continue;            // la place du rocher
    TREES.push({ x, z, h: 14 + RN() * 12, r: 0.22 + RN() * 0.3, pine: RN() < 0.18 });
  }
  const trunkG = new THREE.CylinderGeometry(0.75, 1, 1, 9); trunkG.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkG, barkM, TREES.length);
  const leafG = new THREE.IcosahedronGeometry(1, 1);
  const leafM = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const NB = TREES.length * 5, leaves = new THREE.InstancedMesh(leafG, leafM, NB);
  const mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), col = new THREE.Color();
  let li = 0;
  TREES.forEach((T0, i) => {
    mtx.compose(new THREE.Vector3(T0.x, 0, T0.z), qq.setFromEuler(new THREE.Euler((RN() - 0.5) * 0.06, RN() * 6, (RN() - 0.5) * 0.06)), new THREE.Vector3(T0.r, T0.h, T0.r)); trunks.setMatrixAt(i, mtx);
    for (let k = 0; k < 5; k++) {
      const s = T0.pine ? 1.6 + RN() * 1.2 : 2.4 + RN() * 2.2, y = T0.h * (0.62 + RN() * 0.38);
      mtx.compose(new THREE.Vector3(T0.x + (RN() - 0.5) * 4, y, T0.z + (RN() - 0.5) * 4), qq.setFromEuler(new THREE.Euler(RN(), RN(), RN())), new THREE.Vector3(s, s * 0.7, s));
      leaves.setMatrixAt(li, mtx);
      col.set(T0.pine ? ['#2f4430', '#3a4d35'][k % 2] : ['#c7832c', '#b5652a', '#d9a640', '#9a7a3a', '#a85a28', '#8f8a42'][(RN() * 6) | 0]); leaves.setColorAt(li, col); li++;
    }
  });
  trunks.castShadow = trunks.receiveShadow = true; leaves.castShadow = true; leaves.receiveShadow = true; scene.add(trunks, leaves);
  // --- les fougères (rousses en novembre) et les jeunes arbres, le long de la route
  const fernG = new THREE.IcosahedronGeometry(0.5, 1); fernG.scale(1.3, 0.55, 1.3); fernG.translate(0, 0.12, 0);
  const NF = 520, ferns = new THREE.InstancedMesh(fernG, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), NF);
  for (let i = 0; i < NF; i++) {
    const side = RN() < 0.5 ? -1 : 1, x = side * (2.9 + RN() * 16), z = 12 - RN() * 100;
    if ((x > 1.5 && z > -2 && x < 8) || (x > 2 && x < 6 && z > -7 && z < -1.5)) { mtx.makeScale(0, 0, 0); ferns.setMatrixAt(i, mtx); continue; }
    const s = 0.6 + RN() * 1.1; mtx.compose(new THREE.Vector3(x, 0, z), qq.setFromEuler(new THREE.Euler(0, RN() * 6, 0)), new THREE.Vector3(s * 1.4, s, s * 1.4)); ferns.setMatrixAt(i, mtx);
    col.set(['#8a5126', '#a0602b', '#6f4a26', '#7d6a35'][(RN() * 4) | 0]); ferns.setColorAt(i, col);
  }
  ferns.receiveShadow = true; scene.add(ferns);
  // --- les rochers de grès (le grand, celui où Manon se cache, et d'autres plus loin)
  const N2 = noise2(12);
  const rockM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  function makeRock(seed, sx, sy, sz) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, 6)), p = g.attributes.position, c = [], cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i), n = N2(v.x * 1.6 + seed, v.z * 1.6 + v.y * 1.3, 4);
      v.multiplyScalar(0.7 + 0.55 * n + 0.08 * N2(v.x * 6 + seed, v.y * 6 - v.z * 4, 2)); v.y = v.y < -0.3 ? -0.3 + (v.y + 0.3) * 0.2 : v.y; p.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
      const moss = clamp((v.y + 0.1) * 2 * (n - 0.35) * 3), dark = 0.85 + 0.25 * N2(v.x * 5 + seed, v.y * 5 + v.z * 3, 2);
      cc.set('#b6a88a').multiplyScalar(dark).lerp(new THREE.Color('#5e6b3a'), moss * 0.7); c.push(cc.r, cc.g, cc.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, rockM); m.castShadow = m.receiveShadow = true; return m;
  }
  const ROCK = new THREE.Vector3(3.55, 0, -4.4);
  const rock = makeRock(1, 1.7, 1.9, 1.45); rock.position.set(ROCK.x, 0.55, ROCK.z); rock.rotation.y = 0.4; scene.add(rock);
  for (const [x, z, s, sd] of [[6.5, -12, 1.2, 2], [-7, -9, 1.6, 3], [-5.5, -30, 2.2, 4], [8, -26, 1.8, 5], [-9, 4, 1.4, 6], [10, -45, 2.5, 7]]) {
    const r2 = makeRock(sd, s * 1.2, s, s); r2.position.set(x, 0.3 * s, z); r2.rotation.y = sd; scene.add(r2); }
  // --- la borne et le panneau « Route forestière » (ONF), le poteau de la caméra
  const signM = new THREE.MeshStandardMaterial({ map: signTex('ROUTE FORESTIÈRE', '#2f5a35', '#f4f1e6', 1024, 160, 70), roughness: 0.8 });
  const sp = box(0.08, 1.6, 0.08, M('#6b5a44'), scene, -3.2, 0.8, -3.0); const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.24), signM); sg.position.set(-3.2, 1.45, -2.95); scene.add(sg);

  // --- le soir : la voiture de gendarmerie en travers, la barrière, le gyrophare bleu
  const EVEG = new THREE.Group(); scene.add(EVEG);
  const car = makeSUV('#1d2a4e'); car.root.position.set(-0.8, 0, -9.5); car.root.rotation.y = 0.25; EVEG.add(car.root);
  const stripeT = canvasTex(256, 32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8e8e8' : '#d22a20'; g.fillRect(i * 32, 0, 32, 32); } });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 0.08), new THREE.MeshStandardMaterial({ map: stripeT, roughness: 0.6 })); bar.position.set(0.3, 1.0, -6.5); EVEG.add(bar);
  for (const x of [-1.8, 2.4]) box(0.08, 1.0, 0.5, M('#d9d9d9'), EVEG, x, 0.5, -6.5);
  const closed = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), new THREE.MeshStandardMaterial({ map: signTex('FORÊT FERMÉE', '#d22a20', '#ffffff', 1024, 260, 120), roughness: 0.7, emissive: new THREE.Color('#401010'), emissiveIntensity: 0.4 }));
  closed.position.set(0.3, 1.38, -6.45); EVEG.add(closed); box(0.06, 0.45, 0.06, M('#888'), EVEG, 0.3, 1.13, -6.5);
  const gyroM = new THREE.MeshBasicMaterial({ color: '#2a6bff', toneMapped: false });
  const gyro = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.25), gyroM); gyro.position.set(-0.8, 1.98, -9.5); gyro.rotation.y = 0.25; EVEG.add(gyro);
  const blueL = new THREE.PointLight('#3a72ff', 0, 22, 1.4); blueL.position.set(-0.8, 2.6, -9.0); scene.add(blueL);
  const headL = new THREE.SpotLight('#fff3dc', 0, 28, 0.55, 0.6, 1.4); headL.position.set(0.6, 0.9, -9.0); headL.target.position.set(3.5, 0, -4); scene.add(headL, headL.target);
  // --- un mois plus tard : la clôture géante (6 m), avec ses panneaux
  const FENCE = new THREE.Group(); scene.add(FENCE);
  const meshT = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = 'rgba(200,205,210,.9)'; g.lineWidth = 3; for (let i = -256; i < 512; i += 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke(); } });
  meshT.wrapS = meshT.wrapT = THREE.RepeatWrapping; meshT.repeat.set(30, 3);
  const FZZ = -17;
  const fenceMesh = new THREE.Mesh(new THREE.PlaneGeometry(80, 6), new THREE.MeshStandardMaterial({ map: meshT, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 }));
  fenceMesh.position.set(0, 3, FZZ); FENCE.add(fenceMesh);
  for (let x = -40; x <= 40; x += 4) box(0.16, 6.3, 0.16, M('#5f6468'), FENCE, x, 3.15, FZZ);
  box(80, 0.12, 0.12, M('#5f6468'), FENCE, 0, 6.2, FZZ);
  const dangerM = new THREE.MeshStandardMaterial({ map: canvasTex(512, 384, (g) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, 512, 384); g.fillStyle = '#111'; g.fillRect(14, 14, 484, 356); g.fillStyle = '#f2c230'; g.fillRect(24, 24, 464, 336);
    g.fillStyle = '#111'; g.font = '800 64px Inter'; g.textAlign = 'center'; g.fillText('DANGER', 256, 110); g.font = '800 46px Inter'; g.fillText('ZONE T. REX', 256, 190); g.font = '600 34px Inter'; g.fillText('ACCÈS INTERDIT', 256, 260); g.font = '500 24px Inter'; g.fillText('OFFICE NATIONAL DES FORÊTS', 256, 320); }), roughness: 0.7 });
  for (const x of [-4.2, 4.2]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), dangerM); d.position.set(x, 1.9, FZZ + 0.08); FENCE.add(d); }
  // les bords de la route, juste derrière la clôture : un portail fermé
  const gateM = M('#3f4549'); for (const x of [-2.5, 2.5]) box(0.25, 6.4, 0.25, gateM, FENCE, x, 3.2, FZZ);

  // --- le merle (petit, noir, bec orange) : il traverse la route en sautillant
  const bird = new THREE.Group(); scene.add(bird);
  { const bm = M('#151412', { r: 0.5 }); const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), bm); b.scale.set(0.9, 0.85, 1.5); b.position.y = 0.09; bird.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), bm); h.position.set(0, 0.15, 0.08); bird.add(h);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 6), M('#f0a020')); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.145, 0.13); bird.add(bk);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.12), bm); tl.position.set(0, 0.11, -0.12); tl.rotation.x = -0.4; bird.add(tl);
    for (const s of [-1, 1]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05), M('#3a2a1a')); lg.position.set(s * 0.02, 0.025, 0); bird.add(lg); }
    bird.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
  bird.scale.setScalar(2.5);   // (un peu plus gros que nature, sinon on ne le voit pas depuis la caméra)

  // -------------------------------------------------------------------
  // LE T. REX et MANON
  // -------------------------------------------------------------------
  const REX = makeTRex({ seed: 7 }); scene.add(REX.root);
  const PEOPLE = await loadPeople(renderer);
  const C = PEOPLE.make({ outfit: 5, shadows: true }); scene.add(C.root);

  // --- les lumières
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const sun = new THREE.DirectionalLight('#ffe2b0', 2.4); sun.position.set(26, 22, -30); sun.target.position.set(0, 0, -8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 }); sun.shadow.bias = -0.0006; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#d6dde4', '#5a4630', 1.1); scene.add(hemi);
  const LIGHTS = [sun, blueL, headL];

  // -------------------------------------------------------------------
  // LES ARRÊTS SUR IMAGE
  // -------------------------------------------------------------------
  const pt = (n, dy = 0, dx = 0) => () => C.point(n).add(new THREE.Vector3(dx, dy, 0));
  const FZ = makeFreeze([
    { at: FZ1, dur: 4.6, title: 'ARRÊT SUR IMAGE · LA PEUR', tags: [
      { at: pt('heart'), title: 'CŒUR', lines: ['l’adrénaline le fait battre', 'plus vite et plus fort'], risk: 'mal', side: 'right', dy: -40 },
      { at: pt('lungs'), title: 'POUMONS', lines: ['tu respires', 'plus vite'], risk: 'bof', side: 'left', dy: 60 },
      { at: pt('rKnee'), title: 'JAMBES', lines: ['le sang file vers tes muscles,', 'prêts à fuir'], risk: 'info', side: 'right', dy: 130 } ] },
    { at: FZ2, dur: 5.0, title: 'ARRÊT SUR IMAGE · CACHÉE', tags: [
      { at: pt('heart'), title: 'CŒUR', lines: ['le pouls et la tension', 'montent en flèche'], risk: 'grave', side: 'left', dy: -120 },
      { at: pt('head', 0.05), title: 'PEAU', lines: ['la sueur coule,', 'sans aucun effort'], risk: 'bof', side: 'left', dy: -330 },
      { at: pt('rHand'), title: 'MAINS', lines: ['l’adrénaline', 'peut les faire trembler'], risk: 'bof', side: 'left', dy: 120 } ] },
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

  // -------------------------------------------------------------------
  // LA CAMÉRA (fixe, sur un poteau au bord de la route, côté droit)
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(num('cx', 4.3), num('cy', 2.9), num('cz', 4.0)), LOOKP = new THREE.Vector3(num('lx', -0.8), num('ly', 1.9), num('lz', -12));
  const VWp = 720, VHp = 1280, tmp = new THREE.Vector3();

  // --- les trajets
  const P_STOP = new THREE.Vector3(0.4, 0, -9.0);                          // où Manon s'arrête
  const HIDE_P = new THREE.Vector3(3.05, 0, -2.75);                         // accroupie, dos au rocher
  const runPath = [P_STOP, new THREE.Vector3(1.6, 0, -4.5), new THREE.Vector3(2.4, 0, -2.3), HIDE_P];
  const REX_IN = new THREE.Vector3(-12.5, 0, -17.5), REX_ROAD = new THREE.Vector3(-3.4, 0, -15.2), REX_ROCK = new THREE.Vector3(num('rrx', 0.9), 0, num('rrz', -9.9)), REX_OUT = new THREE.Vector3(-13, 0, -11.5);
  const head2 = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
  const pathAt = (pts, u) => { const n = pts.length - 1, f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return { p: pts[i].clone().lerp(pts[i + 1], k), dir: head2(pts[i], pts[i + 1]) }; };

  const st = { rexDist: 0 };
  function rexPose(ts) {
    // renvoie position, cap, distance parcourue, et la pose de la tête
    let p = REX_IN.clone(), h = head2(REX_IN, REX_ROAD), d = 0, yaw = 0, pitch = 0.05, jaw = 0, lean = 0, moving = 0;
    const toManon = (pp, hh) => angLerp(0, head2(pp, C.root.position) - hh, 1);
    if (ts < REX0) { REX.root.visible = false; return null; }
    REX.root.visible = true;
    if (ts < REX1) { const k = sm(REX0, REX1, ts) * 0.6 + 0.4 * (ts - REX0) / (REX1 - REX0); p.lerpVectors(REX_IN, REX_ROAD, k); d = k * REX_IN.distanceTo(REX_ROAD); moving = 1; yaw = 0.2 * Math.sin(ts * 0.8); }
    else if (ts < REXA) { p.copy(REX_ROAD); d = REX_IN.distanceTo(REX_ROAD);
      yaw = lerp(0, clamp(toManon(p, h), -1.1, 1.1), sm(REX1 - 0.2, LOOK + 1.0, ts)); pitch = 0.05 + 0.1 * sm(LOOK, LOOK + 1, ts); jaw = 0.12 * sm(LOOK + 1.5, LOOK + 2.2, ts) * (1 - sm(LOOK + 3.4, LOOK + 4, ts)); }
    else if (ts < LEAVE) {
      const k = sm(REXA, REXB, ts); p.lerpVectors(REX_ROAD, REX_ROCK, k); d = REX_IN.distanceTo(REX_ROAD) + k * REX_ROAD.distanceTo(REX_ROCK); moving = ts < REXB ? 1 : 0;
      const hr = head2(REX_ROAD, REX_ROCK), hRock = head2(REX_ROCK, ROCK.clone().add(new THREE.Vector3(-0.6, 0, 0.6)));
      h = angLerp(head2(REX_IN, REX_ROAD), angLerp(hr, hRock, sm(REXB - 2.0, REXB + 0.6, ts)), sm(REXA, REXA + 1.6, ts));
      const sniff = sm(REXB - 1.0, REXB + 0.8, ts) * (1 - sm(CRACK, CRACK + 0.8, ts));
      lean = 0.16 * sniff; pitch = 0.05 + 0.42 * sniff - 0.15 * sm(CRACK, CRACK + 0.8, ts);
      yaw = sniff * (0.12 * Math.sin(ts * 1.7)) + (ts < REXB ? lerp(clamp(toManon(REX_ROAD, head2(REX_IN, REX_ROAD)), -1.1, 1.1), 0, sm(REXA, REXA + 1.5, ts)) : 0) - 0.9 * sm(CRACK + 0.2, CRACK + 1.4, ts);
      jaw = sm(BITE - 0.6, BITE, ts) * (1 - sm(BITE + 1.6, BITE + 2.4, ts)) + 0.08 * sniff * Math.max(0, Math.sin(ts * 9));
    } else {
      const k = clamp((ts - LEAVE - 0.8) * 1.28 / REX_ROCK.distanceTo(REX_OUT)); const turn = sm(LEAVE, LEAVE + 1.6, ts);
      p.lerpVectors(REX_ROCK, REX_OUT, k); h = angLerp(head2(REX_ROAD, REX_ROCK), head2(REX_ROCK, REX_OUT), turn); moving = 1;
      d = 30 + (ts - LEAVE) * 1.28 + turn * 1.2; yaw = -0.4 * (1 - turn) + 0.15 * Math.sin(ts * 0.7); pitch = 0.05;
    }
    REX.root.position.copy(p); REX.root.rotation.y = h;
    REX.pose({ phase: d / 4.4, stride: moving ? 4.4 : 0.0001, yaw, pitch, jaw, lean, t: ts, breathe: Math.sin(ts * 1.4) });
    return p;
  }
  function manon(ts) {
    C.inner.position.set(0, 0, 0); C.root.visible = true;
    if (ts < REX0) {   // le footing, vers la caméra
      const z = P_STOP.z - V_JOG * (REX0 + 0.6 - ts); C.root.position.set(P_STOP.x - 0.4 * Math.sin(ts * 0.2), 0, Math.min(P_STOP.z, z)); C.root.rotation.y = 0; C.run(ts * 9.4, 0.75); return;
    }
    if (ts < RUN0) {   // elle s'arrête, se retourne à moitié, figée
      const k = sm(REX0, REX0 + 1.2, ts); C.root.position.copy(P_STOP); C.root.position.z = P_STOP.z - V_JOG * 0.6 * (1 - sm(REX0, REX0 + 0.6, ts)) + 0.0;
      C.root.rotation.y = lerp(0, -1.75, k);
      const back = sm(LOOK + 2.2, RUN0, ts);
      C.do({ Head: [['y', -0.55 * k]], Spine1: [['y', -0.2 * k]], LeftArm: [['x', -0.25 * k], ['z', 0.25 * k]], RightArm: [['x', -0.3 * k], ['z', -0.2 * k]], LeftForeArm: [['x', -0.9 * k]], RightForeArm: [['x', -0.9 * k]],
        LeftUpLeg: [['x', -0.08 * k]], RightUpLeg: [['x', 0.1 * k]], Spine: [['x', -0.06 * k + 0.04 * back]] });
      return;
    }
    if (ts < HIDE) {   // elle court jusqu'au rocher
      const u = (ts - RUN0) / (HIDE - RUN0), { p, dir } = pathAt(runPath, u);
      C.root.position.copy(p); C.root.rotation.y = angLerp(-1.75, dir, sm(RUN0, RUN0 + 0.35, ts)); C.run(ts * 11, 1); return;
    }
    // accroupie contre le rocher, face à la caméra ; elle se relève quand il est parti
    C.root.position.copy(HIDE_P); C.root.rotation.y = 0.15;
    const k = sm(HIDE, CROUCH, ts) * (1 - sm(STANDUP, STANDUP + 1.2, ts));
    const peek = sm(STANDUP + 0.6, STANDUP + 1.6, ts);
    const br = 0.03 * Math.sin(ts * 5.5) * k;
    C.do({ LeftUpLeg: [['x', -2.0 * k], ['z', -0.15 * k]], RightUpLeg: [['x', -2.0 * k], ['z', 0.15 * k]], LeftLeg: [['x', 2.3 * k]], RightLeg: [['x', 2.3 * k]],
      Spine: [['x', 0.1 * k + br]], Spine1: [['x', 0.1 * k]], Head: [['x', -0.15 * k + 0.2 * Math.sin(ts * 0.6) * k * 0.3], ['y', 0.35 * k * Math.sin(ts * 0.35) - 0.8 * peek]],
      LeftArm: [['x', -0.65 * k], ['z', -0.3 * k]], RightArm: [['x', -0.65 * k], ['z', 0.3 * k]], LeftForeArm: [['z', -1.85 * k]], RightForeArm: [['z', 1.85 * k]] });
    C.inner.position.set(0, -0.62 * k, -0.05 * k);
  }
  function update(t) {
    const ts = FZ.sceneT(t), A = FZ.active(t);
    const rwk = ts >= RW0 && ts < RW1 ? (ts - RW0) / (RW1 - RW0) : 0;
    const real = ts >= RW0 + 0.7, eve = !real && ts >= EVE && ts < MONTH, month = !real && ts >= MONTH;
    // --- qui est là
    EVEG.visible = eve; FENCE.visible = month;
    if (!eve && !month && !real) { manon(ts); rexPose(ts); }
    else {
      C.root.visible = false; REX.root.visible = false;
      if (month) {   // Manon court de ce côté-ci ; le T. rex passe derrière la clôture
        C.root.visible = true; const tj = ts - MONTH, stopK = sm(55.6, 56.4, ts);
        const z = -14 + V_JOG * Math.min(tj, 3.6 + 0.3 * stopK); C.root.position.set(1.1, 0, z);
        if (ts < 55.8) { C.root.rotation.y = 0; C.run(ts * 9.4, 0.75); } else { C.root.rotation.y = lerp(0, -2.2, sm(55.8, 56.8, ts)); C.do({ Head: [['y', -0.4]], LeftForeArm: [['x', -0.5]], RightForeArm: [['x', -0.5]] }); }
        REX.root.visible = true; const rx = 11 - 2.4 * (ts - MONTH);
        REX.root.position.set(rx, 0, -24); REX.root.rotation.y = -Math.PI / 2; REX.pose({ phase: (11 - rx) / 4.4, stride: 4.4, t: ts, yaw: 0.35 * sm(55.8, 57, ts), pitch: 0.05, breathe: Math.sin(ts * 1.4) });
      }
      if (real) {   // aujourd'hui : la route vide, Manon qui fait son footing, le merle
        C.root.visible = ts < 70; const z = -30 + V_JOG * (ts - RW1); C.root.position.set(0.5, 0, z); C.root.rotation.y = 0; C.run(ts * 9.4, 0.75);
        if (z > 6) C.root.visible = false;
      }
    }
    // --- le merle : il sautille à travers la route (deux fois : au début, et au retour au réel)
    const bt = ts >= BIRD1 && ts < BIRD1 + 4.0 ? ts - BIRD1 : ts >= BIRD2 && ts < BIRD2 + 4.2 && real ? ts - BIRD2 : -1;
    bird.visible = bt >= 0;
    if (bt >= 0) { const hops = bt * 2.6, ph = hops % 1; bird.position.set(-3.0 + Math.min(bt, 3.2) * 1.1, 0.12 * Math.sin(Math.PI * ph) * (bt < 3.2 ? 1 : 0), ts < 30 ? -14 : -14); bird.rotation.y = Math.PI / 2 + (bt > 3.3 ? -0.9 : 0); }
    // --- la lumière : matin (doré, brume), soir (bleu, gyrophare), un mois plus tard (froid, brume)
    const eveK = eve ? 1 : 0, monthK = month ? 1 : 0;
    scene.fog.color.copy(FOG_DAY).lerp(FOG_EVE, eveK).lerp(FOG_MONTH, monthK); scene.fog.density = eve ? 0.028 : month ? 0.022 : 0.024;
    sun.intensity = eve ? 0 : month ? 1.2 : 2.4; sun.color.set(month ? '#e8eef5' : '#ffe2b0');
    hemi.intensity = eve ? 0.7 : month ? 1.1 : 1.1; hemi.color.set(eve ? '#5f6f9a' : '#d6dde4');
    scene.environmentIntensity = eve ? 0.06 : 0.22;
    const flash = eve ? Math.max(0, Math.sin(ts * 9.0)) ** 3 : 0;
    blueL.intensity = eve ? 14 * flash : 0; gyroM.color.set(eve && flash > 0.3 ? '#4d86ff' : '#1a2a55'); headL.intensity = eve ? 30 : 0; car.lights({ head: eve ? 1 : 0 });
    for (const l of LIGHTS) l.visible = l.intensity > 0;
    // --- la caméra (fixe) ; zoom numérique pendant les arrêts sur image
    camera.position.copy(CAM); camera.lookAt(LOOKP); camera.fov = num('fov', 58);
    camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (A) {
      tmp.copy(C.point('chest')).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * VWp, (-tmp.y * 0.5 + 0.5) * VHp, A.f.at === FZ1 ? num('zf1', 2.6) : num('zf2', 2.1), k);
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    HUD.frost(0); HUD.flash(0);
    let filt = eve ? 'saturate(0.85)' : '';
    if (rwk) filt = `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)`;
    // --- textes
    HUD.hook(t, 'Et si les <em>dinosaures</em> vivaient encore aujourd’hui ?', T.hookOut);
    const cl = clockAt(ts), dd = Math.floor(cl / 1440);
    const hh = `${pad(Math.floor(cl / 60) % 24)}:${pad(Math.floor(cl) % 60)}:${pad(Math.floor(cl * 60) % 60)}`;
    if (real) HUD.live(t, 'FONTAINEBLEAU · ROUTE · CAM 01', 'AUJOURD’HUI · LE VRAI MONDE', 'LIVE');
    else HUD.live(t, 'FONTAINEBLEAU · ROUTE · CAM 01', `HYPOTHÈSE · ${dd >= 30 ? 'LUN. 14/12' : 'SAM. 14/11'} · ${hh}`, 'SIMULATION');
    const dist = REX.root.visible && !month ? REX.point('nose').setY(0).distanceTo(C.root.position) : 0;
    if (real) {
      HUD.block(1, { label: 'DERNIER T. REX', value: '66 millions', sub: 'D’ANNÉES', color: '#ffcf6b' });
      HUD.block(2, { label: 'CHARENTE · 2019', value: 'fémur de 2 m', sub: 'ANGEAC-CHARENTE', color: '#fff' }); HUD.show2(ts >= 65.0);
    } else if (eve) {
      HUD.block(1, { label: 'FORÊT DE FONTAINEBLEAU', value: 'fermée', sub: 'HYPOTHÈSE', color: '#ff3b30' }); HUD.show2(false);
    } else if (month) {
      HUD.block(1, { label: 'LE T. REX', value: 'un voisin', sub: 'DERRIÈRE LA CLÔTURE', color: '#ffcf6b' }); HUD.show2(false);
    } else if (ts < REX0) {
      HUD.block(1, { label: 'MANON · FOOTING', value: '10 km/h', sub: 'UN SAMEDI COMME LES AUTRES', color: '#4cd964' }); HUD.show2(false);
    } else {
      const dc = dist < 8 ? '#ff3b30' : dist < 14 ? '#ff9f0a' : '#ffd60a';
      HUD.block(1, { label: 'T. REX · DISTANCE', value: ts >= LEAVE + 3.5 ? 'il s’éloigne' : `${fr(Math.max(1, dist), 0)} m`, sub: ts < 26.8 ? '13 M DE LONG · PRÈS DE 9 T' : ts < HIDE ? 'MANON COURT' : 'MANON EST CACHÉE', color: ts >= LEAVE + 3.5 ? '#4cd964' : dc });
      if (ts >= 26.8 && ts < 34.5) HUD.block(2, { label: 'T. REX · VITESSE MAX', value: '≈ 20 km/h', sub: 'TOI EN FOOTING : 10 KM/H', color: '#ff9f0a' });
      else if (ts >= 37.2 && ts < 44.3) HUD.block(2, { label: 'SA MORSURE', value: '35 000 N', sub: '≈ 3 PETITES VOITURES', color: '#ff3b30' });
      else if (ts >= 44.4) HUD.block(2, { label: 'SA MARCHE', value: '4,6 km/h', sub: 'COMME TOI', color: '#fff' });
      HUD.show2((ts >= 26.8 && ts < 34.5) || (ts >= 37.2));
    }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t)) * (rwk ? 0 : 1);
    camera.updateMatrixWorld();
    HUD.reticle('you', C.point('head').add(new THREE.Vector3(0, 0.25, 0)), camera, 'MANON', (A || rwk || !C.root.visible) ? 0 : sm(3.4, 4.0, ts) * (1 - sm(8.5, 9.1, ts)), 90);
    const birdOp = (A || !bird.visible) ? 0 : (ts < 30 ? sm(BIRD1 + 0.2, BIRD1 + 0.6, ts) * (1 - sm(BIRD1 + 3.4, BIRD1 + 3.8, ts)) : sm(BIRD2 + 0.2, BIRD2 + 0.6, ts) * (1 - sm(BIRD2 + 3.6, BIRD2 + 4.0, ts)));
    HUD.reticle('bird', bird.position.clone().add(new THREE.Vector3(0, 0.2, 0)), camera, 'MERLE · DINOSAURE', birdOp, 70);
    HUD.reticle('rex', REX.root.visible && !month && !real ? REX.point('eye') : new THREE.Vector3(0, -50, 0), camera, 'T. REX', (A || !REX.root.visible || month) ? 0 : sm(REX0 + 1.0, REX0 + 1.6, ts) * (1 - sm(REX1 - 0.4, REX1, ts)), 120);
    HUD.subs(t, SUBS_V);
    drawRewind(rwk, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : U. D’ALBERTA · J. VERT. PALEONTOLOGY · PEERJ · ROYAL SOCIETY · SCIENTIFIC REPORTS · HARVARD HEALTH', q: 'Et toi, quel dinosaure<br>tu voudrais croiser ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera, filt);
    if (Q.get('dbg') === 'top') { camera.clearViewOffset(); camera.position.set(0, 40, -5); camera.lookAt(0, 0, -6); camera.fov = 60; camera.updateProjectionMatrix(); }
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); const p = C.root.position; camera.position.set(p.x + 1.2, 1.2, p.z + 2.6); camera.lookAt(p.x, 0.6, p.z); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), rex0: FZ.realT(REX0), rex1: FZ.realT(REX1), rexa: FZ.realT(REXA), rexb: FZ.realT(REXB), run0: FZ.realT(RUN0), hide: FZ.realT(HIDE),
    bite: FZ.realT(BITE), crack: FZ.realT(CRACK), leave: FZ.realT(LEAVE), stand: FZ.realT(STANDUP), eve: FZ.realT(EVE), month: FZ.realT(MONTH), bird: [FZ.realT(BIRD1), FZ.realT(BIRD2)],
    rewind: [FZ.realT(RW0), FZ.realT(RW1)], real: FZ.realT(RW1), end: FZ.realT(T.endCard) }) };
}

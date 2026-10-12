// =====================================================================
//  ÉPISODE : « Et si la Lune se rapprochait ? » — Étretat, la nuit
//  Faits : Lune à 384 400 km ; marées ∝ 1/distance³ ; taille ∝ 1/distance ;
//  limite de Roche Terre-Lune ≈ 20 000 km (NASA) ; en vrai elle s'éloigne de 3,8 cm/an (NASA).
//  On regarde vers l'ouest-sud-ouest : la falaise d'Aval, la Porte d'Aval et l'Aiguille (51 m).
// =====================================================================
import { THREE, dotTex, createStage, makeSky, M, add, cyl, bake, noise2, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, canvasTex } from '../../engine.js';
import { makeWater } from '../../lib.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, half: 8.4, tides: 23.4, near: 33.4, roche: 39.0, crack: 43.0, ring: 48.0, rain: 53.0, calm: 63.4, endCard: 68.0, duration: 72.0 };
const SUBS = [
  [3.4, 8.0, 'La Lune est à 384 400 km.'],
  [8.4, 12.8, 'Et si elle venait 2 fois plus près ?'],
  [13.2, 17.8, 'Elle paraîtrait 2 fois plus grande…'],
  [18.2, 23.0, '…et les marées seraient 8 fois plus fortes.'],
  [23.4, 28.0, 'Ici, la marée passerait de 8 m à plus de 60 m.'],
  [28.4, 33.0, 'Ports, plages, villes côtières : noyés 2 fois par jour.'],
  [33.4, 38.6, 'À 40 000 km, les marées font des centaines de mètres.'],
  [39.0, 43.2, 'À 20 000 km, elle fait le tour de la Terre en 8 h.'],
  [43.6, 47.8, 'Puis la gravité de la Terre la déchire.'],
  [48.2, 52.8, 'Elle devient un anneau, comme Saturne.'],
  [53.2, 58.0, 'Et une partie de ses morceaux retombe sur nous.'],
  [58.4, 63.0, '0,01 % de la Lune pèse des milliers de fois l’astéroïde des dinosaures.'],
  [63.4, 67.6, 'En vrai, elle s’éloigne de 3,8 cm par an.'],
];
const D0 = 384400, GM_E = 3.986e14, R_MOON = 1737, R_E = 6371, LAT = 49.7 * Math.PI / 180;
const DIST = [[0, D0], [8.4, D0], [12.6, 192200], [33.4, 192200], [37.8, 40000], [39.0, 30000], [42.4, 20000], [50, 19900]];
const distAt = (t) => { for (let i = 1; i < DIST.length; i++) if (t <= DIST[i][0]) { const [a, va] = DIST[i - 1], [b, vb] = DIST[i]; return Math.exp(lerp(Math.log(va), Math.log(vb), sm(0, 1, (t - a) / (b - a)))); } return 19900; };
const periodH = (dkm) => 2 * Math.PI * Math.sqrt((dkm * 1e3) ** 3 / GM_E) / 3600;

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 60, far: 30000, bloom: [0.32, 0.5, 0.88], shadows: false });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.45;
  document.documentElement.style.setProperty('--accent', '#c9d8ff');
  const R = rng(1857);
  const CAM = new THREE.Vector3(80, 34, -330);      // en hauteur, face à la Porte d'Aval
  const VIEW_AZ = 250 * Math.PI / 180;   // on regarde vers l'ouest-sud-ouest
  // passage des directions géographiques (est, nord, haut) au repère de la scène
  const enu = (e, n, u) => new THREE.Vector3(e * Math.sin(VIEW_AZ + Math.PI / 2) + n * Math.cos(VIEW_AZ + Math.PI / 2), u, -(e * Math.sin(VIEW_AZ) + n * Math.cos(VIEW_AZ)));

  const sky = makeSky(scene, { stars: 1.1, milky: 0.9, nightZen: [0.0016, 0.0024, 0.0075], nightHor: [0.010, 0.014, 0.030] });
  sky.u.uDay.value = 0;
  scene.fog = new THREE.Fog('#191f30', 1800, 22000);
  const moonLight = new THREE.DirectionalLight('#c9d6ff', 0.6); scene.add(moonLight, moonLight.target);
  const hemi = new THREE.HemisphereLight('#3a4f88', '#0d0b09', 0.65); scene.add(hemi);

  // -------------------------------------------------------------------
  // LES FALAISES DE CRAIE, LA PLAGE DE GALETS
  // -------------------------------------------------------------------
  const nz = noise2(5);
  const cliffX = (z) => -62 - 40 * sm(-100, -700, z) + 10 * Math.sin(z * 0.01) + (nz(0.3, z * 0.01) - 0.5) * 18;
  function H(x, z) {
    const cx = cliffX(z);
    const end = sm(-660, -700, z);                                // la falaise s'arrête à l'arche
    const top = 74 + (nz(x * 0.01, z * 0.01) - 0.5) * 8 + 10 * sm(-200, 400, z);
    const face = 1 - sm(cx - 5, cx + 4, x);                      // 1 dans la falaise, 0 sur la plage
    let beach = 4 - (x - cx) * 0.045 - Math.max(0, z - 60) * 0.02;
    beach = Math.min(beach, 6);
    let y = lerp(beach, top, face * (1 - end));
    if (end > 0.5) y = Math.min(y, beach - (x - cx) * 0.02 - 8);
    return y;
  }
  function C(x, z, y) {
    if (y < -2) return '#26323a';
    if (y < 7.5 && y > -2) { const k = nz(x * 0.35, z * 0.35); return k > 0.62 ? '#7c766b' : k > 0.45 ? '#958d80' : k > 0.3 ? '#a59d90' : '#8a8478'; }
    if (y > 70) return '#4f6b38';                                  // l'herbe sur le haut de la falaise
    const band = Math.abs(Math.sin(y * 0.85 + nz(x * 0.05, z * 0.05) * 3)) < 0.08;
    return band ? '#8e897f' : (nz(x * 0.05, z * 0.03) > 0.6 ? '#dcd8cc' : '#e8e5da');   // craie + lignes de silex
  }
  {
    const g = new THREE.PlaneGeometry(900, 1300, 200, 260); g.rotateX(-Math.PI / 2); g.translate(-150, 0, -450);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
    const geo = g.toNonIndexed(); const pp = geo.attributes.position, col = new Float32Array(pp.count * 3), c = new THREE.Color();
    for (let i = 0; i < pp.count; i += 3) { const x = (pp.getX(i) + pp.getX(i + 1) + pp.getX(i + 2)) / 3, z = (pp.getZ(i) + pp.getZ(i + 1) + pp.getZ(i + 2)) / 3, y = Math.max(pp.getY(i), pp.getY(i + 1), pp.getY(i + 2)); c.set(C(x, z, y)); for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, M('#ffffff', { vc: true, unique: true })));
  }
  // grand fond (le plateau loin à gauche, le fond marin)
  { const g = new THREE.PlaneGeometry(20000, 20000, 60, 60); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, x < -600 && z > -2500 ? 70 + nz(x * 0.002, z * 0.002) * 20 : -25); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, M('#3c4a35')); m.position.y = -1; scene.add(m); }

  // la Porte d'Aval : un mur de craie percé d'une arche, qui "plonge" dans la mer comme une trompe
  function chalkMesh(geo) {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); c.set(Math.abs(Math.sin(y * 0.85)) < 0.08 ? '#8e897f' : '#e4e1d6'); col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    return new THREE.Mesh(geo, M('#ffffff', { vc: true, unique: true }));
  }
  {
    const s = new THREE.Shape(); s.moveTo(-150, -10); s.lineTo(-150, 82); s.lineTo(-10, 80); s.quadraticCurveTo(22, 70, 26, 40); s.quadraticCurveTo(22, 10, 10, -10); s.closePath();
    const hole = new THREE.Path(); hole.moveTo(-62, -8); hole.lineTo(-62, 26); hole.quadraticCurveTo(-60, 52, -30, 54); hole.quadraticCurveTo(-4, 52, -2, 24); hole.lineTo(-2, -8); hole.closePath();
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 34, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 2, curveSegments: 10 });
    const arch = chalkMesh(geo.toNonIndexed()); arch.position.set(-70, 0, -740); arch.rotation.y = 0.35; scene.add(arch);
  }
  // l'Aiguille (51 m)
  {
    const g = new THREE.CylinderGeometry(1.5, 10, 56, 9, 10); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + (nz(p.getX(i) * 0.2 + y * 0.05, p.getZ(i) * 0.2) - 0.5) * 0.5; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * 0.8); if (y > 22) p.setX(i, p.getX(i) + (y - 22) * 0.12); }
    const m = chalkMesh(g.toNonIndexed()); m.position.set(-5, 23, -820); scene.add(m);
  }
  // la petite ville au bord de la plage (fenêtres allumées)
  let townLights;
  { const houses = [], lights = [];
    for (let i = 0; i < 70; i++) { const x = 20 + R() * 260, z = 150 + R() * 140 + (x - 150) * 0.3; const w = 7 + R() * 9, h = 7 + R() * 8; houses.push({ x, z, w, h }); for (let k = 0; k < 2; k++) if (R() < 0.6) lights.push(x + (R() - 0.5) * w, 6 + R() * h, z - w * 0.45); }
    const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M('#8f8a80'), houses.length); const DD = new THREE.Object3D();
    houses.forEach((h, i) => { DD.position.set(h.x, 5, h.z); DD.scale.set(h.w, h.h, h.w); DD.rotation.set(0, 0.3, 0); DD.updateMatrix(); hm.setMatrixAt(i, DD.matrix); }); scene.add(hm);
    const rf = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 0.5, 4).translate(0, 0.25, 0), M('#3c3f46'), houses.length);
    houses.forEach((h, i) => { DD.position.set(h.x, 5 + h.h, h.z); DD.scale.set(h.w, h.w * 0.6, h.w); DD.rotation.set(0, 0.3 + Math.PI / 4, 0); DD.updateMatrix(); rf.setMatrixAt(i, DD.matrix); }); scene.add(rf);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
    townLights = new THREE.Points(lg, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, map: dotTex(), color: new THREE.Color(2.4, 1.8, 1.0), transparent: true, depthWrite: false })); scene.add(townLights);
    add(new THREE.BoxGeometry(320, 5, 120), M('#7d776c'), scene, 150, 2.5, 220, 0, 0.3, 0); }
  // deux barques sur les galets, des gens qui regardent la Lune
  const boatsG = [];
  for (const [x, z, ry, col] of [[14, 22, 0.5, '#2d5f8a'], [8, -2, 0.3, '#a8442f']]) { const g = new THREE.Group(); g.position.set(x, H(x, z) + 0.4, z); g.rotation.set(0.05, ry, 0.12); add(new THREE.BoxGeometry(2.2, 1.1, 7).translate(0, 0.5, 0), M(col), g); add(new THREE.BoxGeometry(1.8, 0.2, 6), M('#e9e3d2'), g, 0, 1.1, 0); scene.add(g); boatsG.push(g); }
  const people = [makePerson(scene, { shirt: '#2f3e57', pants: '#3b3b3b', hair: '#2a1d15' }), makePerson(scene, { shirt: '#c9b48a', pants: '#2f3a4f', hair: '#c9a35f' }), makePerson(scene, { shirt: '#b2453a', pants: '#2f3a4f', hair: '#5a3a22', s: 0.7 })];
  const ppl = [[18, 6], [19.2, 5.6], [20.1, 6.4]];

  // -------------------------------------------------------------------
  // LA MER (marées)
  // -------------------------------------------------------------------
  const sea = makeWater(scene, { w: 12000, d: 12000, z: -3000, seg: 400, color: '#10283a', foam: '#b9c9d2', opacity: 1 });
  sea.U.uChop.value = 0.35; sea.mat.roughness = 0.6; sea.mat.metalness = 0.0; sea.mat.color.set('#0c2030');
  { const far = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#10283a', roughness: 0.45 })); far.position.y = -3; scene.add(far); far.userData.sea = true; scene.userData.farSea = far; }

  // -------------------------------------------------------------------
  // LA LUNE : une grande texture détaillée, qui grossit, file dans le ciel, se fissure, éclate
  // -------------------------------------------------------------------
  const moonTex = canvasTex(1024, 1024, (g) => {
    const r = rng(1969);
    g.beginPath(); g.arc(512, 512, 500, 0, Math.PI * 2); g.closePath(); g.save(); g.clip();
    const gr = g.createRadialGradient(440, 440, 40, 512, 512, 520); gr.addColorStop(0, '#f2f0e8'); gr.addColorStop(1, '#c9c6bc'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
    for (const [x, y, rr] of [[380, 330, 150], [560, 300, 110], [600, 480, 130], [420, 580, 100], [660, 660, 80], [330, 460, 70], [520, 720, 60]]) { g.fillStyle = 'rgba(115,113,107,0.45)'; g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, r() * 3, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 420; i++) { const x = 30 + r() * 964, y = 30 + r() * 964, rr = 2 + r() ** 3 * 34; g.strokeStyle = `rgba(80,78,74,${0.25 + r() * 0.2})`; g.lineWidth = 1 + rr * 0.12; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(x - rr * 0.2, y - rr * 0.2, rr * 0.8, 0, Math.PI * 2); g.fill(); }
    // Tycho et ses rayons
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; for (let k = 0; k < 18; k++) { const a = r() * 6.28; g.beginPath(); g.moveTo(470, 820); g.lineTo(470 + Math.cos(a) * (200 + r() * 300), 820 + Math.sin(a) * (200 + r() * 300)); g.stroke(); }
    g.restore();
    const edge = g.createRadialGradient(512, 512, 420, 512, 512, 500); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = edge; g.beginPath(); g.arc(512, 512, 500, 0, Math.PI * 2); g.fill();
  });
  const crackTex = canvasTex(1024, 1024, (g) => {
    const r = rng(7); g.strokeStyle = 'rgba(255,170,90,1)'; g.lineCap = 'round';
    const branch = (x, y, a, len, w) => { if (len < 12) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); branch(x2, y2, a + (r() - 0.5) * 0.9, len * 0.75, w * 0.8); if (r() < 0.5) branch(x2, y2, a + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.6), len * 0.55, w * 0.6); };
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + r() * 0.4; branch(512 + Math.cos(a) * 60, 512 + Math.sin(a) * 60, a, 120, 8); }
    g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.arc(512, 512, 498, 0, Math.PI * 2); g.fill();
  });
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: new THREE.Color(1.5, 1.5, 1.55), depthWrite: false, fog: false, transparent: true }));
  const cracks = new THREE.Sprite(new THREE.SpriteMaterial({ map: crackTex, color: new THREE.Color(3, 2, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 }));
  const haloTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.25, 'rgba(210,225,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: '#cfdcff', blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  moon.renderOrder = 3; cracks.renderOrder = 4; halo.renderOrder = 2; scene.add(moon, cracks, halo);
  // morceaux de Lune (après la déchirure) et l'anneau : des points dans le ciel
  const NF = 9000, frag = [];
  for (let i = 0; i < NF; i++) frag.push({ th: (R() - 0.5) * 0.9, rad: 15500 + R() * 9000, w: R(), b: 0.4 + R() * 0.8, ring: i < 7000, s0: R() });
  const fragGeo = new THREE.BufferGeometry(); fragGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NF * 3), 3)); fragGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(NF * 3), 3));
  const fragPts = new THREE.Points(fragGeo, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  fragPts.frustumCulled = false; fragPts.renderOrder = 5; scene.add(fragPts);
  // météores : traînées lumineuses
  const NMET = 110, mets = [];
  const metGeo = new THREE.BufferGeometry(); metGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NMET * 6), 3)); metGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(NMET * 6), 3));
  for (let i = 0; i < NMET; i++) mets.push({ t0: T.rain + R() * 9.8, az: -40 + R() * 80, el0: 25 + R() * 40, len: 6 + R() * 14, dur: 0.5 + R() * 0.9, ang: -0.5 - R() * 0.9 });
  const metLines = new THREE.LineSegments(metGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  metLines.frustumCulled = false; scene.add(metLines);

  // position de la Lune dans le ciel (azimut/hauteur relatifs à la caméra) : elle file de plus en plus vite
  const moonDirAt = (t) => { const k = sm(T.near, T.crack, t); const az = -6 - 6 * k - 10 * sm(T.roche, T.crack + 2, t); const el = 14 + 9 * k + 5 * sm(T.roche, T.crack + 2, t); return dirAzEl(az, el); };
  // l'anneau (plan équatorial, vu depuis 49,7° N) : directions réelles calculées
  const ringDir = (theta, rad, out) => {
    const e = rad * Math.cos(theta), nn = rad * Math.sin(theta) * Math.sin(LAT), u = -R_E - rad * Math.sin(theta) * Math.cos(LAT);
    return out.copy(enu(e, nn, u)).normalize();
  };

  // marée à Étretat : le marnage actuel (~8 m) multiplié par la force des marées (limité à l'image pour rester lisible)
  // la phase avance de plus en plus vite quand la Lune tourne plus vite (intégrée une fois pour toutes)
  const PH = []; { let ph = 0; for (let i = 0; i <= T.duration * 100 + 1; i++) { const tt = i / 100; PH.push(ph); ph += (0.42 + 0.075 * Math.min(D0 / distAt(tt), 11)) / 100; } }
  function tideAt(t) {
    const f = D0 / distAt(t), amp = Math.min(4 * f ** 3, 140);
    const raw = amp * Math.sin(PH[clamp(Math.round(t * 100), 0, PH.length - 1)] - 13 * 0.5) * sm(10, 14, t);
    // à l'image : la mer monte jusqu'à quelques mètres sous la caméra (34 m), et se vide très loin à marée basse
    return clamp(raw, -95, 24) * (1 - sm(T.ring + 2, T.calm, t)) + 2 * sm(T.ring + 2, T.calm, t);
  }
  let tFlood = 1e9; for (let tt = 10; tt < T.duration; tt += 0.05) if (tideAt(tt) > 11) { tFlood = tt; break; }
  // les gens sur la plage : la nuit on ne voit que l'écran de leur téléphone (ils filment la Lune)… puis ils fuient vers l'escalier
  const NPH = 30, phones = [];
  for (let i = 0; i < NPH; i++) { const z = -545 - R() * 120, x = cliffX(z) + 14 + R() * 60; phones.push({ x, z, tr: 13.0 + R() * 2.2 + (x - cliffX(z)) * 0.01, v: 3.2 + R() * 1.5, ph: R() * 9 }); }
  const STAIRS = new THREE.Vector3(cliffX(-520) + 4, 0, -520);
  const phoneGeo = new THREE.BufferGeometry(); phoneGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NPH * 3), 3));
  const phonePts = new THREE.Points(phoneGeo, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, map: dotTex(), color: new THREE.Color(1.6, 1.9, 2.4), transparent: true, depthWrite: false }));
  phonePts.frustumCulled = false; scene.add(phonePts);
  // cabines de plage et barques : la mer les soulève, les emporte, puis les laisse échouées plus loin (simulation calculée d'avance)
  const stripe = (c) => canvasTex(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f1ede2' : c; g.fillRect(i * 8, 0, 8, 64); } });
  const floaters = [];
  for (let i = 0; i < 7; i++) {
    const z = -585 - i * 11 + R() * 4, x = cliffX(z) + 22 + R() * 10;
    const g = new THREE.Group(); scene.add(g);
    add(new THREE.BoxGeometry(3, 3, 3).translate(0, 1.5, 0), M('#ffffff', { map: stripe(['#2f6fae', '#c0392b', '#e1b12c', '#2f8f6a'][i % 4]), e: '#9aa6b8', ei: 0.35 }), g);
    add(new THREE.ConeGeometry(2.4, 1.2, 4).translate(0, 3.6, 0), M('#f1ede2'), g, 0, 0, 0, 0, Math.PI / 4, 0);
    floaters.push({ g, x, z, draft: 0.6, k: 0.9 + R() * 0.5 });
  }
  for (const [dz, col] of [[-630, '#2d5f8a'], [-648, '#a8442f']]) {
    const g = new THREE.Group(); scene.add(g); add(new THREE.BoxGeometry(2.4, 1.2, 7.5).translate(0, 0.6, 0), M(col), g); add(new THREE.BoxGeometry(2.0, 0.2, 6.4), M('#e9e3d2'), g, 0, 1.2, 0);
    floaters.push({ g, x: cliffX(dz) + 40, z: dz, draft: 0.4, k: 1.4 });
  }
  floaters.forEach((o) => {   // on rejoue la scène pas à pas : flotte si l'eau est assez haute, dérive avec le courant
    o.X = []; o.Y = []; o.Z = []; o.RY = []; o.RZ = [];
    let x = o.x, z = o.z, ry = R() * 0.6, rz = 0, prev = tideAt(0), wob = R() * 9;
    for (let i = 0; i <= T.duration * 20; i++) {
      const tt = i / 20, lvl = tideAt(tt), dl = lvl - prev; prev = lvl;
      const ground = H(x, z);
      if (lvl > ground + o.draft) {
        x += -dl * 0.55 * o.k + Math.sin(tt * 0.7 + wob) * 0.25; z += Math.cos(tt * 0.5 + wob) * 0.35 - Math.abs(dl) * 0.2;
        x = Math.max(x, cliffX(z) + 4); ry += 0.02 * Math.sin(tt + wob); rz = 0.12 * Math.sin(tt * 2.1 + wob);
        o.Y.push(lvl - o.draft);
      } else { rz *= 0.9; o.Y.push(ground); }
      o.X.push(x); o.Z.push(z); o.RY.push(ry); o.RZ.push(rz);
    }
  });

  // impacts au loin pendant la pluie de météores : lueurs orange à l'horizon
  const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, 'rgba(255,200,140,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const impacts = [];
  for (let i = 0; i < 14; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(3, 1.4, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 })); scene.add(sp); impacts.push({ sp, t0: T.rain + 1.2 + R() * 9, az: -50 + R() * 100, s: 0.6 + R() * 1.4 }); }

  // -------------------------------------------------------------------
  // IMAGE
  // -------------------------------------------------------------------
  const LOOK = new THREE.Vector3(-50, 28, -770);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), c3 = new THREE.Color();
  function update(t) {
    const d = distAt(t), f = D0 / d;                         // f : combien de fois plus près
    camera.position.copy(CAM).add(tmp.set(Math.sin(t * 0.2) * 0.3, Math.sin(t * 0.15) * 0.15, 0));
    camera.fov = 60; camera.updateProjectionMatrix();
    camera.lookAt(tmp2.copy(LOOK).add(tmp.set(0, 60 * sm(T.near, T.crack, t) - 15 * sm(T.rain + 3, T.calm, t), 0))); camera.updateMatrixWorld();
    sky.follow(camera);
    // --- la Lune
    const mdir = moonDirAt(t);
    const angR = Math.atan(R_MOON / d);
    const size = 2 * 800 * Math.tan(angR);
    const broken = sm(T.crack + 1.2, T.ring, t);
    moon.position.copy(mdir).multiplyScalar(800).add(camera.position); moon.scale.setScalar(size); moon.material.opacity = 1 - broken; moon.material.color.setScalar(lerp(1.5, 0.95, sm(1.5, 8, f)));
    cracks.position.copy(moon.position); cracks.scale.setScalar(size * 1.001); cracks.material.opacity = sm(T.crack - 0.6, T.crack + 0.8, t) * (1 - broken);
    halo.position.copy(moon.position); halo.scale.setScalar(size * 3.2 + 40); halo.material.opacity = (1 - broken) * lerp(0.9, 0.35, sm(1.5, 8, f));
    moonLight.position.copy(mdir).multiplyScalar(1000).add(camera.position); moonLight.target.position.copy(camera.position);
    moonLight.intensity = Math.min(1.8, 0.6 * Math.pow(f, 0.5)) * (1 - 0.7 * broken) + 0.3 * broken;
    renderer.toneMappingExposure = 1.3 - 0.25 * sm(1, 20, f);
    sky.u.uTintDir.value.copy(mdir); sky.u.uTint.value.setRGB(0.05, 0.07, 0.12); sky.u.uTintAmt.value = Math.min(0.55, 0.3 * Math.pow(f, 0.45)) * (1 - 0.6 * broken);
    sky.u.uStars.value = 1.1 / (1 + 0.05 * f);
    // --- les morceaux puis l'anneau
    {
      const pa = fragGeo.attributes.position.array, ca = fragGeo.attributes.color.array;
      const show = sm(T.crack + 0.8, T.crack + 2.2, t), ringK = sm(T.ring - 1, T.ring + 5, t);
      frag.forEach((p, i) => {
        // éclatement : autour de la position de la Lune, qui s'étale le long de l'orbite
        const spread = sm(T.crack + 0.8, T.ring + 4, t) * (0.25 + p.w);
        const dA = moonDirAt(t);
        tmp.copy(dA).multiplyScalar(800);
        const along = (p.th) * spread * 0.9, side = (p.w - 0.5) * spread * 0.12;
        const burst = tmp.clone().normalize().add(tmp2.set(along, side * 0.6 + along * 0.25, side).multiplyScalar(1)).normalize();
        let dir = burst;
        if (p.ring) {
          const th = -Math.PI / 2 + (p.s0 - 0.5) * 3.4 + t * 0.012;
          const rd = ringDir(th, p.rad, tmp2);
          dir = burst.lerp(rd, ringK).normalize();
        }
        const pos = dir.multiplyScalar(780).add(camera.position);
        pa[i * 3] = pos.x; pa[i * 3 + 1] = pos.y; pa[i * 3 + 2] = pos.z;
        const b = p.b * show * (p.ring ? 0.55 : 0.8) * (dir.y > -0.02 ? 1 : 0);
        ca[i * 3] = b; ca[i * 3 + 1] = b * 0.97; ca[i * 3 + 2] = b * 0.92;
      });
      fragGeo.attributes.position.needsUpdate = true; fragGeo.attributes.color.needsUpdate = true;
    }
    // --- météores
    {
      const pa = metGeo.attributes.position.array, ca = metGeo.attributes.color.array;
      mets.forEach((m, i) => {
        const u = (t - m.t0) / m.dur; const on = u > 0 && u < 1;
        const a = dirAzEl(m.az + Math.cos(m.ang) * m.len * u, m.el0 + Math.sin(m.ang) * m.len * u);
        const b = dirAzEl(m.az + Math.cos(m.ang) * m.len * Math.max(0, u - 0.35), m.el0 + Math.sin(m.ang) * m.len * Math.max(0, u - 0.35));
        a.multiplyScalar(700).add(camera.position); b.multiplyScalar(700).add(camera.position);
        pa.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
        const k = on ? Math.sin(Math.PI * u) * 3 : 0; ca.set([k * 1.2, k, k * 0.7, k * 0.3, k * 0.2, k * 0.12], i * 6);
      });
      metGeo.attributes.position.needsUpdate = true; metGeo.attributes.color.needsUpdate = true;
    }
    // --- la mer : marées de plus en plus fortes (limitées à l'image pour rester lisible)
    const tide = tideAt(t);
    sea.U.uLevel.value = tide; sea.U.uTime.value = t; sea.U.uChop.value = 0.35 + Math.min(1.2, f * 0.06) * (1 - sm(T.ring, T.calm, t)); scene.userData.farSea.position.y = sea.U.uLevel.value - 1.5;
    boatsG.forEach((b, i) => { b.visible = tide < 3.5 && t < tFlood; });
    townLights.material.opacity = 1 - sm(tFlood, tFlood + 0.6, t);
    {
      const a = phoneGeo.attributes.position.array;
      phones.forEach((p, i) => {
        const u = t - p.tr; let x = p.x, z = p.z, y;
        if (u > 0) { const dx = STAIRS.x - p.x, dz = STAIRS.z - p.z, L = Math.hypot(dx, dz), sgo = Math.min(1, u * p.v / L); x = p.x + dx * sgo; z = p.z + dz * sgo; y = H(x, z) + 1.3 + Math.max(0, u * p.v - L) * 0.45; if (u * p.v - L > 30) y = -1e5; }
        else y = H(x, z) + 1.4 + Math.sin(t * 1.3 + p.ph) * 0.05;
        if (y > -1e4 && y < tide + 0.2) y = -1e5;   // rattrapé par la mer
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      });
      phoneGeo.attributes.position.needsUpdate = true; phonePts.material.opacity = 0.85 + 0.15 * Math.sin(t * 9);
    }
    floaters.forEach((o) => { const i = clamp(Math.round(t * 20), 0, o.X.length - 1); o.g.position.set(o.X[i], o.Y[i], o.Z[i]); o.g.rotation.set(0, o.RY[i], o.RZ[i]); o.g.visible = t < T.ring; });
    impacts.forEach((m) => { const u = t - m.t0; const flash = u > 0 ? Math.exp(-u * 3) * 2 + 0.35 * sm(0, 1, u) * (1 - sm(T.calm, T.calm + 2, t)) : 0; m.sp.material.opacity = Math.min(1, flash); const dd = dirAzEl(m.az, 0.35); m.sp.position.copy(dd).multiplyScalar(4000).add(camera.position); m.sp.scale.set(260 * m.s, 130 * m.s, 1); });
    // les gens regardent la Lune, puis s'en vont quand la mer monte
    people.forEach((P, i) => { P.reset(); const leave = sm(15 + i * 0.3, 21, t); P.root.position.set(ppl[i][0] + leave * 40, H(ppl[i][0], ppl[i][1]), ppl[i][1] + leave * 60); P.root.rotation.y = lerp(Math.PI - 0.3, 0.6, sm(14.5, 15.5, t)); P.head.rotation.x = -0.4 * (1 - sm(14.5, 15.5, t)); if (leave > 0 && leave < 1) P.walk(t * 6 + i, 1); P.root.visible = leave < 0.95; });

    // --- HUD
    HUD.live(t, 'ÉTRETAT · CAM 01', t < T.half ? `22/09/2026 · 23:${pad(10 + Math.floor(t / 60))}:${pad(Math.floor(t) % 60)}` : 'SIMULATION');
    HUD.block(1, { label: 'DISTANCE DE LA LUNE', value: `${fr(Math.round(d / 100) * 100)} km`, sub: `TAILLE DANS LE CIEL ×${(f).toFixed(1).replace('.', ',')}`, color: f > 1.05 ? '#d6e2ff' : '#fff' });
    HUD.show2(true);
    const P = periodH(d);
    HUD.block(2, { label: 'FORCE DES MARÉES', value: `×${fr(Math.round(f ** 3))}`, sub: P > 48 ? `UN TOUR DE LA TERRE EN ${Math.round(P / 24)} JOURS` : `UN TOUR DE LA TERRE EN ${P.toFixed(1).replace('.', ',')} H`, color: f > 1.5 ? '#ffb15e' : '#fff' });
    if (t >= T.tides && t < T.near) HUD.block(2, { label: 'MARÉE À ÉTRETAT', value: `${fr(Math.round(8 * f ** 3))} m`, sub: 'ENTRE HAUTE ET BASSE MER · AUJOURD’HUI : 8 M', color: '#ffb15e' });
    if (t > T.crack + 1) HUD.block(2, { label: 'FORCE DES MARÉES', value: '—', sub: 'LA LUNE N’EXISTE PLUS', color: '#ff6b5e' });
    HUD.hook(t, 'Et si la Lune se<br><em>rapprochait</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.reticle('lune', tmp.copy(mdir).multiplyScalar(800).add(camera.position), camera, 'LUNE', sm(3.6, 4.2, t) * (1 - sm(7.4, 8.0, t)), 70);
    HUD.reticle('aig', tmp.set(-5, 46, -820), camera, 'L’AIGUILLE · 51 M', sm(14, 14.6, t) * (1 - sm(17.2, 17.8, t)), 80);
    HUD.end(t, T.endCard, { kicker: 'LA LUNE S’ÉLOIGNE DE NOUS DE 3,8 CM PAR AN', q: 'Tu préfères la Lune<br>ou des anneaux ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

// =====================================================================
//  ÉPISODE : « Et si tu te protégeais vraiment à la manif ? » — place de la Bastille, Paris (série 17 octobre)
//  Deux prises de la même scène : sans protection, puis (on rembobine) équipé. Arrêt sur image avec zoom de la caméra.
//  Faits (sources dans la légende) :
//   - gaz CS : poudre très irritante, pire sur les zones humides (AlloDocteurs ; INSPQ) ;
//     yeux qui brûlent et pleurent, vue brouillée, nez et gorge qui brûlent, toux, sensation d'étouffement, peau qui
//     brûle surtout là où on transpire ; effets en quelques secondes, de quelques minutes à quelques heures ; crises
//     d'asthme graves possibles (Minnesota Poison Control, « Crowd Control Agents », 2026).
//   - lunettes étanches (ski, plongée), masque FFP2, pas de lentilles (AlloDocteurs) ; rincer à l'eau ou au sérum
//     physiologique, air libre, douche et shampoing, vêtements dans un sac (AlloDocteurs, Minnesota Poison Control).
//   - lait : aucune étude ne montre qu'il fait mieux que l'eau ; seule étude, sur le gaz poivre : Barry et al., 2008 (cité par
//     Minnesota Poison Control). (Stopyra et al. 2018 teste le shampoing pour bébé, pas le lait.)
//   - grenade de désencerclement : 165 dB (ACAT, rapport sur les armes du maintien de l'ordre).
//   - art. 431-9-1 du code pénal : dissimuler son visage sans motif légitime en manifestation (troubles commis ou
//     risquant de l'être) : 1 an d'emprisonnement et 15 000 € d'amende ; la cour d'appel de Rennes (7/09/2021) a admis
//     la protection contre les gaz lacrymogènes comme motif, décision isolée.
// =====================================================================
import { THREE, createStage, makeSky, HUD, sm, lerp, clamp, rng, dirAzEl, pad } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople, loadPolice } from '../../lib-people.js';
import { makeCrowd } from '../../lib-multiply.js';
import { makeBastille, makeGas, goggles, ffp2 } from '../../lib-manif.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';

const Q = new URLSearchParams(location.search);
// --- la chorégraphie (temps « local » d'une prise) : la même pour les deux prises
const C = { fire: 8.4, land: 9.8, hit: 10.9, freeze: 14.0, walk: 14.6, endA: 22.0 };
// --- le temps de la scène : prise A (sans rien), rembobinage, prise B (équipé)
const RW0 = 22.0, RW1 = 24.0, B0 = 3.0;                       // la prise B reprend à 3 s
const sceneEnd = 63.0;
const T = { hookOut: 3.0, rewind: RW0, takeB: RW1, endCard: 59.0, duration: sceneEnd };
const take = (ts) => (ts < RW0 ? { B: false, a: ts } : ts < RW1 ? { B: false, a: lerp(RW0, B0 + 1, sm(RW0, RW1, ts)), rw: (ts - RW0) / (RW1 - RW0) } : { B: true, a: B0 + (ts - RW1) });
const tsB = (a) => RW1 + (a - B0);                            // temps de scène d'un instant de la prise B
const SUBS = [
  [3.1, 6.6, 'Imagine : samedi 17 octobre, dans une manif à Paris.'],
  [6.8, 9.6, 'Toi, au premier rang. Sans aucune protection.'],
  [10.0, 13.7, 'Une grenade lacrymogène : elle libère du gaz CS.'],
  [14.3, 17.8, 'Une poudre très irritante, surtout là où c’est humide : tes larmes, ta sueur.'],
  [18.0, 21.6, 'Ça arrive en quelques secondes, et ça peut durer des heures.'],
  [24.2, 27.8, 'Même manif. Mais cette fois, tu es équipé.'],
  [28.0, 31.4, 'Lunettes étanches, masque FFP2, bouchons d’oreilles, sérum.'],
  [31.7, 34.8, 'Le gaz arrive. Cette fois, tu gardes les yeux ouverts.'],
  [35.3, 38.9, 'Touché ? Va à l’air libre, rince à l’eau ou au sérum, ne frotte pas.'],
  [39.1, 42.4, 'Et le lait ? Aucune étude ne montre qu’il fait mieux que l’eau.'],
  [42.6, 45.4, 'Attention : s’il y a des troubles, te cacher le visage peut être un délit.'],
  [45.6, 49.0, 'Sans motif légitime : jusqu’à 1 an de prison et 15 000 € d’amende.'],
  [49.2, 52.4, 'Une cour d’appel a déjà admis la protection contre les gaz. Ce n’est pas garanti.'],
  [52.6, 55.6, 'En rentrant : douche, shampoing, et tes vêtements dans un sac.'],
  [55.8, 58.7, 'Et si tu es asthmatique, le gaz peut déclencher une crise grave.'],
];

export default async function () {
  const stage = createStage({ fov: 66, far: 3000, bloom: [0.16, 0.4, 0.93], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 0.95;
  document.documentElement.style.setProperty('--accent', '#9fd3ff');
  const SUN_DIR = dirAzEl(215, 27);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.05, 0.12, 0.30], dayHor: [0.48, 0.55, 0.63], stars: 0, sunGlow: 0.35 });
  scene.fog = new THREE.Fog('#aab5c0', 120, 900);
  const sun = new THREE.DirectionalLight('#ffeedd', 2.6); sun.position.copy(SUN_DIR).multiplyScalar(120).add(new THREE.Vector3(6, 0, 50)); sun.target.position.set(6, 0, 50);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 20, far: 300 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c6d6ea', '#7d7466', 0.95); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22;

  const PEOPLE = await loadPeople(renderer), COPS = await loadPolice();
  const BAS = makeBastille(scene, renderer, { PEOPLE });

  // --- toi, et ceux qui sont tout près de toi (de vrais personnages)
  const CAMP = new THREE.Vector3(10, 5, 95);
  const YOU = new THREE.Vector3(6, 0, 70.8);   // au premier rang, face à la ligne de police (et à la caméra, placée derrière elle)
  const you = PEOPLE.make({ outfit: 3, shadows: true }); you.root.position.copy(YOU); you.root.rotation.y = 0.12; scene.add(you.root);
  const gog = you.attach(goggles(), 'eyes', { dz: 0.01 }), mask = you.attach(ffp2(), 'mouth', { dz: 0.005, dy: -0.01 });
  const R = rng(17), LAND = new THREE.Vector3(8, 0, 66.6);
  const near = [];
  for (let i = 0; i < 14; i++) {
    const front = i < 6, p0 = front ? new THREE.Vector3(YOU.x + (i % 2 ? 1 : -1) * (1.2 + Math.floor(i / 2) * 1.3 + R() * 0.4), 0, YOU.z - R() * 0.5)   // le premier rang, à côté de toi
      : new THREE.Vector3(YOU.x + (R() - 0.5) * 9, 0, YOU.z - 1.2 - R() * 4.5);                                                                     // derrière toi
    if (p0.distanceTo(LAND) < 1.4) { i--; continue; }
    const P = PEOPLE.make({ outfit: Math.floor(R() * 8), shadows: i < 6 }); P.root.position.copy(p0); scene.add(P.root);
    const away = p0.clone().sub(LAND).setY(0).normalize(); away.z = Math.min(away.z, 0.15); away.x += Math.sign(away.x || 1) * 0.3; away.normalize();   // on fuit sur les côtés, pas vers la police
    near.push({ P, p0, face: 0.1 + (R() - 0.5) * 0.9, away, t0: C.hit - 0.6 + p0.distanceTo(LAND) * 0.15 + R() * 0.4, sp: 3.2 + R() * 1.2, ph: R() * 6 });
  }
  // --- la foule (des « photos découpées » : personne à moins de 6 m de toi)
  makeCrowd(scene, PEOPLE, { count: 7000, t0: -100, t1: -99, spacing: 0.82, cx: 2, cz: 33, near: 0, atlas: PEOPLE.atlas(30, 192, 384), fog: { color: new THREE.Color('#aab5c0'), near: 120, far: 900 },
    exclude: (x, z) => Math.hypot(x, z) < 19 || z > 70.6 || (Math.abs(x - YOU.x) < 5.5 && z > YOU.z - 6) }).update(0);   // le premier rang s'arrête à 12 m de la police
  // --- la ligne de police (devant l'Opéra, à droite)
  const cops = [];
  for (let i = 0; i < 12; i++) { const c = COPS.make({ shadows: false, phase: i * 0.37 }); c.root.position.set(-8 + i * 1.75 + (i % 2) * 0.2, 0, 82.5 + (i % 2) * 0.5); c.root.rotation.y = Math.PI + (R() - 0.5) * 0.15; scene.add(c.root); cops.push(c); }   // face à la foule, bouclier devant
  // --- le gaz (même tir dans les deux prises)
  const gas = makeGas(scene, { from: new THREE.Vector3(9.5, 2.3, 82.5), to: LAND, spread: 1.35, tFire: C.fire, tLand: C.land, wind: new THREE.Vector3(-0.35, 0, 0.6) });

  // --- l'arrêt sur image, avec zoom de la caméra de surveillance
  const pt = (n) => () => you.point(n);
  const FZ = makeFreeze([
    { at: C.freeze, dur: 5.6, title: 'ARRÊT SUR IMAGE · ZOOM ×8 · TON CORPS', tags: [
      { at: pt('eyes'), title: 'YEUX', lines: ['ils brûlent et pleurent,', 'ta vue se brouille'], risk: 'grave', side: 'right', dy: -40 },
      { at: pt('throat'), title: 'NEZ · GORGE', lines: ['ça brûle,', 'tu tousses'], risk: 'mal', side: 'left', dy: -30 },
      { at: pt('lungs'), title: 'POUMONS', lines: ['tu as l’impression', 'd’étouffer'], risk: 'mal', side: 'right', dy: 60 },
      { at: pt('lArm'), title: 'PEAU', lines: ['elle brûle là', 'où tu transpires'], risk: 'bof', side: 'left', dy: 40 } ] },
    { at: tsB(C.freeze), dur: 6.0, title: 'ARRÊT SUR IMAGE · ZOOM ×8 · TON CORPS', tags: [
      { at: pt('eyes'), title: 'YEUX', lines: ['lunettes étanches,', 'pas de lentilles'], risk: 'ok', side: 'right', dy: -40 },
      { at: pt('mouth'), title: 'NEZ · BOUCHE', lines: ['le masque FFP2 arrête', 'une partie de la poudre'], risk: 'bof', side: 'left', dy: -20 },
      { at: pt('ear'), title: 'OREILLES', lines: ['des bouchons : certaines', 'grenades font 165 dB'], risk: 'ok', side: 'right', dy: 60 },
      { at: pt('rHand'), title: 'SÉRUM', lines: ['pour rincer tes yeux,', 'sans frotter'], risk: 'ok', side: 'left', dy: 30 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // --- le rembobinage (calque 2D : bandes de bruit, ◀◀)
  const rwc = document.createElement('canvas'); rwc.width = 1080; rwc.height = 1920; rwc.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  document.getElementById('hud').appendChild(rwc); const rg = rwc.getContext('2d');
  function drawRewind(k, t) {
    rg.clearRect(0, 0, 1080, 1920); rwc.style.visibility = k > 0 && k < 1 ? 'visible' : 'hidden'; if (k <= 0 || k >= 1) return;
    const a = Math.sin(Math.PI * k), r = rng(Math.floor(t * 30) + 3);
    for (let i = 0; i < 9; i++) { const y = r() * 1920, h = 6 + r() * 40; rg.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.18 * a})`; rg.fillRect(0, y, 1080, h); }
    rg.globalAlpha = Math.min(1, a * 1.6); rg.fillStyle = '#fff'; rg.font = '800 64px Inter'; rg.fillText('◀◀ ON REMBOBINE', 62, 560); rg.globalAlpha = 1;
  }

  // --- la caméra de surveillance (fixe) : au coin du boulevard, à 5 m de haut
  const LOOK = new THREE.Vector3(2.5, -1.6, 0);   // la caméra regarde un peu vers le bas, au-dessus de la ligne de police
  const W = 720, H = 1280, tmp = new THREE.Vector3();
  const coughPose = (k, ph) => ({ Spine: [['x', (0.36 + 0.05 * Math.sin(ph)) * k]], Spine1: [['x', 0.15 * k]], Head: [['x', (0.22 + 0.06 * Math.sin(ph)) * k]],   // penché en avant, les mains sur le visage
    LeftArm: [['x', -0.9 * k], ['y', -0.35 * k]], RightArm: [['x', -0.9 * k], ['y', 0.35 * k]], LeftForeArm: [['x', -1.75 * k]], RightForeArm: [['x', -1.75 * k]] });

  function update(t) {
    const ts = FZ.sceneT(t), { B, a, rw } = take(ts), frozen = !!FZ.active(t);
    // la scène
    gas.update(a, { fade: frozen ? 0.16 : (Q.get('nogas') ? 0 : 1) });
    for (const c of cops) c.update(a);
    // toi
    gog.visible = mask.visible = B;
    const inGas = sm(C.hit - 0.4, C.hit + 0.6, a);
    if (!B) { const k = inGas; if (k > 0) you.do(coughPose(k, a * 9)); else you.stand(); you.root.position.copy(YOU); you.root.rotation.y = 0.12; }
    else {
      const w = clamp((a - C.walk) / 6.5), d = w * 6.5 * 1.25;
      if (a > C.walk) { you.walk((a - C.walk) * 6.5, sm(C.walk, C.walk + 0.6, a)); } else you.stand();
      const dir = new THREE.Vector3(-1, 0, 0.12).normalize(); you.root.position.copy(YOU).addScaledVector(dir, d);   // tu sors du nuage par le côté
      you.root.rotation.y = lerp(0.12, Math.atan2(dir.x, dir.z), sm(C.walk - 0.3, C.walk + 0.5, a));
    }
    // les voisins : ils fuient le nuage
    for (const n of near) {
      const u = a - n.t0;
      if (u <= 0) { n.P.stand(0.05 * Math.sin(n.ph + a)); n.P.root.position.copy(n.p0); n.P.root.rotation.y = n.face; continue; }
      const run = Math.min(u, 3.5), dist = n.sp * (run - 0.25 * (1 - Math.exp(-run * 4))) + Math.max(0, u - 3.5) * 1.2;
      n.P.root.position.copy(n.p0).addScaledVector(n.away, dist); n.P.root.rotation.y = lerp(n.face, Math.atan2(n.away.x, n.away.z), sm(0, 0.35, u));
      if (u < 3.5) n.P.run(u * 10 + n.ph, sm(0, 0.3, u)); else n.P.walk(u * 6 + n.ph);
    }
    // la caméra, et le zoom pendant l'arrêt sur image
    camera.position.copy(CAMP); camera.lookAt(LOOK); camera.clearViewOffset();
    const A = FZ.active(t);
    if (A) {
      camera.updateMatrixWorld(); tmp.copy(you.point('chest')).add(new THREE.Vector3(0, -0.12, 0)).project(camera);
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, 8, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    stage.renderer.domElement.style.filter = rw ? `contrast(1.25) saturate(0.6) hue-rotate(${(Math.sin(t * 40) * 8).toFixed(1)}deg)` : '';

    // --- textes
    HUD.hook(t, 'Et si tu te <em>protégeais</em> vraiment à la manif ?', T.hookOut);
    const clock = 15 * 3600 + 24 * 60 + 10 + a;
    HUD.live(t, 'PARIS · PLACE DE LA BASTILLE · CAM 03', `17/10/2026 · ${pad(Math.floor(clock / 3600))}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}${B ? ' · REPRISE' : ''}`, 'SIMULATION');
    HUD.block(1, { label: 'SECONDES DANS LE GAZ', value: String(Math.floor(Math.max(0, B ? Math.min(a, C.walk + 3) - C.hit : a - C.hit))), sub: 'GAZ CS · LACRYMOGÈNE', color: a > C.hit ? (B ? '#4cd964' : '#ff9f0a') : '#fff' });
    HUD.block(2, { label: 'TA PROTECTION', value: B ? '4 / 4' : '0 / 4', sub: B ? 'LUNETTES · MASQUE · BOUCHONS · SÉRUM' : 'RIEN', color: B ? '#4cd964' : '#ff3b30' }); HUD.show2(true);
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    // le viseur « TOI » (sauf pendant les arrêts et le rembobinage)
    camera.updateMatrixWorld();
    HUD.reticle('you', you.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'TOI', (frozen || rw) ? 0 : sm(4.0, 4.6, ts) * (1 - sm(FZ.realT(T.endCard) - 1, FZ.realT(T.endCard), t)), 90);
    HUD.subs(t, SUBS_V);
    drawRewind(rw ?? 0, t);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : CENTRE ANTIPOISON DU MINNESOTA · ALLODOCTEURS · CODE PÉNAL, ART. 431-9-1', q: 'Si tu y vas samedi,<br>tu emportes quoi ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
    if (Q.get('dbg') === 'cops') { camera.clearViewOffset(); camera.position.set(3, 1.8, 76); camera.lookAt(3, 1.0, 83); camera.updateProjectionMatrix(); }
    if (Q.get('dbg') === 'close') { camera.clearViewOffset(); camera.position.copy(you.root.position).add(new THREE.Vector3(0.6, 1.5, 2.6)); camera.lookAt(you.root.position.clone().add(new THREE.Vector3(0, 1.2, 0))); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, C, subs: SUBS_V, freezes: FZ.events(), rewind: [FZ.realT(RW0), FZ.realT(RW1)], takeB: FZ.realT(RW1), B0,
    fireA: FZ.realT(C.fire), landA: FZ.realT(C.land), fireB: FZ.realT(tsB(C.fire)), landB: FZ.realT(tsB(C.land)), end: FZ.realT(T.endCard) }) };
}

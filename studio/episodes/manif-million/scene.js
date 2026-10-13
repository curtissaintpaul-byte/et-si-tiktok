// =====================================================================
//  ÉPISODE : « Et si 1 million de personnes manifestaient à Paris ? » — place de la Bastille (série 17 octobre)
//  Effet multiplication : la foule passe de quelques milliers à 1 million, la caméra s'envole pour la montrer, puis revient.
//  Deux arrêts sur image : ton corps dans la foule, puis côté police (ce que dit la loi).
//  Faits (sources dans la légende) :
//   - à 2 personnes par m², 1 million = 500 000 m² (calcul) = un boulevard de 30 m de large sur 16,7 km.
//   - densité : vers 5 /m² le risque d'écrasement commence ; à 6-7 /m² on ne bouge plus volontairement ; vers 10 /m² on
//     ne peut plus respirer même debout ; asphyxie par compression (Haghani & Lovreglio 2022 ; Fruin 2002).
//   - un corps humain dégage en moyenne ~100 W → 1 million de corps ≈ 100 MW.
//   - 11 janvier 2015 : plus d'un million de personnes à Paris (estimations), jusqu'à 3,7 millions en France (gouvernement).
//   - 10 septembre 2025 : 80 000 policiers et gendarmes mobilisés en France (annonce du ministre de l'Intérieur ; Public Sénat).
//   - déclaration : par les organisateurs, en mairie ou en préfecture, 3 jours francs avant au moins, 15 au plus (service-public.fr).
//   - dispersion : annonce puis 2 sommations (R.211-11 CSI, art. 431-3 code pénal), ou 3 fusées rouges sans haut-parleur ;
//     rester après les sommations : 1 an de prison et 15 000 € (art. 431-4 code pénal).
//   - 7 mars 2023 (retraites), Paris : 81 000 selon la préfecture de police, 700 000 selon la CGT ; France : 1,28 million
//     (Intérieur) contre 3,5 millions (CGT) (Europe 1).
//   - une manifestation se déclare en mairie ou en préfecture au moins 3 jours francs avant (art. L.211-2 CSI).
// =====================================================================
import { THREE, createStage, makeSky, HUD, sm, lerp, clamp, rng, dirAzEl, pad, fr } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople, loadPolice } from '../../lib-people.js';
import { makeCrowd, makeEquation } from '../../lib-multiply.js';
import { makeBastille, makeCity, makeCarpets } from '../../lib-manif.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';

const N0 = 4200, N1 = 1_000_000, M0 = 7.0, M1 = 19.0, SQ = 20000;
const Nat = (t) => (t < M0 ? N0 : t > M1 ? N1 : Math.round(N0 * Math.pow(N1 / N0, (t - M0) / (M1 - M0))));
const tOf = (n) => M0 + (M1 - M0) * Math.log(n / N0) / Math.log(N1 / N0);
const T = { hookOut: 3.0, rise: M0, aerial: 16.0, back: 21.0, down: 25.5, youFreeze: 27.5, copFreeze: 30.6, endCard: 51.0, duration: 55.0 };
const SUBS = [
  [3.2, 6.8, 'Imagine : place de la Bastille, toi et quelques milliers de personnes.'],
  [7.0, 10.8, 'Maintenant, imagine 1 million.'],
  [11.0, 15.0, 'À 2 personnes par m², il faut 500 000 m².'],
  [15.2, 19.4, 'Un boulevard de 30 m de large, rempli sur 17 km.'],
  [19.6, 23.6, 'Le 11 janvier 2015, après les attentats, Paris a dépassé le million.'],
  [24.0, 27.3, 'Et au milieu, ton corps sent la différence.'],
  [27.8, 30.4, 'Côté sécurité, maintenant.'],
  [31.0, 34.8, 'Et qui compte ? Le 7 mars 2023 à Paris, 81 000 selon la police…'],
  [35.0, 38.6, '…et 700 000 selon la CGT. Presque 9 fois plus.'],
  [38.8, 42.4, 'En France ce jour-là : 1,28 million selon l’Intérieur, 3,5 millions selon la CGT.'],
  [42.6, 46.4, 'Une manif doit être déclarée par ses organisateurs, au moins 3 jours francs avant.'],
  [46.6, 50.7, 'Samedi 17 octobre, personne ne sait encore combien il y aura de monde.'],
];
// les rues qui partent de la place (angle depuis +Z vers +X, largeur, longueur) : 480 000 m² au total
const STREETS = [[0.75, 26, 2500], [1.45, 30, 2700], [2.6, 24, 2300], [3.25, 32, 2600], [3.95, 26, 2400], [4.6, 30, 2500], [5.35, 28, 2300]].map(([a, w, len]) => ({ a, w, len, r0: 80 }));

export default async function () {
  const stage = createStage({ fov: 66, far: 9000, bloom: [0.16, 0.4, 0.93], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 0.95;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const SUN_DIR = dirAzEl(215, 27);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.05, 0.12, 0.30], dayHor: [0.48, 0.55, 0.63], stars: 0, sunGlow: 0.35 });
  const FOGC = new THREE.Color('#aab5c0'); scene.fog = new THREE.Fog(FOGC, 120, 3200);
  const sun = new THREE.DirectionalLight('#ffeedd', 2.6); sun.position.copy(SUN_DIR).multiplyScalar(160).add(new THREE.Vector3(6, 0, 70)); sun.target.position.set(6, 0, 70);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 20, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c6d6ea', '#7d7466', 0.95); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22;

  const PEOPLE = await loadPeople(renderer), COPS = await loadPolice();
  makeBastille(scene, renderer, { PEOPLE, streets: STREETS });
  makeCity(scene, [...STREETS, { a: 0.105, w: 44, len: 900, r0: 80 }], { size: 6000, step: 50 });   // (+ le boulevard de la caméra, sans foule : la police le tient)
  const carpets = makeCarpets(scene, STREETS, { density: 2 });

  // --- toi, au premier rang, serré entre les autres
  const CAMP = new THREE.Vector3(10, 5, 95), LOOK = new THREE.Vector3(2.5, -1.6, 0);
  const YOU = new THREE.Vector3(6, 0, 70.6);
  const you = PEOPLE.make({ outfit: 3, shadows: true }); you.root.position.copy(YOU); you.root.rotation.y = 0.12; scene.add(you.root);
  const R = rng(23), near = [];
  for (let i = 0; i < 16; i++) {
    const front = i < 6, p0 = front ? new THREE.Vector3(YOU.x + (i % 2 ? 1 : -1) * (0.55 + Math.floor(i / 2) * 0.6 + R() * 0.15), 0, YOU.z - R() * 0.3)
      : new THREE.Vector3(YOU.x + (R() - 0.5) * 4.5, 0, YOU.z - 0.55 - R() * 2.6);
    const P = PEOPLE.make({ outfit: Math.floor(R() * 8), shadows: i < 6 }); P.root.position.copy(p0); P.root.rotation.y = 0.1 + (R() - 0.5) * 0.8; scene.add(P.root);
    near.push({ P, ph: R() * 6 });
  }
  // --- la foule de la place : 20 000 « photos découpées », qui apparaissent avec le compteur
  const OPERA = new THREE.Vector2(78, -38);
    // la foule grandit autour de toi
  const crowd = makeCrowd(scene, PEOPLE, { count: SQ, spacing: 0.7, cx: YOU.x, cz: YOU.z - 2, near: 0, reach: 2.2, atlas: PEOPLE.atlas(30, 192, 384), fog: { color: FOGC, near: 120, far: 3200 },
    appearAt: (i) => (i < N0 ? -100 : tOf(i)),
    exclude: (x, z) => Math.hypot(x, z) < 19 || Math.hypot(x, z) > 80 || z > 70.4 || Math.hypot(x - OPERA.x, z - OPERA.y) < 45 || (Math.abs(x - YOU.x) < 3.2 && z > YOU.z - 3.4) });
  // --- la ligne de police (devant la caméra, dos à nous)
  const cops = [];
  for (let i = 0; i < 12; i++) { const c = COPS.make({ shadows: false, phase: i * 0.37 }); c.root.position.set(-8 + i * 1.75 + (i % 2) * 0.2, 0, 82.5 + (i % 2) * 0.5); c.root.rotation.y = Math.PI + (R() - 0.5) * 0.15; scene.add(c.root); cops.push(c); }
  const cop = cops[10];   // celui qui est juste devant la caméra
  const copPt = (bone, up = 0, side = 0) => () => { cop.body.updateMatrixWorld(true); const b = cop.body.getObjectByName('mixamorig' + bone); return b.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(side, up, 0)); };

  // --- les arrêts sur image
  const pt = (n) => () => you.point(n);
  const FZ = makeFreeze([
    { at: T.youFreeze, dur: 6.0, title: 'ARRÊT SUR IMAGE · ZOOM ×8 · TON CORPS', zoom: { z: 8, who: 'you' }, tags: [
      { at: pt('chest'), title: 'POITRINE', lines: ['à 5 personnes par m²,', 'la pression commence'], risk: 'mal', side: 'right', dy: -40 },
      { at: pt('head'), title: 'CHALEUR', lines: ['ton corps dégage ~100 W :', '1 million, c’est 100 MW'], risk: 'bof', side: 'left', dy: -60 },
      { at: pt('lungs'), title: 'RESPIRATION', lines: ['vers 10 par m², on ne peut', 'plus respirer, même debout'], risk: 'grave', side: 'right', dy: 70 },
      { at: pt('lKnee'), title: 'JAMBES', lines: ['à 6 ou 7 par m², tu ne', 'choisis plus où tu vas'], risk: 'mal', side: 'left', dy: 20 } ] },
    { at: T.copFreeze, dur: 6.4, title: 'ARRÊT SUR IMAGE · ZOOM ×3 · CÔTÉ POLICE', zoom: { z: 3, who: 'cop' }, tags: [
      { at: copPt('Head', 0.1), title: 'EFFECTIFS', lines: ['80 000 policiers et gendarmes', 'mobilisés le 10 septembre 2025'], risk: 'info', side: 'right', dy: 0 },
      { at: copPt('Spine2'), title: 'SOMMATIONS', lines: ['pour disperser : une annonce,', 'puis 2 sommations'], risk: 'info', side: 'left', dy: -50 },
      { at: copPt('RightHand'), title: 'SANS HAUT-PARLEUR', lines: ['3 fusées rouges', 'remplacent les sommations'], risk: 'info', side: 'right', dy: 60 },
      { at: copPt('LeftLeg'), title: 'LA LOI', lines: ['rester après les sommations :', '1 an de prison, 15 000 €'], risk: 'mal', side: 'left', dy: 40 } ] },
  ]);
  T.duration = 55.0 + FZ.total;
  const SUBS_V = FZ.subs(SUBS);
  const eq = makeEquation([{ label: 'MANIFESTANTS', value: '1 000 000' }, '÷', { label: 'PAR M²', value: '2' }, '=', { label: 'SURFACE', value: '500 000 m²', color: '#ffcf6b' }]);

  // --- la caméra : fixe, sauf pendant l'effet multiplication (elle s'envole, puis revient)
  const AER = [new THREE.Vector3(110, 400, 420), new THREE.Vector3(0, 0, -80)], AER2 = [new THREE.Vector3(70, 440, 450), new THREE.Vector3(0, 0, -110)];
  const W = 720, H = 1280, tmp = new THREE.Vector3();
  function camAt(ts) {
    if (ts < T.rise || ts > T.down) return [CAMP, LOOK];
    const lp = (a, b, k) => a.clone().lerp(b, k);
    if (ts < T.aerial) { const k = sm(T.rise, T.aerial, ts), k2 = sm(T.rise, T.aerial - 2, ts); return [lp(CAMP, AER[0], k * k), lp(LOOK, AER[1], k2)]; }
    if (ts < T.back) { const k = (ts - T.aerial) / (T.back - T.aerial); return [lp(AER[0], AER2[0], k), lp(AER[1], AER2[1], k)]; }
    const k = sm(T.back, T.down, ts); return [lp(AER2[0], CAMP, 1 - (1 - k) * (1 - k)), lp(AER2[1], LOOK, sm(T.back + 1, T.down, ts))];
  }

  function update(t) {
    const ts = FZ.sceneT(t), A = FZ.active(t);
    const N = Nat(ts);
    crowd.update(ts, { light: 1, fogNear: 120, fogFar: 3200 });
    carpets.set(clamp((N - SQ) / (N1 - SQ)));
    for (const c of cops) c.update(ts);
    you.stand(0.02 * Math.sin(ts * 1.3));
    for (const n of near) n.P.stand(0.04 * Math.sin(ts * 1.1 + n.ph));
    // la caméra, et le zoom pendant les arrêts
    const [cp, ct] = camAt(ts); camera.position.copy(cp); camera.lookAt(ct); camera.clearViewOffset();
    if (A) {
      const { z, who } = A.f.zoom, k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      camera.updateMatrixWorld();
      if (who === 'you') tmp.copy(you.point('chest')).add(new THREE.Vector3(0, -0.12, 0)); else tmp.copy(copPt('Spine1')());
      tmp.project(camera);
      zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, z, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);
    const hk = clamp((camera.position.y - 5) / 300); scene.fog.near = lerp(120, 450, hk); scene.fog.far = lerp(3200, 5200, hk);
    const high = ts > T.rise + 1.5 && ts < T.down - 1.5;

    // --- textes
    HUD.hook(t, 'Et si <em>1 million</em> de personnes manifestaient à Paris ?', T.hookOut);
    const clock = 15 * 3600 + 31 * 60 + ts;
    HUD.live(t, high ? 'VUE AÉRIENNE' : 'PARIS · PLACE DE LA BASTILLE · CAM 03', high ? `${fr(Math.round(camera.position.y))} M D’ALTITUDE` : `17/10/2026 · ${pad(Math.floor(clock / 3600))}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}`, 'SIMULATION');
    const countUp = (a, v) => Math.round(v * sm(a, a + 1.6, ts));
    if (ts < 30.8) { HUD.block(1, { label: 'MANIFESTANTS', value: fr(N), sub: N >= N1 ? 'À PARIS · SIMULATION' : 'PLACE DE LA BASTILLE', color: N >= N1 ? '#ffcf6b' : '#fff' }); HUD.block(2, { label: 'PLACE NÉCESSAIRE', value: `${fr(Math.round(N / 2))} m²`, sub: 'À 2 PERSONNES PAR M²' }); HUD.show2(ts > M0); }
    else if (ts < 42.5) { HUD.block(1, { label: 'SELON LA POLICE', value: fr(countUp(31.0, 81000)), sub: 'PARIS · 7 MARS 2023', color: '#9fd3ff' }); HUD.block(2, { label: 'SELON LA CGT', value: fr(countUp(35.0, 700000)), sub: 'PARIS · 7 MARS 2023', color: '#ffcf6b' }); HUD.show2(ts > 34.8); }
    else { HUD.block(1, { label: 'MANIFESTANTS', value: '?', sub: 'SAMEDI 17 OCTOBRE' }); HUD.show2(false); }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    eq.opacity(sm(15.0, 15.6, ts) * (1 - sm(23.0, 23.6, ts)) * (A ? 0 : 1));
    camera.updateMatrixWorld();
    HUD.reticle('you', you.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, 'TOI', (A || ts > T.rise + 0.4 && ts < T.down) ? 0 : sm(3.6, 4.2, ts) * (1 - sm(FZ.realT(T.endCard) - 1, FZ.realT(T.endCard), t)), 90);
    HUD.subs(t, SUBS_V);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : MINISTÈRE DE L’INTÉRIEUR · CODE PÉNAL, ART. 431-3 ET 431-4 · CODE DE LA SÉCURITÉ INTÉRIEURE · EUROPE 1', q: 'Samedi, il y aura combien de monde ?<br>Ton pronostic ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), rise: FZ.realT(T.rise), aerial: FZ.realT(T.aerial), back: FZ.realT(T.back), down: FZ.realT(T.down), m1: FZ.realT(M1), end: FZ.realT(T.endCard) }) };
}

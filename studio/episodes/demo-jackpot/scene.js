// =====================================================================
//  DÉMO « EFFET MULTIPLICATION » (validée par Curtis) : Et si tu gagnais 250 millions à l'EuroMillions ?
//  1 liasse → 25 000 liasses (le compteur grimpe), puis conversion : 14 096 personnes payées au SMIC un an.
//  Exemple de référence pour lib-multiply.js (tas, foule, équation) et lib-people.js (personnages réalistes).
//  NB : la démo n'est QUE l'effet, donc la caméra bouge du début à la fin. Dans un vrai épisode, elle reste la caméra
//  fixe de surveillance et ne s'envole que pendant l'effet.
// =====================================================================
import { THREE, createStage, HUD, sm, clamp, lerp, rng, fr } from '../../engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople } from '../../lib-people.js';
import { makeBundle, makePile, makeCrowd, makeEquation } from '../../lib-multiply.js';

// --- les chiffres (sources : FDJ, plafond du jackpot ; Legisocial, SMIC net au 1er juin 2026)
const GAIN = 250_000_000, LIASSE = 10_000, NL = GAIN / LIASSE;          // 25 000 liasses de 100 billets de 100 €
const SMIC_AN = 1477.93 * 12;                                             // 17 735,16 € net par an
const NP = Math.floor(GAIN / SMIC_AN);                                    // 14 096 personnes

const T = { hookOut: 2.6, one: 2.8, drop: 5.0, land: 5.45, full: 9.2, crowd: 9.6, crowdFull: 13.0, out: 14.2, duration: 15.0 };
const SUBS = [
  [2.9, 4.9, 'Une liasse de 100 billets de 100 € : 10 000 €.'],
  [5.4, 9.3, 'Ton jackpot, c’est 25 000 liasses.'],
  [9.7, 14.0, `De quoi payer ${fr(NP)} personnes au SMIC pendant un an.`],
];

export default async function () {
  const stage = createStage({ fov: 40, far: 900, bloom: [0.22, 0.45, 0.9] });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.05;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const FOG = new THREE.Color('#0b0d12');
  scene.background = FOG.clone(); scene.fog = new THREE.Fog(FOG, 40, 150);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;

  // --- le sol et la lumière (un plateau de nuit, un projecteur)
  const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256); gr.addColorStop(0, '#2c303a'); gr.addColorStop(0.3, '#171a21'); gr.addColorStop(1, '#0c0e12');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.SpotLight('#fff0d6', 190, 60, 0.5, 0.65, 1.6); key.position.set(3.5, 9, 6); key.target.position.set(0, 0.5, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.camera.near = 2; key.shadow.camera.far = 30; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#8fb2ff', 1.1); rim.position.set(-6, 5, -8); scene.add(rim);
  const hemi = new THREE.HemisphereLight('#8ea3cc', '#120f0c', 0.4); scene.add(hemi);
  const wide = new THREE.DirectionalLight('#ffe6c4', 0); wide.position.set(20, 40, 25); scene.add(wide);   // s'allume pour la foule

  // --- la liasse star, puis le tas
  const B = makeBundle();
  const hero = new THREE.Mesh(B.geo, B.mats); hero.castShadow = true; scene.add(hero);
  const pile = makePile(scene, { geo: B.geo, mats: B.mats, count: NL, nx: 10, nz: 20, t0: T.land, t1: T.full });

  // --- les personnages : « toi », à côté de ton jackpot, puis la foule
  const PEOPLE = await loadPeople(renderer);
  const you = PEOPLE.make({ outfit: 1 }); you.root.position.set(1.2, 0, 0.35); you.root.rotation.y = -0.35; scene.add(you.root);
  const crowd = makeCrowd(scene, PEOPLE, { count: NP, t0: T.crowd, t1: T.crowdFull, fog: { color: FOG, near: 40, far: 150 },
    exclude: (x, z) => (Math.abs(x) < 1.05 && Math.abs(z) < 1.1) || Math.hypot(x - 1.2, z - 0.35) < 0.55 });

  // --- l'équation en bas de l'écran
  const eq = makeEquation([{ label: 'TON GAIN', value: '250 M€' }, '÷', { label: '1 AN DE SMIC NET', value: `${fr(Math.round(SMIC_AN))} €` }, '=', { label: 'PERSONNES', value: '0', color: '#ffcf6b' }]);

  // --- la caméra
  const CAM = [
    // t, position, cible
    [0.0, [0.26, 1.22, 0.34], [0, 1.13, 0]],
    [2.3, [0.31, 1.21, 0.29], [0, 1.12, 0]],
    [3.0, [0.33, 1.19, 0.28], [0, 1.0, 0]],
    [4.9, [0.36, 1.16, 0.31], [0, 0.98, 0]],
    [5.7, [0.75, 1.0, 1.15], [0, 0.15, 0]],
    [7.7, [1.6, 1.75, 2.6], [0.1, -0.3, 0]],
    [9.2, [3.1, 2.5, 4.6], [0.35, 0.5, 0]],
    [10.5, [5.5, 8.5, 10.5], [0.2, 0.2, 0]],
    [13.2, [14, 30, 34], [0, 0, -2]],
    [15.0, [16, 35, 39], [0, 0, -3]],
  ];
  const camAt = (t) => {
    let i = 0; while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
    const [a, pa, ta] = CAM[i], [b, pb, tb] = CAM[i + 1]; const k = sm(a, b, t);
    return [pa.map((x, j) => lerp(x, pb[j], k)), ta.map((x, j) => lerp(x, tb[j], k))];
  };

  function update(t) {
    // la liasse star : elle flotte et tourne, puis tombe au centre
    const LY = B.size[1];
    if (t < T.land) {
      const fall = sm(T.drop, T.land, t), spin = t * 0.6 * (1 - fall);
      hero.visible = true; hero.position.set(0, lerp(1.08 + Math.sin(t * 1.3) * 0.012, LY / 2, fall * fall), 0);
      hero.rotation.set(lerp(0.35 * Math.sin(t * 0.7), 0, fall), spin + 0.4 * (1 - fall), 0);
    } else hero.visible = false;
    const N = pile.update(t);
    // lumières : on éclaire large quand la caméra monte
    const wideK = sm(9.4, 12.0, t); wide.intensity = 1.6 * wideK; hemi.intensity = 0.4 + 0.5 * wideK;
    scene.fog.near = lerp(40, 60, wideK); scene.fog.far = lerp(150, 190, wideK);
    const P = crowd.update(t, { light: 0.75 + 0.35 * wideK, fogNear: scene.fog.near, fogFar: scene.fog.far });
    const [cp, ct] = camAt(t); camera.position.set(...cp); camera.lookAt(...ct);

    // --- textes
    HUD.hook(t, 'Et si tu gagnais <em>250 millions</em> à l’EuroMillions ?', T.hookOut);
    HUD.live(t, 'DÉMO', 'EFFET MULTIPLICATION');
    document.getElementById('tl').style.opacity = sm(T.one - 0.2, T.one + 0.2, t) * (1 - sm(T.out - 0.3, T.out, t));
    if (t < T.crowd - 0.2) {
      const n = Math.max(1, N);   // (jamais « 0 € » pendant l'apparition des compteurs)
      HUD.block(1, { label: 'LIASSES', value: fr(n), sub: '100 BILLETS DE 100 €' });
      HUD.block(2, { label: 'TON GAIN', value: `${fr(n * LIASSE)} €`, sub: n >= NL ? 'LE JACKPOT MAXIMUM' : '', color: n >= NL ? '#ffcf6b' : '#fff' }); HUD.show2(true);
    } else {
      HUD.block(1, { label: 'PERSONNES PAYÉES', value: fr(P), sub: 'AU SMIC PENDANT UN AN', color: '#ffcf6b' }); HUD.show2(false);
    }
    eq.opacity(sm(T.crowd + 0.1, T.crowd + 0.6, t) * (1 - sm(T.out - 0.3, T.out, t))); eq.set(2, fr(P));
    HUD.subs(t, SUBS);
    HUD.fade(sm(T.out, T.duration - 0.2, t));
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS, NL, NP }) };
}

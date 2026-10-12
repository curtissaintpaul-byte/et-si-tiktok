// =====================================================================
//  ÉPISODE : « Et si tu voyageais dans le temps ? » — une terrasse de café à Paris, qui fête… les voyageurs du temps
//  Faits (fiche) :
//   - Vers le futur, c'est réel (relativité) : l'ISS file à ~28 000 km/h ; G. Padalka, 879 jours à bord, est revenu ~1/44 s « dans le futur ».
//   - GPS : horloges des satellites corrigées de 38 µs/jour (sinon ~10 km d'erreur par jour).
//   - À 99 % de c (γ = 7,09) : 1 an pour toi = 7 ans sur Terre.
//   - Vers le passé : aucune physique connue ne le permet ; paradoxe du grand-père.
//   - S. Hawking, 28 juin 2009 (Cambridge) : fête pour voyageurs du temps, invitations envoyées le lendemain ; personne n'est venu.
//   - On voit le passé : la lumière du Soleil a ~8 min 20 s.
// =====================================================================
import { THREE, createStage, makeSky, M, add, box, cyl, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, bake, canvasTex, signTex, dotTex, keys } from '../../engine.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, iss0: 12.0, iss1: 21.4, gps: 21.6, twins: 26.2, arrive: 31.2, paradox: 36.0, vanish: 38.4, calm: 41.0, lapse: 46.0, endCard: 62.0, duration: 66.2 };
const SUBS = [
  [3.3, 7.4, 'Bonne nouvelle : tu voyages déjà dans le futur. Une seconde par seconde.'],
  [7.6, 11.8, 'Et plus tu vas vite, plus ton temps ralentit : c’est la relativité.'],
  [12.0, 16.4, 'Là-haut, la Station spatiale file à 28 000 km/h.'],
  [16.6, 21.4, 'Après 879 jours à bord, un cosmonaute est revenu 1/44 de seconde dans le futur.'],
  [21.6, 26.0, 'Ton GPS corrige 38 millionièmes de seconde par jour. Sinon : 10 km d’erreur.'],
  [26.2, 31.0, 'À 99 % de la vitesse de la lumière, 1 an pour toi = 7 ans sur Terre.'],
  [31.2, 35.8, 'Et le passé ? Imagine que tu reviennes empêcher ta propre naissance…'],
  [36.0, 40.8, '…tu n’existerais pas, donc tu ne partirais jamais : le paradoxe du grand-père.'],
  [41.0, 45.8, 'Aucune physique connue ne permet de remonter le temps.'],
  [46.0, 51.8, 'Le 28 juin 2009, Stephen Hawking a lui aussi organisé une fête pour les voyageurs du temps.'],
  [52.0, 56.8, 'Il a envoyé les invitations… le lendemain.'],
  [57.0, 61.8, 'Personne n’est venu.'],
];
// heure affichée (h) : soirée qui avance, accélérée à la fin
const CLOCK = [[0, 21.25], [T.lapse, 21.6], [T.endCard, 26.0], [T.duration, 26.05]];

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 66, far: 3000, bloom: [0.45, 0.5, 0.8], shadows: false });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.2;
  document.documentElement.style.setProperty('--accent', '#c9a6ff');
  const R = rng(2009);
  // crépuscule de juin à Paris : le Soleil vient de se coucher au nord-ouest
  const SUN = (h) => dirAzEl(-60 + (h - 21.25) * 12, -4 - (h - 21.25) * 7);
  const sky = makeSky(scene, { sunDir: SUN(21.25), dayZen: [0.06, 0.12, 0.34], dayHor: [0.72, 0.48, 0.36], stars: 0 });
  const hemi = new THREE.HemisphereLight('#7a8cc0', '#3a3028', 0.6); scene.add(hemi);

  // -------------------------------------------------------------------
  // LA RUE : chaussée, trottoirs, façades haussmanniennes (fenêtres éclairées la nuit), réverbères
  // la rue file vers −z ; façades en x = ±8
  // -------------------------------------------------------------------
  const world = new THREE.Group();
  add(new THREE.PlaneGeometry(10, 400), M('#3a3a3e'), world, 0, 0, -150, -Math.PI / 2);
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(3.5, 400), M('#8d877c'), world, sx * 6.75, 0.12, -150, -Math.PI / 2);
  for (let z = 6; z > -340; z -= 6) box(0.35, 0.02, 2.8, M('#e8e6e0'), world, 0, 0.01, z);
  const facadeTex = (lit) => canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = lit ? '#2a2620' : '#d8ccb0'; g.fillRect(0, 0, w, h);
    for (let fl = 0; fl < 6; fl++) for (let c = 0; c < 3; c++) {
      const x = 20 + c * 80, y = 30 + fl * 80, on = R() < 0.55;
      g.fillStyle = lit ? (on ? '#ffcf8a' : '#1a1a20') : '#4a5058'; g.fillRect(x, y, 56, 58);
      if (!lit) { g.fillStyle = '#2b2b2b'; if (fl === 1 || fl === 4) g.fillRect(x - 10, y + 52, 76, 6); }
    }
  });
  const facDay = facadeTex(false), facNight = facadeTex(true); for (const tx of [facDay, facNight]) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; }
  const facM = new THREE.MeshStandardMaterial({ map: facDay, emissiveMap: facNight, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.9 });
  const zinc = M('#5f6b78', { r: 0.5 });
  for (const sx of [-1, 1]) { let z = 4; while (z > -330) { const w = 14 + R() * 6, h = 19 + R() * 3;
      const bg = new THREE.BoxGeometry(2, h, w); { const uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 7.5, uv.getY(i) * h / 19); } const m = add(bg, facM, world, sx * 9.5, h / 2, z - w / 2); add(new THREE.BoxGeometry(2.2, 4.5, w), zinc, world, sx * 9.3, h + 2.0, z - w / 2).rotation.x = 0; z -= w; } }
  scene.add(bake(world));
  // réverbères
  const lamps = [];
  for (let z = -4; z > -200; z -= 22) for (const sx of [-1, 1]) { cyl(0.06, 0.09, 4.2, 6, M('#1f2326'), scene, sx * 5.4, 2.1, z + (sx > 0 ? 11 : 0)); const gl = M('#2a2620', { e: '#ffc27a', ei: 0, unique: true }); box(0.32, 0.45, 0.32, gl, scene, sx * 5.4, 4.4, z + (sx > 0 ? 11 : 0)); lamps.push(gl); }

  // -------------------------------------------------------------------
  // LA TERRASSE (à droite, au premier plan) : tables, chaises en rotin, guirlande d'ampoules, ballons, banderole, horloge
  // -------------------------------------------------------------------
  const rat = M('#b08a5a'), metal = M('#2a2a2a'), marble = M('#e6e2da', { r: 0.4 });
  const tables = [[3.2, 1.0], [5.6, 0.6], [3.4, -2.4], [5.8, -3.2], [3.0, -5.8], [5.4, -6.6]];
  tables.forEach(([x, z]) => { cyl(0.36, 0.36, 0.04, 14, marble, scene, x, 0.86, z); cyl(0.04, 0.04, 0.72, 6, metal, scene, x, 0.5, z); cyl(0.22, 0.22, 0.03, 10, metal, scene, x, 0.14, z);
    for (const a of [0, Math.PI]) { const g = new THREE.Group(); g.position.set(x + 0.6 * Math.cos(a), 0.12, z + 0.6 * Math.sin(a)); g.rotation.y = -a + Math.PI / 2; scene.add(g); box(0.42, 0.05, 0.42, rat, g, 0, 0.45, 0); box(0.42, 0.5, 0.05, rat, g, 0, 0.72, -0.2); }
    for (let k = 0; k < 2; k++) cyl(0.03, 0.025, 0.2, 8, M('#f4f1e8', { r: 0.1 }), scene, x + (k - 0.5) * 0.18, 0.98, z + 0.05); });
  // seau à champagne
  cyl(0.12, 0.1, 0.24, 12, M('#c9cdd2', { r: 0.25, m: 0.8 }), scene, 3.2, 1.0, 1.0); cyl(0.04, 0.045, 0.34, 8, M('#1f3a26'), scene, 3.22, 1.18, 1.02);
  // la banderole
  const bannerTex = signTex('BIENVENUE AUX VOYAGEURS DU TEMPS', '#2a1f4a', '#f2e6ff', 1400, 150, 74);
  const banner = add(new THREE.PlaneGeometry(7.0, 0.75), new THREE.MeshStandardMaterial({ map: bannerTex, side: THREE.DoubleSide, roughness: 0.8, emissive: '#ffffff', emissiveMap: bannerTex, emissiveIntensity: 0.15 }), scene, 3.6, 3.15, -4.0, 0, -Math.PI / 2, 0);
  // guirlande d'ampoules
  const bulbs = []; { const bm = new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3.2, 2.4, 1.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    for (let i = 0; i < 26; i++) { const z = 3 - i * 0.45, s = new THREE.Sprite(bm); s.position.set(2.4 + 0.05 * Math.sin(i), 3.55 - 0.18 * Math.abs(Math.sin(i * 0.48)), z); s.scale.setScalar(0.12); scene.add(s); bulbs.push(s); } }
  const terraceLight = new THREE.PointLight('#ffc98a', 0, 14, 1.3); terraceLight.position.set(4.2, 3.2, -2); scene.add(terraceLight);
  // ballons (ils se dégonflent au fil de la nuit)
  const balloonCols = ['#c9a6ff', '#ffd36b', '#ff7aa8', '#7ad1ff', '#c9a6ff', '#ffd36b'];
  const balloons = balloonCols.map((c, i) => { const g = new THREE.Group(); const x = 2.6 + (i % 3) * 1.4, z = 1.4 - Math.floor(i / 3) * 6.8; g.position.set(x, 0.98, z); scene.add(g);
    const b = add(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 }), g, 0, 1.25, 0); b.scale.y = 1.2; const str = add(new THREE.CylinderGeometry(0.004, 0.004, 1.1, 3), M('#ddd'), g, 0, 0.55, 0); return { g, b, str, ph: R() * 6 }; });
  // l'horloge murale du café (à droite, sur le pilier)
  const clockTex = canvasTex(256, 256, (g) => { g.fillStyle = '#f2ede0'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = '#2b2a28'; g.lineWidth = 10; g.stroke(); g.fillStyle = '#2b2a28';
    for (let i = 0; i < 12; i++) { g.save(); g.translate(128, 128); g.rotate(i * Math.PI / 6); g.fillRect(-4, -110, 8, i % 3 ? 14 : 24); g.restore(); } });
  const clockG = new THREE.Group(); clockG.position.set(6.95, 2.6, 2.0); clockG.rotation.y = -Math.PI / 2; scene.add(clockG);
  box(0.9, 4.0, 0.9, M('#5a1f24'), scene, 7.4, 2.0, 2.0);   // pilier rouge du café
  add(new THREE.CircleGeometry(0.42, 32), new THREE.MeshStandardMaterial({ map: clockTex, emissive: '#ffffff', emissiveMap: clockTex, emissiveIntensity: 0.25 }), clockG, 0, 0, 0.01);
  const hourH = new THREE.Group(), minH = new THREE.Group(); clockG.add(hourH, minH); hourH.position.z = minH.position.z = 0.02;
  box(0.04, 0.22, 0.01, M('#1a1a1a'), hourH, 0, 0.1, 0); box(0.025, 0.34, 0.01, M('#1a1a1a'), minH, 0, 0.16, 0);
  // l'auvent rayé (en haut à droite, au premier plan)
  const awn = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#f3ead8' : '#5a1f24'; g.fillRect(i * w / 16, 0, w / 16, h); } });
  add(new THREE.PlaneGeometry(3.4, 12), new THREE.MeshStandardMaterial({ map: awn, side: THREE.DoubleSide, roughness: 0.9 }), scene, 5.6, 3.9, -2.0, -Math.PI / 2 + 0.25, 0, 0);

  // -------------------------------------------------------------------
  // LES GENS : un serveur, quelques clients ; le « voyageur » (combinaison argentée) qui apparaît puis s'efface
  // -------------------------------------------------------------------
  const waiter = makePerson(scene, { shirt: '#f4f4f0', pants: '#1a1a1a', hair: '#2a1d15' });
  add(new THREE.BoxGeometry(0.4, 0.5, 0.05), M('#1a1a1a'), waiter.body, 0, 0.1, 0.12);   // tablier
  const guests = [[3.2, 1.6, Math.PI, '#3d6e9e'], [5.6, 1.2, Math.PI, '#b2453a'], [3.4, -1.8, Math.PI, '#e8e2d4']].map(([x, z, ry, sh], i) => { const P = makePerson(scene, { shirt: sh, pants: '#2b3448', hair: ['#5a3a22', '#c79a5a', '#1f1712'][i] }); P.x = x; P.z = z; P.ry = ry; return P; });
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.6, 1.9) })); guests[2].armR.add(phone); phone.position.set(0, -0.56, 0.06);
  const trav = makePerson(scene, { shirt: '#c9ccd6', pants: '#a9adb8', hair: '#d8d8d8', skin: '#e2b994' });
  trav.mats.forEach((m) => { m.metalness = 0.6; m.roughness = 0.3; m.emissive = new THREE.Color('#6a5a90'); m.emissiveIntensity = 0.5; });
  const TRAV = new THREE.Vector3(1.4, 0.12, 0.6);
  const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(200,170,255,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const portal = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.6, 2.0, 4.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); portal.position.copy(TRAV).setY(1.0); scene.add(portal);
  const portalLight = new THREE.PointLight('#c9a6ff', 0, 20, 1.4); portalLight.position.copy(TRAV).setY(1.2); scene.add(portalLight);
  const sparks = Array.from({ length: 70 }, () => ({ s: new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3, 2.6, 4.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })), v: new THREE.Vector3((R() - 0.5) * 4, R() * 3, (R() - 0.5) * 4) }));
  sparks.forEach((p) => { p.s.scale.setScalar(0.06); scene.add(p.s); });

  // l'ISS : un point brillant qui traverse le ciel (éclairée par le Soleil alors qu'il fait nuit en bas)
  const iss = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(4, 3.8, 3.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); iss.scale.setScalar(6); scene.add(iss);

  // HUD : étiquette, glitch du paradoxe
  const hud = document.getElementById('hud');
  const mk = (css) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;pointer-events:none;opacity:0;' + css; hud.appendChild(d); return d; };
  const tag = mk("left:0;right:0;top:560px;text-align:center;font-family:'Inter';font-weight:800;font-size:28px;letter-spacing:0.16em;");
  const tagIn = document.createElement('span'); tagIn.style.cssText = 'display:inline-block;padding:11px 20px;border-radius:6px;color:#fff;background:rgba(20,24,30,0.75);'; tag.appendChild(tagIn);
  const bands = Array.from({ length: 6 }, () => mk('left:0;width:1080px;background:rgba(255,255,255,0.14);mix-blend-mode:difference;'));
  const canvasEl = document.getElementById('c');

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(2.6, 2.3, 7.2), LOOK = new THREE.Vector3(-3.0, 16.0, -55);
  const tmp = new THREE.Vector3();
  function update(t) {
    const h = keys(CLOCK, t);
    const sd = SUN(h); sky.u.uSunDir.value.copy(sd);
    const dusk = 1 - sm(21.3, 22.4, h);
    sky.u.uDay.value = 0.35 * dusk + 0.02; sky.u.uStars.value = 1 - 0.8 * dusk; sky.u.uMilky.value = 0.2 * (1 - dusk);
    hemi.intensity = 0.25 + 0.4 * dusk;
    facM.emissiveIntensity = 0.22 + 0.12 * (1 - dusk) - 0.15 * sm(24.5, 26, h);   // les fenêtres s'éteignent tard
    lamps.forEach((m) => { m.emissiveIntensity = 2.4; });
    terraceLight.intensity = 12 * (1 - 0.6 * sm(25.0, 25.8, h)); bulbs.forEach((b, i) => { b.material.opacity = 1 - 0.6 * sm(25.0, 25.8, h); });
    camera.position.copy(CAM); camera.lookAt(LOOK); camera.fov = 70; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); sky.follow(camera);
    // l'horloge
    const mins = (h % 12) * 60; minH.rotation.z = -(mins % 60) / 60 * Math.PI * 2; hourH.rotation.z = -(mins / 720) * Math.PI * 2;
    // l'ISS : de l'ouest (gauche… ici la rue file vers le nord-est) vers l'est, haut dans le ciel
    const ui = clamp((t - T.iss0) / (T.iss1 - T.iss0)); iss.visible = t > T.iss0 && t < T.iss1;
    iss.position.copy(CAM).add(dirAzEl(lerp(-20, 12, ui), 20 + 8 * Math.sin(Math.PI * ui)).multiplyScalar(900)); iss.material.opacity = sm(0, 0.08, ui) * (1 - sm(0.9, 1, ui));
    // les gens
    waiter.reset(); { const u = (t * 0.25) % 2, wz = u < 1 ? lerp(3.5, -6, sm(0, 1, u)) : lerp(-6, 3.5, sm(1, 2, u)); waiter.root.position.set(4.4, 0.12, wz); waiter.root.rotation.y = u < 1 ? Math.PI : 0; if (t < T.lapse) waiter.walk(t * 5, 0.8); waiter.armR.rotation.set(-1.4, 0, 0); }
    if (t > T.lapse + 6) { waiter.reset(); waiter.root.position.set(5.0, 0.12, 2.6); waiter.root.rotation.y = -2.4; waiter.head.rotation.x = 0.3; waiter.armL.rotation.set(-0.3, 0, 0.3); }   // il attend, il s'ennuie
    guests.forEach((P, i) => { P.reset(); P.root.position.set(P.x, 0.12, P.z); P.root.rotation.y = P.ry; P.sit(1); P.root.visible = t < T.lapse + 3 + i * 1.5;
      P.head.rotation.x = (t > T.iss0 + 1 && t < T.iss1) ? -0.7 : 0.1; if (i === 2) P.armR.rotation.set(t > T.gps && t < T.twins ? -1.3 : -0.5, 0, 0.1); phone.visible = i === 2; });
    // le voyageur : éclair, il apparaît, regarde autour… puis le paradoxe le fait clignoter et disparaître
    const ap = t - T.arrive; trav.reset(); trav.root.position.copy(TRAV); trav.root.rotation.y = 0.4 + 0.6 * Math.sin(Math.max(0, ap) * 0.8);
    const shown = ap > 0.35 && t < T.vanish + 0.4; const flick = t > T.paradox ? (Math.sin(t * 47) > 0.2 - 0.9 * sm(T.paradox, T.vanish, t) ? 1 : 0) : 1;
    trav.root.visible = shown && flick > 0; trav.head.rotation.y = 0.5 * Math.sin(Math.max(0, ap) * 1.4);
    const flash = Math.exp(-Math.max(0, ap) * 3) * (ap > 0 ? 1 : 0) + Math.exp(-Math.max(0, t - T.vanish) * 5) * (t > T.vanish ? 0.8 : 0);
    portal.material.opacity = Math.min(1, flash * 1.5); portal.scale.setScalar(1.5 + 4 * flash); portalLight.intensity = 60 * flash;
    sparks.forEach((p) => { const u = ap; const on = u > 0 && u < 1.6; p.s.visible = on; if (!on) return; p.s.position.copy(TRAV).add(tmp.copy(p.v).multiplyScalar(u)).setY(1 + p.v.y * u - 2 * u * u); p.s.material.opacity = 1 - u / 1.6; });
    // les ballons : ils flottent, puis se dégonflent pendant la nuit
    const defl = sm(T.lapse, T.endCard, t);
    balloons.forEach((b, i) => { const k = clamp(defl * (1.2 - i * 0.08)); b.b.position.y = lerp(1.25, 0.3, k); b.b.scale.setScalar(lerp(1, 0.65, k)); b.b.scale.y *= 1.2; b.g.rotation.z = 0.05 * Math.sin(t * 0.7 + b.ph); b.str.scale.y = lerp(1, 0.25, k); b.str.position.y = lerp(0.55, 0.14, k); });
    // le glitch du paradoxe
    const gl = t > T.paradox && t < T.vanish + 0.5 ? (0.5 + 0.5 * Math.sin(t * 13)) : 0;
    bands.forEach((b, i) => { b.style.opacity = gl > 0.3 ? 1 : 0; b.style.top = `${((t * 1300 + i * 331) % 1900)}px`; b.style.height = `${10 + (i * 37) % 60}px`; });
    canvasEl.style.filter = gl > 0.6 ? 'hue-rotate(40deg) saturate(1.6)' : 'none';

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60), ss = Math.floor(((h * 3600) % 60));
    HUD.live(t, 'PARIS · TERRASSE · CAM 02', `28/06/2027 · ${pad(hh)}:${pad(mm)}:${pad(ss)}`);
    HUD.show2(true);
    HUD.block(1, { label: 'TON VOYAGE DANS LE TEMPS', value: '1 s / s', sub: 'COMME TOUT LE MONDE, VERS LE FUTUR', color: '#fff' });
    if (t < T.iss0) HUD.block(2, { label: 'PLUS TU VAS VITE', value: 'moins vite', sub: 'S’ÉCOULE TON TEMPS (RELATIVITÉ RESTREINTE)', color: '#c9a6ff' });
    else if (t < T.gps) HUD.block(2, { label: 'DANS L’ISS · 28 000 KM/H', value: '−25 µs / jour', sub: 'ON Y VIEILLIT UN PEU MOINS VITE', color: '#c9a6ff' });
    else if (t < T.twins) HUD.block(2, { label: 'SATELLITES GPS', value: '+38 µs/jour', sub: 'CORRIGÉS EN PERMANENCE · SINON ~10 KM D’ERREUR', color: '#c9a6ff' });
    else if (t < T.arrive) HUD.block(2, { label: 'À 99 % DE C', value: '1 an = 7 ans', sub: 'POUR TOI · SUR TERRE', color: '#c9a6ff' });
    else if (t < T.calm) HUD.block(2, { label: 'VERS LE PASSÉ', value: t < T.paradox ? '???' : 'paradoxe', sub: 'DU GRAND-PÈRE', color: '#ff7aa8' });
    else if (t < T.lapse) HUD.block(2, { label: 'VERS LE PASSÉ', value: 'impossible', sub: 'D’APRÈS LA PHYSIQUE CONNUE', color: '#ff7aa8' });
    else HUD.block(2, { label: 'INVITÉS DU FUTUR', value: '0', sub: 'HAWKING, 28 JUIN 2009 : 0 AUSSI', color: '#ffd36b' });
    const tg = t >= T.lapse ? 'ACCÉLÉRÉ · LA NUIT PASSE' : t >= T.arrive && t < T.calm ? 'ET SI…' : '';
    if (tagIn.textContent !== tg) tagIn.textContent = tg; tag.style.opacity = tg ? 1 : 0;
    HUD.reticle('iss', iss.position, camera, 'ISS · 400 KM', iss.visible ? sm(T.iss0 + 0.5, T.iss0 + 1.0, t) * (1 - sm(T.iss1 - 0.6, T.iss1, t)) : 0, 60);
    HUD.hook(t, 'Et si tu voyageais<br>dans <em>le temps</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.end(t, T.endCard, { kicker: 'EN REGARDANT LE SOLEIL, TU LE VOIS TEL QU’IL ÉTAIT IL Y A 8 MINUTES', q: 'Tu viens du futur ?<br>Prouve-le en commentaire.', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

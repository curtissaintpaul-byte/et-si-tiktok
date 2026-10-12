// =====================================================================
//  ÉPISODE : « Et si la tempête solaire de 1859 frappait ce soir ? » — un village français, la nuit
//  Faits (sources dans la fiche) : éruption observée par Carrington le 1er septembre 1859 ; nuage arrivé en ~17,6 h ;
//  aurores jusqu'à Cuba, Hawaï, la Colombie ; télégraphes en étincelles (Wikipédia, NASA).
//  Québec, 13 mars 1989 : réseau effondré en moins d'une minute, plus de 9 h de panne (Hydro-Québec).
//  23 juillet 2012 : une éjection de même classe a croisé l'orbite terrestre, « une semaine plus tôt » elle nous touchait (NASA).
//  Risque : ~12 % par décennie (P. Riley, 2012). Oiseaux migrateurs perturbés par les orages magnétiques (PNAS 2023).
// =====================================================================
import { THREE, createStage, makeSky, M, add, box, cyl, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, pad, canvasTex, dotTex } from '../../engine.js';
import { buildVillage } from '../../lib-village.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, overhead: 13.2, sparks1: 18.2, gps: 28.2, gic: 33.2, quebec: 38.2, fry: 43.2, dark: 46.2, water: 48.2, birds: 53.2, miss: 58.2, risk: 63.2, endCard: 68.2, duration: 72.4 };
const SUBS = [
  [3.4, 8.0, 'Le 1er septembre 1859, le Soleil fait une éruption géante.'],
  [8.4, 12.8, 'Son nuage de particules touche la Terre en moins de 18 h.'],
  [13.2, 17.8, 'Des aurores jusqu’à Cuba et Hawaï.'],
  [18.2, 22.8, 'Les télégraphes crachent des étincelles.'],
  [23.2, 27.8, 'Ce soir, le ciel serait rouge jusqu’au-dessus de nous.'],
  [28.2, 32.8, 'Les satellites et le GPS décrochent.'],
  [33.2, 37.8, 'Les lignes électriques se chargent de courants géants.'],
  [38.2, 42.8, 'En 1989, le Québec s’est éteint en moins d’une minute.'],
  [43.2, 47.8, 'Ici aussi, les transformateurs grillent.'],
  [48.2, 52.8, 'Sans courant : plus d’eau au robinet, plus de réseau.'],
  [53.2, 57.8, 'Même les oiseaux migrateurs sont désorientés.'],
  [58.2, 62.8, 'En 2012, une tempête pareille nous a ratés d’une semaine.'],
  [63.2, 67.8, 'Le risque : environ 12 % par décennie.'],
];

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 72, far: 3000, bloom: [0.55, 0.6, 0.8], shadows: false });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.35;
  document.documentElement.style.setProperty('--accent', '#7dffb0');
  const R = rng(1859);
  const NORTH = new THREE.Vector3(0.1, 0.55, -1).normalize();   // le nord est derrière l'église

  const sky = makeSky(scene, { stars: 1.0, milky: 0.7, nightZen: [0.002, 0.003, 0.009], nightHor: [0.012, 0.014, 0.028] });
  sky.u.uDay.value = 0; sky.u.uTintDir.value.copy(NORTH);
  scene.fog = new THREE.Fog('#0d0f18', 120, 900);
  const V = buildVillage(scene, { R, groundColor: '#55623f' });
  const hemi = new THREE.HemisphereLight('#2a355a', '#0b0a08', 0.55); scene.add(hemi);
  const auroraLight = new THREE.DirectionalLight('#ff5a6a', 0); auroraLight.position.set(0, 60, -80); scene.add(auroraLight);
  const greenLight = new THREE.DirectionalLight('#4dff9a', 0); greenLight.position.set(-30, 40, -90); scene.add(greenLight);

  // -------------------------------------------------------------------
  // LES AURORES : des rideaux de lumière (vert en bas, rouge en haut — à notre latitude, surtout du rouge)
  // -------------------------------------------------------------------
  const U = { uTime: { value: 0 }, uInt: { value: 0 }, uRed: { value: 0.6 } };
  const auroraMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `uniform float uTime; attribute float aPh; varying vec2 vUv; varying float vPh;
      void main(){ vUv = uv; vPh = aPh; vec3 p = position;
        p.z += sin(uv.x * 7.0 + uTime * 0.35 + aPh) * 28.0 + sin(uv.x * 19.0 - uTime * 0.6 + aPh * 2.0) * 7.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uTime, uInt, uRed; varying vec2 vUv; varying float vPh;
      void main(){
        float u = vUv.x, v = vUv.y;
        float rays = 0.5 + 0.5 * sin(u * 210.0 + 4.0 * sin(u * 23.0 + uTime * 0.5 + vPh) + uTime * 0.9) * sin(u * 71.0 - uTime * 0.45 + vPh);
        rays = mix(0.06, 1.0, pow(rays, 1.6));
        float bottom = smoothstep(0.0, 0.05, v), top = pow(1.0 - v, 1.4);
        float ends = smoothstep(0.0, 0.15, u) * smoothstep(1.0, 0.85, u);
        vec3 green = vec3(0.15, 0.95, 0.45), red = vec3(0.9, 0.07, 0.17), pink = vec3(0.8, 0.25, 0.6);
        vec3 col = mix(green, red, smoothstep(0.12, 0.5, v + uRed * 0.12));
        col = mix(col, pink, 0.35 * (1.0 - smoothstep(0.0, 0.08, v)));
        float pulse = 0.75 + 0.25 * sin(uTime * 0.9 + u * 9.0 + vPh);
        gl_FragColor = vec4(col * bottom * top * ends * rays * pulse * uInt, 1.0);
      }`,
  });
  const curtains = [];
  // [distance vers le nord, décalage x, longueur, base, hauteur, rotation]
  for (const [d, x, L, y0, h, ry] of [[700, -150, 2400, 70, 420, 0.08], [520, 260, 1900, 90, 380, -0.12], [380, -60, 1600, 130, 360, 0.18], [260, 120, 1200, 170, 330, -0.06], [140, -40, 900, 210, 300, 0.3], [60, 30, 700, 240, 260, -0.4]]) {
    const g = new THREE.PlaneGeometry(L, h, 240, 1); g.translate(0, h / 2, 0);
    const ph = new Float32Array(g.attributes.position.count).fill(R() * 6.28); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    const m = new THREE.Mesh(g, auroraMat); m.position.set(x, y0, -d - 30); m.rotation.y = ry; m.renderOrder = 2; m.frustumCulled = false; scene.add(m); curtains.push(m);
  }

  // -------------------------------------------------------------------
  // LE POTEAU ÉLECTRIQUE ET SON TRANSFORMATEUR (à droite de l'église), les fils vers les maisons
  // -------------------------------------------------------------------
  const POLE = new THREE.Vector3(7.2, 0, -19.6);
  const wood = M('#3d2d22'), grey = M('#6f7378', { r: 0.5 });
  cyl(0.14, 0.2, 10, 7, wood, scene, POLE.x, 5, POLE.z); box(2.4, 0.14, 0.14, wood, scene, POLE.x, 9.4, POLE.z);
  const TRANSFO = new THREE.Vector3(POLE.x - 0.45, 7.2, POLE.z + 0.1);
  cyl(0.38, 0.38, 1.1, 10, grey, scene, TRANSFO.x, TRANSFO.y, TRANSFO.z);
  { const pts = []; for (const [x2, z2] of [[9, -16], [9, -12], [-9, -15], [4, -18]]) { for (let s = 0; s < 1; s += 0.05) { const a = new THREE.Vector3().lerpVectors(new THREE.Vector3(POLE.x, 9.4, POLE.z), new THREE.Vector3(x2, 8.5, z2), s); a.y -= 0.6 * 4 * s * (1 - s); const b = new THREE.Vector3().lerpVectors(new THREE.Vector3(POLE.x, 9.4, POLE.z), new THREE.Vector3(x2, 8.5, z2), s + 0.05); b.y -= 0.6 * 4 * (s + 0.05) * (0.95 - s); pts.push(a, b); } }
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#111' }))); }
  const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(200,220,255,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const arc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.2, 2.6, 4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  arc.position.copy(TRANSFO); scene.add(arc);
  const arcLight = new THREE.PointLight('#aac8ff', 0, 40, 1.5); arcLight.position.copy(TRANSFO); scene.add(arcLight);
  const NSP = 260, sparks = [];
  for (let i = 0; i < NSP; i++) sparks.push({ t0: (i < 60 ? T.sparks1 + R() * 4.2 : T.gic + R() * (T.dark - T.gic + 0.4)), vx: (R() - 0.5) * 6, vy: 1 + R() * 5, vz: (R() - 0.5) * 6, life: 0.5 + R() * 0.8 });
  sparks.push(...Array.from({ length: 120 }, () => ({ t0: T.dark - 0.05 + R() * 0.3, vx: (R() - 0.5) * 12, vy: 2 + R() * 9, vz: (R() - 0.5) * 12, life: 0.8 + R() * 1.2 })));
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sparks.length * 3), 3));
  const sparkPts = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, map: dotTex(), color: new THREE.Color(3, 2.6, 1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkPts.frustumCulled = false; scene.add(sparkPts);
  const smokeTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(120,120,120,0.55)'); gr.addColorStop(1, 'rgba(60,60,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const smokes = Array.from({ length: 10 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: '#8a8a8a', depthWrite: false, transparent: true, opacity: 0 })); scene.add(s); return { s, ph: i / 10 }; });

  // -------------------------------------------------------------------
  // LE JET DE LA FONTAINE (une pompe électrique : il s'arrête avec le courant)
  // -------------------------------------------------------------------
  const NJ = 420, jet = [];
  for (let i = 0; i < NJ; i++) jet.push({ ph: R(), a: R() * Math.PI * 2, v: 0.8 + R() * 0.5, up: 1.6 + R() * 0.8 });
  const jetGeo = new THREE.BufferGeometry(); jetGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NJ * 3), 3));
  const jetPts = new THREE.Points(jetGeo, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, map: dotTex(), color: '#bcd4e6', transparent: true, opacity: 0.8, depthWrite: false }));
  jetPts.frustumCulled = false; scene.add(jetPts);

  // -------------------------------------------------------------------
  // LES GENS (attablés en terrasse, deux autres près de la fontaine) et leurs téléphones
  // -------------------------------------------------------------------
  const FG = V.FG;
  const A = makePerson(scene, { shirt: '#e8e2d4', pants: '#2f3a4f', hair: '#5a3a22', skin: '#d9ab86' });
  const B = makePerson(scene, { shirt: '#3d6e9e', pants: '#cfc6b0', hair: '#2a1d15' });
  const C = makePerson(scene, { shirt: '#b2453a', pants: '#3b3b3b', hair: '#8a8a8a' });
  const Dp = makePerson(scene, { shirt: '#6a7f4a', pants: '#2b2b2b', hair: '#3a2a20', s: 0.75 });
  const phoneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.2) });
  const phones = [B, C].map((P) => { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.01), phoneMat); P.armR.add(ph); ph.position.set(0, -0.56, 0.06); return ph; });
  function posePeople(t) {
    const look = sm(2.0, 3.5, t);
    // A et B à la table du premier plan
    A.reset(); A.sit(1 - sm(14.0, 15.0, t)); A.root.position.set(FG.x - 0.62, 0, FG.z); A.root.rotation.y = lerp(Math.PI / 2, Math.PI, sm(14.2, 15.0, t));
    A.head.rotation.x = -0.55 * look - 0.25 * sm(13.2, 14.5, t); A.head.rotation.y = 0.25 * (1 - look);
    if (t > 15.0) { A.root.position.z = FG.z - 0.6 * sm(15.0, 16.2, t); }
    const pointA = sm(15.4, 16.0, t) * (1 - sm(19.5, 20.5, t)); A.armR.rotation.set(-2.4 * pointA, 0, -0.2 * pointA);
    B.reset(); B.sit(1); B.root.position.set(FG.x + 0.62, 0, FG.z); B.root.rotation.y = -Math.PI / 2; B.head.rotation.x = -0.5 * look; B.head.rotation.y = -0.3 * look;
    const film = sm(23.6, 24.4, t); B.armR.rotation.set(-1.9 * film - 0.4 * (1 - film), 0, 0.2 * film); phones[0].visible = film > 0.5;
    // C et D près de la fontaine
    C.reset(); C.root.position.set(1.8, 0, 3.8); C.root.rotation.y = Math.PI * 0.9; C.head.rotation.x = -0.6 * look;
    const filmC = sm(28.6, 29.4, t); C.armR.rotation.set(-2.1 * filmC, 0, 0.1); phones[1].visible = filmC > 0.5;
    Dp.reset(); Dp.root.position.set(2.5, 0, 4.4); Dp.root.rotation.y = Math.PI * 1.05; Dp.head.rotation.x = -0.65 * look;
    const hold = sm(T.dark - 0.2, T.dark + 0.4, t); Dp.armL.rotation.set(-0.9 * hold, 0, 0.5 * hold);   // l'enfant attrape le bras de son père au moment du noir
    if (t > T.dark) { C.head.rotation.y = 0.5 * sm(T.dark, T.dark + 0.6, t) * (1 - sm(T.dark + 2.5, T.dark + 3.5, t)); }
  }

  // -------------------------------------------------------------------
  // LES OISEAUX MIGRATEURS (silhouettes sur le ciel rouge) : ils hésitent, tournent, changent de cap
  // -------------------------------------------------------------------
  const birdMat = new THREE.MeshBasicMaterial({ color: '#0b0a0c', side: THREE.DoubleSide });
  const birds = Array.from({ length: 34 }, (_, i) => {
    const g = new THREE.Group(); scene.add(g);
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), birdMat), wr = wl.clone(); wl.position.x = -0.45; wr.position.x = 0.45; wl.rotation.x = wr.rotation.x = Math.PI / 2;
    g.add(wl, wr); g.scale.setScalar(1.4);
    return { g, wl, wr, off: new THREE.Vector3((R() - 0.5) * 22, (R() - 0.5) * 8, (R() - 0.5) * 14), ph: R() * 6 };
  });
  function poseBirds(t) {
    const u = t - (T.birds - 1.0);
    for (const b of birds) {
      b.g.visible = u > 0 && u < 9;
      if (!b.g.visible) continue;
      // le groupe arrive par la gauche, tourne en rond au-dessus de la place, repart du mauvais côté
      const head = 0.6 * Math.sin(u * 0.9) + 1.2 * sm(3, 5.5, u);
      const cx = -70 + u * 16 * Math.cos(head), cz = -40 - u * 3 + u * 9 * Math.sin(head);
      b.g.position.set(cx + b.off.x + Math.sin(u * 2 + b.ph) * 2, 34 + b.off.y + Math.sin(u * 1.3 + b.ph) * 2.5, cz + b.off.z);
      b.g.rotation.y = -head + Math.PI / 2; const f = Math.sin(t * 11 + b.ph) * 0.6; b.wl.rotation.z = f; b.wr.rotation.z = -f;
    }
  }

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(0, 4.3, 24.5), LOOK = new THREE.Vector3(0, 15.5, -20);
  const tmp = new THREE.Vector3();
  function update(t) {
    // --- caméra : très lente, puis tremble un peu au claquement du transformateur
    const k = sm(0, T.duration, t);
    camera.position.set(0.15 * Math.sin(t * 0.21), 4.3 - 0.3 * k, 24.5 - 2.0 * k);
    const bang = Math.exp(-Math.max(0, t - T.dark) * 4) * (t > T.dark ? 1 : 0);
    camera.position.x += Math.sin(t * 61) * 0.05 * bang; camera.position.y += Math.cos(t * 47) * 0.04 * bang;
    camera.lookAt(tmp.copy(LOOK).add(new THREE.Vector3(0, 2.5 * sm(10, 16, t), 0))); camera.fov = 72; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    sky.follow(camera);
    // --- les aurores : déjà là au début, montent jusqu'au-dessus de nous, s'emballent pendant l'orage
    U.uTime.value = t;
    const storm = 0.4 + 0.12 * sm(T.overhead - 1, T.overhead + 4, t) + 0.14 * sm(T.gic, T.dark, t) * (0.7 + 0.3 * Math.sin(t * 2.3));
    U.uInt.value = storm; U.uRed.value = 0.6 + 0.3 * sm(T.overhead, T.overhead + 6, t);
    curtains.forEach((c, i) => { c.visible = i < 3 || t > T.overhead - 2 + (i - 3) * 1.4; });
    sky.u.uTint.value.setRGB(0.5, 0.03, 0.08); sky.u.uTintAmt.value = 0.04 * storm;
    auroraLight.intensity = 0.9 * storm; greenLight.intensity = 0.45 * storm;
    // --- l'électricité : étincelles, puis le claquement, puis le noir
    const flick = (t > T.fry && t < T.dark) ? (Math.sin(t * 37) > 0.55 ? 0.35 : 1) * (Math.sin(t * 13.7) > 0.8 ? 0.5 : 1) : 1;
    const power = t < T.dark ? flick : 0;
    V.lamps.forEach((L, i) => { const p = t < T.dark ? power * (i === 2 && t > T.gic + 2 ? (Math.sin(t * 23) > 0 ? 1 : 0.2) : 1) : 0; L.glass.emissiveIntensity = 2.4 * p; L.light.intensity = 3.2 * p; });
    V.winLit.forEach((m, i) => { m.emissiveIntensity = 1.3 * power * (i === 1 ? 0.8 : 1); });
    const zap = t > T.sparks1 && t < T.sparks1 + 4.4 ? (Math.sin(t * 29) > 0.75 ? 0.6 : 0) : 0;
    const zap2 = t > T.gic && t < T.dark ? (Math.sin(t * 31 + Math.sin(t * 7)) > 0.6 - 0.4 * sm(T.gic, T.dark, t) ? 1 : 0) * sm(T.gic, T.dark, t) : 0;
    const boom = t > T.dark ? Math.exp(-(t - T.dark) * 3.5) * 4 : 0;
    arc.material.opacity = Math.min(1, zap + zap2 + boom); arc.scale.setScalar(1.2 + 3 * zap2 + 14 * boom);
    arcLight.intensity = 20 * (zap + zap2) + 160 * boom;
    {
      const a = sparkGeo.attributes.position.array;
      sparks.forEach((s, i) => { const u = t - s.t0; if (u < 0 || u > s.life) { a[i * 3 + 1] = -1e5; return; } a[i * 3] = TRANSFO.x + s.vx * u; a[i * 3 + 1] = TRANSFO.y + s.vy * u - 4.9 * u * u; a[i * 3 + 2] = TRANSFO.z + s.vz * u; });
      sparkGeo.attributes.position.needsUpdate = true;
    }
    smokes.forEach((s) => { const u = ((t - T.dark) * 0.25 + s.ph) % 1; const on = t > T.dark ? sm(0, 1.5, t - T.dark) : 0; s.s.position.set(TRANSFO.x + u * 1.5, TRANSFO.y + 0.5 + u * 7, TRANSFO.z); s.s.scale.setScalar(1 + u * 4); s.s.material.opacity = on * 0.5 * (1 - u); });
    // --- le jet d'eau : la pompe s'arrête avec le courant
    {
      const a = jetGeo.attributes.position.array;
      jet.forEach((p, i) => { const s = ((t * 0.9 + p.ph) % 1) * 0.95; const born = t - s; if (born > T.dark + 0.1) { a[i * 3 + 1] = -1e5; return; } const r = 0.15 + p.v * s; a[i * 3] = Math.cos(p.a) * r; a[i * 3 + 1] = Math.max(0.62, 2.75 + p.up * s - 4.9 * s * s); a[i * 3 + 2] = Math.sin(p.a) * r; });
      jetGeo.attributes.position.needsUpdate = true;
    }
    V.waterMat.emissiveIntensity = 0.4 * (t < T.dark ? 1 : 0.4);
    posePeople(t); poseBirds(t);
    renderer.toneMappingExposure = 1.35 + 0.25 * sm(T.dark, T.dark + 2.5, t);   // l'œil s'habitue au noir
    hemi.intensity = 0.55 - 0.15 * sm(T.dark, T.dark + 0.3, t);

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    HUD.live(t, 'VILLAGE · CAM 01', `09/10/2026 · 22:${pad(14 + Math.floor(t / 60))}:${pad(Math.floor(t) % 60)}`);
    HUD.block(1, { label: 'ORAGE MAGNÉTIQUE', value: 'NIVEAU 1859', sub: 'AU-DELÀ DU MAXIMUM DE L’ÉCHELLE (G5)', color: '#fff' });
    HUD.show2(true);
    const grid = t < T.gic ? 'NORMAL' : t < T.fry ? 'SURCHARGE' : t < T.dark ? 'TRANSFOS EN SURCHAUFFE' : 'EN PANNE';
    const gps = t < T.gps ? 'GPS : OK · SATELLITES : OK' : t < T.dark ? 'GPS : PERTURBÉ · SATELLITES : PANNES' : 'GPS : PERTURBÉ · RÉSEAU MOBILE : COUPÉ';
    HUD.block(2, { label: 'RÉSEAU ÉLECTRIQUE', value: grid, sub: gps, color: t < T.gic ? '#fff' : t < T.dark ? '#ffb15e' : '#ff6b5e', scale: grid.length > 12 ? 0.72 : 1 });
    HUD.hook(t, 'Et si la tempête solaire<br>de 1859 frappait <em>ce soir</em> ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.reticle('transfo', tmp.copy(TRANSFO), camera, 'TRANSFORMATEUR', sm(T.fry - 0.2, T.fry + 0.4, t) * (1 - sm(T.dark - 0.4, T.dark, t)), 70);
    HUD.end(t, T.endCard, { kicker: 'EN MAI 2024, DES AURORES ONT ÉTÉ VUES PARTOUT EN FRANCE', q: 'Et toi, tu tiendrais combien<br>de temps sans électricité ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

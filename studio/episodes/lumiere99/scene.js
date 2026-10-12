// =====================================================================
//  ÉPISODE : « Et si tu courais à 99 % de la vitesse de la lumière ? » — la ligne droite du 100 m, dans un grand stade
//  Faits (fiche) : γ(0,99) = 7,09 ; énergie cinétique (γ − 1)mc² pour 70 kg = 3,8 × 10¹⁹ J ≈ 9 200 Mt de TNT
//  ≈ 180 bombes Tsar (50 Mt) ≈ 4 mois de l'électricité mondiale (~30 000 TWh/an, Ember 2025).
//  100 m en 0,34 µs ; dans ton référentiel, la piste se contracte à 14 m. Record du 100 m : 9,58 s (U. Bolt, Berlin 2009).
//  Dans l'air : chaque molécule percutée = une collision nucléaire (cf. R. Munroe, « Relativistic Baseball », What If?).
//  Record de vitesse d'un engin humain : sonde Parker, ~692 000 km/h (24/12/2024, NASA) = 0,064 % de c.
// =====================================================================
import { THREE, createStage, makeSky, makeSun, M, add, box, cyl, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, fr, pad, bake, canvasTex, dotTex } from '../../engine.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, ready: 25.8, go: 27.0, slow1: 37.0, flash: 37.0, lost: 38.6, real: 44.0, endCard: 59.0, duration: 63.2 };
const SLOW = 3e7;   // ralenti ×30 millions : la lumière avance à 10 m par seconde de vidéo
const SUBS = [
  [3.3, 7.5, 'Le record du 100 m : 9,58 s. Usain Bolt, 2009.'],
  [7.8, 12.0, '99 % de la vitesse de la lumière : plus d’un milliard de km/h.'],
  [12.2, 16.5, 'Le 100 m en 0,34 millionième de seconde.'],
  [16.8, 21.5, 'Pour atteindre cette vitesse : l’énergie de 180 bombes Tsar.'],
  [21.8, 25.6, 'Plus de 4 mois de toute l’électricité produite sur Terre.'],
  [27.2, 31.0, 'Au ralenti ×30 millions : la lumière va à peine plus vite que toi.'],
  [31.2, 34.8, 'Chaque molécule d’air qui te percute déclenche une collision nucléaire.'],
  [35.0, 36.9, 'Tu te désintègres…'],
  [38.7, 43.8, '…en libérant l’équivalent de 9 milliards de tonnes de TNT.'],
  [44.2, 48.8, 'En vrai, impossible : plus tu approches de la lumière, plus c’est dur.'],
  [49.0, 53.8, 'Pour l’atteindre, il faudrait une énergie infinie.'],
  [54.0, 58.8, 'Notre record de vitesse : la sonde Parker, 692 000 km/h.'],
];

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 62, far: 4000, bloom: [0.3, 0.45, 0.85], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.0;
  document.documentElement.style.setProperty('--accent', '#9fd8ff');
  const R = rng(299792);
  const SUN_DIR = dirAzEl(150, 38);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.04, 0.14, 0.42], dayHor: [0.42, 0.52, 0.64], stars: 0 });
  const sunSprite = makeSun(scene, SUN_DIR, 50);
  const sun = new THREE.DirectionalLight('#fff2dc', 3.0); sun.position.copy(SUN_DIR).multiplyScalar(300); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 800 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  sun.target.position.set(0, 0, -60); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c8dcff', '#6a7a5a', 0.95); scene.add(hemi);

  // -------------------------------------------------------------------
  // LE STADE : pelouse, piste (couloirs, lignes blanches), tribunes en gradins avec la foule, toit en anneau, projecteurs
  //  la ligne droite du 100 m : départ en z = 0, arrivée en z = −100 ; couloirs vers −x (couloir 1 en x = 0)
  // -------------------------------------------------------------------
  const world = new THREE.Group();
  const CX = 36, CZ = -50, AX = 96, AZ = 132;   // centre et demi-axes de l'ovale intérieur des tribunes
  add(new THREE.PlaneGeometry(900, 900), M('#5d7a46'), world, CX, -0.05, CZ, -Math.PI / 2);
  // pelouse rayée
  for (let i = 0; i < 12; i++) add(new THREE.PlaneGeometry(68, 9), M(i % 2 ? '#4f8a3a' : '#5a9744'), world, CX, 0.01, CZ - 50 + i * 9 + 4.5, -Math.PI / 2);
  // piste : un ovale violet (comme à Paris 2024) — ici, simplifié : la ligne droite et le tour
  const trackTex = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#6b4f9e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f2ee'; for (let i = 0; i <= 8; i++) g.fillRect(i * (w / 8.0) - 2, 0, 3, h); });
  { const shape = new THREE.Shape(); shape.absellipse(CX, -CZ, 52, 82, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absellipse(CX, -CZ, 40, 70, 0, Math.PI * 2, true); shape.holes.push(hole);
    add(new THREE.ShapeGeometry(shape, 80), M('#6b4f9e'), world, 0, 0.02, 0, -Math.PI / 2); }
  // la ligne droite (avec ses couloirs), prolongée au-delà de l'arrivée
  const straight = add(new THREE.PlaneGeometry(9.76, 150), M('#ffffff', { map: trackTex, flat: false }), world, -4.88, 0.03, -55, -Math.PI / 2);
  trackTex.wrapT = THREE.RepeatWrapping;
  box(9.76, 0.02, 0.05, M('#ffffff'), world, -4.88, 0.04, 0); box(9.76, 0.02, 0.05, M('#ffffff'), world, -4.88, 0.04, -100);   // départ, arrivée
  // tribunes : 3 anneaux de gradins (couleurs de sièges) + la foule (petits points colorés)
  const seat = [M('#2a3f7a'), M('#3a3f48'), M('#2a3f7a')];
  const crowdPos = [], crowdCol = [];
  const pal = ['#e8e2d4', '#3d6e9e', '#b2453a', '#f0d24a', '#2f2f2f', '#e86a8a', '#6a7f4a', '#ffffff', '#1f4fa0', '#d03a3a'].map((c) => new THREE.Color(c));
  for (let tier = 0; tier < 3; tier++) for (let row = 0; row < 14; row++) {
    const k = tier * 14 + row, rx = AX + k * 1.25 + tier * 3, rz = AZ + k * 1.25 + tier * 3, y = 1.5 + k * 0.85 + tier * 4;
    const segs = 120; const pts = [];
    for (let i = 0; i < segs; i++) { const a = (i / segs) * Math.PI * 2; pts.push([CX + rx * Math.cos(a), CZ + rz * Math.sin(a), a]); }
    for (let i = 0; i < segs; i++) { const [x1, z1, a] = pts[i], [x2, z2] = pts[(i + 1) % segs]; const len = Math.hypot(x2 - x1, z2 - z1);
      const st = box(len + 0.2, 0.85, 1.3, seat[tier], world, (x1 + x2) / 2, y - 0.42, (z1 + z2) / 2); st.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      for (let p = 0; p < len / 0.7; p++) { if (R() < 0.12) continue; const f = (p + 0.5) / (len / 0.7); crowdPos.push(x1 + (x2 - x1) * f, y + 0.45, z1 + (z2 - z1) * f); const c = pal[(R() * pal.length) | 0]; crowdCol.push(c.r, c.g, c.b); } }
  }
  // l'anneau du toit, suspendu, et les poteaux
  { const g = new THREE.TorusGeometry(1, 0.06, 6, 120); g.scale(AX + 62, AZ + 62, 30); const m = add(g, M('#d9dde2', { side: THREE.DoubleSide }), world, CX, 46, CZ, Math.PI / 2); m.scale.set(1, 1, 1); }
  { const sh = new THREE.Shape(); sh.absellipse(CX, -CZ, AX + 70, AZ + 70, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absellipse(CX, -CZ, AX + 38, AZ + 38, 0, Math.PI * 2, true); sh.holes.push(hole);
    add(new THREE.ShapeGeometry(sh, 120), M('#e4e7ea', { side: THREE.DoubleSide }), world, 0, 47, 0, -Math.PI / 2); }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; cyl(0.8, 1.0, 47, 8, M('#cfd3d8'), world, CX + (AX + 64) * Math.cos(a), 23.5, CZ + (AZ + 64) * Math.sin(a)); }
  // mur du fond de tribune (extérieur)
  scene.add(bake(world));
  const crowdGeo = new THREE.BufferGeometry(); crowdGeo.setAttribute('position', new THREE.Float32BufferAttribute(crowdPos, 3)); crowdGeo.setAttribute('color', new THREE.Float32BufferAttribute(crowdCol, 3));
  const crowd = new THREE.Points(crowdGeo, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true })); scene.add(crowd);
  scene.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; } });

  // le coureur (toi), le starter, des photographes à l'arrivée
  const RUN = makePerson(scene, { shirt: '#1f4fa0', pants: '#1f1f2a', skin: '#c99872', hair: '#1f1712' });
  RUN.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const START = new THREE.Vector3(-4.3, 0, 0);
  box(0.5, 0.2, 0.7, M('#d03a3a'), scene, START.x, 0.1, START.z + 0.7);   // les starting-blocks
  const starter = makePerson(scene, { shirt: '#e03a3a', pants: '#f2f2f2', hair: '#8a8a8a' }); starter.root.position.set(3.5, 0, 6); starter.root.rotation.y = -2.2;
  const photogs = [0, 1, 2, 3].map((i) => { const P = makePerson(scene, { shirt: ['#2f2f2f', '#e8e2d4', '#3d6e9e', '#6a7f4a'][i], pants: '#2f2f2f' }); P.root.position.set(-12 + i * 1.6, 0, -106); P.root.rotation.y = 0.2 * (i - 1.5); P.crouch = i % 2; return P; });

  // -------------------------------------------------------------------
  // L'EFFET « 99 % DE C » : la bulle de lumière (rayon = c·t), le plasma devant le coureur, la traînée ionisée, la boule de feu
  // -------------------------------------------------------------------
  const glowTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(200,225,255,0.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  const bubbleMat = new THREE.ShaderMaterial({ uniforms: { uOp: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN, vV; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float uOp; varying vec3 vN, vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(vec3(0.55, 0.75, 1.0) * f * 1.6 * uOp, 1.0); }' });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), bubbleMat); bubble.position.copy(START).setY(1.0); scene.add(bubble);
  const plasma = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(3.5, 4.2, 6.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); scene.add(plasma);
  // le canal d'air ionisé derrière le coureur : un tube lumineux qui s'allonge
  const chanMat = new THREE.ShaderMaterial({ uniforms: { uOp: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN, vV; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float uOp; varying vec3 vN, vV; varying vec2 vUv; void main(){ float f = pow(abs(dot(vN, vV)), 2.0); float along = vUv.y; gl_FragColor = vec4(vec3(0.5, 0.7, 1.0) * f * (0.4 + 0.6 * along) * uOp, 1.0); }' });
  const chan = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 16, 1, true).translate(0, 0.5, 0).rotateX(-Math.PI / 2), chanMat); scene.add(chan);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.5, 0.65, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); scene.add(halo);
  const bits = Array.from({ length: 160 }, () => ({ s: new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(4, 3.6, 3.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })), v: new THREE.Vector3((R() - 0.5) * 3, R() * 2.5, -R() * 4), t0: 33 + R() * 4 }));
  bits.forEach((b) => scene.add(b.s));
  const runLight = new THREE.PointLight('#bcd8ff', 0, 120, 1.4); scene.add(runLight);
  const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(8, 7, 6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); scene.add(fire);

  // HUD propre à l'épisode : étiquette, « signal perdu » (de la neige grise, pas d'écran noir)
  const hud = document.getElementById('hud');
  const mk = (css) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;pointer-events:none;opacity:0;' + css; hud.appendChild(d); return d; };
  const tag = mk("left:0;right:0;top:560px;text-align:center;font-family:'Inter';font-weight:800;font-size:28px;letter-spacing:0.16em;");
  const tagIn = document.createElement('span'); tagIn.style.cssText = 'display:inline-block;padding:11px 20px;border-radius:6px;color:#fff;'; tag.appendChild(tagIn);
  const snowC = document.createElement('canvas'); snowC.width = 270; snowC.height = 480; snowC.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;image-rendering:pixelated;opacity:0;pointer-events:none;';
  hud.insertBefore(snowC, hud.firstChild); const sg = snowC.getContext('2d'); const sR = rng(7);
  const lostTxt = mk("left:0;right:0;top:820px;text-align:center;font-family:'Inter';font-weight:800;font-size:58px;letter-spacing:0.2em;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,.7);");
  lostTxt.textContent = 'SIGNAL PERDU';
  const big = mk("left:0;right:0;top:700px;text-align:center;font-family:'Inter';font-weight:800;font-size:150px;color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.5);");

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(-7.5, 7.5, 13), LOOK = new THREE.Vector3(-3.8, -2, -90);
  const tmp = new THREE.Vector3();
  function update(t) {
    const slow = t >= T.go && t < T.flash, lost = t >= T.lost && t < T.real, flashK = t >= T.flash && t < T.lost ? 1 : 0;
    const u = slow ? t - T.go : 0;                         // secondes de vidéo depuis le départ (au ralenti)
    const zr = -9.9 * u;                                   // le coureur : 0,99 × 10 m/s (vitesse de la lumière au ralenti)
    camera.position.copy(CAM); const shake = flashK * Math.exp(-(t - T.flash) * 2) * 0.6; camera.position.x += Math.sin(t * 71) * shake; camera.position.y += Math.cos(t * 53) * shake;
    camera.lookAt(LOOK); camera.fov = 62; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); sky.follow(camera); sunSprite.follow(camera);
    // le coureur : échauffement → dans les blocs → course (au ralenti, une foulée normale !) → se désintègre
    RUN.reset(); RUN.root.visible = true; RUN.root.rotation.set(0, Math.PI, 0); RUN.fade(1);
    if (t < T.ready - 2.5 || t >= T.real) { RUN.root.position.set(START.x + 0.4 * Math.sin(t * 0.5), 0, START.z + 2.5); RUN.armL.rotation.set(0, 0, 0.4 + 0.2 * Math.sin(t * 2)); RUN.armR.rotation.set(0, 0, -0.4 - 0.2 * Math.sin(t * 2)); RUN.head.rotation.y = 0.3 * Math.sin(t * 0.7); }
    else if (t < T.go) { RUN.root.position.set(START.x, 0, START.z + 0.55); const set = sm(T.ready - 2.5, T.ready - 1.5, t); RUN.body.position.y = 0.9 - 0.42 * set; RUN.body.rotation.x = 1.0 * set;
      for (const L of RUN.legs) { L.hip.rotation.x = -1.4 * set; L.knee.rotation.x = 1.9 * set; } RUN.legs[0].hip.rotation.x = -0.9 * set; RUN.armL.rotation.set(-1.0 * set, 0, 0); RUN.armR.rotation.set(-1.0 * set, 0, 0);
      const up = sm(T.go - 0.9, T.go - 0.4, t); RUN.body.position.y += 0.25 * up; RUN.body.rotation.x -= 0.4 * up; }
    else if (slow) { RUN.root.position.set(START.x, 0, START.z + zr); RUN.walk(u * 9.0, 1.9); RUN.body.rotation.x = 0.25 * (1 - sm(0, 2, u)) + 0.12;
      const dis = sm(T.go + 6.5, T.slow1, t); RUN.fade(1 - dis); RUN.mats.forEach((m) => { m.emissive = m.emissive || new THREE.Color(); m.emissive.setRGB(0.6 * sm(T.go + 2, T.go + 7, t), 0.8 * sm(T.go + 2, T.go + 7, t), 1.0 * sm(T.go + 2, T.go + 7, t)); }); }
    else RUN.root.visible = false;
    if (!slow) RUN.mats.forEach((m) => m.emissive && m.emissive.setRGB(0, 0, 0));
    starter.reset(); starter.root.position.set(3.5, 0, 6); starter.root.rotation.y = -2.2; if (t > T.ready - 1 && t < T.go + 0.5) starter.armR.rotation.set(-2.6, 0, 0.2);
    const alive = !(t > T.flash && t < T.real); starter.root.visible = alive;
    photogs.forEach((P) => { P.reset(); if (P.crouch) { P.body.position.y = 0.55; for (const L of P.legs) { L.hip.rotation.x = -1.3; L.knee.rotation.x = 1.9; } } P.armL.rotation.set(-1.4, 0, 0.2); P.armR.rotation.set(-1.4, 0, -0.2); P.root.visible = alive; });
    // la bulle de lumière (tout ce que la lumière émise au départ a parcouru : 10 m par seconde de vidéo)
    bubble.visible = slow; bubble.scale.setScalar(Math.max(0.01, 10 * u)); bubbleMat.uniforms.uOp.value = slow ? 0.9 : 0;
    // plasma devant le coureur, traînée ionisée
    const pk = slow ? sm(0.2, 2.5, u) : 0;
    plasma.position.set(START.x, 1.0, START.z + zr - 0.8); plasma.scale.setScalar(1.2 + 2.2 * pk); plasma.material.opacity = 0.8 * pk;
    runLight.position.set(START.x, 2, START.z + zr - 1); runLight.intensity = slow ? 400 * pk : 0;
    chan.visible = slow && u > 0.05; chan.position.set(START.x, 1.0, START.z); chan.scale.set(1 + 0.08 * u, 1 + 0.08 * u, Math.max(0.01, -zr)); chanMat.uniforms.uOp.value = 0.8 * pk;
    halo.visible = slow; halo.position.set(START.x, 1.0, START.z + zr / 2); halo.scale.set(6 + 0.2 * u, 6 + 0.2 * u, 1); halo.material.opacity = 0.25 * pk;
    bits.forEach((b) => { const uu = t - b.t0; const on = slow && uu > 0; b.s.visible = on; if (!on) return; b.s.position.set(START.x + b.v.x * uu, 1 + b.v.y * uu, START.z + zr + b.v.z * uu); b.s.scale.setScalar(0.25); b.s.material.opacity = Math.max(0, 1 - uu * 0.6); });
    // l'explosion (temps réel) : un éclair, puis la boule de feu qui avale tout
    const fk = t >= T.flash && t < T.real ? t - T.flash : -1;
    fire.visible = fk >= 0; if (fk >= 0) { fire.position.set(START.x, 10, -160); fire.scale.setScalar(80 + 1400 * sm(0, 1.4, fk)); fire.material.opacity = 1; }
    HUD.flash(fk >= 0 && !lost ? Math.min(1, (1 - sm(0.05, 0.6, fk)) + sm(0.9, 1.5, fk)) : 0);
    renderer.toneMappingExposure = slow ? 0.9 : 1.0;
    // signal perdu : neige grise
    snowC.style.opacity = lost ? 1 : 0; lostTxt.style.opacity = lost ? 0.6 + 0.4 * (Math.floor(t * 3) % 2) : 0;
    if (lost) { const img = sg.createImageData(270, 480); for (let i = 0; i < img.data.length; i += 4) { const v = 60 + sR() * 150; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } sg.putImageData(img, 0, 0); }

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const clk = 21 * 3600 + 3 * 60 + (t < T.real ? t : t - T.real + 200);
    HUD.live(t, 'STADE · LIGNE DROITE · CAM 04', `${t >= T.go && t < T.real ? 'RECONSTITUTION' : '10/10/2026'} · ${pad(Math.floor(clk / 3600))}:${pad(Math.floor(clk / 60) % 60)}:${pad(Math.floor(clk) % 60)}`);
    HUD.show2(!lost);
    if (t < T.go || t >= T.real) {
      HUD.block(1, { label: t < T.real ? 'OBJECTIF' : 'IMPOSSIBLE', value: t < T.real ? '99 % de c' : 'c = limite', sub: t < T.real ? '1 068 460 000 KM/H · LE 100 M EN 0,34 µS' : 'IL FAUDRAIT UNE ÉNERGIE INFINIE', color: '#9fd8ff' });
      HUD.block(2, { label: t < T.real ? 'ÉNERGIE NÉCESSAIRE (70 KG)' : 'RECORD HUMAIN', value: t < T.real ? '9 200 Mt' : '692 000 km/h', sub: t < T.real ? '180 BOMBES TSAR · 4 MOIS D’ÉLECTRICITÉ MONDIALE' : 'SONDE PARKER, 2024 · 0,064 % DE C', color: '#ffd36b' });
    } else if (slow) {
      const ns = u / SLOW * 1e9;
      HUD.block(1, { label: 'TEMPS ÉCOULÉ', value: `${fr(ns, 0)} ns`, sub: `DISTANCE : ${fr(-zr, 1)} M · LA LUMIÈRE : ${fr(10 * u, 1)} M`, color: '#fff' });
      HUD.block(2, { label: 'DANS TON RÉFÉRENTIEL', value: 'piste ÷ 7', sub: 'LE 100 M NE FAIT PLUS QUE 14 M · γ = 7,09', color: '#9fd8ff' });
    } else HUD.block(1, { label: 'ÉNERGIE LIBÉRÉE', value: '9 200 Mt', sub: 'DE QUOI RASER TOUTE L’ÎLE-DE-FRANCE', color: '#ff6b5e' });
    let tg = '', bg = 'rgba(20,24,30,0.75)';
    if (slow) tg = 'RECONSTITUTION · RALENTI ×30 000 000';
    else if (t >= T.real && t < T.real + 2.4) { tg = 'RETOUR À LA RÉALITÉ'; bg = 'rgba(28,140,90,0.9)'; }
    if (tagIn.textContent !== tg) tagIn.textContent = tg; tagIn.style.background = bg; tag.style.opacity = tg ? 1 : 0;
    // compte à rebours « À vos marques, prêts, partez ! »
    const cd = t > T.ready - 2.6 && t < T.go + 0.6 ? (t < T.ready - 1.2 ? 'À vos marques' : t < T.go - 0.05 ? 'Prêts…' : 'PARTEZ !') : '';
    big.textContent = cd; big.style.fontSize = cd === 'PARTEZ !' ? '150px' : '96px'; big.style.opacity = cd ? 1 : 0;
    HUD.hook(t, 'Et si tu courais à<br><em>99 %</em> de la vitesse<br>de la lumière ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.end(t, T.endCard, { kicker: 'ET À 99 % DE C, TON TEMPS S’ÉCOULERAIT 7 FOIS PLUS LENTEMENT…', q: 'Tu irais où, à 99 %<br>de la vitesse de la lumière ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

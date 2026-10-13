// =====================================================================
//  LA SÉRIE « 17 OCTOBRE » : le décor de la place de la Bastille, la foule, le gaz lacrymogène, l'équipement.
//
//  const B = makeBastille(scene, renderer)        → la colonne de Juillet (avec le Génie doré), l'Opéra Bastille,
//                                                    les immeubles haussmanniens, le sol, les lampadaires
//  const G = makeGas(scene, { from, to, tFire, tLand, wind })   → la grenade (arc + traînée) puis le nuage
//        G.update(t) (t = temps de la chorégraphie), G.densityAt(point, t) → 0..1 (combien de gaz à cet endroit)
//  goggles(), ffp2() → des objets à accrocher avec P.attach(objet, 'eyes' | 'mouth')
//
//  Repère : la colonne est en (0, 0, 0). Le boulevard de la caméra arrive par +Z.
// =====================================================================
import { THREE, M, add, box, cyl, bake, rng, clamp, sm, lerp } from './engine.js';
import { building } from './lib.js';

export function makeBastille(scene, renderer, { seed = 1789, PEOPLE = null, streets = null } = {}) {
  const R = rng(seed), world = new THREE.Group();
  // --- le sol : bitume, terre-plein central en pierre, passages piétons
  const asphalt = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#4a4c50'; g.fillRect(0, 0, 512, 512); const r = rng(3);
    for (let i = 0; i < 9000; i++) { const v = 60 + r() * 40; g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`; g.fillRect(r() * 512, r() * 512, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const stone = M('#b9b2a4'), stoneDark = M('#8f897c');
  add(new THREE.CylinderGeometry(17, 17.4, 0.25, 64), stone, world, 0, 0.12, 0);                  // le terre-plein
  add(new THREE.CylinderGeometry(15.5, 15.5, 0.06, 64), M('#7f8a5c'), world, 0, 0.27, 0);          // la pelouse autour
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2, rr = 32; box(2.8, 0.02, 9, M('#d8d8d2'), world, Math.cos(a) * rr, 0.02, Math.sin(a) * rr, -a); }   // passages piétons (simplifiés)

  // --- la colonne de Juillet (≈ 50 m avec le Génie)
  const bronze = new THREE.MeshStandardMaterial({ color: '#3e4a3d', roughness: 0.45, metalness: 0.35 }), gold = new THREE.MeshStandardMaterial({ color: '#e8bd5e', roughness: 0.35, metalness: 0.45, emissive: '#7a5410', emissiveIntensity: 0.55 });
  add(new THREE.CylinderGeometry(8.5, 9, 1.4, 48), stoneDark, world, 0, 0.7, 0);                  // le socle rond
  box(9.5, 6.5, 9.5, M('#e9e5dc'), world, 0, 1.4 + 3.25, 0);                                        // le piédestal de marbre
  box(10.3, 0.6, 10.3, M('#f2eee6'), world, 0, 1.4 + 6.5, 0);
  add(new THREE.CylinderGeometry(2.9, 3.2, 3.2, 32), bronze, world, 0, 8.5 + 1.6, 0);              // la base de bronze
  const shaftH = 31, y0 = 11.7;
  add(new THREE.CylinderGeometry(1.75, 1.95, shaftH, 32), bronze, world, 0, y0 + shaftH / 2, 0);  // le fût
  for (const f of [0.2, 0.45, 0.7]) add(new THREE.CylinderGeometry(1.98, 1.98, 0.5, 32), gold, world, 0, y0 + shaftH * f, 0);   // les anneaux dorés
  add(new THREE.CylinderGeometry(2.6, 1.9, 1.6, 32), bronze, world, 0, y0 + shaftH + 0.8, 0);     // le chapiteau
  add(new THREE.CylinderGeometry(2.7, 2.7, 0.35, 32), bronze, world, 0, y0 + shaftH + 1.75, 0);   // le balcon
  add(new THREE.CylinderGeometry(1.1, 1.3, 2.6, 24), bronze, world, 0, y0 + shaftH + 3.2, 0);     // la lanterne
  add(new THREE.SphereGeometry(1.15, 24, 12), gold, world, 0, y0 + shaftH + 4.6, 0);              // le globe
  const statueY = y0 + shaftH + 5.5;
  // --- l'Opéra Bastille (façade courbe de verre gris, à droite du boulevard)
  const operaTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#6f7a86'; g.fillRect(0, 0, 512, 512); g.strokeStyle = '#d9dde2'; g.lineWidth = 6;
    for (let x = 0; x <= 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
    for (let y = 0; y <= 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 4); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const opera = new THREE.Mesh(new THREE.CylinderGeometry(42, 42, 34, 48, 1, true, -0.2, 1.5), new THREE.MeshStandardMaterial({ map: operaTex, color: '#7d8994', roughness: 0.35, metalness: 0.4, side: THREE.DoubleSide }));
  opera.position.set(78, 17, -38); world.add(opera);
  box(22, 24, 2.5, M('#c9cdd2'), world, 44, 12, -14, -0.7);                                              // le grand cadre blanc de l'entrée
  // --- les immeubles haussmanniens autour de la place (pierre claire, toits de zinc)
  const winDark = M('#2c3036', { r: 0.3 });
  const ring = [[-60, -70, 0.7], [-80, -30, 1.2], [-82, 20, 1.6], [-70, 60, 2.2], [-40, 82, 2.6], [40, -88, -0.2], [0, -95, 0], [-30, -90, 0.3], [70, 60, -2.2]];
  const facade = (g, x, w) => building(g, { x, z: 0, w, d: 14, h: 19 + Math.floor(R() * 3) * 3, wall: ['#e7dcc6', '#ddd2bb', '#e9e0cd'][Math.floor(R() * 3)], roof: '#5f6873', shutter: '#d9d0bc', shop: { color: '#3b3a37', awning: R() < 0.5 ? '#8a2f2a' : '#2f4b3a' }, balcony: true, R, winDarkMat: winDark });
  if (!streets) for (const [x, z] of ring) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); world.add(g);
    for (let k = -1; k <= 1; k++) facade(g, k * 17, 16.5);
  } else {   // un anneau d'immeubles avec des trous là où partent les rues (pour la vue du ciel)
    const RR = 96, open = (a) => streets.some((s) => { let d = Math.abs(((a - s.a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return d * RR < s.w / 2 + 6; });
    for (let a = 0; a < Math.PI * 2; a += 17 / RR) { if (open(a) || (Math.abs(a) < 0.25 || Math.abs(a - Math.PI * 2) < 0.25)) continue;
      const g = new THREE.Group(); g.position.set(Math.sin(a) * RR, 0, Math.cos(a) * RR); g.rotation.y = a + Math.PI; world.add(g); facade(g, 0, 17.5); }
  }
  // --- lampadaires
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = 24; cyl(0.09, 0.12, 6, 8, M('#2b2f2c'), world, Math.cos(a) * rr, 3, Math.sin(a) * rr); add(new THREE.SphereGeometry(0.3, 10, 8), M('#f3ead2'), world, Math.cos(a) * rr, 6.1, Math.sin(a) * rr); }
  scene.add(bake(world));
  // --- le Génie de la Liberté : une silhouette dorée sur un pied, un bras levé, avec des ailes
  let genie = null;
  if (PEOPLE) {
    genie = PEOPLE.make({ outfit: 0, height: 4.2, shadows: false });
    genie.mats.forEach((m) => { m.map = null; m.color = new THREE.Color('#e8bd5e'); m.metalness = 0.45; m.roughness = 0.35; m.emissive = new THREE.Color('#7a5410'); m.emissiveIntensity = 0.6; });
    genie.do({ RightArm: [['z', -2.3]], LeftArm: [['z', -0.6], ['x', -0.4]], LeftUpLeg: [['x', 0.5]], LeftLeg: [['x', 0.9]] });
    genie.root.position.set(0, statueY, 0); genie.root.rotation.y = 0.5; scene.add(genie.root);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), gold); w.position.set(sx * 0.7, statueY + 2.6, -0.35); w.rotation.set(0.2, sx * 0.6, sx * 0.3); scene.add(w); }
  }
  return { statueY, genie, columnTop: new THREE.Vector3(0, statueY + 4.2, 0) };
}

// --- la fumée : une texture de bouffée douce, dessinée une fois
function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = rng(11);
  for (let i = 0; i < 26; i++) { const x = 64 + (r() - 0.5) * 50, y = 64 + (r() - 0.5) * 50, rad = 18 + r() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const t = new THREE.CanvasTexture(c); return t;
}

/** la grenade lacrymogène : tirée de `from`, elle tombe en `to`, puis le nuage grandit et dérive avec le vent */
export function makeGas(scene, { from, to, tFire, tLand, wind = new THREE.Vector3(-0.9, 0, 0.15), n = 240, seed = 7, color = '#e9ecee', spread = 1 }) {
  const R = rng(seed), F = from.clone(), T = to.clone();
  // la grenade elle-même
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10), M('#3d4a3a', { r: 0.5 })); can.rotation.z = Math.PI / 2; scene.add(can);
  // les bouffées : une seule géométrie répétée, toujours tournée vers la caméra
  const g = new THREE.InstancedBufferGeometry(); g.copy(new THREE.PlaneGeometry(1, 1)); g.instanceCount = n;
  const aA = new Float32Array(n * 4), aB = new Float32Array(n * 4);   // aA : naissance, angle, vitesse de croissance, taille max ; aB : dérive x, y, z, trajectoire (0 = traînée, 1 = nuage)
  for (let i = 0; i < n; i++) {
    const trail = i < 22;
    aA.set([trail ? tFire + (tLand - tFire) * (i / 22) : tLand + Math.pow(R(), 1.6) * 7.0, R() * 6.28, 0.6 + R() * 0.8, (trail ? 0.32 : 1.7 + R() * 1.9) * spread], i * 4);
    aB.set([(R() - 0.5) * 4.2, 0.12 + R() * 0.45, (R() - 0.5) * 4.2, trail ? i / 22 : 1], i * 4);
  }
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(aA, 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(aB, 4));
  const U = { uT: { value: -1 }, uFrom: { value: F }, uTo: { value: T }, uWind: { value: wind.clone() }, uTex: { value: puffTex() }, uCol: { value: new THREE.Color(color) }, uFade: { value: 1 }, uTF: { value: tFire }, uTL: { value: tLand } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aA; attribute vec4 aB; uniform float uT, uTF, uTL, uFade; uniform vec3 uFrom, uTo, uWind; varying vec2 vUv; varying float vA;
      vec3 arc(float k){ vec3 p = mix(uFrom, uTo, k); p.y += sin(3.14159 * k) * 6.0; return p; }
      void main(){
        float age = uT - aA.x; vUv = uv; vA = 0.0;
        if (age < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        vec3 c; float size;
        if (aB.w < 1.0) { c = arc(aB.w); size = aA.w * (0.5 + age * 0.6); vA = 0.3 * exp(-age * 0.6); }
        else { c = uTo + vec3(aB.x, 0.0, aB.z) * (1.0 - exp(-age * 0.8)) * 1.6 + uWind * age * 0.55 + vec3(0.0, aB.y * age + 0.4, 0.0);
               size = aA.w * (1.0 - exp(-age * aA.z)) + 0.3; vA = 0.4 * smoothstep(0.0, 0.4, age) * exp(-age * 0.055); }
        vA *= uFade;
        vec4 mv = modelViewMatrix * vec4(c, 1.0); float a = aA.y + age * 0.15; mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
        mv.xy += rot * (position.xy * size); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uCol; varying vec2 vUv; varying float vA;
      void main(){ float a = texture2D(uTex, vUv).a * vA; if (a < 0.004) discard; gl_FragColor = vec4(uCol, a); }`,
  });
  const cloud = new THREE.Mesh(g, mat); cloud.frustumCulled = false; cloud.renderOrder = 5; scene.add(cloud);
  const arc = (k) => { const p = F.clone().lerp(T, k); p.y += Math.sin(Math.PI * k) * 6; return p; };
  function update(t, { fade = 1 } = {}) {
    U.uT.value = t; U.uFade.value = fade;
    const k = (t - tFire) / (tLand - tFire);
    can.visible = t >= tFire && fade > 0.01;
    if (k < 1) { can.position.copy(arc(clamp(k))); can.rotation.y = t * 8; }
    else { can.position.set(T.x + 0.3 * Math.min(1, (t - tLand) * 2), 0.04, T.z); can.rotation.y = 1.2; }
  }
  /** combien de gaz à cet endroit (0 à 1) : sert à savoir quand le nuage t'atteint */
  const densityAt = (p, t) => { if (t < tLand) return 0; const age = t - tLand; const c = T.clone().addScaledVector(wind, age * 0.55); const r = 1.5 + 3.2 * (1 - Math.exp(-age * 0.7)); return clamp(1 - p.distanceTo(c.setY(p.y)) / (r * 1.3)) * Math.exp(-age * 0.04); };
  return { update, densityAt, cloud, can, tFire, tLand };
}

// --- l'équipement à accrocher sur la tête
export function goggles() {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: '#16181c', roughness: 0.5 }), lens = new THREE.MeshStandardMaterial({ color: '#9fc4e0', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55 });
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.075, 0.05), frame); f.position.z = 0.0; g.add(f);
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.058, 0.012), lens); l.position.z = 0.027; g.add(l);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 6, 24, Math.PI), frame); strap.rotation.set(Math.PI / 2, 0, 0); strap.position.z = -0.01; strap.scale.set(1, 1.15, 1); g.add(strap);
  return g;
}
export function ffp2() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f2f3f1', roughness: 0.85 }));
  m.rotation.x = Math.PI / 2; m.scale.set(0.78, 0.5, 0.62); g.add(m);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.004, 4, 24, Math.PI), new THREE.MeshStandardMaterial({ color: '#dfe3e6' })); band.rotation.set(Math.PI / 2, 0, 0); band.position.z = -0.02; g.add(band);
  return g;
}

// =====================================================================
//  LA VILLE VUE DU CIEL : des pâtés d'immeubles (une seule géométrie répétée) entre les rues qui partent de la place,
//  et la foule « en tapis » dans les rues (des milliers de points de couleur), qui se remplit au fur et à mesure.
//  streets = [{ a (angle depuis +Z, vers +X), w (largeur), len (longueur), r0 (départ, rayon) }]
// =====================================================================
export function makeCity(scene, streets, { size = 3600, step = 42, r0 = 112, seed = 3 } = {}) {
  const R = rng(seed), pts = [];
  const nearStreet = (x, z) => streets.some((s) => { const dx = Math.sin(s.a), dz = Math.cos(s.a); const along = x * dx + z * dz, across = Math.abs(-x * dz + z * dx); return along > 0 && along < s.r0 + s.len + 60 && across < s.w / 2 + 8; });
  for (let x = -size / 2; x <= size / 2; x += step) for (let z = -size / 2; z <= size / 2; z += step) {
    const px = x + (R() - 0.5) * 4, pz = z + (R() - 0.5) * 4; if (Math.hypot(px, pz) < r0 || nearStreet(px, pz)) continue; pts.push([px, pz]);
  }
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), pts.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  pts.forEach(([x, z], i) => { const w = step - 7 - R() * 3, h = 18 + R() * 7; m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * 0.25), new THREE.Vector3(w, h, step - 7 - R() * 3)); mesh.setMatrixAt(i, m4);
    col.set(['#d8ccb4', '#cfc3ab', '#ded3bd', '#bfb7a8'][Math.floor(R() * 4)]); mesh.setColorAt(i, col); });
  mesh.receiveShadow = true; scene.add(mesh);
  // les toits de zinc : une plaque grise un peu plus petite posée sur chaque pâté
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#5f6873', roughness: 0.6 }), pts.length);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) { mesh.getMatrixAt(i, m4); m4.decompose(v, q, s); roofs.setMatrixAt(i, m4.compose(v.setY(s.y), q, s.set(s.x * 0.86, 2.6, s.z * 0.86))); }
  scene.add(roofs);
  return { mesh, roofs, count: pts.length };
}

export function makeCarpets(scene, streets, { density = 2 } = {}) {
  const U = { uFill: { value: 0 } }, list = [];
  for (const s of streets) {
    const g = new THREE.PlaneGeometry(s.w, s.len, 1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.05, s.r0 + s.len / 2);
    const mat = new THREE.ShaderMaterial({ uniforms: { uFill: U.uFill, uLen: { value: s.len }, uR0: { value: s.r0 }, uW: { value: s.w }, uSeed: { value: s.a * 13.7 }, fogColor: { value: new THREE.Color('#aab5c0') }, fogNear: { value: 120 }, fogFar: { value: 3200 } },
      vertexShader: 'varying vec2 vP; varying float vD; void main(){ vP = vec2(position.x, position.z); vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform float uFill, uLen, uR0, uW, uSeed; uniform vec3 fogColor; uniform float fogNear, fogFar; varying vec2 vP; varying float vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
        void main(){
          float along = vP.y - uR0; if (along > uFill * uLen) discard;   // la foule avance dans la rue
          vec2 cell = floor(vP / 0.7), f = fract(vP / 0.7) - 0.5; float r = h(cell);
          vec3 cloth = r < 0.2 ? vec3(0.16, 0.16, 0.2) : r < 0.38 ? vec3(0.22, 0.34, 0.66) : r < 0.52 ? vec3(0.78, 0.68, 0.45) : r < 0.66 ? vec3(0.72, 0.2, 0.2) : r < 0.8 ? vec3(0.9, 0.9, 0.88) : r < 0.9 ? vec3(0.9, 0.75, 0.25) : vec3(0.32, 0.45, 0.32);
          float d = length(f + (vec2(h(cell + 3.1), h(cell + 7.7)) - 0.5) * 0.25);
          vec3 c = mix(cloth, vec3(0.1, 0.07, 0.05), smoothstep(0.13, 0.06, d));   // la tête (cheveux)
          c = mix(c, vec3(0.24, 0.24, 0.26), smoothstep(0.42, 0.5, d));             // entre les gens : un peu de bitume
          float edge = smoothstep(0.0, 6.0, uFill * uLen - along);                     // le front de la foule, un peu clairsemé
          if (h(cell + 11.0) > edge + 0.15) discard;
          c = mix(c, fogColor, smoothstep(fogNear, fogFar, vD));
          gl_FragColor = vec4(c, 1.0); }` });
    const mesh = new THREE.Mesh(g, mat); mesh.rotation.y = s.a; scene.add(mesh); list.push(mesh);
  }
  const capacity = streets.reduce((a, s) => a + s.w * s.len * density, 0);
  return { list, capacity, set(fill) { U.uFill.value = fill; } };
}

// =====================================================================
//  L'EFFET MULTIPLICATION (inspiration : les vidéos « data » où un objet se démultiplie pendant qu'un compteur grimpe)
//
//  Recette en 3 temps :  1) un objet SEUL, avec son prix ou sa quantité ;  2) il se MULTIPLIE en un tas énorme
//  (le compteur grimpe, lentement puis d'un coup) ;  3) CONVERSION en un équivalent parlant (des personnes, des années
//  de salaire…), avec l'ÉQUATION en bas de l'écran.  Exemple complet : episodes/demo-jackpot/.
//
//  Règle caméra (choix de Curtis) : la caméra fixe de surveillance reste la signature de la chaîne ; elle ne
//  « s'envole » (recule, monte) QUE pendant cet effet, pour révéler le tas ou la foule.
//
//  makeBundle()                       → { geo, mats } : une liasse de 100 billets de 100 € (billet générique)
//  makePile(scene, { geo, mats, count, nx, nz, gap, t0, t1 })  → { mesh, countAt(t), update(t) }
//        le tas se remplit étage par étage, du centre vers les bords ; count(t) suit une exponentielle (1 → count)
//  makeCrowd(scene, PEOPLE, { count, t0, t1, spacing, exclude(x,z), near, fog }) → { countAt(t), update(t) }
//        une foule qui apparaît du centre vers l'extérieur : les `near` premiers sont de vrais personnages 3D,
//        les autres des « photos découpées » (imposteurs, comme les silhouettes en carton dans un stade)
//  makeEquation([{ label, value, color }, '÷', { … }, '=', { … }]) → { el, set(i, text), opacity(a) }
// =====================================================================
import { THREE, clamp, rng } from './engine.js';

// --- la liasse : billet générique (aucun élément des vrais billets), bande de papier « 10 000 € »
export function makeBundle({ value = '100', band = '10 000 €', colors = ['#79b394', '#5c9a7c', '#3f7a60'] } = {}) {
  const note = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 536; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 1024, 536); gr.addColorStop(0, colors[0]); gr.addColorStop(0.5, colors[1]); gr.addColorStop(1, colors[2]);
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 536);
    g.strokeStyle = 'rgba(230,255,240,0.22)'; g.lineWidth = 2;
    for (let k = 0; k < 26; k++) { g.beginPath(); for (let x = 0; x <= 1024; x += 8) { const y = 40 + k * 18 + Math.sin(x * 0.012 + k * 0.6) * 14 + Math.sin(x * 0.031 + k) * 5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(250, 268, 150, 190, 0, 0, 7); g.fill();
    g.font = '800 150px Inter'; g.fillStyle = 'rgba(235,255,240,0.85)'; g.fillText(value, 610, 190); g.font = '800 70px Inter'; g.fillText(value, 60, 500);
    g.strokeStyle = 'rgba(20,50,35,0.5)'; g.lineWidth = 6; g.strokeRect(14, 14, 996, 508);
    g.fillStyle = '#efe7d2'; g.fillRect(440, 0, 150, 536); g.fillStyle = '#b7362f'; g.fillRect(440, 0, 150, 18); g.fillRect(440, 518, 150, 18);
    g.save(); g.translate(515, 268); g.rotate(Math.PI / 2); g.font = '800 46px Inter'; g.fillStyle = '#3a3226'; g.textAlign = 'center'; g.fillText(band, 0, 16); g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const edge = (withBand, seed) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); const r = rng(seed);
    for (let y = 0; y < 64; y++) { const v = 200 + r() * 40; g.fillStyle = `rgb(${v * 0.86},${v},${v * 0.9})`; g.fillRect(0, y, 512, 1); }
    if (withBand) { g.fillStyle = '#efe7d2'; g.fillRect(219, 0, 74, 64); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const top = new THREE.MeshStandardMaterial({ map: note, roughness: 0.62 });
  const sideL = new THREE.MeshStandardMaterial({ map: edge(true, 7), roughness: 0.85 }), sideS = new THREE.MeshStandardMaterial({ map: edge(false, 8), roughness: 0.85 });
  return { geo: new THREE.BoxGeometry(0.147, 0.0108, 0.077), mats: [sideS, sideS, top, top, sideL, sideL], size: [0.147, 0.0108, 0.077] };
}

// --- le tas qui se remplit
export function makePile(scene, { geo, mats, count, nx = 10, nz = 20, gap = 0.002, t0, t1, x = 0, z = 0, seed = 5, drop = 0.45 }) {
  geo.computeBoundingBox(); const bb = geo.boundingBox, SX = bb.max.x - bb.min.x, SY = bb.max.y - bb.min.y, SZ = bb.max.z - bb.min.z;
  const GX = SX + gap, GZ = SZ + gap, R = rng(seed);
  const cells = []; for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) cells.push([(i - (nx - 1) / 2) * GX, (k - (nz - 1) / 2) * GZ]);
  cells.sort((a, b) => Math.hypot(a[0] / (SX / SZ), a[1]) - Math.hypot(b[0] / (SX / SZ), b[1]));   // chaque étage : du centre vers les bords
  const slot = [], jit = [];
  for (let n = 0; n < count; n++) { const c = cells[n % cells.length], lv = Math.floor(n / cells.length); slot.push([x + c[0], SY / 2 + lv * (SY + 0.0002), z + c[1]]); jit.push([(R() - 0.5) * 0.004, (R() - 0.5) * 0.03]); }
  const mesh = new THREE.InstancedMesh(geo, mats, count); mesh.castShadow = mesh.receiveShadow = true; mesh.count = 0; mesh.frustumCulled = false; scene.add(mesh);
  const countAt = (t) => (t < t0 ? 0 : Math.min(count, Math.round(Math.exp(Math.log(count) * clamp((t - t0) / (t1 - t0))))));
  const tAt = (n) => t0 + (t1 - t0) * Math.log(Math.max(1, n)) / Math.log(count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  function update(t) {   // (tout est recalculé : même t → même image)
    const N = countAt(t);
    for (let n = 0; n < N; n++) {
      const k = clamp((t - tAt(n + 1)) / 0.22), s = slot[n];   // les dernières arrivées tombent d'un peu plus haut
      v3.set(s[0] + jit[n][0], s[1] + drop * (1 - k) * (1 - k), s[2]); q.setFromAxisAngle(up, jit[n][1] + (1 - k) * 0.6);
      mesh.setMatrixAt(n, m4.compose(v3, q, one));
    }
    mesh.count = N; mesh.instanceMatrix.needsUpdate = true; return N;
  }
  const height = Math.ceil(count / cells.length) * (SY + 0.0002), width = nx * GX, depth = nz * GZ;
  return { mesh, countAt, tAt, update, height, width, depth, firstSlot: slot[0] };
}

// --- la foule
export function makeCrowd(scene, PEOPLE, { count, t0, t1, spacing = 0.62, exclude = () => false, near = 40, fog = { color: new THREE.Color('#0b0d12'), near: 40, far: 150 }, cx = 0, cz = 0, seed = 9, face = [5, 7], atlas, appearAt, reach = 1 }) {
  const R = rng(seed), spots = [], half = Math.ceil(Math.sqrt(count * 1.3 / 0.866) / 2 * reach) + 6;
  for (let iy = -half; iy <= half; iy++) for (let ix = -half; ix <= half; ix++) {
    const x = cx + (ix + (iy & 1) * 0.5) * spacing + (R() - 0.5) * spacing * 0.26, z = cz + iy * spacing * 0.866 + (R() - 0.5) * spacing * 0.26;
    if (exclude(x, z)) continue; spots.push([x, z, Math.hypot(x - cx, (z - cz) * 1.08)]);
  }
  spots.sort((a, b) => a[2] - b[2]); spots.length = Math.min(spots.length, count); count = spots.length;   // (s'il n'y a pas assez de place, on s'arrête là)
  const ta = appearAt || ((i) => t0 + (t1 - t0) * Math.pow(i / count, 0.55));   // du centre vers l'extérieur (ou un calendrier donné : appearAt(i) → instant)
  const countAt = (t) => (t < t0 ? 0 : Math.min(count, Math.floor(count * Math.pow(clamp((t - t0) / (t1 - t0)), 1 / 0.55))));
  // les vrais personnages, devant
  const real = [];
  for (let i = 0; i < Math.min(near, count); i++) {
    const [x, z] = spots[i]; const p = PEOPLE.make({ outfit: 1 + Math.floor(R() * 7), shadows: i < 12 }); p.stand(R() * 0.15);
    p.root.position.set(x, 0, z); p.root.rotation.y = Math.atan2(face[0] - x, face[1] - z) + (R() - 0.5) * 0.9; p.root.scale.setScalar(0.93 + R() * 0.12);
    p.ta = ta(i); p.pop(0); scene.add(p.root); real.push(p);
  }
  // les « photos découpées » au loin : une seule géométrie répétée, toujours tournée vers la caméra
  const NF = Math.max(0, count - real.length);
  const qg = new THREE.InstancedBufferGeometry(); qg.copy(new THREE.PlaneGeometry(1.15, 2.3).translate(0, 2.3 / 2 - 0.30, 0)); qg.instanceCount = NF;
  const aPos = new Float32Array(NF * 3), aInfo = new Float32Array(NF * 4);
  for (let j = 0; j < NF; j++) { const [x, z] = spots[real.length + j]; aPos.set([x, 0, z], j * 3); aInfo.set([Math.floor(R() * 8), ta(real.length + j), 0.92 + R() * 0.14, 0.75 + R() * 0.35], j * 4); }
  qg.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3)); qg.setAttribute('aInfo', new THREE.InstancedBufferAttribute(aInfo, 4));
  const U = { uAtlas: { value: atlas || PEOPLE.atlas() }, uTime: { value: 0 }, uFog: { value: fog.color }, uFogA: { value: fog.near }, uFogB: { value: fog.far }, uLight: { value: 1 }, uLift: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `attribute vec3 aPos; attribute vec4 aInfo; uniform float uTime; uniform float uLift; varying vec2 vUv; varying float vShade; varying float vDist;
      void main(){
        float k = clamp((uTime - aInfo.y) / 0.3, 0.0, 1.0); float c = 1.7; float m = k - 1.0; float s = k <= 0.0 ? 0.0 : 1.0 + (c + 1.0) * m * m * m + c * m * m;   // (pas de pow() : base négative interdite en GLSL)
        vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
        vec3 wp = aPos + right * position.x * aInfo.z * s + vec3(0.0, 1.0, 0.0) * (position.y * aInfo.z * s + uLift);
        float cell = aInfo.x; vUv = vec2((mod(cell, 4.0) + uv.x) / 4.0, (floor(cell / 4.0) + uv.y) / 2.0);
        vShade = aInfo.w; vec4 mv = viewMatrix * vec4(wp, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uAtlas; uniform vec3 uFog; uniform float uFogA; uniform float uFogB; uniform float uLight; varying vec2 vUv; varying float vShade; varying float vDist;
      void main(){ vec4 c = texture2D(uAtlas, vUv); if (c.a < 0.5) discard;
        vec3 col = c.rgb / max(c.a, 0.001) * vShade * uLight; col = mix(col, uFog, smoothstep(uFogA, uFogB, vDist)); gl_FragColor = vec4(col, 1.0); }`,
  });
  const flat = new THREE.Mesh(qg, mat); flat.frustumCulled = false; scene.add(flat);
  function update(t, { light = 1, fogNear, fogFar, lift = 0 } = {}) {   // lift : tout le monde décolle du sol (un saut), en mètres
    U.uTime.value = t; U.uLight.value = light; U.uLift.value = lift; if (fogNear !== undefined) { U.uFogA.value = fogNear; U.uFogB.value = fogFar; }
    for (const p of real) p.pop((t - p.ta) / 0.3);
    return countAt(t);
  }
  return { countAt, update, real, flat, spots };
}

// --- l'équation en bas de l'écran (au-dessus de la zone de la légende TikTok)
export function makeEquation(parts, { top = 1372 } = {}) {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;left:62px;right:190px;top:${top}px;display:flex;align-items:flex-end;gap:22px;color:#fff;opacity:0;`;
  const vals = [];
  el.innerHTML = parts.map((p) => (typeof p === 'string' ? `<div style="font:500 44px Garamond;opacity:.6;padding-bottom:4px">${p}</div>`
    : `<div><div style="font:600 15px Inter;letter-spacing:.2em;opacity:.7;margin-bottom:6px">${p.label}</div><div class="eqv" style="font:500 50px Garamond;color:${p.color || '#fff'};white-space:nowrap;font-variant-numeric:tabular-nums">${p.value ?? ''}</div></div>`)).join('');
  document.getElementById('hud').appendChild(el);
  el.querySelectorAll('.eqv').forEach((v) => vals.push(v));
  return { el, set: (i, txt) => { if (vals[i].textContent !== txt) vals[i].textContent = txt; }, opacity: (a) => { el.style.opacity = a; } };
}

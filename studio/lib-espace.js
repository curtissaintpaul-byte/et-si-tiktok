// =====================================================================
//  L'ESPACE — pour « Et si tu passais un an dans l'espace ? » (premier test des plans à la première personne)
//  Tout ce qui est en orbite partage une même Terre : une grande boule (rayon 3 122, soit 1 km = 0,49 unité) dont la surface
//  est 200 unités sous l'origine, pour garder les vraies proportions vues depuis 408 km d'altitude.
//
//  const E = await makeEarth(scene)            → E.root, E.setSun(dir), E.update(t, spin)  (jour/nuit, nuages, halo bleu)
//  const ST = makeStars(scene)                 → les étoiles (très loin)
//  const MOD = buildModule(scene, { at })      → l'intérieur d'un module de la Station (racks, rampes, écrans, écoutille)
//  const CUP = buildCupola(scene, { at })      → la coupole aux 7 hublots, tournée vers la Terre
//  const ISS = buildStation(scene, { at })     → la Station vue de dehors (poutre, panneaux solaires, modules)
//  const SZ = buildSteppe(scene, { at })       → la steppe du Kazakhstan, la capsule et son parachute
//  const ARMS = makeArms(camera)               → tes avant-bras et tes mains, accrochés à la caméra (vue « dans tes yeux »)
// =====================================================================
import { THREE, rng, noise2, lerp, clamp, sm } from './engine.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, ...o });
const bx = (w, h, d, mat, p, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m; };
const ctex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
export const KM = 0.49, R_EARTH = 6371 * KM, ALT = 408 * KM;

// ---------------------------------------------------------------------
// la Terre : textures dessinées à partir des contours des pays (data/world.json), nuages en bruit, lumières des villes la nuit
// ---------------------------------------------------------------------
async function earthTextures(url) {
  const data = await (await fetch(url)).json();
  const TW = 4096, TH = 2048, LAT0 = 84, LAT1 = -58;
  const mask = document.createElement('canvas'); mask.width = TW; mask.height = TH; const mg = mask.getContext('2d');
  mg.fillStyle = '#000'; mg.fillRect(0, 0, TW, TH); mg.fillStyle = '#fff';
  for (const c of data.countries) for (const r of c.rings) {
    mg.beginPath();
    for (let i = 0; i < r.length; i += 2) {
      const x = r[i] / data.W * TW, lat = LAT0 - r[i + 1] / data.H * (LAT0 - LAT1), y = (90 - lat) / 180 * TH;
      if (i === 0 || Math.abs(r[i] - r[i - 2]) > 300) mg.moveTo(x, y); else mg.lineTo(x, y);
    }
    mg.closePath(); mg.fill();
  }
  mg.fillRect(0, (90 + 66) / 180 * TH, TW, TH);   // l'Antarctique
  const mask2 = document.createElement('canvas'); mask2.width = TW; mask2.height = TH; const m2g = mask2.getContext('2d'); m2g.filter = 'blur(2px)'; m2g.drawImage(mask, 0, 0);   // (les côtes adoucies, en une seule fois)
  const M = m2g.getImageData(0, 0, TW, TH).data;
  const n = noise2(7), n2 = noise2(19);
  const day = document.createElement('canvas'); day.width = TW; day.height = TH; const dg = day.getContext('2d'); const D = dg.createImageData(TW, TH);
  const night = document.createElement('canvas'); night.width = TW / 2; night.height = TH / 2; const ng = night.getContext('2d'); const NI = ng.createImageData(TW / 2, TH / 2);
  for (let y = 0; y < TH; y++) {
    const lat = 90 - y / TH * 180, al = Math.abs(lat);
    for (let x = 0; x < TW; x++) {
      const i = (y * TW + x) * 4, mk = M[i] / 255, land = mk > 0.5, u = x / TW * 40, v = y / TH * 20;
      const k = n(u, v, 4), k2 = n2(u * 3, v * 3, 3);
      let r, g, b, lr, lg, lb;
      {
        const dry = clamp(1 - Math.abs(al - 24) / 14) * (0.6 + 0.6 * k), cold = clamp((al - 52) / 16);
        const br = clamp((k - 0.45) * 2.2); r = lerp(lerp(lerp(74, 118, br), 172, dry), 120, cold * 0.6) + k2 * 34; g = lerp(lerp(lerp(90, 104, br), 146, dry), 118, cold * 0.6) + k2 * 28; b = lerp(lerp(lerp(54, 70, br), 100, dry), 98, cold * 0.6) + k2 * 20;
        const ice = clamp((al - 64) / 6) + (lon2(x, TW) > -60 && lon2(x, TW) < -15 && lat > 60 ? 1 : 0);
        if (ice > 0) { const s = Math.min(1, ice); r = lerp(r, 236, s); g = lerp(g, 240, s); b = lerp(b, 245, s); }
        lr = r; lg = g; lb = b;
        const deep = 0.6 + 0.4 * k, sh = clamp(1 - mk * 2.5);
        const sh2 = Math.pow(1 - sh, 2.2); r = 8 + 14 * (1 - deep) + 14 * sh2; g = 30 + 40 * (1 - deep) + 26 * sh2; b = 70 + 50 * (1 - deep) + 20 * sh2;
        if (al > 72) { const s = clamp((al - 72) / 6); r = lerp(r, 225, s); g = lerp(g, 232, s); b = lerp(b, 240, s); }
        const m2 = sm(0.42, 0.58, mk); r = lerp(r, lr, m2); g = lerp(g, lg, m2); b = lerp(b, lb, m2);
      }
      D.data[i] = r; D.data[i + 1] = g; D.data[i + 2] = b; D.data[i + 3] = 255;
      if ((x & 1) === 0 && (y & 1) === 0) {   // la nuit : des grappes de lumières sur les terres habitées
        const j = ((y >> 1) * (TW >> 1) + (x >> 1)) * 4, city = land && al < 62 ? clamp((n2(u * 6, v * 6, 2) - 0.58) * 6) * (0.4 + k) : 0;
        NI.data[j] = 255 * city; NI.data[j + 1] = 180 * city; NI.data[j + 2] = 90 * city; NI.data[j + 3] = 255;
      }
    }
  }
  dg.putImageData(D, 0, 0); ng.putImageData(NI, 0, 0);
  const CW = 2048, CHh = 1024, cloud = document.createElement('canvas'); cloud.width = CW; cloud.height = CHh; const cg = cloud.getContext('2d'); const C = cg.createImageData(CW, CHh);
  const n3 = noise2(31);
  for (let y = 0; y < CHh; y++) for (let x = 0; x < CW; x++) {
    const i = (y * CW + x) * 4, lat = Math.abs(90 - y / CHh * 180), band = 0.55 + 0.25 * Math.cos(lat / 90 * Math.PI * 3);
    const c = clamp((n3(x / CW * 34, y / CHh * 17, 6) - 0.5 + 0.2 * (band - 0.55)) * 2.6); C.data[i] = C.data[i + 1] = C.data[i + 2] = 255 * c; C.data[i + 3] = 255;
  }
  cg.putImageData(C, 0, 0);
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { day: tex(day), night: tex(night), cloud: tex(cloud) };
}
const lon2 = (x, TW) => x / TW * 360 - 180;

export async function makeEarth(scene, { url = 'data/world.json', center = V3(0, -(R_EARTH + ALT), 0) } = {}) {
  const T = await earthTextures(url);
  const U = { tDay: { value: T.day }, tNight: { value: T.night }, tCloud: { value: T.cloud }, uSun: { value: V3(1, 0.3, 0).normalize() }, uShift: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, fog: false,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vL; void main(){ vUv = uv; vL = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tDay; uniform sampler2D tNight; uniform sampler2D tCloud; uniform vec3 uSun; uniform float uShift; varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vL;
      float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.07; a *= 0.5; } return s; }
      void main(){ vec3 n = normalize(vN); float l = dot(n, normalize(uSun)); float d = smoothstep(-0.1, 0.18, l);
        vec3 dc = texture2D(tDay, vUv).rgb; vec3 nc = texture2D(tNight, vUv).rgb; float c = texture2D(tCloud, vUv + vec2(uShift, 0.0)).r;
        float fd = fbm(vL * 0.06); float fc = fbm(vL * 0.11 + vec3(uShift * 900.0, 0.0, 0.0));
        dc *= 0.82 + 0.36 * fd; c = clamp(c * (0.55 + 0.9 * fc) + smoothstep(0.62, 0.78, fc) * 0.5, 0.0, 1.0);
        vec3 lit = dc * (0.03 + 1.15 * max(l, 0.0)); lit = mix(lit, vec3(1.0) * (0.05 + 1.1 * max(l, 0.0)), c * 0.88);
        vec3 col = mix(nc * 1.6 * (1.0 - c * 0.75) + dc * 0.015, lit, d);
        col += vec3(1.0, 0.45, 0.18) * exp(-pow(l * 11.0, 2.0)) * 0.12;
        vec3 V = normalize(cameraPosition - vP); float f = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        col = mix(col, vec3(0.36, 0.62, 1.0) * (0.12 + 1.0 * max(l + 0.15, 0.0)), clamp(f * 0.75, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const root = new THREE.Group(); root.position.copy(center); scene.add(root);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH, 160, 100), mat); root.add(globe);
  // le halo de l'atmosphère (une coque un peu plus grande, vue de l'intérieur, qui ne brille que sur le bord)
  const hm = new THREE.ShaderMaterial({
    uniforms: { uSun: U.uSun }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vP; void main(){ vec3 n = normalize(vN); vec3 V = normalize(cameraPosition - vP); float r = pow(clamp(1.0 + dot(n, V) * 1.0, 0.0, 1.0), 6.0);
      float l = dot(-n, normalize(uSun)); gl_FragColor = vec4(vec3(0.3, 0.55, 1.0) * r * (0.15 + 1.2 * clamp(l + 0.3, 0.0, 1.0)), 1.0); }`,
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH * 1.022, 120, 80), hm); root.add(halo);
  return {
    root, globe, U,
    setSun(dir) { U.uSun.value.copy(dir).normalize(); },
    update(t, spin = 0) { globe.rotation.y = spin; U.uShift.value = t * 0.0004; },
  };
}

export function makeStars(scene, { n = 5000, R = 9000, seed = 4 } = {}) {
  const r = rng(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); pos.set([R * s * Math.cos(a), R * u, R * s * Math.sin(a)], i * 3); const b = 0.4 + r() * 0.6; col.set([b, b, b * (0.9 + r() * 0.2)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false })); p.renderOrder = -5; scene.add(p);
  return p;
}

export function makeSunGlow(scene, dist = 8500) {
  const tex = ctex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.08, 'rgba(255,250,235,1)'); gr.addColorStop(0.2, 'rgba(255,220,170,0.35)'); gr.addColorStop(1, 'rgba(255,200,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(dist * 0.12); scene.add(s);
  return { sprite: s, place(cam, dir) { s.position.copy(cam).addScaledVector(dir, dist); } };
}

// ---------------------------------------------------------------------
// l'intérieur d'un module : un couloir carré de 2,1 m, tapissé de « racks » (casiers d'expériences), des rampes, des câbles, deux ordinateurs
// ---------------------------------------------------------------------
export function buildModule(scene, { at = V3(0, 0, 0), L = 9 } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const r = rng(11);
  const rackTex = ctex(256, 512, (g, w, h) => {
    g.fillStyle = '#c4c0b5'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y, w, 2); }
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
    for (let i = 0; i < 26; i++) { const x = 10 + r() * (w - 60), y = 8 + Math.floor(r() * 8) * 64 + r() * 30, ww = 20 + r() * 60, hh = 10 + r() * 24;
      g.fillStyle = ['#c7c3b8', '#aeb4ba', '#e8e5dc', '#8c939a', '#3a3f45'][Math.floor(r() * 5)]; g.fillRect(x, y, ww, hh);
      if (r() < 0.4) { g.fillStyle = ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60'][Math.floor(r() * 4)]; g.fillRect(x + 3, y + 3, 6, 6); } }
    g.fillStyle = 'rgba(30,30,30,0.6)'; g.font = 'bold 12px monospace'; for (let i = 0; i < 6; i++) g.fillText(['LAB-1', 'EXPRESS', 'MSG', 'HRF-2', 'WORF', 'ER-4'][i], 12 + r() * 120, 30 + i * 80);
    for (let i = 0; i < 10; i++) { g.fillStyle = '#2b2b2b'; g.fillRect(r() * w, r() * h, 12, 8); }   // les scratchs (velcro)
  }, [1, 1]);
  const rack = std({ map: rackTex, roughness: 0.85 });
  const S = 2.1, HS = S / 2;
  const wall = (rot, off) => { for (let i = 0; i < Math.round(L / 1.05); i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.03, S), rack); m.position.set(0, 0, -L / 2 + 0.525 + i * 1.05); m.position.add(off); m.rotation.copy(rot); m.receiveShadow = true; G.add(m); } };
  wall(new THREE.Euler(0, Math.PI / 2, 0), V3(-HS, 0, 0)); wall(new THREE.Euler(0, -Math.PI / 2, 0), V3(HS, 0, 0));
  wall(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2), V3(0, -HS, 0)); wall(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2), V3(0, HS, 0));
  // les rampes (barres de maintien), les câbles, les lampes
  const rail = std({ color: '#5d6f82', roughness: 0.4, metalness: 0.5 });
  for (const [x, y] of [[-0.9, 0.9], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9]]) for (let z = -L / 2 + 1; z < L / 2 - 0.5; z += 2.1) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), rail); h.rotation.x = Math.PI / 2; h.position.set(x * 0.97, y * 0.97, z); G.add(h); }
  const cableM = std({ color: '#2a2d31', roughness: 0.6 });
  for (let k = 0; k < 4; k++) { const pts = []; for (let i = 0; i <= 12; i++) pts.push(V3(-0.95 + k * 0.03, 0.7 - Math.sin(i / 12 * Math.PI) * 0.08 + r() * 0.03, -L / 2 + i * L / 12)); const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 5), cableM); G.add(c); }
  const lampM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#f4f6ff', emissiveIntensity: 1.6 });
  for (let z = -L / 2 + 1.2; z < L / 2; z += 2.4) for (const x of [-0.75, 0.75]) bx(0.5, 0.02, 0.2, lampM, G, x, HS - 0.02, z);
  // deux ordinateurs portables sur leurs bras, un sac blanc, un carnet
  const lap = (x, y, z, ry) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; G.add(g);
    bx(0.34, 0.02, 0.24, std({ color: '#1d1f22', roughness: 0.5 }), g, 0, 0, 0); const s = bx(0.34, 0.22, 0.012, std({ color: '#111' }), g, 0, 0.11, -0.12); s.rotation.x = -0.25;
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshBasicMaterial({ color: '#7fb4e8', toneMapped: false })); sc.position.set(0, 0.112, -0.112); sc.rotation.x = -0.25; g.add(sc); return { g, sc }; };
  const L1 = lap(0.7, -0.35, -1.2, -Math.PI / 2 + 0.3), L2 = lap(-0.72, 0.1, 1.4, Math.PI / 2 - 0.2);
  const bag = bx(0.35, 0.22, 0.25, std({ color: '#eceae4', roughness: 0.95 }), G, 0.3, 0.55, 2.4);
  // l'écoutille ronde au bout
  const hatch = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 32), std({ color: '#b9bdc2', metalness: 0.5, roughness: 0.4 })); hatch.position.set(0, 0, -L / 2 + 0.02); G.add(hatch);
  const end = new THREE.Mesh(new THREE.PlaneGeometry(S, S), std({ color: '#cfccc3' })); end.position.set(0, 0, -L / 2); G.add(end);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: '#2b2f36' })); hole.position.set(0, 0, -L / 2 + 0.01); G.add(hole);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(S, S), std({ color: '#cfccc3' })); back.position.set(0, 0, L / 2); back.rotation.y = Math.PI; G.add(back);
  const l1 = new THREE.PointLight('#f2f5ff', 0, 7, 1.3); l1.position.set(0, 0.6, -1.8); G.add(l1);
  const l2 = new THREE.PointLight('#f2f5ff', 0, 7, 1.3); l2.position.set(0, 0.85, 0.4); G.add(l2);
  const amb = new THREE.HemisphereLight('#f0f2ff', '#a9a49a', 0); G.add(amb);
  const eqC = ['#c9c6bd', '#9aa1a8', '#5f666e', '#e2dfd6', '#2f4f7a', '#d8d2c0'], bagC = ['#f0eee8', '#2e5c99', '#e7e2d3', '#c9b98f'];
  for (let i = 0; i < 46; i++) { const face = Math.floor(r() * 4), z = -L / 2 + 0.4 + r() * (L - 0.8), w = 0.15 + r() * 0.4, h = 0.1 + r() * 0.3, d = 0.04 + r() * 0.12, along = (r() - 0.5) * 1.5;
    const bag = r() < 0.3, m = std({ color: bag ? bagC[Math.floor(r() * 4)] : eqC[Math.floor(r() * 6)], roughness: bag ? 0.95 : 0.6, metalness: bag ? 0 : 0.2 });
    const o = bx(w, h, d, m, G, 0, 0, z); const off = HS - d / 2 - 0.01;
    if (face === 0) { o.position.set(-off, along, z); o.rotation.y = Math.PI / 2; } else if (face === 1) { o.position.set(off, along, z); o.rotation.y = -Math.PI / 2; } else if (face === 2) { o.position.set(along, -off, z); o.rotation.x = -Math.PI / 2; } else { o.position.set(along, off, z); o.rotation.x = Math.PI / 2; } }
  for (let k = 0; k < 6; k++) { const pts = [], sx = r() < 0.5 ? -1 : 1, sy = r() < 0.5 ? -1 : 1; for (let i = 0; i <= 10; i++) pts.push(V3(sx * (0.98 - r() * 0.04), sy * (0.3 + r() * 0.6), -L / 2 + i * L / 10)); G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.01, 5), cableM)); }
  return { root: G, at, L, lights: [l1, l2], amb, laptops: [L1, L2], bag, on(k) { l1.intensity = l2.intensity = 3.2 * k; amb.intensity = 0.55 * k; lampM.emissiveIntensity = 1.1 * k; } };
}

// ---------------------------------------------------------------------
// la coupole : 6 hublots en trapèze autour d'un grand hublot rond, tournés vers la Terre (vers le bas)
// ---------------------------------------------------------------------
export function buildCupola(scene, { at = V3(60, 0, 0) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const frame = std({ color: '#c9ccd0', roughness: 0.45, metalness: 0.4 }), dark = std({ color: '#3a3e44', roughness: 0.6 });
  const yb = -0.75, yt = 0.25, rb = 0.62, rt = 1.25;
  const pos = []; const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const P = (rr, y, i) => { const a = i / 6 * Math.PI * 2; return [rr * Math.cos(a), y, rr * Math.sin(a)]; };
  const mix = (p, q, k) => p.map((v, j) => v + (q[j] - v) * k);
  for (let i = 0; i < 6; i++) {
    const b0 = P(rb, yb, i), b1 = P(rb, yb, i + 1), t1 = P(rt, yt, i + 1), t0 = P(rt, yt, i);
    const c = [(b0[0] + b1[0] + t0[0] + t1[0]) / 4, (b0[1] + b1[1] + t0[1] + t1[1]) / 4, (b0[2] + b1[2] + t0[2] + t1[2]) / 4], k = 0.24;
    const ib0 = mix(b0, c, k), ib1 = mix(b1, c, k), it1 = mix(t1, c, k), it0 = mix(t0, c, k);
    quad(b0, b1, ib1, ib0); quad(b1, t1, it1, ib1); quad(t1, t0, it0, it1); quad(t0, b0, ib0, it0);
  }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.computeVertexNormals();
  const fm = new THREE.Mesh(fg, frame); fm.material.side = THREE.DoubleSide; G.add(fm);
  // le fond (anneau autour du hublot rond) et le hublot rond
  const ringShape = new THREE.Shape(); for (let i = 0; i <= 6; i++) { const [x, , z] = P(rb, yb, i); i ? ringShape.lineTo(x, z) : ringShape.moveTo(x, z); }
  const holeP = new THREE.Path(); holeP.absarc(0, 0, 0.4, 0, Math.PI * 2, true); ringShape.holes.push(holeP);
  const ring = new THREE.Mesh(new THREE.ShapeGeometry(ringShape, 32), frame); ring.rotation.x = Math.PI / 2; ring.position.y = yb; ring.material = frame; G.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.03, 8, 40), dark); rim.rotation.x = Math.PI / 2; rim.position.y = yb + 0.01; G.add(rim);
  // le haut : la jonction avec la station (un tube sombre) et le plafond
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(rt, rt, 1.2, 6, 1, true), dark); tube.material.side = THREE.DoubleSide; tube.position.y = yt + 0.6; tube.rotation.y = Math.PI / 6; G.add(tube);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(rt, 6), dark); cap.rotation.x = Math.PI / 2; cap.position.y = yt + 1.2; G.add(cap);
  // des poignées et un appareil photo qui flotte
  const rail = std({ color: '#5d6f82', roughness: 0.4, metalness: 0.5 });
  for (let i = 0; i < 6; i++) { const [x, , z] = P(rt * 0.98, yt + 0.06, i + 0.5); const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12, Math.PI), rail); h.position.set(x, yt + 0.06, z); h.lookAt(0, yt, 0); G.add(h); }
  const camB = new THREE.Group(); bx(0.14, 0.1, 0.08, std({ color: '#141414', roughness: 0.5 }), camB, 0, 0, 0); const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.12, 14), std({ color: '#222', roughness: 0.3 })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.09; camB.add(lens); camB.position.set(0.5, -0.1, 0.35); G.add(camB);
  const inL = new THREE.PointLight('#d8e4ff', 0, 4, 1.4); inL.position.set(0, 0.4, 0); G.add(inL);
  return { root: G, at, light: inL, camera: camB, yb, yt };
}

// ---------------------------------------------------------------------
// la Station vue de dehors : la grande poutre, 8 ailes de panneaux solaires, les modules, les radiateurs
// ---------------------------------------------------------------------
export function buildStation(scene, { at = V3(300, 0, 0) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const truss = ctex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#d7d9dc'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }, [60, 1]);
  const trussM = new THREE.MeshStandardMaterial({ map: truss, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 });
  const T = new THREE.Mesh(new THREE.BoxGeometry(100, 1.8, 1.8), trussM); G.add(T);
  const cell = ctex(128, 256, (g, w, h) => { g.fillStyle = '#284a86'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,190,230,0.35)'; g.lineWidth = 1; for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.fillStyle = '#b8862b'; g.fillRect(0, h / 2 - 2, w, 4); }, [1, 4]);
  const panelM = new THREE.MeshStandardMaterial({ map: cell, roughness: 0.42, metalness: 0.35, side: THREE.DoubleSide, emissive: '#1a2c55', emissiveIntensity: 0.35 });
  const backM = new THREE.MeshStandardMaterial({ color: '#c9a25a', roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const wings = [];
  // les 8 grandes ailes (chacune en deux rideaux de cellules, de part et d'autre d'un mât), inclinées vers le Soleil
  for (const x of [-46, -36, 36, 46]) for (const s of [1, -1]) { const w = new THREE.Group(); w.position.set(x, 0, s * 19.5); w.rotation.z = -0.75; G.add(w); wings.push(w);
    for (const dx of [-2.9, 2.9]) { const c = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.05, 33), [backM, backM, panelM, backM, backM, backM]); c.position.x = dx; w.add(c); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 34, 6), std({ color: '#d8d8d8', metalness: 0.6 })); mast.rotation.x = Math.PI / 2; w.add(mast);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), std({ color: '#cfd2d6', metalness: 0.4 })); box.position.z = -s * 16.8; w.add(box); }
  // des boîtiers le long de la poutre, une deuxième poutre plus fine (pour l'épaisseur)
  const T2 = new THREE.Mesh(new THREE.BoxGeometry(100, 1.2, 1.2), std({ color: '#9da3aa', metalness: 0.6, roughness: 0.5 })); G.add(T2);
  for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2 + (i % 3) * 0.6, 0.7, 0.9), std({ color: i % 4 ? '#e6e3dc' : '#b9bdc2', roughness: 0.6 })); b.position.set(-44 + i * 3.5, 1.15, (i % 2 ? 0.5 : -0.5)); G.add(b); }
  const blanket = ctex(128, 128, (g, w, h) => { g.fillStyle = '#e9e6dd'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2; for (let i = 0; i < w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, [6, 2]);
  const modM = std({ map: blanket, roughness: 0.9 });
  const mod = (l, x, y, z, rx = Math.PI / 2, rz = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, l, 24), modM); m.rotation.set(rx, 0, rz); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; G.add(m); return m; };
  mod(16, 0, -3.5, 6); mod(14, 0, -3.5, -8); mod(9, 6, -3.5, -14, 0, Math.PI / 2); mod(9, -6, -3.5, -14, 0, Math.PI / 2); mod(12, 0, -3.5, 19);
  const node = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 14), modM); node.position.set(0, -3.5, -1.5); G.add(node);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 1.1, 6), std({ color: '#c9ccd0', metalness: 0.4 })); cup.position.set(0, -6.1, -1.5); G.add(cup);
  for (const x of [-14, 14, -22, 22]) { const r = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 14), std({ color: '#f4f4f2', roughness: 0.4, emissive: '#555', emissiveIntensity: 0.15 })); r.position.set(x, -0.6, -8); r.rotation.x = 0.35; G.add(r); }
  // le segment russe (plus loin, avec ses petites ailes) et un vaisseau amarré (un Soyouz : ses deux petites ailes)
  mod(10, 0, -3.5, -29); mod(7, 0, -3.5, -37.5); mod(5, 0, -3.5, -43);
  for (const [z, L, W] of [[-37.5, 10, 2.6], [-46, 4.2, 1.2]]) for (const sx of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(L, 0.05, W), [backM, backM, panelM, backM, backM, backM]); p.position.set(sx * (2.4 + L / 2), -3.5, z); p.rotation.x = -0.3; G.add(p); }
  const soy = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 3.4, 18), std({ color: '#7a8a62', roughness: 0.8 })); soy.rotation.x = Math.PI / 2; soy.position.set(0, -3.5, -46); G.add(soy);
  const soy2 = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), std({ color: '#7a8a62', roughness: 0.8 })); soy2.position.set(0, -3.5, -48.4); G.add(soy2);
  // le bras robotique (deux segments blancs) posé sur la poutre
  const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 8), std({ color: '#f1f1ee' })); arm1.position.set(-6, 3.4, 2); arm1.rotation.z = 0.9; G.add(arm1);
  const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 8), std({ color: '#f1f1ee' })); arm2.position.set(-12.5, 4.9, 4); arm2.rotation.set(0.4, 0, -1.2); G.add(arm2);
  return { root: G, at, wings };
}

// ---------------------------------------------------------------------
// la steppe du Kazakhstan, la capsule (une cloche brûlée par la rentrée) et son parachute rayé
// ---------------------------------------------------------------------
export function buildSteppe(scene, { at = V3(0, 0, 20000) } = {}) {
  const G = new THREE.Group(); G.position.copy(at); scene.add(G);
  const n = noise2(5);
  const grass = ctex(256, 256, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = n(x / 18, y / 18, 3), i = (y * w + x) * 4; img.data[i] = 168 + k * 50; img.data[i + 1] = 150 + k * 40; img.data[i + 2] = 92 + k * 26; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); }, [160, 160]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), std({ map: grass, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  // la capsule : un profil tourné (comme une cloche), brûlé et noirci
  const prof = [[0, 0], [1.08, 0.05], [1.12, 0.3], [0.95, 1.2], [0.62, 2.05], [0.4, 2.15], [0, 2.18]].map(([x, y]) => new THREE.Vector2(x, y));
  const burn = ctex(128, 128, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = n(x / 6 + 40, y / 6, 4), i = (y * w + x) * 4, s = 40 + k * 70 + (y / h) * 30; img.data[i] = s * 1.05; img.data[i + 1] = s * 0.9; img.data[i + 2] = s * 0.75; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); }, [3, 1]);
  const capsule = new THREE.Group(); G.add(capsule);
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), std({ map: burn, roughness: 0.95 })); body.castShadow = true; capsule.add(body);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), std({ color: '#151b22', roughness: 0.2 })); win.position.set(0, 1.2, 0.98); win.rotation.x = -0.34; capsule.add(win);
  // le parachute : une demi-sphère rayée orange et blanc, les suspentes
  const chuteT = ctex(512, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#e8641c'; g.fillRect(i * w / 16, 0, w / 16, h); } }, [1, 1]);
  const chute = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ map: chuteT, side: THREE.DoubleSide, roughness: 0.9 }));
  const chuteG = new THREE.Group(); chuteG.add(chute); chute.position.y = 0; G.add(chuteG);
  const lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#d9d4c8' })); G.add(lines);
  // la poussière soulevée par les petites fusées de freinage (à 1 m du sol) : des boules grises qui grossissent
  const dustM = new THREE.MeshStandardMaterial({ color: '#b9a98a', transparent: true, opacity: 0.0, roughness: 1, depthWrite: false });
  const dust = []; const rr = rng(3); for (let i = 0; i < 26; i++) { const d = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), dustM); d.userData = { a: rr() * Math.PI * 2, s: 0.6 + rr() * 1.2 }; G.add(d); dust.push(d); }
  const flash = new THREE.PointLight('#ffb06a', 0, 12, 1.5); G.add(flash);
  function place(alt, t, dustK = 0) {   // alt : hauteur du bas de la capsule ; t : le temps (le parachute ondule)
    capsule.position.set(0, alt, 0); capsule.rotation.z = Math.sin(t * 1.3) * 0.05 * clamp(alt / 20); capsule.rotation.x = Math.cos(t * 1.1) * 0.04 * clamp(alt / 20);
    chuteG.visible = alt > 0.2; chuteG.position.set(Math.sin(t * 0.7) * 0.6, alt + 34, 0); chute.rotation.y = t * 0.15; chute.scale.set(1 + Math.sin(t * 2.1) * 0.02, 1, 1 + Math.cos(t * 2.3) * 0.02);
    const top = V3(0, alt + 2.2, 0), pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pts.push(top.x, top.y, top.z, chuteG.position.x + Math.cos(a) * 12.4, chuteG.position.y + 6.8, chuteG.position.z + Math.sin(a) * 12.4); }
    lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); lines.visible = chuteG.visible;
    dustM.opacity = 0.55 * dustK * (1 - clamp((dustK - 0.6) / 0.4) * 0.6);
    dust.forEach((d) => { const rad = 1.2 + dustK * 6 * d.userData.s; d.position.set(Math.cos(d.userData.a) * rad, 0.4 + dustK * 1.5 * d.userData.s, Math.sin(d.userData.a) * rad); d.scale.setScalar(0.5 + dustK * 2.2 * d.userData.s); d.visible = dustK > 0.01; });
    flash.position.set(0, 0.3, 0); flash.intensity = dustK > 0 && dustK < 0.25 ? 40 : 0;
  }
  place(80, 0);
  return { root: G, at, capsule, place, lights: [flash] };
}

// ---------------------------------------------------------------------
// tes bras, vus « dans tes yeux » : avant-bras (manches courtes bleu marine), mains avec doigts ; accrochés à la caméra
// ---------------------------------------------------------------------
export function makeArms(camera, { skin = '#c98f6c', sleeve = '#1f2b44' } = {}) {
  const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55 }), sleeveM = new THREE.MeshStandardMaterial({ color: sleeve, roughness: 0.9 });
  const cap = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m);
  function arm(side) {
    const root = new THREE.Group(), fore = new THREE.Group(), hand = new THREE.Group(); root.add(fore); fore.add(hand);
    const sl = cap(0.055, 0.12, sleeveM); sl.rotation.x = Math.PI / 2; sl.position.z = 0.02; root.add(sl);
    const fa = cap(0.038, 0.24, skinM); fa.rotation.x = Math.PI / 2; fa.position.z = -0.15; fore.add(fa);
    hand.position.z = -0.32;
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skinM); palm.scale.set(0.044, 0.017, 0.052); palm.position.z = -0.045; hand.add(palm);
    const wrist = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), skinM); wrist.scale.set(0.033, 0.024, 0.03); wrist.position.z = 0.0; hand.add(wrist);
    const fingers = [];
    for (let i = 0; i < 4; i++) { const f = new THREE.Group(); f.position.set((-0.03 + i * 0.02) * side, 0, -0.09); hand.add(f);
      const p1 = cap(0.0098, 0.034, skinM); p1.rotation.x = Math.PI / 2; p1.position.z = -0.022; f.add(p1);
      const f2 = new THREE.Group(); f2.position.z = -0.045; f.add(f2); const p2 = cap(0.0088, 0.026, skinM); p2.rotation.x = Math.PI / 2; p2.position.z = -0.016; f2.add(p2);
      fingers.push([f, f2, [0.05, 0.048, 0.044, 0.036][i]]); }
    const th = new THREE.Group(); th.position.set(-0.045 * side, -0.004, -0.03); hand.add(th); const tp = cap(0.011, 0.035, skinM); tp.rotation.x = Math.PI / 2; tp.position.z = -0.025; th.add(tp); th.rotation.y = 0.7 * side;
    return { root, fore, hand, fingers, th, side };
  }
  const R = arm(1), L = arm(-1); camera.add(R.root, L.root);
  // pose(a, spec) : spec = { p: [x,y,z] position de l'épaule dans le repère caméra, r: [rx,ry,rz], el: flexion du coude, w: [rx, ry] poignet, curl: 0..1, point: true (index tendu) }
  function pose(a, { p = [0.2, -0.3, -0.1], r = [0, 0, 0], el = 0.3, w = [0, 0], curl = 0.25, point = false } = {}) {
    a.root.position.set(...p); a.root.rotation.set(...r); a.fore.rotation.set(-el, 0, 0); a.hand.rotation.set(w[0], w[1], 0);
    a.fingers.forEach(([f, f2], i) => { const c = point && i === 0 ? 0.05 : curl; f.rotation.x = -c * 1.2; f2.rotation.x = -c * 1.4; });
    a.th.rotation.x = -curl * 0.6;
  }
  return { R, L, pose, set visible(v) { R.root.visible = L.root.visible = v; }, mats: [skinM, sleeveM] };
}

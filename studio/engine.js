// =====================================================================
//  LE STUDIO — moteur commun à tous les épisodes "Et si… ?"
//  Un épisode = un décor + une partition (moments clés) + une fonction update(t).
//  Règle d'or : tout est une fonction du temps t → même t = même image.
// =====================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE, mergeGeometries };

// --- calque à filmer : 'scene' (la 3D seule), 'hud' (les textes seuls, fond transparent) ou 'all'
export const LAYER = new URLSearchParams(location.search).get('layer') || 'all';
document.body.classList.add('layer-' + LAYER);

// ---------------------------------------------------------------------
// petits outils
// ---------------------------------------------------------------------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const D2R = Math.PI / 180;
/** direction dans le ciel : azimut (° vers la droite) et hauteur (° au-dessus de l'horizon), caméra regardant vers -z */
export const dirAzEl = (az, el) => new THREE.Vector3(Math.sin(az * D2R) * Math.cos(el * D2R), Math.sin(el * D2R), -Math.cos(az * D2R) * Math.cos(el * D2R)).normalize();
/** interpolation entre images clés [[t, v], …] ; mode 'log' pour les grandeurs qui changent d'échelle */
export function keys(K, t, mode = 'lin') {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) {
    const [t0, v0] = K[i - 1], [t1, v1] = K[i];
    if (t <= t1) { const k = (t - t0) / (t1 - t0); return mode === 'log' ? Math.exp(lerp(Math.log(v0), Math.log(v1), k)) : lerp(v0, v1, k); }
  }
  return K[K.length - 1][1];
}
/** nombres à la française : 30 000 000 */
export const fr = (n, dec = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ /g, ' ');
export const pad = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------------
// le plateau : moteur de rendu, caméra, post-traitements
// ---------------------------------------------------------------------
export const W = 720, H = 1280;
export function createStage({ fov = 70, far = 2000, bloom = [0.38, 0.5, 1.0], samples = 0, fxaaOn = true, shadows = true } = {}) {
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.3, far);
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // garde-fou : un pixel « NaN » (normale dégénérée…) ferait des carrés noirs dans le bloom → on le remplace par du noir
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0); gl_FragColor = c; }' }));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), ...bloom);
  composer.addPass(bloomPass);
  // flou radial : l'image est "aspirée" vers un point de l'écran
  const radial = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uStrength: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; varying vec2 vUv;
      void main(){ vec2 d = (uCenter - vUv); vec4 c = vec4(0.0); float w = 0.0;
        for (int i = 0; i < 14; i++) { float k = float(i) / 13.0; float wi = 1.0 - k * 0.6; c += texture2D(tDiffuse, vUv + d * k * uStrength) * wi; w += wi; }
        gl_FragColor = c / w; }`,
  });
  radial.enabled = false;
  composer.addPass(radial);
  composer.addPass(new OutputPass());
  // lissage des contours "FXAA" (bien moins cher que le multi-échantillonnage sur un GPU logiciel)
  const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms.resolution.value.set(1 / W, 1 / H);
  fxaa.enabled = fxaaOn; composer.addPass(fxaa);
  return { renderer, scene, camera, composer, bloomPass, radial, fxaa };
}

// ---------------------------------------------------------------------
// "FX" : une peinture partagée par tous les matériaux du décor
//   uFrost / uFrostAll : givre (ce qui regarde le ciel blanchit)
//   uStretch           : tout est étiré dans une direction (spaghettification…)
//   uCrack             : fissures lumineuses dans le sol
//   uWet               : niveau d'eau (sous ce niveau, les murs sont mouillés/foncés)
// ---------------------------------------------------------------------
export const FX = {
  uFrost: { value: 0 }, uFrostAll: { value: 0 }, uFrostColor: { value: new THREE.Color(0.93, 0.96, 1.0) },   // couleur du « givre » (gris pour des cendres)
  uStretch: { value: 0 }, uStretchDir: { value: new THREE.Vector3(0, 1, 0) }, uStretchOrigin: { value: new THREE.Vector3() }, uStretchBias: { value: 20 },
  uCrack: { value: 0 }, uCrackColor: { value: new THREE.Color(1.0, 0.55, 0.15) }, uCrackScale: { value: 0.35 },
  uWet: { value: -100 },
  uDCrack: { value: 0 },   // fissures sombres (murs et sol), 0 → 1 : elles s'étendent
};
const FX_HEAD_V = 'uniform float uStretch; uniform vec3 uStretchDir; uniform vec3 uStretchOrigin; uniform float uStretchBias;\nvarying float vUpN; varying vec3 vWP;\n';
const FX_HEAD_F = `varying float vUpN; varying vec3 vWP;
uniform float uFrost; uniform float uFrostAll; uniform vec3 uFrostColor; uniform float uCrack; uniform vec3 uCrackColor; uniform float uCrackScale; uniform float uWet;
uniform float uDCrack;
vec2 fxH2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float fxVN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(fxH2(i).x, fxH2(i + vec2(1.0, 0.0)).x, f.x), mix(fxH2(i + vec2(0.0, 1.0)).x, fxH2(i + vec2(1.0, 1.0)).x, f.x), f.y); }
float fxEdge(vec2 x){
  vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(i, j); vec2 r = g + fxH2(n + g) - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { vec2 g = mg + vec2(i, j); vec2 r = g + fxH2(n + g) - f; if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr))); }
  return md;
}
`;
export function fxify(m, key = 'fx', nc = false) {
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, FX);
    if (nc) s.fragmentShader = '#define FX_NOCRACK\n' + s.fragmentShader;
    s.vertexShader = FX_HEAD_V + s.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vec3 wn = objectNormal;
        #ifdef USE_INSTANCING
          wn = mat3(instanceMatrix) * wn;
        #endif
        vUpN = normalize(mat3(modelMatrix) * wn).y;`)
      .replace('#include <project_vertex>', `
        vec4 fxW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fxW = instanceMatrix * fxW;
        #endif
        fxW = modelMatrix * fxW;
        float fxAlong = dot(fxW.xyz - uStretchOrigin, uStretchDir);
        fxW.xyz += uStretchDir * (fxAlong + uStretchBias) * uStretch;
        vWP = fxW.xyz;
        vec4 mvPosition = viewMatrix * fxW;
        gl_Position = projectionMatrix * mvPosition;`);
    s.fragmentShader = FX_HEAD_F + s.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.86, 0.95), uFrostAll * 0.22);
        float snowK = smoothstep(0.25, 0.60, vUpN) * uFrost;
        diffuseColor.rgb = mix(diffuseColor.rgb, uFrostColor, snowK);
        diffuseColor.rgb *= mix(1.0, 0.55, smoothstep(uWet + 0.05, uWet - 0.05, vWP.y));
        #ifndef FX_NOCRACK
        if (uDCrack > 0.001) {
          vec2 cp = vUpN > 0.5 ? vWP.xz : vec2(vWP.x + vWP.z, vWP.y * 1.3);
          float cn = fxVN(cp * 0.55) * 0.6 + fxVN(cp * 1.9 + 3.1) * 0.3 + fxVN(cp * 6.3 + 7.7) * 0.1;
          float cl = 1.0 - smoothstep(0.0, 0.010 + 0.006 * uDCrack, abs(cn - 0.5));
          float spread = smoothstep(1.0 - uDCrack, 1.12 - uDCrack, fxVN(cp * 0.11 + 5.3));
          diffuseColor.rgb *= 1.0 - 0.82 * cl * spread;
        }
        #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (uCrack > 0.001) {
          float ce = fxEdge(vWP.xz * uCrackScale);
          float cw = 0.012 + 0.05 * uCrack;
          totalEmissiveRadiance += uCrackColor * smoothstep(cw, 0.0, ce) * uCrack * 3.0 * smoothstep(0.5, 0.9, vUpN);
        }`);
  };
  m.customProgramCacheKey = () => key + (nc ? 'nc' : '');
  return m;
}
const matCache = new Map();
/** matériau "maquette" (couleur unie, facettes visibles) */
export function M(color, o = {}) {
  const key = color + JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (matCache.has(key) && !o.unique) return matCache.get(key);
  const m = fxify(new THREE.MeshStandardMaterial({
    color, roughness: o.r ?? 0.92, metalness: o.m ?? 0, flatShading: o.flat ?? true,
    emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0, map: o.map ?? null,
    side: o.side ?? THREE.FrontSide, vertexColors: o.vc ?? false, transparent: o.tr ?? false, opacity: o.op ?? 1,
  }), 'fx', !!o.nc);   // o.nc : jamais de fissures (arbres, voitures…)
  matCache.set(key, m);
  return m;
}

// ---------------------------------------------------------------------
// les briques de Lego
// ---------------------------------------------------------------------
export function add(geom, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geom, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export const box = (w, h, d, mat, p, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, p, x, y, z, 0, ry, 0);
export const cyl = (rt, rb, h, seg, mat, p, x, y, z) => add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, p, x, y, z);
/** toit à deux pans, faîtage le long de x */
export function prism(width, height, length, mat, p, x, y, z) {
  const s = new THREE.Shape(); s.moveTo(-width / 2, 0); s.lineTo(width / 2, 0); s.lineTo(0, height); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false }); g.translate(0, 0, -length / 2); g.rotateY(Math.PI / 2);
  return add(g, mat, p, x, y, z);
}
/** toit à deux pans, faîtage le long de z */
export function prismZ(width, height, length, mat, p, x, y, z) {
  const s = new THREE.Shape(); s.moveTo(-width / 2, 0); s.lineTo(width / 2, 0); s.lineTo(0, height); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false }); g.translate(0, 0, -length / 2);
  return add(g, mat, p, x, y, z);
}
/** "cuisson" : fusionne toutes les briques immobiles par matériau (beaucoup plus rapide à filmer) */
export function bake(root) {
  root.updateMatrixWorld(true);
  const b = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld); g.clearGroups();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.color && o.material.vertexColors) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    if (!b.has(o.material.uuid)) b.set(o.material.uuid, { mat: o.material, geoms: [] });
    b.get(o.material.uuid).geoms.push(g);
  });
  const out = new THREE.Group();
  for (const { mat, geoms } of b.values()) {
    const m = new THREE.Mesh(mergeGeometries(geoms, false), mat); m.castShadow = true; m.receiveShadow = true; out.add(m);
  }
  return out;
}
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
export function signTex(text, bg, fg, w = 1024, h = 160, font = 92) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = fg; g.font = `500 ${font}px Garamond, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 6);
  });
}
/** terrain en facettes : une grande plaque déformée par une fonction hauteur(x, z) */
export function terrain(w, d, seg, heightFn, colorFn) {
  const g = new THREE.PlaneGeometry(w, d, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightFn(p.getX(i), p.getZ(i)));
  let geo = g.toNonIndexed();
  if (colorFn) {
    const pp = geo.attributes.position, col = new Float32Array(pp.count * 3), c = new THREE.Color();
    for (let i = 0; i < pp.count; i += 3) {
      const cx = (pp.getX(i) + pp.getX(i + 1) + pp.getX(i + 2)) / 3, cz = (pp.getZ(i) + pp.getZ(i + 1) + pp.getZ(i + 2)) / 3, cy = (pp.getY(i) + pp.getY(i + 1) + pp.getY(i + 2)) / 3;
      c.set(colorFn(cx, cz, cy));
      for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  geo.computeVertexNormals();
  return geo;
}
/** bruit lisse 2D (pour les reliefs) */
export function noise2(seed = 1) {
  const r = rng(seed), P = new Float32Array(512).map(() => r());
  const h = (i, j) => P[((i * 73856093) ^ (j * 19349663)) & 511];
  const n = (x, z) => { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    return lerp(lerp(h(i, j), h(i + 1, j), u), lerp(h(i, j + 1), h(i + 1, j + 1), u), v); };
  return (x, z, oct = 3) => { let s = 0, a = 1, f = 1, t = 0; for (let o = 0; o < oct; o++) { s += n(x * f, z * f) * a; t += a; a *= 0.5; f *= 2.03; } return s / t; };
}

// ---------------------------------------------------------------------
// le ciel : dégradé jour/nuit, Soleil, étoiles et Voie lactée calculées dans le shader,
// lentille gravitationnelle (les étoiles se tordent autour d'un point), teinte (or, rouge…)
// ---------------------------------------------------------------------
export function makeSky(scene, o = {}) {
  const u = {
    uSunDir: { value: o.sunDir ?? dirAzEl(18, 25) }, uDay: { value: 1 },
    uDayZen: { value: new THREE.Color(...(o.dayZen ?? [0.035, 0.13, 0.42])) }, uDayHor: { value: new THREE.Color(...(o.dayHor ?? [0.36, 0.47, 0.60])) },
    uNightZen: { value: new THREE.Color(...(o.nightZen ?? [0.0012, 0.0016, 0.004])) }, uNightHor: { value: new THREE.Color(...(o.nightHor ?? [0.006, 0.008, 0.016])) },
    uSunGlow: { value: o.sunGlow ?? 1 },
    uStars: { value: o.stars ?? 0 }, uStarScale: { value: 260 }, uStarThr: { value: 0.945 }, uMilky: { value: o.milky ?? 1 }, uMilkyAxis: { value: (o.milkyAxis ?? new THREE.Vector3(0.45, 0.35, 0.82)).clone().normalize() },
    uBH: { value: new THREE.Vector3(0, 1, 0) }, uStarRot: { value: new THREE.Matrix3() }, uLensE: { value: 0 }, uShadow: { value: 0 },
    uTint: { value: new THREE.Color(1, 0.7, 0.3) }, uTintAmt: { value: 0 }, uTintDir: { value: new THREE.Vector3(0, 1, 0) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w * 0.99999; }',
    fragmentShader: `
      uniform vec3 uSunDir, uDayZen, uDayHor, uNightZen, uNightHor, uMilkyAxis, uBH, uTint, uTintDir; uniform mat3 uStarRot;
      uniform float uDay, uSunGlow, uStars, uStarScale, uStarThr, uMilky, uLensE, uShadow, uTintAmt;
      varying vec3 vDir;
      float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
      float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), f.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), f.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), f.x), f.y), f.z); }
      vec3 starsAt(vec3 d){
        float band = exp(-pow(dot(d, uMilkyAxis) / 0.17, 2.0));
        vec3 p = d * uStarScale; vec3 c = floor(p);
        float h = h13(c);
        float thr = uStarThr - 0.05 * band * uMilky;
        vec3 col = vec3(0.0);
        if (h > thr) {
          vec3 sp = c + 0.25 + 0.5 * h33(c);
          float b = (h - thr) / (1.0 - thr);
          float s = smoothstep(0.26, 0.0, length(p - sp)) * (0.25 + 2.2 * b * b * b);
          vec3 tint = mix(vec3(1.0, 0.85, 0.7), vec3(0.75, 0.85, 1.0), h33(c + 7.0).x);
          col += tint * s;
        }
        return col;
      }
      // lueur diffuse de la Voie lactée (une lentille gravitationnelle ne la rend PAS plus brillante, seulement les étoiles)
      vec3 nebAt(vec3 d){
        float band = exp(-pow(dot(d, uMilkyAxis) / 0.17, 2.0));
        float neb = vn(d * 9.0) * 0.6 + vn(d * 23.0) * 0.4;
        return vec3(0.05, 0.055, 0.075) * band * (0.4 + neb) * uMilky;
      }
      void main(){
        vec3 d = normalize(vDir); float hh = clamp(d.y, 0.0, 1.0);
        vec3 day = mix(uDayHor, uDayZen, pow(hh, 0.5));
        float s = max(dot(d, uSunDir), 0.0);
        day += (vec3(1.0, 0.62, 0.30) * pow(s, 6.0) * 0.07 + vec3(1.0, 0.8, 0.55) * pow(s, 60.0) * 0.30) * uSunGlow;
        vec3 night = mix(uNightHor, uNightZen, pow(hh, 0.6));
        vec3 col = mix(night, day, uDay);
        // lentille gravitationnelle
        vec3 sd = d; float mag = 1.0; float hole = 0.0;
        if (uLensE > 0.0) {
          float cth = clamp(dot(d, uBH), -1.0, 1.0); float th = acos(cth);
          if (th < uShadow) hole = 1.0;
          else if (th < 0.9) {
            float beta = th - uLensE * uLensE / th;
            vec3 uu = normalize(d - uBH * cth);
            sd = normalize(uBH * cos(beta) + uu * sin(beta));
            float r = uLensE / th; mag = clamp(1.0 / abs(1.0 - r * r * r * r), 1.0, 7.0);
          }
        }
        float horizonFade = smoothstep(-0.02, 0.06, d.y);
        vec3 sr = uStarRot * sd;   // le fond d'étoiles peut glisser derrière la lentille
        col += (starsAt(sr) * mag * uStars + nebAt(sr) * min(uStars, 1.0)) * (1.0 - hole) * horizonFade;
        // teinte (lueur dorée, rouge…) plus forte vers une direction
        float tg = pow(max(dot(d, uTintDir), 0.0), 3.0);
        col += uTint * uTintAmt * (0.25 + 0.9 * tg) * (0.55 + 0.45 * (1.0 - hh));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
  mesh.renderOrder = -10; mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, mat, u, follow(cam) { mesh.position.copy(cam.position); } };
}
/** petite texture ronde pour les particules (gouttes, poussière) — sinon les points sont carrés */
let _dot = null;
export function dotTex() {
  if (_dot) return _dot;
  _dot = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  return _dot;
}
/** Soleil (disque + halo) */
export function makeSun(scene, dir, size = 95) {
  const tex = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,240,210,0.45)');
    gr.addColorStop(0.35, 'rgba(255,200,140,0.14)'); gr.addColorStop(1, 'rgba(255,180,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(12, 11, 9.5), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  sp.scale.setScalar(size); sp.userData.dir = dir.clone(); scene.add(sp);
  sp.follow = (cam) => sp.position.copy(sp.userData.dir).multiplyScalar(820).add(cam.position);
  return sp;
}
/** pleine Lune (texture dessinée : mers sombres + cratères) */
export function makeMoon(scene, dir, size = 34) {
  const tex = canvasTex(512, 512, (g) => {
    const r = rng(1969);
    g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.closePath(); g.save(); g.clip();
    const gr = g.createRadialGradient(220, 220, 20, 256, 256, 250); gr.addColorStop(0, '#f4f2ea'); gr.addColorStop(1, '#cfccc2');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (const [x, y, rr] of [[190, 170, 70], [280, 150, 55], [300, 240, 60], [210, 290, 50], [330, 330, 40], [170, 230, 35]]) { g.fillStyle = 'rgba(120,118,112,0.42)'; g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, r() * 3, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 70; i++) { const x = 40 + r() * 432, y = 40 + r() * 432, rr = 3 + r() * 12; g.strokeStyle = 'rgba(90,88,84,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    const edge = g.createRadialGradient(256, 256, 200, 256, 256, 240); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = edge; g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.fill();
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(1.6, 1.6, 1.65), depthWrite: false, fog: false, transparent: true }));
  sp.scale.setScalar(size); sp.userData.dir = dir.clone(); sp.renderOrder = 2; scene.add(sp);
  sp.follow = (cam, dist = 800) => sp.position.copy(sp.userData.dir).multiplyScalar(dist).add(cam.position);
  return sp;
}

// ---------------------------------------------------------------------
// les personnages (avec "jauge de glace" en option)
// ---------------------------------------------------------------------
export function makePerson(scene, { shirt, pants, skin = '#e2b994', hair = '#3a2a20', s = 1 }) {
  const iceU = { value: -1 };
  const mk = (c) => {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true, transparent: true });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uIce = iceU;
      sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'varying float vWY;\nuniform float uIce;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          float iceK = 1.0 - smoothstep(uIce - 0.05, uIce + 0.03, vWY);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.70, 0.85, 0.98), iceK * 0.88);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.15, iceK);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.05, 0.12, 0.22) * iceK;');
    };
    m.customProgramCacheKey = () => 'ice';
    return m;
  };
  const m = { shirt: mk(shirt), pants: mk(pants), skin: mk(skin), hair: mk(hair), shoe: mk('#222') };
  const root = new THREE.Group(); root.scale.setScalar(s);
  const body = new THREE.Group(); root.add(body);
  add(new THREE.BoxGeometry(0.38, 0.6, 0.22), m.shirt, body, 0, 0.32, 0);
  const head = new THREE.Group(); head.position.y = 0.66; body.add(head);
  add(new THREE.IcosahedronGeometry(0.135, 1), m.skin, head, 0, 0.12, 0);
  const hr = add(new THREE.IcosahedronGeometry(0.142, 1), m.hair, head, 0, 0.17, -0.025); hr.scale.set(1, 0.7, 1);
  const limb = (px, py, len, w, mat) => { const piv = new THREE.Group(); piv.position.set(px, py, 0); add(new THREE.BoxGeometry(w, len, w), mat, piv, 0, -len / 2, 0); return piv; };
  const armL = limb(-0.245, 0.6, 0.55, 0.1, m.shirt), armR = limb(0.245, 0.6, 0.55, 0.1, m.shirt);
  body.add(armL, armR);
  const legs = [];
  for (const sx of [-0.1, 0.1]) {
    const hip = limb(sx, 0.02, 0.45, 0.14, m.pants);
    const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee);
    add(new THREE.BoxGeometry(0.13, 0.43, 0.13), m.pants, knee, 0, -0.215, 0);
    add(new THREE.BoxGeometry(0.14, 0.07, 0.24), m.shoe, knee, 0, -0.43, 0.05);
    body.add(hip); legs.push({ hip, knee });
  }
  scene.add(root);
  const P = { root, body, head, armL, armR, legs, ice: iceU, mats: Object.values(m) };
  P.reset = () => {
    body.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); body.position.set(0, 0.9, 0);
    armL.rotation.set(0.04, 0, 0.05); armR.rotation.set(0.04, 0, -0.05);
    for (const L of legs) { L.hip.rotation.set(0, 0, 0); L.knee.rotation.set(0, 0, 0); }
  };
  P.walk = (ph, amt = 1) => {
    body.position.y = 0.9 + Math.abs(Math.sin(ph)) * 0.03 * amt;
    legs[0].hip.rotation.x = Math.sin(ph) * 0.5 * amt; legs[1].hip.rotation.x = -Math.sin(ph) * 0.5 * amt;
    legs[0].knee.rotation.x = Math.max(0, -Math.sin(ph)) * 0.6 * amt; legs[1].knee.rotation.x = Math.max(0, Math.sin(ph)) * 0.6 * amt;
    armL.rotation.x = -Math.sin(ph) * 0.4 * amt; armR.rotation.x = Math.sin(ph) * 0.4 * amt;
  };
  P.sit = (k = 1) => {   // k : 1 assis, 0 debout
    body.position.y = lerp(0.9, 0.48, k); body.position.z = lerp(0.12, -0.04, k);
    for (const L of legs) { L.hip.rotation.x = -Math.PI / 2 * k; L.knee.rotation.x = Math.PI / 2 * k; }
  };
  P.fade = (a) => { root.visible = a > 0.01; for (const mm of P.mats) { mm.opacity = a; mm.transparent = a < 0.999; mm.depthWrite = a > 0.5; } };
  P.reset();
  return P;
}

// ---------------------------------------------------------------------
// le HUD (les textes à l'écran) — écrit dans le calque "hud"
// ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
export const HUD = {
  el: { l1: $('l1'), v1: $('v1'), s1: $('s1'), l2: $('l2'), v2: $('v2'), s2: $('s2'), b2: $('b2'), tr1: $('tr1'), tr2: $('tr2'), dot: $('dot'),
    hook: $('hook'), subt: $('subt'), fade: $('fade'), flash: $('flash'), end: $('end'), kicker: $('kicker'), q: $('q'), cta: $('cta'), fl: $('frostlens'), ret: $('reticles') },
  block(i, { label, value, sub, color = '#fff', scale = 1, subColor, subOpacity } = {}) {
    const e = this.el;
    const [l, v, s] = i === 1 ? [e.l1, e.v1, e.s1] : [e.l2, e.v2, e.s2];
    if (label !== undefined) l.textContent = label;
    if (value !== undefined) v.textContent = value;
    if (sub !== undefined) s.textContent = sub;
    v.style.color = color; v.style.transform = `scale(${scale})`;
    s.style.color = subColor || '#fff'; if (subOpacity !== undefined) s.style.opacity = subOpacity;
  },
  show2(on) { this.el.b2.style.display = on ? '' : 'none'; },
  live(t, line1, line2) { this.el.tr1.textContent = line1; this.el.tr2.textContent = line2; this.el.dot.style.opacity = Math.floor(t * 1.4) % 2 ? 0.25 : 1; },
  hook(t, html, tOut = 3.0) {
    if (this._hook !== html) { this.el.hook.innerHTML = html.replace(/ ([?!:])/g, '&#8239;$1'); this._hook = html; }   // espace insécable : le « ? » ne part jamais seul à la ligne
    this.el.hook.style.opacity = sm(0, 0.15, t) * (1 - sm(tOut - 0.35, tOut, t));
  },
  subs(t, SUBS) {   // (les nombres « 1 500 » ne se coupent jamais en fin de ligne)
    let txt = '', op = 0, pop = 1;
    for (const [a, b, s] of SUBS) if (t >= a - 0.01 && t <= b) { txt = s.replace(/(\d) (?=\d{3}\b)/g, '$1\u202f').replace(/ ([?!:;»])/g, '\u202f$1').replace(/« /g, '«\u202f'); op = sm(a, a + 0.18, t) * (1 - sm(b - 0.3, b, t)); pop = 0.9 + 0.1 * sm(a, a + 0.22, t); }
    this.el.subt.textContent = txt; this.el.subt.style.opacity = op; this.el.subt.style.transform = `scale(${pop})`;
  },
  _rets: {},
  /** viseur (coins de cadre) sur un point du monde, avec une étiquette */
  reticle(id, worldPos, camera, label, opacity, size = 120) {
    let r = this._rets[id];
    if (!r) {
      r = document.createElement('div'); r.className = 'reticle';
      r.innerHTML = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><span></span>';
      this.el.ret.appendChild(r); this._rets[id] = r;
    }
    const p = worldPos.clone().project(camera);
    r.style.left = `${(p.x * 0.5 + 0.5) * 1080}px`; r.style.top = `${(-p.y * 0.5 + 0.5) * 1920}px`;
    r.style.width = r.style.height = `${size}px`; r.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
    r.querySelector('span').textContent = label; r.querySelector('span').style.top = `${size + 12}px`;
    r.style.opacity = p.z < 1 ? opacity : 0;
  },
  end(t, t0, { kicker, q, cta }) {
    const e = this.el;
    if (e.q.dataset.v !== q) { e.kicker.textContent = kicker; e.q.innerHTML = q; e.cta.textContent = cta; e.q.dataset.v = q; }
    e.end.style.opacity = sm(t0, t0 + 0.45, t); e.cta.style.opacity = sm(t0 + 1.0, t0 + 1.5, t);
  },
  fade(v) { this.el.fade.style.opacity = v; },
  flash(v) { this.el.flash.style.opacity = v; },
  frost(v) { this.el.fl.style.opacity = v; },
};
/** givre sur l'objectif (dessiné une fois) */
export function drawFrostLens() {
  const c = $('frostlens'), g = c.getContext('2d'), r = rng(2026);
  const Wc = 1080, Hc = 1920;
  const edge = g.createRadialGradient(Wc / 2, Hc / 2, Hc * 0.28, Wc / 2, Hc / 2, Hc * 0.62);
  edge.addColorStop(0, 'rgba(220,235,255,0)'); edge.addColorStop(1, 'rgba(220,235,255,0.42)');
  g.fillStyle = edge; g.fillRect(0, 0, Wc, Hc); g.lineCap = 'round';
  const branch = (x, y, a, len, depth) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.strokeStyle = `rgba(235,244,255,${0.18 + r() * 0.4})`; g.lineWidth = depth > 1 ? 1.6 : 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    if (depth > 0) for (let k = 0; k < 2; k++) branch(x + (x2 - x) * (0.3 + r() * 0.5), y + (y2 - y) * (0.3 + r() * 0.5), a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * 0.5, depth - 1);
  };
  let n = 0;
  while (n < 2600) { const x = r() * Wc, y = r() * Hc, d = Math.max(Math.abs(x - Wc / 2) / (Wc / 2), Math.abs(y - Hc / 2) / (Hc / 2)); if (r() > Math.pow(d, 5)) continue; branch(x, y, r() * Math.PI * 2, 10 + r() * 34, 2); n++; }
}

// ---------------------------------------------------------------------
// démarrage d'un épisode : index.html?ep=nom&layer=scene|hud|all
// ---------------------------------------------------------------------
export async function run() {
  await Promise.all(['500 92px Garamond', 'italic 50px Garamond', '800 76px Inter', '600 19px Inter'].map((f) => document.fonts.load(f)));
  const ep = new URLSearchParams(location.search).get('ep');
  const mod = await import(`./episodes/${ep}/scene.js`);
  const E = await mod.default();
  window.T = E.T;
  window.getEvents = E.events || (() => ({}));
  window.renderAt = async (t) => {
    E.update(t);
    if (LAYER !== 'hud') E.stage.composer.render();
    await new Promise((r) => requestAnimationFrame(() => r()));
  };
  await document.fonts.ready;
  window.ready = true;
}

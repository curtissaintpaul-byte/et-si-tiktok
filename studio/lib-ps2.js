// =====================================================================
//  LE RENDU « PS2 » (le style des reconstitutions 3D façon reportage, vu chez Simon Puech)
//
//  Trois effets superposés, comme sur une vieille console :
//   1. l'image est calculée en PETIT (360 × 640 au lieu de 720 × 1280), puis agrandie SANS lissage
//      → des pixels bien visibles et des bords « en escalier » (comme une photo de timbre agrandie en poster) ;
//   2. MOINS DE COULEURS, avec une TRAME de petits points (le « tramage ») : de loin les points font un dégradé,
//      de près on voit la grille, surtout dans les ombres (la même astuce que l'impression des journaux) ;
//   3. des TEXTURES EN GROS CARRÉS (les visages, les objets) : on réduit chaque image collée sur les objets
//      et on l'affiche sans lissage, comme une mosaïque.
//  En plus, pour le côté « cinéma » : un FLOU DE PROFONDEUR (le fond flou derrière un objet net) et un étalonnage
//  (ombres un peu bleu-violet, couleurs un peu éteintes).
//  Et deux « looks » d'inserts : 'aerial' (vue aérienne noir et blanc très contrastée) et 'red' (le rouge des flashbacks).
//
//  const PS = makePS2(stage, { width: 360 });       // juste après createStage()
//  ps2Textures(objet3D, 96);                           // les textures de cet objet en gros carrés
//  dans update(t) :  PS.dof(focus, ouverture)  ou  PS.dof(0) (pas de flou) ;  PS.look('normal' | 'aerial' | 'red')
// =====================================================================
import { THREE } from './engine.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

export function makePS2(stage, { width = 360, levels = 14, dither = 1.0 } = {}) {
  const { renderer, composer, scene, camera, fxaa } = stage;
  const w = width, h = Math.round(width * 16 / 9);
  renderer.setSize(w, h, false); composer.setSize(w, h);
  renderer.domElement.style.imageRendering = 'pixelated';   // l'agrandissement sans lissage (les gros pixels)
  if (fxaa) fxaa.enabled = false;                            // surtout pas de lissage des bords : on veut l'escalier

  // --- le flou de profondeur (inséré juste après le rendu de la scène)
  const bokeh = new BokehPass(scene, camera, { focus: 10, aperture: 0, maxblur: 0.012 });
  composer.insertPass(bokeh, 2); bokeh.enabled = false;

  // --- la peinture finale : étalonnage, puis moins de couleurs + trame
  const ps2 = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uLevels: { value: levels }, uDither: { value: dither }, uMode: { value: 0 },
      uSat: { value: 0.82 }, uShadow: { value: new THREE.Color(0.055, 0.035, 0.085) }, uContrast: { value: 1.06 },
      uRed: { value: new THREE.Color(0.95, 0.12, 0.10) }, uGain: { value: 1.0 } },
    vertexShader: VS,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uLevels, uDither, uMode, uSat, uContrast, uGain; uniform vec3 uShadow, uRed; varying vec2 vUv;
      float B2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
      float B4(vec2 a){ return B2(0.5 * a) * 0.25 + B2(a); }                  // la grille de tramage 4 × 4 (valeurs de 0 à 1)
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb * uGain;
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        if (uMode < 0.5) {                                                     // normal : couleurs un peu éteintes, ombres bleu-violet
          c = mix(vec3(l), c, uSat);
          c += uShadow * (1.0 - smoothstep(0.0, 0.45, l));
          c = (c - 0.5) * uContrast + 0.5;
        } else if (uMode < 1.5) {                                              // vue aérienne : noir et blanc dur
          float g = smoothstep(0.03, 0.75, l); c = vec3(pow(g, 0.8));
        } else {                                                               // flashback rouge
          c = uRed * smoothstep(0.0, 0.8, l) * 1.25 + vec3(0.04, 0.0, 0.0);
        }
        float d = (B4(gl_FragCoord.xy) - 0.5) * uDither;
        float L = uLevels - 1.0;
        c = floor(clamp(c, 0.0, 1.0) * L + d + 0.5) / L;                       // on arrondit à quelques niveaux, décalés par la trame
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  composer.addPass(ps2);

  const MODES = { normal: 0, aerial: 1, red: 2 };
  return {
    w, h, bokeh, ps2,
    /** flou de profondeur : focus = distance nette (m), ap = ouverture (0 = pas de flou ; 0.02 = fond bien flou) */
    dof(focus, ap = 0.02, maxblur = 0.012) {
      bokeh.enabled = focus > 0 && ap > 0; if (!bokeh.enabled) return;
      const u = bokeh.uniforms; u.focus.value = focus; u.aperture.value = ap; u.maxblur.value = maxblur;
      u.nearClip.value = camera.near; u.farClip.value = camera.far; u.aspect.value = camera.aspect;
    },
    look(name, o = {}) { ps2.uniforms.uMode.value = MODES[name] ?? 0; ps2.uniforms.uGain.value = o.gain ?? 1; ps2.uniforms.uSat.value = o.sat ?? 0.82; },
  };
}

/** les textures d'un objet (et de ses enfants) en gros carrés : réduites à `px` de large, affichées sans lissage */
const _small = new Map();
export function ps2Textures(root, px = 96) {
  root.traverse((o) => {
    if (!o.isMesh && !o.isSprite) return;
    for (const m of [].concat(o.material)) for (const k of ['map', 'emissiveMap']) {
      const t = m[k]; if (!t || !t.image) continue;
      const key = t.uuid + ':' + px;
      if (!_small.has(key)) {
        const img = t.image, iw = img.width || img.videoWidth, ih = img.height || img.videoHeight;
        const sw = Math.min(px, iw), sh = Math.max(1, Math.round(ih * sw / iw));
        const c = document.createElement('canvas'); c.width = sw; c.height = sh;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, sw, sh);
        const nt = new THREE.CanvasTexture(c); nt.flipY = t.flipY; nt.colorSpace = t.colorSpace; nt.wrapS = t.wrapS; nt.wrapT = t.wrapT; nt.repeat.copy(t.repeat); nt.offset.copy(t.offset);
        nt.magFilter = THREE.NearestFilter; nt.minFilter = THREE.NearestFilter; nt.generateMipmaps = false;
        _small.set(key, nt);
      }
      m[k] = _small.get(key); m.needsUpdate = true;
    }
  });
  return root;
}

/** une texture dessinée « à l'ancienne » : petite, sans lissage */
export function pixTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.generateMipmaps = true;   // (de près : gros carrés ; de loin : pas de moiré)
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...[].concat(repeat, repeat).slice(0, 2)); }
  return t;
}

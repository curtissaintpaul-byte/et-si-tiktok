// =====================================================================
//  LES PERSONNAGES RÉALISTES (choix de Curtis : partout, à la place des bonhommes en cubes)
//
//  Le modèle : « Michelle » (Mixamo, la bibliothèque gratuite d'Adobe : libre d'usage dans une vidéo, mais on ne
//  redistribue PAS le fichier → il est téléchargé à chaque fois par get-models.sh et n'est jamais mis dans le dépôt).
//  8 tenues : on repeint la peau, le haut et le pantalon directement dans la texture.
//
//  Comme une marionnette : on part de la pose en T, puis on tourne les articulations autour des axes du personnage
//  (X = pencher avant/arrière, Z = écarter sur le côté, Y = tourner). Le personnage regarde vers +Z, son bras gauche vers +X.
//
//  const PEOPLE = await loadPeople(renderer);
//  const P = PEOPLE.make({ outfit: 3 });  scene.add(P.root);  P.root.position.set(x, 0, z);
//  dans update(t) :  P.stand();  ou  P.walk(t * 6);  P.run(ph);  P.sit(k);  P.armsUp(k);  P.do(spec…)  (une seule par image)
//  P.point('neck') → position 3D (pour les étiquettes de l'arrêt sur image : head, eyes, nose, mouth, ear, neck, throat,
//                    chest, lungs, heart, belly, lHand, rHand, lArm, rArm, lKnee, rKnee, lFoot, rFoot)
//  P.attach(objet, 'eyes') : accroche des lunettes, un masque… qui suivent la tête
//  Policiers : loadPolice() plus bas
//  P.fade(a), P.pop(k) (apparition avec un petit rebond)
//  Pour une foule : voir lib-multiply.js (vrais personnages devant, « photos découpées » au loin)
// =====================================================================
import { THREE } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const PTS = { head: ['Head', 0.1, 0.02], eyes: ['Head', 0.07, 0.09], nose: ['Head', 0.035, 0.11], mouth: ['Head', 0.0, 0.1], ear: ['Head', 0.06, 0.0, 0.075], neck: ['Neck', 0.03, 0.02], throat: ['Neck', 0.02, 0.07],
  chest: ['Spine2', 0.05, 0.1], lungs: ['Spine2', 0.06, 0.1, -0.07], heart: ['Spine2', 0.03, 0.1, 0.05], belly: ['Spine', 0.02, 0.11],
  lHand: ['LeftHand', 0, 0], rHand: ['RightHand', 0, 0], lArm: ['LeftForeArm', 0, 0], rArm: ['RightForeArm', 0, 0], lKnee: ['LeftLeg', 0, 0.05], rKnee: ['RightLeg', 0, 0.05], lFoot: ['LeftFoot', 0, 0.06], rFoot: ['RightFoot', 0, 0.06] };
// les tenues : [pantalon, peau, haut] (null = couleur d'origine)
const DENIM = [0.22, 0.32, 0.55], BLACK = [0.15, 0.15, 0.17], BEIGE = [0.62, 0.55, 0.42], KHAKI = [0.38, 0.4, 0.3];
const LIGHT = [0.93, 0.76, 0.64], MED = [0.8, 0.6, 0.45], TAN = [0.66, 0.46, 0.32];
const WHITE = [0.86, 0.86, 0.84], NAVY = [0.2, 0.25, 0.4], BURG = [0.5, 0.18, 0.2], GREEN = [0.3, 0.42, 0.33];
export const OUTFITS = [[DENIM, null, null], [BLACK, LIGHT, WHITE], [BEIGE, MED, NAVY], [DENIM, LIGHT, BURG], [KHAKI, TAN, null], [BLACK, MED, GREEN], [null, LIGHT, NAVY], [DENIM, TAN, WHITE]];

export async function loadPeople(renderer, url = 'models/Michelle.glb', { extra = [] } = {}) {   // extra : des tenues en plus (ex. gilet jaune), numérotées après les 8
  const gl = await new GLTFLoader().loadAsync(url);
  let mat0; gl.scene.traverse((o) => { if (o.isMesh) mat0 = o.material; });
  // --- les 8 textures
  const img = mat0.map.image, cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const g0 = cv.getContext('2d'); g0.drawImage(img, 0, 0); const base = g0.getImageData(0, 0, cv.width, cv.height);
  const paint = ([pants, skin, top, rest]) => {   // rest : (option) la couleur de tout le reste qui est coloré (chaussures…)
    const d = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height); const a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      const r = a[i] / 255, gg = a[i + 1] / 255, bl = a[i + 2] / 255, mx = Math.max(r, gg, bl), mn = Math.min(r, gg, bl), sat = mx > 0 ? (mx - mn) / mx : 0;
      let h = 0; if (mx > mn) { h = mx === r ? ((gg - bl) / (mx - mn)) % 6 : mx === gg ? (bl - r) / (mx - mn) + 2 : (r - gg) / (mx - mn) + 4; h *= 60; if (h < 0) h += 360; }
      const lum = 0.3 * r + 0.59 * gg + 0.11 * bl; let c = null;
      if (pants && mx > 0.15 && sat > 0.45 && h >= 38 && h <= 72) c = pants.map((x) => x * lum / 0.75);                                   // pantalon jaune
      else if (skin && h >= 10 && h <= 36 && sat > 0.22 && sat < 0.8 && mx > 0.18 && mx < 0.8) c = skin.map((x) => x * Math.min(1.25, lum / 0.36));   // peau
      else if (top && sat < 0.2 && mx > 0.3 && mx < 0.92) c = top.map((x) => x * lum / 0.62);                                              // haut gris
      else if (rest && sat > 0.25) c = rest.map((x) => x * Math.min(1.4, lum / 0.4));                                                     // le reste (chaussures…)
      if (c) { a[i] = Math.min(255, c[0] * 255); a[i + 1] = Math.min(255, c[1] * 255); a[i + 2] = Math.min(255, c[2] * 255); }
    }
    const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; c2.getContext('2d').putImageData(d, 0, 0);
    const tx = new THREE.CanvasTexture(c2); tx.flipY = false; tx.colorSpace = THREE.SRGBColorSpace; return tx;
  };
  const ALL = [...OUTFITS, ...extra], MAPS = ALL.map(paint);
  const hb = new THREE.Box3().setFromObject(gl.scene), H0 = hb.max.y - hb.min.y;

  function make({ outfit = 0, height = 1.65, shadows = true } = {}) {
    const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
    const body = SkeletonUtils.clone(gl.scene); body.scale.setScalar(height / H0); inner.add(body);
    const mats = [];
    body.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = shadows; const m = o.material = o.material.clone();
      m.map = MAPS[outfit % MAPS.length]; m.metalnessMap = null; m.metalness = 0.05; m.roughness = 0.75; mats.push(m); } });   // (sans « métal » : sinon tout paraît sombre)
    const B = {}; for (const n of ORDER) B[n] = body.getObjectByName('mixamorig' + n);
    const rest = {}; for (const n of ORDER) rest[n] = B[n].quaternion.clone();
    // orientation d'un os dans le repère du personnage (= produit des rotations jusqu'au corps)
    const charQ = (o) => { const q = new THREE.Quaternion(); const chain = []; while (o && o !== body) { chain.push(o); o = o.parent; } for (let i = chain.length - 1; i >= 0; i--) q.multiply(chain[i].quaternion); return q; };
    const qa = new THREE.Quaternion();
    /** applique une pose : spec = { Os: [['z', angle], ['x', angle]…] } (axes du personnage, dans l'ordre donné) */
    function apply(spec) {
      for (const n of ORDER) B[n].quaternion.copy(rest[n]);
      for (const n of ORDER) {
        const rots = spec[n]; if (!rots || !rots.length) continue;
        const pq = charQ(B[n].parent), cur = pq.clone().multiply(B[n].quaternion);
        for (const [ax, ang] of rots) cur.premultiply(qa.setFromAxisAngle(AX[ax], ang));
        B[n].quaternion.copy(pq.invert().multiply(cur));
      }
      inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0);
    }
    const merge = (...specs) => { const out = {}; for (const s of specs) for (const k in s) (out[k] = out[k] || []).push(...s[k]); return out; };
    const STAND = (v = 0) => ({ LeftArm: [['z', -1.25 - v]], RightArm: [['z', 1.25 + v]], LeftForeArm: [['x', -0.25], ['z', -0.12]], RightForeArm: [['x', -0.25], ['z', 0.12]] });
    const P = { root, inner, body, bones: B, mats, apply, merge, STAND };
    P.do = (...specs) => apply(merge(STAND(), ...specs));
    P.stand = (v = 0) => apply(STAND(v));
    P.walk = (ph, amt = 1) => {   // marche (ph : la phase, ~6 par seconde pour un pas normal)
      const s = Math.sin(ph) * amt, c = Math.cos(ph) * amt;
      apply(merge(STAND(), { LeftUpLeg: [['x', -0.42 * s]], RightUpLeg: [['x', 0.42 * s]], LeftLeg: [['x', Math.max(0, -c) * 0.55 * amt + 0.05]], RightLeg: [['x', Math.max(0, c) * 0.55 * amt + 0.05]],
        LeftArm: [['x', 0.32 * s]], RightArm: [['x', -0.32 * s]], Spine: [['y', 0.06 * s]] }));
      inner.position.y = -Math.abs(c) * 0.025 * amt;
    };
    P.run = (ph, amt = 1) => {
      const s = Math.sin(ph) * amt, c = Math.cos(ph) * amt;
      apply(merge(STAND(-0.15), { Spine: [['x', 0.18 * amt]], LeftUpLeg: [['x', -0.75 * s - 0.15 * amt]], RightUpLeg: [['x', 0.75 * s - 0.15 * amt]], LeftLeg: [['x', (0.4 + 0.9 * Math.max(0, -c)) * amt]], RightLeg: [['x', (0.4 + 0.9 * Math.max(0, c)) * amt]],
        LeftArm: [['x', 0.7 * s]], RightArm: [['x', -0.7 * s]], LeftForeArm: [['x', -1.1 * amt]], RightForeArm: [['x', -1.1 * amt]] }));
      inner.position.y = Math.abs(s) * 0.05 * amt;
    };
    P.sit = (k = 1) => {   // k : 0 debout → 1 assis (le siège est à ~0,45 m)
      apply(merge(STAND(), { LeftUpLeg: [['x', -1.5 * k]], RightUpLeg: [['x', -1.5 * k]], LeftLeg: [['x', 1.5 * k]], RightLeg: [['x', 1.5 * k]], LeftForeArm: [['x', -0.6 * k]], RightForeArm: [['x', -0.6 * k]] }));
      inner.position.set(0, -0.42 * k, -0.12 * k);
    };
    P.armsUp = (k = 1, wave = 0) => apply(merge(STAND(), { LeftArm: [['z', 2.45 * k + 0.2 * Math.sin(wave)]], RightArm: [['z', -2.45 * k - 0.2 * Math.sin(wave + 1)]], Head: [['x', -0.25 * k]] }));
    const v3 = new THREE.Vector3();
    P.point = (name) => {   // un point du corps, en 3D (pour les étiquettes)
      const [bn, up = 0, fw = 0, side = 0] = PTS[name] || [name]; body.updateMatrixWorld(true);
      const b = B[bn] || body.getObjectByName('mixamorig' + bn); const p = b.getWorldPosition(new THREE.Vector3());
      const q = root.getWorldQuaternion(new THREE.Quaternion()), s = height / 1.65;
      return p.add(v3.set(side * s, up * s, fw * s).applyQuaternion(q));
    };
    /** accroche un objet (lunettes, masque…) sur une partie du corps : il suit l'os, orienté comme le personnage (regard vers +Z) */
    P.attach = (obj, name, { dx = 0, dy = 0, dz = 0 } = {}) => {
      const [bn, up = 0, fw = 0, side = 0] = PTS[name] || [name]; P.stand(); root.updateMatrixWorld(true);
      const b = B[bn] || body.getObjectByName('mixamorig' + bn), s = height / 1.65;
      const rq = root.getWorldQuaternion(new THREE.Quaternion());
      const wp = b.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3((side + dx) * s, (up + dy) * s, (fw + dz) * s).applyQuaternion(rq));
      const bq = b.getWorldQuaternion(new THREE.Quaternion()), bs = b.getWorldScale(new THREE.Vector3());
      b.add(obj); obj.position.copy(b.worldToLocal(wp)); obj.quaternion.copy(bq.invert().multiply(rq)); obj.scale.setScalar(s / bs.x);
      return obj;
    };
    P.fade = (a) => { root.visible = a > 0.01; for (const m of mats) { m.opacity = a; m.transparent = a < 0.999; m.depthWrite = a > 0.5; } };
    P.pop = (k) => { const c = 1.7, m = Math.min(1, Math.max(0, k)) - 1; const s = k <= 0 ? 0 : 1 + (c + 1) * m * m * m + c * m * m; root.visible = k > 0; inner.scale.setScalar(Math.max(1e-4, s)); };
    P.stand();
    return P;
  }

  /** l'atlas des « photos découpées » pour les foules : 8 tenues vues d'un peu haut, une case chacune (4 × 2) */
  function atlas(elevDeg = 30, CW = 128, CH = 256, cells = [0, 1, 2, 3, 4, 5, 6, 7]) {   // cells : quelle tenue dans chaque case
    const rt = new THREE.WebGLRenderTarget(CW * 4, CH * 2, { type: THREE.HalfFloatType });
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#c6d4f0', '#2a241e', 1.1));
    const kl = new THREE.DirectionalLight('#fff0d6', 2.6); kl.position.set(3, 8, 6); sc.add(kl);
    const oc = new THREE.OrthographicCamera(-0.5, 0.5, 1.0, -1.0, 0.1, 20), e = elevDeg * Math.PI / 180;
    const prevVP = new THREE.Vector4(); renderer.getViewport(prevVP);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.setScissorTest(true);
    for (let i = 0; i < 8; i++) {
      const p = make({ outfit: cells[i], shadows: false }); p.stand(i * 0.03); p.root.rotation.y = [0, 0.5, -0.5, 0.25][i % 4]; sc.add(p.root);
      oc.position.set(0, 0.85 + Math.sin(e) * 6, Math.cos(e) * 6); oc.lookAt(0, 0.85, 0); oc.updateMatrixWorld();
      const cx = (i % 4) * CW, cy = Math.floor(i / 4) * CH; renderer.setViewport(cx, cy, CW, CH); renderer.setScissor(cx, cy, CW, CH);
      renderer.render(sc, oc); sc.remove(p.root);
    }
    renderer.setScissorTest(false); renderer.setRenderTarget(null); renderer.setViewport(prevVP); renderer.setClearColor(0x000000, 1);
    return rt.texture;
  }
  return { make, atlas, MAPS, OUTFITS: ALL };
}

// =====================================================================
//  LES FORCES DE L'ORDRE : le modèle « Soldier » (Mixamo, même licence que Michelle, même téléchargement), repeint en bleu
//  nuit, avec un bouclier transparent « POLICE ». Il a sa propre animation « au repos » (Idle).
//  const COPS = await loadPolice();  const c = COPS.make({ shield: true });  scene.add(c.root);  c.update(t)  (t en secondes)
// =====================================================================
export async function loadPolice(url = 'models/Soldier.glb') {
  const gl = await new GLTFLoader().loadAsync(url);
  const idle = gl.animations.find((a) => a.name === 'Idle'), walk = gl.animations.find((a) => a.name === 'Walk');
  const hb = new THREE.Box3().setFromObject(gl.scene), H0 = hb.max.y - hb.min.y;
  const shieldTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = 'rgba(190,205,220,0.30)'; g.fillRect(0, 0, 256, 512); g.strokeStyle = 'rgba(30,35,45,0.9)'; g.lineWidth = 14; g.strokeRect(7, 7, 242, 498);
    g.fillStyle = 'rgba(240,244,250,0.95)'; g.font = '800 46px Inter'; g.textAlign = 'center'; g.fillText('POLICE', 128, 150);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const shieldMat = new THREE.MeshStandardMaterial({ map: shieldTex, transparent: true, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  function make({ height = 1.8, shield = true, tint = '#3a4458', shadows = false, phase = 0 } = {}) {
    const root = new THREE.Group(); const body = SkeletonUtils.clone(gl.scene); body.scale.setScalar(height / H0); body.rotation.y = Math.PI; root.add(body);
    body.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = shadows; o.material = o.material.clone(); o.material.color = new THREE.Color(tint); o.material.metalness = 0.1; o.material.roughness = 0.6; } });
    const mixer = new THREE.AnimationMixer(body); const a = mixer.clipAction(idle); a.play();
    if (shield) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.15), shieldMat); sh.position.set(0.05, 0.95, 0.42); root.add(sh); }
    return { root, body, mixer, update: (t) => mixer.setTime(Math.max(0, t + phase)) };
  }
  return { make };
}

// =====================================================================
//  LES SILHOUETTES À CAPUCHE (voleurs, suspects…) : le même modèle « Soldier » (il a une capuche et une visière),
//  teinté sombre. Il garde ses animations (Idle, Walk, Run) et on peut en plus tordre des os par-dessus,
//  avec les mêmes axes que Michelle (repère du personnage : il regarde vers +Z).
//  const HOOD = await loadHooded();  const h = HOOD.make({ tint: '#2c2e33' });  scene.add(h.root);
//  dans update(t) :  h.pose('Walk', t)  ou  h.pose('Idle', t, { RightArm: [['x', -1.2]] })   ;  h.point('RightHand')
// =====================================================================
export async function loadHooded(url = 'models/Soldier.glb') {
  const gl = await new GLTFLoader().loadAsync(url);
  const clips = Object.fromEntries(gl.animations.map((a) => [a.name, a]));
  const hb = new THREE.Box3().setFromObject(gl.scene), H0 = hb.max.y - hb.min.y;
  const qa = new THREE.Quaternion();
  function make({ tint = '#2c2e33', height = 1.82, shadows = true } = {}) {
    const root = new THREE.Group(); const body = SkeletonUtils.clone(gl.scene); body.scale.setScalar(height / H0); body.rotation.y = Math.PI; root.add(body);
    const mats = [];
    body.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = shadows; o.material = o.material.clone(); o.material.color = new THREE.Color(tint); o.material.metalness = 0.05; o.material.roughness = 0.8; mats.push(o.material); } });
    const mixer = new THREE.AnimationMixer(body), acts = {};
    for (const n of ['Idle', 'Walk', 'Run']) { acts[n] = mixer.clipAction(clips[n]); acts[n].play(); }
    const bone = (n) => body.getObjectByName('mixamorig' + n);
    const charQ = (o) => { const q = new THREE.Quaternion(), chain = []; while (o && o !== root) { chain.push(o); o = o.parent; } for (let i = chain.length - 1; i >= 0; i--) q.multiply(chain[i].quaternion); return q; };
    // la pose de repos de chaque os : on y revient à chaque image (sinon un os que l'animation ne touche pas garderait
    // la rotation de l'image d'avant, et nos rotations en plus s'additionneraient d'une image à l'autre)
    const bones = []; body.traverse((o) => { if (o.isBone) bones.push([o, o.quaternion.clone(), o.position.clone()]); });
    const H = {
      root, body, mats, mixer,
      /** une animation (Idle, Walk, Run) à l'instant t, puis des rotations en plus : { Os: [['x', angle]…] } */
      pose(anim, t, spec = {}) {
        for (const [o, q, p] of bones) { o.quaternion.copy(q); o.position.copy(p); }
        for (const n in acts) acts[n].setEffectiveWeight(n === anim ? 1 : 0);
        mixer.setTime(Math.max(0, t));
        for (const n in spec) {
          const b = bone(n); if (!b) continue; const pq = charQ(b.parent), cur = pq.clone().multiply(b.quaternion);
          for (const [ax, ang] of spec[n]) cur.premultiply(qa.setFromAxisAngle(AX[ax], ang));
          b.quaternion.copy(pq.invert().multiply(cur));
        }
      },
      point(n) { root.updateMatrixWorld(true); return bone(n).getWorldPosition(new THREE.Vector3()); },
      hot(k) { for (const m of mats) { m.emissive.setRGB(k, k, k); } },
    };
    return H;
  }
  return { make };
}

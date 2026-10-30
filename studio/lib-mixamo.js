// =====================================================================
//  LES VRAIS PERSOS (Mixamo, téléchargés avec le compte de Curtis le 15/10/2026)
//  Licence Mixamo : libre d'usage dans nos vidéos, mais on ne redistribue PAS les fichiers → studio/models/ n'est
//  jamais mis dans le dépôt. Les originaux (FBX) sont sur l'ordi de Curtis : Téléchargements/mixamo/.
//  Ici : des GLB allégés (textures 512 px), dans studio/models/mixamo/ (persos) et studio/models/mixamo/anim/ (animations).
//
//  Persos : James, Leonard (tout en noir), Adam (survêtement blanc), Brian (t-shirt gris, jean), Remy (t-shirt, short),
//           Josh (veste, jean), Joe (costume), Swat (police d'intervention), Kate, Jody (femmes), Chad (blouse de soignant)
//  Animations (toutes exportées sur James, « sur place » pour les marches) : walk, sneak, sneakfast, crouchwalk, run,
//           idle, lookaround, nervous, texting, phone, entercar, driving, exitcar, kneel, sit, opendoor, walkfemale
//
//  const CAST = await loadMixamo({ chars: ['James'], anims: ['walk', 'idle'] });
//  const P = CAST.make('James', { height: 1.8 });  scene.add(P.root);
//  dans update(t) :  P.pose('walk', t)   ou   P.pose([['walk', t, 0.3], ['idle', t, 0.7]], { RightArm: [['x', -0.3]] })
//                    P.point('RightHand') → position 3D d'un os ;  P.hold(objet, 'RightHand', {…}) : un objet dans la main
//  Comme une marionnette avec un film d'animation déjà tourné : l'animation donne le mouvement, et on peut encore
//  tordre un os par-dessus (mêmes axes que Michelle : repère du personnage, il regarde vers +Z).
// =====================================================================
import { THREE } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { ps2Textures, pixTex } from './lib-ps2.js';

const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const ONE_SHOT = new Set(['entercar', 'exitcar', 'opendoor', 'kneel']);   // animations qui ne bouclent pas (on s'arrête sur la dernière image)
const loader = new GLTFLoader();

/** masques d'os : le haut du corps (buste, tête, bras) ou le bas (bassin, jambes) — pour mélanger deux animations */
export const UPPER = /^(Spine1|Spine2|Neck|Head|HeadTop_End|LeftShoulder|LeftArm|LeftForeArm|LeftHand.*|RightShoulder|RightArm|RightForeArm|RightHand.*|LeftEye|RightEye)$/;
export const LOWER = /^(Hips|Spine|LeftUpLeg|LeftLeg|LeftFoot|LeftToeBase|LeftToe_End|RightUpLeg|RightLeg|RightFoot|RightToeBase|RightToe_End)$/;

export async function loadMixamo({ chars = [], anims = [], dir = 'models/mixamo' } = {}) {
  const C = {}, A = {};
  await Promise.all(chars.map(async (n) => { C[n] = await loader.loadAsync(`${dir}/${n}.glb`); }));
  await Promise.all(anims.map(async (n) => {
    const g = await loader.loadAsync(`${dir}/anim/${n}.glb`);
    const clip = g.animations.find((a) => a.tracks.length); let hips = null;
    g.scene.traverse((o) => { if (!hips && /Hips$/.test(o.name)) hips = o; });
    A[n] = { clip, restY: hips ? hips.position.y : 1 };
  }));
  const qa = new THREE.Quaternion();

  // clean : rendu « propre » (épisodes hors reconstitution) : textures d'origine lissées, et cheveux visibles (dans les
  //         fichiers convertis, la couleur des cheveux a une opacité de 0 : sans ça, les persos paraissent rasés)
  function make(name, { height = 1.8, shadows = true, texPx = 128, clean = false } = {}) {
    if (clean) texPx = 0;
    const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
    const body = SkeletonUtils.clone(C[name].scene); inner.add(body);
    // la taille : on mesure en pose T, puis on pose les pieds au sol
    body.updateMatrixWorld(true); let bb = new THREE.Box3().setFromObject(body);
    body.scale.multiplyScalar(height / (bb.max.y - bb.min.y)); body.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(body); body.position.y -= bb.min.y;
    // les matériaux : opaques (sauf cheveux et cils, découpés), un peu mats, textures en gros carrés
    const mats = [];
    body.traverse((o) => {
      if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = shadows; o.receiveShadow = true;
      o.material = [].concat(o.material).map((m0) => { const m = m0.clone(); const cut = /hair|lash/i.test(m.name);
        m.transparent = false; m.depthWrite = true; m.alphaTest = cut ? 0.45 : 0; m.side = cut ? THREE.DoubleSide : THREE.FrontSide;
        m.roughness = Math.max(0.6, m.roughness ?? 0.8); m.metalness = 0; m.envMapIntensity = 0.4;
        if (clean && cut) { m.opacity = 1; m.alphaTest = 0.35; }
        mats.push(m); return m; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    if (texPx > 0) ps2Textures(body, texPx);   // texPx = 0 : textures d'origine, lissées (rendu « propre », sans gros carrés)
    // les os, leur nom court (« Hips », « RightHand »…) et la pose de repos
    const B = {}; let prefix = 'mixamorig';
    body.traverse((o) => { if (o.isBone) { const m = o.name.match(/^(mixamorig\d*)(.+)$/); if (m) { prefix = m[1]; B[m[2]] = o; } } });
    const rest = []; body.traverse((o) => { if (o.isBone) rest.push([o, o.quaternion.clone(), o.position.clone()]); });
    const restHipsY = B.Hips.position.y;
    // les animations : on renomme les pistes vers les os de CE perso, et on met la hauteur du bassin à son échelle.
    // On calcule la pose nous-mêmes à chaque image (sans « AnimationMixer », qui garde une mémoire d'une image à l'autre et
    // n'applique un os que s'il a bougé : avec nos retouches, ça faisait des bras qui sautaient pendant les arrêts sur image).
    const acts = {};
    for (const n in A) {
      const clip = A[n].clip, k = restHipsY / A[n].restY, tracks = [];
      for (const tr of clip.tracks) {
        const m = tr.name.match(/^mixamorig\d*(.+)\.(quaternion|position)$/); if (!m || !B[m[1]]) continue;
        let t2 = tr; if (m[2] === 'position' && m[1] === 'Hips') { t2 = tr.clone(); const v = t2.values = tr.values.slice(); for (let i = 0; i < v.length; i++) v[i] *= k; }
        if (m[2] === 'position' && m[1] !== 'Hips') continue;                                  // (seul le bassin se déplace)
        tracks.push({ bone: B[m[1]], kind: m[2], interp: t2.createInterpolant(), name: m[1] });
      }
      acts[n] = { duration: clip.duration, tracks, getClip: () => clip };
    }
    const charQ = (o) => { const q = new THREE.Quaternion(), chain = []; while (o && o !== root) { chain.push(o); o = o.parent; } for (let i = chain.length - 1; i >= 0; i--) q.multiply(chain[i].quaternion); return q; };
    const tq = new THREE.Quaternion(), tv = new THREE.Vector3();
    const P = {
      root, inner, body, bones: B, mats, acts, name,
      duration: (n) => acts[n].duration,
      /** pose(nom, temps, retouches) ou pose([[nom, temps, poids], …], retouches) */
      pose(list, t, spec) {
        if (typeof list === 'string') list = [[list, t, 1]]; else spec = t;
        for (const [o, q, p] of rest) { o.quaternion.copy(q); o.position.copy(p); }
        // le mélange des animations, os par os (poids total < 1 : on garde une part de la pose de repos)
        const acc = new Map();
        for (const [n, tt, w, mask] of list) {   // mask (facultatif) : les os concernés, ex. UPPER ou LOWER (le haut d'un film, le bas d'un autre)
          const a = acts[n]; if (!a) { console.warn('animation inconnue', n); continue; } if (w <= 1e-4) continue;
          const d = a.duration, time = ONE_SHOT.has(n) ? Math.min(Math.max(0, tt), d - 1e-3) : ((tt % d) + d) % d;
          for (const tr of a.tracks) {
            if (mask && !mask.test(tr.name)) continue;
            const v = tr.interp.evaluate(time), key = tr.bone.uuid + tr.kind;
            let e = acc.get(key); if (!e) { e = { bone: tr.bone, kind: tr.kind, w: 0, q: new THREE.Quaternion(), p: new THREE.Vector3() }; acc.set(key, e); }
            if (tr.kind === 'quaternion') { tq.fromArray(v); if (e.w === 0) e.q.copy(tq); else e.q.slerp(tq, w / (e.w + w)); }
            else { tv.fromArray(v); if (e.w === 0) e.p.copy(tv); else e.p.lerp(tv, w / (e.w + w)); }
            e.w += w;
          }
        }
        for (const e of acc.values()) {
          const k = Math.min(1, e.w);
          if (e.kind === 'quaternion') e.bone.quaternion.slerp(e.q, k); else e.bone.position.lerp(e.p, k);
        }
        for (const n in (spec || {})) {
          const b = B[n]; if (!b) continue; const pq = charQ(b.parent), cur = pq.clone().multiply(b.quaternion);
          for (const [ax, ang] of spec[n]) cur.premultiply(qa.setFromAxisAngle(AX[ax], ang));
          b.quaternion.copy(pq.invert().multiply(cur));
        }
        root.updateMatrixWorld(true);
      },
      point(n) { root.updateMatrixWorld(true); return B[n].getWorldPosition(new THREE.Vector3()); },
      /** un objet tenu dans la main (ou accroché à un os) : il suit l'os ; off = décalage dans le repère de l'os (mètres), rot = rotation */
      hold(obj, n, { off = [0, 0, 0], rot = [0, 0, 0] } = {}) {
        const b = B[n]; root.updateMatrixWorld(true); const s = b.getWorldScale(new THREE.Vector3());
        b.add(obj); obj.position.set(off[0] / s.x, off[1] / s.y, off[2] / s.z); obj.rotation.set(...rot); obj.scale.set(1 / s.x, 1 / s.y, 1 / s.z); return obj;
      },
      hot(k) { for (const m of mats) { m.emissive = m.emissive || new THREE.Color(); m.emissive.setRGB(k, k, k); m.emissiveIntensity = 1; } },
    };
    P.pose('idle' in acts ? 'idle' : Object.keys(acts)[0] || 'idle', 0);
    return P;
  }
  return { make, C, A };
}

// =====================================================================
//  LA CAGOULE NOIRE, moulée sur la tête du perso : on reprend les triangles de sa tête et de son cou (ceux que les os
//  « Head » et « Neck » font bouger), on les gonfle de quelques millimètres et on les peint en maille noire.
//  La fente des yeux est un vrai trou : on y voit les yeux du perso. Les cheveux sont cachés (ils sont sous la cagoule).
//  C'est comme mouler un bonnet directement sur son crâne : la cagoule a son nez, son menton, sa nuque.
//  balaclava(P, { eyeY, eyeH, eyeW }) : réglages de la fente (fractions de la hauteur / largeur de la tête)
// =====================================================================
const knit = () => pixTex(32, 32, (g, w, h) => {
  g.fillStyle = '#18181b'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 2) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, 0, 1, h); }   // les côtes du tricot
  for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, w, 1); }
}, [6, 3]);
export function balaclava(P, { color = '#8e8e96', eyeY = 0.52, eyeH = 0.1, eyeW = 0.55, inflate = 0.035 } = {}) {
  const meshes = []; P.body.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const isHair = (m) => /hair/i.test(m.material.name || ''), isLash = (m) => /lash|eye/i.test(m.material.name || '');
  for (const m of meshes) if (isHair(m)) m.visible = false;                     // les cheveux disparaissent sous la cagoule
  const mat = new THREE.MeshStandardMaterial({ map: knit(), color, roughness: 1, metalness: 0 });
  const made = [];
  for (const src of meshes) {
    if (isHair(src) || isLash(src)) continue;
    const bones = src.skeleton.bones, head = new Set(), neck = new Set();
    bones.forEach((b, i) => { if (/(Head|HeadTop_End)$/.test(b.name)) head.add(i); if (/Neck$/.test(b.name)) neck.add(i); });
    const g = src.geometry, pos = g.attributes.position, nor = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const n = pos.count, hw = new Float32Array(n), nw = new Float32Array(n);
    for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) { const b = si.getComponent(v, k), w = sw.getComponent(v, k); if (head.has(b)) hw[v] += w; if (neck.has(b)) nw[v] += w; }
    // la tête : ses dimensions (dans le repère du modèle, en pose T : il regarde vers +Z)
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9, cnt = 0;
    for (let v = 0; v < n; v++) if (hw[v] > 0.8) { const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z); cnt++; }
    if (cnt < 50) continue;
    const H = y1 - y0, Wd = x1 - x0, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, ey = y0 + eyeY * H, d = inflate * H;
    const keepV = (v) => hw[v] + nw[v] > 0.55;
    const inEye = (x, y, z) => Math.abs(y - ey) < eyeH * H / 2 && Math.abs(x - xc) < eyeW * Wd / 2 && z > zc;
    const idx = g.index ? g.index.array : null, T = idx ? idx.length / 3 : n / 3, keep = [];
    for (let t = 0; t < T; t++) {
      const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
      if (!(keepV(a) && keepV(b) && keepV(c))) continue;
      const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
      if (inEye(cx, cy, cz)) continue;                                            // la fente des yeux : on n'y met pas de maille
      keep.push(a, b, c);
    }
    if (keep.length < 30) continue;
    // une nouvelle géométrie : les mêmes sommets, poussés vers l'extérieur, et une texture enroulée autour de la tête
    const ng = new THREE.BufferGeometry(), N = keep.length, P3 = new Float32Array(N * 3), N3 = new Float32Array(N * 3), UV = new Float32Array(N * 2);
    const SI = new Uint16Array(N * 4), SW = new Float32Array(N * 4);
    keep.forEach((v, i) => {
      const nx = nor.getX(v), ny = nor.getY(v), nz = nor.getZ(v);
      P3[i * 3] = pos.getX(v) + nx * d; P3[i * 3 + 1] = pos.getY(v) + ny * d; P3[i * 3 + 2] = pos.getZ(v) + nz * d;
      N3[i * 3] = nx; N3[i * 3 + 1] = ny; N3[i * 3 + 2] = nz;
      UV[i * 2] = Math.atan2(pos.getX(v) - xc, pos.getZ(v) - zc) / (2 * Math.PI) + 0.5; UV[i * 2 + 1] = (pos.getY(v) - y0) / H;
      for (let k = 0; k < 4; k++) { SI[i * 4 + k] = si.getComponent(v, k); SW[i * 4 + k] = sw.getComponent(v, k); }
    });
    ng.setAttribute('position', new THREE.BufferAttribute(P3, 3)); ng.setAttribute('normal', new THREE.BufferAttribute(N3, 3)); ng.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
    ng.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); ng.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    const m = new THREE.SkinnedMesh(ng, mat); m.frustumCulled = false; m.castShadow = true;
    m.position.copy(src.position); m.quaternion.copy(src.quaternion); m.scale.copy(src.scale);
    src.parent.add(m); m.bind(src.skeleton, src.bindMatrix); made.push(m);
  }
  return made;
}

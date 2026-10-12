// =====================================================================
//  Briques réutilisables du studio : eau, immeubles, débris, bateaux
// =====================================================================
import { THREE, M, add, box, prism, bake, fxify, rng, sm, lerp, FX } from './engine.js';

// ---------------------------------------------------------------------
// L'EAU : une grande plaque en facettes, avec vagues, niveau qui monte et "mur d'eau" qui avance
//   uLevel : hauteur de l'eau ; uChop : agitation ; uFront : position (z) du front de la vague
//   uSurge : hauteur de l'eau derrière le front ; uCrest : hauteur de la crête
// ---------------------------------------------------------------------
export function makeWater(scene, { w = 800, d = 800, x = 0, z = 0, seg = 160, segX, segZ, color = '#2c6c8a', foam = '#e8f4f8', opacity = 0.93, dir = 1, mask = '1.0' } = {}) {
  const U = {
    uTime: { value: 0 }, uLevel: { value: 0 }, uChop: { value: 0.25 }, uFront: { value: -1e4 }, uSurge: { value: 0 }, uCrest: { value: 0 },
    uDir: { value: dir }, uFoam: { value: new THREE.Color(foam) }, uStream: { value: 0 },
  };
  const g = new THREE.PlaneGeometry(w, d, segX ?? seg, segZ ?? seg); g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0.05, flatShading: true, transparent: opacity < 1, opacity });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = `uniform float uTime, uLevel, uChop, uFront, uSurge, uCrest, uDir, uStream; varying float vFoam;\n` + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp0 = modelMatrix * vec4(position, 1.0);
      float zz = wp0.z * uDir;   // la vague avance vers +z (uDir = 1) ou -z (uDir = -1)
      float waves = sin(wp0.x * 0.21 + uTime * 1.3) * 0.5 + sin(wp0.z * 0.17 - uTime * 1.1) * 0.5 + sin((wp0.x + wp0.z) * 0.37 + uTime * 2.1) * 0.25;
      waves += sin(wp0.z * 0.9 - uTime * 9.0 * uStream) * 0.35 * uStream;
      float behind = 1.0 - smoothstep(uFront - 70.0, uFront + 4.0, zz);
      float crest = exp(-pow((zz - uFront + 9.0) / 11.0, 2.0));
      float wmask = ${mask};   // là où les vagues ont le droit d'exister (pas sous les quais)
      transformed.y += uLevel + waves * uChop * wmask + uSurge * behind + uCrest * crest;
      vFoam = clamp(crest * step(0.1, uCrest) + max(waves - 0.6, 0.0) * uChop * 0.6 * wmask + uStream * 0.12 * wmask, 0.0, 1.0);`);
    s.fragmentShader = `uniform vec3 uFoam; varying float vFoam;\n` + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb = mix(diffuseColor.rgb, uFoam, vFoam);`);
  };
  mat.customProgramCacheKey = () => 'water';
  const mesh = new THREE.Mesh(g, mat); mesh.position.set(x, 0, z); mesh.receiveShadow = true; scene.add(mesh);
  return { mesh, mat, U };
}

// ---------------------------------------------------------------------
// IMMEUBLES (façade sur le plan local z = 0, vers +z ; largeur le long de x)
//   face : 'px' façade vers +x, 'nx' vers -x, 'pz' vers +z, 'nz' vers -z
// ---------------------------------------------------------------------
export function building(parent, o) {
  const R = o.R || Math.random;
  const { x, z, w, d = 12, h, face = 'pz', wall = '#e6d2b0', shutter = '#6f8f80', roof = '#b4644a', flatRoof = false, floorH = 3.1, shop = null, balcony = true, winLitMat = null, winDarkMat } = o;
  const g = new THREE.Group(); g.position.set(x, o.y ?? 0, z);
  g.rotation.y = { px: Math.PI / 2, nx: -Math.PI / 2, pz: 0, nz: Math.PI }[face];
  parent.add(g);
  box(w, h, d, M(wall), g, 0, h / 2, -d / 2);
  if (flatRoof) { box(w + 0.3, 0.5, d + 0.3, M('#cfc2a8'), g, 0, h + 0.25, -d / 2); }
  else prism(d + 0.6, Math.min(3.2, d * 0.18), w + 0.3, M(roof), g, 0, h, -d / 2);
  box(w + 0.4, 0.35, 0.4, M('#efe6d4'), g, 0, h - 0.2, 0.1);
  const cols = Math.max(2, Math.floor(w / 2.6));
  const dark = winDarkMat || M('#2a3038', { r: 0.35 });
  const startY = shop ? 4.6 : 1.8;
  for (let y = startY; y < h - 1.6; y += floorH) {
    for (let c = 0; c < cols; c++) {
      const cx = -w / 2 + (c + 0.5) * (w / cols);
      const lit = winLitMat && R() < 0.35 ? winLitMat : dark;
      box(1.0, 1.7, 0.12, lit, g, cx, y, 0.03);
      if (R() < 0.75) { box(0.5, 1.75, 0.08, M(shutter), g, cx - 0.78, y, 0.08); box(0.5, 1.75, 0.08, M(shutter), g, cx + 0.78, y, 0.08); }
      if (balcony && y > 5 && R() < 0.45) { box(1.6, 0.12, 0.7, M('#d8cdb8'), g, cx, y - 0.9, 0.35); box(1.6, 0.6, 0.05, M('#2a2a2a'), g, cx, y - 0.55, 0.7); }
    }
  }
  if (shop) {
    box(w * 0.92, 3.2, 0.16, M(shop.color || '#3a3a3a'), g, 0, 1.6, 0.06);
    box(w * 0.7, 2.2, 0.1, dark, g, 0, 1.5, 0.16);
    if (shop.awning) add(new THREE.BoxGeometry(w * 0.9, 0.08, 2.4), M(shop.awning), g, 0, 3.3, 1.15, 0.28, 0, 0);
  }
  return g;
}

// ---------------------------------------------------------------------
// DÉBRIS : des milliers de morceaux (boîtes) animés par une seule InstancedMesh
//   chaque morceau : position de départ, moment de départ, vitesse, rotation
// ---------------------------------------------------------------------
export class Debris {
  constructor(scene, count, { geo = new THREE.BoxGeometry(1, 1, 1), color = '#ffffff', vertexColor = true } = {}) {
    const mat = M('#ffffff', { unique: true }); mat.color.set(color);
    this.mesh = new THREE.InstancedMesh(geo, mat, count); this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.items = []; this.count = count; this.dummy = new THREE.Object3D(); this.c = new THREE.Color();
    scene.add(this.mesh);
  }
  /** ajoute un morceau : p0 (position), s (taille xyz), t0 (départ), v (vitesse m/s), w (rotation), color */
  push(it) { it.i = this.items.length; this.items.push(it); if (it.color) this.mesh.setColorAt(it.i, this.c.set(it.color)); return it; }
  update(t, { gravity = 9.8, timeScale = (t0, t) => t - t0 } = {}) {
    const D = this.dummy;
    for (const it of this.items) {
      const u = t < it.t0 ? 0 : timeScale(it.t0, t);
      D.position.set(it.p0.x + it.v.x * u, it.p0.y + it.v.y * u - 0.5 * gravity * u * u * (it.g ?? 1), it.p0.z + it.v.z * u);
      if (it.floor !== undefined && D.position.y < it.floor) D.position.y = it.floor;
      D.rotation.set((it.r0?.x ?? 0) + it.w.x * u, (it.r0?.y ?? 0) + it.w.y * u, (it.r0?.z ?? 0) + it.w.z * u);
      const vis = it.show ? it.show(t) : 1;
      D.scale.set(it.s.x * vis, it.s.y * vis, it.s.z * vis);
      D.updateMatrix(); this.mesh.setMatrixAt(it.i, D.matrix);
    }
    for (let i = this.items.length; i < this.count; i++) { D.scale.setScalar(0); D.updateMatrix(); this.mesh.setMatrixAt(i, D.matrix); }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------
// VOILIERS : 4 InstancedMesh (coque, cabine, mât, voile) pour N bateaux
// ---------------------------------------------------------------------
export class Fleet {
  constructor(scene, boats) {
    this.boats = boats;
    const n = boats.length;
    const hullG = new THREE.BoxGeometry(2.6, 1.0, 8); { const p = hullG.attributes.position; for (let i = 0; i < p.count; i++) { if (p.getZ(i) < -3) { p.setX(i, p.getX(i) * 0.25); } if (p.getY(i) < 0) p.setX(i, p.getX(i) * 0.7); } hullG.computeVertexNormals(); }
    this.parts = [
      { geo: hullG, mat: M('#f2f2ee', { r: 0.4 }), off: new THREE.Vector3(0, 0.3, 0), s: new THREE.Vector3(1, 1, 1) },
      { geo: new THREE.BoxGeometry(1.6, 0.7, 2.6), mat: M('#e4e2da', { r: 0.4 }), off: new THREE.Vector3(0, 1.1, 0.8), s: new THREE.Vector3(1, 1, 1) },
      { geo: new THREE.CylinderGeometry(0.06, 0.08, 11, 5), mat: M('#c8c8c8', { r: 0.3, m: 0.5 }), off: new THREE.Vector3(0, 6.2, -0.6), s: new THREE.Vector3(1, 1, 1) },
      { geo: new THREE.BoxGeometry(0.35, 0.4, 3.6), mat: M('#2f5a8a'), off: new THREE.Vector3(0, 2.0, 1.0), s: new THREE.Vector3(1, 1, 1) },
    ].map((P) => { const m = new THREE.InstancedMesh(P.geo, P.mat, n); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return { ...P, mesh: m }; });
    this.D = new THREE.Object3D(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3();
  }
  /** pose(b) → { pos: Vector3, rot: Euler } pour chaque bateau */
  update(pose) {
    const D = this.D;
    this.boats.forEach((b, i) => {
      const { pos, rot, scale = 1 } = pose(b, i);
      this.q.setFromEuler(rot);
      for (const P of this.parts) {
        this.v.copy(P.off).applyQuaternion(this.q).add(pos);
        D.position.copy(this.v); D.quaternion.copy(this.q); D.scale.setScalar(scale); D.updateMatrix(); P.mesh.setMatrixAt(i, D.matrix);
      }
    });
    for (const P of this.parts) P.mesh.instanceMatrix.needsUpdate = true;
  }
}

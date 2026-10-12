// =====================================================================
//  LA TOUR EIFFEL (réutilisable) — reprise de l'épisode « Paris » : pieds, arcs, étages, dentelle de fer ajourée.
//  buildEiffel(scene, position) → { tower (le groupe), towerLight (le phare au sommet) }
// =====================================================================
import { THREE, M, box, cyl, canvasTex, dotTex, fxify } from './engine.js';

export function buildEiffel(scene, TOWER) {
    const lattice = canvasTex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineCap = 'square';
      g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
      g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    });
    lattice.wrapS = lattice.wrapT = THREE.RepeatWrapping;
    const ironMat = fxify(new THREE.MeshStandardMaterial({ color: '#6c5646', map: lattice, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, metalness: 0.25 }), 'fx-lattice');
    const solidIron = M('#5e4a3c', { r: 0.7 });
    const tower = new THREE.Group(); tower.position.copy(TOWER); scene.add(tower);
    // un "tronc" entre deux carrés (bas et haut) : 4 faces ajourées, texture répétée tous les ~12 m
    function frustum(cxB, czB, sB, yB, cxT, czT, sT, yT, mat = ironMat) {
      const B = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(cxB + a * sB / 2, yB, czB + b * sB / 2));
      const Tt = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(cxT + a * sT / 2, yT, czT + b * sT / 2));
      const pos = [], uv = [];
      for (let f = 0; f < 4; f++) {
        const a = B[f], b = B[(f + 1) % 4], c = Tt[(f + 1) % 4], d = Tt[f];
        const wB = a.distanceTo(b) / 12, wT = d.distanceTo(c) / 12, hh = Math.max(1, Math.round((yT - yB) / 12));
        for (const [p, u, v] of [[a, 0, 0], [b, wB, 0], [c, wT, hh], [a, 0, 0], [c, wT, hh], [d, 0, hh]]) { pos.push(p.x, p.y, p.z); uv.push(u, v); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.castShadow = true; tower.add(m); return m;
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) frustum(sx * 50, sz * 50, 26, 0, sx * 26, sz * 26, 16, 57.6);
    // les quatre grands arcs décoratifs
    for (let k = 0; k < 4; k++) { const arc = new THREE.Mesh(new THREE.TorusGeometry(34, 1.4, 6, 26, Math.PI), solidIron); arc.position.set(0, 8, 0); arc.rotation.y = k * Math.PI / 2; arc.translateZ(-44); tower.add(arc); }
    box(74, 6, 74, solidIron, tower, 0, 60.5, 0); box(78, 1.5, 78, M('#7a6252'), tower, 0, 64, 0);
    frustum(0, 0, 54, 64, 0, 0, 34, 115.7);
    box(42, 5, 42, solidIron, tower, 0, 118, 0);
    frustum(0, 0, 32, 120, 0, 0, 10, 276);
    box(14, 9, 14, solidIron, tower, 0, 280, 0); cyl(1.2, 2, 40, 6, solidIron, tower, 0, 304, 0);
    const towerLight = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3, 2.6, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    towerLight.position.set(0, 324, 0); towerLight.scale.setScalar(14); tower.add(towerLight);
  return { tower, towerLight };
}

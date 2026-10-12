// =====================================================================
//  ÉPISODE : « Et si Bételgeuse explosait ce soir ? » — un champ de lavande en Provence, une nuit d'hiver
//  Faits : Bételgeuse, géante rouge à ~550–700 années-lumière (Joyce et al. 2020 ; Astronomy.com) ; rayon ~760 fois le Soleil
//  (elle engloutirait Mars) ; explosion d'ici 100 000 ans ; neutrinos détectés quelques heures avant (comme SN 1987A) ;
//  éclat d'une demi-Lune pendant ~3 mois, visible de jour ~1 an, à l'œil nu 2–3 ans (Futura-Sciences, Astronomy.com) ;
//  sans danger (il faudrait qu'elle soit à quelques dizaines d'années-lumière).
// =====================================================================
import { THREE, createStage, makeSky, M, add, box, cyl, noise2, makePerson, HUD, sm, lerp, clamp, rng, dirAzEl, pad, canvasTex, dotTex } from '../../engine.js';
import { makeInsets } from '../../lib-insets.js';
import { INSETS } from './insets.js';

const T = { hookOut: 3.0, neutrinos: 18.4, boom: 23.4, shadows: 28.4, day: 33.4, animals: 38.4, safe: 43.4, middle: 48.4, fade: 53.4, endCard: 58.4, duration: 62.6 };
const SUBS = [
  [3.4, 8.0, 'Bételgeuse, l’épaule d’Orion. Une géante rouge.'],
  [8.4, 13.0, 'À la place du Soleil, elle engloutirait Mars.'],
  [13.4, 18.0, 'Elle est en fin de vie : elle explosera d’ici 100 000 ans.'],
  [18.4, 23.0, 'Quelques heures avant, des neutrinos traversent la Terre.'],
  [23.4, 28.0, 'Puis elle s’allume : aussi brillante qu’une demi-Lune.'],
  [28.4, 33.0, 'La nuit, les arbres ont des ombres.'],
  [33.4, 38.0, 'On la verrait même en plein jour.'],
  [38.4, 43.0, 'Les animaux qui se guident à la Lune seraient perturbés.'],
  [43.4, 48.0, 'Aucun danger : elle est bien trop loin.'],
  [48.4, 53.0, 'Cette lumière serait partie au Moyen Âge.'],
  [53.4, 58.0, 'Puis, en quelques années, Orion perd son épaule.'],
];
// étoiles principales d'Orion (ascension droite en heures, déclinaison en degrés, magnitude, couleur)
const ORION = [
  ['Bételgeuse', 5.9194, 7.407, 0.5, '#ffb06a'], ['Rigel', 5.2422, -8.202, 0.13, '#bcd2ff'], ['Bellatrix', 5.4189, 6.35, 1.64, '#cfdcff'],
  ['Saiph', 5.7958, -9.67, 2.06, '#c8d8ff'], ['Alnitak', 5.6794, -1.943, 1.77, '#d0dcff'], ['Alnilam', 5.6036, -1.202, 1.69, '#d6e0ff'],
  ['Mintaka', 5.5333, -0.299, 2.23, '#d6e0ff'], ['Meissa', 5.5856, 9.934, 3.39, '#dde6ff'], ['Aldébaran', 4.5986, 16.509, 0.86, '#ffc38a'], ['Sirius', 6.7525, -16.716, -1.46, '#e6efff'],
];

export default async function () {
  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)
  const stage = createStage({ fov: 62, far: 20000, bloom: [0.5, 0.45, 0.85], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.4;
  document.documentElement.style.setProperty('--accent', '#ffb06a');
  const R = rng(1987);
  const nz = noise2(9);
  // le ciel du sud : Orion centré au sud, à 36° de hauteur
  const ORI = { ra: 5.6, dec: 0, az: 7, el: 24 };   // az : mesuré depuis l'axe −z de la scène (on regarde vers le sud)
  const starDir = (ra, dec) => { const x = -(ra - ORI.ra) * 15 * Math.cos(dec * Math.PI / 180), y = dec - ORI.dec; return dirAzEl(ORI.az + x / Math.cos((ORI.el + y) * Math.PI / 180), ORI.el + y); };
  const SUN_DAY = dirAzEl(-30, 22);
  const sky = makeSky(scene, { sunDir: SUN_DAY, stars: 1.2, milky: 0.8, nightZen: [0.0018, 0.0026, 0.008], nightHor: [0.010, 0.012, 0.024], dayZen: [0.03, 0.12, 0.40], dayHor: [0.42, 0.52, 0.66], milkyAxis: new THREE.Vector3(0.5, 0.2, 0.84) });
  sky.u.uDay.value = 0;
  scene.fog = new THREE.Fog('#0e1220', 300, 6000);
  const hemi = new THREE.HemisphereLight('#2f3c66', '#0c0b0a', 0.45); scene.add(hemi);
  const moonish = new THREE.DirectionalLight('#9fb3ff', 0.18); moonish.position.set(-300, 400, 200); scene.add(moonish);
  // la lumière de la supernova : elle fait des ombres
  const BET = starDir(5.9194, 7.407);
  const snLight = new THREE.DirectionalLight('#eef4ff', 0); snLight.position.copy(BET).multiplyScalar(300); snLight.castShadow = true;
  snLight.shadow.mapSize.set(2048, 2048); Object.assign(snLight.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 10, far: 700 }); snLight.shadow.bias = -0.0006; snLight.shadow.normalBias = 0.05;
  scene.add(snLight, snLight.target); snLight.target.position.set(0, 0, -20);
  const sunL = new THREE.DirectionalLight('#fff0dc', 0); sunL.position.copy(SUN_DAY).multiplyScalar(300); scene.add(sunL);

  // les étoiles d'Orion (et voisines) : de petits points nets, la taille selon l'éclat
  const starTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const stars = ORION.map(([name, ra, dec, mag, col]) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: new THREE.Color(col).multiplyScalar(1.6), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); sp.userData = { dir: starDir(ra, dec), mag, name }; scene.add(sp); return sp; });
  const bet = stars[0];
  const flareTex = canvasTex(256, 256, (g) => { g.translate(128, 128); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.06, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.2, 'rgba(200,220,255,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-128, -128, 256, 256); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 4); const sg = g.createLinearGradient(-128, 0, 128, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(230,240,255,0.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(-128, -1.5, 256, 3); } });
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(2.2, 2.3, 2.6), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 })); scene.add(flare);

  // -------------------------------------------------------------------
  // LE PAYSAGE : collines, rangs de lavande, un cabanon de pierre (borie), un vieil olivier
  // -------------------------------------------------------------------
  function H(x, z) {
    const d = -z;
    let y = (nz(x * 0.004, z * 0.004, 3) - 0.5) * lerp(1.5, 26, sm(150, 900, d)) + Math.max(0, d) * 0.012;
    y += 140 * sm(1500, 4200, d) * (0.6 + 0.5 * nz(x * 0.0008, 7, 2));   // les collines au loin (le Luberon)
    return y - 0.02 * Math.max(0, 30 - d) * 0;
  }
  {
    const g = new THREE.PlaneGeometry(9000, 9000, 220, 220); g.rotateX(-Math.PI / 2); g.translate(0, 0, -4300);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
    g.computeVertexNormals(); const m = new THREE.Mesh(g, M('#3d4a2e', { flat: false })); m.receiveShadow = true; scene.add(m);
  }
  // rangs de lavande (des centaines de touffes en une seule instance)
  const tufts = [];
  for (let row = -18; row <= 18; row++) for (let k = 0; k < 70; k++) { const x = row * 2.2 + (R() - 0.5) * 0.3, z = 6 - k * 1.25 - Math.abs(row) * 0.2; if (z < -95) continue; tufts.push({ x, z, s: 0.7 + R() * 0.3 }); }
  const lav = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 1).scale(1, 0.62, 1), M('#6f5a9a'), tufts.length);
  const D = new THREE.Object3D(); tufts.forEach((tf, i) => { D.position.set(tf.x, H(tf.x, tf.z) + 0.3, tf.z); D.scale.setScalar(tf.s); D.updateMatrix(); lav.setMatrixAt(i, D.matrix); });
  lav.castShadow = true; lav.receiveShadow = true; scene.add(lav);
  // la borie (cabane de pierres sèches) et l'olivier
  const stone = M('#9c9384');
  { const g = new THREE.Group(); g.position.set(-5.5, H(-5.5, -34), -34); scene.add(g); const b = add(new THREE.SphereGeometry(3.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), stone, g); b.scale.set(1, 1.25, 1); add(new THREE.ConeGeometry(1.4, 1.6, 12), stone, g, 0, 4.6, 0); box(1.0, 1.6, 0.6, M('#1a1714'), g, 0, 0.8, 3.2); g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  const olive = new THREE.Group(); olive.position.set(7, H(7, -14), -14); scene.add(olive);
  { const bark = M('#4d4136'); const tr = add(new THREE.CylinderGeometry(0.35, 0.6, 3.2, 7), bark, olive, 0, 1.6, 0, 0, 0, 0.15); tr.castShadow = true;
    for (const [x, y, z, r] of [[0.4, 3.6, 0, 2.0], [-1.4, 3.2, 0.6, 1.5], [1.6, 3.0, -0.5, 1.4], [0.2, 4.4, -0.8, 1.4]]) { const m = add(new THREE.IcosahedronGeometry(r, 1), M('#556348'), olive, x, y, z); m.scale.set(1.2, 0.7, 1.1); m.castShadow = true; } }
  // deux personnes allongées sur une couverture, qui regardent le ciel
  const blanket = add(new THREE.BoxGeometry(2.4, 0.04, 2.2), M('#8a3b2e'), scene, 0.6, H(0.6, -4.2) + 0.05, -4.2); blanket.receiveShadow = true;
  const A = makePerson(scene, { shirt: '#d8d2c4', pants: '#2f3a4f', hair: '#5a3a22' }), B = makePerson(scene, { shirt: '#3d6e9e', pants: '#4a4a4a', hair: '#2a1d15' });
  [A, B].forEach((P) => P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }));
  // un renard qui traverse le champ, s'arrête, lève la tête
  const fox = (() => { const root = new THREE.Group(); scene.add(root); const fur = M('#b5662e'), w = M('#e8e0d0'), dk = M('#2a1d15');
    const body = new THREE.Group(); body.position.y = 0.36; root.add(body); box(0.22, 0.2, 0.62, fur, body, 0, 0, 0);
    const head = new THREE.Group(); head.position.set(0, 0.12, 0.34); body.add(head); box(0.18, 0.16, 0.18, fur, head, 0, 0, 0.04); box(0.08, 0.07, 0.16, w, head, 0, -0.03, 0.17);
    for (const sx of [-1, 1]) { const e = box(0.05, 0.12, 0.03, dk, head, sx * 0.06, 0.12, 0); e.rotation.z = sx * 0.2; }
    const tail = new THREE.Group(); tail.position.set(0, 0.04, -0.3); body.add(tail); box(0.12, 0.12, 0.5, fur, tail, 0, -0.05, -0.22); box(0.1, 0.1, 0.1, w, tail, 0, -0.05, -0.5);
    const legs = []; for (const [x, z] of [[-0.07, 0.24], [0.07, 0.24], [-0.07, -0.22], [0.07, -0.22]]) { const p = new THREE.Group(); p.position.set(x, -0.08, z); body.add(p); box(0.05, 0.3, 0.05, dk, p, 0, -0.14, 0); legs.push(p); }
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return { root, body, head, tail, legs }; })();
  // des oiseaux migrateurs qui tournent en rond (perturbés)
  const birdMat = new THREE.MeshBasicMaterial({ color: '#0b0b0e', side: THREE.DoubleSide });
  const birds = Array.from({ length: 22 }, () => { const g = new THREE.Group(); scene.add(g); const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.18), birdMat), wr = wl.clone(); wl.position.x = -0.35; wr.position.x = 0.35; wl.rotation.x = wr.rotation.x = Math.PI / 2; g.add(wl, wr); return { g, wl, wr, off: new THREE.Vector3((R() - 0.5) * 14, (R() - 0.5) * 6, (R() - 0.5) * 10), ph: R() * 6 }; });

  // -------------------------------------------------------------------
  // CAMÉRA + IMAGE
  // -------------------------------------------------------------------
  const CAM = new THREE.Vector3(0.5, 0, 6); CAM.y = H(0.5, 6) + 1.7;
  const tmp = new THREE.Vector3();
  const lookAt = ORI.el;
  function update(t) {
    // --- caméra : au ras des lavandes, regard levé vers Orion ; lent zoom sur Bételgeuse au début
    const zk = sm(4, 7, t) * (1 - sm(12, 14, t));
    camera.position.copy(CAM).add(tmp.set(Math.sin(t * 0.17) * 0.1, 0, -0.6 * sm(0, T.duration, t)));
    const base = dirAzEl(4, 17);
    const dir = base.clone().lerp(BET, zk).normalize();
    camera.fov = Math.exp(lerp(Math.log(62), Math.log(16), zk)); camera.updateProjectionMatrix();
    camera.lookAt(tmp.copy(camera.position).add(dir)); camera.updateMatrixWorld();
    sky.follow(camera);
    // --- l'explosion : flash, puis un éclat de demi-Lune (~mag −11) qui dure, puis s'éteint lentement
    const boom = sm(T.boom - 0.2, T.boom + 0.6, t), fadeOut = sm(T.fade, T.fade + 4, t);
    const sn = boom * (1 - 0.92 * fadeOut);
    // le jour : on passe en plein après-midi, puis retour à la nuit
    const day = sm(T.day - 0.6, T.day + 1.2, t) * (1 - sm(T.animals - 0.6, T.animals + 1.0, t));
    sky.u.uDay.value = day; sky.u.uStars.value = 1.2 * (1 - day) * (1 - 0.25 * sn); sky.u.uMilky.value = 0.8 * (1 - day) * (1 - 0.5 * sn);
    scene.fog.color.setRGB(lerp(0.055, 0.6, day), lerp(0.07, 0.68, day), lerp(0.125, 0.8, day));
    hemi.intensity = lerp(0.45 - 0.22 * sn, 1.1, day); hemi.color.setRGB(lerp(0.18, 0.75, day), lerp(0.24, 0.85, day), lerp(0.4, 1.0, day));
    sunL.intensity = 2.6 * day; moonish.intensity = 0.18 * (1 - day);
    snLight.intensity = 1.7 * sn * (1 - day) + 0.05 * sn; snLight.position.copy(BET).multiplyScalar(300);
    renderer.toneMappingExposure = lerp(1.4, 0.95, day);
    stars.forEach((s, i) => {
      s.position.copy(s.userData.dir).multiplyScalar(900).add(camera.position);
      let size = 14 * Math.pow(10, -0.2 * (s.userData.mag - 1)) + 5; let op = 1 - day;
      if (i === 0) { size *= lerp(1, 0.4, fadeOut) * (1 - boom) + 0; op *= (1 - boom); size = Math.max(size, 0.01); }
      s.scale.setScalar(size * (1 + 0.5 * zk)); s.material.opacity = op;
    });
    flare.position.copy(BET).multiplyScalar(890).add(camera.position);
    const twinkle = 1 + 0.04 * Math.sin(t * 23) * (1 - day);
    flare.scale.setScalar((60 + 260 * Math.exp(-Math.max(0, t - T.boom) * 2.2) * boom) * lerp(1, 0.5, fadeOut) * twinkle * (1 - 0.4 * day));
    flare.material.opacity = sn; flare.material.color.setRGB(2.2, 2.3, 2.6).multiplyScalar(lerp(1, 0.6, day));
    sky.u.uTintDir.value.copy(BET); sky.u.uTint.value.setRGB(0.35, 0.4, 0.55); sky.u.uTintAmt.value = 0.06 * sn * (1 - day);
    // --- les deux personnes : allongées, l'une se redresse et montre la supernova
    A.reset(); B.reset();
    const yb = H(0.6, -4.2) + 0.12;
    A.root.position.set(0.0, yb, -3.8); A.root.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2 * (1 - 0.8 * sm(T.boom + 0.3, T.boom + 1.2, t)), Math.PI, 0, 'YXZ'));
    B.root.position.set(1.1, yb, -3.8); B.root.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI, 0, 'YXZ'));
    A.armR.rotation.set(-2.4 * sm(T.boom + 1.0, T.boom + 1.6, t) * (1 - sm(T.day - 1, T.day, t)), 0, -0.2); B.armL.rotation.set(-0.6, 0, 0.9);
    A.head.rotation.x = -0.3; B.head.rotation.x = -0.2;
    // --- le renard : traverse, s'arrête quand la nuit s'éclaire, lève la tête
    {
      const u = t - 26.0, walk = sm(0, 0.3, u) * (1 - sm(2.4, 2.8, u)) + sm(40, 40.5, t) * (1 - sm(43.5, 44, t));
      const x = lerp(14, 4, sm(26, 29, t)) - 6 * sm(40, 44, t), z = -10 + 1.5 * sm(40, 44, t);
      fox.root.position.set(x, H(x, z), z); fox.root.rotation.y = -Math.PI / 2 + 0.6 * sm(40, 41, t);
      fox.head.rotation.x = -0.6 * sm(29, 29.6, t) * (1 - sm(39.5, 40, t)) - 0.4 * sm(41, 41.5, t); fox.tail.rotation.y = Math.sin(t * 3) * 0.2;
      fox.legs.forEach((L, i) => { L.rotation.x = walk * Math.sin(t * 12 + i * 1.6) * 0.5; });
      fox.root.visible = t > 25.8 && t < 47;
    }
    // --- les oiseaux : un vol qui tourne en rond au lieu de filer droit
    birds.forEach((b) => { const u = t - (T.animals - 1.2); b.g.visible = u > 0 && u < 6.5; if (!b.g.visible) return; const a = u * 0.9; b.g.position.set(-8 + Math.cos(a) * 26 + b.off.x, 34 + b.off.y + Math.sin(a * 2) * 3, -70 + Math.sin(a) * 18 + b.off.z); b.g.rotation.y = -a; const f = Math.sin(t * 10 + b.ph) * 0.6; b.wl.rotation.z = f; b.wr.rotation.z = -f; });

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    const date = t < T.day ? '22/01/2027 · 21:' : t < T.animals ? '23/01/2027 · 15:' : t < T.fade ? '23/01/2027 · 22:' : '2029 · ';
    HUD.live(t, 'LUBERON · CAM 01', t < T.fade ? `${date}${pad(30 + Math.floor((t % 60) / 4))}` : 'ACCÉLÉRÉ · 2 ANS PLUS TARD');
    if (t < T.boom) HUD.block(1, { label: 'BÉTELGEUSE', value: 'géante rouge', sub: 'À ~550–700 ANNÉES-LUMIÈRE', color: '#ffb06a' });
    else HUD.block(1, { label: 'SUPERNOVA', value: t < T.fade ? 'demi-Lune' : 'en train de s’éteindre', sub: t < T.fade ? 'ÉCLAT COMPARABLE À UNE DEMI-LUNE' : 'VISIBLE À L’ŒIL NU 2 À 3 ANS', color: '#eef4ff', scale: t < T.fade ? 1 : 0.8 });
    HUD.show2(t > T.neutrinos - 0.3 && t < T.boom + 2);
    if (t > T.neutrinos - 0.3) HUD.block(2, { label: 'DÉTECTEURS DE NEUTRINOS', value: t < T.boom ? 'ALERTE' : 'confirmé', sub: 'QUELQUES HEURES AVANT LA LUMIÈRE', color: '#ffb15e' });
    HUD.hook(t, 'Et si Bételgeuse<br><em>explosait</em> ce soir ?', T.hookOut);
    HUD.subs(t, SUBS);
    insets.draw(t, INSETS);
    HUD.reticle('bet', tmp.copy(BET).multiplyScalar(900).add(camera.position), camera, 'BÉTELGEUSE', sm(3.6, 4.2, t) * (1 - sm(13.6, 14.2, t)), zk > 0.5 ? 160 : 70);
    HUD.reticle('ori', tmp.copy(starDir(5.6, -1.2)).multiplyScalar(900).add(camera.position), camera, 'ORION', sm(14.4, 15, t) * (1 - sm(17.4, 18, t)) + sm(T.fade + 1, T.fade + 1.6, t) * (1 - sm(57.2, 57.8, t)), 260);
    HUD.end(t, T.endCard, { kicker: 'BÉTELGEUSE EST À ENVIRON 550 À 700 ANNÉES-LUMIÈRE', q: 'Et toi, tu aimerais<br>la voir exploser ?', cta: 'RÉPONDS EN COMMENTAIRE' });
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS }) };
}

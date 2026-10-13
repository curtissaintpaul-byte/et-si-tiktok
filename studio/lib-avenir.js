// =====================================================================
//  SÉRIE « 17 OCTOBRE », vidéos 3 et 4 (version 2, demandée par Curtis) :
//  « Et si le 17 octobre changeait tout ? » / « … ne changeait rien ? »
//
//  Un avant / après à la même caméra de surveillance de la Bastille :
//    1) samedi 17 octobre 2026 : au premier rang, une prof, une infirmière, un étudiant, un automobiliste, avec leurs
//       pancartes ; arrêt sur image : ce que chacun réclame (des revendications réelles) ;
//    2) ▶▶ septembre 2027 : le ciel change (soleil si tout est accepté, gris et pluie si rien ne bouge) ;
//       effet multiplication : les 1 588 postes de profs (une foule qui apparaît, ou qui disparaît) ;
//       puis chacun son tour, et un 2e arrêt sur image : ce que ça a changé pour chacun.
//  Comme deux photos prises au même endroit à un an d'écart : on compare.
//
//  buildAvenir(V) : V = { mode: 'tout' | 'rien', T, SUBS, hook, beats, fz1, fz2, effect, end, … }
//  Règles de la DA : personnages réalistes, caméra fixe de surveillance, elle ne bouge QUE pendant l'effet.
// =====================================================================
import { THREE, createStage, makeSky, HUD, sm, lerp, clamp, rng, dirAzEl, pad, fr } from './engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPeople, loadPolice } from './lib-people.js';
import { makeCrowd } from './lib-multiply.js';
import { makeBastille } from './lib-manif.js';
import { makeFreeze, zoomView, RISK } from './lib-freeze.js';

// la tenue de l'infirmière (en plus des 8) : pyjama de bloc bleu ciel
const SCRUB = [0.4, 0.64, 0.76];
const EXTRA = [[SCRUB, [0.8, 0.6, 0.45], SCRUB]];
// les 4 personnages du premier rang : [clé, nom, tenue, x, pancarte]
const CAST = [
  ['prof', 'LA PROF', 3, 6.2, ['PAS UN PROF', 'EN MOINS']],
  ['inf', 'L’INFIRMIÈRE', 8, 7.9, ['DES MOYENS', 'POUR L’HÔPITAL']],
  ['etu', 'L’ÉTUDIANT', 5, 9.6, ['+200 €', 'DE BOURSE']],
  ['auto', 'L’AUTOMOBILISTE', 7, 11.3, ['BLOQUEZ', 'LES PRIX']],
];

function signTex(lines) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d');
  g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, 512, 320); g.strokeStyle = '#c9c2b0'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 312);
  g.fillStyle = '#1c1c22'; g.textAlign = 'center'; g.font = '800 82px Inter';
  lines.forEach((l, i) => { let f = 82; g.font = `800 ${f}px Inter`; while (g.measureText(l).width > 470 && f > 40) { f -= 4; g.font = `800 ${f}px Inter`; } g.fillText(l, 256, 140 + i * 100 - (lines.length - 1) * 30); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function buildAvenir(V) {
  const Q = new URLSearchParams(location.search);
  const T = V.T, TOUT = V.mode === 'tout';
  const stage = createStage({ fov: 66, far: 3000, bloom: [0.16, 0.4, 0.93], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 0.95;
  document.documentElement.style.setProperty('--accent', '#ffcf6b');
  const SUN_DIR = dirAzEl(215, 27);
  const sky = makeSky(scene, { sunDir: SUN_DIR, dayZen: [0.05, 0.12, 0.30], dayHor: [0.48, 0.55, 0.63], stars: 0, sunGlow: 0.35 });
  const FOGC = new THREE.Color('#aab5c0'); scene.fog = new THREE.Fog(FOGC.clone(), 120, 1400);
  const sun = new THREE.DirectionalLight('#ffeedd', 2.6); sun.position.copy(SUN_DIR).multiplyScalar(160).add(new THREE.Vector3(6, 0, 70)); sun.target.position.set(6, 0, 70);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 20, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c6d6ea', '#7d7466', 0.95); scene.add(hemi);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22;

  const PEOPLE = await loadPeople(renderer, undefined, { extra: EXTRA }), COPS = await loadPolice();
  makeBastille(scene, renderer, { PEOPLE });

  // --- les 4 du premier rang, avec leur pancarte
  const CAMP = new THREE.Vector3(9.2, 2.4, 88.5), LOOK = new THREE.Vector3(6.8, 1.6, 40), Z0 = 77;   // caméra de rue plus basse (CAM 04) : le premier rang à 11 m
  const cast = {};
  for (const [key, name, outfit, x, sign] of CAST) {
    const P = PEOPLE.make({ outfit, shadows: true }); P.root.position.set(x, 0, Z0 + (key === 'inf' || key === 'auto' ? 0.2 : 0)); P.root.rotation.y = Math.atan2(CAMP.x - x, CAMP.z - Z0) * 0.8; scene.add(P.root);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.49), new THREE.MeshStandardMaterial({ map: signTex(sign), roughness: 0.8, side: THREE.DoubleSide }));
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 0.9 })); stick.position.set(0, -0.45, -0.01); board.add(stick);
    P.attach(board, 'head', { dy: 0.42, dz: 0.05 });
    cast[key] = { P, name, x, board, ph: x * 1.7 };
  }
  // les voisins (vrais personnages 3D, derrière et sur les côtés)
  const R = rng(V.seed || 17), near = [];
  for (let i = 0; i < 16; i++) {
    const side = i < 6, x = side ? (i % 2 ? 12.5 + Math.floor(i / 2) * 0.6 : 5.0 - Math.floor(i / 2) * 0.6) + R() * 0.15 : 8.75 + (R() - 0.5) * 7.5;
    const z = side ? Z0 - R() * 0.4 : Z0 - 0.9 - R() * 2.6;
    const o = Math.floor(R() * 8), P = PEOPLE.make({ outfit: o, shadows: i < 6 }); P.root.position.set(x, 0, z); P.root.rotation.y = 0.1 + (R() - 0.5) * 0.8; scene.add(P.root);
    near.push({ P, ph: R() * 6, fist: i % 3 === 0, z0: z });
  }
  // --- la foule de la place (la manif en 2026 ; quelques passants en 2027)
  const OPERA = new THREE.Vector2(78, -38), NC = 14000, ATL = PEOPLE.atlas(30, 192, 384);
  const crowd = makeCrowd(scene, PEOPLE, { count: NC, spacing: 0.7, cx: 8.75, cz: Z0 - 2, near: 0, reach: 2.0, atlas: ATL, fog: { color: FOGC, near: 120, far: 1400 },
    appearAt: (i) => 10 * i / NC,
    exclude: (x, z) => Math.hypot(x, z) < 19 || Math.hypot(x, z) > 80 || z > Z0 - 1.4 || Math.hypot(x - OPERA.x, z - OPERA.y) < 45 || (x > 3.4 && x < 14.4 && z > Z0 - 3.8) });
  // --- l'effet multiplication : les 1 588 profs (une foule à part, au milieu de la place, vide en 2027)
  const EF = V.effect, NP = EF.count;
  const profs = makeCrowd(scene, PEOPLE, { count: NP, spacing: 0.62, cx: 1, cz: 46, near: 0, reach: 1.2, atlas: ATL, fog: { color: FOGC, near: 120, far: 1400 }, seed: 31,
    appearAt: (i) => 10 * i / NP, exclude: (x, z) => Math.hypot(x, z) < 21 });
  const Nprof = (ts) => {   // combien de profs sont debout à l'instant ts
    if (ts < EF.c0) return 0;
    const k = clamp((ts - EF.t0) / (EF.t1 - EF.t0)), e = Math.round(Math.exp(Math.log(NP) * k));
    if (TOUT) return ts < EF.t0 ? 0 : Math.min(NP, e);                    // ils arrivent, lentement puis d'un coup
    const inK = sm(EF.c0, EF.t0, ts); if (ts < EF.t0) return Math.round(NP * inK);   // ils sont là…
    return Math.max(0, NP - Math.min(NP, e));                              // … puis disparaissent
  };
  // --- la ligne de police (en 2026 seulement)
  const cops = [];
  // (pas de ligne de police dans ces deux vidéos : on se concentre sur les 4)

  // --- les deux arrêts sur image : le groupe des 4 (zoom ×2,6)
  const at = (key, part) => () => cast[key].P.point(part);
  const mkTags = (F) => F.tags.map((g) => ({ ...g, at: at(g.who, g.part || 'head') }));
  const FZ = makeFreeze([
    { at: V.fz1.at, dur: V.fz1.dur, title: V.fz1.title, zoom: 1.35, tags: mkTags(V.fz1) },
    { at: V.fz2.at, dur: V.fz2.dur, title: V.fz2.title, zoom: 1.35, tags: mkTags(V.fz2) },
  ]);
  T.duration = V.sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(V.SUBS);
  const FF = T.ff, FF0 = FF - 0.6, FF1 = FF + 0.7;   // l'avance rapide vers septembre 2027

  // --- le calque 2D : l'avance rapide, la pluie
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  const hud = document.getElementById('hud'); hud.insertBefore(ov, hud.firstChild); const og = ov.getContext('2d');
  function drawOverlay(t, ts, later, frozen) {
    og.clearRect(0, 0, 1080, 1920);
    const tr = ts >= FF0 && ts < FF1, rain = later && !TOUT;
    ov.style.visibility = tr || rain ? 'visible' : 'hidden';   // (sinon Chrome peut garder la dernière image dessinée)
    if (!tr && !rain) return;
    const fi = Math.floor(t * 30), r = rng(fi * 7 + 11);
    if (rain) {   // la pluie : des traits fins qui tombent en biais (figée pendant l'arrêt sur image)
      const rr = rng(frozen ? 999 : fi * 13 + 5); og.strokeStyle = 'rgba(200,214,232,0.32)'; og.lineWidth = 2; og.beginPath();
      for (let i = 0; i < 260; i++) { const x = rr() * 1180 - 50, y = rr() * 1980 - 60, L = 38 + rr() * 46; og.moveTo(x, y); og.lineTo(x - L * 0.18, y + L); }
      og.stroke();
    }
    if (tr) {
      const k = (ts - FF0) / (FF1 - FF0), a = Math.sin(Math.PI * k);
      for (let i = 0; i < 12; i++) { const y = r() * 1920, h = 6 + r() * 46; og.fillStyle = `rgba(255,255,255,${0.06 + r() * 0.22 * a})`; og.fillRect(0, y, 1080, h); }
      og.globalAlpha = Math.min(1, a * 1.8); og.fillStyle = '#fff'; og.textAlign = 'center';
      og.font = '800 54px Inter'; og.fillText('▶▶ AVANCE RAPIDE', 540, 700);
      og.font = '800 150px Inter'; og.fillText(ts < FF ? 'OCT. 2026' : 'SEPT. 2027', 540, 880);
      og.font = '800 40px Inter'; og.fillText(V.ffLine, 540, 960); og.textAlign = 'left'; og.globalAlpha = 1;
      if (Math.abs(ts - FF) < 0.07) { og.fillStyle = 'rgba(255,255,255,0.5)'; og.fillRect(0, 0, 1080, 1920); }
    }
  }

  // --- la caméra : fixe, sauf pendant l'effet multiplication (elle monte pour montrer les 1 588 profs)
  const W = 720, H = 1280, tmp = new THREE.Vector3(), grp = new THREE.Vector3();
  const EC1 = [new THREE.Vector3(17, 19, 99), new THREE.Vector3(2, 0, 50)], EC2 = [new THREE.Vector3(13, 23, 103), new THREE.Vector3(1, 0, 48)];
  function camAt(ts) {
    if (ts < EF.c0 || ts > EF.c3) return [CAMP, LOOK];
    const lp = (a, b, k) => a.clone().lerp(b, k);
    if (ts < EF.c1) { const k = sm(EF.c0, EF.c1, ts); return [lp(CAMP, EC1[0], k), lp(LOOK, EC1[1], k)]; }
    if (ts < EF.c2) { const k = (ts - EF.c1) / (EF.c2 - EF.c1); return [lp(EC1[0], EC2[0], k), lp(EC1[1], EC2[1], k)]; }
    const k = sm(EF.c2, EF.c3, ts); return [lp(EC2[0], CAMP, k), lp(EC2[1], LOOK, k)];
  }
  const beatAt = (ts) => V.beats.find((b) => ts >= b.t0 && ts < b.t1) || null;

  function update(t) {
    const ts = FZ.sceneT(t), A = FZ.active(t), later = ts >= FF;
    // la météo : le même ciel en 2026 ; en 2027, grand soleil (tout) ou gris et pluie (rien)
    const wk = later ? 1 : 0;
    sun.intensity = later ? (TOUT ? 3.1 : 0.7) : 2.6; hemi.intensity = later ? (TOUT ? 1.05 : 0.75) : 0.95;
    scene.fog.color.copy(FOGC).lerp(new THREE.Color(TOUT ? '#c4cdd4' : '#7d858d'), wk);
    scene.fog.near = later && !TOUT ? 50 : 120; scene.fog.far = later && !TOUT ? 520 : 1400;
    // la foule : la manif en 2026, quelques passants en 2027
    crowd.update(10 * (later ? 0.006 : 0.42), { light: later && !TOUT ? 0.72 : 1, fogNear: scene.fog.near, fogFar: scene.fog.far });
    profs.update(10 * Nprof(ts) / NP, { light: later && !TOUT ? 0.72 : 1, fogNear: scene.fog.near, fogFar: scene.fog.far });
    for (const c of cops) { c.root.visible = !later; c.update(ts); }
    // les 4 : pancartes levées en 2026 ; en 2027, tête haute (tout) ou tête basse (rien)
    for (const k in cast) {
      const c = cast[k]; c.board.visible = !later;
      if (!later) c.P.do({ LeftArm: [['z', 2.25 + 0.06 * Math.sin(ts * 2 + c.ph)], ['x', -0.25]], RightArm: [['z', -2.25 - 0.06 * Math.sin(ts * 2 + c.ph + 1)], ['x', -0.25]], LeftForeArm: [['z', 0.5]], RightForeArm: [['z', -0.5]] });
      else if (TOUT) c.P.stand(0.03 * Math.sin(ts * 1.2 + c.ph));
      else c.P.do({ Head: [['x', 0.32]], Spine1: [['x', 0.08]] });   // tête basse
    }
    near.forEach((n) => {
      n.P.root.visible = !later || n.z0 > Z0 - 1.2;   // en 2027, la plupart sont partis
      if (!later && n.fist) n.P.armsUp(0.75 + 0.25 * Math.sin(ts * 3 + n.ph), ts * 6 + n.ph); else n.P.stand(0.04 * Math.sin(ts * 1.1 + n.ph));
    });
    // la caméra, et le zoom sur le groupe pendant les arrêts
    const [cp, ct] = camAt(ts); camera.position.copy(cp); camera.lookAt(ct); camera.clearViewOffset();
    if (A) {
      const k = sm(0, 0.55, A.u) * (1 - sm(A.f.dur - 0.45, A.f.dur, A.u));
      camera.updateMatrixWorld(); grp.set(0, 0, 0); for (const key in cast) grp.add(cast[key].P.point('chest')); grp.multiplyScalar(0.25).add(new THREE.Vector3(0, 0.15, 0));
      tmp.copy(grp).project(camera); zoomView(camera, (tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, A.f.zoom, k);
    }
    camera.updateProjectionMatrix(); sky.follow(camera);

    // --- textes
    HUD.hook(t, V.hook, T.hookOut);
    const inEffect = ts > EF.c0 + 0.3 && ts < EF.c3 - 0.3;
    const clock = 15 * 3600 + 31 * 60 + ts;
    if (!later) HUD.live(t, 'PARIS · PLACE DE LA BASTILLE · CAM 04', `17/10/2026 · ${pad(Math.floor(clock / 3600))}:${pad(Math.floor(clock / 60) % 60)}:${pad(Math.floor(clock) % 60)}`, 'SIMULATION');
    else HUD.live(t, inEffect ? 'EFFET MULTIPLICATION' : 'PARIS · PLACE DE LA BASTILLE · CAM 04', `SEPT. 2027 · ${V.ffLine}`, 'SIMULATION');
    const tr = ts >= FF0 && ts < FF1, bt = beatAt(ts);
    if (inEffect) {
      const N = Nprof(ts), shown = TOUT ? N : NP - N;
      HUD.block(1, { label: EF.label, value: fr(ts < EF.t0 && !TOUT ? 0 : shown), sub: 'RENTRÉE 2027', color: TOUT ? RISK.ok : RISK.mal }); HUD.show2(false);
    } else if (bt) { HUD.block(1, bt.b1); if (bt.b2) HUD.block(2, bt.b2); HUD.show2(!!bt.b2); }
    else { HUD.block(1, V.now.b1); HUD.block(2, V.now.b2); HUD.show2(true); }
    document.getElementById('tl').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (tr ? 0 : 1) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    camera.updateMatrixWorld();
    // un viseur par personnage ; un seul nom à la fois (celui dont on parle), sinon les noms se chevauchent
    const intro = [[3.4, 'prof'], [4.3, 'inf'], [5.1, 'etu'], [5.9, 'auto'], [6.8, null]];
    let fk = null; if (!later) { for (const [a, k] of intro) if (ts >= a) fk = k; } else fk = bt ? bt.who : null;
    for (const k in cast) {
      const c = cast[k], on = !A && !tr && !inEffect && ts > 3.4 ? 1 : 0, op = fk ? (fk === k ? 1 : 0.3) : 0.55;
      HUD.reticle(k, c.P.point('chest').add(new THREE.Vector3(0, -0.1, 0)), camera, fk === k ? c.name : '', on * op * sm(3.4, 3.8, ts) * (1 - sm(FZ.realT(T.endCard) - 1, FZ.realT(T.endCard), t)), 64);
    }
    HUD.subs(t, SUBS_V);
    drawOverlay(t, ts, later, !!A);
    HUD.end(t, FZ.realT(T.endCard), V.end);
    FZ.draw(t, camera, later ? (TOUT ? 'sepia(0.12) saturate(1.35) brightness(1.1) contrast(1.05)' : 'saturate(0.42) brightness(0.76) contrast(1.08)') : '');
    if (Q.get('dbg') === 'profs') { camera.clearViewOffset(); camera.position.copy(EC2[0]); camera.lookAt(EC2[1]); camera.updateProjectionMatrix(); }
  }
  return { stage, T, update, events: () => ({ T, subs: SUBS_V, freezes: FZ.events(), mode: V.mode,
    ff: FZ.realT(FF), ff0: FZ.realT(FF0), ff1: FZ.realT(FF1),
    effect: { c0: FZ.realT(EF.c0), t0: FZ.realT(EF.t0), t1: FZ.realT(EF.t1), c3: FZ.realT(EF.c3) },
    end: FZ.realT(T.endCard) }) };
}

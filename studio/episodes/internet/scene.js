// =====================================================================
//  « Et si Internet s'arrêtait partout sur Terre ? » — version 2 (format RECONSTITUTION, règle du 15/10 : on raconte une
//  réalité qui PEUT arriver, de plus en plus loin). On suit Léa, 26 ans, Paris, de la première minute à la 6e semaine :
//  ce qui dépend d'Internet, ce qui survit, ce qui disparaît, les tensions entre pays et à l'intérieur, puis la vie qui
//  s'organise autrement. Et le retour du réseau.
//
//  Faits (vérifiés le 15/10/2026, sources dans la légende) :
//   - environ 6 milliards de personnes utilisent Internet en 2025, 2,2 milliards restent hors ligne (UIT, Facts and Figures 2025) ;
//   - un terminal de paiement sans réseau refuse les paiements qui demandent l'accord de la banque en direct (Connectbanque) ;
//   - 19 juillet 2024 : une mise à jour ratée (CrowdStrike) a planté 8,5 millions de PC et fait annuler plus de 5 000 vols
//     dans la journée (Microsoft ; Cirium, cité par l'AFP) ;
//   - le GPS marche sans Internet (signaux des satellites) ; la radio et la télé hertziennes ont leurs propres émetteurs ;
//     les réseaux électriques sont pilotés par des réseaux de télécommunication dédiés (RTE) ;
//   - la Russie a une loi de 2019 pour faire tourner son « Internet souverain » coupé du reste du monde (loi fédérale 90-FZ) ;
//     la Chine filtre déjà ses échanges avec l'étranger (le « grand pare-feu ») ;
//   - en Corée du Nord, seule une infime minorité a accès à Internet ; la population n'a qu'un intranet national (Kwangmyong) ;
//   - Tonga, 15 janvier 2022 : l'éruption du Hunga Tonga coupe le câble sous-marin vers les Fidji ; 5 semaines presque sans
//     Internet, avec quelques liaisons satellite de secours ; reconnecté le 22 février 2022 (Al Jazeera, Euronews).
//   La suite (rayons vides, essence rationnée, accusations, voisins qui se réorganisent) est une HYPOTHÈSE plausible.
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, rng, fr } from '../../engine.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { makeFreeze, zoomView } from '../../lib-freeze.js';
import { makePS2, pixTex } from '../../lib-ps2.js';
import { makeSUV, buildStreet } from '../../lib-rue.js';
import { buildBedroom } from '../../lib-nuit.js';
import { buildHall, makePhoneScreen, makeKit } from '../../lib-gare.js';
import { buildMarket } from '../../lib-magasin.js';
import { makeWorldMap } from '../../lib-carte.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SH = { hall: 0, phone: 3.0, carte: 6.3, cafe: 9.5, gare: 12.7, dab: 16.5, gps: 19.5, radio: 21.4, magasin: 23.3, accuse: 29.3, intranet: 32.3, coree: 35.7,
  essence: 38.5, voisins: 41.7, tonga: 48.1, retour: 51.3, pose: 54.5, end: 57.6 };
const sceneEnd = 60.6, FREEZE_AT = 27.0, REFUSE = SH.cafe + 1.0;
const T = { hookOut: 3.0, endCard: SH.end, duration: sceneEnd };
const SUBS = [
  [3.1, 6.2, 'Lundi, 7 h 31. Léa, 26 ans, Paris. D’un coup, plus rien ne charge. Partout sur Terre.'],
  [6.4, 9.3, 'En quelques secondes, 6 milliards de personnes perdent Internet.'],
  [9.6, 12.5, 'H+1 : au café, sa carte ne passe plus. Le terminal n’arrive plus à joindre sa banque.'],
  [12.8, 14.6, 'H+3 : les gares n’affichent plus rien, les avions restent au sol.'],
  [14.7, 16.4, 'En 2024, un simple bug informatique avait déjà annulé 5 000 vols.'],
  [16.6, 19.4, 'Jour 1 : tout le monde veut du liquide. Les distributeurs sont vides ou en panne.'],
  [19.6, 23.2, 'Ce qui marche encore : le GPS (des satellites), la radio, la télé, l’électricité. Ils ont leurs propres réseaux.'],
  [23.4, 26.9, 'Jour 3 : les supermarchés ne peuvent plus passer commande. Les rayons se vident.'],
  [27.0, 29.2, 'Léa a 20 € en liquide. C’est tout ce qu’elle peut dépenser.'],
  [29.4, 32.2, 'Jour 5 : qui a fait ça ? Chaque pays accuse un autre. Les armées passent en alerte.'],
  [32.4, 35.5, 'La Russie et la Chine rallument un Internet à elles. Mais seulement chez elles.'],
  [35.8, 38.4, 'La Corée du Nord, elle, voit à peine la différence : presque personne n’y avait Internet.'],
  [38.6, 41.5, 'Semaine 2 : des millions de gens ne peuvent plus travailler. L’essence est rationnée.'],
  [41.8, 44.8, 'Semaine 3 : la vie s’organise. Les voisins se parlent, la radio donne les nouvelles.'],
  [44.9, 47.9, 'On se donne rendez-vous à une heure précise. On s’écrit des lettres. Comme avant.'],
  [48.2, 51.1, 'C’est déjà arrivé à un pays entier : les Tonga, 5 semaines sans Internet en 2022.'],
  [51.4, 54.3, 'Semaine 6 : un matin, tout revient. Le téléphone de Léa vibre sans s’arrêter.'],
  [54.6, 57.4, 'Elle le regarde… et le pose. Ses voisins l’attendent en bas.'],
];
const SINCE = { hall: ['0 MIN'], phone: ['0 MIN'], cafe: ['1 H'], gare: ['3 H'], dab: ['1 JOUR'], gps: ['1 JOUR'], radio: ['1 JOUR'], magasin: ['3 JOURS'], essence: ['2 SEMAINES'], voisins: ['3 SEMAINES'] };
const CLOCK0 = { hall: '07:31:02', phone: '07:31:20', cafe: '09:51:15', gare: '11:50:31', dab: '10:12:07', gps: '18:40:22', radio: '19:05:00', magasin: '11:20:40', essence: '07:31:10', voisins: '19:12:44', retour: '08:12:03', pose: '08:12:40' };
const MAPS = { carte: 'extinction', accuse: 'accuse', intranet: 'intranet', coree: 'coree', tonga: 'tonga' };
const TEXT0 = 3.1, HOLD = { off: [0.0, 0.1, 0.045], rot: [0, 0, 0] };

export default async function () {
  const stage = createStage({ fov: 50, far: 2400, bloom: [0.3, 0.5, 0.88], shadows: true });
  const { scene, camera, renderer } = stage;
  renderer.toneMappingExposure = 1.15;
  const PS = makePS2(stage, { width: Number(Q.get('pw') || 360), levels: Number(Q.get('lv') || 14) });
  document.documentElement.style.setProperty('--accent', '#7fd1ff');
  scene.background = new THREE.Color('#a9bccc');
  const fill = new THREE.PointLight('#fff1dc', 0, 5, 1.5); scene.add(fill);
  const MAP = await makeWorldMap('data/world.json');

  // --- les décors : le hall de la gare (z = -600) et son parvis, la rue (à l'origine, de jour), le supermarché (z = 800), la chambre (z = 400)
  const GA = buildHall(scene, { at: v3(0, 0, -600) });
  const H = (x, y, z) => GA.at.clone().add(v3(x, y, z));
  const parvis = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.9 })); parvis.rotation.x = -Math.PI / 2; parvis.position.copy(H(0, 0, 30)); parvis.receiveShadow = true; scene.add(parvis);
  const car = makeSUV('#2f4a6b'); car.root.position.copy(H(-4, 0, 17)); scene.add(car.root);
  const DRIVER = v3(-0.42, 0.25, -0.4);
  const RUE = buildStreet(scene, { night: false });
  const sunR = new THREE.DirectionalLight('#fff0dc', 0); sunR.position.set(30, 40, 25); sunR.target.position.set(0, 0, 0); sunR.castShadow = true; sunR.shadow.mapSize.set(2048, 2048);
  Object.assign(sunR.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 }); scene.add(sunR, sunR.target);
  const skyR = new THREE.HemisphereLight('#bcd2ec', '#6a6250', 0); scene.add(skyR);
  const MK = buildMarket(scene, { at: v3(0, 0, 800) });
  const CH = buildBedroom(scene, { at: v3(0, 0, 400) });
  const R = (x, y, z) => CH.at.clone().add(v3(x, y, z));
  const dayL = new THREE.DirectionalLight('#fff1dc', 0); dayL.position.copy(R(0.3, 4, -8)); dayL.target.position.copy(R(0.8, 0, 0.5)); scene.add(dayL, dayL.target);
  const kitAt = R(-1.6, 0.78, 0.4); makeKit(scene, kitAt).rotation.y = Math.PI / 2;
  const kitL = new THREE.PointLight('#fff0d8', 0, 4, 1.4); kitL.position.copy(kitAt).add(v3(0.8, 1.0, 0.6)); scene.add(kitL);
  // la station-service et la file de voitures (rue, côté nord) ; le panneau écrit à la main
  const ST = new THREE.Group(); ST.position.set(22, 0, -3); scene.add(ST);
  const stM = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.7 }), stR = new THREE.MeshStandardMaterial({ color: '#2f7d4f', roughness: 0.6 });
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; ST.add(b); return b; };
  box(10, 0.5, 7, stM, 0, 5.0, 0); box(10.05, 0.25, 7.05, stR, 0, 4.7, 0); for (const [x, z] of [[-4, -2.6], [4, -2.6], [-4, 2.6], [4, 2.6]]) box(0.35, 4.6, 0.35, stM, x, 2.3, z);
  for (const x of [-2, 2]) { box(0.6, 1.6, 0.9, stM, x, 0.8, 1.2); box(0.62, 0.3, 0.92, stR, x, 1.45, 1.2); }
  const signC = document.createElement('canvas'); signC.width = 128; signC.height = 96; const sg = signC.getContext('2d');
  sg.fillStyle = '#f3eee2'; sg.fillRect(0, 0, 128, 96); sg.fillStyle = '#1a1a1a'; sg.font = 'bold 15px "Comic Sans MS", cursive'; sg.textAlign = 'center'; sg.fillText('ESSENCE', 64, 24); sg.fillText('20 L MAX', 64, 46); sg.fillStyle = '#b3121b'; sg.fillText('ESPÈCES', 64, 70); sg.fillText('UNIQUEMENT', 64, 88);
  const signT = new THREE.CanvasTexture(signC); signT.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.9 })); sign.position.set(-7.5, 1.25, 3.2); sign.rotation.y = -0.5; ST.add(sign);
  const easel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.05), new THREE.MeshStandardMaterial({ color: '#5a4636' })); easel.position.set(-7.5, 0.65, 3.18); ST.add(easel);
  const CARS = ['#8c1d1d', '#d6d6d2', '#2c2f36', '#5b6066', '#1f3d6b', '#a8a49a', '#3f5b3a'].map((c, i) => { const s = makeSUV(c); s.root.position.set(14 - i * 5.6, 0, -1.75); s.root.rotation.y = (i % 2 ? 0.03 : -0.02); scene.add(s.root); return s; });
  for (const s of [car, ...CARS]) s.root.traverse((o) => { if (o.isLight) o.visible = false; });
  // le repas de quartier, dans la rue : une grande table, les chaises, la radio à piles au milieu
  const TG = new THREE.Group(); scene.add(TG);
  const TBL = v3(-6, 0, 1.0), wood = new THREE.MeshStandardMaterial({ color: '#a77d55', roughness: 0.8 }), cloth = new THREE.MeshStandardMaterial({ color: '#e9e2d0', roughness: 0.95 });
  const tb = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 1.0), cloth); tb.position.copy(TBL).add(v3(0, 0.76, 0)); tb.castShadow = tb.receiveShadow = true; TG.add(tb);
  for (const [x, z] of [[-1.95, -0.4], [1.95, -0.4], [-1.95, 0.4], [1.95, 0.4]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.74, 0.06), wood); l.position.copy(TBL).add(v3(x, 0.37, z)); TG.add(l); }
  const SEATS = [[-1.4, -0.72, 0], [0, -0.72, 0], [1.4, -0.72, 0], [-1.4, 0.72, Math.PI], [0, 0.72, Math.PI], [1.4, 0.72, Math.PI]];
  for (const [x, z] of SEATS) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.45), wood); c.position.copy(TBL).add(v3(x, 0.45, z)); TG.add(c); const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.05), wood); b.position.copy(TBL).add(v3(x, 0.7, z + Math.sign(z) * 0.22)); TG.add(b); }
  const radioAt = TBL.clone().add(v3(0.3, 0.785, 0.05)); const kit2 = makeKit(scene, radioAt); kit2.rotation.y = 0.2;
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.03, 12), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.4 })); p.position.copy(TBL).add(v3(SEATS[i][0], 0.795, SEATS[i][1] * 0.55)); TG.add(p); }

  // --- les personnages : Léa (Kate), la serveuse (Jody), et les autres (la foule de la gare, puis les voisins)
  const CROWD_N = ['Brian', 'Joe', 'Josh', 'Adam', 'Leonard', 'James', 'Chad', 'Remy'];
  const CAST = await loadMixamo({ chars: ['Kate', 'Jody', ...CROWD_N], anims: ['idle', 'texting', 'lookaround', 'walk', 'driving', 'sit', 'phone'] });
  const A = CAST.make('Kate', { height: 1.68 }), K = CAST.make('Jody', { height: 1.64 }); scene.add(A.root, K.root);
  const PH = makePhoneScreen(); A.hold(PH.mesh, 'RightHand', HOLD);
  const basket = new THREE.Group(); { const m = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 }); const b0 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.3), m); b0.position.y = -0.2; basket.add(b0); const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 12, Math.PI), m); hnd.position.y = -0.09; basket.add(hnd); }
  A.hold(basket, 'LeftHand', { off: [0, 0.05, 0], rot: [0, 0, 0] });
  const r = rng(77);
  const crowd = CROWD_N.map((n, i) => {
    const P = CAST.make(n, { height: 1.65 + r() * 0.2, shadows: false }); scene.add(P.root);
    const ph = makePhoneScreen(); P.hold(ph.mesh, 'RightHand', HOLD);
    return { P, ph, kind: i % 3, off: r() * 10, spot: [[-1.5, 1.5], [4.2, 2.0], [0.5, -1.5], [5.5, 5.0], [-3.2, 3.8], [3, -3.5], [7, 1], [-4, -1]][i] };
  });
  const LEA_SEAT = SEATS[1];
  function poseAll(ts, S) {
    const inHall = ['hall', 'phone', 'cafe', 'gare', 'dab'].includes(S), table = S === 'voisins', market = S === 'magasin';
    crowd.forEach((c, i) => {
      c.P.root.visible = false; c.ph.mesh.visible = true;
      if (inHall) {
        c.P.root.visible = true;
        if (S === 'dab' && i < 5) {   // la file devant le distributeur
          c.P.root.position.copy(GA.dabPos).add(v3(1.6 + i * 0.75, -1.45, 0.25 + (i % 2) * 0.12)); c.P.root.rotation.y = -Math.PI / 2 + (r() - 0.5) * 0.02; c.P.pose(i % 2 ? 'lookaround' : 'idle', ts + c.off); c.ph.mesh.visible = false; return;
        }
        c.P.root.position.copy(H(c.spot[0], 0, c.spot[1])); c.P.root.rotation.y = c.off;
        if (c.kind === 2 && S === 'gare') c.P.pose('lookaround', ts + c.off, { Neck: [['x', -0.3]] }); else c.P.pose('texting', TEXT0 + 0.1 * Math.sin(ts * 1.1 + c.off));
        c.ph.show('noco', ts + c.off); return;
      }
      if (table && i < 5) {   // les voisins autour de la table
        const sIdx = [0, 2, 3, 4, 5][i], [x, z, ry] = SEATS[sIdx]; c.P.root.visible = true; c.ph.mesh.visible = false;
        c.P.root.position.copy(TBL).add(v3(x, 0, z * 0.82)); c.P.root.rotation.y = ry; c.P.pose([['sit', 2.0, 1, LOWER], ['idle', ts + c.off, 1, UPPER]], { Neck: [['y', Math.sin(ts * 0.7 + c.off) * 0.4]] }); return;
      }
      if (market && (i === 5 || i === 6)) {   // deux autres clients qui se servent
        c.P.root.visible = true; c.ph.mesh.visible = false; c.P.root.position.copy(MK.at).add(v3(i === 5 ? -0.75 : 0.7, 0, i === 5 ? 6.5 : 8.0)); c.P.root.rotation.y = i === 5 ? -Math.PI / 2 : Math.PI / 2;
        c.P.pose('idle', ts + c.off, { RightArm: [['x', -0.9]], RightForeArm: [['x', -0.4]] }); return;
      }
    });
    K.root.visible = ['hall', 'cafe', 'gare'].includes(S); K.root.position.copy(GA.cafe).add(v3(0.4, 0, -0.75)); K.root.rotation.y = 0; K.pose('idle', ts + 3);
    PH.mesh.visible = false; basket.visible = false; A.root.visible = true; A.root.rotation.set(0, 0, 0);
    if (S === 'hall' || S === 'phone') { A.root.position.copy(H(2, 0, 3.2)); A.root.rotation.y = 2.6; A.pose('texting', TEXT0 + 0.1 * Math.sin(ts * 1.3)); PH.mesh.visible = true; PH.show('noco', ts); return; }
    if (S === 'cafe') { A.root.position.copy(GA.cafe).add(v3(0.0, 0, 0.85)); A.root.rotation.y = Math.PI; A.pose('idle', ts, { RightArm: [['x', -0.5]], RightForeArm: [['x', -0.6]] }); return; }
    if (S === 'dab') { A.root.position.copy(GA.dabPos).add(v3(0.9, -1.45, 0.1)); A.root.rotation.y = -Math.PI / 2; A.pose('idle', ts, { Neck: [['x', 0.1]] }); return; }
    if (S === 'gare') { A.root.position.copy(H(0.5, 0, 1.5)); A.root.rotation.y = Math.PI; A.pose('lookaround', 2 + ts * 0.8, { Neck: [['x', -0.35]] }); return; }
    if (S === 'gps') { A.root.position.copy(car.root.localToWorld(DRIVER.clone())); A.root.rotation.y = car.root.rotation.y + Math.PI / 2; A.pose('driving', 1.0); return; }
    if (S === 'magasin') { const u = ts - SH.magasin; A.root.position.copy(MK.at).add(v3(0.15, 0, 4.5 - Math.min(u, 3.0) * 0.9)); A.root.rotation.y = Math.PI; basket.visible = true; PH.mesh.visible = true; PH.show('noco', ts);
      if (u < 3.0) A.pose('walk', u * 0.9); else A.pose('idle', ts, { Neck: [['y', 0.5 * Math.sin(ts * 0.8)], ['x', 0.1]] }); return; }
    if (S === 'voisins') { const [x, z, ry] = LEA_SEAT; A.root.position.copy(TBL).add(v3(x, 0, z * 0.82)); A.root.rotation.y = ry; A.pose([['sit', 2.0, 1, LOWER], ['idle', ts, 1, UPPER]], { Neck: [['y', -0.3 + 0.3 * Math.sin(ts * 0.5)]] }); return; }
    if (S === 'retour') { A.root.position.copy(R(-0.2, 0, -1.3)); A.root.rotation.y = Math.PI - 0.3; PH.mesh.visible = true; PH.show('noco', ts); A.pose('texting', TEXT0 + 0.1 * Math.sin(ts)); return; }
    if (S === 'pose') { A.root.position.copy(R(-0.15, 0, -1.55)); A.root.rotation.y = Math.PI + 0.15; A.pose('idle', ts, { Neck: [['x', -0.05]] }); return; }
    A.root.visible = false;
  }
  // l'insert : son téléphone, en gros plan sur une table grise (loin du reste) ; son téléphone posé sur la table de nuit à la fin
  const INS = v3(0, 0, -1200), PHI = makePhoneScreen(); PHI.mesh.position.copy(INS).add(v3(0, 0.005, 0)); PHI.mesh.rotation.x = -Math.PI / 2; PHI.mesh.rotation.z = 0.12; scene.add(PHI.mesh);
  const tbl = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ color: '#4a4c50', roughness: 0.9 })); tbl.rotation.x = -Math.PI / 2; tbl.position.copy(INS); scene.add(tbl);
  const insL = new THREE.SpotLight('#fff1dd', 0, 4, 0.7, 0.8, 1.2); insL.position.copy(INS).add(v3(-0.4, 1.0, 0.4)); insL.target.position.copy(INS); scene.add(insL, insL.target);
  const PH2 = makePhoneScreen(); car.root.add(PH2.mesh); PH2.mesh.position.set(0.55, 1.13, -0.22); PH2.mesh.rotation.set(0, -Math.PI / 2, 0); PH2.mesh.rotateX(-0.25);
  const nightPh = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.009, 0.155), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })); nightPh.add(b);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshBasicMaterial({ color: '#bfe0ff', toneMapped: false })); sc.rotation.x = -Math.PI / 2; sc.position.y = 0.005; nightPh.add(sc); nightPh.userData.sc = sc; }
  nightPh.position.copy(R(0.52, 0.632, -0.3)); nightPh.rotation.y = 0.5; scene.add(nightPh);
  const nightL = new THREE.PointLight('#bfe0ff', 0, 1.2, 1.5); nightL.position.copy(nightPh.position).add(v3(0, 0.12, 0)); scene.add(nightL);

  // --- le calque 2D (sous les sous-titres) : la carte du monde, et l'écran du téléphone quand tout revient
  const ov = document.createElement('canvas'); ov.width = 1080; ov.height = 1920; ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  const hud = document.getElementById('hud'); hud.insertBefore(ov, hud.firstChild); const og = ov.getContext('2d');
  const rr = (x, y, w, h, rad) => { og.beginPath(); og.moveTo(x + rad, y); og.arcTo(x + w, y, x + w, y + h, rad); og.arcTo(x + w, y + h, x, y + h, rad); og.arcTo(x, y + h, x, y, rad); og.arcTo(x, y, x + w, y, rad); og.closePath(); };
  const APPS = [['Messages', 'Maman : « Tu es où ?? »'], ['Banque', '6 semaines de relevés disponibles'], ['Actu', 'Le réseau mondial rétabli'], ['Mail', '1 482 nouveaux messages'], ['Réseau social', '312 personnes ont réagi'], ['Livraison', 'Votre colis est en retard'], ['Agenda', '41 rappels manqués'], ['Messages', 'Hugo : « ENFIN »'], ['Photos', 'Sauvegarde reprise']];
  function drawNotifs(ts, k) {
    og.fillStyle = `rgba(0,0,0,${0.5 * sm(0, 0.15, k)})`; og.fillRect(0, 0, 1080, 1920);
    og.save(); og.translate(540, 180); og.scale(1.25, 1.25); og.translate(-540, -250);
    const X = 290, Y = 250 + (1 - sm(0, 0.12, k)) * 900, PW = 500, PHh = 760, sh = (Math.floor(ts * 30) % 2) * 3 * (k < 0.95 ? 1 : 0);   // (il vibre)
    og.fillStyle = '#0b0b0d'; rr(X + sh, Y, PW, PHh, 56); og.fill();
    const gr = og.createLinearGradient(0, Y, 0, Y + PHh); gr.addColorStop(0, '#24345e'); gr.addColorStop(1, '#0d1328'); og.fillStyle = gr; rr(X + 14 + sh, Y + 14, PW - 28, PHh - 28, 44); og.fill();
    og.save(); rr(X + 14 + sh, Y + 14, PW - 28, PHh - 28, 44); og.clip();
    og.fillStyle = '#fff'; og.font = '300 96px Inter'; og.textAlign = 'center'; og.fillText('08:12', 540 + sh, Y + 150); og.font = '600 22px Inter'; og.fillText('lundi', 540 + sh, Y + 190);
    const n = Math.floor(9 * sm(0.1, 0.8, k)), total = Math.floor(4812 * sm(0.1, 0.95, k));
    og.font = '800 24px Inter'; og.fillStyle = '#ffcf7a'; og.fillText(`${fr(total)} notifications`, 540 + sh, Y + 240); og.textAlign = 'left';
    for (let i = 0; i < Math.min(n, 5); i++) {
      const [app, msg] = APPS[(n - 1 - i) % APPS.length], y = Y + 270 + i * 92;
      og.fillStyle = 'rgba(255,255,255,0.9)'; rr(X + 36 + sh, y, PW - 72, 80, 20); og.fill();
      og.fillStyle = '#5b6b8c'; og.font = '700 17px Inter'; og.fillText(app.toUpperCase(), X + 56 + sh, y + 30); og.fillStyle = '#111'; og.font = '600 20px Inter'; og.fillText(msg, X + 56 + sh, y + 60);
    }
    og.restore(); og.restore();
  }

  // --- l'arrêt sur image : Léa, au supermarché
  const FZ = makeFreeze([
    { at: FREEZE_AT, dur: 4.4, title: 'ARRÊT SUR IMAGE · LÉA, 3E JOUR', tags: [
      { at: () => A.point('RightHand'), title: 'SON TÉLÉPHONE', lines: ['plus aucune appli,', 'juste une lampe'], risk: 'mal', side: 'left', dy: -300 },
      { at: () => A.point('Spine1'), title: 'SA CARTE', lines: ['plus rien', 'ne passe'], risk: 'grave', side: 'right', dy: -230 },
      { at: () => A.point('LeftHand'), title: 'SON PORTE-MONNAIE', lines: ['20 € en liquide :', 'tout son budget'], risk: 'info', side: 'right', dy: 250 } ] },
  ]);
  T.duration = sceneEnd + FZ.total;
  const SUBS_V = FZ.subs(SUBS);

  // =====================================================================
  //  LES PLANS
  // =====================================================================
  const SHOTS = [
    { id: 'hall', t0: SH.hall, cam: (u) => ({ p: H(lerp(4.6, 4.1, u), 1.7, lerp(9.6, 9.0, u)), l: H(0.2, 2.0, 0.2), fov: 54 }), hall: true },
    { id: 'phone', t0: SH.phone, near: 0.02, cam: (u) => ({ p: INS.clone().add(v3(lerp(0.05, 0.03, u), lerp(0.26, 0.21, u), lerp(0.12, 0.09, u))), l: INS.clone(), fov: 40 }), dof: ['ins', 0.03] },
    { id: 'carte', t0: SH.carte, cam: () => ({ p: INS.clone().add(v3(0, 5, 0)), l: INS, fov: 40 }) },
    { id: 'cafe', t0: SH.cafe, near: 0.02, cam: (u) => { const c = GA.tpePos(); return { p: c.clone().add(v3(lerp(0.05, 0.03, u), lerp(0.3, 0.25, u), lerp(0.2, 0.16, u))), l: c.clone().add(v3(0, -0.01, 0.03)), fov: 38 }; }, dof: ['tpe', 0.02], hall: true },
    { id: 'gare', t0: SH.gare, cam: (u) => ({ p: H(lerp(-2.6, -2.3, u), 1.35, lerp(6.8, 6.1, u)), l: H(-2.0, 4.2, -9), fov: 56 }), hall: true },
    { id: 'dab', t0: SH.dab, cam: (u) => ({ p: GA.dabPos.clone().add(v3(lerp(5.6, 5.0, u), 0.25, lerp(3.4, 3.0, u))), l: GA.dabPos.clone().add(v3(1.6, -0.1, 0)), fov: 50 }), hall: true },
    { id: 'gps', t0: SH.gps, near: 0.02, cam: (u) => ({ p: car.root.localToWorld(v3(lerp(-0.12, -0.05, u), 1.3, -0.12)), l: PH2.mesh.getWorldPosition(v3(0, 0, 0)), fov: lerp(46, 40, u) }), dof: ['phone2', 0.02], fill: 0.3, hall: true },
    { id: 'radio', t0: SH.radio, near: 0.03, cam: (u) => ({ p: kitAt.clone().add(v3(lerp(0.95, 0.8, u), lerp(0.75, 0.62, u), lerp(0.35, 0.3, u))), l: kitAt.clone().add(v3(0, 0.1, 0.05)), fov: 44 }), dof: ['kit', 0.02] },
    { id: 'magasin', t0: SH.magasin, cam: (u) => ({ p: MK.at.clone().add(v3(lerp(0.55, 0.4, u), 1.6, lerp(-0.6, 0.1, u))), l: A.root.position.clone().add(v3(0, 1.15, 0)), fov: 56 }) },
    { id: 'accuse', t0: SH.accuse, cam: () => ({ p: INS.clone().add(v3(0, 5, 0)), l: INS, fov: 40 }) },
    { id: 'intranet', t0: SH.intranet, cam: () => ({ p: INS.clone().add(v3(0, 5, 0)), l: INS, fov: 40 }) },
    { id: 'coree', t0: SH.coree, cam: () => ({ p: INS.clone().add(v3(0, 5, 0)), l: INS, fov: 40 }) },
    { id: 'essence', t0: SH.essence, cam: (u) => ({ p: v3(lerp(-25, -23, u), 1.6, 0.9), l: v3(12, 1.3, -2.2), fov: 42 }), street: true },
    { id: 'voisins', t0: SH.voisins, cam: (u) => { const k = sm(0, 1, u); return { p: TBL.clone().add(v3(lerp(-4.4, -3.2, k), lerp(2.2, 1.7, k), lerp(4.2, 3.4, k))), l: TBL.clone().add(v3(lerp(0.4, 0.2, k), 0.8, 0)), fov: 50 }; }, street: true },
    { id: 'tonga', t0: SH.tonga, cam: () => ({ p: INS.clone().add(v3(0, 5, 0)), l: INS, fov: 40 }) },
    { id: 'retour', t0: SH.retour, cam: () => ({ p: R(1.2, 1.5, 1.4), l: R(-0.2, 1.3, -1.2), fov: 50 }), dof: [0.4, 0.06] },
    { id: 'pose', t0: SH.pose, near: 0.03, cam: (u) => ({ p: R(lerp(0.62, 0.56, u), 0.82, lerp(0.4, 0.32, u)), l: R(-0.05, 0.92, -1.4), fov: 54 }), dof: ['nightph', 0.025] },
    { id: 'end', t0: SH.end, cam: () => ({ p: H(4.6, 1.7, 9.6), l: H(0.2, 2.0, 0.2), fov: 54 }), hall: true },
  ];
  const shotAt = (ts) => { let s = SHOTS[0]; for (const S of SHOTS) if (ts >= S.t0) s = S; return s; };
  const nextT = (S) => { const i = SHOTS.indexOf(S); return i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : sceneEnd; };
  const cafeL = new THREE.PointLight('#ffe6c4', 0, 9, 1.3); cafeL.position.copy(GA.cafe).add(v3(0.3, 2.4, 1.0)); scene.add(cafeL);
  const LIGHTS = [GA.sun, fill, kitL, CH.winL, cafeL, insL, sunR, dayL, nightL, ...MK.lights];
  const hms = (s) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;

  function update(t) {
    const ts0 = FZ.sceneT(t), frozen = !!FZ.active(t);
    let S = shotAt(ts0); if (Q.get('shot')) S = SHOTS.find((x) => x.id === Q.get('shot'));
    const u = Q.get('u') !== null ? Number(Q.get('u')) : clamp((ts0 - S.t0) / (nextT(S) - S.t0));
    const ts = Q.get('shot') ? S.t0 + u * (nextT(S) - S.t0) : ts0;
    poseAll(ts, S.id);
    const mapMode = MAPS[S.id], room = ['radio', 'retour', 'pose'].includes(S.id), market = S.id === 'magasin';
    // les lumières de chaque décor
    insL.intensity = S.id === 'phone' ? 6 : 0; PHI.show('noco', ts); if (room) CH.clock(S.id === 'radio' ? '19:05' : '08:12');
    GA.on(S.hall ? 1 : 0); cafeL.intensity = ['cafe', 'hall', 'end', 'gare'].includes(S.id) ? 22 : 0;
    kitL.intensity = S.id === 'radio' ? 3.5 : 0; CH.amb.intensity = room ? 0.6 : 0; CH.winL.intensity = room ? 25 : 0; CH.view('jour'); dayL.intensity = S.id === 'retour' || S.id === 'pose' ? 2.2 : 0;
    sunR.intensity = S.street ? 2.6 : 0; skyR.intensity = S.street ? 0.9 : 0;
    TG.visible = kit2.visible = S.id === 'voisins'; ST.visible = S.id === 'essence'; CARS.forEach((c) => { c.root.visible = S.id === 'essence'; });
    MK.on(market ? 1 : 0); MK.empty(market ? 0.2 + 0.75 * sm(0.0, 0.5, u) : 0);
    GA.board(ts > SH.gare - 0.5 ? 'panne' : 'ok', ts); GA.tpe(ts > REFUSE ? 'refuse' : 'ok'); PH2.show('map', ts);
    const buzz = S.id === 'pose' ? Math.floor(ts * 6) % 3 === 0 : false; nightPh.visible = S.id === 'pose'; nightPh.position.x = R(0.52, 0, 0).x + (buzz ? 0.004 : 0); nightL.intensity = S.id === 'pose' ? 1.2 + (buzz ? 0.8 : 0) : 0;
    scene.background.set(room ? '#101114' : S.street ? '#b9d0e6' : market ? '#2a2a2a' : '#a9bccc');
    // la caméra
    const C = S.cam(u);
    if (Q.get('cp')) { C.p = v3(...Q.get('cp').split(',').map(Number)); C.l = v3(...Q.get('cl').split(',').map(Number)); if (Q.get('cf')) C.fov = Number(Q.get('cf')); }
    camera.near = S.near ?? 0.1; camera.fov = C.fov; camera.up.copy(C.up ?? v3(0, 1, 0)); camera.position.copy(C.p); camera.lookAt(C.l); camera.clearViewOffset();
    const fz = FZ.active(t);
    if (fz) { camera.updateMatrixWorld(); const tp = A.point('Spine2').project(camera); const k = sm(0, 0.5, fz.u) * (1 - sm(fz.f.dur - 0.45, fz.f.dur, fz.u)); zoomView(camera, (tp.x * 0.5 + 0.5) * 720, (-tp.y * 0.5 + 0.5) * 1280, 1.15, k); }
    camera.updateProjectionMatrix();
    const d = S.dof || [0]; let focus = d[0];
    const target = { ins: () => INS, tpe: () => GA.tpePos(), phone2: () => PH2.mesh.getWorldPosition(v3(0, 0, 0)), kit: () => kitAt.clone().add(v3(0, 0.1, 0)), nightph: () => nightPh.position }[focus]; if (target) focus = camera.position.distanceTo(target());
    PS.dof(frozen ? 0 : focus, d[1] ?? 0.02); PS.look('normal', { sat: 0.8 });
    fill.intensity = S.fill ?? 0; fill.position.copy(camera.position).add(v3(0, 0.3, 0));
    for (const l of LIGHTS) l.visible = l.intensity > 0;

    // --- le calque : la carte du monde, ou le téléphone qui se rallume
    og.clearRect(0, 0, 1080, 1920);
    if (mapMode) MAP.draw(og, mapMode, u, ts);
    if (S.id === 'retour') drawNotifs(ts, u);
    ov.style.visibility = mapMode || S.id === 'retour' ? 'visible' : 'hidden';

    // --- textes
    HUD.hook(t, 'Et si <em>Internet</em> s’arrêtait<br>partout sur Terre ?', T.hookOut);
    const c0 = CLOCK0[S.id]; let clk = '';
    if (c0) { const [hh, mm, ss] = c0.split(':').map(Number); clk = hms(hh * 3600 + mm * 60 + ss + (ts - S.t0)); }
    const lab = { hall: 'PARIS · GARE DE LYON · CAM 01', phone: 'LE TÉLÉPHONE DE LÉA', carte: 'LE RÉSEAU MONDIAL', cafe: 'GARE DE LYON · CAFÉ · CAM 03', gare: 'GARE DE LYON · CAM 01', dab: 'GARE DE LYON · CAM 04',
      gps: 'PARVIS · CAM 05', radio: 'CHEZ LÉA', magasin: 'SUPERMARCHÉ · PARIS 12E · CAM 02', accuse: 'LE MONDE · JOUR 5', intranet: 'LE MONDE · JOUR 5', coree: 'LES DEUX CORÉES · JOUR 5', essence: 'STATION-SERVICE · CAM 01',
      voisins: 'LA RUE DE LÉA', tonga: 'LE PRÉCÉDENT · 2022', retour: 'LE TÉLÉPHONE DE LÉA', pose: 'CHEZ LÉA', end: '' }[S.id];
    HUD.live(t, lab, clk, 'SIMULATION');
    let tl = false;
    const since = SINCE[S.id];
    if (since) { HUD.block(1, { label: 'SANS INTERNET DEPUIS', value: since[0], sub: '', color: '#ff5a4f' }); HUD.show2(false); tl = true; }
    if (S.id === 'carte') { const on = Math.round(6e9 * (1 - sm(0.1, 0.8, u))); HUD.block(1, { label: 'PERSONNES EN LIGNE', value: fr(Math.round(on / 1e6) * 1e6), sub: 'DANS LE MONDE', color: on > 3e9 ? '#7fd1ff' : '#ff5a4f' }); HUD.show2(false); tl = true; }
    if (['accuse', 'intranet', 'coree'].includes(S.id)) { HUD.block(1, { label: 'SANS INTERNET DEPUIS', value: '5 JOURS', sub: 'HYPOTHÈSE', color: '#ff5a4f' }); HUD.show2(false); tl = true; }
    if (S.id === 'tonga') { HUD.block(1, { label: 'LE PRÉCÉDENT', value: 'TONGA', sub: '15 JANV. → 22 FÉVR. 2022', color: '#ffcf7a' }); HUD.show2(false); tl = true; }
    if (S.id === 'retour' || S.id === 'pose') { HUD.block(1, { label: 'INTERNET', value: 'RÉTABLI', sub: 'APRÈS 6 SEMAINES (HYPOTHÈSE)', color: '#9fe0b0' }); HUD.show2(false); tl = true; }
    if (S.id === 'radio') { HUD.block(1, { label: 'CE QUI MARCHE ENCORE', value: 'LA RADIO', sub: 'ET LE GPS, LA TÉLÉ, L’ÉLECTRICITÉ', color: '#9fe0b0' }); HUD.show2(false); tl = true; }
    if (!tl) HUD.show2(false);
    document.getElementById('tl').style.opacity = tl && !frozen ? 1 : 0;
    document.getElementById('tr').style.opacity = sm(T.hookOut - 0.2, T.hookOut + 0.3, t) * (1 - sm(FZ.realT(T.endCard) - 0.3, FZ.realT(T.endCard), t));
    HUD.subs(t, SUBS_V);
    HUD.end(t, FZ.realT(T.endCard), { kicker: 'SOURCES : UIT · CONNECTBANQUE · MICROSOFT · CIRIUM · RTE · AL JAZEERA', q: 'Et toi, tu tiendrais<br>combien de temps ?', cta: 'RÉPONDS EN COMMENTAIRE' });
    FZ.draw(t, camera);
  }
  return { stage, T, update, events: () => ({ T, SH, subs: SUBS_V, freezes: FZ.events(), end: FZ.realT(T.endCard), cuts: SHOTS.map((s) => FZ.realT(s.t0)), refuse: FZ.realT(REFUSE) }) };
}

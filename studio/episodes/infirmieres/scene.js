// =====================================================================
//  « Et si toutes les infirmières de France s'arrêtaient une semaine ? » (30/10/2026)
//  TEST d'une nouvelle recette (choix de Curtis, inspirée des vidéos « meanwhile animations ») :
//   - un seul gros compteur qui montre l'enjeu (petit libellé espacé, gros chiffre en serif, jour et heure dessous) ;
//   - un objet témoin au premier plan : les voyants d'appel au-dessus des portes du couloir (la « sonnette » des
//     patients), qui s'allument un par un et restent allumés… jusqu'au retour des infirmières ;
//   - un début calme (la question sur le poste de soins au petit matin, l'horloge qui tourne : 6:59:52… 7:00) ;
//   - une phrase courte toutes les 4 à 6 s, posée sur l'image (italique serif), des lieux qui changent souvent ;
//   - pas d'encadrés ni de badges ; un étalonnage qui suit l'histoire (matin chaud → bleu froid → nuit rouge → aube) ;
//   - une fin qui fait partager (écran noir, la question, un vrai chiffre, « ENVOIE ÇA À UNE INFIRMIÈRE. ») ;
//   - musique seule (audio.py).
//
//  LES FAITS (vérifiés le 30/10/2026, sources dans la légende et la fiche Notion) :
//   - « près de 600 000 infirmières […] en activité en 2021 » ; 98 600 libérales ; 87 % des salariées et 82 % des libérales
//     sont des femmes. DREES, « Démographie des infirmières et des aides-soignantes », DREES Méthodes n° 15, juin 2024.
//   - En 2023 : 20,8 millions de passages aux urgences ; 105,9 millions de journées d'hospitalisation complète ;
//     353 100 salariés de personnel infirmier à l'hôpital. DREES, « Les établissements de santé en 2023 », édition 2025.
//     Calculs : 20 800 000 / 365 = 56 986 passages par jour (le compteur) ; 105 900 000 / 365 = 290 137 patients
//     hospitalisés un jour moyen (« environ 290 000 »).
//   - Le droit de grève existe, mais « certains agents doivent assurer un service minimum (par exemple, les agents
//     hospitaliers) » (service-public.fr, fiche F499) ; le directeur peut assigner des grévistes pour « l'indispensable
//     continuité du service » (Conseil d'État, 30 novembre 1998, n° 183359). Un arrêt total = une HYPOTHÈSE (dit dans
//     la vidéo, sur l'écran de fin et dans la légende).
//   - Le plan blanc existe (code de la santé publique, art. L3131-7). Le reste (familles qui aident, médecins qui font
//     les soins, attente, opérations repoussées) : des conséquences plausibles, sans chiffre.
// =====================================================================
import { THREE, createStage, HUD, sm, lerp, clamp, pad, fr } from '../../engine.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadMixamo, UPPER, LOWER } from '../../lib-mixamo.js';
import { dressNurse, dressDoctor, dressElder, tint } from '../../lib-people.js';
import { zoomView } from '../../lib-freeze.js';
import { buildPoste, buildCouloir, buildChambre, buildUrgences, buildDomicile, buildMinistere } from '../../lib-hopital.js';

const Q = new URLSearchParams(location.search);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// --- la partition : un plan = un lieu, filmé par sa caméra fixe
const SH = { poste: 0, couloir: 11.5, urgences: 24.5, chambre: 37.0, domicile: 49.5, ehpad: 62.0, alerte: 76.0, ministere: 89.0, retour: 101.0, end: 113.5 };
const ORDER = ['poste', 'couloir', 'urgences', 'chambre', 'domicile', 'ehpad', 'alerte', 'ministere', 'retour', 'end'];
const T = { hookOut: 3.0, endCard: SH.end, duration: 120.0 };
const RELIEF = SH.poste + 8.0;            // 7 h 00 : l'heure de la relève (jour 1)
const BACK = SH.retour + 4.5;             // 7 h 00 : le retour (jour 8)
const PERDAY = 20800000 / 365;            // passages aux urgences par jour (DREES 2025, données 2023) = 56 986
const NURSES = 600000;                    // « près de 600 000 infirmières en activité » (DREES 2024, données 2021)
const SUBS = [
  [3.1, 7.4, 'Jeudi, 6 h 59. Un service d’hôpital, au calme.'],
  [7.7, 11.3, '7 h. L’équipe de nuit s’en va. Personne ne la remplace.'],
  [11.7, 15.9, 'Dans les chambres, les patients sonnent.'],
  [16.1, 20.3, 'À chaque instant, environ 290 000 personnes sont hospitalisées.'],
  [20.5, 24.3, 'Ce matin, aucune infirmière ne passe les voir.'],
  [24.7, 28.9, 'Aux urgences, les médecins accueillent seuls.'],
  [29.1, 33.1, 'Un jour normal, c’est 57 000 passages aux urgences.'],
  [33.3, 36.8, 'Aujourd’hui, la salle d’attente ne se vide plus.'],
  [37.2, 41.4, 'Jour 2. Les familles viennent aider au chevet.'],
  [41.6, 45.6, 'Les médecins font les soins eux-mêmes.'],
  [45.8, 49.3, 'Mais ils ne sont pas assez pour tout faire.'],
  [49.7, 53.9, 'Jour 3. Jeanne, 84 ans, attend son infirmière.'],
  [54.1, 58.1, 'Près de 100 000 infirmières libérales soignent à domicile.'],
  [58.3, 61.8, 'Ce matin, personne ne sonne chez Jeanne.'],
  [67.7, 71.9, 'Jour 5. À l’EHPAD, les aides-soignantes tiennent seules.'],
  [72.1, 75.8, 'Les soins du soir durent toute la nuit.'],
  [76.2, 80.4, 'La nuit, les médecins courent d’un service à l’autre.'],
  [80.6, 84.6, 'Les hôpitaux déclenchent le plan blanc.'],
  [84.8, 88.8, 'Les opérations qui peuvent attendre sont repoussées.'],
  [89.2, 93.4, 'Jour 7. Au ministère, la réunion dure toute la nuit.'],
  [93.6, 97.4, 'Dans la vraie vie, ça n’arrive pas comme ça.'],
  [97.6, 100.8, 'L’hôpital doit toujours assurer un service minimum.'],
  [101.2, 104.4, 'Jour 8, 6 h 59. Toutes les sonnettes sont allumées.'],
  [104.7, 108.6, '7 h. Elles reviennent.'],
  [108.8, 113.2, 'Les sonnettes s’éteignent, une par une.'],
];
const MIDQ = [62.3, 67.4];                // la question à choix (en simple texte, sans boîte)
// l'heure : [jour, heure au début du plan, heure à la fin du plan] (en secondes depuis minuit) ; le jour 0 = jeudi avant 7 h
const H = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;
const CLK = {
  poste: [1, H(6, 59, 52), H(6, 59, 52) + 11.5], couloir: [1, H(7, 14), H(8, 40)], urgences: [1, H(14, 5), H(15, 20)], chambre: [2, H(10, 10), H(11, 5)],
  domicile: [3, H(8, 15), H(9, 20)], ehpad: [5, H(20, 40), H(21, 50)], alerte: [5, H(22, 50), H(23, 58)], ministere: [7, H(21, 30), H(22, 40)],
  retour: [8, H(6, 59, 55.5), H(6, 59, 55.5) + 12.5],
};
// l'étalonnage de chaque plan : gain (r, g, b), lift (ombres), gamma, saturation, vignette
const GRADE = {
  poste: { gain: [1.07, 0.99, 0.88], lift: [0.025, 0.012, 0.0], gamma: 1.0, sat: 1.0, vig: 0.45 },
  couloir: { gain: [1.02, 1.0, 0.95], lift: [0.012, 0.01, 0.0], gamma: 1.0, sat: 0.95, vig: 0.45 },
  urgences: { gain: [0.98, 1.0, 1.04], lift: [0.0, 0.006, 0.014], gamma: 1.0, sat: 0.9, vig: 0.5 },
  chambre: { gain: [0.95, 0.99, 1.06], lift: [0.0, 0.008, 0.02], gamma: 1.0, sat: 0.85, vig: 0.5 },
  domicile: { gain: [1.03, 0.98, 0.9], lift: [0.015, 0.008, 0.0], gamma: 1.0, sat: 0.82, vig: 0.55 },
  ehpad: { gain: [0.78, 0.92, 1.18], lift: [0.0, 0.012, 0.04], gamma: 1.0, sat: 0.72, vig: 0.6 },
  alerte: { gain: [1.18, 0.74, 0.7], lift: [0.03, 0.0, 0.0], gamma: 0.94, sat: 0.95, vig: 0.65 },
  ministere: { gain: [0.86, 0.96, 1.12], lift: [0.0, 0.01, 0.03], gamma: 1.0, sat: 0.85, vig: 0.6 },
  retour: { gain: [1.1, 1.0, 0.84], lift: [0.03, 0.015, 0.0], gamma: 1.0, sat: 1.04, vig: 0.45 },
  end: { gain: [1, 1, 1], lift: [0, 0, 0], gamma: 1, sat: 1, vig: 0.5 },
};

export default async function () {
  const stage = createStage({ fov: 64, far: 160, bloom: [0.32, 0.45, 0.9], shadows: true });
  const { scene, camera, renderer, composer } = stage;
  renderer.toneMappingExposure = 1.0;
  scene.background = new THREE.Color('#000000');
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;

  // --- l'étalonnage (une passe après la mise en couleurs) : gain, lift, gamma, saturation, vignette, léger grain
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uLift: { value: new THREE.Vector3() }, uGamma: { value: 1 }, uSat: { value: 1 }, uVig: { value: 0.5 }, uTime: { value: 0 }, uGrain: { value: 0.018 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uGain, uLift; uniform float uGamma, uSat, uVig, uTime, uGrain; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = c * uGain + uLift * (1.0 - c);
        c = pow(max(c, 0.0), vec3(1.0 / uGamma));
        float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, uSat);
        float d = distance(vUv, vec2(0.5)); c *= 1.0 - uVig * smoothstep(0.32, 0.9, d);
        c += (h(vUv * 731.0 + fract(uTime * 7.13)) - 0.5) * uGrain;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
  });
  composer.insertPass(grade, composer.passes.length - 1);   // juste avant le lissage FXAA

  // --- le style des textes de cette recette (pas d'encadrés : du texte blanc posé sur l'image, ombre douce)
  const css = document.createElement('style');
  css.textContent = `
    #tr { display: none !important; }
    #shade { background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,.30) 100%), linear-gradient(to bottom, rgba(0,0,0,.18) 0px, rgba(0,0,0,0) 260px, rgba(0,0,0,0) 640px, rgba(0,0,0,.30) 820px, rgba(0,0,0,.34) 1250px, rgba(0,0,0,0) 1480px) !important; }
    #tl { left: 74px !important; top: 742px !important; }
    #tl .lbl { font-size: 21px; letter-spacing: 0.26em; opacity: 0.92; text-shadow: 0 1px 10px rgba(0,0,0,.55); }
    #tl .val { font-size: 118px; line-height: 1.0; margin-top: 8px; font-weight: 500; text-shadow: 0 3px 22px rgba(0,0,0,.5); letter-spacing: -0.01em; }
    #tl .sub { font-size: 19px; letter-spacing: 0.24em; opacity: 0.82; margin-top: 10px; text-shadow: 0 1px 10px rgba(0,0,0,.6); }
    #hook { top: 236px !important; left: 90px !important; right: 90px !important; font-family: 'Garamond' !important; font-weight: 400 !important; font-size: 76px !important; line-height: 1.12 !important; letter-spacing: 0 !important;
            text-shadow: 0 2px 22px rgba(0,0,0,.65), 0 0 3px rgba(0,0,0,.5) !important; }
    #subt { top: 1190px !important; left: 84px !important; right: 168px !important; font-size: 62px !important; line-height: 1.14 !important; text-shadow: 0 2px 20px rgba(0,0,0,.8), 0 0 4px rgba(0,0,0,.6) !important; }
    #midq { position: absolute; left: 84px; right: 168px; top: 1170px; text-align: center; color: #fff; opacity: 0; }
    #midq .q { font-family: 'Garamond'; font-style: italic; font-size: 66px; line-height: 1.13; text-shadow: 0 2px 20px rgba(0,0,0,.8), 0 0 4px rgba(0,0,0,.6); }
    #midq .c { font-family: 'Inter'; font-weight: 600; font-size: 21px; letter-spacing: 0.28em; margin-top: 26px; opacity: 0.9; text-shadow: 0 1px 10px rgba(0,0,0,.7); }
    #fin { position: absolute; inset: 0; background: #0b0b0d; opacity: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 130px 120px 110px; color: #f1ede4; text-align: center; }
    #fin .q { font-family: 'Garamond'; font-size: 70px; line-height: 1.14; }
    #fin .f { font-family: 'Inter'; font-weight: 600; font-size: 20px; letter-spacing: 0.2em; line-height: 1.75; margin-top: 54px; opacity: 0; color: #cfc9bd; }
    #fin .s { font-family: 'Inter'; font-weight: 500; font-size: 15px; letter-spacing: 0.16em; line-height: 1.6; margin-top: 18px; opacity: 0; color: #8f8a80; }
    #fin .cta { font-family: 'Inter'; font-weight: 700; font-size: 25px; letter-spacing: 0.3em; margin-top: 64px; opacity: 0; color: #ffffff; }
  `;
  document.head.appendChild(css);
  const hudEl = document.getElementById('hud');
  const midq = document.createElement('div'); midq.id = 'midq';
  midq.innerHTML = '<div class="q">Toi, tu tiendrais combien de jours sans elles&#8239;?</div><div class="c">RÉPONDS EN COMMENTAIRE</div>';
  hudEl.insertBefore(midq, document.getElementById('flash'));
  const fin = document.createElement('div'); fin.id = 'fin';
  fin.innerHTML = `<div class="q">Et si toutes les infirmières<br>de France s’arrêtaient<br>une semaine&#8239;?</div>
    <div class="f">ELLES ET ILS SONT PRÈS DE 600&#8239;000 EN FRANCE.<br>PLUS DE 8 SUR 10 SONT DES FEMMES.</div>
    <div class="s">DREES, 2024 · CHIFFRES 2021<br>EN VRAI, L’HÔPITAL GARDE UN SERVICE MINIMUM : CETTE SEMAINE EST UNE HYPOTHÈSE.</div>
    <div class="cta">ENVOIE ÇA À UNE INFIRMIÈRE.</div>`;
  hudEl.appendChild(fin);
  const finEls = { q: fin.querySelector('.q'), f: fin.querySelector('.f'), s: fin.querySelector('.s'), cta: fin.querySelector('.cta') };
  HUD.show2(false);

  // --- les décors, construits loin les uns des autres (comme des décors de théâtre)
  const PO = buildPoste(scene, { at: v3(0, 0, 0) });
  const CO = buildCouloir(scene, { at: v3(100, 0, 0) });
  const CH = buildChambre(scene, { at: v3(200, 0, 0) });
  const UR = buildUrgences(scene, { at: v3(300, 0, 0) });
  const DO = buildDomicile(scene, { at: v3(400, 0, 0) });
  const EH = buildCouloir(scene, { at: v3(500, 0, 0), style: 'ehpad' });
  const MI = buildMinistere(scene, { at: v3(600, 0, 0) });
  const SETS = { poste: PO, couloir: CO, urgences: UR, chambre: CH, domicile: DO, ehpad: EH, alerte: CO, ministere: MI, retour: CO, end: null };
  const ALL = [PO, CO, CH, UR, DO, EH, MI];

  // --- les personnages (Mixamo, rendu propre : textures lissées, cheveux visibles)
  const CAST = await loadMixamo({ chars: ['Jody', 'Kate', 'Chad', 'Joe', 'Josh', 'Leonard', 'Brian', 'Adam', 'Remy', 'James'],
    anims: ['idle', 'walk', 'walkfemale', 'sit', 'liedown', 'texting', 'lookaround', 'nervous', 'run', 'phone', 'yawn', 'breathless'] });
  const PEOPLE = [];
  const mk = (n, o = {}) => { const fem = n === 'Kate' || n === 'Jody'; const p = CAST.make(n, { clean: true, height: o.h || (fem ? 1.66 : 1.79) }); scene.add(p.root); p.root.visible = false; PEOPLE.push(p); return p; };
  const nurseNight = dressNurse(mk('Jody'), { color: [0.32, 0.55, 0.8] });
  const docA = dressDoctor(mk('Joe'));
  const docB = dressDoctor(mk('Josh'));
  const patient = mk('Leonard'); tint(patient, /Sweater|Collar/, [0.74, 0.84, 0.92]); tint(patient, /Pants/, [0.74, 0.84, 0.92]);
  const daughter = mk('Kate');
  const jeanne = dressElder(mk('Kate', { h: 1.6 }));
  const waiting = ['Brian', 'Adam', 'Remy', 'James', 'Jody', 'Kate'].map((n) => mk(n));
  const atDesk = mk('Leonard');
  const aide = mk('Kate'); tint(aide, /Shirt/, [0.95, 0.86, 0.9]); tint(aide, /Pants/, [0.95, 0.95, 0.96]); tint(aide, /Shoes/, [0.92, 0.92, 0.9]);
  const resident = dressElder(mk('Jody', { h: 1.58 }), { top: [0.36, 0.42, 0.55] });
  const onStretcher = mk('Brian'); tint(onStretcher, /Shirt/, [0.74, 0.84, 0.92]);
  const officials = [mk('Joe'), mk('Josh'), mk('James'), mk('Adam')];
  const returning = [dressNurse(mk('Jody'), { color: [0.32, 0.55, 0.8] }), dressNurse(mk('Kate'), { color: [0.95, 0.95, 0.96], badge: '#c43e5a' }), dressNurse(mk('Chad'))];
  // le chariot de l'aide-soignante (EHPAD) : on le déplace avec elle
  const { makeCart } = await import('../../lib-hopital.js');
  const ehCart = makeCart({ color: '#a0522d', laptop: false }); scene.add(ehCart);
  // le plaid sur les genoux de Jeanne
  const plaidTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#5b6f8f'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 32) { g.fillStyle = 'rgba(210,190,140,0.55)'; g.fillRect(i, 0, 10, 128); g.fillRect(0, i, 128, 10); g.fillStyle = 'rgba(140,40,40,0.4)'; g.fillRect(i + 16, 0, 4, 128); g.fillRect(0, i + 16, 128, 4); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const plaid = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.48), new THREE.MeshStandardMaterial({ map: plaidTex, roughness: 1 })); plaid.castShadow = plaid.receiveShadow = true; scene.add(plaid);

  // --- les voyants d'appel : quand chacun s'allume (couloir du jour 1), quand il s'éteint (jour 8)
  const NC = CO.calls.length;
  const ON1 = []; { let x = SH.couloir + 0.9, dt = 1.35; const order = [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9]; const tmp = new Array(NC); for (const i of order) { if (i < NC) { tmp[i] = x; x += dt; dt = Math.max(0.42, dt * 0.84); } } ON1.push(...tmp); }
  const OFF8 = []; { const order = [...Array(NC).keys()].sort((a, b) => CO.doors[b].z - CO.doors[a].z).reverse(); let x = BACK + 1.6; const tmp = new Array(NC); for (const i of order) { tmp[i] = x; x += 0.62; } OFF8.push(...tmp); }
  const EH_ON = [1, 3, 4, 7];   // à l'EHPAD, quelques voyants allumés

  // =====================================================================
  //  LES PERSONNAGES, PLAN PAR PLAN
  // =====================================================================
  const show = (...ps) => { for (const p of ps) p.root.visible = true; };
  const at = (p, pos, ry) => { p.root.position.copy(pos); p.root.rotation.set(0, ry, 0); };
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  /** marche le long d'un chemin (points), à vitesse v (m/s), à partir de t0 ; renvoie la position, la direction, et si c'est fini */
  function walkPath(pts, v, u) {
    let d = Math.max(0, u * v);
    for (let i = 1; i < pts.length; i++) { const L = pts[i].distanceTo(pts[i - 1]); if (d <= L) return { p: pts[i - 1].clone().lerp(pts[i], d / L), ry: yawTo(pts[i - 1], pts[i]), done: false }; d -= L; }
    const n = pts.length; return { p: pts[n - 1].clone(), ry: yawTo(pts[n - 2], pts[n - 1]), done: true };
  }
  function poseShot(S, ts) {
    for (const p of PEOPLE) p.root.visible = false;
    ehCart.visible = false; plaid.visible = false; CO.stretcher.visible = false; patBlanket.visible = false;
    const u = ts - SH[S];
    if (S === 'poste') {   // l'infirmière de nuit écrit ses transmissions ; à 7 h, elle lève la tête vers l'horloge, puis s'en va
      const P = nurseNight; show(P);
      const spot = PO.P(0.95, 0, -1.22), lookUp = sm(RELIEF - 0.2, RELIEF + 0.4, ts) * (1 - sm(RELIEF + 0.9, RELIEF + 1.2, ts));
      if (ts < RELIEF + 0.9) { at(P, spot, Math.PI - 0.15); P.pose('texting', 2.0 + 0.04 * Math.sin(ts * 1.1), { Neck: [['x', -0.55 * lookUp]], Head: [['x', -0.3 * lookUp], ['y', -0.15 * lookUp]], Spine1: [['x', 0.06 * (1 - lookUp)]] }); }
      else {
        const path = [spot, PO.P(-0.9, 0, 0.15), PO.P(-2.7, 0, 0.62), PO.P(-3.6, 0, 1.4)];
        const w = walkPath(path, 1.45, ts - RELIEF - 0.9);
        const turn = sm(RELIEF + 0.9, RELIEF + 1.4, ts);
        at(P, w.p, lerp(Math.PI - 0.15, w.ry, turn) + (turn < 1 ? 0 : 0)); P.pose('walkfemale', (ts - RELIEF) * 1.05);
        P.root.visible = !w.done;
      }
    } else if (S === 'couloir') {   // un médecin remonte le couloir, regarde les voyants qui s'allument
      const P = docA; show(P);
      const w = walkPath([CO.P(0.1, 0, -17), CO.P(0.05, 0, -4.6)], 1.15, u - 1.0);
      const look = Math.sin(u * 0.9) * 0.5;
      at(P, w.p, w.ry); if (!w.done) P.pose('walk', u * 1.0, { Neck: [['y', look * 0.6]], Head: [['y', look * 0.4]] });
      else P.pose('lookaround', 1.2 + (u - 12.4) * 0.6);
    } else if (S === 'urgences') {   // la salle d'attente pleine ; un médecin à l'accueil, un homme lui parle
      const seatsUsed = [0, 1, 3, 5, 6, 8, 11, 12];
      waiting.forEach((P, i) => { const s = UR.seats[seatsUsed[i]]; show(P); at(P, s.p, s.ry);
        const up = ['phone', 'idle', 'nervous', 'idle', 'texting', 'idle'][i];
        P.pose([['sit', 1.0, 1, LOWER], [up, ts * (0.6 + 0.1 * i) + i * 3, 1, UPPER]], i === 1 || i === 3 ? { Neck: [['x', 0.25]], Head: [['x', 0.15]] } : {}); });
      show(docB, atDesk);
      at(docB, UR.P(0.1, 0, -3.35), 0.08); docB.pose('texting', 2.0 + 0.05 * Math.sin(ts), { Neck: [['x', -0.1 + 0.15 * Math.sin(ts * 0.5)]] });
      at(atDesk, UR.P(0.35, 0, -2.25), Math.PI + 0.15); atDesk.pose('nervous', ts * 0.8);
    } else if (S === 'chambre') {   // le patient au lit, sa fille dans le fauteuil, le médecin règle la perfusion
      show(patient, daughter, docA);
      lieDown(patient, CH.P(-0.25, 0.765, -0.42), ts, 0.35); patBlanket.visible = true;
      at(daughter, CH.seat.p.clone().add(v3(0, 0, 0)), CH.seat.ry); daughter.pose([['sit', 1.0, 1, LOWER], ['idle', ts * 0.7, 1, UPPER]], { Spine: [['x', 0.18]], Neck: [['y', -0.25], ['x', 0.15]] });
      at(docA, CH.P(-1.18, 0, -0.32), 2.75); docA.pose([['idle', ts * 0.7, 1, LOWER], ['texting', 2.0 + 0.05 * Math.sin(ts), 1, UPPER]], { Spine: [['x', 0.1]], Neck: [['x', 0.1 + 0.08 * Math.sin(ts * 0.6)], ['y', 0.25]] });
    } else if (S === 'domicile') {   // Jeanne attend, dans son fauteuil ; elle regarde la porte, puis l'horloge
      show(jeanne);
      at(jeanne, DO.seat.p, DO.seat.ry);
      const door = sm(SH.domicile + 4.0, SH.domicile + 5.0, ts) * (1 - sm(SH.domicile + 7.5, SH.domicile + 8.5, ts));
      const clk = sm(SH.domicile + 9.0, SH.domicile + 10.0, ts);
      jeanne.pose([['sit', 1.0, 1, LOWER], ['idle', ts * 0.4, 1, UPPER]], { Spine: [['x', 0.08]], Neck: [['y', 0.7 * door - 0.5 * clk], ['x', 0.1 - 0.3 * clk]], Head: [['y', 0.3 * door - 0.2 * clk]] });
      plaid.visible = true; const hp = jeanne.point('Hips'), kn = jeanne.point('LeftLeg').lerp(jeanne.point('RightLeg'), 0.5);
      plaid.position.copy(hp).lerp(kn, 0.62).add(v3(0, 0.06, 0)); plaid.rotation.set(0, DO.seat.ry, 0);
    } else if (S === 'ehpad') {   // la nuit, l'aide-soignante pousse son chariot ; une résidente attend dans son fauteuil roulant
      show(aide, resident);
      const w = walkPath([EH.P(-0.05, 0, -10.5), EH.P(-0.15, 0, -3.9)], 0.55, u);
      at(aide, w.p, w.ry); aide.pose(w.done ? 'idle' : 'walkfemale', u * 0.82, { LeftArm: [['x', -0.75], ['z', -0.25]], RightArm: [['x', -0.75], ['z', 0.25]], LeftForeArm: [['x', -0.5]], RightForeArm: [['x', -0.5]], Spine: [['x', 0.12]] });
      ehCart.visible = true; ehCart.position.copy(w.p).add(v3(Math.sin(w.ry) * 0.75, 0, Math.cos(w.ry) * 0.75)); ehCart.rotation.y = w.ry + Math.PI / 2;
      at(resident, EH.P(0.62, 0, -4.4).add(v3(0, 0.02, 0)), -Math.PI / 2 + 0.25); resident.pose([['sit', 1.0, 1, LOWER], ['idle', ts * 0.3, 1, UPPER]], { Neck: [['x', 0.25], ['y', 0.3]] });
    } else if (S === 'alerte') {   // la nuit, toutes les sonnettes allumées ; un patient sur un brancard ; un médecin arrive en courant
      CO.stretcher.visible = true; show(onStretcher, docB);
      lieDown(onStretcher, CO.P(-0.6, 0.9, -2.33), ts, -0.3);
      const w = walkPath([CO.P(0.2, 0, -19), CO.P(0.0, 0, -3.7)], 3.1, u - 1.0);
      if (!w.done) { at(docB, w.p, w.ry); docB.pose('run', u * 1.3); }
      else { const k = sm(SH.alerte + 5.9, SH.alerte + 6.6, ts); at(docB, CO.P(0.0, 0, -3.7), lerp(Math.PI, -Math.PI / 2 - 0.2 + 2 * Math.PI, k) - 2 * Math.PI * (k > 0.5 ? 1 : 0));
        docB.pose('idle', ts * 0.9, { Spine: [['x', 0.45 * k]], Spine1: [['x', 0.2 * k]], Neck: [['x', 0.35 * k]], RightArm: [['x', -0.9 * k]], RightForeArm: [['x', -0.5 * k]] }); }
    } else if (S === 'ministere') {   // la réunion de nuit
      officials.forEach((P) => show(P));
      const [a, b, c, d] = officials;
      at(a, MI.P(-0.35, 0, -2.55), Math.PI + 0.25); a.pose('idle', ts * 0.6, { Neck: [['x', -0.1]] });                          // à la fenêtre, de dos
      at(b, MI.spots[1].p, MI.spots[1].ry); b.pose([['sit', 1.0, 1, LOWER], ['texting', 2.0, 1, UPPER]]);                     // assis, il lit
      at(c, MI.P(0.95, 0, 1.75), Math.PI + 0.6); c.pose('lookaround', 1.0 + ts * 0.35);                                        // debout, au bout de la table
      at(d, MI.spots[7].p, MI.spots[7].ry); d.pose([['sit', 1.0, 1, LOWER], ['phone', ts * 0.6, 1, UPPER]]);                   // assis, au téléphone
    } else if (S === 'retour') {   // 7 h : les infirmières arrivent par le fond du couloir
      returning.forEach((P, i) => {
        const tt = ts - BACK + 0.5 - i * 0.5; if (tt < 0) return;
        const lane = [-0.35, 0.3, -0.05][i], z0 = -23.6;
        const w = walkPath([CO.P(lane, 0, z0), CO.P(lane, 0, z0 + 21)], 1.75, tt);
        show(P); at(P, w.p, w.ry); P.pose(i === 2 ? 'walk' : 'walkfemale', tt * 1.05 + i);
      });
    }
  }
  /** un patient allongé sur le dos (la pose debout, couchée d'un quart de tour : la tête vers -z), qui respire doucement */
  function lieDown(P, feet, ts, turnHead) {
    P.root.position.copy(feet); P.root.rotation.set(-Math.PI / 2, 0, 0);
    P.pose('idle', 1.2 + 0.25 * Math.sin(ts * 0.4), { LeftArm: [['z', -0.08], ['x', 0.22]], RightArm: [['z', 0.08], ['x', 0.22]], LeftForeArm: [['x', 0.35]], RightForeArm: [['x', 0.35]], Neck: [['x', -0.25], ['y', turnHead]], Head: [['x', -0.1]], LeftFoot: [['x', 1.2]], RightFoot: [['x', 1.2]] });
  }
  // la couverture remontée sur le patient (par-dessus ses jambes et son ventre)
  const patBlanket = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.2, 1.18, 3, 0.07), new THREE.MeshStandardMaterial({ color: '#9ec3dc', roughness: 0.95 }));
  patBlanket.position.copy(CH.P(-0.25, 0.795, -0.76)); patBlanket.castShadow = patBlanket.receiveShadow = true; scene.add(patBlanket);
  const fold = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.17, 0.16, 3, 0.06), new THREE.MeshStandardMaterial({ color: '#f4f5f3', roughness: 0.9 }));
  fold.position.set(0, 0.012, -0.59); patBlanket.add(fold);

  // =====================================================================
  //  LE TEMPS, LE COMPTEUR, LES DÉCORS
  // =====================================================================
  const shotAt = (ts) => { let s = ORDER[0]; for (const k of ORDER) if (ts >= SH[k]) s = k; return s; };
  const nextCut = (S) => { const i = ORDER.indexOf(S); return i + 1 < ORDER.length ? SH[ORDER[i + 1]] : T.duration; };
  const clockOf = (S, ts) => { const c = CLK[S]; if (!c) return null; const k = clamp((ts - SH[S]) / (nextCut(S) - SH[S])); return { day: c[0], sec: lerp(c[1], c[2], k) }; };
  const hms = (s) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;
  const hm = (s) => hms(s).slice(0, 5);
  const passages = (day, sec) => Math.max(0, PERDAY * ((day - 1) * 24 + sec / 3600 - 7) / 24);
  const ease = (k) => k * k * (3 - 2 * k);
  const LIGHTS = ALL.flatMap((X) => X.lights);
  const tmpV = v3(0, 0, 0);
  const toPx = (p) => { tmpV.copy(p).project(camera); return [(tmpV.x * 0.5 + 0.5) * 720, (-tmpV.y * 0.5 + 0.5) * 1280]; };
  let lastSet = null;

  function update(t) {
    const ts = t, S = Q.get('shot') || shotAt(ts), X = SETS[S];
    // --- le lieu visible
    for (const Y of ALL) Y.show(Y === X);
    if (X !== lastSet) lastSet = X;
    const c = clockOf(S, ts);
    // --- les réglages du lieu (ambiance, horloge, voyants)
    if (S === 'poste') { PO.mood('aube'); PO.clock(hms(c.sec)); }
    if (S === 'couloir' || S === 'alerte' || S === 'retour') {
      CO.clock(hm(c.sec));
      if (S === 'couloir') { CO.mood('jour'); CO.calls.forEach((L, i) => { const k = sm(ON1[i], ON1[i] + 0.12, ts); L.set(k * (ts < ON1[i] + 0.35 ? (Math.floor((ts - ON1[i]) * 20) % 2 ? 0.4 : 1) : 1)); }); }
      if (S === 'alerte') { CO.mood('alerte'); CO.calls.forEach((L, i) => L.set(0.85 + 0.15 * Math.sin(ts * 5 + i))); }
      if (S === 'retour') { CO.clock(hms(c.sec).slice(0, 5)); CO.setLevel(sm(BACK, BACK + 1.2, ts)); CO.calls.forEach((L, i) => L.set(1 - sm(OFF8[i], OFF8[i] + 0.15, ts))); }
    }
    if (S === 'chambre') { CH.mood('matin'); CH.tick(ts); }
    if (S === 'domicile') { const h = Math.floor(c.sec / 3600), mi = Math.floor(c.sec / 60) % 60; DO.clock(h, mi, 0, ts); }
    if (S === 'ehpad') { EH.mood('nuit'); EH.clock(hm(c.sec)); EH.calls.forEach((L, i) => L.set(EH_ON.includes(i) ? 0.9 : 0)); }
    if (S === 'urgences') UR.mood('jour');
    scene.environmentIntensity = { ehpad: 0.06, alerte: 0.05, ministere: 0.08, retour: lerp(0.08, 0.3, sm(BACK, BACK + 1.2, ts)) }[S] ?? 0.3;
    poseShot(S, ts);
    // --- la caméra fixe du lieu (et ses zooms numériques ponctuels)
    camera.clearViewOffset();
    if (X) { const C = X.cams.main; camera.fov = C.fov; camera.near = 0.08; camera.far = 160; camera.position.copy(C.p); camera.lookAt(C.l); }
    if (Q.get('cp')) { camera.position.set(...Q.get('cp').split(',').map(Number)); camera.lookAt(...Q.get('cl').split(',').map(Number)); }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const u = X ? ts - SH[S] : 0;
    if (S === 'domicile') { const [px, py] = toPx(jeanne.point('Spine2').add(v3(0, 0.15, 0))); zoomView(camera, px, py, 1.55, ease(clamp(u / 12.5)) * 0.85); camera.updateProjectionMatrix(); }
    if (S === 'chambre') { const [px, py] = toPx(CH.lie.clone().add(v3(0, 0.2, 0.2))); zoomView(camera, px, py, 1.25, ease(clamp(u / 12.5))); camera.updateProjectionMatrix(); }
    for (const l of LIGHTS) l.visible = l.intensity > 0;
    // --- l'étalonnage (qui glisse doucement au début de chaque plan)
    const G0 = GRADE[S]; const gu = grade.uniforms;
    gu.uGain.value.set(...G0.gain); gu.uLift.value.set(...G0.lift); gu.uGamma.value = G0.gamma; gu.uSat.value = G0.sat; gu.uVig.value = G0.vig; gu.uTime.value = Math.floor(t * 30) / 30;
    if (S === 'retour') { const k = sm(BACK - 0.5, BACK + 1.5, ts); const N = GRADE.ehpad; gu.uGain.value.set(lerp(0.85, G0.gain[0], k), lerp(0.93, G0.gain[1], k), lerp(1.1, G0.gain[2], k)); gu.uSat.value = lerp(0.78, G0.sat, k); }
    // --- les coupes : un très court passage au noir
    const cutIn = X ? sm(SH[S], SH[S] + 0.14, ts) : 1, cutOut = X ? 1 - sm(nextCut(S) - 0.1, nextCut(S), ts) : 1;
    HUD.fade(S === 'end' ? 0 : 1 - Math.min(cutIn, S === 'retour' ? 1 : cutOut));

    // --- les textes
    HUD.hook(t, 'Et si toutes les infirmières<br>de France s’arrêtaient<br>une semaine ?', T.hookOut);
    // le compteur
    let label = '', value = '', sub = '';
    if (S === 'poste' && ts < RELIEF) { label = 'INFIRMIÈRES ET INFIRMIERS EN FRANCE'; value = `≈ ${fr(NURSES)}`; sub = `JEUDI · ${hms(c.sec)}`; }
    else if (S === 'poste') { label = 'INFIRMIÈRES AU TRAVAIL'; const k = ease(clamp((ts - RELIEF) / 1.6)); value = fr(Math.round(NURSES * (1 - k) / 7) * 7 * (k < 1 ? 1 : 0)); sub = `JOUR 1 · ${hms(c.sec)}`; }
    else if (S === 'retour' && ts >= BACK) { label = 'INFIRMIÈRES AU TRAVAIL'; const k = ease(clamp((ts - BACK - 0.3) / 2.6)); value = k >= 1 ? `≈ ${fr(NURSES)}` : fr(Math.round(NURSES * k / 7) * 7); sub = `JOUR 8 · ${hms(c.sec)}`; }
    else if (c) { label = 'PASSAGES AUX URGENCES SANS INFIRMIÈRE'; value = fr(Math.floor(passages(c.day, c.sec))); sub = `JOUR ${c.day} · ${S === 'retour' ? hms(c.sec) : hm(c.sec)}`; }
    HUD.block(1, { label, value, sub });
    const tlOp = sm(T.hookOut, T.hookOut + 0.4, t) * (S === 'end' ? 0 : 1) * (1 - sm(MIDQ[0] - 0.2, MIDQ[0] + 0.2, t) * (1 - sm(MIDQ[1] - 0.2, MIDQ[1] + 0.2, t)) * 0.0);
    document.getElementById('tl').style.opacity = tlOp;
    HUD.subs(t, SUBS);
    midq.style.opacity = sm(MIDQ[0], MIDQ[0] + 0.3, t) * (1 - sm(MIDQ[1] - 0.35, MIDQ[1], t));
    midq.style.transform = `scale(${0.94 + 0.06 * sm(MIDQ[0], MIDQ[0] + 0.3, t)})`;
    // l'écran de fin
    const e0 = SH.end;
    fin.style.opacity = sm(e0, e0 + 0.5, t); finEls.f.style.opacity = sm(e0 + 1.2, e0 + 1.7, t); finEls.s.style.opacity = sm(e0 + 1.8, e0 + 2.3, t) * 0.95; finEls.cta.style.opacity = sm(e0 + 2.8, e0 + 3.3, t);
  }

  return { stage, T, update, events: () => ({
    T, SH, subs: SUBS, midq: MIDQ, relief: RELIEF, back: BACK, end: SH.end, cuts: ORDER.map((k) => SH[k]),
    callsOn: ON1, callsOff: OFF8,
    nurseLeaves: RELIEF + 0.9, runStart: SH.alerte + 1.0, runStop: SH.alerte + 5.7,
  }) };
}

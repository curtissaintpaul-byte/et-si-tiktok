// =====================================================================
//  ÉPISODE : « Et si le 17 octobre ne changeait rien ? » (série 17 octobre, vidéo 4, version 2 voulue par Curtis)
//  Hypothèse : rien ne bouge et le budget 2027 passe tel quel. Septembre 2027, ciel gris et pluie sur la Bastille.
//  Moteur commun : lib-avenir.js (même scène que « changeait tout », seuls les textes et le ciel changent).
//  Faits (sources dans la légende) :
//   - PLF 2027 (présenté le 1er octobre 2026, pas encore voté) : 1 588 postes d'enseignants supprimés à la rentrée 2027
//     (Café pédagogique) ; gel du point d'indice des fonctionnaires maintenu (Café pédagogique) ;
//     APL pas revalorisées, prime d'activité gelée (MoneyVox / AFP, 2/10/2026) ; vote final en novembre (NosParlementaires).
//   - PLFSS 2027 : ONDAM +2 % pour une tendance à +3,4 %, 5,1 milliards d'économies sur la santé (Caducée, 5/10/2026) ;
//     « il manque 1,3 milliard d'euros aux établissements de santé » (FHF).
//   - gazole 2,363 €/L le 3 octobre 2026 → 50 L = 118 € ; baisse de 12 à 18 cts annoncée le 7 octobre pour 3 mois (Selectra).
// =====================================================================
import { buildAvenir } from '../../lib-avenir.js';
import { RISK } from '../../lib-freeze.js';

const KO = RISK.mal;
const T = { hookOut: 3.0, ff: 13.6, endCard: 48.8 };
const SUBS = [
  [3.2, 6.6, 'Samedi 17 octobre. Au premier rang : une prof, une infirmière, un étudiant, un automobiliste.'],
  [6.8, 9.6, 'Chacun vient avec ce qu’il réclame.'],
  [10.0, 12.8, 'Maintenant, imagine que rien ne bouge, et que le budget passe tel quel.'],
  [14.6, 17.6, 'Septembre 2027. 1 588 postes de profs en moins.'],
  [18.6, 22.4, '1 588 postes, c’est une foule entière de profs en moins dans les écoles.'],
  [26.6, 29.8, 'À l’hôpital, il manque 1,3 milliard selon les fédérations.'],
  [30.0, 33.2, 'Les APL et la prime d’activité ne sont pas augmentées en 2027.'],
  [33.4, 37.2, 'À la pompe, le plein reste autour de 118 €, et la baisse annoncée ne dure que 3 mois.'],
  [38.0, 41.4, 'Et le point d’indice des fonctionnaires, profs et infirmières compris, reste gelé.'],
  [41.6, 45.0, 'Le budget 2027 sera voté à l’Assemblée en novembre.'],
  [45.2, 48.6, 'Et si samedi changeait tout ? C’est l’autre vidéo.'],
];
const B = (label, value, sub) => ({ label, value, sub, color: KO });

export default () => buildAvenir({
  mode: 'rien', T, SUBS, seed: 64, sceneEnd: 52.6, ffLine: 'SI RIEN NE BOUGE',
  hook: 'Et si le 17 octobre ne changeait <em>rien</em> ?',
  now: { b1: { label: 'SAMEDI 17 OCTOBRE 2026', value: 'LA MANIF', sub: 'LE BUDGET 2027 EST EN DÉBAT' }, b2: { label: 'GAZOLE', value: '2,36 €/L', sub: 'PRIX MOYEN AU 3 OCTOBRE 2026', color: '#ff9f0a' } },
  effect: { label: 'PROFS EN MOINS', count: 1588, c0: 17.8, c1: 19.6, t0: 19.6, t1: 23.4, c2: 24.4, c3: 26.4 },
  beats: [
    { t0: 14.0, t1: 17.8, who: 'prof', b1: B('POSTES DE PROFS · RENTRÉE 2027', '−1 588', 'PRÉVU PAR LE BUDGET 2027') },
    { t0: 26.4, t1: 29.9, who: 'inf', b1: B('HÔPITAL · 2027', '−1,3 Md€', 'CE QUI MANQUE SELON LES FÉDÉRATIONS') },
    { t0: 29.9, t1: 33.3, who: 'etu', b1: B('APL · 2027', '+0 €', 'PAS DE REVALORISATION') },
    { t0: 33.3, t1: 52.6, who: 'auto', b1: B('PLEIN DE 50 L DE GAZOLE', '≈ 118 €', 'BAISSE ANNONCÉE : 3 MOIS') },
  ],
  fz1: { at: 9.8, dur: 6.0, title: 'ARRÊT SUR IMAGE · ZOOM ×3 · CE QU’ILS RÉCLAMENT', tags: [
    { who: 'prof', title: 'LA PROF', lines: ['garder les 1 588 postes', 'que le budget supprime'], risk: 'info', side: 'left', dy: -70 },
    { who: 'inf', part: 'chest', title: 'L’INFIRMIÈRE', lines: ['1,3 milliard de plus', 'pour l’hôpital'], risk: 'info', side: 'left', dy: 90 },
    { who: 'etu', title: 'L’ÉTUDIANT', lines: ['+200 € par mois', 'de bourse'], risk: 'info', side: 'right', dy: -70 },
    { who: 'auto', part: 'chest', title: 'L’AUTOMOBILISTE', lines: ['bloquer les prix', 'à la pompe'], risk: 'info', side: 'right', dy: 90 } ] },
  fz2: { at: 37.6, dur: 6.4, title: 'ARRÊT SUR IMAGE · SEPTEMBRE 2027', tags: [
    { who: 'prof', title: 'LA PROF', lines: ['1 588 postes en moins,', 'point d’indice gelé'], risk: 'grave', side: 'left', dy: -70 },
    { who: 'inf', part: 'chest', title: 'L’INFIRMIÈRE', lines: ['budget santé +2 % seulement,', '5,1 milliards d’économies'], risk: 'mal', side: 'left', dy: 90 },
    { who: 'etu', title: 'L’ÉTUDIANT', lines: ['APL pas augmentées', 'en 2027'], risk: 'mal', side: 'right', dy: -70 },
    { who: 'auto', part: 'chest', title: 'L’AUTOMOBILISTE', lines: ['≈ 118 € le plein,', 'baisse de 3 mois seulement'], risk: 'mal', side: 'right', dy: 90 } ] },
  end: { kicker: 'HYPOTHÈSE : LE BUDGET 2027 VOTÉ TEL QUEL · SOURCES : PLF ET PLFSS 2027 · CAFÉ PÉDAGOGIQUE · FHF · AFP · SELECTRA', q: 'Et toi, si rien ne change,<br>tu perds quoi ?', cta: 'RÉPONDS EN COMMENTAIRE' },
});

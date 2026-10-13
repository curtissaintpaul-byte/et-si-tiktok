// =====================================================================
//  ÉPISODE : « Et si le 17 octobre changeait tout ? » (série 17 octobre, vidéo 3, version 2 voulue par Curtis)
//  Hypothèse : le gouvernement accepte les revendications. Septembre 2027, grand soleil sur la Bastille.
//  Moteur commun : lib-avenir.js (même scène que « ne changeait rien », seuls les textes et le ciel changent).
//  Faits (sources dans la légende) :
//   - PLF 2027 (présenté le 1er octobre 2026, pas encore voté) : 1 588 postes d'enseignants supprimés à la rentrée 2027,
//     dont 1 250 dans le public (Café pédagogique, 2/10/2026) ; vote final à l'Assemblée en novembre (NosParlementaires).
//   - hôpital : « il manque 1,3 milliard d'euros aux établissements de santé » en 2027 (FHF, PLFSS 2027) ;
//     ONDAM 2027 +2 % pour une tendance à +3,4 % (Caducée, 5/10/2026).
//   - étudiants : +200 € par mois de bourse, versée sur 12 mois (10 mesures d'urgence, Union étudiante et USL, 5/10/2026).
//   - carburant : « blocage des prix » à la pompe et « contrôle des marges » (appel du 17 octobre, 17octobregiletjaune.net) ;
//     gazole 2,363 €/L le 3 octobre 2026 (prix-carburant.eu).
// =====================================================================
import { buildAvenir } from '../../lib-avenir.js';
import { RISK } from '../../lib-freeze.js';

const OK = RISK.ok;
const T = { hookOut: 3.0, ff: 13.6, endCard: 48.8 };
const SUBS = [
  [3.2, 6.6, 'Samedi 17 octobre. Au premier rang : une prof, une infirmière, un étudiant, un automobiliste.'],
  [6.8, 9.6, 'Chacun vient avec ce qu’il réclame.'],
  [10.0, 12.8, 'Maintenant, imagine que le gouvernement dise oui à tout.'],
  [14.6, 17.6, 'Septembre 2027. Les 1 588 postes de profs que le budget supprimait sont gardés.'],
  [18.6, 22.4, '1 588 profs, c’est ça. Tous gardés à la rentrée.'],
  [26.6, 29.8, 'À l’hôpital, le 1,3 milliard qui manquait selon les fédérations arrive.'],
  [30.0, 33.2, 'L’étudiant boursier touche 200 € de plus par mois, 12 mois sur 12.'],
  [33.4, 37.2, 'À la pompe, les prix sont bloqués et les marges des pétroliers contrôlées.'],
  [38.0, 41.4, 'Tout ça, c’est ce que réclament ceux qui défilent samedi.'],
  [41.6, 45.0, 'Le budget 2027 sera voté à l’Assemblée en novembre.'],
  [45.2, 48.6, 'Et si samedi ne changeait rien ? C’est l’autre vidéo.'],
];
const B = (label, value, sub) => ({ label, value, sub, color: OK });

export default () => buildAvenir({
  mode: 'tout', T, SUBS, seed: 36, sceneEnd: 52.6, ffLine: 'SI TOUT EST ACCEPTÉ',
  hook: 'Et si le 17 octobre changeait <em>tout</em> ?',
  now: { b1: { label: 'SAMEDI 17 OCTOBRE 2026', value: 'LA MANIF', sub: 'LE BUDGET 2027 EST EN DÉBAT' }, b2: { label: 'GAZOLE', value: '2,36 €/L', sub: 'PRIX MOYEN AU 3 OCTOBRE 2026', color: '#ff9f0a' } },
  effect: { label: 'PROFS GARDÉS', count: 1588, c0: 17.8, c1: 19.6, t0: 18.4, t1: 22.6, c2: 24.4, c3: 26.4 },
  beats: [
    { t0: 14.0, t1: 17.8, who: 'prof', b1: B('POSTES DE PROFS · RENTRÉE 2027', '0 supprimé', 'AU LIEU DE 1 588') },
    { t0: 26.4, t1: 29.9, who: 'inf', b1: B('HÔPITAL · 2027', '+1,3 Md€', 'CE QUI MANQUE SELON LES FÉDÉRATIONS') },
    { t0: 29.9, t1: 33.3, who: 'etu', b1: B('BOURSE ÉTUDIANTE', '+200 €/mois', '12 MOIS SUR 12') },
    { t0: 33.3, t1: 52.6, who: 'auto', b1: B('PRIX À LA POMPE', 'BLOQUÉS', 'MARGES CONTRÔLÉES') },
  ],
  fz1: { at: 9.8, dur: 6.0, title: 'ARRÊT SUR IMAGE · ZOOM ×3 · CE QU’ILS RÉCLAMENT', tags: [
    { who: 'prof', title: 'LA PROF', lines: ['garder les 1 588 postes', 'que le budget supprime'], risk: 'info', side: 'left', dy: -70 },
    { who: 'inf', part: 'chest', title: 'L’INFIRMIÈRE', lines: ['1,3 milliard de plus', 'pour l’hôpital'], risk: 'info', side: 'left', dy: 90 },
    { who: 'etu', title: 'L’ÉTUDIANT', lines: ['+200 € par mois', 'de bourse'], risk: 'info', side: 'right', dy: -70 },
    { who: 'auto', part: 'chest', title: 'L’AUTOMOBILISTE', lines: ['bloquer les prix', 'à la pompe'], risk: 'info', side: 'right', dy: 90 } ] },
  fz2: { at: 37.6, dur: 6.4, title: 'ARRÊT SUR IMAGE · SEPTEMBRE 2027', tags: [
    { who: 'prof', title: 'LA PROF', lines: ['1 588 postes gardés', 'à la rentrée'], risk: 'ok', side: 'left', dy: -70 },
    { who: 'inf', part: 'chest', title: 'L’INFIRMIÈRE', lines: ['+1,3 milliard', 'pour l’hôpital'], risk: 'ok', side: 'left', dy: 90 },
    { who: 'etu', title: 'L’ÉTUDIANT', lines: ['+200 € par mois,', '12 mois sur 12'], risk: 'ok', side: 'right', dy: -70 },
    { who: 'auto', part: 'chest', title: 'L’AUTOMOBILISTE', lines: ['prix bloqués,', 'marges contrôlées'], risk: 'ok', side: 'right', dy: 90 } ] },
  end: { kicker: 'HYPOTHÈSE : LES REVENDICATIONS ACCEPTÉES · SOURCES : PLF ET PLFSS 2027 · FHF · UNION ÉTUDIANTE · APPEL DU 17 OCTOBRE · PRIX-CARBURANTS.GOUV.FR', q: 'Et toi, samedi,<br>tu réclames quoi ?', cta: 'RÉPONDS EN COMMENTAIRE' },
});

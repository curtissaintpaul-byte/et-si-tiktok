// =====================================================================
//  ÉPISODE : « Et si le 17 octobre changeait tout ? » (série 17 octobre, vidéo 3) — neutre : l'histoire + l'impact pour toi
//  La caméra de la Bastille rembobine : 1936, 1968, 2006, 2018 (quatre fois où la rue a obtenu quelque chose).
//  Effet multiplication en 2018 : les 10 milliards d'euros des mesures, en cubes d'un million d'euros.
//  Faits (sources dans la légende) :
//   - 1936 : plus d'un million de grévistes ; accords de Matignon le 7 juin ; congés payés (2 semaines) votés le 20 juin,
//     semaine de 40 h le 21 juin (Wikipédia, accords de Matignon).
//   - 1968 : accords de Grenelle, 27 mai : SMIG +35 % (Wikipédia, accords de Grenelle).
//   - 2006 : CPE (contrat première embauche, moins de 26 ans) ; 4 avril : plus d'1 million selon la police, 3,1 millions
//     selon les syndicats ; loi déjà promulguée ; abandon annoncé le 10 avril (Techno-Science, chronologie).
//   - 2018 : hausse de la taxe carbone prévue au 1er janvier 2019 : +6,5 cts/L sur le gazole (La finance pour tous) ;
//     abandonnée ; 10 décembre : +100 € net/mois pour un salarié au SMIC (surtout la prime d'activité) ; coût 8 à 10 milliards
//     selon le gouvernement, jusqu'à 11 selon d'autres estimations (Banque des territoires) → « environ 10 milliards ».
//   - 7 octobre 2026 : le gouvernement annonce une baisse du gazole de 12 à 18 cts/L pendant 3 mois, attendue en novembre
//     (stocks stratégiques mis sur le marché ; Selectra, 8 octobre 2026).
//   - 10 milliards en billets de 100 € : 100 millions de billets de 14,7 × 7,7 cm × 0,108 mm = 122 m³ = un cube de 4,96 m.
//   - gazole : 2,363 €/L le 3 octobre 2026 (prix-carburant.eu, données prix-carburants.gouv.fr) → 50 L = 118 € ;
//     taxes : accise 60,75 cts/L + TVA 20 % → ~50 € sur 50 L (Selectra, 41,9 % le 22 septembre 2026).
//   - congés payés : 2 semaines en 1936, 5 depuis 1982 (Welcome to the Jungle, histoire des congés payés).
// =====================================================================
import { buildHistoire } from '../../lib-histoire.js';

const OK = '#ffcf6b';   // (couleur neutre, la même que dans « ne changeait rien »)
const T = { hookOut: 3.0, endCard: 60.8 };
const SUBS = [
  [3.2, 5.3, 'La rue a déjà tout changé ? On rembobine.'],
  [5.6, 8.9, '1936. Plus d’un million de grévistes occupent les usines.'],
  [9.1, 12.6, 'En juin : 2 semaines de congés payés, et la semaine de 40 heures.'],
  [13.0, 16.3, 'Mai 1968. La France est à l’arrêt pendant des semaines.'],
  [16.5, 20.0, 'Accords de Grenelle : le salaire minimum augmente de 35 %.'],
  [20.4, 24.0, '2006. Les jeunes défilent contre le CPE, un contrat pour les moins de 26 ans.'],
  [24.2, 27.6, 'La loi est déjà votée. Le 10 avril, le gouvernement l’abandonne.'],
  [28.0, 31.4, '2018. Les gilets jaunes, partis de la hausse des taxes sur le carburant.'],
  [31.6, 34.8, 'La hausse est annulée, et +100 € par mois pour un salarié au SMIC.'],
  [35.0, 38.4, 'Ces mesures ont coûté environ 10 milliards d’euros.'],
  [38.6, 42.6, 'En billets de 100 €, ça ferait un cube de 5 mètres de côté.'],
  [43.4, 45.4, 'Et samedi, qu’est-ce qui changerait pour toi ?'],
  [45.9, 49.4, 'Tes congés payés, eux, existent depuis 1936.'],
  [49.6, 53.2, 'Avant samedi, le gouvernement a annoncé 12 à 18 centimes de moins sur le gazole, pour 3 mois.'],
  [53.4, 56.8, 'Mais ces mesures ont un coût, et la rue n’obtient pas toujours ce qu’elle demande.'],
  [57.0, 60.4, 'Et si samedi ne changeait rien ? C’est l’autre vidéo.'],
];
const RES = (sub, value = 'OBTENU') => ({ label: 'RÉSULTAT', value, sub, color: OK });

export default () => buildHistoire({
  T, SUBS, seed: 36, sceneEnd: 64.6,
  hook: 'Et si le 17 octobre changeait <em>tout</em> ?',
  rewindAt: 3.6, back: 43.0,
  now: { fill: 0.36, b1: { label: 'SAMEDI 17 OCTOBRE 2026', value: '?', sub: 'APPELS CONTRE LA VIE CHÈRE' }, b2: { label: 'GAZOLE', value: '2,36 €/L', sub: 'PRIX MOYEN AU 3 OCTOBRE 2026', color: '#ff9f0a' } },
  eras: [
    { year: 1936, t0: 5.4, t1: 12.8, date: 'JUIN 1936', fill: 0.62, b1: { label: 'JUIN 1936 · FRONT POPULAIRE', value: '+1 M', sub: 'DE GRÉVISTES' }, b2: RES('CONGÉS PAYÉS · SEMAINE DE 40 H'), stamp: { at: 9.1, text: 'OBTENU', ok: true } },
    { year: 1968, t0: 12.8, t1: 20.2, date: 'MAI 1968', fill: 0.82, b1: { label: 'MAI 1968', value: 'GRÈVE', sub: 'LA FRANCE À L’ARRÊT' }, b2: RES('SALAIRE MINIMUM +35 %'), stamp: { at: 16.5, text: 'OBTENU', ok: true } },
    { year: 2006, t0: 20.2, t1: 27.8, date: 'AVRIL 2006', fill: 0.9, b1: { label: 'PRINTEMPS 2006 · CPE', value: '3,1 M', sub: 'SELON LES SYNDICATS · 1 M SELON LA POLICE' }, b2: RES('LE 10 AVRIL 2006', 'RETIRÉ'), stamp: { at: 24.2, text: 'RETIRÉ', ok: true } },
    { year: 2018, t0: 27.8, t1: 43.0, date: 'DÉCEMBRE 2018', fill: 0.5, b1: { label: 'HIVER 2018 · GILETS JAUNES', value: '+6,5 cts', sub: 'DE TAXE PRÉVUE PAR LITRE DE GAZOLE' }, b2: RES('HAUSSE ANNULÉE · +100 €/MOIS POUR UN SALARIÉ AU SMIC'), stamp: { at: 31.6, text: 'OBTENU', ok: true }, stampOut: 34.8 },
  ],
  effect: { era: 2018, label: 'COÛT DES MESURES 2018 (ENVIRON)', c0: 34.8, c1: 36.6, t0: 35.4, t1: 40.0, c2: 41.0, c3: 43.0, count: 10000, x: 2, z: 77 },
  freeze: { at: 45.6, dur: 6.4, tags: [
    { pt: 'head', title: 'TES VACANCES', lines: ['les congés payés', 'existent depuis 1936'], risk: 'info', side: 'right', dy: -60 },
    { pt: 'chest', title: 'TON SALAIRE', lines: ['le minimum a pris +35 %', 'd’un coup en 1968'], risk: 'info', side: 'left', dy: -40 },
    { pt: 'rHand', title: 'TON PLEIN', lines: ['50 L de gazole : 118 €,', 'dont 50 € de taxes'], risk: 'info', side: 'right', dy: 60 },
    { pt: 'lKnee', title: 'LA FACTURE', lines: ['environ 10 milliards en 2018,', 'payés par l’argent public'], risk: 'info', side: 'left', dy: 30 } ] },
  end: { kicker: 'SOURCES : ACCORDS DE MATIGNON ET DE GRENELLE · BANQUE DES TERRITOIRES · LA FINANCE POUR TOUS · SELECTRA · PRIX-CARBURANTS.GOUV.FR', q: 'Et toi, samedi,<br>tu voudrais que<br>ça change quoi ?', cta: 'RÉPONDS EN COMMENTAIRE' },
});

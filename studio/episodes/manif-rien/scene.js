// =====================================================================
//  ÉPISODE : « Et si le 17 octobre ne changeait rien ? » (série 17 octobre, vidéo 4) — neutre : l'histoire + l'impact pour toi
//  La caméra de la Bastille rembobine : 2010, 2016, 2023 (trois fois où la loi est passée malgré la rue).
//  Pas d'effet multiplication : la caméra reste fixe du début à la fin.
//  Faits (sources dans la légende) :
//   - 2010 : âge légal 60 → 62 ans ; 19 octobre : 3,5 millions selon les syndicats, 1,23 million selon la police ;
//     loi n° 2010-1330 du 9 novembre 2010 (publiée au JO le 10).
//   - 2016 : loi Travail, mois de manifestations ; 49.3 ; loi n° 2016-1088 du 8 août 2016.
//   - 2023 : âge légal 62 → 64 ans ; 7 mars : 3,5 millions selon la CGT, 1,28 million selon l'Intérieur ; 49.3 le 16 mars
//     (Public Sénat) ; loi n° 2023-270 du 14 avril 2023. Suspendue par la LFSS 2026 (loi n° 2025-1403 du 30 décembre 2025),
//     jusqu'en janvier 2028 (Tout sur mes finances).
//   - gazole : au-dessus de 2,30 €/L depuis le 11 septembre 2026 (Moneyvox / AFP) ; 2,363 €/L le 3 octobre → 50 L = 118 €,
//     dont ~50 € de taxes (Selectra).
//   - 7 mars 2023 : plus grosse journée du mouvement (1,28 M Intérieur, à peine plus que le 31 janvier ; 3,5 M CGT).
//   - 7 octobre 2026 : baisse du gazole de 12 à 18 cts/L annoncée pour 3 mois, attendue en novembre (Selectra).
//   - présidentielle 2027 : 18 avril et 2 mai (service-public.fr).
// =====================================================================
import { buildHistoire } from '../../lib-histoire.js';

const KO = '#ffcf6b';   // (couleur neutre, la même que dans « changeait tout »)
const T = { hookOut: 3.0, endCard: 52.8 };
const SUBS = [
  [3.2, 5.3, 'C’est déjà arrivé ? On rembobine.'],
  [5.6, 8.8, 'Automne 2010. La retraite doit passer de 60 à 62 ans.'],
  [9.0, 11.6, 'Jusqu’à 3,5 millions de manifestants selon les syndicats.'],
  [11.8, 14.8, 'La loi passe quand même. Elle est promulguée le 9 novembre.'],
  [15.2, 18.8, 'Printemps 2016. La loi Travail. Des mois de manifestations.'],
  [19.0, 22.2, 'Le gouvernement passe par le 49.3. La loi est promulguée en août.'],
  [22.6, 25.6, 'Hiver 2023. Cette fois, la retraite passe de 62 à 64 ans.'],
  [25.8, 29.0, 'Le 7 mars, la plus grosse journée du mouvement : 1,28 à 3,5 millions selon qui compte.'],
  [29.2, 31.8, 'Le 16 mars, 49.3. La loi est promulguée le 14 avril.'],
  [32.0, 34.4, 'Fin 2025, un vote du Parlement la met en pause.'],
  [35.2, 37.4, 'Et si samedi ne changeait rien, pour toi ?'],
  [37.9, 41.4, 'Le gazole est au-dessus de 2,30 € le litre depuis mi-septembre.'],
  [41.6, 45.0, 'Avant samedi, le gouvernement a déjà annoncé 12 à 18 centimes de moins, pour 3 mois.'],
  [45.2, 48.6, 'Le prochain grand vote : la présidentielle, le 18 avril 2027.'],
  [48.8, 52.4, 'Mais parfois, la rue obtient ce qu’elle demande. C’est l’autre vidéo.'],
];
const RES = (sub) => ({ label: 'RÉSULTAT', value: 'LA LOI PASSE', sub, color: KO });

export default () => buildHistoire({
  T, SUBS, seed: 64, sceneEnd: 56.6,
  hook: 'Et si le 17 octobre ne changeait <em>rien</em> ?',
  rewindAt: 3.6, back: 34.8,
  now: { fill: 0.36, b1: { label: 'SAMEDI 17 OCTOBRE 2026', value: '?', sub: 'APPELS CONTRE LA VIE CHÈRE' }, b2: { label: 'GAZOLE', value: '2,36 €/L', sub: 'PRIX MOYEN AU 3 OCTOBRE 2026', color: '#ff9f0a' } },
  eras: [
    { year: 2010, t0: 5.4, t1: 15.0, date: 'OCTOBRE 2010', fill: 0.85, b1: { label: 'AUTOMNE 2010 · RETRAITES', value: '3,5 M', sub: 'SELON LES SYNDICATS · 1,23 M SELON LA POLICE' }, b2: RES('RETRAITE À 62 ANS · 9 NOVEMBRE 2010'), stamp: { at: 11.8, text: 'LA LOI PASSE', ok: false } },
    { year: 2016, t0: 15.0, t1: 22.4, date: 'PRINTEMPS 2016', fill: 0.6, b1: { label: 'PRINTEMPS 2016 · LOI TRAVAIL', value: 'DES MOIS', sub: 'DE MANIFESTATIONS ET DE GRÈVES' }, b2: RES('49.3 · PROMULGUÉE LE 8 AOÛT 2016'), stamp: { at: 19.0, text: 'LA LOI PASSE', ok: false } },
    { year: 2023, t0: 22.4, t1: 34.8, date: 'MARS 2023', fill: 0.95, b1: { label: 'HIVER 2023 · RETRAITES', value: '3,5 M', sub: 'SELON LA CGT · 1,28 M SELON L’INTÉRIEUR' }, b2: RES('RETRAITE À 64 ANS · 14 AVRIL 2023'), stamp: { at: 29.2, text: 'LA LOI PASSE', ok: false }, stampOut: 32.0,
      later: { at: 32.0, b2: { label: 'PUIS', value: 'EN PAUSE', sub: 'SUSPENDUE FIN 2025 · JUSQU’EN 2028', color: '#ffd60a' } } },
  ],
  effect: null,
  freeze: { at: 37.6, dur: 6.4, tags: [
    { pt: 'rHand', title: 'TON PLEIN', lines: ['50 L de gazole : 118 €,', 'dont 50 € de taxes'], risk: 'info', side: 'right', dy: 50 },
    { pt: 'chest', title: 'LE 7 MARS 2023', lines: ['1,28 à 3,5 millions,', 'et la loi est passée'], risk: 'info', side: 'left', dy: -40 },
    { pt: 'head', title: 'LA LOI', lines: ['une manif ne vote pas :', 'pour la changer, il faut un vote'], risk: 'info', side: 'right', dy: -10 },
    { pt: 'lKnee', title: 'TA VOIX', lines: ['présidentielle :', '18 avril et 2 mai 2027'], risk: 'info', side: 'left', dy: 30 } ] },
  end: { kicker: 'SOURCES : LÉGIFRANCE · PUBLIC SÉNAT · EUROPE 1 · TOUT SUR MES FINANCES · SELECTRA · SERVICE-PUBLIC.FR', q: 'Samedi, tu crois que<br>ça changera quelque chose ?', cta: 'RÉPONDS EN COMMENTAIRE' },
});

// =====================================================================
//  « Merci » : la vidéo de soutien aux manifestants du 17 octobre 2026 (demandée par Curtis le jour même, sur « Sirens »).
//  La caméra de la Bastille feuillette les grandes mobilisations (France : reconstitutions 3D ; ailleurs : la carte),
//  puis au moment fort de la musique (36 s) on revient en 2026 : les VRAIES images du jour (montées à part, extraits courts
//  avec le crédit des médias), et le merci.
//  Faits :
//   - 1936 : près de 2 millions de grévistes en juin ; lois du 20 juin (15 jours de congés payés) et du 21 juin (40 h).
//   - 1963 : marche sur Washington, 28 août, environ 250 000 personnes ; Civil Rights Act signé le 2 juillet 1964.
//   - 1968 : environ 7 millions de grévistes (estimations de 7 à 10) ; accords de Grenelle, SMIG +35 %.
//   - 1975 : Islande, 24 octobre, 90 % des femmes en grève (BBC) ; 1980 : Vigdís Finnbogadóttir, première femme élue
//     présidente au suffrage universel.
//   - 1989 : Leipzig, 9 octobre, 70 000 manifestants (« Wir sind das Volk ») ; le Mur tombe le 9 novembre.
//   - 2006 : CPE, 28 mars : 1,06 million selon la police, 3 millions selon les syndicats ; retiré le 10 avril.
//   - 2023 : retraites, 7 mars : 1,28 M (Intérieur) / 3,5 M (CGT) ; loi du 14 avril 2023 ; suspendue par la LFSS 2026
//     (loi du 30 décembre 2025) jusqu'en 2028.
// =====================================================================
import { buildMerci } from '../../lib-merci.js';
import { RISK } from '../../lib-freeze.js';

const OK = RISK.ok, KO = '#ff9f0a', GOLD = '#ffcf6b';
const T = { hookOut: 3.0, endCard: 52.0 };
const SUBS = [
  [3.75, 6.14, '1789. Le peuple de Paris prend la Bastille.'],
  [6.41, 8.80, '1936. Deux millions de grévistes. Les congés payés.'],
  [9.07, 11.46, '1963. Ils marchent sur Washington. La ségrégation tombe.'],
  [11.73, 14.12, 'Mai 68. Le pays s’arrête. Le salaire minimum prend 35 %.'],
  [14.39, 16.78, '1974. Au Portugal, des œillets dans les fusils. La dictature tombe.'],
  [17.05, 19.44, '1975. En Islande, 9 femmes sur 10 font grève.'],
  [19.71, 22.10, '1989. 70 000 à Leipzig. Un mois plus tard, le Mur tombe.'],
  [22.37, 24.76, '2006. Les jeunes contre le CPE. Il est retiré.'],
  [25.03, 27.42, '2011. En Tunisie, la rue fait partir Ben Ali.'],
  [27.69, 30.08, '2018. Les gilets jaunes. La hausse du carburant est annulée.'],
  [30.35, 33.18, '2023. La réforme des retraites passe. Deux ans après, elle est mise en pause.'],
  [33.45, 35.88, '2025. Au Népal, la génération Z fait tomber le gouvernement.'],
];
const W = (label, value, sub) => ({ label, value, sub, color: OK });

export default () => buildMerci({
  T, SUBS, seed: 1936, sceneEnd: 60.0, noYou: true, stampColor: GOLD,
  hook: 'Quand le peuple<br><em>se lève</em>', trIn: 0.28, trOut: 0.14,
  rewindAt: 2.7, back: 36.0,
  now: { fill: 1.0, b1: { label: 'AUJOURD’HUI · 17 OCTOBRE 2026', value: 'VOUS', sub: 'DANS LA RUE' }, b2: { label: 'DEMAIN', value: 'MERCI', sub: 'DE LA PART DE NOS ENFANTS', color: OK } },
  eras: [
    { year: 1789, t0: 3.60, t1: 6.26, date: '14 JUILLET 1789', fill: 0, map: { lon: 2.35, lat: 48.86, country: 'France', zoom: 12, place: 'PARIS', sub: '14 JUILLET 1789 · LA PRISE DE LA BASTILLE', dots: 700, spread: 34 }, b1: { label: '14 JUILLET 1789 · PARIS', value: 'LA BASTILLE', sub: 'PRISE PAR LE PEUPLE' }, b2: W('OBTENU · AOÛT 1789', 'DROITS DE L’HOMME', 'ET LA FIN DES PRIVILÈGES'), stamp: { at: 4.55, text: 'FIN DES PRIVILÈGES', ok: true }, },
    { year: 1936, t0: 6.26, t1: 8.92, date: 'JUIN 1936', fill: 0.85, b1: { label: 'JUIN 1936 · FRANCE', value: '≈ 2 MILLIONS', sub: 'DE GRÉVISTES' }, b2: W('OBTENU', 'CONGÉS PAYÉS', '2 SEMAINES · ET LA SEMAINE DE 40 H'), stamp: { at: 7.21, text: 'CONGÉS PAYÉS', ok: true }, },
    { year: 1963, t0: 8.92, t1: 11.58, date: '28 AOÛT 1963', fill: 0, map: { lon: -77.04, lat: 38.89, country: 'United States of America', zoom: 5, place: 'WASHINGTON', sub: '28 AOÛT 1963 · LA MARCHE POUR L’EMPLOI ET LA LIBERTÉ', dots: 900, spread: 44 }, b1: { label: '28 AOÛT 1963 · WASHINGTON', value: '250 000', sub: 'MANIFESTANTS' }, b2: W('OBTENU · 1964', 'DROITS CIVIQUES', 'LA SÉGRÉGATION INTERDITE'), stamp: { at: 9.87, text: 'DROITS CIVIQUES', ok: true }, },
    { year: 1968, t0: 11.58, t1: 14.24, date: 'MAI 1968', fill: 1.0, b1: { label: 'MAI 1968 · FRANCE', value: '≈ 7 MILLIONS', sub: 'DE GRÉVISTES' }, b2: W('OBTENU', 'SMIG +35 %', 'ACCORDS DE GRENELLE'), stamp: { at: 12.53, text: 'SMIG +35 %', ok: true }, },
    { year: 1974, t0: 14.24, t1: 16.90, date: '25 AVRIL 1974', fill: 0, map: { lon: -9.14, lat: 38.72, country: 'Portugal', zoom: 12, place: 'LISBONNE', sub: '25 AVRIL 1974 · LA RÉVOLUTION DES ŒILLETS', dots: 800, spread: 36 }, b1: { label: '25 AVRIL 1974 · PORTUGAL', value: 'LA FOULE', sub: 'DES ŒILLETS DANS LES FUSILS' }, b2: W('OBTENU', 'LA DÉMOCRATIE', 'APRÈS 48 ANS DE DICTATURE'), stamp: { at: 15.19, text: 'LA DÉMOCRATIE', ok: true }, },
    { year: 1975, t0: 16.90, t1: 19.56, date: '24 OCTOBRE 1975', fill: 0, map: { lon: -21.9, lat: 64.1, country: 'Iceland', zoom: 9, place: 'REYKJAVIK', sub: '24 OCTOBRE 1975 · LE « JOUR DE CONGÉ DES FEMMES »', dots: 800, spread: 36 }, b1: { label: '24 OCTOBRE 1975 · ISLANDE', value: '90 %', sub: 'DES FEMMES EN GRÈVE' }, b2: W('OBTENU · 1980', 'UNE PRÉSIDENTE', 'LA 1RE FEMME ÉLUE PRÉSIDENTE AU MONDE'), stamp: { at: 17.85, text: 'UNE PRÉSIDENTE', ok: true }, },
    { year: 1989, t0: 19.56, t1: 22.22, date: '9 OCTOBRE 1989', fill: 0, map: { lon: 12.37, lat: 51.34, country: 'Germany', zoom: 9, place: 'LEIPZIG', sub: '9 OCTOBRE 1989 · « NOUS SOMMES LE PEUPLE »', dots: 900, spread: 40 }, b1: { label: '9 OCTOBRE 1989 · LEIPZIG', value: '70 000', sub: 'MANIFESTANTS' }, b2: W('9 NOVEMBRE 1989', 'LE MUR TOMBE', 'BERLIN-EST S’OUVRE'), stamp: { at: 20.51, text: 'LE MUR TOMBE', ok: true }, },
    { year: 2006, t0: 22.22, t1: 24.88, date: 'MARS 2006', fill: 0.9, b1: { label: 'MARS 2006 · FRANCE', value: '1 À 3 MILLIONS', sub: 'SELON LA POLICE OU LES SYNDICATS' }, b2: W('OBTENU · AVRIL 2006', 'CPE RETIRÉ', 'LE CONTRAT PREMIÈRE EMBAUCHE'), stamp: { at: 23.17, text: 'CPE RETIRÉ', ok: true }, },
    { year: 2011, t0: 24.88, t1: 27.54, date: '14 JANVIER 2011', fill: 0, map: { lon: 10.18, lat: 36.8, country: 'Tunisia', zoom: 10, place: 'TUNIS', sub: '14 JANVIER 2011 · « DÉGAGE ! »', dots: 900, spread: 40 }, b1: { label: '14 JANVIER 2011 · TUNISIE', value: '4 SEMAINES', sub: 'DE MANIFESTATIONS' }, b2: W('OBTENU', 'BEN ALI PART', 'APRÈS 23 ANS AU POUVOIR'), stamp: { at: 25.83, text: 'BEN ALI PART', ok: true }, },
    { year: 2018, t0: 27.54, t1: 30.20, date: 'DÉCEMBRE 2018', fill: 0.9, b1: { label: 'HIVER 2018 · FRANCE', value: 'GILETS JAUNES', sub: 'DES SEMAINES DE BLOCAGES' }, b2: W('OBTENU', 'TAXE ANNULÉE', 'ET 10 MILLIARDS DE MESURES'), stamp: { at: 28.49, text: 'TAXE ANNULÉE', ok: true }, },
    { year: 2023, t0: 30.20, t1: 33.30, date: 'MARS 2023', fill: 1.0, b1: { label: 'HIVER 2023 · RETRAITES', value: '1,3 À 3,5 M', sub: 'LE 7 MARS · SELON LA POLICE OU LA CGT' }, b2: { label: 'RÉSULTAT', value: 'LA LOI PASSE', sub: 'RETRAITE À 64 ANS · AVRIL 2023', color: KO }, stamp: { at: 31.15, text: 'LA LOI PASSE', ok: false, color: KO }, stampOut: 32.10, later: { at: 32.10, b2: { label: 'PUIS', value: 'EN PAUSE', sub: 'SUSPENDUE FIN 2025 · JUSQU’EN 2028', color: '#ffd60a' } }, },
    { year: 2025, t0: 33.30, t1: 36.00, date: '8 SEPTEMBRE 2025', fill: 0, map: { lon: 85.32, lat: 27.72, country: 'Nepal', zoom: 10, place: 'KATMANDOU', sub: '8 SEPTEMBRE 2025 · LA GÉNÉRATION Z', dots: 900, spread: 40 }, b1: { label: '8 SEPTEMBRE 2025 · NÉPAL', value: 'GÉNÉRATION Z', sub: 'DANS LA RUE' }, b2: W('OBTENU · LE LENDEMAIN', 'DÉMISSION', 'DU PREMIER MINISTRE'), stamp: { at: 34.25, text: 'DÉMISSION', ok: true }, },
  ],
  effect: null, freeze: null,
  end: { kicker: 'SOURCES : LÉGIFRANCE · ASSEMBLÉE NATIONALE · NATIONAL ARCHIVES (USA) · BBC · DEUTSCHLAND.DE · IMAGES DU 17 OCTOBRE : PARIS MATCH, BRUT, ACTU.FR, @OPTIJOURNAL, @MARDIEVAL.MTP',
    q: '<span style="font-size:2.6em">Merci.</span>', cta: 'PARTAGE-LA À QUELQU’UN QUI MARCHE AUJOURD’HUI' },
});

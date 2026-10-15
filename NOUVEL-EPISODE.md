# Fabriquer et programmer un nouvel épisode « Et si… ? »

Mode d'emploi pour la tâche planifiée : chaque lancement repart d'une machine vide, tout est donc écrit ici.
La recette créative complète et la liste des idées sont dans Notion :
page « TikTok « Et si… ? » · Suivi des vidéos » (https://app.notion.com/p/3f79c2ea7e74813fac7fdb05baa43652),
base « Vidéos » (data source collection://46de8c0d-bde3-4b59-9e91-417a07447c33).

## 0. Préparer la machine
```bash
cd studio && npm install && pip install --quiet --break-system-packages numpy scipy
```
Chromium est déjà installé (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers, playwright 1.56.0). ffmpeg aussi.
Puis `studio/get-models.sh` : télécharge le personnage réaliste (Michelle, Mixamo) dans `studio/models/` (make.sh le fait aussi).
**Ne jamais ajouter `studio/models/` au dépôt** : la licence Mixamo autorise l'usage dans une vidéo, pas la redistribution du fichier.

## 1. Choisir l'idée
Règle de Curtis pour les idées : surtout des questions que tout le monde peut se poser, intéressantes et variées, pas que l'espace (au maximum une idée « espace » sur trois). Exemples : « Et si les dinosaures existaient de nos jours ? », « Et si tu conduisais une F1 comme un pilote ? », « Et si tu étais l'homme le plus riche du monde ? ».
Point de vue : toujours une personne lambda (« toi »). On montre ce qui arriverait à TON corps et à ta vie, avec les risques concrets pour ta santé illustrés à l'écran (silhouette du corps avec les zones touchées, compteur de ce que tu ressens : poids ressenti, rythme cardiaque, température…). Exemple F1 : pas la vie du pilote, mais le cou d'un conducteur normal qui lâche au premier freinage, la vue qui se brouille dans les virages, la chaleur, le cœur qui s'emballe.
Dans Notion, prendre la ligne au statut « 👍 Validée » la plus ancienne. La passer en « 🎬 En fabrication ».
Ne jamais prendre une ligne au statut « 🎞 Reconstitution » : ces idées sont réservées au format reconstitution (style PS2, plans courts, persos Mixamo qui ne sont que sur l'ordi de Curtis), fabriqué avec Claude à raison d'une par semaine (voir l'annexe en bas).

## 2. Vérifier les faits AVANT d'écrire la scène
- Chaque chiffre affiché ou dit dans un sous-titre doit venir d'une source sérieuse (NASA, ESA, articles scientifiques, organismes officiels) ou d'un calcul physique refait en Python. Pas de bêtise, pas d'approximation présentée comme exacte.
- Noter les sources : elles vont dans la légende.

## 3. Écrire l'épisode : `studio/episodes/<code>/`
S'inspirer de l'épisode existant le plus proche (même genre de décor) et garder exactement la même recette :
- `scene.js` : un décor 3D d'un lieu français reconnaissable, **une seule caméra fixe** (type caméra de surveillance ; elle ne bouge que pendant l'effet multiplication, voir plus bas), une partition `T = { hookOut: 3.0, …, endCard, duration }` (60 à 75 s), des sous-titres `SUBS = [[début, fin, 'texte'], …]` (une idée par sous-titre, 3 lignes max), le compteur `HUD.block(1|2, {label, value, sub})`, l'étiquette caméra `HUD.live(t, 'LIEU · CAM 01', 'date · heure')`, la question d'accroche `HUD.hook(t, 'Et si…<em>mot clé</em> ?', T.hookOut)`, l'écran de fin `HUD.end(t, T.endCard, { kicker, q, cta: 'RÉPONDS EN COMMENTAIRE' })`.
  Règle d'or : tout est une fonction du temps t (même t = même image).
- Structure : 0-3 s question · 3-15 s vie normale et échelle · ~15 s l'événement · 15-55 s une conséquence toutes les ~5 s · ~55 s retour au réel · 4 dernières s écran noir + question pour les commentaires.
- `insets.js` : vignettes (autre ville, archive, schéma) quand un sous-titre parle d'un ailleurs (voir `lib-insets.js`), puis `python3 hookinsets.py <code>`.
- **Personnages réalistes, partout** (choix de Curtis : plus de bonhommes en cubes, donc ne plus utiliser `makePerson`) : `lib-people.js` (mode d'emploi en tête du fichier).
  `const PEOPLE = await loadPeople(renderer)`, puis `const P = PEOPLE.make({ outfit: 0…7 })` (8 tenues : peau, haut et pantalon différents), `scene.add(P.root)`.
  Une pose par image dans update(t) : `P.stand()`, `P.walk(t * 6)`, `P.run(ph)`, `P.sit(k)`, `P.armsUp(k)`, ou une pose libre `P.do({ LeftArm: [['x', -0.5]], … })`.
  Le personnage regarde vers +Z. `P.fade(a)`, `P.pop(k)` (apparition). `P.point('neck')` donne la position d'une partie du corps (head, eyes, neck, chest, heart, belly, lHand, rHand, lArm, rArm, lKnee, rKnee, lFoot, rFoot).
  Lumière : ajouter un léger éclairage d'ambiance (`scene.environment` avec RoomEnvironment, `scene.environmentIntensity` ≈ 0,25, comme dans `episodes/demo-jackpot/scene.js`), sinon les personnages paraissent ternes.
- **Effet multiplication** (idéal dès que l'idée parle d'argent ou de quantités : fortune, gains, calories, pas, litres…) : `lib-multiply.js`, exemple complet `episodes/demo-jackpot/` (validé par Curtis).
  3 temps : 1) l'objet SEUL avec son prix ou sa quantité ; 2) il se MULTIPLIE en un tas (`makePile`), le compteur grimpe lentement puis d'un coup ;
  3) CONVERSION en un équivalent parlant pour une personne lambda (des personnes payées au SMIC, des années de ton salaire…) avec une foule (`makeCrowd` : vrais personnages devant, « photos découpées » au loin)
  et l'ÉQUATION en bas de l'écran (`makeEquation`). Chaque chiffre de l'équation est calculé et sourcé.
  **Caméra** : c'est le seul moment où la caméra quitte sa position fixe (elle recule et monte pour révéler le tas ou la foule), puis elle peut revenir.
  Rendu : une image avec une grande foule prend ~10 s (contre ~1 s), compter ~1 h de plus pour 15 s de foule.
- **Arrêt sur image** (dès qu'on parle du corps, 1 ou 2 fois par vidéo, au moment fort) : `lib-freeze.js` (mode d'emploi en tête du fichier).
  L'image se fige 4 à 5 s, se désature, et 2 à 4 étiquettes s'accrochent au corps du personnage (COU, YEUX, CŒUR, PEAU…), une par une,
  couleur = niveau de risque (`ok` vert, `bof` jaune, `mal` orange, `grave` rouge), chacune avec un fait vrai et court.
  Le personnage doit être assez près de la caméra fixe pour qu'on voie bien son corps. Les étiquettes s'accrochent avec `at: () => P.point('neck')` (etc.).
  À ne pas oublier : `T.duration += FZ.total`, `SUBS_V = FZ.subs(SUBS)` pour les sous-titres, `HUD.end(t, FZ.realT(T.endCard), …)`,
  `const ts = FZ.sceneT(t)` pour tout le décor et les compteurs, `FZ.draw(t, camera)` à la fin d'update, `freezes: FZ.events()` dans events(),
  et dans audio.py `freeze_sfx(S, sfx, e['t'], e['dur'])` pour chaque arrêt.
  Pendant un arrêt, le zoom de la caméra fixe (`camera.setViewOffset`, ×3 à ×8) cadre le personnage : voir `episodes/manif-protection/` et `episodes/manif-million/` (zoom sur un policier).
  Étiquette `risk: 'info'` (bleu) pour un fait neutre qui n'est pas un risque.
- **Série « 17 octobre »** (manifestations, place de la Bastille) : le décor, le gaz lacrymogène, les lunettes et le masque sont dans `lib-manif.js` ;
  les policiers dans `lib-people.js` (`loadPolice`). Les vidéos « histoire » (`manif-tout`, `manif-rien`) partagent `lib-histoire.js` et `histoire_snd.py` :
  la même caméra « rembobine » des époques (filtre sépia, grain, tampon OBTENU / LA LOI PASSE), le scene.js ne contient que la liste des époques et les textes.
  Tenues en plus (ex. gilet jaune) : `loadPeople(renderer, undefined, { extra: [[pantalon, peau, haut]] })`, numérotées après les 8.
  Sujet politique : rester neutre, des faits datés et sourcés des deux côtés, et dire ce que ça change concrètement pour « toi ».
- `audio.py` : bande-son 100 % synthétisée avec `snd.py` (ambiance du lieu, bruitages calés sur les événements, musique qui monte), master vers −15/−16 LUFS.

## 4. Tester avant de tout rendre
```bash
python3 -m http.server 8124 --directory studio &   # (make.sh le fait aussi)
node studio/still.mjs <code> studio/work/stills-<code> 2 10 20 30 40 50 60
```
Regarder la planche `planche.jpg` : textes lisibles, rien qui se chevauche, sous-titres jamais cachés par une vignette, pas d'image noire ou cassée. Corriger, recommencer.

## 5. Rendre la vidéo (≈ 45 min pour 70 s)
```bash
studio/make.sh <code> 30
```
Puis vérifier : `ffprobe` → 1080×1920, 30/1, 3 s < durée < 10 min ; `ffmpeg -v error -i … -f null -` sans erreur ;
volume ≈ −16 LUFS (`ffmpeg -i … -af ebur128 -f null -`) ; regarder `studio/work/check-<code>.jpg`.

## 6. Ranger la vidéo et la programmer
1. Copier dans `videos/NN-<code>.mp4` (NN = numéro suivant), `git add`, `git commit`, `git push` (dépôt curtissaintpaul-byte/et-si-tiktok, branche main).
   URL publique : `https://raw.githubusercontent.com/curtissaintpaul-byte/et-si-tiktok/main/videos/NN-<code>.mp4`
2. Date : le créneau libre suivant après la dernière publication déjà programmée (Metricool `getScheduledPosts`), au rythme **mardi 18 h, vendredi 18 h, dimanche 13 h** (Europe/Paris).
3. Metricool `createScheduledPost`, blogId **7377014**, `providers: [{network: "tiktok"}]`, `autoPublish: true`, `media: [URL]`,
   `text` = légende complète + hashtags, `tiktokData: { title: <la question + emoji>, privacyOption: "PUBLIC_TO_EVERYONE", isAigc: true, disableComment: false, disableDuet: false, disableStitch: false, autoAddMusic: false, commercialContentThirdParty: false, commercialContentOwnBrand: false }`.

## 7. La légende
La question + emoji, 3 à 5 faits simples (phrases courtes, vocabulaire courant), « Sources : … », puis 5 hashtags (`#etsi` + 3 du thème + `#apprendresurtiktok`).
Ton simple et naturel. **Jamais de tirets pour enchaîner les idées**, rien qui sonne IA ou « vendeur ».

## 8. Mettre Notion à jour
Ligne de l'épisode : statut « 📅 Programmée », date de publication, `Lien vidéo` (URL GitHub), légende, hashtags, durée, code, et dans `Notes` le lien Metricool (`plannerUrl`).
Si quelque chose a bloqué : laisser la ligne en « 🎬 En fabrication » et écrire le problème dans `Notes`.

## Annexe : le style « reconstitution » (rendu PS2, façon reportage télé)
Testé sur `episodes/vol-voiture` (15/10/2026), inspiré des reconstitutions 3D des vidéos d'enquête sur YouTube.
- `lib-ps2.js` : `makePS2(stage, { width: 360 })` juste après `createStage()`. L'image est calculée en 360 × 640 puis agrandie sans lissage
  (gros pixels), moins de couleurs avec une trame 4 × 4 (visible dans les ombres), flou de profondeur `PS.dof(distance, ouverture)`,
  looks `PS.look('normal' | 'aerial' | 'red')`. `ps2Textures(objet, 96)` : les textures en gros carrés. `pixTex()` : textures dessinées à la main.
- Montage en **plans courts** (3 s) au lieu d'une caméra fixe : un tableau `SHOTS` (id, début, caméra(u), flou, look), `u` va de 0 à 1 dans le plan.
  Pour tester un plan seul : `still.mjs "vol-voiture&shot=boitier&u=0.5" …`.
- Inserts typiques : vue aérienne noir et blanc avec point rouge (calque 2D), gros plan d'objet sur table grise, tableau d'enquête rouge
  (texture dessinée sur un plan 3D, photos prises dans la scène avec `snap()`), arrêt sur image sur un objet.
- `lib-rue.js` : rue pavillonnaire de nuit (maisons, muret, haies, réverbères au sodium), `makeSUV()` (carrosserie creuse : on peut filmer
  l'intérieur), `keyFob()`, `relayBox()`.
- `lib-people.js` → `loadHooded()` : silhouettes à capuche (modèle Soldier teinté sombre) avec ses animations Idle/Walk/Run + des os tordus par-dessus.
- Limite : pas de vrais visages d'hommes réalistes (on n'a que Michelle et Soldier). On filme de dos, en capuche, ou on passe par Higgsfield (crédits).
- **Vrais persos et animations Mixamo** (15/10/2026) : `lib-mixamo.js` → `loadMixamo({ chars, anims })`, `CAST.make('James')`,
  `P.pose('walk', t)` ou un mélange `P.pose([['walk', t, 0.3], ['texting', t, 0.7]])`, `P.hold(objet, 'RightHand', …)`, `balaclava(P)` (cagoule noire).
  Les fichiers ne vont JAMAIS sur GitHub (licence Mixamo). Ils sont sur l'ordi de Curtis : `Téléchargements/mixamo/` (FBX d'origine)
  et `Téléchargements/mixamo/leger/` (GLB allégés, 50 Mo). Pour les remettre dans l'atelier (ordi relié) : récupérer `leger/*.glb` →
  `studio/models/mixamo/`, `leger/anim/*.glb` → `studio/models/mixamo/anim/`. Nouveau perso ou animation : le télécharger sur mixamo.com
  (compte de Curtis), puis FBX2glTF + `gltf-transform resize --width 512` (npm `fbx2gltf`, `@gltf-transform/cli`).
  Les animations médicales (massage cardiaque, toux, malaise…) sont pour Tactea : `leger/tactea/`, à garder séparées d'« Et si ».
  Exception : 4 animations génériques de ce pack ont été copiées dans `studio/models/mixamo/anim/` pour la foudre : `fallback` (chute en arrière),
  `liedown`, `cpr` (faire un massage) et `cprrecv` (le recevoir). `cpr` et `cprrecv` vont ensemble : même position, même orientation.
- **La série « reconstitution »** (choisie par Curtis le 15/10/2026, une par semaine, statut Notion « 🎞 Reconstitution », jamais par le robot) :
  1) foudre (`episodes/foudre`, 15/10), 2) ne plus dormir, 3) gagner à l'EuroMillions, 4) Internet coupé 24 h.
- `lib-orage.js` : `buildPlateau()` (haut plateau façon Aubrac : herbe, chemin, murets, granit, buron, arbre isolé), `stormSky()` (nuages,
  rideaux de pluie à l'horizon, flash), `makeRain()` (pluie en traits de 1 pixel), `makeBolt()` (éclair : ligne brisée + branches ;
  `flat: true` pour le courant dans l'herbe), `strike(ts, t0)` (3 flashs en 0,15 s puis la lueur retombe).
  Attention : un éclair proche de la caméra a vite l'air d'un brouillard blanc (le halo et le « bloom ») : des éclairs fins et peu de halo de près.
  En vue aérienne, `P.hot()` faible quand la caméra est proche (sinon le halo blanc mange l'image).
- `lib-nuit.js` (sommeil) : `buildBedroom()` (chambre avec vue sur Lyon, réveil aux chiffres rouges, nuit ou jour), `buildHighway()` (A7 :
  3 voies, bande sonore, glissière, lampadaires dont seuls les 3 plus proches éclairent). `lib-tabac.js` (EuroMillions) : `buildTabac()`,
  `makeTicket()` (grille générique qui se coche), `makeTV()` (le tirage). `lib-gare.js` (Internet) : `buildHall()` (hall de gare, tableau des
  départs, café et terminal de paiement, distributeur), `makePhoneScreen()` (« aucune connexion » ou carte vide), `makeKit()` (kit d'urgence).
- Masques d'animation (`lib-mixamo.js`) : `P.pose([['sit', t, 1, LOWER], ['texting', t, 1, UPPER]])` = assis (le bas) + téléphone (le haut).
- **Rendu rapide** : une lampe éteinte (intensité 0) coûte quand même du calcul à chaque pixel. Dans `update()`, après avoir réglé les
  lumières : `for (const l of LIGHTS) l.visible = l.intensity > 0;` (le rendu du sommeil est passé de ~17 à plus de 60 images/minute).
- Attention aux commentaires `//` ajoutés au milieu d'une ligne : tout ce qui suit est ignoré (ça a déjà « effacé » une voiture et un terminal).

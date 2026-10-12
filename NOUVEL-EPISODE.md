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

## 1. Choisir l'idée
Règle de Curtis pour les idées : surtout des questions que tout le monde peut se poser, intéressantes et variées, pas que l'espace (au maximum une idée « espace » sur trois). Exemples : « Et si les dinosaures existaient de nos jours ? », « Et si tu conduisais une F1 comme un pilote ? », « Et si tu étais l'homme le plus riche du monde ? ».
Dans Notion, prendre la ligne au statut « 👍 Validée » la plus ancienne. La passer en « 🎬 En fabrication ».

## 2. Vérifier les faits AVANT d'écrire la scène
- Chaque chiffre affiché ou dit dans un sous-titre doit venir d'une source sérieuse (NASA, ESA, articles scientifiques, organismes officiels) ou d'un calcul physique refait en Python. Pas de bêtise, pas d'approximation présentée comme exacte.
- Noter les sources : elles vont dans la légende.

## 3. Écrire l'épisode : `studio/episodes/<code>/`
S'inspirer de l'épisode existant le plus proche (même genre de décor) et garder exactement la même recette :
- `scene.js` : un décor 3D d'un lieu français reconnaissable, **une seule caméra fixe** (type caméra de surveillance), une partition `T = { hookOut: 3.0, …, endCard, duration }` (60 à 75 s), des sous-titres `SUBS = [[début, fin, 'texte'], …]` (une idée par sous-titre, 3 lignes max), le compteur `HUD.block(1|2, {label, value, sub})`, l'étiquette caméra `HUD.live(t, 'LIEU · CAM 01', 'date · heure')`, la question d'accroche `HUD.hook(t, 'Et si…<em>mot clé</em> ?', T.hookOut)`, l'écran de fin `HUD.end(t, T.endCard, { kicker, q, cta: 'RÉPONDS EN COMMENTAIRE' })`.
  Règle d'or : tout est une fonction du temps t (même t = même image).
- Structure : 0-3 s question · 3-15 s vie normale et échelle · ~15 s l'événement · 15-55 s une conséquence toutes les ~5 s · ~55 s retour au réel · 4 dernières s écran noir + question pour les commentaires.
- `insets.js` : vignettes (autre ville, archive, schéma) quand un sous-titre parle d'un ailleurs (voir `lib-insets.js`), puis `python3 hookinsets.py <code>`.
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

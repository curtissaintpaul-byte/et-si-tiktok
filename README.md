# Et si… ? (TikTok)

- `videos/` : les vidéos prêtes pour TikTok (1080×1920, 30 images/s), numérotées dans l'ordre de publication. Metricool les récupère ici.
- `studio/` : l'atelier qui fabrique les vidéos (scènes 3D Three.js filmées image par image, bande-son synthétisée en Python).
- `NOUVEL-EPISODE.md` : le mode d'emploi complet pour fabriquer, vérifier et programmer un nouvel épisode.

Fabriquer un épisode existant : `studio/make.sh <episode> 30` → `studio/out/et-si-<episode>.mp4`.

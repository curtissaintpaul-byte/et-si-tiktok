#!/bin/bash
# Les personnages réalistes : « Michelle » (Mixamo, gratuit et libre d'usage dans une vidéo).
# La licence interdit de redistribuer le fichier lui-même : on le télécharge donc à chaque fois depuis les exemples
# de three.js (GitHub), et le dossier models/ n'est jamais mis dans le dépôt (.gitignore).
set -e
cd "$(dirname "$0")"
mkdir -p models
for f in Michelle Soldier; do   # Soldier : sert de base aux policiers et gendarmes (Mixamo aussi)
  [ -s models/$f.glb ] || curl -sfL -o models/$f.glb https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/$f.glb
done
ls -la models/

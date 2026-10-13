#!/bin/bash
# Les personnages réalistes : « Michelle » (Mixamo, gratuit et libre d'usage dans une vidéo).
# La licence interdit de redistribuer le fichier lui-même : on le télécharge donc à chaque fois depuis les exemples
# de three.js (GitHub), et le dossier models/ n'est jamais mis dans le dépôt (.gitignore).
set -e
cd "$(dirname "$0")"
mkdir -p models
[ -s models/Michelle.glb ] || curl -sfL -o models/Michelle.glb https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb
ls -la models/Michelle.glb

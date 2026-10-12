#!/bin/bash
# Fabrique un épisode de A à Z : ./make.sh <episode> [fps=30]
# → out/et-si-<episode>.mp4 (1080×1920) + work/check-<episode>.jpg (planche de contrôle)
set -e
cd "$(dirname "$0")"
EP=$1; FPS=${2:-30}
[ -d node_modules/three ] || npm install --silent
python3 -c "import numpy, scipy" 2>/dev/null || pip install --quiet --break-system-packages numpy scipy
mkdir -p work out
curl -s -o /dev/null http://localhost:8124/index.html || { setsid nohup python3 -m http.server 8124 --directory . > work/http.log 2>&1 < /dev/null & sleep 2; }
node capture.mjs "$EP" "work/frames-$EP" "$FPS"
FR="work/frames-$EP" TAG="$EP" ./finish.sh "$EP" "$FPS"

#!/bin/bash
# Montage final d'un épisode : bande-son + images → MP4 prêt pour TikTok (< 30 Mo) + planche de contrôle
# Usage : ./finish.sh <episode> [fps=24]
set -e
EP=$1; FPS=${2:-24}; TAG=${TAG:-$EP}   # TAG : nom du fichier de sortie (ex. trou-noir-v2)
cd "$(dirname "$0")"
FR=${FR:-work/frames-$EP}
N=$(ls $FR/f*.jpg | wc -l)
echo "$EP : $N images"
( cd episodes/$EP && nice -n 5 python3 audio.py ../../$FR/events.json ../../work/$TAG.wav | tail -2 )
OUT=out/et-si-$TAG.mp4
ffmpeg -v error -y -framerate $FPS -i $FR/f%05d.jpg -i work/$TAG.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -movflags +faststart -shortest $OUT
SIZE=$(stat -c %s $OUT)
if [ $SIZE -gt 29000000 ]; then
  ffmpeg -v error -y -framerate $FPS -i $FR/f%05d.jpg -i work/$TAG.wav -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -movflags +faststart -shortest $OUT
fi
ffprobe -v error -show_entries format=duration,size -of compact $OUT
ffmpeg -v error -y -i $OUT -vf "fps=1/3,scale=180:-1,tile=10x3" -frames:v 1 work/check-$TAG.jpg
echo "ok $OUT"

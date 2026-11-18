#!/usr/bin/env bash
# frames + audio -> out/shadow-play.mp4   (usage: tools/mux.sh [out.mp4])
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-out/shadow-play.mp4}"
ffmpeg -hide_banner -loglevel error -y -framerate 24 -i out/frames/f%05d.jpg -i out/audio.wav \
  -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 320k -ar 48000 -t 50 "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of default=nw=1 "$OUT"

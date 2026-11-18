# shadow-play — "The storm was never the end"

A 50 s, 16:9, 4-shot dark-fantasy battle short, built **entirely from code** with free tools
(Canvas2D in headless Chromium → frames, numpy/scipy synthesis → audio, ffmpeg → mp4).
No AI video model, no stock footage, no external assets.

## Layout
```
shared/events.json      single source of truth: every cue time + the heartbeat tempo map (read by BOTH picture and sound)
web/src/                browser renderer (pure functions of time → any frame is renderable in isolation)
  choreo/               hero.js · wraith.js · camera.js · world.js · events.js   (what happens, when)
  scene/                sky · farfield (pagoda, shore) · ground (water, stepping-stones) · props (palisade, ship, rocks, fires)
  actors/               hero (side/back/front) · portrait (face close-up) · wraith (+ demon) · ball
  fx/                   particles (stateless bursts/streams) · emitters (event-driven FX) · text (burning doubts)
  post.js               bloom, anamorphic streak, teal→gold grade, vignette, grain, flashes, red mist, fade, end title
audio/                  dsp.py · instruments.py · score.py (cue sheet) · build.py → out/audio.wav
tools/                  serve.mjs · stills.mjs · render.mjs (parallel) · mux.sh · review_pack.py · contact.py
out/                    shadow-play.mp4 (final), audio.wav
```

## Rebuild (output: 1920×1080 @ 60 fps)
```bash
node tools/render.mjs --workers 4        # ~9 min: 3000 frames, 5 sub-frames each (real motion blur)
python3 audio/build.py out/audio.wav     # ~10 s
tools/mux.sh out/shadow-play.mp4
node tools/stills.mjs out/stills 12 26.5 # quick look at specific timestamps
```
Needs: Node 22 + Playwright/Chromium, Python 3 with numpy, scipy, Pillow, ffmpeg.

## Design notes
* **Stateless animation.** Every particle, chain, hair strand and trail is a pure function of `t` (trails sample the
  actor's *past* position), so frames render in parallel and motion-blur sub-frames are exact.
* **Pseudo-3D.** A real pinhole camera (`camera.js`) drives billboards, a perspective water plane, orbits, cranes and whip-pans.
* **Wraith "mirrors half a second late"** is literal: during the kneel (15–19 s) its position is `2c − hero(t − 0.5)`.
* **Picture and sound share cues** (`events.json`), so every clash, splash and the heartbeat tempo land on the exact frame.

## Status & honest limitations
Five critique→fix rounds were run, each by a fresh reviewer agent working only from frames/stills + spectrogram extracted from the final mp4.
Remaining weaknesses the last reviewer still flagged: stylised flat-vector characters (not photoreal), the demon is a scaled/bulked wraith,
the shot-1→2 join and the red-mist join read as near-cuts, and sound could only be verified through spectrogram/loudness numbers (not by ear).

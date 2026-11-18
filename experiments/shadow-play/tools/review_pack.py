"""Builds a review pack for the critique agent from the *final mp4* (not from the renderer):
   stills every 2 s, 'motion triplets' (3 consecutive frames) at action beats, audio stats + spectrogram.
   usage: python3 tools/review_pack.py out/shadow-play.mp4 out/review/round1"""
import sys, os, subprocess, json, wave
import numpy as np
mp4, outdir = sys.argv[1], sys.argv[2]
os.makedirs(outdir, exist_ok=True)
def grab(t, name):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', os.path.join(outdir, name)], check=True)
for i in range(25):
    t = min(49.9, i * 2.0 + 0.5); grab(t, f'still_{t:05.1f}s.png')
for t in (3.9, 6.4, 11.7, 13.6, 21.3, 27.5, 35.5, 39.6):   # action beats: 3 consecutive frames side by side
    fs = []
    for k in range(3):
        n = os.path.join(outdir, f'_m{t}_{k}.png'); grab(t + k / 24, os.path.basename(n)); fs.append(n)
    from PIL import Image
    ims = [Image.open(f).convert('RGB').resize((640, 360)) for f in fs]
    sheet = Image.new('RGB', (1920, 360)); [sheet.paste(im, (i * 640, 0)) for i, im in enumerate(ims)]
    sheet.save(os.path.join(outdir, f'motion_{t:05.1f}s.png')); [os.remove(f) for f in fs]
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-lavfi', 'showspectrumpic=s=1800x520:legend=1:scale=log:fscale=log', os.path.join(outdir, 'audio_spectrogram.png')], check=True)
# audio facts
wav = os.path.join(outdir, '_a.wav'); subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-vn', wav], check=True)
w = wave.open(wav); y = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2) / 32768; sr = w.getframerate(); os.remove(wav)
rms = [20 * np.log10(np.sqrt((y[i * sr:(i + 1) * sr] ** 2).mean()) + 1e-9) for i in range(int(len(y) / sr))]
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
lu = [l.strip() for l in r.splitlines() if 'I:' in l or 'LRA:' in l or 'Peak:' in l][-3:]
stereo = float(np.corrcoef(y[:, 0], y[:, 1])[0, 1])
open(os.path.join(outdir, 'audio_facts.txt'), 'w').write('per-second RMS (dBFS):\n' + ' '.join(f'{i}s:{v:.0f}' for i, v in enumerate(rms)) + '\n' + '\n'.join(lu) + f'\nL/R correlation: {stereo:.2f}\nsample rate {sr}, channels 2\n')
probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height,r_frame_rate,bit_rate', '-of', 'default=nw=1', mp4], capture_output=True, text=True).stdout
open(os.path.join(outdir, 'file_facts.txt'), 'w').write(probe)
print('pack ready', outdir)

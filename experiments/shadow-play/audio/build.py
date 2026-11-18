"""python3 audio/build.py [out.wav] — renders the full 50 s soundtrack from shared/events.json"""
import sys, os, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *
import score

def main(path):
    bus, fg = score.build()
    y = bus.mix()[: int(score.D * SR)]; f = fg.mix()[: int(score.D * SR)]
    tt = np.arange(len(y)) / SR
    # act 4: the score DROPS OUT (ducked hard) so only the demon's roar/steps, breath and fading whispers remain
    duck = np.interp(tt, [31.2, 31.6, 33.5, 33.9, 39.2, 39.45, 43.9, 45.0], [1, .2, .2, 1, 1, .1, .1, 1])  # lowest point: only the breath; act 4: score drops out
    y = y * duck[:, None] + f * .75
    swell_ = np.interp(tt, [44.5, 46.5, 48.8, 50], [1, 1.3, 1.25, .5]); y = y * np.where((tt > 44.5), swell_, 1.0)[:, None]
    # global character: muffle after the blast (shot 3 low point) and clear again in the last act
    t = np.arange(len(y)) / SR
    mu = np.interp(t, [27.38, 27.5, 28.8, 33.4, 34.0], [0, 1, 1, .6, 0])
    ylp = np.stack([lp(y[:, c], 1700, 2) for c in range(2)], axis=1)
    y = y * (1 - .55 * mu[:, None]) + ylp * (.55 * mu[:, None])
    # fades & the score drop-out in act 4 (cut orchestra: handled in score), master glue
    y *= np.minimum(1, t / .6)[:, None] * np.minimum(1, (score.D - t) / 2.6)[:, None] ** 1.0
    # master: high-pass, slow glue compression, loudness target (~ -14 LUFS), soft-limit to -1 dBFS
    y = np.stack([hp(y[:, c], 24, 2) for c in range(2)], axis=1)
    env = np.abs(y).max(axis=1)
    sm = np.convolve(env, np.ones(2400) / 2400, 'same'); gr = 1 / np.maximum(1, (sm / .6) ** .35)
    y = y * gr[:, None]
    rms = np.sqrt((y ** 2).mean()); y = y * (.185 / rms)
    m_, sd = (y[:, 0] + y[:, 1]) / 2, (y[:, 0] - y[:, 1]) / 2; sd = hp(sd, 180, 2) * 1.7; y = np.stack([m_ + sd, m_ - sd], axis=1)   # widen the stereo image
    y = np.tanh(y * 1.0 / .95) * .95
    y = y / max(1.0, np.abs(y).max() / .72)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
    rms = np.sqrt((y ** 2).mean()); print('audio written', path, f'peak {np.abs(y).max():.2f} rms {rms:.3f}')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'out', 'audio.wav'))

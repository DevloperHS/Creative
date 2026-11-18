"""Synthesised instruments / effects. Every function returns a mono float array (or (n,2))."""
import numpy as np
from dsp import *

R = np.random.default_rng(99)
HZ = lambda m: 440.0 * 2 ** ((m - 69) / 12)

def taiko(vel=1.0, size=1.0):
    d = 1.6 * size; t = t_axis(d)
    f = 62 * size ** -.2 * (1 + 1.2 * np.exp(-t / .05))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .38)
    sub = np.sin(2 * np.pi * 41 * t) * np.exp(-t / .55) * .8
    skin = bp(noise(d, int(vel * 1000) + 3), 250, 1800) * np.exp(-t / .045) * 1.6
    ring = np.sin(2 * np.pi * 148 * t) * np.exp(-t / .22) * .35
    return soft((body + sub + skin + ring) * vel, 1.5) * .9

def sub_boom(dur=2.4, f0=95, f1=30, gain=1.0):
    t = t_axis(dur); f = f1 + (f0 - f1) * np.exp(-t / .22)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * .38))
    n = lp(noise(dur, 5), 160, 3) * np.exp(-t / .4) * 3
    return soft((s + n) * gain, 1.3)

def heart(level=1.0):
    d = .45; t = t_axis(d)
    lub = np.sin(2 * np.pi * 56 * t * (1 + .5 * np.exp(-t / .03))) * np.exp(-t / .09)
    click = lp(noise(d, 2), 220) * np.exp(-t / .02) * 2.2
    return (lub + click) * level

def whoosh(dur, f0, f1, level=1.0, q=.5, seed=1):
    n = noise(dur, seed); f = sweep(dur, f0, f1, 1.3)
    out = np.zeros(len(n)); blk = 1024
    for i in range(0, len(n) - blk, blk // 2):
        fc = float(f[i]); seg = n[i:i + blk]
        y = bp(seg, max(60, fc * (1 - q * .5)), fc * (1 + q), 2) * np.hanning(blk)
        out[i:i + blk] += y
    return out * swell(dur, dur * .55, dur * .45) * level * 1.4

def metal_ring(f=1800, dur=2.0, level=1.0, seed=3):
    r = np.random.default_rng(seed); t = t_axis(dur); out = np.zeros(len(t))
    for k, (m, a, tau) in enumerate([(1, 1, 1.1), (2.76, .7, .8), (5.4, .5, .55), (8.93, .35, .35), (13.3, .25, .2), (1.51, .5, .9)]):
        out += a * np.sin(2 * np.pi * f * m * (1 + r.uniform(-.004, .004)) * t + r.uniform(0, 6.28)) * np.exp(-t / (tau * dur / 2))
    click = hp(noise(dur, seed + 7), 3000) * np.exp(-t / .012) * 1.5
    return (out * .4 + click) * level

def chain_clatter(dur=1.0, density=40, level=1.0, seed=4):
    r = np.random.default_rng(seed); out = np.zeros(int(dur * SR))
    for _ in range(int(density * dur)):
        t0 = r.uniform(0, dur * .96); k = int(r.uniform(.02, .08) * SR); f = r.uniform(1800, 5200)
        tt = np.arange(k) / SR; hit = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .012) + .5 * np.sin(2 * np.pi * f * 2.3 * tt) * np.exp(-tt / .008)
        s0 = int(t0 * SR); out[s0:s0 + k] += hit[:len(out) - s0] * r.uniform(.2, 1)
    return out * level

def wood_crack(dur=1.6, level=1.0):
    r = np.random.default_rng(11); out = np.zeros(int(dur * SR))
    for i in range(26):
        t0 = (0 if i == 0 else r.exponential(.18)) * (1 if i else 0); t0 = min(dur * .8, abs(r.normal(0, .25)) if i else 0)
        k = int(r.uniform(.03, .16) * SR); tt = np.arange(k) / SR
        h = bp(r.standard_normal(k), r.uniform(400, 1500), r.uniform(2500, 6000)) * np.exp(-tt / r.uniform(.01, .05)) * r.uniform(.4, 1.5)
        s0 = int(t0 * SR); out[s0:s0 + k] += h[:len(out) - s0]
    t = t_axis(dur); out += np.sin(2 * np.pi * 70 * t * (1 + .6 * np.exp(-t / .05))) * np.exp(-t / .22) * 1.4
    return soft(out * level * .8, 1.3)

def splash(dur=1.2, level=1.0, size=1.0, seed=6):
    n = noise(dur, seed); t = t_axis(dur)
    body = hp(n, 700) * np.exp(-t / (.18 * size + .05)) * 1.3
    low = lp(noise(dur, seed + 1), 400) * np.exp(-t / (.3 * size)) * 2
    tail = bp(noise(dur, seed + 2), 1500, 7000) * np.exp(-t / (.55 * size)) * .35
    # droplet crackle
    drops = np.zeros(len(t)); r = np.random.default_rng(seed)
    for _ in range(int(60 * size)):
        s0 = int(r.exponential(.25 * size + .1) * SR)
        if s0 < len(t) - 400: k = r.integers(60, 300); drops[s0:s0 + k] += r.uniform(.2, 1) * np.exp(-np.arange(k) / (k / 4)) * r.standard_normal(k)
    return (body + low + tail + hp(drops, 2500) * .6) * level

def breath(dur=1.6, inhale=True, level=1.0, seed=8):
    n = noise(dur, seed); e = swell(dur, dur * (.7 if inhale else .15), dur * (.2 if inhale else .8))
    return (bp(n, 300, 2600) * .7 + bp(noise(dur, seed + 1), 2600, 6200) * .25) * e * level * 1.6

def wind(dur, level=1.0, seed=2):
    n = pink(dur, seed); t = t_axis(dur)
    mod = .55 + .45 * np.sin(2 * np.pi * .13 * t + 1) * np.sin(2 * np.pi * .071 * t)
    return (lp(n, 600) * 1.4 + bp(n, 900, 2800) * .35 * mod) * mod * level

def sea(dur, level=1.0, seed=3):
    n = lp(pink(dur, seed), 900) ; t = t_axis(dur)
    sw = .5 + .5 * np.sin(2 * np.pi * .17 * t + 2.0)
    return n * (.3 + .7 * sw ** 2) * level * 1.5

def ash_hiss(dur, level=1.0, seed=9):
    n = hp(noise(dur, seed), 4000) * .4 + bp(noise(dur, seed + 1), 1500, 4000) * .25
    return n * swell(dur, dur * .3, dur * .5) * level

# ---------- voices ----------
VOWELS = {'a': (800, 1200, 2800), 'o': (500, 900, 2700), 'u': (350, 800, 2500), 'e': (550, 1800, 2600), 'i': (300, 2200, 3000)}

def whisper(syl, dur_per=.19, level=1.0, vowels=None, seed=1, gap=.03, f_scale=1.0):
    r = np.random.default_rng(seed); parts = []
    vs = vowels or [r.choice(list(VOWELS)) for _ in syl]
    for i, n_syl in enumerate(syl):
        for j in range(n_syl):
            d = dur_per * r.uniform(.8, 1.25); n = noise(d + .06, seed * 31 + i * 7 + j)
            f1, f2, f3 = [f * f_scale * r.uniform(.94, 1.06) for f in VOWELS[vs[i % len(vs)]]]
            s = formant(n, f1, 160) * 1.4 + formant(n, f2, 260) * 1.0 + formant(n, f3, 500) * .5 + hp(n, 5200) * .12
            e = np.sin(np.linspace(0, np.pi, len(s))) ** 1.4; parts.append(s * e); parts.append(np.zeros(int(gap * SR)))
        parts.append(np.zeros(int(.045 * SR)))
    x = np.concatenate(parts); return x / (np.abs(x).max() + 1e-9) * level

def scream(dur=2.4, f0=520, f1=980, level=1.0, deep=False):
    t = t_axis(dur)
    f = f0 + (f1 - f0) * np.sin(np.linspace(0, np.pi * .85, len(t))) ** .8 + 25 * np.sin(2 * np.pi * 6.2 * t) + R.normal(0, 3, len(t)).cumsum() * .0
    if deep: f = f * .45
    src = osc_saw(f) + .5 * osc_saw(f * 1.004) + .35 * noise(dur, 17) * (.6 + .4 * np.sin(2 * np.pi * 31 * t))
    f1c = 700 + 500 * np.sin(np.linspace(0, np.pi, len(t)))
    out = np.zeros(len(t)); blk = 2048
    for i in range(0, len(t) - blk, blk // 2):
        seg = src[i:i + blk] * np.hanning(blk)
        a = formant(seg, float(f1c[i]), 220) * 1.5 + formant(seg, 1250 + float(f[i]) * .3, 320) + formant(seg, 2800, 600) * .55
        out[i:i + blk] += a
    out = soft(out * 3.0, 2.8) * swell(dur, .12, dur * .55)
    return out / (np.abs(out).max() + 1e-9) * level

def roar(dur=2.8, level=1.0):
    t = t_axis(dur); f = 58 + 22 * np.sin(2 * np.pi * 2.1 * t) + 30 * np.exp(-t / .6)
    g = osc_saw(f) * (1 + .6 * np.sin(2 * np.pi * 27 * t)) + .8 * noise(dur, 5)
    out = lp(soft(g * 2.2, 3), 1400) + formant(g, 260, 160) * 1.4
    return out / (np.abs(out).max() + 1e-9) * swell(dur, .2, 1.0) * level

# ---------- orchestral-ish ----------
def brass(freqs, dur, level=1.0, bright=1.0):
    out = np.zeros(int(dur * SR)); t = t_axis(dur)
    for f in freqs:
        for dt in (-.0035, 0, .0035):
            out += osc_saw(f * (1 + dt) * (1 + .003 * np.sin(2 * np.pi * 5.4 * t + f))) 
    cut = 500 + 2600 * bright * swell(dur, dur * .5, dur * .4)
    y = np.zeros_like(out); blk = 2048
    for i in range(0, len(out) - blk, blk):
        y[i:i + blk] = lp(out[i:i + blk], float(cut[i]), 2)
    return soft(y / (len(freqs) * 3) * 2.2, 1.4) * (swell(dur, min(.18, dur * .2), min(.5, dur * .4))) * level

def strings(freqs, dur, level=1.0, bright=1.0, attack=1.0, release=1.5):
    out = np.zeros(int(dur * SR)); t = t_axis(dur)
    for f in freqs:
        for k, dt in enumerate((-.006, -.002, .002, .006)):
            vib = 1 + .0035 * np.sin(2 * np.pi * (5.1 + k * .3) * t + k)
            out += osc_saw(f * (1 + dt) * vib) * (1 / (1 + k * .1))
    out = lp(out, 2400 * bright + 800, 2) / (len(freqs) * 4)
    return out * swell(dur, attack, release) * level * 1.8

def cello(f, dur, level=1.0):
    t = t_axis(dur); vib = 1 + .006 * np.sin(2 * np.pi * 5.3 * t) * np.minimum(1, t / .8)
    x = osc_saw(f * vib) + .6 * osc_saw(f * vib * 1.002)
    x = lp(x, 1500, 2) + formant(x, 520, 200) * .8 + formant(x, 1100, 300) * .5
    bow = noise(dur, 13); x += lp(bp(bow, 800, 3000), 3000) * .03
    return x / 2.4 * swell(dur, .35, dur * .35) * level

def piano(f, dur=3.0, level=1.0, vel=.8):
    t = t_axis(dur); out = np.zeros(len(t))
    for h in range(1, 9):
        fh = f * h * np.sqrt(1 + .0004 * h * h)
        if fh > 9000: break
        out += np.sin(2 * np.pi * fh * t + h) * (1 / h ** 1.15) * np.exp(-t / (dur * .45 / (1 + .4 * (h - 1))))
    ham = bp(noise(dur, int(f)), 1200, 4500) * np.exp(-t / .012) * .25 * vel
    return (out + ham) * level * (.55 + vel * .6) * .8

def choir(freqs, dur, level=1.0, vowel='a', attack=2.0, release=2.0):
    out = np.zeros(int(dur * SR)); t = t_axis(dur); F = VOWELS[vowel]
    for f in freqs:
        for k, dt in enumerate((-.007, -.003, .0, .003, .007)):
            v = 1 + .004 * np.sin(2 * np.pi * (5.0 + k * .37) * t + k * 1.3)
            src = osc_saw(f * (1 + dt) * v) + .15 * noise(dur, 70 + k)
            out += formant(src, F[0], 150) * 1.6 + formant(src, F[1], 220) * 1.0 + formant(src, F[2], 450) * .45
    return out / (len(freqs) * 5) * swell(dur, attack, release) * level * 2.2

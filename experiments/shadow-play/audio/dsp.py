"""Low-level DSP helpers: noise, filters, envelopes, reverb, panning."""
import numpy as np
from scipy import signal

SR = 48000
_rng = np.random.default_rng(1234)

def t_axis(dur):
    return np.arange(int(dur * SR)) / SR

def noise(dur, seed=None):
    r = np.random.default_rng(seed) if seed is not None else _rng
    return r.standard_normal(int(dur * SR))

def pink(dur, seed=None):
    n = noise(dur, seed)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]; a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, n) * 4

def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, min(f, SR * .45), 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)
def bp(x, f0, f1, order=2):
    return signal.sosfilt(signal.butter(order, [f0, min(f1, SR * .45)], 'band', fs=SR, output='sos'), x)
def formant(x, f, bw):
    return bp(x, max(40, f - bw / 2), f + bw / 2, 2)

def exp_env(dur, tau, attack=0.002):
    t = t_axis(dur); e = np.exp(-t / tau)
    a = int(attack * SR)
    if a > 1: e[:a] *= np.linspace(0, 1, a)
    return e
def swell(dur, up, down):
    n = int(dur * SR); e = np.ones(n)
    u, d = int(up * SR), int(down * SR)
    if u > 0: e[:u] = np.sin(np.linspace(0, np.pi / 2, u)) ** 2
    if d > 0: e[-d:] *= np.cos(np.linspace(0, np.pi / 2, d)) ** 2
    return e
def sweep(dur, f0, f1, curve=1.0):
    u = np.linspace(0, 1, int(dur * SR)) ** curve
    return f0 + (f1 - f0) * u

def osc_saw(freq, dur=None):
    f = np.asarray(freq) if np.ndim(freq) else np.full(int(dur * SR), float(freq))
    ph = np.cumsum(f) / SR
    return 2 * (ph - np.floor(ph + .5))
def osc_sine(freq, dur=None):
    f = np.asarray(freq) if np.ndim(freq) else np.full(int(dur * SR), float(freq))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

def soft(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)

def pan(x, p):
    """equal-power pan, p in [-1,1] -> (n,2)"""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)

def make_ir(tail, pre=0.012, seed=7, bright=0.6):
    n = int(tail * SR); r = np.random.default_rng(seed)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for c in range(2):
        x = r.standard_normal(n) * np.exp(-t / (tail / 5.5))
        x = lp(x, 9000 * bright + 2500)
        # gentle high damping over time
        x = x * (0.5 + 0.5 * np.exp(-t / (tail / 2)))
        d = int(pre * SR) + c * 37
        out[d:, c] = x[:n - d]
    out /= np.sqrt((out ** 2).sum(axis=0, keepdims=True)) + 1e-9
    return out

def reverb(x2, tail=2.8, seed=7, bright=.6):
    ir = make_ir(tail, seed=seed, bright=bright)
    y = np.stack([signal.fftconvolve(x2[:, c], ir[:, c])[:len(x2)] for c in range(2)], axis=1)
    return y

class Bus:
    """Stereo mix buffer with dry and reverb sends."""
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.dry = np.zeros((self.n, 2)); self.wet = np.zeros((self.n, 2)); self.wet2 = np.zeros((self.n, 2))
    def add(self, sig, t0, gain=1.0, p=0.0, send=0.0, send2=0.0):
        """sig mono (n,) or stereo (n,2) placed at t0 seconds."""
        s0 = int(t0 * SR)
        if s0 >= self.n: return
        if sig.ndim == 1: sig = pan(sig, p)
        e = min(self.n, s0 + len(sig)); k = e - s0
        if k <= 0: return
        sg = sig[:k] * gain
        self.dry[s0:e] += sg
        if send: self.wet[s0:e] += sg * send
        if send2: self.wet2[s0:e] += sg * send2
    def mix(self, long_tail=3.4, short_tail=1.1):
        return self.dry + reverb(self.wet, long_tail, 7) + reverb(self.wet2, short_tail, 11, .9)

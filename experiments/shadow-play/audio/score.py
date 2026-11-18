"""The cue sheet: places every sound on the shared timeline (shared/events.json)."""
import json, os
import numpy as np
from dsp import *
from instruments import *

HERE = os.path.dirname(os.path.abspath(__file__))
J = json.load(open(os.path.join(HERE, '..', 'shared', 'events.json')))
EV = {}
for e in J['events']: EV.setdefault(e['name'], []).append(e)
T = lambda n, i=0: EV[n][i]['t']
D = 50.0
R = np.random.default_rng(2026)

def bpm_at(t):
    k = J['bpm']
    for (t0, b0), (t1, b1) in zip(k, k[1:]):
        if t0 <= t <= t1: u = (t - t0) / (t1 - t0); return b0 + (b1 - b0) * (u * u * (3 - 2 * u))
    return k[-1][1]

def lvl(t, keys):
    ts, vs = zip(*keys); return float(np.interp(t, ts, vs))

def heartbeat(bus):
    t = 0.0; ph = 0.0; dt = 1 / 200
    while t < D - 1:
        prev = ph; ph += bpm_at(t) / 60 * dt; t += dt
        if int(ph) > int(prev):
            per = 60 / bpm_at(t); g = lvl(t, [(0, .5), (12.5, .85), (13.5, 1.0), (26, 1.1), (27.4, 1.0), (33, 1.25), (38.5, 1.2), (39.4, .8), (44, .45), (47, .22), (50, .1)])
            bus.add(heart(1.0), t, g * .8, 0, send=.12)
            bus.add(heart(.62), t + min(.28, per * .26), g * .55, 0, send=.1)

def bed(bus):
    bus.add(wind(D, 1.0), 0, .26 * 1.0, 0, send=.1)
    w = wind(14, 1.0, seed=8) * swell(14, 2, 4)
    sea_env = np.ones(int(D * SR)); t = t_axis(D)
    k = [(0, .0), (.5, .35), (13, .35), (27.3, .3), (27.5, .15), (39, .2), (42, .1), (46, .25), (50, .15)]
    env = np.interp(t, *zip(*k)); bus.add(sea(D, 1.0) * env, 0, .5, 0, send=.08)
    # dark drone that follows the emotional arc
    t = t_axis(D); drone = np.zeros(len(t))
    for f in (36.7, 55.0, 73.4):
        drone += osc_saw(f * (1 + .002 * np.sin(2 * np.pi * .1 * t))) * .35
    drone = lp(drone, 420)
    env = np.interp(t, [0, 3, 13, 27.3, 29, 38.5, 39.4, 41], [0, .5, .7, .9, .35, .9, .0, 0])
    bus.add(drone * env, 0, .55, 0, send=.2)

def shot1(bus):
    # whisper in the smoke
    bus.add(whisper([1, 1, 2], .19, 1.0, seed=3), T('whisper', 0) + .2, .8, -.2, send=.5, send2=.1)
    bus.add(whisper([1, 1, 2], .2, .6, seed=5, f_scale=.9), T('whisper', 0) + .55, .5, .35, send=.7)
    # emergence + dive
    dv = T('dive'); bus.add(whoosh(1.7, 160, 1800, 1.0, seed=2), dv, .9, .55, send=.25)
    bus.add(brass([36.7, 55, 73.4, 87.3], 2.3, 1.0), dv - .1, .55, 0, send=.3)
    for i, tt in enumerate(np.linspace(dv + .1, dv + 1.5, 7)): bus.add(taiko(.4 + i * .1, 1.1), tt, .5 + i * .06, -.2 + i * .07, send=.25)
    bus.add(whoosh(.7, 2500, 400, 1.0, seed=6), 3.7, .9, -.3, send=.2)
    # roll (cloth/water)
    bus.add(splash(.8, .6, .5, 31), T('roll'), .5, 0, send=.15)
    # palisade smash
    sm = T('palisade_smash'); bus.add(wood_crack(1.8, 1.0), sm, 1.2, -.5, send=.35); bus.add(sub_boom(2.2, 100, 32), sm, 1.2, 0, send=.25)
    bus.add(taiko(1.2, 1.3), sm, 1.0, 0, send=.3); bus.add(brass([36.7, 55, 73.4], .9, 1.2), sm, .5, 0, send=.3)
    # chains + clashes
    cs = T('chain_swing'); bus.add(chain_clatter(1.6, 90, .9, 3), cs - .2, .5, .2, send=.3); bus.add(whoosh(.9, 400, 2400, 1, seed=9), cs, .5, .4)
    for i, e in enumerate(EV['clash'][:4]):
        m = e.get('mag', .6); bus.add(metal_ring(1700 + 220 * i, 2.2, 1.0, 40 + i), e['t'], .5 + m * .35, -.1 + i * .06, send=.45)
        bus.add(taiko(.6 + m * .4, 1.0 + m * .2), e['t'], .8 + m * .3, 0, send=.3); bus.add(brass([36.7, 55, 73.4, 92.5], .7, 1.1), e['t'], .35 * m + .2, 0, send=.3)
        bus.add(chain_clatter(.7, 70, .8, 10 + i), e['t'] + .05, .4, .3 - i * .1, send=.3)
        bus.add(whoosh(.35, 1800, 700, 1, seed=20 + i), e['t'] - .28, .5, -.2 + i * .15)
        bus.add(splash(.6, .5, .4, 50 + i), e['t'] + .1, .35, 0.2, send=.2)
    # build to the stab
    bus.add(whoosh(1.7, 200, 4200, 1, seed=15), 10.2, .8, 0, send=.3)
    bus.add(strings([73.4, 110, 146.8, 174.6], 1.8, 1.0, 1.0, 1.4, .05), 10.0, .7, 0, send=.4)
    for i, tt in enumerate(np.linspace(10.3, 11.6, 9)): bus.add(taiko(.35 + i * .07, .8), tt, .5 + i * .04, 0, send=.2)
    st = T('stab'); bus.add(metal_ring(2300, 2.8, 1.0, 77), st - .03, 1.0, 0, send=.6); bus.add(sub_boom(3.2, 110, 28), st, 1.6, 0, send=.3)
    bus.add(taiko(1.2, 1.5), st, 1.3, 0, send=.4); bus.add(splash(1.3, .8, .8, 8), st, .35, 0, send=.3)
    bus.add(wood_crack(1.0, .6), st, .3, .4)   # bone cracking
    # embers crackling
    cr = np.zeros(int(2.8 * SR)); r = np.random.default_rng(4)
    for _ in range(260):
        s0 = int(r.exponential(.9) * SR)
        if s0 < len(cr) - 200: k = int(r.uniform(.002, .012) * SR); cr[s0:s0 + k] += r.standard_normal(k) * r.uniform(.2, 1) * np.exp(-np.arange(k) / (k / 4))
    bus.add(hp(cr, 1800), st + .05, .9, 0, send=.2)
    # choir hit on the impact
    bus.add(choir([73.4, 110, 146.8], 3.0, 1.0, 'o', .05, 2.0), st, .5, 0, send=.7)

def shot2(bus):
    sc = T('scream'); bus.add(scream(2.9, 480, 1050, 1.0), sc, .95, 0, send=.5, send2=.1)
    bus.add(scream(2.5, 520, 960, .6, deep=True), sc + .05, .8, 0, send=.4)
    bl = T('blast'); bus.add(sub_boom(3.0, 120, 26), bl, 1.7, 0, send=.3); bus.add(taiko(1.3, 1.6), bl, 1.3, 0, send=.3)
    bus.add(whoosh(1.4, 3500, 250, 1, seed=31), bl, .9, 0, send=.3); bus.add(splash(1.5, 1.0, 1.1, 18), bl + .15, .55, .2, send=.25)
    bus.add(brass([36.7, 55, 73.4, 110], 2.4, 1.2), bl, .65, 0, send=.4)
    # skid
    bus.add(splash(1.6, .8, .9, 22), 13.6, .5, .4, send=.2); bus.add(whoosh(1.4, 500, 120, 1, seed=36), 13.7, .6, .3)
    bus.add(wind(5, 1, seed=44) * swell(5, 1, 2), 14.5, .22, 0, send=.2)
    # ink / rising water
    ink = T('ink'); bus.add(lp(pink(3.4, 5), 280) * swell(3.4, 1.5, 1.0) * 2.2, ink, .45, 0, send=.3)
    bus.add(bp(noise(3.0, 12), 300, 1200) * swell(3, 1.2, 1.2) * .5, ink + .2, .22, .3, send=.3)
    # whisper pile-up
    w1, w2 = T('whisper', 1), T('whisper', 2)
    for i, (dly, pn, sc_, g) in enumerate([(0, -.4, 1.0, .8), (.25, .5, .92, .6), (.55, -.7, 1.05, .5), (.9, .8, .88, .45), (1.2, 0, .8, .4)]):
        bus.add(whisper([1, 1, 1, 1], .17, 1.0, seed=60 + i, f_scale=sc_), w1 + dly, g * 1.0, pn, send=.6, send2=.1)
    for i, (dly, pn, sc_, g) in enumerate([(0, .3, 1.0, .85), (.3, -.5, .9, .65), (.6, .7, 1.05, .55), (1.0, -.8, .85, .5), (1.5, .1, .95, .45), (1.9, -.2, .8, .4)]):
        bus.add(whisper([3, 1, 2, 1], .15, 1.0, seed=80 + i, f_scale=sc_), w2 + dly, g, pn, send=.6, send2=.1)
    # tension strings + whoosh into portrait
    bus.add(strings([73.4, 110, 164.8, 220], 3.0, 1.0, 1.2, 1.8, .1), 16.5, .5, 0, send=.4)
    bus.add(whoosh(.8, 300, 2800, 1, seed=41), 17.35, .8, -.4); bus.add(whoosh(.8, 2800, 300, 1, seed=42), 19.0, .8, .4)
    # charge: driving taiko + splashes
    ch = T('charge'); beats = np.arange(ch, 21.25, .125)
    for i, tt in enumerate(beats): bus.add(taiko(.45 + .5 * i / len(beats), .8 + .2 * (i % 4 == 0)), tt, .35 + .6 * i / len(beats) + (.2 if i % 4 == 0 else 0), 0, send=.2)
    for tt in np.arange(ch + .1, 21.25, .21): bus.add(splash(.5, .5, .3, int(tt * 100) % 100), tt, .4, R.uniform(-.4, .4), send=.15)
    bus.add(brass([36.7, 55, 73.4, 110, 146.8], 2.0, 1.2), ch, .75, 0, send=.35)
    bus.add(whoosh(2.0, 150, 3800, 1, seed=45), ch, .8, 0, send=.3)
    # mid-air clash + ash burst
    c3 = EV['clash'][4]['t']; bus.add(metal_ring(1400, 3.0, 1.0, 91), c3, .85, 0, send=.6); bus.add(sub_boom(3.2, 110, 26), c3, 1.7, 0, send=.3); bus.add(taiko(1.3, 1.6), c3, 1.4, 0, send=.4)
    bus.add(brass([36.7, 55, 73.4, 92.5, 110], 1.6, 1.3), c3, .8, 0, send=.4)
    ab = T('ash_burst'); bus.add(ash_hiss(2.8, 1.0, 33), ab, .9, 0, send=.4); bus.add(whoosh(1.4, 4000, 200, 1, seed=55), ab, .7, 0, send=.3)
    bus.add(scream(1.6, 600, 300, .5), ab, .5, 0, send=.6)
    # copies circling: swirling chains & whispers panned in a rotation
    cp = T('copies'); n = 14
    for i in range(n):
        tt = cp + i * .17; pn = np.sin(i * 1.1)
        bus.add(chain_clatter(.5, 60, .8, 200 + i), tt, .3, pn, send=.3)
        bus.add(whisper([1, 1, 2][i % 3:] or [1], .15, 1.0, seed=300 + i, f_scale=.9 + .02 * i), tt + .05, .45, -pn, send=.7)
    bus.add(whoosh(2.4, 300, 1500, 1, seed=57), cp, .55, 0, send=.3)
    # ball forming
    bf = T('ball_form'); bus.add(whoosh(2.0, 120, 3000, 1, seed=58), bf, .9, 0, send=.3); bus.add(strings([36.7, 55, 73.4, 110, 146.8], 3.2, .8, 1.0, 2.0, .05), bf - .4, .7, 0, send=.4)
    bus.add(brass([36.7, 55, 73.4, 110], 2.6, 1.0), bf, .7, 0, send=.4)
    for i, tt in enumerate(np.linspace(bf + .2, bf + 2.0, 8)): bus.add(taiko(.4 + i * .08, 1.0 + i * .05), tt, .5 + i * .07, 0, send=.3)
    bus.add(whisper([1, 1, 1], .26, 1.0, seed=111, f_scale=.8), T('whisper', 3) + .1, .9, 0, send=.6)

def shot3(bus):
    bh = T('ball_hit')
    bus.add(sub_boom(4.2, 100, 24), bh, 2.0, 0, send=.3); bus.add(taiko(1.3, 1.8), bh, 1.4, 0, send=.4); bus.add(taiko(1.0, 1.4), bh + .02, 1.0, 0, send=.3)
    bus.add(splash(3.2, 1.0, 1.9, 61), bh, 1.2, 0, send=.4); bus.add(splash(2.4, 1.0, 1.4, 62), bh + .08, .9, -.3, send=.3)
    bus.add(whoosh(1.6, 5000, 150, 1, seed=64), bh, .9, 0, send=.3)
    bus.add(brass([36.7, 55, 73.4, 110, 146.8], 2.4, 1.3), bh, .8, 0, send=.4)
    # tinnitus ring + dark muffling after the blast (dry ring only)
    t = t_axis(5.0); ring = np.sin(2 * np.pi * 7400 * t) * np.exp(-t / 1.8) * .1 + np.sin(2 * np.pi * 5200 * t) * np.exp(-t / 1.5) * .06
    bus.add(ring, bh + .2, 1.0, 0, send=.1)
    # lowest point: whispers narrow to a single breath
    for i, tt in enumerate([28.6, 29.3, 30.0, 30.9]):
        bus.add(whisper([1, 1, 1, 1], .2, 1.0, seed=120 + i, f_scale=.9), tt, .5 - i * .08, (-1) ** i * .6, send=.6)
    bus.add(whisper([1, 1, 1], .35, 1.0, seed=130, f_scale=.85), 31.2, .55, 0, send=.5)
    br = T('breath'); bus.add(breath(2.3, True, 1.0, 21), br, .95, 0, send=.3)
    bus.add(sub_boom(2.0, 55, 28), br + 1.9, .6, 0)          # the held breath: one slow beat
    # rise
    bus.add(strings([73.4, 110, 146.8, 220], 2.0, 1.0, .9, 1.4, .3), 33.3, .5, 0, send=.4)
    bus.add(whoosh(.9, 300, 3000, 1, seed=70), 33.6, .6, 0, send=.3)
    lp_ = T('leap'); bus.add(splash(1.4, .9, 1.0, 71), lp_ - .05, .8, -.2, send=.3); bus.add(whoosh(1.4, 400, 3600, 1, seed=72), lp_, .7, .2, send=.25)
    for i, tt in enumerate(np.linspace(lp_, 35.45, 6)): bus.add(taiko(.5 + i * .09, 1.0), tt, .55 + i * .07, 0, send=.3)
    bus.add(brass([36.7, 55, 73.4, 92.5, 110], 1.6, 1.0), lp_ + .1, .7, 0, send=.4)
    sl = T('slash'); bus.add(whoosh(.35, 6000, 800, 1, seed=73), sl - .12, 1.0, .1); bus.add(metal_ring(2800, 2.0, 1.0, 74), sl, .8, 0, send=.5)
    bus.add(sub_boom(2.8, 110, 28), sl, 1.5, 0, send=.3); bus.add(taiko(1.3, 1.6), sl, 1.3, 0, send=.3)
    # vortex
    vx = T('vortex'); bus.add(whoosh(2.0, 200, 5000, 1, seed=75, q=.8), vx, .9, 0, send=.4); bus.add(scream(2.0, 300, 900, .6), vx + .1, .5, 0, send=.6)
    bus.add(ash_hiss(2.0, 1.0, 76), vx, .6, 0, send=.3)
    # skull lunge + red mist
    lg = T('lunge'); bus.add(scream(2.0, 700, 1700, 1.0), lg, .95, 0, send=.5); bus.add(whoosh(1.2, 300, 3000, 1, seed=77), lg, .8, 0, send=.3)
    bus.add(strings([73.4, 110, 146.8, 185, 220], 2.2, 1.3, 1.0, 1.6, .05), 37.0, .75, 0, send=.4); bus.add(brass([36.7, 55, 73.4, 110], 2.0, 1.3), 37.4, .8, 0, send=.4)
    for i, tt in enumerate(np.linspace(37.2, 38.6, 10)): bus.add(taiko(.5 + i * .07, 1.1), tt, .6 + i * .05, 0, send=.3)
    rf = T('red_flood'); bus.add(sub_boom(3.0, 90, 26), rf + .1, 1.5, 0, send=.3); bus.add(roar(2.8, 1.0), rf + .1, .8, 0, send=.5)

def shot4(bus):
    dm = T('demon')
    # the score drops out: only the thing itself — its roar, thundering steps, rumble
    bus.add(roar(3.0, 1.0), dm - .1, 1.0, 0, send=.5)
    tt = dm + .1; gap = .5; i = 0
    while tt < dm + 3.0:
        bus.add(sub_boom(1.2, 80, 28), tt, .9 + i * .04, 0, send=.25); bus.add(splash(.9, .7, 1.1, 300 + i), tt, .4 + i * .02, R.uniform(-.3, .3), send=.2)
        tt += gap; gap = max(.2, gap * .88); i += 1
    bus.add(lp(pink(3.4, 9), 220) * swell(3.4, 1.2, 1.2) * 2.5, dm, .5, 0, send=.2)
    # hero breathes
    bus.add(breath(1.8, True, 1.0, 40), 41.0, .6, 0, send=.3); bus.add(breath(2.0, False, 1.0, 41), 42.7, .6, 0, send=.3)
    # whispers fading one by one
    for i, tt in enumerate([40.2, 41.0, 41.9, 42.8, 43.6]):
        bus.add(whisper([2, 1, 1][: 3 - i % 2], .22 + i * .03, 1.0, seed=400 + i, f_scale=.9), tt, .5 * (1 - i / 5.5), (-1) ** i * (.7 - i * .1), send=.7)
    # crumble + ash lift
    cb = T('crumble'); bus.add(chain_clatter(1.8, 110, 1.0, 500), cb, .6, 0, send=.35); bus.add(ash_hiss(3.0, 1.0, 501) * 1.2, cb, .5, 0, send=.4)
    bus.add(sub_boom(2.6, 60, 24), cb, .9, 0, send=.3)
    # cello + piano, then strings and choir as the light grows
    sb = T('sunbreak'); mid = lambda m: HZ(m)
    bus.add(cello(HZ(38), 6.0, 1.0), 44.0, .6, -.15, send=.5)   # D2
    for i, m in enumerate([62, 66, 69, 74, 69, 66, 62, 66, 69, 74, 78, 74]):
        bus.add(piano(HZ(m), 3.4, 1.0, .5 + .02 * i), 44.4 + i * .52, .5, -.2 + .04 * i, send=.5)
    bus.add(strings([HZ(50), HZ(57), HZ(62), HZ(66)], 6.2, 1.0, .9, 3.0, 2.5), 44.6, .55, 0, send=.55)
    bus.add(strings([HZ(62), HZ(69), HZ(74), HZ(78)], 5.0, 1.1, 1.0, 2.8, 2.0), 46.0, .55, .1, send=.55)
    bus.add(choir([HZ(62), HZ(66), HZ(69), HZ(74)], 4.6, 1.0, 'a', 2.2, 1.5), 45.8, .55, 0, send=.7)
    bus.add(choir([HZ(74), HZ(78), HZ(81)], 3.6, 1.0, 'o', 1.8, 1.4), 46.8, .38, 0, send=.7)
    bus.add(sub_boom(4.0, 36, 30), 46.4, .3, 0)
    # sheathing + footsteps in water, soft
    sh = T('sheathe'); bus.add(metal_ring(2600, 1.4, .5, 600) * .4, sh, .35, .2, send=.4)
    for i, tt in enumerate(np.arange(T('walk'), 50.0, .62)): bus.add(splash(.55, .4, .25, 700 + i), tt, .22, R.uniform(-.2, .2), send=.4)
    # bloom of the fade
    bus.add(strings([HZ(62), HZ(66), HZ(69), HZ(74)], 3.4, 1.2, 1.2, 2.4, .3), 47.8, .5, 0, send=.6)

def build():
    bus = Bus(D + 4)
    heartbeat(bus); bed(bus); shot1(bus); shot2(bus); shot3(bus); shot4(bus)
    # whispers in the final act are intentionally absent from the music bed
    return bus

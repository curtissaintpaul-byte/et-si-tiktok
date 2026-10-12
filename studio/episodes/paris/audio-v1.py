"""Bande-son de l'épisode Paris (la glace fond) : ville, puis le temps qui passe et l'eau qui monte. Musique mélancolique (mi mineur)."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=21); t = S.t; N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
RISE, ZI, ZO, END = T['rise'], T['zoomIn'], T['zoomOut'], T['endCard']
city = 1 - S.ramp(RISE - 0.5, RISE + 2.5)

# la ville vue d'en haut : rumeur de circulation, klaxons lointains, pigeons, vent sur le toit
amb.put(lp(S.pink(), 500) * city, 0, 0, 0.10)
for _ in range(6):
    tt, n = S.burst(0.35); f = rng.uniform(380, 520)
    amb.put(lp((np.sign(np.sin(2 * np.pi * f * tt)) * 0.5 + np.sin(2 * np.pi * f * 1.5 * tt)) * np.clip(tt / 0.02, 0, 1) * np.clip((0.35 - tt) / 0.05, 0, 1), 1800), rng.uniform(-0.8, 0.8), rng.uniform(0.5, RISE - 1), 0.012)
for _ in range(10):
    tt, n = S.burst(0.5); coo = np.sin(2 * np.pi * (300 + 60 * np.sin(tt * 12)) * tt) * np.sin(np.pi * tt / 0.5) ** 2
    amb.put(coo, rng.uniform(-0.6, 0.6), rng.uniform(0.3, RISE - 1), 0.02)
wind = bp(S.pink(), 200, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t)); amb.put(wind, -0.3, 0, 0.05)
# des cloches au loin (Paris) au tout début
for k in range(5):
    tt, n = S.burst(3.0); f = 330
    bell = sum(np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * d) * a for r, d, a in [(1, 0.9, 1), (2.0, 1.4, 0.5), (2.4, 1.8, 0.35), (3.0, 2.4, 0.25), (4.2, 3.0, 0.15)])
    amb.put(lp(bell, 3500), -0.5, 1.0 + k * 1.6, 0.02)
# le temps qui passe : un grand souffle, puis l'eau qui monte (clapotis de plus en plus large)
sfx.put(S.whoosh(3.0), 0, RISE - 0.6, 0.12)
water = S.ramp(RISE + 2, 30) * (1 - 0.4 * S.window(ZI, ZO + 1, 1.0, 1.0))
lap = bp(S.pink(), 150, 1500) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 0.35 * t))) * water
sfx.put(lap, 0.1, 0, 0.16)
for x in np.arange(RISE + 6, END - 1, 1.9):
    tt, n = S.burst(2.2); wave = bp(S.noise(n), 200, 2200) * np.sin(np.pi * tt / 2.2) ** 2
    sfx.put(wave, rng.uniform(-0.6, 0.6), x + rng.uniform(0, 0.6), 0.06 * (0.3 + 0.7 * min(1, (x - RISE) / 15)))
deep = lp(S.pink(), 90) * S.window(RISE, END - 0.5, 3, 3); sfx.put(deep, 0, 0, 0.35)
gulls = []
for k in range(5):
    s0 = rng.uniform(32, 52); pan = rng.uniform(-0.8, 0.8)
    for j in range(3):
        tt, n = S.burst(0.35); f = 1100 + 800 * np.sin(np.pi * tt / 0.35)
        sfx.put(bp(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.35) ** 1.5, 700, 4000), pan, s0 + j * 0.45, 0.02)
sfx.put(S.whoosh(1.5), 0, ZI, 0.08); sfx.put(S.whoosh(1.3), 0, ZO, 0.07)
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade)

# musique : piano (cordes pincées douces) + nappe de cordes, mi mineur, lente
CH = {'Em': [40, 47, 52, 55, 59], 'C': [36, 43, 48, 52, 55], 'G': [43, 50, 55, 59, 62], 'D': [38, 45, 50, 54, 57], 'Am': [45, 52, 57, 60, 64], 'B': [47, 54, 59, 63, 66]}
def chords(prog, voice, gain, bright=0.25, fin=1.0, fout=1.0):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.5, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, 6.8, 'Em'), (6.8, 13.6, 'C'), (13.6, 20.4, 'G'), (20.4, 27.2, 'D'), (27.2, 34, 'Em'), (34, 40, 'C'), (40, 45.6, 'Am'), (45.6, 50.6, 'B'), (50.6, 55, 'Em')]
pads = chords(prog, 'pad', 0.04); pads.mul(0.6 + 0.4 * S.ramp(RISE, 40)); mus.add(pads)
cho = chords([(34, 40, 'C'), (40, 45.6, 'Am'), (45.6, 50.6, 'B')], 'choir', 0.04, fin=1.6); mus.add(cho)
melody = [(0.6, 71), (1.8, 74), (3.0, 76), (4.6, 74), (6.0, 71), (7.4, 72), (8.6, 71), (9.8, 67), (11.4, 64), (13.8, 67), (15.0, 71), (16.2, 74), (18.0, 72), (20.6, 69), (21.8, 71), (23.0, 72), (24.6, 74),
          (27.4, 76), (28.6, 79), (29.8, 78), (31.4, 76), (34.2, 72), (35.4, 76), (36.6, 79), (38.2, 81), (40.2, 81), (41.4, 79), (42.6, 76), (44.2, 72), (45.8, 75), (47.4, 78), (49.0, 71), (50.8, 76), (52.4, 71)]
for x, m in melody: mus.put(S.pluck(hz(m), 3.0, 1.6), rng.uniform(-0.25, 0.25), x, 0.055)
for x in np.arange(RISE, 45, 0.85): mus.put(S.pluck(hz(40), 1.5, 3.0), 0, x, 0.05)
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['Em']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([71, 67, 64]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.6, 0.05)
mus_v = S.verb(mus, wet=0.5, secs=3.5)
amb_v = S.verb(amb, wet=0.2, secs=1.5)
master([(sfx, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

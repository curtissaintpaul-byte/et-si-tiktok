"""Bande-son « Bételgeuse » : nuit d'hiver en Provence (vent, chouette), l'alerte des neutrinos, l'éclat (silencieux dans l'espace :
seule la musique s'ouvre), le jour (oiseaux), puis l'extinction lente. Musique : la majeur, lumineuse et lente."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=1987); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
NEU, BOOM, DAY, ANI, FADE, END = T['neutrinos'], T['boom'], T['day'], T['animals'], T['fade'], T['endCard']
night = 1 - S.window(DAY - 0.6, ANI + 0.6, 1.0, 1.0)
wind = bp(S.pink(), 120, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t)); amb.put(wind, -0.2, 0, 0.07)
for at in [2.0, 2.9, 9.5, 10.4, 29.5, 30.4, 45.0, 45.9, 55.2]:   # une chouette hulotte au loin
    tt, n = S.burst(0.9); f = 420 * (1 + 0.04 * np.sin(np.pi * tt / 0.9)); hoot = np.sin(2 * np.pi * np.cumsum(np.full(n, f)) / SR) * np.sin(np.pi * tt / 0.9) ** 2 * (1 + 0.3 * np.sin(2 * np.pi * 7 * tt))
    far.put(lp(hoot, 900) * (night[min(int(at * SR), N - 1)] > 0.5), -0.5, at, 0.03)
# l'alerte des détecteurs : trois bips doux
for k in range(6):
    tt, n = S.burst(0.18); beep = np.sin(2 * np.pi * 1320 * tt) * np.sin(np.pi * tt / 0.18)
    sfx.put(beep, 0.3, NEU + 0.3 + k * 0.45 + (k // 3) * 0.6, 0.02)
# l'éclat : un souffle (cinéma), pas d'explosion — dans l'espace, il n'y a pas de son
sfx.put(S.whoosh(2.5), 0, BOOM - 1.2, 0.08)
# le jour : quelques oiseaux
for _ in range(14):
    at = rng.uniform(DAY, ANI - 0.6); tt, n = S.burst(0.25); f = rng.uniform(2500, 3800) * (1 + 0.15 * np.sin(2 * np.pi * 14 * tt))
    amb.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.25) ** 2, rng.uniform(-0.8, 0.8), at, 0.012)
# les oiseaux migrateurs perdus : petits cris dans la nuit
for _ in range(16):
    tt, n = S.burst(0.12); f = rng.uniform(3500, 6000) * (1 - 0.3 * tt / 0.12)
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.12), rng.uniform(-0.8, 0.8), ANI - 0.8 + rng.uniform(0, 5), 0.012)
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)
# musique
CH = {'A': [45, 52, 57, 61, 64], 'F#m': [42, 49, 54, 57, 61], 'D': [38, 45, 50, 54, 57], 'E': [40, 47, 52, 56, 59], 'Bm': [35, 42, 47, 50, 54], 'C#m': [37, 44, 49, 52, 56]}
def chords(prog, voice, gain, bright=0.25, fin=1.2, fout=1.2):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.5, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.5, 0.5), 0, gain)
    return b
prog = [(0, 8.4, 'F#m'), (8.4, 13.4, 'D'), (13.4, NEU, 'Bm'), (NEU, BOOM, 'C#m'), (BOOM, 28.4, 'A'), (28.4, DAY, 'E'), (DAY, ANI, 'D'), (ANI, 43.4, 'A'), (43.4, 48.4, 'F#m'), (48.4, FADE, 'D'), (FADE, END, 'Bm')]
p = chords(prog, 'pad', 0.045); mus.add(p)
mus.add(chords([(BOOM, 28.4, 'A'), (28.4, DAY, 'E'), (DAY, ANI, 'D')], 'choir', 0.05, fin=0.4))
for x, m in [(0.6, 73), (2.4, 76), (4.2, 78), (6.0, 76), (8.6, 74), (10.4, 78), (12.2, 81), (13.6, 78), (15.4, 74), (17.2, 71), (NEU + 0.2, 73), (NEU + 1.8, 76), (NEU + 3.2, 80),
             (43.6, 76), (45.4, 73), (47.2, 69), (48.6, 74), (50.4, 78), (52.2, 81), (53.6, 78), (55.4, 74), (57.2, 71)]:
    mus.put(S.pluck(hz(m), 3.0, 1.4), rng.uniform(-0.3, 0.3), x, 0.05)
mus.put(S.hit(hz(33), 3.0, 1.0), 0, BOOM, 0.22)
shimmer = sum(np.sin(2 * np.pi * hz(m) * t + 2 * np.sin(2 * np.pi * 0.11 * t + m)) for m in [81, 85, 88]) * S.window(BOOM, FADE + 2, 0.4, 3)
mus.put(shimmer, 0, 0, 0.006)
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['A']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([76, 73, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.55, secs=4.0); amb_v = S.verb(amb, wet=0.25, secs=1.5); far_v = S.verb(far, wet=0.6, secs=3.0)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

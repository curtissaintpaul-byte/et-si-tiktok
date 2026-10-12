"""Bande-son « tempête solaire » : nuit de village, la fontaine, le grésillement électrique qui monte, le claquement,
puis le silence de la panne. Musique : mi mineur, éthérée (les aurores), qui se tend avec l'orage."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=59); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
DARK, GIC, FRY, SP1, BIRDS, END = T['dark'], T['gic'], T['fry'], T['sparks1'], T['birds'], T['endCard']

# --- la nuit : grillons, la fontaine (qui s'arrête avec la pompe), des voix sur la place
def cricket(f0, rate, pulses, gain, pan, start, stop):
    x = start + rng.uniform(0, 0.4)
    while x < stop:
        for k in range(pulses):
            tt, n = S.burst(0.018); amb.put(np.sin(2 * np.pi * (f0 + rng.uniform(-30, 30)) * tt) * np.sin(np.pi * tt / 0.018) ** 2, pan, x + k * 0.034, gain)
        x += rate * rng.uniform(0.85, 1.15)
for i in range(7): cricket(rng.uniform(4100, 5200), rng.uniform(0.35, 0.7), int(rng.integers(3, 6)), rng.uniform(0.008, 0.022), rng.uniform(-0.9, 0.9), 0.0, END)
fount = bp(S.noise(), 900, 7000) * (0.75 + 0.25 * lp(np.abs(S.noise()), 8, 1) * 3) * (1 - S.ramp(DARK + 0.1, DARK + 1.6))
amb.put(fount, 0.05, 0, 0.05)
murmur = np.zeros(N)
for v in range(3):
    f = [220, 320, 260][v]; base = bp(S.noise(), f * 0.7, f * 2.4)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None)
    phr = np.zeros(N); x = 0.3 + v * 1.1
    while x < END - 2: d = rng.uniform(0.8, 2.0); phr += S.env(x, x + d, 0.15); x += d + rng.uniform(1.0, 3.0)
    murmur += base * syl * phr
murmur /= np.abs(murmur).max()
crowd = 1 + 0.8 * S.window(T['overhead'], T['gps'], 1.5, 3) + 1.2 * S.window(DARK, DARK + 3.5, 0.2, 2.0)   # « oh ! » quand le ciel s'embrase, cris au moment du noir
sfx.put(lp(murmur * crowd, 2600), -0.1, 0, 0.045)
# --- l'électricité : bourdonnement du transformateur (100 Hz) qui enfle, étincelles, claquement, puis plus rien
hum = (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t) + 0.3 * np.sin(2 * np.pi * 300 * t)) * (0.15 + 0.85 * S.ramp(GIC, DARK) ** 1.5) * (t < DARK)
sfx.put(hum + 0.3 * np.sign(np.sin(2 * np.pi * 100 * t)) * S.ramp(FRY, DARK) * (t < DARK), 0.35, 0, 0.025)
for _ in range(10): sfx.put(S.crack(), 0.4, SP1 + rng.uniform(0, 4.2), rng.uniform(0.02, 0.05))
for _ in range(40): sfx.put(S.crack(), rng.uniform(0.2, 0.6), GIC + (DARK - GIC) * rng.uniform(0, 1) ** 0.6, rng.uniform(0.02, 0.07))
tt, n = S.burst(1.0); zz = bp(S.noise(n), 1500, 9000) * np.exp(-tt * 4); sfx.put(zz, 0.4, DARK - 0.05, 0.25)
sfx.put(S.boom(2.5, 70, 30), 0.3, DARK, 0.5)
# --- puis : chiens qui aboient, une alarme de voiture sur batterie, des appels
def bark(at, gain, pan):
    tt, n = S.burst(0.25); b = (bp(S.noise(n), 350, 1800) * 0.7 + np.sin(2 * np.pi * (520 - 200 * tt) * tt)) * np.exp(-tt * 14) * np.clip(tt / 0.01, 0, 1)
    far.put(lp(b, 1500), pan, at, gain)
for x in np.arange(DARK + 0.6, DARK + 9, 0.6): bark(x + rng.uniform(0, 0.2), 0.03, -0.6)
x, i = DARK + 1.2, 0
while x < END - 1: far.put(lp(np.sign(np.sin(2 * np.pi * (1150, 1600)[i % 2] * S.burst(0.11)[0])) * 0.5, 2500), 0.7, x, 0.008); x += 0.13; i += 1
# --- les oiseaux : petits cris de migrateurs, désordonnés
for _ in range(26):
    tt, n = S.burst(0.12); f = rng.uniform(4000, 7000) * (1 - 0.3 * tt / 0.12)
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.12), rng.uniform(-0.8, 0.8), BIRDS - 0.6 + rng.uniform(0, 5), 0.02)
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique : nappe éthérée qui ondule comme les aurores, se tend avec l'orage, se vide au noir
CH = {'Em': [40, 47, 52, 55, 59], 'C': [36, 43, 48, 52, 55], 'G': [43, 50, 55, 59, 62], 'D': [38, 45, 50, 54, 57], 'Am': [45, 52, 57, 60, 64], 'B': [47, 54, 59, 63, 66], 'Cm': [36, 43, 48, 51, 55]}
def chords(prog, voice, gain, bright=0.25, fin=1.0, fout=1.0):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.5, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.5, 0.5), 0, gain)
    return b
prog = [(0, 8.2, 'Em'), (8.2, 13.2, 'C'), (13.2, 18.2, 'G'), (18.2, 23.2, 'D'), (23.2, 28.2, 'Em'), (28.2, 33.2, 'C'), (33.2, 38.2, 'Am'), (38.2, 43.2, 'B'), (43.2, DARK, 'Cm'), (DARK + 1.5, 53.2, 'Em'), (53.2, 58.2, 'C'), (58.2, 63.2, 'Am'), (63.2, END, 'B')]
mus.add(chords(prog, 'pad', 0.045))
mus.add(chords([(13.2, 18.2, 'G'), (18.2, 23.2, 'D'), (23.2, 28.2, 'Em'), (28.2, 33.2, 'C')], 'choir', 0.04, fin=1.8))
shimmer = np.zeros(N)
for m in [76, 79, 83, 86, 88]:
    shimmer += np.sin(2 * np.pi * hz(m) * t + 3 * np.sin(2 * np.pi * 0.13 * t + m)) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.07 + m * 0.001) * t + m))
mus.put(shimmer * (0.4 + 0.6 * S.ramp(2, 16)) * (1 - S.ramp(DARK - 0.3, DARK)) + shimmer * 0.6 * S.ramp(DARK + 2, DARK + 6), 0, 0, 0.006)
for x in np.arange(GIC, DARK - 0.2, 0.5): mus.put(S.hit(hz(40), 0.4, 8), 0, x, 0.08 * (0.5 + 0.5 * (x - GIC) / (DARK - GIC)))
melody = [(0.6, 71), (2.0, 74), (3.4, 76), (5.2, 79), (7.0, 76), (8.6, 72), (10.2, 76), (11.8, 79), (13.4, 83), (15.2, 81), (16.8, 79), (18.4, 78), (20.2, 74), (22.0, 71), (23.6, 76), (25.4, 79), (27.0, 83),
          (DARK + 2.2, 71), (DARK + 3.8, 67), (DARK + 5.4, 64), (53.6, 72), (55.4, 76), (57.0, 79), (58.6, 76), (60.4, 72), (63.6, 71), (65.4, 75), (67.0, 78)]
for x, m in melody: mus.put(S.pluck(hz(m), 3.0, 1.5), rng.uniform(-0.3, 0.3), x, 0.05)
mus.mul(1 - 0.85 * S.window(DARK - 0.05, DARK + 1.4, 0.05, 1.0))
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['Em']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([71, 67, 64]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.55, secs=4.0); amb_v = S.verb(amb, wet=0.25, secs=1.5); far_v = S.verb(far, wet=0.6, secs=2.5)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

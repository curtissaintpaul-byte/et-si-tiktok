"""Bande-son « 1 million à Paris » : la foule qui grossit avec le compteur (de quelques milliers à 1 million : la rumeur
monte, les slogans se multiplient), le vent quand la caméra s'envole au-dessus de Paris, les deux arrêts sur image
(ton corps, puis la police : grésillement de radio), puis le calme avant la question finale. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1000000); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; RISE, AER, BACK, DOWN, M1 = E['rise'], E['aerial'], E['back'], E['down'], E['m1']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
grow = 0.35 + 0.65 * S.ramp(RISE, M1)                       # la foule grossit
high = S.window(RISE + 1.0, DOWN - 0.5, 2.5, 2.5)            # en altitude : on l'entend de loin
live = (1 - 0.85 * frozen)

murmur = np.zeros(N)
for v in range(18):
    f0 = rng.uniform(200, 620); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur /= np.abs(murmur).max()
amb.put(murmur * live * grow * (1 - 0.55 * high), 0, 0, 0.12)
amb.put(lp(S.pink(), 260) * live * grow, 0, 0, 0.07)                                   # la masse, au loin
amb.put(bp(S.pink(), 150, 900) * high, 0, 0, 0.09)                                      # le vent en altitude
def chant(a, b, g, spread=0.3):
    x = a
    while x < b:
        for d in [0, 0.32, 0.9, 1.12, 1.34]:
            tt, n = S.burst(0.22); env = np.sin(np.pi * tt / 0.22) ** 1.5; v = np.zeros(n)
            for _ in range(10): f = rng.uniform(170, 300); v += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) + 0.6 * np.sin(2 * np.pi * 2 * f * tt)
            far.put(bp(v + 0.6 * S.noise(n), 300, 1600) * env, rng.uniform(-spread, spread), x + d, g)
        x += 2.0 + rng.uniform(-0.1, 0.1)
chant(0.6, END - 2, 0.010)
chant(RISE + 1, DOWN, 0.008, 0.9); chant(RISE + 2.1, DOWN, 0.007, 0.9)
for x in np.arange(0.5, END, 0.5):
    tt, n = S.burst(0.35); d = np.sin(2 * np.pi * (90 * np.exp(-tt * 6) + 55) * tt) * np.exp(-tt * 9)
    far.put(d, -0.4, x, 0.045 * float(live[min(N - 1, int(x * SR))]) * float(1 - 0.6 * high[min(N - 1, int(x * SR))]))
tt, n = S.burst(DOWN - RISE); sfx.put(S.whoosh(DOWN - RISE) * 0.7, 0, RISE, 0.05)   # la montée, la descente
# le compteur qui défile : des tics de plus en plus rapides jusqu'à 1 million
x = RISE
while x < M1:
    u = (x - RISE) / (M1 - RISE); tt, n = S.burst(0.03); sfx.put(np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 120), 0.5, x, 0.018); x += max(0.04, 0.28 * (1 - u) ** 2)
for k, m in enumerate([96, 100, 103]): sfx.put(S.pluck(hz(m), 1.8, 2.2), (k - 1) * 0.4, M1 + k * 0.06, 0.05)
sfx.put(S.boom(3.0, 60, 24), 0, M1, 0.15)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
# la radio de la police pendant le 2e arrêt
f2 = FZ[1]; tt, n = S.burst(1.4); sfx.put(bp(S.noise(n), 900, 3200) * (0.4 + 0.6 * (np.sin(2 * np.pi * 7 * tt) > 0)) * np.sin(np.pi * tt / 1.4), 0.6, f2['t'] + 0.6, 0.03)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade * (1 - 0.6 * frozen))
sfx.mul(fade)

CH = {'Am': [33, 45, 48, 52, 57], 'F': [29, 41, 45, 48, 53], 'C': [36, 43, 48, 52, 55], 'G': [31, 43, 47, 50, 55], 'Em': [28, 40, 47, 52, 55], 'Dm': [38, 45, 50, 53, 57]}
def chords(prog, gain, bright=0.22):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.8, 0.8)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, RISE, 'Am'), (RISE, (RISE + M1) / 2, 'F'), ((RISE + M1) / 2, M1, 'G'), (M1, DOWN, 'C'), (DOWN, FZ[1]['t'], 'Em'), (FZ[1]['t'], FZ[1]['t'] + FZ[1]['dur'], 'Dm'),
        (FZ[1]['t'] + FZ[1]['dur'], END - 4, 'F'), (END - 4, END, 'G'), (END, T['duration'], 'Am')]
mus.add(chords(prog, 0.034))
x = 3.0
while x < END:
    mus.put(S.hit(hz(28), 0.4, 8), 0, x, 0.05 * (1.5 if RISE < x < M1 else 1)); x += 0.75 if not (RISE < x < M1) else 0.5
for x, m in [(M1 + 0.4, 84), (M1 + 0.9, 88), (M1 + 1.6, 91), (M1 + 2.4, 88)]: mus.put(S.pluck(hz(m), 2.4, 1.8), rng.uniform(-0.3, 0.3), x, 0.045)
for i, m in enumerate([69, 72, 76]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.15, secs=1.2)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

"""Bande-son « te protéger à la manif » : la foule de la Bastille (rumeur, slogans rythmés, tambour, sifflets), le tir
de la grenade (coup sourd, sifflement, choc métallique, chuintement du gaz), la panique, les quintes de toux, les arrêts
sur image, le rembobinage (bande qui rembobine), puis la même scène avec l'équipement. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1789); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; RW0, RW1 = E['rewind']; END = E['end']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
rwin = S.window(RW0, RW1, 0.1, 0.2)
live = (1 - 0.85 * frozen) * (1 - 0.9 * rwin)

# --- la foule : rumeur, slogans scandés, tambour, sifflets
murmur = np.zeros(N)
for v in range(14):
    f0 = rng.uniform(220, 600); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur /= np.abs(murmur).max()
amb.put(murmur * live, 0, 0, 0.11)
amb.put(lp(S.pink(), 300) * live, 0, 0, 0.05)
def chant(a, b, g):   # un slogan scandé à plusieurs centaines de voix : « ta-ta, ta-ta-ta » (voyelle « o »)
    x = a
    while x < b:
        for k, d in enumerate([0, 0.32, 0.9, 1.12, 1.34]):
            tt, n = S.burst(0.22); env = np.sin(np.pi * tt / 0.22) ** 1.5
            v = np.zeros(n)
            for _ in range(10): f = rng.uniform(170, 300); v += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) + 0.6 * np.sin(2 * np.pi * 2 * f * tt)
            v = bp(v + 0.6 * S.noise(n), 300, 1600) * env
            far.put(v, rng.uniform(-0.3, 0.3), x + d + rng.uniform(0, 0.02), g)
        x += 2.0
chant(0.6, E['fireA'] - 0.6, 0.012); chant(E['takeB'] + 0.2, E['fireB'] - 0.6, 0.012)
for x in np.arange(0.5, END, 0.5):   # le tambour
    tt, n = S.burst(0.35); d = np.sin(2 * np.pi * (90 * np.exp(-tt * 6) + 55) * tt) * np.exp(-tt * 9)
    far.put(d * (1 if int(x * 2) % 4 != 3 else 0.5), -0.4, x, 0.05 * float(live[min(N - 1, int(x * SR))]))
for _ in range(10):   # sifflets
    at = rng.uniform(1, END - 2); tt, n = S.burst(0.5); f = 2900 + 300 * np.sin(2 * np.pi * 28 * tt)
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.5) ** 2, rng.uniform(-0.8, 0.8), at, 0.008 * float(live[min(N - 1, int(at * SR))]))

def grenade(fire, land, panic=True, cough_you=True):
    tt, n = S.burst(0.5); sfx.put(lp(S.noise(n), 220) * np.exp(-tt * 14) + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 18), 0.35, fire, 0.5)   # le tir
    fl = land - fire; tt, n = S.burst(fl); sfx.put(bp(S.noise(n), 1200, 4500) * np.sin(np.pi * tt / fl) ** 2, 0.2, fire, 0.06)                # le vol
    tt, n = S.burst(0.25); sfx.put(np.sin(2 * np.pi * 1850 * tt) * np.exp(-tt * 30) + hp(S.noise(n), 2000) * np.exp(-tt * 40), 0.1, land, 0.12)   # le choc
    tt, n = S.burst(6.0); sfx.put(hp(S.noise(n), 2500) * np.exp(-tt * 0.45) * np.clip(tt / 0.1, 0, 1), 0.1, land + 0.1, 0.07)                   # le gaz qui chuinte
    if panic:
        for _ in range(16):   # cris, mouvement de foule
            tt, n = S.burst(0.9); f0 = rng.uniform(380, 800)
            y = bp(np.sin(2 * np.pi * np.cumsum(f0 + 120 * np.sin(tt * 7)) / SR) + 0.7 * S.noise(n), 400, 3200) * np.sin(np.pi * tt / 0.9) ** 0.6
            sfx.put(y, rng.uniform(-0.9, 0.9), land + 0.5 + rng.uniform(0, 1.8), 0.012)
        tt, n = S.burst(5); sfx.put(bp(S.noise(n), 200, 1500) * np.sin(np.pi * tt / 5), 0, land + 0.4, 0.06)   # les pas qui courent
    def cough(at, g, pan):
        for k in range(rng.integers(2, 4)):
            tt, n = S.burst(0.16); c = bp(S.noise(n), 300, 2400) * np.exp(-tt * 22) * np.clip(tt / 0.01, 0, 1)
            sfx.put(c, pan, at + k * 0.24, g)
    for _ in range(14): cough(land + 1.5 + rng.uniform(0, 7), 0.03, rng.uniform(-0.8, 0.8))
    if cough_you:
        for k in range(6): cough(land + 1.3 + k * 0.9, 0.09, 0.0)
grenade(E['fireA'], E['landA'], cough_you=True)
grenade(E['fireB'], E['landB'], cough_you=False)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
# --- le rembobinage : une bande qui rembobine (aigu qui glisse, crépitements)
tt, n = S.burst(RW1 - RW0); f = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (sfx, amb, far): b.mul(fade * (1 - 0.6 * frozen) if b is not sfx else fade)

# --- musique : ré mineur, tendue ; la prise équipée passe en fa majeur
CH = {'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 46, 50, 53, 58], 'A': [33, 45, 49, 52, 57], 'F': [29, 41, 45, 48, 53], 'C': [36, 43, 48, 52, 55], 'Gm': [31, 43, 46, 50, 55]}
def chords(prog, gain, bright=0.22):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.8, 0.8)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
LA, LB = E['landA'], E['landB']
prog = [(0, LA - 0.5, 'Dm'), (LA - 0.5, FZ[0]['t'] + FZ[0]['dur'], 'Bb'), (FZ[0]['t'] + FZ[0]['dur'], RW0, 'A'), (RW1, LB - 0.5, 'F'), (LB - 0.5, FZ[1]['t'] + FZ[1]['dur'], 'C'),
        (FZ[1]['t'] + FZ[1]['dur'], 58, 'F'), (58, END, 'Gm'), (END, T['duration'], 'Dm')]
mus.add(chords(prog, 0.034))
x = 3.0
while x < END:   # pulsation grave
    if not (RW0 - 0.2 < x < RW1):
        mus.put(S.hit(hz(26), 0.4, 8), 0, x, 0.05 * (1.6 if (LA < x < LA + 6) or (LB < x < LB + 6) else 1))
    x += 0.75
for i, m in enumerate([62, 65, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.15, secs=1.2)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

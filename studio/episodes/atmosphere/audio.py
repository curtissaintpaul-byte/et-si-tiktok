"""Bande-son « et si l'atmosphère disparaissait » : le jardin du Trocadéro (fontaines, rumeur de la ville, oiseaux, passants),
puis le silence d'un coup quand l'air disparaît (le son a besoin d'air). Il ne reste que ce que tu entends de l'intérieur :
ton souffle qui s'échappe, ton cœur qui s'emballe puis ralentit. Arrêts sur image, rembobinage, retour au réel. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1966); t = S.t; N = S.N; rng = S.rng
sfx, amb, inner, mus = S.bus(), S.bus(), S.bus(), S.bus()
EV = E['event']; RW0, RW1 = E['rewind']; END = E['end']; FZ = E['freezes']; YOU = E['you']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
air = 1 - S.window(EV, RW1 - 0.3, 0.25, 0.6)          # 1 : l'air est là (le son existe) ; 0 : le vide
vac = 1 - air

# --- le jardin : fontaines, ville au loin, oiseaux, passants
fount = bp(S.noise(), 500, 7000) * (0.8 + 0.2 * lp(np.abs(S.noise()), 3))
amb.put(fount, 0.1, 0, 0.05)
amb.put(lp(S.pink(), 220), 0, 0, 0.07)                                        # la ville
murmur = np.zeros(N)
for v in range(6):
    f0 = rng.uniform(220, 520); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.6, 0, None); murmur += base * syl
amb.put(murmur / np.abs(murmur).max(), -0.2, 0, 0.03)
for _ in range(26):                                                               # moineaux
    at = rng.uniform(0.3, T['duration'] - 1); n0 = rng.integers(2, 6); pan = rng.uniform(-0.9, 0.9)
    for k in range(n0):
        tt, n = S.burst(0.07); f = rng.uniform(3800, 5200) - 9000 * tt
        amb.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.07), pan, at + k * 0.11, 0.012)
amb.mul(air * (1 - 0.75 * frozen))

# --- l'air disparaît : un dernier souffle (le son coupe net), puis l'intérieur de ton corps
tt, n = S.burst(0.35); sfx.put(bp(S.noise(n), 200, 3000) * np.exp(-tt * 9), 0, EV - 0.02, 0.22)
tt, n = S.burst(2.2); inner.put(bp(S.noise(n), 150, 1100) * np.exp(-tt * 1.6) * np.clip(tt / 0.05, 0, 1), 0, EV + 0.3, 0.10)   # l'air qui sort de tes poumons
# le cœur : il s'emballe jusqu'à l'évanouissement, puis ralentit (temps accéléré)
x = EV + 0.4
while x < RW0 - 0.2:
    if x < YOU: bpm = 85 + 55 * (x - EV) / max(1, YOU - EV)
    else: bpm = max(28, 140 - 9 * (x - YOU))
    for d, g in ((0, 1.0), (0.24, 0.6)):
        tt, n = S.burst(0.18); b = np.sin(2 * np.pi * (52 + 30 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 22)
        inner.put(b, 0, x + d, 0.30 * g * (0.35 if any(f['t'] <= x < f['t'] + f['dur'] for f in FZ) else 1))
    x += 60 / bpm
# l'évanouissement : un voile sourd
tt, n = S.burst(3.0); inner.put(lp(S.noise(n), 120) * np.sin(np.pi * tt / 3.0), 0, YOU - 1.0, 0.25)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
# --- le rembobinage, puis l'air revient (un grand souffle)
tt, n = S.burst(RW1 - RW0); f = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
tt, n = S.burst(1.4); sfx.put(bp(S.noise(n), 300, 4000) * np.sin(np.pi * tt / 1.4) ** 2, 0, RW1 - 0.5, 0.10)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
amb.mul(fade); inner.mul(fade)

# --- musique : la majeur au soleil, puis presque rien (une nappe grave qui monte), retour en ré majeur
CH = {'A': [33, 45, 52, 57, 61], 'D': [38, 50, 57, 62, 66], 'E': [40, 52, 59, 64, 68], 'Fm': [29, 41, 48, 53, 56], 'Db': [25, 37, 44, 49, 53], 'Bbm': [34, 46, 53, 58, 61], 'Bm': [35, 47, 54, 59, 62], 'G': [31, 43, 50, 55, 59]}
def chords(prog, gain, bright=0.22):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.8, 0.8)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
F1, F2 = FZ[0], FZ[1]
prog = [(0, 7.5, 'A'), (7.5, EV - 0.3, 'D'), (EV + 1.0, F1['t'] + F1['dur'], 'Fm'), (F1['t'] + F1['dur'], F2['t'], 'Db'), (F2['t'], RW0, 'Bbm'),
        (RW1, RW1 + 5, 'D'), (RW1 + 5, END - 3, 'Bm'), (END - 3, END, 'G'), (END, T['duration'], 'D')]
mus.add(chords(prog, 0.03))
for x in np.arange(0.5, EV - 0.3, 1.5):    # petites notes légères au soleil
    mus.put(S.pluck(hz(rng.choice([69, 73, 76, 81])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.035)
x = EV + 2.0
while x < RW0:   # pulsation grave dans le vide, de plus en plus présente
    mus.put(S.hit(hz(25), 0.6, 6), 0, x, 0.04 + 0.04 * min(1, (x - EV) / 25)); x += 1.5
for i, m in enumerate([62, 66, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.15, secs=1.2)
master([(sfx_v, 1.0), (amb_v, 1.0), (inner, 1.0), (mus_v, 1.0)], sys.argv[2])

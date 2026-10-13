"""Bande-son de la démo « jackpot » : studio de nuit, la liasse qu'on feuillette, le tas qui se remplit (froissements
de plus en plus serrés, montée), le « ching » à 250 millions, puis la foule qui apparaît (rumeur qui grossit) pendant
que la caméra s'envole. Musique : do majeur, lumineuse. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=250); t = S.t; N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
ONE, LAND, FULL, CROWD, CFULL, OUT = T['one'], T['land'], T['full'], T['crowd'], T['crowdFull'], T['out']

# --- ambiance : un grand plateau la nuit
amb.put(lp(S.pink(), 220), 0, 0, 0.06)

def riffle(at, n=14, dur=0.32, g=0.05, pan=0.0):   # on feuillette des billets
    for k in range(n):
        tt, m = S.burst(0.018); x = hp(S.noise(m), 2500) * np.exp(-tt * 260)
        sfx.put(x, pan + rng.uniform(-0.1, 0.1), at + dur * k / n + rng.uniform(0, 0.006), g * rng.uniform(0.6, 1.0))
def thud(at, g=0.3):
    tt, m = S.burst(0.3); sfx.put(lp(S.noise(m), 450) * np.exp(-tt * 22), 0, at, g)

riffle(ONE + 0.1); riffle(ONE + 1.2, 10, 0.25, 0.035)
thud(LAND, 0.35)
# --- le tas se remplit : des paquets qui tombent, de plus en plus serrés, puis un « froissement » continu qui monte
NL = ev['events']['NL']; x = LAND + 0.05
while x < FULL:
    u = (x - LAND) / (FULL - LAND); rate = 3 + 45 * u ** 2.2
    thud(x, 0.08 + 0.05 * u); riffle(x, 4, 0.05, 0.02 + 0.02 * u, rng.uniform(-0.6, 0.6)); x += 1 / rate
rise = S.window(LAND + 1.0, FULL + 0.05, 2.5, 0.05)
sweep = np.zeros(N); i0, i1 = int((LAND + 1.0) * SR), int((FULL + 0.05) * SR)
seg = S.noise(i1 - i0); f = np.linspace(800, 5200, i1 - i0)
sweep[i0:i1] = hp(seg, 1200) * (np.linspace(0, 1, i1 - i0) ** 2)
sfx.put(sweep, 0, 0, 0.05)
# --- 250 millions : le « ching » et un coup sourd
for k, m in enumerate([96, 100, 103]): sfx.put(S.pluck(hz(m), 1.8, 2.2), (k - 1) * 0.4, FULL + 0.02 + k * 0.06, 0.06)
sfx.put(S.boom(3.0, 60, 24), 0, FULL, 0.18)
# --- la foule apparaît : des « pop » de plus en plus nombreux, puis la rumeur
NP = ev['events']['NP']
for _ in range(260):
    k = rng.uniform(0, 1) ** 1.6; at = CROWD + (CFULL - CROWD) * k
    tt, m = S.burst(0.05); sfx.put(np.sin(2 * np.pi * rng.uniform(700, 1300) * tt) * np.exp(-tt * 70), rng.uniform(-0.8, 0.8), at, 0.012)
murmur = np.zeros(N)
for v in range(12):
    f0 = rng.uniform(250, 620); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur = murmur / np.abs(murmur).max()
amb.put(murmur * S.ramp(CROWD, CFULL) * (1 - S.ramp(OUT - 0.4, T['duration'])), 0, 0, 0.09)
tt, m = S.burst(3.2); sfx.put(S.whoosh(3.2) * 0.8, 0, CROWD - 0.3, 0.06)   # la caméra s'envole
fade = 1 - S.ramp(OUT - 0.2, T['duration'] - 0.1); sfx.mul(fade); amb.mul(fade)

# --- musique : do majeur, ça s'ouvre à 250 millions puis encore avec la foule
CH = {'C': [36, 43, 48, 52, 55], 'Am': [33, 40, 45, 48, 52], 'F': [29, 41, 45, 48, 53], 'G': [31, 38, 43, 47, 50], 'Csus': [36, 43, 48, 53, 55]}
def chords(prog, gain, bright=0.25):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, 2.8, 'Am'), (2.8, LAND, 'F'), (LAND, 7.3, 'Am'), (7.3, FULL, 'G'), (FULL, CROWD + 1.5, 'C'), (CROWD + 1.5, 12.6, 'F'), (12.6, T['duration'], 'C')]
mus.add(chords(prog, 0.04))
x = LAND
while x < FULL:   # pulsation qui accélère pendant le remplissage
    mus.put(S.hit(hz(33), 0.3, 10), 0, x, 0.06); x += max(0.18, 0.5 - 0.3 * (x - LAND) / (FULL - LAND))
for x, m in [(0.3, 76), (1.2, 79), (2.1, 84), (3.0, 81), (4.2, 77), (FULL + 0.4, 84), (FULL + 0.9, 88), (CROWD + 1.0, 91), (CROWD + 1.8, 88), (CROWD + 2.6, 84), (CROWD + 3.4, 86), (12.8, 84), (13.4, 88)]:
    mus.put(S.pluck(hz(m), 2.4, 1.8), rng.uniform(-0.3, 0.3), x, 0.045)
mus.mul(1 - S.ramp(OUT - 0.2, T['duration'] - 0.05))
mus_v = S.verb(mus, wet=0.42, secs=3.0); amb_v = S.verb(amb, wet=0.25, secs=1.6); sfx_v = S.verb(sfx, wet=0.18, secs=1.2)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

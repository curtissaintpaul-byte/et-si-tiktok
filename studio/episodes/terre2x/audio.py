"""Bande-son « Et si la Terre était deux fois plus grosse » : la place de Chamonix un matin d'été (fontaine, passants,
oiseaux, cloches de vaches au loin), puis le choc quand la gravité double (un grand coup sourd, le mât de la caméra
qui grince, les genoux et les sacs qui tombent), le souffle et le cœur de Camille qui forcent. Le temps s'accélère
(les heures, puis les semaines), arrêts sur image, rembobinage, retour au réel. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=452); t = S.t; N = S.N; rng = S.rng
sfx, amb, inner, mus = S.bus(), S.bus(), S.bus(), S.bus()
EV = E['event']; HO = E['hours']; WK = E['weeks']; RW0, RW1 = E['rewind']; END = E['end']; FZ = E['freezes']; TRIP = E['trip']; R0, R1 = E['rise']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
heavy = S.window(EV, RW0 + 0.3, 0.05, 0.4)          # 1 : la gravité est doublée

# --- la place : fontaine, rumeur, oiseaux, cloches de vaches au loin
fount = bp(S.noise(), 500, 6500) * (0.8 + 0.2 * lp(np.abs(S.noise()), 3))
amb.put(fount * (1 - 0.35 * heavy), -0.35, 0, 0.05)     # (le jet monte moins haut : il fait moins de bruit)
amb.put(lp(S.pink(), 200), 0, 0, 0.05)
murmur = np.zeros(N)
for v in range(5):
    f0 = rng.uniform(220, 520); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.6, 0, None); murmur += base * syl
amb.put(murmur / np.abs(murmur).max() * (1 - 0.6 * heavy), 0.2, 0, 0.03)
for _ in range(24):   # oiseaux
    at = rng.uniform(0.3, T['duration'] - 1); n0 = rng.integers(2, 5); pan = rng.uniform(-0.9, 0.9)
    for k in range(n0):
        tt, n = S.burst(0.08); f = rng.uniform(3200, 4600) - 7000 * tt
        amb.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.08), pan, at + k * 0.13, 0.010)
for _ in range(14):   # cloches de vaches, très loin dans l'alpage
    at = rng.uniform(0.5, T['duration'] - 2); f0 = rng.uniform(600, 900)
    tt, n = S.burst(0.9); b = (np.sin(2 * np.pi * f0 * tt) + 0.6 * np.sin(2 * np.pi * f0 * 2.76 * tt) + 0.3 * np.sin(2 * np.pi * f0 * 5.4 * tt)) * np.exp(-tt * 5)
    amb.put(lp(b, 3000), rng.uniform(-0.8, 0.8), at, 0.006)
amb.mul(1 - 0.75 * frozen)

# --- le choc : un grand coup sourd, la caméra qui plie (grincement métallique), les gens qui tombent à genoux
sfx.put(S.boom(3.5, 60, 22), 0, EV - 0.02, 0.5)
tt, n = S.burst(1.2); f = 210 + 90 * np.sin(2 * np.pi * 1.3 * tt) * np.exp(-tt * 2)
sfx.put(bp(np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + 0.5 * S.noise(n)), 150, 2500) * np.exp(-tt * 2.2), 0.3, EV + 0.05, 0.05)
for d, pan, g in ((0.45, 0.0, 0.32), (0.55, -0.6, 0.16), (0.62, 0.7, 0.14), (0.7, 0.4, 0.10), (0.8, -0.3, 0.08)):
    tt, n = S.burst(0.25); sfx.put(lp(S.noise(n), 300) * np.exp(-tt * 18), pan, EV + d, g)     # genoux, sacs, chaises
# un verre qui tombe et casse en terrasse (il tombe plus vite)
for k in range(6): sfx.put(S.crack(), 0.75, EV + 0.48 + k * 0.012, 0.05)
# la passante qui trébuche (un choc lourd), et Camille qui se relève (effort)
tt, n = S.burst(0.35); sfx.put(lp(S.noise(n), 260) * np.exp(-tt * 14), -0.1, TRIP + 0.05, 0.28)
tt, n = S.burst(R1 - R0); inner.put(bp(S.noise(n), 300, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * tt) ** 2) * np.sin(np.pi * tt / tt[-1]), 0, R0, 0.05)

# --- de l'intérieur : la respiration lourde et le cœur qui force (temps réel), puis plus calme (le corps s'adapte)
x = EV + 0.6
while x < HO:
    tt, n = S.burst(1.4); br = bp(S.noise(n), 250, 1500) * np.sin(np.pi * tt / 1.4) ** 2
    inner.put(br, 0, x, 0.045 * (0.4 if any(f['t'] <= x < f['t'] + f['dur'] for f in FZ) else 1)); x += 2.4
x = EV + 0.3
while x < RW0 - 0.2:
    bpm = 100 + 20 * min(1, (x - EV) / 4) if x < HO else (95 if x < WK else 80)
    for d, g in ((0, 1.0), (0.22, 0.6)):
        tt, n = S.burst(0.18); b = np.sin(2 * np.pi * (52 + 30 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 22)
        inner.put(b, 0, x + d, 0.26 * g * (0.45 if any(f['t'] <= x < f['t'] + f['dur'] for f in FZ) else (1 if x < HO else 0.55)))
    x += 60 / bpm
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
# le temps qui s'accélère (deux fois)
for a in (HO, WK): sfx.put(S.whoosh(1.0), 0, a - 0.5, 0.08)
# --- le rembobinage, puis la place revient comme avant
tt, n = S.burst(RW1 - RW0); f = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
amb.mul(fade); inner.mul(fade)

# --- musique : ré majeur léger le matin, puis grave et lourd (si mineur, sol, mi mineur), retour en ré majeur
CH = {'D': [38, 50, 57, 62, 66], 'A': [33, 45, 52, 57, 61], 'G': [31, 43, 50, 55, 59], 'Bm': [35, 47, 54, 59, 62], 'Em': [28, 40, 47, 52, 55], 'Fsm': [30, 42, 49, 54, 57], 'Cmaj': [24, 36, 43, 48, 52]}
def chords(prog, gain, bright=0.22):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.8, 0.8)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
F1, F2 = FZ[0], FZ[1]
prog = [(0, 7.5, 'D'), (7.5, EV - 0.3, 'A'), (EV + 0.8, F1['t'], 'Bm'), (F1['t'], F1['t'] + F1['dur'], 'Em'), (F1['t'] + F1['dur'], HO, 'Bm'), (HO, WK, 'G'),
        (WK, F2['t'], 'Em'), (F2['t'], RW0, 'Fsm'), (RW1, RW1 + 6, 'D'), (RW1 + 6, END - 3, 'Bm'), (END - 3, END, 'G'), (END, T['duration'], 'D')]
mus.add(chords(prog, 0.03))
for x in np.arange(0.5, EV - 0.3, 1.25):    # petites notes légères le matin
    mus.put(S.pluck(hz(rng.choice([69, 74, 78, 81])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.035)
x = EV + 1.5
while x < RW0:   # un pas lourd et grave : la gravité
    mus.put(S.hit(hz(26), 0.7, 5), 0, x, 0.05); x += 1.6 if x < HO else 2.0
for x in np.arange(RW1 + 0.5, END - 0.5, 1.5):
    mus.put(S.pluck(hz(rng.choice([66, 69, 74, 78])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.03)
for i, m in enumerate([62, 66, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.18, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (inner, 1.0), (mus_v, 1.0)], sys.argv[2])

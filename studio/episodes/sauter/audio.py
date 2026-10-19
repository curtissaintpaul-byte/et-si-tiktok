"""Bande-son « Et si tout le monde sautait en même temps ? » : le Champ-de-Mars un midi d'été (oiseaux, rumeur légère),
la foule qui grossit avec le compteur (la rumeur monte, le vent quand la caméra s'envole), le compte à rebours, le saut
(un silence, puis la réception : un grondement long de plusieurs secondes), le temps qui s'accélère, la nuit plus calme,
les jours d'après (la rumeur devient inquiète, la foule pousse), le rembobinage, puis un midi ordinaire. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=820); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; M0, M1, RISE, DOWN = E['m0'], E['m1'], E['rise'], E['down']
JUMP, LAND = E['jump'], E['land']; RW0, RW1 = E['rewind']; CLK = E['clocks']; N0, N1 = E['night']; PUSH = E['push']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.85 * frozen
crowd = S.ramp(M0, M1) * (1 - S.ramp(RW0, RW0 + 0.4))         # 0 : quelques passants → 1 : toute l'humanité
high = S.window(RISE + 1.0, DOWN - 0.5, 2.5, 2.5)             # en altitude : on l'entend de loin
night = S.window(N0, N1 + 0.2, 1.0, 0.3)
real = S.ramp(RW1, RW1 + 0.5)

# --- l'ambiance du parc : oiseaux, un peu de ville au loin
amb.put(lp(S.pink(), 220) * (1 - 0.6 * crowd), 0, 0, 0.05)
for _ in range(26):
    at = rng.uniform(0.3, T['duration'] - 1); n0 = rng.integers(2, 5); pan = rng.uniform(-0.9, 0.9)
    for k in range(n0):
        tt, n = S.burst(0.08); f = rng.uniform(3200, 4600) - 7000 * tt
        amb.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.08), pan, at + k * 0.13, 0.008)
# --- la rumeur de la foule : elle grossit avec le compteur, se tait juste avant le saut, devient inquiète les jours suivants
murmur = np.zeros(N)
for v in range(20):
    f0 = rng.uniform(200, 620); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur /= np.abs(murmur).max()
hush = 1 - 0.8 * S.window(JUMP - 1.6, LAND + 0.1, 0.8, 0.05)   # tout le monde retient son souffle
level = (0.25 + 0.75 * crowd) * hush * (1 - 0.5 * night) * (1 - real * 0.8)
amb.put(murmur * live * level * (1 - 0.5 * high), 0, 0, 0.11)
amb.put(lp(S.pink(), 260) * live * crowd * (1 - 0.4 * night), 0, 0, 0.06)              # la masse, au loin
amb.put(bp(S.pink(), 150, 900) * high, 0, 0, 0.09)                                       # le vent en altitude
press = S.window(PUSH, RW0, 1.5, 0.3)                                                    # la foule pousse : des cris, des appels
for _ in range(40):
    at = rng.uniform(PUSH, RW0 - 0.3); tt, n = S.burst(0.35); f = rng.uniform(350, 700) * (1 + 0.3 * tt)
    far.put(bp(np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * S.noise(n), 300, 2500) * np.sin(np.pi * tt / 0.35), rng.uniform(-0.8, 0.8), at, 0.012)
amb.put(lp(S.pink(), 120) * press, 0, 0, 0.08)
tt, n = S.burst(DOWN - RISE); sfx.put(S.whoosh(DOWN - RISE) * 0.7, 0, RISE, 0.05)     # la caméra s'envole, puis redescend
# le compteur qui défile : des tics de plus en plus rapides jusqu'à 8,2 milliards
x = M0
while x < M1:
    u = (x - M0) / (M1 - M0); tt, n = S.burst(0.03); sfx.put(np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 120), 0.5, x, 0.016); x += max(0.04, 0.3 * (1 - u) ** 2)
for k, m in enumerate([96, 100, 103]): sfx.put(S.pluck(hz(m), 1.8, 2.2), (k - 1) * 0.4, M1 + k * 0.06, 0.05)
sfx.put(S.boom(3.0, 60, 24), 0, M1, 0.12)
# --- le compte à rebours (3, 2, 1) puis le saut
for k in range(3):
    tt, n = S.burst(0.18); sfx.put(np.sin(2 * np.pi * 880 * tt) * np.exp(-tt * 14), 0, JUMP - 3 + k, 0.06)
tt, n = S.burst(0.5); sfx.put(np.sin(2 * np.pi * 1320 * tt) * np.exp(-tt * 6), 0, JUMP, 0.07)
tt, n = S.burst(0.5); sfx.put(lp(S.noise(n), 900) * np.exp(-tt * 10), 0, JUMP - 0.02, 0.10)     # l'élan : des milliards de semelles
# la réception : un grondement long qui roule pendant plusieurs secondes (R. Munroe)
tt, n = S.burst(7.0); rum = lp(S.noise(n), 140) * (np.exp(-tt * 0.55) * (1 - np.exp(-tt * 18)))
sfx.put(rum, 0, LAND, 0.55); sfx.put(S.boom(4.0, 55, 20), 0, LAND, 0.4)
for d in np.linspace(0, 0.25, 12): tt, n = S.burst(0.2); sfx.put(lp(S.noise(n), 600) * np.exp(-tt * 20), rng.uniform(-0.8, 0.8), LAND + d, 0.05)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
for a in CLK: sfx.put(S.whoosh(1.0), 0, a - 0.5, 0.06)                                    # le temps qui s'accélère
# --- le rembobinage
tt, n = S.burst(RW1 - RW0); f = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade * (1 - 0.6 * frozen))

# --- musique : léger en sol majeur, ça s'ouvre à 8,2 milliards ; suspendu au compte à rebours ; grave et inquiet ensuite
CH = {'G': [31, 43, 50, 55, 59], 'D': [38, 50, 57, 62, 66], 'Em': [28, 40, 47, 52, 55], 'C': [36, 43, 48, 52, 55], 'Am': [33, 45, 48, 52, 57], 'Bm': [35, 47, 54, 59, 62], 'Dsus': [38, 50, 55, 57, 62]}
def chords(prog, gain, bright=0.22):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.8, 0.8)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, M0, 'G'), (M0, (M0 + M1) / 2, 'C'), ((M0 + M1) / 2, M1, 'D'), (M1, JUMP - 3, 'G'), (JUMP - 3, JUMP, 'Dsus'), (LAND + 0.5, CLK[0], 'C'),
        (CLK[0], CLK[2], 'Am'), (CLK[2], CLK[4], 'Em'), (CLK[4], CLK[5], 'Am'), (CLK[5], RW0, 'Bm'), (RW1, END - 3, 'G'), (END - 3, END, 'C'), (END, T['duration'], 'G')]
mus.add(chords(prog, 0.03))
for x in np.arange(0.5, M0, 1.25): mus.put(S.pluck(hz(rng.choice([67, 71, 74, 79])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.032)
x = M0
while x < JUMP - 3:   # une pulsation qui accélère pendant que la foule grossit
    mus.put(S.hit(hz(31), 0.4, 8), 0, x, 0.05); x += 0.5 if x < M1 else 0.75
for x, m in [(M1 + 0.4, 83), (M1 + 0.9, 86), (M1 + 1.6, 91), (M1 + 2.4, 86)]: mus.put(S.pluck(hz(m), 2.4, 1.8), rng.uniform(-0.3, 0.3), x, 0.045)
x = CLK[0]
while x < RW0:   # un pas lourd : le temps qui passe
    mus.put(S.hit(hz(28), 0.7, 5), 0, x, 0.05 * (0.6 if N0 < x < N1 else 1)); x += 1.6 if x < PUSH else 0.8
for x in np.arange(RW1 + 0.5, END - 0.5, 1.5): mus.put(S.pluck(hz(rng.choice([67, 71, 74, 79])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.03)
for i, m in enumerate([67, 71, 74]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul((1 - 0.5 * frozen) * (1 - 0.85 * S.window(LAND - 0.1, LAND + 2.5, 0.05, 1.5)))   # la musique se tait pendant le grondement
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.18, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

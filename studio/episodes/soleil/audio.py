"""Bande-son « Et si le Soleil s'éteignait ? » : un midi de village en Provence (cigales, la fontaine, les cloches de midi,
quelques voix de terrasse), le compte à rebours de la dernière lumière (un tic par seconde « accélérée »), le noir (un grand
souffle grave puis le silence), les réverbères qui grésillent en s'allumant, le vent qui se lève et siffle de plus en plus
froid, la glace qui craque, les arrêts sur image, le rembobinage, puis le midi ordinaire. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1815); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; OFF = E['off']; DARK = E['dark']; LAMPS = E['lamps']; COLD = E['cold']; ICE = E['ice']; YEAR = E['year']
RW0, RW1 = E['rewind']; CLK = E['clocks']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.85 * frozen
real = S.ramp(RW1, RW1 + 0.5)
day = np.maximum(1 - S.ramp(DARK, DARK + 0.08), real)
night = 1 - day
cold = S.ramp(COLD, ICE + 2) * (1 - real)

# --- le midi : les cigales (un grésillement pulsé), la fontaine, des voix et des couverts au loin
cic = np.zeros(N)
for c in range(4):
    f0 = rng.uniform(5200, 7200); rate = rng.uniform(9, 14)
    gate = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6))
    cic += bp(S.noise(), f0 * 0.85, f0 * 1.15) * gate * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t + c))
amb.put(cic * day * live, 0.3, 0, 0.05)
fountain = bp(S.noise(), 400, 4000) * (0.8 + 0.2 * lp(np.abs(S.noise()), 6))
amb.put(fountain * live * (1 - S.ramp(ICE - 1, ICE + 1) * (1 - real)), -0.2, 0, 0.035)
murmur = np.zeros(N)
for v in range(8):
    f0 = rng.uniform(200, 550); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur /= np.abs(murmur).max()
far.put(murmur * day * live, -0.5, 0, 0.05)
for _ in range(12):   # des couverts, des verres
    at = rng.uniform(0.5, DARK - 0.5) if rng.random() < 0.6 else rng.uniform(RW1, END - 1); tt, n = S.burst(0.12)
    far.put(np.sin(2 * np.pi * rng.uniform(2500, 4200) * tt) * np.exp(-tt * 40), rng.uniform(-0.8, 0.8), at, 0.02)
# les cloches de midi
for k in range(4):
    tt, n = S.burst(3.0); f = hz(57)
    bell = sum(a * np.sin(2 * np.pi * f * m * tt) for a, m in ((1, 1), (0.5, 2.0), (0.35, 2.4), (0.25, 3.0))) * np.exp(-tt * 1.4)
    far.put(bell, 0.1, OFF - 0.6 + k * 0.9 if k < 2 else RW1 + 0.6 + (k - 2) * 0.9, 0.03)
# --- le compte à rebours de la dernière lumière : un tic qui accélère, puis le noir
x = OFF + 0.3
while x < DARK - 0.1:
    u = (x - OFF) / (DARK - OFF); tt, n = S.burst(0.04); sfx.put(np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt * 90), 0.4, x, 0.02 + 0.02 * u); x += max(0.12, 0.6 * (1 - u))
tt, n = S.burst(4.0); sfx.put(lp(S.noise(n), 300) * np.exp(-tt * 1.2), 0, DARK, 0.25)   # le grand souffle
sfx.put(S.boom(4.5, 40, 16), 0, DARK, 0.4)
# --- dans le noir : le grésillement des réverbères, un chien au loin, puis le vent qui se lève
for d in (0.0, 0.25, 0.5, 0.8):
    tt, n = S.burst(0.06); sfx.put(hp(S.noise(n), 2500) * np.exp(-tt * 70), rng.uniform(-0.6, 0.6), LAMPS + d, 0.05)
hum = (np.sin(2 * np.pi * 100 * t) + 0.4 * np.sin(2 * np.pi * 200 * t)) * S.ramp(LAMPS, LAMPS + 0.8) * (1 - real)
amb.put(hum * live, 0.4, 0, 0.006)
for at in (DARK + 4.5, DARK + 5.3, DARK + 6.4):
    tt, n = S.burst(0.25); far.put(bp(S.noise(n), 500, 1500) * np.exp(-tt * 12), -0.8, at, 0.04)
wind = bp(S.pink(), 200, 1200) * (0.6 + 0.4 * lp(np.abs(S.noise()), 0.5, 1) / 0.5)
amb.put(wind * night * (0.25 + 0.75 * cold) * live * (1 - real), 0, 0, 0.08)
whistle = np.sin(2 * np.pi * np.cumsum(900 + 200 * np.sin(2 * np.pi * 0.21 * t)) / SR) * lp(np.abs(S.noise()), 1.0, 1)
amb.put(whistle * S.ramp(ICE - 2, ICE + 2) * (1 - real) * live, -0.3, 0, 0.02)
for _ in range(7):   # la glace qui craque
    at = rng.uniform(ICE, RW0 - 0.5); tt, n = S.burst(0.3)
    sfx.put(hp(S.noise(n), 900) * np.exp(-tt * 25) * (S.noise(n) > 0.8), rng.uniform(-0.7, 0.7), at, 0.06)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
for a in CLK: sfx.put(S.whoosh(1.0), 0, a - 0.5, 0.04)                                   # le temps qui s'accélère
# --- le rembobinage
tt, n = S.burst(RW1 - RW0); f = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade * (1 - 0.6 * frozen))

# --- musique : lumineuse en ré majeur au soleil, silence au noir, puis des accords mineurs de plus en plus froids
CH = {'D': [38, 50, 57, 62, 66], 'G': [43, 55, 62, 67, 71], 'A': [45, 57, 64, 69, 73], 'Bm': [35, 47, 54, 59, 62], 'Dm': [38, 50, 57, 62, 65],
      'Bb': [34, 46, 53, 58, 62], 'Gm': [43, 55, 62, 67, 70], 'A7': [33, 45, 52, 55, 61], 'Dsus': [38, 50, 57, 62, 67], 'Em': [40, 52, 59, 64, 67]}
def chords(prog, gain, bright=0.22):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.8, 0.8)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, OFF, 'D'), (OFF, (OFF + DARK) / 2, 'Bm'), ((OFF + DARK) / 2, DARK, 'Em'),
        (CLK[0], CLK[1], 'Dm'), (CLK[1], CLK[3], 'Bb'), (CLK[3], CLK[5], 'Gm'), (CLK[5], CLK[7], 'Dm'), (CLK[7], RW0, 'A7'),
        (RW1, END - 3, 'D'), (END - 3, END, 'G'), (END, T['duration'], 'Dsus')]
mus.add(chords(prog, 0.03))
for x in np.arange(0.4, OFF, 0.5):
    if rng.random() < 0.6: mus.put(S.pluck(hz(rng.choice([74, 76, 78, 81, 83])), 1.4, 3), rng.uniform(-0.6, 0.6), x, 0.03)
x = OFF
while x < DARK - 0.3:   # une pulsation qui serre, comme un cœur
    mus.put(S.hit(hz(38), 0.4, 8), 0, x, 0.05); x += 0.6 - 0.3 * (x - OFF) / (DARK - OFF)
x = CLK[0]
while x < RW0:   # des notes rares et cristallines, de plus en plus aiguës : le froid
    if rng.random() < 0.45: mus.put(S.pluck(hz(rng.choice([69, 72, 74, 77, 81, 84])), 2.4, 2.4), rng.uniform(-0.7, 0.7), x, 0.025)
    x += rng.choice([0.5, 0.75, 1.0])
for x in np.arange(RW1 + 0.5, END - 0.5, 1.0): mus.put(S.pluck(hz(rng.choice([62, 66, 69, 74])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.028)
for i, m in enumerate([62, 67, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul((1 - 0.5 * frozen) * (1 - S.window(DARK - 0.02, CLK[0] - 0.8, 0.02, 2.5)))   # silence juste après le noir
mus_v = S.verb(mus, wet=0.45, secs=3.2); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.18, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

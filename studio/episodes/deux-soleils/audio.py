"""Bande-son « Et si la Terre avait deux soleils ? » : un matin d'été dans un village de Provence (cigales, la fontaine,
des voix de terrasse), le 2e Soleil qui s'allume (une grande nappe qui monte puis un coup sourd), les cigales qui
s'emballent avec la chaleur, le parasol qui s'ouvre, deux couchers de soleil plus calmes, la nuit chaude (grillons,
un ventilateur au loin), le jour 5 (un cœur qui accélère, un sifflement d'oreille), la semaine 2 (vent sec, feuilles
qui craquent, plus de fontaine), les arrêts sur image, le rembobinage, puis un matin ordinaire. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1611); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; SUN2 = E['sun2']; NOON = E['noon']; PARA = E['para']; H16 = E['h16']
SET1 = E['set1']; SET2 = E['set2']; NIGHT3 = E['night3']; DAY5 = E['day5']; WEEK2 = E['week2']; OCEAN = E['ocean']
RW0, RW1 = E['rewind']; CLK = E['clocks']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.85 * frozen
real = S.ramp(RW1, RW1 + 0.5)
night = S.window(NIGHT3 - 0.6, DAY5 - 0.4, 0.4, 0.4) * (1 - real)
dayk = 1 - night
heat = np.clip(S.ramp(SUN2, H16) * 0.6 + S.ramp(DAY5 - 0.5, OCEAN) * 0.4, 0, 1) * (1 - real)
dry = S.ramp(WEEK2 - 0.3, WEEK2 + 2.0) * (1 - real)

# --- les cigales : de plus en plus fort et rapide avec la chaleur, puis elles se taisent en semaine 2
cic = np.zeros(N)
for c in range(5):
    f0 = rng.uniform(5000, 7200); rate = rng.uniform(9, 14)
    ph = 2 * np.pi * np.cumsum(rate * (1 + 0.6 * heat)) / SR + rng.uniform(0, 6)
    gate = 0.5 + 0.5 * np.sin(ph)
    cic += bp(S.noise(), f0 * 0.85, f0 * 1.15) * gate * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t + c))
amb.put(cic * dayk * live * (0.6 + 0.9 * heat) * (1 - 0.9 * dry), 0.3, 0, 0.045)
fountain = bp(S.noise(), 400, 4000) * (0.8 + 0.2 * lp(np.abs(S.noise()), 6))
amb.put(fountain * live * (1 - dry), -0.2, 0, 0.03)
murmur = np.zeros(N)
for v in range(8):
    f0 = rng.uniform(200, 550); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur /= np.abs(murmur).max()
far.put(murmur * live * np.maximum(1 - S.ramp(NOON, H16), real), -0.5, 0, 0.05)   # les gens rentrent se mettre au frais
for _ in range(10):   # des tasses, des verres
    at = rng.uniform(0.5, SUN2 - 0.5) if rng.random() < 0.6 else rng.uniform(RW1, END - 1); tt, n = S.burst(0.12)
    far.put(np.sin(2 * np.pi * rng.uniform(2500, 4200) * tt) * np.exp(-tt * 40), rng.uniform(-0.8, 0.8), at, 0.02)
# --- le 2e Soleil : une nappe qui monte, un éclat, un coup sourd
tt, n = S.burst(2.2); f = 300 + 1400 * (tt / tt[-1]) ** 2
sfx.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * (tt / tt[-1]) ** 2 * 0.5 + bp(S.noise(n), 1500, 6000) * (tt / tt[-1]) ** 3, 0, SUN2 - 2.0, 0.05)
sfx.put(S.boom(3.5, 45, 14), 0, SUN2 + 0.15, 0.35)
tt, n = S.burst(3.0); sfx.put(hp(S.noise(n), 3000) * np.exp(-tt * 2.5), 0, SUN2 + 0.15, 0.04)
# --- le parasol qui s'ouvre (un froissement de toile + un clic)
tt, n = S.burst(0.6); sfx.put(bp(S.noise(n), 600, 3000) * np.sin(np.pi * tt / tt[-1]), 0.3, PARA, 0.06)
tt, n = S.burst(0.05); sfx.put(np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 80), 0.3, PARA + 0.65, 0.05)
# --- la nuit chaude : des grillons, un ventilateur au loin
cri = np.zeros(N)
for c in range(3):
    f0 = rng.uniform(3800, 4600); g = (np.sin(2 * np.pi * rng.uniform(2.5, 3.5) * t + c) > 0.6).astype(float)
    cri += np.sin(2 * np.pi * f0 * t) * lp(g, 40)
amb.put(cri * night * live, 0.4, 0, 0.02)
fan = bp(S.noise(), 80, 400) * (0.8 + 0.2 * np.sin(2 * np.pi * 14 * t))
amb.put(fan * night * live, -0.4, 0, 0.03)
# --- le jour 5 : le cœur d'Emma qui accélère, un sifflement d'oreille
x = DAY5; z = FZ[1]['t'] + FZ[1]['dur'] + 1.5
while x < z:
    u = min(1, (x - DAY5) / (FZ[1]['t'] - DAY5 + 1e-6)); bpm = 95 + 55 * u
    for d, g in ((0, 1.0), (0.13, 0.6)): sfx.put(S.hit(hz(31), 0.25, 14), 0, x + d, 0.12 * g * (0.5 + 0.5 * u))
    x += 60 / bpm
ring = np.sin(2 * np.pi * 6200 * t) * S.window(DAY5 + 1.5, z, 1.5, 1.0)
sfx.put(ring * (1 - real), 0, 0, 0.006)
# --- la semaine 2 : vent sec, feuilles qui craquent
wind = bp(S.pink(), 200, 1400) * (0.6 + 0.4 * lp(np.abs(S.noise()), 0.5, 1) / 0.5)
amb.put(wind * (0.15 * heat + 0.85 * dry) * live, 0, 0, 0.07)
for _ in range(16):
    at = rng.uniform(WEEK2, RW0 - 0.3); tt, n = S.burst(0.15)
    sfx.put(hp(S.noise(n), 2500) * np.exp(-tt * 40) * (S.noise(n) > 0.5), rng.uniform(-0.8, 0.8), at, 0.04)
# --- le matin ordinaire : des oiseaux
for _ in range(10):
    at = rng.uniform(RW1 + 0.3, END - 1.0); tt, n = S.burst(0.25); f = rng.uniform(2500, 4000) * (1 + 0.3 * np.sin(2 * np.pi * 18 * tt))
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]), rng.uniform(-0.8, 0.8), at, 0.025)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
for a in CLK: sfx.put(S.whoosh(1.0), 0, a - 0.5, 0.04)                                   # le temps qui s'accélère
# --- le rembobinage
tt, n = S.burst(RW1 - RW0); f = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade * (1 - 0.6 * frozen))

# --- musique : lumineuse en ré majeur le matin, de plus en plus tendue avec la chaleur, douce aux couchers de soleil
CH = {'D': [38, 50, 57, 62, 66], 'G': [43, 55, 62, 67, 71], 'A': [45, 57, 64, 69, 73], 'Bm': [35, 47, 54, 59, 62], 'Dm': [38, 50, 57, 62, 65],
      'Bb': [34, 46, 53, 58, 62], 'Gm': [43, 55, 62, 67, 70], 'A7': [33, 45, 52, 55, 61], 'Dsus': [38, 50, 57, 62, 67], 'Em': [40, 52, 59, 64, 67], 'Fmaj7': [41, 53, 57, 60, 64]}
def chords(prog, gain, bright=0.22):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.8, 0.8)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, SUN2, 'D'), (SUN2, NOON, 'A'), (NOON, H16, 'Bm'), (H16, SET1, 'Em'), (SET1, NIGHT3, 'G'), (NIGHT3, DAY5, 'Fmaj7'),
        (DAY5, WEEK2, 'Dm'), (WEEK2, OCEAN, 'Bb'), (OCEAN, RW0, 'A7'), (RW1, END - 3, 'D'), (END - 3, END, 'G'), (END, T['duration'], 'Dsus')]
mus.add(chords(prog, 0.03))
for x in np.arange(0.4, SUN2 - 0.5, 0.5):
    if rng.random() < 0.6: mus.put(S.pluck(hz(rng.choice([74, 76, 78, 81, 83])), 1.4, 3), rng.uniform(-0.6, 0.6), x, 0.03)
x = SUN2 + 1.0
while x < SET1:   # une pulsation qui s'accélère avec la chaleur
    mus.put(S.hit(hz(38), 0.35, 8), 0, x, 0.045); x += 0.75 - 0.35 * (x - SUN2) / (SET1 - SUN2)
for x in np.arange(SET1, SET2 + 1.5, 0.75): mus.put(S.pluck(hz(rng.choice([67, 71, 74, 79])), 2.0, 2.5), rng.uniform(-0.6, 0.6), x, 0.028)
x = WEEK2
while x < RW0:
    if rng.random() < 0.5: mus.put(S.pluck(hz(rng.choice([62, 65, 69, 70, 74])), 2.2, 2.2), rng.uniform(-0.7, 0.7), x, 0.025)
    x += rng.choice([0.5, 0.75, 1.0])
for x in np.arange(RW1 + 0.5, END - 0.5, 1.0): mus.put(S.pluck(hz(rng.choice([62, 66, 69, 74])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.028)
for i, m in enumerate([62, 67, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.45, secs=3.2); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.18, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

"""Bande-son de l'épisode « la Terre s'arrête » (Marseille) : bruitages + musique originale.
Usage : python3 audio.py events.json sortie.wav
"""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=13); t = S.t; N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
B0, B1, SURGE, HIT, BLACK, END = T['brake'], T['stopped'], T['surge'], T['waveHit'], T['black'], T['endCard']
W = np.array(ev['events']['wind']); wind = np.clip((np.interp(t, np.arange(len(W)) / 10, W) - 11) / 1207, 0, 1)   # 0 → 1 : le même vent que dans l'image

# =====================================================================
# LE PORT AU CALME
# =====================================================================
calm = 1 - S.ramp(B0 + 0.5, B0 + 3.5)
# clapotis
lap = bp(S.pink(), 250, 1600) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 0.7 * t + np.sin(t))))
amb.put(lap * calm, -0.1, 0, 0.06)
# mouettes
for k in range(7):
    s0 = rng.uniform(0.3, B0 + 1); pan = rng.uniform(-0.8, 0.8)
    for j in range(int(rng.integers(2, 5))):
        tt, n = S.burst(0.35); f = 1100 + 900 * np.sin(np.pi * tt / 0.35) * rng.uniform(0.6, 1.0)
        cry = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.35) ** 1.5
        cry = bp(cry + 0.3 * np.sign(cry) * np.abs(cry) ** 0.5, 700, 4000)
        sfx.put(cry, pan, s0 + j * 0.42, 0.035)
# la ville au loin, des gens qui parlent
city = lp(S.pink(), 400) * calm; amb.put(city, 0.2, 0, 0.05)
murmur = np.zeros(N)
for v in range(10):
    f = rng.uniform(260, 680); base = bp(S.noise(), f * 0.7, f * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None)
    murmur += base * syl
murmur = murmur / np.abs(murmur).max() * calm
amb.put(murmur, -0.2, 0, 0.06); amb.put(np.roll(murmur, int(1.7 * SR)), 0.4, 0, 0.04)
# la corne du ferry au loin
tt, n = S.burst(1.6)
horn = (np.sin(2 * np.pi * 146 * tt) + 0.6 * np.sin(2 * np.pi * 292 * tt) + 0.3 * np.sin(2 * np.pi * 438 * tt)) * np.clip(tt / 0.1, 0, 1) * np.clip((1.6 - tt) / 0.3, 0, 1)
sfx.put(lp(horn, 1200), 0.4, 6.0, 0.05)

# =====================================================================
# LE FREINAGE : grondement, le vent qui monte jusqu'au mur de son
# =====================================================================
rumble = lp(S.pink(), 70) * S.window(B0, B1 + 1.5, 1.0, 1.5)
sfx.put(rumble, 0, 0, 0.6)
w = np.zeros(N)
for lo, hi, rate in ((120, 500, 0.3), (400, 1500, 0.45), (1200, 5000, 0.6)):
    band = bp(S.pink(), lo, hi); w += band / np.abs(band).max() * (0.6 + 0.4 * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6)))
w *= (0.02 + 0.98 * wind ** 1.4) * (1 - S.ramp(HIT, HIT + 0.05))
sfx.put(w, -0.3, 0, 0.30); sfx.put(np.roll(w, int(0.31 * SR)), 0.4, 0, 0.22)
# sifflement aigu quand le vent dépasse le record
whistle = bp(S.noise(), 900, 2400) * np.clip((wind - 0.3) / 0.4, 0, 1) * (1 - S.ramp(HIT, HIT + 0.05))
sfx.put(whistle, 0.2, 0, 0.03)
# les objets s'envolent : chaises, tables, vitres
for _ in range(25):
    tt, n = S.burst(0.25); clat = bp(S.noise(n), 600, 4000) * np.exp(-tt * 25)
    sfx.put(clat, rng.uniform(-0.8, 0.8), rng.uniform(B0 + 2.5, B1 + 2), 0.08)
for _ in range(8):
    tt, n = S.burst(0.6); glass = hp(S.noise(n), 3000) * np.exp(-tt * 9) + sum(np.sin(2 * np.pi * rng.uniform(3000, 7000) * tt) * np.exp(-tt * rng.uniform(15, 30)) for _ in range(3)) * 0.3
    sfx.put(lp(glass, 5000), rng.uniform(-0.9, 0.9), rng.uniform(B0 + 10, B1 + 4), 0.03)
# le coup de frein
sfx.put(S.boom(1.6, 60, 30), 0, B0 - 0.02, 0.45)
for _ in range(14):
    tt, n = S.burst(0.3); clat = bp(S.noise(n), 400, 3000) * np.exp(-tt * 18)
    sfx.put(clat, rng.uniform(-0.8, 0.8), B0 + rng.uniform(0.1, 1.2), 0.07)
# cris : un grand « ah ! » de la foule, puis des appels pendant que le vent monte
for _ in range(9):
    tt, n = S.burst(0.6); f0 = rng.uniform(300, 600)
    ah = bp(np.sin(2 * np.pi * np.cumsum(f0 - 80 * tt) / SR) + 0.5 * S.noise(n), 250, 2600) * np.sin(np.pi * tt / 0.6) ** 0.7
    sfx.put(ah, rng.uniform(-0.8, 0.8), B0 + 0.1 + rng.uniform(0, 0.4), 0.03)
for _ in range(12):
    tt, n = S.burst(0.7); f0 = rng.uniform(380, 650)
    scream = bp(np.sin(2 * np.pi * np.cumsum(f0 + 120 * np.sin(tt * 9)) / SR) + 0.4 * S.noise(n), 300, 2800) * np.sin(np.pi * tt / 0.7)
    sfx.put(scream, rng.uniform(-0.7, 0.7), rng.uniform(B0 + 1.5, B0 + 12), 0.022)
# le mur du son : à 1 200 km/h l'air file presque à la vitesse du son
sfx.put(S.boom(3.0, 55, 25), 0, B1 - 0.3, 0.45)

# =====================================================================
# LA MER QUI ARRIVE
# =====================================================================
surge = S.ramp(SURGE, HIT) ** 1.6 * (1 - S.ramp(HIT, HIT + 0.05))
roar = lp(S.pink(), 300) * surge; sfx.put(roar, 0, 0, 0.75)
crash = bp(S.noise(), 300, 3500) * surge * (0.6 + 0.4 * np.sin(2 * np.pi * 1.7 * t)); sfx.put(crash, 0.2, 0, 0.18)
for _ in range(40):   # bateaux qui se fracassent, mâts qui cassent
    at = rng.uniform(SURGE + 4, HIT)
    if rng.random() < 0.5:
        tt, n = S.burst(0.4); crunch = bp(S.noise(n), 150, 1800) * np.exp(-tt * 10) * (1 + np.sin(2 * np.pi * 37 * tt))
        sfx.put(crunch, rng.uniform(-0.8, 0.8), at, 0.10 * (0.5 + (at - SURGE) / (HIT - SURGE)))
    else:
        tt, n = S.burst(0.8); f = rng.uniform(400, 1200); snap = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 6) + bp(S.noise(n), 2000, 6000) * np.exp(-tt * 40)
        sfx.put(snap, rng.uniform(-0.8, 0.8), at, 0.05)
# l'impact
tt, n = S.burst(1.0); impact = lp(S.noise(n), 900) * np.exp(-tt * 3) + S.boom(1.0, 50, 20)[:n] * 0.8
sfx.put(impact, 0, HIT - 0.05, 0.9)
tt, n = S.burst(0.5); glitch = np.sign(np.sin(2 * np.pi * 1000 * tt)) * (np.abs(lp(S.noise(n), 30)) > 0.3) * 0.5 + hp(S.noise(n), 1500) * 0.5
sfx.put(glitch * np.clip((0.5 - tt) / 0.05, 0, 1), 0, HIT + 0.05, 0.12)
cut = 1 - S.ramp(HIT + 0.45, HIT + 0.6)
sfx.mul(cut); amb.mul(cut)

# =====================================================================
# MUSIQUE : d'abord légère et ensoleillée, puis une pulsation qui ne s'arrête plus
# =====================================================================
CH = {'D': [50, 57, 62, 66, 69], 'G': [43, 50, 55, 59, 62], 'A': [45, 52, 57, 61, 64], 'Bm': [47, 54, 59, 62, 66],
      'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 41, 46, 50, 53], 'C': [36, 43, 48, 52, 55], 'Am': [33, 40, 45, 48, 52]}
def chords(prog, voice, gain, bright=0.28, fin=0.6, fout=0.6):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.3, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.organ(hz(m), env) if voice == 'organ' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.4, 0.4), 0, gain)
    return b
sunny = [(0, 4.4, 'D'), (4.4, 8.8, 'G'), (8.8, 13.2, 'Bm'), (13.2, B0, 'A')]
mus.add(chords(sunny, 'pad', 0.035))
x, k = 0.3, 0
while x < B0 - 0.1:
    c = next(c for a, z, c in sunny if a <= x < z); notes = [m for m in CH[c][1:5]]
    mus.put(S.pluck(hz(notes[[0, 2, 1, 3, 2, 1, 3, 2][k % 8]]), 1.8, 2.6), 0.3 if k % 2 else -0.3, x, 0.06)
    k += 1; x += 0.45
# coupure au freinage, puis pulsation grave qui accélère avec le vent
mus.mul(1 - S.ramp(B0 - 0.1, B0 + 0.4) * (t < END - 0.2))
tense = [(B0, B0 + 5, 'Dm'), (B0 + 5, B0 + 10, 'Bb'), (B0 + 10, B1, 'C'), (B1, SURGE + 6, 'Dm'), (SURGE + 6, SURGE + 10, 'Bb'), (SURGE + 10, HIT, 'Am')]
p1 = chords(tense, 'pad', 0.045, 0.4); p1.mul(0.5 + 0.5 * S.ramp(B0, HIT)); mus.add(p1)
c1 = chords([(SURGE + 5, SURGE + 10, 'Bb'), (SURGE + 10, HIT, 'Am')], 'choir', 0.05); mus.add(c1)
gap, x = 0.8, B0 + 0.5
while x < HIT - 0.05:
    mus.put(S.hit(hz(38), 0.45, 8), 0, x, 0.14 + 0.12 * (x - B0) / (HIT - B0)); x += gap; gap = max(0.22, gap * 0.965)
mus.put(bp(S.noise(), 500, 6000) * S.ramp(HIT - 6, HIT) ** 3 * (t < HIT), 0, 0, 0.08)
mus.mul(1 - S.ramp(HIT - 0.02, HIT + 0.15) * (t < END - 0.2))
# écran de fin
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['D']: mus.put(S.pad(hz(m), end, 0.22), 0, 0, 0.04)
for i, m in enumerate([74, 69, 66]): mus.put(S.pluck(hz(m), 3.0, 1.5), (i - 1) * 0.3, END + 0.3 + i * 0.5, 0.05)

mus_v = S.verb(mus, wet=0.35, secs=2.8)
mus_v.mul(1 - S.window(HIT + 0.2, END - 0.05, 0.25, 0.05))
amb_v = S.verb(amb, wet=0.18, secs=1.2)
master([(sfx, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

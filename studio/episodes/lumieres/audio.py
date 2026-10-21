"""Bande-son « Et si on éteignait toutes les lumières de France ? » : Paris la nuit (rumeur de la circulation au loin,
le bourdonnement du réverbère), le compteur des lampadaires (tics de plus en plus rapides, le vent quand la caméra s'envole),
la foule de la conversion, le compte à rebours, l'extinction (un « clac » géant, puis presque le silence), les grillons
et une musique qui s'ouvre à mesure que les étoiles apparaissent, le rembobinage, puis une nuit ordinaire. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=2027); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; M0, M1, RISE, DOWN = E['m0'], E['m1'], E['rise'], E['down']
OFF = E['off']; AD0, AD1 = E['adapt']; MILKY = E['milky']; YAWN = E['yawn']; RW0, RW1 = E['rewind']; CLK = E['clocks']; C0, COFF = E['crowd']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.85 * frozen
real = S.ramp(RW1, RW1 + 0.5)
lit = np.maximum(1 - S.ramp(OFF, OFF + 0.05), real)            # 1 : tout est allumé
dark = 1 - lit
high = S.window(RISE + 1.0, DOWN - 0.5, 2.5, 2.5)
stars = S.ramp(AD0 + 2, AD1) * (1 - real)                     # le ciel qui se remplit

# --- la ville la nuit : la rumeur de la circulation au loin, quelques voitures, le réverbère qui bourdonne
amb.put(lp(S.pink(), 180) * lit * live * (1 - 0.5 * high), 0, 0, 0.09)
for _ in range(14):
    at = rng.uniform(0.2, OFF - 2) if rng.random() < 0.6 else rng.uniform(RW1, END - 2); tt, n = S.burst(4.0)
    car = bp(S.noise(n), 120, 900) * np.sin(np.pi * tt / 4.0) ** 2
    far.put(car, rng.uniform(-0.9, 0.9), at, 0.03)
hum = (np.sin(2 * np.pi * 100 * t) + 0.4 * np.sin(2 * np.pi * 200 * t) + 0.15 * np.sin(2 * np.pi * 300 * t))
amb.put(hum * lit * live * (1 - high), -0.4, 0, 0.012)
amb.put(bp(S.pink(), 150, 900) * high, 0, 0, 0.09)                                       # le vent en altitude
tt, n = S.burst(DOWN - RISE); sfx.put(S.whoosh(DOWN - RISE) * 0.7, 0, RISE, 0.05)
# --- le compteur des lampadaires : des tics de plus en plus rapides jusqu'à 11,6 millions
x = M0 + 0.8
while x < M1:
    u = (x - M0) / (M1 - M0); tt, n = S.burst(0.03); sfx.put(np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 120), 0.5, x, 0.016); x += max(0.04, 0.3 * (1 - u) ** 2)
for k, m in enumerate([91, 95, 98]): sfx.put(S.pluck(hz(m), 1.8, 2.2), (k - 1) * 0.4, M1 + k * 0.06, 0.05)
sfx.put(S.boom(3.0, 60, 24), 0, M1, 0.10)
# la foule de la conversion : une rumeur qui apparaît puis s'efface
murmur = np.zeros(N)
for v in range(12):
    f0 = rng.uniform(200, 600); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur /= np.abs(murmur).max()
amb.put(murmur * S.window(C0, COFF + 0.4, 0.8, 0.4), 0, 0, 0.08)
# --- le compte à rebours, puis l'extinction
for k in range(3):
    tt, n = S.burst(0.18); sfx.put(np.sin(2 * np.pi * 880 * tt) * np.exp(-tt * 14), 0, OFF - 3 + k, 0.06)
for d in (-0.45, -0.3, -0.12):   # le réverbère hésite
    tt, n = S.burst(0.05); sfx.put(hp(S.noise(n), 2000) * np.exp(-tt * 80), -0.4, OFF + d, 0.05)
tt, n = S.burst(0.12); sfx.put(lp(S.noise(n), 1500) * np.exp(-tt * 40) + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 25), 0, OFF, 0.5)   # le grand « clac »
sfx.put(S.boom(4.0, 45, 18), 0, OFF, 0.35)
# --- dans le noir : les grillons, un souffle de vent, une chouette au loin
crk = np.zeros(N)
for c in range(5):
    f0 = rng.uniform(4200, 5200); rate = rng.uniform(2.0, 3.0); ph = rng.uniform(0, 1)
    gate = (np.sin(2 * np.pi * rate * t + ph * 6) > 0.6) * (np.sin(2 * np.pi * 28 * t) > 0)
    crk += np.sin(2 * np.pi * f0 * t) * lp(gate.astype(float), 300, 1) * rng.uniform(0.6, 1.0)
amb.put(crk * dark * S.ramp(OFF + 2.5, OFF + 6) * live * (1 - real), 0.2, 0, 0.012)
amb.put(lp(S.pink(), 400) * dark * (1 - real) * live, 0, 0, 0.03)
for at in (OFF + 9, MILKY + 6):
    for k in range(2):
        tt, n = S.burst(0.5); f = 420 - 60 * tt
        far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.5), 0.7, at + k * 0.7, 0.02)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
for a in CLK: sfx.put(S.whoosh(1.0), 0, a - 0.5, 0.05)                                    # le temps qui s'accélère
# --- le rembobinage
tt, n = S.burst(RW1 - RW0); f = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade * (1 - 0.6 * frozen))

# --- musique : une ville en ré mineur un peu pressée ; silence à l'extinction ; puis des accords qui s'ouvrent avec les étoiles
CH = {'Dm': [38, 50, 57, 62, 65], 'Bb': [34, 46, 53, 58, 62], 'F': [41, 53, 60, 65, 69], 'C': [36, 48, 55, 60, 64], 'Gm': [43, 55, 62, 67, 70],
      'D': [38, 50, 57, 62, 66], 'G': [43, 55, 62, 67, 71], 'Bm': [35, 47, 54, 59, 62], 'A': [33, 45, 52, 57, 61], 'Dmaj9': [38, 50, 57, 61, 64, 69]}
def chords(prog, gain, bright=0.22):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.8, 0.8)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, M0, 'Dm'), (M0, (M0 + M1) / 2, 'Bb'), ((M0 + M1) / 2, M1, 'C'), (M1, OFF - 3, 'F'), (OFF - 3, OFF, 'Gm'),
        (CLK[0], CLK[2], 'D'), (CLK[2], CLK[3], 'G'), (CLK[3], CLK[4], 'Dmaj9'), (CLK[4], CLK[6], 'Bm'), (CLK[6], RW0, 'G'),
        (RW1, END - 3, 'Dm'), (END - 3, END, 'Bb'), (END, T['duration'], 'D')]
mus.add(chords(prog, 0.03))
x = M0
while x < OFF - 3:   # une pulsation qui accélère avec le compteur
    mus.put(S.hit(hz(38), 0.4, 8), 0, x, 0.05); x += 0.5 if x < M1 else 0.75
x = CLK[0]
while x < RW0:   # des notes claires, de plus en plus nombreuses : les étoiles
    p = 0.35 + 0.65 * min(1.0, (x - CLK[0]) / max(1.0, MILKY - CLK[0]))
    if rng.random() < p: mus.put(S.pluck(hz(rng.choice([74, 76, 78, 81, 83, 86, 88])), 2.2, 2.6), rng.uniform(-0.7, 0.7), x, 0.03)
    x += rng.choice([0.25, 0.5, 0.75])
for x in np.arange(RW1 + 0.5, END - 0.5, 1.5): mus.put(S.pluck(hz(rng.choice([62, 65, 69, 74])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.028)
for i, m in enumerate([62, 66, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul((1 - 0.5 * frozen) * (1 - S.window(OFF - 0.02, CLK[0] - 0.8, 0.02, 2.5)))   # silence juste après l'extinction
mus_v = S.verb(mus, wet=0.45, secs=3.2); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.18, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

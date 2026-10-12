"""Bande-son de l'épisode « trou noir » : bruitages + musique originale (la mineur), calés sur la partition.
Usage : python3 audio.py events.json sortie.wav
"""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=7); t = S.t; N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()

# =====================================================================
# BRUITAGES
# =====================================================================
# --- grillons : chaque grillon = des "trains" de petites impulsions vers 4,5 kHz
def cricket(f0, rate, pulses, gain, pan, start, stop):
    x = start + rng.uniform(0, 0.4)
    while x < stop:
        for k in range(pulses):
            tt, n = S.burst(0.018)
            pulse = np.sin(2 * np.pi * (f0 + rng.uniform(-30, 30)) * tt) * np.sin(np.pi * tt / 0.018) ** 2
            amb.put(pulse, pan, x + k * 0.034, gain)
        x += rate * rng.uniform(0.85, 1.15)
STOP = T['float']                        # les grillons s'arrêtent net quand on ne pèse plus rien
for i in range(9):
    cricket(rng.uniform(4100, 5200), rng.uniform(0.32, 0.7), int(rng.integers(3, 6)), rng.uniform(0.010, 0.03), rng.uniform(-0.9, 0.9), 0.0, STOP)
# (pendant le zoom sur le ciel on les entend moins : on « écoute » le ciel)
amb.mul(1 - 0.55 * S.window(T['zoomIn'], T['wide'], 1.5, 1.0))
# --- le ressac au loin
surf = lp(S.pink(), 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.09 * t + 1)) * (1 - S.ramp(T['float'] - 0.5, T['float'] + 1.5))
amb.put(surf, -0.2, 0, 0.10)
# --- le couple qui discute, le petit tintement des verres, un chien au loin
murmur = np.zeros(N)
for v in range(2):
    f = 230 if v == 0 else 340
    base = bp(S.noise(), f * 0.7, f * 2.4)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None)
    phr = np.zeros(N); x = 0.5 + v * 1.3
    while x < 16.5:
        d = rng.uniform(1.0, 2.4); phr += S.env(x, x + d, 0.15); x += d + rng.uniform(0.9, 2.2)
    murmur += base * syl * phr
murmur = murmur / np.abs(murmur).max()
sfx.put(lp(murmur, 2500), -0.15, 0, 0.05)
tt, n = S.burst(0.6)
clink = (np.sin(2 * np.pi * 2650 * tt) + 0.5 * np.sin(2 * np.pi * 5320 * tt) + 0.3 * np.sin(2 * np.pi * 3910 * tt)) * np.exp(-tt * 9)
sfx.put(clink, -0.1, 6.65, 0.05)
for k, d in enumerate([0, 0.32]):
    tt, n = S.burst(0.25)
    bark = (bp(S.noise(n), 350, 1800) * 0.7 + np.sin(2 * np.pi * (520 - 200 * tt) * tt)) * np.exp(-tt * 14) * np.clip(tt / 0.01, 0, 1)
    sfx.put(lp(bark, 1400), 0.7, 11.2 + d, 0.035)
# --- les marées : grondement lointain qui monte, vagues qui déferlent
roar = bp(S.pink(), 60, 700) * S.window(17.2, T['zoomIn'] + 1.5, 2.5, 1.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t))
sfx.put(roar, -0.3, 0, 0.28)
for x in np.arange(18.6, 24.0, 1.3):
    tt, n = S.burst(1.6)
    crash = bp(S.noise(n), 200, 2600) * np.exp(-tt * 2.2) * np.clip(tt / 0.15, 0, 1)
    sfx.put(lp(crash, 1800), rng.uniform(-0.6, 0.2), x + rng.uniform(0, 0.4), 0.10)
# --- mouvements de caméra (souffles)
sfx.put(S.whoosh(1.8), 0, T['zoomIn'], 0.10)
sfx.put(S.whoosh(1.4), 0, T['zoomOut'] - 0.1, 0.10)
# --- le grondement de la Terre qui monte à la fin, le vent vers le haut
groan = lp(S.pink(), 110) * S.ramp(T['wide'], T['flash']) ** 1.5 * (1 - S.ramp(T['flash'], T['flash'] + 0.05))
sfx.put(groan, 0, 0, 0.55)
wind = np.zeros(N)
for lo, hi, rate in ((300, 900, 0.17), (700, 2200, 0.23)):
    band = bp(S.pink(), lo, hi); wind += band / np.abs(band).max() * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6)))
wind *= S.ramp(T['float'] + 1.0, T['tear']) * (1 - S.ramp(T['flash'], T['flash'] + 0.05))
sfx.put(wind, -0.3, 0, 0.12); sfx.put(np.roll(wind, int(0.4 * SR)), 0.5, 0, 0.08)
# --- ce qui se soulève : chaises qui raclent, bouteille, carrosserie qui grince
for x, f, g in [(T['float'] + 0.25, 900, 0.05), (T['float'] + 0.45, 700, 0.04), (T['float'] + 0.8, 1500, 0.03)]:
    tt, n = S.burst(0.35); scrape = bp(S.noise(n), f * 0.6, f * 2) * np.sin(np.pi * tt / 0.35) ** 2
    sfx.put(scrape, rng.uniform(-0.5, 0.5), x, g)
tt, n = S.burst(1.2); creak = np.sin(2 * np.pi * np.cumsum(180 + 90 * np.sin(tt * 7)) / SR) * np.sin(np.pi * tt / 1.2) * 0.5
sfx.put(lp(creak, 1200), 0.6, T['float'] + 1.6, 0.05)
# --- la déchirure : craquements, rochers, ampoules qui éclatent, puis le grand boum
for _ in range(60):
    sfx.put(S.crack(), rng.uniform(-0.9, 0.9), rng.uniform(T['tear'], T['flash']), rng.uniform(0.05, 0.16))
for _ in range(18):
    tt, n = S.burst(0.7); thud = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tt * 4) + 30) / SR) * np.exp(-tt * 5)
    sfx.put(thud, rng.uniform(-0.7, 0.7), rng.uniform(T['tear'] + 0.3, T['flash']), 0.18)
for k in range(6):
    tt, n = S.burst(0.12); pop = hp(S.noise(n), 2500) * np.exp(-tt * 60)
    sfx.put(pop, rng.uniform(-0.6, 0.6), T['tear'] + 2.5 + k * 0.12 + rng.uniform(0, 0.08), 0.12)
sfx.put(S.boom(4.5, 60, 22), 0, T['flash'] - 0.05, 0.7)
# silence complet sur l'écran noir
cut = 1 - S.ramp(T['flash'] + 0.3, T['black'] + 0.4)
sfx.mul(cut); amb.mul(cut)

# =====================================================================
# MUSIQUE (la mineur)
# =====================================================================
CH = {'Am': [45, 52, 57, 60, 64], 'F': [41, 48, 53, 57, 60], 'C': [48, 55, 60, 64, 67], 'G': [43, 50, 55, 59, 62],
      'Dm': [38, 45, 50, 53, 57], 'E': [40, 47, 52, 56, 59], 'Am9': [45, 52, 57, 59, 64]}
def chords(prog, voice, gain, bright=0.28, fin=0.9, fout=0.9):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.4, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.organ(hz(m), env) if voice == 'organ' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.4, 0.4), 0, gain)
    return b
# 1. le thème de la nuit : nappe douce + guitare en arpège
night = [(0, 4.35, 'Am'), (4.35, 8.7, 'F'), (8.7, 13.0, 'C'), (13.0, 17.4, 'G')]
mus.add(chords(night, 'pad', 0.05))
x, k = 0.4, 0
while x < 17.2:
    c = next(c for a, z, c in night if a <= x < z)
    notes = [m + 12 for m in CH[c][1:5]]
    m = notes[[0, 1, 2, 3, 2, 1][k % 6]]
    mus.put(S.pluck(hz(m), 2.2, 2.4), 0.3 if k % 2 else -0.3, x, 0.055)
    k += 1; x += 0.5
# 2. les marées : ça s'assombrit, une pulsation grave
mus.add(chords([(17.4, 20.7, 'Dm'), (20.7, 24.2, 'E')], 'pad', 0.06, 0.35))
for x in np.arange(17.6, 24.2, 0.75):
    mus.put(S.hit(hz(33), 0.6, 6), 0, x, 0.10)
# 3. le ciel : chœur + clochettes, très aéré
mus.add(chords([(24.2, 30.2, 'Am9')], 'choir', 0.05, fin=2.0))
for x, m in zip(np.arange(25.0, 30.0, 1.25), [76, 79, 81, 84]):
    mus.put(S.pluck(hz(m), 3.0, 1.2), rng.uniform(-0.5, 0.5), x, 0.035)
# la Lune se brise : coup grave + le chœur change d'accord
mus.put(S.hit(hz(33), 2.5, 1.6), 0, T['moonBreak'], 0.30)
mus.add(chords([(T['moonBreak'], 34.8, 'F')], 'choir', 0.06, fin=0.6))
# 4. retour sur Terre : montée et pulsation qui accélère
gap, x = 0.9, 34.8
while x < T['float']:
    mus.put(S.hit(hz(45), 0.4, 9), 0, x, 0.09); x += gap; gap = max(0.28, gap * 0.82)
mus.put(bp(S.noise(), 400, 5000) * S.ramp(34.8, T['float']) ** 3 * (t < T['float']), 0, 0, 0.06)
# 5. apesanteur : une seule note tenue, suspendue
float_env = S.window(T['float'], T['tear'] + 0.6, 0.4, 1.0)
mus.put(S.choir(hz(76), float_env), 0.2, 0, 0.05); mus.put(S.choir(hz(81), float_env), -0.2, 0, 0.035)
mus.put(S.pad(hz(45), float_env * 0.7, 0.2), 0, 0, 0.05)
# 6. la déchirure : orgue + chœur + percussions, crescendo
climax = [(T['tear'], T['tear'] + 1.3, 'Am'), (T['tear'] + 1.3, T['tear'] + 2.6, 'F'), (T['tear'] + 2.6, T['tear'] + 3.8, 'G'), (T['tear'] + 3.8, T['flash'], 'E')]
cres = S.ramp(T['tear'], T['flash'])
org = chords(climax, 'organ', 0.03); org.mul(0.4 + 0.6 * cres); mus.add(org)
cho = chords(climax, 'choir', 0.05); cho.mul(0.4 + 0.6 * cres); mus.add(cho)
gap, x = 0.75, T['tear']
while x < T['flash'] - 0.05:
    mus.put(S.hit(hz(33), 0.7, 5), 0, x, 0.20); x += gap; gap = max(0.2, gap * 0.9)
mus.mul(1 - S.ramp(T['flash'] - 0.02, T['flash'] + 0.12) * (t < T['endCard'] - 0.2))
# 7. l'écran de fin : trois notes et un accord doux
end = S.window(T['endCard'], T['duration'], 0.6, 1.8)
for m in CH['Am']:
    mus.put(S.pad(hz(m), end, 0.22), 0, 0, 0.045)
for i, m in enumerate([69, 72, 76]):
    mus.put(S.pluck(hz(m), 3.0, 1.5), (i - 1) * 0.3, T['endCard'] + 0.3 + i * 0.55, 0.05)

mus_v = S.verb(mus, wet=0.45, secs=3.5)
mus_v.mul(1 - S.window(T['flash'] + 0.15, T['endCard'] - 0.05, 0.35, 0.05))   # silence sur l'écran noir
amb_v = S.verb(amb, wet=0.25, secs=1.6)
master([(sfx, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

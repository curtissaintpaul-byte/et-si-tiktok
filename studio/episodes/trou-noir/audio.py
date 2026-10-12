"""Bande-son de l'épisode « trou noir » v2 (version longue) : bruitages + musique originale (la mineur).
Usage : python3 audio.py events.json sortie.wav
"""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
FALLS, TILES, BARKS, HIGHS = ev.get('falls', []), ev.get('tiles', []), ev.get('barks', []), ev.get('highs', [])
S = Session(T['duration'], seed=7); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()   # far : les bruits lointains (sirènes, cloches…), avec plus d'écho
Q = T['quake']

def tone(f, dur, kind='saw'):
    """une note « cuivrée » (dent de scie adoucie) — pour les sirènes et klaxons"""
    tt, n = S.burst(dur); ph = 2 * np.pi * np.cumsum(np.full(n, f) * (1 + 0.003 * np.sin(2 * np.pi * 5 * tt))) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 9)) if kind == 'saw' else np.sign(np.sin(ph)) * 0.6
    return x * np.clip(tt / 0.02, 0, 1) * np.clip((dur - tt) / 0.02, 0, 1)

# =====================================================================
# 1. AMBIANCE DU SOIR (jusqu'au séisme)
# =====================================================================
def cricket(f0, rate, pulses, gain, pan, start, stop):
    x = start + rng.uniform(0, 0.4)
    while x < stop:
        for k in range(pulses):
            tt, n = S.burst(0.018)
            pulse = np.sin(2 * np.pi * (f0 + rng.uniform(-30, 30)) * tt) * np.sin(np.pi * tt / 0.018) ** 2
            amb.put(pulse, pan, x + k * 0.034, gain)
        x += rate * rng.uniform(0.85, 1.15)
for i in range(9):   # les grillons se taisent net au premier choc
    cricket(rng.uniform(4100, 5200), rng.uniform(0.32, 0.7), int(rng.integers(3, 6)), rng.uniform(0.010, 0.03), rng.uniform(-0.9, 0.9), 0.0, Q - 0.75)
amb.mul(1 - 0.45 * S.window(T['coastIn'], T['coastOut'] + 1.5, 1.2, 1.2))   # pendant le zoom sur la côte on les entend moins
surf = lp(S.pink(), 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.09 * t + 1)) * (1 - S.ramp(T['coastIn'], T['coastIn'] + 2))
amb.put(surf, -0.2, 0, 0.10)
# le couple qui discute, le petit tintement des verres, un chien au loin
murmur = np.zeros(N)
for v in range(2):
    f = 230 if v == 0 else 340
    base = bp(S.noise(), f * 0.7, f * 2.4)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None)
    phr = np.zeros(N); x = 0.5 + v * 1.3
    while x < 16.0:
        d = rng.uniform(1.0, 2.4); phr += S.env(x, x + d, 0.15); x += d + rng.uniform(0.9, 2.2)
    murmur += base * syl * phr
murmur = murmur / np.abs(murmur).max()
sfx.put(lp(murmur, 2500), -0.15, 0, 0.05)
tt, n = S.burst(0.6)
clink = (np.sin(2 * np.pi * 2650 * tt) + 0.5 * np.sin(2 * np.pi * 5320 * tt) + 0.3 * np.sin(2 * np.pi * 3910 * tt)) * np.exp(-tt * 9)
sfx.put(clink, -0.1, 6.65, 0.05)
def bark(at, gain, pan):
    tt, n = S.burst(0.25)
    b = (bp(S.noise(n), 350, 1800) * 0.7 + np.sin(2 * np.pi * (520 - 200 * tt) * tt)) * np.exp(-tt * 14) * np.clip(tt / 0.01, 0, 1)
    sfx.put(lp(b, 1500), pan, at, gain)
for d in (0, 0.32): bark(11.2 + d, 0.035, 0.7)          # un chien au loin
for b in BARKS: bark(b, 0.11, 0.35)                     # notre chien : il sent l'onde P avant tout le monde

# =====================================================================
# 2. LES MARÉES : grondement, déferlantes à chaque marée haute
# =====================================================================
swell = np.zeros(N)
for h in HIGHS:
    swell += np.exp(-((t - h) / 1.6) ** 2)
roar = bp(S.pink(), 60, 700) * S.window(T['coastIn'], T['tiltUp'] + 1.0, 2.0, 1.5) * (0.45 + 0.55 * np.clip(swell, 0, 1))
sfx.put(roar, -0.3, 0, 0.30)
for h in HIGHS:
    if h > T['tiltUp']: continue
    for k in range(4):
        tt, n = S.burst(1.8)
        crash = bp(S.noise(n), 180, 2600) * np.exp(-tt * 2.0) * np.clip(tt / 0.2, 0, 1)
        sfx.put(lp(crash, 1700), rng.uniform(-0.7, 0.3), h - 1.6 + k * 0.7 + rng.uniform(0, 0.3), 0.09)

# =====================================================================
# 3. LES GENS : sirènes de pompiers (deux-tons la–si), klaxons du bouchon, alarmes de voitures, cloche
# =====================================================================
for k, (start, pan, g, det) in enumerate([(22.6, -0.5, 0.050, 1.0), (24.9, 0.4, 0.040, 0.985), (27.3, -0.1, 0.045, 1.012), (30.2, 0.6, 0.035, 0.995)]):
    x = start; hi = 0
    while x < T['zoomIn'] + 2.0:
        f = (435 if hi == 0 else 488) * det
        far.put(bp(tone(f, 0.52), 300, 2600), pan, x, g)
        x += 0.55; hi ^= 1
far.mul(1 - 0.75 * S.ramp(T['tiltUp'], T['zoomHeld']))
for _ in range(14):   # le bouchon sur la route de la colline : des klaxons
    at = rng.uniform(25.5, 37.5); f = rng.uniform(330, 470); d = rng.uniform(0.25, 0.7)
    far.put(lp(tone(f, d, 'sq') + 0.7 * tone(f * 1.26, d, 'sq'), 1200), rng.uniform(-0.8, 0.8), at, 0.018)
for k, (start, pan) in enumerate([(Q + 1.4, -0.6), (Q + 2.1, 0.7), (Q + 2.9, 0.1)]):   # alarmes de voitures
    x, i = start, 0
    while x < T['zoomIn'] + 1.5:
        f = (1150, 1600)[i % 2] * (1 + 0.02 * k)
        far.put(lp(tone(f, 0.11, 'sq'), 2500), pan, x, 0.012)
        x += 0.13; i += 1
def bell(at, gain, pan, f=392):
    tt, n = S.burst(4.0)
    sig = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * d) for r, a, d in [(0.5, 0.6, 0.8), (1.0, 1.0, 1.1), (1.19, 0.6, 1.6), (1.5, 0.45, 2.0), (2.0, 0.35, 2.4), (2.6, 0.2, 3.5), (3.3, 0.12, 4.5)])
    far.put(sig * np.clip(tt / 0.004, 0, 1), pan, at, gain)
x = Q + 0.5
while x < T['zoomIn'] + 1.0:   # la cloche de l'église qui sonne toute seule, secouée
    bell(x, rng.uniform(0.02, 0.04), -0.55); x += rng.uniform(0.5, 1.3)

# =====================================================================
# 4. LE SOL ET LE SÉISME
# =====================================================================
ground = lp(S.pink(), 90) * (S.ramp(T['sol'], Q) * 0.35 + S.window(Q, T['tiltUp'] + 0.8, 0.15, 1.2)) * (0.7 + 0.3 * np.sin(2 * np.pi * 1.7 * t))
sfx.put(ground, 0, 0, 0.75)
sfx.put(S.boom(3.0, 55, 24), 0, Q - 0.05, 0.55)
rattle = bp(S.noise(), 1500, 6000) * np.clip(lp(np.abs(S.noise()), 12, 1) * 6, 0, 1) * S.window(Q, Q + 4.4, 0.1, 1.5)
sfx.put(rattle, 0.2, 0, 0.05)
for _ in range(24):
    sfx.put(S.crack(), rng.uniform(-0.8, 0.8), rng.uniform(Q, Q + 4.2), rng.uniform(0.03, 0.09))
def shatter(at, gain, pan):
    tt, n = S.burst(0.9)
    s_ = hp(S.noise(n), 2500) * np.exp(-tt * 12)
    for _ in range(9):
        f = rng.uniform(2500, 7000); a = rng.uniform(0, 0.4)
        s_ += 0.4 * np.sin(2 * np.pi * f * tt) * np.exp(-np.clip(tt - a, 0, None) * 18) * (tt > a)
    sfx.put(s_, pan, at, gain)
for f in FALLS:   # verres, bouteille, bougie, chaise : ils touchent le sol ~0,35 s après le début de la chute
    shatter(f + 0.36, 0.09, rng.uniform(-0.3, 0.2))
for tl in TILES:   # tuiles du toit qui s'écrasent
    tt, n = S.burst(0.5); clay = bp(S.noise(n), 600, 4000) * np.exp(-tt * 16)
    sfx.put(clay, 0.6, tl, 0.08)
tt, n = S.burst(1.0); buzz = (np.sign(np.sin(2 * np.pi * 100 * tt)) * 0.3 + bp(S.noise(n), 2000, 7000)) * (np.sin(2 * np.pi * 13 * tt) > 0) * np.clip((1.0 - tt) / 0.05, 0, 1)
sfx.put(buzz, -0.3, Q + 0.4, 0.03)                     # la guirlande grésille…
tt, n = S.burst(0.4); clunk = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-tt * 9) + 40) / SR) * np.exp(-tt * 10)
sfx.put(clunk, -0.2, Q + 1.3, 0.18)                    # … et le courant saute

# =====================================================================
# 5. RETOUR SUR TERRE : l'air qui manque, le vent vers le haut, la déchirure
# =====================================================================
sfx.put(S.whoosh(1.6), 0, T['tiltUp'], 0.09)
sfx.put(S.whoosh(1.4), 0, T['zoomOut'] - 0.1, 0.10)
for k, pan in enumerate((-0.4, 0.3, 0.6)):   # respirations courtes, haletantes
    x = 56.4 + k * 0.23
    while x < T['float'] + 0.6:
        tt, n = S.burst(0.32)
        br = bp(S.noise(n), 500 + k * 120, 2600) * np.sin(np.pi * tt / 0.32) ** 2
        sfx.put(br, pan, x, 0.022 * (0.6 + 0.4 * (x - 56) / 5)); x += rng.uniform(0.42, 0.58)
tremor = lp(S.pink(), 100) * S.window(T['wide'] - 0.6, T['float'] + 1.2, 0.6, 1.0)
sfx.put(tremor, 0, 0, 0.35)
groan = lp(S.pink(), 110) * S.ramp(T['float'], T['flash']) ** 1.5 * (1 - S.ramp(T['flash'], T['flash'] + 0.05))
sfx.put(groan, 0, 0, 0.55)
wind = np.zeros(N)
for lo, hi, rate in ((300, 900, 0.17), (700, 2200, 0.23)):
    band = bp(S.pink(), lo, hi); wind += band / np.abs(band).max() * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6)))
wind *= S.ramp(T['float'] + 1.0, T['tear']) * (1 - S.ramp(T['flash'], T['flash'] + 0.05))
sfx.put(wind, -0.3, 0, 0.12); sfx.put(np.roll(wind, int(0.4 * SR)), 0.5, 0, 0.08)
for x, f, g in [(T['float'] + 0.25, 900, 0.05), (T['float'] + 0.45, 700, 0.04), (T['float'] + 0.8, 1500, 0.03)]:
    tt, n = S.burst(0.35); scrape = bp(S.noise(n), f * 0.6, f * 2) * np.sin(np.pi * tt / 0.35) ** 2
    sfx.put(scrape, rng.uniform(-0.5, 0.5), x, g)
tt, n = S.burst(1.2); creak = np.sin(2 * np.pi * np.cumsum(180 + 90 * np.sin(tt * 7)) / SR) * np.sin(np.pi * tt / 1.2) * 0.5
sfx.put(lp(creak, 1200), 0.6, T['float'] + 1.6, 0.05)
for _ in range(60):
    sfx.put(S.crack(), rng.uniform(-0.9, 0.9), rng.uniform(T['tear'], T['flash']), rng.uniform(0.05, 0.16))
for _ in range(18):
    tt, n = S.burst(0.7); thud = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tt * 4) + 30) / SR) * np.exp(-tt * 5)
    sfx.put(thud, rng.uniform(-0.7, 0.7), rng.uniform(T['tear'] + 0.3, T['flash']), 0.18)
sfx.put(S.boom(4.5, 60, 22), 0, T['flash'] - 0.05, 0.7)
cut = 1 - S.ramp(T['flash'] + 0.3, T['black'] + 0.4)
sfx.mul(cut); amb.mul(cut); far.mul(cut)

# =====================================================================
# MUSIQUE (la mineur)
# =====================================================================
CH = {'Am': [45, 52, 57, 60, 64], 'F': [41, 48, 53, 57, 60], 'C': [48, 55, 60, 64, 67], 'G': [43, 50, 55, 59, 62],
      'Dm': [38, 45, 50, 53, 57], 'E': [40, 47, 52, 56, 59], 'Am9': [45, 52, 57, 59, 64], 'Bb': [46, 53, 58, 62, 65]}
def chords(prog, voice, gain, bright=0.28, fin=0.9, fout=0.9):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.4, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.organ(hz(m), env) if voice == 'organ' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.4, 0.4), 0, gain)
    return b
# 1. le thème de la nuit
night = [(0, 4.2, 'Am'), (4.2, 8.4, 'F'), (8.4, 12.6, 'C'), (12.6, 16.8, 'G')]
mus.add(chords(night, 'pad', 0.05))
x, k = 0.4, 0
while x < 16.6:
    c = next(c for a, z, c in night if a <= x < z)
    notes = [m + 12 for m in CH[c][1:5]]
    mus.put(S.pluck(hz(notes[[0, 1, 2, 3, 2, 1][k % 6]]), 2.2, 2.4), 0.3 if k % 2 else -0.3, x, 0.055)
    k += 1; x += 0.5
# 2. les marées : sombre, une pulsation grave
mus.add(chords([(16.8, 20.8, 'Dm'), (20.8, 24.8, 'E'), (24.8, 28.8, 'Dm'), (28.8, 33.0, 'E')], 'pad', 0.055, 0.35))
for x in np.arange(17.0, 33.0, 0.75):
    mus.put(S.hit(hz(33), 0.6, 6), 0, x, 0.09)
# 3. le sol : la tension monte, la pulsation accélère
mus.add(chords([(33.0, 35.4, 'Bb'), (35.4, Q, 'E')], 'pad', 0.06, 0.4))
for x in np.arange(33.0, Q - 0.1, 0.5):
    mus.put(S.hit(hz(33), 0.5, 7), 0, x, 0.10)
mus.put(bp(S.noise(), 500, 5000) * S.ramp(33.0, Q) ** 2.5 * (t < Q), 0, 0, 0.05)
# 4. le séisme : coup grave, puis seulement un bourdon
mus.put(S.hit(hz(28), 2.5, 1.4), 0, Q, 0.32)
mus.put(S.pad(hz(38), S.window(Q + 0.2, T['tiltUp'] + 0.6, 1.5, 1.0) * 0.8, 0.15), 0, 0, 0.06)
# 5. le ciel : chœur + clochettes
mus.add(chords([(T['tiltUp'], T['moonBreak'], 'Am9')], 'choir', 0.05, fin=2.0))
for x, m in zip(np.arange(44.9, 50.0, 1.25), [76, 79, 81, 84]):
    mus.put(S.pluck(hz(m), 3.0, 1.2), rng.uniform(-0.5, 0.5), x, 0.035)
mus.put(S.hit(hz(33), 2.5, 1.6), 0, T['moonBreak'], 0.30)
mus.add(chords([(T['moonBreak'], T['zoomOut'], 'F')], 'choir', 0.06, fin=0.6))
# 6. retour sur Terre : pulsation qui accélère
gap, x = 0.9, T['zoomOut']
while x < T['float']:
    mus.put(S.hit(hz(45), 0.4, 9), 0, x, 0.09); x += gap; gap = max(0.28, gap * 0.86)
mus.put(bp(S.noise(), 400, 5000) * S.ramp(T['zoomOut'], T['float']) ** 3 * (t < T['float']), 0, 0, 0.06)
mus.add(chords([(T['wide'] - 0.5, T['float'], 'Am')], 'pad', 0.035, 0.2))
# 7. apesanteur : une note tenue, suspendue
float_env = S.window(T['float'], T['tear'] + 0.6, 0.4, 1.0)
mus.put(S.choir(hz(76), float_env), 0.2, 0, 0.05); mus.put(S.choir(hz(81), float_env), -0.2, 0, 0.035)
mus.put(S.pad(hz(45), float_env * 0.7, 0.2), 0, 0, 0.05)
# 8. la déchirure : orgue + chœur + percussions, crescendo
tr = T['tear']
climax = [(tr, tr + 1.3, 'Am'), (tr + 1.3, tr + 2.6, 'F'), (tr + 2.6, tr + 3.8, 'G'), (tr + 3.8, T['flash'], 'E')]
cres = S.ramp(tr, T['flash'])
org = chords(climax, 'organ', 0.03); org.mul(0.4 + 0.6 * cres); mus.add(org)
cho = chords(climax, 'choir', 0.05); cho.mul(0.4 + 0.6 * cres); mus.add(cho)
gap, x = 0.75, tr
while x < T['flash'] - 0.05:
    mus.put(S.hit(hz(33), 0.7, 5), 0, x, 0.20); x += gap; gap = max(0.2, gap * 0.9)
mus.mul(1 - S.ramp(T['flash'] - 0.02, T['flash'] + 0.12) * (t < T['endCard'] - 0.2))
# 9. l'écran de fin
end = S.window(T['endCard'], T['duration'], 0.6, 1.8)
for m in CH['Am']:
    mus.put(S.pad(hz(m), end, 0.22), 0, 0, 0.045)
for i, m in enumerate([69, 72, 76]):
    mus.put(S.pluck(hz(m), 3.0, 1.5), (i - 1) * 0.3, T['endCard'] + 0.3 + i * 0.55, 0.05)

mus_v = S.verb(mus, wet=0.45, secs=3.5)
mus_v.mul(1 - S.window(T['flash'] + 0.15, T['endCard'] - 0.05, 0.35, 0.05))
amb_v = S.verb(amb, wet=0.25, secs=1.6)
far_v = S.verb(far, wet=0.6, secs=2.8)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

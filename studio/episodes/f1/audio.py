"""Bande-son « Et si tu conduisais une F1 comme un pilote ? » : le circuit au calme (vent, oiseaux de la garrigue), le
moteur qui démarre et tourne au ralenti, puis chaque passage de la F1 (un V6 qui hurle, plus aigu quand il approche,
plus grave quand il s'éloigne, rétrogradages au freinage), le crissement du tête-à-queue, un cœur qui bat de plus en
plus vite, les arrêts sur image, le rembobinage. La position de la F1 vient de la scène (events['track']). Tout est
synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=5842); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus, eng = S.bus(), S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; GO = E['go']; SEAT = E['seat']; SPIN = E['spin']; STOP = E['stop']
RW0, RW1 = E['rewind']; PASSES = E['passes']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.88 * frozen
real = S.ramp(RW1, RW1 + 0.5)

# --- la trajectoire de la F1 (échantillonnée à 20 i/s) → à la fréquence du son
tr = np.array(E['track'], dtype=float)
ti = lambda col: np.interp(t, tr[:, 0], tr[:, col])
dist = ti(1); vel = ti(2); pan = np.clip(ti(3), -1, 1)
vis = dist < 5000
dist = np.where(vis, dist, 3000)
dd = np.gradient(lp(dist, 6), 1 / SR)                     # vitesse radiale (m/s) : négative quand elle approche
dop = 343 / np.clip(343 + dd, 200, 600)                   # l'effet Doppler
# le régime : 8 rapports, de 7 000 à 12 000 tr/min dans chaque rapport ; au ralenti 4 000
gear = np.clip(np.floor(vel / 11.5), 0, 7)
rpm = np.where(vel < 1, 4000, 7000 + 5000 * np.clip((vel - gear * 11.5) / 11.5, 0, 1))
rpm = lp(rpm, 25)
f0 = rpm / 60 * 3 * dop                                    # un V6 : 3 explosions par tour
ph = 2 * np.pi * np.cumsum(f0) / SR
saw = sum(np.sin(ph * k + 0.3 * k) / k ** 1.1 for k in range(1, 12))
rough = 1 + 0.25 * lp(S.noise(), 400)
motor = saw * rough + 0.25 * bp(S.noise(), 1500, 6000) * (vel / 90)
on = S.ramp(SEAT + 1.6, SEAT + 1.9)                        # le moteur démarre une fois Camille assise
level = 1 / (1 + (dist / 14) ** 1.3)                        # plus fort quand elle est près
level = np.maximum(level, 0.012 * on)                       # au loin, on l'entend encore faiblement faire le tour
eng.L += motor * level * on * live * (1 - 0.4 * pan) * 0.5
eng.R += motor * level * on * live * (1 + 0.4 * pan) * 0.5
eng.mul(1 - S.ramp(STOP - 0.2, STOP + 0.6) * (1 - S.ramp(RW1, RW1 + 0.2)))  # le moteur cale après le tête-à-queue
# le démarreur
tt, n = S.burst(1.0); sfx.put(bp(S.noise(n), 200, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * tt)) * np.sin(np.pi * tt), 0, SEAT + 0.7, 0.08)
# les rétrogradages au freinage : des petites détonations
for p in PASSES:
    for k in range(5):
        tt, n = S.burst(0.06); sfx.put(bp(S.noise(n), 300, 3000) * np.exp(-tt * 70), 0, p + 0.15 + k * 0.2, 0.1)
# le tête-à-queue : les pneus qui crissent, puis le silence
tt, n = S.burst(STOP - SPIN + 0.2)
sq = np.sin(2 * np.pi * np.cumsum(2300 + 400 * np.sin(2 * np.pi * 7 * tt) - 900 * tt / tt[-1]) / SR) * 0.6 + bp(S.noise(n), 1800, 5000)
sfx.put(sq * np.sin(np.pi * tt / tt[-1]) ** 0.4, 0.1, SPIN, 0.12)
sfx.put(S.boom(1.5, 60, 25), 0, SPIN, 0.12)

# --- le circuit au calme : un peu de vent, des oiseaux
wind = bp(S.pink(), 150, 900) * (0.6 + 0.4 * lp(np.abs(S.noise()), 0.4, 1) / 0.4)
amb.put(wind * live, 0, 0, 0.05)
for _ in range(16):
    at = rng.uniform(0.3, END - 1); tt, n = S.burst(0.5); f = rng.uniform(2800, 4200)
    chirp = np.sin(2 * np.pi * np.cumsum(f + 900 * np.sin(2 * np.pi * rng.uniform(9, 16) * tt)) / SR) * np.exp(-tt * 8)
    far.put(chirp, rng.uniform(-0.8, 0.8), at, 0.012)

# --- le cœur de Camille : lub-dub, de plus en plus vite et fort (dès qu'elle est dans la F1)
BPM = [(SEAT, 96), (GO, 128), (PASSES[0], 158), (PASSES[1], 168), (PASSES[2], 182), (SPIN, 196), (STOP + 6, 176), (RW0, 168)]
x = SEAT
while x < RW0:
    b = np.interp(x, [a for a, _ in BPM], [v for _, v in BPM]); g = 0.03 + 0.06 * np.clip((x - PASSES[1]) / (SPIN - PASSES[1]), 0, 1)
    if any(f['t'] <= x < f['t'] + f['dur'] for f in FZ): g *= 2.2
    for d, a in ((0, 1.0), (0.13, 0.65)): sfx.put(S.hit(48, 0.25, 22), 0, x + d, g * a)
    x += 60 / b
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
# --- le rembobinage
tt, n = S.burst(RW1 - RW0); fq = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far, eng): b.mul(fade)
amb.mul(1 - 0.6 * frozen)

# --- musique : une pulsation électronique en ré mineur qui accélère, puis s'ouvre en majeur au retour au réel
CH = {'Dm': [38, 50, 57, 62, 65], 'Bb': [34, 46, 53, 58, 62], 'C': [36, 48, 55, 60, 64], 'A': [33, 45, 52, 57, 61], 'Gm': [43, 55, 62, 67, 70],
      'D': [38, 50, 57, 62, 66], 'G': [43, 55, 62, 67, 71], 'Dsus': [38, 50, 57, 62, 67]}
def chords(prog, gain, bright=0.25):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
P = PASSES
prog = [(0, GO, 'Dm'), (GO, P[0], 'Bb'), (P[0], P[1] - 4, 'Gm'), (P[1] - 4, P[2] - 4, 'Dm'), (P[2] - 4, P[3] - 4, 'Bb'), (P[3] - 4, SPIN, 'A'),
        (STOP + 1, RW0, 'Dm'), (RW1, END - 3, 'D'), (END - 3, END, 'G'), (END, T['duration'], 'Dsus')]
mus.add(chords(prog, 0.026))
x = GO   # la basse qui pulse, de plus en plus serrée
while x < SPIN:
    k = (x - GO) / (SPIN - GO); mus.put(S.hit(hz(38 if x < P[3] - 4 else 33), 0.3, 10), 0, x, 0.05 + 0.03 * k); x += 0.5 - 0.25 * k
for x in np.arange(0.3, GO, 0.75): mus.put(S.pluck(hz(rng.choice([62, 65, 69, 74])), 1.4, 3), rng.uniform(-0.5, 0.5), x, 0.022)
for x in np.arange(RW1 + 0.5, END - 0.5, 0.75): mus.put(S.pluck(hz(rng.choice([62, 66, 69, 74])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.026)
for i, m in enumerate([62, 67, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul((1 - 0.5 * frozen) * (1 - S.window(SPIN + 0.2, STOP + 1.2, 0.1, 0.8)))   # silence juste après le tête-à-queue
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4)
sfx_v = S.verb(sfx, wet=0.18, secs=1.6); eng_v = S.verb(eng, wet=0.22, secs=1.8)
master([(eng_v, 1.0), (sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

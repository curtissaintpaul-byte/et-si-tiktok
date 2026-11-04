"""Bande-son « Et si tu courais à côté du recordman du marathon ? » : le stade presque vide un soir (la rumeur lointaine,
le vent sous le toit, l'écho), le bip de départ, les foulées de Léa sur le tartan (de plus en plus lourdes), son souffle
qui s'accélère et son cœur qui cogne de plus en plus fort, les petits « tic » des lumières de pacing, les arrêts sur image,
le temps qui accélère (un tourbillon qui monte), la sirène d'arrivée, le rembobinage.
Musique : une pulsation électronique en la mineur qui accélère avec la course, se brise quand Léa craque, repart en
accéléré, puis s'ouvre en la majeur au retour au réel. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=4219); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; RW0, RW1 = E['rewind']
GO, SLOW, STOP, SIT = E['go'], E['slow'], E['stop'], E['sit']; A0, A1 = E['acc']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.88 * frozen

def in_freeze(x):
    return any(f['t'] <= x < f['t'] + f['dur'] for f in FZ)

# --- le stade : la rumeur lointaine, le vent sous le toit
amb.put(bp(S.pink(), 150, 1200) * (1 + 0.3 * lp(S.noise(), 0.5)) * live, 0, 0, 0.04)
amb.put(bp(S.noise(), 400, 2500) * (0.6 + 0.4 * lp(np.abs(S.noise()), 0.3) / 0.2) * live, 0.2, 0, 0.012)
for _ in range(10):   # quelques voix et applaudissements lointains dans les tribunes
    at = rng.uniform(0.5, END - 2); tt, n = S.burst(1.2)
    far.put(bp(S.noise(n), 600, 3000) * np.sin(np.pi * tt / tt[-1]) * (1 + np.sin(2 * np.pi * rng.uniform(6, 11) * tt)), rng.uniform(-0.8, 0.8), at, 0.012)

# --- le départ : 3 bips courts puis un long (comme un départ de piste)
for k in range(3):
    tt, n = S.burst(0.12); sfx.put(np.sin(2 * np.pi * 880 * tt) * np.exp(-tt * 8), 0, GO - 3 + k, 0.05)
tt, n = S.burst(0.6); sfx.put(np.sin(2 * np.pi * 1760 * tt) * np.exp(-tt * 3), 0, GO, 0.06)

# --- les foulées de Léa : de plus en plus lourdes et espacées quand elle craque
x = GO + 0.15
while x < STOP:
    k = np.clip((x - SLOW) / max(0.1, STOP - SLOW), 0, 1)
    if not in_freeze(x):
        tt, n = S.burst(0.07); step = bp(S.noise(n), 300 - 120 * k, 2600 - 1200 * k) * np.exp(-tt * (70 - 30 * k)) + 0.5 * lp(S.noise(n), 200) * np.exp(-tt * 40) * k
        sfx.put(step, rng.uniform(-0.15, 0.15), x, 0.05 + 0.03 * k)
    x += 0.30 + 0.22 * k
# --- son souffle : de plus en plus rapide et fort, puis il halète, puis il se calme
x, i = GO + 1.0, 0
while x < SIT + 6:
    if not in_freeze(x):
        k = np.clip((x - GO) / (STOP - GO), 0, 1); calm = np.clip((x - STOP - 6) / 8, 0, 1)
        dur = 0.32 - 0.12 * k + 0.25 * calm; tt, n = S.burst(dur)
        g = (0.012 + 0.035 * k) * (1 - 0.7 * calm)
        sfx.put(bp(S.noise(n), 500 + 400 * (i % 2), 3500) * np.abs(np.sin(np.pi * tt / tt[-1])) ** 1.5, 0.05, x, g)
        x += dur * (1.25 - 0.2 * k + 0.6 * calm)
    else:
        x += 0.1
    i += 1
# --- son cœur : il monte avec la course (simulé comme à l'écran), on l'entend surtout quand elle craque et pendant l'arrêt
BPM = [(0, 78), (GO - 3, 96), (GO, 104), (GO + 8, 150), (GO + 18, 172), (GO + 30, 183), (STOP, 186), (STOP + 10, 168), (SIT + 4, 140), (A1, 96)]
def bpm_at(x):
    for (a, va), (b, vb) in zip(BPM, BPM[1:]):
        if x < b: return va + (vb - va) * np.clip((x - a) / (b - a), 0, 1)
    return BPM[-1][1]
x = GO + 6
while x < A0 + 2:
    gain = 0.03 + 0.07 * np.clip((x - (GO + 12)) / 14, 0, 1) * (1 - np.clip((x - (SIT + 2)) / 6, 0, 1))
    for d, a in ((0, 1.0), (0.12, 0.6)): sfx.put(S.hit(50, 0.22, 24), 0, x + d, gain * a)
    x += 60 / bpm_at(x) if not in_freeze(x) else 60 / 186

for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])

# --- le temps qui accélère : un tourbillon qui monte, des « tic » de plus en plus serrés (les tours qui passent)
tt, n = S.burst(A1 - A0); fq = 200 + 1600 * (tt / tt[-1]) ** 2
sfx.put((np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.3 + bp(S.noise(n), 800, 6000)) * np.sin(np.pi * tt / tt[-1]) ** 0.8, 0, A0, 0.035)
for j in range(1, 60):
    at = A0 + (A1 - A0) * (j / 60) ** 0.5
    tt, n = S.burst(0.05); sfx.put(np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 80), rng.uniform(-0.6, 0.6), at, 0.025)
# --- l'arrivée : une sirène de stade et une clameur
tt, n = S.burst(1.6); sfx.put(sum(np.sin(2 * np.pi * f * tt) * a for f, a in ((440, 1), (554, 0.7), (659, 0.5))) * np.minimum(1, tt * 20) * np.exp(-tt * 1.2), 0, A1, 0.05)
far.put(bp(S.pink(), 300, 2500) * S.window(A1, A1 + 3.5, 0.3, 1.5), 0, 0, 0.05)

# --- le rembobinage
tt, n = S.burst(RW1 - RW0); fq = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade)
amb.mul(1 - 0.6 * frozen)

# --- musique : la mineur, une pulsation qui accélère pendant la course
CH = {'Am': [45, 57, 64, 69, 72], 'F': [41, 53, 60, 65, 69], 'G': [43, 55, 62, 67, 71], 'Em': [40, 52, 59, 64, 67], 'A': [45, 57, 64, 69, 73], 'D': [38, 50, 57, 62, 66], 'Dm': [38, 50, 57, 62, 65]}
def chords(prog, gain, bright=0.25):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, GO, 'Am'), (GO, SLOW, 'F'), (SLOW, STOP, 'Em'), (STOP, SIT, 'Dm'), (SIT, A0, 'Am'), (A0, A1, 'G'), (A1, RW0, 'F'),
        (RW1, END - 3, 'D'), (END - 3, END, 'A'), (END, T['duration'], 'A')]
mus.add(chords(prog, 0.02))
x = 0.5   # la pulsation (basse) : lente avant le départ, rapide pendant la course, elle se brise quand Léa ralentit
while x < STOP + 0.5:
    per = 0.6 if x < GO else 0.6 - 0.28 * np.clip((x - GO) / 10, 0, 1) + 0.5 * np.clip((x - SLOW) / max(0.1, STOP - SLOW), 0, 1)
    if not in_freeze(x): mus.put(S.hit(hz(33), 0.3, 9), 0, x, 0.045)
    x += per
arp = [69, 72, 76, 81, 76, 72]
x, j = GO, 0
while x < SLOW:
    if not in_freeze(x): mus.put(S.pluck(hz(arp[j % 6]), 0.5, 6), rng.uniform(-0.4, 0.4), x, 0.02)
    x += 0.2; j += 1
x, j = A0, 0   # en accéléré : l'arpège revient, de plus en plus serré
while x < A1:
    mus.put(S.pluck(hz([67, 71, 74, 79][j % 4]), 0.4, 6), rng.uniform(-0.5, 0.5), x, 0.02)
    x += 0.24 - 0.14 * (x - A0) / (A1 - A0); j += 1
for x in np.arange(RW1 + 0.5, END - 0.5, 0.75): mus.put(S.pluck(hz(rng.choice([62, 66, 69, 74])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.026)
for i, m in enumerate([57, 64, 69, 73]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1.5) * 0.25, END + 0.3 + i * 0.45, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.55, secs=2.8); amb_v = S.verb(amb, wet=0.35, secs=2.4); sfx_v = S.verb(sfx, wet=0.2, secs=1.8)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

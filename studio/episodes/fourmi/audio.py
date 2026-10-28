"""Bande-son « Et si tu avais la force d'une fourmi ? » : la place du village le samedi matin (la fontaine, des oiseaux,
le clocher au loin), les pas de Julie, les sacs de ciment qui tombent en tas (de plus en plus vite), le murmure de la
foule, le scooter et la voiture qui grincent au-dessus de sa tête, les arrêts sur image, un cœur qui cogne, le corps qui
grossit (un grondement qui monte), le banc qui craque, le rembobinage. Musique : des pizzicati légers en sol majeur, qui
deviennent graves et tendus quand le corps change, puis s'ouvrent au retour au réel. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=5050); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; RW0, RW1 = E['rewind']
P0, P1 = E['pile']; C0, C1 = E['crowd']; G0, G1 = E['grow']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.88 * frozen

# --- la place : l'eau de la fontaine, des oiseaux, le vent léger
water = bp(S.noise(), 900, 5000) * (0.7 + 0.3 * lp(np.abs(S.noise()), 3) / 0.3)
amb.put(water * live, -0.2, 0, 0.018)
amb.put(bp(S.pink(), 120, 700) * live, 0, 0, 0.03)
for _ in range(22):
    at = rng.uniform(0.3, END - 1); tt, n = S.burst(0.4); f = rng.uniform(2600, 4300)
    chirp = np.sin(2 * np.pi * np.cumsum(f + 800 * np.sin(2 * np.pi * rng.uniform(10, 18) * tt)) / SR) * np.exp(-tt * 9)
    far.put(chirp, rng.uniform(-0.8, 0.8), at, 0.01)
for k in range(3):   # le clocher sonne au loin (une fois, au début)
    tt, n = S.burst(3.0); far.put(sum(np.sin(2 * np.pi * f * tt) * a for f, a in ((392, 1), (784, 0.4), (1046, 0.2))) * np.exp(-tt * 1.4), 0.3, 1.0 + k * 1.6, 0.03)
# les pas de Julie au début
for x in np.arange(1.0, 5.6, 0.5):
    tt, n = S.burst(0.08); sfx.put(bp(S.noise(n), 300, 2500) * np.exp(-tt * 60), 0.1, x, 0.05)

# --- le sac qu'elle soulève d'une main (froissement), puis le tas : chaque sac qui tombe = un « pouf »
tt, n = S.burst(0.5); sfx.put(bp(S.noise(n), 500, 4000) * np.exp(-tt * 8), 0.2, E['sack'] - 0.4, 0.08)
NS = 120
for i in range(1, NS + 1):
    at = P0 + (P1 - P0) * np.log(i) / np.log(NS) + 0.2
    tt, n = S.burst(0.12); thud = lp(S.noise(n), 260) * np.exp(-tt * 40) + 0.3 * bp(S.noise(n), 800, 3000) * np.exp(-tt * 70)
    sfx.put(thud, rng.uniform(-0.5, -0.1), at, 0.16 * (0.5 if i > 40 else 1))
# la foule qui arrive : un murmure
mur = bp(S.pink(), 250, 1800) * (1 + 0.5 * lp(S.noise(), 4)) * S.window(C0, C1 + 2.2, 1.0, 1.2)
amb.put(mur, 0, 0, 0.05)
for k in range(10):
    at = rng.uniform(C0 + 0.3, C1 + 1.5); tt, n = S.burst(0.5)
    amb.put(bp(S.noise(n), 400, 2200) * np.sin(np.pi * tt / tt[-1]) * (1 + np.sin(2 * np.pi * 5 * tt)), rng.uniform(-0.7, 0.7), at, 0.02)

# --- le scooter et la voiture qui montent : un grincement de métal, et un « clonc » quand ils sont en haut
for at, size in ((E['scoot'], 0.6), (E['carUp'], 1.0)):
    tt, n = S.burst(1.0); fq = 300 + 500 * tt + 40 * np.sin(2 * np.pi * 9 * tt)
    sfx.put(np.sin(2 * np.pi * np.cumsum(fq) / SR) * bp(S.noise(n), 400, 2400) * np.sin(np.pi * tt), 0.1, at - 0.9, 0.05 * size)
    sfx.put(S.hit(70, 0.5, 9), 0, at, 0.15 * size)
sfx.put(S.boom(1.4, 55, 30), 0, E['carDown'], 0.2)   # elle repose la voiture

# --- le cœur : il cogne pendant la voiture (1er arrêt) et pendant le 2e arrêt
x = E['carUp'] - 0.5
while x < E['carDown'] + 1.5:
    g = 0.05 * (2.2 if any(f['t'] <= x < f['t'] + f['dur'] for f in FZ) else 1)
    for d, a in ((0, 1.0), (0.13, 0.65)): sfx.put(S.hit(48, 0.25, 22), 0, x + d, g * a)
    x += 60 / 150
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])

# --- le corps qui grossit : un grondement grave qui monte
tt, n = S.burst(G1 - G0)
grow = lp(S.noise(n), 90) * 3 + np.sin(2 * np.pi * np.cumsum(40 + 25 * tt / tt[-1]) / SR) * 0.6
sfx.put(grow * np.clip(tt / 1.5, 0, 1) * np.clip((tt[-1] - tt) / 0.8, 0, 1) * (0.4 + 0.6 * tt / tt[-1]), 0, G0, 0.08)
# le banc qui craque
sfx.put(S.crack(), 0.2, E["bench"], 0.25)
sfx.put(S.boom(1.0, 70, 35), 0.1, E['bench'] + 0.15, 0.22)

# --- le rembobinage
tt, n = S.burst(RW1 - RW0); fq = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
# au réel : Julie qui souffle sous le sac
tt, n = S.burst(1.2); sfx.put(bp(S.noise(n), 300, 1500) * np.sin(np.pi * tt / tt[-1]), 0, RW1 + 1.6, 0.04)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade)
amb.mul(1 - 0.6 * frozen)

# --- musique : pizzicati en sol majeur, puis mi mineur tendu quand le corps change, puis ré majeur au réel
CH = {'G': [43, 55, 62, 67, 71], 'C': [36, 48, 55, 60, 64], 'D': [38, 50, 57, 62, 66], 'Em': [40, 52, 59, 64, 67], 'Am': [45, 57, 64, 69, 72],
      'B': [35, 47, 54, 59, 63], 'Dsus': [38, 50, 57, 62, 67]}
def chords(prog, gain, bright=0.25):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, P0, 'G'), (P0, C1 + 2, 'C'), (C1 + 2, E['carUp'], 'D'), (E['carUp'], G0, 'Am'), (G0, E['bench'], 'Em'), (E['bench'], RW0, 'B'),
        (RW1, END - 3, 'D'), (END - 3, END, 'G'), (END, T['duration'], 'Dsus')]
mus.add(chords(prog, 0.022))
scale_maj = [67, 71, 74, 79, 83]
for x in np.arange(0.4, E['carUp'], 0.375):
    mus.put(S.pluck(hz(rng.choice(scale_maj)), 0.9, 4), rng.uniform(-0.5, 0.5), x, 0.024 + 0.012 * (P0 < x < C1 + 2))
x = G0   # la basse qui pulse pendant la transformation
while x < RW0:
    mus.put(S.hit(hz(28), 0.35, 8), 0, x, 0.06); x += 0.75 - 0.3 * min(1, (x - G0) / (RW0 - G0))
for x in np.arange(RW1 + 0.5, END - 0.5, 0.75): mus.put(S.pluck(hz(rng.choice([62, 66, 69, 74])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.026)
for i, m in enumerate([62, 67, 71]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.18, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

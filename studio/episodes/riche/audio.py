"""Bande-son « Et si tu étais l'homme le plus riche du monde ? » : la place du village le lundi matin (la fontaine, des
oiseaux, le clocher au loin), les pas d'Inès, le « ding » de la fortune qui tombe, le froissement de la liasse, les liasses
qui tombent en tas (de plus en plus vite), le murmure de la foule, les pas lourds des gardes du corps, l'arrêt sur image,
la bourse qui chute (une sirène grave qui descend), les passants qui s'approchent, le rembobinage.
Musique : des pizzicati légers en sol majeur, qui deviennent graves pendant la chute, puis s'ouvrent au retour au réel.
Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=7377); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; RW0, RW1 = E['rewind']
P0, P1 = E['pile']; C0, C1 = E['crowd']; D0, D1 = E['drop']
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
for k in range(3):   # le clocher sonne 9 h au loin
    tt, n = S.burst(3.0); far.put(sum(np.sin(2 * np.pi * f * tt) * a for f, a in ((392, 1), (784, 0.4), (1046, 0.2))) * np.exp(-tt * 1.4), 0.3, E['rich'] - 0.6 + k * 1.4, 0.03)
for x in np.arange(1.0, 5.6, 0.5):   # les pas d'Inès
    tt, n = S.burst(0.08); sfx.put(bp(S.noise(n), 300, 2500) * np.exp(-tt * 60), 0.1, x, 0.05)

# --- la fortune qui tombe : un « ding » brillant
tt, n = S.burst(2.5)
ding = sum(np.sin(2 * np.pi * f * tt) * a for f, a in ((1568, 1), (2093, 0.6), (3136, 0.3))) * np.exp(-tt * 2.2)
sfx.put(ding, 0, E['rich'], 0.07)
# --- la liasse : un froissement de billets
tt, n = S.burst(0.6); sfx.put(bp(S.noise(n), 1500, 7000) * np.exp(-tt * 7) * (1 + np.sin(2 * np.pi * 23 * tt)), 0.2, E['bill'], 0.06)
# --- le tas : chaque liasse qui tombe = un petit « flap » (on en joue 160, réparties comme le compteur)
NS = 160
for i in range(1, NS + 1):
    at = P0 + (P1 - P0) * np.log(i) / np.log(NS) + 0.2
    tt, n = S.burst(0.08); flap = bp(S.noise(n), 600, 4000) * np.exp(-tt * 55) + 0.4 * lp(S.noise(n), 300) * np.exp(-tt * 40)
    sfx.put(flap, rng.uniform(-0.5, -0.1), at, 0.09 * (0.5 if i > 50 else 1))
# --- la foule qui arrive : un murmure
mur = bp(S.pink(), 250, 1800) * (1 + 0.5 * lp(S.noise(), 4)) * S.window(C0, C1 + 2.2, 1.0, 1.2)
amb.put(mur, 0, 0, 0.06)
for k in range(12):
    at = rng.uniform(C0 + 0.3, C1 + 1.5); tt, n = S.burst(0.5)
    amb.put(bp(S.noise(n), 400, 2200) * np.sin(np.pi * tt / tt[-1]) * (1 + np.sin(2 * np.pi * 5 * tt)), rng.uniform(-0.7, 0.7), at, 0.02)

# --- les gardes du corps : des pas lourds
for x in np.arange(E['guards'], E['guards'] + 2.6, 0.42):
    for pan in (-0.6, 0.6):
        tt, n = S.burst(0.1); sfx.put(lp(S.noise(n), 900) * np.exp(-tt * 45), pan, x + (0.1 if pan > 0 else 0), 0.07)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])

# --- la bourse qui chute : une sirène grave qui descend, et un cœur qui cogne
tt, n = S.burst(D1 - D0 + 1.0); fq = 520 - 300 * np.clip(tt / (D1 - D0), 0, 1)
sfx.put(np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.sin(np.pi * tt / tt[-1]) ** 0.7, 0, D0, 0.05)
sfx.put(S.boom(1.4, 50, 30), 0, D0 + 0.1, 0.18)
x = D0
while x < D1 + 1.5:
    for d, a in ((0, 1.0), (0.13, 0.65)): sfx.put(S.hit(48, 0.25, 22), 0, x + d, 0.05 * a)
    x += 60 / 130
# --- les passants qui s'approchent : des pas et des voix étouffées
for k in range(3):
    for x in np.arange(E['ask'] + k * 0.5, E['ask'] + 2.6 + k * 0.5, 0.5):
        tt, n = S.burst(0.08); sfx.put(bp(S.noise(n), 300, 2500) * np.exp(-tt * 60), (k - 1) * 0.5, x, 0.03)
    for j in range(3):
        at = E['ask'] + 3.0 + k * 0.6 + j * 1.1; tt, n = S.burst(0.6)
        amb.put(bp(S.noise(n), 300, 1600) * np.sin(np.pi * tt / tt[-1]) * (1 + np.sin(2 * np.pi * rng.uniform(4, 7) * tt)), (k - 1) * 0.5, at, 0.03)

# --- le rembobinage
tt, n = S.burst(RW1 - RW0); fq = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade)
amb.mul(1 - 0.6 * frozen)

# --- musique : pizzicati en sol majeur, mi mineur pendant la chute, ré majeur au réel
CH = {'G': [43, 55, 62, 67, 71], 'C': [36, 48, 55, 60, 64], 'D': [38, 50, 57, 62, 66], 'Em': [40, 52, 59, 64, 67], 'Am': [45, 57, 64, 69, 72],
      'B': [35, 47, 54, 59, 63], 'Dsus': [38, 50, 57, 62, 67]}
def chords(prog, gain, bright=0.25):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, E['rich'], 'G'), (E['rich'], P0, 'D'), (P0, C1 + 2, 'C'), (C1 + 2, E['guards'], 'G'), (E['guards'], D0, 'Am'), (D0, E['ask'], 'Em'),
        (E['ask'], RW0, 'B'), (RW1, END - 3, 'D'), (END - 3, END, 'G'), (END, T['duration'], 'Dsus')]
mus.add(chords(prog, 0.022))
scale_maj = [67, 71, 74, 79, 83]
for x in np.arange(0.4, D0, 0.375):
    mus.put(S.pluck(hz(rng.choice(scale_maj)), 0.9, 4), rng.uniform(-0.5, 0.5), x, 0.024 + 0.012 * (P0 < x < C1 + 2))
x = D0   # la basse qui pulse pendant la chute et après
while x < RW0:
    mus.put(S.hit(hz(28), 0.35, 8), 0, x, 0.05); x += 0.75
for x in np.arange(RW1 + 0.5, END - 0.5, 0.75): mus.put(S.pluck(hz(rng.choice([62, 66, 69, 74])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.026)
for i, m in enumerate([62, 67, 71]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.18, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

"""Bande-son « Et si toute la France tombait en panne de courant ? » : un salon à Lyon. Avant : la rumeur de la ville
par la fenêtre, le ronron du frigo, le souffle du chauffage, la télé. La porte, les pas de Chloé.
À 18 h 32 : le « clac » de la coupure, puis plus rien. Le silence qui fait peur : on entend enfin le dehors (des klaxons,
une sirène au loin, des voix dans la cage d'escalier). Les bips du téléphone, le vent la nuit, le craquement de
l'immeuble qui refroidit. Les arrêts sur image. Au retour du courant : le frigo qui redémarre, la ville qui revient.
Musique : un bourdon grave et froid en ré mineur pendant la panne, qui s'ouvre en ré majeur au retour de la lumière. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1832); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; RW0, RW1 = E['rewind']
BO, TV, PH, NET = E['bo'], E['tv'], E['phone'], E['net']
NIGHT, DAY, DUSK, HOME = E['night'], E['day'], E['dusk'], E['home']; R0, R1 = E['rest']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.88 * frozen

def in_freeze(x):
    return any(f['t'] <= x < f['t'] + f['dur'] for f in FZ)

power = 1 - S.ramp(BO, BO + 0.05) + S.ramp(HOME, HOME + 0.3)          # 1 = il y a du courant chez Chloé
power = np.clip(power, 0, 1); power = np.maximum(power, S.ramp(RW1, RW1 + 0.2))
city = np.clip(1 - S.ramp(BO, BO + 0.1) + 0.8 * S.ramp(R0, R1), 0, 1); city = np.maximum(city, S.ramp(RW1, RW1 + 0.2))

# --- la ville par la fenêtre (rumeur de circulation) : forte avant, presque rien pendant la panne, elle revient
amb.put(bp(S.pink(), 80, 900) * (1 + 0.3 * lp(S.noise(), 0.4)) * (0.15 + 0.85 * city) * live, 0, 0, 0.05)
# --- le frigo (ronron à 50 Hz + harmoniques) et le chauffage (souffle), seulement avec le courant
hum = (np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 100 * t) + 0.2 * np.sin(2 * np.pi * 150 * t)) * (1 + 0.1 * np.sin(2 * np.pi * 0.3 * t))
sfx.put(hum * power * live, -0.4, 0, 0.012)
amb.put(bp(S.noise(), 300, 2000) * power * (1 - S.ramp(RW1 - 1, RW1)) * live * (t < BO + 1), 0.4, 0, 0.008)
# --- la télé (des voix étouffées) de TV à BO, et au retour au réel
tvsig = bp(S.noise(), 250, 2600) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.3 * t) * np.sin(2 * np.pi * 0.7 * t)))
tv_env = S.window(TV, BO, 0.3, 0.03) + S.window(RW1 + 0.3, END, 0.6, 0.4)
sfx.put(tvsig * tv_env * live, 0.3, 0, 0.02)
# --- la porte et les pas de Chloé
tt, n = S.burst(0.35); sfx.put(lp(S.noise(n), 400) * np.exp(-tt * 12), -0.6, E['enter'] - 0.4, 0.12)
tt, n = S.burst(0.12); sfx.put(lp(S.noise(n), 1500) * np.exp(-tt * 40), -0.5, E['enter'] + 2.4, 0.08)   # elle pose son sac
for k in range(6):
    tt, n = S.burst(0.08); sfx.put(bp(S.noise(n), 120, 1200) * np.exp(-tt * 50), -0.4 + 0.12 * k, E['enter'] + 0.2 + 0.48 * k, 0.05)

# --- LA COUPURE : un « clac », la télé qui grésille et s'éteint, un grave qui s'effondre
tt, n = S.burst(0.08); sfx.put(hp(S.noise(n), 800) * np.exp(-tt * 60), 0, BO, 0.4)
tt, n = S.burst(0.35); sfx.put(bp(S.noise(n), 2000, 8000) * (np.sin(2 * np.pi * 47 * tt) > 0) * np.exp(-tt * 6), 0.3, BO, 0.06)
tt, n = S.burst(1.6); fq = 110 * np.exp(-tt * 1.4); sfx.put(np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-tt * 1.6), 0, BO, 0.12)
# --- dehors, après la coupure : des klaxons, une sirène, des voix dans l'escalier
for _ in range(9):
    at = rng.uniform(BO + 2, NET + 2)
    if in_freeze(at): continue
    tt, n = S.burst(rng.uniform(0.25, 0.6)); f0 = rng.uniform(380, 520)
    far.put((np.sign(np.sin(2 * np.pi * f0 * tt)) + 0.6 * np.sign(np.sin(2 * np.pi * f0 * 1.26 * tt))) * np.minimum(1, tt * 40) * np.minimum(1, (tt[-1] - tt) * 30), rng.uniform(-0.6, 0.6), at, 0.012)
for at in (BO + 9, NET - 3):   # une sirène au loin (deux tons)
    tt, n = S.burst(6.0); fq = np.where((tt % 1.2) < 0.6, 435, 580)
    far.put(np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2, -0.5, at, 0.02)
for _ in range(5):
    at = rng.uniform(BO + 3, NET); tt, n = S.burst(1.0)
    far.put(bp(S.noise(n), 300, 2400) * np.sin(np.pi * tt / tt[-1]) * (1 + np.sin(2 * np.pi * rng.uniform(5, 9) * tt)), 0.7, at, 0.008)
# --- le téléphone : le clic de la lampe, puis le petit son « plus de réseau »
tt, n = S.burst(0.04); sfx.put(hp(S.noise(n), 2000) * np.exp(-tt * 120), 0.1, PH - 0.2, 0.08)
for k, f in enumerate((880, 660, 440)):
    tt, n = S.burst(0.14); sfx.put(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 14), 0.1, NET + 0.1 + 0.16 * k, 0.04)
# --- la nuit : le vent contre la vitre, l'immeuble qui craque en refroidissant
wind = bp(S.noise(), 200, 1400) * (0.5 + 0.5 * lp(np.abs(S.noise()), 0.25) / 0.15)
amb.put(wind * S.window(E['night'] - 4, DAY, 1.5, 1.0) * live, 0, 0, 0.02)
for _ in range(6):
    at = rng.uniform(NIGHT - 3, DAY - 0.5)
    if in_freeze(at): continue
    tt, n = S.burst(0.15); sfx.put(bp(S.noise(n), 600, 3000) * np.exp(-tt * 30), rng.uniform(-0.7, 0.7), at, 0.03)
# --- le jour : des oiseaux, des voix dans la rue
for _ in range(14):
    at = rng.uniform(DAY, DUSK); tt, n = S.burst(0.12); f0 = rng.uniform(2800, 4200)
    far.put(np.sin(2 * np.pi * np.cumsum(f0 + 600 * np.sin(2 * np.pi * 18 * tt)) / SR) * np.sin(np.pi * tt / tt[-1]), rng.uniform(-0.8, 0.8), at, 0.006)

for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])

# --- le retour : les quartiers qui se rallument (des « tchac » lointains), le frigo qui redémarre, un soupir de soulagement
for k in range(12):
    at = R0 + 0.3 + k * (R1 - R0 - 0.6) / 12; tt, n = S.burst(0.2)
    far.put(lp(S.noise(n), 900) * np.exp(-tt * 20), rng.uniform(-0.7, 0.7), at, 0.04)
tt, n = S.burst(1.2); sfx.put(np.sin(2 * np.pi * np.cumsum(30 + 20 * np.minimum(1, tt * 2)) / SR) * np.minimum(1, tt * 3) * np.exp(-tt * 0.8), -0.4, HOME, 0.06)
tt, n = S.burst(0.05); sfx.put(hp(S.noise(n), 900) * np.exp(-tt * 70), 0, HOME, 0.2)

# --- le rembobinage
tt, n = S.burst(RW1 - RW0); fq = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tt / tt[-1]) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade)
amb.mul(1 - 0.6 * frozen)

# --- musique
CH = {'Dm': [38, 50, 57, 62, 65], 'Bb': [34, 46, 53, 58, 62], 'Gm': [43, 55, 62, 67, 70], 'A': [45, 57, 64, 69, 73], 'D': [38, 50, 57, 62, 66], 'F': [41, 53, 60, 65, 69], 'C': [36, 48, 55, 60, 64], 'Am': [45, 57, 64, 69, 72]}
def chords(prog, gain, bright=0.25):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, BO, 'F'), (BO + 1.5, NET, 'Dm'), (NET, NIGHT, 'Bb'), (NIGHT, DAY, 'Gm'), (DAY, DUSK, 'Dm'), (DUSK, R0, 'A'), (R0, HOME, 'D'), (HOME, RW0, 'D'),
        (RW1, END - 3, 'Bb'), (END - 3, END, 'F'), (END, T['duration'], 'F')]
mus.add(chords(prog, 0.02, 0.2))
x = BO + 2   # une pulsation grave, lente, comme un cœur inquiet, pendant la nuit
while x < DAY:
    if not in_freeze(x): mus.put(S.hit(hz(26), 0.4, 6), 0, x, 0.04)
    x += 1.6
x = 0.6   # avant la coupure : de petites notes tranquilles
while x < BO - 0.3:
    mus.put(S.pluck(hz(rng.choice([65, 69, 72, 77])), 1.0, 3), rng.uniform(-0.5, 0.5), x, 0.018); x += 0.8
x, j = R0, 0   # les lumières qui reviennent : un arpège qui monte
while x < HOME + 2:
    mus.put(S.pluck(hz([62, 66, 69, 74, 78, 81][j % 6]), 0.9, 3), rng.uniform(-0.5, 0.5), x, 0.022); x += 0.3; j += 1
for x in np.arange(RW1 + 0.5, END - 0.5, 0.75): mus.put(S.pluck(hz(rng.choice([65, 69, 72, 77])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.024)
for i, m in enumerate([53, 60, 65, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1.5) * 0.25, END + 0.3 + i * 0.45, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.55, secs=2.8); amb_v = S.verb(amb, wet=0.3, secs=2.0); sfx_v = S.verb(sfx, wet=0.18, secs=1.4)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

"""Bande-son « Et si les dinosaures vivaient encore aujourd'hui ? » : une route forestière, Fontainebleau, un matin d'automne.
Le vent dans les feuilles, des oiseaux, les foulées de Manon. Puis les pas du T. rex : des coups sourds et graves, son souffle,
un grondement bouche fermée (pas de rugissement de cinéma). Son reniflement au rocher, le craquement d'une branche au loin.
Le soir : le vent froid, la radio et le moteur de la gendarmerie. Un mois plus tard : la clôture qui vibre, des pas lointains.
Musique : un bourdon grave en ré mineur qui monte avec la peur, puis une respiration plus douce au retour au réel. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=66); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; RW0, RW1 = E['rewind']
REX0, REX1, REXA, REXB, RUN0, HIDE = E['rex0'], E['rex1'], E['rexa'], E['rexb'], E['run0'], E['hide']
BITE, CRACK, LEAVE, STAND, EVE, MONTH = E['bite'], E['crack'], E['leave'], E['stand'], E['eve'], E['month']
B1, B2 = E['bird']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.88 * frozen

def in_freeze(x):
    return any(f['t'] <= x < f['t'] + f['dur'] for f in FZ)

morning = 1 - S.ramp(EVE - 0.1, EVE) + S.ramp(MONTH - 0.1, MONTH)
morning = np.clip(morning, 0, 1)
evening = S.window(EVE, MONTH, 0.1, 0.1)

# --- la forêt : le vent dans les feuilles (souffle filtré qui ondule), des oiseaux le matin
wind = bp(S.pink(), 250, 3000) * (0.55 + 0.45 * lp(np.abs(S.noise()), 0.3) / 0.12)
amb.put(wind * (0.6 + 0.4 * evening) * live, 0, 0, 0.03)
for _ in range(40):
    at = rng.uniform(0, END)
    if in_freeze(at) or (REX0 < at < LEAVE + 4) or (EVE <= at < MONTH): continue   # les oiseaux se taisent quand le T. rex est là
    for k in range(rng.integers(2, 5)):
        tt, n = S.burst(0.11); f0 = rng.uniform(2600, 4300)
        far.put(np.sin(2 * np.pi * np.cumsum(f0 + 700 * np.sin(2 * np.pi * 16 * tt)) / SR) * np.sin(np.pi * tt / tt[-1]), rng.uniform(-0.8, 0.8), at + k * 0.16, 0.007)
# --- le merle (petits « tchic ») quand il traverse
for b0 in (B1, B2):
    for k in range(5):
        tt, n = S.burst(0.06); sfx.put(np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt * 60), -0.3, b0 + 0.3 + k * 0.5, 0.02)

# --- les foulées de Manon
def steps(a, b, dt, gain, pan=0.0):
    x = a
    while x < b:
        if not in_freeze(x):
            tt, n = S.burst(0.07); sfx.put(bp(S.noise(n), 150, 2500) * np.exp(-tt * 55), pan, x, gain)
        x += dt
steps(0.5, REX0 + 0.5, 0.34, 0.035, -0.1)
steps(RUN0, HIDE, 0.27, 0.06, 0.2)
steps(MONTH + 0.2, MONTH + 3.9, 0.34, 0.03, 0.0)
steps(RW1 + 0.6, END - 2.5, 0.34, 0.03, 0.0)
# son souffle quand elle est cachée (rapide, retenu)
x = HIDE + 0.3
while x < STAND:
    if not in_freeze(x):
        tt, n = S.burst(0.32); sfx.put(bp(S.noise(n), 500, 3000) * np.sin(np.pi * tt / tt[-1]) ** 2, 0.25, x, 0.012)
    x += 0.62

# --- le T. rex : les pas (un coup très grave + le craquement des feuilles), environ un pas par seconde
def rex_steps(a, b, dt, gain, pan=-0.2):
    x = a
    while x < b:
        if not in_freeze(x):
            tt, n = S.burst(0.9); thud = np.sin(2 * np.pi * np.cumsum(48 * np.exp(-tt * 3) + 22) / SR) * np.exp(-tt * 6)
            sfx.put(thud + 0.25 * lp(S.noise(n), 250) * np.exp(-tt * 14), pan, x, gain)
            tt, n = S.burst(0.25); sfx.put(bp(S.noise(n), 600, 4000) * np.exp(-tt * 18), pan, x + 0.02, gain * 0.2)
        x += dt
rex_steps(REX0, REX1, 1.0, 0.32, -0.6)
rex_steps(REXA, REXB, 1.1, 0.4, -0.2)
rex_steps(LEAVE + 0.8, EVE, 1.2, 0.3, -0.5)
rex_steps(MONTH + 0.5, RW0, 1.0, 0.08, 0.3)
# son souffle (grave, lent) et le grondement bouche fermée quand il regarde Manon
def breath(a, b, period, gain, pan=-0.2):
    x = a
    while x < b:
        if not in_freeze(x):
            tt, n = S.burst(1.3); sfx.put(lp(S.noise(n), 420) * np.sin(np.pi * tt / tt[-1]) ** 1.5, pan, x, gain)
        x += period
breath(REX1, REXA, 2.2, 0.08, -0.4)
breath(REXB, LEAVE + 1, 2.0, 0.1, 0.1)
for at, dur in ((REX1 + 2.0, 2.4), (BITE - 0.5, 2.6)):
    tt, n = S.burst(dur); f = 38 + 6 * np.sin(2 * np.pi * 0.6 * tt)
    growl = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + 0.5 * np.sin(2 * np.pi * 23 * tt)) + 0.4 * lp(S.noise(n), 160)
    sfx.put(growl * np.sin(np.pi * tt / tt[-1]) ** 0.8, 0.0, at, 0.22)
# le reniflement au rocher : des inspirations courtes, sèches
x = REXB - 0.6
while x < CRACK:
    if not in_freeze(x):
        tt, n = S.burst(0.18); sfx.put(bp(S.noise(n), 300, 2400) * np.sin(np.pi * tt / tt[-1]), 0.2, x, 0.09)
    x += rng.uniform(0.35, 0.7)
# le craquement d'une branche, loin à gauche
tt, n = S.burst(0.5); cr = hp(S.noise(n), 900) * (np.exp(-tt * 30) + 0.6 * np.exp(-np.maximum(0, tt - 0.12) * 40) * (tt > 0.12))
far.put(cr, -0.85, CRACK, 0.35)

# --- le soir : le moteur au ralenti, la radio des gendarmes
tt = t; idle = (np.sin(2 * np.pi * 31 * tt) + 0.5 * np.sin(2 * np.pi * 62 * tt)) * (1 + 0.2 * np.sin(2 * np.pi * 1.7 * tt))
sfx.put(idle * evening * live, -0.2, 0, 0.02)
for at in (EVE + 0.8, EVE + 2.4):
    tt, n = S.burst(1.0); sfx.put(bp(S.noise(n), 600, 2800) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * tt)) * np.sin(np.pi * tt / tt[-1]), -0.3, at, 0.025)
    tt, n = S.burst(0.12); sfx.put(np.sin(2 * np.pi * 1400 * tt) * np.exp(-tt * 20), -0.3, at - 0.15, 0.03)
# un mois plus tard : la clôture qui vibre un peu dans le vent
tt = t; sfx.put(np.sin(2 * np.pi * 180 * tt) * bp(S.noise(), 100, 400) * S.window(MONTH, RW0, 0.3, 0.3), 0.4, 0, 0.01)

for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])

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
prog = [(0, REX0, 'F'), (REX0 + 0.5, RUN0, 'Dm'), (RUN0, BITE, 'Gm'), (BITE, LEAVE, 'A'), (LEAVE, EVE, 'Dm'), (EVE, MONTH, 'Bb'), (MONTH, RW0, 'Dm'),
        (RW1, END - 3, 'F'), (END - 3, END, 'C'), (END, T['duration'], 'F')]
mus.add(chords(prog, 0.02, 0.2))
x = 0.6   # le footing : de petites notes tranquilles
while x < REX0 - 0.3:
    mus.put(S.pluck(hz(rng.choice([65, 69, 72, 77])), 1.0, 3), rng.uniform(-0.5, 0.5), x, 0.016); x += 0.68
x, per = REX0 + 1.0, 1.4   # la peur : une pulsation grave qui accélère jusqu'au rocher
while x < LEAVE:
    if not in_freeze(x): mus.put(S.hit(hz(26), 0.4, 6), 0, x, 0.045)
    x += per; per = max(0.55, per * 0.95)
for x in np.arange(RW1 + 0.5, END - 0.5, 0.75): mus.put(S.pluck(hz(rng.choice([65, 69, 72, 77])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.022)
for i, m in enumerate([53, 60, 65, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1.5) * 0.25, END + 0.3 + i * 0.45, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.55, secs=2.8); amb_v = S.verb(amb, wet=0.3, secs=2.0); sfx_v = S.verb(sfx, wet=0.2, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

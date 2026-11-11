"""Bande-son « Et si la Lune disparaissait ? » : la passerelle du Mont-Saint-Michel, la nuit puis le lendemain matin.
La nuit : un vent doux, la mer très loin (un souffle grave), les pas de Léna sur les planches. Quand la Lune disparaît :
un « souffle » qui retombe et un grave sourd, puis presque le silence. Le lendemain : des goélands, le clapotis de la
marée qui monte… sans jamais grossir. Un mois plus tard : une chouette au loin. Musique : des nappes calmes en la mineur,
qui se creusent au moment de la disparition, puis s'ouvrent au retour au réel. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1124); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; RW0, RW1 = E['rewind']
STOP, VAN, ADAPT, MORN, WEEK, MONTH, AXIS = E['stop'], E['vanish'], E['adapt'], E['morning'], E['week'], E['month'], E['axis']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
live = 1 - 0.88 * frozen

def in_freeze(x):
    return any(f['t'] <= x < f['t'] + f['dur'] for f in FZ)

day = S.window(MORN, WEEK, 0.2, 0.2)
night = 1 - day

# --- le vent (doux, plus présent dans le noir) et la mer au loin (un souffle grave qui respire)
wind = bp(S.pink(), 200, 2400) * (0.55 + 0.45 * lp(np.abs(S.noise()), 0.3) / 0.12)
dark = S.window(VAN + 0.5, MORN, 1.5, 0.2) + S.window(WEEK, RW0, 0.2, 0.3)
amb.put(wind * (0.5 + 0.35 * np.clip(dark, 0, 1)) * live, 0, 0, 0.025)
surf = lp(S.pink(), 380) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 7.0))
amb.put(surf * live, 0.1, 0, 0.03)
# --- le matin : la marée qui monte (clapotis sous la passerelle, qui grossit un peu puis plafonne), des goélands
lap = bp(S.noise(), 300, 1800) * np.clip(np.sin(2 * np.pi * t * 0.9) * 0.5 + 0.5, 0, 1) ** 3
tide = S.ramp(MORN + 1, MORN + 8) * day
sfx.put(lap * tide * live, 0.3, 0, 0.03)
for _ in range(9):
    at = rng.uniform(MORN + 0.5, WEEK - 1.0)
    if in_freeze(at): continue
    for k in range(rng.integers(2, 4)):
        tt, n = S.burst(0.32); f0 = rng.uniform(1500, 2100)
        cry = np.sin(2 * np.pi * np.cumsum(f0 * (1.0 - 0.35 * tt / tt[-1]) + 60 * np.sin(2 * np.pi * 30 * tt)) / SR)
        far.put(cry * np.clip(np.sin(np.pi * tt / tt[-1]), 0, 1) ** 1.5 * (1 + 0.3 * hp(S.noise(n), 2000)), rng.uniform(-0.8, 0.8), at + k * 0.38, 0.012)

# --- les pas de Léna sur les planches (un « toc » de bois)
def steps(a, b, dt, gain, pan=0.0):
    x = a
    while x < b:
        if not in_freeze(x):
            tt, n = S.burst(0.09); knock = np.sin(2 * np.pi * 210 * tt) * np.exp(-tt * 45) + 0.5 * bp(S.noise(n), 400, 3000) * np.exp(-tt * 70)
            sfx.put(knock, pan, x, gain)
        x += dt
steps(0.4, STOP, 0.52, 0.03, -0.05)
steps(RW1 + 0.4, END - 2.5, 0.52, 0.02, 0.0)

# --- la disparition : un souffle qui monte puis se coupe net, un grave sourd, un petit tintement qui s'éteint
tt, n = S.burst(1.6); sweep = hp(S.noise(n), 1200) * (tt / tt[-1]) ** 2
sfx.put(sweep, 0.2, VAN - 1.6, 0.05)
tt, n = S.burst(3.0); boom = np.sin(2 * np.pi * np.cumsum(55 * np.exp(-tt * 1.2) + 25) / SR) * np.exp(-tt * 1.4)
sfx.put(boom + 0.3 * lp(S.noise(n), 200) * np.exp(-tt * 3), 0.0, VAN, 0.3)
for k, m in enumerate([88, 84, 81]):
    tt, n = S.burst(1.4); sfx.put(np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 3.5), 0.4, VAN + 0.05 + k * 0.12, 0.012)
# --- un mois plus tard : une chouette hulotte, au loin (« hou… hou-hou-hou »)
def hoot(at, pan):
    for k, (d, f) in enumerate(((0.55, 410), (0.18, 380), (0.18, 380), (0.6, 400))):
        x = at + [0, 1.4, 1.65, 1.9][k]
        tt, n = S.burst(d); env = np.clip(np.sin(np.pi * tt / tt[-1]), 0, 1) ** 0.7
        far.put(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.04 * np.sin(2 * np.pi * 6 * tt))) / SR) * env, pan, x, 0.03)
hoot(MONTH + 0.6, -0.6); hoot(MONTH + 4.0, 0.5)

for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])

# --- le rembobinage
tt, n = S.burst(RW1 - RW0); fq = 1800 + 2600 * (tt / tt[-1]) + 300 * np.sin(2 * np.pi * 13 * tt)
sfx.put((np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.clip(np.sin(np.pi * tt / tt[-1]), 0, 1) ** 0.5, 0, RW0, 0.05)
fade = 1 - S.ramp(END - 0.3, END + 0.5)
for b in (amb, far): b.mul(fade)
amb.mul(1 - 0.6 * frozen)

# --- musique
CH = {'Am': [45, 57, 64, 69, 72], 'F': [41, 53, 60, 65, 69], 'C': [36, 48, 55, 60, 64], 'G': [43, 55, 62, 67, 71], 'Dm': [38, 50, 57, 62, 65],
      'Em': [40, 52, 59, 64, 67], 'E': [40, 52, 59, 64, 68], 'Fm': [41, 53, 60, 65, 68]}
def chords(prog, gain, bright=0.25):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, VAN - 0.2, 'Am'), (VAN + 1.2, ADAPT, 'Fm'), (ADAPT, MORN, 'F'), (MORN, (MORN + WEEK) / 2, 'C'), ((MORN + WEEK) / 2, WEEK, 'G'),
        (WEEK, MONTH, 'Dm'), (MONTH, AXIS, 'Am'), (AXIS, RW0, 'E'), (RW1, END - 3, 'F'), (END - 3, END, 'C'), (END, T['duration'], 'Am')]
mus.add(chords(prog, 0.02, 0.2))
x = 0.6   # avant : de petites notes claires, comme la lumière de la Lune
while x < VAN - 0.4:
    mus.put(S.pluck(hz(rng.choice([69, 72, 76, 81])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.016); x += 0.72
x = ADAPT + 0.5   # les étoiles : des notes plus aiguës, plus rares
while x < MORN - 0.3:
    if not in_freeze(x): mus.put(S.pluck(hz(rng.choice([81, 84, 88, 93])), 1.6, 2), rng.uniform(-0.7, 0.7), x, 0.012)
    x += rng.uniform(0.5, 0.9)
x, per = AXIS, 1.2   # l'axe qui bascule : une pulsation grave
while x < RW0:
    mus.put(S.hit(hz(28), 0.4, 6), 0, x, 0.04); x += per; per = max(0.6, per * 0.93)
for x in np.arange(RW1 + 0.5, END - 0.5, 0.75): mus.put(S.pluck(hz(rng.choice([69, 72, 76, 81])), 1.2, 3), rng.uniform(-0.5, 0.5), x, 0.02)
for i, m in enumerate([57, 64, 69, 72]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1.5) * 0.25, END + 0.3 + i * 0.45, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.45, secs=3.2); far_v = S.verb(far, wet=0.55, secs=2.8); amb_v = S.verb(amb, wet=0.3, secs=2.0); sfx_v = S.verb(sfx, wet=0.25, secs=1.8)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

"""Bande-son « volcan en Auvergne » : soir calme sur le plateau, séismes, l'ouverture, le grondement continu,
les explosions, le tonnerre dans le panache, les sirènes de Clermont. Musique : ré mineur, grave."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=7000); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
Q, OPEN, FOUNT, ASH, END = T['quake'], T['open'], T['fount'], T['ash'], T['endCard']

# --- le soir sur le plateau : vent léger, quelques cloches de vaches (graves, rares), un merle au loin
wind = bp(S.pink(), 150, 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.08 * t)); amb.put(wind, -0.2, 0, 0.07)
for _ in range(9):
    at = rng.uniform(0.5, Q + 3); tt, n = S.burst(1.2); f = rng.uniform(520, 760)
    bell = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.1 * tt) + 0.3 * np.sin(2 * np.pi * f * 3.3 * tt)) * np.exp(-tt * 5)
    amb.put(lp(bell, 2500), rng.uniform(-0.7, 0.7), at, 0.012)
for k in range(5):
    at = rng.uniform(1, 14); tt, n = S.burst(0.6); f = 1800 + 500 * np.sin(np.pi * tt / 0.6) * rng.uniform(0.5, 1)
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.6) ** 2, rng.uniform(-0.8, 0.8), at, 0.008)
# --- les séismes : grondements sourds, de plus en plus fréquents
x = Q
while x < OPEN:
    tt, n = S.burst(1.4); r = lp(S.noise(n), 80) * np.sin(np.pi * tt / 1.4) * (0.6 + 0.4 * np.sin(tt * 17))
    sfx.put(r, rng.uniform(-0.3, 0.3), x, 0.5 * (0.5 + 0.5 * (x - Q) / (OPEN - Q))); x += rng.uniform(0.5, 1.4) * (1 - 0.5 * (x - Q) / (OPEN - Q))
# --- l'ouverture : une détonation, puis le grondement continu du volcan (comme un réacteur lointain)
sfx.put(S.boom(4.0, 50, 20), 0.1, OPEN - 0.05, 0.8)
roar = (lp(S.pink(), 160) + 0.3 * bp(S.pink(), 200, 900)) * S.ramp(OPEN, OPEN + 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.6 * t)) * (1 - S.ramp(END - 0.6, END))
sfx.put(roar, 0.15, 0, 0.45)
x = OPEN + 0.8
while x < END - 0.8:   # explosions stromboliennes
    sfx.put(S.boom(1.6, 70, 35), rng.uniform(-0.1, 0.4), x, rng.uniform(0.18, 0.35)); x += rng.uniform(0.8, 2.4)
crackle = hp(S.noise(), 1500) * (np.abs(lp(S.noise(), 40)) > 0.5) * S.ramp(FOUNT, FOUNT + 3) * (1 - S.ramp(END - 0.6, END))
sfx.put(lp(crackle, 5000), 0.2, 0, 0.02)
for _ in range(9):   # tonnerre dans le panache
    at = rng.uniform(FOUNT + 1, END - 1); tt, n = S.burst(2.5)
    th = lp(S.noise(n), 400) * np.exp(-tt * 1.6) * np.clip(tt / 0.05, 0, 1) + lp(S.noise(n), 120) * np.exp(-tt * 0.9) * 0.6
    far.put(th, rng.uniform(-0.3, 0.5), at, 0.12)
# --- la ville : sirènes, puis le chuintement des cendres qui tombent
x, hi = ASH - 0.4, 0
while x < END - 0.5:
    tt, n = S.burst(0.55); f = 435 if hi == 0 else 488
    ph = 2 * np.pi * np.cumsum(np.full(n, f)) / SR; sir = sum(np.sin(k * ph) / k for k in range(1, 8)) * np.clip(tt / 0.02, 0, 1) * np.clip((0.55 - tt) / 0.02, 0, 1)
    far.put(lp(bp(sir, 300, 2600), 1600), -0.4, x, 0.02); x += 0.6; hi ^= 1
ashfall = bp(S.noise(), 2000, 7000) * (np.abs(lp(S.noise(), 25)) * 2) * S.ramp(ASH, ASH + 3) * (1 - S.ramp(END - 0.6, END))
amb.put(ashfall, 0, 0, 0.012)
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique
CH = {'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 41, 46, 50, 53], 'F': [41, 48, 53, 57, 60], 'C': [36, 43, 48, 52, 55], 'A': [33, 40, 45, 49, 52], 'Gm': [31, 38, 43, 46, 50]}
def chords(prog, voice, gain, bright=0.25, fin=1.0, fout=1.0):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.5, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, 8.4, 'Dm'), (8.4, 13.2, 'F'), (13.2, Q, 'C'), (Q, OPEN, 'A'), (OPEN, 28.2, 'Dm'), (28.2, FOUNT, 'Bb'), (FOUNT, ASH, 'Gm'), (ASH, 48.2, 'Dm'), (48.2, 53.2, 'Bb'), (53.2, 58.2, 'Gm'), (58.2, END, 'A')]
mus.add(chords(prog, 'pad', 0.045))
mus.add(chords([(OPEN, 28.2, 'Dm'), (28.2, FOUNT, 'Bb'), (FOUNT, ASH, 'Gm')], 'choir', 0.04, fin=1.5))
for x, m in [(0.6, 69), (2.2, 72), (3.8, 74), (5.6, 72), (8.6, 69), (10.2, 72), (11.8, 77), (13.4, 76), (15.2, 72), (17.0, 67), (48.6, 74), (50.2, 70), (51.8, 69), (58.6, 69), (60.2, 73), (61.8, 76)]:
    mus.put(S.pluck(hz(m), 3.0, 1.5), rng.uniform(-0.3, 0.3), x, 0.05)
for x in np.arange(Q, OPEN, 0.7): mus.put(S.hit(hz(38), 0.5, 7), 0, x, 0.09)
mus.put(S.hit(hz(26), 3.0, 1.2), 0, OPEN, 0.3)
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['Dm']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([69, 74, 77]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.45, secs=3.5); amb_v = S.verb(amb, wet=0.2, secs=1.4); far_v = S.verb(far, wet=0.6, secs=3.0)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

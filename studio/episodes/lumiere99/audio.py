"""Bande-son « 99 % de c » : un stade plein (rumeur, applaudissements rythmés), le silence avant le départ, le coup de pistolet ;
le ralenti (tout devient grave et lent, le plasma qui crépite et monte), l'éclair et le grondement ; la neige de l'écran ;
le retour au stade. Musique : pulsation électronique, puis apaisement."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=299792); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
READY, GO, FL, LOST, REAL, END = T['ready'], T['go'], T['flash'], T['lost'], T['real'], T['endCard']
# --- la foule : une rumeur large, qui se tait avant le départ ; pendant le ralenti, plus de foule (le temps est figé)
crowd = bp(S.pink(), 250, 2500) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.13 * t))
hush = 1 - 0.85 * S.window(READY - 2.6, GO + 0.2, 0.8, 0.05)
alive = (1 - S.window(GO, REAL, 0.05, 0.3))
amb.put(crowd * hush * alive, 0, 0, 0.09)
# applaudissements rythmés au début
for k in range(16):
    at = 4.0 + k * 0.62
    for _ in range(40):
        a2 = at + rng.normal(0, 0.03); tt, n = S.burst(0.03); amb.put(hp(S.noise(n), 900) * np.exp(-tt * 150), rng.uniform(-0.9, 0.9), a2, 0.01)
# retour au stade : la foule revient
# --- le coup de pistolet
tt, n = S.burst(0.4); sfx.put(hp(S.noise(n), 600) * np.exp(-tt * 30) + 0.4 * lp(S.noise(n), 300) * np.exp(-tt * 12), 0.4, GO, 0.5)
# --- le ralenti : grondement grave, « souffle » ralenti, crépitement du plasma qui monte
U = np.clip((t - GO) / (FL - GO), 0, 1); slow = S.window(GO, FL, 0.05, 0.05)
sfx.put(lp(S.pink(), 70) * slow * (0.5 + 0.5 * U), 0, 0, 0.5)
f_hum = 55 + 70 * U ** 2
hum = np.sin(2 * np.pi * np.cumsum(f_hum) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f_hum * 1.5) / SR)
sfx.put(lp(hum, 600) * slow * (0.2 + 0.8 * U), 0, 0, 0.08)
crack = hp(S.noise(), 2500) * (np.abs(lp(S.noise(), 60)) > (0.9 - 0.6 * U)) * slow * U
sfx.put(lp(crack, 8000), 0.1, 0, 0.05)
for k in range(10):   # battements de cœur, très lents (ralenti)
    at = GO + 0.4 + k * 1.0
    if at > FL - 0.2: break
    tt, n = S.burst(0.5); sfx.put(lp(S.noise(n), 120) * np.exp(-tt * 14) + 0.6 * np.sin(2 * np.pi * 48 * tt) * np.exp(-tt * 10), 0, at, 0.12)
# --- l'éclair, l'explosion
sfx.put(S.boom(6.0, 60, 18), 0, FL, 1.0)
sfx.put(lp(S.pink(), 400) * S.window(FL, LOST, 0.02, 0.3), 0, 0, 0.6)
# --- la neige de l'écran
sfx.put(hp(S.noise(), 1200) * S.window(LOST, REAL, 0.02, 0.05), 0, 0, 0.05)
# --- retour au réel : la foule, calme
amb.put(crowd * S.ramp(REAL, REAL + 0.6) * 0.8, 0, 0, 0.06)
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique
CH = {'Am': [33, 45, 52, 57, 60], 'F': [29, 41, 48, 53, 57], 'C': [36, 43, 48, 52, 55], 'G': [31, 43, 50, 55, 59], 'Em': [28, 40, 47, 52, 55], 'Dm': [26, 38, 45, 50, 53]}
def chords(prog, gain, bright=0.28, fin=0.8, fout=0.8):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, fin, fout)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, 7.8, 'Am'), (7.8, 12.2, 'F'), (12.2, 16.8, 'C'), (16.8, 21.8, 'G'), (21.8, READY - 2.6, 'Em'), (GO, 31.2, 'Am'), (31.2, 35.0, 'F'), (35.0, FL, 'Em'),
        (REAL, 49.0, 'F'), (49.0, 54.0, 'C'), (54.0, END, 'G')]
mus.add(chords(prog, 0.04))
# pulsation électronique (avant le départ)
x = 0.2
while x < READY - 2.6:
    mus.put(S.hit(hz(45), 0.25, 14), 0, x, 0.06); mus.put(S.pluck(hz(69 + (7 if int(x / 0.3) % 4 == 2 else 0)), 0.25, 14), 0.3, x + 0.15, 0.025); x += 0.3
# au ralenti : une note tenue qui monte
tt, n = S.burst(FL - GO); fr_ = hz(57) * (1 + 0.5 * (tt / (FL - GO)) ** 2)
mus.put(np.sin(2 * np.pi * np.cumsum(fr_) / SR) * np.sin(np.pi * tt / (FL - GO)) ** 0.5, 0, GO, 0.03)
for x, m in [(REAL + 0.4, 72), (REAL + 2.2, 76), (REAL + 4.0, 79), (REAL + 5.8, 77), (49.2, 76), (51.0, 72), (52.8, 74), (54.4, 79), (56.2, 83), (58.0, 81)]:
    mus.put(S.pluck(hz(m), 2.4, 1.8), 0.15, x, 0.045)
# le silence avant le départ : une note grave tenue, des battements de cœur
mus.add(chords([(READY - 2.6, GO, 'Am')], 0.03, fin=0.4, fout=0.1))
for k in range(5):
    tt, n = S.burst(0.5); at = READY - 2.4 + k * 0.72
    if at < GO - 0.1: sfx.put(lp(S.noise(n), 120) * np.exp(-tt * 14) + 0.6 * np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 10), 0, at, 0.1)
mus.mul(1 - S.window(FL, REAL - 0.1, 0.02, 0.2))
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['C']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([72, 76, 79]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.4, secs=3.0); amb_v = S.verb(amb, wet=0.35, secs=2.2); far_v = S.verb(far, wet=0.5, secs=2.6)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

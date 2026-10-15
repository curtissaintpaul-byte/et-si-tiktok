"""Bande-son du test « vol de voiture » (style reconstitution) : la nuit en ville (rumeur lointaine, vent), les pas,
la radio du drone pour les vues aériennes, les boîtiers relais (bips électroniques), l'arrêt sur image, le « bip-bip »
et le clac de l'ouverture, le démarreur et le moteur, la voiture qui part, le tableau d'enquête (fiches qui tombent),
la pochette (tissu, scratch), et une musique sombre de reportage (pulsation grave + tic-tac du chrono). Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=2026); N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
SH = E['SH']; FZ = E['freezes']; END = E['end']; CUT = E['cuts']
F0, FD = FZ[0]['t'], FZ[0]['dur']
rt = lambda ts: ts + FD if ts > F0 else ts                 # temps de scène → temps vidéo
frozen = S.window(F0, F0 + FD, 0.15, 0.3)
live = 1 - 0.85 * frozen
ID = ['rue', 'air1', 'porte', 'boitier', 'voiture', 'habitacle', 'air2', 'tableau', 'parade', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
street = sum(win(k) for k in ['rue', 'porte', 'boitier', 'voiture']) ; street = np.clip(street, 0, 1)
inside = win('habitacle'); aerial = np.clip(win('air1') + win('air2'), 0, 1)

# --- la nuit : rumeur de la ville au loin, un peu de vent
amb.put(lp(S.pink(), 180) * (street + 0.5 * inside + 0.4 * aerial) * live, 0, 0, 0.09)
wind = bp(S.noise(), 300, 1400) * (0.5 + 0.5 * lp(np.abs(S.noise()), 0.4, 1) * 6)
amb.put(wind * street * live, 0, 0, 0.012)
tt, n = S.burst(5.0); amb.put(bp(S.noise(n), 150, 900) * np.sin(np.pi * tt / 5.0) ** 2, -0.6, 0.5, 0.05)   # une voiture passe au loin

# --- les pas (sur le trottoir, puis les pavés)
def steps(a, b, period, g, pan):
    x = a
    while x < b:
        tt, n = S.burst(0.09); s = bp(S.noise(n), 600, 3200) * np.exp(-tt * 55) + 0.6 * lp(S.noise(n), 300) * np.exp(-tt * 35)
        k = float((street + 0.3 * aerial)[min(N - 1, int(x * SR))])
        sfx.put(s, pan, x, g * k); x += period + rng.uniform(-0.02, 0.02)
steps(0.5, rt(7.8), 0.52, 0.05, -0.2)    # James : jusqu'à la porte (7,8 s)
steps(0.6, rt(9.3), 0.5, 0.04, 0.25)     # Leonard : jusqu'à la portière (9,3 s)

# --- la vue aérienne : la radio du drone (souffle, sifflement fin) et un bip de repérage sur la voiture
for k in ['air1', 'air2']:
    a, b = shot[k]; d = b - a; tt, n = S.burst(d)
    sfx.put((bp(S.noise(n), 1500, 5000) * 0.5 + np.sin(2 * np.pi * 7400 * tt) * 0.15) * np.clip(tt / 0.05, 0, 1) * np.clip((d - tt) / 0.05, 0, 1), 0, a, 0.02)
    for x in np.arange(a + 0.3, b - 0.2, 0.7):
        tt, n = S.burst(0.08); sfx.put(np.sin(2 * np.pi * 1320 * tt) * np.exp(-tt * 30), 0.1, x, 0.05)

# --- les boîtiers relais : un « gazouillis » électronique quand ils s'allument, puis des bips pendant le relais
def chirp(at, g, pan=0.0):
    for k in range(5):
        tt, n = S.burst(0.05); f = 2600 + 500 * k; sfx.put(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 40), pan, at + k * 0.06, g)
chirp(rt(SH['porte'] + 2.6), 0.04, -0.3)
for x in np.arange(SH['boitier'], SH['boitier'] + 1.25, 0.18): chirp(x, 0.012, -0.2) if rng.uniform() < 0.5 else None
tt, n = S.burst(1.2); sfx.put(np.sin(2 * np.pi * np.cumsum(1800 + 1600 * tt / 1.2) / SR) * np.sin(np.pi * tt / 1.2) * 0.6, 0, SH['boitier'] + 0.1, 0.025)   # le signal qui « monte »
chirp(rt(SH['voiture'] + 0.4), 0.035, 0.3)
freeze_sfx(S, sfx, F0, FD)

# --- l'ouverture : bip-bip + le clac des serrures, et le plafonnier
U = E['unlock']
for k in range(2):
    tt, n = S.burst(0.11); sfx.put(np.sin(2 * np.pi * 2350 * tt) * np.clip(tt / 0.005, 0, 1) * np.clip((0.11 - tt) / 0.01, 0, 1), 0.2, U + k * 0.22, 0.09)
tt, n = S.burst(0.15); sfx.put(lp(S.noise(n), 900) * np.exp(-tt * 45) + np.sin(2 * np.pi * 95 * tt) * np.exp(-tt * 40), 0.2, U + 0.05, 0.25)
tt, n = S.burst(0.2); sfx.put(lp(S.noise(n), 700) * np.exp(-tt * 30), 0.2, U + 1.0, 0.15)   # la portière s'ouvre

# --- le moteur : démarreur, puis ralenti ; la voiture part (le régime monte et s'éloigne)
ST, LV = E['start'], E['leave']
tt, n = S.burst(0.7); sfx.put(bp(S.noise(n), 200, 1500) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * tt)) * np.sin(np.pi * tt / 0.7), 0, ST - 0.6, 0.06)
eng_end = shot['air2'][1]; dur = eng_end - ST; tt, n = S.burst(dur)
lev = np.clip(tt / 0.3, 0, 1) * np.clip((dur - tt) / 0.6, 0, 1)
rpm = 28 + 30 * np.clip((tt - (LV - ST) - 1.0) / 2.0, 0, 1) ** 1.5
ph = 2 * np.pi * np.cumsum(rpm) / SR
engine = (np.sin(ph) + 0.6 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * (0.7 + 0.3 * np.sin(ph / 2)) + 0.4 * bp(S.noise(n), 80, 400)
inside_e = 1.0 + 0.6 * inside[int(ST * SR):int(ST * SR) + n]
away = np.clip(1 - (tt - (LV - ST) - 1.0) / 3.5, 0.15, 1)
sfx.put(lp(engine, 600) * lev * inside_e * away, 0, ST, 0.06)

# --- le tableau d'enquête : un souffle à l'entrée, puis une fiche qui tombe à chaque carte, un coup grave
a, b = shot['tableau']
sfx.put(S.whoosh(0.8) * 0.8, 0, a - 0.35, 0.05)
for i in range(4):
    at = a + 0.2 + (i * 1.0 / 4.4) * 2.6 + 0.12
    tt, n = S.burst(0.12); sfx.put(bp(S.noise(n), 900, 5000) * np.exp(-tt * 40) + np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 45) * 0.5, (i % 2 - 0.5) * 0.6, at, 0.07)
tt, n = S.burst(1.5); sfx.put(np.sin(2 * np.pi * (60 * np.exp(-tt * 1.5) + 38) * tt) * np.exp(-tt * 2.2), 0, a + 2.6, 0.12)

# --- la pochette : le tissu, la clé qui glisse, le rabat qui se ferme (scratch)
a, b = shot['parade']; P = E['pouch']
tt, n = S.burst(1.0); sfx.put(bp(S.noise(n), 1500, 6000) * np.sin(np.pi * tt / 1.0) ** 2, -0.1, P - 1.3, 0.025)
tt, n = S.burst(0.35); scratch = bp(S.noise(n), 2000, 8000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 70 * tt))) * np.exp(-tt * 6)
sfx.put(scratch, 0, P + 0.25, 0.06)

fade = 1 - S.ramp(END - 0.3, END + 0.5)
for bb in (amb, far): bb.mul(fade)
sfx.mul(fade)

# --- la musique : sombre, en ré mineur, une pulsation grave et le tic-tac du chrono pendant le vol
CH = {'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 46, 50, 53, 58], 'Gm': [31, 43, 46, 50, 55], 'A': [33, 45, 49, 52, 57], 'F': [29, 41, 45, 48, 53], 'C': [36, 43, 48, 52, 55]}
prog = [(0, shot['porte'][0], 'Dm'), (shot['porte'][0], F0, 'Bb'), (F0, F0 + FD, 'Gm'), (F0 + FD, shot['habitacle'][0], 'Dm'), (shot['habitacle'][0], shot['tableau'][0], 'A'),
        (shot['tableau'][0], shot['parade'][0], 'Bb'), (shot['parade'][0], END, 'F'), (END, T['duration'], 'Dm')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.2), rng.uniform(-0.4, 0.4), 0, 0.03)
mus.add(bm)
x = 3.0
while x < END:   # pulsation grave (plus forte pendant le vol)
    k = 1.5 if shot['porte'][0] < x < shot['tableau'][0] else 1.0
    if not (F0 < x < F0 + FD): mus.put(S.hit(hz(26), 0.45, 7), 0, x, 0.05 * k)
    x += 0.8
x = shot['porte'][0] + 1.0   # le tic-tac du chrono
while x < shot['tableau'][0]:
    if not (F0 < x < F0 + FD):
        tt, n = S.burst(0.03); mus.put(hp(S.noise(n), 3000) * np.exp(-tt * 200), 0.35 if int(x * 2) % 2 else -0.35, x, 0.05)
    x += 0.5
for i, m in enumerate([62, 65, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.5 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.15, secs=1.0)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

"""Bande-son « gravité 5 s » : un dimanche de pétanque ; la version virale (rêveuse, cris) ; le buzzer FAUX ; le rembobinage ;
la vraie version (RIEN ne change : on garde les mêmes sons) ; puis les sauts dans le temps : craquements, séisme, sirènes.
Musique : pizzicati joyeux (fa majeur), une parenthèse étrange (gamme par tons), puis tension (ré mineur) et émerveillement final."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1907); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
MY0, FAUX, REW, REAL, G0, J1, J2, J3, J4, EIN, END = T['mythStart'], T['faux'], T['rewind'], T['real'], T['g0'], T['j1'], T['j2'], T['j3'], T['j4'], T['einstein'], T['endCard']
# le monde « normal » s'entend partout, sauf pendant la version virale, le tampon et le rembobinage
normal = 1 - S.window(MY0 + 0.2, REAL + 0.05, 1.2, 0.1)

# --- l'ambiance du dimanche : moineaux, voix au loin, terrasse, vent léger
amb.put(bp(S.pink(), 150, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t)) * normal, 0.1, 0, 0.05)
murmur = np.zeros(N)
for v in range(8):
    f = rng.uniform(250, 600); base = bp(S.noise(), f * 0.7, f * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur = murmur / np.abs(murmur).max()
amb.put(murmur * normal, -0.2, 0, 0.04)
for _ in range(60):
    at = rng.uniform(0, END - 1); tt, n = S.burst(0.12); f = rng.uniform(3600, 5200) + 900 * np.sin(np.pi * tt / 0.12)
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.12) ** 2 * normal[min(N - 1, int(at * SR))], rng.uniform(-0.9, 0.9), at, 0.007)
for _ in range(14):   # pigeons qui roucoulent
    at = rng.uniform(0, J3); tt, n = S.burst(0.7); f = 380 + 60 * np.sin(np.pi * tt / 0.35)
    coo = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.sin(np.pi * tt / 0.7) ** 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tt))
    amb.put(lp(coo, 900) * normal[min(N - 1, int(at * SR))], rng.uniform(-0.5, 0.2), at, 0.02)

# --- la pétanque : lancer (souffle), atterrissage (sable : « tchok »), contact de boules (« tink »)
def landing(at, pan=-0.05):
    tt, n = S.burst(0.25); sfx.put(lp(S.noise(n), 700) * np.exp(-tt * 28) + 0.5 * np.sin(2 * np.pi * 140 * tt) * np.exp(-tt * 30), pan, at, 0.35)
    tt, n = S.burst(0.6); sfx.put(sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, d in [(3150, 9), (4420, 12), (6800, 18)]), pan, at + 0.32, 0.03)
for at in E['throws']: sfx.put(S.whoosh(0.35), -0.05, at - 0.2, 0.05)
for at in E['lands']: landing(at)
# --- le ballon de l'enfant (rebonds)
def dribble(t0, t1, s0):
    k = np.ceil(s0 / 0.62)
    while True:
        at = t0 + (k * 0.62 - s0)
        if at > t1: break
        tt, n = S.burst(0.12); sfx.put(lp(S.noise(n), 400) * np.exp(-tt * 40) + 0.6 * np.sin(2 * np.pi * 95 * tt) * np.exp(-tt * 35), -0.35, at, 0.12); k += 1
dribble(0, MY0, 0); dribble(REAL, J1, 5.5); dribble(J1, J2, 68)

# --- VERSION VIRALE : souffle qui monte, cris de surprise, chaises qui raclent
sfx.put(S.whoosh(5.5) * 0.8 + 0.4 * lp(S.pink(int(5.5 * SR)), 300) * np.sin(np.pi * np.arange(int(5.5 * SR)) / SR / 5.5), 0, MY0, 0.15)
for _ in range(9):
    tt, n = S.burst(1.2); f0 = rng.uniform(320, 640)
    sc = bp(np.sin(2 * np.pi * np.cumsum(f0 + 160 * tt / 1.2) / SR) + 0.4 * S.noise(n), 300, 3000) * np.sin(np.pi * tt / 1.2)
    sfx.put(sc, rng.uniform(-0.7, 0.7), MY0 + 0.4 + rng.uniform(0, 3.6), 0.03)
# --- FAUX : le buzzer d'un jeu télé + arrêt sec
tt, n = S.burst(0.9); bz = np.sign(np.sin(2 * np.pi * 110 * tt)) * 0.6 + np.sign(np.sin(2 * np.pi * 116.5 * tt)) * 0.4
sfx.put(lp(bz, 1800) * np.clip((0.9 - tt) / 0.05, 0, 1), 0, FAUX, 0.12)
# --- le rembobinage : bande qui file en arrière (couinements qui montent)
tt, n = S.burst(REAL - REW); wob = 900 + 2600 * (tt / (REAL - REW)) ** 1.5 + 300 * np.sin(2 * np.pi * 23 * tt)
sfx.put((bp(S.noise(n), 1500, 7000) * 0.5 + 0.3 * np.sin(2 * np.pi * np.cumsum(wob) / SR)) * np.clip(tt / 0.03, 0, 1), 0, REW, 0.12)
# --- les sauts dans le temps : petit grésillement numérique
for j in [REW, REAL, J1, J2, J3, J4]:
    tt, n = S.burst(0.22); g = hp(S.noise(n), 2500) * (np.sin(2 * np.pi * 60 * tt) > 0) * np.exp(-tt * 9)
    sfx.put(g, 0, j - 0.02, 0.1)

# --- +5 min : la Terre s'étire — craquements, plâtre qui tombe, murmures inquiets
for _ in range(26):
    at = J2 + rng.uniform(0.3, J3 - J2 - 0.4); sfx.put(S.crack(), rng.uniform(-0.8, 0.8), at, rng.uniform(0.05, 0.12))
for _ in range(8):
    at = J2 + rng.uniform(0.5, 7); tt, n = S.burst(1.4); cr = bp(S.noise(n), 200, 900) * np.abs(np.sin(2 * np.pi * rng.uniform(9, 16) * tt)) ** 6 * np.sin(np.pi * tt / 1.4)
    sfx.put(cr, rng.uniform(-0.6, 0.6), at, 0.08)   # grincements
for _ in range(30):
    at = J2 + rng.uniform(0.5, 7.5); tt, n = S.burst(0.08); sfx.put(hp(S.noise(n), 1800) * np.exp(-tt * 70), rng.uniform(-0.9, 0.9), at, 0.04)   # gravats
# --- +15 min : séisme (grondement, vaisselle, cloche qui sonne seule, dalles qui sautent, pigeons qui s'envolent)
Q0, Q1 = J3 + 1.8, J3 + 6.4
sfx.put(lp(S.pink(), 90) * S.window(Q0, Q1, 0.5, 1.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.7 * t)), 0, 0, 0.8)
sfx.put(bp(S.noise(), 1500, 6000) * np.clip(lp(np.abs(S.noise()), 12, 1) * 5, 0, 1) * S.window(Q0, Q1, 0.3, 1.0), 0.3, 0, 0.03)
for k in range(7):
    tt, n = S.burst(3.0); f = 392.0
    bell = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * d) for a, m, d in [(1, 1, 0.9), (0.6, 2.0, 1.4), (0.4, 2.4, 1.8), (0.3, 3.0, 2.2), (0.2, 4.2, 3)])
    far.put(bell, 0.05, Q0 + 0.4 + k * 0.55 + rng.uniform(0, 0.3), 0.03)
sfx.put(S.boom(1.4, 90, 40), -0.4, J3 + 3.25, 0.4); sfx.put(S.crack(), -0.4, J3 + 3.25, 0.25)
for _ in range(6):
    tt, n = S.burst(1.5); fl = bp(S.noise(n), 600, 3500) * np.abs(np.sin(2 * np.pi * 14 * tt)) * np.exp(-tt * 1.5)
    sfx.put(fl, rng.uniform(-0.6, 0.6), J3 + 2.0 + rng.uniform(0, 0.6), 0.06)
for _ in range(5):
    tt, n = S.burst(0.9); f0 = rng.uniform(300, 520)
    oh = bp(np.sin(2 * np.pi * np.cumsum(f0 - 60 * tt) / SR) + 0.5 * S.noise(n), 250, 2500) * np.sin(np.pi * tt / 0.9) ** 0.8
    sfx.put(oh, rng.uniform(-0.6, 0.6), Q0 + 0.2 + rng.uniform(0, 0.8), 0.03)
x = Q0 + 0.6   # une alarme de voiture
while x < J4 - 0.3:
    tt, n = S.burst(0.18); far.put(np.sign(np.sin(2 * np.pi * 1350 * tt)) * np.sin(np.pi * tt / 0.18), 0.6, x, 0.008); x += 0.36
# --- +20 min : sirènes au loin
x, hi = J4 + 0.5, 0
while x < END - 0.5:
    tt, n = S.burst(0.55); f = 435 if hi == 0 else 488
    ph = 2 * np.pi * np.cumsum(np.full(n, f)) / SR; sir = sum(np.sin(k * ph) / k for k in range(1, 8)) * np.clip(tt / 0.02, 0, 1) * np.clip((0.55 - tt) / 0.02, 0, 1)
    far.put(lp(bp(sir, 300, 2600), 1500), -0.5, x, 0.012); x += 0.6; hi ^= 1
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique
CH = {'F': [41, 48, 53, 57, 60], 'C': [36, 43, 48, 52, 55], 'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 41, 46, 50, 53], 'Gm': [31, 38, 43, 46, 50], 'A': [33, 40, 45, 49, 52], 'Fmaj7': [41, 48, 52, 57, 64], 'Csus': [36, 43, 48, 53, 55]}
def chords(prog, gain, bright=0.25, fin=0.8, fout=0.8, voice='pad'):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, fin, fout)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright) if voice == 'pad' else S.choir(hz(m + 12), env), rng.uniform(-0.4, 0.4), 0, gain)
    return b
# 1) le dimanche : pizzicati sautillants (fa majeur), repris à l'identique dans la vraie version
def pizz(t0, t1, seed=0):
    mel = [72, 76, 79, 77, 76, 72, 74, 76, 69, 72, 74, 72, 77, 76, 74, 72]
    x, i = t0, 0
    while x < t1 - 0.1:
        mus.put(S.pluck(hz(mel[i % len(mel)]), 0.5, 9), 0.2, x, 0.05)
        if i % 4 == 0: mus.put(S.pluck(hz(41 + (0 if (i // 8) % 2 == 0 else 7)), 0.8, 6), -0.2, x, 0.07)
        x += 0.31; i += 1
pizz(0.2, MY0); pizz(REAL + 0.1, G0 - 0.05)
mus.add(chords([(0, 4.0, 'F'), (4.0, MY0, 'C'), (REAL, G0, 'F')], 0.03))
# 2) la version virale : gamme par tons, glissandos « science-fiction »
for k, m in enumerate([60, 62, 64, 66, 68, 70, 72, 74]):
    mus.put(S.pluck(hz(m + 12), 1.8, 2.0), (k % 2) * 0.4 - 0.2, MY0 + 0.1 + k * 0.6, 0.05)
tt, n = S.burst(FAUX - MY0); th = np.sin(2 * np.pi * np.cumsum(500 + 300 * tt / (FAUX - MY0) + 12 * np.sin(2 * np.pi * 5.5 * tt)) / SR) * np.sin(np.pi * tt / (FAUX - MY0)) ** 0.5
mus.put(th, 0, MY0, 0.035)
# 3) gravité coupée « pour de vrai » : une seule note tenue… rien ne se passe
mus.add(chords([(G0, T['g1'], 'Csus')], 0.035, fin=0.3))
for x in np.arange(G0, T['g1'], 1.0): mus.put(S.hit(hz(84), 0.25, 20), 0.3, x, 0.03)   # le tic-tac des 5 secondes
# 4) le ressort, l'élan, la respiration : ré mineur, de plus en plus tendu
prog = [(T['g1'], 26.7, 'Dm'), (26.7, J1, 'Bb'), (J1, 34.6, 'Gm'), (34.6, J2, 'A'), (J2, 42.0, 'Dm'), (42.0, J3, 'Bb'), (J3, 49.6, 'Gm'), (49.6, J4, 'A'), (J4, EIN, 'Dm')]
mus.add(chords(prog, 0.042))
for x, m in [(23.2, 69), (24.8, 72), (26.6, 74), (28.4, 77), (30.2, 76), (31.4, 74), (33.2, 70), (35.0, 69), (36.8, 73), (38.4, 74), (40.2, 77), (42.0, 81), (43.8, 79), (46.4, 70), (48.2, 69), (50.0, 67), (51.8, 69), (53.4, 74), (55.2, 72)]:
    mus.put(S.pluck(hz(m), 2.6, 1.6), 0.2, x, 0.045)
gap, x = 0.9, J3 + 1.6
while x < J3 + 6.4: mus.put(S.hit(hz(38), 0.45, 8), 0, x, 0.09); x += gap; gap = max(0.3, gap * 0.9)
# 5) Einstein : ça s'éclaire (fa majeur 7), chœur
mus.add(chords([(EIN, 60.2, 'Fmaj7'), (60.2, END, 'F')], 0.045, bright=0.35))
mus.add(chords([(EIN, END, 'Fmaj7')], 0.03, fin=1.2, voice='choir'))
for x, m in [(EIN + 0.2, 72), (EIN + 1.0, 76), (EIN + 1.8, 79), (EIN + 2.6, 84), (60.4, 81), (61.2, 79), (62.0, 76)]:
    mus.put(S.pluck(hz(m), 2.4, 2.2), 0.1, x, 0.05)
mus.mul(1 - S.window(FAUX - 0.02, REW + 0.05, 0.03, 0.05) * 0.9)   # tout s'arrête sur le tampon FAUX
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['F']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([72, 77, 81]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.4, secs=3.0); amb_v = S.verb(amb, wet=0.2, secs=1.4); far_v = S.verb(far, wet=0.55, secs=2.6)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

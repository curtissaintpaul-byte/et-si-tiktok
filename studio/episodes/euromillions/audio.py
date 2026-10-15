"""Bande-son de « Et si tu gagnais à l'EuroMillions ? » : le tabac (rumeur, bips du terminal, l'imprimante du ticket),
l'effet multiplication (souffle, liasses qui tombent de plus en plus vite, comme une pluie de billets), le tirage à la télé
(jingle étouffé, une boule qui sort à chaque fois), la vérification (le cœur qui accélère, un trait de stylo par numéro),
l'arrêt sur image, l'appel (la tonalité « tuuut »), le tableau, et une musique de jeu télé un peu tendue. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=5012); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3); live = 1 - 0.85 * frozen
ID = ['tabac', 'ticket', 'multi', 'tirage', 'check', 'appel', 'tableau', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
shop = np.clip(win('tabac') + win('ticket') + win('end'), 0, 1); room = np.clip(win('tirage') + win('check') + win('appel'), 0, 1)

# --- le tabac : la rumeur, le frigo, les bips du terminal, l'imprimante du ticket
amb.put(lp(S.pink(), 500) * shop, 0, 0, 0.05)
tt = np.arange(N) / SR; amb.put(np.sin(2 * np.pi * 100 * tt) * shop, 0, 0, 0.004)
a, b = shot['tabac']
for x in [a + 1.2, a + 1.45, a + 2.2]:
    tc, n = S.burst(0.09); sfx.put(np.sin(2 * np.pi * 1850 * tc) * np.clip((0.09 - tc) / 0.01, 0, 1), 0.2, x, 0.04)
a, b = shot['ticket']; tc, n = S.burst(0.9)
sfx.put(bp(S.noise(n), 1500, 6000) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 45 * tc))) * np.clip(tc / 0.02, 0, 1) * np.clip((0.9 - tc) / 0.05, 0, 1), 0.1, a + 0.1, 0.05)

# --- l'effet multiplication : un souffle, puis les liasses qui tombent (de plus en plus serrées), et la 2e pile
a, b = shot['multi']; sfx.put(S.whoosh(1.0) * 0.8, 0, a - 0.4, 0.05)
amb.put(lp(S.pink(), 160) * win('multi'), 0, 0, 0.05)
def rain_of_bills(t0, t1, n_hits, g):
    for i in range(n_hits):
        x = t0 + (t1 - t0) * (np.log(1 + i) / np.log(n_hits))
        tc, n = S.burst(0.06); sfx.put(bp(S.noise(n), 700, 4000) * np.exp(-tc * 60), rng.uniform(-0.5, 0.5), x + rng.uniform(0, 0.03), g * rng.uniform(0.5, 1))
rain_of_bills(*E['pileA'], 140, 0.03); rain_of_bills(*E['pileB'], 90, 0.03)
tc, n = S.burst(2.0); sfx.put(np.sin(2 * np.pi * (60 * np.exp(-tc * 1.5) + 38) * tc) * np.exp(-tc * 2.2), 0, E['pileA'][1], 0.08)
tc, n = S.burst(1.2); sfx.put(np.sin(2 * np.pi * 220 * tc) * np.exp(-tc * 3) + 0.5 * np.sin(2 * np.pi * 233 * tc) * np.exp(-tc * 3), 0, E['pileB'][1] + 0.5, 0.05)   # (le « bof » quand on compare)

# --- le tirage à la télé : un jingle étouffé, puis une boule à chaque fois
a, b = shot['tirage']
for i, m in enumerate([72, 76, 79, 84]):
    tc, n = S.burst(0.25); sfx.put(lp(np.sign(np.sin(2 * np.pi * hz(m) * tc)), 2500) * np.exp(-tc * 6), -0.4, a + 0.05 + i * 0.12, 0.03)
t0, t1 = E['balls']
for i in range(7):
    x = t0 + (t1 - t0) * i / 6; tc, n = S.burst(0.12); sfx.put(np.sin(2 * np.pi * (900 - 300 * tc / 0.12) * tc) * np.exp(-tc * 25), -0.4, x, 0.06)
amb.put(lp(S.pink(), 300) * room * live, 0, 0, 0.03)

# --- la vérification : le cœur qui accélère, un trait de stylo par numéro ; l'arrêt sur image ; puis l'explosion de joie (un accord qui monte)
a, b = shot['check']; x = shot['tirage'][0] + 0.5; per = 0.75
while x < F0:
    for dx, g in [(0, 1), (0.15, 0.6)]: tc, n = S.burst(0.12); sfx.put(np.sin(2 * np.pi * 52 * tc) * np.exp(-tc * 30), 0, x + dx, 0.13 * g)
    x += per; per = max(0.38, per * 0.95)
m0, m1 = E['marks']
for i in range(7):
    tc, n = S.burst(0.14); sfx.put(bp(S.noise(n), 2000, 7000) * np.sin(np.pi * tc / 0.14), 0.2, m0 + (m1 - m0) * i / 6, 0.035)
freeze_sfx(S, sfx, F0, FD)
for i, m in enumerate([60, 64, 67, 72, 76]):
    tc, n = S.burst(2.0); sfx.put(np.sin(2 * np.pi * hz(m) * tc) * np.clip(tc / 0.3, 0, 1) * np.exp(-tc * 1.2), (i - 2) * 0.2, F0 + FD + 0.02, 0.03)

# --- l'appel : la tonalité d'attente (« tuuut ») puis quelqu'un décroche (un petit clic)
a, b = shot['appel']
for k in range(2):
    tc, n = S.burst(1.0); sfx.put(np.sin(2 * np.pi * 440 * tc) * np.clip(tc / 0.01, 0, 1) * np.clip((1.0 - tc) / 0.01, 0, 1), 0.3, a + 0.2 + k * 1.3, 0.025)
tc, n = S.burst(0.03); sfx.put(hp(S.noise(n), 2000) * np.exp(-tc * 200), 0.3, a + 2.7, 0.05)

# --- le tableau
a, b = shot['tableau']; sfx.put(S.whoosh(0.8) * 0.8, 0, a - 0.35, 0.05)
for i in range(3):
    tc, n = S.burst(0.12); sfx.put(bp(S.noise(n), 900, 5000) * np.exp(-tc * 40) + np.sin(2 * np.pi * 180 * tc) * np.exp(-tc * 45) * 0.5, (i % 2 - 0.5) * 0.6, a + 0.2 + i / 3.6 * 2.8 + 0.1, 0.07)

fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique : jeu télé un peu tendu (do majeur qui hésite), une pulsation ; elle se tait pendant le tirage, puis éclate
CH = {'C': [48, 55, 60, 64, 67], 'Am': [45, 52, 57, 60, 64], 'F': [41, 48, 53, 57, 60], 'G': [43, 50, 55, 59, 62], 'Dm': [38, 45, 50, 53, 57]}
prog = [(0, shot['multi'][0], 'C'), (shot['multi'][0], E['pileB'][0], 'Am'), (E['pileB'][0], shot['tirage'][0], 'Dm'), (F0 + FD, shot['tableau'][0], 'C'),
        (shot['tableau'][0], END, 'F'), (END, T['duration'], 'C')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.25), rng.uniform(-0.4, 0.4), 0, 0.028)
mus.add(bm)
x = 3.0
while x < END:
    if not (shot['tirage'][0] - 0.2 < x < F0 + FD): mus.put(S.hit(hz(36), 0.35, 8), 0, x, 0.04); mus.put(S.pluck(hz(72 if int(x * 2) % 4 else 79), 0.4, 6), 0.3, x + 0.25, 0.012)
    x += 0.5
for i, m in enumerate([67, 72, 76]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.6 * frozen)
mus_v = S.verb(mus, wet=0.35, secs=2.5); amb_v = S.verb(amb, wet=0.15, secs=1.2); sfx_v = S.verb(sfx, wet=0.18, secs=1.4)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

"""Bande-son de « Et si Internet s'arrêtait partout pendant 24 h ? » : le hall de gare (rumeur de foule, pas, un carillon
d'annonce générique), le petit « bonk » d'erreur du téléphone, la machine à café et le double bip du terminal qui refuse,
l'arrêt sur image, le distributeur, la foule qui monte devant le tableau, la voiture (le moteur au ralenti), le tableau d'enquête,
et la radio à piles qui grésille dans la cuisine. Musique : une pulsation électronique tendue. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=2024); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3); live = 1 - 0.85 * frozen
ID = ['hall', 'phone', 'cafe', 'dab', 'gare', 'gps', 'tableau', 'kit', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
hall = np.clip(win('hall') + win('cafe') + win('dab') + win('gare') + win('end') + 0.4 * win('phone'), 0, 1)

# --- le hall : la rumeur de la foule (plus forte devant le tableau), des pas qui résonnent
crowd = bp(S.pink(), 250, 2500) * (0.7 + 0.3 * lp(np.abs(S.noise()), 0.6, 1) * 6)
amb.put(crowd * hall * (1 + 0.6 * win('gare')) * live, 0, 0, 0.05)
for k in ['hall', 'dab', 'gare', 'end']:
    a, b = shot[k]; x = a + 0.1
    while x < b:
        tc, n = S.burst(0.08); sfx.put(bp(S.noise(n), 900, 4000) * np.exp(-tc * 60), rng.uniform(-0.7, 0.7), x, 0.012); x += rng.uniform(0.18, 0.4)
# un carillon d'annonce (3 notes génériques), puis une « voix » sans mots (un souffle qui module)
for at in [shot['hall'][0] + 0.6, shot['gare'][0] + 0.3]:
    for i, m in enumerate([76, 72, 79]):
        tc, n = S.burst(1.0); sfx.put((np.sin(2 * np.pi * hz(m) * tc) + 0.3 * np.sin(4 * np.pi * hz(m) * tc)) * np.exp(-tc * 3) * np.clip(tc / 0.01, 0, 1), 0, at + i * 0.32, 0.025)
    tc, n = S.burst(1.6); sfx.put(bp(S.noise(n), 400, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * tc)) ** 2 * np.sin(np.pi * tc / 1.6), 0, at + 1.1, 0.02)
# --- le téléphone : le petit « bonk » d'erreur
a, b = shot['phone']
for x in [a + 0.5, a + 1.9]:
    tc, n = S.burst(0.18); sfx.put(np.sin(2 * np.pi * (520 - 200 * tc / 0.18) * tc) * np.exp(-tc * 18), 0, x, 0.06)
# --- le café : la machine à café, puis le double bip grave du terminal qui refuse ; l'arrêt sur image
a, b = shot['cafe']; tc, n = S.burst(1.2)
sfx.put(bp(S.noise(n), 2000, 7000) * np.sin(np.pi * tc / 1.2), -0.4, a + 0.1, 0.02)
for k in range(2):
    tc, n = S.burst(0.16); sfx.put(np.sign(np.sin(2 * np.pi * 330 * tc)) * np.clip(tc / 0.005, 0, 1) * np.clip((0.16 - tc) / 0.01, 0, 1), 0.2, E['refuse'] + k * 0.24, 0.035)
freeze_sfx(S, sfx, F0, FD)
# --- le distributeur : un bip d'erreur
a, b = shot['dab']
for k in range(3):
    tc, n = S.burst(0.1); sfx.put(np.sin(2 * np.pi * 1200 * tc) * np.clip((0.1 - tc) / 0.01, 0, 1), -0.3, a + 0.6 + k * 0.15, 0.03)
# --- la voiture : le moteur au ralenti, le clignotant, l'appli qui n'arrive pas à charger
a, b = shot['gps']; d = b - a; tc, n = S.burst(d)
idle = (np.sin(2 * np.pi * 26 * tc) + 0.5 * np.sin(2 * np.pi * 52 * tc)) * 0.5 + lp(S.noise(n), 200)
amb.put(lp(idle, 300) * np.clip(tc / 0.05, 0, 1) * np.clip((d - tc) / 0.05, 0, 1), 0, a, 0.05)
for x in np.arange(a + 0.2, b - 0.1, 0.42):
    tc2, n2 = S.burst(0.03); sfx.put(hp(S.noise(n2), 2500) * np.exp(-tc2 * 200), 0.3, x, 0.03)
tc, n = S.burst(0.18); sfx.put(np.sin(2 * np.pi * (520 - 200 * tc / 0.18) * tc) * np.exp(-tc * 18), 0, a + 1.4, 0.05)
# --- le tableau
a, b = shot['tableau']; sfx.put(S.whoosh(0.8) * 0.8, 0, a - 0.35, 0.05)
for i in range(3):
    tc, n = S.burst(0.12); sfx.put(bp(S.noise(n), 900, 5000) * np.exp(-tc * 40) + np.sin(2 * np.pi * 180 * tc) * np.exp(-tc * 45) * 0.5, (i % 2 - 0.5) * 0.6, a + 0.2 + i / 3.6 * 2.8 + 0.1, 0.07)
# --- le kit : la radio à piles qui grésille, puis capte une station (un ton doux)
a, b = shot['kit']; d = b - a; tc, n = S.burst(d)
static = bp(S.noise(n), 800, 6000) * (1 - np.clip((tc - 1.0) / 0.6, 0, 0.85))
tone = (np.sin(2 * np.pi * 330 * tc) + 0.5 * np.sin(2 * np.pi * 440 * tc)) * np.clip((tc - 1.2) / 0.4, 0, 1) * 0.2
sfx.put(lp(static + tone, 3500) * np.clip((d - tc) / 0.3, 0, 1), 0.2, a, 0.03)

fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique : électronique et tendue (mi mineur), une pulsation régulière ; plus calme sur le kit
CH = {'Em': [40, 47, 52, 55, 59], 'C': [36, 43, 48, 52, 55], 'Am': [45, 52, 57, 60, 64], 'B': [35, 47, 51, 54, 59], 'G': [43, 50, 55, 59, 62]}
prog = [(0, shot['cafe'][0], 'Em'), (shot['cafe'][0], shot['dab'][0], 'C'), (shot['dab'][0], shot['gps'][0], 'Am'), (shot['gps'][0], shot['tableau'][0], 'B'),
        (shot['tableau'][0], shot['kit'][0], 'Em'), (shot['kit'][0], T['duration'], 'G')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.25), rng.uniform(-0.4, 0.4), 0, 0.028)
mus.add(bm)
x = 3.0
while x < shot['kit'][0]:
    mus.put(S.hit(hz(28), 0.35, 8), 0, x, 0.045); tc, n = S.burst(0.03); mus.put(hp(S.noise(n), 4000) * np.exp(-tc * 160), 0.3, x + 0.25, 0.03); x += 0.5
for i, m in enumerate([67, 71, 74]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.6 * frozen)
mus_v = S.verb(mus, wet=0.35, secs=2.5); amb_v = S.verb(amb, wet=0.3, secs=2.2); sfx_v = S.verb(sfx, wet=0.25, secs=2.0)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

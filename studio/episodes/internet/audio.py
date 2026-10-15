"""Bande-son de « Et si Internet s'arrêtait partout sur Terre ? » (version 2 : l'histoire de Léa). La gare (rumeur, pas,
carillon), le « bonk » d'erreur du téléphone, la carte du monde qui s'éteint (un grand souffle électrique qui descend, une
petite étincelle par liaison coupée), le café (la machine, le double bip du terminal qui refuse), le distributeur, la voiture,
la radio qui grésille puis capte, le supermarché (le bourdonnement des néons, les pas), l'arrêt sur image, les accusations
(une alarme sourde), les réseaux nationaux (des petits « pings »), la station-service (moteurs au ralenti, un coup de klaxon),
le repas de quartier (oiseaux, voix, couverts, la radio), les Tonga (l'océan, le grondement du volcan), le retour du réseau
(une avalanche de notifications et de vibrations), puis le calme. Musique : électronique et tendue au début, elle s'ouvre
quand la vie s'organise. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=2026); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3); live = 1 - 0.85 * frozen
ID = ['hall', 'phone', 'carte', 'cafe', 'gare', 'dab', 'gps', 'radio', 'magasin', 'accuse', 'intranet', 'coree', 'essence', 'voisins', 'tonga', 'retour', 'pose', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
def bonk(at, g=0.06): tc, n = S.burst(0.18); sfx.put(np.sin(2 * np.pi * (520 - 200 * tc / 0.18) * tc) * np.exp(-tc * 18), 0, at, g)
def ping(at, f=1760, g=0.03, pan=0.0): tc, n = S.burst(0.35); sfx.put(np.sin(2 * np.pi * f * tc) * np.exp(-tc * 9) * np.clip(tc / 0.002, 0, 1), pan, at, g)
tt = np.arange(N) / SR

# --- la gare : la rumeur de la foule, des pas, le carillon d'annonce
hall = np.clip(win('hall') + win('cafe') + win('gare') + win('dab') + win('end') + 0.4 * win('phone'), 0, 1)
crowd = bp(S.pink(), 250, 2500) * (0.7 + 0.3 * lp(np.abs(S.noise()), 0.6, 1) * 6)
amb.put(crowd * hall * (1 + 0.6 * win('gare') + 0.4 * win('dab')) * live, 0, 0, 0.05)
for k in ['hall', 'dab', 'gare', 'end']:
    a, b = shot[k]; x = a + 0.1
    while x < b:
        tc, n = S.burst(0.08); sfx.put(bp(S.noise(n), 900, 4000) * np.exp(-tc * 60), rng.uniform(-0.7, 0.7), x, 0.012); x += rng.uniform(0.18, 0.4)
for at in [shot['hall'][0] + 0.6, shot['gare'][0] + 0.3]:
    for i, m in enumerate([76, 72, 79]):
        tc, n = S.burst(1.0); sfx.put((np.sin(2 * np.pi * hz(m) * tc) + 0.3 * np.sin(4 * np.pi * hz(m) * tc)) * np.exp(-tc * 3) * np.clip(tc / 0.01, 0, 1), 0, at + i * 0.32, 0.025)
    tc, n = S.burst(1.6); sfx.put(bp(S.noise(n), 400, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * tc)) ** 2 * np.sin(np.pi * tc / 1.6), 0, at + 1.1, 0.02)
a, b = shot['phone']
for x in [a + 0.5, a + 1.9]: bonk(x)
# --- la carte qui s'éteint : un grand souffle électrique qui descend, des étincelles (une par liaison coupée), puis un silence
a, b = shot['carte']; d = b - a; tc, n = S.burst(d)
f = 220 * np.exp(-tc * 0.9) + 30; ph = 2 * np.pi * np.cumsum(f) / SR
sfx.put((np.sin(ph) + 0.4 * np.sign(np.sin(ph * 2))) * 0.5 * np.clip(tc / 0.1, 0, 1) * np.exp(-tc * 0.5) * np.clip((d - tc) / 0.3, 0, 1), 0, a, 0.05)
for i in range(42):
    x = a + d * (0.12 + 0.6 * rng.random()); tc, n = S.burst(0.05); sfx.put(hp(S.noise(n), 3000) * np.exp(-tc * 90) * (np.sin(2 * np.pi * 60 * tc) > 0), rng.uniform(-0.8, 0.8), x, 0.012)
amb.put(lp(S.pink(), 120) * win('carte'), 0, 0, 0.04)
# --- le café : la machine, puis le double bip grave du terminal qui refuse
a, b = shot['cafe']; tc, n = S.burst(1.2)
sfx.put(bp(S.noise(n), 2000, 7000) * np.sin(np.pi * tc / 1.2), -0.4, a + 0.1, 0.02)
for k in range(2):
    tc, n = S.burst(0.16); sfx.put(np.sign(np.sin(2 * np.pi * 330 * tc)) * np.clip(tc / 0.005, 0, 1) * np.clip((0.16 - tc) / 0.01, 0, 1), 0.2, E['refuse'] + k * 0.24, 0.035)
# --- le distributeur : des bips d'erreur
a, b = shot['dab']
for k in range(3): tc, n = S.burst(0.1); sfx.put(np.sin(2 * np.pi * 1200 * tc) * np.clip((0.1 - tc) / 0.01, 0, 1), -0.3, a + 0.6 + k * 0.15, 0.03)
# --- la voiture : le moteur au ralenti, le clignotant
a, b = shot['gps']; d = b - a; tc, n = S.burst(d)
idle = (np.sin(2 * np.pi * 26 * tc) + 0.5 * np.sin(2 * np.pi * 52 * tc)) * 0.5 + lp(S.noise(n), 200)
amb.put(lp(idle, 300) * np.clip(tc / 0.05, 0, 1) * np.clip((d - tc) / 0.05, 0, 1), 0, a, 0.05)
for x in np.arange(a + 0.2, b - 0.1, 0.42): tc2, n2 = S.burst(0.03); sfx.put(hp(S.noise(n2), 2500) * np.exp(-tc2 * 200), 0.3, x, 0.03)
# --- la radio à piles : elle grésille, puis capte une station
a, b = shot['radio']; d = b - a; tc, n = S.burst(d)
static = bp(S.noise(n), 800, 6000) * (1 - np.clip((tc - 0.6) / 0.5, 0, 0.85))
voice = bp(S.noise(n), 300, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 4.5 * tc)) ** 2 * np.clip((tc - 0.8) / 0.3, 0, 1) * 0.8
sfx.put(lp(static + voice, 3500) * np.clip((d - tc) / 0.2, 0, 1), 0.2, a, 0.03)
# --- le supermarché : le bourdonnement des néons, les pas, un caddie qui grince ; l'arrêt sur image
a, b = shot['magasin']; d = b - a; tc, n = S.burst(d); e = np.clip(tc / 0.05, 0, 1) * np.clip((d - tc) / 0.1, 0, 1)
amb.put((np.sin(2 * np.pi * 100 * tc) * 0.3 + hp(S.noise(n), 5000) * 0.4 + lp(S.pink(n), 400)) * e, 0, a, 0.03)
for x in np.arange(a + 0.2, a + 3.0, 0.55): tc2, n2 = S.burst(0.08); sfx.put(bp(S.noise(n2), 600, 3500) * np.exp(-tc2 * 55), 0, x, 0.03)
tc, n = S.burst(0.6); sfx.put(np.sin(2 * np.pi * (1400 + 300 * np.sin(2 * np.pi * 7 * tc)) * tc) * np.sin(np.pi * tc / 0.6), -0.6, a + 1.4, 0.006)
freeze_sfx(S, sfx, F0, FD)
# --- les accusations : une alarme sourde qui pulse, un grondement ; les réseaux nationaux : de petits pings ; la Corée : le vent
a, b = shot['accuse']; d = b - a; tc, n = S.burst(d)
sfx.put(np.sin(2 * np.pi * 440 * tc) * (np.sin(2 * np.pi * 1.6 * tc) > 0.2) * np.clip((tc - d * 0.55) / 0.2, 0, 1) * np.clip((d - tc) / 0.2, 0, 1), 0, a, 0.012)
amb.put(lp(S.noise(n), 90) * np.clip(tc / 0.4, 0, 1) * np.clip((d - tc) / 0.3, 0, 1), 0, a, 0.08)
for i in range(4): sfx.put(S.whoosh(0.5) * 0.6, (i % 2 - 0.5), a + d * (0.05 + 0.17 * i), 0.02)
a, b = shot['intranet']
for i in range(12): ping(a + 0.6 + i * 0.22 + rng.uniform(0, 0.08), rng.choice([1320, 1760, 2093]), 0.012, rng.uniform(-0.6, 0.6))
amb.put(bp(S.pink(), 200, 1200) * (win('coree') + 0.6 * win('intranet')), 0, 0, 0.03)
# --- la station-service : des moteurs au ralenti, un coup de klaxon
a, b = shot['essence']; d = b - a; tc, n = S.burst(d)
amb.put(lp((np.sin(2 * np.pi * 24 * tc) + np.sin(2 * np.pi * 29 * tc) + lp(S.noise(n), 150) * 2), 300) * np.clip(tc / 0.1, 0, 1) * np.clip((d - tc) / 0.1, 0, 1), 0, a, 0.05)
tc, n = S.burst(0.5); sfx.put(lp(np.sign(np.sin(2 * np.pi * 400 * tc)) + np.sign(np.sin(2 * np.pi * 500 * tc)), 2500) * np.clip((0.5 - tc) / 0.05, 0, 1), 0.5, a + 1.6, 0.012)
# --- le repas de quartier : les oiseaux, des voix (un souffle qui module comme des syllabes), les couverts, la radio au loin
a, b = shot['voisins']; d = b - a; tc, n = S.burst(d); e = np.clip(tc / 0.3, 0, 1) * np.clip((d - tc) / 0.3, 0, 1)
talk = bp(S.noise(n), 250, 2200) * (0.4 + 0.6 * np.clip(np.sin(2 * np.pi * 3.7 * tc) * np.sin(2 * np.pi * 0.6 * tc + 1), 0, 1))
amb.put(talk * e, -0.2, a, 0.03); amb.put(bp(S.pink(n), 200, 3000) * e, 0, a, 0.03)
for x in np.arange(a + 0.2, b - 0.3, 0.4):
    tc2, n2 = S.burst(0.12); fq = rng.uniform(2800, 4200); sfx.put(np.sin(2 * np.pi * (fq + 900 * np.sin(2 * np.pi * 18 * tc2)) * tc2) * np.sin(np.pi * tc2 / 0.12), rng.uniform(-0.7, 0.7), x + rng.uniform(0, 0.2), 0.008)
for x in np.arange(a + 0.5, b - 0.3, 0.9): tc2, n2 = S.burst(0.15); sfx.put(np.sin(2 * np.pi * rng.uniform(2400, 3600) * tc2) * np.exp(-tc2 * 30), rng.uniform(-0.5, 0.5), x + rng.uniform(0, 0.3), 0.01)
# --- les Tonga : l'océan, le grondement du volcan
a, b = shot['tonga']; d = b - a; tc, n = S.burst(d)
amb.put(lp(S.pink(n), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * tc) ** 2) * np.clip(tc / 0.3, 0, 1) * np.clip((d - tc) / 0.3, 0, 1), 0, a, 0.06)
sfx.put(S.boom(2.5, 60, 22), 0, a + 0.1, 0.14)
# --- le retour du réseau : une avalanche de notifications et de vibrations ; puis le téléphone qui vibre sur le lit
a, b = shot['retour']; d = b - a
for i in range(40):
    x = a + 0.3 + (d - 0.4) * (i / 40) ** 1.3; ping(x, rng.choice([1568, 1760, 2093, 2349]), 0.015 + 0.01 * rng.random(), rng.uniform(-0.6, 0.6))
for x in np.arange(a + 0.3, b - 0.2, 0.5): tc, n = S.burst(0.25); sfx.put(np.sign(np.sin(2 * np.pi * 150 * tc)) * lp(np.ones(n), 50) * np.clip((0.25 - tc) / 0.02, 0, 1), 0, x, 0.012)
a, b = shot['pose']
for x in np.arange(a + 0.3, b - 0.4, 1.0): tc, n = S.burst(0.3); sfx.put(lp(np.sign(np.sin(2 * np.pi * 140 * tc)), 300) * np.clip((0.3 - tc) / 0.02, 0, 1), 0.3, x, 0.02)
amb.put(bp(S.pink(), 300, 3000) * win('pose'), 0, 0, 0.015)

fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique : électronique et tendue (mi mineur) ; plus sombre aux accusations ; elle s'ouvre (sol majeur) avec les voisins
CH = {'Em': [40, 47, 52, 55, 59], 'C': [36, 43, 48, 52, 55], 'Am': [45, 52, 57, 60, 64], 'B': [35, 47, 51, 54, 59], 'G': [43, 50, 55, 59, 62], 'D': [38, 50, 54, 57, 62], 'Cmaj7': [36, 48, 52, 55, 59]}
prog = [(0, shot['cafe'][0], 'Em'), (shot['cafe'][0], shot['dab'][0], 'C'), (shot['dab'][0], shot['magasin'][0], 'Am'), (shot['magasin'][0], shot['accuse'][0], 'B'),
        (shot['accuse'][0], shot['essence'][0], 'Em'), (shot['essence'][0], shot['voisins'][0], 'Am'), (shot['voisins'][0], shot['tonga'][0], 'G'), (shot['tonga'][0], shot['retour'][0], 'D'),
        (shot['retour'][0], shot['pose'][0], 'C'), (shot['pose'][0], END, 'Cmaj7'), (END, T['duration'], 'G')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.25), rng.uniform(-0.4, 0.4), 0, 0.026)
mus.add(bm)
x = 3.0
while x < shot['voisins'][0]:
    if not (shot['carte'][0] + 0.8 < x < shot['carte'][1]):   # (le silence quand le monde s'éteint)
        mus.put(S.hit(hz(28), 0.35, 8), 0, x, 0.045); tc, n = S.burst(0.03); mus.put(hp(S.noise(n), 4000) * np.exp(-tc * 160), 0.3, x + 0.25, 0.03)
    x += 0.5
for i, m in enumerate([67, 71, 74, 71, 79, 74]): mus.put(S.pluck(hz(m), 2.0, 2.0), (i % 3 - 1) * 0.3, shot['voisins'][0] + 0.3 + i * 1.0, 0.035)
for i, m in enumerate([72, 76, 79, 83]): mus.put(S.pluck(hz(m), 2.6, 1.6), (i - 1.5) * 0.25, shot['pose'][0] + 0.3 + i * 0.6, 0.035)
for i, m in enumerate([67, 71, 74]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.6 * frozen)
mus_v = S.verb(mus, wet=0.35, secs=2.5); amb_v = S.verb(amb, wet=0.3, secs=2.2); sfx_v = S.verb(sfx, wet=0.25, secs=2.0)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

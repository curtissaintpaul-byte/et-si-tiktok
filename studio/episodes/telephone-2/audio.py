"""Bande-son de « Et si tu lâchais ton téléphone pendant 30 jours ? » (partie 2). La chambre le soir, le rappel de la
partie 1 (une cassette qu'on rembobine, le souffle de la bande, la vibration fantôme, TOC TOC TOC), la porte qui s'ouvre
(le loquet, le grincement, les pas de Maëlle), leurs voix (un murmure), la bibliothèque (le silence d'une grande salle, des
pages, une toux, un crayon), l'arrêt sur image, les quais au coucher du soleil (le vent, l'eau, les mouettes, le tram, le
plan en papier, les voix des deux amies, les notifications du téléphone de Maëlle), puis jour 30 : minuit, le saut d'image,
le cœur qui bat pendant que sa main hésite au-dessus du tiroir. Musique : le suspense, puis plus apaisée (do majeur), et
une fin qui reste en suspens. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=3031); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3); live = 1 - 0.85 * frozen
ID = ['hook', 'r1', 'r2', 'r3', 'j7', 'bib', 'qu', 'qu2', 'j30', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.03, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
def ping(at, f=1760, g=0.03, pan=0.0):
    tc, n = S.burst(0.35); sfx.put(np.sin(2 * np.pi * f * tc) * np.exp(-tc * 10) * np.clip(tc / 0.002, 0, 1), pan, at, g)
def buzz(at, dur=0.3, g=0.06):
    tc, n = S.burst(dur); b = np.sign(np.sin(2 * np.pi * 155 * tc)) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * tc)); sfx.put(lp(b, 600) * np.clip(tc / 0.01, 0, 1) * np.clip((dur - tc) / 0.03, 0, 1), -0.2, at, g)
def step(at, g=0.03, f0=300, f1=2500, pan=0.0):
    tc, n = S.burst(0.08); sfx.put(bp(S.noise(n), f0, f1) * np.exp(-tc * 60), pan, at, g)
def knock(at, g=0.15):
    tc, n = S.burst(0.12); sfx.put((np.sin(2 * np.pi * 95 * tc) * np.exp(-tc * 40) + 0.5 * bp(S.noise(n), 400, 2500) * np.exp(-tc * 90)), 0.1, at, g)
def page(at, g=0.02):
    tc, n = S.burst(0.3); sfx.put(bp(S.noise(n), 1500, 7000) * np.sin(np.pi * tc / 0.3) ** 2, 0, at, g)
def voices(a, b, g=0.025, pan=0.0, rate=3.7):
    d = b - a; tc, n = S.burst(d); e = np.clip(tc / 0.2, 0, 1) * np.clip((d - tc) / 0.2, 0, 1)
    syl = np.clip(np.sin(2 * np.pi * rate * tc) * np.sin(2 * np.pi * 0.55 * tc + rng.uniform(0, 3)), 0, 1)
    amb.put(bp(S.noise(n), 250, 2400) * (0.3 + 0.7 * syl) * e, pan, a, g)
tt = np.arange(N) / SR
room = np.clip(win('hook') + win('j7') + win('j30'), 0, 1)
recap = np.clip(win('r1') + win('r2') + win('r3'), 0, 1)
quais = np.clip(win('qu') + win('qu2'), 0, 1)

# --- la chambre : un bourdonnement doux ; une page tournée au début
amb.put(lp(S.pink(), 280) * room * live, 0, 0, 0.035)
page(0.9); page(2.4)
# --- le rappel : la cassette qu'on rembobine (un sifflement qui monte), le souffle de la bande, les sons de la partie 1
a, b = shot['r1'][0], shot['r3'][1]
tc, n = S.burst(0.6); fq = 900 + 3000 * (tc / tc[-1]); sfx.put((np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)) * np.sin(np.pi * tc / tc[-1]), 0, a - 0.15, 0.04)
amb.put(bp(S.noise(), 3000, 9000) * recap, 0, 0, 0.012)
tc, n = S.burst(0.2); sfx.put(np.sin(2 * np.pi * 85 * tc) * np.exp(-tc * 35), -0.1, shot['r1'][0] + 0.5, 0.1)   # le tiroir qui se ferme
buzz(shot['r2'][0] + 0.15); buzz(shot['r2'][0] + 0.55)
for i in range(3): knock(shot['r3'][0] + 0.15 + i * 0.3)
# --- jour 7 : le loquet, la porte qui grince, les pas de Maëlle ; leurs voix
D0 = E['door']
tc, n = S.burst(0.08); sfx.put(hp(S.noise(n), 2000) * np.exp(-tc * 80), 0.1, D0 - 0.05, 0.06)
tc, n = S.burst(0.7); sfx.put(np.sin(2 * np.pi * np.cumsum(380 + 150 * np.sin(2 * np.pi * 2.5 * tc)) / SR) * bp(S.noise(n), 300, 2400) * np.sin(np.pi * tc / 0.7), 0.1, D0, 0.025)
for x in np.arange(E['enter'], E['enter'] + 1.5, 0.5): step(x, 0.03, 200, 1800, 0.15)
a, b = shot['j7']; voices(a + 0.4, a + 2.2, 0.02, 0.15, 4.2); voices(a + 3.7, b - 0.2, 0.025, -0.1, 3.6)
# --- la bibliothèque : le souffle de la ventilation, des pages, un crayon, une toux lointaine
a, b = shot['bib']
amb.put((lp(S.pink(), 600) + 0.2 * np.sin(2 * np.pi * 120 * tt)) * win('bib') * live, 0, 0, 0.02)
for x in [a + 1.2, a + 4.8, a + 8.3, a + 13.5]: page(x, 0.015)
for x in np.arange(a + 2.0, a + 3.6, 0.13): tc, n = S.burst(0.06); sfx.put(bp(S.noise(n), 3000, 8000) * np.sin(np.pi * tc / 0.06), 0.4, x + rng.uniform(0, 0.05), 0.006)
tc, n = S.burst(0.35); sfx.put(bp(S.noise(n), 300, 2000) * np.exp(-tc * 9), -0.6, a + 6.2, 0.02)
freeze_sfx(S, sfx, F0, FD)
# --- les quais au coucher du soleil : le vent, l'eau, les mouettes, le tram, le plan en papier, les pas du passant
wind = lp(S.pink(), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.08 * tt) ** 2)
amb.put(wind * quais, 0, 0, 0.05)
lap = bp(S.noise(), 200, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.35 * tt) ** 4)
amb.put(lap * quais, -0.6, 0, 0.03)
a, b = shot['qu']
tc, n = S.burst(0.7); sfx.put(bp(S.noise(n), 800, 6000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 9 * tc))) * np.sin(np.pi * tc / 0.7), 0.1, a + 0.2, 0.025)   # le plan
for x in np.arange(a + 0.1, a + 1.6, 0.5): step(x, 0.02, 600, 4000, -0.2)
voices(a + 1.8, b - 0.1, 0.02, 0.1, 4.0)
for x in [a + 0.7, shot['qu2'][0] + 2.5]:
    tc, n = S.burst(0.6); f = 1300 + 500 * np.exp(-tc * 5); sfx.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tc / 0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * tc)), rng.uniform(-0.7, 0.7), x, 0.008)
for i, f in enumerate([880, 740]): tc, n = S.burst(0.5); sfx.put(np.sin(2 * np.pi * f * tc) * np.exp(-tc * 5), 0.6, shot['qu2'][0] + 1.0 + i * 0.25, 0.01)
a, b = shot['qu2']; voices(a + 0.3, b - 0.2, 0.025, 0.0, 3.4)
for x in np.arange(E['phoneM'], b - 0.3, 1.1): ping(x, rng.choice([1568, 1760, 2093]), 0.014, 0.3)
# --- jour 30 : presque le silence ; le saut d'image à minuit ; le cœur qui bat pendant qu'elle hésite
a, b = shot['j30']
tc, n = S.burst(0.2); sfx.put(bp(S.noise(n), 1500, 8000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * tc))), 0, E['jump'], 0.03)
x = E['reach'][0]; per = 0.85
while x < END - 0.2:
    for dx, a2 in ((0, 1.0), (0.14, 0.6)): sfx.put(S.hit(50, 0.25, 22), 0, x + dx, 0.1 * a2)
    x += per; per = max(0.55, per * 0.97)
fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique
CH = {'Am': [45, 52, 57, 60, 64], 'F': [41, 53, 57, 60, 65], 'C': [36, 48, 55, 60, 64], 'G': [43, 50, 55, 59, 62], 'Dm': [38, 50, 57, 62, 65],
      'Esus': [40, 52, 57, 59, 64], 'Fmaj7': [41, 53, 57, 60, 64], 'Em': [40, 52, 55, 59, 64]}
J = lambda k: shot[k][0]
prog = [(0, J('r1'), 'Esus'), (J('r1'), J('j7'), 'Am'), (J('j7'), J('bib'), 'F'), (J('bib'), F0, 'C'), (F0, J('qu'), 'G'), (J('qu'), J('qu2'), 'F'), (J('qu2'), J('j30'), 'C'),
        (J('j30'), E['jump'], 'Am'), (E['jump'], END, 'Dm'), (END, T['duration'], 'Fmaj7')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.25), rng.uniform(-0.4, 0.4), 0, 0.024)
mus.add(bm)
for x in np.arange(J('bib') + 0.4, J('j30'), 1.0): mus.put(S.pluck(hz(rng.choice([67, 72, 74, 76, 79])), 1.8, 2.4), rng.uniform(-0.6, 0.6), x, 0.02)
for x in np.arange(J('j7') + 0.5, J('bib'), 1.5):
    for i, m in enumerate([69, 72, 76]): mus.put(S.pluck(hz(m), 1.4, 3), (i - 1) * 0.3, x + i * 0.18, 0.016)
for i, m in enumerate([65, 69, 72, 76]): mus.put(S.pluck(hz(m), 3.0, 1.2), (i - 1.5) * 0.3, END + 0.3 + i * 0.5, 0.045)
mus.mul((1 - 0.6 * frozen) * (1 - 0.5 * recap))
mus_v = S.verb(mus, wet=0.35, secs=2.8); amb_v = S.verb(amb, wet=0.25, secs=2.0); sfx_v = S.verb(sfx, wet=0.2, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2], target=-18.0)

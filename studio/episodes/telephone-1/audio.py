"""Bande-son de « Et si tu lâchais ton téléphone pendant 30 jours ? » (partie 1). La chambre (le bourdonnement d'une
petite chambre, le soir), le téléphone de Sarah (des notifications, puis plus rien), le tiroir (il glisse, le téléphone
tombe au fond, il se referme), le jour (des oiseaux, le tram de Bordeaux au loin), 3 h du matin (le silence, puis UNE
VIBRATION : le spectateur l'entend aussi… alors que le téléphone est éteint), le cœur qui accélère pendant l'arrêt sur
image, le saut d'image de la caméra, la porte, les quais (le vent, l'eau de la Garonne, les mouettes, le tram), les
messages de Maëlle (un « whoosh » par message), la page qu'on tourne, puis TOC TOC TOC. Musique : douce et un peu
mélancolique (la mineur), tendue la nuit, qui s'ouvre sur les quais, puis le suspense. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=3030); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']; D = E['drawer']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3); live = 1 - 0.85 * frozen
ID = ['j0', 'j1', 'j2', 'j3', 'j4', 'j5', 'j5b', 'msg', 'j7', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.03, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
def ping(at, f=1760, g=0.03, pan=0.0):
    tc, n = S.burst(0.35); sfx.put(np.sin(2 * np.pi * f * tc) * np.exp(-tc * 10) * np.clip(tc / 0.002, 0, 1), pan, at, g)
def buzz(at, dur=0.35, g=0.06, muffle=600):
    tc, n = S.burst(dur); b = np.sign(np.sin(2 * np.pi * 155 * tc)) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * tc))
    sfx.put(lp(b, muffle) * np.clip(tc / 0.01, 0, 1) * np.clip((dur - tc) / 0.03, 0, 1), -0.2, at, g)
def step(at, g=0.03, f0=300, f1=2500, pan=0.0):
    tc, n = S.burst(0.08); sfx.put(bp(S.noise(n), f0, f1) * np.exp(-tc * 60), pan, at, g)
def knock(at, g=0.16):
    tc, n = S.burst(0.12); sfx.put((np.sin(2 * np.pi * 95 * tc) * np.exp(-tc * 40) + 0.5 * bp(S.noise(n), 400, 2500) * np.exp(-tc * 90)), 0.1, at, g)
tt = np.arange(N) / SR
room = np.clip(win('j0') + win('j1') + win('j2') + win('j3') + win('j4') + win('j7'), 0, 1)
quais = np.clip(win('j5') + win('j5b') + win('msg'), 0, 1)
day = np.clip(win('j1') + win('j2') + win('j4'), 0, 1)

# --- la chambre : un bourdonnement très doux (frigo, ville au loin) ; plus faible la nuit
amb.put(lp(S.pink(), 280) * (room - 0.4 * win('j3')) * live, 0, 0, 0.035)
amb.put(np.sin(2 * np.pi * 50 * tt) * 0.3 * (win('j0') + win('j7')), 0, 0, 0.004)
# le jour : des oiseaux dehors, et le tram de Bordeaux au loin (sa cloche à deux tons)
for k in ['j1', 'j2', 'j4']:
    a, b = shot[k]
    for x in np.arange(a + 0.3, b - 0.3, 0.7):
        if rng.random() < 0.6:
            tc, n = S.burst(0.18); fq = rng.uniform(2800, 4200); sfx.put(np.sin(2 * np.pi * (fq + 700 * np.sin(2 * np.pi * 16 * tc)) * tc) * np.sin(np.pi * tc / 0.18), rng.uniform(-0.8, -0.3), x, 0.006)
a, b = shot['j1']
for i, f in enumerate([880, 740]): tc, n = S.burst(0.5); sfx.put(np.sin(2 * np.pi * f * tc) * np.exp(-tc * 5), -0.6, a + 1.2 + i * 0.25, 0.006)
amb.put(lp(S.pink(), 900) * day, -0.4, 0, 0.012)

# --- jour 0 : le téléphone (des notifications, de petits tapotements), puis le tiroir
a, b = shot['j0']
for x in [0.6, 1.9, 2.6, 4.4, 5.1, 6.9, 8.2, 9.0, 10.7, 11.6, 12.4]: ping(a + x, rng.choice([1568, 1760, 2093]), 0.018, 0.2)
for x in np.arange(a + 0.3, D['reach'], 0.45): tc, n = S.burst(0.02); sfx.put(hp(S.noise(n), 3000) * np.exp(-tc * 300), 0.2, x + rng.uniform(0, 0.15), 0.008)
for at, d in [(D['open'] - 0.25, 0.45), (D['close'] - 0.3, 0.4)]:   # le tiroir qui glisse (bois sur bois)
    tc, n = S.burst(d); sfx.put(bp(S.noise(n), 250, 2200) * np.sin(np.pi * tc / d) * (0.7 + 0.3 * np.sin(2 * np.pi * 37 * tc)), -0.1, at, 0.06)
tc, n = S.burst(0.15); sfx.put(lp(S.noise(n), 900) * np.exp(-tc * 50) + np.sin(2 * np.pi * 140 * tc) * np.exp(-tc * 40), -0.1, D['put'], 0.08)   # le téléphone au fond
tc, n = S.burst(0.2); sfx.put(np.sin(2 * np.pi * 85 * tc) * np.exp(-tc * 35) + bp(S.noise(n), 300, 1800) * np.exp(-tc * 60) * 0.6, -0.1, D['close'] + 0.05, 0.12)   # il se ferme

# --- jour 3, 3 h : presque le silence. Elle ne dort pas, elle se redresse (les draps) ; (saut d'image) elle fixe le
#     tiroir ; UNE VIBRATION étouffée : le spectateur l'entend aussi… alors que le téléphone est éteint ; son souffle ;
#     le cœur qui accélère jusqu'à la fin de l'arrêt sur image ; (saut d'image) recouchée
tc, n = S.burst(0.5); sfx.put(lp(S.noise(n), 700) * np.sin(np.pi * tc / 0.5), 0, E['up'] + 0.05, 0.05)   # les draps
for jt in (E['jump'], E['back']):   # les sauts d'image de la caméra
    tc, n = S.burst(0.2); sfx.put(bp(S.noise(n), 1500, 8000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * tc))), 0, jt, 0.03)
tc, n = S.burst(0.4); sfx.put(lp(S.noise(n), 700) * np.sin(np.pi * tc / 0.4), 0, E['back'] + 0.1, 0.04)
bz = E['buzz']
buzz(bz, 0.32, 0.07); buzz(bz + 0.45, 0.32, 0.07)
tc, n = S.burst(0.5); sfx.put(bp(S.noise(n), 400, 2500) * np.exp(-tc * 6) * np.clip(tc / 0.02, 0, 1), 0, bz + 1.0, 0.04)   # son souffle
x = bz + 1.2; per = 0.8   # le cœur qui accélère
while x < F0 + FD + 1.2:
    g = 0.11 * (1.6 if F0 <= x < F0 + FD else 1)
    for dx, a2 in ((0, 1.0), (0.14, 0.6)): sfx.put(S.hit(50, 0.25, 22), 0, x + dx, g * a2)
    x += per; per = max(0.42, per * 0.94)
freeze_sfx(S, sfx, F0, FD)

# --- jour 4 : elle bâille, marche, ouvre la porte (le loquet, un grincement), la referme
a, b = shot['j4']
tc, n = S.burst(1.2); sfx.put(bp(S.noise(n), 300, 1400) * np.sin(np.pi * tc / 1.2) ** 2, 0, a + 0.1, 0.03)
s0, s1 = E['steps'][0], E['steps'][1]
for x in np.arange(s0, s1 + 1.0, 0.5): step(x, 0.035, 200, 1800, 0.1)
tc, n = S.burst(0.08); sfx.put(hp(S.noise(n), 2000) * np.exp(-tc * 80), 0.1, a + 2.4, 0.06)
tc, n = S.burst(0.6); sfx.put(np.sin(2 * np.pi * np.cumsum(420 + 160 * np.sin(2 * np.pi * 3 * tc)) / SR) * bp(S.noise(n), 300, 2400) * np.sin(np.pi * tc / 0.6), 0.1, a + 2.5, 0.02)
tc, n = S.burst(0.2); sfx.put(np.sin(2 * np.pi * 80 * tc) * np.exp(-tc * 30), 0.1, a + 4.8, 0.1)

# --- les quais : le vent, l'eau de la Garonne contre le quai, les mouettes, le tram, les pas, des voix lointaines
wind = lp(S.pink(), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.08 * tt) ** 2)
amb.put(wind * quais * live, 0, 0, 0.05)
lap = bp(S.noise(), 200, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.35 * tt) ** 4)
amb.put(lap * quais * live, -0.6, 0, 0.03)
amb.put(bp(S.pink(), 300, 2000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * tt)) * quais, 0.4, 0, 0.012)
a = shot['j5'][0]
for x in [a + 1.0, a + 4.6, shot['j5b'][0] + 1.4]:
    tc, n = S.burst(0.6); f = 1300 + 500 * np.exp(-tc * 5); sfx.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tc / 0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * tc)), rng.uniform(-0.7, 0.7), x, 0.008)
for i, f in enumerate([880, 740]): tc, n = S.burst(0.5); sfx.put(np.sin(2 * np.pi * f * tc) * np.exp(-tc * 5), 0.6, a + 2.6 + i * 0.25, 0.01)
s2, s3 = E['steps'][2], E['steps'][3]
for x in np.arange(s2 + 0.1, s3, 0.52): step(x, 0.02, 600, 4000, -0.1)

# --- les messages de Maëlle : un « whoosh » d'envoi chacun
for at in E['msgs']:
    tc, n = S.burst(0.25); sfx.put(bp(S.noise(n), 1200, 6000) * np.sin(np.pi * tc / 0.25) ** 2, 0.2, at - 0.1, 0.02); ping(at + 0.05, 1318, 0.012, 0.2)

# --- jour 7 : le soir, une page qu'on tourne ; puis TOC TOC TOC
a, b = shot['j7']
for x in [a + 1.3, a + 2.9]: tc, n = S.burst(0.3); sfx.put(bp(S.noise(n), 1500, 7000) * np.sin(np.pi * tc / 0.3) ** 2, 0, x, 0.02)
K = E['knock']
for i in range(3): knock(K + i * 0.35)
for i in range(3): knock(K + 2.6 + i * 0.3, 0.12)
fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique : la mineur, douce ; la nuit : une note grave tenue ; les quais : ça s'ouvre (do majeur) ; le suspense à la fin
CH = {'Am': [45, 52, 57, 60, 64], 'F': [41, 53, 57, 60, 65], 'C': [36, 48, 55, 60, 64], 'G': [43, 50, 55, 59, 62], 'Dm': [38, 50, 57, 62, 65],
      'E': [40, 52, 56, 59, 64], 'Fmaj7': [41, 53, 57, 60, 64], 'Esus': [40, 52, 57, 59, 64]}
J = lambda k: shot[k][0]
prog = [(0, J('j1'), 'Am'), (J('j1'), J('j2'), 'F'), (J('j2'), J('j3'), 'Dm'), (J('j3'), J('j4'), 'E'), (J('j4'), J('j5'), 'Am'),
        (J('j5'), J('j5b'), 'C'), (J('j5b'), J('msg'), 'Fmaj7'), (J('msg'), J('j7'), 'Dm'), (J('j7'), K, 'Am'), (K, END, 'Esus'), (END, T['duration'], 'F')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.6) * (0.4 if c == 'E' else 1)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.25), rng.uniform(-0.4, 0.4), 0, 0.024)
mus.add(bm)
# des notes pincées : un motif simple qui revient (comme une notification), plus lent sur les quais
for x in np.arange(0.5, J('j3'), 1.5):
    for i, m in enumerate([69, 72, 76]): mus.put(S.pluck(hz(m), 1.4, 3), (i - 1) * 0.3, x + i * 0.18, 0.018)
for x in np.arange(J('j5') + 0.4, J('msg'), 1.0): mus.put(S.pluck(hz(rng.choice([67, 72, 74, 76, 79])), 1.8, 2.4), rng.uniform(-0.6, 0.6), x, 0.022)
# la nuit : une basse qui pulse avec le cœur ; la fin : une pulsation de suspense après les coups
x = K + 0.9
while x < END: mus.put(S.hit(hz(28), 0.4, 6), 0, x, 0.05); x += 0.75
for i, m in enumerate([64, 68, 71]): mus.put(S.pluck(hz(m), 3.0, 1.2), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.045)
mus.mul((1 - 0.6 * frozen) * (1 - 0.45 * win('j3', 0.3, 0.3)))
mus_v = S.verb(mus, wet=0.35, secs=2.8); amb_v = S.verb(amb, wet=0.25, secs=2.0); sfx_v = S.verb(sfx, wet=0.2, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2], target=-18.0)

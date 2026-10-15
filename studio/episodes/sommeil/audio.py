"""Bande-son de « Et si tu ne dormais plus du tout ? » : la ville la nuit derrière la fenêtre, les petits clics du téléphone,
le silence de 4 h du matin, les oiseaux du jour, puis l'autoroute (moteur, roulement, lampadaires qui défilent). Pendant le
micro-sommeil, le son s'étouffe (comme si tu partais), l'arrêt sur image, la radio du drone, puis la BANDE SONORE qui
vibre sous les pneus et le coup de volant. Au 4e jour : un bourdonnement et des chuchotements. Le tableau, l'aire de repos
(calme), et une musique sombre qui pulse. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=264); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3); live = 1 - 0.85 * frozen
ID = ['chambre', 'nuit4h', 'matin', 'route', 'habitacle', 'air', 'reveil', 'halluc', 'tableau', 'aire', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
NOD, WAKE = E['nod'], E['wake']
room_night = np.clip(win('chambre') + win('nuit4h') + win('end'), 0, 1)
road = np.clip(win('route') + win('habitacle') + win('reveil'), 0, 1); inside = win('habitacle')

# --- la chambre la nuit : la rumeur de la ville (lointaine), un frigo qui ronronne ; les clics du téléphone
amb.put(lp(S.pink(), 220) * room_night, 0, 0, 0.06)
tt = np.arange(N) / SR; amb.put(np.sin(2 * np.pi * 50 * tt) * 0.3 * win('nuit4h'), 0, 0, 0.01)
for k in ['chambre', 'nuit4h']:
    a, b = shot[k]; x = a + 0.3
    while x < b - 0.2:
        tc, n = S.burst(0.02); sfx.put(hp(S.noise(n), 3000) * np.exp(-tc * 300), 0.2, x, 0.02); x += rng.uniform(0.12, 0.45)
# --- le matin : des oiseaux, la ville de jour
a, b = shot['matin']
amb.put(bp(S.pink(), 200, 3000) * win('matin'), 0, 0, 0.035)
for x in np.arange(a + 0.2, b - 0.3, 0.37):
    tc, n = S.burst(0.12); f = rng.uniform(2800, 4200); sfx.put(np.sin(2 * np.pi * (f + 900 * np.sin(2 * np.pi * 18 * tc)) * tc) * np.sin(np.pi * tc / 0.12), rng.uniform(-0.6, 0.6), x + rng.uniform(0, 0.2), 0.012)
tc, n = S.burst(1.6); sfx.put(bp(S.noise(n), 300, 1200) * np.sin(np.pi * tc / 1.6) ** 2, 0, a + 0.5, 0.05)   # le bâillement (un long souffle)

# --- l'autoroute : le moteur, le roulement des pneus, le vent ; un « vroum » à chaque lampadaire (tous les 50 m à 130 km/h)
muffle = 1 - 0.75 * S.window(NOD + 0.3, WAKE, 0.8, 0.05)                      # le micro-sommeil : le son s'éloigne
rpm = 2 * np.pi * np.cumsum(np.full(N, 38.0)) / SR
engine = (np.sin(rpm) + 0.5 * np.sin(2 * rpm) + 0.25 * np.sin(3 * rpm)) * 0.5 + bp(S.noise(), 80, 500)
amb.put(lp(engine, 500) * road * (1 + 0.6 * inside) * muffle * live, 0, 0, 0.03)
amb.put(bp(S.pink(), 300, 2500) * road * (1 - 0.5 * inside) * muffle * live, 0, 0, 0.05)
for k in ['route', 'reveil']:
    a, b = shot[k]
    for x in np.arange(a + 0.4, b, 1.38):
        tc, n = S.burst(0.7); sfx.put(bp(S.noise(n), 200, 1500) * np.sin(np.pi * tc / 0.7) ** 2, 0.5, x, 0.03)
freeze_sfx(S, sfx, F0, FD)
# pendant le micro-sommeil : un sifflement très doux et un souffle sourd, comme quand on « part » (pour ne pas laisser un trou de silence)
tc, n = S.burst(WAKE - NOD)
sleepy = (np.sin(2 * np.pi * 880 * tc) * 0.3 + lp(S.noise(n), 160) * 2.5) * np.clip(tc / 0.8, 0, 1) * np.clip((WAKE - NOD - tc) / 0.05, 0, 1)
sfx.put(sleepy, 0, NOD, 0.03)
# la vue aérienne : la radio du drone, le bip de repérage
a, b = shot['air']; d = b - a; tc, n = S.burst(d)
sfx.put((bp(S.noise(n), 1500, 5000) * 0.5 + np.sin(2 * np.pi * 7400 * tc) * 0.15) * np.clip(tc / 0.05, 0, 1) * np.clip((d - tc) / 0.05, 0, 1), 0, a, 0.02)
for x in np.arange(a + 0.3, b - 0.2, 0.7): tc, n = S.burst(0.08); sfx.put(np.sin(2 * np.pi * 1320 * tc) * np.exp(-tc * 30), 0.1, x, 0.05)
# LE RÉVEIL : la bande sonore qui vibre sous les pneus (« brrrrrr »), puis le coup de volant (pneus qui crissent)
tc, n = S.burst(1.0)
rumble = np.sign(np.sin(2 * np.pi * 68 * tc)) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tc)) * np.clip(tc / 0.03, 0, 1) * np.clip((1.0 - tc) / 0.2, 0, 1)
sfx.put(lp(rumble, 1500), 0.3, WAKE - 0.25, 0.22)
tc, n = S.burst(0.9); sfx.put(bp(S.noise(n), 1800, 6000) * np.sin(np.pi * tc / 0.9) * (1 + 0.5 * np.sin(2 * np.pi * 31 * tc)), -0.2, WAKE + 0.2, 0.06)
tc, n = S.burst(0.5); sfx.put(np.sin(2 * np.pi * 110 * tc) * np.exp(-tc * 6), 0, WAKE - 0.2, 0.12)   # (le cœur qui fait un bond)

# --- le 4e jour : un bourdonnement grave, des chuchotements (souffle filtré qui va et vient), le cœur
a, b = shot['halluc']; d = b - a; tc, n = S.burst(d)
amb.put((np.sin(2 * np.pi * 55 * tc) + 0.6 * np.sin(2 * np.pi * 58.3 * tc)) * np.clip(tc / 0.4, 0, 1) * np.clip((d - tc) / 0.3, 0, 1), 0, a, 0.05)
wh = bp(S.noise(n), 1800, 5200) * np.clip(np.sin(2 * np.pi * 1.7 * tc), 0, 1) ** 3
sfx.put(wh, -0.6, a, 0.03); sfx.put(bp(S.noise(n), 1500, 4500) * np.clip(np.sin(2 * np.pi * 1.3 * tc + 2), 0, 1) ** 3, 0.6, a, 0.025)
for x in np.arange(a + 0.2, b - 0.2, 0.75):
    for dx, g in [(0, 1), (0.16, 0.7)]: tc2, n2 = S.burst(0.12); sfx.put(np.sin(2 * np.pi * 52 * tc2) * np.exp(-tc2 * 30), 0, x + dx, 0.12 * g)

# --- le tableau : souffle + fiches qui tombent ; l'aire de repos : l'autoroute au loin, un grillon
a, b = shot['tableau']; sfx.put(S.whoosh(0.8) * 0.8, 0, a - 0.35, 0.05)
for i in range(3):
    tc, n = S.burst(0.12); sfx.put(bp(S.noise(n), 900, 5000) * np.exp(-tc * 40) + np.sin(2 * np.pi * 180 * tc) * np.exp(-tc * 45) * 0.5, (i % 2 - 0.5) * 0.6, a + 0.2 + i / 3.6 * 2.8 + 0.1, 0.07)
amb.put(lp(S.pink(), 400) * win('aire'), 0, 0, 0.03)
a, b = shot['aire']
for x in np.arange(a + 0.3, b, 0.9):
    tc, n = S.burst(0.25); sfx.put(np.sin(2 * np.pi * 4400 * tc) * (np.sin(2 * np.pi * 40 * tc) > 0) * np.sin(np.pi * tc / 0.25), 0.7, x, 0.008)

fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique : sombre et lente (la mineur), une pulsation qui ressemble à un cœur fatigué ; elle se coupe pendant le micro-sommeil
CH = {'Am': [45, 52, 57, 60, 64], 'F': [41, 48, 53, 57, 60], 'Dm': [38, 45, 50, 53, 57], 'E': [40, 47, 52, 56, 59], 'C': [36, 43, 48, 52, 55]}
prog = [(0, shot['matin'][0], 'Am'), (shot['matin'][0], shot['route'][0], 'C'), (shot['route'][0], NOD + 0.4, 'F'), (WAKE + 0.4, shot['halluc'][0], 'E'),
        (shot['halluc'][0], shot['tableau'][0], 'Dm'), (shot['tableau'][0], shot['aire'][0], 'F'), (shot['aire'][0], T['duration'], 'Am')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.2), rng.uniform(-0.4, 0.4), 0, 0.03)
mus.add(bm)
x = 3.0
while x < END:
    if not (NOD + 0.4 < x < WAKE + 0.4):
        for dx, g in [(0, 1), (0.18, 0.6)]: mus.put(S.hit(hz(28), 0.4, 8), 0, x + dx, 0.04 * g)
    x += 1.0
for i, m in enumerate([64, 67, 72]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.6 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); amb_v = S.verb(amb, wet=0.15, secs=1.2); sfx_v = S.verb(sfx, wet=0.2, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

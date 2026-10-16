"""Bande-son de « Et si tu passais un an dans l'espace ? » (premier test des plans mélangés, dont certains « dans tes yeux »).
Les bips de la radio de la NASA (les « tonalités Quindar ») au début et à la fin ; dans la Station, le souffle permanent des
ventilateurs (c'est bruyant, là-haut) et ta respiration dans les plans « dans tes yeux » ; la boule d'eau qui fait « bloup » ;
le tapis de course et tes foulées ; le compteur Geiger des radiations ; l'arrêt sur image ; la capsule sous son parachute (le
vent, la toile qui claque, les petites fusées qui s'allument juste avant le sol) ; la steppe (le vent, les hélicoptères au
loin, les voix des secouristes) ; chez toi (le tic-tac, le papier lancé qui retombe trop tôt) ; deux horloges qui se décalent
pour les jumeaux. Musique : une nappe lente et spatiale (ré mineur) avec une pulsation douce, qui s'ouvre à la fin.
Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=2027); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3); live = 1 - 0.85 * frozen
ID = ['hook', 'j1', 'j2', 'j3', 'j7', 'j30', 'j60', 'j120', 'j200', 'j340', 'sol', 'maison', 'jumeaux', 'record', 'fin', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
def seg(k, sig_fn, pan=0.0, g=1.0, bus=None, fin=0.05, fout=0.08):
    a, b = shot[k]; d = b - a; tc, n = S.burst(d); e = np.clip(tc / fin, 0, 1) * np.clip((d - tc) / fout, 0, 1)
    (bus or amb).put(sig_fn(tc, n) * e, pan, a, g)
def tick(at, f=2400, g=0.02, pan=0.0): tc, n = S.burst(0.04); sfx.put(bp(S.noise(n), f * 0.7, f * 1.4) * np.exp(-tc * 160), pan, at, g)
def quindar(at, f=2525, g=0.035): tc, n = S.burst(0.25); sfx.put(np.sin(2 * np.pi * f * tc) * np.clip(tc / 0.004, 0, 1) * np.clip((0.25 - tc) / 0.004, 0, 1), 0, at, g)
def breath(k, rate=0.32, g=0.03, heavy=1.0):   # inspire, expire (un souffle filtré qui monte et descend)
    def f(tc, n):
        ph = (tc * rate + rng.random()) % 1.0; env = np.where(ph < 0.42, np.sin(np.pi * ph / 0.42), 0.6 * np.sin(np.pi * np.clip((ph - 0.5) / 0.45, 0, 1)))
        return bp(S.noise(n), 300 * heavy, 2200) * np.clip(env, 0, 1) ** 1.5
    seg(k, f, 0, g, sfx)

# --- la radio de la NASA : les deux bips au début (et à la fin) ; dehors, un grondement sourd (le « son » du film, pas du vide)
quindar(0.25); quindar(END + 0.15, 2475)
for k in ['hook', 'j120', 'record', 'end']: seg(k, lambda tc, n: lp(S.pink(n), 90) + 0.25 * np.sin(2 * np.pi * 36 * tc), 0, 0.07)
# --- dans la Station : les ventilateurs (un souffle constant, un ronflement à 120 Hz, un petit sifflement)
station = np.clip(win('j1') + win('j2') + win('j3') + win('j30') + win('j60') + win('j200') + 0.45 * (win('j7') + win('fin')), 0, 1)
fans = lp(S.pink(), 1800) * 0.8 + 0.15 * np.sin(2 * np.pi * 120 * S.t) + 0.04 * np.sin(2 * np.pi * 3150 * S.t) + 0.3 * bp(S.noise(), 400, 900)
amb.put(fans * station * live, 0, 0, 0.05)
for k in ['j1', 'j3', 'j7', 'j60', 'fin']: breath(k, 0.3, 0.022)
# --- jour 1 : le sang qui monte (un battement sourd)
a, b = shot['j1']
for x in np.arange(a + 0.3, b - 0.2, 0.86):
    for dx, gg in [(0, 0.09), (0.16, 0.05)]: sfx.put(S.hit(48, 0.3, 14), 0, x + dx, gg)
# --- jour 3 : la boule d'eau, ton doigt la touche (« bloup »), des gouttelettes s'en échappent
a, b = shot['j3']; d = b - a; at = a + 0.45 * d
tc, n = S.burst(0.35); sfx.put(np.sin(2 * np.pi * (380 + 900 * tc) * tc) * np.exp(-tc * 14) * np.clip(tc / 0.004, 0, 1), 0.1, at, 0.06)
for i in range(6): tc, n = S.burst(0.12); f = rng.uniform(1400, 2600); sfx.put(np.sin(2 * np.pi * (f + 2000 * tc) * tc) * np.exp(-tc * 40), rng.uniform(-0.5, 0.5), a + 0.58 * d + i * 0.11, 0.025)
# --- la coupole : une nappe brillante qui monte avec le lever de soleil
for k in ['j7', 'fin']:
    a, b = shot[k]; d = b - a; tc, n = S.burst(d); e = np.clip(tc / d, 0, 1) ** 1.5 * np.clip((d - tc) / 0.3, 0, 1)
    for m in [74, 81, 86]: sfx.put(np.sin(2 * np.pi * hz(m) * tc) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tc + m)) * e, (m - 80) / 10, a, 0.008)
# --- le tapis : le roulement de la bande, tes foulées, les élastiques qui grincent
a, b = shot['j30']; seg('j30', lambda tc, n: lp(S.noise(n), 260) * (1 + 0.3 * np.sin(2 * np.pi * 2.8 * tc)), 0, 0.05, sfx)
for i, x in enumerate(np.arange(a + 0.15, b - 0.1, 0.36)):
    tc, n = S.burst(0.12); sfx.put(lp(S.noise(n), 500) * np.exp(-tc * 35) + 0.5 * np.sin(2 * np.pi * 70 * tc) * np.exp(-tc * 30), 0.25 if i % 2 else -0.25, x, 0.05)
    if i % 4 == 1: tc, n = S.burst(0.25); sfx.put(bp(S.noise(n), 900, 1800) * np.sin(np.pi * tc / 0.25) * (0.5 + 0.5 * np.sin(2 * np.pi * 40 * tc)), 0.4, x + 0.05, 0.006)
# --- jour 60 : la vue qui se brouille (un sifflement aigu qui va et vient), quelques touches de clavier
a, b = shot['j60']; seg('j60', lambda tc, n: np.sin(2 * np.pi * 6200 * tc) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.35 * tc + 1.6)), 0, 0.006, sfx)
for x in np.arange(a + 0.4, b - 0.4, 0.21): tick(x + rng.uniform(0, 0.08), 3000, 0.012, 0.2)
# --- jour 120 : les radiations, comme un compteur Geiger qui s'emballe
a, b = shot['j120']; d = b - a; x = a + 0.1
while x < b - 0.05:
    tc, n = S.burst(0.006); sfx.put(np.ones(n) * np.exp(-tc * 900) * rng.choice([1, -1]), rng.uniform(-0.6, 0.6), x, 0.06)
    x += rng.exponential(0.12 / (1 + 4 * (x - a) / d))
# --- l'arrêt sur image (jour 200)
freeze_sfx(S, sfx, F0, FD)
# --- la capsule : le vent, la toile du parachute qui claque, les petites fusées juste avant le sol, le choc, la poussière
a, b = shot['j340']; d = b - a; land = a + 0.86 * d
seg('j340', lambda tc, n: bp(S.pink(n), 150, 1800) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * tc) ** 2), 0, 0.06)
for x in np.arange(a + 0.2, land - 0.2, 0.31): tc, n = S.burst(0.1); sfx.put(bp(S.noise(n), 200, 1200) * np.exp(-tc * 30), rng.uniform(-0.3, 0.3), x + rng.uniform(0, 0.1), 0.02)
sfx.put(S.whoosh(0.5), 0, land - 0.15, 0.05); sfx.put(S.boom(1.6, 80, 30), 0, land, 0.16)
tc, n = S.burst(0.8); sfx.put(lp(S.noise(n), 900) * np.exp(-tc * 4), 0, land, 0.07)
# --- la steppe : le vent, deux hélicoptères au loin, les voix des secouristes (un murmure), ta respiration lourde
for k in ['sol']:
    seg(k, lambda tc, n: bp(S.pink(n), 120, 2400), 0, 0.05)
    seg(k, lambda tc, n: lp(S.noise(n), 300) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.2 * tc)) ** 4, -0.5, 0.05)
    seg(k, lambda tc, n: bp(S.noise(n), 250, 1800) * (0.3 + 0.7 * np.clip(np.sin(2 * np.pi * 3.3 * tc) * np.sin(2 * np.pi * 0.45 * tc + 2), 0, 1)), 0.3, 0.03)
breath('sol', 0.42, 0.045, 0.8)
# --- chez toi : le tic-tac, la boule de papier (le froissement, le lancer, elle tombe bien avant la poubelle et rebondit)
a, b = shot['maison']; d = b - a; rel = a + 0.3 * d; hit = rel + 0.43
for x in np.arange(a + 0.1, b, 0.5): tick(x, 2600 if int((x - a) / 0.5) % 2 else 2000, 0.012, -0.5)
tc, n = S.burst(0.5); sfx.put(hp(S.noise(n), 2500) * (np.abs(np.sin(2 * np.pi * 9 * tc)) ** 3) * np.sin(np.pi * tc / 0.5), 0.3, a + 0.1, 0.02)
sfx.put(S.whoosh(0.3), 0.2, rel - 0.05, 0.03)
for x, gg in [(hit, 0.05), (hit + 0.19, 0.02), (hit + 0.3, 0.008)]: tc, n = S.burst(0.06); sfx.put(bp(S.noise(n), 500, 4000) * np.exp(-tc * 80), -0.2, x, gg)
amb.put(lp(S.pink(), 500) * win('maison'), 0, 0, 0.012)
# --- les jumeaux : deux horloges qui battent ensemble, puis se décalent un tout petit peu
a, b = shot['jumeaux']
for i, x in enumerate(np.arange(a + 0.2, b - 0.1, 0.5)):
    tick(x, 2200, 0.025, -0.6); tick(x + 0.004 * i * i * 0.4, 2900, 0.025, 0.6)
# --- le record : un grand souffle qui monte, puis une note grave (Mars)
a, b = shot['record']; sfx.put(S.whoosh(1.2), 0, a + 0.05, 0.04); sfx.put(S.boom(2.4, 55, 28), 0, a + 0.15 + 0.45 * (b - a), 0.08)

fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique : une nappe lente (ré mineur → si bémol → fa → do), sombre au retour sur Terre, elle s'ouvre à la fin
CH = {'Dm': [38, 50, 57, 62, 65], 'Bb': [34, 46, 53, 58, 62], 'F': [41, 53, 57, 60, 65], 'C': [36, 48, 55, 60, 64], 'Gm': [43, 50, 55, 58, 62], 'A': [33, 45, 52, 57, 61], 'Fmaj7': [41, 53, 57, 60, 64]}
prog = [(0, shot['j2'][0], 'Dm'), (shot['j2'][0], shot['j7'][0], 'Bb'), (shot['j7'][0], shot['j30'][0], 'F'), (shot['j30'][0], shot['j120'][0], 'C'),
        (shot['j120'][0], shot['j200'][0], 'Gm'), (shot['j200'][0], shot['j340'][0], 'A'), (shot['j340'][0], shot['sol'][0], 'Dm'), (shot['sol'][0], shot['jumeaux'][0], 'Bb'),
        (shot['jumeaux'][0], shot['record'][0], 'Gm'), (shot['record'][0], shot['fin'][0], 'A'), (shot['fin'][0], END, 'Fmaj7'), (END, T['duration'], 'Dm')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.8, 0.8)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.22), rng.uniform(-0.5, 0.5), 0, 0.026)
mus.add(bm)
x = 3.0
while x < shot['fin'][0]:
    if not (shot['j340'][0] + 2.0 < x < shot['sol'][0] + 0.5):   # (un silence quand la capsule touche le sol)
        mus.put(S.hit(hz(26), 0.4, 7), 0, x, 0.04); tc, n = S.burst(0.03); mus.put(hp(S.noise(n), 5000) * np.exp(-tc * 160), 0.3, x + 0.5, 0.02)
    x += 1.0
for i, m in enumerate([62, 65, 69, 72, 69, 65]): mus.put(S.pluck(hz(m), 2.0, 2.2), (i % 3 - 1) * 0.3, 3.2 + i * 0.5, 0.025)
for i, m in enumerate([65, 69, 72, 76, 79]): mus.put(S.pluck(hz(m), 2.8, 1.6), (i - 2) * 0.25, shot['fin'][0] + 0.3 + i * 0.5, 0.035)
for i, m in enumerate([62, 69, 74]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.4 + i * 0.55, 0.05)
mus.mul(1 - 0.6 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); amb_v = S.verb(amb, wet=0.25, secs=2.0); sfx_v = S.verb(sfx, wet=0.22, secs=1.8)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

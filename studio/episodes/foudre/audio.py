"""Bande-son de « Et si tu prenais la foudre ? » (format reconstitution) : le vent sur le plateau, le tonnerre au loin
(avec un retard : le son arrive après l'éclair), tes pas dans l'herbe, la pluie qui arrive, la course, LE coup de foudre
(un claquement sec + un grondement énorme), l'arrêt sur image, puis un sifflement aigu dans tes oreilles (les tympans),
la chute, la randonneuse qui court, le massage cardiaque (rythme régulier), le tableau d'enquête, la pluie sur le toit
de la voiture, et une musique sombre de reportage qui monte jusqu'au coup, puis retombe. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1859); N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3)
live = 1 - 0.85 * frozen
ID = ['plateau', 'air1', 'marche', 'loin', 'course', 'arbre', 'impact', 'air2', 'secours', 'tableau', 'abri', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
outside = np.clip(sum(win(k) for k in ['plateau', 'marche', 'loin', 'course', 'arbre', 'impact', 'secours', 'end']), 0, 1)
aerial = np.clip(win('air1') + win('air2'), 0, 1); car = win('abri'); board = win('tableau')
HIT = E['hit']; RAIN = E['rain']

# --- le vent sur le plateau (souffle qui va et vient), et la rumeur de l'orage qui approche
gust = 0.55 + 0.45 * lp(np.abs(S.noise()), 0.3, 1) * 8
amb.put(bp(S.noise(), 180, 1400) * gust * (outside + 0.3 * aerial) * live, 0, 0, 0.022)
amb.put(lp(S.pink(), 90) * (outside + 0.4 * aerial + 0.5 * car) * live * (0.5 + 0.5 * S.ramp(0, HIT)), 0, 0, 0.12)

# --- la pluie : un « chhhh » fin, avec des gouttes qui claquent ; sur le toit de la voiture : un tambourinage plus sourd
rain_on = S.ramp(RAIN, RAIN + 1.4) * (1 - board) * live
rain = bp(S.pink(), 900, 9000) + 0.35 * hp(S.noise() * (rng.uniform(size=N) < 0.004), 2500)
amb.put(rain * rain_on * (outside + 0.5 * aerial) * (1 - car), 0, 0, 0.05)
roof = lp(S.noise() * (rng.uniform(size=N) < 0.02), 2200) * 6 + 0.4 * bp(S.pink(), 300, 2000)
amb.put(roof * car, 0, 0, 0.05)

# --- le tonnerre au loin : il arrive APRÈS l'éclair (le son est bien plus lent que la lumière), un grondement qui roule
for t0, d in E['far']:
    delay = min(2.0, 0.35 + d / 320); g = 0.35 * min(1.0, 260 / max(d, 120)); dur = 4.5
    tt, n = S.burst(dur)
    roll = lp(S.noise(n), 140) * (np.exp(-tt * 0.9) * np.clip(tt / 0.35, 0, 1)) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.3 * tt) ** 2)
    k = 1.0 if t0 + delay < F0 or t0 + delay > F0 + FD else 0.15
    far.put(roll * 3.5, rng.uniform(-0.4, 0.4), t0 + delay, g * k)
    if d < 300: far.put(bp(S.noise(n), 300, 1800) * np.exp(-tt * 3) * np.clip(tt / 0.05, 0, 1), 0, t0 + delay, 0.05 * k)

# --- tes pas : la marche dans l'herbe, puis la course (plus rapide, avec des éclaboussures)
def steps(a, b, period, g, pan, wet=0.0):
    x = a
    while x < b:
        tt, n = S.burst(0.12)
        s = lp(S.noise(n), 900) * np.exp(-tt * 40) + 0.5 * bp(S.noise(n), 1500, 5000) * np.exp(-tt * 70) * (1 + 2 * wet)
        sfx.put(s, pan, x, g * float(outside[min(N - 1, int(x * SR))] + 0.4 * aerial[min(N - 1, int(x * SR))])); x += period + rng.uniform(-0.02, 0.02)
steps(0.3, E['walk'][1], 0.52, 0.06, -0.1)
steps(E['run'][0], E['run'][1] + 0.1, 0.32, 0.09, 0.0, wet=1)
steps(E['kate'][0] + 0.1, E['kate'][1] - 0.1, 0.31, 0.05, 0.2, wet=1)

# --- la vue aérienne : la radio du drone et un bip de repérage
for k in ['air1', 'air2']:
    a, b = shot[k]; d = b - a; tt, n = S.burst(d)
    sfx.put((bp(S.noise(n), 1500, 5000) * 0.5 + np.sin(2 * np.pi * 7400 * tt) * 0.15) * np.clip(tt / 0.05, 0, 1) * np.clip((d - tt) / 0.05, 0, 1), 0, a, 0.02)
    for x in np.arange(a + 0.3, b - 0.2, 0.7):
        tt, n = S.burst(0.08); sfx.put(np.sin(2 * np.pi * 1320 * tt) * np.exp(-tt * 30), 0.1, x, 0.05)

# --- LE COUP : un claquement sec (le canal d'air qui explose), puis un grondement énorme
tt, n = S.burst(0.35)
crack = hp(S.noise(n), 900) * np.exp(-tt * 18) * (1 + 0.6 * np.sign(np.sin(2 * np.pi * 37 * tt)))
sfx.put(crack, 0, HIT - 0.01, 0.9)
tt, n = S.burst(0.12); sfx.put(bp(S.noise(n), 2000, 12000) * np.exp(-tt * 50), 0.3, HIT + 0.07, 0.4); sfx.put(bp(S.noise(n), 2000, 12000) * np.exp(-tt * 50), -0.3, HIT + 0.15, 0.35)
boom = S.boom(4.0, 70, 24); sfx.put(boom, 0, HIT, 0.5)
freeze_sfx(S, sfx, F0, FD)
# pendant l'arrêt : l'écho du tonnerre qui roule très loin (étouffé)
tt, n = S.burst(FD); far.put(lp(S.noise(n), 90) * np.exp(-tt * 0.5) * np.clip(tt / 0.4, 0, 1) * np.clip((FD - tt) / 0.5, 0, 1) * 3, 0, F0, 0.12)
# après l'arrêt : un sifflement aigu dans tes oreilles (les tympans), qui s'éteint doucement
ring_at = F0 + FD; tt, n = S.burst(4.0)
ring = (np.sin(2 * np.pi * 6200 * tt) + 0.3 * np.sin(2 * np.pi * 6230 * tt)) * np.clip(tt / 0.05, 0, 1) * np.exp(-tt * 0.9)
sfx.put(ring, 0, ring_at, 0.03)
duck = 1 - 0.7 * S.window(ring_at, ring_at + 2.6, 0.05, 1.5)                    # le reste du monde est comme étouffé
amb.mul(duck); far.mul(duck)
# la chute : ton corps qui tombe dans l'herbe mouillée
tt, n = S.burst(0.4); sfx.put(lp(S.noise(n), 500) * np.exp(-tt * 14) + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 18), 0, E['fall'], 0.35)

# --- le massage cardiaque : des appuis réguliers (environ 110 par minute)
a, b = E['cpr'], shot['secours'][1] - 0.1; x = a + 0.35
while x < b:
    tt, n = S.burst(0.12); sfx.put(lp(S.noise(n), 400) * np.exp(-tt * 35) + np.sin(2 * np.pi * 95 * tt) * np.exp(-tt * 40) * 0.6, 0, x, 0.09); x += 60 / 110

# --- le tableau : un souffle à l'entrée, puis une fiche qui tombe à chaque carte
a, b = shot['tableau']
sfx.put(S.whoosh(0.8) * 0.8, 0, a - 0.35, 0.05)
for i in range(3):
    at = a + 0.2 + (i / 3.6) * 2.8 + 0.1
    tt, n = S.burst(0.12); sfx.put(bp(S.noise(n), 900, 5000) * np.exp(-tt * 40) + np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 45) * 0.5, (i % 2 - 0.5) * 0.6, at, 0.07)
tt, n = S.burst(1.5); sfx.put(np.sin(2 * np.pi * (60 * np.exp(-tt * 1.5) + 38) * tt) * np.exp(-tt * 2.2), 0, a + 2.9, 0.1)

fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, far, sfx): bb.mul(fade)

# --- la musique : sombre (ré mineur), une pulsation grave qui accélère jusqu'au coup, puis le silence, puis une fin plus douce
CH = {'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 46, 50, 53, 58], 'Gm': [31, 43, 46, 50, 55], 'A': [33, 45, 49, 52, 57], 'F': [29, 41, 45, 48, 53], 'C': [36, 43, 48, 52, 55]}
prog = [(0, shot['loin'][0], 'Dm'), (shot['loin'][0], shot['course'][0], 'Bb'), (shot['course'][0], HIT, 'A'), (ring_at + 1.0, shot['tableau'][0], 'Gm'),
        (shot['tableau'][0], shot['abri'][0], 'Bb'), (shot['abri'][0], END, 'F'), (END, T['duration'], 'Dm')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.3 if z == HIT else 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.2), rng.uniform(-0.4, 0.4), 0, 0.03)
mus.add(bm)
x = 3.0
while x < HIT - 0.1:   # la pulsation grave : de plus en plus serrée à l'approche de l'arbre
    k = 1.0 + 0.8 * (x > shot['course'][0])
    mus.put(S.hit(hz(26), 0.45, 7), 0, x, 0.05 * k); x += 0.8 if x < shot['course'][0] else 0.4
x = shot['secours'][0]
while x < shot['tableau'][0]: mus.put(S.hit(hz(26), 0.45, 7), 0, x, 0.035); x += 60 / 110
for i, m in enumerate([62, 65, 69]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.6 * frozen)
mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.5, secs=3.0); amb_v = S.verb(amb, wet=0.15, secs=1.2); sfx_v = S.verb(sfx, wet=0.18, secs=1.6)
master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

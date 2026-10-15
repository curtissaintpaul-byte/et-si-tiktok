"""Bande-son de « Et si tu ne dormais plus du tout ? » (version 2 : l'histoire de Josh). La chambre la nuit (la ville au loin,
les clics du téléphone), le ventilateur de l'ordinateur et Josh qui mange, la rue de nuit et ses pas qui s'arrêtent net
(le son s'étouffe pendant que des zones de son cerveau dorment), le 4e jour (un bourdonnement, des chuchotements, le cœur),
le stylo qui gratte la feuille du calcul, le coup de tampon « HYPOTHÈSE », le 14e jour (les oiseaux d'été, les dents qui
claquent), l'IRM (les cognements réguliers de la machine), les clics du dauphin, la chute sur le lit, la nuit en accéléré
(le tic-tac qui s'emballe) et le matin (les oiseaux, le bâillement). Musique : sombre et pulsée jusqu'au record, mystérieuse
pendant l'hypothèse, et elle s'ouvre en majeur au réveil. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=264); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']
frozen = np.zeros(N)
for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.12, 0.3))
live = 1 - 0.85 * frozen
ID = ['nuit', 'h24', 'h48', 'h72', 'j5', 'j11', 'hypo', 'j14', 'ruse', 'j21', 'dodo', 'reveil', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
def tick(at, f=2400, g=0.03, pan=0.0):
    tc, n = S.burst(0.02); sfx.put(hp(S.noise(n), f) * np.exp(-tc * 300), pan, at, g)
def birds(a, b, g=0.012, every=0.37):
    for x in np.arange(a + 0.2, b - 0.3, every):
        tc, n = S.burst(0.12); f = rng.uniform(2800, 4200)
        sfx.put(np.sin(2 * np.pi * (f + 900 * np.sin(2 * np.pi * 18 * tc)) * tc) * np.sin(np.pi * tc / 0.12), rng.uniform(-0.6, 0.6), x + rng.uniform(0, 0.2), g)
room = np.clip(win('nuit') + win('h24') + win('h72') + win('j5') + win('j11') + win('hypo') + win('j14') + win('j21') + win('dodo') + win('reveil') + win('end'), 0, 1)

# --- la chambre : la rumeur de la ville, très loin ; les clics du téléphone
amb.put(lp(S.pink(), 220) * room * live, 0, 0, 0.05)
for k in ['nuit', 'end']:
    a, b = shot[k]; x = a + 0.3
    while x < b - 0.2: tick(x, 3000, 0.02, 0.2); x += rng.uniform(0.12, 0.45)
# --- le 2e jour (et le 14e) : le ventilateur de l'ordinateur, et Josh qui croque dans sa pizza
for k in ['h24', 'j14']:
    a, b = shot[k]; d = b - a; tc, n = S.burst(d)
    amb.put(bp(S.noise(n), 300, 900) * 0.6 * np.clip(tc / 0.05, 0, 1) * np.clip((d - tc) / 0.05, 0, 1), -0.3, a, 0.02)
    for x in [a + 0.6, a + 1.5, a + 2.6]:
        if x > b - 0.3: continue
        for j in range(5): tc2, n2 = S.burst(0.05); sfx.put(bp(S.noise(n2), 900, 4000) * np.exp(-tc2 * 70), -0.1, x + j * 0.11 + rng.uniform(0, 0.03), 0.03)
# --- le 3e jour : la rue de nuit (la circulation au loin, ses pas) ; il s'arrête net et le son s'étouffe, puis il repart
a, b = shot['h48']; STOP0, STOP1 = a + 1.5, a + 2.9
muffle = 1 - 0.8 * S.window(STOP0, STOP1, 0.25, 0.08)
amb.put(lp(S.pink(), 500) * win('h48') * muffle, 0, 0, 0.07)
x = a + 0.15
while x < b:
    if not (STOP0 < x < STOP1): tc, n = S.burst(0.08); sfx.put(bp(S.noise(n), 600, 3500) * np.exp(-tc * 55), rng.uniform(-0.2, 0.2), x, 0.03)
    x += 0.52
tc, n = S.burst(STOP1 - STOP0)
sleepy = (np.sin(2 * np.pi * 880 * tc) * 0.25 + lp(S.noise(n), 160) * 2.5) * np.clip(tc / 0.4, 0, 1) * np.clip((STOP1 - STOP0 - tc) / 0.05, 0, 1)
sfx.put(sleepy, 0, STOP0, 0.035)
tc, n = S.burst(0.45); sfx.put(np.sin(2 * np.pi * 120 * tc) * np.exp(-tc * 8), 0, STOP1 - 0.05, 0.08)   # (il « revient » d'un coup)
# --- le 4e jour et le 5e : un bourdonnement grave, des chuchotements qui vont et viennent, le cœur (plus vite au 5e jour)
for k, bpm in [('h72', 80), ('j5', 104)]:
    a, b = shot[k]; d = b - a; tc, n = S.burst(d); e = np.clip(tc / 0.4, 0, 1) * np.clip((d - tc) / 0.3, 0, 1)
    amb.put((np.sin(2 * np.pi * 55 * tc) + 0.6 * np.sin(2 * np.pi * 58.3 * tc)) * e, 0, a, 0.05)
    sfx.put(bp(S.noise(n), 1800, 5200) * np.clip(np.sin(2 * np.pi * 1.7 * tc), 0, 1) ** 3 * e, -0.6, a, 0.03)
    sfx.put(bp(S.noise(n), 1500, 4500) * np.clip(np.sin(2 * np.pi * 1.3 * tc + 2), 0, 1) ** 3 * e, 0.6, a, 0.025)
    for x in np.arange(a + 0.2, b - 0.2, 60 / bpm):
        for dx, g in [(0, 1), (0.16, 0.7)]: tc2, n2 = S.burst(0.12); sfx.put(np.sin(2 * np.pi * 52 * tc2) * np.exp(-tc2 * 30), 0, x + dx, 0.12 * g)
for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
# --- le 11e jour : le stylo qui gratte la feuille, une ligne après l'autre… puis il ne sait plus (un gribouillis)
a, b = shot['j11']
for i, x in enumerate([a + 0.3, a + 0.8, a + 1.3, a + 1.8, a + 2.3, a + 2.8, a + 3.3]):
    d = 0.32 if i < 6 else 0.6; tc, n = S.burst(d)
    sfx.put(bp(S.noise(n), 2500, 7000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * (9 if i < 6 else 5) * tc))) * np.sin(np.pi * tc / d), 0.1, x, 0.03)
# --- le coup de tampon « HYPOTHÈSE »
a, b = shot['hypo']; sfx.put(S.whoosh(0.5) * 0.5, 0, a - 0.3, 0.04)
tc, n = S.burst(0.5); sfx.put(np.sin(2 * np.pi * 70 * tc) * np.exp(-tc * 12) + bp(S.noise(n), 400, 3000) * np.exp(-tc * 40) * 0.6, 0, a + 0.05, 0.22)
# --- le 14e jour : l'été dehors (les oiseaux), les dents qui claquent (il grelotte)
a, b = shot['j14']; birds(a, b)
amb.put(bp(S.pink(), 200, 3000) * win('j14') * live, 0, 0, 0.025)
for x in np.arange(a + 0.3, b - 0.2, 1.2):
    for j in range(7): tick(x + j * 0.07, 3500, 0.012, -0.05)
# --- l'IRM : les cognements réguliers de la machine (comme un marteau très doux, en rafales) ; le dauphin : ses clics et son sifflement
a, b = shot['ruse']; d = b - a; tc, n = S.burst(d)
amb.put(lp(S.noise(n), 200) * np.clip(tc / 0.2, 0, 1) * np.clip((d - tc) / 0.2, 0, 1), 0, a, 0.05)
x = a + 0.2
while x < b - 0.2:
    for j in range(4): tc2, n2 = S.burst(0.05); sfx.put(np.sign(np.sin(2 * np.pi * 420 * tc2)) * np.exp(-tc2 * 60), 0, x + j * 0.12, 0.018)
    x += 0.9
DOL = a + 3.8
for j in range(12): tc2, n2 = S.burst(0.006); sfx.put(np.sin(2 * np.pi * 7000 * tc2), 0.4, DOL + j * 0.035, 0.02)
tc, n = S.burst(0.7); sfx.put(np.sin(2 * np.pi * np.cumsum(6000 + 3000 * np.sin(2 * np.pi * 2.2 * tc)) / SR) * np.sin(np.pi * tc / 0.7), 0.4, DOL + 0.6, 0.02)
# --- le 21e jour : il bascule sur le lit (le choc sourd, les ressorts)
a, b = shot['j21']; sfx.put(S.boom(1.2, 90, 40), 0, a + 1.35, 0.12)
tc, n = S.burst(0.35); sfx.put(np.sin(2 * np.pi * (900 + 300 * np.sin(2 * np.pi * 9 * tc)) * tc) * np.exp(-tc * 9), 0.2, a + 1.4, 0.015)
# --- la nuit en accéléré : le tic-tac qui s'emballe, un souffle qui monte ; au bout, les oiseaux du matin
a, b = shot['dodo']; d = b - a
for j in range(60):
    x = a + d * (j / 60) ** 0.8
    if x < b - 0.05: tick(x, 3200, 0.012 + 0.012 * j / 60, 0.3)
tc, n = S.burst(d); sfx.put(bp(S.noise(n), 300, 2500) * np.clip(tc / d, 0, 1) ** 2 * np.clip((d - tc) / 0.15, 0, 1), 0, a, 0.03)
birds(a + d * 0.65, b, 0.008, 0.25)
# --- le réveil : les oiseaux, la ville de jour, le long bâillement
a, b = shot['reveil']; birds(a, b)
amb.put(bp(S.pink(), 200, 3000) * win('reveil'), 0, 0, 0.03)
tc, n = S.burst(1.6); sfx.put(bp(S.noise(n), 300, 1200) * np.sin(np.pi * tc / 1.6) ** 2, 0, a + 0.4, 0.05)

fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique : ré mineur sombre et pulsé (le cœur de la vidéo) jusqu'au record ; flottante pendant l'hypothèse ; ré majeur au réveil
CH = {'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 46, 50, 53, 58], 'Gm': [43, 50, 55, 58, 62], 'A': [45, 52, 57, 61, 64], 'F': [41, 48, 53, 57, 60],
      'Csus': [36, 48, 53, 55, 60], 'D': [38, 50, 54, 57, 62], 'G': [43, 50, 55, 59, 62], 'Bm': [35, 47, 50, 54, 59]}
prog = [(0, shot['h48'][0], 'Dm'), (shot['h48'][0], shot['h72'][0], 'Bb'), (shot['h72'][0], shot['j5'][0], 'Gm'), (shot['j5'][0], shot['j11'][0], 'A'),
        (shot['j11'][0], shot['hypo'][0], 'Dm'), (shot['hypo'][0], shot['j14'][0], 'Csus'), (shot['j14'][0], shot['ruse'][0], 'F'), (shot['ruse'][0], shot['j21'][0], 'Bb'),
        (shot['j21'][0], shot['reveil'][0], 'Csus'), (shot['reveil'][0], END, 'D'), (END, T['duration'], 'G')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.25), rng.uniform(-0.4, 0.4), 0, 0.026)
mus.add(bm)
# la pulsation (le cœur) : de plus en plus rapide jusqu'au record ; elle s'arrête au tampon, revient plus douce pendant l'hypothèse
x = 3.0
while x < shot['dodo'][0]:
    hypo = x >= shot['hypo'][0]
    if not (shot['hypo'][0] <= x < shot['j14'][0]):
        mus.put(S.hit(hz(26), 0.35, 8), 0, x, 0.04 if not hypo else 0.025); tc, n = S.burst(0.03); mus.put(hp(S.noise(n), 4000) * np.exp(-tc * 160), 0.3, x + 0.25, 0.02)
    x += 0.62 if x < shot['h72'][0] else 0.5 if x < shot['hypo'][0] else 0.7
# une petite mélodie (pincée) pendant la ruse du cerveau, et les notes du réveil
for i, m in enumerate([62, 65, 69, 67, 65, 62]): mus.put(S.pluck(hz(m), 1.6, 2.6), (i % 3 - 1) * 0.3, shot['ruse'][0] + 0.4 + i * 0.85, 0.035)
for i, m in enumerate([62, 66, 69, 74]): mus.put(S.pluck(hz(m), 2.6, 1.6), (i - 1.5) * 0.25, shot['reveil'][0] + 0.2 + i * 0.4, 0.045)
for i, m in enumerate([67, 71, 74]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.6 * frozen)
mus_v = S.verb(mus, wet=0.35, secs=2.8); amb_v = S.verb(amb, wet=0.3, secs=2.2); sfx_v = S.verb(sfx, wet=0.25, secs=2.0)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

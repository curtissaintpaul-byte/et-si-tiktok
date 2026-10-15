"""Bande-son de « Et si tu gagnais le jackpot de l'EuroMillions ? » (version 2 : l'histoire de Rémy). Le tabac (rumeur, bips
du terminal, l'imprimante du ticket), le tirage à la télé (un jingle, une boule à chaque fois), la vérification (le cœur qui
accélère, un trait de stylo par numéro), le choc (un souffle, il tombe à genoux), l'appli de la banque (une notification à
chaque opération, le compteur qui défile), l'effet multiplication (les liasses qui pleuvent, puis la foule qui grandit), la
villa (les vagues en bas de la falaise, les cigales, les mouettes), la voiture (le bip d'ouverture, le moteur qui gronde),
le jet (le sifflement des réacteurs), la nuit (les grillons). Musique : douce et lumineuse (ré majeur), qui s'ouvre quand
il gagne, et plus calme à la fin. Tout est synthétisé."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=5013); N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
FZ = E['freezes']; END = E['end']; CUT = E['cuts']; M = E['M']
F0, FD = FZ[0]['t'], FZ[0]['dur']
frozen = S.window(F0, F0 + FD, 0.12, 0.3); live = 1 - 0.85 * frozen
ID = ['tabac', 'ticket', 'tirage', 'check', 'joie', 'banque', 'multi', 'amis', 'villa', 'voiture', 'jet', 'solde', 'interets', 'jamais', 'dix', 'end']
shot = {k: (CUT[i], CUT[i + 1] if i + 1 < len(CUT) else T['duration']) for i, k in enumerate(ID)}
def win(k, fin=0.02, fout=0.05): a, b = shot[k]; return S.window(a, b, fin, fout)
def ding(at, g=0.04, pan=0.0):
    for f, dt in [(1568, 0), (2093, 0.09)]: tc, n = S.burst(0.5); sfx.put(np.sin(2 * np.pi * f * tc) * np.exp(-tc * 7) * np.clip(tc / 0.003, 0, 1), pan, at + dt, g)
def tick(at, f=2400, g=0.02, pan=0.0):
    tc, n = S.burst(0.02); sfx.put(hp(S.noise(n), f) * np.exp(-tc * 300), pan, at, g)
shop = np.clip(win('tabac') + win('ticket') + win('end'), 0, 1); room = np.clip(win('tirage') + win('check') + win('joie') + win('banque') + win('amis'), 0, 1)
villa = np.clip(win('villa') + win('voiture') + win('solde') + win('interets') + win('jamais') + win('dix'), 0, 1)

# --- le tabac : la rumeur, les bips du terminal, l'imprimante du ticket
amb.put(lp(S.pink(), 500) * shop, 0, 0, 0.05)
a, b = shot['tabac']
for x in [a + 1.2, a + 1.45, a + 2.2]:
    tc, n = S.burst(0.09); sfx.put(np.sin(2 * np.pi * 1850 * tc) * np.clip((0.09 - tc) / 0.01, 0, 1), 0.2, x, 0.04)
a, b = shot['ticket']; tc, n = S.burst(0.9)
sfx.put(bp(S.noise(n), 1500, 6000) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 45 * tc))) * np.clip(tc / 0.02, 0, 1) * np.clip((0.9 - tc) / 0.05, 0, 1), 0.1, a + 0.1, 0.05)
# --- la chambre le soir (rumeur), le tirage (jingle + une boule à chaque fois), la vérification (le cœur, le stylo)
amb.put(lp(S.pink(), 300) * room * live, 0, 0, 0.03)
a, b = shot['tirage']
for i, m in enumerate([72, 76, 79, 84]):
    tc, n = S.burst(0.25); sfx.put(lp(np.sign(np.sin(2 * np.pi * hz(m) * tc)), 2500) * np.exp(-tc * 6), -0.4, a + 0.05 + i * 0.12, 0.03)
t0, t1 = E['balls']
for i in range(7): x = t0 + (t1 - t0) * i / 6; tc, n = S.burst(0.12); sfx.put(np.sin(2 * np.pi * (900 - 300 * tc / 0.12) * tc) * np.exp(-tc * 25), -0.4, x, 0.06)
x = shot['tirage'][0] + 0.4; per = 0.7
while x < shot['joie'][0] + 0.2:
    for dx, g in [(0, 1), (0.15, 0.6)]: tc, n = S.burst(0.12); sfx.put(np.sin(2 * np.pi * 52 * tc) * np.exp(-tc * 30), 0, x + dx, 0.13 * g)
    x += per; per = max(0.36, per * 0.93)
m0, m1 = E['marks']
for i in range(7): tc, n = S.burst(0.14); sfx.put(bp(S.noise(n), 2000, 7000) * np.sin(np.pi * tc / 0.14), 0.2, m0 + (m1 - m0) * i / 6, 0.035)
# --- le choc : un grand souffle, il tombe à genoux (un choc sourd), une montée lumineuse
a, b = shot['joie']; sfx.put(S.whoosh(1.0) * 0.9, 0, a - 0.5, 0.06)
sfx.put(S.boom(1.0, 80, 40), 0, a + 0.8, 0.09)
tc, n = S.burst(1.0); sfx.put(bp(S.noise(n), 300, 1500) * np.sin(np.pi * tc / 1.0) ** 2, 0, a + 0.15, 0.03)   # (son souffle coupé)
# --- l'appli de la banque : une notification à chaque opération, et le compteur qui défile (des petits clics qui s'espacent)
for at in E['ops']:
    ding(at, 0.04, 0.15)
    for j in range(14): tick(at + 0.05 + 0.9 * (j / 14) ** 1.6, 3200, 0.012, 0.15)
# --- l'effet multiplication : un souffle, la liasse qui tombe, la pluie de liasses, puis la foule qui grandit
a, b = shot['multi']; sfx.put(S.whoosh(1.0) * 0.8, 0, a - 0.4, 0.05)
amb.put(lp(S.pink(), 160) * win('multi'), 0, 0, 0.05)
tc, n = S.burst(0.4); sfx.put(np.sin(2 * np.pi * 70 * tc) * np.exp(-tc * 14) + bp(S.noise(n), 500, 3000) * np.exp(-tc * 30) * 0.5, 0, M['land'], 0.12)
for i in range(160):
    x = M['land'] + (M['full'] - M['land']) * (np.log(1 + i) / np.log(160))
    tc, n = S.burst(0.06); sfx.put(bp(S.noise(n), 700, 4000) * np.exp(-tc * 60), rng.uniform(-0.5, 0.5), x + rng.uniform(0, 0.03), 0.03 * rng.uniform(0.5, 1))
crowdK = S.window(M['crowd'], b, 0.5, 0.3) * np.clip((np.arange(N) / SR - M['crowd']) / (M['crowdFull'] - M['crowd']), 0, 1)
amb.put(bp(S.pink(), 250, 2500) * crowdK, 0, 0, 0.08)
# --- la villa : les vagues (lentes), les cigales (le jour et au coucher), les mouettes ; la nuit : les grillons
tt = np.arange(N) / SR
waves = lp(S.pink(), 700) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.13 * tt) ** 2)
amb.put(waves * villa * live, 0, 0, 0.07)
cic = hp(S.noise(), 4500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * tt))) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * tt))
day = np.clip(win('villa') + win('voiture') + win('solde') + win('interets') + win('jamais'), 0, 1)
amb.put(cic * day * live, 0.4, 0, 0.012)
for k in ['villa', 'jamais']:
    a, b = shot[k]
    for x in [a + 0.6, a + 2.1]:
        tc, n = S.burst(0.5); f = 1500 + 500 * np.exp(-tc * 6); sfx.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tc / 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * tc)), rng.uniform(-0.7, 0.7), x, 0.008)
a, b = shot['dix']
for x in np.arange(a + 0.1, b - 0.1, 0.55):
    tc, n = S.burst(0.18); sfx.put(np.sin(2 * np.pi * 4300 * tc) * (np.sin(2 * np.pi * 45 * tc) > 0) * np.sin(np.pi * tc / 0.18), 0.6, x + rng.uniform(0, 0.1), 0.006)
# --- la voiture : le bip-bip d'ouverture, puis le moteur qui démarre et gronde
a, b = shot['voiture']
for k in range(2): tc, n = S.burst(0.07); sfx.put(np.sin(2 * np.pi * 2600 * tc) * np.clip((0.07 - tc) / 0.01, 0, 1), -0.3, a + 0.5 + k * 0.16, 0.03)
d = b - (a + 1.0); tc, n = S.burst(d)
f = 30 + 50 * np.clip((tc - 0.15) / 0.4, 0, 1) * np.exp(-np.clip(tc - 0.55, 0, None) * 2.5) + 12
ph = 2 * np.pi * np.cumsum(f) / SR; eng = (np.sin(ph) + 0.6 * np.sin(2 * ph) + 0.35 * np.sin(3 * ph)) * 0.5 + lp(S.noise(n), 400) * 0.6
sfx.put(lp(eng, 900) * np.clip(tc / 0.05, 0, 1) * np.clip((d - tc) / 0.1, 0, 1), -0.3, a + 1.0, 0.07)
# --- le jet : le sifflement des réacteurs et le vent
a, b = shot['jet']; d = b - a; tc, n = S.burst(d); e = np.clip(tc / 0.3, 0, 1) * np.clip((d - tc) / 0.2, 0, 1)
sfx.put((bp(S.noise(n), 600, 4000) + 0.25 * np.sin(2 * np.pi * 2900 * tc) + lp(S.noise(n), 150) * 2) * e, 0, a, 0.05)
freeze_sfx(S, sfx, F0, FD)

fade = 1 - S.ramp(END - 0.3, END + 0.6)
for bb in (amb, sfx): bb.mul(fade)

# --- la musique : un peu tendue au tabac et pendant le tirage, puis lumineuse (ré majeur) dès qu'il gagne ; calme à la fin
CH = {'Bm': [35, 47, 50, 54, 59], 'G': [43, 50, 55, 59, 62], 'A': [45, 52, 57, 61, 64], 'D': [38, 50, 54, 57, 62], 'F#m': [42, 49, 54, 57, 61], 'Em': [40, 47, 52, 55, 59], 'Dmaj7': [38, 50, 54, 57, 61]}
J = shot['joie'][0]
prog = [(0, shot['tirage'][0], 'Bm'), (shot['tirage'][0], J, 'A'), (J, shot['multi'][0], 'D'), (shot['multi'][0], shot['amis'][0], 'G'), (shot['amis'][0], shot['villa'][0], 'A'),
        (shot['villa'][0], shot['jet'][0], 'D'), (shot['jet'][0], shot['solde'][0], 'F#m'), (shot['solde'][0], shot['interets'][0], 'G'), (shot['interets'][0], shot['jamais'][0], 'D'),
        (shot['jamais'][0], shot['dix'][0], 'A'), (shot['dix'][0], END, 'Dmaj7'), (END, T['duration'], 'G')]
bm = S.bus()
for a, z, c in prog:
    env = S.window(a - 0.2, z + 0.3, 0.6, 0.6)
    for m in CH[c]: bm.put(S.pad(hz(m), env, 0.3), rng.uniform(-0.4, 0.4), 0, 0.026)
mus.add(bm)
# une pulsation douce (après la victoire), qui s'arrête pour la fin calme
x = J
while x < shot['dix'][0]:
    mus.put(S.hit(hz(26), 0.35, 8), 0, x, 0.03); tc, n = S.burst(0.03); mus.put(hp(S.noise(n), 4000) * np.exp(-tc * 160), 0.3, x + 0.25, 0.015); x += 0.5
# des notes pincées : l'arpège de la victoire, la mélodie de la villa, les notes de la fin
for i, m in enumerate([62, 66, 69, 74, 78]): mus.put(S.pluck(hz(m), 2.4, 1.8), (i - 2) * 0.2, J + 0.1 + i * 0.13, 0.045)
for i, m in enumerate([74, 73, 71, 69, 71, 73]): mus.put(S.pluck(hz(m), 1.8, 2.4), (i % 3 - 1) * 0.3, shot['villa'][0] + 0.3 + i * 0.9, 0.03)
for i, m in enumerate([66, 69, 73, 74]): mus.put(S.pluck(hz(m), 2.6, 1.6), (i - 1.5) * 0.25, shot['dix'][0] + 0.5 + i * 1.6, 0.035)
for i, m in enumerate([67, 71, 74]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus.mul(1 - 0.6 * frozen)
mus_v = S.verb(mus, wet=0.35, secs=2.8); amb_v = S.verb(amb, wet=0.3, secs=2.2); sfx_v = S.verb(sfx, wet=0.25, secs=2.0)
master([(sfx_v, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

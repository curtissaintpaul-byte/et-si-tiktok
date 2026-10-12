"""Bande-son « trou à travers la Terre » : le Champ-de-Mars (ville, oiseaux, foule), le compte à rebours, le saut (souffle qui
s'éloigne dans le puits), la longue chute en accéléré (pulsation, grondements quand on change de couche), le retour
(souffle qui remonte), les acclamations. Musique : ré majeur, aventure."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=6371); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
CD, JUMP, CEN, EXIT, BACK, EM, CAUGHT, REAL, END = T['countdown'], T['jump'], T['center'], T['exit'], T['back'], T['emerge'], T['caught'], T['real'], T['endCard']
# --- Paris, un après-midi : rumeur de la ville, oiseaux, la foule qui parle (plus bas pendant l'accéléré)
lapse = S.window(JUMP + 8, EM - 0.5, 1.5, 1.0)
amb.put(lp(S.pink(), 400) * (1 - 0.5 * lapse), 0.1, 0, 0.08)
amb.put(bp(S.pink(), 300, 1500) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.11 * t)), -0.3, 0, 0.03)
murmur = np.zeros(N)
for v in range(9):
    f = rng.uniform(250, 620); base = bp(S.noise(), f * 0.7, f * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur = murmur / np.abs(murmur).max()
hush = 1 - 0.7 * S.window(CD, JUMP + 1.0, 0.6, 0.6)   # la foule se tait pendant le compte à rebours
amb.put(murmur * hush * (1 - 0.6 * lapse), 0, 0, 0.05)
for _ in range(40):
    at = rng.uniform(0, END - 1); tt, n = S.burst(0.14); f = rng.uniform(3300, 5000) + 800 * np.sin(np.pi * tt / 0.14)
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.14) ** 2, rng.uniform(-0.9, 0.9), at, 0.006)
# --- compte à rebours : 3 bips, puis le top
for k, at in enumerate([JUMP - 3, JUMP - 2, JUMP - 1, JUMP]):
    tt, n = S.burst(0.5 if k == 3 else 0.16); f = 1760 if k == 3 else 880
    sfx.put(np.sin(2 * np.pi * f * tt) * np.clip(tt / 0.005, 0, 1) * np.clip((tt[-1] - tt) / 0.03, 0, 1), 0.35, at, 0.06)
# --- le saut : « ooh » de la foule, souffle qui plonge et s'éloigne (écho du puits)
for _ in range(10):
    tt, n = S.burst(1.1); f0 = rng.uniform(280, 560)
    oh = bp(np.sin(2 * np.pi * np.cumsum(f0 - 70 * tt) / SR) + 0.5 * S.noise(n), 250, 2500) * np.sin(np.pi * tt / 1.1) ** 0.8
    sfx.put(oh, rng.uniform(-0.8, 0.8), JUMP + 0.3 + rng.uniform(0, 0.4), 0.025)
tt, n = S.burst(4.0); fall = bp(S.noise(n), 250, 3000) * np.exp(-tt * 0.9) * np.clip(tt / 0.15, 0, 1)
fall = lp(fall, 3000) * (1 - 0.5 * np.clip(tt / 4, 0, 1))
sfx.put(fall, 0, JUMP + 0.1, 0.25)
# --- la chute en accéléré : grondements quand on change de couche (manteau, noyau, centre)
def rumble(at, dur, g, f=70):
    tt, n = S.burst(dur); sfx.put(lp(S.noise(n), f) * np.sin(np.pi * tt / dur) ** 1.5, 0, at, g)
rumble(23.0, 3.5, 0.5); rumble(28.0, 4.0, 0.6, 60); rumble(31.5, 5.5, 0.8, 50); rumble(35.5, 3.0, 0.4)
for at in np.arange(19.5, 50.0, 1.0):   # les bips de télémétrie
    tt, n = S.burst(0.06); sfx.put(np.sin(2 * np.pi * 2350 * tt) * np.exp(-tt * 50), 0.5, at, 0.02)
# --- le retour : souffle qui remonte du puits, de plus en plus fort, puis plus rien (vitesse nulle)
tt, n = S.burst(CAUGHT - EM + 0.3); k = tt / tt[-1]
up = bp(S.noise(n), 300, 3500) * (k ** 2.2) * np.clip((tt[-1] - tt) / 0.25, 0, 1)
sfx.put(up, 0, EM, 0.3)
tt, n = S.burst(0.25); sfx.put(lp(S.noise(n), 600) * np.exp(-tt * 20), 0, CAUGHT + 0.05, 0.25)   # on l'attrape
# --- acclamations, applaudissements
cheer = np.zeros(N)
for _ in range(14):
    tt, n = S.burst(2.2); f0 = rng.uniform(300, 650)
    y = bp(np.sin(2 * np.pi * np.cumsum(f0 + 80 * np.sin(tt * 3)) / SR) + 0.6 * S.noise(n), 250, 3000) * np.sin(np.pi * tt / 2.2) ** 0.6
    sfx.put(y, rng.uniform(-0.8, 0.8), CAUGHT + 0.2 + rng.uniform(0, 0.6), 0.02)
clap = np.zeros(N)
for _ in range(600):
    at = rng.uniform(CAUGHT + 0.4, REAL + 3.5); i = int(at * SR); tt, n = S.burst(0.03)
    if i + n < N: clap[i:i + n] += hp(S.noise(n), 900) * np.exp(-tt * 160) * rng.uniform(0.4, 1)
clap *= 1 - S.ramp(REAL + 2.0, REAL + 3.8)
sfx.put(clap, 0, 0, 0.12)
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique
CH = {'D': [38, 45, 50, 54, 57], 'A': [33, 40, 45, 49, 52], 'Bm': [35, 42, 47, 50, 54], 'G': [31, 38, 43, 47, 50], 'Em': [28, 40, 47, 52, 55], 'F#m': [30, 42, 49, 54, 57], 'Dsus': [38, 45, 50, 55, 57]}
def chords(prog, gain, bright=0.25, fin=0.8, fout=0.8, voice='pad'):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, fin, fout)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright) if voice == 'pad' else S.choir(hz(m + 12), env), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, 3.6, 'D'), (3.6, 7.6, 'G'), (7.6, JUMP, 'Dsus'), (JUMP, 19.0, 'Bm'), (19.0, 23.0, 'G'), (23.0, 28.0, 'Em'), (28.0, CEN, 'F#m'), (CEN, EXIT, 'D'),
        (EXIT, BACK, 'A'), (BACK, 45.0, 'Bm'), (45.0, 50.0, 'G'), (50.0, EM, 'Em'), (EM, CAUGHT, 'A'), (CAUGHT, 61.0, 'D'), (61.0, END, 'G')]
mus.add(chords(prog, 0.042))
mus.add(chords([(CEN, EXIT, 'D'), (CAUGHT, 60.0, 'D')], 0.035, fin=0.4, voice='choir'))
# pulsation pendant la chute (plus rapide quand on va plus vite)
x = JUMP + 0.5
while x < EM:
    sp = 0.5 if (CEN - 6 < x < EXIT) else 0.62
    mus.put(S.hit(hz(38), 0.35, 9), 0, x, 0.07); x += sp
for x, m in [(0.4, 69), (1.6, 74), (2.8, 78), (4.0, 76), (5.6, 74), (7.2, 71), (12.0, 66), (13.6, 69), (15.2, 71), (17.0, 74), (19.4, 74), (21.0, 79), (23.4, 76), (25.0, 79), (26.6, 83),
             (28.4, 81), (30.0, 78), (32.2, 86), (33.4, 85), (34.6, 81), (37.2, 76), (38.8, 73), (41.2, 71), (43.0, 74), (45.2, 74), (47.0, 71), (50.4, 67), (52.0, 69),
             (56.1, 78), (56.7, 81), (57.4, 86), (59.0, 81), (61.2, 79), (63.0, 78), (64.6, 74)]:
    mus.put(S.pluck(hz(m), 2.4, 1.8), rng.uniform(-0.3, 0.3), x, 0.05)
mus.put(S.hit(hz(26), 3.0, 1.2), 0, CEN, 0.25)
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['D']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([74, 78, 81]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.42, secs=3.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); far_v = S.verb(far, wet=0.5, secs=2.4)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

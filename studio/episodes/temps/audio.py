"""Bande-son « voyage dans le temps » : une terrasse parisienne un soir de juin (verres, conversations, un scooter au loin),
le tic-tac de l'horloge, l'ISS (un « bip » discret), l'arrivée du voyageur (souffle qui s'inverse, crépitements),
le glitch du paradoxe, puis la nuit qui passe en accéléré (la fête vide). Musique : valse musette légère, puis mystère."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=2009); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
I0, I1, GPS, TW, AR, PX, VA, CALM, LAP, END = T['iss0'], T['iss1'], T['gps'], T['twins'], T['arrive'], T['paradox'], T['vanish'], T['calm'], T['lapse'], T['endCard']
people = 1 - S.ramp(LAP + 2, LAP + 8)
# --- la terrasse : conversations, verres qui tintent, la ville
murmur = np.zeros(N)
for v in range(8):
    f = rng.uniform(250, 620); base = bp(S.noise(), f * 0.7, f * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur = murmur / np.abs(murmur).max()
amb.put(murmur * people * (1 - 0.7 * S.window(AR, CALM, 0.2, 1.0)), 0.2, 0, 0.04)
amb.put(lp(S.pink(), 350) * (0.6 + 0.4 * people), -0.2, 0, 0.05)
for _ in range(14):
    at = rng.uniform(0.5, LAP); tt, n = S.burst(0.8); f = rng.uniform(2800, 4200)
    sfx.put((np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.7 * tt)) * np.exp(-tt * 9), rng.uniform(0.1, 0.8), at, 0.008)
for at in [5.0, 17.5, 44.0]:   # un scooter au loin
    tt, n = S.burst(4.0); f = 95 + 25 * np.sin(np.pi * tt / 4.0)
    far.put(lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + 0.3 * S.noise(n), 900) * np.sin(np.pi * tt / 4.0) ** 2, rng.uniform(-0.8, 0.8), at, 0.02)
# --- l'horloge : tic-tac (accéléré pendant la nuit qui passe)
x = 0.0
while x < END - 0.2:
    tt, n = S.burst(0.04); sfx.put(hp(S.noise(n), 2000) * np.exp(-tt * 120), 0.6, x, 0.035 if x < LAP else 0.02)
    x += 1.0 if x < LAP else 0.25
# --- l'ISS : un « bip » de radio lointain
for k in range(4): tt, n = S.burst(0.12); far.put(np.sin(2 * np.pi * 1450 * tt) * np.sin(np.pi * tt / 0.12), -0.3, I0 + 1.5 + k * 1.8, 0.01)
# --- le voyageur : un souffle inversé (qui monte), le claquement, des crépitements
tt, n = S.burst(1.2); rev = bp(S.noise(n), 300, 6000) * (tt / 1.2) ** 3
sfx.put(rev, -0.1, AR - 0.85, 0.25)
sfx.put(S.boom(1.4, 90, 40), -0.1, AR + 0.35, 0.3)
for _ in range(30): sfx.put(S.crack(), rng.uniform(-0.6, 0.4), AR + 0.35 + rng.uniform(0, 1.4), 0.03)
for _ in range(6):
    tt, n = S.burst(0.7); f0 = rng.uniform(300, 520)
    oh = bp(np.sin(2 * np.pi * np.cumsum(f0 + 100 * tt) / SR) + 0.5 * S.noise(n), 250, 2500) * np.sin(np.pi * tt / 0.7) ** 0.8
    sfx.put(oh, rng.uniform(-0.4, 0.8), AR + 0.6 + rng.uniform(0, 0.6), 0.03)
# --- le glitch du paradoxe : coupures numériques, bourdonnement
g = (np.sign(np.sin(2 * np.pi * 13 * t)) > 0) * hp(S.noise(), 1500) * S.window(PX, VA + 0.5, 0.05, 0.2)
sfx.put(g, 0, 0, 0.05)
sfx.put(np.sin(2 * np.pi * 60 * t) * S.window(PX, VA + 0.5, 0.05, 0.2), 0, 0, 0.05)
tt, n = S.burst(0.8); sfx.put(bp(S.noise(n), 200, 6000) * (1 - tt / 0.8) ** 3, 0, VA, 0.2)   # il est aspiré
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique : petite valse musette (accordéon = orgue léger), puis mystère, puis la nuit vide
CH = {'C': [36, 48, 52, 55, 60], 'G': [31, 43, 47, 50, 55], 'Am': [33, 45, 48, 52, 57], 'F': [29, 41, 45, 48, 53], 'Dm': [26, 38, 41, 45, 50], 'E': [28, 40, 44, 47, 52], 'Fm': [29, 41, 44, 48, 53]}
def chords(prog, gain, bright=0.25, fin=0.6, fout=0.6, voice='pad'):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, fin, fout)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright) if voice == 'pad' else S.organ(hz(m + 12), env), rng.uniform(-0.4, 0.4), 0, gain)
    return b
# valse : basse sur le 1, accords sur 2 et 3 (3 temps de 0,42 s)
prog_w = [(0, 7.6, 'C'), (7.6, 12.0, 'G'), (12.0, 16.6, 'Am'), (16.6, 21.6, 'F'), (21.6, 26.2, 'C'), (26.2, AR, 'G')]
beat = 0.42; x = 0.2
while x < AR - 0.2:
    c = next((cc for a, z, cc in prog_w if a <= x < z), 'C'); notes = CH[c]
    mus.put(S.pluck(hz(notes[0] + 12), 0.5, 7), -0.2, x, 0.06)
    for k in (1, 2):
        for m in notes[2:]: mus.put(S.pluck(hz(m + 12), 0.25, 12), 0.25, x + k * beat, 0.022)
    x += 3 * beat
mel = [76, 79, 84, 83, 81, 79, 77, 79, 81, 76, 74, 72]
for i, m in enumerate(mel * 3):
    at = 0.2 + i * 2 * beat
    if at > AR - 0.4: break
    mus.put(S.organ(hz(m), S.window(at, at + 0.75, 0.03, 0.3))[: N], 0.1, 0, 0.012)
mus.add(chords([(AR, PX, 'E'), (PX, CALM, 'Fm'), (CALM, LAP, 'Dm'), (LAP, 52.0, 'Am'), (52.0, 57.0, 'F'), (57.0, END, 'E')], 0.04))
for x, m in [(LAP + 0.3, 69), (LAP + 2.0, 72), (LAP + 3.7, 76), (LAP + 5.5, 74), (52.2, 72), (54.0, 69), (55.8, 65), (57.2, 64), (59.0, 68), (60.6, 71)]:
    mus.put(S.pluck(hz(m), 2.6, 1.6), 0.2, x, 0.045)
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['C']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([72, 76, 79]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.35, secs=2.6); amb_v = S.verb(amb, wet=0.25, secs=1.6); far_v = S.verb(far, wet=0.55, secs=2.6)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

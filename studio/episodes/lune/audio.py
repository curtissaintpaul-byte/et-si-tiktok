"""Bande-son « la Lune se rapproche » (Étretat) : ressac sur les galets, vent, puis la mer qui gronde, la Lune qui craque, les météores. Musique : ré mineur, ample."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=31); t = S.t; N = S.N; rng = S.rng
sfx, amb, mus = S.bus(), S.bus(), S.bus()
HALF, TIDES, NEAR, ROCHE, CRACK, RING, RAIN, CALM, END = T['half'], T['tides'], T['near'], T['roche'], T['crack'], T['ring'], T['rain'], T['calm'], T['endCard']
# le ressac sur les galets : la vague arrive, puis les galets roulent en se retirant
for x in np.arange(0.2, CALM + 4, 4.2):
    tt, n = S.burst(3.8)
    wave = lp(S.noise(n), 900) * np.sin(np.pi * np.clip(tt / 1.2, 0, 1)) ** 2 * np.exp(-tt * 0.8)
    peb = bp(S.noise(n), 2500, 8000) * (np.abs(lp(S.noise(n), 60)) * 6) * np.clip((tt - 1.0) / 0.4, 0, 1) * np.exp(-(tt - 1) * 1.2)
    g = 0.10 * (1 + 2.5 * min(1, max(0, (x - 13) / 14))) * (1 if x < RING + 3 else 0.6)
    amb.put(wave + 0.5 * peb, rng.uniform(-0.4, 0.4), x, g)
wind = bp(S.pink(), 250, 1800) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t)) * (0.6 + 1.4 * S.ramp(NEAR, ROCHE) * (1 - S.ramp(RING, CALM)))
amb.put(wind, -0.3, 0, 0.07)
# des mouettes au loin, au début
for k in range(4):
    s0 = rng.uniform(1, 12); pan = rng.uniform(-0.8, 0.8)
    for j in range(2):
        tt, n = S.burst(0.35); f = 1000 + 700 * np.sin(np.pi * tt / 0.35)
        amb.put(bp(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.35) ** 1.5, 700, 4000), pan, s0 + j * 0.45, 0.02)
# la mer qui monte : grondement grave qui enfle avec les marées
roar = lp(S.pink(), 220) * (S.ramp(HALF + 6, TIDES) * 0.35 + S.ramp(TIDES, NEAR) * 0.25 + S.ramp(NEAR, ROCHE) * 0.6) * (1 - S.ramp(RING, CALM))
sfx.put(roar, 0, 0, 0.6)
# la mer qui envahit la ville : grandes vagues qui déferlent, alarme au loin
for x in np.arange(TIDES - 1.0, NEAR + 1.0, 1.4):
    tt, n = S.burst(2.0); crash = bp(S.noise(n), 150, 2400) * np.exp(-tt * 1.8) * np.clip(tt / 0.25, 0, 1)
    sfx.put(lp(crash, 1600), rng.uniform(-0.6, 0.4), x + rng.uniform(0, 0.4), 0.10)
x, hi = TIDES + 1.2, 0
while x < NEAR + 2:
    tt, n = S.burst(0.5); f = 435 if hi == 0 else 488
    ph = 2 * np.pi * np.cumsum(np.full(n, f)) / SR; sir = sum(np.sin(k * ph) / k for k in range(1, 8)) * np.clip(tt / 0.02, 0, 1) * np.clip((0.5 - tt) / 0.02, 0, 1)
    sfx.put(lp(bp(sir, 300, 2600), 1800), 0.5, x, 0.022 * (1 - max(0, (x - NEAR) / 2))); x += 0.55; hi ^= 1
# la Lune se fissure puis éclate (coups sourds, craquements)
for _ in range(30): sfx.put(S.crack(), rng.uniform(-0.6, 0.6), rng.uniform(CRACK - 0.6, CRACK + 1.4), 0.08)
sfx.put(S.boom(4.0, 48, 20), 0, CRACK + 1.0, 0.5)
# météores : sifflements qui descendent + petits impacts au loin
for _ in range(40):
    at = RAIN + rng.uniform(0, 9.8); tt, n = S.burst(0.9)
    f = 2400 * np.exp(-tt * 1.6) + 300
    whis = bp(S.noise(n), 600, 5000) * np.sin(np.pi * tt / 0.9) * 0.6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.9) * 0.15
    sfx.put(whis, rng.uniform(-0.9, 0.9), at, 0.05)
    tt2, n2 = S.burst(1.2); sfx.put(lp(S.noise(n2), 300) * np.exp(-tt2 * 4), rng.uniform(-0.6, 0.6), at + 0.9, 0.08)
fade = 1 - S.ramp(END - 0.5, END + 0.2); sfx.mul(fade); amb.mul(fade)
# musique
CH = {'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 41, 46, 50, 53], 'F': [41, 48, 53, 57, 60], 'C': [36, 43, 48, 52, 55], 'A': [33, 40, 45, 49, 52], 'Gm': [31, 38, 43, 46, 50]}
def chords(prog, voice, gain, bright=0.25, fin=1.0, fout=1.0):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.5, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.organ(hz(m), env) if voice == 'organ' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, 8.4, 'Dm'), (8.4, 13.2, 'Bb'), (13.2, 18.2, 'F'), (18.2, 23.4, 'C'), (23.4, 28.4, 'Dm'), (28.4, NEAR, 'Bb'), (NEAR, ROCHE, 'Dm'), (ROCHE, CRACK, 'Gm'), (CRACK, RING, 'A'), (RING, RAIN, 'F'), (RAIN, CALM, 'Dm'), (CALM, END, 'Bb')]
p = chords(prog, 'pad', 0.045); p.mul(0.6 + 0.4 * S.window(NEAR, CALM, 4, 3)); mus.add(p)
mus.add(chords([(NEAR, CRACK, 'Dm'), (CRACK, RING, 'A'), (RING, RAIN, 'F'), (RAIN, CALM, 'Dm')], 'choir', 0.05, fin=1.5))
og = chords([(ROCHE, CRACK, 'Gm'), (CRACK, RING, 'A')], 'organ', 0.02); mus.add(og)
for x, m in [(0.5, 74), (2.0, 77), (3.5, 76), (5.2, 74), (8.6, 70), (10.2, 74), (11.8, 77), (13.4, 72), (15.0, 76), (16.6, 81), (18.4, 79), (20.0, 76), (21.6, 72), (24.0, 74), (25.6, 72), (27.2, 69), (29.0, 70), (30.6, 74), (32.2, 77), (49, 81), (50.6, 77), (52.2, 74), (58.6, 77), (60.2, 74), (61.8, 70), (63.6, 74), (65.2, 70), (66.8, 65)]:
    mus.put(S.pluck(hz(m), 3.0, 1.5), rng.uniform(-0.3, 0.3), x, 0.05)
for x in np.arange(TIDES, NEAR, 0.8): mus.put(S.hit(hz(38), 0.5, 7), 0, x, 0.07)
gap, x = 0.9, NEAR
while x < CRACK + 1: mus.put(S.hit(hz(38), 0.5, 7), 0, x, 0.10); x += gap; gap = max(0.3, gap * 0.94)
mus.put(S.hit(hz(26), 3.0, 1.2), 0, CRACK + 1.0, 0.3)
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['Dm']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([69, 74, 77]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.45, secs=3.5); amb_v = S.verb(amb, wet=0.2, secs=1.4)
master([(sfx, 1.0), (amb_v, 1.0), (mus_v, 1.0)], sys.argv[2])

"""Bande-son « anneaux » : un soir d'été dans l'Aude — cigales l'après-midi, martinets au crépuscule, grillons la nuit,
la cloche de la Cité, des « waouh » discrets. Musique contemplative (mi majeur), chœur et harpe."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=2027); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
L0, L1, NIGHT, SH, EQ, POLE, PAST, END = T['lapse0'], T['lapse1'], T['night'], T['shadow'], T['equator'], T['pole'], T['past'], T['endCard']
day = 1 - S.ramp(L0 + 3, L1 - 1)
# --- cigales (l'après-midi) : un crissement pulsé
cic = np.zeros(N)
for k in range(4):
    f = rng.uniform(4200, 6200); car = np.sin(2 * np.pi * f * t + rng.uniform(0, 6)); puls = (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(38, 55) * t)) ** 3
    sw = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(0.08, 0.15) * t + rng.uniform(0, 6))
    cic += car * puls * sw
amb.put(bp(cic, 3000, 8000) * day, 0.3, 0, 0.012)
# --- martinets au crépuscule (cris aigus en rafales)
for _ in range(16):
    at = rng.uniform(L0, L1 - 1.5); tt, n = S.burst(0.5); f = 5200 + 900 * np.sin(2 * np.pi * 14 * tt)
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.5) ** 2 * (np.sin(2 * np.pi * 26 * tt) > 0), rng.uniform(-0.9, 0.9), at, 0.006)
# --- grillons la nuit
nightK = S.ramp(L1 - 4, L1)
for k in range(10):
    f = rng.uniform(3900, 4700); per = rng.uniform(0.55, 0.9); ph = rng.uniform(0, per)
    chirp = np.sin(2 * np.pi * f * t) * (((t + ph) % per) < 0.12) * (np.sin(2 * np.pi * 32 * t) > 0)
    amb.put(lp(chirp, 7000) * nightK, rng.uniform(-0.9, 0.9), 0, 0.004)
# --- vent tiède, la ville au loin
amb.put(bp(S.pink(), 150, 1000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.06 * t)), -0.2, 0, 0.04)
amb.put(lp(S.pink(), 300) * (0.4 + 0.6 * day), 0.2, 0, 0.025)
# --- la cloche de la Cité (22 h) pendant l'accéléré, puis une heure la nuit
for k, at in enumerate([L1 - 2.2, L1 - 1.6, 40.5]):
    tt, n = S.burst(4.0); f = 330.0
    bell = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * d) for a, m, d in [(1, 1, 0.7), (0.6, 2.0, 1.1), (0.4, 2.4, 1.5), (0.3, 3.0, 2.0), (0.2, 4.2, 2.6)])
    far.put(bell, -0.25, at, 0.02)
# --- « waouh » discrets du public
for at in [1.2, 11.8, 24.6, 29.6]:
    tt, n = S.burst(1.0); f0 = rng.uniform(220, 320)
    w = bp(np.sin(2 * np.pi * np.cumsum(f0 - 40 * tt + 30 * np.sin(np.pi * tt)) / SR) + 0.4 * S.noise(n), 200, 2000) * np.sin(np.pi * tt / 1.0) ** 0.8
    sfx.put(w, rng.uniform(-0.3, 0.3), at, 0.025)
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique : contemplative
CH = {'E': [40, 47, 52, 56, 59], 'A': [33, 45, 52, 57, 61], 'C#m': [37, 44, 49, 52, 56], 'B': [35, 42, 47, 51, 54], 'G#m': [32, 44, 51, 56, 59], 'Emaj7': [40, 47, 51, 56, 63], 'Asus': [33, 45, 52, 57, 59], 'F#m': [42, 49, 54, 57, 61]}
def chords(prog, gain, bright=0.22, fin=1.2, fout=1.2, voice='pad'):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.6, fin, fout)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright) if voice == 'pad' else S.choir(hz(m + 12), env), rng.uniform(-0.45, 0.45), 0, gain)
    return b
prog = [(0, 7.2, 'Emaj7'), (7.2, 11.2, 'A'), (11.2, L0, 'C#m'), (L0, 19.2, 'B'), (19.2, L1, 'A'), (NIGHT, SH, 'E'), (SH, EQ, 'G#m'), (EQ, POLE, 'A'), (POLE, PAST, 'F#m'),
        (PAST, 54.0, 'C#m'), (54.0, 60.0, 'A'), (60.0, END, 'Asus')]
mus.add(chords(prog, 0.04))
mus.add(chords([(NIGHT, POLE, 'Emaj7'), (PAST, END, 'C#m')], 0.03, fin=2.0, voice='choir'))
# harpe : arpèges lents
x, i = 0.3, 0
arp = {'Emaj7': [64, 68, 71, 75], 'A': [64, 69, 73, 76], 'C#m': [61, 64, 68, 73], 'B': [63, 66, 71, 75], 'E': [64, 68, 71, 76], 'G#m': [63, 68, 71, 75], 'F#m': [61, 66, 69, 73], 'Asus': [64, 69, 71, 76]}
while x < END - 0.5:
    c = next((cc for a, z, cc in prog if a <= x < z), 'E'); notes = arp[c]
    mus.put(S.pluck(hz(notes[i % 4] + (12 if (i // 4) % 2 else 0)), 2.2, 2.4), 0.3 if i % 2 else -0.3, x, 0.035); x += 0.46; i += 1
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['E']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([71, 76, 80]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.5, secs=3.8); amb_v = S.verb(amb, wet=0.2, secs=1.4); far_v = S.verb(far, wet=0.6, secs=3.2)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

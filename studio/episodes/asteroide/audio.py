"""Bande-son « astéroïde » : un soir d'été sur les berges du Rhône ; l'impact est SILENCIEUX (le son met 40 min à venir de 800 km) ;
puis le séisme, la pluie de roches, le souffle. Acte 2 : le vent, des corbeaux. Musique : ré mineur."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=66); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
IMP, Q, EJ, BL, HIT, MON, ACT2, END = T['impact'], T['quake'], T['ejecta'], T['blast'], T['blastHit'], T['months'], T['act2'], T['endCard']
act1 = 1 - S.ramp(HIT - 0.05, HIT + 0.05)
# --- un soir d'été à Lyon : la ville au loin, le fleuve, des voix, quelques martinets
amb.put(lp(S.pink(), 500) * act1, 0.2, 0, 0.07)
amb.put(bp(S.pink(), 200, 1400) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 0.5 * t))) * act1, -0.2, 0, 0.05)
murmur = np.zeros(N)
for v in range(7):
    f = rng.uniform(260, 650); base = bp(S.noise(), f * 0.7, f * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur = murmur / np.abs(murmur).max() * (1 - S.ramp(IMP, IMP + 0.4))
amb.put(murmur, -0.1, 0, 0.045)
for _ in range(5):
    at = rng.uniform(1, 15); tt, n = S.burst(0.35); f = 3200 + 400 * np.sin(np.pi * tt / 0.35)
    far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.35) ** 2, rng.uniform(-0.8, 0.8), at, 0.006)
# --- l'impact : aucun bruit (trop loin). Juste la foule : un cri collectif, puis la panique
for _ in range(10):
    tt, n = S.burst(0.7); f0 = rng.uniform(300, 600)
    ah = bp(np.sin(2 * np.pi * np.cumsum(f0 - 90 * tt) / SR) + 0.5 * S.noise(n), 250, 2600) * np.sin(np.pi * tt / 0.7) ** 0.7
    sfx.put(ah, rng.uniform(-0.8, 0.8), IMP + 0.15 + rng.uniform(0, 0.5), 0.03)
for _ in range(10):
    tt, n = S.burst(0.7); f0 = rng.uniform(380, 650)
    sc = bp(np.sin(2 * np.pi * np.cumsum(f0 + 120 * np.sin(tt * 9)) / SR) + 0.4 * S.noise(n), 300, 2800) * np.sin(np.pi * tt / 0.7)
    sfx.put(sc, rng.uniform(-0.7, 0.7), rng.uniform(IMP + 1.5, BL), 0.018)
# --- les incendies (arbres des berges), les sirènes
fire = bp(S.noise(), 300, 4000) * (np.abs(lp(S.noise(), 18)) * 2.5) * S.ramp(IMP + 2.5, IMP + 6) * act1
sfx.put(fire, 0.3, 0, 0.05)
x, hi = IMP + 6, 0
while x < HIT - 0.2:
    tt, n = S.burst(0.55); f = 435 if hi == 0 else 488
    ph = 2 * np.pi * np.cumsum(np.full(n, f)) / SR; sir = sum(np.sin(k * ph) / k for k in range(1, 8)) * np.clip(tt / 0.02, 0, 1) * np.clip((0.55 - tt) / 0.02, 0, 1)
    far.put(lp(bp(sir, 300, 2600), 1600), 0.5, x, 0.018); x += 0.6; hi ^= 1
# --- le séisme (magnitude 5 ici)
quake = lp(S.pink(), 80) * S.window(Q, Q + 4.5, 0.3, 1.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 2.1 * t))
sfx.put(quake, 0, 0, 0.7)
rattle = bp(S.noise(), 1200, 5000) * np.clip(lp(np.abs(S.noise()), 10, 1) * 5, 0, 1) * S.window(Q, Q + 3.5, 0.2, 1.2)
sfx.put(rattle, 0.2, 0, 0.03)
# --- la pluie de roches : sifflements, bangs (chacun franchit le mur du son), impacts, plongeons dans le Rhône
for _ in range(45):
    at = EJ + rng.uniform(0, BL - EJ); tt, n = S.burst(0.9); f = 2000 * np.exp(-tt * 1.8) + 250
    wh = bp(S.noise(n), 500, 4000) * np.sin(np.pi * tt / 0.9) * 0.6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.9) * 0.1
    sfx.put(wh, rng.uniform(-0.9, 0.9), at, 0.04)
    sfx.put(S.crack(), rng.uniform(-0.8, 0.8), at + 0.7, 0.07)
    tt2, n2 = S.burst(1.0); sfx.put(lp(S.noise(n2), 260) * np.exp(-tt2 * 5), rng.uniform(-0.7, 0.7), at + 0.85, 0.12)
# --- le souffle : un grondement qui enfle, puis le choc
roar = (lp(S.pink(), 200) + 0.4 * bp(S.pink(), 200, 1500)) * S.ramp(BL, HIT) ** 2 * act1
sfx.put(roar, 0, 0, 0.9)
sfx.put(S.boom(2.5, 45, 20), 0, HIT - 0.1, 0.9)
# --- acte 2 : le vent glacé, des corbeaux
wind = (bp(S.pink(), 150, 900) + 0.5 * bp(S.pink(), 600, 2000)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.09 * t)) * S.ramp(MON, ACT2)
amb.put(wind, -0.3, 0, 0.12)
for _ in range(10):
    at = rng.uniform(ACT2 + 0.5, END - 1); tt, n = S.burst(0.35); f = 520 + 120 * np.sin(np.pi * tt / 0.35)
    caw = bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + 0.5 * S.noise(n), 400, 2200) * np.sin(np.pi * tt / 0.35) ** 1.5
    far.put(caw, rng.uniform(-0.7, 0.7), at, 0.02)
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique
CH = {'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 41, 46, 50, 53], 'F': [41, 48, 53, 57, 60], 'C': [36, 43, 48, 52, 55], 'A': [33, 40, 45, 49, 52], 'Gm': [31, 38, 43, 46, 50]}
def chords(prog, voice, gain, bright=0.25, fin=1.0, fout=1.0):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.3, z + 0.5, fin, fout)
        for m in CH[c]:
            sig = S.pad(hz(m), env, bright) if voice == 'pad' else S.organ(hz(m), env) if voice == 'organ' else S.choir(hz(m + 12), env)
            b.put(sig, rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, 8.4, 'F'), (8.4, 13.4, 'C'), (13.4, IMP, 'Dm'), (IMP, 23.8, 'Bb'), (23.8, Q, 'Gm'), (Q, EJ, 'A'), (EJ, BL, 'Dm'), (BL, HIT, 'A'), (ACT2 - 1, 51.4, 'Dm'), (51.4, 56.4, 'Bb'), (56.4, 61.4, 'Gm'), (61.4, END, 'F')]
mus.add(chords(prog, 'pad', 0.045))
mus.add(chords([(IMP, 23.8, 'Bb'), (23.8, Q, 'Gm'), (Q, EJ, 'A')], 'choir', 0.05, fin=0.5))
for x, m in [(0.5, 72), (2.1, 77), (3.7, 76), (5.4, 72), (8.6, 72), (10.2, 76), (11.8, 79), (13.6, 77), (15.2, 74), (16.8, 69),
             (ACT2 + 0.3, 69), (ACT2 + 2.0, 65), (ACT2 + 3.7, 62), (51.6, 70), (53.3, 69), (55.0, 65), (56.6, 67), (58.3, 70), (60.0, 74), (61.6, 72), (63.3, 76), (65.0, 77)]:
    mus.put(S.pluck(hz(m), 3.0, 1.5), rng.uniform(-0.3, 0.3), x, 0.05)
mus.put(S.hit(hz(26), 3.5, 1.0), 0, IMP, 0.3)
gap, x = 0.9, EJ
while x < HIT - 0.05: mus.put(S.hit(hz(38), 0.45, 8), 0, x, 0.1 + 0.08 * (x - EJ) / (HIT - EJ)); x += gap; gap = max(0.25, gap * 0.93)
mus.mul(1 - S.window(HIT - 0.02, ACT2 - 1.2, 0.08, 0.6))
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['Dm']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([69, 74, 77]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.45, secs=3.5); amb_v = S.verb(amb, wet=0.2, secs=1.4); far_v = S.verb(far, wet=0.6, secs=3.0)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

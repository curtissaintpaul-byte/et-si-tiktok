"""Bande-son « Terre 10× plus vite » : Nice, les galets qui roulent sous les vagues, les mouettes, la promenade ; l'accélération
(un bourdon qui monte) ; le ballon et le skate qui dévalent ; la mer qui se retire (les vagues s'éteignent) ; l'air qui se raréfie
(tout devient étouffé et lointain) ; les séismes ; puis le retour au présent. Musique : la majeur (Riviera), puis tension."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']
S = Session(T['duration'], seed=1210); t = S.t; N = S.N; rng = S.rng
sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
SPIN, SPUN, C0, C1, TILT, SEA, AIR, Q, FLY, REAL, END = T['spin'], T['spun'], T['cycle0'], T['cycle1'], T['tilt'], T['sea'], T['air'], T['quake'], T['fly'], T['real'], T['endCard']
real = S.ramp(REAL - 0.05, REAL + 0.1)
sea_on = np.maximum(1 - S.ramp(SEA, SEA + 7), real)           # les vagues s'éteignent quand la mer s'en va
thin = S.ramp(AIR, Q) * (1 - real)                             # l'air se raréfie : le son s'étouffe
day = 1 - S.window(C0 + 1.2, C1 - 1.6, 0.6, 0.6)               # la nuit pendant la journée en accéléré
# --- les vagues sur les galets de Nice : un souffle qui monte, puis le crépitement des galets qui roulent en redescendant
wave = np.zeros(N)
x = 0.3
while x < T['duration']:
    per = rng.uniform(5.5, 7.5); tt, n = S.burst(per); i = int(x * SR)
    swell = bp(S.noise(n), 200, 1600) * np.sin(np.pi * np.clip(tt / 2.2, 0, 1)) ** 2
    rattle = hp(S.noise(n), 2500) * (np.abs(lp(S.noise(n), 60)) * 3) * np.sin(np.pi * np.clip((tt - 1.8) / 3.0, 0, 1)) ** 1.5
    seg = swell * 0.8 + rattle * 0.35
    if i + n < N: wave[i:i + n] += seg[:max(0, min(n, N - i))]
    x += per * 0.8
amb.put(wave * sea_on, 0, 0, 0.12)
murmur = np.zeros(N)
for v in range(7):
    f = rng.uniform(250, 620); base = bp(S.noise(), f * 0.7, f * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur = murmur / np.abs(murmur).max()
amb.put(murmur * day, -0.2, 0, 0.035)
amb.put(lp(S.pink(), 300) * (0.6 + 0.4 * day), 0.3, 0, 0.04)   # la ville derrière
for _ in range(22):   # mouettes
    at = rng.uniform(0, END - 1)
    if at > SEA + 8 and at < REAL: continue
    tt, n = S.burst(0.5); f = 1500 + 900 * np.exp(-tt * 6) + 200 * np.sin(2 * np.pi * 9 * tt)
    call = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.5) ** 1.2 + 0.3 * bp(S.noise(n), 1200, 3000) * np.sin(np.pi * tt / 0.5)
    far.put(call, rng.uniform(-0.8, 0.8), at, 0.012)
for _ in range(30):   # grillons pendant la nuit en accéléré
    at = rng.uniform(C0 + 1.6, C1 - 2.0); tt, n = S.burst(0.25)
    far.put(np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 30 * tt) > 0) * np.sin(np.pi * tt / 0.25), rng.uniform(-0.8, 0.8), at, 0.005)
# --- l'accélération : un bourdon grave qui monte (la Terre qui tourne de plus en plus vite) + des « tics » de jours
k = np.clip((t - SPIN) / (SPUN - SPIN), 0, 1); k = k * k * (3 - 2 * k)
f_dr = 45 * (1 + 3 * k)
drone = np.sin(2 * np.pi * np.cumsum(f_dr) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f_dr * 2.01) / SR)
sfx.put(lp(drone, 400) * S.window(SPIN, SPUN + 0.6, 0.8, 0.6), 0, 0, 0.065)
sfx.put(bp(S.pink(), 300, 3000) * S.window(SPIN, SPUN + 0.4, 1.0, 0.4) * (0.3 + 0.7 * k), 0, 0, 0.03)
# --- le ballon (rebonds sur les galets), le skate (roulement), la poussette, le « ah ! »
for k_ in range(18):
    at = TILT + 2.2 + k_ * (0.55 - 0.02 * k_)
    tt, n = S.burst(0.1); sfx.put(lp(S.noise(n), 900) * np.exp(-tt * 40) + 0.4 * np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 30), -0.15, at, 0.08 * (1 - k_ / 22))
roll = bp(S.noise(), 300, 1600) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 7 * t))) * S.window(TILT + 1.3, TILT + 6.5, 0.4, 1.2)
sfx.put(roll, -0.2, 0, 0.05)
for at, pan in [(TILT + 3.2, 0.3), (TILT + 2.4, -0.3)]:
    tt, n = S.burst(0.7); f0 = rng.uniform(350, 520)
    oh = bp(np.sin(2 * np.pi * np.cumsum(f0 + 120 * tt) / SR) + 0.5 * S.noise(n), 250, 2500) * np.sin(np.pi * tt / 0.7) ** 0.8
    sfx.put(oh, pan, at, 0.04)
# --- la mer qui se retire : un grand ressac qui s'éloigne, des gargouillis
sfx.put(lp(S.pink(), 500) * S.window(SEA, SEA + 9, 1.0, 5.0) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t)), 0, 0, 0.1)
for _ in range(25):
    at = rng.uniform(SEA + 0.5, AIR); tt, n = S.burst(0.2); f = rng.uniform(300, 700) * (1 + tt * 3)
    sfx.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.2) ** 2, rng.uniform(-0.6, 0.6), at, 0.012)
# --- le vent (toujours), plus sifflant quand l'air est rare
wind = bp(S.pink(), 200, 1500) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t)) * (0.3 + 0.7 * S.ramp(SEA, SEA + 4)) * (1 - real)
amb.put(wind, 0.2, 0, 0.05)
# --- on étouffe : respirations rapides
for _ in range(16):
    at = rng.uniform(AIR + 3.5, Q - 0.3); tt, n = S.burst(0.45)
    sfx.put(bp(S.noise(n), 500, 3500) * np.sin(np.pi * tt / 0.45) ** 1.5, rng.uniform(-0.6, 0.6), at, 0.03)
# --- séismes : grondements, roches qui tombent de la colline, alarmes
sfx.put(lp(S.pink(), 80) * S.window(Q, FLY + 1.0, 0.6, 1.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.9 * t)), 0, 0, 0.9)
sfx.put(bp(S.noise(), 1500, 6000) * np.clip(lp(np.abs(S.noise()), 12, 1) * 5, 0, 1) * S.window(Q, FLY, 0.3, 1.0), 0.3, 0, 0.03)
for _ in range(14):
    at = Q + 0.8 + rng.uniform(0, 4.5); sfx.put(S.boom(1.2, 110, 50), -0.7, at, 0.12)
for _ in range(20): sfx.put(S.crack(), rng.uniform(-0.8, 0.8), Q + 0.3 + rng.uniform(0, 5), 0.06)
x = Q + 1.0
while x < FLY + 2:
    tt, n = S.burst(0.18); far.put(np.sign(np.sin(2 * np.pi * 1350 * tt)) * np.sin(np.pi * tt / 0.18), 0.6, x, 0.007); x += 0.36
# tout s'étouffe quand l'air se raréfie (le son porte mal dans un air rare)
for b in (sfx, amb, far):
    muf = lp(b.L, 900); b.L = b.L * (1 - 0.75 * thin) + muf * 0.75 * thin * 0.6
    muf = lp(b.R, 900); b.R = b.R * (1 - 0.75 * thin) + muf * 0.75 * thin * 0.6
fade = 1 - S.ramp(END - 0.6, END + 0.2); sfx.mul(fade); amb.mul(fade); far.mul(fade)

# --- musique
CH = {'A': [33, 45, 52, 57, 61], 'D': [38, 45, 50, 54, 57], 'E': [40, 47, 52, 56, 59], 'F#m': [42, 49, 54, 57, 61], 'Bm': [35, 47, 50, 54, 59], 'C#m': [37, 44, 49, 52, 56], 'Dm': [38, 45, 50, 53, 57], 'G': [31, 43, 47, 50, 55]}
def chords(prog, gain, bright=0.25, fin=0.8, fout=0.8, voice='pad'):
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, fin, fout)
        for m in CH[c]: b.put(S.pad(hz(m), env, bright) if voice == 'pad' else S.choir(hz(m + 12), env), rng.uniform(-0.4, 0.4), 0, gain)
    return b
prog = [(0, 4.5, 'A'), (4.5, SPIN, 'D'), (SPIN, SPUN, 'E'), (C0, 18.8, 'F#m'), (18.8, C1, 'D'), (TILT, 26.2, 'A'), (26.2, SEA, 'E'),
        (SEA, 36.0, 'F#m'), (36.0, AIR, 'Bm'), (AIR, 46.0, 'Dm'), (46.0, Q, 'G'), (Q, FLY, 'Dm'), (FLY, REAL, 'E'), (REAL, 64.8, 'A'), (64.8, END, 'D')]
mus.add(chords(prog, 0.04))
# la ritournelle de la Riviera (au début et au retour au présent)
def riff(t0, t1):
    mel = [69, 73, 76, 81, 80, 76, 73, 71, 69, 73, 78, 76]
    x, i = t0, 0
    while x < t1: mus.put(S.pluck(hz(mel[i % len(mel)]), 0.9, 4.5), 0.25 if i % 2 else -0.25, x, 0.045); x += 0.37; i += 1
riff(0.3, SPIN - 0.2); riff(REAL + 0.2, END - 0.3)
# l'accélération : des notes de plus en plus rapides
x = SPIN
while x < SPUN:
    kk = (x - SPIN) / (SPUN - SPIN); mus.put(S.pluck(hz(76 + 12 * kk), 0.4, 9), 0, x, 0.04); x += 0.5 * (1 - 0.8 * kk)
for x, m in [(C0 + 0.3, 73), (C0 + 2.0, 71), (C0 + 3.8, 69), (C0 + 5.5, 71), (TILT + 0.3, 76), (TILT + 2.0, 81), (TILT + 3.7, 80), (TILT + 5.4, 76),
             (SEA + 0.3, 73), (SEA + 2.2, 74), (SEA + 4.0, 73), (SEA + 6.1, 71), (SEA + 8.2, 74), (AIR + 0.3, 69), (AIR + 2.6, 65), (AIR + 5.0, 62), (FLY + 0.3, 71), (FLY + 2.0, 68)]:
    mus.put(S.pluck(hz(m), 2.4, 1.8), 0.15, x, 0.045)
gap, x = 0.9, Q
while x < FLY: mus.put(S.hit(hz(38), 0.45, 8), 0, x, 0.09); x += gap; gap = max(0.3, gap * 0.92)
mus.put(S.hit(hz(28), 3.0, 1.2), 0, REAL, 0.15)
end = S.window(END, T['duration'], 0.6, 1.8)
for m in CH['A']: mus.put(S.pad(hz(m), end, 0.2), 0, 0, 0.04)
for i, m in enumerate([73, 76, 81]): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
mus_v = S.verb(mus, wet=0.4, secs=3.0); amb_v = S.verb(amb, wet=0.2, secs=1.4); far_v = S.verb(far, wet=0.55, secs=2.6)
master([(sfx, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], sys.argv[2])

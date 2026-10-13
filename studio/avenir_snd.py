"""Bande-son commune des vidéos 3 et 4 (version 2) de la série « 17 octobre » (lib-avenir.js).
2026 : la manif (rumeur, slogans, tambour, sifflets). Avance rapide (bande qui accélère, clac).
2027 : mode 'tout' → ville calme et ensoleillée (oiseaux), musique en majeur qui s'ouvre ;
       mode 'rien' → pluie continue, un grondement lointain, musique en mineur.
Effet multiplication (les 1 588 profs) : tics qui accélèrent puis boum ('tout') ou des « pops » qui s'éteignent ('rien').
Arrêts sur image : freeze_sfx. Tout est synthétisé."""
import json
import numpy as np
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx


def render(ev_path, out_path, mode='tout'):
    ev = json.load(open(ev_path)); T = ev['T']; E = ev['events']
    TOUT = mode == 'tout'
    S = Session(T['duration'], seed=27 if TOUT else 72); N = S.N; rng = S.rng
    sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
    FZ = E['freezes']; END = E['end']; FF, FF0, FF1 = E['ff'], E['ff0'], E['ff1']; EF = E['effect']
    frozen = np.zeros(N)
    for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
    before = 1 - S.ramp(FF - 0.05, FF + 0.05); after = 1 - before
    trw = S.window(FF0, FF1, 0.08, 0.12)
    live = (1 - 0.85 * frozen) * (1 - 0.8 * trw)

    # --- 2026 : la manif
    murmur = np.zeros(N)
    for v in range(16):
        f0 = rng.uniform(200, 620); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
        syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
    murmur /= np.abs(murmur).max()
    amb.put(murmur * live * (before + 0.18 * after), 0, 0, 0.12)
    amb.put(lp(S.pink(), 280) * live * (before + 0.4 * after), 0, 0, 0.06)
    def chant(a, b, g):
        x = a
        while x < b:
            for d in [0, 0.32, 0.9, 1.12, 1.34]:
                tt, n = S.burst(0.22); env = np.sin(np.pi * tt / 0.22) ** 1.5; v = np.zeros(n)
                for _ in range(10): f = rng.uniform(170, 300); v += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) + 0.6 * np.sin(2 * np.pi * 2 * f * tt)
                k = float(live[min(N - 1, int((x + d) * SR))])
                if k > 0.05: far.put(bp(v + 0.6 * S.noise(n), 300, 1600) * env, rng.uniform(-0.3, 0.3), x + d, g * k)
            x += 2.0 + rng.uniform(-0.1, 0.1)
    chant(0.6, FF0 - 0.3, 0.011)
    for x in np.arange(0.5, FF0, 0.5):
        tt, n = S.burst(0.35); d = np.sin(2 * np.pi * (90 * np.exp(-tt * 6) + 55) * tt) * np.exp(-tt * 9)
        far.put(d, -0.4, x, 0.045 * float(live[min(N - 1, int(x * SR))]))
    for _ in range(6):
        at = rng.uniform(1, FF0 - 1); tt, n = S.burst(0.5); f = 2900 + 300 * np.sin(2 * np.pi * 28 * tt)
        far.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.5) ** 2, rng.uniform(-0.8, 0.8), at, 0.008 * float(live[min(N - 1, int(at * SR))]))

    # --- l'avance rapide vers 2027
    dur = FF1 - FF0; tt, n = S.burst(dur); u = tt / tt[-1]
    sig = np.sin(2 * np.pi * np.cumsum(900 + 3400 * u * u + 300 * np.sin(2 * np.pi * 13 * tt)) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)
    sfx.put(sig * np.sin(np.pi * u) ** 0.5, 0, FF0, 0.05)
    tt, n = S.burst(0.12); sfx.put(lp(S.noise(n), 900) * np.exp(-tt * 40) + np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 30), 0, FF, 0.18)

    # --- 2027 : soleil (oiseaux) ou pluie (et un grondement lointain)
    if TOUT:
        for _ in range(int((END - FF) * 1.4)):
            at = rng.uniform(FF + 0.5, END - 0.5); tt, n = S.burst(0.18); f0 = rng.uniform(2800, 4600)
            ch = np.sin(2 * np.pi * np.cumsum(f0 + 900 * np.sin(2 * np.pi * rng.uniform(18, 30) * tt)) / SR) * np.sin(np.pi * tt / 0.18) ** 2
            amb.put(ch, rng.uniform(-0.9, 0.9), at, 0.006 * float(1 - 0.85 * frozen[min(N - 1, int(at * SR))]))
        amb.put(bp(S.pink(), 120, 700) * after * (1 - 0.6 * frozen), 0, 0, 0.03)   # la ville, au loin
    else:
        rain = hp(S.noise(), 1200) * 0.6 + bp(S.pink(), 400, 3000) * 0.5
        drops = np.zeros(N); idx = rng.integers(int(FF * SR), N, int((T['duration'] - FF) * 60)); drops[idx] = rng.uniform(0.3, 1, len(idx))
        amb.put((rain + bp(drops, 1500, 6000) * 3) * after * (1 - 0.5 * frozen), 0, 0, 0.05)
        tt, n = S.burst(4.0); amb.put(lp(S.noise(n), 140) * np.exp(-tt * 0.9) * np.clip(tt / 0.3, 0, 1), -0.3, FF + 0.8, 0.35)

    # --- l'effet multiplication : les 1 588 profs
    x = EF['t0']
    while x < EF['t1']:
        u = (x - EF['t0']) / (EF['t1'] - EF['t0']); tt, n = S.burst(0.03)
        f = 2400 if TOUT else 1500 - 600 * u
        sfx.put(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 120), 0.5, x, 0.018); x += max(0.035, 0.26 * (1 - u) ** 2)
    if TOUT:
        for k, m in enumerate([96, 100, 103]): sfx.put(S.pluck(hz(m), 1.8, 2.2), (k - 1) * 0.4, EF['t1'] + k * 0.06, 0.05)
        sfx.put(S.boom(3.0, 60, 24), 0, EF['t1'], 0.15)
    else:
        tt, n = S.burst(2.5); sfx.put(np.sin(2 * np.pi * (70 * np.exp(-tt * 0.6) + 30) * tt) * np.exp(-tt * 1.4), 0, EF['t1'], 0.16)
    sfx.put(S.whoosh(EF['c3'] - EF['c0']) * 0.6, 0, EF['c0'], 0.04)
    for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
    fade = 1 - S.ramp(END - 0.3, END + 0.5)
    for b in (amb, far): b.mul(fade * (1 - 0.6 * frozen))
    sfx.mul(fade)

    # --- la musique : tendue en 2026, puis majeur (tout) ou mineur (rien) en 2027
    CH = {'Am': [33, 45, 48, 52, 57], 'F': [29, 41, 45, 48, 53], 'C': [36, 43, 48, 52, 55], 'G': [31, 43, 47, 50, 55], 'Em': [28, 40, 47, 52, 55],
          'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 46, 50, 53, 58], 'E': [28, 40, 44, 47, 52], 'Gm': [31, 43, 46, 50, 55]}
    f1 = FZ[0]
    prog = [(0, f1['t'], 'Dm'), (f1['t'], f1['t'] + f1['dur'], 'Bb'), (f1['t'] + f1['dur'], FF, 'Gm')]
    seq = ['C', 'G', 'Am', 'F', 'C', 'G'] if TOUT else ['Am', 'F', 'Dm', 'E', 'Am', 'F']
    edges = list(np.linspace(FF, END, len(seq) + 1))
    prog += [(edges[i], edges[i + 1], c) for i, c in enumerate(seq)] + [(END, T['duration'], 'C' if TOUT else 'Am')]
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, 0.26 if TOUT else 0.18), rng.uniform(-0.4, 0.4), 0, 0.034)
    mus.add(b)
    x = 3.0
    while x < END:
        i = min(N - 1, int(x * SR))
        if trw[i] < 0.3: mus.put(S.hit(hz(28), 0.4, 8), 0, x, 0.05 * (1 if x < FF else (0.8 if TOUT else 0.6)))
        x += 0.75 if (x < FF or TOUT) else 1.0
    if TOUT:
        for x0 in np.arange(FF + 1.0, END - 1, 3.0):
            for k, m in enumerate([72, 76, 79]): mus.put(S.pluck(hz(m), 1.6, 2.0), (k - 1) * 0.3, x0 + k * 0.18, 0.022 * float(1 - frozen[min(N - 1, int(x0 * SR))]))
    tops = [72, 76, 79] if TOUT else [69, 72, 76]
    for i, m in enumerate(tops): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
    mus.mul(1 - 0.5 * frozen)
    mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.15, secs=1.2)
    master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], out_path)

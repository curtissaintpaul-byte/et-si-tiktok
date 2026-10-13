"""Bande-son commune des vidéos 3 et 4 de la série « 17 octobre » (lib-histoire.js) : la foule de la Bastille en 2026, la même
foule « d'archives » (son étouffé de vieux film, crépitements, projecteur en 1936 et 1968), le rembobinage et l'avance rapide
entre les époques, le tampon du résultat (un coup sec, le même pour « OBTENU » et « LA LOI PASSE »), l'effet
multiplication (tics puis boum), l'arrêt sur image, puis la musique. Neutralité : le même son pour tous les tampons et la même musique
pour les deux vidéos (mode ne change que le tirage au hasard).
Tout est synthétisé."""
import json
import numpy as np
from snd import Session, master, bp, lp, hp, hz, SR, freeze_sfx


def render(ev_path, out_path, mode='tout'):
    ev = json.load(open(ev_path)); T = ev['T']; E = ev['events']
    S = Session(T['duration'], seed=17 if mode == 'tout' else 64); N = S.N; rng = S.rng
    sfx, amb, far, mus = S.bus(), S.bus(), S.bus(), S.bus()
    FZ = E['freezes']; END = E['end']; ERAS = E['eras']; TR = E['trans']; EF = E.get('effect')
    frozen = np.zeros(N)
    for f in FZ: frozen = np.maximum(frozen, S.window(f['t'], f['t'] + f['dur'], 0.15, 0.3))
    old, arch = np.zeros(N), np.zeros(N)
    for e in ERAS:
        w = S.window(e['t0'], e['t1'], 0.05, 0.05)
        if e['year'] <= 1968: old = np.maximum(old, w)
        else: arch = np.maximum(arch, w)
    trw = np.zeros(N)
    for r in TR: trw = np.maximum(trw, S.window(r['t0'], r['t1'], 0.08, 0.12))
    now = np.clip(1 - old - arch, 0, 1)
    live = (1 - 0.85 * frozen) * (1 - 0.8 * trw)

    # --- la foule : rumeur, slogans, tambour (propre en 2026, étouffée et crépitante dans les archives)
    murmur = np.zeros(N)
    for v in range(16):
        f0 = rng.uniform(200, 620); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
        syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
    murmur /= np.abs(murmur).max()
    oldm = bp(murmur, 380, 2600)
    amb.put(murmur * live * (now + 0.85 * arch), 0, 0, 0.12)
    amb.put(oldm * live * old, 0, 0, 0.16)
    amb.put(lp(S.pink(), 280) * live * (now + arch + 0.6 * old), 0, 0, 0.06)
    # crépitements et projecteur (1936, 1968)
    crack = np.zeros(N); idx = rng.integers(0, N, int(T['duration'] * 26)); crack[idx] = rng.uniform(-1, 1, len(idx))
    amb.put(hp(crack, 1500) * old * live, 0, 0, 0.5)
    proj = np.zeros(N); proj[(np.arange(0, T['duration'], 1 / 24) * SR).astype(int)] = 1.0
    amb.put(bp(proj, 800, 4000) * old * (1 - frozen), 0.3, 0, 0.12)

    def chant(a, b, g, src=far):
        x = a
        while x < b:
            for d in [0, 0.32, 0.9, 1.12, 1.34]:
                tt, n = S.burst(0.22); env = np.sin(np.pi * tt / 0.22) ** 1.5; v = np.zeros(n)
                for _ in range(10): f = rng.uniform(170, 300); v += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) + 0.6 * np.sin(2 * np.pi * 2 * f * tt)
                k = float(live[min(N - 1, int((x + d) * SR))])
                if k > 0.05: src.put(bp(v + 0.6 * S.noise(n), 300, 1600) * env, rng.uniform(-0.3, 0.3), x + d, g * k)
            x += 2.0 + rng.uniform(-0.1, 0.1)
    chant(0.6, END - 2, 0.010)
    for x in np.arange(0.5, END, 0.5):
        tt, n = S.burst(0.35); d = np.sin(2 * np.pi * (90 * np.exp(-tt * 6) + 55) * tt) * np.exp(-tt * 9)
        i = min(N - 1, int(x * SR)); far.put(d, -0.4, x, 0.045 * float(live[i]) * (0.6 if old[i] > 0.5 else 1))

    # --- le rembobinage (bande qui recule) et l'avance rapide (bande qui accélère), un « clac » au changement d'époque
    for r in TR:
        dur = r['t1'] - r['t0']; tt, n = S.burst(dur); u = tt / tt[-1]
        f = (1800 + 2600 * u) if r['dir'] < 0 else (900 + 3400 * u * u)
        sig = np.sin(2 * np.pi * np.cumsum(f + 300 * np.sin(2 * np.pi * 13 * tt)) / SR) * 0.4 + bp(S.noise(n), 2000, 7000)
        sfx.put(sig * np.sin(np.pi * u) ** 0.5, 0, r['t0'], 0.05)
        tt, n = S.burst(0.12); sfx.put(lp(S.noise(n), 900) * np.exp(-tt * 40) + np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 30), 0, r['cut'], 0.18)
    # --- les tampons
    for e in ERAS:
        at = e['stamp']
        tt, n = S.burst(0.3); sfx.put(lp(S.noise(n), 600) * np.exp(-tt * 28) + np.sin(2 * np.pi * 75 * tt) * np.exp(-tt * 16), 0, at, 0.35)   # le coup du tampon
        for k, m in enumerate([76, 83]): sfx.put(S.pluck(hz(m), 1.4, 2.6), (k - 0.5) * 0.4, at + 0.05 + k * 0.05, 0.04)   # (le même son pour tous les résultats : on reste neutre)
    # --- l'effet multiplication : des tics de plus en plus rapides, puis le boum
    if EF:
        x = EF['t0']
        while x < EF['t1']:
            u = (x - EF['t0']) / (EF['t1'] - EF['t0']); tt, n = S.burst(0.03); sfx.put(np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 120), 0.5, x, 0.018); x += max(0.035, 0.26 * (1 - u) ** 2)
        for k, m in enumerate([96, 100, 103]): sfx.put(S.pluck(hz(m), 1.8, 2.2), (k - 1) * 0.4, EF['t1'] + k * 0.06, 0.05)
        sfx.put(S.boom(3.0, 60, 24), 0, EF['t1'], 0.15)
        sfx.put(S.whoosh(EF['c3'] - EF['c0']) * 0.6, 0, EF['c0'], 0.04)
    for f in FZ: freeze_sfx(S, sfx, f['t'], f['dur'])
    fade = 1 - S.ramp(END - 0.3, END + 0.5)
    for b in (amb, far): b.mul(fade * (1 - 0.6 * frozen))
    sfx.mul(fade)

    # --- la musique : chaque époque a son accord ; « tout » en majeur, « rien » en mineur
    CH = {'Am': [33, 45, 48, 52, 57], 'F': [29, 41, 45, 48, 53], 'C': [36, 43, 48, 52, 55], 'G': [31, 43, 47, 50, 55], 'Em': [28, 40, 47, 52, 55],
          'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 46, 50, 53, 58], 'Gm': [31, 43, 46, 50, 55], 'A': [33, 45, 49, 52, 57]}
    seq = ['F', 'C', 'G', 'Am', 'F']; first, last = 'Am', 'Am'   # (la même musique pour « tout » et « rien »)
    prog = [(0, ERAS[0]['t0'], first)] + [(e['t0'], e['t1'], seq[i % len(seq)]) for i, e in enumerate(ERAS)]
    back = E['back']; prog += [(back, FZ[0]['t'], 'Em'), (FZ[0]['t'], FZ[0]['t'] + FZ[0]['dur'], 'F'), (FZ[0]['t'] + FZ[0]['dur'], END - 3, 'G'), (END - 3, END, 'Em'), (END, T['duration'], last)]
    b = S.bus()
    for a, z, c in prog:
        env = S.window(a - 0.2, z + 0.4, 0.6, 0.6)
        for m in CH[c]: b.put(S.pad(hz(m), env, 0.22), rng.uniform(-0.4, 0.4), 0, 0.034)
    mus.add(b)
    x = 3.0
    while x < END:
        i = min(N - 1, int(x * SR))
        if trw[i] < 0.3: mus.put(S.hit(hz(28), 0.4, 8), 0, x, 0.05 * (0.7 if old[i] > 0.5 else 1))
        x += 0.75
    tops = [69, 72, 76]
    for i, m in enumerate(tops): mus.put(S.pluck(hz(m), 3.0, 1.4), (i - 1) * 0.3, END + 0.3 + i * 0.55, 0.05)
    mus.mul(1 - 0.5 * frozen)
    mus_v = S.verb(mus, wet=0.4, secs=3.0); far_v = S.verb(far, wet=0.45, secs=2.2); amb_v = S.verb(amb, wet=0.2, secs=1.4); sfx_v = S.verb(sfx, wet=0.15, secs=1.2)
    master([(sfx_v, 1.0), (amb_v, 1.0), (far_v, 1.0), (mus_v, 1.0)], out_path)

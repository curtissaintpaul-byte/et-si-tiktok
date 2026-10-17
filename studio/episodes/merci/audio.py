"""Bande-son de « Merci » (17 octobre 2026) : la musique choisie par Curtis, « Sirens » (Ludwig Göransson, 2026), de 94,99 s à
154,99 s (son moment fort tombe pile au retour en 2026, à 36 s de la vidéo), avec par-dessous quelques bruits discrets :
la rumeur de la foule sur la place, le crépitement des vieux films (1936, 1968), un « clac » à chaque changement d'époque
et le coup du tampon. Pendant les vraies images (36 → 52 s), seulement la musique et une rumeur de foule.
Usage : python3 audio.py events.json sirens.mp3 sortie.wav"""
import json, sys, subprocess
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, Bus, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=1936); N = S.N; rng = S.rng
sfx, amb = S.bus(), S.bus()
ERAS, TR, END, BACK = E['eras'], E['trans'], E['end'], E['back']
MUSIC_AT, FADE = 94.99, 2.5

# --- la musique (décodée par ffmpeg, en stéréo à 48 kHz), fondu à la fin
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(MUSIC_AT), '-t', str(T['duration']), '-i', sys.argv[2], '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
m = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(float)
mus = Bus(N); n = min(N, len(m)); mus.L[:n] = m[:n, 0]; mus.R[:n] = m[:n, 1]
mus.mul(np.clip(S.t / 0.25, 0, 1) * (1 - S.ramp(T['duration'] - FADE, T['duration'])))

# --- la foule de la place (3D) et la rumeur des vraies images
old, arch = np.zeros(N), np.zeros(N)
for e in ERAS:
    w = S.window(e['t0'], e['t1'], 0.05, 0.05)
    if e['year'] in (1936, 1968): old = np.maximum(old, w)
    elif e['year'] in (2006, 2018, 2023): arch = np.maximum(arch, w)
now = S.window(0, 3.0, 0.05, 0.2) + S.window(BACK, END, 0.1, 0.5)
murmur = np.zeros(N)
for v in range(12):
    f0 = rng.uniform(200, 620); base = bp(S.noise(), f0 * 0.7, f0 * 2.2)
    syl = lp(np.abs(S.noise()), rng.uniform(3.5, 5.5), 1); syl = np.clip(syl / syl.std() - 0.3, 0, None); murmur += base * syl
murmur /= np.abs(murmur).max()
amb.put(murmur * (now + 0.8 * arch), 0, 0, 0.10)
amb.put(bp(murmur, 380, 2600) * old, 0, 0, 0.12)
crack = np.zeros(N); idx = rng.integers(0, N, int(T['duration'] * 22)); crack[idx] = rng.uniform(-1, 1, len(idx))
amb.put(hp(crack, 1500) * old, 0, 0, 0.35)
# --- les changements d'époque (un souffle de bande + un « clac »), les tampons
for r in TR:
    dur = r['t1'] - r['t0']; tt, n2 = S.burst(dur); u = tt / tt[-1]
    sig = bp(S.noise(n2), 1500, 7000) * np.sin(np.pi * u) ** 0.5
    sfx.put(sig, 0, r['t0'], 0.03)
    tt, n2 = S.burst(0.1); sfx.put(lp(S.noise(n2), 900) * np.exp(-tt * 45) + np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 30), 0, r['cut'], 0.12)
for e in ERAS:
    tt, n2 = S.burst(0.3); sfx.put(lp(S.noise(n2), 600) * np.exp(-tt * 28) + np.sin(2 * np.pi * 75 * tt) * np.exp(-tt * 16), 0, e['stamp'], 0.22)
fade = 1 - S.ramp(END - 0.3, END + 0.8)
for bb in (amb, sfx): bb.mul(fade)
import os
if os.environ.get('NOMUSIC'):   # (la version sans musique : on ajoutera le son « Sirens » depuis la bibliothèque de TikTok)
    master([(sfx, 1.0), (amb, 1.0)], sys.argv[3], target=-22.0, lev=False)
else:
    master([(mus, 1.0), (sfx, 1.0), (amb, 1.0)], sys.argv[3], target=-16.0, lev=False)

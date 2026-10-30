"""Bande-son de « Et si toutes les infirmières de France s'arrêtaient une semaine ? » : MUSIQUE SEULE (choix de la recette
du 30/10/2026 : pas de voix, pas de bruitages), qui suit l'histoire. Tout est synthétisé (aucun droit d'auteur).
  - 6:59:52 → 7:00 : une nappe chaude (ré majeur) et une petite note claire à chaque seconde de l'horloge, comme un
    métronome de boîte à musique ; à 7 h, une note grave, et l'accord bascule en si mineur : personne n'arrive.
  - le couloir : chaque voyant d'appel qui s'allume = une note pincée (gamme de si mineur), de plus en plus haut ;
    une pulsation grave qui s'installe.
  - les urgences : la pulsation se resserre ; la chambre, puis Jeanne : plus lent, plus seul (une boîte à musique
    au rythme du balancier) ; la question du milieu : presque rien.
  - l'EHPAD la nuit : une nappe froide ; la nuit rouge : un bourdon grave, un battement de cœur joué par la basse,
    deux notes qui alternent comme une alarme ; le ministère : des accords suspendus.
  - le retour : le métronome de l'horloge revient (6:59:55 → 7:00), puis tout se résout en ré majeur ; chaque voyant
    qui s'éteint = une note de cloche qui descend. La fin : un dernier accord qui s'efface."""
import json, sys
import numpy as np
sys.path.insert(0, '../..')
from snd import Session, master, bp, lp, hp, hz, SR

ev = json.load(open(sys.argv[1])); T = ev['T']; E = ev['events']
S = Session(T['duration'], seed=707); N = S.N; rng = S.rng
pads, lead, bass = S.bus(), S.bus(), S.bus()
SH = E['SH']; RELIEF = E['relief']; BACK = E['back']; END = E['end']
DUR = T['duration']

CH = {  # accords (notes MIDI)
    'D': [38, 50, 57, 62, 66], 'Dmaj7': [38, 50, 57, 61, 66], 'Bm': [35, 47, 54, 59, 62], 'G': [31, 43, 50, 55, 59], 'Gmaj7': [31, 43, 50, 54, 59],
    'A': [33, 45, 52, 57, 61], 'Asus': [33, 45, 52, 57, 62], 'Em': [28, 40, 47, 52, 55], 'Em9': [28, 40, 47, 54, 55], 'F#': [30, 42, 49, 54, 58],
    'F#sus': [30, 42, 49, 54, 59], 'Bm/F#': [30, 47, 54, 59, 62], 'Cmaj7': [36, 48, 55, 59, 64], 'D/F#': [30, 50, 57, 62, 66], 'Dadd9': [38, 50, 57, 64, 66],
}
def seg_pad(freq, dur, bright=0.25, detune=0.004):
    """une nappe (sinus désaccordés + harmoniques), calculée seulement sur sa durée (bien plus rapide que S.pad)"""
    t = np.arange(int(dur * SR)) / SR; out = np.zeros(len(t))
    for d in (-detune, 0, detune):
        f = freq * (1 + d); ph = rng.uniform(0, 6.28)
        for h in range(1, 9):
            if f * h > 9000: break
            out += np.sin(2 * np.pi * f * h * t + ph * h) * (bright ** (h - 1)) / h
    return out / 3
def seg_choir(freq, dur):
    t = np.arange(int(dur * SR)) / SR; out = np.zeros(len(t))
    for d in (-0.006, -0.002, 0.002, 0.006):
        vib = 0.004 * np.sin(2 * np.pi * (4.8 + d * 100) * t)
        out += np.sin(2 * np.pi * freq * (1 + d) * t * (1 + vib)) + 0.3 * np.sin(2 * np.pi * freq * 2 * (1 + d) * t)
    return lp(out / 4, 2500)
def seg_env(dur, fin=0.5, fout=0.7):
    t = np.arange(int(dur * SR)) / SR; return np.clip(t / fin, 0, 1) * np.clip((dur - t) / fout, 0, 1)
def chord_seq(seq, gain=0.022, bright=0.22, voice='pad', bus=None):
    for a, z, c in seq:
        a0 = max(0.0, a - 0.15); dur = min(DUR, z + 0.35) - a0
        if dur <= 0.05: continue
        env = seg_env(dur)
        for k, m in enumerate(CH[c]):
            if voice == 'choir' and k == 0: continue
            sig = seg_choir(hz(m + 12), dur) if voice == 'choir' else seg_pad(hz(m), dur, bright)
            (bus or pads).put(sig * env, rng.uniform(-0.5, 0.5), a0, gain * (1.3 if k == 0 else 1.0))
def pluck(at, m, g=0.03, pan=0.0, dur=1.8, decay=2.6):
    lead.put(S.pluck(hz(m), dur, decay), pan, at, g)
def bell(at, m, g=0.03, pan=0.0):
    tt, n = S.burst(3.0)
    s = (np.sin(2 * np.pi * hz(m) * tt) + 0.4 * np.sin(2 * np.pi * hz(m) * 2.76 * tt) * np.exp(-tt * 3) + 0.2 * np.sin(2 * np.pi * hz(m) * 5.4 * tt) * np.exp(-tt * 6))
    lead.put(s * np.exp(-tt * 1.4) * np.clip(tt / 0.003, 0, 1), pan, at, g)
def low(at, m, g=0.06, dur=2.5, decay=1.6):
    tt, n = S.burst(dur); s = np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(2 * np.pi * hz(m) * 2 * tt) * np.exp(-tt * 2)
    bass.put(s * np.exp(-tt * decay) * np.clip(tt / 0.01, 0, 1), 0, at, g)
def heartbeat(a, z, per, g=0.09, m=26):
    x = a
    while x < z:
        for dx, w in ((0, 1.0), (0.16, 0.65)): bass.put(S.hit(hz(m), 0.3, 16), 0, x + dx, g * w)
        x += per

J = lambda k: SH[k]
# --- 1) le poste de soins, 6:59:52 → 7:00 : la nappe chaude, le métronome de l'horloge, puis la bascule
chord_seq([(0, RELIEF, 'Dmaj7'), (RELIEF, J('couloir'), 'Bm')], gain=0.02)
for i in range(8): pluck(RELIEF - 8 + i, 81 if i < 7 else 78, 0.016 + 0.002 * i, 0.25, 1.2, 4.0)   # une note par seconde (la, la… puis fa#)
low(RELIEF, 35, 0.11, 4.0, 0.7)                                                                        # 7 h : la note grave
for k, m in enumerate([74, 73, 71]): pluck(RELIEF + 1.2 + k * 0.6, m, 0.022, -0.2, 2.2, 2.0)          # le petit motif qui descend

# --- 2) le couloir : une note par voyant qui s'allume (si mineur, de plus en plus haut), et la pulsation qui s'installe
chord_seq([(J('couloir'), J('couloir') + 4.5, 'Bm'), (J('couloir') + 4.5, J('couloir') + 8.5, 'G'), (J('couloir') + 8.5, J('urgences'), 'F#sus')], gain=0.02)
SCALE = [66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90]
for k, at in enumerate(sorted(E['callsOn'])): pluck(at + 0.02, SCALE[min(k, len(SCALE) - 1)], 0.026, rng.uniform(-0.6, 0.6), 2.0, 2.2)
x = J('couloir') + 2.0
while x < J('urgences'): low(x, 35, 0.045, 0.9, 4); x += 0.75

# --- 3) les urgences : ça se resserre (une basse en croches, des accords qui tournent)
chord_seq([(J('urgences'), J('urgences') + 3.1, 'Em'), (J('urgences') + 3.1, J('urgences') + 6.2, 'Bm'), (J('urgences') + 6.2, J('urgences') + 9.3, 'G'), (J('urgences') + 9.3, J('chambre'), 'F#')], gain=0.021)
x = J('urgences'); bpm = 0.33
roots = [(J('urgences'), 28), (J('urgences') + 3.1, 35), (J('urgences') + 6.2, 31), (J('urgences') + 9.3, 30)]
while x < J('chambre') - 0.2:
    r = [m for a, m in roots if a <= x][-1]
    bass.put(S.hit(hz(r + 12), 0.25, 14), 0, x, 0.05); x += bpm
for k, at in enumerate(np.arange(J('urgences') + 0.5, J('chambre') - 1, 1.32)): pluck(at, [78, 76, 74, 73][k % 4], 0.018, (k % 2 - 0.5) * 0.8, 1.6, 2.6)

# --- 4) la chambre (jour 2) : plus lent, mélancolique
chord_seq([(J('chambre'), J('chambre') + 3.2, 'G'), (J('chambre') + 3.2, J('chambre') + 6.4, 'D/F#'), (J('chambre') + 6.4, J('chambre') + 9.6, 'Em9'), (J('chambre') + 9.6, J('domicile'), 'Bm')], gain=0.022)
mel = [(0.4, 71), (1.2, 74), (2.0, 78), (3.6, 76), (4.4, 74), (5.2, 73), (6.8, 71), (7.6, 69), (8.4, 71), (10.0, 66), (10.8, 69), (11.4, 71)]
for dt, m in mel: pluck(J('chambre') + dt, m, 0.024, -0.1, 2.4, 1.8)

# --- 5) Jeanne (jour 3) : une boîte à musique au rythme du balancier, presque seule
chord_seq([(J('domicile'), J('domicile') + 6.2, 'Bm'), (J('domicile') + 6.2, J('ehpad'), 'Gmaj7')], gain=0.016, bright=0.18)
for i, at in enumerate(np.arange(J('domicile') + 0.5, J('ehpad') - 0.2, 1.0)): pluck(at, [83, 78][i % 2], 0.009, 0.35, 0.8, 5.0)   # le balancier
box = [(1.0, 86), (2.0, 83), (3.0, 81), (4.0, 78), (6.0, 79), (7.0, 78), (8.0, 76), (9.0, 74), (11.0, 71)]
for dt, m in box: bell(J('domicile') + dt, m, 0.016, -0.2)

# --- 6) la question du milieu : presque rien (une note tenue, un écho)
q0, q1 = E['midq']
chord_seq([(J('ehpad'), q1, 'Em9')], gain=0.012, bright=0.15)
bell(q0 + 0.2, 71, 0.02, 0.0); bell(q0 + 2.6, 66, 0.014, 0.2)

# --- 7) l'EHPAD la nuit : une nappe froide (voix)
chord_seq([(q1, q1 + 4.3, 'Em9'), (q1 + 4.3, J('alerte'), 'Cmaj7')], gain=0.02, voice='choir')
for k, at in enumerate(np.arange(q1 + 0.6, J('alerte') - 0.5, 2.1)): pluck(at, [71, 67, 66, 64][k % 4], 0.016, 0.3, 2.6, 1.6)

# --- 8) la nuit rouge : bourdon grave, battement de cœur à la basse, deux notes qui alternent comme une alarme
a, z = J('alerte'), J('ministere')
dd = z + 0.2 - (a - 0.1); de = seg_env(dd, 0.4, 0.8) * (0.7 + 0.3 * np.linspace(0, 1, int(dd * SR)))
for m, g in ((26, 0.05), (33, 0.03), (38, 0.02)): bass.put(lp(seg_pad(hz(m), dd, 0.35) * de, 900), 0, a - 0.1, g)
heartbeat(a + 0.3, z - 0.3, 0.62, 0.1)
for k, at in enumerate(np.arange(a + 1.0, z - 0.5, 0.31)): pluck(at, [72, 71][k % 2], 0.011 + 0.008 * (at - a) / (z - a), (k % 2 - 0.5) * 0.9, 0.6, 6.0)
chord_seq([(a, a + 6.5, 'Bm'), (a + 6.5, z, 'Cmaj7')], gain=0.014, bright=0.3)

# --- 9) le ministère (jour 7) : des accords suspendus, très doux
chord_seq([(J('ministere'), J('ministere') + 4.2, 'Em'), (J('ministere') + 4.2, J('ministere') + 8.4, 'Asus'), (J('ministere') + 8.4, J('retour'), 'F#sus')], gain=0.02)
for dt, m in [(0.6, 67), (2.0, 71), (4.6, 69), (6.0, 73), (8.8, 71), (10.4, 70)]: pluck(J('ministere') + dt, m, 0.018, 0.0, 3.0, 1.2)

# --- 10) le retour : le métronome de l'horloge (6:59:55 → 7:00), puis la résolution en ré majeur ; une cloche par voyant éteint
chord_seq([(J('retour'), BACK, 'F#sus'), (BACK, BACK + 2.6, 'D'), (BACK + 2.6, BACK + 5.2, 'A'), (BACK + 5.2, END, 'Bm'), (END, DUR, 'Dadd9')], gain=0.024, bright=0.26)
for i in range(5): pluck(BACK - 5 + i, 81, 0.018, 0.25, 1.2, 4.0)
low(BACK, 38, 0.12, 5.0, 0.6); low(BACK, 50, 0.05, 4.0, 0.9)
DOWN = [93, 90, 88, 86, 83, 81, 78, 76, 74, 71, 69]
for k, at in enumerate(sorted(E['callsOff'])): bell(at + 0.03, DOWN[min(k, len(DOWN) - 1)], 0.024, rng.uniform(-0.5, 0.5))
for dt, m in [(0.0, 74), (0.5, 78), (1.0, 81), (2.6, 76), (3.1, 81), (3.6, 85)]: pluck(BACK + dt, m, 0.022, 0.0, 2.6, 1.6)

# --- 11) l'écran de fin : un dernier accord, une dernière phrase de boîte à musique, et ça s'efface
for dt, m in [(0.6, 78), (1.4, 76), (2.2, 74), (3.6, 69)]: bell(END + dt, m, 0.02, 0.0)
fade = 1 - S.ramp(DUR - 2.6, DUR - 0.05)
for b in (pads, lead, bass): b.mul(fade)
pads_v = S.verb(pads, wet=0.45, secs=3.2); lead_v = S.verb(lead, wet=0.4, secs=2.8); bass_v = S.verb(bass, wet=0.15, secs=1.6)
master([(pads_v, 1.0), (lead_v, 1.0), (bass_v, 1.0)], sys.argv[2], target=float(sys.argv[3]) if len(sys.argv) > 3 else -16.9)

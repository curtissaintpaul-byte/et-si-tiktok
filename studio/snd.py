"""Boîte à outils son du studio : bruitages + musique, tout synthétisé (aucun fichier externe, aucun droit d'auteur)."""
import wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000


class Session:
    """une bande-son de `dur` secondes : on y ajoute des pistes (bus), puis on mixe"""

    def __init__(self, dur, seed=1):
        self.dur = dur; self.N = int(SR * dur); self.t = np.arange(self.N) / SR
        self.rng = np.random.default_rng(seed)

    # --- formes de base -----------------------------------------------------
    def env(self, a, b, fade=0.03): t = self.t; return np.clip((t - a) / fade, 0, 1) * np.clip((b - t) / fade, 0, 1)
    def ramp(self, a, b):
        k = np.clip((self.t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
    def window(self, a, b, fin, fout): return self.ramp(a, a + fin) * (1 - self.ramp(b - fout, b))
    def noise(self, n=None): return self.rng.standard_normal(self.N if n is None else n)
    def pink(self, n=None):
        n = self.N if n is None else n
        w = np.fft.rfft(self.rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); f[0] = f[1]
        x = np.fft.irfft(w / np.sqrt(f), n); return x / np.abs(x).max()
    def burst(self, dur): n = int(dur * SR); return np.arange(n) / SR, n

    def bus(self): return Bus(self.N)

    # --- timbres musicaux -----------------------------------------------------
    def pad(self, freq, amp, bright=0.3, detune=0.004):
        out = np.zeros(self.N); t = self.t
        for d in (-detune, 0, detune):
            f = freq * (1 + d); ph = self.rng.uniform(0, 6.28)
            for h in range(1, 9):
                if f * h > 9000: break
                out += np.sin(2 * np.pi * f * h * t + ph * h) * (bright ** (h - 1)) / h
        return out * amp / 3

    def organ(self, freq, amp):
        out = np.zeros(self.N); t = self.t
        for h, w in ((1, 1.0), (2, 0.55), (3, 0.35), (4, 0.25), (6, 0.12), (8, 0.08)):
            if freq * h > 9000: break
            out += np.sin(2 * np.pi * freq * h * t + 0.3 * np.sin(2 * np.pi * 5.2 * t) * (h > 2)) * w
        return out * amp

    def choir(self, freq, amp):
        """nappe "voix" : sinus désaccordés + léger vibrato, filtrée"""
        out = np.zeros(self.N); t = self.t
        for d in (-0.006, -0.002, 0.002, 0.006):
            vib = 0.004 * np.sin(2 * np.pi * (4.8 + d * 100) * t)
            out += np.sin(2 * np.pi * freq * (1 + d) * t * (1 + vib)) + 0.3 * np.sin(2 * np.pi * freq * 2 * (1 + d) * t)
        return lp(out * amp / 4, 2500)

    def pluck(self, freq, dur=1.6, decay=3.2):
        tt, n = self.burst(dur)
        s = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * tt) * np.exp(-tt * 4) + 0.12 * np.sin(2 * np.pi * freq * 3.98 * tt) * np.exp(-tt * 9)
        return s * np.exp(-tt * decay) * np.clip(tt / 0.004, 0, 1)

    def hit(self, freq, dur=0.5, decay=7):
        tt, n = self.burst(dur)
        return (np.sin(2 * np.pi * freq * tt) + 0.4 * np.sin(2 * np.pi * freq * 2 * tt)) * np.exp(-tt * decay) * np.clip(tt / 0.008, 0, 1)

    def boom(self, dur=4.0, f0=72, f1=26):
        tt, n = self.burst(dur)
        b = np.sin(2 * np.pi * np.cumsum(f0 * np.exp(-tt * 0.6) + f1) / SR) * np.exp(-tt * 1.1)
        return b + 0.6 * lp(self.rng.standard_normal(n), 180) * np.exp(-tt * 2.2) * 4

    def crack(self):
        tt, n = self.burst(0.09)
        c = hp(self.rng.standard_normal(n), 1500) * np.exp(-tt * self.rng.uniform(60, 140))
        return c + np.sin(2 * np.pi * self.rng.uniform(1400, 3400) * tt) * np.exp(-tt * 45) * 0.6

    def whoosh(self, dur):
        tt, n = self.burst(dur)
        return bp(self.rng.standard_normal(n), 400, 5000) * np.sin(np.pi * tt / dur) ** 2

    def ir(self, secs=3.8, decay=1.6, seed=1):
        r = np.random.default_rng(seed); n = int(secs * SR); tt = np.arange(n) / SR
        x = r.standard_normal(n) * np.exp(-tt * decay); x = lp(x, 5000); return x / np.abs(x).sum() * 9

    def verb(self, bus, wet=0.5, dry=0.62, secs=3.8):
        wl, wr = fftconvolve(bus.L, self.ir(secs, seed=1))[: self.N], fftconvolve(bus.R, self.ir(secs, seed=2))[: self.N]
        out = Bus(self.N); out.L = bus.L * dry + wl * wet; out.R = bus.R * dry + wr * wet; return out


class Bus:
    def __init__(self, N): self.N = N; self.L = np.zeros(N); self.R = np.zeros(N)
    def put(self, sig, pan=0.0, at=0.0, gain=1.0):
        a = int(at * SR)
        if a >= self.N or a < 0: return self
        b = min(self.N, a + len(sig)); s = sig[: b - a] * gain
        self.L[a:b] += s * np.cos((pan + 1) * np.pi / 4) * 1.41
        self.R[a:b] += s * np.sin((pan + 1) * np.pi / 4) * 1.41
        return self
    def add(self, other, gain=1.0): self.L += other.L * gain; self.R += other.R * gain; return self
    def mul(self, env): self.L *= env; self.R *= env; return self


def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), x)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)


def _movavg(x, n):
    c = np.cumsum(np.insert(x, 0, 0.0)); y = (c[n:] - c[:-n]) / n
    pad = n // 2; return np.concatenate([np.full(pad, y[0]), y, np.full(len(x) - len(y) - pad, y[-1])])

def level(mix, ratio=0.5, win=1.5, boost=9.0):
    """« niveleur » lent : remonte les passages calmes et tasse un peu les passages forts (compression 2:1 sur ~1,5 s),
    pour que le début d'une vidéo ne soit pas trop faible à côté des explosions. Le silence reste du silence."""
    e = (mix ** 2).mean(1)
    db = 10 * np.log10(_movavg(e, int(win * SR)) + 1e-12)
    top = db.max(); ref = np.percentile(db[db > top - 35], 80)
    g = np.clip((ref - db) * ratio, -3.0, boost)
    g[db < top - 42] = 0.0
    g = _movavg(g, int(0.4 * SR))
    return mix * (10 ** (g / 20))[:, None]

def master(buses_gains, out_path, target=-19.0, lev=True):
    """mixage final : on règle le volume pour que le son « moyen » soit à `target` dB (bien audible sur un téléphone),
    puis un limiteur doux empêche les pics (les explosions) de saturer."""
    L = sum(b.L * g for b, g in buses_gains); R = sum(b.R * g for b, g in buses_gains)
    L, R = hp(L, 28), hp(R, 28)
    mix = np.stack([L, R], 1)
    if lev: mix = level(mix)
    sec = np.array([20 * np.log10(np.sqrt((mix[k * SR:(k + 1) * SR] ** 2).mean()) + 1e-9) for k in range(len(mix) // SR)])
    med = np.median(sec[sec > sec.max() - 30])
    mix *= 10 ** ((target - med) / 20)
    thr = 10 ** (-1.2 / 20)
    mix = thr * np.tanh(mix / thr)
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
    out = [round(20 * np.log10(np.sqrt((mix[k * SR:(k + 1) * SR] ** 2).mean()) + 1e-9)) for k in range(len(mix) // SR)]
    print('niveaux par seconde (dB):', out)
    print('ok', out_path)


def freeze_sfx(S, bus, at, dur, gain=1.0):
    """« Arrêt sur image » : un déclic d'obturateur, puis une note grave tenue pendant l'arrêt (at, dur : temps vidéo, cf. lib-freeze.js)."""
    tt, n = S.burst(0.06)
    bus.put(hp(S.noise(n) * np.exp(-tt * 90), 1500), 0, at, 0.35 * gain)
    tt, n = S.burst(dur)
    env = np.clip(tt / 0.3, 0, 1) * np.clip((dur - tt) / 0.4, 0, 1)
    drone = np.sin(2 * np.pi * 110 * tt) + 0.5 * np.sin(2 * np.pi * 165 * tt) + 0.25 * np.sin(2 * np.pi * 220.5 * tt)
    bus.put(drone * env, 0, at, 0.05 * gain)

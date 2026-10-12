"""Chute dans un tunnel droit qui traverse la Terre par le centre (sans air, sans rotation), Terre PREM.
Donne : durée de la traversée, vitesse au centre, et la profondeur / vitesse / g / température / pression au fil du temps."""
import numpy as np, sys, json
sys.path.insert(0, '../gravite')
G = 6.674e-11; RE = 6371e3
import importlib.util
spec = importlib.util.spec_from_file_location('tr', '../gravite/terre_radiale.py')
src = open('../gravite/terre_radiale.py').read().split('NS = int')[0]   # on ne reprend que la fonction prem()
exec(src)
r = np.linspace(0, RE, 20001); rho = np.array([prem(x)[0] for x in r]) * 1e3
dm = 4 * np.pi * r**2 * rho * np.gradient(r); Menc = np.cumsum(dm); Menc *= 5.9722e24 / Menc[-1]
g = np.where(r > 0, G * Menc / np.maximum(r, 1)**2, 0)
# pression : dP/dr = -rho g
P = np.zeros_like(r); P[:-1] = np.cumsum((rho * g * np.gradient(r))[::-1])[::-1][:-1]
# chute
dt = 0.05; x, v, t = RE, 0.0, 0.0; out = []
while True:
    gg = np.interp(abs(x), r, g) * np.sign(x); v -= gg * dt; x += v * dt; t += dt
    out.append((t, x, v))
    if x < -RE + 1 or t > 6000: break
o = np.array(out); tc = o[np.argmin(np.abs(o[:, 1])), 0]
print(f"traversée : {o[-1,0]/60:.1f} min ; centre atteint à {tc/60:.1f} min ; vitesse max {np.abs(o[:,2]).max()/1e3:.2f} km/s = {np.abs(o[:,2]).max()*3.6:,.0f} km/h")
print(f"g max {g.max():.2f} m/s² à {RE/1e3 - r[g.argmax()]/1e3:.0f} km de profondeur ; P centre {P[0]/1e9:.0f} GPa")
for T_ in [10, 30, 60, 120, 180, 300, 400, 500, 600, 700, 800, 900, 1000, 1145, 1200, 1500, 1800, 2000, 2290]:
    k = np.searchsorted(o[:, 0], T_)
    if k < len(o): d = RE - abs(o[k, 1]); print(f"  t={T_:5d}s  profondeur {(RE - o[k,1])/1e3:7.0f} km (rayon {o[k,1]/1e3:6.0f})  vitesse {abs(o[k,2])*3.6:9,.0f} km/h   g={np.interp(abs(o[k,1]), r, g):5.2f}")
np.save('chute.npy', o)
# taux uniforme pour comparer
print('uniforme : demi-période', np.pi*np.sqrt(RE**3/(G*5.9722e24))/60, 'min ; v max', np.sqrt(G*5.9722e24/RE)/1e3, 'km/s')

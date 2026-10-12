"""Modèle radial de la Terre (PREM) : coquilles sphériques élastiques auto-gravitantes, calcul non linéaire.
1) validation : période du mode « respiration » 0S0 (observée : 1227,6 s ≈ 20,5 min)
2) scénario : gravité coupée pendant TAU secondes, puis rétablie → mouvement de la surface."""
import numpy as np, sys
G = 6.674e-11; RE = 6371e3
def prem(r):
    x = r / RE; km = r / 1e3
    if km < 1221.5: return 13.0885 - 8.8381*x**2, 11.2622 - 6.3640*x**2, 3.6678 - 4.4475*x**2
    if km < 3480: return 12.5815 - 1.2638*x - 3.6426*x**2 - 5.5281*x**3, 11.0487 - 4.0362*x + 4.8023*x**2 - 13.5732*x**3, 0.0
    if km < 3630: return 7.9565 - 6.4761*x + 5.5283*x**2 - 3.0807*x**3, 15.3891 - 5.3181*x + 5.5242*x**2 - 2.5514*x**3, 6.9254 + 1.4672*x - 2.0834*x**2 + 0.9783*x**3
    if km < 5600: return 7.9565 - 6.4761*x + 5.5283*x**2 - 3.0807*x**3, 24.9520 - 40.4673*x + 51.4832*x**2 - 26.6419*x**3, 11.1671 - 13.7818*x + 17.4575*x**2 - 9.2777*x**3
    if km < 5701: return 7.9565 - 6.4761*x + 5.5283*x**2 - 3.0807*x**3, 29.2766 - 23.6027*x + 5.5242*x**2 - 2.5514*x**3, 22.3459 - 17.2473*x - 2.0834*x**2 + 0.9783*x**3
    if km < 5771: return 5.3197 - 1.4836*x, 19.0957 - 9.8672*x, 9.9839 - 4.9324*x
    if km < 5971: return 11.2494 - 8.0298*x, 39.7027 - 32.6166*x, 22.3512 - 18.5856*x
    if km < 6151: return 7.1089 - 3.8045*x, 20.3926 - 12.2569*x, 8.9496 - 4.4597*x
    if km < 6346.6: return 2.6910 + 0.6924*x, 4.1875 + 3.9382*x, 2.1519 + 2.3481*x
    if km < 6356: return 2.9, 6.8, 3.9
    if km < 6368: return 2.6, 5.8, 3.2
    return 1.02, 1.45, 0.0
NS = int(sys.argv[3]) if len(sys.argv) > 3 else 700
R0 = np.linspace(0, RE, NS + 1)
m = np.zeros(NS); K = np.zeros(NS); MU = np.zeros(NS)
for k in range(NS):
    rs = np.linspace(R0[k], R0[k+1], 41); rm = 0.5*(rs[1:] + rs[:-1]); dv = 4/3*np.pi*(rs[1:]**3 - rs[:-1]**3)
    p = np.array([prem(r) for r in rm]); rho = p[:, 0]*1e3; vp = p[:, 1]*1e3; vs = p[:, 2]*1e3
    m[k] = (rho*dv).sum(); V = dv.sum()
    K[k] = (dv*rho*(vp**2 - 4/3*vs**2)).sum()/V; MU[k] = (dv*rho*vs**2).sum()/V
V0 = 4/3*np.pi*(R0[1:]**3 - R0[:-1]**3); rho0 = m/V0
M = m.sum(); I = 0
print(f"masse {M:.4e} kg (réelle 5,972e24)   g surface {G*M/RE**2:.3f} m/s²")
mn = np.zeros(NS + 1); mn[:-1] += m/2; mn[1:] += m/2
Menc = np.concatenate([[0], np.cumsum(m)])   # masse sous chaque nœud
A0 = 4*np.pi*R0**2
P0 = np.zeros(NS)   # pression initiale (équilibre discret exact)
P0[NS-1] = G*Menc[NS]*mn[NS]/(R0[NS]**2*A0[NS])
for j in range(NS - 1, 0, -1): P0[j-1] = P0[j] + G*Menc[j]*mn[j]/(R0[j]**2*A0[j])
print(f"pression au centre {P0[0]/1e9:.0f} GPa (PREM : 364)")
vpmax = np.sqrt((K + 4/3*MU)/rho0).max(); dr = RE/NS
def force(r, grav):
    dR = r[1:] - r[:-1]; V = 4/3*np.pi*(r[1:]**3 - r[:-1]**3); J = V/V0
    P = P0 - K*(J - 1)
    rm = 0.5*(r[1:] + r[:-1]); rm0 = 0.5*(R0[1:] + R0[:-1])
    err = np.log(dR/(R0[1:] - R0[:-1])); ett = np.log(rm/rm0)
    srr = 4/3*MU*(err - ett); stt = -2/3*MU*(err - ett)
    srr_tot = -P + srr
    A = 4*np.pi*r**2
    F = np.zeros_like(r)
    F[1:-1] = A[1:-1]*(srr_tot[1:] - srr_tot[:-1])
    F[-1] = A[-1]*(0 - srr_tot[-1])
    hoop = 2*(srr - stt)/rm*V/2
    F[1:] += hoop; F[:-1] += hoop
    if grav: F[1:] -= G*Menc[1:]*mn[1:]/r[1:]**2
    F[0] = 0
    return F/np.where(mn > 0, mn, 1)
def run(tau, tmax, v_init=None, dt=None):
    dt = dt or 0.3*dr/vpmax
    r = R0.copy(); v = np.zeros_like(r) if v_init is None else v_init.copy(); t = 0.0
    a = force(r, tau <= 0); out = []
    while t < tmax:
        v += 0.5*dt*a; r += dt*v; t += dt
        a = force(r, not (0 < t <= tau)); v += 0.5*dt*a; v[0] = 0; r[0] = 0
        out.append((t, r[-1] - RE, v[-1]))
    return np.array(out), r, v
if sys.argv[1] == 'mode':
    o, _, _ = run(0, float(sys.argv[2]), v_init=1e-3*R0/RE)
    t, u = o[:, 0], o[:, 1]
    up = np.where((u[1:-1] > u[:-2]) & (u[1:-1] > u[2:]))[0] + 1
    print("pics (s) :", np.round(t[up][:6]), " période moyenne :", np.diff(t[up]).mean().round(1), "s")
else:
    tau = float(sys.argv[1]); o, r, v = run(tau, float(sys.argv[2]))
    np.save(f'surface_tau{tau:g}.npy', o)
    t, u, w = o.T
    i5 = np.searchsorted(t, tau)
    print(f"fin de la coupure ({tau} s) : surface montée de {u[i5]:.1f} m, vitesse {w[i5]:.1f} m/s")
    print(f"max montée {u.max()/1e3:.2f} km à t={t[u.argmax()]:.0f} s ; min {u.min()/1e3:.2f} km à t={t[u.argmin()]:.0f} s")
    acc = np.gradient(w, t); print(f"accélération max de la surface après : {np.abs(acc[i5+50:]).max():.3f} m/s²")
    for T_ in [60, 120, 300, 600, 900, 1200, 1800, 2400, 3600]:
        k = np.searchsorted(t, T_)
        if k < len(t): print(f"  t={T_:5d} s  surface {u[k]/1e3:+.2f} km  vitesse {w[k]:+.1f} m/s")

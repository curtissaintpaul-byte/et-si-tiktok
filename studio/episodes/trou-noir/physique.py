# Calculs de l'épisode "trou noir" (vérification des chiffres affichés)
import numpy as np
G=6.674e-11; Msun=1.989e30; M=7.1*Msun; GM=G*M; c=2.998e8
RE=6.371e6; ME=5.972e24; g=9.81; RM=1.7374e6; MM=7.342e22; dMoon=3.844e8
rs=2*GM/c**2
print(f"rayon de Schwarzschild {rs/1e3:.1f} km  -> diamètre {2*rs/1e3:.1f} km")
r_lift=(2*GM*RE/g)**(1/3); r_earth=RE*(M/ME)**(1/3); r_moon=RM*(M/MM)**(1/3)
print(f"objets qui 'tombent vers le haut' (marée = g) : {r_lift/1e9:.3f} M km")
print(f"Terre déchirée (marée = 2g, limite de Roche rigide) : {r_earth/1e9:.3f} M km")
print(f"Lune déchirée à {r_moon/1e9:.3f} M km de la Lune -> {(r_moon+dMoon)/1e9:.3f} M km de la Terre")
def tide(r): # marée d'équilibre ~0.36 m pour la Lune actuelle
    return 0.36*(M/MM)*(dMoon/r)**3
for r in [100e9,60e9,50e9,30e9,20e9]: print(f"marée d'équilibre à {r/1e9:.0f} M km : {tide(r):.1f} m")
def einstein_deg(D): return np.degrees(np.sqrt(2*rs/D))
for D in [50e9,5e9,2e9,1e9,0.85e9]: print(f"anneau d'Einstein à {D/1e9:.2f} M km : rayon {einstein_deg(D):.3f}°  (Lune = 0.259°)")
# chute : distance relative r(t), vitesse initiale 45 km/s l'un vers l'autre
r=60e9; v=-45e3; t=0; dt=10; marks=[60e9,50e9,30e9,20e9,10e9,5e9,2e9,r_moon+dMoon,r_lift,r_earth]; out={}
while r>r_earth*0.99:
    a=-G*(M+ME)/r**2; v+=a*dt; r+=v*dt; t+=dt
    for m in marks:
        if m not in out and r<=m: out[m]=(t,-v)
T_end=out[r_earth][0]
for m in marks:
    tt,vv=out.get(m,(0,0)); left=T_end-tt
    print(f"r={m/1e9:7.3f} M km  t={tt/86400:6.2f} j  vitesse={vv/1e3:7.1f} km/s  reste avant déchirure: {left/86400:.3f} j = {left/3600:.2f} h = {left:.0f} s")

# table (temps restant -> distance) exportée pour la maquette
import json
r=90e9; v=-45e3; t=0; dt=5; rows=[]
while r>r_earth:
    a=-G*(M+ME)/r**2; v+=a*dt; r+=v*dt; t+=dt; rows.append((t,r,-v))
T_end=rows[-1][0]
tab=[]; last=None
for (tt,rr,vv) in rows:
    left=T_end-tt
    if last is None or abs(np.log(left+1)-np.log(last+1))>0.01: tab.append([round(left,1), round(rr/1e3)]); last=left
tab.append([0, round(r_earth/1e3)])
json.dump({'table':tab,'r_lift_km':r_lift/1e3,'r_earth_km':r_earth/1e3,'r_moon_km':(r_moon+dMoon)/1e3,'rs_km':rs/1e3}, open('physique.json','w'))
print(len(tab),'points ; 4 jours ->', [x for x in tab if x[0]<=345600][0])

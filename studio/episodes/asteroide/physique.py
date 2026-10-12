# Effets d'un astéroïde de 10 km (20 km/s, 45°, roche 3000 kg/m³) tombé à ~800 km de Lyon
# Équations de Collins, Melosh & Marcus (2005), « Earth Impact Effects Program » (Impact Earth, Imperial College / Purdue)
import math
L, v, rho_i, rho_t, th, r = 10e3, 20e3, 3000, 2500, math.radians(45), 800e3
g, RE = 9.81, 6.371e6
E = math.pi / 12 * rho_i * L**3 * v**2
print(f"énergie : {E:.2e} J = {E/4.184e15:.2e} Mt = {E/(15*4.184e12):.2e} × Hiroshima (15 kt)")
Rf = 0.002 * E**(1/3); print(f"boule de feu : rayon {Rf/1e3:.0f} km (diamètre {2*Rf/1e3:.0f} km), max de chaleur après {Rf/v:.1f} s")
D = r / RE; h = (1 - math.cos(D)) * RE
gam = math.acos(h / Rf); f = (2 / math.pi) * (gam - (h / Rf) * math.sin(gam))
K = 3e-3; phi = K * E / (2 * math.pi * r**2) * f
Wt = K * E / (2 * math.pi * Rf**2 * 5.67e-8 * 3000**4)
print(f"part visible au-dessus de l'horizon : {f:.2f} ; exposition thermique {phi:.2e} J/m² en {Wt/60:.0f} min (≈ {phi/Wt/1000:.0f} kW/m², le Soleil ≈ 1 kW/m²)")
print(f"taille apparente : {2*math.degrees(math.atan(Rf/r)):.0f}° soit ~{2*math.degrees(math.atan(Rf/r))/0.53:.0f} fois le Soleil")
M = 0.67 * math.log10(E) - 5.87; Meff = M - 1.66 * math.log10(D) - 6.399
print(f"séisme : magnitude {M:.1f} à l'impact, {Meff:.1f} ressentie à Lyon, arrivée {r/5e3/60:.1f} min")
Dtc = 1.161 * (rho_i / rho_t)**(1/3) * L**0.78 * v**0.44 * g**-0.22 * math.sin(th)**(1/3)
Dfr = 1.17 * (Dtc/1e3)**1.13 / 3.2**0.13
te = Dtc**4 / (112 * r**3)
ve = math.sqrt(r * g); Te = 2 * ve * math.sin(math.radians(45)) / g
print(f"cratère : {Dfr:.0f} km ; débris à Lyon ≥ {te*100:.0f} cm, arrivée ~{Te/60:.0f} min (vol balistique)")
Ekt = E / 4.18e12; r1 = r / Ekt**(1/3); p = 75000 * 290 / (4 * r1) * (1 + 3 * (290 / r1)**1.3)
u = (5 * p / (7e5)) * 330 / math.sqrt(1 + 6 * p / 7e5)
print(f"souffle : arrivée {r/330/60:.0f} min, surpression {p/1e5:.2f} bar, vent {u*3.6:.0f} km/h")

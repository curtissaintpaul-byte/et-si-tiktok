"""« La colère du peuple · 17 octobre 2026 » : montage de VRAIES images de la journée (vidéos des médias et des réseaux,
crédit gardé) sur une musique choisie par Curtis. Deux versions, même histoire, calée sur deux musiques :
  - winner : « The Winner Takes It All x The Night We Met » (TikTok mix), de 56,0 s à ~117 s : le silence avant le
    changement de chanson (63 → 64,8 s) accueille la phrase de Macron, la 2e chanson démarre sur la foule ;
  - earth  : « Earth Song » (Michael Jackson), de 150,0 s à ~213 s : le refrain explose à 157,37 s, sur la foule.
Intro : Emmanuel Macron, juillet 2018 (affaire Benalla) : « Qu'ils viennent le chercher. » (date écrite à l'écran).
Usage : python3 montage.py winner|earth <musique.mp3> <dossier des vidéos> <sortie.mp4> [--sans-musique]"""
import sys, os, subprocess, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter

VER, MUSIC, CLIPS, OUT = sys.argv[1:5]; NOMUSIC = '--sans-musique' in sys.argv
W, H, FPS = 1080, 1920, 30
WORK = f'work/colere-{VER}'; os.makedirs(WORK, exist_ok=True)
F = '/tmp/claude-0/-home-claude/63b72741-a4bd-52b7-93f4-2c1523f469c5/scratchpad/fonts'; INTER = '/usr/share/fonts/opentype/inter/'
fnt = lambda p, s: ImageFont.truetype(p, s)
f_ban, f_lab, f_cred = fnt(INTER + 'Inter-ExtraBold.otf', 34), fnt(INTER + 'Inter-SemiBold.otf', 26), fnt(INTER + 'Inter-SemiBold.otf', 26)
f_big, f_mid = fnt(INTER + 'Inter-ExtraBold.otf', 116), fnt(INTER + 'Inter-ExtraBold.otf', 40)
f_val, f_sub = fnt(F + '/eb-garamond-latin-500-normal.ttf', 72), fnt(F + '/eb-garamond-latin-400-italic.ttf', 66)

# --- les musiques : début de l'extrait, instant du « drop », battements (mesurés avec librosa), fin
M = {
  'winner': dict(start=56.0, drop=64.81, beats=[65.21, 65.88, 66.58, 67.25, 67.95, 68.65, 69.32, 69.99, 70.69, 71.36, 72.06, 72.76, 73.45, 74.15, 74.85, 75.52, 76.22, 76.89, 77.59, 78.26, 78.96, 79.65, 80.33, 81.02, 81.72, 82.42, 83.11, 83.81, 84.48, 85.18, 85.85, 86.55, 87.24, 87.94, 88.61, 89.31, 90.01, 90.68, 91.38, 92.05, 92.75, 93.42, 94.05, 94.77, 95.49, 96.16, 96.79, 97.42, 98.02, 98.62, 99.32, 99.99, 100.69, 101.36, 102.04, 102.71, 103.43, 104.10, 104.82, 105.50, 106.19, 106.89, 107.54, 108.28, 108.96, 109.63, 110.26, 110.95, 111.67, 112.39, 113.02, 113.74, 114.46, 115.16, 115.85, 116.53, 117.24], step=3, end_card=4.0, intro_src=(5.2, 14.01), phrase=12.0),
  'earth': dict(start=150.0, drop=157.37, beats=[159.88, 160.76, 161.62, 162.50, 163.36, 164.22, 165.10, 165.98, 166.82, 167.68, 168.56, 169.44, 170.30, 171.18, 172.02, 172.90, 173.76, 174.64, 175.50, 176.36, 177.22, 178.10, 178.99, 179.85, 180.70, 181.56, 182.42, 183.28, 184.14, 185.00, 185.91, 186.76, 187.62, 188.51, 189.39, 190.25, 191.11, 191.97, 192.85, 193.73, 194.59, 195.45, 196.31, 197.19, 198.05, 198.91, 199.79, 200.65, 201.51, 202.39, 203.25, 204.13, 204.99, 205.88, 206.73, 207.59, 208.45, 209.33, 210.19, 211.08], step=3, end_card=4.2, intro_src=(5.64, 13.01), phrase=12.0),
}[VER]

# --- les plans : (fichier, début dans la source, cadrage, lieu · crédit). Cadrage : 'v' (vidéo verticale), ('h', x) (horizontale recadrée, x = centre 0..1), 'fit' (entière sur fond flou)
S = {
  'toit_fumee': ('35-new.mp4', 0.5, 'v', 'Paris, place de la République'),
  'hdv': ('04-hotel-de-ville-foule.mp4', 8.0, 'v', 'Paris, Hôtel de Ville'),
  'ambulance': ('32-new.mp4', 7.5, 'v', ''),
  'vaincra': ('10-paris-le-peuple-vaincra-toit.mp4', 2.2, 'v', 'Paris'),
  'marianne_pm': ('05-parismatch-banderole-marianne-lyceens.mp4', 4.0, 'v', 'Paris, place de la République · Paris Match'),
  'statue': ('35-new.mp4', 8.0, 'v', 'Paris, place de la République'),
  'pompiers': ('21-optijournal-pompiers.mp4', 3.0, 'v', 'Paris · @optijournal'),
  'fumi_orange': ('38-new.mp4', 4.5, 'v', 'Paris, périphérique · Paris Match'),
  'mariage': ('08-lyon-mariage-mairie-7e.mp4', 3.0, 'v', 'Lyon · @medaveprod'),
  'chevaliers': ('22-mardieval-chevaliers-tram.mp4', 15.5, 'v', '@mardieval.mtp'),
  'danse': ('06-paris-danse-gilet-jaune-metro.mp4', 10.0, 'v', 'Paris'),
  'mascotte': ('14-lille-mascotte-motards.mp4', 3.0, 'v', 'Lille'),
  'elus': ('37-new.mp4', 6.5, 'v', ''),
  'boulevard': ('09-paris-cortege-boulevard.mp4', 1.5, ('h', 0.5), 'Paris'),
  'periph': ('03-periph-bloque-fourgons.mp4', 7.0, 'v', 'Paris, périphérique'),
  'charge': ('30-new.mp4', 10.6, ('h', 0.5), 'Paris · @LucAuffret'),
  'nation': ('23-parismatch-nation-lyceens.mp4', 9.0, 'v', 'Paris, place de la Nation · Paris Match'),
  'gaz': ('07-confrontfr-gaz-lacrymo.mp4', 10.0, ('h', 0.36), 'Paris · @confrontfr'),
  'lyon_ot': ('13-lyonmag-vitrines-lyon.mp4', 1.0, 'v', 'Lyon, office de tourisme · Lyon Mag'),
  'gaz_arbres': ('35-new.mp4', 12.0, 'v', 'Paris, place de la République'),
  'crs': ('30-new.mp4', 28.0, ('h', 0.5), 'Paris · @LucAuffret'),
  'camion': ('36-new.mp4', 8.8, 'v', ''),
  'pompier_fumi': ('38-new.mp4', 19.0, 'v', 'Paris, périphérique · Paris Match'),
  'brut': ('25-brut-banderole-lycees-delaisses.mp4', 2.0, 'v', 'Paris, place de la République · Brut'),
  'foule_finale': ('35-new.mp4', 19.4, 'v', 'Paris, place de la République'),
}
ORDER = {'winner': ['toit_fumee', 'hdv', 'ambulance', 'vaincra', 'marianne_pm', 'statue', 'pompiers', 'fumi_orange', 'mariage', 'chevaliers', 'danse', 'mascotte', 'elus', 'boulevard',
                    'periph', 'charge', 'nation', 'gaz', 'lyon_ot', 'gaz_arbres', 'crs', 'camion', 'pompier_fumi', 'brut', 'foule_finale'],
         'earth': ['toit_fumee', 'hdv', 'ambulance', 'vaincra', 'marianne_pm', 'statue', 'pompiers', 'fumi_orange', 'periph', 'charge', 'mariage', 'ambulance2', 'nation', 'gaz',
                   'lyon_ot', 'gaz_arbres', 'crs', 'pompier_fumi', 'brut', 'foule_finale']}[VER]
S['ambulance2'] = ('32-new.mp4', 15.0, 'v', '')

# --- le calendrier des plans (temps de la vidéo)
t0 = M['start']; drop = M['drop'] - t0
cuts = [drop] + [b - t0 for b in M['beats'][M['step'] - 1::M['step']] if b - t0 > drop + 2.5]
shots = []
for i, k in enumerate(ORDER):
    a = cuts[i]; b = cuts[i + 1] if i + 1 < len(ORDER) else a + M['end_card']
    shots.append((k, a, b))
TOTAL = shots[-1][2]
print('durée', round(TOTAL, 2), 's ·', len(shots), 'plans')

# --- les textes (une image transparente par plan)
def png(name, draw):
    fr = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); draw(ImageDraw.Draw(fr), ImageDraw.Draw(sh), fr)
    out = Image.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)), fr); p = f'{WORK}/{name}.png'; out.save(p); return p
def txt(d, s, xy, t, f, fill, anchor='la'):
    s.text((xy[0], xy[1] + 3), t, font=f, fill=(0, 0, 0, 220), anchor=anchor); d.text(xy, t, font=f, fill=fill, anchor=anchor)
def banner(d, s, fr):
    t = 'LA COLÈRE DU PEUPLE · 17 OCTOBRE 2026'; w = d.textlength(t, font=f_ban)
    d.rounded_rectangle((540 - w / 2 - 58, 92, 540 + w / 2 + 30, 152), 30, fill=(10, 10, 14, 165)); d.ellipse((540 - w / 2 - 40, 112, 540 - w / 2 - 20, 132), fill=(255, 59, 48, 255))
    d.text((540 - w / 2 + 2, 122), t, font=f_ban, fill=(255, 255, 255, 255), anchor='lm')
    txt(d, s, (540, 176), 'VRAIES IMAGES · VIDÉOS PARTAGÉES SUR LES RÉSEAUX', f_lab, (255, 255, 255, 190), 'ma')
def credit(d, s, c):
    if c: txt(d, s, (60, 1430), c, f_cred, (255, 255, 255, 225))
def endcard(d, s, fr):
    for yy in range(0, H, 6): d.rectangle((0, yy, W, yy + 6), fill=(0, 0, 0, int(150 * min(1, 0.35 + abs(yy - 960) / 1400))))
    txt(d, s, (540, 640), '800 000', f_big, (255, 207, 107, 255), 'ma'); txt(d, s, (540, 780), 'DANS LA RUE SELON LES ORGANISATEURS', f_mid, (255, 255, 255, 255), 'ma')
    txt(d, s, (540, 860), '550 000 SELON LE MINISTÈRE DE L’INTÉRIEUR', f_lab, (255, 255, 255, 215), 'ma')
    txt(d, s, (540, 1040), 'Tu y étais ?', f_sub, (255, 255, 255, 255), 'ma'); txt(d, s, (540, 1120), 'Dis-nous d’où en commentaire.', f_sub, (255, 255, 255, 230), 'ma')
def intro(phrase):
    def f(d, s, fr):
        txt(d, s, (60, 100), 'JUILLET 2018', f_val, (255, 207, 107, 255)); txt(d, s, (62, 186), 'EMMANUEL MACRON · AFFAIRE BENALLA', f_lab, (255, 255, 255, 230))
        txt(d, s, (60, 1430), 'Images : Le HuffPost', f_cred, (255, 255, 255, 200))
        if phrase: txt(d, s, (540, 1560), '« Qu’ils viennent le chercher. »', f_sub, (255, 255, 255, 255), 'ma')
    return f
def first(c):
    def f(d, s, fr):
        banner(d, s, fr); txt(d, s, (540, 800), '17 OCTOBRE', f_big, (255, 255, 255, 255), 'ma'); txt(d, s, (540, 940), '2026 · 8 ANS PLUS TARD', f_mid, (255, 207, 107, 255), 'ma'); credit(d, s, c)
    return f

# --- rendu des morceaux
def seg(i, src, ss, dur, frame, overlay, fade_white=False):
    if frame == 'fit':
        vf = (f"[0:v]fps={FPS},split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=60:3,eq=brightness=-0.42:saturation=0.5[bg];"
              f"[b]scale={W}:-2[fg];[bg][fg]overlay=0:(H-h)/2,setsar=1[v]")
    elif frame == 'v':
        vf = f"[0:v]fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1[v]"
    else:
        cx = frame[1]; vf = f"[0:v]fps={FPS},scale=-2:{H},crop={W}:{H}:'min(max(iw*{cx}-{W // 2},0),iw-{W})':0,setsar=1[v]"
    vf += ";[v][1:v]overlay=0:0" + (",fade=t=in:st=0:d=0.3:color=white" if fade_white else '') + "[o]"
    out = f'{WORK}/s{i:02d}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{ss:.3f}', '-t', f'{dur + 0.2:.3f}', '-i', os.path.join(CLIPS, src), '-i', overlay, '-filter_complex', vf, '-map', '[o]',
                    '-frames:v', str(FRAMES[i]), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', out], check=True)
    return out

# les images de chaque morceau, calées sur la grille des images (pas de dérive)
plan = []
ia, ib = M['intro_src']; ph = M['phrase'] - ia   # l'intro : deux morceaux (avant / pendant la phrase)
plan.append(('02-INTRO-macron-quils-viennent-le-chercher-2018.mp4', ia, 0.0, ph - 0.15, 'fit', png('intro0', intro(False)), False))
plan.append(('02-INTRO-macron-quils-viennent-le-chercher-2018.mp4', ia + ph - 0.15, ph - 0.15, drop, 'fit', png('intro1', intro(True)), False))
for i, (k, a, b) in enumerate(shots):
    src, ss, fr_, c = S[k]
    if i == len(shots) - 1:   # le dernier plan : la foule, puis le bilan chiffré par-dessus
        plan.append((src, ss, a, a + 1.2, fr_, png(f'p{i:02d}a', lambda d, s, f, c=c: (banner(d, s, f), credit(d, s, c))), False))
        plan.append((src, ss + 1.2, a + 1.2, b, fr_, png(f'p{i:02d}b', lambda d, s, f, c=c: (banner(d, s, f), credit(d, s, c), endcard(d, s, f))), False))
        continue
    ov = png(f'p{i:02d}', first(c)) if i == 0 else png(f'p{i:02d}', lambda d, s, f, c=c: (banner(d, s, f), credit(d, s, c)))
    plan.append((src, ss, a, b, fr_, ov, i == 0))
FRAMES = [round(b * FPS) - round(a * FPS) for (_, _, a, b, _, _, _) in plan]
files = [seg(i, src, ss, (b - a), fr_, ov, fw) for i, (src, ss, a, b, fr_, ov, fw) in enumerate(plan)]
open(f'{WORK}/list.txt', 'w').write(''.join(f"file '{os.path.abspath(f)}'\n" for f in files))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{WORK}/list.txt', '-c', 'copy', f'{WORK}/video.mp4'], check=True)

# --- le son : la musique (fondu à la fin), la voix de Macron pendant l'intro (musique baissée dessous)
voice_end = drop
amix = (f"[1:a]atrim=start={ia}:end={ia + voice_end},asetpts=PTS-STARTPTS,afade=t=out:st={voice_end - 0.25}:d=0.25,volume=1.6[voix]")
if NOMUSIC:
    fc = amix + ";[voix]apad[a]"; inputs = ['-i', os.path.join(CLIPS, '02-INTRO-macron-quils-viennent-le-chercher-2018.mp4')]
else:
    fc = (f"[2:a]atrim=start={t0}:end={t0 + TOTAL},asetpts=PTS-STARTPTS,volume='if(lt(t,{voice_end}),0.28,1.0)':eval=frame,afade=t=out:st={TOTAL - 2.5}:d=2.5[mus];" + amix +
          ";[mus][voix]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]")
    inputs = ['-i', os.path.join(CLIPS, '02-INTRO-macron-quils-viennent-le-chercher-2018.mp4'), '-i', MUSIC]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{WORK}/video.mp4', *inputs, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-t', f'{TOTAL:.3f}',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-maxrate', '3500k', '-bufsize', '7000k', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', OUT], check=True)
print('ok', OUT)
json.dump({'shots': [(k, round(a, 2), round(b, 2)) for k, a, b in shots], 'total': TOTAL}, open(f'{WORK}/plan.json', 'w'), indent=1)

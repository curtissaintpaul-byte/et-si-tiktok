"""Montage final de « Merci » (17 octobre 2026). Trois morceaux mis bout à bout :
  1. 0 → 36 s : la 3D (images work/frames-merci/f00000 → f01079), avec par-dessus les PHOTOS D'ARCHIVES (libres de droits,
     Wikimedia Commons) en petites « photos papier » en bas de l'écran, une par époque, avec leur crédit ;
  2. 36 → 52 s : les VRAIES IMAGES du jour (extraits de 2,67 s, logos et filigranes des médias gardés), avec les phrases
     du merci, le bandeau « VRAIES IMAGES » et le crédit de chaque extrait ;
  3. 52 → 60 s : le carton de fin (images f01560 → f01799).
Usage : python3 compose.py <dossier des archives> <dossier des vidéos> <son.wav> <sortie.mp4>"""
import sys, os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ARCH, CLIPS, WAV, OUT = sys.argv[1:5]
W, H = 1080, 1920
WORK = 'work/merci-compose'; os.makedirs(WORK, exist_ok=True)
F = '/tmp/claude-0/-home-claude/63b72741-a4bd-52b7-93f4-2c1523f469c5/scratchpad/fonts'
INTER = '/usr/share/fonts/opentype/inter/'
f_lab = ImageFont.truetype(INTER + 'Inter-SemiBold.otf', 24); f_cap1 = ImageFont.truetype(INTER + 'Inter-SemiBold.otf', 23); f_cap2 = ImageFont.truetype(INTER + 'Inter-Medium.otf', 18)
f_val = ImageFont.truetype(F + '/eb-garamond-latin-500-normal.ttf', 66); f_sub = ImageFont.truetype(F + '/eb-garamond-latin-400-italic.ttf', 62)
f_cred = ImageFont.truetype(INTER + 'Inter-SemiBold.otf', 22)

# --- 1. les photos d'archives : (époque, début, fin, fichier, ligne 1, ligne 2)
T0 = [3.6, 6.26, 8.92, 11.58, 14.24, 16.9, 19.56, 22.22, 24.88, 27.54, 30.2, 33.3, 36.0]
CARDS = [
    (0, '1789.jpg', 'ARCHIVE · LA PRISE DE LA BASTILLE, 1789', 'Peinture anonyme, château de Versailles (domaine public)'),
    (2, '1963.jpg', 'ARCHIVE · WASHINGTON, 28 AOÛT 1963', 'Photo : USIA / National Archives (domaine public)'),
    (3, '1968.jpg', 'ARCHIVE · AFFICHE DE MAI 68', 'Atelier des Beaux-Arts, BnF (domaine public)'),
    (4, '1974.jpg', 'ARCHIVE · LISBONNE, 25 AVRIL 1974', 'Centro de Documentação 25 de Abril (CC BY 4.0)'),
    (6, '1989.jpg', 'ARCHIVE · LEIPZIG, 23 OCTOBRE 1989', 'Bundesarchiv, Bild 183-1989-1023-022 / F. Gahlbeck (CC BY-SA 3.0 DE)'),
    (7, '2006.jpg', 'ARCHIVE · PARIS, 18 MARS 2006', 'Photo : Valéry-Xavier Lentz (CC BY 2.0)'),
    (8, '2011.jpg', 'ARCHIVE · TUNIS, 14 JANVIER 2011', 'Photo : L. Bryant / VOA (domaine public)'),
    (9, '2018.jpg', 'ARCHIVE · PARIS, 15 DÉCEMBRE 2018', 'Photo : Olivier Ortelpa (CC BY 2.0)'),
    (10, '2023.jpg', 'ARCHIVE · PARIS, 19 JANVIER 2023', 'Photo : Sinkra (CC BY-SA 4.0)'),
    (11, '2025.jpg', 'ARCHIVE · NÉPAL, 9 SEPTEMBRE 2025', 'Photo : Himal Subedi (CC BY-SA 4.0)'),
]
def card_png(k, fn, l1, l2):
    im = Image.open(os.path.join(ARCH, fn)).convert('RGB'); mw, mh = 600, 330
    s = min(mw / im.width, mh / im.height); im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    b = 14; cw = max(im.width + 2 * b, 640); ch = im.height + b + 74
    c = Image.new('RGBA', (cw, ch), (246, 243, 236, 255)); c.paste(im, ((cw - im.width) // 2, b))
    d = ImageDraw.Draw(c); d.text((cw // 2, im.height + b + 22), l1, font=f_cap1, fill=(28, 28, 30, 255), anchor='mm'); d.text((cw // 2, im.height + b + 52), l2, font=f_cap2, fill=(95, 95, 100, 255), anchor='mm')
    rot = 2.4 if k % 2 else -2.4; c = c.rotate(rot, resample=Image.BICUBIC, expand=True)
    sh = Image.new('RGBA', c.size, (0, 0, 0, 0)); sh.paste((0, 0, 0, 150), mask=c.split()[3]); sh = sh.filter(ImageFilter.GaussianBlur(14))
    fr = Image.new('RGBA', (W, H), (0, 0, 0, 0)); x, y = (W - c.width) // 2, 1600 - c.height // 2
    fr.alpha_composite(sh, (x + 8, y + 14)); fr.alpha_composite(c, (x, y)); p = f'{WORK}/card{k:02d}.png'; fr.save(p); return p

# --- 2. les vraies images : (fichier, début dans la vidéo source, crédit)
REAL = [
    ('30750b4c-v26044gc0000db9mus7og65mgan804qg.mp4', 17.5, 'Images : Paris Match · Paris, place de la République'),
    ('3e5512a5-v26044gc0000db9lc7vog65m9nmbfse0.mp4', 3.0, 'Images : @optijournal · les pompiers, Paris'),
    ('970fe9a5-SaveTwitter.Net_9rxjNp5cZzTUuQIr_852p.mp4', 15.5, 'Images : @mardieval.mtp'),
    ('b398b141-v26044gc0000db2i70vog65hah4s8580.mp4', 0.3, 'Images : Paris Match · Paris, place de la Nation'),
    ('9b619953-v24025gl0000db76bpfog65k2bd6udsg.mp4', 43.0, 'Images : actu.fr · Rennes, 13 octobre'),
    ('4855560b-v26044gc0000db9kc7fog65hj02p2tbg.mp4', 2.0, 'Images : Brut · Paris, place de la République'),
]
SEG = 16.0 / len(REAL)
SUBS = [(0.3, 2.9, 'Toutes n’ont pas gagné tout de suite. Mais aucune n’a été inutile.'), (3.1, 5.9, 'Aujourd’hui, c’est vous qui êtes dans la rue.'),
        (6.1, 8.9, 'Et vous avez raison de vous faire entendre.'), (9.1, 12.2, 'Chaque été, en congés, on dit merci à ceux de 1936.'),
        (12.4, 15.8, 'Un jour, nos enfants vous diront merci à vous aussi.')]
def wrap(d, txt, font, width):
    words, lines, cur = txt.split(), [], ''
    for w_ in words:
        t = (cur + ' ' + w_).strip()
        if d.textlength(t, font=font) > width and cur: lines.append(cur); cur = w_
        else: cur = t
    return lines + [cur]
def text_png(name, draw_fn):
    fr = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(fr), ImageDraw.Draw(sh))
    sh = sh.filter(ImageFilter.GaussianBlur(9)); out = Image.alpha_composite(sh, fr); p = f'{WORK}/{name}.png'; out.save(p); return p
def sub_png(i, txt):
    def f(d, s):
        y = 1545
        for ln in wrap(d, txt, f_sub, 820):
            s.text((540, y + 3), ln, font=f_sub, fill=(0, 0, 0, 230), anchor='ma'); d.text((540, y), ln, font=f_sub, fill=(255, 255, 255, 255), anchor='ma'); y += 72
    return text_png(f'sub{i}', f)
def head_png():
    def f(d, s):
        for yy in range(1380, 1920, 4): d.rectangle((0, yy, W, yy + 4), fill=(0, 0, 0, int(165 * min(1, (yy - 1380) / 360))))   # (un voile sombre en bas, pour lire les phrases)
        d.ellipse((62, 96, 80, 114), fill=(255, 59, 48, 255)); s.text((92, 92), 'VRAIES IMAGES · OCTOBRE 2026', font=f_lab, fill=(0, 0, 0, 255))
        d.text((92, 92), 'VRAIES IMAGES · OCTOBRE 2026', font=f_lab, fill=(255, 255, 255, 235))
        s.text((60, 124), 'VOUS, DANS LA RUE', font=f_val, fill=(0, 0, 0, 255)); d.text((60, 124), 'VOUS, DANS LA RUE', font=f_val, fill=(255, 207, 107, 255))
    return text_png('head', f)
def cred_png(i, txt):
    def f(d, s):
        s.text((62, 1840), txt, font=f_cred, fill=(0, 0, 0, 255)); d.text((62, 1840), txt, font=f_cred, fill=(255, 255, 255, 220))
    return text_png(f'cred{i}', f)

PARTS = os.environ.get('PARTS', '1234')
def run(cmd, part):
    if part in PARTS: print('morceau', part, '…'); subprocess.run(cmd, check=True)
# morceau 1 : la 3D + les archives
cards = [(T0[k] + 0.3, T0[k + 1] - 0.28, card_png(k, fn, l1, l2)) for k, fn, l1, l2 in CARDS]
inp = ['-framerate', '30', '-start_number', '0', '-i', 'work/frames-merci/f%05d.jpg']
fc, last = [], '0:v'
for i, (a, b, p) in enumerate(cards):
    inp += ['-i', p]   # (une seule image : overlay la répète tout seul)
    fc.append(f'[{last}][{i + 1}:v]overlay=0:0:enable=\'between(t,{a:.2f},{b:.2f})\'[v{i}]'); last = f'v{i}'
run(['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-frames:v', '1080', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', f'{WORK}/p1.mp4'], '1')
# morceau 2 : les vraies images
inp, fc = [], []
for i, (fn, ss, cr) in enumerate(REAL):
    inp += ['-ss', str(ss), '-t', f'{SEG + 0.1:.3f}', '-i', os.path.join(CLIPS, fn)]
    fc.append(f'[{i}:v]fps=30,scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,trim=duration={SEG:.4f},setpts=PTS-STARTPTS[r{i}]')
fc.append(''.join(f'[r{i}]' for i in range(len(REAL))) + f'concat=n={len(REAL)}:v=1:a=0[real]')
over = [(0, 16, head_png())] + [(a, b, sub_png(i, t)) for i, (a, b, t) in enumerate(SUBS)] + [(i * SEG, (i + 1) * SEG, cred_png(i, cr)) for i, (fn, ss, cr) in enumerate(REAL)]
last, n0 = 'real', len(REAL)
for j, (a, b, p) in enumerate(over):
    inp += ['-i', p]
    fc.append(f'[{last}][{n0 + j}:v]overlay=0:0:enable=\'between(t,{a:.2f},{b:.2f})\'[w{j}]'); last = f'w{j}'
fc.append(f'[{last}]fade=t=in:st=0:d=0.25:color=white[out]')
run(['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[out]', '-frames:v', '480', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', f'{WORK}/p2.mp4'], '2')
# morceau 3 : le carton de fin
run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-start_number', '1560', '-i', 'work/frames-merci/f%05d.jpg', '-frames:v', '240', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', f'{WORK}/p3.mp4'], '3')
# assemblage + son, encodage pour TikTok (≤ ~29 Mo)
open(f'{WORK}/list.txt', 'w').write(''.join(f"file '{os.path.abspath(f'{WORK}/p{k}.mp4')}'\n" for k in (1, 2, 3)))
run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{WORK}/list.txt', '-i', WAV, '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '3300k', '-bufsize', '6600k',
     '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', OUT], '4')
print('ok', OUT)

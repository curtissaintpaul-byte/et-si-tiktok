"""Retouche d'une vidéo déjà fabriquée (27/10/2026), sans refaire la 3D.
Elle ajoute les 3 moments « Faire réagir le public » choisis par Curtis :
  1) l'accroche choc : 1,5 s de l'image la plus forte, avec la question par-dessus, collées au tout début ;
  2) la question à choix au milieu : un bandeau de 3,5 s (« Toi, tu fais quoi ? 1 = … / 2 = … ») ;
  3) la fin : « Abonne-toi pour le prochain Et si » sur l'écran noir final.
Comme coller des autocollants sur une photo déjà imprimée : la vidéo d'origine ne change pas, on ajoute par-dessus.

Usage : python3 retro.py entree.mp4 sortie.mp4 reglages.json
reglages.json : {"hook_at": 45.6, "hook_dur": 1.5, "title": "Et si la Terre *s'arrêtait* de tourner ?",
                 "mid_at": 24.0, "q": "Toi, tu fais quoi ?", "a1": "…", "a2": "…", "end_at": 49.8}
(le mot entre étoiles est écrit en doré, comme dans le titre des vidéos)"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
ACCENT = (255, 207, 107)
INTER = '/usr/share/fonts/opentype/inter/Inter-{}.otf'
font = lambda w, s: ImageFont.truetype(INTER.format(w), s)


def words(text):
    """« Et si la Terre *s'arrêtait* de tourner ? » → [(mot, doré ?), …]"""
    out, hot = [], False
    for w in text.split(' '):
        h = hot or w.startswith('*')
        if w.startswith('*'): hot = True
        if w.endswith('*') or w.endswith('*?'): hot = False
        out.append((w.replace('*', ''), h))
    # le « ? » ne part jamais seul à la ligne
    merged = []
    for w, h in out:
        if w in ('?', '!', ':') and merged: merged[-1] = (merged[-1][0] + ' ' + w, merged[-1][1]); continue
        merged.append((w, h))
    return merged


def wrap(ws, f, maxw, d):
    lines, cur = [], []
    for w in ws:
        test = ' '.join(x for x, _ in cur + [w])
        if cur and d.textlength(test, font=f) > maxw: lines.append(cur); cur = [w]
        else: cur.append(w)
    if cur: lines.append(cur)
    return lines


def shadowed(layer_fn, blur=10, alpha=150):
    """Dessine le texte avec une ombre douce (comme le text-shadow des vidéos)."""
    txt = Image.new('RGBA', (W, H)); layer_fn(ImageDraw.Draw(txt), shadow=False)
    sh = Image.new('RGBA', (W, H)); layer_fn(ImageDraw.Draw(sh), shadow=True)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    a = sh.getchannel('A').point(lambda v: min(255, v * alpha // 255)); sh.putalpha(a)
    return Image.alpha_composite(sh, txt)


def title_png(text, path):
    f = font('ExtraBold', 76); d0 = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    lines = wrap(words(text), f, 900, d0); lh = 85; y0 = 520 - len(lines) * lh // 2
    def draw(d, shadow):
        for i, ln in enumerate(lines):
            full = ' '.join(w for w, _ in ln); x = 500 - d.textlength(full, font=f) / 2; y = y0 + i * lh
            for w, hot in ln:
                d.text((x, y), w, font=f, fill=(0, 0, 0, 255) if shadow else ((*ACCENT, 255) if hot else (255, 255, 255, 255)))
                x += d.textlength(w + ' ', font=f)
    im = Image.new('RGBA', (W, H))
    g = Image.new('L', (1, H))  # voile sombre en haut pour la lisibilité
    for y in range(H): g.putpixel((0, y), int(140 * max(0, 1 - abs(y - 520) / 420)))
    im.paste((0, 0, 0, 255), (0, 0, W, H), g.resize((W, H)))
    Image.alpha_composite(im, shadowed(draw, 12, 200)).save(path)


def mid_png(q, a1, a2, path):
    fq, fa, fs = font('SemiBold', 30), font('ExtraBold', 50), font('SemiBold', 22)
    d0 = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    rows = []
    for lab, txt in (('1', a1), ('2', a2)):
        for j, ln in enumerate(wrap([(w, False) for w in txt.split(' ')], fa, 700, d0)):
            rows.append((lab if j == 0 else '', ' '.join(w for w, _ in ln)))
    hgt = 70 + 62 * len(rows) + 64; x0, x1 = 60, 940; yc = 1520; y0 = yc - hgt // 2
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((x0, y0, x1, y0 + hgt), 30, fill=(12, 14, 20, 200), outline=(*ACCENT, 230), width=3)
    d.text((500, y0 + 26), q.upper(), font=fq, fill=(*ACCENT, 255), anchor='mt')
    y = y0 + 78
    for lab, txt in rows:
        if lab:
            d.rounded_rectangle((x0 + 38, y + 4, x0 + 92, y + 58), 14, fill=(*ACCENT, 255))
            d.text((x0 + 65, y + 31), lab, font=fa, fill=(12, 14, 20, 255), anchor='mm')
        d.text((x0 + 116, y + 2), txt, font=fa, fill=(255, 255, 255, 255)); y += 62
    d.text((500, y + 14), 'RÉPONDS EN COMMENTAIRE', font=fs, fill=(255, 255, 255, 190), anchor='mt')
    im.save(path)


def end_png(path):
    f, f2 = font('ExtraBold', 48), font('SemiBold', 24)
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((250, 1330, 830, 1420), 45, fill=(*ACCENT, 255))
    d.text((540, 1375), 'Abonne-toi', font=f, fill=(12, 14, 20, 255), anchor='mm')
    d.text((540, 1462), 'POUR LE PROCHAIN « ET SI »', font=f2, fill=(241, 237, 228, 220), anchor='mt')
    im.save(path)


def main():
    src, out, cfg = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
    A, HD = cfg['hook_at'], cfg.get('hook_dur', 1.5)
    tmp = tempfile.mkdtemp(prefix='retro-')
    title_png(cfg['title'], f'{tmp}/t.png'); mid_png(cfg.get('q', 'Toi, tu fais quoi ?'), cfg['a1'], cfg['a2'], f'{tmp}/m.png'); end_png(f'{tmp}/e.png')
    M0, M1, E0 = HD + cfg['mid_at'], HD + cfg['mid_at'] + 3.5, HD + cfg['end_at'] + 0.6
    fc = ';'.join([
        '[0:v]split[v1][v2]', '[0:a]asplit[a1][a2]',
        f'[v1]trim=start={A}:duration={HD},setpts=PTS-STARTPTS[hv]', '[hv][1:v]overlay=0:0[hvt]',
        f'[a1]atrim=start={A}:duration={HD},asetpts=PTS-STARTPTS,afade=t=in:d=0.05,afade=t=out:st={HD - 0.12:.2f}:d=0.12[ha]',
        '[v2]setpts=PTS-STARTPTS[mv]', '[a2]asetpts=PTS-STARTPTS[ma]',
        '[hvt][ha][mv][ma]concat=n=2:v=1:a=1[cv][ca]',
        f"[cv][2:v]overlay=0:0:enable='between(t,{M0:.2f},{M1:.2f})'[c2]",
        f"[c2][3:v]overlay=0:0:enable='gte(t,{E0:.2f})'[ov]"])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-i', f'{tmp}/t.png', '-i', f'{tmp}/m.png', '-i', f'{tmp}/e.png',
                    '-filter_complex', fc, '-map', '[ov]', '-map', '[ca]', '-r', '30',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '3300k', '-bufsize', '6600k', '-pix_fmt', 'yuv420p',
                    '-profile:v', 'high', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], check=True)
    print('ok', out)


if __name__ == '__main__':
    main()

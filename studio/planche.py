"""Planche contact : python3 planche.py sortie.jpg largeur img1 img2 …  (6 par rangée)"""
import sys
from PIL import Image
out, w, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
h = round(w * ims[0].height / ims[0].width)
per = min(6, len(ims)); rows = (len(ims) + per - 1) // per
sheet = Image.new('RGB', (per * w, rows * h), 'black')
for i, im in enumerate(ims): sheet.paste(im.resize((w, h), Image.LANCZOS), ((i % per) * w, (i // per) * h))
sheet.save(out, quality=88); print('ok', out)

"""« Merci », version 100 % 3D (18/10/2026, après le masquage « contenu sensible » de TikTok sur les vidéos à vraies images) :
toute la vidéo vient de la 3D (work/frames-merci3d, la fin se passe sur la place de la Bastille en 2026), avec par-dessus
les photos d'archives libres de droits (sauf celle de 2023, où l'on voit un fumigène rouge).
Usage : python3 compose3d.py <son.wav> <sortie.mp4>"""
import sys, subprocess
WAV, OUT = sys.argv[1:3]
T0 = [3.6, 6.26, 8.92, 11.58, 14.24, 16.9, 19.56, 22.22, 24.88, 27.54, 30.2, 33.3, 36.0]
KEEP = [0, 2, 3, 4, 6, 7, 8, 9, 11]   # (les époques qui ont une photo ; la 10, 2023, est retirée)
inp = ['-framerate', '30', '-start_number', '0', '-i', 'work/frames-merci3d/f%05d.jpg']
fc, last = [], '0:v'
for i, k in enumerate(KEEP):
    a, b = T0[k] + 0.3, T0[k + 1] - 0.28
    inp += ['-i', f'work/merci-compose/card{k:02d}.png']
    fc.append(f"[{last}][{i + 1}:v]overlay=0:0:enable='between(t,{a:.2f},{b:.2f})'[v{i}]"); last = f'v{i}'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inp, '-i', WAV, '-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', f'{len(KEEP) + 1}:a', '-frames:v', '1800',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '3300k', '-bufsize', '6600k', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', OUT], check=True)
print('ok', OUT)

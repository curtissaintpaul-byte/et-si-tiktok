"""Bande-son « Et si le 17 octobre changeait tout ? » : voir histoire_snd.py (commune aux vidéos 3 et 4)."""
import sys
sys.path.insert(0, '../..')
from histoire_snd import render

render(sys.argv[1], sys.argv[2], mode='tout')

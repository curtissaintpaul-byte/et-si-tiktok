"""Bande-son « Et si le 17 octobre ne changeait rien ? » (version 2) : voir avenir_snd.py (commune aux vidéos 3 et 4)."""
import sys
sys.path.insert(0, '../..')
from avenir_snd import render

render(sys.argv[1], sys.argv[2], mode='rien')

# ajoute les vignettes (insets.js) à un épisode : import + création + appel après HUD.subs
import sys, re
ep = sys.argv[1]; p = f'episodes/{ep}/scene.js'; s = open(p).read()
if 'makeInsets' in s: print('déjà fait'); sys.exit()
lines = s.split('\n')
last_imp = max(i for i, l in enumerate(lines) if l.startswith('import '))
lines.insert(last_imp + 1, "import { makeInsets } from '../../lib-insets.js';\nimport { INSETS } from './insets.js';")
s = '\n'.join(lines)
a = 'export default async function () {\n'
assert s.count(a) == 1
s = s.replace(a, a + '  const insets = makeInsets();   // les vignettes (autres lieux, archives, schémas)\n')
a = '    HUD.subs(t, SUBS);'
assert s.count(a) == 1
s = s.replace(a, a + '\n    insets.draw(t, INSETS);')
open(p, 'w').write(s); print('ok', ep)

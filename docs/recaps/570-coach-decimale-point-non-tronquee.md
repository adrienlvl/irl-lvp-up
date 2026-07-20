# #570 — Coach : une décimale à point n'est plus tronquée (nombre FAUX sur la carte)

**Build 2.0.193** · domaine `coach` · demande de nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).
Fichiers : `src/lib/logic.js` (`splitCoachSentences` ~l. 9715), `src/test/logic.test.js`,
`CHANGELOG` (logic.js) + les 2 assertions `CHANGELOG[0].v` (logic.test.js + renderer-smoke.cjs).

## Pourquoi cette itération est du `coach` (rotation §4 bis vérifiée)

`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` → `robustesse · athlete · a11y · coach ·
etudes`. Les **2 derniers** recaps (par mtime) = `robustesse` (#569) et `athlete` (#568) ; `coach`
(#567) **n'y est pas** et n'apparaît **qu'une fois** dans les 5 derniers → la rotation §4 bis
**autorise `coach`** cette boucle. La priorité de nuit (DEMANDES.md) pointe le coaching adaptatif ;
§3 rappelle que la rotation prime même sur elle — ici elle ne bloque pas, les deux convergent.

## Le défaut réel (attrapé en RENDU CHARGÉ, §4ter — « vert ≠ bon »)

La chasse #561 est close ; j'ai donc repris une **lecture chargée** d'`adaptiveCoachFocus` comme prévu.
État sommeil urgent réaliste (7 nuits ~5,3 h + couchers dispersés, semaine précédente ~6,9 h → pente
en baisse). Insight brut = **322 c**, donc au-delà du budget de carte → la carte passe par
`splitCoachInsight` → `orderCoachNotes` → `splitCoachSentences`. Sortie observée :

```
INSIGHT BRUT : Sommeil court et coucher irrégulier (moy. 5.3 h, coucher variant de ~99 min…)…
CARTE (ordonné) : Sommeil court et coucher irrégulier (moy. 3 h, coucher variant de ~99 min…)…
```

**« moy. 5.3 h » devenait « moy. 3 h » sur la carte** — un **nombre FAUX** affiché à Adrien. La cause :
`splitCoachSentences` découpait avec `String(text).match(/[^.!?]+[.!?]+(?:\s+|$)/g)`. `[^.!?]+`
s'arrête à **chaque** point, y compris celui **interne** à la décimale « 5.3 ». Comme ce point n'est
**pas suivi d'un espace**, la capture suivante de `match()` ne redémarrait qu'à « 3 h » — le fragment
« 5. » **tombait dans le trou entre deux captures et était PUREMENT PERDU** (`match()` ne renvoie que
les portions capturées, jamais les intervalles). Le `.rejoin` par parenthèses ouvertes recollait les
morceaux **captués**, mais ne pouvait pas ressusciter un morceau **jeté**.

Ampleur mesurée (script jetable, avant fix) — dès qu'une note porte une décimale à **point** :

```
'Sommeil court (moy. 5.3 h, écart 1.5 h) — stabilise.' → ['Sommeil court (moy. 5 h) — stabilise.']
'Tu dors 5.3 h en moyenne. Garde le cap.'             → ['3 h en moyenne.', 'Garde le cap.']  ← tête escamotée
'Ta charge est à 2.3x ton volume. …'                  → ['3x ton volume.', …]
'Ton 1RM estimé stagne à 92.5 kg …'                   → ['5 kg depuis 3 séances.', …]
```

Le cas le plus courant en vrai : le **verdict de `sleepCoachInsight`** écrit « moy. `${week.avg}` h »
avec un **point** (non converti en virgule, contrairement aux notes de pente qui passent par `numH`
→ virgule). Donc chaque fois que le bilan sommeil arrive sur une carte résumée, la moyenne était
tronquée.

## Le correctif (découpage sans perte, aucun contenu ajouté ni retiré)

`splitCoachSentences` ne s'appuie plus sur `match()` (lossy). Une **frontière** = un ou plusieurs
`.!?` **suivis d'un espace ou de la fin** (`/[.!?]+(?=\s|$)/g`) : un point collé à un chiffre
(« 5.3 ») n'en est **pas** une, et on **tranche par offsets** (`str.slice(last, end)`) en poussant
aussi le **reliquat** sans terminateur → **aucun caractère n'est jamais jeté**. La boucle de recollage
(parenthèse ouverte / suite sans majuscule) est **inchangée** : « (moy. 5 h… » et « ~69 min. d'un
soir » restent bien une seule phrase. Purement de la **curation au rendu** (§3) : on répare un contenu
existant qui affichait un **nombre inexact**, on n'ajoute aucune note.

## Vérif (§4ter, rendu réel)

Après fix, le même état chargé rend « moy. **5.3 h** » sur la carte ; les 4 cas ci-dessus sont
préservés intégralement (décimale + tête de phrase). Deux tests de régression ajoutés au bloc
`splitCoachSentences` (décimale préservée, tête non escamotée) + une assertion `orderCoachNotes`
(« moy. 5.3 h » survit au reclassement). `cd src && xvfb-run -a npm run verify` → **528 tests +
smoke, exit 0** (`coachFocus`/`coachCuration`/`whatsNew` verts).

## Pistes coach restantes

La chasse #561 reste close. Prochaine boucle `coach` : continuer la lecture chargée de rendus réels
(§4ter) — c'est ce contrôle, pas la suite verte, qui a exposé ce nombre faux invisible en test unitaire.

Domaine : coach

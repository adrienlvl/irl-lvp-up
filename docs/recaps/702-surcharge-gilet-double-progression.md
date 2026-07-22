# 702 — Athlète spécialisé (2/4) : surcharge au gilet (double progression) (2.0.301)

## Contexte

Suite de « fait tout » (4 features calisthéniques). #2 : la **surcharge progressive au gilet lesté** — l'équivalent
de la double progression, version poids du corps + gilet.

## Le changement — feature `vestProgression`

- **Logique pure** (`lib/logic.js`, exportée) : `vestProgression(workouts, {repMax=10, increment=2,5})`. Pour chaque
  mouvement de calisthénie fait **avec du lest** (`VEST_MOVES` : tractions/pompes/dips, `load>0`), repère la
  meilleure série lestée (la plus lourde, puis + de reps) et applique la **double progression** :
  - `reps < repMax` → **`addReps`** : « gagne des reps jusqu'à 10 propres (1-2 en réserve) avant d'alourdir ».
  - `reps ≥ repMax` → **`addWeight`** : « ajoute du lest, passe à +X kg et redescends vers 6-10 reps ».
  - Renvoie `{key,label,emoji,load,reps,repMax,nextLoad,action,advice}` par mouvement. **Ignore les séries au
    poids du corps** (rien à surcharger sans lest).
- **Rendu** (`app.js` `renderVestProgression`, sous les Standards de force) : bloc `#vestProgression` — par
  mouvement lesté, une ligne conseil (le cas `addWeight` surligné lime). Ne s'affiche que si tu t'entraînes lesté.
- **CSS** (`pages.css`) : `.vest-progression` / `.vp-row`.

## Non-régression

- Test node dédié (meilleure série lestée = la plus lourde puis + de reps ; `addReps` sous le rep-max ;
  `addWeight` au-dessus ; poids du corps ignoré ; `repMax` personnalisable ; garde-fous null/[]). Check smoke
  **bloquant `vestProg`** (série lestée → conseil, poids du corps ignoré ; includes only). **593 tests + SMOKE OK.**

## Suite (reste 2/4)

3. Objectif de skill guidé (programme progressif vers un skill précis). 4. Holds isométriques (secondes).

Domaine : athlete

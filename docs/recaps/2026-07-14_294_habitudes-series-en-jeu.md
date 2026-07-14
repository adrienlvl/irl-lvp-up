# #294 — Habitudes : alerte « série en jeu » (1.9.228)

**Rotation 21 · item #3 · liberté totale (domaine : habitudes)**

## Problème
Chaque habitude affichait sa série (🔥) et son record (🏆) **dans sa propre
ligne**, noyée dans la liste. Rien ne remontait le fait qu'une série de plusieurs
jours **allait tomber ce soir** si l'habitude n'était pas validée. Or c'est
précisément le moment où un rappel a de la valeur : `habitStreak` est tolérant au
jour en cours (une habitude prévue aujourd'hui mais pas encore faite garde sa
série) — la série tient encore, mais elle est en sursis.

## Amélioration
Une bannière au-dessus du résumé liste les **séries en jeu aujourd'hui**.

### Logique pure — `habitsAtRisk(habits, todayKey, minStreak)`
- Repart de `habitsForDay` : habitudes **prévues ce jour**.
- Garde celles **non faites** et portant une série ≥ `minStreak` (défaut 2).
- Trie par série décroissante, puis par nom.
- `[]` si tout est validé, si rien n'est prévu, ou si la clé/liste est invalide.

### Rendu — dans `renderHabits()`
- Bannière `#habitsAtRisk` (liseré orange) : « Séries en jeu aujourd'hui :
  🔥 Lecture 20 min **4 j** · 🔥 Étirements **2 j** » + « Valide-les avant ce soir
  pour ne pas casser ta série. »
- Masquée dès qu'il n'y a plus rien en jeu.

## Tests
- `logic.test.js` : tri par série décroissante ; exclusion des habitudes déjà
  faites, des séries sous le seuil, et des jours non programmés (weekdays) ;
  seuil `minStreak` paramétrable ; clé invalide / `null` → `[]`.
- `renderer-smoke.cjs` : check `habitsAtRisk` (présence `#habitsAtRisk` + calcul).
- `npm run verify` : **317 tests + SMOKE OK** (`whatsNew` vert).
- Vérif navigateur, les deux états :
  - 3 habitudes dont 1 déjà faite → « Séries en jeu aujourd'hui : 🔥 Lecture
    20 min 4 j · 🔥 Étirements 2 j » (« Eau », validée, bien exclue). ✔
  - toutes validées → bannière masquée, résumé « 3/3 — parfait ✨ ». ✔

## Fichiers
- `src/lib/logic.js` — `habitsAtRisk()` + export + CHANGELOG[0] 1.9.228.
- `src/app.js` — bannière dans `renderHabits()`.
- `src/index.html` — `#habitsAtRisk` après `#habitList`.
- `src/extras.css` — `.habits-at-risk` (+ `.har-label`, `.har-chip`).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

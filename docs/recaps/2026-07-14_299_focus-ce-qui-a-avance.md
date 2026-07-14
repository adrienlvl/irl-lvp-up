# #299 — Focus : « ce qui a avancé » réaffiché (1.9.233)

**Rotation 22 · item #4 (CLÔTURE) · piste « trous » — le cas le plus pur**

## Problème
Audit de `state.focusReviews` (`{id, sessionId, date, outcome, next}`, 300 conservés).
Après **chaque bloc de focus terminé**, une modale demande deux phrases :

> « Ce qui a avancé » · « Prochaine action »

Verdict du grep sur tout le code source (`*.js`, `*.html`) :

| champ | occurrences | verdict |
|---|---|---|
| `next` | lu dans `#focusStats` et `#morningBridge` | ✅ surfacé |
| `outcome` | **3 occurrences, TOUTES dans le handler de sauvegarde** (ligne 508) | ❌ **write-only** |

Les trois occurrences d'`outcome` sont : lire l'input, tester s'il est vide, le
pousser dans le state. **Aucun chemin de lecture. Nulle part.** C'est le trou le
plus net de la série : les précédents (#296 `win`, #297 `lesson`) avaient au moins
un `.value=` de repeuplement — `outcome` n'a strictement rien.

Adrien décrit ce qu'il a accompli après chaque session de deep work, l'app le
stocke fidèlement, et ne le lui montre jamais.

## Amélioration
Dans le panneau Focus, un bloc « 🧠 Ce que tes blocs de focus ont fait avancer ».

### Logique pure — `recentFocusOutcomes(reviews, todayKey, opts)`
Deux différences assumées avec les notes du rituel du soir :
- **Plusieurs blocs par jour** sont possibles → **pas de dédup par date** ; à date
  égale, l'`id` le plus grand (bloc le plus récent) passe devant.
- **Le jour courant est INCLUS** — contrairement à `win`/`lesson`, rien ne
  réaffichait les outcomes du jour non plus.

Filtre les `outcome` non vides (après `trim`), fenêtre `days = 30`, `cap = 6`.
Renvoie `[{ date, outcome, daysAgo }]`, `[]` si entrées invalides.

## Tests
- `logic.test.js` : deux blocs le même jour tous deux retenus et ordonnés par `id`
  décroissant ; jour courant inclus (`daysAgo === 0`) ; `trim` ; exclusion des
  `outcome` vides / absents / hors fenêtre / dates invalides ; `cap` et `days`.
- `renderer-smoke.cjs` : check `focusOutcomes`.
- `npm run verify` : **323 tests + SMOKE OK** (`whatsNew` vert).
- Vérif navigateur (5 reviews dont 2 le même jour et 1 vide) :
  « Exercices du chap. 3 corrigés — aujourd'hui », « Fiche de révision TVA écrite
  — aujourd'hui », « Chapitre 2 de compta relu — hier », « Plan de la présentation
  prêt — il y a 4 j ». Les deux blocs du jour sortent bien tous les deux. ✔

## Fichiers
- `src/lib/logic.js` — `recentFocusOutcomes()` + export + CHANGELOG[0] 1.9.233.
- `src/app.js` — bloc dans `renderFocusRitual()`.
- `src/index.html` — `#focusOutcomes` après `#focusHeatmap`.
- `src/polish.css` — `.focus-outcomes`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Clôture rotation 22
Rotation entièrement consacrée à la piste des « trous », 4/4 :
#296 victoires · #297 leçons · #298 énergie du matin · #299 « ce qui a avancé ».
→ **tag `v1.9.233` + push (auto-publish)**.

## Piste à continuer
Reste `morningRituals[].intention` (trou texte confirmé — chercher un angle non
répétitif), les quêtes non faites, le bien-être planifié non fait, `state.photos`.

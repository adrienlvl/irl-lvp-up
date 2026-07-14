# #304 — Séance guidée : ajouter/retirer une série à la volée (1.9.238)

**Rotation 24 · item #1 · priorité Adrien : les séances guidées**

## Le manque — un vrai blocage fonctionnel
`guidedSetLogs(current)` reconstruit **systématiquement** les lignes de séries à
exactement `current.sets` :

```js
const total = Math.max(1, Number(current.sets) || 1);
current.setLogs = Array.from({ length: total }, (_, i) => ({ ...previous[i], ... }));
```

…et **aucun contrôle** dans le dialogue guidé ne permettait de changer ce nombre
(grep sur `index.html` : seul `#guidedSetLog` existe, pas de bouton d'ajustement).

Conséquence concrète : le nombre de séries est **figé par la prescription**. Si
Adrien se sent fort et veut une 4ᵉ série, il **ne peut pas** la loguer. S'il est
cuit et veut en retirer une, non plus. Même en poussant une entrée dans `setLogs`,
le rendu suivant la tronquait.

C'est plus fondamental qu'une alerte de record (l'autre piste, gardée pour #305) :
ici il s'agit de pouvoir enregistrer ce qu'on a **réellement fait**.

## Amélioration
Deux boutons **−** / **+** dans l'en-tête « Séries du jour ».

### Logique pure — `adjustGuidedSets(exercise, delta, opts)`
- Bornes : `min = 1`, `max = 8` (paramétrables).
- **Refuse de retirer une série DÉJÀ VALIDÉE** → ce serait jeter du travail fait
  sans le dire. Renvoie `reason: 'completed'` et l'app affiche un toast explicite.
- Renvoie `{ sets, changed, reason }` avec
  `reason ∈ 'added' | 'removed' | 'min' | 'max' | 'completed' | 'noop'`.
- `null` si l'exercice est invalide ; `sets` hors bornes en entrée est ramené dans
  les bornes avant ajustement.

### Câblage
Handler sur `#guidedSetLog` : `saveGuidedExercise()` d'abord (pour ne pas perdre la
saisie en cours), puis ajustement, troncature des `setLogs` si réduction, retour
haptique, re-rendu. Les refus déclenchent un toast au lieu d'échouer en silence.

## Tests
- `logic.test.js` : ajout, retrait, **refus sur série validée**, bornes min/max,
  bornes personnalisées, delta nul, `sets` absent → traité comme 1, `sets` hors
  bornes, exercice invalide → `null`.
- `renderer-smoke.cjs` : check `guidedSetsAdjust`.
- `npm run verify` : **330 tests + SMOKE OK**.
- **Vérif navigateur en cliquant réellement les boutons** dans une vraie séance
  guidée : 3 → 4 → 5 séries (+), 5 → 4 (−), puis dernière série validée et tentative
  de retrait → **refusée**, compte inchangé, toast « Cette série est déjà validée —
  décoche-la d'abord pour la retirer. » ✔

## Fichiers
- `src/lib/logic.js` — `adjustGuidedSets()` + export + CHANGELOG[0] 1.9.238.
- `src/app.js` — boutons dans l'en-tête + handler sur `#guidedSetLog`.
- `src/companion.css` — `.gs-adjust` (cibles tactiles 42 px sur mobile).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Suite de la rotation 24 (séances guidées)
- #305 : alerte **record battu pendant la séance** (`newRecords` existe mais n'est
  utilisé qu'à l'enregistrement — le PR est donc annoncé trop tard).
- Pistes restantes à vérifier : effort/RPE par série, remplacer un exercice à la
  volée, sparkline de progression de l'exercice dans le dialogue guidé.

# #670 — Run vide documenté : piste robustesse « dates impossibles » réservée (pas de commit code)

**Date** : 2026-07-22 · **Build** : inchangé (2.0.275) · **Pas de bump, pas de code produit.**

## Pourquoi un run vide

Mission de nuit (ROADMAP « 🌙 DÉMARRAGE VPS ») = **non-visuel** : robustesse / tests / a11y non-visuelle
/ contenu. Contrôle de rotation §4 bis.3 sur les **5 derniers recaps** :

| recap | domaine |
|-------|---------|
| #669  | coach |
| #668  | robustesse |
| #667  | athlete |
| #666  | coach |
| #665  | tests |

→ **Bloqués (2 derniers)** : `coach`, `robustesse`. **Bloqué (2× sur 5)** : `coach`. Domaines libres :
`athlete` (1×), `tests` (1×), et tous les absents (`nutrition`, `sommeil`, `focus`, `agenda`, `etudes`,
`a11y`, `fondations`, `docs`).

Quota de propositions §4 bis.4 : **satisfait** (#663 est une proposition, dans les 10 derniers) → pas
d'obligation de proposition ce tour.

## Ce que j'ai cherché dans les domaines LIBRES (tout vérifié, rien de sûr et neuf à livrer)

- **`focus`** — hypothèse « minuteur terminé pendant l'app fermée → bloc perdu / pause d'un bloc fini » :
  **réfutée par lecture** (§2.3). Le clic bouton garde déjà `st.done` (`app.js:1061`,
  `else if(st.done){finishFocusBlock();return;}`) et le handler de visibilité aussi (`app.js:1071`).
  `focusTimerPause/Resume/State` (pures) sont correctes. Rien à corriger.
- **`nutrition`** — `mealMacro(null)` « crashe » au fuzz mais **non atteignable** (appelée seulement sur
  des aliments déjà testés truthy, `logic.js:2407-2417`). `proteinAdherenceTrend`/`hydrationAdherenceTrend`
  /`fieldAdherenceTrend` : **bien couverts** (up/down/flat/max/solo/null/fenêtre, `logic.test.js:7543-7606`).
  Cohérent avec la mémoire « nutrition pure logique auditée propre ».
- **`a11y`** — P2.1→P2.5 toutes ✅ ; les `<select>`/`<input>` du rituel matin sont enveloppés dans un
  `<label>` (nom accessible OK) ; champs de recherche déjà couverts (P2.4/#571). Rien de neuf.
- **`tests`** — fonctions à ≤ 2 références (`localDate`, `fieldAdherenceTrend`, `zoneTopExercises`,
  `focusTimerPause/Resume`) : soit bien couvertes via wrappers, soit triviales (sort+slice). Ajouter des
  tests de verrouillage serait à faible valeur (§4 bis.5 : ne pas forcer une tâche).

## Piste PROUVÉE réservée à la prochaine itération (domaine `robustesse`, bloqué CE tour)

Même **classe de bug que #668** (`weeklyAggregate`) : un garde de format `/^\d{4}-\d{2}-\d{2}$/`
**accepte les dates impossibles** (`2026-13-40`, `2026-02-30`) → `new Date(...'T12:00:00')` = Invalid Date
→ `dateKey().toISOString()` jette une `RangeError` **non gardée** qui casse le rendu. Deux sites frères,
tous deux atteignables via une date de record corrompue (backup/import/donnée héritée — ces listes ne sont
pas normalisées par enregistrement) :

- **`bestWellnessWeek`** (`logic.js:4125`, garde faible `l.4128`) — appelée par `renderWellnessStreak`
  (`app.js:689`, `bestWellnessWeek(state.wellnessDone, localDate())`). **Crash reproduit** :
  `node -e 'L.bestWellnessWeek([{date:"2026-13-40"}],"2026-01-05")'` → `Invalid time value`.
- **`bestTonnageWeek`** (`logic.js:4571`, garde faible `l.4574`) — même patron sur `w.date` (atteint dès
  qu'un workout à tonnage > 0 porte une date impossible).

**Correctif propre (prêt, pour un tour où `robustesse` est libre)** : remplacer le garde
`/^\d{4}-\d{2}-\d{2}$/` par **`isRealDateKey`** (déjà exporté + testé, `logic.js:40` — rejette les
impossibles : `isRealDateKey("2026-13-40") === false`), aux lignes 4128 et 4574 (et par cohérence les
gardes `todayKey` 4136/4144/4590, moins exposés car `todayKey = localDate()`). Un test node échoue-avant/
passe-après par fonction. C'est un **suivi direct et borné de #668**.

## Conclusion

Aucun commit de code : la seule tâche sûre à forte valeur est en `robustesse`, bloquée par la rotation
(§4 bis.3) après #668 ; les domaines libres sont secs après vérification. Un run vide vaut mieux qu'un
commit inventé (§5). La piste ci-dessus est **prête à coder dès la prochaine itération** (robustesse
redevient libre : les 2 derniers recaps seront alors #670 `docs` + #669 `coach`).

Domaine : docs

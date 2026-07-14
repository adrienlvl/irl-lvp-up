# #301 — Quêtes : les journées parfaites sont enfin mémorisées (1.9.235)

**Rotation 23 · item #2 · domaine : quêtes (changement de modèle de données)**

## Problème — pas un trou, une **destruction**
Les trous précédents (#295→#300) étaient de la donnée *stockée mais jamais lue*.
Celui-ci est pire :

```js
function resetDailyContent(){
  const d = localDate();
  if (state.dailyDate === d) return;
  state.quests.forEach(q => q.done = false);   // ← efface, sans rien conserver
  ...
}
```

À chaque bascule de jour, **toutes les quêtes validées sont remises à zéro et
rien n'est enregistré**. Adrien coche ses quêtes chaque jour, et la nuit venue
elles disparaissent sans laisser de trace. Aucun historique, aucune série
possible — le seul vestige est l'XP cumulé, qui ne dit pas *quels* jours.

Note : d'abord parti sur `state.plans` (les séances planifiées passées
disparaissent de `#plannedList`, qui filtre `date >= aujourd'hui`), j'ai vérifié
avant de coder : créer un plan pousse aussi un item d'agenda `kind:'sport'`, donc
`missedSessions` les rattrape déjà. **Pas un trou — je n'ai rien forcé.**

## Amélioration
Enregistrer **avant** d'effacer, puis en tirer une série de « journées parfaites ».

### Modèle de données
- Nouveau `state.questLog` : `[{ date, done, total }]` (180 jours), ajouté aux
  `defaults` **et** à la liste de coercition de `normalizeState` — les états
  existants et les sauvegardes importées le récupèrent proprement (`normalize`
  reste vert au smoke).

### Logique pure
- `logQuestDay(log, dateKey, done, total, cap)` — idempotent (réécrit une date
  déjà journalisée), trié, `done` borné à `total`, un jour sans aucune quête
  n'est pas journalisé, cap à 180.
- `questPerfectStreak(log, todayKey, todayDone, todayTotal)` — série de jours
  consécutifs où **toutes** les quêtes ont été validées.
  **Subtilité** : le journal ne contient que les jours *passés* (l'entrée du jour
  n'est écrite qu'à la bascule suivante), donc l'état du jour est passé **à part** —
  sinon la série serait perpétuellement en retard d'un jour. Une entrée de journal
  portant la date du jour est ignorée au profit de l'état live (testé).
  Réutilise `dailyStreak`, dont la « grâce » évite de casser la série tant que la
  journée en cours n'est pas finie.

### Câblage — `resetDailyContent()`
Journalise la journée écoulée juste avant la remise à zéro.

## Tests
- `logic.test.js` : `logQuestDay` (idempotence, tri, bornage, jour vide, date
  invalide, cap) ; `questPerfectStreak` (série avec/sans le jour courant, grâce,
  jour sans quête, entrée de journal du jour ignorée, journal vide).
- `renderer-smoke.cjs` : check `questStreak`.
- `npm run verify` : **326 tests + SMOKE OK** (`normalize` et `whatsNew` verts).
- **Vérif navigateur de la bascule** — le seul moyen de prouver le correctif :
  état simulé à `dailyDate = hier` avec 3/3 quêtes validées, puis rechargement.
  Résultat : hier **journalisé** (`questLog` 2 → 3 entrées), `dailyDate` avancé,
  quêtes remises à zéro, bannière « 🏅 3 journées parfaites d'affilée · 3/4 jours
  parfaits · 75 % ». Avant ce correctif, cette journée était perdue. ✔

## Fichiers
- `src/lib/logic.js` — `logQuestDay()`, `questPerfectStreak()` + exports + CHANGELOG[0] 1.9.235.
- `src/app.js` — `questLog` dans `defaults` + `normalizeState` ; journalisation
  dans `resetDailyContent()` ; bannière dans le rendu des quêtes.
- `src/index.html` — `#questStreak` après `#questList`.
- `src/style.css` — `.quest-streak`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

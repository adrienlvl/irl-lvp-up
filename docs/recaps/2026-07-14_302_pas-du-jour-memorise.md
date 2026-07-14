# #302 — Pas du jour : mémorisé, plus effacé (1.9.236)

**Rotation 23 · item #3 · piste « données détruites » (suite de #301)**

## Problème
Même famille que #301, mais pire par nature. `state.dailyLifeStep` n'est pas un
tableau : c'est un **objet unique** `{date, text, done}`. À chaque bascule de jour :

```js
state.dailyLifeStep = { date: d, text: '', done: false };   // écrase tout
```

Le « petit pas qui compte aujourd'hui » — l'action concrète qu'Adrien s'engage à
faire pour l'une de ses 3 priorités de vie, parfois validée (+10 XP, +1 Vie) —
était **intégralement écrasé**. Contrairement aux quêtes (un tableau dont on
perdait l'état), ici **un seul jour existait à la fois** : ni texte, ni statut, ni
historique. Le pilier « Vie » de l'app n'avait donc aucune instrumentation.

## Amélioration
Journaliser **avant** d'écraser, puis en tirer un **indicateur de suivi** — pas un
énième historique de textes (le piège que je m'étais fixé d'éviter après #296/#297/#299).

### Modèle
- Nouveau `state.lifeStepLog` : `[{ date, text, done }]` (180 j), ajouté aux
  `defaults` **et** à `normalizeState` (`normalize` reste vert au smoke).

### Logique pure
- `logLifeStep(log, step, cap)` — idempotent (un pas validé après coup réécrit son
  entrée), trié, `trim`, un pas **sans texte n'est pas journalisé**.
- `lifeStepStats(log, todayKey, todayStep)` — `{ streak, doneDays, loggedDays, rate,
  lastDone }`. Même subtilité qu'en #301 : le journal ne contient que les jours
  passés, donc l'état du jour est passé **à part**, sinon la série serait en retard
  d'un jour. `dailyStreak` fournit la grâce du jour en cours (un pas posé mais pas
  encore tenu ne casse pas la série).

### Câblage
`resetDailyContent()` journalise le pas de la veille juste avant l'écrasement.

### Rendu
Bloc `#lifeStepStats` dans le panneau « Cap de vie » :
« 🌱 **2 jours d'affilée** avec ton pas tenu · 2/3 · 67 % »
« Dernier tenu : « Ranger mon bureau » · hier »

## Tests
- `logic.test.js` : `logLifeStep` (idempotence, tri, trim, pas sans texte, entrées
  invalides) ; `lifeStepStats` (série avec/sans le pas du jour tenu, grâce, pas non
  posé, `lastDone` = aujourd'hui si tenu sinon le dernier passé, journal vide).
- `renderer-smoke.cjs` : check `lifeStep`.
- `npm run verify` : **328 tests + SMOKE OK** (`normalize` et `whatsNew` verts).
- **Vérif navigateur de la bascule** (seul moyen de prouver le correctif) : état
  simulé à `dailyDate = hier` avec le pas « Ranger mon bureau » **tenu**, puis
  rechargement → le pas est **journalisé** (`lifeStepLog` 2 → 3 entrées), `dailyDate`
  avance, `dailyLifeStep` est remis à vide, bannière « 🌱 2 jours d'affilée · 2/3 ·
  67 % · Dernier tenu : « Ranger mon bureau » · hier ». Avant, ce pas était perdu. ✔

## Fichiers
- `src/lib/logic.js` — `logLifeStep()`, `lifeStepStats()` + exports + CHANGELOG[0] 1.9.236.
- `src/app.js` — `lifeStepLog` dans `defaults` + `normalizeState` ; journalisation
  dans `resetDailyContent()` ; bloc dans le rendu du Cap de vie.
- `src/index.html` — `#lifeStepStats` dans `.daily-life-step`.
- `src/extras.css` — `.life-step-stats`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Reste sur la piste
`state.challengeDone` (booléen du défi du jour, remis à false sans trace) — même
schéma, valeur plus faible (le défi tourne par jour de semaine). `state.focusTask`
à vérifier.

# #477 — Coaching : le coach célèbre ta SÉRIE de journées complètes (2.0.108)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

En #475, `adaptiveCoachFocus` a gagné un registre positif : `pillarsToday` (0-4) lui fait saluer une
**belle journée complète** (« 3/4 de tes piliers déjà cochés aujourd'hui — belle journée complète. 🎯 »).
Mais ce crédit ne voyait qu'**un seul jour** : Adrien pouvait enchaîner trois journées complètes
d'affilée sans que le coach le remarque — il refélicitait chaque jour à l'identique, comme si c'était
le premier. Or la régularité *tenue dans la durée* est le vrai levier d'une app gamifiée, et
reconnaître un **enchaînement** motive bien plus que féliciter un jour isolé. La « série de journées
complètes (4/4 plusieurs jours de suite) » figurait précisément en tête des prochaines pistes de #476,
#475 **et** #474 — c'est le cran au-dessus du crédit d'un jour.

## L'amélioration

Nouveau champ pur `completeDayStreak` : le **nombre de jours consécutifs** (finissant aujourd'hui,
avec la grâce habituelle de `dailyStreak` — un jour en cours encore vide ne casse pas la série) où
**au moins 3 des 4 piliers** ont une entrée active — exactement le seuil de la « belle journée
complète 🎯 ». Réutilise `completeDaysStreak`/`dailyStreak`, déjà éprouvés ailleurs.

Dans la note de crédit multi-piliers : quand **aujourd'hui est complet** (`pillarsToday >= 3`, donc
dans la série) **ET** que la série court (`completeDayStreak >= 2`), le coach **célèbre l'enchaînement**
au lieu du jour seul :

- « Séance déjà faite aujourd'hui 💪 … **3 jours d'affilée à 3+ piliers — tu enchaînes les journées
  complètes. 🔥** »

Sinon (série de 1, ou aujourd'hui pas encore complet), le crédit d'un jour reste tel quel (« belle
journée complète 🎯 » à 3-4 piliers, « bonne lancée » à 2).

### Comptage par jour (le point technique)

On construit une `Map<date, Set<pilier>>` en balayant les 4 piliers avec leurs **prédicats d'activité
existants** (le `Set` dédoublonne un pilier noté plusieurs fois le même jour), puis on la passe à
`completeDaysStreak(days, 3, todayKey)`. Les dates futures et invalides sont écartées. `pillarsToday`
(le compte d'aujourd'hui) reste calculé à part comme avant — sa valeur coïncide par construction avec
`Map.get(todayKey).size`, ce qui garantit que la garde `pillarsToday >= 3` implique bien qu'aujourd'hui
compte dans la série (donc le « X jours d'affilée » inclut aujourd'hui et est exact).

### Garde-fous

- **Aujourd'hui doit être complet** (`pillarsToday >= 3`) pour célébrer la série : sinon la grâce de
  `dailyStreak` pourrait afficher un « 3 jours d'affilée » calé sur hier alors qu'aujourd'hui n'a rien —
  trompeur. La garde assure qu'aujourd'hui est dans la série citée.
- **Série ≥ 2** : à 1 seul jour complet, il n'y a pas d'enchaînement → on garde « belle journée complète ».
- **Contexte positif uniquement** (`doneToday || tone === 'reinforce'`, seuil ≥ 2 piliers) : hérité de
  #475, inchangé. Toujours **disjoint d'`alsoSlipping`** (correction) — jamais les deux le même jour.
- **Additif pur** : `completeDayStreak` **toujours** renvoyé (informatif) ; la note **remplace** le
  crédit d'un jour uniquement quand la série court, aucune branche existante touchée.

## Logique / tests

- `src/lib/logic.js` — calcul `completeDayCounts` (Map date→Set pilier) + `completeDayStreak` via
  `completeDaysStreak`, note de série injectée dans le bloc crédit multi-piliers ; champ
  `completeDayStreak` au retour. CHANGELOG[0] 2.0.108.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'insight tel quel.
- `src/test/logic.test.js` — test existant « crédite une journée multi-piliers » étendu
  (`completeDayStreak === 1` sur une journée complète isolée → pas de célébration de série) ; nouveau
  test « célèbre une SÉRIE de journées complètes » : 4 piliers × 3 jours → `completeDayStreak` 3 +
  « 3 jours d'affilée à 3+ piliers » (et plus de « belle journée complète ») ; série de 2 (14 = sport
  seul, hors série) → `completeDayStreak` 2 + « 2 jours d'affilée ». Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (série 3 jours → `completeDayStreak`
  3 + libellé série, plus de crédit d'un jour ; `fMulti.completeDayStreak === 1` verrouillé) ;
  assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **464 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.108**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Le coach dispose désormais des deux gradations positives : il salue **une** belle journée (crédit d'un
jour) ET célèbre l'**enchaînement** de plusieurs (série). Prochaines pistes possibles : moduler le
verbe/ton d'`alsoSlipping` selon la gravité (dormant vs simple creux) ; badge/paliers de série (3, 7,
14 jours complets) comme les milestones de streak existants ; suggérer de **décaler** un RDV du soir
menaçant (`sleepConflict`) plutôt que juste alerter, si un créneau plus tôt existe.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/477-coach-serie-journees-completes.md`.

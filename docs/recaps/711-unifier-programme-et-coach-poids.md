# Unifier le programme d’entraînement avec le Coach Poids

> Demande d’Adrien : « Le programme auto devrait être beaucoup mieux, et connecté avec
> l’onglet Poids et le Coach Poids […] pas 30 000 outils et coachs qui ne sont pas
> connectés et qui proposent des séances différentes. Le programme selon l’objectif
> devrait aussi permettre de mettre plus de séances si on veut. »

Cartographie faite par 4 agents lecteurs sur l’état réel du code, puis synthèse.
**Les numéros de ligne datent du 28/07/2026 et bougent à chaque commit : les revérifier.**

## Diagnostic

Il y a aujourd'hui **8 générateurs de semaine concurrents** (`objectiveProgram` l.4142, `coachWeekPlan` l.9723, `buildTrainingWeek` l.11871, `buildWeekPlan` l.2511, `runPlanWeek` l.9689, `buildZonePlan` l.5402, `quickSessionPlan` l.5380, `weekProgramSchedule` l.2968), **4 planificateurs d'agenda** (`scheduleObjectiveProgram` app.js:1017, `scheduleCoachWeek` app.js:533, `scheduleRunPlan` app.js:1014, `generateAutomaticWeek` app.js:724) avec 4 conventions de jours différentes, et **4 notions non reliées de « nombre de séances »** : `state.goals.sessions` (1..14, #sessionsGoal), `state.profile.availableDays.length` (cases #availabilityDays), `#wpStrength`/`#wpRuns` (volatiles, jamais persistés), et les constantes de `FITNESS_OBJECTIVES` (l.3429).

Trois incohérences vérifiées ligne par ligne, visibles à l'écran :
1. **Le réglage d'Adrien n'atteint jamais le générateur.** `onboardingSetup` (logic.js:4011) valide et stocke `sessions` (1..7) dans `profile.sessions` ET `goals.sessions`, mais les 3 appels à `objectiveProgram` (app.js:894, 1024, 1313) ne passent que `{equipment, seed, perSession}`. Le nombre réel = `split.length + runs`, en dur.
2. **Le compteur ment sur 2 objectifs sur 5.** `objectiveProgram` (l.4149) appelle `runPlanWeek(o.runs)` qui plancher à 3 (l.9690 `Math.max(3, ...)`). Donc `muscle` (runs:1) → 3 courses → **7 séances/sem** alors que l'en-tête affiche « 1 course/sem. » ; `forme` (runs:2) → 5 séances au lieu de 4. `programWeekSummary` compte juste : **les deux chiffres se contredisent dans le même bloc HTML** (app.js:1024).
3. **Zéro couplage énergie → entraînement.** `coachWeekPlan` (l.9723) déclare un 3e paramètre `opts` **jamais lu** : elle ignore poids, calories, déficit, matériel, niveau, blessures, historique. Elle ne lit que l'étiquette `plan.goal` et `availableDays`. Dans l'autre sens, `calorieAdjustment` (l.10117) conseille en prose « ajoute du cardio » sans jamais toucher la semaine affichée 200 px plus haut sur le même écran — et ce conseil est **scientifiquement à l'envers** en déficit marqué (interférence + dette de récupération).

Enfin, `FITNESS_OBJECTIVES` n'est même pas la source de l'UI : `grep -c FITNESS_OBJECTIVES src/app.js` = 0, la liste des 5 objectifs est recopiée à la main dans 2 `<select>` (index.html:169 et 268) et re-déclinée dans 4 tables parallèles (`OBJECTIVE_NUTRITION` l.9653, `OBJECTIVE_WELCOME` l.3993, `STARTER_HABITS` l.4057, `goalMap` l.4012).

## Source de vérité proposée

**Une nouvelle fonction pure `trainingWeekPlan(input)` dans `D:\IRL LVP UP\src\lib\logic.js`**, posée juste après `assignProgramDays` (l.4174), doublée d'une extractrice pure `trainingPlanInputs(state, todayKey)`. C'est elle, et elle seule, qui répond à « quelles séances cette semaine ».

Pourquoi elle et pas une existante :
- `objectiveProgram` (l.4142) a déjà la meilleure brique métier — choix des exercices par focus, filtrage matériel, `perSession` selon le niveau — mais elle est **aveugle à l'énergie** et son nombre de séances est figé dans une constante. Elle doit **rester** et **devenir une brique interne**, pas l'API des écrans.
- `coachWeekPlan` (l.9723) est la seule à lire l'objectif de poids, mais elle ne produit que des étiquettes (`'Musculation' 45 min`) : **aucun exercice, aucune série, aucune progression**. Elle ne peut pas absorber le programme auto sans être réécrite entièrement.
- `buildTrainingWeek` (l.11871) est la seule dont le nombre de séances est réglable, mais elle repart des zones musculaires (`TRAINING_GOALS`), une **taxonomie concurrente** de `FITNESS_OBJECTIVES`, et duplique une 3e fois l'algo « zones → meilleurs exercices » (l.11882-11890).

Aucune des trois ne peut être promue telle quelle. La nouvelle fonction les **compose** :

```js
trainingPlanInputs(state, todayKey)
  → { objective, sessionsWanted, runsWanted, availableDays, level, equipment,
      weight, height, age, sex, activityLevel, targetWeight, weekIndex,
      acwr, readiness, raceDaysLeft, raceKm, seed }

trainingWeekPlan(input)
  → { sessions:[{ weekday, kind:'muscu'|'course', focus?, type?, title, minutes,
                  why, exercises:[{name,sets,reps,unit}], intensity }],
      summary: { sessions, muscu, course, minutes, hours, strengthSets },
      energy:  { goal, tdee, dailyTarget, deficit, deficitPct, proteinG } | null,
      policy:  { key, label, volumeFactor, note, sources:[] },
      requested: { sessions, runs },
      applied:   { sessions, muscu, course },
      adjusted:  [ 'raison lisible', ... ] }
```

Chaîne interne, sans circularité :
`energyPlan(...)` (avec `sessionsPerWeek = sessionsWanted`, **le réglage, pas la sortie**) → `trainingPolicy(...)` → dimensionnement (nb de séances, split muscu/course, séries) → `objectiveProgram(...)` pour le contenu des séances → `blockPhase(weekIndex)` → `assignProgramDays(week, availableDays)`.

**Le point critique** : `energyPlan` doit continuer à recevoir le nombre de séances **voulu** (entrée utilisateur), jamais `plan.summary.sessions` (sortie), sinon on crée une boucle TDEE ↔ volume qui oscille. À écrire en commentaire dans le code, c'est le piège n°1 de cette refonte.

Consommateurs (ils ne recalculent plus rien) : `runObjectiveProgram` (app.js:1024), `renderCoachWeight` (app.js:472-474), `adaptiveCoachFocus` (logic.js:6438), le scheduler d'agenda, et `weeklyAdherence` qui reçoit `sessionTarget = plan.applied.sessions`.

## Nombre de séances réglable

**Où stocker** : dans `state.goals`, à côté de ce qui existe déjà — pas un 5e objet.

```js
// src/app.js, defaults (l.35) : goals: { sessions: 4, distance: 10, targetWeight: '' }
//                          →  goals: { sessions: 4, runs: 'auto', distance: 10, targetWeight: '' }
```

Normalisation dans `normalizeState` (src/app.js:41-44, juste sous `next.goals.sessions=...`) :
```js
next.goals.sessions = Math.max(1, Math.min(14, Math.round(Number(next.goals.sessions)||4)));  // INCHANGÉ (compat)
next.goals.runs = (next.goals.runs === 'auto' || next.goals.runs == null) ? 'auto'
                : Math.max(0, Math.min(6, Math.round(Number(next.goals.runs)||0)));
```
`sessions` garde sa borne 1..14 en stockage (aucune migration destructive d'un état existant) et c'est `trainingWeekPlan` qui la **borne à 1..10** en interne. `runs:'auto'` = la politique décide du split ; une valeur numérique = Adrien force.

**Qui lit ce réglage** (et c'est tout) :
| Lecteur | Fichier:ligne | Rôle |
|---|---|---|
| `trainingPlanInputs` → `trainingWeekPlan` | logic.js (nouveau) | budget de séances de la semaine |
| `energyPlan` via `activityFactor(sessionsPerWeek)` | logic.js:5919 | TDEE → calories. Reçoit `goals.sessions`, **jamais** la sortie du plan |
| `objectiveNutrition` | logic.js:9668 | même chaîne, même valeur |
| `weeklyAdherence` | logic.js:9810 | reçoit `sessionTarget = plan.applied.sessions` (ce qui est **réellement** programmé, pas ce qui est souhaité) |

**Markup** (src/index.html:169, dans `.op-bar` du panneau `.objective-program-panel`, à côté de `#objectiveSelect`) :
```html
<label class="op-dial">Séances/sem.
  <input id="progSessions" type="number" min="1" max="10" step="1" />
</label>
<label class="op-dial">dont courses
  <select id="progRuns">
    <option value="auto">auto</option><option>0</option>…<option>6</option>
  </select>
</label>
```
Câblage dans `runObjectiveProgram` (src/app.js:1024) : lire les deux champs, écrire dans `state.goals`, `save()`, re-render. Les mêmes valeurs alimentent `#sessionsGoal` (index.html:125) et remplacent `#wpStrength`/`#wpRuns` (aujourd'hui volatiles, perdus au rechargement).

**Honnêteté sur l'écart demandé/appliqué** : si Adrien demande 8 séances mais n'a coché que 3 jours, `assignProgramDays` (l.4170) **empile silencieusement** 2-3 séances le même jour. Il faut le dire, pas le cacher : `trainingWeekPlan` remplit `adjusted: ['8 demandées → 6 posées : 3 jours cochés, 2 séances/jour max', '−1 séance dure : déficit à 22 % du TDEE']`, affiché sous le résumé. Plafonds durs à écrire dans la fonction : `≤ 2 séances/jour`, `≤ 1 séance dure (fractionné/tempo) par 2 jours cochés`, `≥ 1 jour de repos complet` (déjà le principe de `buildTrainingWeek` l.11877).

## Étapes

### 1. Débloquer le plancher à 3 courses de runPlanWeek  `[petit]`

**Fichier** : D:\IRL LVP UP\src\lib\logic.js — function runPlanWeek (l.9689)

**Quoi** : Remplacer `const want = Math.max(3, Math.min(6, Math.round(Number(count) || 4)));` par `const n = Number(count); const want = Math.max(0, Math.min(6, Math.round(Number.isFinite(n) ? n : 4)));` (attention : `Number(count)||4` transforme 0 en 4 — il faut `Number.isFinite`). Ajouter les entrées manquantes : `PATTERN = { 0:[], 1:[3], 2:[2,5], 3:[2,4,0], ... }` et, dans les 4 `TEMPLATES`, les clés 1 et 2 (`balanced: {1:['facile'], 2:['facile','longue']}`, `vitesse: {1:['fractionne'], 2:['fractionne','longue']}`, `endurance: {1:['longue'], 2:['facile','longue']}`, `facile: {1:['facile'], 2:['facile','facile']}`). `want===0` → `{sessions:[], count:0, totalMinutes:0}`.

**Pourquoi** : C'est le mensonge le plus visible de l'app et le verrou de tout le reste : tant que le plancher est à 3, AUCUN réglage de nombre de séances ne pourra descendre sous 3 courses. Aujourd'hui l'objectif 'muscle' (runs:1) sort 7 séances/semaine en affichant « 1 course/sem. » et 'forme' (runs:2) sort 5 séances. Deux lignes de code, deux objectifs sur cinq réparés.

### 2. Persister le nombre de séances voulu dans state.goals  `[petit]`

**Fichier** : D:\IRL LVP UP\src\app.js — defaults (l.35) + normalizeState (l.41-44) ; D:\IRL LVP UP\src\index.html (l.169)

**Quoi** : Ajouter `runs:'auto'` dans `defaults.goals`. Ajouter sous `next.goals.sessions=...` (app.js:44) la normalisation de `next.goals.runs` ('auto' | 0..6). Ne PAS toucher la borne 1..14 de `goals.sessions` (état existant préservé). Ajouter `#progSessions` (number 1..10) et `#progRuns` (select auto|0..6) dans `.op-bar` du panneau `.objective-program-panel` (index.html:169), et le CSS `.op-dial` dans athlete.css.

**Pourquoi** : C'est la demande explicite d'Adrien (« permettre de mettre plus de séances si on veut ») et c'est un prérequis mécanique de l'étape 4 : sans champ persisté, le plan n'a rien à lire. Étape isolable et sans risque : tant que rien ne lit `goals.runs`, l'app se comporte exactement comme avant. Corollaire : #wpStrength/#wpRuns (aujourd'hui volatiles, remis à 3/2 à chaque rechargement) deviendront des vues de ce même état.

### 3. trainingPolicy : la brique scientifique, seule et testable  `[moyen]`

**Fichier** : D:\IRL LVP UP\src\lib\logic.js — NOUVELLE fonction, à insérer juste après energyPlan (après l.5960)

**Quoi** : `function trainingPolicy(input)` — pure, aucune dépendance à state. Entrée : `{ goal, deficit, tdee, weekIndex, acwr, readiness, raceDaysLeft }`. Calcule `d = Math.max(0, deficit) / tdee` puis :

• **d ≥ 0,20** (déficit marqué) → `{ volumeFactor:0.70, strengthFloor:3, runsMax:3, hardMax:0, keepLoad:true }`
• **0,10 ≤ d < 0,20** → `{ volumeFactor:0.85, strengthFloor:3, runsMax:4, hardMax:1 }`
• **maintien / d < 0,10** → `{ volumeFactor:1.00, strengthFloor:2, runsMax:5, hardMax:2 }`
• **prise** → `{ volumeFactor:1.15, strengthFloor:3, runsMax:2, hardMax:0, runEmphasis:'facile' }`

Puis trois modulateurs multiplicatifs, dans cet ordre : `blockPhase(weekIndex).deload` → `volumeFactor *= 0.55, hardMax = 0` ; `acwr && acwr.ratio > 1.5` → `volumeFactor *= 0.85, hardMax -= 1` ; `readiness && readiness.score < 50` → `hardMax -= 1`. Borner `volumeFactor` à [0.4, 1.25] et `hardMax` à ≥ 0.

**Le point qui fait la crédibilité** : `volumeFactor` s'applique aux **séries** et au **nombre d'exercices par séance** — JAMAIS au nombre de séances de muscu (fréquence) ni à la charge. En déficit on coupe le volume, on garde la fréquence et l'intensité. Champ `note` prêt à afficher + `sources:[]`.

Appuis (déjà le style maison, cf. les commentaires de safeLossRate l.5890) : Bickel/Cross/Bamman 2011, MSSE — le volume nécessaire au MAINTIEN est très inférieur au volume nécessaire au GAIN ; Schoenfeld/Ogborn/Krieger 2016, Sports Med — fréquence ≥ 2×/sem par groupe musculaire, d'où le `strengthFloor` ; Wilson et al. 2012, JSCR — l'interférence concurrent-training croît avec la durée et la fréquence du cardio, et est plus marquée pour la course que pour le vélo, d'où `runsMax` bas en prise ; Murach & Bagley 2016, Sports Med, et Longland 2016, AJCN (déjà cité l.5940) pour la protection protéique. **À VÉRIFIER avant affichage** : je cite ces références de mémoire ; les volumes/pages exacts doivent être contrôlés avant d'être écrits dans l'UI, comme l'ont été Garthe 2011 IJSNEM 21:97 et Aragon/ISSN 2017 JISSN 14:16 déjà présents dans le fichier.

**Pourquoi** : Isole toute la décision « scientifique » dans une fonction de 30 lignes, pure, testable au chiffre près, sans toucher un pixel. C'est ce qui rend le programme défendable au lieu de l'actuel `TEMPLATE = { perte:['course','muscu','renfo',...] }` (l.9736) qui est une liste écrite à la main. Et c'est ici qu'on inverse l'erreur actuelle : le Coach Poids ajoute aujourd'hui du cardio en déficit (3 courses sur 6 en 'perte'), alors que la réponse correcte est de préserver la fréquence de muscu et de baisser le volume.

### 4. trainingWeekPlan + trainingPlanInputs : LA source de vérité  `[gros]`

**Fichier** : D:\IRL LVP UP\src\lib\logic.js — NOUVELLES fonctions, après assignProgramDays (l.4174)

**Quoi** : `trainingPlanInputs(state, todayKey)` : pure, extrait de `state` les 16 champs nécessaires (objectif, `goals.sessions`, `goals.runs`, `profile.availableDays`, `profile.level`, `profile.equipment`, poids/taille/âge/sexe, `goals.targetWeight`, `profile.activityLevel`, `isoWeekNumber(todayKey)`, `acuteChronicRatio(state.workouts, todayKey)`, `readinessScore(state.recovery.at(-1))`, `raceGoalStatus(state.raceGoal)`, `state.objectiveSeed`). Évite de recopier ces 16 lignes dans les 4 écrans consommateurs.

`trainingWeekPlan(input)` :
1. `const energy = energyPlan({ ...input, sessionsPerWeek: input.sessionsWanted })` — **le réglage, jamais la sortie du plan** (commentaire obligatoire : sinon boucle TDEE↔volume).
2. `const pol = trainingPolicy({ goal: energy?.goal || 'maintien', deficit: energy?.deficit || 0, tdee: energy?.tdee || 0, weekIndex, acwr, readiness, raceDaysLeft })`.
3. Dimensionnement : `total = clamp(1..10, sessionsWanted)` ; `runs = input.runsWanted === 'auto' ? Math.min(pol.runsMax, Math.round(total * shareOf(objective))) : clamp(0..pol.runsMax, input.runsWanted)` ; `strength = Math.max(pol.strengthFloor, total - runs)` ; puis re-clamp `total = Math.min(total, availableDays.length * 2)` et `Math.min(total, 6 sur 7 jours)`.
4. Contenu : réutiliser `objectiveProgram(objective, exercises, { perSession: Math.max(3, Math.round(perSessionForLevel(level) * pol.volumeFactor)), seed, equipment })` puis **rééchantillonner** son `.week` au `strength`/`runs` calculés (répéter/tronquer le `split`, et rappeler `runPlanWeek(runs, { emphasis: pol.runEmphasis || objectif.runEmphasis })` — possible maintenant que l'étape 1 a levé le plancher).
5. Séries : appliquer `pol.volumeFactor` et `blockPhase(weekIndex).setDelta` aux `sets` de chaque exercice, plancher 2.
6. Jours : `assignProgramDays(week, availableDays)` — UNE seule table de jours, la table `P` en dur de `objectiveProgram` (l.4153) ne sert plus que de repli quand aucun jour n'est coché.
7. Remplir `summary` (via `programWeekSummary`), `requested`, `applied`, `adjusted[]`.

`objectiveProgram`, `coachWeekPlan`, `buildTrainingWeek` restent exportées et testées : rien ne casse pour qui les appelle encore.

**Pourquoi** : C'est le cœur : un seul endroit répond à « quelles séances cette semaine », et il lit l'objectif de poids ET la dépense énergétique. C'est exactement la demande d'Adrien (« pas 30 000 outils et coachs qui proposent des séances différentes »). Réutiliser `objectiveProgram` plutôt que réécrire garde le choix des exercices, le filtrage matériel et la variation par seed — le vrai travail déjà fait.

### 5. Le Programme auto consomme le plan (et affiche le pourquoi)  `[moyen]`

**Fichier** : D:\IRL LVP UP\src\app.js — runObjectiveProgram (l.1024) ; renderBlockStatus / #newBlockBtn (l.894)

**Quoi** : Remplacer l'appel direct `objectiveProgram(key, exercises, {...})` par `const plan = trainingWeekPlan(trainingPlanInputs(state, localDate()))`. Câbler `#progSessions`/`#progRuns` → `state.goals` → `save()` → re-render. Ajouter en tête de `#objectiveResult` un bandeau de pilotage, seul endroit de l'app où la connexion devient visible :

`⚖️ Objectif poids : perdre 6,2 kg · 2 140 kcal/j (−18 % du TDEE) · P 194 g` puis `🧪 Programme adapté : 3 muscu (volume −15 %, charges INCHANGÉES) + 2 courses, 1 séance dure max` puis `${pol.note}` avec les sources en `<small>`.

Corriger au passage l'en-tête menteur : afficher `plan.applied.course` (compté) et non `p.runs` (constante). Afficher `plan.adjusted[]` s'il est non vide. Garder les boutons existants (`#objectiveVary`, `#objectiveSchedule`, `#objectiveShare`, `#objectiveCopy`, `[data-op-start]`) et le bloc `.op-ramp` (blockPhase).

**Pourquoi** : Sans ce bandeau, l'unification est invisible et Adrien ne verra aucune différence. C'est le rendu qui rend le plan « crédible » : il ne dit pas seulement QUOI faire, il dit POURQUOI ce volume-là ce mois-ci — et c'est aussi ce qui corrige la contradiction actuelle entre l'en-tête (« 1 course/sem. ») et le résumé (« 7 séances »).

### 6. Le Coach Poids affiche LE MÊME plan  `[moyen]`

**Fichier** : D:\IRL LVP UP\src\app.js — renderCoachWeight (l.472-474)

**Quoi** : Remplacer `const wk = coachWeekPlan(plan.goal, state.profile.availableDays)` par `const wk = trainingWeekPlan(trainingPlanInputs(state, localDate()))`, et adapter le rendu `.cw-train` : les cartes `.cw-day` lisent `s.kind` ('muscu'|'course') au lieu de `s.type` ('muscu'|'renfo'|'course') — prévoir le mapping d'icônes `{muscu:'🏋️', course:'🏃'}` et un repli pour l'ancien 'renfo'. `wkParts` se construit depuis `wk.applied`. La note devient `wk.policy.note`. Passer `sessionTarget: wk.applied.sessions` à `weeklyAdherence` (l.474) au lieu de `wk.sessions.length`. Ajouter un lien « ⚙️ Régler mes séances » qui bascule sur Athlète > Programme. `coachWeekPlan` reste dans logic.js avec ses tests (l.6000-6021) mais n'est plus appelée par l'UI.

**Pourquoi** : C'est LE symptôme qu'Adrien décrit : deux écrans qui proposent deux semaines différentes. Après cette étape il n'y en a plus qu'une, et le Coach Poids gagne ce qu'il n'a jamais eu — des exercices précis, des séries, une progression sur 4 semaines — pendant que le Programme auto gagne ce qu'il n'avait pas : les calories et l'objectif de poids.

### 7. Arrêter de conseiller « ajoute du cardio » en déficit marqué  `[petit]`

**Fichier** : D:\IRL LVP UP\src\lib\logic.js — calorieAdjustment (l.10073, messages l.10117-10118)

**Quoi** : Ajouter un paramètre optionnel `opts.deficitPct` (ou lire `tdee` déjà disponible chez l'appelant app.js:471 via `plan.tdee`). Si `deficit/tdee ≥ 0,20`, remplacer « Baisse d'environ X kcal/jour ou ajoute du cardio » par : « Ton déficit est déjà à X % de ta dépense : ne coupe pas plus et n'ajoute pas de cardio. Vise +2 000 pas/jour, garde tes 3 muscu et tes protéines à Y g — la stagnation vient plus souvent de la sous-déclaration et de la baisse d'activité spontanée (NEAT) que du besoin de creuser. » Rendre la fonction rétro-compatible : sans `opts`, comportement identique à aujourd'hui.

**Pourquoi** : Bug de crédibilité pur, deux lignes de texte : aujourd'hui l'app conseille exactement l'inverse de ce que fait son propre plan d'entraînement, sur le même écran. Empiler du cardio sur un déficit déjà marqué dégrade la récupération et la rétention de masse maigre (interférence, Wilson 2012) — c'est la baisse de NEAT et l'adaptation métabolique qui expliquent le plateau (Trexler/Smith-Ryan/Norton 2014, JISSN). Et ça aligne enfin le conseil calorique sur `trainingPolicy`.

### 8. Un seul planificateur d'agenda, rétro-compatible  `[moyen]`

**Fichier** : D:\IRL LVP UP\src\app.js — scheduleObjectiveProgram (l.1017-1023), scheduleCoachWeek (l.533), scheduleRunPlan (l.1014) ; D:\IRL LVP UP\src\lib\logic.js — pruneProgramSessionsFrom (l.6311)

**Quoi** : Créer `scheduleTrainingWeek(plan, weeks)` dans app.js, à partir de `scheduleObjectiveProgram` (qui est déjà la version la plus complète : `sessionTimesForSlot`, `blockPhase`, `pruneProgramSessionsFrom`, `refId` idempotent, `workout:[noms]`). Nouveau préfixe `refId = \`plan-${s.kind}-${s.focus||s.type}-${s.weekday}-${dk}\`` et `source:'plan'`. Élargir `pruneProgramSessionsFrom` (logic.js:6316) pour reconnaître les 4 anciennes familles : `/^(objprog|coachweek|runplan|plan)-/` et `source ∈ {objprog, coachweek, plan}`. **Impératif** : les items déjà en agenda avec `refId` `objprog-*`/`coachweek-*` ne doivent être ni dupliqués ni supprimés s'ils sont `completed` (c'est l'historique d'Adrien — la garde `!a.completed` de la l.6316 est à conserver telle quelle). Ancrage : `scheduleObjectiveProgram` et `scheduleRunPlan` ancrent sur LUNDI PROCHAIN, `weekProgramSchedule` sur la SEMAINE EN COURS — choisir lundi prochain (le comportement du programme auto) et le documenter.

**Pourquoi** : Sans ça, unifier l'affichage ne suffit pas : les deux boutons « Programmer (4 sem.) » (Coach Poids et Programme auto) continuent d'écrire deux séries de séances dans le même agenda, aux mêmes dates, avec des refId différents — donc doublons invisibles. C'est le bug d'agenda qui viendra juste après la refonte visuelle si on ne le traite pas dans la foulée.

### 9. Tests : verrouiller le contrat avant de brancher les écrans  `[moyen]`

**Fichier** : D:\IRL LVP UP\src\test\logic.test.js (13 767 lignes, tests existants l.3999-4053 objectiveProgram, l.6000-6021 coachWeekPlan)

**Quoi** : Ajouter, dans le style du fichier (`test('nom : ce que ça garantit', ...)`) : (1) `runPlanWeek(1)` renvoie 1 session et `runPlanWeek(0)` renvoie 0 — le plancher est bien mort ; (2) `trainingPolicy` : à déficit ≥ 20 % du TDEE, `volumeFactor < 1` ET `strengthFloor >= 3` — assertion explicite « on baisse le volume, PAS la fréquence » ; en prise, `runsMax <= 2` ; en semaine 4, `volumeFactor` ~0,55× ; (3) `trainingWeekPlan` : `applied.sessions <= requested.sessions`, `applied.sessions <= availableDays.length*2`, jamais 7 jours sur 7, `summary.sessions === sessions.length` ; (4) **non-régression du compteur** : pour les 5 objectifs, `p.applied.course === p.sessions.filter(s=>s.kind==='course').length` — le bug n°2 du diagnostic ne peut plus revenir ; (5) `energyPlan` n'est jamais appelée avec `plan.applied.sessions` (test de non-circularité : deux appels successifs à `trainingWeekPlan` avec le même input donnent le même `energy.tdee`). Vérifier aussi `src/test/renderer-smoke.cjs` (il touche déjà `qualitySession` l.810).

**Pourquoi** : Le fichier de tests est la mémoire du projet : les commentaires de logic.js (l.5890-5899, 9921-9927) documentent trois bugs passés du même type — deux verdicts contradictoires sur le même écran. Cette refonte crée exactement ce risque à plus grande échelle. Écrire ces tests AVANT de brancher les écrans coûte une heure et évite la boucle « je corrige un écran, j'en casse deux ».

### 10. Le tableau de bord lit le plan au lieu de le refaire  `[moyen]`

**Fichier** : D:\IRL LVP UP\src\lib\logic.js — adaptiveCoachFocus (l.6438, appels energyPlan l.7489 et calorieAdjustment l.7491) ; D:\IRL LVP UP\src\app.js — renderCoachFocus (l.285)

**Quoi** : Dans `adaptiveCoachFocus`, remplacer le duo `energyPlan` + `calorieAdjustment` reconstruit à la main par un `trainingWeekPlan(trainingPlanInputs(s, todayKey))`, et en tirer le focus du jour : « aujourd'hui : 🏋️ Haut du corps · 45 min · 4 exercices ». Corriger au passage le bug relevé l.7491 : `calorieAdjustment(s.weights, plan.goal, plan.dailyTarget)` est appelée SANS le 4e argument `floor`, donc avec un plancher de 1 200 kcal au lieu du métabolisme de base — le dashboard peut donc recommander une cible sous le BMR alors que le Coach Poids l'interdit (app.js:471 passe bien `plan.bmr`).

**Pourquoi** : Troisième écran qui recalcule sa propre vérité énergétique, avec en prime un garde-fou manquant. Valeur réelle mais moindre que les étapes 4-6 : le dashboard affiche du texte, pas des séances. Le bug du plancher à 1 200 kcal, lui, mérite d'être corrigé même si le reste de l'étape est reporté.

### 11. Reléguer buildTrainingWeek et réparer son écran fantôme  `[moyen]`

**Fichier** : D:\IRL LVP UP\src\app.js — renderWeekProgram (l.1055), pageGroups (l.1509) et ATHLETE_TABS (l.1631) ; D:\IRL LVP UP\src\index.html (l.169, panneau .weekly-program-panel)

**Quoi** : Deux options, à trancher avec Adrien. (a) **Fusion** : `.weekly-program-panel` devient le mode avancé du Programme auto — `#wpGoals` (zones) devient un override optionnel passé à `trainingWeekPlan` (`input.zones`), `#wpStrength`/`#wpRuns` écrivent dans `state.goals.sessions`/`state.goals.runs`, `buildTrainingWeek` n'est plus appelée. (b) **Retrait** : masquer le panneau (jamais supprimer — cf. la règle « mettre de côté, pas supprimer »), garder la fonction et ses tests. Dans les deux cas, corriger le bug d'écran confirmé : `.weekly-program-panel` est listé dans `pageGroups.library` (app.js:1509) — il s'affiche donc sous l'onglet « 📚 Exercices » — alors que `ATHLETE_TABS` (app.js:1631) le déclare page Athlète > 'programme'. Le commentaire au-dessus de `pageGroups` documente déjà un bug identique corrigé sur `.objective-program-panel`.

**Pourquoi** : C'est l'étape qui fait vraiment disparaître un des « 30 000 coachs », mais c'est la plus coûteuse en arbitrage produit (elle supprime le seul endroit où Adrien peut aujourd'hui régler son nombre de séances — d'où l'ordre : ne la faire qu'APRÈS que l'étape 2 ait donné un réglage persistant ailleurs). Le bug de rangement de panneau, lui, se corrige en une ligne et vaut la peine d'être fait tout de suite : `qualitySession` (VO2max Billat 30/30, Norvégien 4×4, côtes) est du contenu de qualité que personne ne voit, puisqu'elle ne se déclenche qu'à partir de 3 courses alors que le défaut de l'écran est 2.

## Risques identifiés

- **Circularité TDEE ↔ volume.** Si `trainingWeekPlan` passe `plan.applied.sessions` à `energyPlan` au lieu du réglage `goals.sessions`, on obtient une boucle : plus de séances → TDEE plus haut → déficit relatif plus faible → politique plus permissive → plus de séances. Le remède est simple (energyPlan lit TOUJOURS le réglage utilisateur) mais l'erreur est très facile à commettre lors du branchement des écrans. À écrire en commentaire dans le code ET à couvrir par un test.

- **Doublons d'agenda pendant la transition.** Tant que l'étape 8 n'est pas faite, les deux boutons « Programmer (4 sem.) » écrivent deux séries de séances aux mêmes dates avec des `refId` différents (`objprog-*` vs `coachweek-*`) — l'idempotence par `refId` ne les voit pas comme des doublons. Ne pas livrer les étapes 5 et 6 sans l'étape 8, ou masquer temporairement le bouton `#coachWeekSchedule`.

- **Régression sur l'historique d'Adrien.** `pruneProgramSessionsFrom` (logic.js:6316) supprime les séances de programme futures non cochées. En élargissant son filtre à `coachweek-*` et `runplan-*`, un simple re-render du Programme auto pourrait effacer des séances que l'utilisateur avait planifiées volontairement depuis un autre écran. La garde `!a.completed` doit rester, et il faut décider explicitement si `source:'runplan'` (plan de course de l'écran Ultra-trail, indépendant) entre ou non dans le périmètre — mon avis : NON, l'écran trail reste autonome.

- **Sources scientifiques citées de mémoire.** Les références de l'étape 3 (Bickel 2011 MSSE, Schoenfeld 2016 Sports Med, Wilson 2012 JSCR, Trexler 2014 JISSN, Murach 2016) sont exactes dans leur conclusion mais leurs volumes/pages doivent être vérifiés avant d'être AFFICHÉS dans l'UI — le fichier a déjà l'exigence (Garthe 2011 IJSNEM 21:97, Longland 2016 AJCN, Aragon/ISSN 2017 JISSN 14:16 sont cités avec volume et page). Afficher une référence fausse coûte plus de crédibilité que ne pas en afficher.

- **L'ACWR est un garde-fou contesté.** `acuteChronicRatio` (logic.js:1823) alimente le modulateur de l'étape 3, mais le rapport aigu:chronique et son « seuil 1,5 » sont méthodologiquement critiqués (Impellizzeri et al. 2020, Sports Medicine). Il doit rester un modulateur discret (−15 % de volume, −1 séance dure) et ne JAMAIS être présenté à l'écran comme une mesure de risque de blessure.

- **Sur-ingénierie.** `trainingWeekPlan` risque de devenir une fonction de 200 lignes qui prend 16 entrées et dont plus personne ne peut prédire la sortie — c'est-à-dire le problème actuel, déplacé au lieu d'être résolu. Garde-fou : `trainingPolicy` reste séparée et testable seule ; `trainingWeekPlan` ne fait que composer des briques existantes (`energyPlan`, `objectiveProgram`, `blockPhase`, `assignProgramDays`) sans réimplémenter aucune d'elles.

- **Le split muscu/course auto peut décevoir.** Avec `goals.runs:'auto'`, un objectif 'endurance' en déficit se verra plafonné à 3-4 courses par `trainingPolicy` alors qu'un plan trail en demande 5-6. L'override numérique (`goals.runs` = 5) doit donc rester possible et respecté, avec un message honnête plutôt qu'un blocage : « 5 courses en déficit de 20 % : récupération à surveiller ».

- **Tests existants à mettre à jour.** `logic.test.js` teste `objectiveProgram` (l.3999-4053, l.7141) et `coachWeekPlan` (l.6000-6021) avec les valeurs actuelles. L'étape 1 (plancher runPlanWeek) change la sortie d'`objectiveProgram` pour 'muscle' et 'forme' : ces tests DOIVENT échouer et être corrigés sciemment — c'est le signe que le bug est réparé, pas une régression. Ne pas les « réparer » en remettant un plancher.

- **Deux nouveaux champs d'état = risque de migration.** `goals.runs` doit être normalisé AVANT toute lecture (`normalizeState`, app.js:41-44), sinon un état sauvegardé avant la mise à jour donne `undefined` → `NaN` → semaine vide. Et ne pas resserrer la borne de `goals.sessions` de 1..14 à 1..10 en STOCKAGE : un état existant à 12 serait silencieusement modifié. Le clamp se fait dans la fonction pure, pas dans la normalisation.

## État d’avancement

- [x] **Étape 1** — plancher de `runPlanWeek` retiré (commit « Le programme auto annonçait un nombre de séances… »).
      Vérifié à la main avant correction : « muscle » annonçait 1 course et en générait 3.
- [x] **Étape 2** — nombre de séances réglable et persistant (`goals.progSessions`, `goals.runs`).
      Décision de forme isolée dans `objectiveWeekShape()`, pure. Sans consigne, chaque objectif
      garde exactement sa forme d’avant. Bornes annoncées, jamais silencieuses.
- [x] **Étape 3** — `trainingPolicy` : en déficit on baisse le VOLUME, jamais les charges.
- [x] **Étape 4** — `trainingWeekPlan` + `trainingPlanInputs` : composent les briques, ne les réécrivent pas.
- [ ] Étape 5 — le Programme auto consomme le plan
- [ ] Étape 6 — le Coach Poids affiche LE MÊME plan
- [x] **Étape 7** — plus de « ajoute du cardio » sur un déficit déjà marqué (3 sites).
- [x] **Étape 5** — le Programme auto consomme trainingWeekPlan et affiche le bandeau de pilotage.
- [x] **Étape 6** — le Coach Poids affiche LE MÊME plan (mêmes séances, mêmes noms).
- [ ] Étape 8 (un seul planificateur d’agenda — sinon les deux boutons « Programmer » créent des doublons), 9 à 11

## Avertissement sur les sources scientifiques

Les références citées dans l’étape 3 (Bickel 2011, Schoenfeld 2016, Wilson 2012,
Trexler 2014, Murach 2016) ont été produites **de mémoire** par un agent et ne sont pas
vérifiées. Ne PAS les afficher dans l’app avant de les avoir contrôlées une par une :
l’app affiche déjà des sources réelles (Billat 2000, Helgerud 2007 dans `qualitySession`),
en ajouter des fausses détruirait la crédibilité que cette refonte cherche précisément.

# 442 — Coach Poids « Ta semaine type » : semaine lundi-en-tête, dimanche en dernier (2.0.75)

**Boucle #442 · build 2.0.75 · domaine Athlète / Coach Poids · correctness (§4.4, cohérence UX §4.4)**

## Le manque (vérifié avant de coder)

`coachWeekPlan(goal, days)` (`logic.js:5266`) construit la « 🗓️ Ta semaine type » du Coach Poids
(rendu `app.js:266`, `wk.sessions.map(s => dayShort[s.weekday])` avec
`dayShort = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']`).

Elle triait ses séances avec un comparateur **brut** `(a, b) => a.weekday - b.weekday`, où
dimanche vaut `0`. Résultat : dès que le dimanche fait partie des jours dispo (`state.profile.availableDays`,
éditable par l'utilisateur), il **remontait en tête de la semaine affichée** (« Dim … / Lun … »),
alors que toute l'app suit la convention **lundi-en-tête** via `(weekday + 6) % 7` :

- sa sœur directe `runPlanWeek` (`logic.js:5252-5253`) : `const order = w => (w + 6) % 7; … .sort((a,b) => order(a.weekday) - order(b.weekday))` ;
- `objectiveProgram` / `assignProgramDays`, `onboardingFirstSession`, `scheduleCoachWeek`
  (`app.js:277`, décale depuis lundi via `((s.weekday+6)%7)`) — tous lundi-en-tête.

`coachWeekPlan` était le seul planificateur asymétrique. Le comparateur `uniq` (`logic.js:5268`)
souffrait du même biais : il servait à **répartir** les séances sur les jours dispo et traitait
dimanche comme début de semaine, faussant l'espacement (« séances espacées sur la semaine »).

**Conséquence** : purement un souci d'**affichage + de répartition** — la programmation dans
l'agenda (`scheduleCoachWeek`) était déjà correcte (offset depuis lundi). Mais un utilisateur avec
le dimanche coché voyait sa « semaine type » commencer par un dimanche, en contradiction avec le
plan de course et le programme par objectif juste à côté.

## Le correctif

Aligner `coachWeekPlan` sur ses sœurs : un helper `const mon = w => (w + 6) % 7;` (lundi=0 …
dimanche=6), utilisé pour les **deux** tris — celui de `uniq` (répartition) et celui final des
`sessions` (affichage).

```js
const mon = w => (w + 6) % 7; // lundi=0 … dimanche=6 : convention semaine de l'app
const uniq = […].sort((a, b) => mon(a) - mon(b));
…
const sessions = chosen.map(…).sort((a, b) => mon(a.weekday) - mon(b.weekday));
```

Rétro-compatible : pour des jours dispo sans dimanche (1-6), `mon` préserve l'ordre — sortie
identique à avant. Le changement n'est visible que quand le dimanche est présent.

## Tests

- **logic.test.js** (`coachWeekPlan`) : `coachWeekPlan('maintien', [1, 0])` → jours `[1, 0]`
  (lundi avant dimanche, plus dim=0 en tête) ; `coachWeekPlan('perte', [1..6, 0])` → 1re séance
  lundi (`weekday===1`), dernière dimanche (`weekday===0`). Les cas existants (`[1,3,5]`,
  `[1..6]` sans dimanche) restent inchangés.
- **renderer-smoke.cjs** : check `coachWeek` étendu au cas semaine complète avec dimanche
  (`sessions[0].weekday===1 && dernier===0`) **et promu bloquant**
  (`if (!checks.coachWeek) errors.push(…)`).

`cd src && xvfb-run -a npm run verify` → **442 tests + smoke 100 % vert** (`coachWeek:true`).

## Suite

Piste #1 (haute confiance) de l'audit frais de `logic.js` de cette boucle. Piste #2 restante
(non implémentée) : `readinessScore` traite `sleep:0` comme « 0 h » (−40 pts) alors que ses sœurs
sommeil (`weeklySleepStats`, `sleepDebtHours`…) traitent `sleep:0` comme « nuit non chiffrée » —
asymétrie de convention, mais c'est en partie un choix de design (0 = pire vs inconnu). À
reconfirmer/trancher avant de coder.

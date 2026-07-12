# Boucle #180 (autonome) — Programme automatique selon l'objectif · build 1.9.114

**Demande d'Adrien :** « que ça soit automatique et que ça propose des séances en fonction de l'objectif pour le Run et la muscu/renforcement. Ex. corps athlétique = run X/sem avec un programme + muscu X/sem avec un programme précis + l'aide pour les séances directement. »

## Livré — nouveau panneau « 🎯 Mon programme selon mon objectif » (Athlète › Séance)

Tu choisis **UN objectif** dans une liste, l'app génère **toute ta semaine** automatiquement :

| Objectif | Course/sem | Muscu/sem (split) |
|---|---|---|
| 🏃 Corps athlétique | 3 | Haut · Bas · Full body |
| 💪 Prise de muscle | 1 | Poussée · Tirage · Jambes · Haut |
| 🔥 Perte de gras | 4 | Full body · Full body · Haut |
| 🏔️ Endurance / trail | 4 | Bas du corps · Full body |
| ⚖️ Remise en forme | 2 | Full body · Full body |

Chaque **séance de muscu** est concrète (exercices précis avec séries × reps, choisis dans ta bibliothèque en couvrant les bons groupes musculaires) et se **lance directement en mode guidé** (« ▶️ Démarrer cette séance ») — avec le minuteur de repos, la cible, le récap. Chaque **course** indique type + durée + conseil. Bouton **« 📅 Programmer la semaine (4 sem.) »** : place tout dans l'agenda (muscu 18h avec les exercices rattachés, course 7h30), jours espacés, sans doublon.

## Détail technique

- **`lib/logic.js`** (pur + testé) :
  - `pickExercisesForZones(zones, exercises, n)` — sélection round-robin d'exercices couvrant une liste de zones (une par zone, meilleures d'abord, sans doublon).
  - `FITNESS_OBJECTIVES` (5) + `FOCUS_ZONES`/`FOCUS_TITLE` (upper/lower/push/pull/legs/fullbody → zones).
  - `objectiveProgram(key, exercises, opts)` — compose la semaine : séances muscu (avec exos) + courses (via `runPlanWeek`), alternées et réparties sur des jours espacés (`weekday`). Null si objectif inconnu.
- **`app.js`** : `runObjectiveProgram()` (rendu), `scheduleObjectiveProgram(week, weeks)` (agenda, refId `objprog-…`, exercices rattachés pour relancer en guidé depuis le jour), câblage `#objectiveGenerate`. Panneau enregistré dans `ATHLETE_TABS` (onglet Séance).
- **`index.html`** : panneau `objective-program-panel` (`#objectiveSelect`, `#objectiveGenerate`, `#objectiveResult`).
- **`strength.css`** : styles `.op-*` (grille responsive, 1 colonne ≤ 650 px).

## Vérifs

- `npm run verify` → **219 tests / 219 pass** (+2 : `pickExercisesForZones`, `objectiveProgram`), garde-fou CSS vert, **SMOKE OK** (`objectiveProgram:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.114.exe** (app d'Adrien jamais fermée).

## Suite

Boucle #1 (générateur par objectif) démarrée. Prochaines itérations : enrichir/affiner (progression semaine après semaine, adaptation au matériel, lien objectif ↔ Coach Poids), puis boucle globale de polissage.

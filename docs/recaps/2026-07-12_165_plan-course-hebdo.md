# Boucle #165 (autonome) — Plan de course ≥ 4×/semaine · build 1.9.99

**Contexte :** thème C de la demande d'Adrien — pouvoir **courir au minimum 4×/semaine** pour améliorer son cardio, intégré à la planification.

## Livré

Dans le panneau **« Objectif ultra-trail »**, un bloc **« 🏃 Plan course »** : Adrien choisit **4 / 5 / 6 sorties par semaine** et clique *Générer ma semaine*. L'app compose une semaine de course équilibrée :

- **🟢 facile** (endurance fondamentale) · **🟠 tempo** (seuil) · **🔴 fractionné** (VMA/cardio) · **🔵 sortie longue** (le dimanche).
- Séances **réparties sur la semaine** et espacées (les dures ne se suivent pas), chacune avec **durée + raison**, total en minutes.
- Bouton **« 📅 Programmer (4 sem.) »** qui pose toutes les sorties dans l'**agenda** sur 4 semaines (dès lundi prochain, 07:30, sans doublon).

## Détail technique

- `lib/logic.js` : `runPlanWeek(count, opts)` — pur + testé. Patterns de jours + templates de séances par nombre de sorties (3→6, plafonné/planché), sortie longue en fin, `opts.days` peut imposer les jours. Renvoie `{sessions:[{weekday,type,label,minutes,why}], count, totalMinutes}`.
- `app.js` : `runRunPlan()` (rendu `#runPlanResult`) + `scheduleRunPlan(sessions, weeks)` (agenda, mapping lundi + `(weekday+6)%7`, refId anti-doublon, comme `scheduleWeekProgram`).
- `index.html` : bloc `#runPlanBar` + `#runPlanResult` dans le panneau trail.
- `trail.css` : styles `.run-plan-bar` / `.rp-week` / `.rp-day` (couleur par type).

## Vérifs

- `npm run verify` → **206 tests / 206 pass** (+1 : `runPlanWeek` — répartition, sortie longue en fin, plafond 6 / plancher 3, jours imposés). **SMOKE OK** (`runPlan:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.99.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Améliorations Coach Poids & progression ; cible pré-remplie en séance guidée ; récap de fin de séance ; responsive mobile continu.

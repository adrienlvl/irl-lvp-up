# Boucle #91 (autonome) — Série hebdomadaire de séances · build 1.9.25

**Contexte :** 16ᵉ itération de la boucle autonome. Aire : Athlète / motivation.

## Livré

L'en-tête du panneau **« Ton volume »** (page Athlète) affiche un badge **« 🔥 X sem. »** dès que tu enchaînes **au moins 2 semaines consécutives** avec une séance. Un renfort de régularité simple et motivant.

- Grâce en début de semaine : si la semaine en cours est encore vide, la série est comptée à partir de la semaine précédente (elle ne « casse » pas dès lundi matin).
- Sinon le badge reste neutre (📈).

## Détail technique

- `lib/logic.js` : `weeklyWorkoutStreak(workouts, todayKey)` pur + testé.
  - Regroupe les séances par semaine (lundi→dimanche, calcul local sans décalage UTC).
  - Compte les semaines consécutives en terminant cette semaine ; recule d'une semaine si la courante est vide (grâce), sinon 0.
- `app.js` : `renderAthlete` remplit `#weekStreakBadge` (`🔥 X sem.` + classe `.on` dès 2).
- `index.html` / `athlete.css` : badge dans le heading + style pastille orange.

## Vérifs

- `npm run verify` → **135 tests / 135 pass** (+1 : `weeklyWorkoutStreak` — 3 consécutives, grâce, trou, vide, entrée invalide), **SMOKE OK** (`weekStreak:true`).

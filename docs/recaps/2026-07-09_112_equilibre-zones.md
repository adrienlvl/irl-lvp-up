# Boucle #112 (autonome) — Équilibre des zones musculaires · build 1.9.46

**Contexte :** 37ᵉ itération de la boucle autonome. Aire : Athlète / équilibre du travail muscu.

## Livré

La **revue hebdomadaire** affiche une rangée de puces **« Zones travaillées (7 j) »** montrant combien d'exercices ont sollicité chaque groupe musculaire sur la semaine glissante :

> Jambes 3 · Fessiers 2 · Dos 1 · Pectoraux 1 · Épaules 0 · Bras 2 · **Abdos 0**

- Les zones à **0** sont estompées → on repère d'un coup d'œil ce qui est négligé (utile pour l'objectif d'Adrien : abdos + bras + bas du corps équilibrés).

## Détail technique

- `lib/logic.js` : `weeklyZoneCoverage(workouts, todayKey)` pur + testé — parcourt les séances des 7 derniers jours, mappe chaque exercice (`exercise` + `exercises[]`) vers ses zones via `exerciseZones`, compte par zone.
- `app.js` : `renderWeeklyReview` remplit `#weeklyReviewZones` (ordre jambes→abdos, libellés FR, classe `.zone-empty` si 0).
- `index.html` / `athlete.css` : conteneur `#weeklyReviewZones` + styles `.zone-chip`.

## Vérifs

- `npm run verify` → **152 tests / 152 pass** (+1 : `weeklyZoneCoverage` — comptage multi-zones, top-level + exercises[], hors fenêtre, vide, date invalide), **SMOKE OK** (`zoneCoverage:true`).

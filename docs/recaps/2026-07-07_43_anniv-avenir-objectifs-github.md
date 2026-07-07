# Boucle #45 — Anniv à venir (D2) + objectifs regroupés (B3) + recherche GitHub

**Date :** 2026-07-07
**Version :** 1.5.4 → 1.5.5

## Demande d'Adrien
« Fais récap des anniversaires à venir, regroupement des objectifs athlète ! Regarde sur GitHub si y'a du code qui peut être intéressant aussi ! »

## Ce qui a été fait
- **D2 — Récap anniversaires à venir** : `upcomingBirthdays(birthdays, todayKey, {withinDays, max})` pur + testé (prochaine occurrence, tri par proximité, âge à venir, passage d'année). Bandeau doré `#birthdayUpcoming` en haut de l'agenda : « 🎂 À venir — Adrien aujourd'hui (27 ans) · Papa dans 56 j (66 ans) » (horizon 60 j, 4 max). Rendu dans `renderAgenda`.
- **B3 — Objectifs regroupés** : `trail-panel` (« Objectif ultra-trail ») déplacé au début de la grille des objectifs, **côte à côte avec `goal-panel`** (« Cap sur l'objectif »). Sélecteur repliable élargi à `.training-grid > .panel` pour garder trail-panel repliable.
- **Recherche GitHub** → `docs/RECHERCHE-GITHUB.md` : principales pistes filtrées par notre contrainte locale/sécurité :
  1. **Récurrence RRULE** ([rrule.js](https://github.com/jkbrzt/rrule)) — le vrai manque : rendez-vous récurrents riches + **dépliage des séries à l'import .ics** (aujourd'hui on n'importe que la 1re occurrence). Reco : sous-ensemble **natif léger**, pas de dépendance.
  2. **« Dailies » de [Habitica](https://github.com/HabitRPG/habitica)** (inspiration) — habitudes quotidiennes récurrentes avec streak, pour compléter la to-do.

## Vérifications
- `node --test` → **83/83** ✅ (2 nouveaux `upcomingBirthdays`) ; smoke → `SMOKE OK`, check `ux3:true`.
- Flux réel : bandeau « à venir » correct (Maman hors horizon 60 j exclue), grille = trail-panel · goal-panel · week-panel. ✅

## Suite proposée
- **Récurrence d'événements native** (le plus utile d'après la recherche) : rendez-vous récurrents + dépliage des .ics importés.
- Ou **habitudes quotidiennes** (gamification façon Habitica).

_Build sans fermer l'app d'Adrien (cf. [[irl-build-ne-pas-tuer-app]])._

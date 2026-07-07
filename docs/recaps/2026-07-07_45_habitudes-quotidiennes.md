# Boucle #47 — Habitudes quotidiennes (Dailies) · loop auto #2

**Date :** 2026-07-07
**Version :** 1.5.6 → 1.5.7

## Contexte
Boucle d'amélioration auto — itération 2. Habitudes quotidiennes façon Habitica « Dailies » (idée issue de `docs/RECHERCHE-GITHUB.md`).

## Ce qui a été fait
- **`normalizeHabit`** : `{id, name, weekdays (vide = tous), xp (1..50), log:[jours faits], createdAt}`.
- **`habitStreak(habit, todayKey)`** pur + testé : série de jours **programmés** consécutifs faits, en remontant ; **tolérante** au jour même pas encore fait (ne casse pas la série), cassée par un trou.
- **`habitsForDay(habits, todayKey)`** pur + testé : habitudes prévues ce jour (filtre par jour de semaine) → `{id, name, xp, done, streak}`.
- **`state.habits`** (defaults + `normalizeState`).
- **Panneau « 🔥 Habitudes du jour »** (dashboard, sous « Aujourd'hui ») : ajout, coche/décoche, **🔥 série**, **+XP** à la validation (repris si décoché), suppression. Résumé « X/Y — parfait ✨ ». `renderHabits` (dans `renderDashboardCore`).

## Vérifications
- `node --test` → **91/91** ✅ (3 nouveaux : `normalizeHabit`, `habitStreak` tolérant/cassé, `habitsForDay` filtre+série).
- Smoke → `SMOKE OK`, check `habits:true`.
- Flux réel (Electron) : ajout « 10 min de lecture » → coche = ✓ + 🔥 1 + **+10 XP** + « parfait ✨ » ; décoche = XP repris, jour retiré du log. ✅

## Suite de la boucle
- **1b** : dépliage des séries **RRULE** des `.ics` importés (finir l'item récurrence).
- Puis items restants de `docs/ROADMAP.md` / `docs/RECHERCHE-GITHUB.md`.

_Loop auto-rythmé ; build sans fermer l'app d'Adrien (cf. [[irl-build-ne-pas-tuer-app]])._

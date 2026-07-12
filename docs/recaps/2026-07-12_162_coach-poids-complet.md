# Boucle #162 (autonome) — Coach Poids : affiner l'estimation + MODULE COMPLET · build 1.9.96

**Contexte :** étape **6/6** — la dernière du module Coach Poids demandé par Adrien. Le module est désormais **complet**.

## Livré (étape 6)

- **Niveau d'activité manuel** dans le panneau coach (Auto / Sédentaire / Léger / Modéré / Actif / Très actif), mémorisé dans `profile.activityLevel` et utilisé par `energyPlan` à la place du proxy séances/semaine → dépense énergétique plus juste.
- **Recalage sur la tendance réelle** : quand des pesées existent, la ligne « à ton rythme réel » affiche une **date réaliste recalculée** (depuis le rythme mesuré via `weightTrend`) + un **verdict** : *pile dans les temps 👌* / *plus lent — resserre le déficit* / *plus rapide — garde une marge*.

## Détail technique (étape 6)

- `lib/logic.js` : `activityLevelFactor(level)`, `dateAfterWeeks(todayKey, weeks)`, `paceStatus(plannedWeeks, realWeeks)` — purs + testés ; `energyPlan` accepte `activityLevel` (facteur explicite prioritaire, rétrocompatible) et réutilise `dateAfterWeeks`.
- `app.js` : select `#coachActivity` (valeur + handler), `energyPlan` reçoit `activityLevel`, ligne de recalage enrichie (date réaliste + verdict).
- `index.html` : select Activité dans `.cw-profile`.

## 🎯 Récapitulatif du MODULE COACH POIDS (boucles #157→162, builds 1.9.91→1.9.96)

Dans **Athlète → onglet Progrès**, panneau **« Mon plan pour atteindre ma cible »** :

1. **Fondations** (#157) — métabolisme (Mifflin-St Jeor), dépense (TDEE), **calories & macros cibles**, **date d'atteinte estimée** (rythme sûr).
2. **Projection graphique** (#158) — trajectoire prévue vs pesées réelles, **jalon de mi-parcours**, ligne « au rythme réel ».
3. **Plan d'entraînement semaine** (#159) — muscu (garde le muscle) + renfo + course (déficit), adapté perte/prise/maintien, placé sur les jours dispo.
4. **Nutrition détaillée** (#160) — répartition des calories sur 4 repas + macros/repas + repères « quoi manger ».
5. **Coaching + checklist hebdo** (#161) — marche à suivre en 5 étapes + **score d'adhérence** sur données réelles.
6. **Affinage** (#162) — niveau d'activité manuel + recalage sur la tendance réelle.

Total : **12 fonctions pures testées** (energyPlan, basalMetabolicRate, activityFactor, activityLevelFactor, dateAfterWeeks, paceStatus, weightForecast, coachWeekPlan, mealSplit, nutritionTips, coachSteps, weeklyAdherence).

## Vérifs

- `npm run verify` → **203 tests / 203 pass** (+2 : energyPlan activité manuelle ; `activityLevelFactor`/`dateAfterWeeks`/`paceStatus`). **SMOKE OK** (`coachRefine:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.96.exe** (app d'Adrien jamais fermée).

## Suite (polissage / idées)

Suivi des mensurations vers la cible ; ajustement calorique auto si stagnation ; export du plan ; rappels (pesée hebdo, protéines). À proposer à Adrien.

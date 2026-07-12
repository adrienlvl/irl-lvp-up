# Boucle #159 (autonome) — Coach Poids : plan d'entraînement semaine · build 1.9.93

**Contexte :** étape **3/6** du module Coach Poids. On combine muscu + renfo + course selon l'objectif de poids.

## Livré

Dans le panneau **🎯 Coach Poids**, sous la projection, un bloc **« 🗓️ Ta semaine type »** : une répartition d'entraînement adaptée à l'objectif, placée sur les jours dispo (profil).

- **Perte** : course + renfo (créent le déficit) + muscu (garde le muscle) — protéines hautes.
- **Prise** : priorité muscu (surcharge progressive), peu de cardio.
- **Maintien** : équilibre muscu / cardio.

Chaque jour affiche le **type** (🏋️ muscu / 🔥 renfo / 🏃 course), la **durée** et **pourquoi** cette séance, avec code couleur par type. Les séances sont **espacées** sur la semaine pour la récupération. Une note pédagogique rappelle la logique (déficit vs muscle). En-tête récap : *« 3 muscu · 1 renfo · 1 course »*.

## Détail technique

- `lib/logic.js` : `coachWeekPlan(goal, days, opts)` — pur + testé. Template de séances par objectif, cap au nombre de jours dispo, placement espacé (endpoints), tri par jour. Renvoie `{sessions:[{weekday,type,label,minutes,why}], strength, runs, renfo, note}`. Objectif inconnu → maintien ; sans jours → répartition par défaut.
- `app.js` : `renderCoachWeight` ajoute le bloc `.cw-train` (via `coachWeekPlan(plan.goal, profile.availableDays)`).
- `athlete.css` : styles `.cw-train`, `.cw-week` (grille responsive), `.cw-day` + bordure colorée par type.

## Vérifs

- `npm run verify` → **198 tests / 198 pass** (+1 : `coachWeekPlan` — perte/prise/maintien, cap jours, tri, objectif inconnu, sans jours). **SMOKE OK** (`coachWeek:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.93.exe** (app d'Adrien jamais fermée).

## Suite

4. Nutrition détaillée (répartition des calories sur les repas + idées de repas). 5. Coaching narratif + checklist hebdo. 6. Affiner l'estimation.

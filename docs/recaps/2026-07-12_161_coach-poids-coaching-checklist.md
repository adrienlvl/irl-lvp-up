# Boucle #161 (autonome) — Coach Poids : coaching + checklist hebdo · build 1.9.95

**Contexte :** étape **5/6** du module Coach Poids. On passe du « quoi » au « comment », et on mesure l'adhérence réelle.

## Livré

Dans le panneau **🎯 Coach Poids**, sous la nutrition, un bloc **« 🧭 Comment y arriver »** :

- **Marche à suivre** en 5 étapes claires, adaptées à l'objectif (perte / prise / maintien) — déficit ou surplus, protéines + muscu, cardio, sommeil/stress, patience & tendance.
- **Checklist d'adhérence de la semaine** (lundi → aujourd'hui) avec un **score %** calculé sur les **données réelles** :
  1. Séances faites vs plan,
  2. Protéines à la cible (≥ 3 jours),
  3. Hydratation (≥ 3 jours à l'objectif),
  4. Sommeil moyen ≥ 7 h,
  5. Pesée faite cette semaine.
- Chaque item est ✓/○ ; le score se colore (vert ≥ 80 %, jaune ≥ 50 %, rouge sinon). Adrien voit concrètement s'il tient son plan.

## Détail technique

- `lib/logic.js` :
  - `coachSteps(goal)` — pur + testé. 5 conseils « comment y arriver » selon l'objectif.
  - `weeklyAdherence(state, mondayKey, todayKey, opts)` — pur + testé. Compte séances/protéines/hydratation/sommeil/pesée sur la semaine, renvoie `{items, done, total, score}`.
- `app.js` : `renderCoachWeight` ajoute le bloc `.cw-coach` (étapes + checklist), `proteinTargetG` via `proteinTarget(profile)`, `sessionTarget` = nb de séances du plan.
- `athlete.css` : styles `.cw-steps`, `.cw-check`, `.cw-score` (hi/mid/lo).

## Vérifs

- `npm run verify` → **202 tests / 202 pass** (+2 : `coachSteps` par objectif ; `weeklyAdherence` — score 100/80 %, items séances/pesée, état vide → 0). **SMOKE OK** (`coachAdherence:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.95.exe** (app d'Adrien jamais fermée).

## Suite

6. **Dernière étape** : affiner l'estimation (recalage sur la tendance réelle mesurée + choix du niveau d'activité manuel), puis polir et proposer des idées d'amélioration.

# Boucle #157 (autonome) — Coach Poids : fondations · build 1.9.91

**Contexte :** début du module **« Coach Poids »** demandé explicitement par Adrien — un accompagnement complet pour atteindre sa cible de poids : *combien de temps*, *quelle date*, *quoi manger*, *quels entraînements*. Cette boucle pose les **fondations de calcul** ; les itérations suivantes ajoutent la projection graphique, le plan d'entraînement muscu+course, le plan nutrition détaillé et le coaching pas à pas.

## Livré (itération 1/n)

Nouveau panneau **« 🎯 Mon plan pour atteindre ma cible »** (Athlète → onglet **Progrès**) :

- Saisie **âge** + **sexe** (mémorisés dans le profil, servent au calcul du métabolisme).
- À partir du **poids actuel** (dernière mesure) et de la **cible** (objectifs) :
  - **métabolisme de base** (Mifflin-St Jeor) et **dépense énergétique** (TDEE) ;
  - **calories/jour cibles** + **macros** (protéines / glucides / lipides) ;
  - **date d'atteinte estimée** au rythme sûr (~0,6 %/sem en perte, 0,25 kg/sem en prise), calories jamais sous le métabolisme de base.
- Message d'invite si la cible de poids n'est pas encore définie.
- Disclaimer : repères généraux, pas un avis médical/diététique.

## Détail technique

- `lib/logic.js` :
  - `basalMetabolicRate(weight, height, age, sex)` — Mifflin-St Jeor, pur + testé.
  - `activityFactor(sessionsPerWeek)` — palier sédentaire→très intense, pur + testé.
  - `energyPlan({weight, height, age, sex, sessionsPerWeek, targetWeight, todayKey})` — pur + testé. Renvoie `{bmr, tdee, goal, diff, ratePerWeek, deficit, dailyTarget, proteinG, fatG, carbG, weeks, targetDate}`.
- `app.js` : `profile.age`/`profile.sex` (défauts 30 / homme), `renderCoachWeight()` câblé dans `renderAthlete` + `#addWeightButton`, handlers `#coachAge`/`#coachSex`.
- `index.html` : `<section class="panel coach-weight-panel">` (inputs + `#coachWeightBody`), enregistrée dans `ATHLETE_TABS` (onglet progrès).
- `athlete.css` : styles `.coach-weight-panel`, `.cw-head`, `.cw-macros`.

## Vérifs

- `npm run verify` → **196 tests / 196 pass** (+3 : `basalMetabolicRate`, `activityFactor`, `energyPlan` — calories/macros/rythme/date, perte/prise/maintien, sans cible → null). **SMOKE OK** (`coachWeight:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.91.exe** (app d'Adrien jamais fermée).

## Suite prévue (boucle Coach Poids)

1. Projection graphique : trajectoire prévue vs poids réels, jalons (mi-parcours), date « au rythme réel ».
2. Plan d'entraînement de la semaine tailored perte/prise : muscu (garder le muscle) + renfo + course (déficit), placé selon les jours dispo.
3. Nutrition détaillée : répartition des repas sur les calories cibles + idées de repas (CIQUAL) + repères « quoi manger ».
4. Coaching narratif « comment y arriver » + checklist hebdo + suivi d'adhérence.
5. Affiner l'estimation (niveau d'activité manuel, recalage sur la tendance réelle).

# Boucle #158 (autonome) — Coach Poids : projection graphique · build 1.9.92

**Contexte :** étape **2/6** du module Coach Poids. Après les fondations (calories, macros, date cible), on **visualise** la trajectoire et on la confronte à la réalité.

## Livré

Dans le panneau **🎯 Coach Poids**, sous les calories/macros, un bloc **projection** :

- **Graphique** superposant la **trajectoire prévue** (ligne pointillée, du poids actuel vers la cible au rythme sûr) et les **pesées réelles** (ligne pleine + points) — avec légende Prévu / Réel.
- **Jalon de mi-parcours** : *« 🚩 Mi-parcours : X kg visé vers le JJ/MM »*.
- Ligne **« à ton rythme réel »** (via `weightTrend`) :
  - si la tendance mesurée va vers la cible → *« 📊 À ton rythme réel (Y kg/sem) : cible dans ~N sem. »* (vert) ;
  - sinon → alerte *« ta tendance récente ne va pas encore vers la cible — ajuste calories/activité »* (orange).

Adrien voit d'un coup d'œil s'il est **en avance, dans les temps ou en retard** sur son plan.

## Détail technique

- `lib/logic.js` : `weightForecast(current, target, ratePerWeek, weeks, todayKey)` — pur + testé. Un point/semaine today→cible, valeurs bornées à la cible, arrondi 0,1 ; `[]` si données invalides.
- `app.js` : `coachForecastSvg(planned, actual)` (SVG 2 lignes, normalisation dates+valeurs) ; `renderCoachWeight` ajoute le graphique + jalon mi-parcours + ligne rythme réel (réutilise `weightTrend`).
- `athlete.css` : styles `.cw-forecast`, `.cw-plan-line` (pointillés accent), `.cw-actual-line` (violet), légende, `.cw-milestone`, `.cw-real` (ok/off).

## Vérifs

- `npm run verify` → **197 tests / 197 pass** (+1 : `weightForecast` — trajectoire hebdo, bornage cible, perte/prise, garde-fous rythme/semaines/cible). **SMOKE OK** (`coachForecast:true` — SVG contient les deux lignes). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.92.exe** (app d'Adrien jamais fermée).

## Suite

3. Plan d'entraînement de la semaine (muscu + renfo + course) adapté perte/prise. 4. Nutrition détaillée (repas sur calories cibles). 5. Coaching narratif + checklist. 6. Affiner l'estimation.

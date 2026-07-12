# Boucle #166 (autonome) — Cible de progression pré-remplie en séance guidée · build 1.9.100

**Contexte :** thème D (améliorer la progression). Rendre la double progression **actionnable en pleine séance**.

## Livré

Pendant une **séance guidée**, pour un exercice chargé qui a un historique, la fiche affiche une ligne **« 🎯 Cible du jour : X reps × Y kg »** (via `progressionSuggestion`, double progression 8-12 reps puis +2,5 kg). Si le plafond est atteint : *« — monte la charge 💪 »*.

En plus, les **champs charge/reps de chaque série sont pré-remplis** (placeholder) avec la cible du jour — plus besoin de se rappeler combien on avait fait la dernière fois, la valeur à viser est déjà là.

## Détail technique

- `app.js` : `renderGuidedWorkout` calcule `progressionSuggestion(state.workouts, current.name, {8,12,2.5})`, remplit `#guidedTarget` et injecte `nextLoad`/`nextReps` comme placeholders des inputs de série (repli sur « Charge » / reps de base pour le poids du corps).
- `index.html` : `<p id="guidedTarget">` sous l'indice de progression.
- `strength.css` : style `.guided-target` (encadré violet), `:empty` masqué.
- Réutilise la fonction pure `progressionSuggestion` (déjà testée) — pas de nouvelle logique à tester ; couverture via smoke.

## Vérifs

- `npm run verify` → **206 tests / 206 pass**. **SMOKE OK** (`guidedTarget:true` — élément présent + cible calculée : 9 reps → vise 10 même charge). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.100.exe** (app d'Adrien jamais fermée). _Versionnage : 1.9.100 > 1.9.99 (semver numérique, electron-updater OK)._

## Suite (boucle en cours)

Récap de fin de séance guidée (tonnage + PR) ; menu réel calé sur les calories du Coach Poids ; suivi des mensurations vers la cible ; historique du score d'adhérence ; ajustement calorique auto.

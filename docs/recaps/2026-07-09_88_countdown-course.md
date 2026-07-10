# Boucle #88 (autonome) — Compte à rebours J-XX vers la course · build 1.9.22

**Contexte :** 13ᵉ itération de la boucle autonome. Aire : Athlète / objectif de course.

## Livré

Le bloc **objectif de course** affiche désormais un **compte à rebours en jours** :
- le grand compteur passe en **« J-XX »** quand la course approche (≤ 60 jours), sinon reste en mois/semaines,
- la ligne d'état devient « Course le JJ/MM — **J-XX** · dans N semaines ».

Plus précis et motivant à l'approche de l'échéance (course ou palier).

## Détail technique

- `lib/logic.js` : `daysUntil(fromKey, toKey)` pur + testé (jours entre 2 dates, négatif si passé, null si invalide). `raceGoalStatus` renvoie `daysLeft`.
- `app.js` : `renderRaceGoal` utilise `status.daysLeft` (compteur J-XX ≤ 60 j + ligne d'état).

## Vérifs

- `npm run verify` → **132 tests / 132 pass** (+1 : `daysUntil` ; +assert `raceGoalStatus.daysLeft`), **SMOKE OK**.

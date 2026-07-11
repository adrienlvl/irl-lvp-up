# Boucle #114 (autonome) — Durée estimée de la séance guidée · build 1.9.48

**Contexte :** 39ᵉ itération de la boucle autonome. Aire : Séance guidée / planification.

## Livré

L'en-tête de la **séance guidée** affiche désormais une **durée totale estimée** — « ≈ 32 min » — à côté du compteur d'étapes.

On sait avant de démarrer combien de temps prévoir (utile pour caser une séance dans une journée chargée), en cohérence avec le « temps planifié du jour » déjà ajouté à l'agenda.

## Détail technique

- `lib/logic.js` : `sessionMinutes(list)` pur + testé — somme d'une liste de durées (minutes), arrondi par élément, valeurs invalides/négatives ignorées.
- `app.js` : `renderGuidedWorkout` calcule le total via `exercisePrescription(x).minutes` par exercice et remplit `#guidedSessionTime`.
- `index.html` / `strength.css` : `#guidedSessionTime` dans la barre de progression + style accent.

## Vérifs

- `npm run verify` → **154 tests / 154 pass** (+1 : `sessionMinutes` — somme, arrondi, invalides/négatifs, vide, non-tableau), **SMOKE OK** (`sessionTime:true`).

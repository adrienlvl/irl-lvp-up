# #376 — A11y : les boutons « × » de fermeture ont un libellé (2.0.20)

## Le manque

Huit fenêtres (agenda, quête, séance, séance guidée, revue de focus, fiche exercice, programme,
historique) se ferment via un bouton `×` sans texte ni `aria-label`. Pour un lecteur d'écran, ce
bouton n'était annoncé que comme « bouton » — aucune indication qu'il ferme la fenêtre.

## Ce qui change

- Les boutons `#closeAgendaEdit`, `#closeDialog`, `#closeWorkoutDialog`, `#closeGuidedWorkout`,
  `#closeFocusReview`, `#closeExerciseDetail`, `#closeZonePlan`, `#closeHistoryDialog` reçoivent
  `aria-label="Fermer"`. Aucun impact visuel (le `×` reste affiché).

## Tests

392 tests + check smoke `closeButtonsA11y` **bloquant** (les 8 boutons ont bien un `aria-label` non
vide). Le check `escapeOverlay` ferme désormais les `dialog[open]` restants avant de manipuler
`weekPage`/`calendarPage`, pour rester indépendant de l'ordre des checks précédents.

## Contexte

Build **2.0.20**. Pas de Release (lot en cours). Domaine Accessibilité (§4.3), après une série
côté Alternance (#372-375).

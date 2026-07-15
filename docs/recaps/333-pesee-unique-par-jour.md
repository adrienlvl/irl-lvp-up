# #333 — Une pesée par jour, partout (harmonisation) (1.9.267)

## Le souci (robustesse, relecture de mon #331)

Au #331 j'ai ajouté une saisie du poids dans l'onglet Poids (`#coachLogWeight`) qui **remplace** la
pesée du jour (une par jour). Mais l'ancien point de saisie dans Athlète (`#addWeightButton`)
**ajoutait** sans dédupliquer → deux comportements différents pour la même donnée. Des pesées
multiples le même jour faussent `weightTrend`, `weightForecast` et les paliers (qui lisent
`state.weights`).

## Ce qui change

Fonction pure partagée `upsertWeight(weights, value, dateKey)` : garantit **une pesée par jour**
(remplace celle du jour si elle existe, sinon ajoute), borne [30..300], arrondit à 0,1, trie par
date, sans muter l'entrée. Les **deux** points de saisie (Athlète + Poids) l'utilisent désormais →
comportement identique, plus de doublons.

## Vérification

- `upsertWeight` (node:test) : ajout nouvelle date, remplacement même date, arrondi, tri,
  non-mutation, bornes et date invalide → inchangé.
- Smoke `weightUpsertShared` **bloquant** : clique le vrai `#addWeightButton` deux fois le même jour
  (80 puis 80,6) → une seule entrée à 80,6.

## Tests

356 tests `node:test` + smokes bloquants (`weightUpsertShared`, plus `coachLogWeight` du #331).

## Rotation

#333 — rotation 31 (build 1.9.267).

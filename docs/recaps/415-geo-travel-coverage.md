# 415 — Couverture : `haversineKm` & `travelModes`, cas limites du module Déplacements (tests seuls)

## Le manque (§4.1 — couverture réelle, domaine frais)

Deux fonctions pures du module **Déplacements** (agenda / itinéraires OSRM) n'avaient qu'une
assertion « ordre de grandeur » chacune, alors qu'elles portent plusieurs bornes et replis muets
jamais exercés :

- `haversineKm` (`src/lib/logic.js:1009`) — distance à vol d'oiseau (km) entre deux points
  `{lat, lon}`, `null` si coord invalide. Testé : Lorient→Rennes (fourchette) + une coord manquante.
  **Non couvert** : points identiques → `0` exact (la branche `atan2(0, 1)`), premier/second point
  absent, `lat` non numérique → `null`, coords passées en **chaînes numériques** (`'47.748'`) via
  `Number()`, et la **symétrie** `a→b === b→a`.
- `travelModes` (`src/lib/logic.js:1022`) — dérive un temps voiture/vélo/marche depuis distance (m)
  et durée voiture OSRM (s). Testé : cas nominal 20 km, distance nulle, repli voiture (`driveSec=0`).
  **Non couvert** : le **plancher à 1 min** (`Math.max(1, …)`) dès qu'il y a une distance (0,2 km →
  vélo 1 min, marche 2 min), l'**arrondi de `distanceKm` au dixième** (12 340 m → 12,3), la distance
  **négative ramenée à 0** (`Math.max(0, …)` → vélo/marche 0), et les **entrées non numériques** →
  `{distanceKm:0, driving:0, cycling:0, walking:0}`.

## Le geste (tests seuls, aucun code modifié)

Comportements d'abord **exécutés sur le code réel** (`node -e …`) puis figés en assertions ajoutées
aux deux tests existants (`test/logic.test.js`, blocs `haversineKm` l. 2892 et `travelModes` l. 6199).
Aucune ligne de `logic.js` touchée : ces fonctions étaient déjà correctes — c'est un **filet de
non-régression** sur leurs bornes, pas une correction de bug. Pas de nouveau `test()` : uniquement des
assertions dans les blocs existants, donc le compte de tests est inchangé.

## Portée & sûreté

- Purement additif, tests uniquement → **pas de bump de version, pas d'entrée CHANGELOG** (règle
  VPS-AUTOPILOT §6 : changement sans effet utilisateur). Aucune Release, zéro dépendance, aucune
  donnée perso, aucune fonctionnalité retirée.
- Variété (§4) : rupture nette avec les familles récentes — module **Déplacements/géo** (jamais
  travaillé dans les dernières boucles), type **couverture (§4.1)**, après Sommeil (#413),
  accessibilité (#412) et parseurs de date Alternance/.ics (#411, #414).

## Note de session (concurrence VPS — course d'index)

Une session concurrente (PC/local) a commité **#414** (import `.ics`, 2.0.53) pendant cette itération,
via un `git add`/commit large qui a **embarqué mes assertions non encore commitées** dans son commit
`d5c7750` — exactement le risque documenté dans `[[autopilot-concurrent-sessions]]`. Résultat : les
tests géo ci-dessus sont **déjà dans `master`, poussés et verts** (folded dans #414). Aucun travail
tiers écrasé ni perdu. Ce commit **#415** ne porte donc que la documentation (ce récap + la puce
ROADMAP) ; le contenu de test, lui, a atterri un commit plus tôt.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **434 tests + smoke 100 % verts** (`SMOKE OK`). Pas de bump
(2.0.53 conservé, tests seuls). Boucle #415.

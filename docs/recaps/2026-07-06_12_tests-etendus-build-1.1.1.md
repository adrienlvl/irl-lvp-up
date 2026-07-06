# Récap boucle #14 — Tests étendus (3.4) + rebuild 1.1.1

**Quand :** 2026-07-06 (mode continu)
**Vague :** 3 — tâche 3.4 ✅ + rebuild
**Statut :** ✅ vérifié (31/31 tests, smoke OK, .exe 1.1.1 testé)

## 3.4 — Couverture de tests étendue ✅
- Extrait le **calcul de prescription** d'exercice (`prescriptionFor(x, source)` + `formatFor`) dans `lib/logic.js` (pur, source injectée) ; `app.js` garde un wrapper mince qui fait le lookup dans la bibliothèque. Le calcul (repos par famille, unité, durée estimée) est désormais **testé**.
- **23 → 31 tests** `node:test`. Nouveaux cas :
  - `prescriptionFor` : repos par défaut selon la famille (general 75 / core 45 / conditioning 30), unité héritée, `rest` explicite prioritaire, durée min 1, valeurs manquantes tolérées.
  - `formatFor` : rendu `sets×reps unit`, `?` si manquant.
  - `normalizeAgendaItem` : **titre hostile** (`<img onerror=…>`) conservé en texte brut (rappel : `escapeHtml` protège à l'affichage).
  - `buildIcs` : multi-événements, invalides ignorés, ordre conservé.
  - `planStudySessions` / `mergePlannedEvents` : semaine vide, plages nulles, entrées non-tableau.

## Rebuild → IRL LVP UP 1.1.1
- Version bumpée 1.1.0 → **1.1.1** (accumule : rendu ciblé, CSS consolidés, données extraites, prescription extraite).
- **`D:\IRL LVP UP\build-dist\IRL LVP UP Setup 1.1.1.exe`** (109 Mo) construit ; l'app packagée démarre sans erreur.
- (L'installeur 1.1.0 reste à côté ; `build-dist/` est hors git.)

## État roadmap
- **Vague 0/1/2/S : ✅** · **Vague 3 : ✅** (3.1 données extraites, 3.2 CSS 19→15, 3.3 rendu ciblé, 3.4 tests). Reste optionnel en 3.1 : découper les gros blocs de rendu (non urgent).
- **Vague 4 (features) : à prioriser avec Adrien.**

## Prochaine étape
- Proposer à Adrien les priorités **Vague 4** : graphiques enrichis, export PDF hebdo, vue « Ma semaine » unifiée (sport + révision), thème clair/sombre, purge des règles CSS mortes.

## Git
- Commit : `test+build: prescription pure testée (31 tests) + installeur 1.1.1 (3.4)`.

# Boucle #94 (autonome) — Courbe de volume par exercice · build 1.9.28

**Contexte :** 19ᵉ itération de la boucle autonome. Aire : Athlète / progression muscu.

## Livré

Le panneau **« Suivi de progression »** (sélection d'un exercice) affiche désormais une **mini-courbe en barres du volume** (charge × répétitions × séries) sur les **8 dernières séances**, sous le rappel de la dernière séance.

On visualise la tendance réelle de charge de travail — utile pour l'objectif muscu d'Adrien (« abdos/haut du corps au max ») — au lieu de la seule comparaison texte volume précédent → actuel.

- Une valeur par jour de séance (volumes du même jour agrégés).
- Apparaît seulement s'il y a ≥ 2 séances avec du volume renseigné.

## Détail technique

- `lib/logic.js` : `exerciseVolumeSeries(entries, name, limit)` pur + testé — filtre par nom, agrège le volume par date, trie et garde les N dernières.
- `app.js` : `renderExerciseProgression` mappe `exerciseEntries()` → `{name,date,volume}`, construit la série et la rend via `barChartSvg` (réutilisé des graphiques).
- `athlete.css` : styles `.prog-spark` / `.prog-spark-label`.

## Vérifs

- `npm run verify` → **138 tests / 138 pass** (+1 : `exerciseVolumeSeries` — agrégation par jour, limite N, exercice inconnu, entrée non-tableau), **SMOKE OK** (`progSpark:true`).

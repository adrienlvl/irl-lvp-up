# 599 — Progression muscu autorégulée et fondée science (2.0.215)

> Série coaching poussé à fond. Recherche muscu (workflow WebSearch) puis code sourcé.

## Ce qui change (dans `progressionSuggestion` / `progressionText`)

1. **Incrément de charge par zone** (`progressionIncrement(name)`, pur+testé) : **+5 kg** sur les
   poly-articulaires du bas du corps (squat, soulevé, presse à cuisses, fente, hip thrust), **+2,5 kg**
   sur le haut du corps et l'isolation. Reconnaissance par mots-clés (robuste au texte libre, repli
   `exerciseZones`). _Source : ACSM Position Stand 2009 (Ratamess, MSSE 41:687 — « +2-10 % »)._
2. **Règle 2-for-2** : dépasser le haut de la fourchette de **≥ 2 reps** signale une charge trop
   légère → **saut de charge franc** (double incrément) au lieu du micro-pas. _Source : NSCA
   (Baechle & Earle) ; ACSM 2009._ Champ `overshoot` renvoyé.
3. **Guidance RIR/RPE** dans chaque conseil : garder **~1-2 reps en réserve (RPE 8-9)** plutôt que
   l'échec — autant de muscle/force, moins de fatigue et de risque. _Sources : Zourdos 2016 (JSCR
   30:267, échelle RIR↔RPE) ; Grgic/Refalo 2022-2024 (proximité de l'échec)._

L'incrément par zone est branché dans les deux appelants (séance guidée + détail exercice) : la
« cible du jour » d'un squat propose désormais +5 kg, pas +2,5.

## Vérifs

- **546 tests** + smoke verts. Tests : `progressionIncrement` (bas +5 / haut +2,5), règle 2-for-2
  (14 reps sur cible 12 → double incrément, `overshoot`), guidance RIR présente dans `progressionText`.

## Suite de la série coaching

Fait : coach poids/nutrition (#595), prehab kiné (#598), progression muscu (#599). Restent : **volume
landmarks** (MEV≈10 → MRV≈20 séries/muscle/sem, déjà partiellement via `weeklySetsPerZone`), **deload**,
et le gros morceau **running/trail** (zones polarisé 80/20, +10 %/sem, VO2max, sortie longue, affûtage,
**distance par objectif**).

## Fichiers

- `src/lib/logic.js` — `progressionSuggestion` (2-for-2/`overshoot`), `progressionIncrement`,
  `progressionText` (RIR) + export + CHANGELOG 2.0.215.
- `src/app.js` — les 2 appelants passent `progressionIncrement(name)`.
- `src/test/logic.test.js` — tests.

Domaine : athlete

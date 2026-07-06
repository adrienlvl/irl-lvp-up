# Récap boucle #22 — Objectifs intermédiaires (paliers)

**Quand :** 2026-07-06
**Vague :** 5 (Coaching) — complément 5.3
**Statut :** ✅ vérifié (45/45 tests, smoke OK, paliers confirmés en app)
**Ta demande :** « mettre des objectifs intermédiaires ».

## Ce que j'ai fait
- **`intermediateGoals(goal, now)`** (lib/logic.js, pur + testé) : génère une **échelle de courses intermédiaires** croissantes, réparties sur le temps disponible avant l'objectif principal, pour valider la progression sans brûler les étapes.
  - Distances tirées d'une échelle standard (10 km → 100 km) filtrées sous l'objectif.
  - 2 à 3 paliers selon le temps restant (aucun si l'objectif est proche < 20 sem ou petit).
  - Chaque palier : nom, distance, **date cible** et échéance en mois.
- **Affichage** dans la section « Mon objectif de course » (page Ultra) : une timeline des paliers + le 🏁 objectif final mis en avant (bordure dorée).

## Vérifié pour ton cas (ultra 170 km à 2 ans)
Retour réel de l'app :
- **Semi-marathon (21 km)** — dans **7,1 mois**
- **Ultra 50 km** — dans **13,3 mois**
- **Ultra 100 km** — dans **19,6 mois**
- 🏁 **Ultra 150–200 km (170 km)** — objectif final (~24 mois)

Progression logique et sécuritaire : tu valides chaque étape avant la suivante. Si tu changes d'objectif (marathon, semi…), les paliers se recalculent automatiquement.

## Vérifications
- `node --check` OK · `npm test` **43 → 45** (paliers croissants/échelonnés + cas « pas de paliers ») · smoke `SMOKE OK`.

## Suite (dernière brique coaching)
- **5.4** : échauffement spécifique en tête des séances guidées + compagnon d'entraînement qui argumente le plan du jour selon la phase de course. Puis rebuild `.exe` 1.1.4.

## Git
- Commit : `feat(coaching): paliers intermédiaires vers l'objectif de course`.

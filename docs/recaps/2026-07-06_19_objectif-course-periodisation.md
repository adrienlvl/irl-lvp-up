# Récap boucle #21 — Objectif de course & périodisation (Vague 5.3)

**Quand :** 2026-07-06
**Vague :** 5 (Coaching) — 5.3 ✅
**Statut :** ✅ vérifié (43/43 tests, smoke OK, calcul objectif confirmé)
**Ton cap :** **150–200 km d'ici 2 ans**, ajustable (marathon, semi, autres ultras).

## Ce que j'ai construit
- **Section « Mon objectif de course »** en tête de la page **Ultra-trail** :
  - **Presets** : Semi (21 km), Marathon (42 km), Ultra 50/80/100 km, **Ultra 150–200 km**, ou distance libre.
  - Distance (km) + **date de la course**.
  - Affichage automatique : **échéance** (mois/semaines), **phase actuelle**, **sortie longue cible**, et le **focus du moment** (texte de coach).
  - **Ajustable à tout moment** : change le type/la date, tout se recalcule.
- **Périodisation automatique** (`racePhase`, pure + testée) selon les semaines restantes :
  - **> 1 an → Fondation long terme** : base aérobie + force générale, sans se presser (← ta situation actuelle).
  - **≤ 1 an → Base** · **≤ 20 sem → Développement** · **≤ 8 sem → Spécifique** · **≤ 2 sem → Affûtage** · passé → récup + nouveau cap.
- **Sortie longue cible** calculée depuis la distance et la phase (`raceGoalStatus`).

## Vérifié pour ton cas (ultra 170 km à 2 ans)
Retour réel de l'app : `Ultra 150–200 km · 170 km` · **échéance 23,9 mois** · phase **Fondation long terme** · sortie longue **≈ 120 min** · focus « Installe l'habitude et la base aérobie… ». 👌

## Vérifications
- `node --check` OK · `npm test` **39 → 43** (weeksBetween, racePhase, raceGoalStatus ultra 2 ans + marathon proche) · smoke `SMOKE OK` (+ garde-fou : bibliothèque ≥ 37 exercices).

## Rebuild → 1.1.3
- Version bumpée, rebuild `.exe` en cours (embarque : icônes SVG, matériel réel, programmes hybrides, objectif de course).

## Suite (Vague 5, reste)
- **5.4** : le compagnon d'entraînement propose un **plan du jour argumenté** (qui tient compte de la phase de course) + **échauffement spécifique** en tête des séances guidées.

## Git
- Commit : `feat(coaching): objectif de course + périodisation auto (5.3) + build 1.1.3`.

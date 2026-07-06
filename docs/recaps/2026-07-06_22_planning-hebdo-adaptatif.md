# Récap boucle #24 — Planning hebdo adaptatif + build 1.1.4

**Quand :** 2026-07-06
**Vague :** 5 (Coaching) — 5.7
**Statut :** ✅ vérifié (52/52 tests, smoke OK, génération confirmée en app)
**Ta demande :** ajuster automatiquement la fréquence (jusqu'à 7/sem), choisir mes jours, l'app s'adapte.

## Ce que j'ai construit
- **`buildWeekPlan(days, opts)`** (lib/logic.js, pur + 6 tests) : à partir des jours cochés (0–7), assigne un type à **chaque** jour :
  - **Sortie longue** placée le **week-end** si possible (sinon le dernier jour) ;
  - **Musculation** : 1 à 3 selon le nombre de jours, en gardant les jambes fraîches **avant la sortie longue** ;
  - **Fractionné** : seulement en **phase avancée** (développement/spécifique) et si ≥ 4 jours, à distance de la sortie longue ;
  - le reste en **course facile** ;
  - **lissage** : jamais deux jours durs consécutifs (une muscu redevient course facile).
- **`generateAutomaticWeek` réécrit** : plus de plafond arbitraire — chaque jour coché reçoit une séance. **Régénérable** : retire les anciens créneaux *auto* de la semaine (garde tes créneaux manuels) et reconstruit selon tes jours du moment.
- **Adapté à ta phase de course** : en Fondation/Base → volume facile + force + longue, pas de fractionné (correct pour construire la base) ; en Spécifique → apparition du fractionné.
- UI : intitulés mis à jour (« Coche tes jours — jusqu'à 7 », « Générer ma semaine ») ; nouveaux types dans le planning manuel (Sortie longue, Fractionné) ; `startPlannedWorkout` gère les nouveaux types (durées : longue 90 min, fractionné 40 min).

## Vérifié en app (bout en bout)
- 5 jours (Lun/Mar/Jeu/Sam/Dim), base → Lun Musculation · Mar Course · Jeu Course · **Sam Sortie longue** · Dim Course (5 créneaux, aucun jour dur collé).
- 6 jours (Lun–Sam), spécifique → Lun Course · **Mar Fractionné** · Mer Course · Jeu Musculation · Ven Course · Sam Sortie longue.

## Vérifications
- `node --check` OK · `npm test` **47 → 52** (buildWeekPlan : 1 type/jour, 1 longue, pas 2 durs de suite, fractionné selon phase, cas limites) · smoke `SMOKE OK`.

## Rebuild → 1.1.4
- Version bumpée, rebuild `.exe` (embarque : compléments nutrition + planning adaptatif + tout le coaching).

## Reste (dernière brique)
- **5.4** : échauffement spécifique dans les séances guidées + phrase du compagnon selon la phase de course.

## Git
- Commit : `feat(coaching): planning hebdo adaptatif jusqu'à 7 jours (5.7) + build 1.1.4`.

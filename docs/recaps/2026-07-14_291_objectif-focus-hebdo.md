# #291 — Objectif hebdomadaire de concentration (1.9.225)

**Rotation 20 · item #4 (CLÔTURE) · liberté totale (domaine : focus / rituels)**

## Problème
Le focus avait une heatmap 8 semaines et une série de jours (🔥) mais, contrairement
à la course (`runWeekGoal`) et au bien-être (`wellnessGoalProgress`), **aucun
objectif hebdomadaire de minutes** ni barre de progression : impossible de voir
d'un coup si la semaine tient le cap côté concentration protégée.

## Amélioration
Sous les stats de focus, une barre « Concentration cette semaine » avec cible
indicative de 120 min, progression et statut coloré.

### Logique pure — `focusWeekGoal(focusSessions, todayKey, targetMin)`
- Somme des minutes de focus de la semaine (lundi → `todayKey` inclus), dates
  valides seulement ; ignore la semaine précédente.
- Cible = `targetMin` (défaut `FOCUS_WEEK_TARGET_MIN = 120`, borné ≥ 1).
- Renvoie `{ done, target, pct (plafonné 100), remaining, sessions, status }`
  — `status` : `done` (≥ cible) / `onTrack` (≥ 60 %) / `behind`. `null` si clé invalide.

### Rendu — dans `renderFocusRitual()`
- Barre `#focusWeekGoal` (classe `focus-week-goal fwg-<status>`), masquée si `null`.
- « 🧠 Concentration cette semaine · X / 120 min » + libellé (atteint / en bonne
  voie / encore N min) + nombre de blocs.

## Tests
- `logic.test.js` : agrégat semaine, exclusion semaine précédente + dates invalides,
  statuts done/onTrack/behind, cible par défaut, clé invalide → null.
- `renderer-smoke.cjs` : check `focusWeekGoal` (présence `#focusWeekGoal` + calcul).
- `npm run verify` : **314 tests + SMOKE OK** (`whatsNew` vert).
- Vérif navigateur (tab-8, 75 min semés) : « 🧠 Concentration cette semaine ·
  75 / 120 min · en bonne voie · 2 blocs », barre 63 %, classe `fwg-onTrack`. ✔

## Fichiers
- `src/lib/logic.js` — `FOCUS_WEEK_TARGET_MIN`, `focusWeekGoal()` + exports + CHANGELOG[0] 1.9.225.
- `src/app.js` — barre dans `renderFocusRitual()`.
- `src/index.html` — `#focusWeekGoal` après `#focusStats`.
- `src/polish.css` — `.focus-week-goal` (barre + statuts).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Clôture rotation 20
Items : #288 échéances agenda prioritaires · #289 bilan du mois · #290 partage du
bilan du mois · #291 objectif focus hebdo. → **tag `v1.9.225` + push (auto-publish)**.

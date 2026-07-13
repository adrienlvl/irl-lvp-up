# Boucle #246 (autonome) — 9ᵉ rotation #3 : objectif hebdo de routines · build 1.9.180

**9ᵉ rotation, #3 (bien-être).** Le suivi bien-être comptait les routines mais sans cible. Ajout d'un **objectif hebdomadaire réglable** avec barre de progression.

## Livré

- **Barre « 🎯 Objectif routines cette semaine »** en tête du panneau bien-être : progression `fait/cible` + barre + reste à faire (« Plus que N routine(s) »).
- **Cible réglable** en 1 clic (boutons −/+, bornée 1–14), persistée.
- Barre **verte** + « ✅ Objectif atteint, bravo ! » quand la cible est atteinte.

## Détail technique

- **`lib/logic.js`** : `wellnessGoalProgress(count, target)` → `{ done, target, pct, reached, remaining }` (cible bornée 1–14). Pur + testé.
- **`app.js`** : `state.wellnessWeeklyGoal` (défaut 3) ; `renderWellnessGoal()` (compte via `wellnessCountInWindow`) + boutons −/+.
- **`index.html`** : `#wellnessGoal`. **`strength.css`** : `.wellness-goal` / `.wg-bar`.

## Vérifs

- `npm run verify` → **277 tests / 277 pass** (+1 `wellnessGoalProgress`), garde-fou CSS vert, **SMOKE OK** (`wellnessGoal:true`).
- **Navigateur** (2 routines cette semaine, cible 3) : « 2/3 · Plus que 1 » (barre 67 %) ; clic **+** → « 2/4 · Plus que 2 », cible persistée. ✓
- `npm run dist` → **Setup 1.9.180.exe** (app d'Adrien jamais fermée).

## Suite (rotation 9)

#1 ✅ (#244), #2 ✅ (#245), #3 ✅ (#246). Dernier : **#4 coaching** → puis notif + rotation 10. Boucle autonome continue.

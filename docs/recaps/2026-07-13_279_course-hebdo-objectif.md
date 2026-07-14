# Boucle #279 (autonome) — 17ᵉ rotation #4 : course hebdo vs objectif · build 1.9.213

**17ᵉ rotation, #4 (coaching) — DERNIÈRE de la rotation.** L'objectif de course hebdo (`goals.distance`, capté à l'onboarding #261) n'était visible que dans la barre des objectifs Athlète. Ajout d'une **carte de coaching course** dans le panneau Programme auto : progression vers l'objectif + tendance semaine/semaine (ramp).

## Livré

- **Carte « 🏃 Course cette semaine »** : barre de progression `km / objectif km`, « plus que X km » (ou « ✅ objectif atteint »).
- **Ligne de tendance** : `vs sem. dernière : ±% · montée en charge / stable / en baisse / ⚠️ hausse forte` (sécurité de progression, ≤ +30 %).

## Détail technique

- **`lib/logic.js`** : `runWeekGoal(workouts, todayKey, goalKm)` → `{ km, goalKm, pct, remaining, reached }` (lundi→aujourd'hui, réutilise `runKmInWindow`) ; null si objectif ≤ 0. Pur + testé. Ramp réutilise `weeklyKmRamp`.
- **`app.js`** : `renderRunWeekGoal()` (barre + ligne ramp colorée) appelé dans `render()`.
- **`index.html`** : `#runWeekGoal`.
- **`strength.css`** : `.run-week-goal` / `.rwg-bar` / `.rwg-ramp`.
- **CHANGELOG** complété (v1.9.213).

## Vérifs

- `npm run verify` → **302 tests / 302 pass** (+ test `runWeekGoal`), garde-fou CSS vert, **SMOKE OK** (`runWeekGoal`).
- **Navigateur** (8 km cette semaine, objectif 20) : « 8 / 20 km », barre 40 %, « Plus que 12 km », ramp « −47 % · 📉 en baisse ». ✓
- `npm run dist` → **Setup 1.9.213.exe** (app d'Adrien jamais fermée).

## Fin de la 17ᵉ rotation 🏁

#1 ✅ (#276) · #2 ✅ (#277) · #3 ✅ (#278) · #4 ✅ (#279). **Tag `v1.9.213` → auto-publish en ligne.** Rotation 18 enchaînée sur #1 (mobile/PWA). Boucle autonome continue.

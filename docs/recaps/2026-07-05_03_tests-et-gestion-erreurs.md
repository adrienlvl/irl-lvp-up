# Récap boucle #03 — Filet de tests + gestion d'erreurs globale

**Quand :** 2026-07-05
**Vague :** 0 (Fondations) — tâches 0.5 et 0.6
**Statut :** ✅ terminé et vérifié (tests verts)

## Ce que j'ai fait
### 0.5 — Filet de tests ✅
- Créé **`src/lib/logic.js`** : module de fonctions pures à **double export** (navigateur *et* Node).
  - `localDate`, `dateKey`, `weekStart`, `pct` (extraites de `app.js`, plus de doublon).
  - Nouvelles : `levelFromXp`, `xpWithinLevel`, `computeStreak` (logique de niveau/streak rendue testable).
- **Branché** dans `index.html` : `<script src="lib/logic.js">` chargé **avant** `app.js` (portée partagée entre scripts classiques → app.js utilise ces fonctions).
- **Refactor `app.js`** : suppression des définitions déplacées ; `updateStreak()` et le calcul de niveau dans `render()` utilisent désormais les helpers testés.
- **`src/test/logic.test.js`** : 6 tests `node:test` → **6/6 verts**.
- **`src/test/renderer-smoke.cjs`** : harnais Electron qui charge la vraie page, **capture les erreurs de renderer** (console error, `render-process-gone`, `did-fail-load`) et vérifie le rendu réel. Résultat : `SMOKE OK`, checks = `{logicLoaded:true, normalize:true, quests:4, exercises:30}`.
- **`package.json`** : scripts `test`, `test:smoke`, `verify` ; ajout de `lib/**/*` à la liste des fichiers packagés (sinon 404 dans l'app buildée).

### 0.6 — Gestion d'erreurs globale ✅
- En tête de `app.js` : `showAppError()` + écouteurs `error` et `unhandledrejection`.
- En cas d'erreur : `console.error('[IRL]', …)` + **bannière rouge non bloquante** (cliquable pour masquer). L'app ne « casse » plus silencieusement ; les données restent sauvegardées.

## Pourquoi c'est important
- Le smoke-test précédent (« le process tourne encore ») **ne détectait pas** les erreurs JS du renderer (une `ReferenceError` laissait l'app en vie mais l'UI cassée). Le nouveau harnais **détecte** ce cas → base de vérification fiable pour tous les refactors à venir (notamment 0.3 et la fusion BTS).

## Vérifications
- `node --check app.js` → OK.
- `npm test` → 6/6.
- `npm run test:smoke` (Electron) → `SMOKE OK`, exit 0, 4 quêtes + 30 exercices rendus, aucune erreur JS.

## Reste de la Vague 0
- **0.3** Sortir les photos base64 du blob `localStorage` vers un stockage séparé (fichiers via Electron `fs`/IPC). → prochaine boucle, sous couverture du smoke-test.

## Prochaine boucle (prévu)
- **0.3** photos hors blob, puis clôture Vague 0 → passage Vague 1 (unification du calendrier, prérequis de la fusion BTS CG).

## Git
- Commit : `feat(tests+erreurs): module logic.js teste + smoke-test renderer + handler global`.

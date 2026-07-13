# Boucle #270 (autonome) — 15ᵉ rotation #3 : routine express aléatoire · build 1.9.204

**15ᵉ rotation, #3 (bien-être).** « Surprends-moi » piochait au hasard sans tenir compte du temps ; le filtre par durée listait sans lancer. Fusion des deux : **routine express aléatoire d'une durée choisie**, lancée en 1 clic.

## Livré

- **Barre « ⚡ Express au hasard : 4 min / 6 min / 8 min »** sous « Surprends-moi ».
- Un clic lance immédiatement une **routine au hasard tenant dans le temps choisi** (évite de répéter la précédente), avec toast.

## Détail technique

- **`lib/logic.js`** : `expressRoutine(maxMin, excludeKey, seed)` → clé aléatoire (déterministe par seed) parmi `routinesByTimeBudget(maxMin)`, évite `excludeKey` si possible ; null si aucune ne tient. Pur + testé.
- **`app.js`** : IIFE `#wellnessExpress` (marque la routine faite + `openGuidedWorkout`).
- **`index.html`** : `#wellnessExpress`.
- **`strength.css`** : `.wx-chip` (pilule violette).
- **CHANGELOG** complété (v1.9.204).

## Vérifs

- `npm run verify` → **295 tests / 295 pass** (+ test `expressRoutine`), garde-fou CSS vert, **SMOKE OK** (`wellnessExpress`).
- **Navigateur** (localhost:8137) : chips ⚡ 4/6/8 min ; clic « 4 min » → lance une routine ≤ 4 min (ex. Nuque & trapèzes, 4 min). ✓
- `npm run dist` → **Setup 1.9.204.exe** (app d'Adrien jamais fermée).

## Suite (rotation 15)

#1 ✅ (#268), #2 ✅ (#269), #3 ✅ (#270). Prochain : **#4 coaching** (dernière → tag + auto-publish + notif de rotation, puis rotation 16 sur #1). Boucle autonome continue.

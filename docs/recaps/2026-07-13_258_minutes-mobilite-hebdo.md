# Boucle #258 (autonome) — 12ᵉ rotation #3 : minutes de mobilité hebdo · build 1.9.192

**12ᵉ rotation, #3 (bien-être).** On comptait le nombre de routines faites, mais pas le **temps** de mobilité investi. Ajout d'un compteur des **minutes de mobilité cette semaine**.

## Livré

- **Chip « ⏱️ N min mobilité »** dans le bandeau bien-être (à côté de la série et du compteur de routines).
- Somme des durées des routines/parcours faits depuis lundi (routine simple = ses minutes ; parcours = minutes cumulées).

## Détail technique

- **`lib/logic.js`** :
  - `wellnessMinutesForKey(key)` → minutes d'une clé loggée (routine ou `parcours-<key>`), 0 si inconnue.
  - `wellnessMinutesInWindow(list, startKey, endKey)` → total sur une fenêtre de dates.
  - Purs + testés.
- **`app.js`** : `renderWellnessStreak` calcule `min` (lundi→aujourd'hui) et insère le chip `.wst-min`.
- **`strength.css`** : `.wst-min` (accent bleu).
- **CHANGELOG** complété (v1.9.192).

## Vérifs

- `npm run verify` → **287 tests / 287 pass** (+ test `wellnessMinutesForKey`/`InWindow`), garde-fou CSS vert, **SMOKE OK** (`wellnessMinutes`).
- **Navigateur** (localhost:8137, 3 routines seedées) : chip « ⏱️ 11 min mobilité » (hips 6 + warmup 5 cette semaine ; entrée de la semaine précédente correctement exclue). ✓
- `npm run dist` → **Setup 1.9.192.exe** (app d'Adrien jamais fermée).

## Suite (rotation 12)

#1 ✅ (#256), #2 ✅ (#257), #3 ✅ (#258). Prochain : **#4 coaching** (dernière → tag + auto-publish + notif de rotation, puis rotation 13 sur #1). Boucle autonome continue.

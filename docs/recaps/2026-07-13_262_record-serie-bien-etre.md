# Boucle #262 (autonome) — 13ᵉ rotation #3 : record de série bien-être · build 1.9.196

**13ᵉ rotation, #3 (bien-être).** On affichait la série courante (🔥) mais pas le **record all-time**. Ajout d'une pastille « 🏅 record N j » — motivante quand on a une série passée à battre.

## Livré

- **Chip « 🏅 record N j »** dans le bandeau bien-être, affiché quand le record ≥ 2 j **et** supérieur à la série courante (une cible à battre).
- Complète le 🔥 streak courant sans redondance.

## Détail technique

- **`lib/logic.js`** : `wellnessBestStreak(list)` → plus longue suite de jours consécutifs (all-time), dédup des doublons intra-jour, 0 si vide. Pur + testé.
- **`app.js`** : `renderWellnessStreak` calcule `best` et insère le chip `.wst-record` si `best>=2 && best>st`.
- **`strength.css`** : `.wst-record` (accent doré).
- **CHANGELOG** complété (v1.9.196).

## Vérifs

- `npm run verify` → **289 tests / 289 pass** (+ test `wellnessBestStreak`), garde-fou CSS vert, **SMOKE OK** (`wellnessBestStreak`).
- **Navigateur** (série de 4 en juin + 1 aujourd'hui) : « 🔥 1 jour de suite » + « 🏅 record 4 j ». ✓
- `npm run dist` → **Setup 1.9.196.exe** (app d'Adrien jamais fermée).

## Suite (rotation 13)

#1 ✅ (#260), #2 ✅ (#261), #3 ✅ (#262). Prochain : **#4 coaching** (dernière → tag + auto-publish + notif de rotation, puis rotation 14 sur #1). Boucle autonome continue.

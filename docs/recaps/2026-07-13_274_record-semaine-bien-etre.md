# Boucle #274 (autonome) — 16ᵉ rotation #3 : record de routines par semaine · build 1.9.208

**16ᵉ rotation, #3 (bien-être).** On avait le record de série (jours d'affilée) mais pas de **record de volume hebdo**. Ajout du record de routines faites sur une semaine (parallèle au record hebdo de tonnage côté coaching).

## Livré

- **Chip « 🗓️ record sem. N »** dans le bandeau bien-être, affiché quand une semaine a compté **≥ 3 routines**.
- Si la **semaine en cours** est le record → **« 🗓️ record sem. N 🔥 »** en accent (célébration).

## Détail technique

- **`lib/logic.js`** : `bestWellnessWeek(list, todayKey)` → `{ weekStart, count, isCurrent }` ; regroupe par semaine (`mondayOf`), garde la plus élevée (égalité → plus récente) ; null si aucune routine. Pur + testé.
- **`app.js`** : `renderWellnessStreak` calcule `recWk` et insère le chip `.wst-recweek` (violet, ou accent si semaine en cours).
- **`strength.css`** : `.wst-recweek` / `.wst-rw-now`.
- **CHANGELOG** complété (v1.9.208).

## Vérifs

- `npm run verify` → **298 tests / 298 pass** (+ test `bestWellnessWeek`), garde-fou CSS vert, **SMOKE OK** (`bestWellnessWeek`).
- **Navigateur** (4 routines cette semaine) : chip « 🗓️ record sem. 4 🔥 », marqué semaine en cours (`wst-rw-now`). ✓
- `npm run dist` → **Setup 1.9.208.exe** (app d'Adrien jamais fermée).

## Suite (rotation 16)

#1 ✅ (#272), #2 ✅ (#273), #3 ✅ (#274). Prochain : **#4 coaching** (dernière → tag + auto-publish + notif de rotation, puis rotation 17 sur #1). Boucle autonome continue.

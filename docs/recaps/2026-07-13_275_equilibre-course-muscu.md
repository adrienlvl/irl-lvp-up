# Boucle #275 (autonome) — 16ᵉ rotation #4 : équilibre course/muscu · build 1.9.209

**16ᵉ rotation, #4 (coaching) — DERNIÈRE de la rotation.** Adrien est un athlète hybride (trail + renfo). Ajout d'un indicateur d'**équilibre course/muscu de la semaine** pour éviter de tout miser sur une seule discipline.

## Livré

- **Carte « ⚖️ Équilibre semaine »** : barre proportionnelle course (bleu) / muscu (vert) + label (Bon équilibre / Plutôt course / Plutôt muscu / Que de la course / Que de la muscu).
- Détail : nb de courses et de séances muscu sur 7 jours.

## Détail technique

- **`lib/logic.js`** : `weekTrainingBalance(workouts, todayKey, windowDays=7)` → `{ runs, strength, total, dominant, label }` ; course = type 'run', muscu = exercices ou type 'strength' ; null si aucune séance. Pur + testé.
- **`app.js`** : `renderWeekBalance()` (barre + tone wb-run/wb-strength/wb-balanced) appelé dans `render()`, affiché dès 2 séances.
- **`index.html`** : `#weekBalance`.
- **`strength.css`** : `.week-balance` / `.wb-bar` / `.wb-run` / `.wb-str`.
- **CHANGELOG** complété (v1.9.209).

## Vérifs

- `npm run verify` → **299 tests / 299 pass** (+ test `weekTrainingBalance`), garde-fou CSS vert, **SMOKE OK** (`weekBalance`).
- **Navigateur** (3 muscu + 2 course) : « ⚖️ Bon équilibre » (wb-strength), barre 40 % course / 60 % muscu, « 🏃 2 courses · 🏋️ 3 muscu ». ✓
- `npm run dist` → **Setup 1.9.209.exe** (app d'Adrien jamais fermée).

## Fin de la 16ᵉ rotation 🏁

#1 ✅ (#272) · #2 ✅ (#273) · #3 ✅ (#274) · #4 ✅ (#275). **Tag `v1.9.209` → auto-publish en ligne.** Rotation 17 enchaînée sur #1 (mobile/PWA). Boucle autonome continue.

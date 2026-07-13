# Boucle #234 (autonome) — 6ᵉ rotation #3 : badges/paliers bien-être · build 1.9.168

**6ᵉ rotation, #3 (bien-être).** Le streak de routines (#230) affichait des compteurs mais sans récompense. Ajout de **badges/paliers** débloqués par la série et le total — gamification renforcée.

## Livré

- **Paliers de série** : 🌱 3 jours · 🔥 7 jours · ⚡ 2 semaines · 🏆 30 jours.
- **Paliers de total** : 🧘 10 · 💫 25 · 🌟 50 · 👑 100 routines.
- **Affichés dans le badge bien-être** (médailles du plus haut palier atteint) + **prochain objectif** (« 🎯 plus que 4 j pour 🔥 7 jours de suite »).
- **Toast au franchissement** d'un nouveau palier (« 🧘 Palier bien-être débloqué : 10 routines ! »), déclenché au lancement d'une routine.

## Détail technique

- **`lib/logic.js`** : `WELLNESS_STREAK_BADGES` + `WELLNESS_TOTAL_BADGES` ; `wellnessBadges(list, todayKey)` (badges gagnés + prochains) ; `newWellnessBadge(before, after)` (franchissement, série prioritaire). Purs + testés. Exports ajoutés.
- **`app.js`** : `markWellnessDone` compare l'état avant/après → toast ; `renderWellnessStreak` affiche médailles + prochain palier.
- **`strength.css`** : `.wst-badge` (violet) / `.wst-next` (pointillés).

## Vérifs

- `npm run verify` → **266 tests / 266 pass** (+1 `wellnessBadges`/`newWellnessBadge`), garde-fou CSS vert, **SMOKE OK** (`wellnessBadges:true`).
- **Navigateur** : série 3 j → badge « 🌱 3 jours de suite » + « 🎯 plus que 4 j pour 🔥 7 jours » ; 10ᵉ routine → toast « 🧘 Palier bien-être débloqué : 10 routines ! » + médaille 🧘 ajoutée. ✓
- `npm run dist` → **Setup 1.9.168.exe** (app d'Adrien jamais fermée).

## Suite (rotation 6)

#1 ✅ (#232), #2 ✅ (#233), #3 ✅ (#234). Dernier : **#4 coaching** → puis stop + point à Adrien.

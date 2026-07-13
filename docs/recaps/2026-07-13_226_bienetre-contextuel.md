# Boucle #226 (autonome) — 4ᵉ rotation #3 : suggestion bien-être contextuelle · build 1.9.160

**4ᵉ rotation, #3 (bien-être).** La suggestion de routine du jour ne tenait compte que de la charge et de la forme. Elle regarde maintenant **ce que tu as réellement entraîné** pour cibler la récup.

## Livré

- **Suggestion du jour contextuelle** (carte `#wellnessSuggest`) — si une séance a été loggée **aujourd'hui ou hier** :
  - 🏃 **course** → 🦶 chevilles & mollets.
  - 🦵 **jambes / fessiers** → 🦵 mobilité hanches.
  - 💪 **haut du corps** (dos/pecs/épaules/bras) → 🏔️ épaules.
  - 🔥 **gainage** → 🩹 bas du dos.
  - Sinon → repli sur la logique charge/forme existante (`suggestedRoutine`).
- Message adapté (« Grosse séance jambes : un peu de mobilité hanches pour récupérer »).

## Détail technique

- **`lib/logic.js`** : `workoutDominantZone(workout)` (zone la plus travaillée via `exerciseZones`, accepte noms bruts ou objets) + `contextualWellnessRoutine(state, todayKey, load, readiness)` (fenêtre 0–1 jour, sinon repli). Purs + testés. Exports ajoutés.
- **`app.js`** : `renderWellnessSuggest` utilise `contextualWellnessRoutine` (repli sûr si indéfini).

## Vérifs

- `npm run verify` → **259 tests / 259 pass** (+2 : `workoutDominantZone`, `contextualWellnessRoutine`), garde-fou CSS vert, **SMOKE OK** (`wellnessContext:true`).
- **Navigateur** (séance jambes loggée aujourd'hui) : carte = « 💡 Grosse séance jambes : mobilité hanches pour récupérer · 🦵 Mobilité hanches · 6 min », classe `ws-recover`. ✓
- `npm run dist` → **Setup 1.9.160.exe** (app d'Adrien jamais fermée).

## Suite (rotation 4)

#1 ✅ (#224), #2 ✅ (#225), #3 ✅ (#226). Dernier : **#4 coaching périodisé** → puis point à Adrien.

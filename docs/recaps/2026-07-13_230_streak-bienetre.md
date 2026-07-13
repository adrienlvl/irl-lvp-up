# Boucle #230 (autonome) — 5ᵉ rotation #3 : streak de routines bien-être · build 1.9.164

**5ᵉ rotation, #3 (bien-être).** Les routines se lançaient sans laisser de trace. Ajout d'un **suivi gamifié** : chaque routine lancée est journalisée → **série (streak) + compteurs**.

## Livré

- **Badge de suivi** dans le panneau bien-être : « 🔥 N jours de suite · 🧘 X cette semaine · Y au total ».
  - La **série** compte les jours consécutifs (jusqu'à aujourd'hui, ou hier si rien encore fait) avec ≥1 routine.
  - Journalisation **au lancement** de n'importe quelle routine (suggestion du jour, barre, « Surprends-moi ») — sans doublon même jour+clé.
  - Masqué tant qu'aucune routine n'a été faite.

## Détail technique

- **`lib/logic.js`** : `logWellnessDone(list, key, date, cap)` + `wellnessStreak(list, todayKey)` (tolère de compter depuis hier) + `wellnessCountInWindow(list, start, end)`. Purs + testés. Exports ajoutés.
- **`app.js`** : `state.wellnessDone` (défaut + normalisation) ; `markWellnessDone(key)` appelé aux 3 points de lancement ; `renderWellnessStreak()` dans `render()`.
- **`index.html`** : `#wellnessStreak`. **`strength.css`** : `.wellness-streak` (puce série accentuée).

## Vérifs

- `npm run verify` → **262 tests / 262 pass** (+1 `logWellnessDone`/`wellnessStreak`/`wellnessCountInWindow`), garde-fou CSS vert, **SMOKE OK** (`wellnessStreak:true`).
- **Navigateur** : log 12+13 juillet → badge « 🔥 2 jours de suite · 🧘 1 cette semaine · 2 au total » ; lancement d'une routine → log +1 → « 🧘 2 cette semaine · 3 au total ». ✓
- `npm run dist` → **Setup 1.9.164.exe** (app d'Adrien jamais fermée).

## Suite (rotation 5)

#1 ✅ (#228), #2 ✅ (#229), #3 ✅ (#230). Dernier : **#4 coaching** → puis stop + point à Adrien.

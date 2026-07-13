# Boucle #250 (autonome) — 10ᵉ rotation #3 : rappel doux d'inactivité bien-être · build 1.9.184

**10ᵉ rotation, #3 (bien-être).** Le suivi récompensait l'assiduité (streak, badges, objectif) mais ne relançait pas si on décrochait. Ajout d'un **rappel doux** après quelques jours sans routine.

## Livré

- **Nudge d'inactivité** dans le panneau bien-être : si tu as déjà fait des routines mais **aucune depuis ≥ 3 jours** → « 😴 Ça fait N jours sans routine bien-être — 5 min de mobilité te feraient du bien 🧘 » + bouton **« ▶️ Lancer une routine »** (lance la suggestion contextuelle du jour).
- **Ne relance pas** un utilisateur qui n'a **jamais** commencé (pas de culpabilisation).

## Détail technique

- **`lib/logic.js`** : `wellnessInactivity(list, todayKey, thresholdDays=3)` → `{ inactive, days, message }`. Liste vide → `{ inactive:false, days:null }`. Seuil borné ≥ 2. Pur + testé.
- **`app.js`** : `renderWellnessNudge()` (dans `render()`) + bouton qui lance la routine suggérée et la logge.
- **`index.html`** : `#wellnessNudge`. **`strength.css`** : `.wellness-nudge` (ambre).

## Vérifs

- `npm run verify` → **280 tests / 280 pass** (+1 `wellnessInactivity`), garde-fou CSS vert, **SMOKE OK** (`wellnessNudge:true`).
- **Navigateur** (dernière routine il y a 5 j) : « 😴 Ça fait 5 jours sans routine… ▶️ Lancer une routine ». ✓
- `npm run dist` → **Setup 1.9.184.exe** (app d'Adrien jamais fermée).

## Suite (rotation 10)

#1 ✅ (#248), #2 ✅ (#249), #3 ✅ (#250). Dernier : **#4 coaching** → puis notif + rotation 11. Boucle autonome continue. _(Option B release prête ; origin branché & poussé à 1.9.183 ; ne rien publier sans « publie ».)_

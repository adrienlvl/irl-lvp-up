# Boucle #254 (autonome) — 11ᵉ rotation #3 : filtre routines par temps dispo · build 1.9.188

**11ᵉ rotation, #3 (bien-être).** On avait 11 routines de mobilité mais aucun moyen de dire « je n'ai que 4 minutes ». Ajout d'un **filtre par budget de temps** au-dessus de la barre de routines.

## Livré

- **Filtre « ⏳ J'ai : »** avec puces `Toutes · ☕ ≤4 min · ⏱️ ≤5 min · 🕗 ≤6 min`.
- Filtre en direct les routines affichées → tu ne vois que celles qui **tiennent dans ton temps dispo**, triées de la plus longue à la plus courte (utilise au mieux le créneau).
- Pratique quand on hésite : « 4 min avant de partir » → 3 routines proposées.

## Détail technique

- **`lib/logic.js`** : `routinesByTimeBudget(maxMin)` → liste `{key, emoji, title, minutes, moves}` des routines `≤ budget`, triée durée décroissante puis titre. Budget invalide/≤0 → toutes. Pur + testé.
- **`app.js`** : la barre bien-être est repeinte via `paintBar()` selon le budget choisi ; puces de filtre avec état actif (`.wtf-on`).
- **`index.html`** : `#wellnessTimeFilter`.
- **`strength.css`** : puces pilule `.wtf-chip` / `.wtf-on`.

## Vérifs

- `npm run verify` → **283 tests / 283 pass** (+ test `routinesByTimeBudget`), garde-fou CSS vert, **SMOKE OK** (`wellnessTimeFilter`).
- **Navigateur** (localhost:8137) : Toutes = **11** routines ; ≤4 min = **3** (Nuque, Poignets, Réveil articulaire) ; ≤6 min = **10** (exclut Étirements 8 min) ; retour Toutes = **11**. ✓
- `npm run dist` → **Setup 1.9.188.exe** (app d'Adrien jamais fermée).

## Suite (rotation 11)

#1 ✅ (#252), #2 ✅ (#253), #3 ✅ (#254). Prochain : **#4 coaching** → puis fin de rotation = tag `v1.9.x` + push (auto-publish) + notif. Boucle autonome continue.

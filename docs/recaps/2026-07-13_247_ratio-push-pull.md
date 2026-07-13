# Boucle #247 (autonome) — 9ᵉ rotation #4 : ratio push/pull + conseil · build 1.9.181

**9ᵉ rotation, #4 (coaching périodisé) — dernière de la rotation.** `muscleBalance` calculait le ratio poussée/tirage mais ne le montrait pas. Surfacé sur la carte de bloc avec un **conseil d'équilibre**.

## Livré

- **Carte push/pull** sur la carte de bloc en cours : « ⚠️ Trop de poussée · poussée 12 / tirage 2 · ratio 6 · Ajoute du tirage (dos…) ».
- Conseils selon l'équilibre : équilibré (✅), trop de poussée, trop de tirage, aucun tirage, aucune poussée.
- Affichée seulement si assez de données (≥ 6 séries poussée+tirage sur 28 j) → pas de bruit.

## Détail technique

- **`lib/logic.js`** : `pushPullAdvice(balance, minSets=6)` → `{ emoji, label, advice, ok, push, pull, ratio }` ou null. S'appuie sur la sortie de `muscleBalance`. Pur + testé.
- **`app.js`** : `renderBlockStatus` (branche bloc en cours) affiche la carte.
- **`strength.css`** : `.bs-pushpull` (ambre / vert si ok).

## Vérifs

- `npm run verify` → **278 tests / 278 pass** (+1 `pushPullAdvice`), garde-fou CSS vert, **SMOKE OK** (`blockPushPull:true`).
- **Navigateur** (bloc en cours, 12 push / 2 pull) : carte « ⚠️ Trop de poussée · ratio 6 · Ajoute du tirage ». ✓
- `npm run dist` → **Setup 1.9.181.exe** (app d'Adrien jamais fermée).

## 🏁 Rotation 9 COMPLÈTE

#1 haptique centralisé (#244) · #2 macros expliquées (#245) · #3 objectif hebdo routines (#246) · #4 ratio push/pull (#247). → Notif + rotation 10. Boucle autonome continue.

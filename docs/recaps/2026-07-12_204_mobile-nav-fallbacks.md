# Boucle #204 (autonome) — Mobile : nav accessible + audit des replis · build 1.9.138

**Cap #1 (mobile), suite.** Après les fondations PWA (#203), deux points à vérifier pour un usage réel sur téléphone : (a) les appels Electron ne doivent pas planter en navigateur ; (b) la navigation doit être utilisable sur petit écran.

## Constats (mesurés dans un vrai navigateur, viewport 375 px)

- **Replis `window.desktop` : déjà solides.** Audit des ~24 usages : **tous gardés** (`window.desktop?.` / `if(window.desktop)`) avec dégradation propre — photos en base64, version « aperçu web », trajet/export/import « disponible seulement dans l'app installée », rappels/auto-update désactivés. Rien à corriger. ✅
- **Bug mobile réel : la barre de navigation débordait** — 7 onglets sur 602 px dans 341 px de large → **la moitié des onglets étaient hors écran** (la règle mobile ciblait `.app-nav a` alors que la nav utilise des `<button>` : elle ne s'appliquait jamais).

## Livré

Sur mobile (≤ 650 px), `.app-nav` passe en **grille 3 colonnes** : les **7 onglets tiennent en 3 rangées, tous visibles et tappables** (cibles ≥ 42 px). Vérifié : `display:grid`, 3 rangées, **tous les boutons dans le viewport**, aucun scroll horizontal de page.

## Détail technique

- **`polish.css`** (média ≤ 650 px) : `.app-nav{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;…}` + `.app-nav button{width:100%;min-height:42px;white-space:normal;…}` (corrige le sélecteur `a` → `button`).

## Note importante (PWA)

Le service worker est **cache-first** : après une mise à jour, il sert l'ancien asset et ne rafraîchit qu'au **2ᵉ rechargement**. À améliorer (network-first pour le code, cache-first pour les images) — **prochaine itération**.

## Vérifs

- `npm run verify` → **239 tests / 239 pass**, garde-fou CSS vert, **SMOKE OK**. Vérif mobile réelle via navigateur.
- `npm run dist` → **Setup 1.9.138.exe** (app d'Adrien jamais fermée).

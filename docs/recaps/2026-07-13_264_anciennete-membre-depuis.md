# Boucle #264 (autonome) — 14ᵉ rotation #1 : ancienneté « Membre depuis » · build 1.9.198

**14ᵉ rotation, #1 (mobile/PWA).** Un RPG de vie mérite une notion de **fidélité**. Ajout d'un compteur d'ancienneté « Membre depuis N j » avec paliers, dans la carte joueur.

## Livré

- **Ligne « 🎖️ Membre depuis N j · palier »** dans la carte joueur (dashboard).
- **Paliers de fidélité** : 👋 Nouveau → 🌱 Lancé (7 j) → ⭐ Régulier (30 j) → 🏆 Habitué (100 j) → 💎 Vétéran (365 j), avec compte à rebours vers le prochain.
- Date de 1re utilisation mémorisée localement au premier lancement (`irl-install-date`).

## Détail technique

- **`lib/logic.js`** : `MEMBERSHIP_TIERS` + `membershipInfo(installDate, todayKey)` → `{ days, tier, next }` ; `days` borné ≥ 0 ; null si dates invalides. Pur + testé.
- **`app.js`** : `membershipInstallDate()` (enregistre/lit la date) + `renderMembership()` appelé dans `render()`.
- **`index.html`** : `#membershipLine` dans la carte joueur.
- **`style.css`** : `.membership-line`.
- **CHANGELOG** complété (v1.9.198).

## Vérifs

- `npm run verify` → **291 tests / 291 pass** (+ test `membershipInfo`), garde-fou CSS vert, **SMOKE OK** (`membership`).
- **Navigateur** (localhost:8137) : sans date → « Membre aujourd'hui · 👋 Nouveau — plus que 7 j pour 🌱 Lancé » (date enregistrée) ; 40 j → « ⭐ Régulier — plus que 60 j pour 🏆 Habitué ». ✓
- `npm run dist` → **Setup 1.9.198.exe** (app d'Adrien jamais fermée).

## Suite (rotation 14)

#1 ✅ (#264). Prochain : #2 onboarding, #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.

# Boucle #224 (autonome) — 4ᵉ rotation #1 : nudge d'installation PWA contextuel · build 1.9.158

**4ᵉ rotation, #1 (mobile/PWA).** L'app proposait déjà l'installation via un bouton d'en-tête (`#installBtn`) et un bandeau iOS. Ajout d'un **nudge contextuel** : une carte sur le tableau de bord qui ne s'affiche qu'**après engagement**, bonne pratique PWA (ne pas harceler dès l'ouverture).

## Livré

- **Carte « Installe IRL LVP UP sur ton téléphone »** (tableau de bord) :
  - N'apparaît **que si** : l'app est **installable** (`beforeinstallprompt` capté, Android/desktop) **ET** pas déjà installée (standalone) **ET** pas refusée **ET** l'utilisateur a **loggé ≥ 3 séances**.
  - Message personnalisé (« Tu as déjà loggé N séances 💪 … accès en 1 tap, hors-ligne, tes données restent sur ton téléphone »).
  - Boutons **📲 Installer** (déclenche le vrai prompt navigateur) et **Plus tard** (mémorise le refus).
  - iOS garde son bandeau dédié (pas de doublon).

## Détail technique

- **`lib/logic.js`** : `installNudge(state, ctx)` — pur, seuil configurable, gère état vide/null. Export ajouté.
- **`app.js`** : `renderInstallCard()` (appelée dans `render()` + rafraîchie sur `beforeinstallprompt` / masquée sur `appinstalled`).
- **`index.html`** : `#installCard`. **`style.css`** : `.install-card` / `.ic-row` / `.ic-actions`.

## Vérifs

- `npm run verify` → **256 tests / 256 pass** (+1 `installNudge`), garde-fou CSS vert, **SMOKE OK** (`installNudge:true`).
- `npm run dist` → **Setup 1.9.158.exe** (app d'Adrien jamais fermée).
- _Note : le gating `beforeinstallprompt` n'est pas reproductible hors contexte d'install réel ; couvert par le test unitaire + smoke._

## Suite

Rotation 4 : #1 fait (#224). Point fait à Adrien ; en attente de sa consigne pour #2 → #4.

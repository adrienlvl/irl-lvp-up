# Boucle #216 (autonome) — 2ᵉ rotation #1 : indicateur hors-ligne + maj PWA · build 1.9.150

**2ᵉ rotation d'approfondissement, #1 (mobile).** Deux manques pour une PWA vécue au quotidien : savoir qu'on est hors-ligne, et être prévenu quand une nouvelle version est dispo.

## Livré

- **Indicateur hors-ligne** : un bandeau discret apparaît quand la connexion tombe — « 📴 Hors-ligne — l'app continue de fonctionner, tes données restent sur cet appareil » — et disparaît au retour du réseau (`online`/`offline`).
- **Bannière « nouvelle version »** : quand le service worker détecte une mise à jour (`updatefound` → nouveau worker installé alors qu'un contrôleur existe), un bandeau vert propose **« Recharger »** pour appliquer la dernière version.

Inactifs/neutres en Electron (toujours en ligne, pas de SW).

## Détail technique

- **`index.html`** : `#offlineBanner`, `#pwaUpdateBanner` (+ bouton recharger), en haut de page (sticky).
- **`app.js`** : enregistrement SW étendu (`updatefound`/`statechange`) → affiche la bannière maj ; `updateOnlineStatus()` + écouteurs `online`/`offline` + bouton recharger.
- **`style.css`** : `.conn-banner` (offline ambre, update accent).

## Vérifs

- `npm run verify` → **248 tests / 248 pass** (+1 PWA : bannières + détection update + offline), garde-fou CSS vert, **SMOKE OK**.
- `npm run dist` → **Setup 1.9.150.exe** (app d'Adrien jamais fermée).

## Suite (2ᵉ rotation)

#2 (onboarding multi-étapes / conseils post-onboarding), #3 (programmer une récup récurrente), #4 (historique de blocs).

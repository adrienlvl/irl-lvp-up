# Boucle #220 (autonome) — 3ᵉ rotation #1 : aide d'installation iOS · build 1.9.154

**3ᵉ rotation, #1 (mobile).** Le bouton « Installer l'app » repose sur `beforeinstallprompt`, que **Safari iOS ne déclenche pas**. Sur iPhone/iPad, l'installation passe par le menu Partager → « Sur l'écran d'accueil », mais l'utilisateur ne le sait pas forcément.

## Livré

Sur **iOS non installé**, un bandeau d'aide s'affiche : « 📲 Installe l'app : appuie sur **Partager** puis **« Sur l'écran d'accueil »** ». Masquable (mémorisé), n'apparaît plus une fois l'app installée (mode standalone). Neutre partout ailleurs (Android/desktop/Electron).

## Détail technique

- **`lib/logic.js`** : `isIosInstallable(userAgent, standalone)` → true si iPhone/iPad et pas déjà en app. Pur + testé.
- **`app.js`** : détection au boot (userAgent + `navigator.standalone`/`display-mode: standalone`) → affiche `#iosInstallHint`, dismiss persistant (`localStorage`).
- **`index.html`** : `#iosInstallHint`. **`style.css`** : `.conn-ios`.

## Vérifs

- `npm run verify` → **252 tests / 252 pass** (+1 PWA : détection iOS + bannière), garde-fou CSS vert, **SMOKE OK**.
- `npm run dist` → **Setup 1.9.154.exe** (app d'Adrien jamais fermée).

## Suite (3ᵉ rotation)

#2 (onboarding : indicateur d'étapes / conseils ciblés), #3 (nouvelles routines / suggestion programmable), #4 (comparaison de blocs / notif fin de bloc).

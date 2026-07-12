# Boucle #212 (autonome) — Approfondir #1 : installation + raccourcis PWA · build 1.9.146

**Approfondir les 4 (demande d'Adrien).** On commence par #1 (mobile) : rendre l'installation et l'accès plus fluides.

## Livré

- **Bouton « 📲 Installer l'app »** dans l'en-tête : n'apparaît que quand le navigateur propose l'installation (capture `beforeinstallprompt`), déclenche l'invite native, disparaît une fois installée. Inactif en Electron (jamais proposé).
- **Raccourcis d'application** (manifest `shortcuts`) : un appui long sur l'icône installée ouvre directement **Mon entraînement · Coach Poids · Mon agenda · Nutrition**.
- **Deep-links** : chaque raccourci ouvre `?go=…` ; au démarrage l'app lit le paramètre et navigue vers la bonne page/onglet.

## Vérifié en vrai (navigateur)

`http://…/?go=coach` → l'app ouvre **Athlète → Coach Poids** ; les 4 raccourcis sont bien dans le manifest ; le bouton d'installation est présent (masqué tant que le navigateur ne propose pas). ✅

## Détail technique / tests

- **`manifest.webmanifest`** : `shortcuts` (4). **`index.html`** : `#installBtn` (hidden). **`app.js`** : capture `beforeinstallprompt`/`appinstalled` + clic → `prompt()` ; lecture de `?go` au boot → `showPage`/`showAthleteTab`.
- **`test/pwa.test.js`** : shortcuts (nom + url `?go=`), bouton installer, capture beforeinstallprompt + traitement `?go`.

## Vérifs

- `npm run verify` → **245 tests / 245 pass**, garde-fou CSS vert, **SMOKE OK**. Vérif deep-link en navigateur.
- `npm run dist` → **Setup 1.9.146.exe** (app d'Adrien jamais fermée).

## Suite (approfondir en rotation)

#2 onboarding (multi-étapes + aperçu), #3 routines (programmer une récup / suggérer selon la forme), #4 périodisé (décharge qui allège vraiment les séances).

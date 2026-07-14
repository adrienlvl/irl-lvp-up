# Boucle #272 (autonome) — 16ᵉ rotation #1 : bouton « Partager l'app » · build 1.9.206

**16ᵉ rotation, #1 (mobile/PWA).** Ajout d'un moyen simple de **faire découvrir l'app** à un ami : un bouton « Partager l'app » qui ouvre la feuille de partage native (mobile) ou copie une invitation dans le presse-papier (desktop).

## Livré

- **Groupe « 📣 Faire découvrir »** dans les Réglages avec un bouton **« 📤 Partager l'app »**.
- Sur mobile : feuille de partage OS (Web Share). Sur desktop : invitation copiée dans le presse-papier.
- Le lien partagé est l'URL réelle si on est en PWA (http/https), sinon l'URL GitHub Pages hébergée.

## Détail technique

- **`lib/logic.js`** : `shareAppPayload(url)` → `{ title, text, url? }` (n'inclut `url` que si http/https ; ignore `file://` du desktop). Pur + testé.
- **`app.js`** : handler `#shareAppBtn` → `navigator.share` avec repli presse-papier + statut.
- **`index.html`** : groupe Réglages « Faire découvrir » (`#shareAppBtn`, `#shareAppStatus`).
- **CHANGELOG** complété (v1.9.206).

## Vérifs

- `npm run verify` → **297 tests / 297 pass** (+ test `shareAppPayload`), garde-fou CSS vert, **SMOKE OK** (`shareApp`).
- **Navigateur** (localhost:8137) : bouton présent ; payload « IRL LVP UP — ton RPG de vie » + url = URL courante (http) ; pas de `navigator.share` en desktop → repli presse-papier (comportement attendu). ✓
- `npm run dist` → **Setup 1.9.206.exe** (app d'Adrien jamais fermée).

## Suite (rotation 16)

#1 ✅ (#272). Prochain : #2 onboarding, #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.

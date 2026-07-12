# Boucle #203 (autonome) — Fondations PWA (app installable sur mobile) · build 1.9.137

**Nouveau cap (Adrien) : boucles #1→#4.** #1 = version mobile. L'app était Windows/Electron uniquement — impossible sur téléphone (minuteur de repos, séance guidée pendant une séance). Première brique : **rendre l'app installable et hors-ligne (PWA)**.

## Livré

- **`manifest.webmanifest`** : nom, icônes (logo 1254² en 192/512), `display: standalone`, couleurs du thème, orientation portrait, catégories.
- **`service-worker.js`** : précache de l'**app-shell** (index.html, app.js, les 17 CSS, les 4 `lib/*.js`, logo) → **fonctionne hors-ligne** ; stratégie cache-first + mise à jour en arrière-plan + repli réseau, cache des ressources à l'usage.
- **`index.html`** : lien manifest + `apple-touch-icon` + métas iOS (mobile-web-app-capable, status bar).
- **`app.js`** : enregistrement du SW **gardé au protocole http(s)** → actif en navigateur/mobile, **ignoré dans Electron (file://)** — zéro impact desktop.
- **CSP** inchangée : `default-src 'self'` couvre déjà manifest + worker (même origine).

## Vérifié en vrai (navigateur, viewport mobile 375 px)

Servi en local (http) et ouvert dans un navigateur : **app-shell rendu, 6 onglets, hero OK**, **service worker enregistré ET actif**, manifest reconnu (`standalone`, 2 icônes). L'app est **installable** (« Ajouter à l'écran d'accueil »).

## Détail technique / tests

- **`test/pwa.test.js`** (nouveau, dans `npm test`) : manifest valide + champs requis + icônes présentes ; **le précache du SW pointe sur des fichiers qui existent vraiment** (anti-404 à l'install) ; index.html lie le manifest et app.js enregistre le SW en http(s).

## Vérifs

- `npm run verify` → **239 tests / 239 pass** (+3 PWA), garde-fou CSS vert, **SMOKE OK** (Electron intact). `node --check` app.js + service-worker.js OK.
- `npm run dist` → **Setup 1.9.137.exe** (app d'Adrien jamais fermée).

## Suite (#1 mobile — prochaines boucles)

1. **Repli navigateur** des appels `window.desktop` (notifications, export/import, trajet, auto-update) → dégradation propre sur mobile.
2. **Passe responsive mobile** complète (nav, panneaux, dialogues plein écran).
3. **Déploiement web** (ex. GitHub Pages / `web/` bundle) — action de mise en ligne à faire par Adrien, comme `npm run release`.

Puis #2 onboarding, #3 contenu mobilité, #4 coaching périodisé.

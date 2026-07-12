# Boucle #205 (autonome) — PWA : service worker network-first (anti-stale) · build 1.9.139

**Cap #1 (mobile), suite.** Le service worker v1 était **cache-first** : après une mise à jour, il servait l'ancien code et ne rafraîchissait qu'au 2ᵉ rechargement (constaté en #204). Mauvais pour une PWA qui se met à jour souvent.

## Livré — SW v2 avec stratégie hybride

- **Code (HTML/CSS/JS) : network-first** — toujours frais quand en ligne, **repli cache hors-ligne** (dont `index.html` en dernier recours pour la navigation offline).
- **Images/polices : cache-first + mise à jour en arrière-plan** — rapides, changent peu.
- **Cache versionné** (`irl-lvp-up-v2`) : à l'activation, les anciens caches sont purgés (`skipWaiting` + `clients.claim`).

## Vérifié en vrai (navigateur)

- Le **SW v2 s'active** et purge l'ancien cache (`cacheKeys: ['irl-lvp-up-v2']`), app-shell rendu, 7 onglets → **aucune régression**.
- **Network-first prouvé** : `fetch('polish.css')` via le SW renvoie la **version disque courante** (règle nav-grille présente) et met le cache à jour → plus d'asset périmé, offline conservé.

## Détail technique / tests

- **`service-worker.js`** réécrit (install/activate/fetch, `isAsset()` pour router network-first vs cache-first).
- **`test/pwa.test.js`** renforcé : vérifie le **nom de cache versionné**, les handlers `fetch`/`activate`, et la distinction code/asset.

## Vérifs

- `npm run verify` → **239 tests / 239 pass**, garde-fou CSS vert, **SMOKE OK**. `node --check service-worker.js` OK. Vérif navigateur (SW v2 actif + network-first).
- `npm run dist` → **Setup 1.9.139.exe** (app d'Adrien jamais fermée).

## Suite #1 (mobile)

Passe responsive des panneaux/dialogues (mesure navigateur 375 px) ; puis préparer le **déploiement web** (dossier web + doc GitHub Pages — mise en ligne = action d'Adrien).

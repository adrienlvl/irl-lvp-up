# Bilan global — IRL LVP UP

_Synthèse du chantier mené le 2026-07-05/06 (boucles autonomes). Point de départ : `.exe` du 22-23/06/2026, sans source ni build. Point d'arrivée : projet versionné, testé, sécurisé, enrichi, installeur **1.1.2**._

---

## 1. Le plus important en 30 secondes
- Ta source n'existait **que dans le `.exe`** → récupérée, versionnée (git), et **de nouveau re-buildable**.
- L'app est passée d'un tracker sport à un **hub « quoi faire aujourd'hui »** : planning de révision **BTS CG**, vue « Ma journée », vue « Ma semaine », **notifications** (matin / avant chaque bloc / soir), graphiques, export **PDF hebdo**, **thème clair/sombre**.
- **Sécurité** durcie (Electron 43, sandbox, navigation externe bloquée, entrées validées).
- **39 tests** + un smoke-test qui détecte les erreurs d'écran. Tout est vert.
- Installeur prêt : **`build-dist\IRL LVP UP Setup 1.1.2.exe`**.

## 2. Ce qui a changé vs ton ancien `.exe`
| Avant (22-23/06) | Maintenant (1.1.2) |
|---|---|
| Source uniquement dans `app.asar` | `src/` versionné + git + docs |
| Pas de build reproductible | `npm start` / `npm run dist` (electron-builder) |
| Sport / focus / vie uniquement | + **révision BTS CG** (planning + import Grand Livre) |
| — | **Ma journée** (tout le jour en 1 vue) + XP étude |
| — | **Ma semaine** (sport + révision côte à côte) |
| Rappel générique | Notifications : résumé matin, alerte avant chaque bloc, bilan du soir |
| — | Graphiques 8 semaines + **export PDF hebdo** |
| Photos base64 dans le stockage fragile | Photos en fichiers (IPC validé) |
| Electron ancien (CVE) | **Electron 43**, sandbox, navigation verrouillée |
| Vignettes d'exercices étirées | Vignettes carrées (proportions correctes) |
| Thème sombre unique | **Clair/sombre** au choix |
| 0 test | **39 tests** + smoke-test renderer |

## 3. Où sont les choses
- **Source éditable** : `D:\IRL LVP UP\src\`
  - `app.js` (logique + rendu) · `lib/logic.js` (fonctions pures testées) · `lib/exercises-data.js` (données) · `electron-main.cjs` (fenêtre, tray, notifs, backups, photos) · `preload.cjs` · `index.html` · 16 CSS (dont `theme.css`, `print.css`) · `test/`.
- **Docs** : `D:\IRL LVP UP\docs\` (ce bilan, `AUDIT.md`, `ROADMAP.md`, `recaps/`).
- **Installeur** : `D:\IRL LVP UP\build-dist\IRL LVP UP Setup 1.1.2.exe`.
- **Le Grand Livre Compta** : `D:\Le Grand Livre Compta App\le-grand-livre-compta.html` — bouton « Exporter planning » ajouté (backup `.bak` conservé).

## 4. Comment (re)construire
```
cd "D:\IRL LVP UP\src"
npm install            # une fois (electron 43 + electron-builder)
npm start              # lancer l'app en dev
npm test               # 39 tests unitaires
npm run test:smoke     # smoke-test renderer (détecte les erreurs JS d'écran)
npm run dist           # génère build-dist\IRL LVP UP Setup <version>.exe
```
Pièges connus (documentés dans les recaps) : si le binaire Electron manque → `node node_modules/electron/install.js` ; si electron-builder bloque sur `winCodeSign` (symlinks macOS) → nettoyer `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign` et ré-extraire.

## 5. État sécurité (Vague S)
- `contextIsolation` + `nodeIntegration:false` + **`sandbox:true`** · **CSP** (`script-src 'self'`) · **navigation externe bloquée** (`will-navigate` + `setWindowOpenHandler` deny) · **instance unique**.
- Entrées **IPC validées** côté main (photos : regex + taille + nom regénéré anti path-traversal ; notifications : clamps + regex).
- **Imports défensifs** (restauration JSON, planning Grand Livre : schéma strict, bornes, cap taille).
- **Electron 43** (≈18 CVE purgées). Résiduel `npm audit` = `tar` dans la chaîne electron-builder = **outillage de build, jamais livré**.
- 100 % local, aucun accès réseau. Si connexion internet un jour (S.7, préparé non activé) : allowlist HTTPS stricte, `safeStorage`, MAJ signées.

## 6. Données & compatibilité
- Même `appId` (`com.adrien.irllvpup`) → **tes données existantes sont conservées** en installant la 1.1.2.
- Migrations automatiques au 1er lancement : agenda unifié, photos vers fichiers. Rien n'est perdu (filet `normalizeState` + git).

## 7. Ce qui reste (optionnel, à ta main)
- Purge fine des règles CSS mortes (3.2).
- Sauvegarde chiffrée / synchro multi-appareils (4.6) — casse le « 100 % local », à discuter.
- Toute nouvelle idée produit.

---
_18 boucles autonomes, ~30 commits, un récap `.md` par boucle dans `docs/recaps/`._

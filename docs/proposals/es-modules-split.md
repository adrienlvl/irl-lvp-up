# Proposition — Découper les monolithes (`logic.js` / `app.js`)

_Rédigé le 2026-07-19 · statut : **à trancher par Adrien**_

## 1. Problème

Deux fichiers portent presque toute l'app :

- `src/lib/logic.js` — **9 488 lignes / 785 Ko**, ~348 fonctions pures ;
- `src/app.js` — **1 089 lignes / 359 Ko** (lignes très denses : tout le renderer et les handlers).

Le chargement se fait en **scripts classiques à portée globale**, sans `type="module"` ni bundler
(`index.html` charge dans l'ordre `lib/logic.js`, `lib/exercises-data.js`, `lib/exercise-icons.js`,
`lib/foods-data.js`, puis `app.js`). L'export Node est un **`module.exports` gardé** en toute fin de
`logic.js` (`L9486-9488` : `if (typeof module !== 'undefined' && module.exports) { … }`) — c'est
l'astuce qui donne le double usage navigateur/tests.

Deux effets concrets :

1. **Navigabilité** — trouver et modifier une fonction dans 9 500 lignes coûte cher, et le coût
   augmente à chaque itération.
2. **Portée globale partagée** — tout se voit, rien n'est encapsulé ; l'ordre de chargement est une
   dépendance implicite.

⚠️ **Contexte honnête** : `logic.js` a pris **+68 % (5 649 → 9 488)** depuis le 2026-07-16, presque
entièrement à cause du coach — aujourd'hui gelé. **Le gel ralentit déjà la croissance**, donc ce
chantier est moins urgent qu'il n'y paraît. Une tentative de découpe d'`app.js` avait d'ailleurs été
**écartée à raison** (roadmap B-5) : découper des scripts classiques crée des dépendances d'ordre
d'exécution, pour zéro gain fonctionnel.

## 2. Options

| | Option | Dépendance | Ce que ça coûte |
|---|---|---|---|
| **A** | **Modules ES natifs** — `import`/`export`, `app.js` en `type="module"`. | **Aucune** (CSP `script-src 'self'` les autorise déjà). | Il faut un pont pour les tests CommonJS (voir §4). Chargement en modules = ordre explicite, fini les globals. |
| **B** | **Bundler** (esbuild/vite) en devDependency, produisant un bundle unique. | **+1 devDep** + une étape de build. | Meilleur confort, mais heurte la règle « zéro dépendance » et ajoute une étape avant `npm run dist`. |
| **C** | **Hybride** — sources en modules ES + petite concaténation maison sans dépendance. | Aucune. | Évite le bundler mais il faut écrire et maintenir l'outil de concat. |
| **D** | **Ne rien faire** — le gel du coach suffit à stabiliser la taille. | — | Coût nul. La dette de navigabilité reste. |

## 3. Recommandation — **A, et par tranches ; sinon D**

L'option A préserve la garantie « **0 dépendance runtime** » qui est une vraie force du projet, et les
modules ES natifs sont parfaitement supportés par Electron 43 et par les navigateurs cibles.

Mais je recommande surtout de **ne pas faire ça maintenant**, ou alors sur **une seule tranche pilote**
(par exemple sortir la partie nutrition/aliments de `logic.js`), pour deux raisons :

- Le facteur de croissance (le coach) est **déjà neutralisé** par le gel ;
- **P1.2 (IndexedDB)** touche déjà le cœur du boot du renderer. Faire les deux en parallèle, avec deux
  écrivains sur `master`, c'est chercher les conflits. **P1.2 d'abord.**

Option B seulement si tu veux explicitement le confort d'un bundler — c'est ta décision, pas la mienne.

## 4. Risques

- **Le harnais de tests est en CommonJS** : `test/logic.test.js` fait `require('../lib/logic.js')`.
  Passer `logic.js` en ES pur **casse les 517 tests** tant qu'un pont n'existe pas (double build, ou
  passage des tests en `.mjs`, ou shim). **C'est le point technique n°1.**
- **Le smoke Electron** exécute l'app réelle : un mauvais ordre de chargement se voit à l'exécution,
  pas à la compilation. Il doit rester vert à chaque tranche.
- **Ordre d'exécution** : `app.js` définit des handlers au chargement — c'est exactement ce qui avait
  fait renoncer en B-5. Les modules ES **règlent** ce problème (ordre explicite), à condition de tout
  convertir, pas de couper à moitié.
- **Gros diff** = revue difficile et risque de conflit avec le VPS. Faire tranche par tranche.

## 5. Ce qui dépend d'Adrien

1. **Acceptes-tu un bundler en devDependency** (option B) ? Si non, c'est A ou C.
2. **Ce chantier est-il prioritaire pour toi**, ou d'accord pour le repousser derrière P1.2 (ma reco) ?
3. Si on y va : **une tranche pilote d'abord** (nutrition), ou la découpe complète d'un coup ?

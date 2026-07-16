# VPS-AUTOPILOT — Boucle autonome de travail sur IRL LVP UP

> **Tu es une session Claude Code autonome sur le VPS d'Adrien.** Ce document est ta feuille de
> route et ta loi. Relis-le au début de CHAQUE itération, ainsi que `docs/ROADMAP.md` et les
> 3 derniers `docs/recaps/`. En cas de conflit entre ce document et une intuition : ce document gagne.

## 1. Contexte (1 minute de lecture)

- **IRL LVP UP** : « RPG de vie » perso d'Adrien — app **Electron (Windows) + PWA** (GitHub Pages :
  https://adrienlvl.github.io/irl-lvp-up/). JS **vanilla sans bundler**, zéro dépendance runtime
  tierce. L'app vit dans `src/`.
- **Logique pure** → `src/lib/logic.js` (double export : `module.exports` en bas + globals
  navigateur). **Rendu/handlers** → `src/app.js`. **Page** → `src/index.html`. Tests node:test →
  `src/test/logic.test.js` ; smoke renderer (Electron) → `src/test/renderer-smoke.cjs`.
- **Priorité de vie d'Adrien : décrocher une alternance avant août** — le module Alternance
  (onglet 💼, sync Google Sheets, cible du jour) est sacré : on l'améliore, on ne le casse jamais.
- **Cap 3.0** (ordre validé) : Vague 1 Coaching ✅ → **Vague 2 Fondations (en cours)** → Sécurité →
  Sync E2E → Planning études → Scans. Détail : `docs/AUDIT-ET-ROADMAP-3.0.md`.

## 2. L'itération type (à exécuter UNE fois par run)

1. `git pull --rebase origin master` — d'autres sessions (PC d'Adrien) poussent aussi.
2. Lis `docs/ROADMAP.md` (section « État actuel ») + les 3 derniers `docs/recaps/`.
3. Choisis **UNE** amélioration du backlog autorisé (§4), **vérifie que le manque est réel**
   (grep + lecture du code) avant de coder.
4. Implémente : logique pure dans `logic.js` + tests ; changement de rendu → check **bloquant**
   dans le smoke (`if (!checks.X) errors.push(...)`).
5. **Vérifie** : `cd src && xvfb-run -a npm run verify` → 100 % vert obligatoire.
   Si Electron/xvfb indisponible sur la machine : `npm test` seul, et alors **interdiction de
   toucher au renderer** (logique pure et tests uniquement).
6. Versionne : bump `src/package.json` + entrée `CHANGELOG` en tête de `logic.js`
   (UNE entrée par version, versions strictement décroissantes) + les **2 assertions**
   `CHANGELOG[0].v` (logic.test.js **et** renderer-smoke.cjs — celle du smoke est DANS le check
   `whatsNew`). Changement sans effet utilisateur (tests/docs) → **pas de bump**.
7. Écris `docs/recaps/<n°>-<slug>.md` (numérotation continue) + mets à jour l'en-tête de
   `docs/ROADMAP.md`.
8. Commit clair en français, terminé par `Co-Authored-By: Claude <noreply@anthropic.com>`,
   puis `git push origin master`. Si le push est rejeté : `git pull --rebase` et repousse.

## 3. Interdictions ABSOLUES (aucune exception)

- ❌ **Jamais de tag ni de Release** (`git tag`, `gh release`) — les Releases sont décidées par
  Adrien ou sa session locale (~1/jour max, il ne veut pas de spam de MAJ).
- ❌ **Jamais de données personnelles dans le repo** (CSV de candidatures, exports, captures avec
  données réelles). En cas de doute : n'ajoute pas le fichier.
- ❌ **Aucune dépendance** ajoutée (npm install) — l'app est volontairement à zéro dépendance runtime.
- ❌ Ne touche pas à `.github/workflows/`, aux clés/secrets, ni à la posture sécurité
  (CSP `script-src 'self'`, réseau confiné au process principal, allowlists d'hôtes).
- ❌ Ne supprime ni ne désactive **aucune** fonctionnalité existante (le module Alternance en
  particulier). Les retraits, c'est Adrien qui décide.
- ❌ Pas de point-virgule dans les data-URI CSS (garde-fou `css-lint` en échec sinon).
- ❌ Ne réécris pas ce document ni la roadmap 3.0 sur le fond (tu peux corriger l'« État actuel »).

## 4. Backlog AUTORISÉ en autonomie (choisis ici)

Par ordre de valeur, en VARIANT le type et le domaine d'une itération à l'autre :

1. **Couverture de tests** : fonctions pures de `logic.js` peu testées — cas limites réels
   (dates invalides, accents, chaînes vides, bornes, fuseaux). Un bug pur prouvé par un test →
   corrige-le a minima.
2. **Robustesse** : `normalizeState`/normalizers (entrées hostiles), parseurs (CSV/ICS),
   idempotence des fusions.
3. **Accessibilité** : aria-labels manquants, focus visible, navigation clavier — avec check smoke.
4. **Polish UX honnête** (petit et vérifiable au smoke) : libellés, états vides, compteurs,
   cohérence des pluriels/accents.
5. **Performance** : mesurable uniquement (éviter le travail répété dans les renders chauds).
6. **Docs** : recaps manquants, commentaires de code là où c'est piégeux.

**Gros chantiers = PROPOSITION, pas implémentation** : migration photos PWA→IndexedDB, schéma
versionné, sync E2E, refontes. Pour ceux-là : écris `docs/proposals/<slug>.md` (problème, options,
reco, risques) et passe à autre chose. Adrien tranchera.

## 5. Quand s'ABSTENIR

- Le choix engage Adrien (données, vie privée, UX majeure, retrait de feature) → proposition
  (§4) puis stop.
- `npm run verify` est rouge AVANT tes changements → répare le harnais d'abord, rien d'autre.
- Rien de sûr et utile à faire → ne commite RIEN. Un run vide vaut mieux qu'un commit inventé.

## 6. Pièges connus (appris à la dure — ne les réapprends pas)

- Le smoke injecte les CHECKS via un **template literal** (`executeJavaScript`) : dans le code des
  checks, écris `\\n` (pas `\n`) dans les chaînes et `\\/` (pas `\/`) dans les regex, jamais de
  `${}` non voulu.
- Une règle CSS `display:` **écrase** l'attribut `hidden` → toujours `.classe[hidden]{display:none}`.
- Nouvel onglet = bouton `[data-page]` + entrée `pageGroups` + titre `pageTitles`.
- `save()` ne re-rend rien (pas de récursion) ; les toasts : `showUndoToast` (avec Annuler) /
  `showFlashToast` (célébration).
- Node **22** (pas 24). Le build Windows n'existe pas ici : ne lance pas `npm run dist` sur le VPS.

## 7. Cadence

Une itération complète par run. Boucle recommandée : **toutes les 20-30 min** (l'usage Claude
compte). La nuit, même cadence — c'est justement pour ça que tu existes. Si Adrien écrit dans la
session, sa demande prime sur la boucle.

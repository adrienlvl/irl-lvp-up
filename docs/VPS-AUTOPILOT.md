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
- **Priorité de vie d'Adrien : décrocher une alternance avant LA RENTRÉE** (cible : 1ᵉʳ octobre,
  cf. `alternanceDeadline`) — le module Alternance
  (onglet 💼, sync Google Sheets, cible du jour) est sacré : on l'améliore, on ne le casse jamais.
- **Cap 3.0** (ordre validé) : Vague 1 Coaching ✅ → **Vague 2 Fondations (en cours)** → Sécurité →
  Sync E2E → Planning études → Scans. Détail : `docs/AUDIT-ET-ROADMAP-3.0.md`.

## 2. L'itération type (à exécuter UNE fois par run)

1. `git pull --rebase origin master` — d'autres sessions (PC d'Adrien) poussent aussi.
2. Lis `docs/ROADMAP.md` — **« État actuel » ET « 🎯 Prochaines priorités »** — + les **5** derniers
   `docs/recaps/` (5, pas 3 : c'est ce qui permet le contrôle de rotation de l'étape 3).
3. Choisis **UNE** tâche **nommée** dans `docs/ROADMAP.md` → « 🎯 Prochaines priorités », en
   respectant la **rotation des domaines (§4 bis)** — contrôle des 5 derniers recaps **obligatoire
   avant de coder**. Puis **vérifie que le manque est réel** (grep + lecture du code) : si la piste
   est fausse, dis-le et prends la suivante.
4. Implémente : logique pure dans `logic.js` + tests ; changement de rendu → check **bloquant**
   dans le smoke (`if (!checks.X) errors.push(...)`).
5. **Vérifie** : `cd src && xvfb-run -a npm run verify` → 100 % vert obligatoire.
   Si Electron/xvfb indisponible sur la machine : `npm test` seul, et alors **interdiction de
   toucher au renderer** (logique pure et tests uniquement).
6. Versionne : bump `src/package.json` + entrée `CHANGELOG` en tête de `logic.js`
   (UNE entrée par version, versions strictement décroissantes) + les **2 assertions**
   `CHANGELOG[0].v` (logic.test.js **et** renderer-smoke.cjs — celle du smoke est DANS le check
   `whatsNew`). Changement sans effet utilisateur (tests/docs) → **pas de bump**.
7. Si ta modification touche un texte **que l'utilisateur lit** → applique le **contrôle de
   cohérence (§4 ter)** : rends le résultat **cumulé** avec un état chargé et relis-le en entier.
8. Écris `docs/recaps/<n°>-<slug>.md` (numérotation continue) + mets à jour l'en-tête de
   `docs/ROADMAP.md` (« État actuel » seulement — **ne recopie plus le détail version par version**,
   il vit dans le recap et dans `CHANGELOG`). Termine le recap par la ligne `Domaine : <tag>` (§4 bis.2).
   Coche la case de la tâche dans « 🎯 Prochaines priorités » quand elle est finie.
9. Commit clair en français, terminé par `Co-Authored-By: Claude <noreply@anthropic.com>`,
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
- 🧊 **Le coach adaptatif (`adaptiveCoachFocus`) est GELÉ** (décidé le 2026-07-19). **Interdit**
  d'ajouter un champ ou une note à son `insight` : pas de nouveau `…Guard` / `…Trend` / `…Driver` /
  `…Pace`, pas de nouveau `insight +=`. Il renvoie déjà **93 champs** et concatène jusqu'à **89**
  clauses ; chaque pilier a déjà sa note de tendance, de forme, d'allure et d'inter-pilier —
  **l'espace de conception est épuisé**. Seuls restent autorisés : **(a)** le **correctif** d'un guard
  qui se déclenche à tort ou en **contredit** un autre, prouvé par un test ; **(b)** la **curation au
  rendu** (`splitCoachInsight`). Toute idée de nouvel angle coach → `docs/proposals/coach-<slug>.md`,
  puis **STOP** : Adrien tranche.
- ❌ Ne réécris pas ce document ni la roadmap 3.0 sur le fond (tu peux corriger l'« État actuel »).
  **Y compris pour les règles ci-dessus** : si tu penses qu'une règle doit changer, écris une
  proposition — ne t'auto-légifère pas.

## 4. TYPES de travail autorisés en autonomie

> ⚠️ Cette liste dit **quels types** de travail sont permis — elle **ne remplace pas** le choix de la
> tâche. La tâche se prend **par son nom** dans `docs/ROADMAP.md` → « 🎯 Prochaines priorités »
> (§4 bis.1). Traiter cette liste comme un menu libre est exactement l'erreur qui a produit
> 60 itérations coach « valides ».

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

## 4 bis. ROTATION DES DOMAINES — la règle qui manquait (obligatoire)

> **Pourquoi.** Entre les boucles #487 et #546, **60 itérations d'affilée** ont atterri dans la même
> fonction (`adaptiveCoachFocus`). La consigne « varie le type et le domaine » existait déjà : elle
> n'a rien empêché, parce qu'elle n'était **pas vérifiable**. Les règles ci-dessous le sont.

1. **Prends ta tâche par son NOM**, dans `docs/ROADMAP.md` → « 🎯 Prochaines priorités » (P1/P2/P3).
   **N'invente pas** une tâche à partir d'une catégorie : une catégorie ouverte (« polish »,
   « robustesse ») se remplit toujours par le chemin de moindre résistance — c'est exactement comme
   ça que les 60 itérations coach ont été « valides ».
2. **Étiquette obligatoire.** Termine CHAQUE recap par une dernière ligne exactement au format :
   `Domaine : <alternance|athlete|nutrition|sommeil|focus|agenda|etudes|a11y|robustesse|tests|fondations|docs|coach>`
3. **Contrôle AVANT de coder** — lance :
   `grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)`
   Le domaine que tu t'apprêtes à traiter **ne doit PAS** apparaître dans les **2 derniers** recaps,
   et **pas plus d'une fois** dans les 5 derniers. S'il y apparaît → **change de domaine**, point.
   _(Amorçage : les recaps antérieurs au #547 n'ont pas d'étiquette — un `grep` vide ne bloque rien.
   La règle prend effet d'elle-même à mesure que les étiquettes s'accumulent.)_
4. **Quota de propositions.** Si les **10 derniers** recaps ne contiennent **aucune** proposition
   (`ls docs/proposals/` inchangé), alors l'itération en cours **DOIT** être une proposition prise
   dans ROADMAP P1 — pas une itération de code. La soupape n'a jamais servi en 546 boucles : c'est
   ce quota qui la rend réelle.
5. **Une piste fausse se dit.** Si, après vérification (grep + lecture), le manque annoncé n'existe
   pas : écris-le dans le recap et **passe à la suivante**. Ne force pas une tâche pour « avoir
   commité » — §5 le rappelle : un run vide vaut mieux qu'un commit inventé.

## 4 ter. CONTRÔLE DE COHÉRENCE — vert ≠ bon

**Des tests verts ne prouvent pas une bonne UX.** Le pavé de 620 caractères du coach a été construit
par 60 itérations **toutes vertes** : chaque clause était testée isolément, personne ne lisait jamais
le **résultat cumulé**. Donc, dès que ta modification ajoute du texte à une surface **que l'utilisateur
lit** (insight du coach, résumé, libellé, notification) :

- **Rends-la pour de vrai**, avec un état réaliste et **chargé** (pas le cas minimal du test), et
  **lis la sortie entière** à voix haute dans ta tête. Trop long ? contradictoire ? redondant avec la
  phrase d'à côté ? → alors le vrai travail est de **curer**, pas d'ajouter.
- **Additionner n'est pas améliorer.** Une fonction qui renvoie 93 champs n'a pas besoin d'un 94ᵉ :
  elle a besoin qu'on **retire**, qu'on **regroupe**, ou qu'on **hiérarchise**.

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

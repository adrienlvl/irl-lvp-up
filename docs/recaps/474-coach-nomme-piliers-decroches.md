# #474 — Coaching : le coach NOMME les autres piliers qui décrochent (2.0.105)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

En #473, `adaptiveCoachFocus` a appris à rendre sa priorisation explicite quand plusieurs piliers
décrochent le même jour : « **2 autres piliers faiblissent aussi cette semaine — celui-ci d'abord** ».
Utile, mais **abstrait** : Adrien savait *combien* d'autres pans faiblissaient, pas *lesquels*. Or la
demande de la nuit vise la *« priorisation intelligente (quoi faire en premier aujourd'hui) »* — et
savoir que « ton **focus** et ta **nutrition** » décrochent aussi est bien plus actionnable qu'un
simple compteur. Le recap #473 listait précisément comme prochaine piste : « **nommer les autres
piliers qui décrochent plutôt que juste les compter** (« ton sommeil et ta nutrition aussi ») ». Le
coach comptait ; il ne nommait pas.

## L'amélioration

La note de priorisation **nomme** désormais les piliers restants, dans l'**ordre de gravité déjà
trié** (le prochain levier après le prioritaire vient en tête) :

- 1 autre : « … **Ton focus faiblit aussi cette semaine — celui-ci d'abord, c'est ton levier
  prioritaire.** »
- 2 autres : « … **Ton focus et ta nutrition faiblissent aussi cette semaine — celui-ci d'abord…** »

Les noms sont des formes possessives naturelles (`ton entraînement`, `ton focus`, `ton sommeil`,
`ta nutrition`), joints « a, b **et** c », première lettre capitalisée, verbe accordé
(`faiblit`/`faiblissent`). La liste vient de `fixes` (déjà trié par gravité : tier, ampleur du
décrochage, dormance), filtré sur les piliers **autres** que le choisi. Nouveau champ pur
`alsoSlippingPillars` (tableau des clés, dans l'ordre) en plus de `alsoSlipping` (compteur, conservé).
Le coach passe du « il y en a 2 autres » au « voici lesquels, dans l'ordre » — la priorisation devient
lisible de bout en bout.

### Garde-fous (identiques à #473, inchangés)

- **Uniquement quand `chosen` EST un fix** (tons `rebuild`/`revive`) — en renforcement, rien ne
  décroche → `alsoSlipping` 0, `alsoSlippingPillars` `[]`, aucune note.
- **HORS rotation** (`!rotated`) : après 3 j du même focus on a fui le prioritaire → « d'abord » serait
  faux.
- **HORS micro-pas** (`!microStep`) : on abaisse la barre — pas le moment d'empiler les alertes.
- **HORS geste déjà fait** (`!doneToday`) : l'action félicite, un « d'abord » sonnerait faux.
- Additif pur : nouveau champ `alsoSlippingPillars`, insight **enrichi** (le compteur `alsoSlipping`
  reste au retour) ; aucune autre branche touchée.

## Logique / tests

- `src/lib/logic.js` — bloc `alsoSlipping` : map `POSSESSIF`, construction de la liste nommée +
  accord singulier/pluriel ; nouveau champ `alsoSlippingPillars` au retour. CHANGELOG[0] 2.0.105.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'insight tel quel.
- `src/test/logic.test.js` — test « priorise explicitement » étendu : 2 piliers → `alsoSlippingPillars`
  `['focus']`, insight « Ton focus faiblit aussi » ; 3 piliers → `['focus','nutrition']`, insight
  « Ton focus et ta nutrition faiblissent aussi ». Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (2 piliers → `alsoSlippingPillars[0]`
  `focus` + « Ton focus faiblit aussi ») ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **461 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.105**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Le coach ne dit plus seulement *combien* de piliers faiblissent, mais *lesquels* et *dans quel ordre* :
« quoi faire en premier aujourd'hui » est désormais complet, du prioritaire aux suivants. Prochaines
pistes possibles : crédit multi-piliers (« 3/4 de tes piliers cochés aujourd'hui ») ; proposer un
créneau du soir (protection d'une fenêtre de coucher) quand le sommeil est le focus ; adapter le
verbe/ton selon la gravité du décrochage nommé (dormant vs simple creux).

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/474-coach-nomme-piliers-decroches.md`.

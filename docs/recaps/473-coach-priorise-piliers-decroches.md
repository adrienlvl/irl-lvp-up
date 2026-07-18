# #473 — Coaching : le coach dit par quoi COMMENCER quand plusieurs piliers décrochent (2.0.104)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

`adaptiveCoachFocus` sait depuis longtemps trier plusieurs piliers « à corriger » par gravité (tier,
puis ampleur du décrochage, puis dormance) et n'en pousser **qu'un** — le prioritaire. Mais ce tri
restait **invisible** pour Adrien : quand sport ET focus (et parfois nutrition) faiblissaient le même
jour, il ne voyait qu'**un seul** conseil, sans savoir que d'autres pans décrochaient aussi, ni
pourquoi **celui-là d'abord**. Or la demande de la nuit vise explicitement la *« priorisation
intelligente (quoi faire en premier aujourd'hui) »*, et le recap #472 listait comme prochaine piste :
« prioriser explicitement le pilier N°1 du jour quand plusieurs décrochent ». Le coach faisait le bon
choix mais le gardait pour lui.

## L'amélioration

Nouveau champ pur `alsoSlipping` (nombre) dans `adaptiveCoachFocus`, et une **note de priorisation
explicite** ajoutée à l'insight quand **plusieurs** piliers décrochent :

- 2 piliers : « …contre 3 la précédente. **Un autre pilier faiblit aussi cette semaine — celui-ci
  d'abord, c'est ton levier prioritaire.** »
- 3+ piliers : « … **2 autres piliers faiblissent aussi cette semaine — celui-ci d'abord, c'est ton
  levier prioritaire.** »

`alsoSlipping` = nombre de piliers « à corriger » **autres** que celui choisi (calculé sur la liste
`fixes` déjà triée). Le coach passe du choix **implicite** au « ne fais pas tout d'un coup, commence
par le bon levier » — la priorisation actionnable réclamée.

### Garde-fous

- **Uniquement quand `chosen` EST un fix** (tons `rebuild`/`revive`) : en renforcement (`reinforce`),
  rien ne décroche → `alsoSlipping` reste 0, aucune note.
- **HORS rotation anti-radotage** (`!rotated`) : après 3 j du même focus, on a justement **fui** le
  pilier prioritaire pour varier l'angle — dire « celui-ci d'abord » serait alors faux. `alsoSlipping`
  reste 0 dans ce cas.
- **HORS micro-pas** (`!microStep`) : quand le coach abaisse la barre après un conseil ignoré, empiler
  « et 2 autres piliers faiblissent » découragerait — on garde le message allégé.
- **HORS geste déjà fait** (`!doneToday`) : l'action félicite alors, un « d'abord » sonnerait faux.
- Additif pur : nouveau champ `alsoSlipping`, insight **enrichi** (jamais remplacé), aucun retrait ;
  toutes les autres branches (readiness, sommeil/nutrition/focus enrichis, créneaux agenda) intactes.

## Logique / tests

- `src/lib/logic.js` — bloc `alsoSlipping` (filtre `fixes` sur `pillar !== chosen.pillar`, note
  singulier/pluriel injectée dans l'insight) placé après `followThrough` et avant le crédit du jour ;
  champ `alsoSlipping` au retour. CHANGELOG[0] 2.0.104.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche déjà l'insight tel quel.
- `src/test/logic.test.js` — nouveau test « priorise explicitement quand plusieurs piliers
  décrochent » : 1 pilier → `alsoSlipping` 0 + pas de note ; 2 piliers → sport choisi, note singulier,
  `alsoSlipping` 1 ; 3 piliers → note pluriel, `alsoSlipping` 2 ; rotation → 0 + pas de « d'abord » ;
  renforcement → 0. Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (2 piliers → note + `alsoSlipping`
  1 ; 1 pilier → 0) ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **461 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.104**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Le coach ne se contente plus de choisir le bon pilier : il **explique** son choix et rend la
priorisation lisible — « quoi faire en premier aujourd'hui » devient explicite. Prochaines pistes
possibles : crédit multi-piliers (« 3/4 de tes piliers cochés aujourd'hui ») ; proposer un créneau du
soir (protection d'une fenêtre de coucher) quand le sommeil est le focus ; nommer les autres piliers
qui décrochent plutôt que juste les compter (« ton sommeil et ta nutrition aussi »).

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/473-coach-priorise-piliers-decroches.md`.

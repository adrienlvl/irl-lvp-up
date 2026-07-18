# #480 — Coaching : le coach donne le geste concret quand un RDV du soir menace le coucher (2.0.111)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

Depuis #476 (2.0.107), `adaptiveCoachFocus` **protège la fenêtre de coucher** : quand un plan de
recalage du sommeil est actif et qu'un RDV du soir déborde sur la cible, le coach le NOMME et alerte —
« « Dîner famille » (à partir de 21:30) mord sur ta cible de 22:30 — protège ta fenêtre du soir. » Utile,
mais le message ne faisait qu'**alerter** : il rappelait la cible… même quand le RDV finit **après** elle,
rendant cette cible **intenable ce soir**. Répéter « couche-toi à 22:30 » quand le RDV se termine à 22:50
est un ordre qu'Adrien ne peut pas honorer — et un conseil impossible à suivre décrédibilise le coach.
« Suggérer de décaler / donner un repli concret plutôt que juste alerter » figurait en tête des prochaines
pistes de **#477** et **#479**.

## L'amélioration

L'action du soir se scinde en **deux gestes concrets** selon où le RDV tombe par rapport à la cible :

- **RDV qui finit APRÈS la cible** (heure-cible devenue impossible) → le coach propose le **coucher
  réaliste** — calé sur la **fin du RDV** — comme repli honnête, plutôt que de laisser Adrien repousser
  encore : « « Dîner famille » (à partir de 23:50) finit vers **00:50**, après ta cible de 00:30 —
  **couche-toi dès sa fin** plutôt que de repousser encore, protège ta fenêtre du soir. » Viser un coucher
  **tenable** limite la casse mieux qu'un objectif inatteignable.
- **RDV qui finit AVANT la cible mais dans le sas d'endormissement** (30 min) → la cible **tient encore** :
  « … mord sur ta cible de 00:30 — **file au lit dès sa fin, sans écran**, pour protéger ta fenêtre du
  soir. » Aucun repli à proposer.

### Le point de conception

L'heure de fin est reconvertie depuis l'**échelle ancrée** (`bedtimeFromAnchor(ev.endAnchor)`, inverse
de `bedtimeAnchor`) — indispensable ici : la cible de recalage d'Adrien est souvent dans les petites
heures (00:30, 01:00…), et un RDV finissant à 00:50 doit s'afficher juste même en franchissant minuit.
On réutilise le seuil de menace déjà calculé (`ev.endAnchor > tgtAnchor` = fin après cible), aucune
nouvelle heuristique. Le libellé garde la sous-chaîne exacte **« protège ta fenêtre du soir »** dans les
deux branches → les assertions historiques (#476) passent inchangées.

### Garde-fous (hérités, intacts)

- Uniquement pilier `sommeil` + plan de recalage actif (`pd`, cible concrète à protéger) + RDV du soir
  (début ≥ 17:00, non complété) débordant sur `tgtAnchor − 30` — hérité de #476, inchangé.
- Additif pur : nouveau champ `sleepConflictBedtime` (coucher de repli quand la cible saute, sinon
  `null`) **toujours** renvoyé ; `sleepConflict` (heure de début du RDV) inchangé ; la note **enrichit**
  l'action, aucune autre branche touchée.

## Logique / tests

- `src/lib/logic.js` — dans le bloc `sleepConflict` : branche `ev.endAnchor > tgtAnchor` → coucher de
  repli (`bedtimeFromAnchor`) + libellé « finit vers HH:MM … couche-toi dès sa fin » ; sinon « file au lit
  dès sa fin ». Champ `sleepConflictBedtime` au retour. CHANGELOG[0] 2.0.111.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'insight (enrichi) tel quel.
- `src/test/logic.test.js` — test « protège la fenêtre » étendu : cas fin+20 min → `sleepConflictBedtime`
  = fin du RDV + « finit vers HH:MM » + « couche-toi dès sa fin » ; nouveau cas fin−15 min (dans le sas,
  avant cible) → `sleepConflictBedtime` null + « file au lit dès sa fin ». Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (cas fin+20 → `sleepConflictBedtime`
  = coucher de repli, « finit vers HH:MM », « couche-toi dès sa fin »). Assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **464 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.111**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Le garde-fenêtre du soir passe d'une **alerte** à un **geste tenable** : le coach cesse d'exiger un coucher
impossible et propose le repli réaliste. Prochaines pistes possibles : chercher un créneau plus TÔT dans
l'agenda pour suggérer de **décaler** le RDV lui-même (via `nextFreeSlot`) quand c'est faisable ; moduler
l'action du pilier dormant choisi (`revive`) vers un tout premier pas ré-amorçant ; exposer un « coucher
réaliste du soir » persistant côté plan de recalage.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/480-coach-decale-rdv-soir.md`.

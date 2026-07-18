# #476 — Coaching : le coach protège ta fenêtre de coucher d'un RDV du soir tardif (2.0.107)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

Depuis #471/#472, le coach « Le focus du moment » dit **quand** agir : il cale un bloc de focus
(`focusSlot`) et une séance de sport (`sportSlot`) dans un vrai créneau libre de l'agenda du jour. Le
pilier **sommeil**, lui, restait au « quoi/à quelle heure » : « Vise un coucher à 00:30 ce soir (ton
plan de recalage). » — sans jamais regarder si la **vraie journée** d'Adrien permet ce coucher. Or le
premier saboteur d'un plan de recalage, c'est un **soir qui déborde** : un RDV qui finit trop tard
rend la cible intenable, et le coach ne le voyait pas venir. La piste « proposer un créneau du soir
pour protéger la fenêtre de coucher-cible quand le sommeil est le focus » figurait en tête des
prochaines pistes de #472 **et** de #475 — c'est le pendant sommeil, côté soir, de `focusSlot`/`sportSlot`.

## L'amélioration

Nouveau champ pur `sleepConflict` dans `adaptiveCoachFocus`. Quand le pilier poussé est le **sommeil**,
qu'un **plan de recalage est actif** (cible de coucher concrète : `sleepPlanDay`) et qu'un RDV du
**soir** de l'agenda du jour **déborde** sur la fenêtre — il finit après (cible − 30 min de sas
d'endormissement), voire au-delà de la cible —, le coach le **NOMME** et alerte :

- « Vise un coucher à 00:30 ce soir (ton plan de recalage). **« Dîner famille » (à partir de 23:50)
  mord sur ta cible de 00:30 — protège ta fenêtre du soir.** »

Le coach passe du « couche-toi à HH:MM » aveugle à un « attention, ce soir précis déborde ».

### Comparaison sur l'échelle ANCRÉE (le point technique clé)

Tout est comparé via `bedtimeAnchor` (minutes depuis midi), **indispensable ici** : la cible de
recalage d'Adrien est souvent dans les **petites heures** (00:30, 01:00…). En minutes brutes, un RDV
finissant à 23:30 (1410) semblerait « après » une cible de 00:30 (30) — faux. Sur l'ancre,
soir → nuit → petit matin est monotone croissant, donc 23:30 (ancre 690) est bien **avant** 00:30
(ancre 750). C'est le même invariant que tout le sous-système sommeil (`sleepPlanDay`,
`sleepPlanAdherence`, `recentBedtimeAnchor`).

### Garde-fous

- **Plan actif requis** (`pd`) : sans plan, pas de cible de coucher concrète → rien à protéger →
  `sleepConflict` reste `null` (l'action générique « couche-toi à heure fixe » est conservée).
- **RDV du SOIR uniquement** (heure de début ≥ 17:00) : « ce soir » sans ambiguïté sur la même date,
  et la fin peut franchir minuit (l'ancre la suit). Écarte les RDV de journée (dont l'ancre serait
  grande à tort) et les items des petites heures (déjà passés, ambigus).
- **Sas de 30 min** : un RDV finissant exactement 30 min avant la cible ne déclenche pas (fenêtre
  d'endormissement respectée) ; au-delà, il mord.
- **On cite le RDV qui finit le plus TARD** parmi les menaçants, par son heure de **début** (toujours
  < 24:00 à l'affichage, même si l'événement mord après minuit).
- **Additif pur** : `sleepConflict` (HH:MM de début du RDV menaçant, ou `null`) **toujours** renvoyé ;
  la note **enrichit** l'action, ne la remplace pas. Aucune branche existante touchée.

## Logique / tests

- `src/lib/logic.js` — bloc `sleepConflict` dans la branche `chosen.pillar === 'sommeil'`, après la
  preuve d'impact ; `let sleepConflict = null` au scope fonction + champ au retour. CHANGELOG[0] 2.0.107.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'action (enrichie) telle quelle.
- `src/test/logic.test.js` — nouveau test « protège la fenêtre de coucher quand un RDV du soir
  déborde » : RDV finissant 20 min après la cible → alerte + `sleepConflict` = début du RDV ; RDV
  finissant tôt → aucune menace ; RDV de journée (< 17:00) → ignoré ; sans plan → null ; autre pilier
  → null. Positions calculées via `bedtimeAnchor`/`minutesToTime` (robuste à la valeur de la cible).
  Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (RDV du soir débordant → alerte +
  `sleepConflict`, comparaison ancrée ; sans plan → null) ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **463 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.107**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Les trois piliers d'action à horaire — focus, sport, sommeil — croisent désormais tous la vraie journée
d'Adrien : le focus et le sport disent « où caler », le sommeil dit « ce qui menace ta fenêtre ».
Prochaines pistes possibles : célébrer une **série** de journées complètes (4/4 plusieurs jours de
suite) ; moduler le ton d'`alsoSlipping` selon la gravité (dormant vs simple creux) ; suggérer de
**décaler** le RDV menaçant plutôt que juste alerter, si un créneau plus tôt existe.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/476-coach-protege-fenetre-coucher.md`.

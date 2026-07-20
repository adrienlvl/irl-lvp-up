# 556 — P7.1 : premier PARCOURS scripté dans le smoke (« enregistrer une séance »)

> Rotation respectée : les 5 derniers domaines étaient `etudes` (#555), `coach` (#554), `tests`
> (#553), `agenda` (#552), `robustesse` (#551). `coach` — la priorité de nuit — est **dans les 2
> derniers** → interdit cette boucle (§4 bis.3, et §3 : la rotation prime même sur la demande de
> nuit). Domaine `tests` : présent 1× dans les 5 derniers, pas dans les 2 derniers → autorisé. C'est
> exactement l'ordre conseillé du démarrage VPS : **#556 → tests → P7.1**. **Changement test-only
> (smoke) → aucun bump, aucune entrée CHANGELOG** (§2.6).

## Le manque, vérifié dans le code

Le smoke (`renderer-smoke.cjs`) est un **rendu ponctuel** : il charge la page une fois et vérifie que
des fonctions existent et que le DOM initial est correct. **Aucun check ne joue un ENCHAÎNEMENT**
utilisateur (ouvrir → saisir → valider → observer le résultat). P1.5 a tranché (option B, validée par
Adrien) : on étend le smoke avec des parcours scriptés **sans aucune dépendance** (Playwright reste
interdit, §3). P7.1 est le premier : *enregistrer une séance → historique et XP à jour*.

Flux réel reconstitué avant de coder (aucune supposition) :
- `#addWorkoutButton` (`app.js:698`) : ouvre `#workoutDialog`, réinitialise le formulaire, remet
  `pendingPlanId=null`, pré-remplit la date du jour.
- submit de `#workoutForm` (`app.js:708-710`) : lit type/durée/intensité, pousse l'exercice saisi dans
  `sessionExercises`, `unshift` la séance dans `state.workouts`, calcule l'XP
  (`min(100, max(15, round(durée/3 + effort*5 + nbExos*3)))`), crédite `state.xp` et `state.health`,
  ferme le dialogue, `save()`, `render()`.
- `render()` (`app.js:646`) appelle `renderTrainingHistory()` qui reconstruit `#historyList` avec un
  bouton `[data-history-workout="<id>"]` par séance.

## Ce qui a été fait

Nouveau check **bloquant** `recordSessionJourney` dans `renderer-smoke.cjs` (poussé dans `errors` s'il
échoue). Il joue le parcours **de bout en bout**, comme l'utilisateur :

1. clic sur `#addWorkoutButton` → le dialogue s'ouvre (`dlg.open === true`) ;
2. saisie de la discipline, durée (0 h / 45 min), intensité, un exercice (Squat 80 kg × 4×8) ;
3. `dispatchEvent(new Event('submit'))` → le vrai handler s'exécute ;
4. assertions : la séance est **en tête** de `state.workouts` avec les bonnes valeurs, l'**XP** est
   créditée du montant exact (`state.xp === avant + w.xp`), la **santé** +1, le dialogue s'est
   refermé, et surtout **le DOM suit** : `#historyList` contient bien `[data-history-workout="<id>"]`.

**Piège traité — la célébration de record ferait échouer le smoke.** Une 1ʳᵉ séance saisie sur un
historique vide bat forcément un record → toast + `haptic('record')` → `navigator.vibrate`, que
Chromium **bloque sans geste utilisateur** en émettant un warning console → le handler console du
smoke le pousse dans `errors` → SMOKE FAIL. Corrigé en **pré-remplissant l'historique** avec un Squat
plus lourd (100 kg) et à plus de reps (12) que celui saisi : la séance ajoutée ne bat aucun record,
donc aucune célébration. Le parcours teste bien l'**enregistrement**, pas la célébration (elle a déjà
son propre check, `newRecordToast`). `personalRecords` ne suit que `{load, reps}` par exercice
(`logic.js:4307`) — le pré-remplissage couvre les deux dimensions.

**État parfaitement restauré** (comme `dayViewPlural`, `listEmptyStates`, `agendaPostponeUndo`) :
`state.workouts`, `state.xp`, `state.health` et `pendingPlanId` sont capturés avant, remis après, puis
`save()` + `render()`. Le round-trip `state.xp = savedXp` est **pur** : la séance de test ne laisse
aucune trace pour les checks suivants. _(Note : le diagnostic non-asserté `levelSet` passe de « 60 »
à « 30 » — mon `render()` final resynchronise simplement `#xpLabel` sur le vrai `state.xp` courant,
écrasant une valeur DOM restée périmée par un check antérieur ; aucune assertion ne s'appuie dessus.)_

## Vérification

`cd src && xvfb-run -a npm run verify` → **522 tests + smoke, 100 % vert**. `recordSessionJourney:true`.

## Suite

P7.2 (générer un planning de révision → créneaux visibles dans l'agenda) et P7.3 (onboarding complet)
restent à faire, une boucle chacun, en changeant de domaine entre-temps. Le motif de parcours est
désormais posé et réutilisable (save → mute → click/saisie → dispatch submit → assert DOM+état →
restore).

Domaine : tests

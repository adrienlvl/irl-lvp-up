# #483 — Coaching : le coach fait grandir le geste au fil d'une reprise (2.0.114)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

L'arc du pilier dormant tenait deux temps : #481 propose le **tout premier pas** d'un pilier
dormant (`reviveStep`) et #482 **salue** la reprise une fois amorcée (`comeback`). Mais dès que la
reprise était reconnue, l'**action** retombait sur le générique du ton `reinforce` — « Encore un jour
actif aujourd'hui pour ancrer l'habitude. » — quel que soit le **stade** de la relance. Or une reprise
d'un seul geste (fragile, à protéger) et une reprise qui compte déjà 2-3 jours actifs (installée, prête
à remonter en régime) n'appellent pas le même ask. Pousser « une vraie séance » sur une étincelle
dégoûte ; répéter « juste un petit pas » quand la reprise tient déjà bride le retour à la normale.
« Escalader le geste au fil de la reprise (premier pas → séance courte → séance normale) » figurait en
**tête** des prochaines pistes de **#481** et **#482**.

## L'amélioration

Le **troisième temps** de l'arc. Quand une relance est amorcée (`comeback === true`, ton `reinforce`),
le coach adapte désormais l'action au nombre de **jours actifs distincts** de la semaine
(`chosen.recentDays`, déjà calculé), en l'**appendant** à l'action :

- **Étincelle** (`recentDays === 1`, un seul geste depuis la reprise) — c'est fragile, on PROTÈGE :
  « Ne force pas le rythme : un 2e jour actif cette semaine ancre l'étincelle mieux qu'une grosse
  séance. »
- **Elle prend** (`recentDays ≥ 2`) — la reprise s'installe, on REMONTE vers la normale : « La reprise
  tient (2 jours cette semaine) — tu as regagné le droit à une vraie séance aujourd'hui. »

Un geste par pilier (sport, focus, nutrition). Nouveau champ `comebackStage` (`'spark'` / `'building'`
/ `null` hors comeback).

### Le point de conception

- **Mesure de l'élan par `recentDays`** : le compteur de jours actifs DISTINCTS de la fenêtre récente
  était déjà calculé et exposé — inutile de recompter. `recentDays === 1` = seul le jour de relance ;
  `≥ 2` = un 2e jour a suivi. Signal net : Adrien a-t-il donné suite au premier geste ?
- **Sport × readiness** : le stade « building » pousse « une vraie séance » **seulement** si la
  readiness le permet (`readiness == null || ≥ 50`). Un jour de récup (< 50) garde le geste léger
  (« readiness bas aujourd'hui, garde léger, tu pousseras à la prochaine ») — sinon on contredirait
  l'action readiness déjà posée plus haut.
- **Sommeil exclu de l'escalade** : son coach dédié (`sleepIns`, plan de recalage) tient déjà une action
  riche et concrète qu'une escalade générique piétinerait. Le badge `comeback` (insight) reste, lui,
  actif pour tous les piliers — seule l'ACTION est laissée au coach sommeil.
- **Append, jamais remplace** : cohérent avec la façon dont `comeback` enrichit déjà l'insight. Le
  micro-pas, le crédit du jour, la readiness, la tâche phare… restent intacts.

### Garde-fous / rétrocompat

- Additif pur : nouveau champ `comebackStage` **toujours** renvoyé (`null` hors comeback) ; aucune autre
  branche touchée. Une hausse **continue** (pas de trou ≥ 14 j) garde `comeback === false` et
  `comebackStage === null` (vérifié sur `fBoost`).

## Logique / tests

- `src/lib/logic.js` — bloc `comeback` étendu (calcul `comebackStage` + escalade appendue à l'action),
  champ `comebackStage` au retour. CHANGELOG[0] 2.0.114.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'action (enrichie) telle quelle.
- `src/test/logic.test.js` — test coach étendu : reprise à 2 j (07-14 + 07-16 après 29 j) → `building`
  + « La reprise tient (2 jours cette semaine) » + « vraie séance » ; reprise à 1 j (07-16 après 31 j) →
  `spark` + « Ne force pas le rythme » ; hors relance → `comebackStage` null. Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (`fBack` → building ; `fSpark` →
  spark ; `fBoost` → `comebackStage` null). Assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **464 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.114**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
L'arc du pilier dormant est désormais complet en trois temps : proposer le premier pas (#481), saluer la
reprise (#482), **accompagner l'élan jusqu'au rythme normal** (#483). Prochaines pistes possibles :
nuancer le ton du comeback selon la longueur du trou (relance après 3 semaines vs 2 mois) ; chercher un
créneau plus TÔT pour proposer de **décaler** un RDV du soir menaçant (`sleepConflict`, via
`nextFreeSlot`) quand c'est faisable ; exposer une **micro-série de reprise** (2, 3, 5 jours d'affilée
après relance) comme jalon dédié.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/483-coach-escalade-geste-reprise.md`.

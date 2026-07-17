# 413 — Plan de recalage du sommeil : « atteint » ne se contredit plus lui-même (2.0.52)

## Le manque (bug pur prouvé — §4.1/§4.2)

`sleepPlanDay` (`src/lib/logic.js:6387`) est le cœur du coach de recalage du sommeil (demande d'Adrien,
boucles #377→#380). À partir du plan (coucher de départ → objectif) et des couchers réels récents, elle
renvoie un verdict complet : `reached`, `progress` (0-100), `stepsLeft`, `daysLeft`, `arrivalKey`.

`reached` applique — à raison — une **marge de tolérance de ±15 min** : un coucher réel récent jusqu'à
15 min APRÈS l'objectif compte comme atteint (« tu te couches désormais vers ton heure cible »). C'est
le cas de succès typique et bienveillant du coach.

Mais `progress` (ligne 6413), `remaining`/`stepsLeft`/`daysLeft`/`arrivalKey` (6416-6419) étaient
calculés sur l'écart **exact**, sans cette tolérance. Résultat : dès qu'un coucher tombait **1 à 15 min
après la cible** (dans la marge, mais pas encore pile à l'heure), la fonction renvoyait
**`reached: true` ET un chemin encore inachevé** — trois verdicts qui se contredisaient.

Cas concret prouvé (exécuté sur le code réel avant correctif) :

```js
const plan = { active:true, targetTime:'23:30', startTime:'06:00', startKey:'2026-07-16', stepMin:25, stepDays:1 };
sleepPlanDay(plan, [{ date:'2026-07-30', sleep:8, bedtime:'23:40' }], '2026-07-30')
// avant → { reached:true, progress:97, stepsLeft:1, daysLeft:1, arrivalKey:'2026-07-31' }
// attendu → cohérent : reached ⇒ progress:100, stepsLeft:0, daysLeft:0, arrivalKey = aujourd'hui
```

## Impact utilisateur visible

Dans `renderSleepPlan` (`app.js`), les champs sont affichés **ensemble** :
- ligne 536 : « 🎉 **Objectif atteint** : tu te couches désormais vers ton heure cible (23:30). »
- ligne 539 : « Objectif 23:30 · **arrivée estimée le 31/07 (dans 1 jour)**. »
- ligne 547 : barre de progression à **97 %** (pas pleine).

Une célébration « atteint » accompagnée, dans la même carte, d'une arrivée future et d'une barre
incomplète — précisément dans le scénario où le coach est censé féliciter (coucher ~10 min après la
cible). Message brouillé au pire moment.

## Le correctif (`reached` fait autorité)

`reached` porte l'intention (« objectif atteint, dans la marge »). On aligne les trois sorties dérivées
dessus : quand `reached`, la progression est pleine et il ne reste plus rien à parcourir.

```js
const progress   = reached ? 100 : (totalShift > 0 ? … : 100);
const remaining  = reached ? 0   : Math.max(0, fromAnchor - targetAnchor);
// stepsLeft/daysLeft/arrivalKey en découlent → 0, 0, aujourd'hui
```

Un seul seuil (`reached`) décide désormais à la fois de la célébration, de la barre et de l'arrivée.

## Portée & sûreté

- Logique pure, aucun rendu modifié — `app.js` consomme les mêmes champs, désormais cohérents entre eux.
- **Purement conservateur hors du bug** : quand l'objectif n'est PAS atteint, `reached` est faux → les
  deux expressions retombent exactement sur l'ancien calcul (aucune valeur changée). Le cas nominal
  « atteint pile à l'heure » (coucher ≤ cible) donnait déjà `remaining:0`/`progress:100` : inchangé.
- Le test `reached` existant (coucher 23:20 ≤ objectif 23:30) reste vert ; +1 cas ajouté qui prouve le
  bug (coucher 23:40, 10 min APRÈS la cible → `reached:true` mais tout cohérent). **432 tests + smoke**
  verts (`cd src && xvfb-run -a npm run verify`, `whatsNew` en 2.0.52, `SMOKE OK`).

## Variété (§4)

Rupture avec la famille Alternance (#409→#411) : bug de **cohérence interne d'un verdict** dans le
**module Sommeil**, l'autre demande forte d'Adrien — on fiabilise le coach sans rien casser ni retirer.

## Note de session (concurrence VPS)

Une session concurrente éditait `proteinTarget` dans le même working tree pendant cette itération. Son
hunk a été **exclu du commit** (patch filtré appliqué à l'index via `git apply --cached`) pour ne
committer que le correctif Sommeil ; la session concurrente a ensuite abandonné son changement de
son côté. Aucun travail tiers embarqué ni écrasé. Cf. `[[autopilot-concurrent-sessions]]`.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **432 tests + smoke 100 % verts**. Bump **2.0.51 → 2.0.52** :
effet utilisateur réel (fin d'un affichage contradictoire) → entrée CHANGELOG (🌙) + 2 assertions
`CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Aucune Release, zéro dépendance, aucune donnée
perso, aucune feature retirée. Boucle #413.
</content>

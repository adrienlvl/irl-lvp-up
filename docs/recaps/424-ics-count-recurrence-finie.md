# 424 — Agenda : un `.ics` récurrent « N fois » (COUNT) s'arrête enfin (2.0.58)

## Le manque (bug prouvé — §4.2 robustesse, domaine frais)

À l'import d'un fichier `.ics` (Google Agenda / Apple Calendrier), une RRULE est convertie en règle
de récurrence interne par `parseRRule(rrule, startDateKey)` (`src/lib/logic.js:878`). Cette fonction
ne lisait que `FREQ`, `INTERVAL`, `BYDAY` et `UNTIL` — **jamais `COUNT`**, alors que c'est la façon
standard (RFC 5545) dont Google/Apple encodent une série **finie** (« répéter 4 fois », « 10 fois »).

Conséquence user-facing : le modèle interne n'a **pas** de compteur d'occurrences et
`recurrenceMatches` (`logic.js:494`) ne s'arrête que sur `until`. Un événement importé avec
`RRULE:FREQ=WEEKLY;COUNT=4;BYDAY=MO` devenait donc une récurrence **infinie** — il apparaissait tous
les lundis **pour toujours** dans l'agenda au lieu des 4 prévus (vérifié : sans le correctif,
`recurrenceMatches(rule, '2030-01-07') === true`). Ces récurrents importés atterrissent dans
`state.recurring` via `applyImportedIcs` (`app.js:854`) → pollution durable de l'agenda.

`grep COUNT` sur `logic.js` **et** `logic.test.js` ne renvoyait rien : ni géré, ni testé.

## Le geste (COUNT → borne UNTIL équivalente, dans la seule `parseRRule`)

Correction **chirurgicale, une seule fonction**. Plutôt que d'ajouter un champ `count` à tout le
modèle (`normalizeRecurring` le droppe, `recurrenceMatches` l'ignore, `buildRRuleLine` ne
l'exporte pas → 4 points à toucher), on traduit `COUNT` en la **borne `until` équivalente = date de
la N-ième occurrence**. Tout l'aval gère déjà `until` sans autre modification :
`normalizeRecurring` le préserve (`logic.js:479`), `recurrenceMatches` l'applique (`logic.js:501`),
`buildRRuleLine` le réémet au round-trip.

La N-ième occurrence est trouvée par **simulation avec `recurrenceMatches` lui-même** (le moteur du
rendu aval → cohérence exacte, y compris les subtilités qu'un calcul fermé raterait) : on avance
jour par jour depuis `startDate`, on compte les jours qui matchent, et la N-ième date devient
`until`. Appliqué **seulement** si `UNTIL` est absent (RFC : `COUNT`/`UNTIL` exclusifs → `UNTIL`
prime) et si `COUNT ≥ 1`. **Repli sûr** : N-ième non atteinte dans une fenêtre large (20 000 jours,
~54 ans) → `until` reste vide, soit le comportement actuel — jamais pire.

Cas vérifiés sur le vrai code (`node -e`) et figés en tests :
- `DAILY;COUNT=3` (01-07) → `until 2026-07-03` ; `DAILY;INTERVAL=2;COUNT=3` → `07-05` ; `COUNT=1` → début seul ;
- `WEEKLY;COUNT=4;BYDAY=MO` (lun. 07-06) → `07-27` (4 lundis) ; sans BYDAY → jour du début ;
- `WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=4` → `07-22` (mer. de la sem. 2) ;
- `MONTHLY;COUNT=3` (01-15) → `03-15` ; **jour 31** (01-31) → `05-31` : févr./avr. **sautés** comme
  `recurrenceMatches` l'exige (preuve que la simulation gère les mois sans le jour visé) ;
- `YEARLY;COUNT=2` → +1 an ; `UNTIL` explicite l'emporte ; `COUNT=0`/absent → pas de borne.
- Bout-en-bout : `recurrenceMatches` renvoie `true` jusqu'au 4e lundi, `false` au 5e et les années
  suivantes ; round-trip `buildRRuleLine` réémet un `UNTIL` cohérent.

## Tests & vérif

- Nouveau `test('parseRRule : COUNT …')` (`logic.test.js`) : 15 assertions (closed-form daily,
  weekly mono/multi-jours + intervalle, monthly y c. jour 31, yearly, priorité UNTIL, COUNT≤0,
  bout-en-bout via `recurrenceMatches`). **+1 test → 436**, 0 échec.
- **Check smoke bloquant `icsCount`** (`renderer-smoke.cjs`, après `icsRrule`) : dans le vrai
  renderer Electron, `parseRRule('…COUNT=4;BYDAY=MO').until === '2026-07-27'`, le 5e lundi n'est plus
  matché, et une règle sans COUNT reste sans borne. Ligne `errors.push` associée.
- `cd src && xvfb-run -a npm run verify` → **436 tests + smoke 100 % verts** (`icsCount:true`,
  `whatsNew` en 2.0.58, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.57 → 2.0.58** : effet utilisateur réel (une série finie importée ne pollue plus
  l'agenda à l'infini) → entrée CHANGELOG (📅) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke
  `whatsNew`).
- Une seule fonction pure modifiée ; aucun autre point du modèle touché. Aucune Release, zéro
  dépendance, aucune donnée perso, aucune fonctionnalité retirée. Cas `UNTIL`/sans-COUNT inchangés.

## Variété (§4)

Rupture avec la série récente (polish anniversaires #423, couverture énergie #422, pas de vie #421) :
**bug de robustesse (§4.2)** dans le domaine **Agenda / import ICS**, jamais travaillé dans les
dernières boucles. Piste repérée via un audit des parseurs (récurrences/ICS). Boucle #424.

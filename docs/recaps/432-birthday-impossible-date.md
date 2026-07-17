# 432 — Anniversaires : une date impossible ne crée plus d'anniversaire « fantôme » (2.0.65)

## Le manque (bug prouvé — §4.1 couverture / §4.2 robustesse, domaine Anniversaires)

`normalizeBirthday` (`logic.js:390`) validait `day` (1–31) et `month` (1–12) **indépendamment** :

```js
day: day >= 1 && day <= 31 ? day : 0,     // borne globale, pas relative au mois
month: month >= 1 && month <= 12 ? month : 0,
```

Une date **impossible** mais dont chaque champ est individuellement valide — par ex. jour=31 / mois=2
— survivait donc telle quelle. Dans `upcomingBirthdays` (`logic.js:422`), `new Date(2026, 1, 31)`
**déborde** au 3 mars 2026 : l'anniversaire était annoncé « à venir le 3 mars ». Mais sa fonction
sœur `birthdaysForDay` (`logic.js:406`), qui matche par (`b.day`, `b.month`) exacts, ne le trouvait
**jamais** au 3 mars (ni via `feb29OnMar1`, réservé à jour=29). Deux fonctions sœurs qui se
contredisent : un anniversaire annoncé « à venir » qui n'apparaît jamais dans la vue du jour.

Preuve (exécutée sur le vrai code, figée en test) :

```
upcomingBirthdays([{id:1,name:'Fantome',day:31,month:2}], '2026-02-20', {withinDays:60})
  AVANT → [{ ..., date:'2026-03-03', ... }]   // date fantôme, jamais matchée par birthdaysForDay('2026-03-03')
  APRÈS → []                                    // date impossible ignorée, les deux sœurs sont d'accord
```

Non saisissable via l'UI (`<input type="date">` natif, `app.js:881`), mais **réel sur import /
restauration / legacy** : `normalizeState` passe `state.birthdays` par `normalizeBirthday` sans
rejeter une date impossible, et un backup peut contenir `{day:31, month:2}`. Même classe de bug que
le sommeil #431 : invisible sur install fraîche, réel sur données restaurées.

`grep` : le seul test de bornes (`logic.test.js:988`) ne couvrait que jour=40/mois=13 (bornes hautes
globales), jamais une combinaison jour valide / mois valide mais **impossible ensemble**.

## Le geste (jour borné au max RÉEL du mois — le 29 février préservé)

```js
const monthOk = month >= 1 && month <= 12;
const maxDay = monthOk ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] : 31;
...
day: day >= 1 && day <= maxDay ? day : 0,
```

Février est plafonné à **29** (pas 28) exprès : le 29 février reste valide et continue d'être fêté le
1er mars les années non bissextiles (débordement **intentionnel**, testé). Seules les vraies dates
impossibles (30/31 févr., 31 avr./juin/sept./nov.) tombent à `day:0` → filtrées partout par
`b.day && b.month`, exactement comme `birthdaysForDay` les ignore déjà. **Rétro-compatible** : une
vraie date stockée est inchangée ; seule une date impossible passe de « fantôme » à « ignorée ».

## Tests & vérif

- Bloc pur `normalizeBirthday` étendu (`logic.test.js`) : chaque max de mois vérifié (31 févr./avr./
  juin/sept./nov. → 0 ; 30 avr., 31 déc., 29 févr. → conservés ; mois invalide → month 0).
- Nouveau bloc pur `upcomingBirthdays` : la date impossible → `[]`, cohérente avec `birthdaysForDay`
  ('2026-03-03') → `[]` ; une vraie date du même mois (28 févr.) reste annoncée.
- **Check smoke `birthdays` étendu** (`renderer-smoke.cjs`, bloquant) : dans le vrai renderer
  Electron, `normalizeBirthday(31/2).day===0`, `(29/2).day===29`, et `upcomingBirthdays` de la date
  impossible renvoie `length 0`. Ligne `errors.push` conservée.
- `cd src && xvfb-run -a npm run verify` → **440 tests + smoke 100 % verts** (`birthdays:true`,
  `whatsNew` en 2.0.65, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.64 → 2.0.65** : effet utilisateur réel (plus d'anniversaire fantôme après un import/une
  restauration) → entrée CHANGELOG (🎂) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke
  `whatsNew`). Une seule fonction pure, une garde. Aucune feature retirée. Aucune Release, zéro
  dépendance, aucune donnée perso.

## Variété (§4)

Reste dans le registre robustesse/correctness des dernières boucles, mais **domaine Anniversaires**
(jamais travaillé récemment) et sur la même veine « fonctions sœurs cohérentes » que #431 (Sommeil).
Candidat issu d'un audit ciblé (agent) des domaines peu touchés ; les deux autres candidats
(`departureInfo` leaveInMin au passage de minuit — sémantique ambiguë sans date ; `weeksBetween`
round vs floor — arrondi d'affichage défendable) ont été écartés comme trop débattables pour un run
autonome. Boucle #432.

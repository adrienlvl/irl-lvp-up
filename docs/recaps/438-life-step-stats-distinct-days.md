# 438 — Pas du jour : le suivi compte des JOURS distincts, pas des saisies (2.0.71)

## Le manque (bug prouvé — §4.4 correctness / §4.2 robustesse, domaine Objectifs de vie / RPG)

Jumeau **direct** de #437 (`questPerfectStreak`), mais dans un domaine différent (« pas du jour »
d'Adrien pour ses objectifs de vie, sur l'accueil) et avec la même asymétrie **interne à une seule
fonction** — signal fort.

`lifeStepStats` (`logic.js:1363`) alimente le bandeau « 🌱 X jours d'affilée … · `doneDays`/`loggedDays`
· `rate` % » (`app.js:454`). Il calculait :

```js
const entries = (Array.isArray(log) ? log : [])
  .filter(e => e && isKey(e.date) && String(e.text || '').trim() && e.date !== todayKey);
...
const doneDates = entries.filter(e => e.done).map(e => e.date);
if (todayCounts && t.done) doneDates.push(todayKey);
const loggedDays = entries.length + (todayCounts ? 1 : 0);
const doneDays = doneDates.length;
```

`streak` passe par `dailyStreak` (`logic.js:1304`), qui **déduplique par date via un `Set`** : il ne
compte que des jours distincts. Mais `doneDays`, `loggedDays` et `rate` comptaient les **entrées**
(`.length`). Sur une date **en double**, le **même bandeau** affichait deux comptes **contradictoires** :
une série (🌱) qui ne compte qu'un jour par date, et un « `doneDays`/`loggedDays` · % » qui en comptait
deux.

Preuve (figée en test) — le 08 en double, réécrit non tenu :
```
lifeStepStats([07 tenu, 08 tenu, 08 réécrit NON tenu (doublon), 09 tenu], '2026-07-10', null)
  AVANT → loggedDays 4, doneDays 3, rate 75   (08 compté 2×, et « tenu » alors que le dernier ne l'est plus)
  APRÈS → loggedDays 3, doneDays 2, rate 67, streak 1
```

**Pourquoi c'est réel** : `logLifeStep` (`logic.js:1344`) déduplique par date à l'écriture
(`base.filter(e => e.date !== s.date)` avant `push`), donc le chemin **normal** ne produit jamais de
doublon. Mais `lifeStepLog` **n'est pas dédupliqué** par `normalizeState` (seulement forcé en tableau,
`app.js:23`, exactement comme `questLog`) : une date en double survient à l'**import / restauration de
sauvegarde** (legacy ou fichier abîmé) — même porte d'entrée que #428/#431/#436/#437.

`grep` : le test existant (`logic.test.js:2152`) et le check smoke `lifeStep` (`renderer-smoke.cjs:166`)
n'utilisaient que des dates **distinctes** (via `logLifeStep`) — le chemin dupliqué n'était **jamais**
exercé, et `lifeStep` **n'était même pas bloquant**.

## Le geste (déduplication par date, dernier gagné — comme `logLifeStep`)

On construit une `Map` par date (dernière entrée gagnée, cohérent avec l'idempotence « réécrit
l'entrée » de `logLifeStep`), puis toute la suite de la fonction opère sur des **jours distincts** :

```js
const byDate = new Map();
(Array.isArray(log) ? log : []).forEach(e => {
  if (e && isKey(e.date) && String(e.text || '').trim() && e.date !== todayKey) byDate.set(e.date, e);
});
const entries = [...byDate.values()];
```

**Rétro-compatible** : sans date en double, `byDate.size === entries.length` et l'ordre d'insertion
préserve les dates → comportement identique. Le jour courant reste passé à part (`todayStep`) et est
déjà exclu du log (`e.date !== todayKey`) : aucun conflit. `lastDone` (qui trie `entries` déjà) reste
juste.

## Tests & vérif

- Bloc `lifeStepStats` (`logic.test.js`) étendu de 2 cas date en double : le 08 réécrit non tenu
  (loggedDays 3, doneDays 2, rate 67, streak 1 au lieu de 4/3/75) et un 09 dupliqué dont le dernier est
  tenu (loggedDays 1, doneDays 1 — ni doublé, ni perdu). Les cas nominaux préexistants (dates
  distinctes) sont inchangés → filet de non-régression.
- Check smoke `lifeStep` étendu (cas date en double : `dup.loggedDays === 2 && dup.doneDays === 1`)
  **et promu bloquant** (nouvelle ligne `errors.push`) — il n'était calculé que sans être enforced.
- `cd src && xvfb-run -a npm run verify` → **442 tests + smoke 100 % verts** (`lifeStep:true`,
  `whatsNew` en 2.0.71, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.70 → 2.0.71** : effet utilisateur réel (compte de jours et % justes, cohérence avec la
  série affichée juste à côté) → entrée CHANGELOG (🌱) + 2 assertions `CHANGELOG[0].v` (logic.test.js +
  smoke `whatsNew`).
- Une fonction pure retouchée (dédup par date), un bloc de test étendu (442), un check smoke promu
  bloquant. Aucune feature retirée, aucune Release, zéro dépendance, aucune donnée perso, posture
  sécurité inchangée. Le module Alternance (sacré) n'est pas touché.

## Variété (§4)

Poursuit le fil « jours distincts vs saisies » (#436/#437) mais dans un **domaine neuf** (Objectifs de
vie / « pas du jour ») et sur une **asymétrie interne** (streak dédupliqué vs doneDays/rate par
entrées). Le correctif s'appuie sur la sémantique **déjà écrite** de `logLifeStep` (une entrée par
date, dernier gagné) : pas de choix de design à inventer. C'était la **piste #1** (« LE PLUS FORT ») de
l'audit mémorisé en #437. Boucle #438.
</content>
</invoke>

# 437 — Journées parfaites (quêtes) : compter des JOURS distincts, pas des saisies (2.0.70)

## Le manque (bug prouvé — §4.4 correctness / §4.2 robustesse, domaine Quêtes / RPG)

Même classe que #436, mais dans un domaine différent (Quêtes/RPG, hors des boucles récentes) et
avec une asymétrie **interne à une seule fonction** — signal encore plus fort qu'une incohérence
entre sœurs.

`questPerfectStreak` (`logic.js:1411`) alimente le bandeau « 🏅 X journées parfaites d'affilée · Y/Z
jours parfaits · R % » (`app.js:488`). Il calculait :

```js
const entries = (Array.isArray(log) ? log : [])
  .filter(e => e && isKey(e.date) && Number(e.total) > 0 && e.date !== todayKey);
const perfect = entries.filter(e => Number(e.done) >= Number(e.total)).map(e => e.date);
...
const loggedDays = entries.length + (todayCounts ? 1 : 0);
const perfectDays = perfect.length;
```

`streak` est calculé par `dailyStreak` (`logic.js:1304`), qui **déduplique par date via un `Set`** :
il ne compte donc **que des jours distincts**. Mais `perfectDays`, `loggedDays` et `rate` comptaient
les **entrées** (`.length`). Sur une date **en double**, le **même bandeau** affichait deux comptes
**contradictoires** : une série (🏅) qui ne compte qu'un jour par date, et un « Y/Z jours · R % » qui
en comptait deux.

Preuve (exécutée sur le vrai code, figée en test) — le 08 en double, réécrit imparfait :
```
questPerfectStreak([07:2/2, 08:3/3, 08:1/3 (doublon), 06:4/4], '2026-07-10', 4, 4)
  AVANT → perfectDays 4, loggedDays 5 (08 compté 2×), rate 80
  APRÈS → perfectDays 3, loggedDays 4, rate 75
```

**Pourquoi c'est réel** : `logQuestDay` (`logic.js:1393`) déduplique par date à l'écriture
(`base.filter(e => e.date !== dateKey)` avant `push`), donc le chemin **normal** ne produit jamais de
doublon. Mais `questLog` **n'est pas dédupliqué** par `normalizeState` (seulement forcé en tableau,
`app.js:23`) : une date en double survient à l'**import / restauration de sauvegarde** (legacy ou
fichier abîmé) — exactement la même porte d'entrée que #428/#431/#436.

`grep` : le test existant (`logic.test.js:2214`) et le check smoke `questStreak` n'utilisaient que des
dates **distinctes** (via `logQuestDay`) — le chemin dupliqué n'était **jamais** exercé.

## Le geste (déduplication par date, dernier gagné — comme `logQuestDay`)

On construit une `Map` par date (dernière entrée gagnée, cohérent avec l'idempotence « réécrit
l'entrée » de `logQuestDay`), puis on compte des **jours distincts** :

```js
const byDate = new Map();
(Array.isArray(log) ? log : []).forEach(e => {
  if (e && isKey(e.date) && Number(e.total) > 0 && e.date !== todayKey) byDate.set(e.date, e);
});
const perfect = [...byDate.values()].filter(e => Number(e.done) >= Number(e.total)).map(e => e.date);
...
const loggedDays = byDate.size + (todayCounts ? 1 : 0);
```

**Rétro-compatible** : sans date en double, `byDate.size === entries.length` et l'ordre d'insertion
préserve les dates → comportement identique. Le jour courant reste passé à part (`todayDone`/
`todayTotal`) et est déjà exclu du log (`e.date !== todayKey`) : aucun conflit.

## Tests & vérif

- Bloc `questPerfectStreak` (`logic.test.js`) étendu de 2 cas date en double : le 08 réécrit
  imparfait (loggedDays 4, perfectDays 3, rate 75, au lieu de 5/4/80) et un 08 parfait dupliqué
  (loggedDays 2, perfectDays 1 — ni l'un ni l'autre ne double le jour). Les cas nominaux préexistants
  (dates distinctes) sont inchangés → filet de non-régression.
- Check smoke `questStreak` étendu (cas date en double : `loggedDays === 2 && perfectDays === 1`)
  **et promu bloquant** (nouvelle ligne `errors.push`) — il n'était calculé que sans être enforced.
- `cd src && xvfb-run -a npm run verify` → **442 tests + smoke 100 % verts** (`questStreak:true`,
  `whatsNew` en 2.0.70, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.69 → 2.0.70** : effet utilisateur réel (compte de jours parfaits et % justes, cohérence
  avec la série affichée juste à côté) → entrée CHANGELOG (🏅) + 2 assertions `CHANGELOG[0].v`
  (logic.test.js + smoke `whatsNew`).
- Une fonction pure retouchée (dédup par date), un bloc de test étendu (442), un check smoke promu
  bloquant. Aucune feature retirée, aucune Release, zéro dépendance, aucune donnée perso, posture
  sécurité inchangée. Le module Alternance (sacré) n'est pas touché.

## Variété (§4)

Poursuit le fil « jours distincts vs saisies » ouvert par #436 mais dans un **domaine neuf**
(Quêtes / gamification RPG) et sur une **asymétrie interne** (streak dédupliqué vs perfectDays/rate
par entrées) plutôt qu'entre sœurs. Le correctif s'appuie sur la sémantique **déjà écrite** de
`logQuestDay` (une entrée par date, dernier gagné) : pas de choix de design à inventer. Boucle #437.

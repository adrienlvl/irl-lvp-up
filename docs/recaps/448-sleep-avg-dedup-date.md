# 448 — Bilans hebdo/mensuel : moyenne de sommeil dédupliquée par date (2.0.80)

**Boucle #448 · build 2.0.80 · domaine Sommeil/Bilans · correctness (§4.1)**

## Le manque (vérifié avant de coder, exécuté sous node)

`weeklySummary` (`logic.js:2180`, `sleepAvg` du bilan hebdo partageable) et `monthlyRecap`
(`logic.js:2247`, `sleepAvg` du récap mensuel) calculent la durée de sommeil moyenne en moyennant les
**saisies brutes** (`rec.reduce(...) / rec.length`) après un simple `filter`, sans dédupliquer par
date. Or leurs fonctions sœurs — `weeklySleepStats` (`logic.js:6409`), `sleepDebtHours`
(`logic.js:6390`), `sleepSeries` (`logic.js:6428`) — dédupliquent toutes par date via un `byDate`
(une valeur par nuit, dernier check-in). Le commentaire même de `weeklySummary` (l. 2180-2182)
revendiquait la parité « comme monthlyRecap / weeklySleepStats » : contrat non tenu.

Deux relevés de sommeil pour la **même nuit** (import, restauration de sauvegarde, ou double
check-in le même jour — exactement le scénario legacy déjà corrigé pour `weeklyAdherence` en #436)
faisaient peser cette nuit double dans la moyenne.

**Reproduction (exécutée avant fix) :**

- `weeklySummary({recovery:[{date:'2026-07-13',sleep:8},{date:'2026-07-13',sleep:4},{date:'2026-07-14',sleep:8}]}, '2026-07-13').sleepAvg`
  → `6.7` (= (8+4+8)/3) ; attendu `6` (= (4+8)/2). La sœur `weeklySleepStats` renvoyait déjà `6`.
- `monthlyRecap({recovery:[{date:'2026-07-05',sleep:8},{date:'2026-07-05',sleep:4}]}, '2026-07').sleepAvg`
  → `6` ; attendu `4` (une seule nuit, dernier check-in).

Impact concret : `sleepAvg` alimente `weeklyInsights` (nudge « sommeil bas ») et le texte partageable
`weeklySummaryText`/`monthlyRecapText` (ligne « 😴 … h ») → moyenne fausse + alerte « sommeil bas »
déclenchée (ou masquée) à tort. C'est objectivement faux : une moyenne « par nuit » qui compte une
nuit plusieurs fois n'est pas une moyenne par nuit.

Trou de couverture : les tests n'exerçaient que le cas `sleep:0` (nuit non chiffrée) ; **aucun** test
avec deux relevés `sleep>0` sur la même date pour ces deux fonctions. Candidat trouvé par audit frais
des parseurs/normalizers/calculs de dates (hors familles closes #440→#447).

## Le correctif

Dans les deux fonctions, remplacer le `filter` + moyenne sur saisies brutes par une déduplication
`sleepByDate` (une valeur par date, dernier check-in) puis moyenne sur `Object.values(sleepByDate)` —
exactement le pattern des sœurs. Dans `monthlyRecap`, le garde-fou de nullité `!rec.length` devient
`!sleepNights.length`. Rétro-compatible : sur des nuits toutes distinctes (le cas courant), le
résultat est identique (vérifié : moyenne normale 8+6 → 7 avant/après).

## Tests

- **logic.test.js** (`weeklySummary`) : +1 test — deux relevés même nuit → `sleepAvg = 6`, ET égalité
  avec `weeklySleepStats(...).avg` (les sœurs s'accordent).
- **logic.test.js** (`monthlyRecap`) : +2 assertions dans le test d'agrégation — deux relevés même
  nuit → `sleepAvg = 4` (pas 6).
- Pure logique (rendu inchangé) : checks smoke `weeklyText`/`monthlyRecap`/`weeklyInsights` restent
  verts. **445 tests + smoke 100 % vert.**

`cd src && xvfb-run -a npm run verify` → **OK** (`SMOKE OK`, 445 pass).

## Suite

Toutes les statistiques de sommeil dérivées de `recovery[]` dédupliquent désormais par date de façon
cohérente (grep confirmé : plus aucune fonction sommeil ne moyenne des saisies brutes). Famille
« sommeil — une valeur par nuit » alignée sur la convention #436.

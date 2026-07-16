# #384 — Anniversaires du 29 février fêtés les bonnes années (2.0.28)

## Le manque (bug pur prouvé, domaine anniversaires)

Une personne née un **29 février** était mal gérée les années **non bissextiles** — deux symptômes
liés, prouvés avant correction :

- **`birthdaysForDay`** (utilisée par le calendrier mensuel, `renderMonthCalendar`) ne matchait que
  `day === 29 && month === 2`. Les années sans 29 février (2027, 2100…), l'anniversaire
  **n'apparaissait AUCUN jour** dans le calendrier — la personne était simplement oubliée.
- **`upcomingBirthdays`** calculait bien la proximité via `new Date(year, 1, 29)` (que JS fait
  basculer au 1er mars les années non bissextiles), donc `daysUntil` était juste… mais le champ
  `date` était reconstruit à la main en `${year}-${pad(month)}-${pad(day)}` → il affichait
  **`2027-02-29`, une date qui n'existe pas**. Incohérent avec `daysUntil`, et la navigation
  (clic → agenda) pointait vers un jour fantôme.

## Le correctif (minimal, convention cohérente)

Convention retenue : **29 février → fêté le 1er mars** les années non bissextiles (exactement le
comportement du rollover `new Date` déjà à l'œuvre dans `upcomingBirthdays`).

- **`birthdaysForDay`** : détection année bissextile (`%4 && !%100 || %400`) ; si la date est un
  1er mars d'année non bissextile, on inclut aussi les anniversaires `day === 29 && month === 2`.
- **`upcomingBirthdays`** : le champ `date` est désormais dérivé de l'occurrence **réelle** (`next`,
  déjà basculée au 1er mars par JS) au lieu d'être recomposé depuis `month`/`day` bruts → plus jamais
  de date impossible. **Cas nominaux strictement inchangés** (pour un anniversaire ordinaire,
  `next.getMonth()+1`/`next.getDate()` valent exactement `month`/`day`).

Les années **bissextiles**, tout reste sur le **29 février** (le 1er mars n'inclut alors que les
vrais 1er mars). Cohérence vérifiée entre les deux fonctions et avec les règles séculaires
(2000 bissextile, 2100 non bissextile).

## Tests (+2 blocs, 410 → 412)

- `birthdaysForDay` : 28 févr. non bissextile → `[]` ; 1er mars 2027 → l'anniversaire (bug corrigé) ;
  29 févr. 2028 (bissextile) → présent, 1er mars 2028 → absent ; 2100 (non bissextile) → 1er mars ;
  2000 (bissextile) → 29 févr. ; cohabitation d'un vrai 1er mars et d'un 29 févr. le même jour.
- `upcomingBirthdays` : année non bissextile → `date` = `2027-03-01` (réelle) cohérente avec
  `daysUntil` ; année bissextile → `2028-02-29`.

`verify` : **412 tests + smoke** verts.

## Contexte

Build **2.0.28**. Backlog autonome §4.1-4.2 (bug pur prouvé par test → corrigé a minima + robustesse
d'une fonction date). Domaine anniversaires/calendrier, varié par rapport aux itérations récentes
(parseurs #381-382, device #383). Aucune Release, zéro dépendance, aucune donnée perso, aucune
feature retirée.

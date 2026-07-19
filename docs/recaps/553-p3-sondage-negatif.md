# 553 — P3 « tests & robustesse » : sondage NÉGATIF, prémisse non confirmée

> Rotation respectée : #552 `agenda` → #553 `tests`. **Aucun changement de code, aucun bump.**
> Application directe de VPS-AUTOPILOT §4 bis.5 (« une piste fausse se dit ») et §5 (« un run vide
> vaut mieux qu'un commit inventé »).

## Ce qui a été fait

P3 postulait des « fonctions pures peu couvertes » à durcir. Sondage systématique des fonctions les
plus exposées, avec entrées hostiles :

| Fonction | Entrées testées | Résultat |
|---|---|---|
| `jobDateFromText` | `30/02`, `31/11`, `13/45`, `29/02` non bissextile, `2026-13-01`, année sur 2 chiffres | **Correct** — toutes rejetées (`''`) |
| `recurrenceMatches` | mensuel depuis le 31 sur mois courts, mensuel depuis le 29 en février, annuel 29/02, hebdo `interval:2` | **Correct et cohérent** — un mois sans 31 ne produit pas d'occurrence, le 29/02 ne tombe que les bissextiles |
| `parseIcsDateTime` | tronqué, vide, `20261332T250000Z`, sans `Z` | **Correct** — `null` sur invalide |
| `agendaMatch` | accents, casse, requête vide | **Correct** — insensible casse/accents |
| `normalizeApplication` + `mergeApplications` | nom d'entreprise avec espaces parasites, via le vrai parseur CSV | **Correct** — normalisé en amont, **0 doublon** à la fusion |
| `pct`, `levelFromXp`, `weekStart` | `NaN`, négatifs, valeurs extrêmes, dates invalides | Pas de crash, replis sains |

**Couverture déjà en place** (contredit la prémisse) : 34 références `recurrenceMatches`,
23 `parseIcsDateTime`, 20 `jobDateFromText`, 11 `agendaMatch` dans `logic.test.js`.

## Deux hypothèses explicitement invalidées

1. **« Les noms d'entreprise non trimés créent des doublons à la sync Sheets »** — FAUX.
   `normalizeApplication` ne trime pas le champ brut, mais `parseSheetApplications` **et**
   `mergeApplications` normalisent pour la comparaison : `'  Cabinet Martin  '` fusionne bien avec
   `'Cabinet Martin'` (0 ajout). Vérifié via le vrai parseur CSV, pas seulement l'API interne.
2. **« `recurrenceMatches` gère mal les fins de mois »** — FAUX. Ma première sonde inventait la forme
   de la règle (`{freq,start}` au lieu de `{rule:{freq,interval,weekdays,startDate,until}}`) et
   renvoyait donc `false` partout. **Leçon : vérifier la forme réelle via le normalizer avant de
   conclure** — une sonde mal formée fabrique de faux bugs.

## Conséquence pour la roadmap

**P3 est requalifié** : ce n'est pas un gisement de bugs. Le vrai gisement de cette session était
ailleurs — les **regex non ancrées** sur du français (#551, 3 occurrences + le bug #446). P3 reste
utile comme *couverture*, mais ne doit plus être présenté comme « des fonctions peu couvertes à
durcir » : c'est faux et ça ferait perdre une boucle à qui le prendra au mot.

Domaine : tests

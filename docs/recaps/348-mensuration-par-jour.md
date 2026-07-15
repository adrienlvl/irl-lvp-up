# #348 — Mensurations : une entrée par jour + fusion des champs (1.9.282)

## Le manque (incohérence + robustesse)

La pesée est déjà « une par jour » (`upsertWeight`, #333) : re-saisir remplace au lieu de dupliquer.
Mais **`saveMeasurements` faisait un simple `push`** → deux saisies le même jour (correction d'une
faute de frappe, ou complément d'un champ plus tard) créaient un **doublon de date**, polluant
l'historique et rendant le tri instable (`measurementDelta` trie par date seule : « first »/« latest »
d'une date dupliquée devenaient arbitraires).

## Ce qui change

Nouvelle fonction pure `upsertMeasurement(measurements, entry, dateKey)`, pendant d'`upsertWeight` :

- **Une entrée par jour** : re-saisir le même jour met à jour la ligne existante (id conservé).
- **Fusion des champs** : un champ vide ne remplace PAS la valeur déjà notée ce jour-là (ex. mesurer
  la taille le matin puis la poitrine le soir garde les deux). Seuls les champs renseignés (> 0)
  écrasent.
- Bornes [10..300] cm, arrondi 0,1, non mutant, trié par date.

`#saveMeasurements` utilise désormais cette fonction.

## Vérification navigateur (flux réel)

| Action | Résultat |
|---|---|
| 1re saisie (taille 84 / poitrine 100 / bras 36) | ✅ 1 entrée {84, 100, 36} |
| 2e saisie même jour (taille 82,5 seule) | ✅ **toujours 1 entrée** : taille→82,5, poitrine 100 & bras 36 **conservés** |

Avant le fix : la 2e saisie créait une 2e entrée dupliquée.

## Tests

366 tests `node:test` (nouvelle date → ajout ; même date → fusion + id conservé ; arrondi ;
aucun champ valide / sous-borne / date invalide → inchangé ; non-mutation) + smoke `measureUpsert`
**bloquant**.

## Rotation

#348 — début rotation 35 (build 1.9.282). Type : robustesse / cohérence. Prochain #349.

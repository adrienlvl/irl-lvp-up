# #345 — Pouls hebdomadaire des habitudes (1.9.279)

## Le manque

Le panneau habitudes montre chaque habitude en détail (série 🔥, record 🏆, régularité 30 j 📊,
frise 7 j) et `#habitSummary` donne le compte **du jour**. Mais aucune **vue d'ensemble
hebdomadaire** : « globalement, comment va ma semaine sur TOUTES mes habitudes ? »

## Ce qui change

Nouvelle fonction pure `habitsWeekPulse(habits, todayKey)`, appuyée sur `habitWeekMap` (déjà testé) :
agrège sur les 7 derniers jours les occurrences **prévues** vs **tenues** de toutes les habitudes
(chaque habitude ne compte que ses jours programmés). Renvoie
`{ done, scheduled, rate, days:[{key,done,scheduled}] }` ou `null` si aucune occurrence prévue.

Rendu sous la liste : un bandeau « 📅 Cette semaine · X/Y · Z% » (couleur selon le taux) + une frise
de 7 pastilles (verte = tout tenu ce jour, dégradée = partiel, rouge = raté, grise = rien de prévu).
Masqué s'il n'y a pas d'habitude — zéro encombrement.

## Vérification navigateur (rendu réel)

Scénario : 2 habitudes quotidiennes, A tenue 5/7 j, B tenue 3/7 j.

| Élément | Résultat |
|---|---|
| Header | ✅ « 📅 Cette semaine · **8/14 · 57%** » |
| Couleur du taux | ✅ `hwp-mid` (jaune #facc15, car 50–79 %) |
| Frise | ✅ 7 pastilles (full/part/miss selon le jour) |
| Sans habitude | ✅ bandeau masqué |

## Tests

364 tests `node:test` (agrégat 3/14 = 21 %, jour à 2 habitudes, habitude lun/mer/ven ne compte que
ses jours, [] / null / date invalide → null) + smoke `habitsWeekPulse` **bloquant**.

## Rotation

#345 — rotation 34 (build 1.9.279). Prochain #346, clôture à #347 (tag v1.9.281).

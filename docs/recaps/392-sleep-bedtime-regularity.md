# 392 — Onglet Sommeil : la régularité juge maintenant le COUCHER, pas la durée

**Build 2.0.32 · demande d'Adrien** (`docs/DEMANDES.md`), étape 2/2 : « Après [le correctif
Alternance], essaye d'améliorer aussi l'onglet Sommeil ! ». Formulation ouverte côté Adrien —
l'itération a donc commencé par une relecture complète du module existant (`sleepCoachInsight`,
`sleepRegularity`, `bedtimeAnchor`, le plan de recalage, le coach RPG — livré boucles #377→#380,
`docs/recaps/380-systeme-sommeil.md`) pour identifier un manque réel, pas inventé.

## Le manque trouvé

Le « Bilan sommeil » (carte 🌙 en haut de Récupération) juge la régularité du sommeil avec
`sleepRegularity` : l'écart-type de la **durée** des nuits (5 h, 8 h, 5 h…). Mais depuis la boucle
#378, l'app capture aussi l'**heure de coucher** (`recovery[].bedtime`), utilisée par tout le reste
du coach (plan de recalage, conseils du soir, adhérence, XP). Le bilan, lui, ne l'utilisait jamais
pour juger la régularité — alors que c'est le signal qui compte vraiment pour un rythme circadien.

Deux scénarios prouvent que la durée est un mauvais proxy :

- **Coucher stable, durée qui varie** : quelqu'un qui se couche à 23 h tous les soirs mais dort
  tantôt 5 h (réveil tôt), tantôt 8 h, n'a **pas** de problème de rythme — juste un manque de
  sommeil. L'ancien bilan le classait pourtant « urgent » (court **et** irrégulier), en
  recommandant en premier lieu de « stabiliser une heure de coucher fixe » — un conseil qui ne
  s'applique pas puisque le coucher est déjà fixe.
- **Durée stable, coucher qui varie** (le cas exactement inverse) : 8 h de sommeil chaque nuit, mais
  un coucher qui saute de 22 h à 2 h du matin d'un soir à l'autre — c'est justement ce qui dérègle
  le rythme, et exactement le problème qu'Adrien essaie de corriger avec le plan de recalage.
  L'ancien bilan disait pourtant « rythme régulier » (tone `ok`), un signal manqué.

## Le correctif

`src/lib/logic.js` :
- `bedtimeRegularity(recovery, limit)` (nouvelle fonction pure) : écart-type (en **minutes**, via
  `bedtimeAnchor`) des heures de coucher des `limit` dernières nuits renseignées — même construction
  que `sleepRegularity`, mais sur `bedtime` au lieu de `sleep`. Renvoie `{ nights, avgAnchor,
  avgTime, stdevMin }` ou `null` si moins de 3 nuits avec une heure de coucher saisie.
- `sleepCoachInsight` : calcule maintenant les deux régularités et **priorise le coucher** dès que
  3 nuits de coucher sont disponibles (seuil d'irrégularité : ≥ 60 min d'écart-type d'un soir à
  l'autre) ; sans donnée de coucher suffisante, retombe sur l'ancien calcul par durée (≥ 1,5 h),
  comportement inchangé pour qui ne renseigne pas ce champ facultatif. Le verdict textuel change en
  conséquence (« coucher irrégulier » avec l'écart en minutes, au lieu de « rythme irrégulier » avec
  l'écart en heures).

Aucun changement de rendu (le texte du verdict était déjà injecté tel quel dans `#sleepCoach`,
aucune nouvelle carte) — mais le **contenu** du verdict change selon les données, donc un nouveau
check smoke bloquant verrouille le nouveau comportement (cf. ci-dessous), conformément à la règle
« changement de rendu → check bloquant ».

## Tests

+2 blocs (426 → 428 : le test dédié `bedtimeRegularity` et un test de bascule dans
`sleepCoachInsight` prouvant les deux scénarios inverses avec les valeurs exactes) + nouveau check
smoke **bloquant** `sleepBedtimeRegularity` (reproduit le scénario « coucher stable / durée jagged »
et vérifie que `bedtimeRegularity` désamorce l'irrégularité).

## Ce qui n'a pas changé

Zéro nouvelle donnée saisie côté utilisateur (le champ « Coucher » existe depuis #378), zéro
suppression, zéro régression sur les 428 tests + smoke déjà verts. Le plan de recalage, les
conseils du soir et le coach RPG (boucles #379/#380) sont inchangés.

## Suite (DEMANDES.md)

Étape 2/2 de la demande d'Adrien terminée — la demande passe en « Terminé ».

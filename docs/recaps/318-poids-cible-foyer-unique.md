# #318 — Poids cible : un seul foyer, dans « Mon plan » (1.9.252)

## Demande d'Adrien (au réveil, suite à l'audit des onglets)

> « Le plan et l'objectif de poids doit être modifiable d'ailleurs, fait les modifications que tu
> m'avais dit ! »

Référence à la **Proposition B** de l'audit publié la veille : faire de « Mon plan pour atteindre
ma cible » l'unique foyer du poids cible, et retirer le doublon.

## Correction de mon propre audit

L'audit annonçait le champ dans « Base d'endurance ». **Vérification faite : c'était faux** — le
champ `#targetWeight` vivait dans **« Objectifs hebdomadaires »** (goal-panel, onglet Séance), à
côté de séances/semaine et course/semaine. Bien d'avoir regardé le HTML avant d'éditer : j'aurais
touché le mauvais panneau.

Le doublon réel :
- **Objectifs hebdomadaires** (Séance) → `#targetWeight` + bouton « Sauvegarder »
- **Mon plan pour atteindre ma cible** (Progrès) → `#coachTarget`, enregistrement direct (#314)

Deux champs, deux sous-onglets, deux modes de sauvegarde (bouton vs direct) pour un même sujet.

## Ce qui change

- **`#targetWeight` retiré** de « Objectifs hebdomadaires » (et son `#targetAdvice`). Ce panneau ne
  gère plus que la cadence d'entraînement (séances/sem, course/sem).
- **Foyer unique = « Mon plan »** : `#coachTarget` reste le seul champ, prominent (🎯), qui
  enregistre directement.
- **Renvoi de découvrabilité** : un lien « Mon plan pour atteindre ma cible » sous les objectifs
  bascule sur l'onglet Progrès, fait défiler jusqu'au panneau et met le focus sur le champ.
- **`#saveGoals` préserve la cible** : il ne lit plus un champ disparu ; il conserve
  `state.goals.targetWeight` tel quel (sinon il l'aurait effacée à chaque sauvegarde d'objectifs —
  régression évitée et vérifiée).

## Harnais : des gardes qui ne gardaient rien

En retirant `#targetAdvice`, le check smoke `targetAdvice` est passé au rouge — mais le build restait
« SMOKE OK ». En cause : plusieurs checks récents (`targetAdvice`, `coachTargetEditable`,
`programReset`, `plannedMergesProgram`) étaient **calculés mais jamais ajoutés à la liste `errors`**
— donc informatifs, sans pouvoir de blocage. Corrigé : le check `targetAdvice` pointe désormais sur
`#coachTargetAdvice` (l'élément survivant), et les quatre sont **réellement appliqués**. Ils
protègent maintenant pour de bon les fonctionnalités des boucles #314→#318.

## Vérification navigateur (state en mémoire, vrai flux)

| Contrôle | Résultat |
|---|---|
| `#targetWeight` retiré des objectifs | ✅ |
| Renvoi « Mon plan » présent → bascule Progrès + focus champ | ✅ |
| Champ unique dans `.coach-weight-panel` | ✅ |
| Éditer la cible dans le plan → enregistrée | ✅ 74 |
| Sauvegarder les objectifs ne casse plus la cible | ✅ toujours 74, séances = 5 |

## Tests

346 tests `node:test` + smoke verts, avec 4 gardes smoke désormais **bloquants**.

## Reste à décider (audit)

Les propositions **A** (regrouper l'onglet Athlète en 3 zones intitulées) et **C** (« Base
d'endurance » conditionnelle à l'objectif) restent ouvertes — à trancher ensemble.

## Rotation

#318 — rotation 27 (build 1.9.252). Clôture prévue au #319 (tag v1.9.253).

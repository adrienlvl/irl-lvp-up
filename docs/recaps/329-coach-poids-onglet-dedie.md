# #329 — Coach Poids : son propre onglet (1.9.263)

## Demande d'Adrien (priorité 2.0 #1)

> « fin en fait ça devrais limite être un onglet et pas uniquement présent dans athlète »

Le Coach Poids vivait dans **Athlète → Progrès**, noyé parmi les panneaux d'entraînement. Adrien le
veut en **onglet à part entière**.

## Structure comprise avant de coder

Point clé vérifié : `.coach-weight-panel` n'était PAS dans `pageGroups.athlete`. Il était contrôlé
uniquement par `ATHLETE_TABS['coach-weight-panel']='progres'` (→ `data-atab='progres'`, masqué par
sous-onglet). Le HTML ne hardcode pas `data-atab` (assignAthleteTabs le posait au boot).

## Ce qui change (nouvel onglet 'poids')

- **Bouton nav** `⚖️ Poids` ajouté après « Athlète ».
- **`pageGroups.poids = ['.coach-weight-panel']`** → `showPage` gère son `app-page-hidden` (visible
  seulement sur l'onglet Poids).
- **Retiré d'`ATHLETE_TABS`** → n'est plus un sous-onglet Progrès ; assignAthleteTabs ne lui pose
  plus `data-atab`, il est piloté par le seul `pageGroups.poids`.
- **Titre de page** ajouté : « ⚖️ Coach Poids · Ta cible, tes paliers et ton plan sur mesure ».
- **Renvoi `#goToPlanFromGoals`** (depuis « Objectifs hebdomadaires ») recâblé vers `showPage('poids')`
  au lieu d'Athlète→Progrès.

Aucun déplacement DOM : la section reste où elle est, le contrôle est par sélecteur (order-independent).

## Vérification navigateur

| Contrôle | Résultat |
|---|---|
| Bouton « ⚖️ Poids » dans la nav | ✅ |
| Clic → onglet actif, titre « ⚖️ Coach Poids » | ✅ |
| Panneau visible sur Poids (cible + paliers présents) | ✅ |
| Plus visible dans Athlète → Progrès | ✅ masqué |
| Masqué sur le tableau de bord | ✅ |

## Tests

355 tests `node:test` + smoke `poidsTab` **bloquant** : `pageGroups.poids` contient
coach-weight-panel, retiré d'`ATHLETE_TABS`, visible sur Poids et masqué sur athlète/dashboard.

## Reste pour la 2.0

- **Sélecteur de poids cible plus joli** (design du champ #coachTarget) — prochaine itération.
- Polir le contenu de l'onglet Poids maintenant qu'il a la place.

## Rotation

#329 — rotation 30 (build 1.9.263).

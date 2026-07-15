# #326 — Habitudes modifiables (nom + jours), sans perdre l'historique (1.9.260)

## Le manque (interaction, pas un énième taux)

La boucle me rappelait de varier le TYPE d'amélioration. Manque d'interaction concret trouvé : les
habitudes ne pouvaient qu'être **cochées** ou **supprimées** (`data-habit-toggle`,
`data-habit-del`) — **pas modifiées**. Les événements d'agenda, eux, sont éditables : incohérence.

Conséquence : pour corriger une faute de frappe dans le nom ou changer les jours d'une habitude, il
fallait la **supprimer et la recréer** — en perdant la série ET les 30 jours de régularité (le badge
ajouté au #325 juste avant). D'autant plus coûteux maintenant.

## Ce qui change

Édition **inline** : un bouton ✏️ par habitude ouvre la ligne en formulaire (nom + cases des 7
jours, pré-remplis), avec Enregistrer / Annuler.

Fonction pure `applyHabitEdit(habit, patch)` : applique nom/jours en **préservant id, log, xp et
createdAt** — la série et l'historique survivent. Nom vide ou jours vides ignorés (garde l'existant) ;
7 jours cochés → `[]` (tous les jours, convention interne) ; jours dédoublonnés et triés.

## Vérification navigateur (flux complet)

Habitude « Lecture », série de 6 jours (tous les jours) :

| Étape | Résultat |
|---|---|
| Clic ✏️ → ligne d'édition, nom pré-rempli | ✅ |
| Renommer « Lecture du soir » + retirer Sam/Dim | ✅ jours = [1,2,3,4,5] |
| **Historique préservé** | ✅ log = 6 entrées, persisté en localStorage |
| Série recalculée sur le nouveau planning | 6 → 4 (correct : les week-ends ne comptent plus ; **réversible** car le log est intact) |
| Annuler après avoir changé le nom | ✅ édition fermée, nom inchangé |

Point clé : **aucune donnée perdue** — le log (donc la régularité et, en repassant en « tous les
jours », la série) reste intact. La série n'est qu'une valeur dérivée qui reflète correctement le
nouveau planning.

## Tests

353 tests `node:test` (+ `applyHabitEdit` : préservation id/log/xp/createdAt, trim, 7 jours → [],
nom/jours vides ignorés, dédoublonnage) + smoke `habitEdit` **bloquant** (fonction pure + présence
du bouton ✏️, état sauvegardé/restauré).

## Rotation

#326 — rotation 29 (build 1.9.260). Prochain #327 = clôture (tag v1.9.261).

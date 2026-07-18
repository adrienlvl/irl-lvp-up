# #463 — A11y : nom accessible pour les champs du tableau de bord (2.0.94)

Boucle §4.3 (accessibilité), pour varier après une série coaching/sommeil (#458→462) et décisions
d'Adrien (#462). Aucune demande active dans `docs/DEMANDES.md` → choix backlog autonome.

## Le manque (vérifié)

Six champs de saisie du **tableau de bord** n'ont aucun nom accessible programmatique : ils ne sont
**pas** enveloppés dans un `<label>` et n'ont **pas** d'`aria-label`, ils comptent uniquement sur
leur `placeholder`. Or le placeholder n'est pas un nom fiable pour les lecteurs d'écran (il disparaît
dès la première frappe ; support AT variable) — WCAG 3.3.2 / 4.1.2. Vérifié par grep : contrairement
aux boutons-icônes (tous déjà `aria-label`, checks smoke `iconButtonsA11y`/`closeButtonsA11y`/
`navArrowsA11y`) et aux champs enveloppés d'un `<label>` (Sommeil, Taille, Intention…), ces 6-là
étaient nus :

- `todoInput` (Aujourd'hui → « Ajouter une tâche »)
- `habitInput` (Habitudes du jour → « Ajouter une habitude »)
- `lifeGoalOne` / `lifeGoalTwo` / `lifeGoalThree` (Cap de vie → « Priorité de vie n° 1/2/3 »)
- `focusTaskInput` (Concentration → « Tâche unique du bloc de concentration »)

## Le correctif

Ajout d'un `aria-label` distinct à chacun des 6 champs dans `src/index.html`. Additif pur : aucun
changement visuel (le placeholder reste), aucune logique touchée, aucun risque de régression. Le
module sacré Alternance n'est pas touché.

## Vérification

`cd src && xvfb-run -a npm run verify` → **451 tests + smoke verts**, EXIT=0. Nouveau check smoke
**bloquant** `dashboardInputLabels` : vérifie que les 6 `#id` exposent un `aria-label` non vide
(`errors.push` si l'un manque).

## Portée / suite

Un seul cluster (tableau de bord) pour rester « UNE amélioration petite et vérifiable ». D'autres
champs au placeholder seul restent sans `<label>` ailleurs (agenda/calendrier : `recTitle`,
`studyTitle`, `birthdayName`, `calSubName`, `travelHome`, `weekQuick*`… ; recherche : `foodSearch`,
`exerciseSearch` ; formulaire Alternance) — candidats a11y pour de prochaines boucles, à traiter
domaine par domaine. Build **2.0.94**, pas de Release (regroupée).
</content>
</invoke>

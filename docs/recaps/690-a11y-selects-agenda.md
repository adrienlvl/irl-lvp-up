# #690 — A11y : les 4 menus déroulants de l'agenda ont enfin un nom accessible

**Boucle #690 (2026-07-22).** Build **2.0.290**. Domaine : `a11y`.

## Contexte / choix de la tâche
Mission de nuit (ROADMAP « 🌙 DÉMARRAGE VPS » du 22/07, qui PRIME sur la demande coaching datée du
18/07) : **travail NON-visuel, vérifiable, en variant les domaines**. Priorité nommée **#3 « a11y
NON-visuelle »** (aria-label/rôles/labels de formulaire manquants, vérifiable au smoke — PAS de
couleur/contraste/espacement).

Rotation §4 bis (5 derniers recaps : `coach`(689), `robustesse`(688), `etudes`(687), `agenda`(686),
`robustesse`(685)) → **`coach` + `robustesse` interdits** (2 derniers ; `robustesse` aussi 2×/5).
**`a11y` libre** (0× dans les 5 derniers). Quota §4 bis.4 : l'objet du quota (proposition ROADMAP P1)
est épuisé (6/6 écrites + tranchées) et la mission datée de la nuit interdit d'implémenter les
propositions en attente → code non-visuel prouvé, comme les boucles précédentes de cette nuit.

## Piste vérifiée (sous-agent Explore + lecture directe du code)
L'a11y de l'app est déjà très couverte : dans `index.html`, **tous** les boutons icône-only (croix,
flèches, thème, stepper…) ont un `aria-label`, et le smoke verrouille déjà `closeButtonsA11y`,
`navArrowsA11y`, `restSoundA11y`, `filterSelectsA11y`, `iconButtonsA11y`, `dashboardInputLabels`,
`searchFieldLabels`, `formFieldLabels`, `a11yObjective`. Idem la quasi-totalité des boutons dynamiques
d'`app.js` (tous vérifiés avec aria-label).

**Le seul manque « dur » restant** : quatre `<select>` de l'agenda **sans AUCUN nom accessible** — ni
`<label>` englobant, ni `for=`, ni `aria-label`, ni `title`. Un lecteur d'écran les annonce
« menu déroulant » sans dire ce qu'ils règlent (WCAG 4.1.2 Name, Role, Value). Confirmé par grep + lecture :

- `#calendarAgendaKind` (`index.html:226`) — type de bloc Focus/Sport/Vie perso/Révision.
- `#calendarRepeat` (`index.html:226`) — Une fois / Chaque semaine · 4 fois / · 8 fois.
- `#editAgendaKind` (`index.html:241`, dialogue de modification) — même type de bloc.
- `#editAgendaPriority` (`index.html:241`) — Priorité normale / Haute / Basse.

À noter : leur sœur `#calendarAgendaPriority` a déjà `title="Priorité"` (nom faible mais présent), et
`#calendarAgendaPriority`/`#weekQuick*`/`#rec*` ont un `title` → les 4 ci-dessus étaient les seuls
**totalement muets**. Précédents exacts : #412 (« deux menus déroulants de filtre annoncent enfin leur
rôle », 2.0.51) et #578 (noms accessibles sur 6 champs, 2.0.199) — les correctifs aria-label sont bumpés.

## Correctif (`index.html`, zéro logique, zéro visuel)
Ajout d'un `aria-label` sur chacun : `#calendarAgendaKind` + `#editAgendaKind` → « Type de bloc » ;
`#calendarRepeat` → « Répétition » ; `#editAgendaPriority` → « Priorité » (aligné sur le `title` de sa
sœur). Rien ne change à l'écran (aria-label = nom accessible programmatique, non affiché).

## Check smoke bloquant (`renderer-smoke.cjs`)
Nouveau `agendaSelectLabels` (calqué sur `filterSelectsA11y`/`formFieldLabels`) : les 4 ids doivent
être des `SELECT` avec un `aria-label` non vide — les 4 éléments sont présents au chargement (section
`#calendarPage` + dialogue `#agendaEditDialog` sont dans le DOM statique). Échoue avant le correctif,
passe après. Message d'erreur explicite ajouté dans `errors.push`.

## Contrôle §4 ter (cohérence)
Les 3 libellés retenus sont brefs, exacts et non ambigus au regard des options qu'ils commandent ;
aucun texte visible ajouté, donc pas de risque d'accumulation de pavé.

## Vérif
`cd src && xvfb-run -a npm run verify` → **587 tests + SMOKE OK** (`agendaSelectLabels":true`), 100 % vert.

## Reste (moindre priorité, non traité ce tour — rotation)
Champs texte au placeholder seul dans l'agenda/semaine/alternance (`#calendarAgendaTitle`,
`#editAgendaTitle`, `#weekQuickTitle`, `#altCompany`…) et bouton dynamique `#rec-pause-btn` (emoji +
`title` sans aria-label) : manques réels mais **moins graves** (title présent ou label implicite
partiel) → à traiter à un prochain tour a11y, pas en monomanie.

_Domaine : a11y._

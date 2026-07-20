# #566 — P2.2 : `aria-live` sur les panneaux générés (a11y) + check rendu bloquant

**Build 2.0.189.** Domaine : `a11y`.

## Choix de la tâche (rotation §4 bis)

Priorité de la nuit = coach. Mais les 5 derniers domaines sont
`etudes · tests · coach · etudes · coach` : `coach` apparaît **2×** dans les 5 derniers →
interdit (§4 bis.3), et §3 rappelle que la rotation prime même sur la demande de nuit. `etudes`
(2×, dans les 2 derniers) et `tests` (dans les 2 derniers) également interdits. Je sers donc la
**2ᵉ demande d'Adrien** (avancer la roadmap CAP 3.0) avec une tâche **nommée** : **P2.2**
(`aria-live` manquant). Domaine `a11y` : absent des 5 derniers recaps → autorisé.

## Le manque (vérifié dans le code, §2.3)

Deux générateurs d'entraînement remplacent leur `innerHTML` au clic mais **n'annoncent rien** au
lecteur d'écran :

- `#quickSessionResult` (« séance express », `app.js:379` `runQuickSession`) — pointé par P2.2.
- `#wpResult` (« ma semaine d'entraînement », `app.js:720` `renderWeekProgram`) — **la roadmap
  affirmait à tort qu'il avait déjà `aria-live`**. Vérification `grep -oE '<div id="…Result"…>'` :
  il ne l'avait pas. Piste corrigée dans le recap comme l'exige §4 bis.5.

Leurs voisins de même comportement (`#objectiveResult`, `#runPlanResult`) ont bien
`aria-live="polite"` : incohérence d'accessibilité. Une personne qui navigue à la voix clique
« Générer » et n'entend rien — sans savoir si l'action a marché.

## Le correctif

- `src/index.html` : `aria-live="polite"` ajouté à `#quickSessionResult` **et** `#wpResult`.
- **Bonus non bloquant révélé** : le check smoke `a11yObjective` était **défini mais jamais poussé
  dans `errors`** (138 `if (!checks.X)` au total, aucun pour `a11yObjective`) → il ne bloquait
  rien. Je l'ai (1) **étendu** aux 4 panneaux (`objectiveResult`/`runPlanResult`/`quickSessionResult`/
  `wpResult` doivent tous être `aria-live=polite`, `#objectiveSelect` garde son `aria-label`) et
  (2) **rendu bloquant** (nouveau `errors.push`). L'attribut est désormais verrouillé pour les
  quatre.

Purement de l'accessibilité : **aucun texte visible ajouté**, rien ne change à l'écran → §4 ter ne
s'applique pas (pas de surface de lecture enrichie). Précédents a11y bumpés (#549/#550) → **bump**
2.0.189.

## Vérif

`xvfb-run -a npm run verify` → **527 tests + smoke verts**, `a11yObjective:true`.

## Reste côté rotation / roadmap

P2.4 (`aria-label` sur `#foodSearch`/`#agendaSearch`, `a11y`) · P4.x (regex non ancrées,
`robustesse`) restent ouverts pour les prochaines boucles hors coach/etudes/tests.

Domaine : a11y

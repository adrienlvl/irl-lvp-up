# #568 — P4.2 : motifs courts ancrés dans `warmupFor` / `cooldownFor` (build 2.0.191)

**Domaine : athlete.** Tâche nommée **P4.2** de la ROADMAP (« Chasse aux regex non ancrées — le
vrai gisement, prouvé »). Priorité de nuit (coach) **bloquée par la rotation §4 bis** : `coach` est
dans le dernier recap (#567) ET 2× dans les 5 derniers (#564/#567) → interdit ; `a11y` (#566) aussi
dans les 2 derniers. Je bascule sur la 2ᵉ demande d'Adrien (avancer le Cap 3.0 / qualité), tâche
nommée P4.2 — domaine `athlete`, absent des 5 derniers recaps → autorisé.

## Le manque, PROUVÉ (méthode P4 : exécuter, pas supposer)

`warmupFor(title)` et `cooldownFor(title)` (`logic.js:2017` / `:2030`) choisissent l'échauffement /
retour au calme selon des mots-clés du **titre de séance**. Deux motifs courts se déclenchaient à
tort — vérifié en rejouant les fonctions sur des titres FR réalistes :

| Titre | Avant | Cause |
|---|---|---|
| `Cardio haute intensité`, `Haute intensité (HIIT)` | **haut du corps** | `haut` matchait « hau**t**e » |
| `Presse à cuisses`, `Presse à jambes` (jambes !) | **haut du corps** | `press` matchait « pre**ss**e » |

Une séance de cardio/HIIT héritait donc d'un échauffement pompes/tractions ; une séance de **jambes**
« presse à cuisses » aussi. Bonus révélé au passage : la propre séance **générée** « Bas du corps »
(`logic.js:2765/2840`) ne matchait **aucun** mot-clé jambes (`jambe|chaîne|squat|fessier|fente|mollet`)
→ échauffement **général** au lieu du bas-du-corps dédié.

## Le fix (surgical, dans les 2 fonctions — regex identiques)

- Seau haut du corps : `haut` → `\bhaut\b`, `press` → `\bpress\b`. « haute intensité » tombe donc en
  **général** (approprié pour un HIIT), « presse » (français, machine à jambes) sort du haut du corps.
  L'**anglais** « floor/bench press » (whole word, ex. l'exercice `Floor press kettlebell` `logic.js:2527`)
  reste bien classé haut du corps — c'est le sens correct.
- Seau bas du corps : ajout de `cuisse` et `bas du corps`. « presse à cuisses/jambes » → **bas du
  corps** (via `cuisse`), et la séance générée « Bas du corps » obtient enfin son échauffement dédié
  (mobilité hanches/chevilles, squats).

Aucun titre curated généré ne régresse (« Haut du corps » garde `\bhaut\b`, aucun titre généré n'utilise
« presse »). Table de vérité rejouée sur 18 titres : tout cohérent, y compris les 5 titres des tests
existants (`A · Tirage & poussée`, `B · Jambes & chaîne postérieure`, `Sortie longue trail · côtes`,
`Séance inconnue`, `B · Jambes`) inchangés.

## Cible non retenue (dit honnêtement, §4 bis.5)

`Leg press` (anglais) reste classé haut du corps : bare « press » est **génuinement ambigu** en anglais
(développé couché/militaire = haut ; leg press = jambes). Le forcer régresserait le cas fréquent
(bench/floor/shoulder press = haut). Peu réaliste pour Adrien (athlète kettlebell/poids de corps). Non
touché volontairement.

## Vérif & versionnage

- `\bhaut\b` / `\bpress\b` / `cuisse` / `bas du corps` verrouillés par 10 assertions ajoutées aux tests
  `warmupFor` et `cooldownFor` (`logic.test.js`).
- `cd src && xvfb-run -a npm run verify` → **528 tests + smoke verts** (checks `warmup`/`cooldown` OK).
- Bump **2.0.191** (comportement visible : l'échauffement affiché change pour ces titres) + entrée
  CHANGELOG en tête + 2 assertions `CHANGELOG[0].v` (logic.test.js + renderer-smoke.cjs `whatsNew`).
- §4ter : le texte affiché (blocs d'échauffement) n'est pas modifié — seul le **choix** du bloc change ;
  table de vérité rejouée et relue (cohérente). Aucune note coach ajoutée.

Domaine : athlete
</content>
</invoke>

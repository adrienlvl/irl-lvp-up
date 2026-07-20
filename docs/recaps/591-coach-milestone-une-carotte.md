# #591 — Coach : une seule carotte de palier par jour (fin de l'empilement « une semaine »)

**Build 2.0.207 · domaine `coach`.**

## Rotation §4 bis (contrôle AVANT de coder)

`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` (avant ce recap) =
`athlete · focus · coach · athlete · docs` (#590→#586). `coach` apparaît **1×** (#588, position 3),
**absent des 2 derniers** (`athlete`, `focus`) → **autorisé** (≤ 1× sur 5, hors des 2 derniers).
Priorité de nuit #1 (pousser le coaching **en QUALITÉ**, §3) et rotation **convergent** ce tour.

## Angle NEUF (pas de re-labourage)

Les familles insight↔action sont **closes** sur SPORT (#585) ET FOCUS (#588). Le mémo
`coach-leads-contradictions-2guards` désignait explicitement le **prochain angle** : les milestones
« une semaine » **empilables le même jour**. C'est cette piste — jamais traitée — qui est prise ici.
Ce n'est **pas** une contradiction insight↔action : c'est une **redondance de célébration**.

## Le défaut (prouvé en rendu chargé §4 ter)

`adaptiveCoachFocus` (`src/lib/logic.js`) a **trois** familles de jalons qui s'ignoraient entre elles :

- `completeDayMilestone` (`~7341`) : « 🏅 Palier franchi : **une semaine complète** de journées pleines ! »
- `streakMilestoneReach` (`~7457`) / `streakRecordReach` (`~7494`) : « décroche le palier d'**une semaine** ! 🏅 » / « 🏆 tu bats ton record perso »
- `habitMilestone` (`~7611`) : « 🏆 Chaîne au sommet : ton habitude … atteint **une semaine complète** … **un vrai palier** »

**Rendu chargé** (état : 4 piliers × 7 jours consécutifs + habitude « Lecture » à 7 j, script
`/tmp/coachrender.cjs`) — avant fix :

> …🏅 **Palier franchi : une semaine complète** de journées pleines ! 🏆 **Chaîne au sommet** : ton
> habitude « Lecture » atteint **une semaine complète** (7 jours consécutifs)… **un vrai palier**…

Deux médailles côte à côte disant la **même « semaine »** — dilution exacte contre laquelle §4 ter met
en garde. `streakMilestoneReach` + `habitMilestone` empilaient de même.

## Le fix (curation §3 — hiérarchisation, AUCUNE note ajoutée)

Le code appliquait **déjà** « une seule carotte bonus/jour » **localement** (streakRecordReach se tait
« si streakMilestoneReach a déjà parlé », commentaire `logic.js`). On **étend ce principe existant** à
toute la fonction via un drapeau `milestoneShown` (déclaré avant `completeDayMilestone`), dans l'**ordre
du code** = ordre de priorité (journées complètes, le plus englobant → série pilier → habitude) :

- Chaque famille **garde son CHAMP** (`completeDayMilestone` / `streakMilestoneReach` /
  `streakRecordReach` / `habitMilestone`) → télémétrie et tests existants **inchangés**.
- Seule la **phrase** est gardée par `!milestoneShown` ; le premier jalon franchi la pose à `true`.
  Résultat : **une** ligne trophée par jour, la plus englobante.

Chirurgical : `streakRecordReach` 'break' (🏆) est aussi gardé, mais 'near' (nudge factuel « record à
X jours », sans emoji/palier) reste **intact** (pas une carotte de palier).

**Rendu chargé — après fix** : `…🔥 🏅 Palier franchi : une semaine complète de journées pleines !`
(champ `habitMilestone` toujours renseigné `{name:'Lecture',streak:7}`, sa phrase 🏆 tue). Une seule
mention « une semaine complète », zéro « un vrai palier » en doublon.

## Non-régression

Les tests/checks existants **isolent** chaque milestone (completeDay = 4 piliers **sans** habitudes ;
habitMilestone = **1** pilier `workouts` sans les autres ; streakMilestone/record = pilier unique) →
`milestoneShown` reste `false` chez eux, aucune phrase touchée. Le nouveau cas empilé est couvert par
+1 test (`logic.test.js`) + 1 check smoke bloquant (`coachFocus`, cas `fBothMile`).

## Vérif

`cd src && xvfb-run -a npm run verify` → **538 tests + smoke OK** (100 % vert). +1 test (537 → 538).

Domaine : coach

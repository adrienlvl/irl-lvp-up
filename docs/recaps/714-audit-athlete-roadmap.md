# Audit de l'onglet Athlète & roadmap révisée — IRL LVP UP

*Écrit le 2026-07-30 au soir, à la demande d'Adrien, après 98 itérations et la release v2.16.0.*
*Succède à [713-roadmap-long-terme.md](713-roadmap-long-terme.md) (29/07), qui reste valable pour
ses horizons lointains et ses refus. Tout chiffre ci-dessous vient d'une sonde Electron 390×844 du
30/07 au soir ou d'une mesure sur le dépôt — aucun n'est repris de mémoire.*

---

# PARTIE I — L'AUDIT

## 1. Où en est l'app depuis l'audit du 29/07

| | 29/07 (713) | 30/07 (ce soir) |
|---|---|---|
| Fonctions pures | 458 | **476** |
| Tests | 669 | **692**, `# fail 0` |
| Releases | 14 (→ v2.13.0) | **17** (→ v2.16.0) |
| Fonctions orphelines | 7 | **3** |
| Itérations de boucle | 60 | **98** |

Depuis la 713 : la séance guidée refondue (hiérarchie, temps restant mesuré, carte de séance),
le Plan de bataille replié sur l'action (3 664 → 2 136 px), 51 bandes fantômes `[hidden]`
supprimées avec deux garde-fous de portées complémentaires, le rattrapage des révisions arbitré
par l'échéance, et quatre revues adversariales qui ont chacune trouvé un vrai défaut dans mon
propre code récent.

## 2. L'onglet Athlète en chiffres

**4 sous-onglets, 22 panneaux, ~15 300 px cumulés** (en 390 px, état de démonstration) :

| Sous-onglet | Panneaux | Hauteur | Lecture |
|---|---|---|---|
| Aujourd'hui | 6 | **6 440 px** | 2 panneaux géants qui se font concurrence (cf. §3) |
| Programme | 5 | 3 596 px | `wellness-panel` = 1 605 px / 39 boutons à lui seul |
| **Progrès** | 4 | **1 360 px** | le parent pauvre — et pourtant c'est LE sujet d'un athlète |
| Corps | 7 | 3 908 px | 3 panneaux y répètent des sujets d'autres pages |

Le mystère « Progrès rend 0 panneau », relevé deux fois par mes sondes : **artefact de sonde**
(mes filtres cliquaient aussi des panneaux porteurs de `data-atab`). Les 4 panneaux sont vivants —
`ATHLETE_TABS` assigne bien `progression-hub`, `progression-panel`, `week-panel`, `analysis-panel`.

## 3. LE constat central : cinq sujets ont encore plusieurs voix

Le mandat (B) dit « un seul avis par sujet ». Sur Athlète, mesuré ce soir, **cinq sujets parlent
encore en double ou en triple** — c'est le gisement principal, loin devant tout le reste :

| # | Sujet | Les voix, avec leurs mesures |
|---|---|---|
| D1 | **« Quelle est ma prochaine séance ? »** | `objective-program-panel` (Plan de bataille, 2 136 px) **ET** `program-panel` (« Ta prochaine séance », **2 159 px**, 1 859 car, 10 boutons) — deux panneaux géants côte à côte sur *Aujourd'hui*, chacun proposant ses séances et son bouton « Démarrer guidée ». Le second est l'ancien catalogue (« Hybride trail + force »), d'avant le générateur unifié de l'itération 53. C'est le doublon que l'itération 98 a noté en retirant la clause « le plus gros » du check. |
| D2 | **« Check-in du jour »** | `athlete-companion` (« Check-in avant de décider », 462 px) **ET** `recovery-panel` (« Check-in du jour », **1 159 px**) — sur le même sous-onglet, les deux demandent sommeil / fatigue / courbatures. |
| D3 | **« Ma semaine, où j'en suis »** | `weekly-review-panel` (« Aucune séance encore enregistrée cette semaine… », 725 px) **ET** `coach-panel` (« Cette semaine : 0/4 séances et 0 minutes… », 433 px) — tous deux sur *Corps* — **ET** `week-panel` (« Ton volume : 0 séances, 0 min, 0 km », 567 px) sur *Progrès*, **ET** `avancementSemaine` dans le Plan. Quatre écrans disent « 0 séance cette semaine » chacun à sa façon. |
| D4 | **« Mon poids »** | la page **Poids** entière, **ET** `weight-panel` sur *Corps* (actuel / évolution / cible + bouton « Ajouter », 450 px), **ET** `analysis-panel` sur *Progrès* dont le seul contenu réel est… « Ta tendance de poids −2,7 kg ». Trois surfaces, deux points de saisie. |
| D5 | **« Mes objectifs d'entraînement »** | `goal-panel` (« Objectifs hebdomadaires » : séances/sem., km/sem., poids cible, 540 px) sur *Programme* **ET** les réglages du Plan de bataille (`op-bar` + `op-reglages`) — deux endroits règlent le même volume, et `goal-panel` règle en plus un poids cible qui appartient à la page Poids. |

À noter : la table de la 713 classait ça « constat n°4, plan d'unification clos ». Il était clos
pour les **chiffres** (une source par chiffre) — pas pour les **panneaux**. C'est l'étage restant.

## 4. Les stubs et les déséquilibres

- `analysis-panel` (*Progrès*, « Force & endurance ») : **108 caractères**, et son contenu est un
  doublon de poids (D4). Le titre promet une analyse force/endurance qui n'existe pas — alors que
  les briques sont dans logic.js (`bestE1rmByExercise`, `analysePerformance`, `muscleBalance`,
  `pushPullAdvice`, tendance e1RM).
- `measurements-panel` (*Corps*) : 103 caractères — un formulaire nu, aucune lecture de tendance
  alors que `measurementDelta`/`measurementSeries` existent.
- *Progrès* (1 360 px) fait **un cinquième** d'*Aujourd'hui* (6 440 px). Pour un onglet athlète,
  la progression est le sous-onglet qui devrait donner envie d'ouvrir l'app.
- **Une trentaine de panneaux au même poids visuel** (titre 18 px/700, même rayon, même eyebrow) :
  mesuré à l'itération 95, toujours vrai — seule la séance guidée a reçu sa hiérarchie. La page se
  lit comme une liste de blocs équivalents.

## 5. Ce qui est solide (et qu'il ne faut pas casser)

- **La séance guidée** vient d'être refaite (95) : ce qu'on fait domine l'écran, l'en-tête mesure,
  la carte de séance permet de sauter. Ne pas y retoucher sans mesure nouvelle.
- **Le Plan de bataille** ouvre sur l'action (98) : un seul jour déplié, explications dans un pli,
  réglages en bas. Le contrat du check est écrit et muté.
- **Les garde-fous** : 692 tests, lint `hidden` général + check au rendu à couverture dérivée et
  prouvée (97), audits de backticks. La discipline témoin-avant-mutation est en place.
- **Une source par chiffre** (poids, forme, D+, cible calorique) — l'acquis de la 713 tient.

## 6. Les orphelines : 3, dont une de mon fait

| Fonction | État | Décision à prendre |
|---|---|---|
| `barcodeLookup`, `learnBarcode` (+ `isValidEan`, `normalizeBarcodeMap` en soutien) | le chantier code-barres, ouvert depuis la 713 | trancher : finir (un champ EAN manuel suffirait, sans scanner) ou retirer |
| `sessionMinutes` | **débranchée par moi à l'itération 95** (remplacée par `avancementSeanceGuidee`) ; ne survit que dans un check du smoke | la retirer, ou la laisser comme utilitaire assumé — mais le dire |

`nextTrainingSession` et `compareApplications`, orphelines dans la 713, ne le sont plus.

---

# PARTIE II — LA ROADMAP RÉVISÉE

La thèse de la 713 ne change pas : *tout ce qui rapproche l'app d'un arbitre est prioritaire,
tout ce qui en fait un carnet de plus est secondaire.* Ce qui change : **avant** d'arbitrer, il
faut finir de faire taire les voix doubles — l'audit de ce soir montre que c'est sur Athlète
qu'elles restent.

## Horizon A — Athlète : un seul avis par sujet *(itérations, pas semaines)*

Chaque fusion **absorbe, ne supprime pas** : le contenu utile de la voix perdante rejoint la voix
gagnante, et un check bloquant garantit que le sujet n'a plus qu'une voix.

| Rang | Chantier | Geste |
|---|---|---|
| ~~A1~~ **FAIT (it. 99)** | ~~D1 — tuer le double programme~~ | `program-panel` (2 159 px) est absorbé par le Plan de bataille : ses séances suggérées deviennent des variantes du générateur unifié, son bouton « Démarrer guidée » existe déjà dans le Plan. C'est le plus gros panneau redondant de l'app. Lié à la décision d'octobre sur le markup masqué (les 3 générateurs) — l'avancer. |
> **A1 FAIT à l'itération 99.** Absorbé : l'unité des séries (une CORRECTION — le Plan affichait « Équilibre unipodal 3×30 » pour 30 secondes, consigne infaisable), le pourquoi par séance de muscu, le geste « Préparer ». Refusé avec preuve : les 3 archétypes (dérivés du sélecteur d'objectifs : `onboardingSetup` rend `activeProgram: objective === 'endurance' ? 'run' : 'fullbody'`), les vignettes, le repos par exercice, et **la ligne de cette roadmap** qui prescrivait d'en faire des variantes du générateur (la variation existait déjà). Mesuré : Aujourd'hui 6 440 → 4 430 px, 6 → 5 panneaux. *Leçon : la voix qu'on fait taire peut être celle qui a raison.*

| ~~A2~~ **FAIT (it. 102)** | ~~D2 — un seul check-in~~ | fusionner `athlete-companion` et `recovery-panel` : un formulaire, une lecture. ~800 px rendus sur le sous-onglet d'atterrissage. |
> **A2 FAIT a l iteration 102.** Le check-in etait demande a DEUX endroits (Compagnon, 0 champ, + bouton de renvoi) et rempli dans un TROISIEME, 572 px plus bas ; #recoveryAdvice le reclamait une troisieme fois. Les quatre champs vivent maintenant dans le panneau qui decide, id inchanges donc cablage intact. Decision ecrite contre la lettre de cette roadmap : on fusionne le SUJET, pas les panneaux — le second garde score, charge, seances manquees et sommeil, qui sont de l analyse. Mesure : Compagnon 462 -> 796 px, Recuperation 806 -> 485 px ; onglet 15 304 -> 11 879 px, 22 -> 21 panneaux. *Lecon : quand on supprime la distance, on supprime aussi ce qui servait a la franchir.*

| ~~A3~~ **FAIT (it. 107-108)** | ~~D3 — une seule voix hebdo~~ | un seul bilan de semaine (probablement `weekly-review-panel`, le plus riche), qui absorbe `coach-panel` et `week-panel`. `avancementSemaine` garde son rôle distinct : « face au PLAN », dans le Plan. |

> **A3 FAIT aux itérations 107-108, par le CONTENU et non par les pixels.** La lettre de cette roadmap disait « un seul bilan de semaine qui absorbe coach-panel et week-panel ». Mesuré, le vrai défaut n'était pas le NOMBRE de panneaux mais le fait qu'ils ne DISAIENT PAS LA MÊME CHOSE. **107** : la cible rétrécissait en cours de semaine — 6 le lundi, 5 après une séance, 4 après deux, puis le réglage manuel reprenait la main une fois le plan bouclé, et « 2/2 · 100 % » cohabitait avec « il reste 2 séances ». `plan.week` est amputé de ce qui est déjà fait ; on lit désormais `semaineType`, la semaine entière, et le fait est plafonné PAR CATÉGORIE (`fait + reste === cible`, toujours). **108** : le numérateur se comptait de deux façons — « 1 / 6 séances · il reste 5 séances » d'un côté, « 4/6 séances — 2 séances à caser : tu es dans les temps » de l'autre, au même rendu, plus « 4 séances réalisées » et un badge « Séances (4/3) ✓ » qui lisait une troisième source. Une seule règle désormais (`seancesDeLaSemaine`), les activités hors plan restant dans le grand chiffre, qui dit « toute activité ». *Leçon : deux voix qui annoncent le même nombre peuvent rester deux panneaux ; deux panneaux qui annoncent deux nombres ne sont pas une redite, c'est une contradiction — la fusion utile était celle des CHIFFRES.* Reste de la lettre, non fait et assumé : la fusion de SURFACE (week-panel reste sur Progrès, weekly-review-panel sur Corps) ne rendrait des pixels qu'après B4.
| ~~A4~~ **FAIT (it. 117-118)** | **D4 — le poids vit sur Poids** | `weight-panel` (*Corps*) devient une ligne-résumé cliquable vers la page Poids (une seule saisie dans l'app) ; `analysis-panel` cesse de parler de poids. |
> **A4 et A5 FAITS aux itérations 114-118 — et la lettre a été REFUSÉE deux fois, mesure à l'appui.** *A5* : le champ « Séances / semaine » écrivait `goals.sessions`, que le plan n'utilise pas — le passer de 4 à 8 laissait la cible à 5 et le plan inchangé. On n'a pas déplacé le panneau (leçon 112) : les deux dials écrivent désormais le réglage qui pilote, avec le même plafond, la même garde de saisie et le même sens pour le vide (« auto »). Au passage, « Sauvegarder » effaçait `runs`, `weeklyKm` et `progSessions` — une perte de données silencieuse sur le geste le plus banal. *A4* : les deux saisies de poids écrivent la MÊME chose avec le même dédoublonnage — « une seule saisie » corrigeait un symptôme absent ; et les deux voix qui parlent du poids ne disent pas la même chose (six dernières pesées contre bilan depuis le début), donc faire taire l'analyse aurait supprimé une information. Le vrai défaut était ailleurs : **deux échéances pour un objectif** (~14 semaines « à ce rythme » contre ≈10 « au rythme visé »), et **deux fenêtres non nommées**. Corrigé en nommant, jamais en supprimant. *Leçon : quatre refus sur cinq étapes de phase A — la lettre visait la structure, la mesure a trouvé le contenu.*
| ~~A5~~ **FAIT (it. 114-116)** | **D5 — les objectifs au Plan** | `goal-panel` absorbé par les réglages du Plan de bataille ; le poids cible renvoyé à Poids. |

**Résultat attendu, mesurable : Athlète passe de 22 à ~16 panneaux et d'~15 300 à ~11 000 px sans
perdre un contenu.** Chaque étape se sonde avant/après.

## Horizon B — Athlète : la profondeur (mandat A)

| Rang | Chantier | Matière déjà calculée |
|---|---|---|
| ~~B1~~ **FAIT (it. 111)** | ~~Progrès digne de ce nom~~ — recadré à la 110, fait à la 111. L'analyse rétrospective DÉMÉNAGE du Plan de bataille vers `analysis-panel` ; elle ne s'y ajoute pas. | **La ligne d'origine reposait sur une mesure fausse** : « 108 caractères » venait d'un profil SANS AUCUNE SÉANCE. Mesuré sur 8 semaines réelles, le panneau rend déjà **826 caractères / 701 px / 5 lignes** (`analysePerformance` : maxima e1RM, volume, bloc de 4 semaines, allure, poids). Et un inventaire des dix fonctions force/endurance montre qu'elles rendent **toutes dans `objective-program-panel`**, sous-onglet *Aujourd'hui* : `blockStatus` 434 px, `tonnageTrend` 252 px, `trainingByWeekday` 136 px, `trainingConsistency` 98 px, `trainingWeekBalance` 84 px — **1 004 px de rétrospective dans l'écran d'action**. Ajouter e1RM, plateau, prévision et poussée/tirage à l'Analyse, comme prescrit ici, créerait quatre DOUBLONS. Départ mesuré : Plan 1 784 px, Analyse 701 px. |
> **B1 FAIT à l'itération 111, par DÉPLACEMENT et non par ajout.** Mesuré sur 8 semaines réelles, plan généré (chiffres rectifiés à l'itération 112) : Plan de bataille **3 020 → 1 919 px** (−36 %), Analyse **630 → 1 728 px**, et le premier « ▶️ Démarrer cette séance » remonte de **2 258 à 1 157 px** du haut du panneau — de 2,7 écrans à 1,4. Les 1 004 px déplacés (`blockStatus` 434, `tonnageTrend` 252, `trainingByWeekday` 136, `trainingConsistency` 98, `trainingWeekBalance` 84, plus l'historique des blocs) étaient placés **avant le plan lui-même** : on traversait huit semaines de rétrospective pour atteindre la séance du jour. Mêmes ids, donc zéro ligne de rendu modifiée et aucun CSS touché. Restent dans le Plan les trois voix qui PILOTENT la semaine : `avancementSemaine`, `limitationsNote`, `runWeekGoal`. Corrigé au passage : le bloc d'équilibre disait « Équilibre **semaine** » en comptant 7 jours GLISSANTS, à côté d'un « face au plan » qui compte depuis lundi — il se nomme désormais « Équilibre · 7 derniers jours ». *Leçon : la roadmap voulait de la profondeur ; la profondeur était déjà écrite, elle était juste au mauvais endroit. Et un contrat de garde-fou peut devenir périmé sans être faux — celui de l'itération 83 se repérait sur un voisin qui vient de déménager ; requalifié sur place, pas assoupli en silence.*
| B2 | **La mémoire par exercice** (« +8 kg au squat sur tes blocs à 4 séances/sem. ») — la moitié restante du chantier 9 de la 713. | `memoireForceParCadence` (87) fait déjà le global ; relier `blockExProgress` aux cadences. |
| B3 | **Mensurations lues, pas seulement saisies** : tendance, delta récent, lien aux photos. | `measurementDelta`, `measurementRecentDelta`, `measurementSeries`, `recompositionInsight`. |
| ~~B4~~ **REFUSÉ (it. 119)** | **La hiérarchie visuelle de l'onglet** : 2-3 niveaux de panneaux (majeur / standard / discret) au lieu de 30 titres identiques. L'itération 95 a fait l'écran guidé ; faire l'onglet. | mesures de 95 (30 panneaux à 18 px/700). |
> **B4 REFUSÉ à l'itération 119, mesure à l'appui.** Le constat est exact — 21 panneaux visibles, UNE seule taille de titre (18,4 px), UNE seule graisse — mais cette uniformité est un CHOIX argumenté par l'audit typographique du 27/07 dans `pages.css` : « deux niveaux si proches, répétés sur 47 panneaux, se lisent comme une liste de blocs équivalents ». Ajouter un cran recréerait ce qui venait d'être corrigé. Et le symptôme supposé est absent : le premier geste est à 540 px sur les QUATRE sous-onglets, dont trois n'ont aucune action propre. À la place, un test node DÉRIVE toutes les règles CSS qui fixent la taille d'un titre de panneau et exige qu'il n'y en ait qu'une, issue d'un token — il a trouvé au passage une déclaration `1.5rem` EN DUR restée dans `style.css`, morte mais prête à ressusciter au moindre réordonnancement, alors que le commentaire de l'audit affirmait « aucune taille en dur ». *Leçon : refuser n'est pas ne rien faire — mais un refus doit laisser une trace exécutable.*

## Horizon C — L'arbitre *(les chantiers 5-8 de la 713, inchangés mais outillés)*

Le cœur de la thèse. Une avancée depuis la 713 : la sonde du 30/07 a montré que les briques de
capacité (`dayLoad`, `capacityFromHours`) donnent déjà, jour par jour, « cap / pris / libre » —
mesuré 4,5 h libres sur une semaine de démonstration. ~~**Rien n'agrège encore à la semaine.**~~
**`budgetSemaine` agrège depuis la 122**, et confronte le total au plan de bataille.

- C1. ~~**L'arbitrage sous budget de temps**~~ — **FAIT (122)**. `budgetSemaine` agrège le budget
  jour par jour (`max(0, libre)` : un lundi qui déborde ne prête rien au dimanche) et le confronte
  au plan. Elle distingue ce qu'elle **démontre** — la somme qui dépasse, la séance plus longue que
  le plus grand jour libre — de ce qu'elle **constate** : un rangement raté se dit « en les rangeant
  au mieux », jamais « impossible ». Mesuré : capacité réglée à 1 h en semaine / 2 h le week-end,
  plan à 4 h contre 3 h libres, aucun écran ne le disait. Le bloc se tait quand rien ne mord.
- C2. **Le conflit nommé** — deux objectifs qui se contredisent, dit chiffres à l'appui. (8)
- C3. **Le coût annoncé étendu** — objectif physique, jours, zones. (7)
- C4. **La replanification à l'échelle de la SEMAINE** — le rattrapage sport (76) et études (93)
  existent à l'échelle de la séance ; il manque l'étage au-dessus. (6)

## Horizon D — L'app qui te connaît *(trimestres — statuts 713 à jour)*

corrélations personnelles (sommeil fait, énergie×focus fait en 90 ; reste nutrition→énergie,
charge→sommeil) · détection d'anomalie · prévisions avec marge (poids fait ; force, course à
faire) · le journal qui se relit (`reflections`, `coachLog` dorment toujours).

## Horizon E — Matière première & distribution *(inchangé, 713 §10-11)*

import GPX/CSV · saisie en langage naturel hors ligne · code-barres (**à trancher**, cf. §6) ·
distribution (décision d'Adrien) · les **refus** de la 713 §12 restent tous en vigueur.

---

## Ordre de marche proposé

| Rang | Chantier | Pourquoi ce rang |
|---|---|---|
| 1 | **A1** double programme | le plus gros doublon de l'app (2 159 px), sur l'écran d'atterrissage |
| 2 | **A2** un seul check-in | même écran, ~800 px, deux formulaires pour trois questions |
| 3 | **A3** une seule voix hebdo | quatre écrans disent la même chose |
| 4 | **B1** Progrès étoffé | le mandat (A) au meilleur endroit : les briques dorment déjà |
| 5 | **A4+A5** poids et objectifs à leur place | petites surfaces, grande clarté |
| 6 | **B4** hiérarchie de l'onglet | après les fusions — inutile de hiérarchiser des doublons |
| 7 | ~~**C1** arbitrage sous budget~~ | **fait (122)** — le plan se confronte au temps qui reste |
| 8 | **B2, B3** mémoire par exercice, mensurations | demandent des données réelles accumulées |

**La méthode ne change pas** : sonder avant, mesurer après, mutation avec témoin, revue
adversariale toutes les trois itérations — elle vient encore de payer (94 → 98 : cinq défauts
réels trouvés dans mon propre code récent).

## Dates fixes (reprises de la 713)

- **2026-09-01** — si aucune alternance : module Alternance mis de côté, jamais supprimé.
- **Octobre** — sort du markup masqué (3 générateurs) → **avancé par A1**, qui en tranche le gros.

---

## Point d'étape — PHASE A TERMINÉE, publiée en v2.17.0 (30/07/2026)

**A1, A2, A3 sont faits** (itérations 99, 102, 107-108). L'objectif chiffré de la phase A était
« 22 → ~16 panneaux, ~15 300 → ~11 000 px ». Mesuré : **21 panneaux, 11 879 px** — la moitié du
chemin en panneaux, l'essentiel en pixels, sans perdre un contenu. Les deux fusions qui manquent pour
atteindre 16 sont des fusions de SURFACE (A3 côté écrans, A4/A5), et elles ne rendront des pixels
qu'après B4 : hiérarchiser d'abord, déplacer ensuite.

**Ce que la phase A a appris sur la roadmap elle-même.** Les trois étapes ont été menées, mais aucune
exactement comme elle était écrite ici :

- **A1** prescrivait de faire des séances suggérées « des variantes du générateur » : la variation
  existait déjà. Ce qui manquait vraiment, c'était une CORRECTION que le panneau perdant portait seul.
- **A2** prescrivait de fusionner deux panneaux : on a fusionné le SUJET (le check-in) et gardé le
  second panneau pour ce qu'il fait d'autre — de l'analyse, pas une redite.
- **A3** prescrivait de faire absorber `coach-panel` et `week-panel` par le bilan hebdo. Le vrai défaut
  n'était pas le nombre de panneaux : c'est qu'ils annonçaient **des nombres différents pour la même
  semaine**. La fusion utile était celle des CHIFFRES.

*Trois fois sur trois, la lettre visait les pixels et le défaut était dans le contenu. Deux voix qui
disent le même nombre peuvent rester deux panneaux ; deux panneaux qui disent deux nombres ne sont pas
une redite, c'est une contradiction.*

**Itération 109, hors roadmap et assumée :** le harnais de rendu tournait sur le profil Electron de
développement et lisait le vrai `localStorage`, donc une dizaine de checks ne passaient que grâce à
l'état laissé par un run précédent, et l'un d'eux tombait au hasard. Profil jetable + socle de
référence explicite. Un garde-fou instable est une dette, pas une protection — et tout ce qui suit
s'appuie dessus.

**Prochaine étape à la reprise : B1** — `analysis-panel` (108 caractères) devient la vraie analyse
force & endurance. Les briques (`bestE1rmByExercise`, `strengthPlateau`, `strengthForecast`,
`muscleBalance`, `pushPullAdvice`) existent déjà et ne sont racontées nulle part.

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

| A2 | **D2 — un seul check-in** | fusionner `athlete-companion` et `recovery-panel` : un formulaire, une lecture. ~800 px rendus sur le sous-onglet d'atterrissage. |
| A3 | **D3 — une seule voix hebdo** | un seul bilan de semaine (probablement `weekly-review-panel`, le plus riche), qui absorbe `coach-panel` et `week-panel`. `avancementSemaine` garde son rôle distinct : « face au PLAN », dans le Plan. |
| A4 | **D4 — le poids vit sur Poids** | `weight-panel` (*Corps*) devient une ligne-résumé cliquable vers la page Poids (une seule saisie dans l'app) ; `analysis-panel` cesse de parler de poids. |
| A5 | **D5 — les objectifs au Plan** | `goal-panel` absorbé par les réglages du Plan de bataille ; le poids cible renvoyé à Poids. |

**Résultat attendu, mesurable : Athlète passe de 22 à ~16 panneaux et d'~15 300 à ~11 000 px sans
perdre un contenu.** Chaque étape se sonde avant/après.

## Horizon B — Athlète : la profondeur (mandat A)

| Rang | Chantier | Matière déjà calculée |
|---|---|---|
| B1 | **Progrès digne de ce nom.** `analysis-panel` devient la vraie analyse force & endurance : tendance e1RM par exercice, équilibre poussée/tirage, plateau détecté, prévision avec sa marge. | `bestE1rmByExercise`, `strengthPlateau`, `strengthForecast`, `muscleBalance`, `pushPullAdvice` — tout existe, rien n'est raconté là. |
| B2 | **La mémoire par exercice** (« +8 kg au squat sur tes blocs à 4 séances/sem. ») — la moitié restante du chantier 9 de la 713. | `memoireForceParCadence` (87) fait déjà le global ; relier `blockExProgress` aux cadences. |
| B3 | **Mensurations lues, pas seulement saisies** : tendance, delta récent, lien aux photos. | `measurementDelta`, `measurementRecentDelta`, `measurementSeries`, `recompositionInsight`. |
| B4 | **La hiérarchie visuelle de l'onglet** : 2-3 niveaux de panneaux (majeur / standard / discret) au lieu de 30 titres identiques. L'itération 95 a fait l'écran guidé ; faire l'onglet. | mesures de 95 (30 panneaux à 18 px/700). |

## Horizon C — L'arbitre *(les chantiers 5-8 de la 713, inchangés mais outillés)*

Le cœur de la thèse. Une avancée depuis la 713 : la sonde du 30/07 a montré que les briques de
capacité (`dayLoad`, `capacityFromHours`) donnent déjà, jour par jour, « cap / pris / libre » —
mesuré 4,5 h libres sur une semaine de démonstration. **Rien n'agrège encore à la semaine.**

- C1. **L'arbitrage sous budget de temps** — « 5 h dispo, examen jeudi, déficit en cours → on
  garde les deux forces, on sacrifie la sortie longue. » (chantier 5)
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
| 7 | **C1** arbitrage sous budget | le saut qualitatif, une fois l'onglet assaini |
| 8 | **B2, B3** mémoire par exercice, mensurations | demandent des données réelles accumulées |

**La méthode ne change pas** : sonder avant, mesurer après, mutation avec témoin, revue
adversariale toutes les trois itérations — elle vient encore de payer (94 → 98 : cinq défauts
réels trouvés dans mon propre code récent).

## Dates fixes (reprises de la 713)

- **2026-09-01** — si aucune alternance : module Alternance mis de côté, jamais supprimé.
- **Octobre** — sort du markup masqué (3 générateurs) → **avancé par A1**, qui en tranche le gros.

# Audit & roadmap long terme — IRL LVP UP

*Écrit le 2026-07-29, après 60 itérations de boucle autonome et la release v2.13.0.*
*Tout ce qui est chiffré ici vient d'une mesure sur le dépôt ou d'une sonde de l'app en 390×844.*

---

# PARTIE I — L'AUDIT

## 1. Ce que l'app est aujourd'hui, mesuré

| | |
|---|---|
| Pages de navigation | **8** — Tableau de bord, Athlète, Poids, Exercices, Nutrition, Focus, Alternance, Réglages |
| Panneaux de contenu distincts | **40** |
| Clés d'état persistées | **~60** |
| Fonctions pures | **458** (14 107 lignes de logique) |
| Tests | **669**, `# fail 0` |
| Checks bloquants au rendu | **253** |
| Releases | **14** (v2.5.1 → v2.13.0) |

L'app couvre déjà sept domaines : entraînement, nutrition, poids/composition, sommeil et
récupération, agenda, concentration, recherche d'alternance — plus une couche RPG (XP, quêtes,
trophées, arbres de compétences).

## 2. Constat n°1 — La surface est très déséquilibrée

Panneaux de contenu par page, hors cartes globales :

| Page | Panneaux | Commentaire |
|---|---|---|
| **Athlète** | **22** *(4 sous-onglets)* | absorbe 10 des 20 dernières itérations |
| Focus | 5 | |
| Nutrition | 4 | |
| Tableau de bord | 6 | surtout de l'agrégation |
| **Poids** | **1** | un seul panneau, très dense |
| **Exercices** | **1** | une liste de 19 227 px |
| **Alternance** | **1** | |
| Réglages | 2 | |

> **⚠️ Nuance ajoutée le 2026-07-30 (itération 68) : compter les panneaux mesure la mise en
> page, pas la profondeur.** La page Exercices, classée « friche » sur son unique panneau, s est
> révélée riche : la fiche exercice rend l historique personnel, la meilleure série, l e1RM et le
> prochain pas. Le nombre de panneaux oriente, il ne conclut pas — sonder reste obligatoire.

**Athlète pèse autant que tout le reste réuni.** Ce n'est pas un défaut en soi — c'est là que le
mandat portait — mais ça dit où sont les gisements : Focus, Agenda, Nutrition et Poids ont reçu
une fraction de l'attention.

## 3. Constat n°2 — ~~L'Agenda n'est pas dans la navigation~~ **ERREUR D'AUDIT, corrigée le 2026-07-29**

**Ce constat était faux.** L'Agenda **est** dans la barre de navigation, en deuxième position,
avec son icône 🗓️ et son libellé « Agenda ».

Pourquoi je m'étais trompé : j'ai inventorié la navigation en listant les éléments porteurs de
`[data-page]`. Or le bouton Agenda est le seul à s'identifier par un `id` (`#openWeekPage`),
parce que `#weekPage` est une `<section>` basculée par `hidden` et non une page du système
`showPage`/`pageGroups`. Ma mesure excluait donc structurellement la seule entrée qui ne suit
pas la convention — et je n'ai pas recoupé avec le markup.

*C'est le fil rouge appliqué à moi : un écart entre ce que ma méthode dit et ce que l'app fait.
Une mesure qui exclut un cas par construction ne mesure pas ce qu'elle prétend.*

**Ce qui reste vrai, en revanche** : l'Agenda repose sur un mécanisme d'affichage différent de
toutes les autres pages. Ce n'est pas un défaut visible aujourd'hui — la sonde 390×844 de
l'itération 61 l'a trouvé sain — mais c'est une singularité à connaître avant d'y toucher.

## 4. Constat n°3 — Des sous-systèmes à moitié construits

15 fonctions pures ne sont appelées **par personne**. Ce ne sont pas des restes anodins : trois
d'entre elles forment des ensembles cohérents, c'est-à-dire des fonctionnalités commencées puis
laissées en plan.

> **⚠️ CORRIGÉ le 2026-07-30 (itération 69) : ce constat comptait 15 orphelines, il y en a 7.**
> Ma mesure ne scannait que `app.js` et `logic.js` — elle ignorait `electron-main.cjs`, où vit
> tout le processus principal. **Le sous-système « temps de trajet » n'est pas à moitié
> construit : il est ENTIER** (géocodage, itinéraire, repli haversine, adresse chiffrée via
> `safeStorage`). Troisième erreur de méthode de cet audit, après la navigation lue par
> `[data-page]` et les panneaux pris pour de la profondeur.
> *Une mesure qui n'ouvre pas tous les fichiers ne mesure pas ce qu'elle prétend.*

| Sous-système | Fonctions réellement inertes | État réel |
|---|---|---|
| ~~Temps de trajet~~ | ~~5 fonctions~~ | **ENTIER** — implémenté dans `electron-main.cjs`, déclenché par bouton |
| **Code-barres alimentaire** | `barcodeLookup`, `learnBarcode` | aucun scanner, aucune saisie : chantier réellement ouvert |
| **Agenda** | `nextTrainingSession`, `setAgendaCompleted`, `setRecurringDone`, `xpForAgendaItem` | helpers écrits pour un agenda plus riche que celui qui existe |
| Candidatures | `compareApplications` | tri jamais branché |

**Le reste de la logique est très bien exploité** : sur 458 fonctions, **7 seulement** ne sont
appelées par personne. Il n'y a pas de stock de logique dormante — deux chantiers ont été
ouverts sans être finis, et c'est tout.

### Précision sur le « 100 % local »

À écrire correctement, puisque je l'ai répété comme un absolu : l'app ne fait **aucun appel
réseau automatique**, et rien ne part sans action. Mais trois fonctions en font sur **clic
explicite** — l'estimation de temps de trajet (géocodage + itinéraire), l'import de calendrier
ICS, et la synchronisation d'une feuille de calcul. L'adresse de départ est stockée **chiffrée**
via `safeStorage`, et l'app affiche « Trajet indisponible (réseau) » quand ça échoue : elle est
honnête sur sa dépendance.

La formule juste est donc : **aucune donnée ne sort de l'appareil sans que tu l'aies demandé**,
pas « zéro réseau ».

## 5. Constat n°4 — Ce qui est solide

À dire aussi, parce que ça détermine ce qu'on peut se permettre ensuite :

- **Un seul avis par sujet.** Le plan d'unification est clos : un générateur de semaine, un
  planificateur d'agenda, une source par chiffre (poids, forme du jour, dénivelé, cible
  calorique).
- **Les phrases citent leurs mesures.** Sommeil, nutrition, poids, entraînement : le coach ne
  dit plus « rythme régulier », il dit « coucher stable à ~25 min près ».
- **Les garde-fous tiennent.** 253 checks bloquants qui testent le rendu, pas la propriété, et
  une discipline de mutation qui a rattrapé une dizaine de checks creux.
- **Sécurité alimentaire traitée.** Le point le plus sensible d'une app de suivi du poids.

---

# PARTIE II — LA VISION

## 6. La thèse

Il existe déjà des dizaines d'apps qui **enregistrent** (Strava, MyFitnessPal, Notion) et
quelques-unes qui **prescrivent** (programmes d'entraînement). Presque aucune ne fait la seule
chose qui compte quand on mène de front un BTS, une recherche d'alternance, un ultra-trail et
une perte de poids :

> **arbitrer entre des objectifs qui se contredisent, avec le temps qu'il reste.**

C'est la place que cette app peut occuper. Elle a déjà les briques — capacité journalière,
décompte d'examen, politique d'entraînement, déficit calorique, forme du jour — et elles ne se
parlent pas encore.

Le reste de cette roadmap découle de là : **tout ce qui rapproche l'app d'un arbitre est
prioritaire, tout ce qui en fait un carnet de plus est secondaire.**

---

## 7. Horizon 1 — Finir ce qui est commencé *(semaines)*

Peu de risque, valeur immédiate, et ça nettoie le terrain.

1. **Les DEUX chantiers à moitié faits** : code-barres alimentaire et helpers d'agenda — *le
   trajet, lui, est entier (cf. constat n°3 corrigé)*. Pour chacun, trancher : finir ou retirer.
   Un sous-système inerte est une dette qui grossit ; un sous-système qu'on croit inerte **à
   tort** est pire — il envoie refaire ce qui existe déjà.
2. **Rééquilibrer les pages pauvres** — Poids, Nutrition, Focus, Alternance ont un seul angle
   chacun là où Athlète en a vingt-deux.
3. ~~L'Agenda dans la navigation, et sondé en 390 px~~ — **FAIT.** Il y était déjà (cf. constat
   n°2, erreur d'audit), et la sonde 390 px de l'itération 61 l'a trouvé sain : aucun
   débordement, aucun champ sous 16 px, trois vues, des filtres.
4. **Le backlog Agenda de 705**, à réexaminer : la sonde a démenti l'hypothèse de manques
   d'interface. Restent les vrais sujets — prévu vs réel, glisser-déposer, saisie en langage
   naturel avec aperçu. *(Le bilan du soir existe déjà côté Focus, en version qualitative :
   ne pas le dupliquer.)*

## 8. Horizon 2 — L'app qui décide avec toi *(mois)*

C'est le cœur de la thèse, et le plus gros saut qualitatif.

5. **L'arbitrage sous budget de temps.** « Cette semaine : 5 h disponibles, examen jeudi,
   déficit en cours → on garde les deux séances de force, on sacrifie la sortie longue, et on ne
   creuse pas le déficit. » Toutes les pièces existent ; rien ne les fait dialoguer.
6. **La replanification automatique.** Une séance ratée aujourd'hui déclenche une proposition
   concrète, pas un simple constat. `planDuJour` sait ce qui était prévu ; personne ne rattrape.
7. **Le coût annoncé, étendu.** Le modèle est posé (nutrition, puis réglages du plan) : chaque
   réglage dit ce qu'il change. Reste l'objectif physique, les jours, les zones.
8. **Le conflit nommé.** Quand deux objectifs se contredisent — prise de muscle et déficit,
   volume de course et récupération — le dire, chiffres à l'appui, au lieu de laisser deux
   panneaux conseiller l'inverse l'un de l'autre.

## 9. Horizon 3 — L'app qui te connaît *(trimestres)*

Ce qu'aucune app générique ne peut faire : apprendre de **tes** données.

9. **La mémoire causale des blocs.** « Les trois blocs à 4 séances/semaine t'ont donné +8 kg au
   squat ; celui à 3, +2. » Les briques existent (`blocksByObjective`, `bilanDeBloc`,
   `blockComparison`) — la comparaison n'est jamais tirée jusqu'à la recommandation.
10. **Les corrélations personnelles.** `sleepImpactReport` le fait déjà pour le sommeil.
    Étendre : nutrition → énergie, charge → sommeil, focus → journée.
11. **La détection d'anomalie.** « Ton sommeil a perdu 1 h de moyenne depuis dix jours » sans
    qu'on ait à consulter un graphique.
12. **Les prévisions avec marge d'erreur.** Le poids est prévu ; étendre à la force et à un
    temps de course, en affichant l'incertitude plutôt qu'un faux chiffre précis.
13. **Le journal qui se relit.** `reflections`, `focusReviews`, `morningRituals`, `coachLog`
    accumulent depuis des mois et ne ressortent presque jamais.

## 10. Horizon 4 — Élargir la matière première *(quand le reste est solide)*

Sans jamais trahir le « 100 % local, zéro dépendance ».

14. **L'import de fichiers** — GPX d'une montre, export Apple Santé, CSV Garmin. Aucun réseau,
    aucun compte : un fichier qu'on dépose. C'est la seule façon d'avoir de la fréquence
    cardiaque et des traces sans renier le principe.
15. **La saisie en langage naturel, hors ligne.** « couru 10 km en 52 min ce matin » analysé par
    des règles locales, avec aperçu avant validation. Faisable sans modèle, et c'est ce qui fait
    la différence entre un carnet et un assistant.
16. **Le code-barres** (le socle est écrit), et les repères alimentaires par photo de l'étiquette.
17. **Les mensurations et photos** avec repères d'alignement, pour que la comparaison veuille
    dire quelque chose.

## 11. Horizon 5 — Sortir de ton téléphone *(décision produit)*

18. **La distribution.** Mentions non-médicales partout où l'app parle de poids ou de calories,
    politique de confidentialité (facile : rien ne sort), parcours de première ouverture pour
    quelqu'un qui n'est pas toi. Les garde-fous alimentaires — le point le plus sensible — sont
    déjà en place.
19. **La synchronisation multi-appareils**, uniquement par fichier ou réseau local. Un compte
    cloud trahirait le principe fondateur.
20. **L'accessibilité** au-delà des checks actuels : navigation clavier complète, lecteur
    d'écran, contrastes.

---

## 12. Ce qui n'ira PAS dans cette app

Une roadmap longue durée vaut autant par ses refus. Ces options existent pour ce type d'app,
elles sont écartées **volontairement** :

- **Le social** — classements, amis, partage de performances. L'app est un lieu où on est
  honnête avec soi ; un public change ce qu'on y écrit.
- **Le cloud et les comptes.** Tout est local, et c'est ce qui rend la politique de
  confidentialité tenable en trois lignes.
- **Les intégrations en direct** (Strava, Garmin, Apple Santé par API) et tout appel réseau
  AUTOMATIQUE. Les trois appels sur clic qui existent déjà — trajet, import ICS, feuille de
  calcul — restent l’exception assumée : déclenchés par toi, jamais en fond.
- **Un modèle de langage embarqué.** Le coût, la taille et l'imprévisibilité tueraient le « zéro
  dépendance » — et l'app n'en a pas besoin : sa valeur vient de règles explicables.
- **La gamification qui pousse à la surenchère.** Les séries et trophées existent ; ils ne
  doivent jamais pénaliser un jour de repos.
- **Les flashcards** (déjà tranché) : la page BTS reste un hub de planification, pas un outil de
  mémorisation.

---

## 13. Ordre de marche proposé

| Rang | Chantier | Pourquoi ce rang |
|---|---|---|
| ~~1~~ | ~~Agenda dans la navigation + sonde 390 px~~ | **FAIT** — il y était déjà (erreur d audit), et la sonde 390 px de l itération 61 l a trouvé sain |
| 2 | Backlog Agenda 705 (prévu vs réel, bilan du soir) | valeur quotidienne immédiate |
| 3 | Trancher les 3 sous-systèmes inertes | la dette grossit tant qu'on ne décide pas |
| 4 | Rééquilibrer Focus et Poids | une page à un seul angle est une page en friche |
| 5 | **L'arbitrage sous budget de temps** | le saut qualitatif — mais il demande 1 à 4 d'abord |
| 6 | Replanification automatique | découle directement de l'arbitrage |
| 7 | Mémoire causale des blocs | demande plusieurs blocs de données réelles |
| 8 | Import de fichiers | ouvre la matière première |
| 9 | Distribution | décision d'Adrien |

**La méthode ne change pas** : une itération = une amélioration menée au bout, sonde avant,
garde-fou testé par mutation après, revue adversariale toutes les trois itérations. C'est ce qui
a produit plus de quarante défauts réels — dont la moitié dans du code que je venais d'écrire.

---

## 14. Dates fixes déjà prises

- **2026-09-01** — si aucune alternance n'est trouvée, mettre le module Alternance de côté
  (désactiver ou masquer, jamais supprimer : réutilisable l'an prochain).
- **Octobre** — décider du sort du markup masqué (les trois générateurs de semaine).

# 704 — Jalon 2.1.0 : système de design, contenu relié, deux features Athlète

## Contexte

Adrien : « Allez fait tout ça mon petit pote » — les cinq chantiers restés en tête de liste après
l'audit du 2026-07-27 et le lot 2.0.302 : couche de tokens CSS, hiérarchie typographique, relier les
exercices entre eux, objectif de skill guidé, tenues isométriques.

Un relevé du terrain en parallèle (4 agents sur les 17 feuilles CSS, 2 coachs indépendants sur les
exercices) a servi de base factuelle — **rien n'a été inventé, tout part de ce qui existe**.

---

## 1. Le système de design — `design-tokens.css`

C'était la cause structurelle du « le design est toujours mauvais » : 17 feuilles empilées, aucune
couche de tokens, les overrides gagnants **par ordre de chargement** et non par intention.

Le relevé a montré que ce n'était pas qu'une question d'élégance — **le thème clair était à moitié
cassé** :

| Constat mesuré | Conséquence visible |
|---|---|
| L'accent écrit en dur **74 fois** (`rgba(171,255,85,α)`, 24 alphas) | En thème clair, le texte passait au vert foncé mais **fonds, bordures et contours de sélection restaient vert fluo** |
| **16** `var(--accent,#6ee7b7)` | Un vert menthe qui ne correspond à **aucun** des deux thèmes |
| `--surface-1` et `--accent-soft` consommées **sans être définies**, et sans fallback | Déclarations `background` et `border` **invalides** dans `athlete.css` |
| `--surface` définie en sombre uniquement | 4 usages figés en sombre sur fond clair |
| **19 valeurs hexadécimales pour 4 concepts** de statut (6 jaunes pour « avertissement ») | Aucune sémantique : impossible de savoir ce qui est une alerte |

Ce qui a été fait : `design-tokens.css` chargé **en premier**, source unique — les blocs `:root` de
`style.css`, `polish.css` et `theme.css` ont été **supprimés** pour qu'il n'y ait plus deux endroits
où chercher. Les 74 littéraux sont passés sur 4 déclinaisons (`--accent-soft/veil/line/ring`, par
bande d'alpha), les 16 faux fallbacks ont sauté, et les variables manquantes sont définies **dans les
deux thèmes**. S'y ajoutent les échelles (8 crans d'espacement pour 25 valeurs, 7 rayons pour 19,
10 tailles de texte pour 44) — déclarées comme la norme du CSS à venir.

## 2. La hiérarchie typographique

62 `<h2>` pour 8 `<h3>` : tout au même niveau. Et surtout un titre de carte à **1.5rem** contre 2rem
pour le titre de page — deux crans trop proches, répétés sur 47 panneaux, donc **47 panneaux qui
crient au même volume**. Les titres de carte descendent sur l'échelle (`--fs-xl`), un vrai niveau
`h3` existe pour les sous-blocs, et le corps de texte des panneaux se cale sur **un seul** cran au
lieu de neuf.

En écrivant le test, découverte au passage : **`.page-title` est du CSS mort** — la classe n'existe
nulle part dans `index.html`.

## 3. Les 47 exercices sont reliés

La chaîne « pompes inclinées → classiques → lestées » n'existait **qu'en prose** dans les textes :
l'app ne pouvait pas proposer la marche suivante. Deux coachs ont proposé indépendamment (lentille
biomécanique / lentille pédagogique), un troisième a tranché les divergences et vérifié que chaque
nom cité existe exactement.

Résultat : champs `easier` / `harder` dans la donnée — **34 exercices avec une régression, 35 avec
une progression**. Dans la fiche, deux boutons : « ↓ Trop dur ? commence par… » et « ↑ Trop facile ?
passe à… », et un clic ouvre la fiche voisine. Les liens restent dans le matériel réel (poids du
corps, gilet, kettlebells, barre) — aucune barre chargée.

## 4. Tenues isométriques (feature 4/4 du « fait tout »)

`isometricProgress` — la seule performance qui se compte en **secondes**. Neuf tenues (gainage,
gainage latéral, hollow hold, chaise au mur, suspension, plus les skills L-sit, front lever, planche,
équilibre sur les mains), chacune avec 4 paliers Débutant→Élite.

Le conseil suit le protocole isométrique réel : **on n'essaie pas son maximum à chaque séance**, on
accumule du temps en séries à ~60 % du record. Le panneau n'affiche que les tenues **réellement
enregistrées** — pas de L-sit fantôme pour quelqu'un qui n'en a jamais fait.

## 5. Objectif de skill guidé (feature 3/4)

`SKILL_ROADMAPS` + `skillRoadmap(id, done)` : six feuilles de route (muscle-up, front lever, pistol,
HSPU, L-sit, planche), chacune de 5 ou 6 marches avec un **critère chiffré** — jamais « quand tu te
sens prêt ». L'arbre de progression dit *où tu en es* ; la feuille de route dit *quoi faire ensuite*.

Une marche ne devient « la prochaine » que si toutes celles d'avant sont franchies : on ne saute pas
au dernier palier. +15 XP par marche validée, +60 à la feuille de route complète.

---

## Non-régression

- **`isometricProgress`** : 20 assertions — record conservé hors fenêtre, volume borné à la fenêtre,
  paliers, conseil de volume, palier maximal sans « prochain », skills absents s'ils ne sont pas
  enregistrés, **« Gainage planche » non confondu avec le skill « Planche »**, format legacy.
- **`skillRoadmap`** : 15 assertions — les deux formes de stockage, une seule marche courante, on ne
  saute pas une marche, feuille terminée sans « prochaine », et un contrôle sur **toutes** les
  feuilles (ids uniques, détails non vides, **aucun matériel interdit**, id présent dans l'arbre).
- Checks smoke **bloquants** : `designTokens` (l'accent doit **basculer** clair/sombre, et
  `--surface-1`/`--blue`/`--gold`/`--fs-xl`/`--sp-4`/`--r-md` doivent exister), `typeHierarchy`,
  `isoHoldsUi`, `skillRoadmapUi` (clic → compteur **et** état persisté), `exerciseChain`
  (bouton présent, clic ouvrant la fiche voisine, ≥30 exercices reliés).
- **599 tests + SMOKE OK.**

---

## La revue adversariale : 6 défauts corrigés, dont 2 de mes propres régressions

Quatre axes relus puis chaque piste confiée à un sceptique chargé de la réfuter.

**Deux régressions causées par le regroupement d'alphas.** En ramenant 24 alphas sur 4 crans, j'ai
traité comme des *teintes* deux valeurs qui étaient en réalité autre chose :

1. **Le badge « APRÈS » de la comparaison photo** (`rgba(171,255,85,.85)`) n'était pas une teinte
   mais un **fond plein** portant de l'encre foncée. Passé à `--accent-ring` (50 %), il devenait
   illisible par-dessus une photo. → `var(--accent)`, opaque.
2. **Le repère « aujourd'hui » du calendrier** (.07) et le **survol** (.05) se sont écrasés sur le
   même token : la case du jour devenait indiscernable. → `--accent-veil` + un liseré. L'écart de
   2 % d'origine était de toute façon quasi invisible : le repère est maintenant réellement lisible.

**Quatre défauts de fond :**

3. **Hiérarchie inversée dans les modales.** En rangeant `.dialog-heading h2` au cran des titres de
   carte, le titre « Séance » (18,4 px) passait **sous** le nom de l'exercice qu'il coiffe (24,8 px).
   → titres de modale au cran `--fs-2xl`, nom d'exercice à `--fs-xl`.
4. **Le volume des tenues était faux dans les deux sens.** `isometricProgress` était la première
   fonction à publier un *volume* et pas seulement un maximum, et elle avait hérité d'un repli conçu
   pour chercher un record : en saisie manuelle un vrai **3 × 60 s se lisait « 1 série · 1 min »**,
   et en séance guidée les séries préremplies non validées gonflaient le total. → aligné sur
   `workoutSetCount`, avec le test qui compare les deux.
5. **L'XP était refarmable à l'infini.** Décocher puis recocher une marche redonnait 15 XP (et 60
   pour une feuille terminée) : 40 marches, aucune limite. → registre `skillStepsPaid`, jamais vidé
   au décochage.
6. **Le défilement des fiches ne repartait pas du haut.** Le contenu étant remplacé en place,
   cliquer « trop dur / trop facile » ouvrait la fiche voisine déjà défilée au milieu.

**Et quatre surfaces figées en bleu nuit** que la couche de tokens rendait enfin réparables — elles
étaient cassées depuis des mois : la barre de navigation, le formulaire du calendrier, le dégradé du
panneau compagnon, et surtout `option{background-color:#1b2336}` — en thème clair, du **texte sombre
sur fond sombre** dans toutes les listes déroulantes. Les tokens `--nav-bg` et `--dialog-bg` avaient
été créés pour ça et n'étaient branchés nulle part.

Les deux gardes ajoutées côté rendu (XP payée une fois, défilement remis à zéro) ont été **validées
par mutation** : réintroduire le bug fait bien passer le smoke au rouge. La première version de la
garde XP passait à vide — le rendu remplace le DOM à chaque clic, donc je cliquais un nœud détaché.

Domaine : design

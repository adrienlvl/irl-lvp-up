# 706 — Athlète en 4 sous-onglets, progression fusionnée, couleurs d'agenda unifiées

## Contexte

Adrien : « Le Design de l'agenda peut-être amélioré, toujours, et l'onglet athlète est pleins, y'a
trop de choses, je pense que tu peux condenser ou faire en sorte que certaines choses soit ensemble
non ? »

Mesuré avant de proposer, par sonde Electron sur l'app réelle :

| | Panneaux | Hauteur |
|---|---|---|
| Sous-onglet « Séance » | **20** | **8 540 px** |
| Sous-onglet « Mes progrès » | 18 | 6 191 px |

Soit une dizaine d'écrans à faire défiler pour le premier. Le ressenti d'Adrien était exact, et
chiffrable.

## Pourquoi c'était si plein : la répartition ne répartissait presque rien

Le mécanisme de sous-onglets existait déjà, mais `assignAthleteTabs` étiquetait les **conteneurs de
premier niveau**, pas les panneaux. Chaque section prenait l'onglet de son **premier panneau
reconnu** :

```js
for (const key in ATHLETE_TABS) {
  if (sec.classList.contains(key) || sec.querySelector('.' + key)) { sec.dataset.atab = ...; break; }
}
```

`.training-grid` contient `goal-panel` (→ « Séance ») **et** standards de force, arbre de skills,
tenues isométriques, feuille de route. Le `break` sur le premier match envoyait donc **toute la
grille** du côté « Séance ». Tout ce qui a été ajouté depuis — y compris les panneaux de 2.1.0 —
atterrissait du mauvais côté. Et la table ne couvrait que 15 classes sur 23.

## Ce qui a été fait

**Quatre sous-onglets rangés par intention** — ce que tu viens *faire*, pas ce que la donnée *est* :
Aujourd'hui · Programme · Progrès · Corps. L'étiquetage se fait maintenant **par panneau**, ce qui
permet de couper une grille entre deux onglets ; une grille dont tous les panneaux sont masqués se
masque à son tour, sinon elle laisserait sa marge derrière elle.

**Les cinq cartes de progression n'en font plus qu'une.** Records, standards, skills, tenues,
feuille de route deviennent cinq pastilles dans un panneau « Ta progression ». On déplace le
**contenu**, pas les données : les identifiants (`#strengthRecords`, `#skillTree`, `#isoHolds`…)
partent avec, donc tous les renderers continuent d'écrire au même endroit sans le savoir.

| | Avant | Après |
|---|---|---|
| Aujourd'hui | 20 panneaux · 8 540 px | **7 · 4 707 px** |
| Programme | — | 8 · 5 806 px |
| Progrès | 18 · 6 191 px | **6 · 2 797 px** |
| Corps | — | 9 · 4 156 px |

**Deux panneaux qui traînaient dans les quatre onglets** sont rangés. Les deux panneaux « coach »
partageaient la classe `coach-panel` — impossible de les séparer : celui du tableau de bord (« Le
focus du moment ») s'affichait aussi dans Athlète. Ils sont distingués sans changer leur style.

**Garde-fou inter-pages** : `atab-hidden` est un `display:none!important`. Sans nettoyage en
quittant la page Athlète, un panneau rangé dans « Corps » serait resté invisible sur sa propre page.

## Le design de l'Agenda : cinq palettes pour quatre catégories

Sport, vie perso, révision et focus étaient définis **cinq fois**, dans cinq fichiers, avec des
nuances différentes selon l'endroit :

- `calendar-page.css` — pastilles du mois et légende (`#51395a`, `#31534b`…)
- `extras.css` — liserés de la vue jour (`#8a5a9a`, `#4a8a76`… des teintes **différentes**)
- `mission-control.css` — liserés de « Ma journée »
- `strength.css` — étiquettes de séance
- `print.css` — une palette désaturée pour l'impression

**Aucune ne basculait en thème clair** : les pastilles du mois restaient bleu nuit sur fond blanc.
Une seule définition désormais (`--cat-sport/life/study/focus` plus une variante `-line` pour les
liserés), avec une contrepartie claire pour chacune — **28 occurrences migrées, zéro couleur de
catégorie en dur restante** hors du fichier de tokens. Au passage, les pastilles du mois passent de
`.68rem` au cran de l'échelle, avec un liseré coloré au lieu d'un aplat.

## Non-régression

- Checks smoke **bloquants** : `athleteTabs` (4 boutons ; chaque onglet entre 2 et 14 panneaux — un
  onglet vide *ou* un onglet qui reprend tout signifie que la répartition ne fait pas son travail ;
  les 5 cartes disparues **sans qu'aucun identifiant ne soit perdu**), `athleteNoBleed` (aucun
  `atab-hidden` ne survit à la sortie de la page), `agendaCategories` (les 4 tokens existent **et**
  basculent entre les deux thèmes).
- **604 tests + SMOKE OK.**

Deux checks existants ont dû changer, et c'est le smoke qui l'a signalé : l'un interrogeait le
bouton `data-atab="seance"` que le renommage a fait disparaître (il levait une exception) ; l'autre
gardait les 3 intertitres « zones » que les 4 onglets remplacent — remplacé par ce qu'il portait
encore d'utile, la règle conditionnelle sur « Base d'endurance ».

Domaine : design
